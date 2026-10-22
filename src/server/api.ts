import express from 'express';
import { GoogleGenAI } from '@google/genai';
import type { DiceRollResult, PartyMemberLive, PresenceStatus, LiveCombatantMini, AutoBackupConfig, AutoBackupLog, PendingDmOffer, PlayerMessageToDM, UserRole, PlayerType, AppRole, ForumPost, ForumComment, FriendDirectMessage } from '../types/dnd.ts';
import { buildPlayerMessageToDM, normalizeRoomIdentifier } from '../utils/dnd-math.ts';
import { dataStore, registerDataStoreMutationListener } from './dataStore.ts';

export const apiRouter = express.Router();

// Corroborate user uniqueness continuously (on startup and every 15 seconds)
dataStore.corroborateUniqueUsers();
setInterval(() => {
  try {
    dataStore.corroborateUniqueUsers();
  } catch (err) {
    console.warn('[WeRoll] Error corroborating unique users:', err);
  }
}, 15000);

// Memory store for multiplayer sessions / rooms
interface RoomState {
  roomCode: string;
  createdAt: number;
  lastUpdated: number;
  party: Record<string, PartyMemberLive>;
  dmConnected?: boolean;
  dmLastPing?: number;
  dmLiveMessage?: string;
  dmPresenceStatus?: PresenceStatus;
  dmIdleSeconds?: number;
  dmLastRoll?: DiceRollResult;
  rollFeed: DiceRollResult[];
  dmAnnouncements: {
    id: string;
    title: string;
    content: string;
    timestamp: number;
  }[];
  currentQuest?: string;
  quickNotification?: string;
  showCombatantsOnTable?: boolean;
  liveCombatants?: LiveCombatantMini[];
  pendingOffers: PendingDmOffer[];
  playerMessages: PlayerMessageToDM[];
}

const rooms: Record<string, RoomState> = {};

function getOrCreateRoom(code: string): RoomState {
  const normCode = code.trim().toUpperCase() || 'MESA-PRINCIPAL';
  if (!rooms[normCode]) {
    const matchingWorld = dataStore
      .getWorldSheets()
      .find((w) => normalizeRoomIdentifier(w.roomCode || w.name) === normalizeRoomIdentifier(normCode));
    const workspaceMsgs = Array.isArray(matchingWorld?.workspace?.playerMessages)
      ? matchingWorld!.workspace.playerMessages!
      : [];
    const storeDmMsgs = dataStore
      .getDmMessages()
      .filter((m) => normalizeRoomIdentifier(m.roomCode) === normalizeRoomIdentifier(normCode));
    
    // Merge without duplicates
    const msgMap = new Map<string, PlayerMessageToDM>();
    for (const m of [...workspaceMsgs, ...storeDmMsgs]) {
      if (m && m.id) msgMap.set(m.id, m);
    }
    const persistedMessages = Array.from(msgMap.values()).sort((a, b) => b.createdAt - a.createdAt);

    rooms[normCode] = {
      roomCode: normCode,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      party: {},
      dmConnected: false,
      dmLastPing: 0,
      dmLiveMessage: '',
      dmPresenceStatus: 'active',
      dmIdleSeconds: 0,
      rollFeed: [],
      dmAnnouncements: [],
      currentQuest: 'Investigar los misterios del reino y proteger a los inocentes.',
      quickNotification: '',
      showCombatantsOnTable: false,
      liveCombatants: [],
      pendingOffers: [],
      playerMessages: persistedMessages,
    };
  }
  if (!Array.isArray(rooms[normCode].pendingOffers)) {
    rooms[normCode].pendingOffers = [];
  }
  if (!Array.isArray(rooms[normCode].playerMessages)) {
    rooms[normCode].playerMessages = [];
  }
  return rooms[normCode];
}

// Clean old sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of Object.entries(rooms)) {
    if (now - room.lastUpdated > 24 * 60 * 60 * 1000) {
      delete rooms[code];
    }
  }
}, 60 * 60 * 1000);

// Initialize Gemini Client (checks host override header or process.env.GEMINI_API_KEY)
function getGeminiClient(customApiKey?: string): GoogleGenAI | null {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Health endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

// ==========================================
// AUTHENTICATION & USER MANAGEMENT
// ==========================================

// Register a new user account (starts as PENDING for DM & Player)
apiRouter.post('/auth/register', (req, res) => {
  const { email, displayName, userTagId, password, requestedRole } = req.body;
  if (!email || !password || !displayName) {
    return res.status(400).json({ error: 'Faltan campos requeridos: correo, nombre o contraseña.' });
  }

  const existing = dataStore.findUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'Ya existe una cuenta con este correo electrónico.' });
  }

  const cleanedTag = (userTagId || '').replace(/^@+/, '').trim().slice(0, 3);

  const reqPlayerType: PlayerType = ['dm', 'player', 'both'].includes(req.body.playerType || requestedRole)
    ? (req.body.playerType || requestedRole)
    : 'player';
  const reqAppRole: AppRole = ['admin', 'creator', 'moderator', 'client'].includes(req.body.appRole)
    ? req.body.appRole
    : 'client';

  try {
    const isAutoApproved = email.trim().toLowerCase() === 'admin@weroll.app';
    const newUser = dataStore.createUser({
      email: email.trim().toLowerCase(),
      displayName: displayName.trim(),
      userTagId: cleanedTag || undefined,
      friends: [],
      password: password.trim(),
      role: (reqAppRole === 'admin' ? 'moderator' : reqAppRole === 'creator' ? 'creator' : reqPlayerType) as UserRole,
      playerType: reqPlayerType,
      appRole: reqAppRole,
      canPostInForum: reqAppRole === 'admin' || reqAppRole === 'creator' || reqAppRole === 'moderator',
      status: isAutoApproved ? 'approved' : 'pending',
    });

    res.json({
      success: true,
      status: 'pending',
      message: `Solicitud enviada con éxito (${newUser.displayName}@${newUser.userTagId}). Tu cuenta debe ser aprobada por el Administrador o Moderador antes de acceder.`,
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        userTagId: newUser.userTagId,
        fullTag: `${newUser.displayName}@${newUser.userTagId}`,
        avatarUrl: newUser.avatarUrl,
        friends: newUser.friends || [],
        role: newUser.role,
        playerType: newUser.playerType || reqPlayerType,
        appRole: newUser.appRole || 'client',
        canPostInForum: Boolean(newUser.canPostInForum),
        forumPermissionsRequested: Boolean(newUser.forumPermissionsRequested),
        status: newUser.status,
      },
    });
  } catch (err: any) {
    return res.status(400).json({
      error: err.message || 'No se pudo registrar el usuario por conflicto de nombre o ID.',
    });
  }
});

// Login
apiRouter.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña requeridos.' });
  }

  const normEmail = email.trim().toLowerCase();
  const user = dataStore.findUserByEmail(normEmail);
  const hostSettings = dataStore.getHostSettings();
  const masterModPass = hostSettings.moderatorPassword?.trim() || 'admin';
  const isModerator = user?.role === 'moderator' || normEmail === 'admin@weroll.app';

  const isPasswordCorrect = Boolean(
    user && (user.password === password.trim() || (isModerator && password.trim() === masterModPass))
  );

  if (!user || !isPasswordCorrect) {
    return res.status(401).json({ error: 'Credenciales inválidas. Verifica tu correo y contraseña.' });
  }

  // Ensure moderator password stays synced in user record
  if (isModerator && user.password !== masterModPass && password.trim() === masterModPass) {
    user.password = masterModPass;
    const allUsers = dataStore.getUsers();
    const idx = allUsers.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      allUsers[idx].password = masterModPass;
      dataStore.saveUsers(allUsers);
    }
  }

  if (user.status === 'pending') {
    return res.status(403).json({
      error: 'Tu cuenta está en estado PENDIENTE de aprobación por el Administrador. No puedes ingresar hasta que sea aprobada.',
      status: 'pending',
    });
  }

  if (user.status === 'rejected') {
    const host = dataStore.getHostSettings();
    const customMsg = host.rejectionCustomMessage || 'Lo lamentamos, por el momento no puedes acceder a WeRoll. Manda mensaje a soporte@weroll.app si quieres una revisión manual de tu caso.';
    return res.status(403).json({
      error: 'Tu solicitud de acceso ha sido rechazada por el Administrador.',
      status: 'rejected',
      customMessage: customMsg,
    });
  }

  // Update last active
  user.lastActiveAt = Date.now();
  const allUsers = dataStore.getUsers();
  const idx = allUsers.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    allUsers[idx].lastActiveAt = Date.now();
    dataStore.saveUsers(allUsers);
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      userTagId: user.userTagId || '123',
      fullTag: `${user.displayName}@${user.userTagId || '123'}`,
      avatarUrl: user.avatarUrl,
      friends: user.friends || [],
      role: user.role,
      playerType: user.playerType || (user.role === 'dm' ? 'dm' : user.role === 'player' ? 'player' : 'both'),
      appRole: user.appRole || (user.role === 'admin' ? 'admin' : user.role === 'creator' ? 'creator' : user.role === 'moderator' ? 'moderator' : 'client'),
      canPostInForum: user.appRole === 'admin' || user.appRole === 'creator' || user.appRole === 'moderator' ? true : Boolean(user.canPostInForum),
      forumPermissionsRequested: Boolean(user.forumPermissionsRequested),
      status: user.status,
    },
  });
});

// Check current user status / me
apiRouter.get('/auth/me', (req, res) => {
  const email = (req.query.email as string || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Email requerido.' });
  }
  const user = dataStore.findUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }
  // Corroborate user uniqueness on every /auth/me check
  dataStore.corroborateUniqueUsers();
  const freshUser = dataStore.findUserByEmail(email) || user;

  res.json({
    id: freshUser.id,
    email: freshUser.email,
    displayName: freshUser.displayName,
    userTagId: freshUser.userTagId || '123',
    fullTag: `${freshUser.displayName}@${freshUser.userTagId || '123'}`,
    avatarUrl: freshUser.avatarUrl,
    friends: freshUser.friends || [],
    role: freshUser.role,
    playerType: freshUser.playerType || (freshUser.role === 'dm' ? 'dm' : freshUser.role === 'player' ? 'player' : 'both'),
    appRole: freshUser.appRole || (freshUser.role === 'admin' ? 'admin' : freshUser.role === 'creator' ? 'creator' : freshUser.role === 'moderator' ? 'moderator' : 'client'),
    canPostInForum: freshUser.appRole === 'admin' || freshUser.appRole === 'creator' || freshUser.appRole === 'moderator' ? true : Boolean(freshUser.canPostInForum),
    forumPermissionsRequested: Boolean(freshUser.forumPermissionsRequested),
    status: freshUser.status,
    passwordResetRequested: freshUser.passwordResetRequested,
  });
});

// Endpoint to corroborate user uniqueness across all registered users
apiRouter.get('/auth/corroborate-uniqueness', (_req, res) => {
  const result = dataStore.corroborateUniqueUsers();
  res.json({
    success: true,
    fixedCount: result.fixedCount,
    totalUsers: result.users.length,
  });
});

// User self-service change 3-char ID (userTagId) from Security & Password tab
apiRouter.post('/auth/change-tag', (req, res) => {
  try {
    const { email, userId, newTagId } = req.body;
    const cleaned = (newTagId || '').replace(/^@+/, '').trim();
    if (!cleaned || cleaned.length > 3) {
      return res.status(400).json({
        error: 'Tu ID debe tener entre 1 y 3 caracteres como máximo (ejemplo: 123 o top).',
      });
    }
    const targetUser = userId
      ? dataStore.findUserById(userId) || (email ? dataStore.findUserByEmail(email) : undefined)
      : email
      ? dataStore.findUserByEmail(email)
      : undefined;

    if (!targetUser) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const updated = dataStore.updateUserTagId(targetUser.id, cleaned);
    if (!updated) {
      return res.status(404).json({ error: 'No se pudo actualizar el ID.' });
    }

    res.json({
      success: true,
      message: `¡Tu ID ha sido actualizado con éxito! Ahora tus amigos pueden agregarte como: ${updated.displayName}@${updated.userTagId}`,
      userTagId: updated.userTagId,
      fullTag: `${updated.displayName}@${updated.userTagId}`,
      user: {
        id: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        userTagId: updated.userTagId,
        fullTag: `${updated.displayName}@${updated.userTagId}`,
        avatarUrl: updated.avatarUrl,
        role: updated.role,
        status: updated.status,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al actualizar el ID.' });
  }
});

// User self-service update player profile avatar (avatarUrl)
apiRouter.post('/auth/avatar', (req, res) => {
  try {
    const { userId, email, avatarUrl } = req.body;
    const targetUser = userId
      ? dataStore.findUserById(userId) || (email ? dataStore.findUserByEmail(email) : undefined)
      : email
      ? dataStore.findUserByEmail(email)
      : undefined;

    if (!targetUser) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const updated = dataStore.updateUserAvatar(targetUser.id, avatarUrl);
    if (!updated) {
      return res.status(404).json({ error: 'No se pudo actualizar la imagen de perfil.' });
    }

    res.json({
      success: true,
      message: avatarUrl
        ? '¡Imagen de perfil de jugador actualizada con éxito! Tus amigos verán esta imagen en su lista.'
        : 'Imagen de perfil restablecida al icono por defecto.',
      avatarUrl: updated.avatarUrl,
      user: {
        id: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        userTagId: updated.userTagId,
        fullTag: `${updated.displayName}@${updated.userTagId}`,
        avatarUrl: updated.avatarUrl,
        role: updated.role,
        status: updated.status,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al actualizar imagen de jugador.' });
  }
});

// Alias for UserSecurityModal tag-id update
apiRouter.post('/users/:id/tag-id', (req, res) => {
  try {
    const { newTagId } = req.body;
    const updated = dataStore.updateUserTagId(req.params.id, newTagId);
    if (!updated) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json({
      success: true,
      message: `¡ID actualizado con éxito a ${updated.displayName}@${updated.userTagId}!`,
      user: updated,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al actualizar ID.' });
  }
});

// Alias for UserSecurityModal change-password
apiRouter.post('/users/:id/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = dataStore.findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (user.password !== (currentPassword || '').trim()) {
    return res.status(401).json({ error: 'La contraseña actual no es correcta.' });
  }
  dataStore.updateUserPassword(user.id, (newPassword || '').trim(), true);
  res.json({ success: true, message: '¡Contraseña actualizada con éxito!' });
});

// ==========================================
// FRIENDS MANAGEMENT ENDPOINTS (LOBBY)
// ==========================================

apiRouter.get('/friends', (req, res) => {
  const email = ((req.query.email as string) || '').trim().toLowerCase();
  const userId = ((req.query.userId as string) || '').trim();
  const user =
    (userId ? dataStore.findUserById(userId) : undefined) ||
    (email ? dataStore.findUserByEmail(email) : undefined);

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  const friends = dataStore.getFriendsForUser(user.id);
  res.json({
    userId: user.id,
    displayName: user.displayName,
    userTagId: user.userTagId || '123',
    fullTag: `${user.displayName}@${user.userTagId || '123'}`,
    friends,
  });
});

apiRouter.post('/friends/add', (req, res) => {
  try {
    const { userId, email, friendTag } = req.body;
    const user =
      (userId ? dataStore.findUserById(userId) : undefined) ||
      (email ? dataStore.findUserByEmail(email) : undefined);
    if (!user) {
      return res.status(404).json({ error: 'Tu sesión de usuario no fue encontrada.' });
    }
    const result = dataStore.addFriendByTag(user.id, friendTag);
    res.json({
      success: true,
      message: `¡${result.addedFriend.fullTag} ha sido agregado a tu lista de amigos!`,
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'No se pudo agregar al amigo.' });
  }
});

apiRouter.post('/friends/remove', (req, res) => {
  try {
    const { userId, email, friendId } = req.body;
    const user =
      (userId ? dataStore.findUserById(userId) : undefined) ||
      (email ? dataStore.findUserByEmail(email) : undefined);
    if (!user) {
      return res.status(404).json({ error: 'Tu sesión de usuario no fue encontrada.' });
    }
    const result = dataStore.removeFriend(user.id, friendId);
    res.json({
      success: true,
      message: 'Amigo eliminado de tu lista y respaldo actualizado.',
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al eliminar amigo.' });
  }
});

// User self-service change password from Lobby
apiRouter.post('/auth/change-password', (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  if (!email || !oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Todos los campos son requeridos.' });
  }
  const normEmail = email.trim().toLowerCase();
  const user = dataStore.findUserByEmail(normEmail);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }
  if (user.password !== oldPassword.trim()) {
    return res.status(401).json({ error: 'La contraseña actual no es correcta.' });
  }
  if (newPassword.trim().length < 3) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 3 caracteres.' });
  }

  const updated = dataStore.updateUserPassword(user.id, newPassword.trim(), true);
  res.json({ success: true, message: '¡Contraseña actualizada con éxito!' });
});

// User forgot password request
apiRouter.post('/auth/forgot-password', (req, res) => {
  const { email, note } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'El correo electrónico es requerido.' });
  }
  const normEmail = email.trim().toLowerCase();
  const ok = dataStore.requestPasswordReset(normEmail, note);
  if (!ok) {
    return res.status(404).json({ error: 'No se encontró ninguna cuenta registrada con ese correo electrónico.' });
  }
  res.json({
    success: true,
    message: 'Solicitud enviada al Administrador. El moderador revisará tu cuenta y te proporcionará una nueva contraseña.',
  });
});

// Community Feedback & Bug reports
apiRouter.post('/feedback', (req, res) => {
  const { category, description, userEmail, userName } = req.body;
  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'La descripción del feedback es obligatoria.' });
  }
  const validCat = ['bug', 'suggestion', 'other'].includes(category) ? category : 'other';
  const record = dataStore.addFeedback({
    category: validCat as any,
    description: description.trim(),
    userEmail: userEmail?.trim() || undefined,
    userName: userName?.trim() || undefined,
  });
  res.json({ success: true, feedback: record });
});

// ==========================================
// ADMINISTRATOR ENDPOINTS
// ==========================================

// List all registered users (including current password, 3-char userTagId, friends & reset requests)
apiRouter.get('/admin/users', (req, res) => {
  const users = dataStore.getUsers().map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    userTagId: u.userTagId || '123',
    fullTag: `${u.displayName}@${u.userTagId || '123'}`,
    avatarUrl: u.avatarUrl,
    friends: Array.isArray(u.friends) ? u.friends : [],
    password: u.password,
    role: u.role,
    playerType: u.playerType || (u.role === 'dm' ? 'dm' : u.role === 'player' ? 'player' : 'both'),
    appRole: u.appRole || (u.role === 'admin' ? 'admin' : u.role === 'creator' ? 'creator' : u.role === 'moderator' ? 'moderator' : 'client'),
    canPostInForum: u.appRole === 'admin' || u.appRole === 'creator' || u.appRole === 'moderator' ? true : Boolean(u.canPostInForum),
    forumPermissionsRequested: Boolean(u.forumPermissionsRequested),
    status: u.status,
    registeredAt: u.registeredAt,
    approvedAt: u.approvedAt,
    approvedBy: u.approvedBy,
    lastActiveAt: u.lastActiveAt,
    passwordResetRequested: u.passwordResetRequested,
    passwordResetRequestedAt: u.passwordResetRequestedAt,
    passwordResetNote: u.passwordResetNote,
  }));
  res.json({ users });
});

// Admin directly creates a new user (e.g., for test users or manual registration)
apiRouter.post('/admin/users/create', (req, res) => {
  try {
    const { email, displayName, userTagId, password, role, status } = req.body;
    if (!email || !email.trim() || !displayName || !displayName.trim()) {
      return res.status(400).json({
        error: 'El correo electrónico y el nombre de usuario son obligatorios.',
      });
    }

    const normEmail = email.trim().toLowerCase();
    const existing = dataStore.findUserByEmail(normEmail);
    if (existing) {
      return res.status(400).json({
        error: 'Ya existe un usuario registrado con ese correo electrónico.',
      });
    }

    const cleanedTag = (userTagId || '').replace(/^@+/, '').trim().slice(0, 3);
    const validRole = ['player', 'dm', 'both', 'moderator', 'creator', 'admin'].includes(role)
      ? role
      : 'player';
    const validStatus = ['approved', 'pending', 'rejected'].includes(status)
      ? status
      : 'approved';

    const newUser = dataStore.createUser({
      email: normEmail,
      displayName: displayName.trim(),
      userTagId: cleanedTag || undefined,
      friends: [],
      password: (password || '123456').trim(),
      role: validRole,
      status: validStatus,
      approvedAt: validStatus === 'approved' ? Date.now() : undefined,
      approvedBy: validStatus === 'approved' ? 'Admin' : undefined,
    });

    res.json({
      success: true,
      message: `Usuario "${newUser.displayName}@${newUser.userTagId}" (${newUser.email}) creado y registrado con éxito.`,
      user: {
        ...newUser,
        fullTag: `${newUser.displayName}@${newUser.userTagId}`,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al crear el usuario.' });
  }
});

// Admin edits user email, displayName, 3-char userTagId, role, or status
apiRouter.put('/admin/users/:id', (req, res) => {
  try {
    const { email, displayName, userTagId, password, role, playerType, appRole, canPostInForum, status } = req.body;
    const updated = dataStore.adminUpdateUserAccount(req.params.id, {
      email,
      displayName,
      userTagId,
      password,
      role: role || (playerType === 'dm' ? 'dm' : playerType === 'player' ? 'player' : appRole === 'admin' ? 'admin' : appRole === 'moderator' ? 'moderator' : 'both'),
      status,
      ...({ playerType, appRole, canPostInForum } as any),
    });
    if (!updated) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.json({
      success: true,
      message: `Datos de ${updated.displayName}@${updated.userTagId} actualizados correctamente.`,
      user: {
        ...updated,
        fullTag: `${updated.displayName}@${updated.userTagId}`,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al actualizar usuario.' });
  }
});

// Admin deletes user account
apiRouter.delete('/admin/users/:id', (req, res) => {
  try {
    const removed = dataStore.deleteUser(req.params.id);
    if (!removed) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.json({
      success: true,
      message: `Cuenta de ${removed.displayName}@${removed.userTagId || ''} (${removed.email}) eliminada del servidor.`,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al eliminar usuario.' });
  }
});

// Approve user
apiRouter.post('/admin/users/:id/approve', (req, res) => {
  const updated = dataStore.updateUserStatus(req.params.id, 'approved', 'Admin');
  if (!updated) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.json({ success: true, user: updated });
});

// Reject user
apiRouter.post('/admin/users/:id/reject', (req, res) => {
  const updated = dataStore.updateUserStatus(req.params.id, 'rejected', 'Admin');
  if (!updated) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.json({ success: true, user: updated });
});

// Change user role, playerType and appRole
apiRouter.post('/admin/users/:id/role', (req, res) => {
  const { role, playerType, appRole } = req.body;
  const user = dataStore.findUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

  const nextPlayerType = playerType || user.playerType || (role === 'dm' ? 'dm' : role === 'player' ? 'player' : 'both');
  const nextAppRole = appRole || user.appRole || (role === 'admin' ? 'admin' : role === 'creator' ? 'creator' : role === 'moderator' ? 'moderator' : 'client');
  const nextRole = role || (nextAppRole === 'admin' ? 'admin' : nextAppRole === 'creator' ? 'creator' : nextAppRole === 'moderator' ? 'moderator' : nextPlayerType);

  const updated = dataStore.adminUpdateUserAccount(req.params.id, {
    role: nextRole as any,
    playerType: nextPlayerType as any,
    appRole: nextAppRole as any,
    canPostInForum: nextAppRole === 'admin' || nextAppRole === 'creator' || nextAppRole === 'moderator' ? true : user.canPostInForum,
  } as any);

  if (!updated) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.json({ success: true, user: updated });
});

// Admin / Moderator / Creator broadcasts a live pop-up notification to all online users
apiRouter.post('/admin/live-popup', (req, res) => {
  const { title, message, senderName, senderTag, senderRole } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'El mensaje del aviso pop-up es obligatorio.' });
  }

  const currentSettings = dataStore.getHostSettings();
  const popupPayload = {
    id: `popup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: (title || '').trim() || 'Aviso en Vivo del Administrador',
    message: message.trim(),
    senderName: (senderName || '').trim() || 'Administrador',
    senderTag: senderTag || 'adm',
    senderRole: senderRole || 'admin',
    sentAt: Date.now(),
  };

  const updatedSettings = {
    ...currentSettings,
    liveBroadcastPopup: popupPayload,
  };
  dataStore.saveHostSettings(updatedSettings);

  res.json({
    success: true,
    popup: popupPayload,
    settings: updatedSettings,
    message: '¡Aviso pop-up en vivo enviado a todos los usuarios conectados!',
  });
});

// Admin updates user password directly
apiRouter.post('/admin/users/:id/password', (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || !newPassword.trim()) {
    return res.status(400).json({ error: 'La nueva contraseña no puede estar vacía.' });
  }
  const updated = dataStore.updateUserPassword(req.params.id, newPassword.trim(), true);
  if (!updated) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.json({
    success: true,
    user: updated,
    message: `Contraseña de ${updated.displayName} actualizada con éxito a: "${newPassword.trim()}".`,
  });
});

// Admin injects Player Sheet or World Sheet to user
apiRouter.post('/admin/users/:id/inject-sheet', (req, res) => {
  const user = dataStore.findUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  const { type, data, name, roomCode, roomPassword } = req.body;
  if (!type || !data) {
    return res.status(400).json({ error: 'Tipo ("player" o "world") y datos JSON son requeridos.' });
  }

  if (type === 'player') {
    // If wrapped in { character: ... }
    const charObj = data.character || data;
    const record = dataStore.injectPlayerSheet(user.email, charObj, name || data.name);
    return res.json({
      success: true,
      type: 'player',
      record,
      message: `Ficha de personaje "${record.name}" inyectada con éxito a la cuenta ${user.displayName} (${user.email}).`,
    });
  } else if (type === 'world') {
    // If wrapped in { workspace: ... }
    const wsObj = data.workspace || data;
    const record = dataStore.injectWorldSheet(
      user.email,
      wsObj,
      name || data.name,
      roomCode || data.roomCode,
      roomPassword || data.roomPassword
    );
    return res.json({
      success: true,
      type: 'world',
      record,
      message: `World Sheet "${record.name}" (Mesa: ${record.roomCode}) inyectado con éxito a la cuenta ${user.displayName} (${user.email}).`,
    });
  } else {
    return res.status(400).json({ error: 'Tipo inválido. Debe ser "player" o "world".' });
  }
});

// Admin list feedback
apiRouter.get('/admin/feedback', (req, res) => {
  const feedback = dataStore.getFeedback();
  res.json({ feedback });
});

// Admin delete feedback
apiRouter.delete('/admin/feedback/:id', (req, res) => {
  const ok = dataStore.deleteFeedback(req.params.id);
  res.json({ success: ok });
});

// Admin update feedback status
apiRouter.post('/admin/feedback/:id/status', (req, res) => {
  const { status } = req.body;
  if (status !== 'unread' && status !== 'reviewed') {
    return res.status(400).json({ error: 'Estado inválido.' });
  }
  const ok = dataStore.updateFeedbackStatus(req.params.id, status);
  res.json({ success: ok });
});

// ==========================================
// MODERATOR PANEL ENDPOINTS (SIMPLIFIED)
// ==========================================

// Moderator lists users (email, displayName, tag, playerType, appRole, status, forum permission)
apiRouter.get('/moderator/users', (req, res) => {
  const users = dataStore.getUsers().map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    userTagId: u.userTagId || '123',
    fullTag: `${u.displayName}@${u.userTagId || '123'}`,
    avatarUrl: u.avatarUrl,
    playerType: u.playerType || (u.role === 'dm' ? 'dm' : u.role === 'player' ? 'player' : 'both'),
    appRole: u.appRole || (u.role === 'admin' ? 'admin' : u.role === 'creator' ? 'creator' : u.role === 'moderator' ? 'moderator' : 'client'),
    canPostInForum: u.appRole === 'admin' || u.appRole === 'creator' || u.appRole === 'moderator' ? true : Boolean(u.canPostInForum),
    forumPermissionsRequested: Boolean(u.forumPermissionsRequested),
    status: u.status,
    registeredAt: u.registeredAt,
    lastActiveAt: u.lastActiveAt,
  }));
  res.json({ users });
});

// Moderator / Admin grants or revokes permission to post in forum
apiRouter.post('/moderator/users/:id/forum-permission', (req, res) => {
  const { allowed } = req.body;
  const updated = dataStore.setUserForumPostingPermission(req.params.id, Boolean(allowed));
  if (!updated) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }
  res.json({
    success: true,
    user: updated,
    message: `Permiso para publicar en el foro ${allowed ? 'concedido' : 'revocado'} a ${updated.displayName}@${updated.userTagId}.`,
  });
});

// User requests forum posting permission
apiRouter.post('/auth/request-forum-permission', (req, res) => {
  const { userId, email } = req.body;
  const user = (userId ? dataStore.findUserById(userId) : undefined) || (email ? dataStore.findUserByEmail(email) : undefined);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }
  dataStore.requestForumPostingPermission(user.id);
  res.json({
    success: true,
    message: 'Solicitud enviada a los moderadores. Revisarán tu perfil para habilitar tus permisos de publicación.',
  });
});

// ==========================================
// FORUM ENDPOINTS (WEROLL FORUM)
// ==========================================

// Get forum posts (with category, roleFilter, search query)
apiRouter.get('/forum/posts', (req, res) => {
  const category = (req.query.category as string) || undefined;
  const roleFilter = (req.query.roleFilter as string) || undefined;
  const q = (req.query.q as string) || undefined;
  const posts = dataStore.getForumPosts(category, roleFilter, q);
  res.json({ posts });
});

// Get single forum post with comments
apiRouter.get('/forum/posts/:id', (req, res) => {
  const result = dataStore.getForumPostWithComments(req.params.id);
  if (!result.post) {
    return res.status(404).json({ error: 'Publicación no encontrada.' });
  }
  res.json(result);
});

// Create forum post
apiRouter.post('/forum/posts', (req, res) => {
  try {
    const {
      category,
      title,
      content,
      authorEmail,
      authorName,
      authorTagId,
      authorPlayerType,
      authorAppRole,
      flair,
    } = req.body;

    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({ error: 'El título y el contenido son obligatorios.' });
    }

    // Verify user posting permission
    const authorUser = authorEmail ? dataStore.findUserByEmail(authorEmail) : undefined;
    const isAdmin = authorAppRole === 'admin' || authorUser?.appRole === 'admin' || authorUser?.role === 'admin';
    const isPrivileged = isAdmin || authorAppRole === 'moderator' || authorUser?.appRole === 'moderator' || authorUser?.role === 'moderator';

    if (category === 'app-updates' && !isAdmin) {
      return res.status(403).json({
        error: 'Únicamente los administradores del sistema pueden publicar en "Actualizaciones de la App".',
      });
    }

    if (!isPrivileged && authorUser && !authorUser.canPostInForum) {
      return res.status(403).json({
        error: 'Para publicar en el foro se requiere la aprobación de un moderador o administrador. Envía una solicitud desde tu perfil.',
      });
    }

    const created = dataStore.createForumPost({
      category: category || 'community',
      title: title.trim(),
      content: content.trim(),
      authorEmail: authorEmail?.trim() || authorUser?.email || 'anon@weroll.app',
      authorName: authorName?.trim() || authorUser?.displayName || 'Aventurero',
      authorTagId: authorTagId || authorUser?.userTagId || '123',
      authorFullTag: `${authorName || authorUser?.displayName || 'Aventurero'}@${authorTagId || authorUser?.userTagId || '123'}`,
      authorPlayerType: authorPlayerType || authorUser?.playerType || 'player',
      authorAppRole: authorAppRole || authorUser?.appRole || 'client',
      flair: flair || 'General',
    });

    res.json({ success: true, post: created, message: '¡Publicación creada exitosamente en el foro!' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al crear la publicación.' });
  }
});

// Update forum post (author, moderator or admin)
apiRouter.put('/forum/posts/:id', (req, res) => {
  try {
    const { title, content, flair, pinned } = req.body;
    const updated = dataStore.updateForumPost(req.params.id, {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(content !== undefined ? { content: content.trim() } : {}),
      ...(flair !== undefined ? { flair } : {}),
      ...(pinned !== undefined ? { pinned: Boolean(pinned) } : {}),
    });
    if (!updated) {
      return res.status(404).json({ error: 'Publicación no encontrada.' });
    }
    res.json({ success: true, post: updated, message: 'Publicación actualizada.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al actualizar.' });
  }
});

// Delete forum post (author, moderator or admin)
apiRouter.delete('/forum/posts/:id', (req, res) => {
  const ok = dataStore.deleteForumPost(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Publicación no encontrada.' });
  res.json({ success: true, message: 'Publicación eliminada correctamente.' });
});

// Upvote / Toggle upvote on forum post
apiRouter.post('/forum/posts/:id/upvote', (req, res) => {
  try {
    const { userEmail } = req.body;
    if (!userEmail) return res.status(400).json({ error: 'Email requerido.' });
    const result = dataStore.upvoteForumPost(req.params.id, userEmail);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al registrar voto.' });
  }
});

// Add comment to forum post
apiRouter.post('/forum/posts/:id/comments', (req, res) => {
  try {
    const { content, authorEmail, authorName, authorTagId, authorPlayerType, authorAppRole } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'El contenido del comentario es requerido.' });
    }

    const authorUser = authorEmail ? dataStore.findUserByEmail(authorEmail) : undefined;
    const isPrivileged = authorAppRole === 'admin' || authorAppRole === 'moderator' ||
      authorUser?.appRole === 'admin' || authorUser?.appRole === 'moderator';

    if (!isPrivileged && authorUser && !authorUser.canPostInForum) {
      return res.status(403).json({
        error: 'Para responder en el foro se requiere la aprobación de un moderador o administrador.',
      });
    }

    const newComment = dataStore.addForumComment({
      postId: req.params.id,
      content: content.trim(),
      authorEmail: authorEmail?.trim() || authorUser?.email || 'anon@weroll.app',
      authorName: authorName?.trim() || authorUser?.displayName || 'Aventurero',
      authorTagId: authorTagId || authorUser?.userTagId || '123',
      authorFullTag: `${authorName || authorUser?.displayName || 'Aventurero'}@${authorTagId || authorUser?.userTagId || '123'}`,
      authorPlayerType: authorPlayerType || authorUser?.playerType || 'player',
      authorAppRole: authorAppRole || authorUser?.appRole || 'client',
    });

    res.json({ success: true, comment: newComment });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al agregar comentario.' });
  }
});

// Delete comment (author, moderator or admin)
apiRouter.delete('/forum/comments/:id', (req, res) => {
  const ok = dataStore.deleteForumComment(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Comentario no encontrado.' });
  res.json({ success: true, message: 'Comentario eliminado.' });
});

// Upvote comment
apiRouter.post('/forum/comments/:id/upvote', (req, res) => {
  try {
    const { userEmail } = req.body;
    if (!userEmail) return res.status(400).json({ error: 'Email requerido.' });
    const result = dataStore.upvoteForumComment(req.params.id, userEmail);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al votar comentario.' });
  }
});

// ==========================================
// FRIEND DIRECT MESSAGING ENDPOINTS
// ==========================================

// Get conversation messages between two friends
apiRouter.get('/friends/messages', (req, res) => {
  const userId = (req.query.userId as string || '').trim();
  const friendId = (req.query.friendId as string || '').trim();

  if (!userId) {
    return res.status(400).json({ error: 'userId requerido.' });
  }

  if (friendId) {
    const messages = dataStore.getFriendDirectMessages(userId, friendId);
    dataStore.markFriendDirectMessagesAsRead(userId, friendId);
    return res.json({ messages });
  }

  const allMessages = dataStore.getAllUserDirectMessages(userId);
  res.json({ messages: allMessages });
});

// Send direct message to a friend
apiRouter.post('/friends/messages/send', (req, res) => {
  try {
    const { fromUserId, toUserId, content } = req.body;
    if (!fromUserId || !toUserId || !content || !content.trim()) {
      return res.status(400).json({ error: 'Emisor, receptor y contenido del mensaje son requeridos.' });
    }

    const fromUser = dataStore.findUserById(fromUserId);
    const toUser = dataStore.findUserById(toUserId);

    if (!fromUser || !toUser) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const newMsg = dataStore.sendFriendDirectMessage({
      fromUserId: fromUser.id,
      fromDisplayName: fromUser.displayName,
      fromUserTagId: fromUser.userTagId || '123',
      fromFullTag: `${fromUser.displayName}@${fromUser.userTagId || '123'}`,
      fromEmail: fromUser.email,
      toUserId: toUser.id,
      toDisplayName: toUser.displayName,
      toUserTagId: toUser.userTagId || '123',
      toFullTag: `${toUser.displayName}@${toUser.userTagId || '123'}`,
      toEmail: toUser.email,
      content: content.trim(),
    });

    res.json({ success: true, message: newMsg });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al enviar mensaje a amigo.' });
  }
});

// Mark messages from friend as read
apiRouter.post('/friends/messages/read', (req, res) => {
  const { toUserId, fromUserId } = req.body;
  if (toUserId && fromUserId) {
    dataStore.markFriendDirectMessagesAsRead(toUserId, fromUserId);
  }
  res.json({ success: true });
});

// ==========================================
// ROOMS & SESSION MANAGEMENT (WITH PASSWORDS)
// ==========================================

// DM Registers or Updates a Room with Password & World Sheet
apiRouter.post('/rooms/create', (req, res) => {
  try {
    const { roomCode, name, dmEmail, dmDisplayName, password, worldSheetId } = req.body;
    if (!roomCode) {
      return res.status(400).json({ error: 'Código de sala requerido.' });
    }

    const normCode = normalizeRoomIdentifier(roomCode);
    const activeRoomsList = Object.values(rooms)
      .filter((r) => r.dmConnected && Date.now() - (r.dmLastPing || 0) < 30 * 60 * 1000)
      .map((r) => {
        const rec = dataStore.getRoom(r.roomCode);
        const ownerWorld = dataStore
          .getWorldSheets()
          .find((w) => normalizeRoomIdentifier(w.roomCode || w.name) === normalizeRoomIdentifier(r.roomCode));
        return {
          roomCode: r.roomCode,
          name: rec?.name || ownerWorld?.name || r.roomCode,
          dmEmail: rec?.dmEmail || ownerWorld?.ownerEmail,
          dmConnected: r.dmConnected,
          worldSheetId: rec?.worldSheetId || ownerWorld?.id,
        };
      });

    const uniqueness = dataStore.validateRoomCreation({
      roomCode: normCode,
      roomName: name || normCode,
      dmEmail: dmEmail || 'dm@weroll.app',
      worldSheetId,
      activeRooms: activeRoomsList,
    });

    if (!uniqueness.valid) {
      return res.status(400).json({
        error: uniqueness.error || `Ya existe una mesa o sala con el nombre "${name || normCode}" creada por otro Dungeon Master.`,
      });
    }

    dataStore.setRoom({
      roomCode: normCode,
      name: name || normCode,
      dmEmail: dmEmail || 'dm@weroll.app',
      dmDisplayName: dmDisplayName || 'Dungeon Master',
      password: password ? password.trim() : undefined,
      worldSheetId,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    const room = getOrCreateRoom(normCode);
    room.dmConnected = true;
    room.dmLastPing = Date.now();
    room.lastUpdated = Date.now();

    res.json({ success: true, roomCode: normCode });
  } catch (err: any) {
    return res.status(400).json({
      error: err.message || 'No se pudo abrir la mesa porque otro Dungeon Master ya tiene registrada una sala con ese nombre.',
    });
  }
});

// Validate if a room name / code is available across DMs
apiRouter.post('/rooms/validate-name', (req, res) => {
  const { roomCode, name, dmEmail, worldSheetId } = req.body;
  const activeRoomsList = Object.values(rooms)
    .filter((r) => r.dmConnected && Date.now() - (r.dmLastPing || 0) < 30 * 60 * 1000)
    .map((r) => {
      const rec = dataStore.getRoom(r.roomCode);
      const ownerWorld = dataStore
        .getWorldSheets()
        .find((w) => normalizeRoomIdentifier(w.roomCode || w.name) === normalizeRoomIdentifier(r.roomCode));
      return {
        roomCode: r.roomCode,
        name: rec?.name || ownerWorld?.name || r.roomCode,
        dmEmail: rec?.dmEmail || ownerWorld?.ownerEmail,
        dmConnected: r.dmConnected,
        worldSheetId: rec?.worldSheetId || ownerWorld?.id,
      };
    });

  const check = dataStore.validateRoomCreation({
    roomCode: roomCode || name || '',
    roomName: name || roomCode || '',
    dmEmail,
    worldSheetId,
    activeRooms: activeRoomsList,
  });

  if (!check.valid) {
    return res.status(400).json({ valid: false, error: check.error });
  }
  res.json({ valid: true, normalizedCode: normalizeRoomIdentifier(roomCode || name || '') });
});

// Verify Room Code & Password before player joins
apiRouter.post('/rooms/verify', (req, res) => {
  const { roomCode, password } = req.body;
  if (!roomCode) {
    return res.status(400).json({ valid: false, error: 'Código de mesa requerido.' });
  }

  const normCode = roomCode.trim().toUpperCase();
  const roomRecord = dataStore.getRoom(normCode);

  // If room record exists and has a password
  if (roomRecord && roomRecord.password && roomRecord.password.trim() !== '') {
    if (!password || password.trim() !== roomRecord.password.trim()) {
      return res.status(401).json({
        valid: false,
        error: 'Contraseña de la mesa incorrecta. Solicítala a tu Dungeon Master.',
      });
    }
  }

  res.json({
    valid: true,
    room: {
      roomCode: normCode,
      name: roomRecord?.name || normCode,
      dmDisplayName: roomRecord?.dmDisplayName || 'Dungeon Master',
    },
  });
});

// Close Room (called when DM leaves to lobby - room ceases to exist)
apiRouter.post('/rooms/close', (req, res) => {
  const { roomCode } = req.body;
  if (!roomCode) {
    return res.status(400).json({ error: 'Código de mesa requerido.' });
  }

  const normCode = roomCode.trim().toUpperCase();
  dataStore.closeRoom(normCode);
  if (rooms[normCode]) {
    delete rooms[normCode];
  }

  res.json({ success: true, message: 'Mesa cerrada correctamente.' });
});

// 2. Room State Sync (Get full room status with AFK Presence)
apiRouter.get('/session/room/:roomCode', (req, res) => {
  const normCode = req.params.roomCode.trim().toUpperCase();
  const roomRecord = dataStore.getRoom(normCode);
  const inMemoryRoom = rooms[normCode];

  // If room does not exist in dataStore AND has no active DM in memory, return closed flag with 200 status
  if (!roomRecord && (!inMemoryRoom || !inMemoryRoom.dmConnected)) {
    return res.status(200).json({
      roomCode: normCode,
      closed: true,
      error: 'La mesa no existe o ha sido cerrada por el Dungeon Master.',
    });
  }

  const room = getOrCreateRoom(normCode);
  const now = Date.now();

  if (room.playerMessages.length === 0) {
    const matchingWorld = dataStore
      .getWorldSheets()
      .find((w) => normalizeRoomIdentifier(w.roomCode || w.name) === normalizeRoomIdentifier(normCode));
    if (matchingWorld && Array.isArray(matchingWorld.workspace?.playerMessages) && matchingWorld.workspace.playerMessages.length > 0) {
      room.playerMessages = matchingWorld.workspace.playerMessages;
    }
  }

  // Prune inactive players (idle > 15 min)
  const activeParty = Object.values(room.party).filter(
    (p) => now - p.lastPing < 15 * 60 * 1000
  );

  const dmActive = Boolean(room.dmConnected && (now - (room.dmLastPing || 0) < 15 * 60 * 1000));

  res.json({
    roomCode: room.roomCode,
    party: activeParty,
    dmConnected: dmActive,
    dmLiveMessage: room.dmLiveMessage || '',
    dmPresenceStatus: room.dmPresenceStatus || (dmActive ? 'active' : 'offline'),
    dmIdleSeconds: room.dmIdleSeconds || 0,
    dmLastRoll: room.dmLastRoll,
    rollFeed: room.rollFeed.slice(-30),
    dmAnnouncements: room.dmAnnouncements.slice(-10),
    currentQuest: room.currentQuest,
    quickNotification: room.quickNotification,
    showCombatantsOnTable: Boolean(room.showCombatantsOnTable),
    liveCombatants: room.liveCombatants || [],
    pendingOffers: (room.pendingOffers || []).slice(-30),
    playerMessages: (room.playerMessages || []).slice(0, 100),
  });
});

// 2a-bis. DM Shares an Item, Spell, or Ability with a Player in the SAME Room (Creates Pending Offer)
apiRouter.post('/session/room/:roomCode/offer', (req, res) => {
  const normCode = req.params.roomCode.trim().toUpperCase();
  const roomRecord = dataStore.getRoom(normCode);
  if (!roomRecord) {
    return res.status(404).json({ error: 'La sala no existe o no está activa.' });
  }

  const room = getOrCreateRoom(normCode);
  const {
    targetCharacterId,
    targetCharacterName,
    targetPlayerName,
    kind,
    title,
    rarity,
    category,
    description,
    item,
    spell,
    ability,
  } = req.body;

  if (!targetCharacterId || !kind || !title) {
    return res.status(400).json({ error: 'Faltan datos para compartir el elemento con el jugador.' });
  }

  // Verify the player is currently connected in this same room!
  const now = Date.now();
  const activeMember = Object.values(room.party).find(
    (p) => p.characterId === targetCharacterId && now - p.lastPing < 15 * 60 * 1000
  );

  if (!activeMember) {
    return res.status(400).json({
      error: `El personaje seleccionado (${targetCharacterName || targetCharacterId}) no se encuentra conectado actualmente en tu misma sala (${normCode}). Solo puedes compartir con jugadores que estén dentro de la misma sala.`,
    });
  }

  const newOffer: PendingDmOffer = {
    id: `offer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    roomCode: normCode,
    targetCharacterId: activeMember.characterId,
    targetCharacterName: activeMember.characterName || targetCharacterName || 'Aventurero',
    targetPlayerName: activeMember.playerName || targetPlayerName || 'Jugador',
    kind,
    title,
    rarity,
    category,
    description,
    item,
    spell,
    ability,
    status: 'pending',
    dmNotified: false,
    createdAt: Date.now(),
  };

  room.pendingOffers.push(newOffer);
  room.lastUpdated = Date.now();

  res.json({
    success: true,
    offer: newOffer,
    message: `Solicitud enviada a ${newOffer.targetCharacterName} en la sala ${normCode}. Esperando su respuesta...`,
  });
});

// 2a-ter. Player Accepts or Declines a DM Shared Item, Spell, or Ability Offer
apiRouter.post('/session/room/:roomCode/offer/:offerId/respond', (req, res) => {
  const normCode = req.params.roomCode.trim().toUpperCase();
  const room = getOrCreateRoom(normCode);
  const { offerId } = req.params;
  const { decision, character } = req.body; // decision: 'accepted' | 'declined'

  const offer = room.pendingOffers.find((o) => o.id === offerId);
  if (!offer) {
    return res.status(404).json({ error: 'La oferta compartida ya no está disponible.' });
  }

  if (offer.status !== 'pending') {
    return res.json({ success: true, offer, alreadyResolved: true });
  }

  offer.status = decision === 'accepted' ? 'accepted' : 'declined';
  offer.resolvedAt = Date.now();
  offer.dmNotified = false;
  room.lastUpdated = Date.now();

  let updatedCharacter = null;

  if (offer.status === 'accepted') {
    const sheets = dataStore.getPlayerSheets();
    let sheet = sheets.find(
      (s) =>
        s.id === offer.targetCharacterId ||
        (s.character && s.character.id === offer.targetCharacterId)
    );

    // If sheet isn't in vault yet but player passed their character in body, register/update it
    if (!sheet && character && character.id === offer.targetCharacterId) {
      sheet = {
        id: character.id,
        ownerEmail: (character.ownerEmail || 'jugador@weroll.app').toLowerCase(),
        name: character.name,
        character: { ...character },
        updatedAt: Date.now(),
      };
    }

    if (sheet && sheet.character) {
      const char = sheet.character;
      if (offer.kind === 'item' && offer.item) {
        if (!Array.isArray(char.inventory)) char.inventory = [];
        if (!char.inventory.some((i) => i.id === offer.item!.id)) {
          char.inventory.push(offer.item);
        }
      } else if (offer.kind === 'spell' && offer.spell) {
        if (!Array.isArray(char.spells)) char.spells = [];
        if (!char.spells.some((sp) => sp.id === offer.spell!.id)) {
          char.spells.push(offer.spell);
        }
      } else if (offer.kind === 'ability' && offer.ability) {
        if (!Array.isArray(char.featuresAndTraits)) char.featuresAndTraits = [];
        if (!char.featuresAndTraits.some((ft) => ft.id === offer.ability!.id)) {
          char.featuresAndTraits.push(offer.ability);
        }
        if (!Array.isArray(char.customSkills)) char.customSkills = [];
        if (!char.customSkills.some((cs) => cs.id === offer.ability!.id || cs.name === offer.ability!.name)) {
          char.customSkills.push({
            id: offer.ability.id || `cskill-${Date.now()}`,
            name: offer.ability.name,
            ability: offer.ability.abilityStat || 'int',
            proficiency: 'proficient',
            description: offer.ability.description || 'Habilidad otorgada por el Dungeon Master.',
          });
        }
      }
      sheet.updatedAt = Date.now();
      dataStore.savePlayerSheet(sheet);
      updatedCharacter = char;
    }
  }

  res.json({
    success: true,
    offer,
    updatedCharacter,
    message:
      offer.status === 'accepted'
        ? `¡Has recibido "${offer.title}" del Dungeon Master!`
        : `Has rechazado recibir "${offer.title}".`,
  });
});

// 2a-quater. DM Acknowledges Offer Resolution Notification
apiRouter.post('/session/room/:roomCode/offer/:offerId/ack-dm', (req, res) => {
  const normCode = req.params.roomCode.trim().toUpperCase();
  const room = getOrCreateRoom(normCode);
  const { offerId } = req.params;

  const offer = room.pendingOffers.find((o) => o.id === offerId);
  if (offer) {
    offer.dmNotified = true;
  }
  res.json({ success: true });
});

// 2b. Post DM Heartbeat, Live Message, Presence & Active Encounter Combatants
apiRouter.post('/session/room/:roomCode/dm-heartbeat', (req, res) => {
  const room = getOrCreateRoom(req.params.roomCode);
  const {
    dmLiveMessage,
    dmConnected = true,
    presenceStatus = 'active',
    idleSeconds = 0,
    showCombatantsOnTable,
    liveCombatants,
  } = req.body;

  room.dmConnected = dmConnected;
  room.dmLastPing = Date.now();
  room.dmPresenceStatus = presenceStatus;
  room.dmIdleSeconds = idleSeconds;
  if (dmLiveMessage !== undefined) {
    room.dmLiveMessage = dmLiveMessage;
  }
  if (showCombatantsOnTable !== undefined) {
    room.showCombatantsOnTable = Boolean(showCombatantsOnTable);
  }
  if (Array.isArray(liveCombatants)) {
    room.liveCombatants = liveCombatants;
  }
  room.lastUpdated = Date.now();
  res.json({
    success: true,
    dmLiveMessage: room.dmLiveMessage,
    dmPresenceStatus: room.dmPresenceStatus,
    showCombatantsOnTable: room.showCombatantsOnTable,
    liveCombatants: room.liveCombatants,
  });
});

// 2c. Player Sends a Private Message to the DM in the Room
apiRouter.post('/session/room/:roomCode/player-message', (req, res) => {
  try {
    const normCode = req.params.roomCode.trim().toUpperCase();
    const room = getOrCreateRoom(normCode);
    const {
      characterId,
      characterName,
      playerName,
      playerTagId,
      playerEmail,
      title,
      description,
    } = req.body;

    // Enrich playerTagId from user store if playerEmail is provided
    const normEmail = (playerEmail || '').trim().toLowerCase();
    const foundUser = normEmail ? dataStore.findUserByEmail(normEmail) : undefined;
    const resolvedTagId = playerTagId || foundUser?.userTagId || '123';
    const resolvedPlayerName = playerName || foundUser?.displayName || 'Jugador';

    const builtMsg: PlayerMessageToDM = buildPlayerMessageToDM({
      roomCode: normCode,
      characterId,
      characterName,
      playerName: resolvedPlayerName,
      playerTagId: resolvedTagId,
      playerEmail: normEmail || undefined,
      title,
      description,
    });

    room.playerMessages.unshift(builtMsg);
    if (room.playerMessages.length > 200) {
      room.playerMessages = room.playerMessages.slice(0, 200);
    }
    room.lastUpdated = Date.now();

    // Persist into dataStore vault (ensures inclusion in cloud backups & master export)
    dataStore.saveDmMessage(builtMsg);

    // Also persist into matching WorldSheet workspace if one exists
    const allWorlds = dataStore.getWorldSheets();
    const matchingWorld = allWorlds.find(
      (w) => normalizeRoomIdentifier(w.roomCode || w.name) === normalizeRoomIdentifier(normCode)
    );
    if (matchingWorld && matchingWorld.workspace) {
      matchingWorld.workspace.playerMessages = room.playerMessages;
      matchingWorld.updatedAt = Date.now();
      try {
        dataStore.saveWorldSheet(matchingWorld);
      } catch {}
    }

    res.json({
      success: true,
      playerMessage: builtMsg,
      playerMessages: room.playerMessages,
      message: '¡Tu mensaje privado ha sido enviado al Dungeon Master!',
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Faltan datos para enviar el mensaje al DM.' });
  }
});

// 2d. DM Marks a Player Message as Read or Deletes It
apiRouter.post('/session/room/:roomCode/player-message/:messageId/read', (req, res) => {
  const normCode = req.params.roomCode.trim().toUpperCase();
  const room = getOrCreateRoom(normCode);
  const msg = room.playerMessages.find((m) => m.id === req.params.messageId);
  if (msg) {
    msg.readByDm = true;
    room.lastUpdated = Date.now();
    dataStore.markDmMessageRead(req.params.messageId);
  }
  res.json({ success: true, playerMessages: room.playerMessages });
});

apiRouter.delete('/session/room/:roomCode/player-message/:messageId', (req, res) => {
  const normCode = req.params.roomCode.trim().toUpperCase();
  const room = getOrCreateRoom(normCode);
  room.playerMessages = room.playerMessages.filter((m) => m.id !== req.params.messageId);
  room.lastUpdated = Date.now();
  dataStore.deleteDmMessage(req.params.messageId);

  const allWorlds = dataStore.getWorldSheets();
  const matchingWorld = allWorlds.find(
    (w) => normalizeRoomIdentifier(w.roomCode || w.name) === normalizeRoomIdentifier(normCode)
  );
  if (matchingWorld && matchingWorld.workspace) {
    matchingWorld.workspace.playerMessages = room.playerMessages;
    matchingWorld.updatedAt = Date.now();
    try {
      dataStore.saveWorldSheet(matchingWorld);
    } catch {}
  }

  res.json({ success: true, playerMessages: room.playerMessages });
});

// 3. Post Player Heartbeat & 4-Tier Presence Update + Live Stats & Coins
apiRouter.post('/session/room/:roomCode/heartbeat', (req, res) => {
  const room = getOrCreateRoom(req.params.roomCode);
  const {
    characterId,
    characterName,
    playerName,
    playerTagId,
    playerFullTag,
    playerEmail,
    avatarType,
    avatarCustomUrl,
    avatarIcon,
    avatarUrl,
    currentHp,
    maxHp,
    ac,
    passivePerception,
    level,
    characterClass,
    presenceStatus = 'active',
    idleSeconds = 0,
    lastRoll,
    abilities,
    currency,
  } = req.body;

  if (characterId) {
    const existing = room.party[characterId];
    const normEmail = (playerEmail || existing?.playerEmail || '').trim().toLowerCase();
    const foundUser = normEmail ? dataStore.findUserByEmail(normEmail) : undefined;
    const resolvedPlayerName = playerName || foundUser?.displayName || existing?.playerName || 'Jugador';
    const resolvedTagId = playerTagId || foundUser?.userTagId || existing?.playerTagId || '123';
    const resolvedFullTag = playerFullTag || existing?.playerFullTag || `${resolvedPlayerName}@${resolvedTagId}`;

    room.party[characterId] = {
      characterId,
      characterName: characterName || 'Aventurero',
      playerName: resolvedPlayerName,
      playerTagId: resolvedTagId,
      playerFullTag: resolvedFullTag,
      playerEmail: normEmail || undefined,
      avatarType: avatarType !== undefined ? avatarType : existing?.avatarType,
      avatarCustomUrl: avatarCustomUrl !== undefined ? avatarCustomUrl : existing?.avatarCustomUrl,
      avatarIcon: avatarIcon !== undefined ? avatarIcon : existing?.avatarIcon,
      avatarUrl: avatarUrl !== undefined ? avatarUrl : existing?.avatarUrl,
      currentHp: Number(currentHp) || 0,
      maxHp: Number(maxHp) || 10,
      ac: Number(ac) || 10,
      passivePerception: Number(passivePerception) || 10,
      level: Number(level) || 1,
      characterClass: characterClass || 'Aventurero',
      lastPing: Date.now(),
      presenceStatus,
      idleSeconds,
      lastRoll: lastRoll || existing?.lastRoll,
      abilities: abilities || existing?.abilities,
      currency: currency || existing?.currency,
    };
    room.lastUpdated = Date.now();
  }

  res.json({ success: true });
});

// Player Leave Room (trigger leave backup)
apiRouter.post('/session/room/:roomCode/leave', (req, res) => {
  const room = getOrCreateRoom(req.params.roomCode);
  const { characterId, character, ownerEmail } = req.body;

  if (characterId && room.party[characterId]) {
    delete room.party[characterId];
    room.lastUpdated = Date.now();
  }

  if (character) {
    dataStore.addRotatingBackup(character, ownerEmail || 'jugador@weroll.app', 'leave');
  }

  res.json({ success: true });
});

// ==========================================
// VAULT PERSISTENCE & ROTATING BACKUPS
// ==========================================

// Save Player Sheet to Server Vault + Trigger Join/Periodic Backup
apiRouter.post('/vault/sheets', (req, res) => {
  const { character, ownerEmail, reason = 'join' } = req.body;
  if (!character || !character.id) {
    return res.status(400).json({ error: 'Ficha de personaje requerida.' });
  }

  const email = (ownerEmail || 'jugador@weroll.app').toLowerCase();
  const allSheets = dataStore.getPlayerSheets();
  const userSheets = allSheets.filter((s) => s.ownerEmail === email);
  const isExisting = userSheets.some((s) => s.id === character.id);

  if (!isExisting && userSheets.length >= 3) {
    return res.status(400).json({
      error: 'Límite alcanzado: máximo 3 personajes por cuenta. Elimina una ficha existente para crear una nueva.',
    });
  }

  dataStore.savePlayerSheet({
    id: character.id,
    ownerEmail: email,
    name: character.name,
    character,
    updatedAt: Date.now(),
  });

  // Also rotate backup
  dataStore.addRotatingBackup(character, email, reason as any);

  // Trigger cloud autoBackup immediately in background so images & sheet data sync
  performAutoBackupTrigger(
    undefined,
    `Ficha/Avatar de jugador actualizado: ${character.name || 'Personaje'} (${email})`
  ).catch(() => {});

  res.json({ success: true, sheetId: character.id });
});

// Give item directly to a player's character sheet from DM
apiRouter.post('/vault/sheets/:id/give-item', (req, res) => {
  const { item } = req.body;
  if (!item || !item.name) {
    return res.status(400).json({ error: 'Objeto no válido.' });
  }

  const sheets = dataStore.getPlayerSheets();
  const sheet = sheets.find((s) => s.id === req.params.id || (s.character && s.character.id === req.params.id));
  if (!sheet) {
    return res.status(404).json({ error: 'Ficha de personaje no encontrada.' });
  }

  const char = sheet.character;
  if (!Array.isArray(char.inventory)) char.inventory = [];
  char.inventory.push(item);
  sheet.updatedAt = Date.now();

  dataStore.savePlayerSheet(sheet);
  res.json({ success: true, message: `Objeto "${item.name}" entregado con éxito a ${char.name}.`, sheet });
});

// Give spell directly to a player's character sheet from DM
apiRouter.post('/vault/sheets/:id/give-spell', (req, res) => {
  const { spell } = req.body;
  if (!spell || !spell.name) {
    return res.status(400).json({ error: 'Conjuro no válido.' });
  }

  const sheets = dataStore.getPlayerSheets();
  const sheet = sheets.find((s) => s.id === req.params.id || (s.character && s.character.id === req.params.id));
  if (!sheet) {
    return res.status(404).json({ error: 'Ficha de personaje no encontrada.' });
  }

  const char = sheet.character;
  if (!Array.isArray(char.spells)) char.spells = [];
  char.spells.push(spell);
  sheet.updatedAt = Date.now();

  dataStore.savePlayerSheet(sheet);
  res.json({ success: true, message: `Conjuro "${spell.name}" entregado con éxito a ${char.name}.`, sheet });
});

// Give ability/feature directly to a player's character sheet from DM
apiRouter.post('/vault/sheets/:id/give-ability', (req, res) => {
  const { ability } = req.body;
  if (!ability || !ability.name) {
    return res.status(400).json({ error: 'Habilidad no válida.' });
  }

  const sheets = dataStore.getPlayerSheets();
  const sheet = sheets.find((s) => s.id === req.params.id || (s.character && s.character.id === req.params.id));
  if (!sheet) {
    return res.status(404).json({ error: 'Ficha de personaje no encontrada.' });
  }

  const char = sheet.character;
  if (!Array.isArray(char.featuresAndTraits)) char.featuresAndTraits = [];
  char.featuresAndTraits.push(ability);
  sheet.updatedAt = Date.now();

  dataStore.savePlayerSheet(sheet);
  res.json({ success: true, message: `Habilidad "${ability.name}" entregada con éxito a ${char.name}.`, sheet });
});

// Delete Player Sheet
apiRouter.delete('/vault/sheets/:id', (req, res) => {
  const ownerEmail = (req.query.ownerEmail as string || req.body?.ownerEmail || '').toLowerCase();
  const success = dataStore.deletePlayerSheet(req.params.id, ownerEmail);
  if (!success) {
    return res.status(404).json({ error: 'Ficha de personaje no encontrada.' });
  }
  res.json({ success: true, message: 'Ficha eliminada correctamente.' });
});

// Get Player Sheets from Server Vault
apiRouter.get('/vault/sheets', (req, res) => {
  const ownerEmail = (req.query.ownerEmail as string || '').toLowerCase();
  const allSheets = dataStore.getPlayerSheets();
  if (ownerEmail) {
    const filtered = allSheets.filter((s) => s.ownerEmail === ownerEmail);
    return res.json({ sheets: filtered });
  }
  res.json({ sheets: allSheets });
});

// Save World Sheet to Server Vault (validates unique room/world name across DMs)
apiRouter.post('/vault/worlds', (req, res) => {
  try {
    const { world } = req.body;
    if (!world || !world.id) {
      return res.status(400).json({ error: 'World Sheet requerido.' });
    }

    const email = (world.ownerEmail || 'dm@weroll.app').toLowerCase();
    const allWorlds = dataStore.getWorldSheets();
    const userWorlds = allWorlds.filter((w) => w.ownerEmail === email);
    const isExisting = userWorlds.some((w) => w.id === world.id);

    if (!isExisting && userWorlds.length >= 3) {
      return res.status(400).json({
        error: 'Límite alcanzado: máximo 3 World Sheets por cuenta. Elimina uno existente para crear otro.',
      });
    }

    const activeRoomsList = Object.values(rooms)
      .filter((r) => r.dmConnected && Date.now() - (r.dmLastPing || 0) < 30 * 60 * 1000)
      .map((r) => {
        const rec = dataStore.getRoom(r.roomCode);
        const ownerWorld = allWorlds.find(
          (w) => normalizeRoomIdentifier(w.roomCode || w.name) === normalizeRoomIdentifier(r.roomCode)
        );
        return {
          roomCode: r.roomCode,
          name: rec?.name || ownerWorld?.name || r.roomCode,
          dmEmail: rec?.dmEmail || ownerWorld?.ownerEmail,
          dmConnected: r.dmConnected,
          worldSheetId: rec?.worldSheetId || ownerWorld?.id,
        };
      });

    const uniqueness = dataStore.validateRoomCreation({
      roomCode: world.roomCode || world.name || 'MESA-DRAGON',
      roomName: world.name || world.roomCode || 'Mundo Sin Nombre',
      dmEmail: email,
      worldSheetId: world.id,
      activeRooms: activeRoomsList,
    });

    if (!uniqueness.valid) {
      return res.status(400).json({
        error: uniqueness.error || 'Ya existe una mesa o sala con ese nombre creada por otro Dungeon Master.',
      });
    }

    dataStore.saveWorldSheet({
      id: world.id,
      ownerEmail: email,
      name: world.name || 'Mundo Sin Nombre',
      description: world.description,
      roomCode: normalizeRoomIdentifier(world.roomCode || world.name || 'MESA-DRAGON') || 'MESA-DRAGON',
      roomPassword: world.roomPassword,
      roomMode: world.roomMode === 'offline' ? 'offline' : 'online',
      workspace: world.workspace,
      updatedAt: Date.now(),
    });

    res.json({ success: true, worldId: world.id });
  } catch (err: any) {
    return res.status(400).json({
      error: err.message || 'No se pudo guardar el World Sheet por conflicto de nombre de sala.',
    });
  }
});

// Update World Sheet Config (Name, RoomCode, Password, RoomMode)
apiRouter.put('/vault/worlds/:id', (req, res) => {
  try {
    const { name, roomCode, roomPassword, roomMode, description, workspace, ownerEmail } = req.body;
    const email = (ownerEmail || '').toLowerCase();

    const updated = dataStore.updateWorldSheet(
      req.params.id,
      {
        ...(name ? { name } : {}),
        ...(roomCode ? { roomCode: roomCode.trim().toUpperCase() } : {}),
        ...(roomPassword !== undefined ? { roomPassword } : {}),
        ...(roomMode === 'online' || roomMode === 'offline' ? { roomMode } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(workspace ? { workspace } : {}),
      },
      email || undefined
    );

    if (!updated) {
      return res.status(404).json({ error: 'World Sheet no encontrado.' });
    }

    res.json({ success: true, world: updated });
  } catch (err: any) {
    return res.status(400).json({
      error: err.message || 'No se pudo actualizar el World Sheet por conflicto de nombre de sala.',
    });
  }
});

// Delete World Sheet
apiRouter.delete('/vault/worlds/:id', (req, res) => {
  const ownerEmail = (req.query.ownerEmail as string || req.body?.ownerEmail || '').toLowerCase();
  const success = dataStore.deleteWorldSheet(req.params.id, ownerEmail);
  if (!success) {
    return res.status(404).json({ error: 'World Sheet no encontrado.' });
  }
  res.json({ success: true, message: 'World Sheet eliminado correctamente.' });
});

// Get World Sheets from Server Vault
apiRouter.get('/vault/worlds', (req, res) => {
  const ownerEmail = (req.query.ownerEmail as string || '').toLowerCase();
  const allWorlds = dataStore.getWorldSheets();
  if (ownerEmail) {
    const filtered = allWorlds.filter((w) => w.ownerEmail === ownerEmail);
    return res.json({ worlds: filtered });
  }
  res.json({ worlds: allWorlds });
});

// Get Rotating Backups (for Admin viewer)
apiRouter.get('/vault/backups', (req, res) => {
  const backups = dataStore.getBackups();
  res.json({ backups });
});

// Master Full Database Backup Export for Admin
apiRouter.get('/vault/backup-all', (req, res) => {
  const backup = dataStore.getFullBackup();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="weroll-database-backup-${new Date().toISOString().split('T')[0]}.json"`);
  res.json(backup);
});

// Detailed list of all backups, player sheets, world sheets, sync metadata, and pre-replace archive for the Admin Vault
apiRouter.get('/admin/vault/details', (req, res) => {
  const sheets = dataStore.getPlayerSheets();
  const worlds = dataStore.getWorldSheets();
  const backupsMap = dataStore.getBackups();
  const syncMetadata = dataStore.getSyncMetadata();
  const replacedArchive = dataStore.getReplacedBackupsSummaries();
  res.json({
    sheets,
    worlds,
    backups: Object.values(backupsMap),
    syncMetadata,
    replacedArchive,
  });
});

// Get Pre-Replace Archive list ("Apartado de Respaldos Reemplazados")
apiRouter.get('/admin/vault/replaced-archive', (req, res) => {
  res.json({
    replacedArchive: dataStore.getReplacedBackupsSummaries(),
    syncMetadata: dataStore.getSyncMetadata(),
  });
});

// Download a specific Pre-Replace Archive JSON
apiRouter.get('/admin/vault/replaced-archive/:id/download', (req, res) => {
  const entry = dataStore.getReplacedBackupById(req.params.id);
  if (!entry) {
    return res.status(404).json({ error: 'Respaldo pre-reemplazo no encontrado.' });
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="weroll-pre-replace-${entry.id}.json"`
  );
  res.json(entry.snapshot);
});

// Restore a specific Pre-Replace Archive JSON (first archiving current state before replacing!)
apiRouter.post('/admin/vault/replaced-archive/:id/restore', async (req, res) => {
  try {
    const entry = dataStore.getReplacedBackupById(req.params.id);
    if (!entry || !entry.snapshot) {
      return res.status(404).json({ error: 'Respaldo pre-reemplazo no encontrado.' });
    }
    const currentLocal = dataStore.getFullBackup();
    await archiveBeforeReplaceToCloud(
      currentLocal,
      Date.now(),
      `Respaldo de seguridad antes de restaurar versión histórica (${entry.id})`
    );
    const remote = await fetchRemoteCloudBackup().catch(() => ({
      exists: false,
      remoteTimestamp: 0,
      remoteRevision: 0,
      contentHash: '',
      source: 'none' as const,
    }));
    const result = dataStore.restoreBackup(entry.snapshot, {
      replaceAll: true,
      isManualImport: true,
      remoteTimestamp: remote.exists ? remote.remoteTimestamp : 0,
      remoteRevision: remote.exists ? remote.remoteRevision : 0,
    });

    await performAutoBackupTrigger(
      undefined,
      `Versión histórica restaurada manualmente fijada como versión más actual (Rev #${result.revision})`
    ).catch((err) => console.warn('[AutoBackup Push on Import Error]:', err));

    res.json({
      ...result,
      latestBackup: dataStore.getFullBackup(),
      serverMeta: dataStore.getSyncMetadata(),
      message: `¡Versión histórica (${entry.id}) restaurada y fijada como la más actual (Rev #${result.revision})! El estado previo fue resguardado en el Apartado de Reemplazados.`,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al restaurar versión histórica.' });
  }
});

// Download individual player sheet JSON
apiRouter.get('/admin/vault/sheet/:id/download', (req, res) => {
  const sheets = dataStore.getPlayerSheets();
  const sheet = sheets.find((s) => s.id === req.params.id);
  if (!sheet) {
    return res.status(404).json({ error: 'Ficha de personaje no encontrada.' });
  }
  const safeName = (sheet.name || 'personaje').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="sheet-${safeName}-${sheet.id}.json"`);
  res.json(sheet);
});

// Download individual world sheet JSON
apiRouter.get('/admin/vault/world/:id/download', (req, res) => {
  const worlds = dataStore.getWorldSheets();
  const world = worlds.find((w) => w.id === req.params.id);
  if (!world) {
    return res.status(404).json({ error: 'World Sheet no encontrado.' });
  }
  const safeName = (world.name || 'campaña').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="world-${safeName}-${world.id}.json"`);
  res.json(world);
});

// Download individual rotating backup JSON
apiRouter.get('/admin/vault/backup/:charId/download', (req, res) => {
  const backups = dataStore.getBackups();
  const entry = backups[req.params.charId];
  if (!entry) {
    return res.status(404).json({ error: 'Respaldo no encontrado.' });
  }
  const safeName = (entry.characterName || 'backup').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="backup-${safeName}-${entry.characterId}.json"`);
  res.json(entry);
});

// Restore / Upload Backup JSON to Server Vault (archives current non-base state first)
apiRouter.post('/admin/vault/restore', async (req, res) => {
  try {
    const meta = dataStore.getSyncMetadata();
    if (!meta.isBaseState) {
      await archiveBeforeReplaceToCloud(
        dataStore.getFullBackup(),
        Date.now(),
        'Respaldo automático antes de importación manual de JSON'
      );
    }
    const remote = await fetchRemoteCloudBackup().catch(() => ({
      exists: false,
      remoteTimestamp: 0,
      remoteRevision: 0,
      contentHash: '',
      source: 'none' as const,
    }));
    const result = dataStore.restoreBackup(req.body, {
      replaceAll: true,
      isManualImport: true,
      remoteTimestamp: remote.exists ? remote.remoteTimestamp : 0,
      remoteRevision: remote.exists ? remote.remoteRevision : 0,
    });

    // Immediately push to cloud so GitHub / Google Drive / Webhook also update to this newest version
    await performAutoBackupTrigger(
      undefined,
      `Respaldo Maestro importado manualmente fijado como versión más actual (Rev #${result.revision})`
    ).catch((err) => console.warn('[AutoBackup Push on Import Error]:', err));

    res.json({
      ...result,
      latestBackup: dataStore.getFullBackup(),
      serverMeta: dataStore.getSyncMetadata(),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al restaurar respaldo.' });
  }
});

apiRouter.post('/vault/restore-all', async (req, res) => {
  try {
    const meta = dataStore.getSyncMetadata();
    if (!meta.isBaseState) {
      await archiveBeforeReplaceToCloud(
        dataStore.getFullBackup(),
        Date.now(),
        'Respaldo automático antes de importación total de JSON'
      );
    }
    const remote = await fetchRemoteCloudBackup().catch(() => ({
      exists: false,
      remoteTimestamp: 0,
      remoteRevision: 0,
      contentHash: '',
      source: 'none' as const,
    }));
    const result = dataStore.restoreBackup(req.body, {
      replaceAll: true,
      isManualImport: true,
      remoteTimestamp: remote.exists ? remote.remoteTimestamp : 0,
      remoteRevision: remote.exists ? remote.remoteRevision : 0,
    });

    // Immediately push to cloud so GitHub / Google Drive / Webhook also update to this newest version
    await performAutoBackupTrigger(
      undefined,
      `Respaldo Total importado manualmente fijado como versión más actual (Rev #${result.revision})`
    ).catch((err) => console.warn('[AutoBackup Push on Import Error]:', err));

    res.json({
      ...result,
      latestBackup: dataStore.getFullBackup(),
      serverMeta: dataStore.getSyncMetadata(),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al restaurar respaldo.' });
  }
});

// Unlink GitHub completely from server and clear credentials
apiRouter.post('/admin/vault/unlink-github', (req, res) => {
  try {
    const updated = dataStore.unlinkGithub();
    res.json({
      success: true,
      message: 'Cuenta y repositorio de GitHub desvinculados exitosamente.',
      settings: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al desvincular GitHub.' });
  }
});

// ============================================================================
// CLOUD BACKUP, CONTINUOUS COMPARISON & PRE-REPLACE ARCHIVING ENGINE
// ============================================================================

interface RemoteBackupFetchResult {
  exists: boolean;
  source: 'github' | 'drive' | 'persistent-vault' | 'none';
  backup?: any;
  remoteTimestamp: number;
  remoteRevision: number;
  contentHash: string;
  driveFileId?: string;
}

/**
 * Fetches the latest saved backup from the configured cloud (GitHub / Google Drive)
 * or falls back to the persistent /tmp vault mirror.
 */
async function fetchRemoteCloudBackup(overrideConfig?: AutoBackupConfig): Promise<RemoteBackupFetchResult> {
  const settings = dataStore.getHostSettings();
  const config = overrideConfig || settings.autoBackup;

  // 1. Try GitHub if credentials are present
  if (
    config &&
    (config.destination === 'github' || (config.githubToken && config.githubRepo)) &&
    config.githubToken?.trim() &&
    config.githubRepo?.trim()
  ) {
    try {
      const repo = config.githubRepo
        .trim()
        .replace(/^https?:\/\/github\.com\//, '')
        .replace(/\.git$/, '');
      const filePath = (config.githubPath?.trim() || 'backups/weroll-backup-latest.json').replace(/^\//, '');
      const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;

      const getRes = await fetch(apiUrl, {
        headers: {
          Authorization: `token ${config.githubToken.trim()}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'WeRoll-AutoBackup',
          'Cache-Control': 'no-cache',
        },
      });

      if (getRes.ok) {
        const fileInfo: any = await getRes.json();
        let rawJson = '';
        if (fileInfo.content) {
          rawJson = Buffer.from(fileInfo.content, 'base64').toString('utf8');
        } else if (fileInfo.download_url) {
          const dlRes = await fetch(fileInfo.download_url, {
            headers: {
              Authorization: `token ${config.githubToken.trim()}`,
              'User-Agent': 'WeRoll-AutoBackup',
            },
          });
          if (dlRes.ok) {
            rawJson = await dlRes.text();
          }
        }

        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          const remoteTimestamp =
            parsed.backupTimestamp ||
            (parsed.exportedAt ? new Date(parsed.exportedAt).getTime() : 0);
          const remoteRevision = parsed.revision || 0;
          const contentHash = parsed.contentHash || dataStore.computeContentHash(parsed);
          return {
            exists: true,
            source: 'github',
            backup: parsed,
            remoteTimestamp,
            remoteRevision,
            contentHash,
          };
        }
      }
    } catch (err) {
      console.warn('[WeRoll Cloud Compare] Error checking GitHub remote backup:', err);
    }
  }

  // 2. Try Google Drive if credentials are present
  if (
    config &&
    (config.destination === 'drive' || config.driveAccessToken) &&
    config.driveAccessToken?.trim()
  ) {
    try {
      const folderClause = config.driveFolderId?.trim()
        ? ` and '${config.driveFolderId.trim()}' in parents`
        : '';
      const q = encodeURIComponent(
        `name contains 'weroll-backup' and not name contains 'pre-replace' and mimeType = 'application/json' and trashed = false${folderClause}`
      );
      const listUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime desc&pageSize=3&fields=files(id,name,modifiedTime)`;
      const listRes = await fetch(listUrl, {
        headers: {
          Authorization: `Bearer ${config.driveAccessToken.trim()}`,
        },
      });

      if (listRes.ok) {
        const listData: any = await listRes.json();
        const latestFile = listData.files?.[0];
        if (latestFile?.id) {
          const dlRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${latestFile.id}?alt=media`,
            {
              headers: {
                Authorization: `Bearer ${config.driveAccessToken.trim()}`,
              },
            }
          );
          if (dlRes.ok) {
            const parsed = await dlRes.json();
            const remoteTimestamp =
              parsed.backupTimestamp ||
              (parsed.exportedAt
                ? new Date(parsed.exportedAt).getTime()
                : new Date(latestFile.modifiedTime).getTime());
            const remoteRevision = parsed.revision || 0;
            const contentHash = parsed.contentHash || dataStore.computeContentHash(parsed);
            return {
              exists: true,
              source: 'drive',
              backup: parsed,
              remoteTimestamp,
              remoteRevision,
              contentHash,
              driveFileId: latestFile.id,
            };
          }
        }
      }
    } catch (err) {
      console.warn('[WeRoll Cloud Compare] Error checking Drive remote backup:', err);
    }
  }

  // 3. Fallback to Persistent Vault (/tmp/weroll_persistent_vault/latest_backup.json)
  const persistentBackup = dataStore.loadFromPersistentVault();
  if (persistentBackup && !persistentBackup.isBaseState) {
    const remoteTimestamp =
      persistentBackup.backupTimestamp ||
      (persistentBackup.exportedAt ? new Date(persistentBackup.exportedAt).getTime() : 0);
    const remoteRevision = persistentBackup.revision || 0;
    const contentHash =
      persistentBackup.contentHash || dataStore.computeContentHash(persistentBackup);
    return {
      exists: true,
      source: 'persistent-vault',
      backup: persistentBackup,
      remoteTimestamp,
      remoteRevision,
      contentHash,
    };
  }

  return {
    exists: false,
    source: 'none',
    remoteTimestamp: 0,
    remoteRevision: 0,
    contentHash: '',
  };
}

/**
 * Saves a backup of the local file that is about to be replaced into a separate section of the cloud
 * ("Apartado de Respaldos Reemplazados" in GitHub / Google Drive / Webhook + Local Archive).
 */
export async function archiveBeforeReplaceToCloud(
  localBackupToArchive: any,
  replacedByTimestamp: number,
  reason: string,
  overrideConfig?: AutoBackupConfig
) {
  const settings = dataStore.getHostSettings();
  const config = overrideConfig || settings.autoBackup;
  const safeIso = new Date().toISOString().replace(/[:.]/g, '-');
  const localRev = localBackupToArchive.revision || 0;
  const jsonStr = JSON.stringify(localBackupToArchive, null, 2);
  let cloudLocationLabel = 'Bóveda de Reemplazos del Servidor';

  // 1. Upload to GitHub Pre-Replace Archive folder if configured
  if (config?.githubToken?.trim() && config?.githubRepo?.trim()) {
    try {
      const repo = config.githubRepo
        .trim()
        .replace(/^https?:\/\/github\.com\//, '')
        .replace(/\.git$/, '');
      const archiveFolder = (config.githubArchivePath?.trim() || 'backups/replaced-archive')
        .replace(/^\//, '')
        .replace(/\/$/, '');
      const archiveFilePath = `${archiveFolder}/weroll-pre-replace-${safeIso}-rev${localRev}.json`;
      const apiUrl = `https://api.github.com/repos/${repo}/contents/${archiveFilePath}`;

      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          Authorization: `token ${config.githubToken.trim()}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'WeRoll-AutoBackup',
        },
        body: JSON.stringify({
          message: `archive: Respaldo previo a reemplazo [rev ${localRev} - ${reason}]`,
          content: Buffer.from(jsonStr).toString('base64'),
        }),
      });

      if (putRes.ok) {
        cloudLocationLabel = `GitHub (${repo}/${archiveFilePath})`;
      }
    } catch (err) {
      console.warn('[WeRoll Pre-Replace Archive] GitHub archive upload warning:', err);
    }
  }

  // 2. Upload to Google Drive Pre-Replace Archive if configured
  if (config?.driveAccessToken?.trim()) {
    try {
      const targetFolder =
        config.driveArchiveFolderId?.trim() || config.driveFolderId?.trim() || undefined;
      const archiveFileName = `weroll-pre-replace-archive-${safeIso}-rev${localRev}.json`;
      const metadata = {
        name: archiveFileName,
        mimeType: 'application/json',
        parents: targetFolder ? [targetFolder] : undefined,
      };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([jsonStr], { type: 'application/json' }));

      const driveRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.driveAccessToken.trim()}`,
          },
          body: form,
        }
      );

      if (driveRes.ok) {
        cloudLocationLabel = `Google Drive (${archiveFileName})`;
      }
    } catch (err) {
      console.warn('[WeRoll Pre-Replace Archive] Drive archive upload warning:', err);
    }
  }

  // 3. Send to Webhook if configured
  if (config?.webhookUrl?.trim()) {
    try {
      await fetch(config.webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'WEROLL_PRE_REPLACE_SAFETY_BACKUP',
          archivedAt: Date.now(),
          reason,
          replacedByTimestamp,
          backup: localBackupToArchive,
        }),
      });
      if (cloudLocationLabel === 'Bóveda de Reemplazos del Servidor') {
        cloudLocationLabel = 'Webhook (Evento Pre-Reemplazo)';
      }
    } catch {}
  }

  // 4. Always store in local + /tmp Pre-Replace Archive list
  return dataStore.archiveBackupBeforeReplace(
    localBackupToArchive,
    replacedByTimestamp,
    reason,
    cloudLocationLabel
  );
}

/**
 * Uploads the current full database backup to the configured Cloud (GitHub / Google Drive / Webhook)
 * and updates the Persistent Vault Mirror.
 */
export async function performAutoBackupTrigger(
  overrideConfig?: AutoBackupConfig,
  triggerReason: string = 'Respaldo automático por actualización del servidor'
) {
  const settings = dataStore.getHostSettings();
  const config: AutoBackupConfig = overrideConfig ||
    settings.autoBackup || {
      enabled: true,
      backupOnEveryChange: true,
      continuousComparison: true,
      frequencyHours: 12,
      destination: 'drive',
    };

  // Always save to persistent /tmp vault first
  dataStore.saveToPersistentVault();

  const backupData = dataStore.getFullBackup();
  const jsonStr = JSON.stringify(backupData, null, 2);
  const sizeKb = Math.round(Buffer.byteLength(jsonStr, 'utf8') / 1024);
  const now = Date.now();

  const hasGithub = Boolean(config.githubToken?.trim() && config.githubRepo?.trim());
  const hasDrive = Boolean(config.driveAccessToken?.trim());
  const hasWebhook = Boolean(config.webhookUrl?.trim());

  // If no external credentials are set yet, record local Cloud-Vault mirror backup success
  if (!hasGithub && !hasDrive && !hasWebhook) {
    const msg = `Respaldo automático resguardado en Bóveda Nube Local (${sizeKb} KB) • Motivo: ${triggerReason}`;
    const logEntry: AutoBackupLog = {
      id: `log-${now}`,
      timestamp: now,
      destination: 'cloud-vault',
      status: 'success',
      message: msg,
      sizeKb,
      triggerReason,
    };
    const history = [logEntry, ...(config.history || [])].slice(0, 25);
    dataStore.saveHostSettings(
      {
        autoBackup: {
          ...config,
          lastBackupAt: now,
          lastBackupStatus: 'success',
          lastBackupMessage: msg,
          history,
        },
      },
      { silentSync: true }
    );
    return { success: true, message: msg, sizeKb };
  }

  try {
    if (config.destination === 'github' || (hasGithub && !hasDrive && !hasWebhook)) {
      if (!config.githubToken || !config.githubRepo) {
        throw new Error(
          'Falta el Token Personal (PAT) de GitHub o el nombre del Repositorio (ej: usuario/weroll-respaldos).'
        );
      }

      const repo = config.githubRepo
        .trim()
        .replace(/^https?:\/\/github\.com\//, '')
        .replace(/\.git$/, '');
      const filePath = (config.githubPath?.trim() || 'backups/weroll-backup-latest.json').replace(
        /^\//,
        ''
      );
      const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;

      let sha: string | undefined = undefined;
      try {
        const getRes = await fetch(apiUrl, {
          headers: {
            Authorization: `token ${config.githubToken.trim()}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'WeRoll-AutoBackup',
          },
        });
        if (getRes.ok) {
          const fileInfo: any = await getRes.json();
          sha = fileInfo.sha;
        }
      } catch (e) {
        // file doesn't exist yet
      }

      const contentBase64 = Buffer.from(jsonStr).toString('base64');
      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          Authorization: `token ${config.githubToken.trim()}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'WeRoll-AutoBackup',
        },
        body: JSON.stringify({
          message: `chore(backup): ${triggerReason} [${new Date().toISOString()}]`,
          content: contentBase64,
          sha,
        }),
      });

      if (!putRes.ok) {
        const errJson: any = await putRes.json().catch(() => ({}));
        throw new Error(
          errJson.message || `Error HTTP ${putRes.status} al enviar respaldo a GitHub.`
        );
      }

      const successMsg = `Respaldo en GitHub (${repo}/${filePath}, ${sizeKb} KB) • ${triggerReason}`;
      const logEntry: AutoBackupLog = {
        id: `log-${now}`,
        timestamp: now,
        destination: 'github',
        status: 'success',
        message: successMsg,
        sizeKb,
        triggerReason,
      };

      const history = [logEntry, ...(config.history || [])].slice(0, 25);
      dataStore.saveHostSettings(
        {
          autoBackup: {
            ...config,
            lastBackupAt: now,
            lastBackupStatus: 'success',
            lastBackupMessage: successMsg,
            history,
          },
        },
        { silentSync: true }
      );

      return { success: true, message: successMsg, sizeKb };
    } else if (config.destination === 'drive' || hasDrive) {
      if (!config.driveAccessToken) {
        throw new Error('Falta el Token de Acceso de Google Drive.');
      }

      // Check if weroll-backup-latest.json already exists in Drive folder so we can update it cleanly
      const folderClause = config.driveFolderId?.trim()
        ? ` and '${config.driveFolderId.trim()}' in parents`
        : '';
      const q = encodeURIComponent(
        `name = 'weroll-backup-latest.json' and mimeType = 'application/json' and trashed = false${folderClause}`
      );
      let existingFileId: string | undefined;
      try {
        const searchRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=1&fields=files(id,name)`,
          {
            headers: {
              Authorization: `Bearer ${config.driveAccessToken.trim()}`,
            },
          }
        );
        if (searchRes.ok) {
          const searchData: any = await searchRes.json();
          existingFileId = searchData.files?.[0]?.id;
        }
      } catch {}

      const metadata: any = {
        name: 'weroll-backup-latest.json',
        mimeType: 'application/json',
      };
      if (!existingFileId && config.driveFolderId?.trim()) {
        metadata.parents = [config.driveFolderId.trim()];
      }

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([jsonStr], { type: 'application/json' }));

      const uploadUrl = existingFileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
        : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

      const driveRes = await fetch(uploadUrl, {
        method: existingFileId ? 'PATCH' : 'POST',
        headers: {
          Authorization: `Bearer ${config.driveAccessToken.trim()}`,
        },
        body: form,
      });

      if (!driveRes.ok) {
        const errJson: any = await driveRes.json().catch(() => ({}));
        throw new Error(
          errJson.error?.message || `Error HTTP ${driveRes.status} al subir a Google Drive.`
        );
      }

      const successMsg = `Respaldo en Google Drive (${sizeKb} KB) • ${triggerReason}`;
      const logEntry: AutoBackupLog = {
        id: `log-${now}`,
        timestamp: now,
        destination: 'drive',
        status: 'success',
        message: successMsg,
        sizeKb,
        triggerReason,
      };

      const history = [logEntry, ...(config.history || [])].slice(0, 25);
      dataStore.saveHostSettings(
        {
          autoBackup: {
            ...config,
            lastBackupAt: now,
            lastBackupStatus: 'success',
            lastBackupMessage: successMsg,
            history,
          },
        },
        { silentSync: true }
      );

      return { success: true, message: successMsg, sizeKb };
    } else if (config.destination === 'webhook' || hasWebhook) {
      if (!config.webhookUrl) {
        throw new Error('Falta la URL del Webhook.');
      }

      const whRes = await fetch(config.webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'WEROLL_AUTO_BACKUP',
          triggerReason,
          timestamp: now,
          date: new Date().toISOString(),
          sizeKb,
          backup: backupData,
        }),
      });

      if (!whRes.ok) {
        throw new Error(`Error HTTP ${whRes.status} al enviar respaldo por Webhook.`);
      }

      const successMsg = `Respaldo enviado al Webhook (${sizeKb} KB) • ${triggerReason}`;
      const logEntry: AutoBackupLog = {
        id: `log-${now}`,
        timestamp: now,
        destination: 'webhook',
        status: 'success',
        message: successMsg,
        sizeKb,
        triggerReason,
      };

      const history = [logEntry, ...(config.history || [])].slice(0, 25);
      dataStore.saveHostSettings(
        {
          autoBackup: {
            ...config,
            lastBackupAt: now,
            lastBackupStatus: 'success',
            lastBackupMessage: successMsg,
            history,
          },
        },
        { silentSync: true }
      );

      return { success: true, message: successMsg, sizeKb };
    } else {
      throw new Error('Destino de respaldo no válido.');
    }
  } catch (err: any) {
    const errorMsg = `${err.message || 'Error al ejecutar el respaldo en nube.'} (Copia segura guardada en Bóveda Local)`;
    const logEntry: AutoBackupLog = {
      id: `log-${now}`,
      timestamp: now,
      destination: config.destination || 'github',
      status: 'error',
      message: errorMsg,
      sizeKb,
      triggerReason,
    };

    const history = [logEntry, ...(config.history || [])].slice(0, 25);
    dataStore.saveHostSettings(
      {
        autoBackup: {
          ...config,
          lastBackupAt: now,
          lastBackupStatus: 'error',
          lastBackupMessage: errorMsg,
          history,
        },
      },
      { silentSync: true }
    );

    return { success: false, message: errorMsg };
  }
}

/**
 * Continuously compares the server's current files with the saved cloud backup:
 * 1. If the server has the "Archivo Base" (initial/empty state), downloads and restores the latest backup from the cloud.
 * 2. If the server has an older backup than the cloud's newest version, FIRST saves a backup of the local file
 *    about to be replaced in a separate cloud archive section ("Apartado de Respaldos Reemplazados"),
 *    and THEN downloads and restores the newest cloud version.
 * 3. If the server has a newer version than the cloud, uploads the newer local version to the cloud.
 */
let isComparingAndSyncing = false;

export async function compareAndSyncWithCloud(
  triggerReason: string = 'Comparación automática periódica',
  overrideConfig?: AutoBackupConfig
): Promise<{
  action: 'restored_from_base' | 'archived_and_restored_newer' | 'uploaded_newer_local' | 'in_sync' | 'no_remote';
  message: string;
  syncMetadata: any;
}> {
  if (isComparingAndSyncing) {
    return {
      action: 'in_sync',
      message: 'Sincronización en curso...',
      syncMetadata: dataStore.getSyncMetadata(),
    };
  }

  isComparingAndSyncing = true;
  try {
    const localMeta = dataStore.getSyncMetadata();
    const localBackup = dataStore.getFullBackup();
    const remote = await fetchRemoteCloudBackup(overrideConfig);
    const now = Date.now();

    if (remote.exists && remote.backup) {
      const localTs = localMeta.lastModifiedAt || 0;
      const localRev = localMeta.revision || 0;
      const remoteTs = remote.remoteTimestamp || 0;
      const remoteRev = remote.remoteRevision || 0;
      const isDifferentContent = remote.contentHash !== localMeta.contentHash;

      // CASE 1: Local server is on "Archivo Base" (initial state) -> Download newest backup from cloud!
      if (localMeta.isBaseState && !remote.backup.isBaseState) {
        dataStore.restoreBackup(remote.backup, {
          fromCloudSync: true,
          replaceAll: true,
          remoteTimestamp: remoteTs,
          remoteRevision: remoteRev,
        });

        const statusMsg = `Archivo Base detectado: Se descargó y restauró automáticamente la versión más actualizada desde ${remote.source.toUpperCase()} (Rev #${remoteRev}).`;
        const updatedMeta = dataStore.saveSyncMetadata({
          lastComparisonAt: now,
          lastComparisonStatus: statusMsg,
          lastCloudSyncAt: now,
        });
        return {
          action: 'restored_from_base',
          message: statusMsg,
          syncMetadata: updatedMeta,
        };
      }

      // CASE 2: Local version is OLDER than the newest Cloud backup -> Archive local first, then download & replace!
      const isRemoteNewer =
        !localMeta.isBaseState &&
        isDifferentContent &&
        (remoteTs > localTs + 1000 || (Math.abs(remoteTs - localTs) <= 1000 && remoteRev > localRev));

      if (isRemoteNewer) {
        // Step 1: Backup the local file that is about to be replaced into the separate Cloud Pre-Replace Archive
        const archiveEntry = await archiveBeforeReplaceToCloud(
          localBackup,
          remoteTs,
          `Reemplazado por versión más actual encontrada en ${remote.source.toUpperCase()} (Rev #${localRev} -> Rev #${remoteRev})`,
          overrideConfig
        );

        // Step 2: Download and apply the newer cloud backup
        dataStore.restoreBackup(remote.backup, {
          fromCloudSync: true,
          replaceAll: true,
          remoteTimestamp: remoteTs,
          remoteRevision: remoteRev,
        });

        const statusMsg = `Versión antigua detectada (Rev #${localRev}): Se guardó copia previa en el Apartado de Reemplazados (${archiveEntry.cloudLocation}) y se descargó la versión más actual (Rev #${remoteRev}).`;
        const updatedMeta = dataStore.saveSyncMetadata({
          lastComparisonAt: now,
          lastComparisonStatus: statusMsg,
          lastCloudSyncAt: now,
        });
        return {
          action: 'archived_and_restored_newer',
          message: statusMsg,
          syncMetadata: updatedMeta,
        };
      }

      // CASE 3: Local version is NEWER than the Cloud backup -> Upload newer local backup to Cloud!
      const isLocalNewer =
        !localMeta.isBaseState &&
        isDifferentContent &&
        (localTs > remoteTs || localRev > remoteRev);

      if (isLocalNewer) {
        await performAutoBackupTrigger(overrideConfig, triggerReason);
        const statusMsg = `Versión local más reciente (Rev #${localRev}) respaldada automáticamente en la nube (${triggerReason}).`;
        const updatedMeta = dataStore.saveSyncMetadata({
          lastComparisonAt: now,
          lastComparisonStatus: statusMsg,
          lastCloudSyncAt: now,
        });
        return {
          action: 'uploaded_newer_local',
          message: statusMsg,
          syncMetadata: updatedMeta,
        };
      }

      // CASE 4: Already in sync
      const statusMsg = `Archivos verificados y sincronizados con la versión más actual (Rev #${localRev}).`;
      const updatedMeta = dataStore.saveSyncMetadata({
        lastComparisonAt: now,
        lastComparisonStatus: statusMsg,
      });
      return {
        action: 'in_sync',
        message: statusMsg,
        syncMetadata: updatedMeta,
      };
    }

    // No remote backup exists yet: if local has data (!isBaseState), push initial backup to cloud
    if (!localMeta.isBaseState) {
      await performAutoBackupTrigger(overrideConfig, triggerReason);
      const statusMsg = `Primer respaldo maestro subido a la nube (Rev #${localMeta.revision}) • ${triggerReason}`;
      const updatedMeta = dataStore.saveSyncMetadata({
        lastComparisonAt: now,
        lastComparisonStatus: statusMsg,
        lastCloudSyncAt: now,
      });
      return {
        action: 'uploaded_newer_local',
        message: statusMsg,
        syncMetadata: updatedMeta,
      };
    }

    const updatedMeta = dataStore.saveSyncMetadata({
      lastComparisonAt: now,
      lastComparisonStatus: 'En espera de datos o respaldo en la nube (Archivo Base activo).',
    });
    return {
      action: 'no_remote',
      message: 'Archivo Base activo; esperando conexión o respaldo en la nube.',
      syncMetadata: updatedMeta,
    };
  } finally {
    isComparingAndSyncing = false;
  }
}

// Register listener so EVERY server mutation (new user, role change, approve/reject, sheet/world update, changelog, feedback, settings)
// automatically triggers cloud comparison & backup!
let mutationDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let latestPendingReason = '';

registerDataStoreMutationListener((reason: string) => {
  latestPendingReason = reason;
  if (mutationDebounceTimer) {
    clearTimeout(mutationDebounceTimer);
  }
  mutationDebounceTimer = setTimeout(() => {
    const r = latestPendingReason;
    compareAndSyncWithCloud(r).catch((err) =>
      console.error('[WeRoll Auto-Sync on Mutation Error]:', err)
    );
  }, 900);
});

// Run initial comparison immediately on server startup so if booted with "Archivo Base", it downloads the latest backup right away
setTimeout(() => {
  compareAndSyncWithCloud('Inicio de servidor: Comparación de Archivo Base con la nube').catch((err) =>
    console.error('[WeRoll Startup Cloud Sync Error]:', err)
  );
}, 1000);

// Continuous background comparison every 30 seconds + scheduled 12h/24h backup check
setInterval(() => {
  try {
    compareAndSyncWithCloud('Comparación continua automática').catch((err) =>
      console.error('[WeRoll Continuous Cloud Compare Error]:', err)
    );
  } catch (e) {
    console.error('[AutoBackup Worker Error]', e);
  }
}, 30 * 1000);

// Admin Trigger Manual Backup
apiRouter.post('/admin/vault/trigger-autobackup', async (req, res) => {
  try {
    const overrideConfig = req.body?.config;
    const result = await performAutoBackupTrigger(
      overrideConfig,
      'Respaldo manual ejecutado desde Panel de Administrador'
    );
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    res.json({
      ...result,
      syncMetadata: dataStore.getSyncMetadata(),
      replacedArchive: dataStore.getReplacedBackupsSummaries(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error en la ejecución del respaldo.' });
  }
});

// Admin Trigger Manual Comparison & Sync
apiRouter.post('/admin/vault/compare-and-sync', async (req, res) => {
  try {
    const overrideConfig = req.body?.config;
    const result = await compareAndSyncWithCloud(
      'Comparación y sincronización manual desde Panel Admin',
      overrideConfig
    );
    res.json({
      success: true,
      ...result,
      replacedArchive: dataStore.getReplacedBackupsSummaries(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al comparar con la nube.' });
  }
});

// Client-Server Continuous Cloud Mirror Comparison & Auto-Recovery Endpoint
apiRouter.post('/vault/sync-check', async (req, res) => {
  try {
    const {
      clientTimestamp = 0,
      clientRevision = 0,
      clientHash = '',
      clientAutoBackupConfig,
      clientMirrorSnapshot,
    } = req.body || {};

    // 1. If server lost cloud credentials on container reset and client has them, restore only non-GitHub credentials if autoBackup is unset
    const currentSettings = dataStore.getHostSettings();
    if (
      !currentSettings.autoBackup &&
      clientAutoBackupConfig &&
      (clientAutoBackupConfig.driveAccessToken || clientAutoBackupConfig.webhookUrl)
    ) {
      dataStore.saveHostSettings(
        {
          autoBackup: {
            ...clientAutoBackupConfig,
            githubToken: '',
            githubRepo: '',
          },
        },
        { silentSync: true }
      );
    }

    // 2. Run server-to-cloud comparison first (GitHub / Drive / Persistent /tmp Vault)
    await compareAndSyncWithCloud('Comparación continua activa');

    const localMeta = dataStore.getSyncMetadata();
    const localTs = localMeta.lastModifiedAt || 0;
    const localRev = localMeta.revision || 0;

    // 3. Compare Server vs Client Cloud Mirror (protects against ephemeral container resets even without external PAT/OAuth)
    const isClientMirrorNewer =
      clientTimestamp > 0 &&
      clientHash !== localMeta.contentHash &&
      (localMeta.isBaseState ||
        clientTimestamp > localTs + 1000 ||
        (Math.abs(clientTimestamp - localTs) <= 1000 && clientRevision > localRev));

    if (isClientMirrorNewer) {
      // If client hasn't attached the full snapshot in this lightweight ping, ask client to send it immediately
      if (!clientMirrorSnapshot) {
        return res.json({
          action: 'REQUEST_CLIENT_MIRROR_UPLOAD',
          serverMeta: localMeta,
        });
      }

      // If server had a non-base older version, archive it first into the Pre-Replace Archive before replacing!
      if (!localMeta.isBaseState) {
        await archiveBeforeReplaceToCloud(
          dataStore.getFullBackup(),
          clientTimestamp,
          `Reemplazado por respaldo más actual sincronizado desde Espejo Nube (Rev #${localRev} -> Rev #${clientRevision})`
        );
      }

      // Restore the newer backup from the mirror
      dataStore.restoreBackup(clientMirrorSnapshot, {
        fromCloudSync: true,
        replaceAll: true,
        remoteTimestamp: clientTimestamp,
        remoteRevision: clientRevision,
      });

      // Push the recovered state to GitHub/Drive if configured
      await performAutoBackupTrigger(
        undefined,
        'Recuperación automática de versión más actual tras comparación de archivos'
      );

      const updatedMeta = dataStore.saveSyncMetadata({
        lastComparisonAt: Date.now(),
        lastComparisonStatus: localMeta.isBaseState
          ? `Archivo Base actualizado automáticamente con la versión más reciente del respaldo (Rev #${clientRevision}).`
          : `Versión antigua archivada y reemplazada por la versión más actual (Rev #${clientRevision}).`,
      });

      return res.json({
        action: 'RESTORED_FROM_MIRROR',
        serverMeta: updatedMeta,
        replacedArchive: dataStore.getReplacedBackupsSummaries(),
      });
    }

    // 4. If Server is newer than Client Mirror (and not on empty base state), send latest backup so client updates its mirror
    const isServerNewer =
      !localMeta.isBaseState &&
      (localTs > clientTimestamp ||
        localRev > clientRevision ||
        (clientHash && clientHash !== localMeta.contentHash));

    if (isServerNewer) {
      return res.json({
        action: 'UPDATE_CLIENT_MIRROR',
        serverMeta: localMeta,
        latestBackup: dataStore.getFullBackup(),
        replacedArchive: dataStore.getReplacedBackupsSummaries(),
      });
    }

    return res.json({
      action: 'IN_SYNC',
      serverMeta: localMeta,
      replacedArchive: dataStore.getReplacedBackupsSummaries(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error en verificación de sincronización.' });
  }
});

// ==========================================
// CHANGELOG / UPDATES BLOG ADMIN MANAGEMENT
// ==========================================
apiRouter.get('/admin/changelog', (req, res) => {
  res.json({ changelog: dataStore.getChangelog() });
});

apiRouter.post('/admin/changelog', (req, res) => {
  const { version, title, date, changes } = req.body;
  if (!version || !title) {
    return res.status(400).json({ error: 'Versión y título requeridos.' });
  }
  const entry = {
    version: version.trim(),
    title: title.trim(),
    date: date || new Date().toISOString().split('T')[0],
    changes: Array.isArray(changes) ? changes : [changes || 'Actualización de sistema'],
  };
  const list = dataStore.addChangelogEntry(entry);
  res.json({ success: true, changelog: list });
});

apiRouter.put('/admin/changelog/:index', (req, res) => {
  const idx = parseInt(req.params.index, 10);
  const { version, title, date, changes } = req.body;
  if (isNaN(idx)) {
    return res.status(400).json({ error: 'Índice inválido.' });
  }
  const entry = {
    version: version.trim(),
    title: title.trim(),
    date: date || new Date().toISOString().split('T')[0],
    changes: Array.isArray(changes) ? changes : [changes || 'Actualización de sistema'],
  };
  const list = dataStore.updateChangelogEntry(idx, entry);
  if (!list) {
    return res.status(404).json({ error: 'Entrada de changelog no encontrada.' });
  }
  res.json({ success: true, changelog: list });
});

apiRouter.delete('/admin/changelog/:index', (req, res) => {
  const idx = parseInt(req.params.index, 10);
  if (isNaN(idx)) {
    return res.status(400).json({ error: 'Índice inválido.' });
  }
  const list = dataStore.deleteChangelogEntry(idx);
  if (!list) {
    return res.status(404).json({ error: 'Entrada de changelog no encontrada.' });
  }
  res.json({ success: true, changelog: list });
});

// Persistent Host Settings
apiRouter.get('/settings', (req, res) => {
  res.json(dataStore.getHostSettings());
});

apiRouter.post('/settings', (req, res) => {
  if (req.body) {
    dataStore.saveHostSettings(req.body);
  }
  res.json({ success: true, settings: dataStore.getHostSettings() });
});

// 4. Post Roll to Room Feed & Store Last Roll per member / DM
apiRouter.post('/session/room/:roomCode/roll', (req, res) => {
  const room = getOrCreateRoom(req.params.roomCode);
  const rollData: DiceRollResult = req.body;
  const { characterId, isDm } = req.query;

  if (rollData && rollData.rollerName) {
    const formattedRoll = {
      ...rollData,
      id: rollData.id || `roll-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    room.rollFeed.push(formattedRoll);

    if (isDm === 'true' || rollData.rollerName.toLowerCase().includes('dungeon master') || rollData.rollerName.toLowerCase() === 'dm') {
      room.dmLastRoll = formattedRoll;
    } else if (characterId && room.party[characterId as string]) {
      room.party[characterId as string].lastRoll = formattedRoll;
    }

    if (room.rollFeed.length > 50) {
      room.rollFeed.shift();
    }
    room.lastUpdated = Date.now();
  }

  res.json({ success: true, count: room.rollFeed.length });
});

// 5. Post DM Announcements, Current Quest, and Quick Notification
apiRouter.post('/session/room/:roomCode/announce', (req, res) => {
  const room = getOrCreateRoom(req.params.roomCode);
  const { title, content, quest, notification } = req.body;

  if (quest !== undefined) {
    room.currentQuest = quest;
  }
  if (notification !== undefined) {
    room.quickNotification = notification;
  }

  if (content) {
    room.dmAnnouncements.push({
      id: `ann-${Date.now()}`,
      title: title || 'Aviso del Dungeon Master',
      content,
      timestamp: Date.now(),
    });
    if (room.dmAnnouncements.length > 20) {
      room.dmAnnouncements.shift();
    }
  }

  room.lastUpdated = Date.now();
  res.json({ success: true, quest: room.currentQuest, notification: room.quickNotification });
});

// 6. El Sabio Arcano Chat (Player & DM)
apiRouter.post('/gemini/chat', async (req, res) => {
  const { prompt, characterContext, dmContext, isDm, model } = req.body;
  const customKey = req.headers['x-gemini-api-key'] as string;

  if (!prompt) {
    return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
  }

  const ai = getGeminiClient(customKey);

  if (!ai) {
    const offlineAnswer = generateOfflineAssistantResponse(prompt, characterContext, dmContext, isDm);
    return res.json({ text: offlineAnswer, isOffline: true });
  }

  try {
    let systemInstruction = `Eres "El Sabio Arcano", una entidad venerable, sabia y paciente que actúa como árbitro maestro del juego de rol Dungeons & Dragons 5ª Edición (SRD 5E) para jugadores de habla hispana.
NORMAS ESTRICTAS:
1. NUNCA menciones que eres una IA, un modelo de lenguaje o Gemini. Preséntate siempre como "El Sabio Arcano".
2. Conoces a la perfección las reglas oficiales de 5E: acciones en combate, estados (cegado, paralizado, etc.), coberturas, espacios de conjuro, ataques de oportunidad, etc.
3. Si el jugador pregunta sobre su inventario, características o acciones, revisa su contexto.
4. Si el Dungeon Master te consulta, eres su consejero confidencial de campaña: conoces sus PNJs, monstruos, lugares y secretos y puedes ayudarle a improvisar trampas, equilibrar combates y desarrollar la trama.
5. Responde con calidez, sabiduría arcana, formato claro y viñetas cuando sea pedagógico.`;


    let contextSnippet = '';
    if (characterContext) {
      contextSnippet += `\n\n[Ficha del Personaje que consulta]
Nombre: ${characterContext.name || 'Sin nombre'} (${characterContext.race || ''} ${characterContext.characterClass || ''} Nivel ${characterContext.level || 1})
PG: ${characterContext.currentHp}/${characterContext.maxHp} | CA: ${characterContext.armorClass || 10} | Inic: ${characterContext.initiativeBonus || 0}
FUE: ${characterContext.abilities?.str?.score || 10}, DES: ${characterContext.abilities?.dex?.score || 10}, CON: ${characterContext.abilities?.con?.score || 10}, INT: ${characterContext.abilities?.int?.score || 10}, SAB: ${characterContext.abilities?.wis?.score || 10}, CAR: ${characterContext.abilities?.cha?.score || 10}
Inventario: ${(characterContext.inventory || []).map((i: any) => `${i.name} (x${i.quantity || 1}${i.equipped ? ', Equipado' : ''})`).join(', ') || 'Vacío'}
Monedas: ${characterContext.currency?.gp || 0} PO, ${characterContext.currency?.sp || 0} PP, ${characterContext.currency?.cp || 0} PC
Ataques: ${(characterContext.attacks || []).map((a: any) => `${a.name} (+${a.attackBonus}, ${a.damageDice} ${a.damageType})`).join('; ') || 'Ninguno'}
Rasgos: ${(characterContext.featuresAndTraits || []).map((f: any) => f.name).join(', ') || 'Ninguno'}`;
    }

    if (dmContext) {
      contextSnippet += `\n\n[ARCHIVO CONFIDENCIAL DE CAMPAÑA DEL DUNGEON MASTER]
Campaña: ${dmContext.campaignTitle || 'Aventura Principal'}
Misión / Objetivo Activo: ${dmContext.currentQuest || 'Sin misión fijada'}

NPCs Registrados (${(dmContext.npcs || []).length}):
${(dmContext.npcs || []).map((n: any) => `• ${n.name} (${n.race} ${n.occupation}, Actitud: ${n.attitude}, Carpeta: ${n.folder || 'General'}). Ubicación: ${n.location}. Secreto DM: ${n.secretOrHook || 'Ninguno'}. Notas: ${n.notes || 'Sin notas'}. Evolución: ${n.evolution || 'Sin cambios recientes'}`).join('\n')}

Monstruos y Criaturas (${(dmContext.monsters || []).length}):
${(dmContext.monsters || []).map((m: any) => `• ${m.name} (CR ${m.cr}, CA ${m.ac}, PG ${m.hp}/${m.maxHp}, ${m.size} ${m.type}). Ataques: ${(m.actions || []).map((a: any) => `${a.name} (+${a.toHit}, ${a.damage} ${a.damageType})`).join(', ')}. Notas: ${m.notes || 'Ninguna'}`).join('\n')}

Lugares, Mazmorras y Mapas (${(dmContext.locations || []).length}):
${(dmContext.locations || []).map((l: any) => `• ${l.name} (${l.type}, Región: ${l.region || 'Desconocida'}). Puntos clave: ${(l.pointsOfInterest || []).join(', ') || 'Sin puntos'}. Secretos DM: ${l.secretsForDm || 'Ninguno'}. Notas tácticas: ${l.notes || 'Sin notas'}. Evolución: ${l.evolution || 'Sin cambios'}`).join('\n')}

Diario de Sesiones y Crónicas (${(dmContext.campaignLogs || []).length}):
${(dmContext.campaignLogs || []).map((log: any) => `• Sesión ${log.sessionNumber}: "${log.title}" (${log.date}). Resumen: ${log.summary}. Público: ${log.publicNotes || 'N/A'}. Notas Secretas DM: ${log.privateNotes || 'N/A'}`).join('\n')}

Resúmenes de Combates Anteriores (${(dmContext.combatSummaries || []).length}):
${(dmContext.combatSummaries || []).map((cs: any) => `• "${cs.name}" (${cs.date}, ${cs.roundsCount} rondas). Participantes: ${(cs.participants || []).join(', ')}. Notas del DM: ${cs.notes || 'Sin notas'}`).join('\n')}`;
    }

    const fullPrompt = `${contextSnippet ? contextSnippet + '\n\n' : ''}Consulta: ${prompt}`;

    const host = dataStore.getHostSettings();
    const chosenModel = model || host.aiModel || 'gemini-flash-lite-latest';
    const response = await ai.models.generateContent({
      model: chosenModel,
      contents: fullPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text || 'Las energías arcanas permanecen en silencio.' });
  } catch (error: any) {
    console.error('Error in chat:', error);
    const offlineAnswer = generateOfflineAssistantResponse(prompt, characterContext, dmContext, isDm);
    res.json({
      text: `${offlineAnswer}\n\n*(Respuesta consultada mediante el Compendio Arcano)*`,
      isOffline: true,
    });
  }
});

// 7. AI Co-Pilot NPC Generator / Assist
apiRouter.post('/gemini/generate-npc', async (req, res) => {
  const { name, race, occupation, location, attitude, theme } = req.body;
  const customKey = req.headers['x-gemini-api-key'] as string;
  const ai = getGeminiClient(customKey);

  if (!ai) {
    return res.json({
      name: name || 'Torvin Barbaferro',
      race: race || 'Enano de las Colinas',
      occupation: occupation || 'Herrero de armas rúnicas',
      attitude: attitude || 'Neutral',
      location: location || 'Plaza de los Yunque',
      appearance: 'Brazos anchos como robles, delantal de cuero cubierto de hollín y ojos astutos.',
      personality: 'Orgulloso de su forja, desconfía de la magia débil pero respeta el acero auténtico.',
      secretOrHook: 'Encontró un trozo de meteorito estrellado en la mina norte que murmura al ser golpeado.',
      notes: 'Tiene amistad con el tabernero local.',
      evolution: 'Dispuesto a fabricar armas con descuento si le traen carbón especial.',
      stats: { hp: 35, ac: 14, cr: '1', notes: 'Martillo de guerra +4 (1d8+2)' },
    });
  }

  try {
    const prompt = `Actúa como co-piloto del Dungeon Master de D&D 5E.
Completa o genera los detalles faltantes para este PNJ (NPC) en formato JSON válido.
Datos proporcionados por el DM (mantén estos datos y complementa los vacíos):
- Nombre: ${name || 'Generar uno evocador'}
- Raza: ${race || 'Generar una acorde'}
- Oficio/Rol: ${occupation || 'Generar un rol interesante'}
- Ubicación: ${location || 'Generar ubicación adecuada'}
- Actitud: ${attitude || 'Neutral'}
- Tema/Ambiente: ${theme || 'Fantasía medieval estándar'}

Formato JSON estricto:
{
  "name": "Nombre completo",
  "race": "Raza",
  "occupation": "Rol o profesión",
  "attitude": "Aliado" | "Amistoso" | "Neutral" | "Desconfiado" | "Hostil",
  "location": "Lugar exacto",
  "appearance": "Descripción física distintiva (2 frases)",
  "personality": "Manera de hablar y comportamiento",
  "secretOrHook": "Secreto para el DM o gancho de aventura",
  "notes": "Notas privadas breves del DM",
  "evolution": "Posible desarrollo o cambios durante la campaña",
  "stats": { "hp": 30, "ac": 13, "cr": "1/2", "notes": "Notas rápidas de combate" }
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al generar NPC con IA' });
  }
});

// 8. AI Co-Pilot Monster Generator / Assist
apiRouter.post('/gemini/generate-monster', async (req, res) => {
  const { name, cr, type, environment } = req.body;
  const customKey = req.headers['x-gemini-api-key'] as string;
  const ai = getGeminiClient(customKey);

  if (!ai) {
    return res.json({
      name: name || ' acechador de las Criptas',
      size: 'Mediano',
      type: type || 'Muerto viviente',
      alignment: 'Neutral Maligno',
      cr: cr || '2',
      ac: 14,
      hp: 45,
      maxHp: 45,
      speed: '30 pies, trepar 30 pies',
      str: 14,
      dex: 16,
      con: 14,
      int: 8,
      wis: 12,
      cha: 6,
      traits: [{ name: 'Salto Emboscador', description: 'Si salta al menos 15 pies hacia una criatura, tiene ventaja en el ataque.' }],
      actions: [
        { id: 'ma-1', name: 'Garras Venenosas', type: 'melee', toHit: 5, damage: '2d6+3', damageType: 'Cortante + 1d6 Veneno', description: 'Ataque cuerpo a cuerpo' },
        { id: 'ma-2', name: 'Alarido Aterrador (Recarga 6)', type: 'ranged', toHit: 0, damage: '2d8', damageType: 'Psíquico', description: 'Salvación SAB CD 12 o Asustado por 1 min.' },
      ],
      notes: 'Evita la luz solar directa.',
    });
  }

  try {
    const prompt = `Actúa como diseñador de monstruos para el Dungeon Master de D&D 5E.
Completa o genera las estadísticas completas de este monstruo en formato JSON.
Datos del DM:
- Nombre: ${name || 'Monstruo original'}
- Desafío (CR deseado): ${cr || '2'}
- Tipo de criatura: ${type || 'Monstruosidad o Muerto viviente'}
- Entorno: ${environment || 'Mazmorra oscura'}

Estructura requerida en JSON:
{
  "name": "Nombre",
  "size": "Mediano" | "Grande" | "Pequeño" | "Enorme",
  "type": "Tipo de criatura",
  "alignment": "Alineamiento",
  "cr": "1" | "2" | "3" | etc.,
  "ac": 14,
  "hp": 45,
  "maxHp": 45,
  "speed": "30 pies",
  "str": 14, "dex": 14, "con": 14, "int": 10, "wis": 10, "cha": 8,
  "traits": [ { "name": "Rasgo", "description": "Efecto" } ],
  "actions": [
    { "id": "ma-1", "name": "Ataque 1", "type": "melee", "toHit": 5, "damage": "1d8+3", "damageType": "Cortante", "description": "Detalle" },
    { "id": "ma-2", "name": "Ataque 2", "type": "ranged", "toHit": 4, "damage": "1d6+2", "damageType": "Perforante", "description": "Detalle" }
  ],
  "notes": "Estrategia para el DM"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al generar monstruo con IA' });
  }
});

// 9. AI Co-Pilot Location Generator / Assist
apiRouter.post('/gemini/generate-location', async (req, res) => {
  const { name, type, region, theme } = req.body;
  const customKey = req.headers['x-gemini-api-key'] as string;
  const ai = getGeminiClient(customKey);

  if (!ai) {
    return res.json({
      name: name || 'Criptas de la Lanza Helada',
      type: type || 'Mazmorra',
      region: region || 'Paso de la Ventisca',
      description: 'Antiguo complejo funerario tallado en roca helada donde estalactitas gotean sobre ataúdes olvidados.',
      secretsForDm: 'Una palanca oculta tras el altar descongela el mecanismo de la puerta hacia la cámara del tesoro.',
      notes: 'Peligro ambiental: frío extremo (-10°C). Cada hora requiere salvación de CON CD 10.',
      evolution: 'Si los aventureros rompen el cristal de escarcha, el hielo de toda la cueva empezará a derretirse.',
      pointsOfInterest: ['La Galería de las Estatuas Congeladas', 'El Pozo de Hielo Negro', 'El Sepulcro del General'],
    });
  }

  try {
    const prompt = `Crea o complementa un lugar de D&D 5E para el Dungeon Master en formato JSON válido.
Datos del DM:
- Nombre: ${name || 'Generar nombre sugerente'}
- Tipo: ${type || 'Mazmorra, Taberna o Villa'}
- Región: ${region || 'Tierras salvajes'}
- Tema/Ambiente: ${theme || 'Misterio y peligro'}

Formato JSON:
{
  "name": "Nombre",
  "type": "Ciudad" | "Mazmorra" | "Templo" | "Bosque" | "Castillo" | "Taberna" | "Ruinas" | "Poblado",
  "region": "Región",
  "description": "Descripción sensorial para leer a los jugadores",
  "secretsForDm": "Secretos, trampas ocultas y tesoros para el DM",
  "notes": "Notas tácticas y peligros ambientales",
  "evolution": "Cómo puede cambiar o reaccionar este lugar según lo que hagan los personajes",
  "pointsOfInterest": ["Punto clave 1", "Punto clave 2", "Punto clave 3"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al generar lugar con IA' });
  }
});

// 10. AI Relational Assist (Draft base + Entity Relationships)
apiRouter.post('/gemini/assist-entity', async (req, res) => {
  const { entityType, name, concept, tone, relatedEntities = [], dmSecretsNotes = '', folder = 'General' } = req.body;
  const customKey = req.headers['x-gemini-api-key'] as string;
  const ai = getGeminiClient(customKey);

  const relationshipsText = (relatedEntities.length > 0)
    ? `\nENTIDADES Y LUGARES VINCULADOS O RELACIONADOS (Obligatorio integrarlos en la historia o trasfondo):\n${relatedEntities.map((r: string) => `• ${r}`).join('\n')}`
    : '';

  if (!ai) {
    // Offline coherent fallback
    if (entityType === 'npc') {
      return res.json({
        name: name || 'Kaelen el Silencioso',
        folder,
        race: 'Semielfo',
        occupation: concept ? `Especialista: ${concept}` : 'Explorador y confidente',
        attitude: (tone as any) || 'Neutral',
        location: relatedEntities[0] || 'Taberna del Jabalí',
        appearance: 'Capa gris desgastada por la lluvia, mirada analítica y una cicatriz en la muñeca derecha.',
        personality: 'Habla en voz baja y reflexiva. Leal con quienes demuestran palabra.',
        secretOrHook: dmSecretsNotes || (relatedEntities.length > 0 ? `Tiene un acuerdo secreto relacionado con ${relatedEntities.join(' y ')}.` : 'Guarda una carta con el sello real que no ha podido entregar.'),
        notes: `Vinculado con: ${relatedEntities.join(', ') || 'Nadie en particular'}. ${dmSecretsNotes}`,
        evolution: 'Dispuesto a compartir información clave si los aventureros le ayudan a resolver una vieja deuda.',
        stats: { hp: 32, ac: 14, cr: '2', notes: 'Daga rápida +5 (1d4+3) y tirada de sigilo +6' },
      });
    } else if (entityType === 'monster') {
      return res.json({
        name: name || 'Acechador de las Sombras',
        folder,
        size: 'Mediano',
        type: 'Monstruosidad',
        alignment: 'Neutral Maligno',
        cr: '3',
        ac: 14,
        hp: 45,
        maxHp: 45,
        speed: '40 pies, trepar 30 pies',
        str: 14, dex: 16, con: 14, int: 8, wis: 12, cha: 6,
        traits: [{ name: 'Furtivo en Sombras', description: 'Tiene ventaja en tiradas de Sigilo en luz tenue u oscuridad.' }],
        actions: [
          { id: 'm-atk-rel-1', name: 'Zarpazo Desgarrador', type: 'melee', toHit: 5, damage: '2d6+3', damageType: 'Cortante', range: '5 pies', description: 'Ataque con garras afiladas.' },
          { id: 'm-atk-rel-2', name: 'Mordisco Venenoso', type: 'melee', toHit: 5, damage: '1d8+3', damageType: 'Perforante + 2d4 Veneno', range: '5 pies', description: 'Inyecta toxina paralizante.' },
        ],
        notes: `Criatura asociada a ${relatedEntities.join(', ') || 'las profundidades'}. ${concept || ''}`,
      });
    } else if (entityType === 'location') {
      return res.json({
        name: name || 'Cripta Olvidada',
        folder,
        region: 'Tierras Bajas',
        type: 'Ruinas',
        description: `Un antiguo enclave de piedra gris y moho. ${concept || 'Guarda vestigios de una civilización anterior.'}`,
        secretsForDm: dmSecretsNotes || `Existe un pasaje secreto que conecta directamente con ${relatedEntities[0] || 'la superficie'}.`,
        notes: `Puntos de contacto: ${relatedEntities.join(', ') || 'Sin vínculos previos'}.`,
        evolution: 'Si los personajes alteran el sello central, las criaturas del lugar despertarán.',
        pointsOfInterest: ['El Arco de Entrada Derrumbado', 'El Sarcófago Rúnico', 'El Foso de las Ofrendas'],
      });
    } else {
      return res.json({
        name: name || 'Reliquia de la Vorágine',
        folder,
        kind: 'item',
        rarity: 'Raro',
        category: 'Objeto Mágico',
        whoHasIt: relatedEntities[0] || 'En custodia secreta',
        whereFound: 'En las profundidades del santuario',
        description: `Un artefacto que pulsa con energía arcana. ${concept || ''}`,
        properties: '+1 a tiradas de ataque y salvación. 3 cargas para proyectar ráfaga mística.',
        dmSecrets: dmSecretsNotes || 'Si se usa contra un aliado, su brillo se extingue durante un mes lunar.',
      });
    }
  }

  try {
    const prompt = `Actúa como diseñador maestro de campañas de D&D 5ª Edición (SRD 5E).
El Dungeon Master está creando un ${entityType.toUpperCase()} y te ha proporcionado un borrador base:
• Nombre tentativo: ${name || 'A elegir por la IA'}
• Concepto / Rol: ${concept || 'Personaje / elemento relevante de la aventura'}
• Tono / Actitud / Nivel: ${tone || 'Apropiado para aventura de nivel medio'}
• Notas / Secretos del DM: ${dmSecretsNotes || 'Ninguno especificado'}
${relationshipsText}

INSTRUCCIONES:
1. Rellena todos los campos de forma creativa, profesional y coherente con las reglas de 5E.
2. Es VITAL que incorpores las entidades y lugares vinculados en el trasfondo, secretos o notas del DM.
3. Responde ÚNICAMENTE un JSON válido con la siguiente estructura según el tipo:

${entityType === 'npc' ? `{
  "name": "Nombre final",
  "folder": "${folder}",
  "race": "Raza D&D 5E",
  "occupation": "Ocupación / Clase",
  "attitude": "Amistoso / Neutral / Desconfiado / Hostil / Aliado",
  "location": "Ubicación actual",
  "appearance": "Descripción física detallada",
  "personality": "Rasgos de personalidad y forma de actuar",
  "secretOrHook": "Secreto o gancho de aventura que involucra a las entidades vinculadas",
  "notes": "Notas confidenciales del DM",
  "evolution": "Posible evolución según decisiones de los jugadores",
  "stats": { "hp": 30, "ac": 13, "cr": "2", "notes": "Ataques o conjuros básicos" }
}` : entityType === 'monster' ? `{
  "name": "Nombre final",
  "folder": "${folder}",
  "size": "Mediano",
  "type": "Tipo de criatura",
  "alignment": "Alineamiento",
  "cr": "2",
  "ac": 13,
  "hp": 35,
  "maxHp": 35,
  "speed": "30 pies",
  "str": 14, "dex": 12, "con": 14, "int": 10, "wis": 10, "cha": 8,
  "traits": [{ "name": "Rasgo 1", "description": "Detalle del rasgo" }],
  "actions": [
    { "name": "Ataque 1", "type": "melee", "toHit": 4, "damage": "1d8+2", "damageType": "Cortante", "range": "5 pies", "description": "Efecto adicional" }
  ],
  "notes": "Notas del DM sobre su hábitat y relación con ${relatedEntities.join(', ') || 'el entorno'}"
}` : entityType === 'location' ? `{
  "name": "Nombre final",
  "folder": "${folder}",
  "region": "Región",
  "type": "Mazmorra / Ciudad / Taberna / Ruinas / Templo / Bosque",
  "description": "Descripción sensorial para los jugadores",
  "secretsForDm": "Secretos para el DM vinculados a ${relatedEntities.join(', ') || 'la historia'}",
  "notes": "Notas tácticas",
  "evolution": "Cómo reacciona o cambia el lugar",
  "pointsOfInterest": ["Punto clave 1", "Punto clave 2", "Punto clave 3"]
}` : `{
  "name": "Nombre final",
  "folder": "${folder}",
  "kind": "item",
  "rarity": "Raro",
  "category": "Arma / Armadura / Objeto Mágico / Poción",
  "whoHasIt": "Quién lo posee o poseía",
  "whereFound": "Ubicación o botín",
  "description": "Descripción visual e historia",
  "properties": "Estadísticas mecánicas de 5E",
  "dmSecrets": "Secretos o maldición para el DM"
}`}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    console.error('Error generating relational assist:', err);
    res.status(500).json({ error: 'Error al autorrellenar con IA' });
  }
});

// Offline assistant fallback
function generateOfflineAssistantResponse(query: string, characterContext?: any, dmContext?: any, isDm?: boolean): string {
  const q = query.toLowerCase();

  if (characterContext && (q.includes('tengo') || q.includes('objeto') || q.includes('mochila') || q.includes('inventario') || q.includes('armadura') || q.includes('arma'))) {
    const items = (characterContext.inventory || []).map((i: any) => `• ${i.name} (x${i.quantity || 1}${i.equipped ? ' - Equipado' : ''})`).join('\n');
    return `📦 **Inventario de ${characterContext.name || 'tu personaje'}:**\n\n${items || 'No tienes objetos registrados en tu hoja actualmente.'}\n\nMonedero: ${characterContext.currency?.gp || 0} PO (Oro), ${characterContext.currency?.sp || 0} PP (Plata), ${characterContext.currency?.cp || 0} PC (Cobre).`;
  }

  if (isDm && dmContext) {
    if (q.includes('npc') || q.includes('pnj') || q.includes('personaje')) {
      const npcs = (dmContext.npcs || []).map((n: any) => `• **${n.name}** (${n.race} ${n.occupation}, ${n.attitude}): ${n.location}. Secreto: "${n.secretOrHook || 'Sin secreto'}". Evolución: ${n.evolution || 'Sin cambios'}`).join('\n');
      return `👥 **NPCs Registrados en la Campaña:**\n\n${npcs || 'No tienes NPCs registrados aún en tus carpetas.'}`;
    }

    if (q.includes('lugar') || q.includes('mazmorra') || q.includes('mapa') || q.includes('ciudad') || q.includes('villa')) {
      const locs = (dmContext.locations || []).map((l: any) => `• **${l.name}** (${l.type}, Región: ${l.region || 'Desconocida'}): ${l.description.slice(0, 100)}... Secreto: "${l.secretsForDm || 'Ninguno'}"`).join('\n');
      return `🗺️ **Lugares y Mazmorras Registrados:**\n\n${locs || 'No hay lugares guardados en tu archivero.'}`;
    }

    if (q.includes('monstruo') || q.includes('enemigo') || q.includes('bestia')) {
      const mons = (dmContext.monsters || []).map((m: any) => `• **${m.name}** (CR ${m.cr}, CA ${m.ac}, PG ${m.hp}/${m.maxHp}) - Ataques: ${(m.actions || []).map((a: any) => a.name).join(', ') || 'Ataque básico'}`).join('\n');
      return `💀 **Bestiario y Monstruos de la Campaña:**\n\n${mons || 'No hay monstruos registrados actualmente.'}`;
    }

    if (q.includes('combate') || q.includes('resumen') || q.includes('pelea')) {
      const sums = (dmContext.combatSummaries || []).map((s: any) => `• **${s.name}** (${s.date}, ${s.roundsCount} rondas): Participantes: ${(s.participants || []).join(', ')}. Resumen DM: "${s.notes || 'Sin notas'}"`).join('\n');
      return `⚔️ **Resúmenes de Combates Archivados:**\n\n${sums || 'Aún no has archivado ningún combate finalizado.'}`;
    }

    if (q.includes('diario') || q.includes('cronica') || q.includes('crónica') || q.includes('sesion') || q.includes('sesión')) {
      const logs = (dmContext.campaignLogs || []).map((l: any) => `• **Sesión ${l.sessionNumber}: ${l.title}** (${l.date}): ${l.summary}`).join('\n');
      return `📖 **Diario de Campaña:**\n\n${logs || 'No hay entradas en la crónica de campaña.'}`;
    }
  }

  if (q.includes('ataque de oportunidad') || q.includes('oportunidad')) {
    return `⚔️ **Ataque de Oportunidad (D&D 5E):**\n\n• Se desencadena cuando una criatura hostil que puedes ver sale voluntariamente de tu alcance cuerpo a cuerpo (generalmente 5 pies).\n• Consume tu **Reacción** de la ronda.\n• Realizas un único ataque con arma cuerpo a cuerpo justo antes de que la criatura abandone tu alcance.\n• *Excepción:* No provoca ataque de oportunidad si la criatura realiza la acción de **Destrabarse (Disengage)** o si es movida a la fuerza (por ejemplo, empujada).`;
  }

  if (q.includes('dos conjuros') || q.includes('lanzar 2') || q.includes('accion adicional') || q.includes('bonus action')) {
    return `✨ **Lanzar Conjuros con Acción Adicional:**\n\n• Si lanzas un conjuro con tiempo de lanzamiento de **Acción Adicional** (como *Palabra de Curación* o *Paso Brumoso*), durante ese mismo turno **no puedes lanzar ningún otro conjuro**, excepto un **Truco (Cantrip)** con tiempo de lanzamiento de 1 Acción.\n• No puedes lanzar dos conjuros de nivel 1 o superior en el mismo turno a menos que uses *Oleada de Acción (Action Surge)* de Guerrero.`;
  }

  if (q.includes('concentracion') || q.includes('concentración')) {
    return `🧠 **Reglas de Concentración:**\n\n• Solo puedes mantener la concentración en **un solo conjuro a la vez**.\n• Si recibes daño mientras te concentras, debes hacer una tirada de salvación de **Constitución**.\n• La CD es igual a **10 o la mitad del daño recibido** (el número que sea mayor).\n• Si recibes daño de múltiples fuentes, tiras por cada una por separado.\n• Quedar Incapacitado o Muerto rompe la concentración automáticamente.`;
  }

  if (q.includes('descanso') || q.includes('dormir') || q.includes('curar')) {
    return `🏕️ **Descansos en 5E:**\n\n• **Descanso Corto (Short Rest):** Al menos 1 hora de reposo ligero. Puedes gastar Dados de Golpe para curarte (Dado + tu mod de Constitución por cada dado gastado).\n• **Descanso Largo (Long Rest):** 8 horas (al menos 6 de sueño). Recuperas todos tus Puntos de Golpe perdidos y hasta la mitad de tus Dados de Golpe máximos. Solo puedes beneficiarte de un descanso largo cada 24 horas.`;
  }

  return `📜 **El Sabio Arcano:**\n\nHas consultado sobre: "${query}".\n\nEn las reglas de D&D 5E:\n• **Tiradas de D20:** 1d20 + Modificador de Característica + Bonificador de Competencia (si eres competente).\n• **Ventaja/Desventaja:** Tiras 2 dados d20 y te quedas con el más alto (Ventaja) o con el más bajo (Desventaja).\n• **Regla de Oro:** El Dungeon Master siempre tiene la última palabra para adaptar las reglas al ritmo de la historia.\n\nPuedes consultarme sobre reglas de combate, estados alterados, el inventario de tu personaje o pedir consejo al DM.`;
}
