import type { Character5e, DMWorkspace, HostSettings, UserRole, PlayerType, AppRole } from '../types/dnd.ts';
import { SAMPLE_CHARACTER, SAMPLE_DM_WORKSPACE } from '../data/srd.ts';

const STORAGE_KEYS = {
  CHARACTERS: 'dnd_5e_characters_v2',
  ACTIVE_CHAR_ID: 'dnd_5e_active_character_id_v2',
  DM_WORKSPACE: 'dnd_5e_dm_workspace_v2',
  ROOM_CODE: 'dnd_5e_room_code_v2',
  HOST_SETTINGS: 'dnd_5e_host_settings_v2',
  UNLOCKED_CHARS: 'dnd_5e_unlocked_chars_session',
  DM_UNLOCKED: 'dnd_5e_dm_unlocked_session',
  USER_ROLE: 'dnd_5e_user_role_v1',
  AUTH_USER: 'dnd_5e_auth_user_v2',
  ACTIVE_WORLD_ID: 'dnd_5e_active_world_id_v2',
};

export const DEFAULT_HOST_SETTINGS: HostSettings = {
  apiKeyOverride: '',
  aiModel: 'gemini-2.5-flash',
  dmPassword: '',
  moderatorPassword: 'admin',
  headerTitle: 'WeRoll',
  headerSubtitle: 'Companion & DM Suite v0.9.5 Alfa',
  headerLogoIcon: 'shield',
  developerNotice: {
    enabled: true,
    title: 'WeRoll • Novedades v0.9.5 Alfa',
    content: '¡Versión 0.9.5 Alfa disponible! Ajuste de paneles por Rol (Panel Admin General, Panel Moderador y Feedback para Clientes), permiso de foro reversible (permitir/negar) y rediseño compacto responsive de cuadros de Personajes, World Sheets y Amigos.',
    version: '0.9.5 Alfa',
  },
  oracleWelcomeMessage: 'Saludos, viajero. Soy el Sabio Arcano, tu árbitro y custodio de las reglas de 5E. ¿Qué duda deseas resolver hoy?',
  changelog: [
    {
      version: '0.9.5 Alfa',
      date: '2026-10-19',
      title: 'WeRoll 0.9.5 Alfa • Paneles Dinámicos por Rol, Control Reversible de Publicación en Foro y Rediseño Compacto Responsive',
      changes: [
        'Unificación de Sección de Amigos: Consolidación de Amigos, Agregar Amigo y Usuario@ID en un solo panel unificado con botones directos para Copiar ID, Agregar y Actualizar.',
        'Paneles según Rol en la Barra Superior: Para administradores se despliega el Panel de Administración General (usuarios, bodega de backups, ajustes del servidor); para moderadores el Panel de Moderación Comunitaria; y para clientes el botón de Feedback.',
        'Moderación de Foro Reversible y Restricción Admin: Exclusividad de publicación en "Actualizaciones de la App" para administradores y control de permisos de foro entre "Permitido" y "Negado".',
        'Rediseño Compacto y Ajuste Responsive de Cuadros: Optimización visual de los contenedores de Personajes, World Sheets, Amigos y Búsqueda para encajar limpiamente sin desbordes en móviles y PC.',
      ],
    },
    {
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
    },
    {
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
    },
    {
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
    },
    {
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
    },
    {
      version: '0.5 Alfa',
      date: '2026-08-22',
      title: 'WeRoll 0.5 Alfa • Bóveda de Respaldo del DM, Inyección Maestro & Seguridad',
      changes: [
        'Bóveda de Respaldo para DMs: Resguardo de campañas, personajes y fichas con sincronización global.',
        'Paneles de Seguridad y Reseteo: Gestión de contraseñas de DM, moderadores y usuarios.',
      ],
    },
    {
      version: '0.1 Alfa',
      date: '2026-08-10',
      title: 'WeRoll 0.1 Alfa • Lanzamiento Inicial Companion & DM Suite',
      changes: [
        'Lanzamiento oficial de la versión alfa inicial de WeRoll 5E.',
        'Autenticación por roles independientes: Jugador, Dungeon Master y Moderador.',
        'Carpetas jerárquicas de hasta 3 niveles con filtrado acumulativo.',
        'Apartado de Objetos y Conjuros únicos para el DM con compendio genérico SRD.',
        'Bloc de notas de combate en tiempo real, tiradas automáticas y dados 3D.',
        'Manual de usuario 5E completo con armas, armaduras, conjuros y reglas ampliadas.',
      ],
    },
  ],
  roleSwitchingAllowed: 'strict',
};

export function folderMatchesFilter(entityFolder: string | undefined, selectedFolder: string): boolean {
  if (selectedFolder === 'all') return true;
  const folder = entityFolder?.trim() || 'General';
  if (folder === selectedFolder) return true;
  if (folder.startsWith(`${selectedFolder} / `)) return true;
  return false;
}

export function getFolderDepth(folder: string): number {
  if (!folder) return 1;
  return folder.split(' / ').length;
}

export interface AuthSessionUser {
  id: string;
  email: string;
  displayName: string;
  userTagId?: string;
  fullTag?: string;
  friends?: string[];
  role: UserRole;
  playerType?: PlayerType;
  appRole?: AppRole;
  canPostInForum?: boolean;
  forumPermissionsRequested?: boolean;
  status: 'pending' | 'approved' | 'rejected';
}

export function loadAuthUser(): AuthSessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAuthUser(user: AuthSessionUser | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    }
  } catch {}
}

export function loadActiveWorldId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_WORLD_ID);
  } catch {
    return null;
  }
}

export function saveActiveWorldId(id: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_WORLD_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_WORLD_ID);
    }
  } catch {}
}

export function loadUserRole(): UserRole | null {
  if (typeof window === 'undefined') return null;
  try {
    const role = localStorage.getItem(STORAGE_KEYS.USER_ROLE) as UserRole | null;
    if (role === 'player' || role === 'dm' || role === 'both' || role === 'moderator' || role === 'admin') {
      return role;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveUserRole(role: UserRole | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (role) {
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
    }
  } catch (e) {
    console.error('Error saving user role:', e);
  }
}

export function loadCharacters(): Character5e[] {
  if (typeof window === 'undefined') return [SAMPLE_CHARACTER];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CHARACTERS);
    if (!data) {
      saveCharacters([SAMPLE_CHARACTER]);
      return [SAMPLE_CHARACTER];
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [SAMPLE_CHARACTER];
  } catch (e) {
    console.error('Error loading characters from localStorage:', e);
    return [SAMPLE_CHARACTER];
  }
}

export function saveCharacters(characters: Character5e[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.CHARACTERS, JSON.stringify(characters));
  } catch (e) {
    console.error('Error saving characters to localStorage:', e);
  }
}

export function loadActiveCharacterId(): string {
  if (typeof window === 'undefined') return SAMPLE_CHARACTER.id;
  try {
    const id = localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAR_ID);
    return id || SAMPLE_CHARACTER.id;
  } catch {
    return SAMPLE_CHARACTER.id;
  }
}

export function saveActiveCharacterId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAR_ID, id);
  } catch (e) {
    console.error('Error saving active character ID:', e);
  }
}

export function loadDMWorkspace(): DMWorkspace {
  if (typeof window === 'undefined') return SAMPLE_DM_WORKSPACE;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DM_WORKSPACE);
    if (!data) {
      saveDMWorkspace(SAMPLE_DM_WORKSPACE);
      return SAMPLE_DM_WORKSPACE;
    }
    const parsed = JSON.parse(data);
    if (!parsed || typeof parsed !== 'object') return SAMPLE_DM_WORKSPACE;
    return {
      ...SAMPLE_DM_WORKSPACE,
      ...parsed,
      npcs: Array.isArray(parsed.npcs) ? parsed.npcs : SAMPLE_DM_WORKSPACE.npcs,
      monsters: Array.isArray(parsed.monsters) ? parsed.monsters : SAMPLE_DM_WORKSPACE.monsters,
      locations: Array.isArray(parsed.locations) ? parsed.locations : SAMPLE_DM_WORKSPACE.locations,
      campaignLogs: Array.isArray(parsed.campaignLogs) ? parsed.campaignLogs : SAMPLE_DM_WORKSPACE.campaignLogs,
      combatSummaries: Array.isArray(parsed.combatSummaries) ? parsed.combatSummaries : (SAMPLE_DM_WORKSPACE.combatSummaries || []),
      customItemsAndSpells: Array.isArray(parsed.customItemsAndSpells) ? parsed.customItemsAndSpells : (SAMPLE_DM_WORKSPACE.customItemsAndSpells || []),
      dmLiveMessage: parsed.dmLiveMessage !== undefined ? parsed.dmLiveMessage : SAMPLE_DM_WORKSPACE.dmLiveMessage,
      folders: Array.isArray(parsed.folders) ? parsed.folders : SAMPLE_DM_WORKSPACE.folders,
      activeEncounter: {
        ...SAMPLE_DM_WORKSPACE.activeEncounter,
        ...(parsed.activeEncounter || {}),
        combatants: Array.isArray(parsed.activeEncounter?.combatants)
          ? parsed.activeEncounter.combatants
          : SAMPLE_DM_WORKSPACE.activeEncounter.combatants,
        combatLog: Array.isArray(parsed.activeEncounter?.combatLog)
          ? parsed.activeEncounter.combatLog
          : [],
      },
    };
  } catch (e) {
    console.error('Error loading DM workspace:', e);
    return SAMPLE_DM_WORKSPACE;
  }
}

export function saveDMWorkspace(workspace: DMWorkspace): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.DM_WORKSPACE, JSON.stringify(workspace));
  } catch (e) {
    console.error('Error saving DM workspace:', e);
  }
}

export function loadHostSettings(): HostSettings {
  if (typeof window === 'undefined') return DEFAULT_HOST_SETTINGS;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HOST_SETTINGS);
    if (!data) return DEFAULT_HOST_SETTINGS;
    const parsed = JSON.parse(data);
    const merged: HostSettings = { ...DEFAULT_HOST_SETTINGS, ...parsed };
    const v09 = DEFAULT_HOST_SETTINGS.changelog?.[0];
    if (v09 && Array.isArray(merged.changelog)) {
      const idx = merged.changelog.findIndex((c) => c.version && c.version.toLowerCase().includes('0.9'));
      if (idx === -1) {
        merged.changelog = [v09, ...merged.changelog];
      } else {
        merged.changelog[idx] = v09;
      }
    }
    if (
      !merged.headerSubtitle ||
      merged.headerSubtitle.includes('0.8') ||
      merged.headerSubtitle.includes('0.65') ||
      merged.headerSubtitle.includes('0.6 ') ||
      merged.headerSubtitle.includes('0.5')
    ) {
      merged.headerSubtitle = DEFAULT_HOST_SETTINGS.headerSubtitle;
    }
    return merged;
  } catch {
    return DEFAULT_HOST_SETTINGS;
  }
}

export function saveHostSettings(settings: HostSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.HOST_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving host settings:', e);
  }
}

export function loadRoomCode(): string {
  if (typeof window === 'undefined') return 'MESA-DRAGON';
  try {
    return localStorage.getItem(STORAGE_KEYS.ROOM_CODE) || 'MESA-DRAGON';
  } catch {
    return 'MESA-DRAGON';
  }
}

export function saveRoomCode(code: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.ROOM_CODE, code.toUpperCase().trim());
  } catch (e) {
    console.error('Error saving room code:', e);
  }
}

// Session Unlocks
export function isCharacterUnlocked(charId: string, charPassword?: string): boolean {
  if (!charPassword || !charPassword.trim()) return true;
  if (typeof window === 'undefined') return true;
  try {
    const unlocked = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.UNLOCKED_CHARS) || '[]');
    return unlocked.includes(charId);
  } catch {
    return false;
  }
}

export function setCharacterUnlocked(charId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const unlocked = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.UNLOCKED_CHARS) || '[]');
    if (!unlocked.includes(charId)) {
      unlocked.push(charId);
      sessionStorage.setItem(STORAGE_KEYS.UNLOCKED_CHARS, JSON.stringify(unlocked));
    }
  } catch {}
}

export function isDMUnlocked(workspacePassword?: string): boolean {
  if (!workspacePassword || !workspacePassword.trim()) return true;
  if (typeof window === 'undefined') return true;
  try {
    return sessionStorage.getItem(STORAGE_KEYS.DM_UNLOCKED) === 'true';
  } catch {
    return false;
  }
}

export function setDMUnlocked(unlocked: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEYS.DM_UNLOCKED, unlocked ? 'true' : 'false');
  } catch {}
}

export function exportBackupData(): string {
  const characters = loadCharacters();
  const dm = loadDMWorkspace();
  const room = loadRoomCode();
  const host = loadHostSettings();
  const payload = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    characters,
    dmWorkspace: dm,
    roomCode: room,
    hostSettings: { ...host, apiKeyOverride: undefined }, // Don't export secret API keys
  };
  return JSON.stringify(payload, null, 2);
}

export function importBackupData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.characters && Array.isArray(data.characters)) {
      saveCharacters(data.characters);
      if (data.characters[0]?.id) {
        saveActiveCharacterId(data.characters[0].id);
      }
    }
    if (data.dmWorkspace) {
      saveDMWorkspace(data.dmWorkspace);
    }
    if (data.roomCode) {
      saveRoomCode(data.roomCode);
    }
    return true;
  } catch (e) {
    console.error('Failed to import backup data:', e);
    return false;
  }
}
