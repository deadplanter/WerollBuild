import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import type {
  Character5e,
  DMWorkspace,
  HostSettings,
  ChangelogEntry,
  AutoBackupConfig,
  ReplacedBackupArchiveSummary,
  PlayerType,
  AppRole,
  ForumPost,
  ForumComment,
  FriendDirectMessage,
  ForumCategory,
  ForumFlair,
  PlayerMessageToDM,
} from '../types/dnd.ts';
import {
  validateUniqueUserIdentity,
  deduplicateUsersIdentity,
  validateUniqueRoomNameAndCode,
  normalizeRoomIdentifier,
} from '../utils/dnd-math.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data_store');
const PERSISTENT_VAULT_DIR = '/tmp/weroll_persistent_vault';
const PERSISTENT_ARCHIVE_DIR = path.join(PERSISTENT_VAULT_DIR, 'replaced_archive');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
try {
  if (!fs.existsSync(PERSISTENT_VAULT_DIR)) {
    fs.mkdirSync(PERSISTENT_VAULT_DIR, { recursive: true });
  }
  if (!fs.existsSync(PERSISTENT_ARCHIVE_DIR)) {
    fs.mkdirSync(PERSISTENT_ARCHIVE_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('[WeRoll Vault] Warning creating /tmp vault dir:', err);
}

export interface UserAccount {
  id: string;
  email: string;
  displayName: string;
  userTagId?: string;
  avatarUrl?: string;
  friends?: string[];
  password: string;
  role: 'player' | 'dm' | 'both' | 'moderator' | 'creator' | 'admin';
  playerType?: PlayerType; // 'player' | 'dm' | 'both'
  appRole?: AppRole; // 'client' | 'moderator' | 'creator' | 'admin'
  canPostInForum?: boolean; // false for regular clients unless granted by mod/admin
  forumPermissionsRequested?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  registeredAt: number;
  approvedAt?: number;
  approvedBy?: string;
  lastActiveAt: number;
  passwordResetRequested?: boolean;
  passwordResetRequestedAt?: number;
  passwordResetNote?: string;
}

export interface FeedbackRecord {
  id: string;
  category: 'bug' | 'suggestion' | 'other';
  description: string;
  userEmail?: string;
  userName?: string;
  createdAt: number;
  status?: 'unread' | 'reviewed';
}

export interface RoomRecord {
  roomCode: string;
  name: string;
  dmEmail: string;
  dmDisplayName: string;
  password?: string;
  worldSheetId?: string;
  createdAt: number;
  lastUpdated: number;
}

export interface PlayerSheetRecord {
  id: string;
  ownerEmail: string;
  name: string;
  character: Character5e;
  updatedAt: number;
}

export interface WorldSheetRecord {
  id: string;
  ownerEmail: string;
  name: string;
  description?: string;
  roomCode: string;
  roomPassword?: string;
  roomMode?: 'online' | 'offline';
  workspace: DMWorkspace;
  updatedAt: number;
}

export interface RotatingBackupSlot {
  timestamp: number;
  reason: 'join' | 'leave' | 'manual';
  snapshot: Character5e;
}

export interface PlayerRotatingBackup {
  characterId: string;
  ownerEmail: string;
  characterName: string;
  // Strictly 2 rotating versions: slot 0 (older) and slot 1 (newer)
  slots: RotatingBackupSlot[];
  lastRotatedAt: number;
}

export interface SyncMetadata {
  isBaseState: boolean;
  revision: number;
  lastModifiedAt: number;
  lastMutationReason: string;
  contentHash: string;
  lastComparisonAt?: number;
  lastComparisonStatus?: string;
  lastCloudSyncAt?: number;
}

export interface ReplacedBackupArchiveEntry extends ReplacedBackupArchiveSummary {
  snapshot: any;
}

// Helpers for reading/writing JSON files safely
function readJSON<T>(filename: string, fallback: T): T {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      writeJSON(filename, fallback);
      return fallback;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
    return fallback;
  }
}

function writeJSON<T>(filename: string, data: T): void {
  try {
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filename}:`, err);
  }
}

// Initial Base Admin Users Seed ("Archivo Base")
const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'usr-admin-master',
    email: 'admin@weroll.app',
    displayName: 'Administrador Supremo',
    userTagId: 'adm',
    friends: [],
    password: 'admin',
    role: 'admin',
    playerType: 'both',
    appRole: 'admin',
    canPostInForum: true,
    status: 'approved',
    registeredAt: 1700000000000,
    approvedAt: 1700000000000,
    approvedBy: 'SYSTEM',
    lastActiveAt: 1700000000000,
  },
  {
    id: 'usr-admin-deadplanter',
    email: 'deadplanter@gmail.com',
    displayName: 'deadplanter',
    userTagId: 'top',
    friends: [],
    password: 'admin',
    role: 'admin',
    playerType: 'both',
    appRole: 'admin',
    canPostInForum: true,
    status: 'approved',
    registeredAt: 1700000000000,
    approvedAt: 1700000000000,
    approvedBy: 'SYSTEM',
    lastActiveAt: 1700000000000,
  },
];

// Mutation listener callback registered by the cloud sync engine in api.ts
let mutationListener: ((reason: string) => void) | null = null;
let isRestoringOrSyncing = false;

export function registerDataStoreMutationListener(listener: (reason: string) => void) {
  mutationListener = listener;
}

export const dataStore = {
  // --- SYNC METADATA & BASE STATE ("ARCHIVO BASE") TRACKING ---
  computeContentHash(data?: {
    users?: any[];
    sheets?: any[];
    worlds?: any[];
    feedback?: any[];
    changelog?: any[];
  }): string {
    try {
      const payload = {
        users: (data?.users ?? this.getUsers()).map((u: any) => ({
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          userTagId: u.userTagId || '',
          avatarLen: (u.avatarUrl || '').length,
          friends: Array.isArray(u.friends) ? u.friends : [],
          role: u.role,
          appRole: u.appRole,
          status: u.status,
          password: u.password,
          passwordResetRequested: u.passwordResetRequested,
        })),
        sheets: (data?.sheets ?? this.getPlayerSheets()).map((s: any) => ({
          id: s.id,
          ownerEmail: s.ownerEmail,
          name: s.name,
          updatedAt: s.updatedAt,
          charName: s.character?.name,
          level: s.character?.level,
          hp: s.character?.currentHp,
          invLen: s.character?.inventory?.length || 0,
          spellsLen: s.character?.spells?.length || 0,
          gp: s.character?.currency?.gp || 0,
          avatar: s.character?.avatarUrl || s.character?.avatarCustomUrl || '',
        })),
        worlds: (data?.worlds ?? this.getWorldSheets()).map((w: any) => ({
          id: w.id,
          ownerEmail: w.ownerEmail,
          name: w.name,
          roomCode: w.roomCode,
          updatedAt: w.updatedAt,
          npcsLen: w.workspace?.npcs?.length || 0,
          monstersLen: w.workspace?.monsters?.length || 0,
          itemsLen: w.workspace?.customItemsAndSpells?.length || 0,
          locsLen: w.workspace?.locations?.length || 0,
          logsLen: w.workspace?.campaignLogs?.length || 0,
        })),
        feedback: (data?.feedback ?? this.getFeedback()).map((f: any) => ({
          id: f.id,
          status: f.status,
        })),
        changelogLen: (data?.changelog ?? this.getChangelog()).length,
      };
      return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
    } catch {
      return 'hash-fallback';
    }
  },

  getSyncMetadata(): SyncMetadata {
    const filePath = path.join(DATA_DIR, 'sync_meta.json');
    if (fs.existsSync(filePath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as SyncMetadata;
        return {
          ...parsed,
          contentHash: parsed.contentHash || this.computeContentHash(),
        };
      } catch (e) {
        console.error('Error reading sync_meta.json:', e);
      }
    }

    // If sync_meta.json does not exist yet, this container just booted with the static "Archivo Base"
    const initialMeta: SyncMetadata = {
      isBaseState: true,
      revision: 0,
      lastModifiedAt: 0,
      lastMutationReason: 'Archivo Base Inicial (Esperando comparación con la nube)',
      contentHash: this.computeContentHash(),
    };
    writeJSON('sync_meta.json', initialMeta);
    return initialMeta;
  },

  saveSyncMetadata(updates: Partial<SyncMetadata>): SyncMetadata {
    const current = this.getSyncMetadata();
    const updated: SyncMetadata = {
      ...current,
      ...updates,
      contentHash: updates.contentHash || this.computeContentHash(),
    };
    writeJSON('sync_meta.json', updated);
    return updated;
  },

  markMutation(reason: string): SyncMetadata {
    if (isRestoringOrSyncing) {
      return this.getSyncMetadata();
    }
    const current = this.getSyncMetadata();
    const now = Date.now();
    const nextMeta = this.saveSyncMetadata({
      isBaseState: false,
      revision: (current.revision || 0) + 1,
      lastModifiedAt: now,
      lastMutationReason: reason,
      contentHash: this.computeContentHash(),
    });

    // Save immediate snapshot to persistent /tmp vault
    this.saveToPersistentVault();

    // Notify cloud sync engine to perform automatic backup to cloud
    if (mutationListener) {
      try {
        mutationListener(reason);
      } catch (err) {
        console.error('[DataStore Mutation Listener Error]:', err);
      }
    }

    return nextMeta;
  },

  // --- PERSISTENT VAULT MIRROR (/tmp) FOR CONTAINER RESTART RESILIENCE ---
  saveToPersistentVault(): void {
    try {
      const backup = this.getFullBackup();
      const targetPath = path.join(PERSISTENT_VAULT_DIR, 'latest_backup.json');
      fs.writeFileSync(targetPath, JSON.stringify(backup, null, 2), 'utf-8');

      // Also persist cloud credentials separately so they survive any workspace reset
      const settings = this.getHostSettings();
      if (settings.autoBackup) {
        const credsPath = path.join(PERSISTENT_VAULT_DIR, 'cloud_credentials.json');
        fs.writeFileSync(credsPath, JSON.stringify(settings.autoBackup, null, 2), 'utf-8');
      }
    } catch (err) {
      // Ignore if /tmp is restricted
    }
  },

  loadFromPersistentVault(): any | null {
    try {
      const targetPath = path.join(PERSISTENT_VAULT_DIR, 'latest_backup.json');
      if (fs.existsSync(targetPath)) {
        const raw = fs.readFileSync(targetPath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error loading from persistent vault:', err);
    }
    return null;
  },

  loadCloudCredentialsFromPersistentVault(): AutoBackupConfig | null {
    try {
      const credsPath = path.join(PERSISTENT_VAULT_DIR, 'cloud_credentials.json');
      if (fs.existsSync(credsPath)) {
        return JSON.parse(fs.readFileSync(credsPath, 'utf-8')) as AutoBackupConfig;
      }
    } catch {}
    return null;
  },

  // --- PRE-REPLACE ARCHIVE ("APARTADO DE RESPALDOS REEMPLAZADOS") ---
  getReplacedBackupsArchive(): ReplacedBackupArchiveEntry[] {
    const localArchive = readJSON<ReplacedBackupArchiveEntry[]>('replaced_backups_archive.json', []);
    try {
      const persistentArchivePath = path.join(PERSISTENT_VAULT_DIR, 'replaced_backups_archive.json');
      if (fs.existsSync(persistentArchivePath)) {
        const persistentList = JSON.parse(fs.readFileSync(persistentArchivePath, 'utf-8')) as ReplacedBackupArchiveEntry[];
        if (Array.isArray(persistentList) && persistentList.length > localArchive.length) {
          writeJSON('replaced_backups_archive.json', persistentList);
          return persistentList;
        }
      }
    } catch {}
    return localArchive;
  },

  getReplacedBackupsSummaries(): ReplacedBackupArchiveSummary[] {
    return this.getReplacedBackupsArchive().map(({ snapshot, ...summary }) => summary);
  },

  getReplacedBackupById(id: string): ReplacedBackupArchiveEntry | undefined {
    return this.getReplacedBackupsArchive().find((entry) => entry.id === id);
  },

  archiveBackupBeforeReplace(
    localBackupSnapshot: any,
    replacedByTimestamp: number,
    reason: string,
    cloudLocation?: string
  ): ReplacedBackupArchiveEntry {
    const archiveList = this.getReplacedBackupsArchive();
    const now = Date.now();
    const entry: ReplacedBackupArchiveEntry = {
      id: `pre-replace-${now}-${Math.random().toString(36).slice(2, 6)}`,
      archivedAt: now,
      replacedByTimestamp,
      localTimestampBeforeReplace:
        localBackupSnapshot.backupTimestamp ||
        (localBackupSnapshot.exportedAt ? new Date(localBackupSnapshot.exportedAt).getTime() : 0),
      localRevisionBeforeReplace: localBackupSnapshot.revision || 0,
      reason,
      cloudLocation: cloudLocation || 'Bóveda de Reemplazos WeRoll',
      summary: {
        usersCount: Array.isArray(localBackupSnapshot.users) ? localBackupSnapshot.users.length : 0,
        sheetsCount: Array.isArray(localBackupSnapshot.sheets) ? localBackupSnapshot.sheets.length : 0,
        worldsCount: Array.isArray(localBackupSnapshot.worlds) ? localBackupSnapshot.worlds.length : 0,
        feedbackCount: Array.isArray(localBackupSnapshot.feedback) ? localBackupSnapshot.feedback.length : 0,
      },
      snapshot: localBackupSnapshot,
    };

    const updatedList = [entry, ...archiveList].slice(0, 15);
    writeJSON('replaced_backups_archive.json', updatedList);

    try {
      const persistentArchivePath = path.join(PERSISTENT_VAULT_DIR, 'replaced_backups_archive.json');
      fs.writeFileSync(persistentArchivePath, JSON.stringify(updatedList, null, 2), 'utf-8');
      const singleFile = path.join(PERSISTENT_ARCHIVE_DIR, `${entry.id}.json`);
      fs.writeFileSync(singleFile, JSON.stringify(entry, null, 2), 'utf-8');
    } catch {}

    return entry;
  },

  // --- USERS, 3-CHAR TAG IDs & FRIENDS ---
  sanitizeTagId(rawTag?: string, fallbackSeed?: string): string {
    const cleaned = (rawTag || '')
      .replace(/^@+/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 3);
    if (cleaned.length > 0) {
      return cleaned;
    }
    const seed = fallbackSeed || String(Date.now());
    const hash = crypto.createHash('md5').update(seed).digest('hex').slice(0, 3);
    return hash || '123';
  },

  getUsers(): UserAccount[] {
    const users = readJSON<UserAccount[]>('users.json', DEFAULT_USERS);
    if (users.length === 0) {
      writeJSON('users.json', DEFAULT_USERS);
      return DEFAULT_USERS;
    }
    let needsSave = false;
    for (const u of users) {
      if (!u.userTagId) {
        u.userTagId =
          u.id === 'usr-admin-master'
            ? 'adm'
            : u.id === 'usr-admin-deadplanter'
            ? 'top'
            : this.sanitizeTagId('', u.id || u.email);
        needsSave = true;
      }
      if (!Array.isArray(u.friends)) {
        u.friends = [];
        needsSave = true;
      }
      if (!u.playerType) {
        if (u.role === 'dm') u.playerType = 'dm';
        else if (u.role === 'player') u.playerType = 'player';
        else u.playerType = 'both';
        needsSave = true;
      }
      if (!u.appRole) {
        if (u.role === 'admin' || u.email.toLowerCase() === 'admin@weroll.app' || u.email.toLowerCase() === 'deadplanter@gmail.com') {
          u.appRole = 'admin';
        } else if (u.role === 'creator') {
          u.appRole = 'creator';
        } else if (u.role === 'moderator') {
          u.appRole = 'moderator';
        } else {
          u.appRole = 'client';
        }
        needsSave = true;
      }
      if (u.appRole === 'admin' || u.appRole === 'creator' || u.appRole === 'moderator') {
        if (!u.canPostInForum) {
          u.canPostInForum = true;
          needsSave = true;
        }
      } else if (u.canPostInForum === undefined) {
        u.canPostInForum = false;
        needsSave = true;
      }
    }

    // Continuously corroborate that no two users share the same displayName or userTagId
    const deduped = deduplicateUsersIdentity(users);
    if (deduped.changed) {
      needsSave = true;
    }

    if (needsSave) {
      writeJSON('users.json', deduped.users);
    }
    return deduped.users;
  },

  corroborateUniqueUsers(): {
    checkedCount: number;
    fixedConflicts: boolean;
    fixedCount: number;
    users: UserAccount[];
  } {
    const rawUsers = readJSON<UserAccount[]>('users.json', DEFAULT_USERS);
    const deduped = deduplicateUsersIdentity(rawUsers);
    if (deduped.changed) {
      this.saveUsers(
        deduped.users,
        'Corroboración automática de unicidad de Nombre de Usuario e ID (@ID)'
      );
    }
    return {
      checkedCount: deduped.users.length,
      fixedConflicts: deduped.changed,
      fixedCount: deduped.changed ? 1 : 0,
      users: deduped.users,
    };
  },

  saveUsers(users: UserAccount[], mutationReason?: string): void {
    writeJSON('users.json', users);
    if (mutationReason) {
      this.markMutation(mutationReason);
    }
  },

  findUserByEmail(email: string): UserAccount | undefined {
    const users = this.getUsers();
    return users.find((u) => u.email.trim().toLowerCase() === email.trim().toLowerCase());
  },

  createUser(account: Omit<UserAccount, 'id' | 'registeredAt' | 'lastActiveAt'>): UserAccount {
    const users = this.getUsers();
    const id = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const requestedTag = (account.userTagId || '').replace(/^@+/, '').trim().slice(0, 3);

    // Check uniqueness of displayName and (if explicitly provided) userTagId
    const check = validateUniqueUserIdentity({
      displayName: account.displayName,
      userTagId: requestedTag || undefined,
      existingUsers: users,
    });
    if (!check.valid) {
      throw new Error(check.error || 'El nombre de usuario o el ID ya está en uso.');
    }

    // Generate a guaranteed-unique tag if none provided
    let finalTag = requestedTag || this.sanitizeTagId('', id);
    let attempt = 1;
    while (
      users.some((u) => (u.userTagId || '').trim().toLowerCase() === finalTag.toLowerCase())
    ) {
      finalTag = String(100 + ((attempt * 37) % 899)).slice(0, 3);
      attempt++;
    }

    const newUser: UserAccount = {
      ...account,
      id,
      displayName: account.displayName.trim(),
      userTagId: finalTag,
      friends: Array.isArray(account.friends) ? account.friends : [],
      registeredAt: Date.now(),
      lastActiveAt: Date.now(),
    };
    users.push(newUser);
    this.saveUsers(
      users,
      `Nueva cuenta creada: ${newUser.displayName}@${newUser.userTagId} (${newUser.email})`
    );
    return newUser;
  },

  updateUserStatus(id: string, status: 'approved' | 'rejected', approvedBy: string): UserAccount | null {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    users[idx].status = status;
    users[idx].approvedAt = Date.now();
    users[idx].approvedBy = approvedBy;
    this.saveUsers(
      users,
      `Cuenta ${status === 'approved' ? 'aprobada' : 'rechazada'}: ${users[idx].email}`
    );
    return users[idx];
  },

  updateUserRole(id: string, role: 'player' | 'dm' | 'both' | 'moderator' | 'admin'): UserAccount | null {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    users[idx].role = role;
    this.saveUsers(users, `Cambio de rol de usuario (${users[idx].email} -> ${role})`);
    return users[idx];
  },

  updateUserTagId(id: string, rawTagId: string): UserAccount | null {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    const cleaned = (rawTagId || '').replace(/^@+/, '').trim();
    if (!cleaned || cleaned.length > 3) {
      throw new Error('El ID debe tener entre 1 y 3 caracteres como máximo (ej: 123 o top).');
    }

    const check = validateUniqueUserIdentity({
      userTagId: cleaned,
      excludeUserId: id,
      existingUsers: users,
    });
    if (!check.valid) {
      throw new Error(check.error || 'Ese ID ya está en uso por otro usuario.');
    }

    users[idx].userTagId = cleaned;
    this.saveUsers(
      users,
      `ID de usuario actualizado: ${users[idx].displayName}@${cleaned} (${users[idx].email})`
    );
    return users[idx];
  },

  updateUserAvatar(id: string, avatarUrl?: string): UserAccount | null {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    users[idx].avatarUrl = avatarUrl ? avatarUrl.trim() : undefined;
    this.saveUsers(
      users,
      `Avatar de jugador actualizado: ${users[idx].displayName}@${users[idx].userTagId || '123'}`
    );
    return users[idx];
  },

  adminUpdateUserAccount(
    id: string,
    updates: {
      email?: string;
      displayName?: string;
      userTagId?: string;
      password?: string;
      role?: UserAccount['role'];
      status?: UserAccount['status'];
    }
  ): UserAccount | null {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;

    if (updates.email && updates.email.trim()) {
      const normEmail = updates.email.trim().toLowerCase();
      const duplicate = users.find((u, i) => i !== idx && u.email.trim().toLowerCase() === normEmail);
      if (duplicate) {
        throw new Error('Ya existe otro usuario registrado con ese correo electrónico.');
      }
      users[idx].email = normEmail;
    }

    const nextDisplayName =
      updates.displayName && updates.displayName.trim() ? updates.displayName.trim() : undefined;
    const nextTagId =
      updates.userTagId !== undefined
        ? updates.userTagId.replace(/^@+/, '').trim().slice(0, 3) || undefined
        : undefined;

    const identityCheck = validateUniqueUserIdentity({
      displayName: nextDisplayName,
      userTagId: nextTagId,
      excludeUserId: id,
      existingUsers: users,
    });
    if (!identityCheck.valid) {
      throw new Error(identityCheck.error || 'El nombre de usuario o ID ya está en uso.');
    }

    if (nextDisplayName) {
      users[idx].displayName = nextDisplayName;
    }
    if (nextTagId) {
      users[idx].userTagId = nextTagId;
    }
    if (updates.password && updates.password.trim()) {
      users[idx].password = updates.password.trim();
    }
    if (updates.role) {
      users[idx].role = updates.role;
    }
    if ((updates as any).playerType) {
      users[idx].playerType = (updates as any).playerType;
    }
    if ((updates as any).appRole) {
      users[idx].appRole = (updates as any).appRole;
      if (users[idx].appRole === 'admin' || users[idx].appRole === 'creator' || users[idx].appRole === 'moderator') {
        users[idx].canPostInForum = true;
      }
    }
    if ((updates as any).avatarUrl !== undefined) {
      users[idx].avatarUrl = (updates as any).avatarUrl || undefined;
    }
    if ((updates as any).canPostInForum !== undefined) {
      users[idx].canPostInForum = Boolean((updates as any).canPostInForum);
    }
    if (updates.status) {
      users[idx].status = updates.status;
    }

    this.saveUsers(
      users,
      `Usuario editado por Administrador: ${users[idx].displayName}@${users[idx].userTagId} (${users[idx].email})`
    );
    return users[idx];
  },

  deleteUser(id: string): UserAccount | null {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    const removed = users[idx];
    users.splice(idx, 1);

    // Also clean up removed user from all other users' friends lists
    for (const u of users) {
      if (Array.isArray(u.friends) && u.friends.includes(id)) {
        u.friends = u.friends.filter((fId) => fId !== id);
      }
    }

    this.saveUsers(
      users,
      `Cuenta de usuario eliminada por Administrador: ${removed.displayName}@${removed.userTagId || ''} (${removed.email})`
    );
    return removed;
  },

  getFriendsForUser(userId: string) {
    const users = this.getUsers();
    const currentUser = users.find((u) => u.id === userId);
    if (!currentUser) return [];
    const friendIds = Array.isArray(currentUser.friends) ? currentUser.friends : [];
    return friendIds
      .map((fId) => users.find((u) => u.id === fId))
      .filter((u): u is UserAccount => Boolean(u))
      .map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        userTagId: u.userTagId || '123',
        fullTag: `${u.displayName}@${u.userTagId || '123'}`,
        avatarUrl: u.avatarUrl,
        role: u.role,
        appRole: u.appRole || (u.role === 'admin' ? 'admin' : u.role === 'creator' ? 'creator' : u.role === 'moderator' ? 'moderator' : 'client'),
        status: u.status,
        lastActiveAt: u.lastActiveAt,
      }));
  },

  addFriendByTag(userId: string, friendFullTagInput: string) {
    const users = this.getUsers();
    const userIdx = users.findIndex((u) => u.id === userId);
    if (userIdx === -1) {
      throw new Error('Tu usuario no fue encontrado en el servidor.');
    }

    const raw = (friendFullTagInput || '').trim();
    const atIndex = raw.lastIndexOf('@');
    if (atIndex <= 0 || atIndex === raw.length - 1) {
      throw new Error(
        'Formato inválido. Escribe el nombre de usuario seguido de @ y los 3 caracteres de su ID (ejemplo: usuario1@123 o usuario2@top).'
      );
    }

    const targetName = raw.slice(0, atIndex).trim().toLowerCase();
    const targetTag = raw.slice(atIndex + 1).trim().toLowerCase();

    const targetIdx = users.findIndex(
      (u) =>
        u.displayName.trim().toLowerCase() === targetName &&
        (u.userTagId || '').trim().toLowerCase() === targetTag
    );

    if (targetIdx === -1) {
      throw new Error(
        `No se encontró ningún jugador con el identificador "${raw}". Verifica su nombre de usuario y su ID de 3 caracteres después del @.`
      );
    }

    const targetUser = users[targetIdx];
    if (targetUser.id === userId) {
      throw new Error('No puedes agregarte a ti mismo como amigo.');
    }

    if (!Array.isArray(users[userIdx].friends)) {
      users[userIdx].friends = [];
    }
    if (users[userIdx].friends!.includes(targetUser.id)) {
      throw new Error(`${targetUser.displayName}@${targetUser.userTagId} ya está en tu lista de amigos.`);
    }

    users[userIdx].friends!.push(targetUser.id);

    // Also add reciprocally so both users appear in each other's friends list
    if (!Array.isArray(users[targetIdx].friends)) {
      users[targetIdx].friends = [];
    }
    if (!users[targetIdx].friends!.includes(userId)) {
      users[targetIdx].friends!.push(userId);
    }

    this.saveUsers(
      users,
      `Amigo agregado: ${users[userIdx].displayName}@${users[userIdx].userTagId} agregó a ${targetUser.displayName}@${targetUser.userTagId}`
    );

    return {
      addedFriend: {
        id: targetUser.id,
        email: targetUser.email,
        displayName: targetUser.displayName,
        userTagId: targetUser.userTagId || '123',
        fullTag: `${targetUser.displayName}@${targetUser.userTagId || '123'}`,
        role: targetUser.role,
        status: targetUser.status,
        lastActiveAt: targetUser.lastActiveAt,
      },
      friends: this.getFriendsForUser(userId),
    };
  },

  removeFriend(userId: string, friendId: string) {
    const users = this.getUsers();
    const userIdx = users.findIndex((u) => u.id === userId);
    if (userIdx === -1) {
      throw new Error('Usuario no encontrado.');
    }

    const friendUser = users.find((u) => u.id === friendId);
    users[userIdx].friends = (users[userIdx].friends || []).filter((id) => id !== friendId);

    const friendIdx = users.findIndex((u) => u.id === friendId);
    if (friendIdx !== -1 && Array.isArray(users[friendIdx].friends)) {
      users[friendIdx].friends = users[friendIdx].friends!.filter((id) => id !== userId);
    }

    this.saveUsers(
      users,
      `Amigo eliminado: ${users[userIdx].displayName}@${users[userIdx].userTagId} eliminó a ${friendUser ? `${friendUser.displayName}@${friendUser.userTagId}` : friendId}`
    );

    return {
      friends: this.getFriendsForUser(userId),
    };
  },

  findUserById(id: string): UserAccount | undefined {
    const users = this.getUsers();
    return users.find((u) => u.id === id);
  },

  updateUserPassword(id: string, newPassword: string, clearResetRequest = true): UserAccount | null {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    users[idx].password = newPassword.trim();
    if (clearResetRequest) {
      users[idx].passwordResetRequested = false;
      users[idx].passwordResetRequestedAt = undefined;
      users[idx].passwordResetNote = undefined;
    }
    this.saveUsers(users, `Contraseña actualizada para cuenta: ${users[idx].email}`);
    return users[idx];
  },

  requestPasswordReset(email: string, note?: string): boolean {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.email.trim().toLowerCase() === email.trim().toLowerCase());
    if (idx === -1) return false;
    users[idx].passwordResetRequested = true;
    users[idx].passwordResetRequestedAt = Date.now();
    users[idx].passwordResetNote = note || 'Solicitud de restablecimiento realizada por el usuario.';
    this.saveUsers(users, `Solicitud de reseteo de clave: ${users[idx].email}`);
    return true;
  },

  // --- ROOMS WITH PASSWORDS ---
  getRooms(): Record<string, RoomRecord> {
    return readJSON<Record<string, RoomRecord>>('rooms.json', {});
  },

  saveRooms(rooms: Record<string, RoomRecord>, mutationReason?: string): void {
    writeJSON('rooms.json', rooms);
    if (mutationReason) {
      this.markMutation(mutationReason);
    }
  },

  setRoom(record: RoomRecord): void {
    const rooms = this.getRooms();
    const worlds = this.getWorldSheets();
    const code = normalizeRoomIdentifier(record.roomCode);

    const check = validateUniqueRoomNameAndCode({
      proposedRoomCode: code,
      proposedName: record.name || code,
      excludeWorldId: record.worldSheetId,
      requesterEmail: record.dmEmail,
      existingWorlds: worlds,
      activeRooms: Object.values(rooms) as RoomRecord[],
    });
    if (!check.valid) {
      throw new Error(check.error || 'Ya existe otra sala activa o registrada con ese nombre.');
    }

    rooms[code] = {
      ...record,
      roomCode: code,
      lastUpdated: Date.now(),
    };
    this.saveRooms(rooms, `Sala activa registrada/actualizada: ${code}`);
  },

  getRoom(code: string): RoomRecord | undefined {
    const rooms = this.getRooms();
    return rooms[normalizeRoomIdentifier(code)] || rooms[code.trim().toUpperCase()];
  },

  validateRoomCreation(params: {
    roomCode: string;
    roomName?: string;
    dmEmail?: string;
    worldSheetId?: string;
    activeRooms?: { roomCode: string; name?: string; dmEmail?: string; dmConnected?: boolean; worldSheetId?: string }[];
  }): { valid: boolean; error?: string } {
    const worlds = this.getWorldSheets();
    const persistedRooms = Object.values(this.getRooms()) as RoomRecord[];
    return validateUniqueRoomNameAndCode({
      proposedRoomCode: params.roomCode,
      proposedName: params.roomName || params.roomCode,
      excludeWorldId: params.worldSheetId,
      requesterEmail: params.dmEmail,
      existingWorlds: worlds,
      activeRooms: [...persistedRooms, ...(params.activeRooms || [])],
    });
  },

  // --- PLAYER SHEETS VAULT ---
  getPlayerSheets(): PlayerSheetRecord[] {
    return readJSON<PlayerSheetRecord[]>('sheets.json', []);
  },

  savePlayerSheet(sheet: PlayerSheetRecord): void {
    const sheets = this.getPlayerSheets();
    const idx = sheets.findIndex((s) => s.id === sheet.id);
    const isNew = idx === -1;
    if (idx >= 0) {
      sheets[idx] = { ...sheet, updatedAt: Date.now() };
    } else {
      sheets.push({ ...sheet, updatedAt: Date.now() });
    }
    writeJSON('sheets.json', sheets);
    this.markMutation(
      isNew
        ? `Nueva Player Sheet creada: ${sheet.name} (${sheet.ownerEmail})`
        : `Player Sheet actualizada: ${sheet.name} (${sheet.ownerEmail})`
    );
  },

  deletePlayerSheet(id: string, ownerEmail?: string): boolean {
    let sheets = this.getPlayerSheets();
    const target = sheets.find((s) => s.id === id);
    const initialLen = sheets.length;
    sheets = sheets.filter((s) => {
      if (s.id !== id) return true;
      if (ownerEmail && s.ownerEmail.toLowerCase() !== ownerEmail.toLowerCase()) return true;
      return false;
    });
    if (sheets.length < initialLen) {
      writeJSON('sheets.json', sheets);
      this.markMutation(`Player Sheet eliminada: ${target?.name || id}`);
      return true;
    }
    return false;
  },

  // --- WORLD SHEETS VAULT ---
  getWorldSheets(): WorldSheetRecord[] {
    return readJSON<WorldSheetRecord[]>('worlds.json', []);
  },

  saveWorldSheet(world: WorldSheetRecord): void {
    const worlds = this.getWorldSheets();
    const rooms = this.getRooms();
    const idx = worlds.findIndex((w) => w.id === world.id);
    const isNew = idx === -1;

    const normCode = normalizeRoomIdentifier(world.roomCode || world.name || 'MESA-DRAGON');
    const check = validateUniqueRoomNameAndCode({
      proposedRoomCode: normCode,
      proposedName: world.name,
      excludeWorldId: world.id,
      requesterEmail: world.ownerEmail,
      existingWorlds: worlds,
      activeRooms: Object.values(rooms),
    });
    if (!check.valid) {
      throw new Error(check.error || 'Ya existe una sala o mesa registrada con ese nombre.');
    }

    const updatedWorld: WorldSheetRecord = {
      ...world,
      roomCode: normCode,
      updatedAt: Date.now(),
    };

    if (idx >= 0) {
      worlds[idx] = updatedWorld;
    } else {
      worlds.push(updatedWorld);
    }
    writeJSON('worlds.json', worlds);
    this.markMutation(
      isNew
        ? `Nuevo World Sheet (DM) creado: ${updatedWorld.name} (${updatedWorld.ownerEmail})`
        : `World Sheet (DM) guardado/actualizado: ${updatedWorld.name} (${updatedWorld.ownerEmail})`
    );
  },

  updateWorldSheet(id: string, updates: Partial<WorldSheetRecord>, ownerEmail?: string): WorldSheetRecord | null {
    const worlds = this.getWorldSheets();
    const rooms = this.getRooms();
    const idx = worlds.findIndex((w) => {
      if (w.id !== id) return false;
      if (ownerEmail && w.ownerEmail.toLowerCase() !== ownerEmail.toLowerCase()) return false;
      return true;
    });
    if (idx === -1) return null;

    const nextName = updates.name ? updates.name.trim() : worlds[idx].name;
    const nextCode = updates.roomCode
      ? normalizeRoomIdentifier(updates.roomCode)
      : worlds[idx].roomCode;

    if (updates.name || updates.roomCode) {
      const check = validateUniqueRoomNameAndCode({
        proposedRoomCode: nextCode,
        proposedName: nextName,
        excludeWorldId: id,
        requesterEmail: ownerEmail || worlds[idx].ownerEmail,
        existingWorlds: worlds,
        activeRooms: Object.values(rooms),
      });
      if (!check.valid) {
        throw new Error(check.error || 'Ya existe otra sala o mesa con ese nombre o código.');
      }
    }

    worlds[idx] = {
      ...worlds[idx],
      ...updates,
      name: nextName,
      roomCode: nextCode,
      updatedAt: Date.now(),
    };
    writeJSON('worlds.json', worlds);
    this.markMutation(`World Sheet (DM) actualizado: ${worlds[idx].name}`);
    return worlds[idx];
  },

  deleteWorldSheet(id: string, ownerEmail?: string): boolean {
    let worlds = this.getWorldSheets();
    const target = worlds.find((w) => w.id === id);
    const initialLen = worlds.length;
    worlds = worlds.filter((w) => {
      if (w.id !== id) return true;
      if (ownerEmail && w.ownerEmail.toLowerCase() !== ownerEmail.toLowerCase()) return true;
      return false;
    });
    if (worlds.length < initialLen) {
      writeJSON('worlds.json', worlds);
      this.markMutation(`World Sheet (DM) eliminado: ${target?.name || id}`);
      return true;
    }
    return false;
  },

  // --- ADMIN SHEET & WORLD INJECTION ---
  injectPlayerSheet(userEmail: string, character: Character5e, customName?: string): PlayerSheetRecord {
    const sheetId = character.id || `sheet-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const record: PlayerSheetRecord = {
      id: sheetId,
      ownerEmail: userEmail.trim().toLowerCase(),
      name: customName?.trim() || character.name || 'Ficha Inyectada',
      character: {
        ...character,
        id: sheetId,
      },
      updatedAt: Date.now(),
    };
    this.savePlayerSheet(record);
    return record;
  },

  injectWorldSheet(
    userEmail: string,
    workspace: DMWorkspace,
    customName?: string,
    roomCode?: string,
    roomPassword?: string
  ): WorldSheetRecord {
    const worldId = `world-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const finalRoomCode = (
      roomCode?.trim() || `MESA-${Math.floor(1000 + Math.random() * 9000)}`
    ).toUpperCase();

    const record: WorldSheetRecord = {
      id: worldId,
      ownerEmail: userEmail.trim().toLowerCase(),
      name: customName?.trim() || 'Mundo Inyectado',
      roomCode: finalRoomCode,
      roomPassword: roomPassword?.trim() || undefined,
      workspace: workspace || {
        npcs: [],
        monsters: [],
        customItems: [],
        customItemsAndSpells: [],
        locations: [],
        campaignLogs: [],
        combatSummaries: [],
        folders: [],
        activeEncounter: {
          id: 'enc-default',
          name: 'Encuentro Inicial',
          round: 1,
          currentTurnIndex: 0,
          combatants: [],
          isActive: false,
          combatNotes: '',
          combatLog: [],
        },
        favoritesSRD: [],
      },
      updatedAt: Date.now(),
    };
    this.saveWorldSheet(record);
    return record;
  },

  // --- COMMUNITY FEEDBACK & SUGGESTIONS ---
  getFeedback(): FeedbackRecord[] {
    return readJSON<FeedbackRecord[]>('feedback.json', []);
  },

  saveFeedback(list: FeedbackRecord[], mutationReason?: string): void {
    writeJSON('feedback.json', list);
    if (mutationReason) {
      this.markMutation(mutationReason);
    }
  },

  addFeedback(item: Omit<FeedbackRecord, 'id' | 'createdAt'>): FeedbackRecord {
    const feedbackList = this.getFeedback();
    const newRecord: FeedbackRecord = {
      ...item,
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      status: 'unread',
    };
    feedbackList.unshift(newRecord); // newest first
    this.saveFeedback(feedbackList, `Nuevo feedback agregado (${newRecord.category})`);
    return newRecord;
  },

  deleteFeedback(id: string): boolean {
    const feedbackList = this.getFeedback();
    const filtered = feedbackList.filter((f) => f.id !== id);
    if (filtered.length !== feedbackList.length) {
      this.saveFeedback(filtered, `Feedback eliminado (${id})`);
      return true;
    }
    return false;
  },

  updateFeedbackStatus(id: string, status: 'unread' | 'reviewed'): boolean {
    const feedbackList = this.getFeedback();
    const item = feedbackList.find((f) => f.id === id);
    if (!item) return false;
    item.status = status;
    this.saveFeedback(feedbackList, `Estado de feedback actualizado (${id} -> ${status})`);
    return true;
  },

  closeRoom(code: string): boolean {
    const rooms = this.getRooms();
    const norm = code.trim().toUpperCase();
    if (rooms[norm]) {
      delete rooms[norm];
      this.saveRooms(rooms, `Sala cerrada: ${norm}`);
      return true;
    }
    return false;
  },

  // --- ROTATING 2-VERSION BACKUPS ---
  getBackups(): Record<string, PlayerRotatingBackup> {
    return readJSON<Record<string, PlayerRotatingBackup>>('backups.json', {});
  },

  addRotatingBackup(character: Character5e, ownerEmail: string, reason: 'join' | 'leave' | 'manual'): void {
    const backups = this.getBackups();
    const charId = character.id;
    let entry = backups[charId];

    if (!entry) {
      entry = {
        characterId: charId,
        ownerEmail: ownerEmail || 'jugador@weroll.app',
        characterName: character.name,
        slots: [],
        lastRotatedAt: Date.now(),
      };
    }

    const newSlot: RotatingBackupSlot = {
      timestamp: Date.now(),
      reason,
      snapshot: JSON.parse(JSON.stringify(character)),
    };

    // Keep strictly up to 2 rotating slots: if 2 exist, shift the older one out
    if (entry.slots.length >= 2) {
      entry.slots.shift();
    }
    entry.slots.push(newSlot);
    entry.characterName = character.name;
    entry.lastRotatedAt = Date.now();

    backups[charId] = entry;
    writeJSON('backups.json', backups);
  },

  // --- FORUM (POSTS & COMMENTS) ---
  getForumPosts(category?: string, roleFilter?: string, query?: string): ForumPost[] {
    const defaultPosts: ForumPost[] = [
      {
        id: 'post-update-100',
        category: 'app-updates',
        title: 'WeRoll 1.0 Beta • Rework Visual del Lobby, Pantalla del DM y Modo Online/Offline',
        content: '¡Llega WeRoll 1.0 Beta! Un gran salto visual y funcional: nuevo Lobby ornamentado con marco dorado y avatar de jugador, Modo Online y Offline para World Sheets del DM, rediseño completo de la Pantalla del Dungeon Master y Atlas del Mundo con visualización jerárquica de lugares, avisos pop-up en vivo del Administrador/Moderador en tiempo real y paneles de gestión a pantalla completa.',
        authorEmail: 'admin@weroll.app',
        authorName: 'Administrador Supremo',
        authorTagId: 'adm',
        authorFullTag: 'Administrador Supremo@adm',
        authorPlayerType: 'both',
        authorAppRole: 'admin',
        flair: 'Actualización',
        createdAt: 1792600000000,
        upvotes: 45,
        upvoters: ['admin@weroll.app', 'deadplanter@gmail.com'],
        commentsCount: 5,
        pinned: true,
      },
      {
        id: 'post-update-095',
        category: 'app-updates',
        title: 'WeRoll 0.9.5 Alfa • Paneles Dinámicos por Rol, Control Reversible de Publicación y Rediseño Compacto',
        content: '¡Llega la versión 0.9.5 Alfa! Unificación del panel de Amigos en una sola tarjeta funcional con botones rápidos de Copiar ID, Agregar y Actualizar. Restricción estricta para que únicamente los Administradores puedan publicar en "Actualizaciones de la App". Además, control bidireccional de permisos de publicación (Permitido/Negado) e historial de versiones con fechas escalonadas.',
        authorEmail: 'admin@weroll.app',
        authorName: 'Administrador Supremo',
        authorTagId: 'adm',
        authorFullTag: 'Administrador Supremo@adm',
        authorPlayerType: 'both',
        authorAppRole: 'admin',
        flair: 'Actualización',
        createdAt: 1792432800000, // 2026-10-19 18:00
        upvotes: 32,
        upvoters: ['admin@weroll.app', 'deadplanter@gmail.com'],
        commentsCount: 3,
        pinned: false,
      },
      {
        id: 'post-update-090',
        category: 'app-updates',
        title: 'WeRoll 0.9 Alfa • Separación de Roles, Nuevo Foro y Mensajes Directos',
        content: '¡Bienvenidos a la versión 0.9 Alfa! En esta entrega dividimos los roles en Tipo de Jugador (DM, Jugador o Ambos) y Rol en la App (Cliente, Moderador y Admin). Además, estrenamos el nuevo Foro WeRoll, panel de moderación simplificado y mensajería a amigos.',
        authorEmail: 'admin@weroll.app',
        authorName: 'Administrador Supremo',
        authorTagId: 'adm',
        authorFullTag: 'Administrador Supremo@adm',
        authorPlayerType: 'both',
        authorAppRole: 'admin',
        flair: 'Actualización',
        createdAt: 1791560700000, // 2026-10-09 15:45
        upvotes: 28,
        upvoters: ['admin@weroll.app', 'deadplanter@gmail.com'],
        commentsCount: 2,
        pinned: false,
      },
      {
        id: 'post-update-080',
        category: 'app-updates',
        title: 'WeRoll 0.8 Alfa • Mensajes Privados al DM en Sala, Nombres de Salas e IDs Únicos',
        content: 'Llega WeRoll 0.8 Alfa. Incluye mensajes privados de jugadores al DM dentro de la sala, bandeja especial para el DM, validación estricta de nombres y códigos de sala únicos, y edición directa de puntuaciones base de características.',
        authorEmail: 'admin@weroll.app',
        authorName: 'Administrador Supremo',
        authorTagId: 'adm',
        authorFullTag: 'Administrador Supremo@adm',
        authorPlayerType: 'both',
        authorAppRole: 'admin',
        flair: 'Actualización',
        createdAt: 1790594400000, // 2026-09-28 11:20
        upvotes: 21,
        upvoters: ['admin@weroll.app'],
        commentsCount: 1,
        pinned: false,
      },
      {
        id: 'post-update-065',
        category: 'app-updates',
        title: 'WeRoll 0.65 Alfa • Entregas Interactivas en Sala & Razas Personalizadas',
        content: 'Presentamos WeRoll 0.65 Alfa. Compartir objetos, conjuros y habilidades de forma interactiva (aceptar/rechazar) en la mesa, razas personalizadas e imágenes de avatar en las tarjetas de jugadores.',
        authorEmail: 'admin@weroll.app',
        authorName: 'Administrador Supremo',
        authorTagId: 'adm',
        authorFullTag: 'Administrador Supremo@adm',
        authorPlayerType: 'both',
        authorAppRole: 'admin',
        flair: 'Actualización',
        createdAt: 1789488000000, // 2026-09-15 16:00
        upvotes: 19,
        upvoters: ['admin@weroll.app'],
        commentsCount: 0,
        pinned: false,
      },
      {
        id: 'post-update-060',
        category: 'app-updates',
        title: 'WeRoll 0.6 Alfa • Sistema de Amigos (@ID) & Importación/Exportación JSON',
        content: 'Actualización 0.6 Alfa: integración del sistema de amigos mediante etiquetas @ID, descarga y carga de archivos .JSON para fichas y mundos, y sincronización en segundo plano con resguardo de datos.',
        authorEmail: 'admin@weroll.app',
        authorName: 'Administrador Supremo',
        authorTagId: 'adm',
        authorFullTag: 'Administrador Supremo@adm',
        authorPlayerType: 'both',
        authorAppRole: 'admin',
        flair: 'Actualización',
        createdAt: 1788344100000, // 2026-09-02 10:15
        upvotes: 15,
        upvoters: ['admin@weroll.app'],
        commentsCount: 0,
        pinned: false,
      },
      {
        id: 'post-update-050',
        category: 'app-updates',
        title: 'WeRoll 0.5 Alfa • Bóveda de Respaldo del DM & Paneles de Seguridad',
        content: 'En la versión 0.5 Alfa añadimos la Bóveda de Respaldo para DMs, inyección masiva de contenidos y paneles de seguridad para resguardo de claves.',
        authorEmail: 'admin@weroll.app',
        authorName: 'Administrador Supremo',
        authorTagId: 'adm',
        authorFullTag: 'Administrador Supremo@adm',
        authorPlayerType: 'both',
        authorAppRole: 'admin',
        flair: 'Actualización',
        createdAt: 1787409000000, // 2026-08-22 14:30
        upvotes: 14,
        upvoters: ['admin@weroll.app'],
        commentsCount: 0,
        pinned: false,
      },
      {
        id: 'post-update-010',
        category: 'app-updates',
        title: 'WeRoll 0.1 Alfa • Lanzamiento Inicial Companion & DM Suite para D&D 5E',
        content: '¡Lanzamiento oficial de la versión alfa inicial de WeRoll 5E! Herramientas esenciales para DMs, hoja de personaje interactiva de 5E y dados de combate.',
        authorEmail: 'admin@weroll.app',
        authorName: 'Administrador Supremo',
        authorTagId: 'adm',
        authorFullTag: 'Administrador Supremo@adm',
        authorPlayerType: 'both',
        authorAppRole: 'admin',
        flair: 'Actualización',
        createdAt: 1786363200000, // 2026-08-10 12:00
        upvotes: 25,
        upvoters: ['admin@weroll.app'],
        commentsCount: 1,
        pinned: false,
      },
      {
        id: 'post-init-2',
        category: 'general',
        title: 'Reglas y etiqueta para convivir en el Foro WeRoll',
        content: 'Recordatorio amistoso: mantengan los debates sobre reglas de 5E de manera constructiva. Para publicar contenido nuevo, recuerden que los moderadores aprueban los permisos para evitar spam. ¡Disfruten de sus aventuras!',
        authorEmail: 'admin@weroll.app',
        authorName: 'Administrador Supremo',
        authorTagId: 'adm',
        authorFullTag: 'Administrador Supremo@adm',
        authorPlayerType: 'both',
        authorAppRole: 'admin',
        flair: 'General',
        createdAt: 1792491000000,
        upvotes: 12,
        upvoters: ['admin@weroll.app'],
        commentsCount: 1,
        pinned: false,
      },
      {
        id: 'post-init-3',
        category: 'community',
        title: '¿Cómo balancean los descansos cortos en mazmorras con patrullas activas?',
        content: 'Saludos a todos los DMs y aventureros. Cuando el grupo se atrinchera en una habitación de mazmorra para descansar 1 hora, ¿hacen tiradas de encuentro aleatorio o les permiten recuperar recursos si aseguran la entrada? ¿Qué técnicas usan para mantener la tensión?',
        authorEmail: 'deadplanter@gmail.com',
        authorName: 'deadplanter',
        authorTagId: 'top',
        authorFullTag: 'deadplanter@top',
        authorPlayerType: 'dm',
        authorAppRole: 'admin',
        flair: 'Duda',
        createdAt: 1792492000000,
        upvotes: 24,
        upvoters: ['deadplanter@gmail.com', 'admin@weroll.app'],
        commentsCount: 2,
        pinned: false,
      },
    ];

    let posts = readJSON<ForumPost[]>('forum_posts.json', defaultPosts);
    if (!posts || posts.length === 0) {
      posts = defaultPosts;
      writeJSON('forum_posts.json', posts);
    } else if (!posts.some((p) => p.id === 'post-update-100')) {
      posts = [defaultPosts[0], ...posts.map((p) => (p.pinned ? { ...p, pinned: false } : p))];
      writeJSON('forum_posts.json', posts);
    }

    if (category && category !== 'all') {
      posts = posts.filter((p) => p.category === category);
    }

    if (roleFilter && roleFilter !== 'all') {
      if (roleFilter === 'dm') {
        posts = posts.filter((p) => p.authorPlayerType === 'dm' || p.authorPlayerType === 'both');
      } else if (roleFilter === 'player') {
        posts = posts.filter((p) => p.authorPlayerType === 'player' || p.authorPlayerType === 'both');
      }
    }

    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      posts = posts.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q) ||
        p.authorFullTag.toLowerCase().includes(q) ||
        (p.flair && p.flair.toLowerCase().includes(q))
      );
    }

    return posts.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt);
  },

  getForumPostWithComments(id: string): { post: ForumPost | null; comments: ForumComment[] } {
    const posts = this.getForumPosts();
    const post = posts.find((p) => p.id === id) || null;
    const defaultComments: ForumComment[] = [
      {
        id: 'comm-1',
        postId: 'post-init-3',
        content: 'En mis mesas suelo tirar 1d6 cada 20 minutos de juego narrativo. Con un 1 hay patrulla.',
        authorEmail: 'admin@weroll.app',
        authorName: 'Administrador Supremo',
        authorTagId: 'adm',
        authorFullTag: 'Administrador Supremo@adm',
        authorPlayerType: 'both',
        authorAppRole: 'admin',
        createdAt: 1792492500000,
        upvotes: 5,
        upvoters: ['deadplanter@gmail.com'],
      },
      {
        id: 'comm-2',
        postId: 'post-init-3',
        content: 'Como jugador, usamos conjuros como Alarma o Truco de la Cuerda para evitar que nos sorprendan.',
        authorEmail: 'jugador@weroll.app',
        authorName: 'Valeros',
        authorTagId: 'val',
        authorFullTag: 'Valeros@val',
        authorPlayerType: 'player',
        authorAppRole: 'client',
        createdAt: 1792493000000,
        upvotes: 8,
        upvoters: ['admin@weroll.app', 'deadplanter@gmail.com'],
      },
    ];
    let allComments = readJSON<ForumComment[]>('forum_comments.json', defaultComments);
    if (!allComments || allComments.length === 0) {
      allComments = defaultComments;
      writeJSON('forum_comments.json', allComments);
    }
    const postComments = allComments.filter((c) => c.postId === id).sort((a, b) => a.createdAt - b.createdAt);
    return { post, comments: postComments };
  },

  createForumPost(postData: Omit<ForumPost, 'id' | 'createdAt' | 'upvotes' | 'commentsCount'>): ForumPost {
    const posts = readJSON<ForumPost[]>('forum_posts.json', []);
    const newPost: ForumPost = {
      ...postData,
      id: `fpost-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      upvotes: 1,
      upvoters: [postData.authorEmail],
      commentsCount: 0,
    };
    posts.unshift(newPost);
    writeJSON('forum_posts.json', posts);
    this.markMutation(`Nueva publicación en foro: "${newPost.title}" por ${newPost.authorFullTag}`);
    return newPost;
  },

  updateForumPost(id: string, updates: Partial<ForumPost>): ForumPost | null {
    const posts = readJSON<ForumPost[]>('forum_posts.json', []);
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    posts[idx] = {
      ...posts[idx],
      ...updates,
      updatedAt: Date.now(),
    };
    writeJSON('forum_posts.json', posts);
    this.markMutation(`Publicación de foro actualizada: ${posts[idx].title}`);
    return posts[idx];
  },

  deleteForumPost(id: string): boolean {
    const posts = readJSON<ForumPost[]>('forum_posts.json', []);
    const filtered = posts.filter((p) => p.id !== id);
    if (filtered.length !== posts.length) {
      writeJSON('forum_posts.json', filtered);
      const comments = readJSON<ForumComment[]>('forum_comments.json', []);
      const remainingComments = comments.filter((c) => c.postId !== id);
      writeJSON('forum_comments.json', remainingComments);
      this.markMutation(`Publicación de foro eliminada: ${id}`);
      return true;
    }
    return false;
  },

  upvoteForumPost(postId: string, userEmail: string): { upvotes: number; userUpvoted: boolean } {
    const posts = readJSON<ForumPost[]>('forum_posts.json', []);
    const post = posts.find((p) => p.id === postId);
    if (!post) throw new Error('Publicación no encontrada');
    const upvoters = Array.isArray(post.upvoters) ? post.upvoters : [];
    const normEmail = userEmail.trim().toLowerCase();
    const hasUpvoted = upvoters.includes(normEmail);

    if (hasUpvoted) {
      post.upvoters = upvoters.filter((e) => e !== normEmail);
      post.upvotes = Math.max(0, (post.upvotes || 1) - 1);
    } else {
      post.upvoters = [...upvoters, normEmail];
      post.upvotes = (post.upvotes || 0) + 1;
    }
    writeJSON('forum_posts.json', posts);
    return { upvotes: post.upvotes, userUpvoted: !hasUpvoted };
  },

  addForumComment(commentData: Omit<ForumComment, 'id' | 'createdAt' | 'upvotes'>): ForumComment {
    const comments = readJSON<ForumComment[]>('forum_comments.json', []);
    const newComment: ForumComment = {
      ...commentData,
      id: `fcomm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      upvotes: 1,
      upvoters: [commentData.authorEmail],
    };
    comments.push(newComment);
    writeJSON('forum_comments.json', comments);

    const posts = readJSON<ForumPost[]>('forum_posts.json', []);
    const post = posts.find((p) => p.id === commentData.postId);
    if (post) {
      post.commentsCount = (post.commentsCount || 0) + 1;
      writeJSON('forum_posts.json', posts);
    }
    this.markMutation(`Comentario en foro agregado al post ${commentData.postId}`);
    return newComment;
  },

  deleteForumComment(id: string): boolean {
    const comments = readJSON<ForumComment[]>('forum_comments.json', []);
    const target = comments.find((c) => c.id === id);
    if (!target) return false;
    const filtered = comments.filter((c) => c.id !== id);
    writeJSON('forum_comments.json', filtered);

    const posts = readJSON<ForumPost[]>('forum_posts.json', []);
    const post = posts.find((p) => p.id === target.postId);
    if (post) {
      post.commentsCount = Math.max(0, (post.commentsCount || 1) - 1);
      writeJSON('forum_posts.json', posts);
    }
    this.markMutation(`Comentario en foro eliminado: ${id}`);
    return true;
  },

  upvoteForumComment(commentId: string, userEmail: string): { upvotes: number; userUpvoted: boolean } {
    const comments = readJSON<ForumComment[]>('forum_comments.json', []);
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) throw new Error('Comentario no encontrado');
    const upvoters = Array.isArray(comment.upvoters) ? comment.upvoters : [];
    const normEmail = userEmail.trim().toLowerCase();
    const hasUpvoted = upvoters.includes(normEmail);

    if (hasUpvoted) {
      comment.upvoters = upvoters.filter((e) => e !== normEmail);
      comment.upvotes = Math.max(0, (comment.upvotes || 1) - 1);
    } else {
      comment.upvoters = [...upvoters, normEmail];
      comment.upvotes = (comment.upvotes || 0) + 1;
    }
    writeJSON('forum_comments.json', comments);
    return { upvotes: comment.upvotes, userUpvoted: !hasUpvoted };
  },

  // --- FRIEND DIRECT MESSAGING ---
  getFriendDirectMessages(user1Id: string, user2Id: string): FriendDirectMessage[] {
    const all = readJSON<FriendDirectMessage[]>('friend_messages.json', []);
    return all
      .filter(
        (m) =>
          (m.fromUserId === user1Id && m.toUserId === user2Id) ||
          (m.fromUserId === user2Id && m.toUserId === user1Id)
      )
      .sort((a, b) => a.createdAt - b.createdAt);
  },

  getAllUserDirectMessages(userId: string): FriendDirectMessage[] {
    const all = readJSON<FriendDirectMessage[]>('friend_messages.json', []);
    return all
      .filter((m) => m.fromUserId === userId || m.toUserId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  sendFriendDirectMessage(params: Omit<FriendDirectMessage, 'id' | 'createdAt' | 'read'>): FriendDirectMessage {
    const all = readJSON<FriendDirectMessage[]>('friend_messages.json', []);
    const newMsg: FriendDirectMessage = {
      ...params,
      id: `fdm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      read: false,
    };
    all.push(newMsg);
    writeJSON('friend_messages.json', all);
    this.markMutation(`Mensaje directo entre amigos: de ${newMsg.fromFullTag} a ${newMsg.toFullTag}`);
    return newMsg;
  },

  markFriendDirectMessagesAsRead(toUserId: string, fromUserId: string): void {
    const all = readJSON<FriendDirectMessage[]>('friend_messages.json', []);
    let changed = false;
    for (const m of all) {
      if (m.toUserId === toUserId && m.fromUserId === fromUserId && !m.read) {
        m.read = true;
        changed = true;
      }
    }
    if (changed) {
      writeJSON('friend_messages.json', all);
    }
  },

  // --- DM / DUNGEON MASTER PRIVATE MESSAGES VAULT ---
  getDmMessages(): PlayerMessageToDM[] {
    const fromFile = readJSON<PlayerMessageToDM[]>('dm_messages.json', []);
    const worlds = this.getWorldSheets();
    const map = new Map<string, PlayerMessageToDM>();
    for (const m of fromFile) {
      if (m && m.id) map.set(m.id, m);
    }
    for (const w of worlds) {
      if (Array.isArray(w.workspace?.playerMessages)) {
        for (const m of w.workspace.playerMessages) {
          if (m && m.id && !map.has(m.id)) map.set(m.id, m);
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
  },

  saveDmMessage(msg: PlayerMessageToDM): void {
    const list = this.getDmMessages();
    const idx = list.findIndex((m) => m.id === msg.id);
    if (idx >= 0) {
      list[idx] = msg;
    } else {
      list.unshift(msg);
    }
    writeJSON('dm_messages.json', list.slice(0, 500));
    this.markMutation(`Mensaje privado al DM: ${msg.characterName || 'Personaje'} (${msg.playerName || 'Jugador'})`);
  },

  markDmMessageRead(messageId: string): void {
    const list = this.getDmMessages();
    const target = list.find((m) => m.id === messageId);
    if (target) {
      target.readByDm = true;
      writeJSON('dm_messages.json', list);
    }
  },

  deleteDmMessage(messageId: string): void {
    let list = this.getDmMessages();
    const initialLen = list.length;
    list = list.filter((m) => m.id !== messageId);
    if (list.length < initialLen) {
      writeJSON('dm_messages.json', list);
      this.markMutation(`Mensaje para DM eliminado: ${messageId}`);
    }
  },

  // --- FORUM PERMISSION MANAGEMENT (MODERATOR / ADMIN) ---
  setUserForumPostingPermission(userId: string, allowed: boolean): UserAccount | null {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return null;
    user.canPostInForum = allowed;
    user.forumPermissionsRequested = false;
    this.saveUsers(
      users,
      `Permiso de publicación en foro ${allowed ? 'concedido' : 'revocado'} para ${user.displayName}@${user.userTagId}`
    );
    return user;
  },

  requestForumPostingPermission(userId: string): boolean {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return false;
    user.forumPermissionsRequested = true;
    this.saveUsers(users, `Solicitud de permiso de foro por ${user.displayName}@${user.userTagId}`);
    return true;
  },

  // --- PERSISTENT HOST SETTINGS & CHANGELOG ---
  getHostSettings(): HostSettings {
    const v10BetaEntry: ChangelogEntry = {
      version: '1.0 Beta',
      date: '2026-10-21',
      title: 'WeRoll 1.0 Beta • Rework Visual del Lobby y Pantalla del DM, Modo Online/Offline y Avisos en Vivo',
      changes: [
        'Rework Visual Completo del Lobby: Nuevo diseño refinado con marco dorado ornamentado, avatar circular de perfil de jugador, insignias dinámicas de rol y acceso directo a seguridad de cuenta.',
        'Modo Online y Offline para World Sheets: Opción para que el DM abra sus mesas en Modo Online (para conexión en vivo de jugadores) o Modo Offline (para diseñar, preparar y editar campañas en privado sin abrir sala pública).',
        'Rework Visual de la Pantalla del DM y Atlas del Mundo: Navegación jerárquica de ubicaciones geográficas y lugares, filtrado visual temático de PNJs, monstruos y objetos, y visualización táctica en vivo.',
        'Avisos Pop-up en Vivo del Administrador / Moderador: Transmisión instantánea de comunicados importantes en tiempo real para todos los usuarios activos en el lobby y en partidas.',
        'Imagen de Perfil de Jugador Personalizada: Sube tu propia foto o retrato de jugador (independiente de las fichas de personaje), visible en el banner del Lobby y en la lista de Amigos.',
        'Aviso Oficial Reorganizado sobre el Foro: Reubicación compacta del comunicado oficial del administrador directamente sobre el Foro WeRoll para mayor claridad visual.',
        'Paneles de Administración y Moderación a Pantalla Completa: Vistas dedicadas y fluidas para la gestión de usuarios, roles, bóvedas de respaldo y moderación de contenido comunitario.',
      ],
    };

    const v095Entry: ChangelogEntry = {
      version: '0.9.5 Alfa',
      date: '2026-10-20',
      title: 'WeRoll 0.9.5 Alfa • Compresión Inteligente de Avatares, Respaldo Maestro Total Ampliado & Paneles Duales para Administradores',
      changes: [
        'Compresión y Escalado Automático de Avatares: Optimización avanzada en cliente y servidor (max 512x512, WebP/JPEG ~40-80 KB) para garantizar que las fotos y retratos de personajes se guarden con fluidez en LocalStorage y se sincronicen sin errores en la bóveda y respaldos maestros.',
        'Respaldo Maestro Total y en la Nube Ampliado: Inclusión exhaustiva de mensajes entre amigos (friendMessages), mensajes privados al DM (dmMessages), foro comunitario y comentarios en los respaldos maestros JSON y sincronización automática continua.',
        'Acceso Dual para Administradores (Admin + Moderación): El rol de Administrador ahora visualiza y accede simultáneamente al botón y panel de Administración General y al Panel de Moderación Comunitaria desde la barra superior y el lobby.',
        'Unificación de Sección de Amigos y Rediseño Compacto: Consolidación de Amigos, Agregar Amigo y Usuario@ID con botones directos para Copiar ID, Agregar y Actualizar, adaptado con diseño responsivo impecable.',
      ],
    };

    const v09Entry: ChangelogEntry = {
      version: '0.9 Alfa',
      date: '2026-10-09',
      title: 'WeRoll 0.9 Alfa • Separación de Roles (Tipo de Jugador & Rol en App), Nuevo Foro WeRoll, Panel de Moderación y Mensajería a Amigos',
      changes: [
        'Separación de Roles en Dos Dimensiones: Asignación independiente de "Rol de Tipo de Jugador" (Dungeon Master únicamente, Jugador únicamente o DM y Jugador) y "Rol en la Aplicación" (Cliente, Moderador o Administrador).',
        'Nuevo Rol de Moderador y Panel Simplificado: El Moderador cuenta con un panel específico para aprobar nuevos registros, autorizar o restringir permisos de publicación en el foro y moderar contenido, sin acceso a contraseñas ni bóvedas de respaldo.',
        'Nuevo Foro WeRoll (~2/3 de la Pantalla): Sistema de foro con tres secciones: Actualizaciones de la App, Foro General y Foro Comunitario (con filtrado por Todos los mensajes, Solo DMs y Solo Jugadores, votos positivos, flairs y comentarios).',
        'Permisos de Publicación en el Foro: Por seguridad comunitaria, los jugadores clientes requieren aprobación de un moderador o admin para publicar, garantizando un espacio libre de spam.',
        'Mensajería Directa entre Amigos: Envía y recibe mensajes privados directamente desde la sección de Amigos con historial de conversación y marcas de lectura.',
        'Rediseño Elegante del Lobby: Eliminación del tirador de dados en el lobby (ahora exclusivo de las mesas en vivo) y botones discretos superiores de utilidades (Manual, Oráculo, Feedback/Panel de Admin y Acceso a Seguridad & Contraseña).',
        'Respaldo Total en la Nube y Exportación JSON: Cada publicación, comentario, mensaje entre amigos y rol se sincroniza automáticamente con la nube y el Respaldo Maestro JSON.',
      ],
    };

    const v08Entry: ChangelogEntry = {
      version: '0.8 Alfa',
      date: '2026-09-28',
      title: 'WeRoll 0.8 Alfa • Mensajes Privados al DM en Sala, Nombres de Salas e IDs Únicos, Player Sheet Remasterizada & Edición de Rasgos/Estadísticas',
      changes: [
        'Mensajes Privados del Jugador al DM en Sala: botón discreto de mensaje en la barra superior de jugadores conectados para enviar mensajes privados al DM con título y descripción.',
        'Bandeja "Mensajes de Jugadores" para el DM: nueva pestaña junto a Diario y Crónicas en la pantalla del DM donde se reciben los mensajes con nombre del personaje, nombre del jugador, su @ID, título y descripción.',
        'Sistema de Nombres y Códigos de Sala Únicos entre DMs: impide crear o renombrar salas/mesas con un nombre o código que ya esté registrado por otro DM para evitar confusiones.',
        'Corroboración Continua de Unicidad de Usuario e ID (@ID): validación estricta y verificación automática constante para garantizar que ningún usuario comparta el mismo nombre de usuario o ID.',
        'Edición Directa de Puntuaciones Base, Rasgos y Trasfondo: modifica tus puntuaciones de estadísticas base (FUE, DES, CON, INT, SAB, CAR), rasgos de personalidad, ideales, vínculos, defectos, rasgos especiales/dotes e historia del personaje con autoguardado en la nube.',
        'Remasterización de Player Sheet (Inventario de 3 Tipos, Armas Multi-Ataque, XP Editable, Habilidades en Español y Diario del Jugador): clasificación en Objetos Comunes, Armas y Armaduras; ataques automáticos en Combate al equipar un arma; creador de armas multi-ataque por pestañas para el DM; indicador de XP editable; habilidades personalizables en español y nueva 6ª pestaña "Diario del Jugador".',
      ],
    };

    const v065Entry: ChangelogEntry = {
      version: '0.65 Alfa',
      date: '2026-09-15',
      title: 'WeRoll 0.65 Alfa • Entregas Interactivas en Sala, Razas Personalizadas, Fotos en Mesa & Edición de Nivel/Clase/Alineamiento',
      changes: [
        'Compartir Objetos, Conjuros y Habilidades exclusivamente en la Misma Sala: el DM ahora solo puede compartir elementos con jugadores que estén conectados activamente dentro de su misma sala (roomCode).',
        'Notificación Interactiva al Jugador (Aceptar / Rechazar): al compartir un objeto, conjuro o habilidad, el jugador recibe una ventana de confirmación en tiempo real para aceptar o rechazar el elemento.',
        'Sincronización Instantánea en la Player Sheet y Aviso al DM: al aceptar o rechazar el elemento compartido, se actualiza la ficha del jugador y el DM recibe una notificación inmediata con la respuesta.',
        'Raza Personalizada al Crear o Modificar Personaje: ahora puedes elegir la opción "✨ Raza Personalizada" (además de Humano, Elfo, Enano, etc.) tanto en el Creador de Personaje como al editar tu Player Sheet para escribir cualquier raza propia.',
        'Modificación Directa de Nivel (1 a 20), Clase y Alineamiento: controles rápidos (- / + y selector de Nivel 1-20) directamente en el encabezado de la Player Sheet, en el creador y en el editor de identidad.',
        'Foto / Retrato del Personaje en las Tarjetas de la Mesa en Vivo: las tarjetas de jugadores conectados en la mesa ahora muestran la foto o avatar del personaje junto al nombre del personaje, nombre del jugador, estado en línea y estadísticas.',
      ],
    };

    const v06Entry: ChangelogEntry = {
      version: '0.6 Alfa',
      date: '2026-09-02',
      title: 'WeRoll 0.6 Alfa • Sistema de Amigos (@ID), Importación/Exportación Local & Respaldo Continuo Inteligente',
      changes: [
        'Apartado de Amigos en el Lobby: agrega y elimina amigos fácilmente ingresando su identificador único con formato nombre@ID (ej. usuario1@123 o usuario2@top).',
        'Identificador Personalizado (@ID de hasta 3 caracteres): configurable al crear tu cuenta y editable en cualquier momento desde Seguridad & Contraseña, junto con visualización y botón para copiar tu Usuario@ID.',
        'Importación y Exportación Local (.JSON): botón de descarga directa al lado de cada Player Sheet y cada World Sheet, y botones de importación local junto a "Crear Nuevo Personaje" y "Crear World Sheet".',
        'Respaldo Automático en Cada Cambio y Comparación Continua (Archivo Base vs. Nube): cada cambio en cuentas, roles, amigos, fichas, mundos, bloc de notas o feedback dispara un respaldo en la nube y resguarda versiones anteriores antes de cualquier reemplazo.',
        'Gestión Avanzada de Usuarios para el Administrador: visualización de @IDs y amigos, botón para agregar usuarios registrados/de prueba directamente, edición de correo/usuario/ID y borrado de cuentas.',
      ],
    };

    const v05Entry: ChangelogEntry = {
      version: '0.5 Alfa',
      date: '2026-08-22',
      title: 'WeRoll 0.5 Alfa • Bóveda de Respaldo del DM, Inyección Maestro & Seguridad',
      changes: [
        'Bóveda de Respaldo para DMs: Resguardo de campañas, personajes y fichas con sincronización global.',
        'Paneles de Seguridad y Reseteo: Gestión de contraseñas de DM, moderadores y usuarios.',
      ],
    };

    const v01Entry: ChangelogEntry = {
      version: '0.1 Alfa',
      date: '2026-08-10',
      title: 'WeRoll 0.1 Alfa • Lanzamiento Inicial Companion & DM Suite',
      changes: [
        'Lanzamiento oficial de la versión alfa inicial de WeRoll 5E.',
        'Autenticación por roles independientes: Jugador, Dungeon Master y Moderador.',
      ],
    };

    const defaultSettings: HostSettings = {
      headerTitle: 'WeRoll',
      headerSubtitle: 'Companion & DM Suite v1.0 Beta',
      headerLogoIcon: 'shield',
      aiModel: 'gemini-flash-lite-latest',
      moderatorPassword: 'admin',
      dmPassword: '',
      oracleWelcomeMessage:
        'Saludos, viajero. Soy el Sabio Arcano, tu árbitro y custodio de las reglas de 5E. ¿Qué duda deseas resolver hoy?',
      rejectionCustomMessage:
        'Lo lamentamos, por el momento no puedes acceder a WeRoll. Manda mensaje a soporte@weroll.app si quieres una revisión manual de tu caso.',
      adminGreeting: {
        enabled: true,
        title: 'Comunicado del Administrador',
        message:
          '¡Bienvenido a WeRoll 5E v1.0 Beta! Rework visual del Lobby y Pantalla del DM, Modo Online/Offline para World Sheets y avisos en vivo.',
        type: 'info',
        updatedAt: Date.now(),
      },
      developerNotice: {
        enabled: true,
        title: 'WeRoll • Novedades v1.0 Beta',
        content:
          '¡Versión 1.0 Beta disponible! Rework visual completo del Lobby y Pantalla del DM, Modo Online/Offline para World Sheets, avisos pop-up en vivo e imagen de perfil de jugador.',
        version: '1.0 Beta',
      },
      changelog: [
        v10BetaEntry,
        v095Entry,
        v09Entry,
        v08Entry,
        v065Entry,
        v06Entry,
        v05Entry,
        v01Entry,
      ],
    };

    const current = readJSON<Partial<HostSettings>>('settings.json', defaultSettings);
    const savedCreds = this.loadCloudCredentialsFromPersistentVault();

    // Merge saved cloud credentials if settings.json lost them on container restart
    const hasCurrentAb = current.autoBackup !== undefined;
    const mergedAutoBackup: AutoBackupConfig | undefined =
      current.autoBackup || savedCreds
        ? {
            enabled: current.autoBackup?.enabled ?? savedCreds?.enabled ?? false,
            backupOnEveryChange:
              current.autoBackup?.backupOnEveryChange ?? savedCreds?.backupOnEveryChange ?? false,
            continuousComparison:
              current.autoBackup?.continuousComparison ?? savedCreds?.continuousComparison ?? false,
            frequencyHours: current.autoBackup?.frequencyHours || savedCreds?.frequencyHours || 24,
            destination: current.autoBackup?.destination || savedCreds?.destination || 'drive',
            githubToken: hasCurrentAb
              ? (current.autoBackup?.githubToken ?? '')
              : (savedCreds?.githubToken || ''),
            githubRepo: hasCurrentAb
              ? (current.autoBackup?.githubRepo ?? '')
              : (savedCreds?.githubRepo || ''),
            githubPath: hasCurrentAb
              ? (current.autoBackup?.githubPath ?? 'backups/weroll-backup-latest.json')
              : (savedCreds?.githubPath || 'backups/weroll-backup-latest.json'),
            githubArchivePath: hasCurrentAb
              ? (current.autoBackup?.githubArchivePath ?? 'backups/replaced-archive')
              : (savedCreds?.githubArchivePath || 'backups/replaced-archive'),
            driveFolderId: hasCurrentAb
              ? (current.autoBackup?.driveFolderId ?? '')
              : (savedCreds?.driveFolderId || ''),
            driveArchiveFolderId: hasCurrentAb
              ? (current.autoBackup?.driveArchiveFolderId ?? '')
              : (savedCreds?.driveArchiveFolderId || ''),
            driveAccessToken: hasCurrentAb
              ? (current.autoBackup?.driveAccessToken ?? '')
              : (savedCreds?.driveAccessToken || ''),
            driveAccountEmail: hasCurrentAb
              ? (current.autoBackup?.driveAccountEmail ?? '')
              : (savedCreds?.driveAccountEmail || ''),
            webhookUrl: hasCurrentAb
              ? (current.autoBackup?.webhookUrl ?? '')
              : (savedCreds?.webhookUrl || ''),
            lastBackupAt: current.autoBackup?.lastBackupAt || savedCreds?.lastBackupAt,
            lastBackupStatus: current.autoBackup?.lastBackupStatus || savedCreds?.lastBackupStatus,
            lastBackupMessage: current.autoBackup?.lastBackupMessage || savedCreds?.lastBackupMessage,
            lastComparisonAt: current.autoBackup?.lastComparisonAt || savedCreds?.lastComparisonAt,
            lastComparisonStatus:
              current.autoBackup?.lastComparisonStatus || savedCreds?.lastComparisonStatus,
            history: current.autoBackup?.history || savedCreds?.history || [],
          }
        : undefined;

    let finalChangelog =
      current.changelog && current.changelog.length > 0
        ? [...current.changelog]
        : [...(defaultSettings.changelog || [])];

    // Ensure v0.6 Alfa, v0.65 Alfa and v0.8 Alfa are present in the changelog even if settings.json was created on an older version
    const hasV06 = finalChangelog.some(
      (entry) => entry.version && entry.version.toLowerCase() === '0.6 alfa'
    );
    if (!hasV06) {
      finalChangelog = [v06Entry, ...finalChangelog];
    }

    const v065Idx = finalChangelog.findIndex(
      (entry) => entry.version && entry.version.toLowerCase().includes('0.65')
    );
    if (v065Idx === -1) {
      finalChangelog = [v065Entry, ...finalChangelog];
    } else if ((finalChangelog[v065Idx].changes || []).length < 6) {
      finalChangelog[v065Idx] = v065Entry;
    }

    const v08Idx = finalChangelog.findIndex(
      (entry) => entry.version && entry.version.toLowerCase().includes('0.8')
    );
    if (v08Idx === -1) {
      finalChangelog = [v08Entry, ...finalChangelog];
    } else {
      finalChangelog[v08Idx] = v08Entry;
    }

    const v10Idx = finalChangelog.findIndex(
      (entry) => entry.version && entry.version.toLowerCase().includes('1.0')
    );
    if (v10Idx === -1) {
      finalChangelog = [v10BetaEntry, ...finalChangelog];
    } else {
      finalChangelog[v10Idx] = v10BetaEntry;
    }

    const finalHeaderSubtitle =
      !current.headerSubtitle ||
      /v0\.(1|2|3|4|5|6|65|8|9|95)\b/i.test(current.headerSubtitle) ||
      current.headerSubtitle.includes('0.9')
        ? defaultSettings.headerSubtitle
        : current.headerSubtitle;

    const merged: HostSettings = {
      ...defaultSettings,
      ...current,
      headerSubtitle: finalHeaderSubtitle,
      ...(mergedAutoBackup ? { autoBackup: mergedAutoBackup } : {}),
      developerNotice: {
        ...defaultSettings.developerNotice!,
        ...(current.developerNotice || {}),
        version: '1.0 Beta',
        title: 'WeRoll • Novedades v1.0 Beta',
      },
      adminGreeting: current.adminGreeting
        ? {
            ...defaultSettings.adminGreeting!,
            ...current.adminGreeting,
            message:
              current.adminGreeting.message && current.adminGreeting.message.includes('0.9')
                ? defaultSettings.adminGreeting!.message
                : current.adminGreeting.message,
          }
        : defaultSettings.adminGreeting,
      changelog: finalChangelog,
    };
    return merged;
  },

  saveHostSettings(
    settings: Partial<HostSettings>,
    options?: { silentSync?: boolean; mutationReason?: string }
  ): HostSettings {
    const current = this.getHostSettings();
    const merged: HostSettings = {
      ...current,
      ...settings,
      developerNotice: {
        ...current.developerNotice!,
        ...(settings.developerNotice || {}),
      },
      adminGreeting: settings.adminGreeting
        ? {
            ...(current.adminGreeting || {
              enabled: true,
              title: 'Comunicado del Administrador',
              message: '',
              type: 'info',
            }),
            ...settings.adminGreeting,
          }
        : current.adminGreeting,
      changelog: settings.changelog !== undefined ? settings.changelog : current.changelog,
    };

    writeJSON('settings.json', merged);

    if (merged.autoBackup) {
      try {
        const credsPath = path.join(PERSISTENT_VAULT_DIR, 'cloud_credentials.json');
        fs.writeFileSync(credsPath, JSON.stringify(merged.autoBackup, null, 2), 'utf-8');
      } catch {}
    }

    // Synchronize moderator user password in users.json
    if (merged.moderatorPassword && merged.moderatorPassword.trim()) {
      const newPass = merged.moderatorPassword.trim();
      const users = this.getUsers();
      let changed = false;
      for (const u of users) {
        if (u.role === 'moderator' || u.role === 'admin' || u.email.toLowerCase() === 'admin@weroll.app') {
          if (u.password !== newPass) {
            u.password = newPass;
            changed = true;
          }
        }
      }
      if (changed) {
        writeJSON('users.json', users);
      }
    }

    if (!options?.silentSync) {
      this.markMutation(options?.mutationReason || 'Ajustes del Panel de Administrador actualizados');
    } else {
      this.saveToPersistentVault();
    }

    return merged;
  },

  unlinkGithub(): HostSettings {
    // 1. Remove old credentials from persistent vault first
    try {
      const credsPath = path.join(PERSISTENT_VAULT_DIR, 'cloud_credentials.json');
      if (fs.existsSync(credsPath)) {
        fs.unlinkSync(credsPath);
      }
    } catch {}

    // 2. Read raw settings.json and strip all GitHub config
    const rawSettings = readJSON<any>('settings.json', {});
    const currentAb = rawSettings.autoBackup || {
      enabled: false,
      backupOnEveryChange: false,
      continuousComparison: false,
      frequencyHours: 24,
      destination: 'drive',
    };

    const updatedAutoBackup: AutoBackupConfig = {
      ...currentAb,
      destination: currentAb.destination === 'github' ? 'drive' : currentAb.destination,
      githubToken: '',
      githubRepo: '',
      githubPath: '',
      githubArchivePath: '',
      lastBackupStatus: undefined,
      lastBackupMessage: 'Cuenta y repositorio de GitHub desvinculados exitosamente.',
      history: (currentAb.history || []).filter((h: any) => h.destination !== 'github').slice(0, 15),
    };

    rawSettings.autoBackup = updatedAutoBackup;
    writeJSON('settings.json', rawSettings);

    // 3. Save clean credentials to persistent vault without any GitHub info
    try {
      const credsPath = path.join(PERSISTENT_VAULT_DIR, 'cloud_credentials.json');
      fs.writeFileSync(credsPath, JSON.stringify(updatedAutoBackup, null, 2), 'utf-8');
    } catch {}

    return this.getHostSettings();
  },

  // --- CHANGELOG / UPDATES BLOG CRUD ---
  getChangelog(): ChangelogEntry[] {
    const settings = this.getHostSettings();
    return settings.changelog || [];
  },

  addChangelogEntry(entry: ChangelogEntry): ChangelogEntry[] {
    const settings = this.getHostSettings();
    const list = settings.changelog || [];
    list.unshift(entry);
    settings.changelog = list;
    this.saveHostSettings(settings, {
      mutationReason: `Nueva nota de versión en Bloc de Notas: v${entry.version} (${entry.title})`,
    });
    return list;
  },

  updateChangelogEntry(index: number, updated: ChangelogEntry): ChangelogEntry[] | null {
    const settings = this.getHostSettings();
    const list = settings.changelog || [];
    if (index < 0 || index >= list.length) return null;
    list[index] = updated;
    settings.changelog = list;
    this.saveHostSettings(settings, {
      mutationReason: `Nota de versión actualizada en Bloc de Notas: v${updated.version}`,
    });
    return list;
  },

  deleteChangelogEntry(index: number): ChangelogEntry[] | null {
    const settings = this.getHostSettings();
    const list = settings.changelog || [];
    if (index < 0 || index >= list.length) return null;
    const removed = list[index];
    list.splice(index, 1);
    settings.changelog = list;
    this.saveHostSettings(settings, {
      mutationReason: `Nota de versión eliminada del Bloc de Notas: v${removed?.version || index}`,
    });
    return list;
  },

  // --- FULL DATABASE BACKUP EXPORT & RESTORE ---
  getFullBackup(): any {
    const syncMeta = this.getSyncMetadata();
    const backupTimestamp = syncMeta.lastModifiedAt || Date.now();
    const rawSettings = this.getHostSettings();
    const sanitizedSettings = {
      ...rawSettings,
      autoBackup: rawSettings.autoBackup
        ? {
            ...rawSettings.autoBackup,
            githubToken: '',
            driveAccessToken: '',
          }
        : undefined,
    };
    return {
      exportedAt: new Date(backupTimestamp).toISOString(),
      backupTimestamp,
      revision: syncMeta.revision || 0,
      isBaseState: syncMeta.isBaseState,
      lastMutationReason: syncMeta.lastMutationReason,
      contentHash: syncMeta.contentHash,
      platform: 'WeRoll 5E',
      schemaVersion: 2,
      appVersion: '0.5 ALFA',
      users: this.getUsers(),
      rooms: this.getRooms(),
      sheets: this.getPlayerSheets(),
      worlds: this.getWorldSheets(),
      backups: this.getBackups(),
      settings: sanitizedSettings,
      feedback: this.getFeedback(),
      forumPosts: this.getForumPosts(),
      forumComments: readJSON<ForumComment[]>('forum_comments.json', []),
      friendMessages: readJSON<FriendDirectMessage[]>('friend_messages.json', []),
      dmMessages: this.getDmMessages(),
    };
  },

  restoreBackup(
    payload: any,
    options?: {
      fromCloudSync?: boolean;
      replaceAll?: boolean;
      remoteTimestamp?: number;
      remoteRevision?: number;
      isManualImport?: boolean;
    }
  ): {
    success: boolean;
    type: string;
    count: number;
    details?: any;
    message: string;
    revision?: number;
    timestamp?: number;
    latestBackup?: any;
    syncMetadata?: SyncMetadata;
  } {
    if (!payload || typeof payload !== 'object') {
      throw new Error('El archivo proporcionado no contiene un JSON válido.');
    }

    // Case 1: Full Master Database Backup Export
    if (
      payload.users ||
      payload.sheets ||
      payload.worlds ||
      payload.backups ||
      payload.settings ||
      payload.feedback ||
      payload.schemaVersion === 2
    ) {
      isRestoringOrSyncing = true;
      try {
        let restoredUsersCount = 0;
        let restoredSheetsCount = 0;
        let restoredWorldsCount = 0;
        let restoredBackupsCount = 0;
        let restoredFeedbackCount = 0;
        let restoredSettings = false;

        const isManual = !options?.fromCloudSync || Boolean(options?.isManualImport);
        const shouldReplaceCleanly = isManual || Boolean(options?.replaceAll) || this.getSyncMetadata().isBaseState;

        // 1. Restore Users (including passwords, roles, statuses, requests)
        if (Array.isArray(payload.users)) {
          const baseUsers: UserAccount[] = shouldReplaceCleanly ? [...DEFAULT_USERS] : this.getUsers();
          for (const u of payload.users) {
            if (u && (u.id || u.email)) {
              const idx = baseUsers.findIndex(
                (item) =>
                  (u.id && item.id === u.id) ||
                  (u.email && item.email.toLowerCase() === u.email.toLowerCase())
              );
              if (idx >= 0) {
                baseUsers[idx] = { ...baseUsers[idx], ...u };
              } else {
                baseUsers.push(u);
              }
              restoredUsersCount++;
            }
          }
          writeJSON('users.json', baseUsers);
        }

        // 2. Restore Player Sheets
        if (Array.isArray(payload.sheets)) {
          if (shouldReplaceCleanly) {
            const validSheets = payload.sheets.filter((s: any) => s && s.id && s.character);
            restoredSheetsCount = validSheets.length;
            writeJSON('sheets.json', validSheets);
          } else {
            const currentSheets = this.getPlayerSheets();
            for (const s of payload.sheets) {
              if (s && s.id && s.character) {
                const idx = currentSheets.findIndex((item) => item.id === s.id);
                if (idx >= 0) currentSheets[idx] = s;
                else currentSheets.push(s);
                restoredSheetsCount++;
              }
            }
            writeJSON('sheets.json', currentSheets);
          }
        }

        // 3. Restore DM World Sheets
        if (Array.isArray(payload.worlds)) {
          if (shouldReplaceCleanly) {
            const validWorlds = payload.worlds.filter((w: any) => w && w.id && w.workspace);
            restoredWorldsCount = validWorlds.length;
            writeJSON('worlds.json', validWorlds);
          } else {
            const currentWorlds = this.getWorldSheets();
            for (const w of payload.worlds) {
              if (w && w.id && w.workspace) {
                const idx = currentWorlds.findIndex((item) => item.id === w.id);
                if (idx >= 0) currentWorlds[idx] = w;
                else currentWorlds.push(w);
                restoredWorldsCount++;
              }
            }
            writeJSON('worlds.json', currentWorlds);
          }
        }

        // 4. Restore Rotating Backups
        if (payload.backups && typeof payload.backups === 'object') {
          const currentBackups = shouldReplaceCleanly ? {} : this.getBackups();
          Object.assign(currentBackups, payload.backups);
          restoredBackupsCount = Object.keys(payload.backups).length;
          writeJSON('backups.json', currentBackups);
        }

        // 5. Restore Feedback & Suggestions
        if (Array.isArray(payload.feedback)) {
          if (shouldReplaceCleanly) {
            const validFb = payload.feedback.filter((fb: any) => fb && fb.id);
            restoredFeedbackCount = validFb.length;
            writeJSON('feedback.json', validFb);
          } else {
            const currentFeedback = this.getFeedback();
            for (const fb of payload.feedback) {
              if (fb && fb.id) {
                const idx = currentFeedback.findIndex((item) => item.id === fb.id);
                if (idx >= 0) currentFeedback[idx] = fb;
                else currentFeedback.push(fb);
                restoredFeedbackCount++;
              }
            }
            writeJSON('feedback.json', currentFeedback);
          }
        }

        // 6. Restore Settings (preserve existing cloud tokens if incoming backup had empty tokens)
        if (payload.settings && typeof payload.settings === 'object') {
          const currentSettings = this.getHostSettings();
          const incomingAutoBackup = payload.settings.autoBackup || {};
          const currentAutoBackup = currentSettings.autoBackup || {};
          const mergedSettings: HostSettings = {
            ...currentSettings,
            ...payload.settings,
            autoBackup: {
              ...currentAutoBackup,
              ...incomingAutoBackup,
              githubToken: incomingAutoBackup.githubToken || currentAutoBackup.githubToken || '',
              githubRepo: incomingAutoBackup.githubRepo || currentAutoBackup.githubRepo || '',
              driveAccessToken:
                incomingAutoBackup.driveAccessToken || currentAutoBackup.driveAccessToken || '',
              driveFolderId: incomingAutoBackup.driveFolderId || currentAutoBackup.driveFolderId || '',
              webhookUrl: incomingAutoBackup.webhookUrl || currentAutoBackup.webhookUrl || '',
            },
          };
          this.saveHostSettings(mergedSettings, { silentSync: true });
          restoredSettings = true;
        }

        // 7. Restore Game Rooms
        if (payload.rooms && typeof payload.rooms === 'object' && !Array.isArray(payload.rooms)) {
          const currentRooms = shouldReplaceCleanly ? {} : this.getRooms();
          Object.assign(currentRooms, payload.rooms);
          writeJSON('rooms.json', currentRooms);
        }

        // 8. Restore Forum Posts & Comments
        if (Array.isArray(payload.forumPosts)) {
          writeJSON('forum_posts.json', payload.forumPosts);
        } else if (shouldReplaceCleanly) {
          writeJSON('forum_posts.json', []);
        }

        if (Array.isArray(payload.forumComments)) {
          writeJSON('forum_comments.json', payload.forumComments);
        } else if (shouldReplaceCleanly) {
          writeJSON('forum_comments.json', []);
        }

        // 9. Restore Friend Direct Messages
        if (Array.isArray(payload.friendMessages)) {
          writeJSON('friend_messages.json', payload.friendMessages);
        } else if (shouldReplaceCleanly) {
          writeJSON('friend_messages.json', []);
        }

        // 10. Restore DM / Dungeon Master Private Messages
        if (Array.isArray(payload.dmMessages)) {
          writeJSON('dm_messages.json', payload.dmMessages);
        } else if (shouldReplaceCleanly) {
          writeJSON('dm_messages.json', []);
        }

        const curMeta = this.getSyncMetadata();
        const persistentBackup = this.loadFromPersistentVault();

        let incomingTs: number;
        let incomingRev: number;

        if (isManual) {
          // USER MANUAL IMPORT / RESTORATION:
          // Must ALWAYS be established as the newest, most current version across the entire system.
          // Even if the imported JSON was created in the past or has an older revision,
          // the act of importing it establishes it as the active latest state.
          // We guarantee incomingTs is strictly greater than current time, existing metadata timestamp,
          // persistent vault timestamp, payload's original timestamp, and any remote cloud timestamp.
          const maxPriorTs = Math.max(
            Date.now(),
            curMeta.lastModifiedAt || 0,
            persistentBackup?.backupTimestamp || 0,
            options?.remoteTimestamp || 0,
            payload.backupTimestamp || 0,
            payload.exportedAt ? new Date(payload.exportedAt).getTime() : 0
          );
          incomingTs = maxPriorTs + 2000;

          const maxPriorRev = Math.max(
            1,
            curMeta.revision || 0,
            persistentBackup?.revision || 0,
            payload.revision || 0,
            options?.remoteRevision || 0
          );
          incomingRev = maxPriorRev + 1;
        } else {
          // Cloud sync from a known remote source that was verified to be newer
          incomingTs =
            options?.remoteTimestamp ||
            payload.backupTimestamp ||
            (payload.exportedAt ? new Date(payload.exportedAt).getTime() : Date.now());
          incomingRev =
            options?.remoteRevision ??
            payload.revision ??
            Math.max(1, (curMeta.revision || 0) + 1);
        }

        const updatedMeta = this.saveSyncMetadata({
          isBaseState: false,
          revision: incomingRev,
          lastModifiedAt: incomingTs,
          lastMutationReason: isManual
            ? 'Importación manual de Respaldo Total (sobrescrito y establecido como la versión más actual)'
            : 'Sincronizado desde la versión más actual en la nube',
          contentHash: this.computeContentHash(),
          lastCloudSyncAt: incomingTs,
          lastComparisonAt: incomingTs,
          lastComparisonStatus: isManual
            ? `Respaldo Total importado manualmente y fijado como la versión más reciente activa (Rev #${incomingRev}).`
            : `Sincronizado con versión en la nube (Rev #${incomingRev}).`,
        });

        this.saveToPersistentVault();

        return {
          success: true,
          type: 'full_database',
          count: restoredUsersCount + restoredSheetsCount + restoredWorldsCount,
          details: {
            users: restoredUsersCount,
            sheets: restoredSheetsCount,
            worlds: restoredWorldsCount,
            backups: restoredBackupsCount,
            feedback: restoredFeedbackCount,
            settings: restoredSettings,
          },
          revision: incomingRev,
          timestamp: incomingTs,
          syncMetadata: updatedMeta,
          latestBackup: this.getFullBackup(),
          message: `¡Respaldo Maestro Restaurado con Éxito! Se sobrescribió el estado y se estableció como la versión más actual (Rev #${incomingRev}). Se actualizaron ${restoredUsersCount} cuentas de usuario (con contraseñas y roles), ${restoredSheetsCount} fichas de jugador, ${restoredWorldsCount} World Sheets, ${restoredBackupsCount} respaldos rotativos, ${restoredFeedbackCount} reportes de feedback y la configuración total del servidor.`,
        };
      } finally {
        isRestoringOrSyncing = false;
        // If manual restore, trigger cloud backup push so cloud also gets the manually restored state
        if (!options?.fromCloudSync && mutationListener) {
          mutationListener('Restauración manual de Respaldo Maestro');
        }
      }
    }

    // Case 2: Single Player Sheet
    if (payload.character && payload.character.id && payload.character.name) {
      this.savePlayerSheet({
        id: payload.id || payload.character.id,
        ownerEmail: payload.ownerEmail || 'jugador@weroll.app',
        name: payload.name || payload.character.name,
        character: payload.character,
        updatedAt: Date.now(),
      });
      return {
        success: true,
        type: 'player_sheet',
        count: 1,
        message: `Ficha de personaje "${payload.character.name}" restaurada con éxito en la bóveda.`,
      };
    }

    // Case 3: Raw Character5e object
    if (payload.name && payload.characterClass && (payload.currentHp !== undefined || payload.abilities)) {
      const charId = payload.id || `char-${Date.now()}`;
      this.savePlayerSheet({
        id: charId,
        ownerEmail: payload.ownerEmail || 'jugador@weroll.app',
        name: payload.name,
        character: { ...payload, id: charId },
        updatedAt: Date.now(),
      });
      return {
        success: true,
        type: 'player_sheet',
        count: 1,
        message: `Ficha de personaje "${payload.name}" importada exitosamente a la bóveda.`,
      };
    }

    // Case 4: Single World Sheet
    if (payload.workspace && (payload.name || payload.roomCode)) {
      const worldId = payload.id || `world-${Date.now()}`;
      this.saveWorldSheet({
        id: worldId,
        ownerEmail: payload.ownerEmail || 'dm@weroll.app',
        name: payload.name || 'Campaña Restaurada',
        description: payload.description,
        roomCode: (payload.roomCode || 'MESA-RESTAURADA').toUpperCase(),
        roomPassword: payload.roomPassword,
        workspace: payload.workspace,
        updatedAt: Date.now(),
      });
      return {
        success: true,
        type: 'world_sheet',
        count: 1,
        message: `World Sheet "${payload.name || 'Campaña Restaurada'}" restaurado con éxito en la bóveda.`,
      };
    }

    throw new Error(
      'El formato JSON no corresponde a un respaldo válido de WeRoll (Respaldo Total, Ficha de Jugador o World Sheet).'
    );
  },
};
