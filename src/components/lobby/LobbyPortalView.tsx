import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  User,
  Users,
  Crown,
  KeyRound,
  Lock,
  Unlock,
  Plus,
  Play,
  Edit,
  Trash2,
  Settings,
  Download,
  Upload,
  RefreshCw,
  LogOut,
  AlertCircle,
  Clock,
  Sparkles,
  BookOpen,
  Folder,
  CheckCircle,
  HelpCircle,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Database,
  FileDown,
  FileText,
  Calendar,
  Tag,
  FileUp,
  RotateCcw,
  Save,
  Bell,
  Eye,
  EyeOff,
  MessageSquarePlus,
  Bug,
  Lightbulb,
  Mail,
  Send,
  GitBranch,
  HardDrive,
  Webhook,
  UserPlus,
  UserMinus,
  Copy,
  Wrench,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import {
  Character5e,
  DMWorkspace,
  HostSettings,
  UserRole,
  WorldSheetSummary,
  ChangelogEntry,
  AutoBackupLog,
  PlayerType,
  AppRole,
} from '../../types/dnd';
import { AuthSessionUser } from '../auth/RoleSelectionModal';
import { SAMPLE_CHARACTER, SAMPLE_DM_WORKSPACE } from '../../data/srd';
import { BrandLogo, PREFAB_LOGOS } from '../common/BrandLogo';
import { EntityAvatar } from '../common/EntityAvatar';
import { ForumView } from '../forum/ForumView';
import { FriendDirectChatModal } from '../friends/FriendDirectChatModal';
import { ModeratorPanelModal } from '../admin/ModeratorPanelModal';
import { UserSecurityModal } from '../auth/UserSecurityModal';

interface LobbyPortalViewProps {
  authUser: AuthSessionUser | null;
  hostSettings: HostSettings;
  onLogout: () => void;
  onOpenAuthModal: () => void;
  onOpenChangelog: () => void;
  onSelectCharacterToPlay: (character: Character5e, roomCode: string) => void;
  onEditCharacterSolo: (character: Character5e) => void;
  onDeleteCharacter: (characterId: string) => Promise<boolean>;
  onCreateNewCharacter: () => void;
  onImportCharacter?: (character: Character5e) => void;
  worldSheets: WorldSheetSummary[];
  onOpenWorldSheet: (world: WorldSheetSummary) => void;
  onCreateWorldSheet: (config: { name: string; roomCode: string; roomPassword?: string }) => Promise<void>;
  onImportWorldSheet?: (world: WorldSheetSummary) => void;
  onUpdateWorldSheetConfig: (worldId: string, updates: { name: string; roomCode: string; roomPassword?: string }) => Promise<void>;
  onDeleteWorldSheet: (worldId: string) => Promise<void>;
  onSaveHostSettings: (settings: HostSettings) => Promise<void>;
  onRefreshAuthStatus: () => Promise<void>;
  charactersCount?: number;
  onOpenCompendium?: () => void;
  onOpenOracle?: (prompt?: string) => void;
  onOpenFeedback?: () => void;
  onOpenSecurityModal?: () => void;
  onOpenAdminPanel?: () => void;
  onOpenModeratorPanel?: () => void;
  isAdminModalOpen?: boolean;
  onCloseAdminModal?: () => void;
}

export const LobbyPortalView: React.FC<LobbyPortalViewProps> = ({
  authUser,
  hostSettings,
  onLogout,
  onOpenAuthModal,
  onOpenChangelog,
  onSelectCharacterToPlay,
  onEditCharacterSolo,
  onDeleteCharacter,
  onCreateNewCharacter,
  onImportCharacter,
  worldSheets,
  onOpenWorldSheet,
  onCreateWorldSheet,
  onImportWorldSheet,
  onUpdateWorldSheetConfig,
  onDeleteWorldSheet,
  onSaveHostSettings,
  onRefreshAuthStatus,
  charactersCount = 0,
  onOpenCompendium,
  onOpenOracle,
  onOpenFeedback,
  onOpenSecurityModal,
  onOpenAdminPanel,
  onOpenModeratorPanel,
  isAdminModalOpen = false,
  onCloseAdminModal,
}) => {
  // Roles architecture: Player Type vs Application Role
  const userAppRole: AppRole =
    authUser?.appRole ||
    (authUser?.role === 'admin' ? 'admin' : authUser?.role === 'moderator' ? 'moderator' : 'client');
  const userPlayerType: PlayerType =
    authUser?.playerType ||
    (authUser?.role === 'dm' ? 'dm' : authUser?.role === 'player' ? 'player' : 'both');

  const isAdmin = userAppRole === 'admin' || authUser?.role === 'admin';
  const isModeratorRole = (userAppRole === 'moderator' || authUser?.role === 'moderator') && !isAdmin;
  const isModerator = isAdmin || isModeratorRole;

  const canPlay = !authUser || userPlayerType === 'player' || userPlayerType === 'both' || isModerator;
  const canDm = userPlayerType === 'dm' || userPlayerType === 'both' || isModerator;

  // Left column navigation tab: 'characters' | 'worlds' | 'friends'
  const [leftTab, setLeftTab] = useState<'characters' | 'worlds' | 'friends'>(
    canPlay ? 'characters' : canDm ? 'worlds' : 'characters'
  );

  // Dedicated Overlay Modals (so Admin panel & Security are clean, separate experiences)
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(false);
  const [isModeratorPanelOpen, setIsModeratorPanelOpen] = useState<boolean>(false);
  const [chatFriend, setChatFriend] = useState<any | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // Legacy activeTab state for backwards compatibility if referenced
  const [activeTab, setActiveTab] = useState<'characters' | 'worlds' | 'friends' | 'admin' | 'security'>('characters');

  // Sync tab if role changes
  useEffect(() => {
    if (activeTab === 'admin' && !isModerator) {
      setActiveTab(canPlay ? 'characters' : canDm ? 'worlds' : 'characters');
    } else if (activeTab === 'characters' && !canPlay && canDm) {
      setActiveTab('worlds');
    } else if (activeTab === 'worlds' && !canDm && canPlay) {
      setActiveTab('characters');
    }
  }, [authUser?.role, isModerator, canPlay, canDm, activeTab]);

  // Player Join Table Modal state
  const [joinModalChar, setJoinModalChar] = useState<Character5e | null>(null);
  const [joinRoomCode, setJoinRoomCode] = useState<string>('MESA-DRAGON');
  const [joinPassword, setJoinPassword] = useState<string>('');
  const [joinError, setJoinError] = useState<string>('');
  const [isVerifyingJoin, setIsVerifyingJoin] = useState<boolean>(false);

  // Create World Sheet Modal state
  const [isCreateWorldOpen, setIsCreateWorldOpen] = useState<boolean>(false);
  const [newWorldName, setNewWorldName] = useState<string>('');
  const [newWorldRoomCode, setNewWorldRoomCode] = useState<string>('MESA-1');
  const [newWorldPassword, setNewWorldPassword] = useState<string>('');
  const [worldCreateError, setWorldCreateError] = useState<string>('');
  const [isSavingWorld, setIsSavingWorld] = useState<boolean>(false);

  // Edit World Sheet Modal state
  const [editingWorld, setEditingWorld] = useState<WorldSheetSummary | null>(null);
  const [editWorldName, setEditWorldName] = useState<string>('');
  const [editWorldRoomCode, setEditWorldRoomCode] = useState<string>('');
  const [editWorldPassword, setEditWorldPassword] = useState<string>('');

  // Delete confirmations
  const [charToDelete, setCharToDelete] = useState<Character5e | null>(null);
  const [worldToDelete, setWorldToDelete] = useState<WorldSheetSummary | null>(null);

  // Admin state
  const [adminSubTab, setAdminSubTab] = useState<'users' | 'vault' | 'autobackup' | 'updates' | 'settings'>('users');
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [adminSettingsForm, setAdminSettingsForm] = useState<HostSettings>(hostSettings);
  const [adminSaveMessage, setAdminSaveMessage] = useState<string>('');

  // Auto Backup Test & Cloud Comparison State
  const [autoBackupTestLoading, setAutoBackupTestLoading] = useState<boolean>(false);
  const [autoBackupTestMsg, setAutoBackupTestMsg] = useState<string>('');
  const [autoBackupTestError, setAutoBackupTestError] = useState<string>('');
  const [cloudCompareLoading, setCloudCompareLoading] = useState<boolean>(false);
  const [syncMetadata, setSyncMetadata] = useState<any>(null);
  const [replacedArchive, setReplacedArchive] = useState<any[]>([]);

  const handleRunAutoBackupTestInLobby = async () => {
    setAutoBackupTestLoading(true);
    setAutoBackupTestMsg('');
    setAutoBackupTestError('');
    try {
      const cfg = adminSettingsForm.autoBackup || {
        enabled: true,
        backupOnEveryChange: true,
        continuousComparison: true,
        frequencyHours: 12,
        destination: 'drive',
      };
      const res = await fetch('/api/admin/vault/trigger-autobackup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: cfg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al ejecutar respaldo.');
      setAutoBackupTestMsg(data.message || '¡Respaldo enviado exitosamente a la nube!');
      if (data.syncMetadata) setSyncMetadata(data.syncMetadata);
      if (Array.isArray(data.replacedArchive)) setReplacedArchive(data.replacedArchive);
      fetchVaultDetails();
    } catch (err: any) {
      setAutoBackupTestError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setAutoBackupTestLoading(false);
    }
  };

  const handleRunManualCloudComparison = async () => {
    setCloudCompareLoading(true);
    setAutoBackupTestMsg('');
    setAutoBackupTestError('');
    try {
      const cfg = adminSettingsForm.autoBackup;
      const res = await fetch('/api/admin/vault/compare-and-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: cfg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al comparar con la nube.');
      setAutoBackupTestMsg(data.message || 'Comparación y sincronización completada.');
      if (data.syncMetadata) setSyncMetadata(data.syncMetadata);
      if (Array.isArray(data.replacedArchive)) setReplacedArchive(data.replacedArchive);
      fetchVaultDetails();
      fetchAdminUsers();
      fetchUserSheets();
    } catch (err: any) {
      setAutoBackupTestError(err.message || 'Error al comparar archivos con la nube.');
    } finally {
      setCloudCompareLoading(false);
    }
  };

  const handleRestoreReplacedArchive = async (archiveId: string) => {
    setAutoBackupTestMsg('');
    setAutoBackupTestError('');
    setCloudCompareLoading(true);
    try {
      const res = await fetch(`/api/admin/vault/replaced-archive/${encodeURIComponent(archiveId)}/restore`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al restaurar copia pre-reemplazo.');
      setAutoBackupTestMsg(data.message || '¡Versión histórica restaurada con éxito!');
      if (data.latestBackup) {
        try {
          localStorage.setItem('weroll_cloud_mirror_snapshot_v2', JSON.stringify(data.latestBackup));
        } catch {}
        if (data.latestBackup.settings) {
          setAdminSettingsForm(data.latestBackup.settings);
          onSaveHostSettings(data.latestBackup.settings).catch(() => {});
        }
      }
      fetchVaultDetails();
      fetchAdminUsers();
      fetchUserSheets();
      fetchAdminChangelog();
    } catch (err: any) {
      setAutoBackupTestError(err.message || 'Error al restaurar copia pre-reemplazo.');
    } finally {
      setCloudCompareLoading(false);
    }
  };

  const handleUnlinkGithubInAdmin = async () => {
    setAutoBackupTestMsg('');
    setAutoBackupTestError('');
    try {
      const res = await fetch('/api/admin/vault/unlink-github', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al desvincular GitHub');
      setAdminSettingsForm((prev) => ({
        ...prev,
        autoBackup: {
          enabled: prev.autoBackup?.enabled ?? false,
          frequencyHours: prev.autoBackup?.frequencyHours || 24,
          ...(prev.autoBackup || {}),
          destination: 'drive',
          githubToken: '',
          githubRepo: '',
          githubPath: '',
          githubArchivePath: '',
        },
      }));
      try {
        localStorage.removeItem('weroll_cloud_mirror_config_v2');
        const curHost = JSON.parse(localStorage.getItem('weroll_host_settings_v1') || '{}');
        if (curHost.autoBackup) {
          curHost.autoBackup.githubToken = '';
          curHost.autoBackup.githubRepo = '';
          curHost.autoBackup.destination = 'drive';
          localStorage.setItem('weroll_host_settings_v1', JSON.stringify(curHost));
        }
      } catch {}
      setAutoBackupTestMsg(data.message || 'Cuenta y repositorio de GitHub desvinculados exitosamente.');
      fetchVaultDetails();
    } catch (err: any) {
      setAutoBackupTestError(err.message || 'Error al desvincular GitHub.');
    }
  };

  // AI Model selector state
  const isPresetModel =
    adminSettingsForm.aiModel === 'gemini-flash-lite-latest' ||
    adminSettingsForm.aiModel === 'gemini-flash-latest';
  const [isCustomAiModel, setIsCustomAiModel] = useState<boolean>(!isPresetModel);
  const [customAiModelText, setCustomAiModelText] = useState<string>(
    isPresetModel ? '' : adminSettingsForm.aiModel || ''
  );

  // Vault state
  const [vaultDetails, setVaultDetails] = useState<{ sheets: any[]; worlds: any[]; backups: any[] }>({
    sheets: [],
    worlds: [],
    backups: [],
  });
  const [isLoadingVault, setIsLoadingVault] = useState<boolean>(false);
  const [vaultFilter, setVaultFilter] = useState<'all' | 'sheets' | 'worlds' | 'backups'>('all');
  const [restoreLoading, setRestoreLoading] = useState<boolean>(false);
  const [restoreMessage, setRestoreMessage] = useState<string>('');
  const [restoreError, setRestoreError] = useState<string>('');
  const restoreFileInputRef = useRef<HTMLInputElement | null>(null);

  // Changelog admin state
  const [changelogList, setChangelogList] = useState<ChangelogEntry[]>(() => hostSettings.changelog || []);
  const [isChangelogEditModalOpen, setIsChangelogEditModalOpen] = useState<boolean>(false);
  const [editingChangelogIdx, setEditingChangelogIdx] = useState<number>(-1);
  const [changelogFormVersion, setChangelogFormVersion] = useState<string>('0.2');
  const [changelogFormTitle, setChangelogFormTitle] = useState<string>('');
  const [changelogFormDate, setChangelogFormDate] = useState<string>('');
  const [changelogFormChanges, setChangelogFormChanges] = useState<string>('');

  // Admin Greeting / Maintenance Notice state
  const [dismissedGreeting, setDismissedGreeting] = useState<boolean>(false);
  const [greetingEnabled, setGreetingEnabled] = useState<boolean>(hostSettings.adminGreeting?.enabled ?? true);
  const [greetingTitle, setGreetingTitle] = useState<string>(
    hostSettings.adminGreeting?.title || 'Comunicado del Administrador'
  );
  const [greetingMessage, setGreetingMessage] = useState<string>(
    hostSettings.adminGreeting?.message ||
      '¡Bienvenido a WeRoll! El sistema ahora cuenta con sincronización global en tiempo real y bóveda segura en la nube.'
  );
  const [greetingType, setGreetingType] = useState<'info' | 'maintenance' | 'alert'>(
    hostSettings.adminGreeting?.type || 'info'
  );
  const [greetingSaveStatus, setGreetingSaveStatus] = useState<string>('');

  // USER SELF-SERVICE PASSWORD & SECURITY TAB STATE
  const [userOldPassword, setUserOldPassword] = useState<string>('');
  const [userNewPassword, setUserNewPassword] = useState<string>('');
  const [userConfirmPassword, setUserConfirmPassword] = useState<string>('');
  const [userPassStatusMsg, setUserPassStatusMsg] = useState<string>('');
  const [userPassErrorMsg, setUserPassErrorMsg] = useState<string>('');
  const [isUpdatingUserPass, setIsUpdatingUserPass] = useState<boolean>(false);

  const [userForgotMsg, setUserForgotMsg] = useState<string>('');
  const [userForgotNote, setUserForgotNote] = useState<string>('');
  const [isRequestingForgotInLobby, setIsRequestingForgotInLobby] = useState<boolean>(false);

  // USER SELF-SERVICE TAG ID & USERNAME COPY STATE (IN SECURITY & FRIENDS TABS)
  const [userNewTagId, setUserNewTagId] = useState<string>(authUser?.userTagId || '123');
  const [userTagStatusMsg, setUserTagStatusMsg] = useState<string>('');
  const [userTagErrorMsg, setUserTagErrorMsg] = useState<string>('');
  const [isUpdatingUserTag, setIsUpdatingUserTag] = useState<boolean>(false);
  const [copiedMyTag, setCopiedMyTag] = useState<boolean>(false);

  // FRIENDS TAB STATE
  const [friendsList, setFriendsList] = useState<
    Array<{
      id: string;
      displayName: string;
      userTagId: string;
      fullTag: string;
      role: string;
      status: string;
    }>
  >([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState<boolean>(false);
  const [friendTagInput, setFriendTagInput] = useState<string>('');
  const [friendStatusMsg, setFriendStatusMsg] = useState<string>('');
  const [friendErrorMsg, setFriendErrorMsg] = useState<string>('');
  const [isAddingFriend, setIsAddingFriend] = useState<boolean>(false);

  // ADMIN: CREATE / EDIT / DELETE USER MODAL STATE
  const [isAdminCreateUserOpen, setIsAdminCreateUserOpen] = useState<boolean>(false);
  const [adminNewUserEmail, setAdminNewUserEmail] = useState<string>('');
  const [adminNewUserName, setAdminNewUserName] = useState<string>('');
  const [adminNewUserTagId, setAdminNewUserTagId] = useState<string>('123');
  const [adminNewUserPassword, setAdminNewUserPassword] = useState<string>('123456');
  const [adminNewUserRole, setAdminNewUserRole] = useState<UserRole>('both');
  const [adminNewUserStatus, setAdminNewUserStatus] = useState<'approved' | 'pending'>('approved');
  const [adminCreateUserMsg, setAdminCreateUserMsg] = useState<string>('');
  const [adminCreateUserError, setAdminCreateUserError] = useState<string>('');
  const [isAdminCreatingUser, setIsAdminCreatingUser] = useState<boolean>(false);

  const [adminEditingUser, setAdminEditingUser] = useState<any | null>(null);
  const [adminEditUserEmail, setAdminEditUserEmail] = useState<string>('');
  const [adminEditUserName, setAdminEditUserName] = useState<string>('');
  const [adminEditUserTagId, setAdminEditUserTagId] = useState<string>('');
  const [adminEditUserMsg, setAdminEditUserMsg] = useState<string>('');
  const [adminEditUserError, setAdminEditUserError] = useState<string>('');
  const [isAdminSavingUserEdit, setIsAdminSavingUserEdit] = useState<boolean>(false);

  // ADMIN: USER PASSWORD MANAGEMENT MODAL STATE
  const [adminManagingUserPassword, setAdminManagingUserPassword] = useState<any | null>(null);
  const [adminUserNewPassword, setAdminUserNewPassword] = useState<string>('');
  const [showRevealedPassword, setShowRevealedPassword] = useState<boolean>(false);
  const [adminUserPassMsg, setAdminUserPassMsg] = useState<string>('');
  const [isAdminSavingUserPassword, setIsAdminSavingUserPassword] = useState<boolean>(false);

  // ADMIN: INJECT SHEET OR WORLD TO USER MODAL STATE
  const [adminInjectingUser, setAdminInjectingUser] = useState<any | null>(null);
  const [injectTargetType, setInjectTargetType] = useState<'player' | 'world'>('player');
  const [injectJsonContent, setInjectJsonContent] = useState<string>('');
  const [injectCustomTitle, setInjectCustomTitle] = useState<string>('');
  const [injectRoomCode, setInjectRoomCode] = useState<string>('');
  const [injectRoomPassword, setInjectRoomPassword] = useState<string>('');
  const [injectStatusMsg, setInjectStatusMsg] = useState<string>('');
  const [injectErrorMsg, setInjectErrorMsg] = useState<string>('');
  const [isInjectingData, setIsInjectingData] = useState<boolean>(false);
  const injectFileInputRef = useRef<HTMLInputElement | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Logo Image File Upload Handler
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP, GIF, SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      setAdminSettingsForm((prev) => ({
        ...prev,
        logoType: 'custom',
        customLogoUrl: dataUrl,
      }));
    };
    reader.readAsDataURL(file);
  };

  // ADMIN: FEEDBACK & SUGGESTIONS STATE
  const [adminUpdatesSection, setAdminUpdatesSection] = useState<'changelog' | 'feedback'>('changelog');
  const [adminFeedbackList, setAdminFeedbackList] = useState<any[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState<boolean>(false);
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState<'all' | 'bug' | 'suggestion' | 'other'>('all');

  // Sync state when hostSettings updates in real-time from server across devices
  useEffect(() => {
    setAdminSettingsForm(hostSettings);
    if (hostSettings.adminGreeting) {
      setGreetingEnabled(hostSettings.adminGreeting.enabled);
      setGreetingTitle(hostSettings.adminGreeting.title || '');
      setGreetingMessage(hostSettings.adminGreeting.message || '');
      setGreetingType(hostSettings.adminGreeting.type || 'info');
    }
    if (hostSettings.changelog) {
      setChangelogList(hostSettings.changelog);
    }
  }, [hostSettings]);

  // Player Characters filtered by account
  const [playerSheets, setPlayerSheets] = useState<Character5e[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState<boolean>(false);

  // Fetch player sheets for this user from server vault
  const fetchUserSheets = async () => {
    if (!authUser?.email) return;
    setIsLoadingSheets(true);
    try {
      const res = await fetch(`/api/vault/sheets?ownerEmail=${encodeURIComponent(authUser.email)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.sheets)) {
          setPlayerSheets(data.sheets.map((s: any) => s.character));
        }
      }
    } catch (err) {
      console.error('Error fetching sheets:', err);
    } finally {
      setIsLoadingSheets(false);
    }
  };

  // LOCAL EXPORT & IMPORT FOR PLAYER SHEETS AND WORLD SHEETS
  const importCharFileInputRef = useRef<HTMLInputElement | null>(null);
  const importWorldFileInputRef = useRef<HTMLInputElement | null>(null);
  const [charImportExportMsg, setCharImportExportMsg] = useState<string>('');
  const [charImportExportError, setCharImportExportError] = useState<string>('');
  const [isImportingChar, setIsImportingChar] = useState<boolean>(false);
  const [worldImportExportMsg, setWorldImportExportMsg] = useState<string>('');
  const [worldImportExportError, setWorldImportExportError] = useState<string>('');
  const [isImportingWorld, setIsImportingWorld] = useState<boolean>(false);

  const handleExportCharacterLocal = (char: Character5e) => {
    try {
      const safeName = (char.name || 'Personaje')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_');
      const exportPayload = {
        exportType: 'weroll_character_5e',
        exportedAt: new Date().toISOString(),
        character: char,
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WeRoll_Personaje_${safeName}_Nv${char.level || 1}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setCharImportExportError('');
      setCharImportExportMsg(`Ficha de "${char.name}" descargada localmente.`);
      setTimeout(() => setCharImportExportMsg(''), 4000);
    } catch (err) {
      setCharImportExportError('Error al exportar el personaje.');
    }
  };

  const handleImportCharacterLocal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser?.email) return;

    setCharImportExportMsg('');
    setCharImportExportError('');

    if (playerSheets.length >= 3) {
      setCharImportExportError('Has alcanzado el límite máximo de 3 personajes por cuenta. Elimina uno antes de importar.');
      if (e.target) e.target.value = '';
      return;
    }

    setIsImportingChar(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const rawChar = parsed.character && typeof parsed.character === 'object' ? parsed.character : parsed;

      if (!rawChar || typeof rawChar !== 'object' || (!rawChar.name && !rawChar.characterClass && !rawChar.abilities)) {
        throw new Error('El archivo JSON no contiene una ficha de personaje válida de WeRoll.');
      }

      const importedChar: Character5e = {
        ...SAMPLE_CHARACTER,
        ...rawChar,
        id: `char-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: rawChar.name || file.name.replace(/\.json$/i, '') || 'Héroe Importado',
        playerName: authUser.displayName || rawChar.playerName || 'Jugador',
        ownerEmail: authUser.email,
        abilities: {
          ...SAMPLE_CHARACTER.abilities,
          ...(rawChar.abilities || {}),
        },
        skills: {
          ...SAMPLE_CHARACTER.skills,
          ...(rawChar.skills || {}),
        },
        currency: {
          ...SAMPLE_CHARACTER.currency,
          ...(rawChar.currency || {}),
        },
      };

      const res = await fetch('/api/vault/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: importedChar,
          ownerEmail: authUser.email,
          reason: 'import_local',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar el personaje importado en el servidor.');
      }

      await fetchUserSheets();
      if (onImportCharacter) {
        onImportCharacter(importedChar);
      }
      setCharImportExportMsg(`¡Personaje "${importedChar.name}" importado y respaldado con éxito!`);
      setTimeout(() => setCharImportExportMsg(''), 5000);
    } catch (err: any) {
      setCharImportExportError(err.message || 'Error al leer el archivo JSON del personaje.');
    } finally {
      setIsImportingChar(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleExportWorldSheetLocal = (world: WorldSheetSummary) => {
    try {
      const safeName = (world.name || 'WorldSheet')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_');
      const exportPayload = {
        exportType: 'weroll_world_sheet_5e',
        exportedAt: new Date().toISOString(),
        world,
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WeRoll_WorldSheet_${safeName}_${world.roomCode || 'MESA'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setWorldImportExportError('');
      setWorldImportExportMsg(`World Sheet "${world.name}" descargado localmente.`);
      setTimeout(() => setWorldImportExportMsg(''), 4000);
    } catch (err) {
      setWorldImportExportError('Error al exportar el World Sheet.');
    }
  };

  const handleImportWorldSheetLocal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser?.email) return;

    setWorldImportExportMsg('');
    setWorldImportExportError('');

    if (worldSheets.length >= 3) {
      setWorldImportExportError('Has alcanzado el límite máximo de 3 World Sheets por cuenta. Elimina uno antes de importar.');
      if (e.target) e.target.value = '';
      return;
    }

    setIsImportingWorld(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const rawWorld = parsed.world && typeof parsed.world === 'object' ? parsed.world : parsed;

      // Support importing either a full WorldSheetSummary or a direct DMWorkspace object
      const rawWorkspace: DMWorkspace =
        rawWorld.workspace && typeof rawWorld.workspace === 'object'
          ? rawWorld.workspace
          : rawWorld.npcs || rawWorld.monsters || rawWorld.locations
          ? rawWorld
          : null;

      if (!rawWorkspace) {
        throw new Error('El archivo JSON no contiene un World Sheet válido de WeRoll.');
      }

      const generatedRoomCode = (
        rawWorld.roomCode || `MESA-${Math.floor(100 + Math.random() * 900)}`
      )
        .toString()
        .trim()
        .toUpperCase();

      const importedWorld: WorldSheetSummary = {
        id: `world-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerEmail: authUser.email,
        name: rawWorld.name || file.name.replace(/\.json$/i, '') || 'Campaña Importada',
        roomCode: generatedRoomCode,
        roomPassword: rawWorld.roomPassword || undefined,
        lastPlayed: Date.now(),
        workspace: {
          ...SAMPLE_DM_WORKSPACE,
          ...rawWorkspace,
          npcs: Array.isArray(rawWorkspace.npcs) ? rawWorkspace.npcs : [],
          monsters: Array.isArray(rawWorkspace.monsters) ? rawWorkspace.monsters : [],
          locations: Array.isArray(rawWorkspace.locations) ? rawWorkspace.locations : [],
          campaignLogs: Array.isArray(rawWorkspace.campaignLogs) ? rawWorkspace.campaignLogs : [],
          combatSummaries: Array.isArray(rawWorkspace.combatSummaries) ? rawWorkspace.combatSummaries : [],
          customItemsAndSpells: Array.isArray(rawWorkspace.customItemsAndSpells)
            ? rawWorkspace.customItemsAndSpells
            : [],
          folders: Array.isArray(rawWorkspace.folders) ? rawWorkspace.folders : ['General', 'Campaña'],
        },
      };

      const res = await fetch('/api/vault/worlds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world: importedWorld }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar el World Sheet importado en el servidor.');
      }

      if (onImportWorldSheet) {
        onImportWorldSheet(importedWorld);
      }
      setWorldImportExportMsg(`¡World Sheet "${importedWorld.name}" importado y respaldado con éxito!`);
      setTimeout(() => setWorldImportExportMsg(''), 5000);
    } catch (err: any) {
      setWorldImportExportError(err.message || 'Error al leer el archivo JSON del World Sheet.');
    } finally {
      setIsImportingWorld(false);
      if (e.target) e.target.value = '';
    }
  };

  // Fetch registered users for admin
  const fetchAdminUsers = async () => {
    if (!isModerator) return;
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error loading admin users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch vault details (sheets, worlds, backups, syncMetadata, replacedArchive)
  const fetchVaultDetails = async () => {
    if (!isModerator) return;
    setIsLoadingVault(true);
    try {
      const res = await fetch('/api/admin/vault/details');
      if (res.ok) {
        const data = await res.json();
        setVaultDetails({
          sheets: data.sheets || [],
          worlds: data.worlds || [],
          backups: data.backups || [],
        });
        if (data.syncMetadata) {
          setSyncMetadata(data.syncMetadata);
        }
        if (Array.isArray(data.replacedArchive)) {
          setReplacedArchive(data.replacedArchive);
        }
      }
    } catch (err) {
      console.error('Error loading vault details:', err);
    } finally {
      setIsLoadingVault(false);
    }
  };

  // Fetch changelog list for admin
  const fetchAdminChangelog = async () => {
    try {
      const res = await fetch('/api/admin/changelog');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.changelog)) {
          setChangelogList(data.changelog);
        }
      }
    } catch (err) {
      console.error('Error loading changelog:', err);
    }
  };

  // Fetch feedback list for admin
  const fetchAdminFeedback = async () => {
    setIsLoadingFeedback(true);
    try {
      const res = await fetch('/api/admin/feedback');
      if (res.ok) {
        const data = await res.json();
        setAdminFeedbackList(data.feedback || []);
      }
    } catch (err) {
      console.error('Error fetching admin feedback:', err);
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!window.confirm('¿Deseas eliminar este mensaje de feedback permanentemente?')) return;
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAdminFeedbackList((prev) => prev.filter((f) => f.id !== id));
      }
    } catch (err) {
      console.error('Error deleting feedback:', err);
    }
  };

  const handleToggleFeedbackStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'reviewed' ? 'unread' : 'reviewed';
    try {
      const res = await fetch(`/api/admin/feedback/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setAdminFeedbackList((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: nextStatus } : f))
        );
      }
    } catch (err) {
      console.error('Error updating feedback status:', err);
    }
  };

  // USER SELF-SERVICE PASSWORD HANDLERS
  const handleUserChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserPassStatusMsg('');
    setUserPassErrorMsg('');

    if (!userOldPassword || !userNewPassword || !userConfirmPassword) {
      setUserPassErrorMsg('Por favor completa todos los campos.');
      return;
    }
    if (userNewPassword !== userConfirmPassword) {
      setUserPassErrorMsg('La nueva contraseña y su confirmación no coinciden.');
      return;
    }
    if (userNewPassword.length < 3) {
      setUserPassErrorMsg('La nueva contraseña debe tener al menos 3 caracteres.');
      return;
    }

    setIsUpdatingUserPass(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authUser?.email,
          oldPassword: userOldPassword,
          newPassword: userNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUserPassErrorMsg(data.error || 'Error al actualizar la contraseña.');
      } else {
        setUserPassStatusMsg(data.message || '¡Contraseña actualizada con éxito!');
        setUserOldPassword('');
        setUserNewPassword('');
        setUserConfirmPassword('');
      }
    } catch (err) {
      setUserPassErrorMsg('Error de conexión con el servidor.');
    } finally {
      setIsUpdatingUserPass(false);
    }
  };

  const handleUserRequestForgotInLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserForgotMsg('');
    if (!authUser?.email) return;

    setIsRequestingForgotInLobby(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authUser.email,
          note: userForgotNote || 'El usuario solicitó restablecimiento desde la pestaña de seguridad del Lobby.',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUserPassErrorMsg(data.error || 'Error al enviar solicitud.');
      } else {
        setUserForgotMsg(data.message || 'Solicitud enviada al Administrador.');
        setUserForgotNote('');
      }
    } catch (err) {
      setUserPassErrorMsg('Error de conexión con el servidor.');
    } finally {
      setIsRequestingForgotInLobby(false);
    }
  };

  // ADMIN USER PASSWORD MANAGEMENT HANDLER
  const handleAdminUpdateUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminManagingUserPassword) return;
    setAdminUserPassMsg('');
    if (!adminUserNewPassword.trim()) {
      setAdminUserPassMsg('La nueva contraseña no puede estar vacía.');
      return;
    }

    setIsAdminSavingUserPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${adminManagingUserPassword.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: adminUserNewPassword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminUserPassMsg(data.error || 'Error al actualizar contraseña.');
      } else {
        setAdminUserPassMsg(data.message || 'Contraseña actualizada.');
        // Update user in adminUsers state
        setAdminUsers((prev) =>
          prev.map((u) =>
            u.id === adminManagingUserPassword.id
              ? { ...u, password: adminUserNewPassword.trim(), passwordResetRequested: false }
              : u
          )
        );
        setTimeout(() => {
          setAdminManagingUserPassword(null);
          setAdminUserPassMsg('');
          setAdminUserNewPassword('');
        }, 1800);
      }
    } catch (err) {
      setAdminUserPassMsg('Error de conexión.');
    } finally {
      setIsAdminSavingUserPassword(false);
    }
  };

  // Sync userNewTagId when authUser changes
  useEffect(() => {
    if (authUser?.userTagId) {
      setUserNewTagId(authUser.userTagId);
    }
  }, [authUser?.userTagId]);

  const myFullTag = `${authUser?.displayName || 'Usuario'}@${authUser?.userTagId || '123'}`;

  const handleCopyMyFullTag = () => {
    navigator.clipboard.writeText(myFullTag);
    setCopiedMyTag(true);
    setTimeout(() => setCopiedMyTag(false), 2000);
  };

  // USER CHANGE 3-CHAR TAG ID HANDLER
  const handleUserChangeTagId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser?.email) return;
    setUserTagStatusMsg('');
    setUserTagErrorMsg('');

    const cleanTag = userNewTagId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3);
    if (!cleanTag) {
      setUserTagErrorMsg('El ID debe contener entre 1 y 3 caracteres alfanuméricos (ej. 123 o top).');
      return;
    }

    setIsUpdatingUserTag(true);
    try {
      const res = await fetch('/api/auth/change-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authUser.email,
          newTagId: cleanTag,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUserTagErrorMsg(data.error || 'Error al cambiar tu ID.');
      } else {
        setUserNewTagId(data.userTagId || cleanTag);
        setUserTagStatusMsg(data.message || `¡Tu ID ha sido actualizado a ${data.fullTag}!`);
        await onRefreshAuthStatus();
      }
    } catch (err) {
      setUserTagErrorMsg('Error de conexión con el servidor.');
    } finally {
      setIsUpdatingUserTag(false);
    }
  };

  // FRIENDS HANDLERS
  const fetchUserFriends = async () => {
    if (!authUser?.email) return;
    setIsLoadingFriends(true);
    try {
      const res = await fetch(`/api/friends?email=${encodeURIComponent(authUser.email)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.friends)) {
          setFriendsList(data.friends);
        }
      }
    } catch (err) {
      console.error('Error fetching friends:', err);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser?.email) return;
    setFriendStatusMsg('');
    setFriendErrorMsg('');

    const rawTag = friendTagInput.trim();
    if (!rawTag || !rawTag.includes('@')) {
      setFriendErrorMsg('Ingresa el nombre de usuario seguido de @ y los 3 caracteres de su ID (ej. usuario1@123).');
      return;
    }

    setIsAddingFriend(true);
    try {
      const res = await fetch('/api/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authUser.email,
          friendTag: rawTag,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFriendErrorMsg(data.error || 'No se pudo agregar al amigo.');
      } else {
        setFriendStatusMsg(data.message || '¡Amigo agregado y respaldado en la nube!');
        setFriendTagInput('');
        if (Array.isArray(data.friends)) {
          setFriendsList(data.friends);
        } else {
          fetchUserFriends();
        }
        await onRefreshAuthStatus();
      }
    } catch (err) {
      setFriendErrorMsg('Error de conexión al intentar agregar amigo.');
    } finally {
      setIsAddingFriend(false);
    }
  };

  const handleRemoveFriend = async (friendId: string, friendFullTag: string) => {
    if (!authUser?.email) return;
    setFriendStatusMsg('');
    setFriendErrorMsg('');
    try {
      const res = await fetch('/api/friends/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authUser.email,
          friendId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFriendErrorMsg(data.error || 'No se pudo eliminar al amigo.');
      } else {
        setFriendStatusMsg(`Se eliminó a ${friendFullTag} de tu lista de amigos (respaldo actualizado).`);
        if (Array.isArray(data.friends)) {
          setFriendsList(data.friends);
        } else {
          fetchUserFriends();
        }
        await onRefreshAuthStatus();
      }
    } catch (err) {
      setFriendErrorMsg('Error de conexión al eliminar amigo.');
    }
  };

  // ADMIN CREATE / EDIT / DELETE USER HANDLERS
  const handleAdminCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminCreateUserMsg('');
    setAdminCreateUserError('');

    if (!adminNewUserEmail.trim() || !adminNewUserName.trim()) {
      setAdminCreateUserError('El correo y el nombre de usuario son obligatorios.');
      return;
    }

    setIsAdminCreatingUser(true);
    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminNewUserEmail.trim(),
          displayName: adminNewUserName.trim(),
          userTagId: adminNewUserTagId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3) || '123',
          password: adminNewUserPassword.trim() || '123456',
          role: adminNewUserRole,
          status: adminNewUserStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminCreateUserError(data.error || 'Error al crear el usuario.');
      } else {
        setAdminCreateUserMsg(data.message || 'Usuario creado y respaldado.');
        fetchAdminUsers();
        fetchVaultDetails();
        setTimeout(() => {
          setIsAdminCreateUserOpen(false);
          setAdminNewUserEmail('');
          setAdminNewUserName('');
          setAdminNewUserTagId('123');
          setAdminNewUserPassword('123456');
          setAdminCreateUserMsg('');
        }, 1200);
      }
    } catch (err) {
      setAdminCreateUserError('Error de conexión con el servidor.');
    } finally {
      setIsAdminCreatingUser(false);
    }
  };

  const handleAdminEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEditingUser) return;
    setAdminEditUserMsg('');
    setAdminEditUserError('');

    if (!adminEditUserEmail.trim() || !adminEditUserName.trim()) {
      setAdminEditUserError('El nombre de usuario y correo no pueden estar vacíos.');
      return;
    }

    setIsAdminSavingUserEdit(true);
    try {
      const res = await fetch(`/api/admin/users/${adminEditingUser.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEditUserEmail.trim(),
          displayName: adminEditUserName.trim(),
          userTagId: adminEditUserTagId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3) || '123',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminEditUserError(data.error || 'Error al actualizar el usuario.');
      } else {
        setAdminEditUserMsg(data.message || 'Usuario actualizado y respaldado.');
        fetchAdminUsers();
        if (authUser?.id === adminEditingUser.id) {
          await onRefreshAuthStatus();
        }
        setTimeout(() => {
          setAdminEditingUser(null);
          setAdminEditUserMsg('');
        }, 1000);
      }
    } catch (err) {
      setAdminEditUserError('Error de conexión.');
    } finally {
      setIsAdminSavingUserEdit(false);
    }
  };

  const handleAdminDeleteUser = async (u: any) => {
    if (!window.confirm(`¿Estás seguro de que deseas borrar la cuenta "${u.displayName}@${u.userTagId || '123'}" (${u.email})? Esta acción actualizará el respaldo automático.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAdminUsers((prev) => prev.filter((item) => item.id !== u.id));
        fetchVaultDetails();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  // ADMIN INJECTION HANDLERS
  const handleInjectFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        JSON.parse(text); // validate
        setInjectJsonContent(text);
        setInjectErrorMsg('');
      } catch (err) {
        setInjectErrorMsg('El archivo seleccionado no contiene un formato JSON válido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAdminExecuteInject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminInjectingUser) return;
    setInjectStatusMsg('');
    setInjectErrorMsg('');

    if (!injectJsonContent.trim()) {
      setInjectErrorMsg('Por favor carga un archivo JSON o pega el contenido JSON.');
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(injectJsonContent.trim());
    } catch (err) {
      setInjectErrorMsg('El texto ingresado no es un JSON válido.');
      return;
    }

    setIsInjectingData(true);
    try {
      const res = await fetch(`/api/admin/users/${adminInjectingUser.id}/inject-sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: injectTargetType,
          data: parsed,
          name: injectCustomTitle.trim() || undefined,
          roomCode: injectRoomCode.trim() || undefined,
          roomPassword: injectRoomPassword.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setInjectErrorMsg(data.error || 'Error al inyectar los datos.');
      } else {
        setInjectStatusMsg(data.message || '¡Datos inyectados exitosamente!');
        fetchVaultDetails();
        fetchUserSheets();
        setTimeout(() => {
          setAdminInjectingUser(null);
          setInjectJsonContent('');
          setInjectCustomTitle('');
          setInjectRoomCode('');
          setInjectRoomPassword('');
          setInjectStatusMsg('');
        }, 2000);
      }
    } catch (err) {
      setInjectErrorMsg('Error de conexión con el servidor.');
    } finally {
      setIsInjectingData(false);
    }
  };

  useEffect(() => {
    if (authUser?.email && authUser.status !== 'pending') {
      fetchUserSheets();
      fetchUserFriends();
    }
    if (isModerator && activeTab === 'admin') {
      fetchAdminUsers();
      fetchVaultDetails();
      fetchAdminChangelog();
      fetchAdminFeedback();
    }
  }, [authUser?.email, authUser?.status, activeTab, isModerator, charactersCount]);

  // Handle Join Table validation
  const handleJoinTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    if (!joinRoomCode.trim()) {
      setJoinError('Por favor ingresa el nombre o código de la mesa.');
      return;
    }
    if (!joinModalChar) return;

    setIsVerifyingJoin(true);
    try {
      const res = await fetch('/api/rooms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: joinRoomCode.trim().toUpperCase(),
          password: joinPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setJoinError(data.error || 'No se pudo conectar a la mesa. Verifica el código o contraseña.');
        return;
      }

      // Successful verification -> Launch player sheet inside active table!
      const char = joinModalChar;
      setJoinModalChar(null);
      onSelectCharacterToPlay(char, joinRoomCode.trim().toUpperCase());
    } catch (err) {
      setJoinError('Error al contactar con el servidor de la mesa.');
    } finally {
      setIsVerifyingJoin(false);
    }
  };

  // Handle Create World Sheet
  const handleCreateWorldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorldCreateError('');
    if (!newWorldName.trim()) {
      setWorldCreateError('Por favor asigna un nombre al World Sheet.');
      return;
    }
    if (!newWorldRoomCode.trim()) {
      setWorldCreateError('El código o nombre de la mesa es requerido.');
      return;
    }

    if (worldSheets.length >= 3) {
      setWorldCreateError('Límite alcanzado: máximo 3 World Sheets por cuenta.');
      return;
    }

    setIsSavingWorld(true);
    try {
      await onCreateWorldSheet({
        name: newWorldName.trim(),
        roomCode: newWorldRoomCode.trim().toUpperCase(),
        roomPassword: newWorldPassword.trim() || undefined,
      });
      setIsCreateWorldOpen(false);
      setNewWorldName('');
      setNewWorldRoomCode('MESA-1');
      setNewWorldPassword('');
    } catch (err: any) {
      setWorldCreateError(err.message || 'Error al crear World Sheet.');
    } finally {
      setIsSavingWorld(false);
    }
  };

  // Handle Update World Sheet Config
  const handleUpdateWorldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorld) return;
    setWorldCreateError('');
    try {
      await onUpdateWorldSheetConfig(editingWorld.id, {
        name: editWorldName.trim() || editingWorld.name,
        roomCode: editWorldRoomCode.trim().toUpperCase() || editingWorld.roomCode,
        roomPassword: editWorldPassword.trim() || undefined,
      });
      setEditingWorld(null);
      setWorldCreateError('');
    } catch (err: any) {
      setWorldCreateError(
        err.message || 'No se pudo actualizar: ya existe una mesa con ese nombre creada por otro DM.'
      );
    }
  };

  // Admin user role modification (Independent Player Type and App Role)
  const handleAdminChangeRole = async (userId: string, role: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        fetchAdminUsers();
      }
    } catch (e) {
      console.error('Error changing role:', e);
    }
  };

  const handleAdminChangePlayerType = async (userId: string, playerType: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerType }),
      });
      if (res.ok) {
        fetchAdminUsers();
      }
    } catch (e) {
      console.error('Error changing player type:', e);
    }
  };

  const handleAdminChangeAppRole = async (userId: string, appRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appRole }),
      });
      if (res.ok) {
        fetchAdminUsers();
      }
    } catch (e) {
      console.error('Error changing app role:', e);
    }
  };

  // Admin user approval toggle
  const handleAdminApproveUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/approve`, { method: 'POST' });
      if (res.ok) {
        fetchAdminUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdminRejectUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/reject`, { method: 'POST' });
      if (res.ok) {
        fetchAdminUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle uploading and restoring a backup JSON file to the vault
  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreMessage('');
    setRestoreError('');
    setRestoreLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        const res = await fetch('/api/admin/vault/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error al restaurar información de respaldo.');
        }

        setRestoreMessage(data.message || 'Respaldo restaurado con éxito en el servidor.');

        // Immediately update client mirror in browser localStorage so sync checks respect this state as newest
        if (data.latestBackup) {
          try {
            localStorage.setItem('weroll_cloud_mirror_snapshot_v2', JSON.stringify(data.latestBackup));
          } catch {}
          if (data.latestBackup.settings) {
            setAdminSettingsForm(data.latestBackup.settings);
            onSaveHostSettings(data.latestBackup.settings).catch(() => {});
          }
        }

        // Refresh all lists across the system
        fetchVaultDetails();
        fetchUserSheets();
        fetchAdminUsers();
        fetchAdminFeedback();
        fetchAdminChangelog();
      } catch (err: any) {
        setRestoreError(err.message || 'El archivo seleccionado no es un JSON de respaldo válido.');
      } finally {
        setRestoreLoading(false);
        if (restoreFileInputRef.current) {
          restoreFileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      setRestoreError('No se pudo leer el archivo seleccionado.');
      setRestoreLoading(false);
    };

    reader.readAsText(file);
  };

  // Changelog admin actions
  const handleOpenNewChangelogModal = () => {
    setEditingChangelogIdx(-1);
    setChangelogFormVersion(`0.${(changelogList.length + 1) * 1}`);
    setChangelogFormTitle('');
    setChangelogFormDate(new Date().toISOString().split('T')[0]);
    setChangelogFormChanges('');
    setIsChangelogEditModalOpen(true);
  };

  const handleOpenEditChangelogModal = (entry: ChangelogEntry, idx: number) => {
    setEditingChangelogIdx(idx);
    setChangelogFormVersion(entry.version);
    setChangelogFormTitle(entry.title);
    setChangelogFormDate(entry.date);
    setChangelogFormChanges(entry.changes.join('\n'));
    setIsChangelogEditModalOpen(true);
  };

  const handleSaveChangelogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const changesArray = changelogFormChanges
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const payload = {
      version: changelogFormVersion.trim(),
      title: changelogFormTitle.trim(),
      date: changelogFormDate.trim(),
      changes: changesArray.length > 0 ? changesArray : ['Actualización de sistema'],
    };

    try {
      let res;
      if (editingChangelogIdx === -1) {
        res = await fetch('/api/admin/changelog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/admin/changelog/${editingChangelogIdx}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const data = await res.json();
        setChangelogList(data.changelog || []);
        setIsChangelogEditModalOpen(false);
      }
    } catch (err) {
      console.error('Error saving changelog entry:', err);
    }
  };

  const handleDeleteChangelogSubmit = async (idx: number) => {
    if (!window.confirm('¿Estás seguro de eliminar esta entrada de actualización?')) return;
    try {
      const res = await fetch(`/api/admin/changelog/${idx}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setChangelogList(data.changelog || []);
      }
    } catch (err) {
      console.error('Error deleting changelog entry:', err);
    }
  };

  const handleAdminSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminSaveMessage('');

    // Determine final AI model
    const finalAiModel = isCustomAiModel
      ? (customAiModelText.trim() || 'gemini-flash-lite-latest')
      : (adminSettingsForm.aiModel || 'gemini-flash-lite-latest');

    const updatedSettings: HostSettings = {
      ...adminSettingsForm,
      aiModel: finalAiModel,
    };

    try {
      await onSaveHostSettings(updatedSettings);
      setAdminSettingsForm(updatedSettings);
      setAdminSaveMessage('¡Ajustes y modelos guardados con éxito en el servidor!');
      setTimeout(() => setAdminSaveMessage(''), 4000);
    } catch (e) {
      setAdminSaveMessage('Error al guardar ajustes en el servidor.');
    }
  };

  const handleSaveAdminGreeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setGreetingSaveStatus('');
    try {
      const updated: HostSettings = {
        ...hostSettings,
        adminGreeting: {
          enabled: greetingEnabled,
          title: greetingTitle.trim() || 'Comunicado del Administrador',
          message: greetingMessage.trim(),
          type: greetingType,
          updatedAt: Date.now(),
        },
      };
      await onSaveHostSettings(updated);
      setGreetingSaveStatus('¡Aviso del Administrador guardado y transmitido a todas las instancias!');
      setTimeout(() => setGreetingSaveStatus(''), 4000);
    } catch (err) {
      setGreetingSaveStatus('Error al guardar saludo en el servidor.');
    }
  };

  const renderAdminGreetingBanner = () => {
    if (!hostSettings.adminGreeting?.enabled || !hostSettings.adminGreeting?.message || dismissedGreeting) {
      return null;
    }
    const type = hostSettings.adminGreeting.type || 'info';
    const isMaintenance = type === 'maintenance';
    const isAlert = type === 'alert';

    return (
      <div
        className={`w-full rounded-2xl p-4.5 border shadow-xl flex items-start justify-between gap-4 animate-in fade-in transition ${
          isMaintenance
            ? 'bg-gradient-to-r from-amber-950/90 via-stone-900 to-amber-950/90 border-amber-500/80 text-amber-200'
            : isAlert
            ? 'bg-gradient-to-r from-red-950/90 via-stone-900 to-red-950/90 border-red-500/80 text-red-200'
            : 'bg-gradient-to-r from-blue-950/90 via-stone-900 to-purple-950/90 border-blue-500/70 text-blue-200'
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border shadow ${
              isMaintenance
                ? 'bg-amber-900/60 border-amber-400 text-amber-300'
                : isAlert
                ? 'bg-red-900/60 border-red-400 text-red-300'
                : 'bg-blue-900/60 border-blue-400 text-blue-300'
            }`}
          >
            {isMaintenance ? (
              <Clock className="w-5 h-5 animate-pulse" />
            ) : isAlert ? (
              <AlertCircle className="w-5 h-5 animate-bounce" />
            ) : (
              <Crown className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-cinzel font-bold uppercase tracking-wider border ${
                  isMaintenance
                    ? 'bg-amber-950 border-amber-500 text-amber-300'
                    : isAlert
                    ? 'bg-red-950 border-red-500 text-red-300'
                    : 'bg-blue-950 border-blue-500 text-blue-300'
                }`}
              >
                {isMaintenance
                  ? 'Mantenimiento del Servidor'
                  : isAlert
                  ? 'Alerta Prioritaria'
                  : 'Aviso Oficial del Administrador'}
              </span>
              <h4 className="font-cinzel font-bold text-sm text-stone-100">
                {hostSettings.adminGreeting.title || 'Comunicado Oficial'}
              </h4>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed font-sans">
              {hostSettings.adminGreeting.message}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissedGreeting(true)}
          className="p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800/60 transition"
          title="Ocultar notificación"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  };

  // ==========================================
  // VIEW: NOT LOGGED IN / GUEST SCREEN
  // ==========================================
  if (!authUser) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 space-y-5 max-w-xl mx-auto w-full">
        {/* Admin Greeting Notification Banner */}
        {renderAdminGreetingBanner()}

        <div className="w-full bg-[#16171d] border-2 border-amber-900/60 rounded-3xl p-8 sm:p-10 shadow-2xl text-center relative overflow-hidden animate-in fade-in zoom-in-95">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-600 via-purple-600 to-amber-600" />

          <BrandLogo hostSettings={hostSettings} size="xl" className="mb-6 mx-auto" />

          <h1 className="font-cinzel font-black text-3xl sm:text-4xl text-amber-300 tracking-wider">
            {hostSettings.headerTitle || 'WeRoll'}
          </h1>
          <p className="text-xs text-stone-400 mt-2 uppercase tracking-widest font-cinzel">
            {hostSettings.headerSubtitle || 'Companion & DM Suite v0.4'}
          </p>

          <p className="text-sm text-stone-300 mt-6 leading-relaxed max-w-md mx-auto">
            Bienvenido al portal de aventuras. Para crear, editar y gestionar tus hojas de personaje
            o las pantallas de campaña del Dungeon Master, inicia sesión con tu cuenta o regístrate.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onOpenAuthModal}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-cinzel font-bold text-sm shadow-xl transition transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4" />
              Iniciar Sesión / Registrarse
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-stone-800 flex items-center justify-center gap-4 text-xs text-stone-400">
            <button
              onClick={onOpenChangelog}
              className="hover:text-amber-300 flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Novedades de la versión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: PENDING APPROVAL SCREEN
  // ==========================================
  if (authUser.status === 'pending') {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 space-y-5 max-w-lg mx-auto w-full">
        {renderAdminGreetingBanner()}

        <div className="w-full bg-[#181920] border-2 border-amber-700/60 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden animate-in fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-950/80 border border-amber-500/80 text-amber-300 mb-5 shadow-lg">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <span className="px-3 py-1 rounded-full text-[11px] font-cinzel font-bold tracking-wider bg-amber-950 border border-amber-600/70 text-amber-300 uppercase">
            Cuenta en Espera de Aprobación
          </span>

          <h2 className="font-cinzel font-black text-2xl text-stone-100 mt-4">
            ¡Hola, {authUser.displayName}!
          </h2>

          <p className="text-xs text-stone-300 mt-3 leading-relaxed">
            Tu cuenta registrada con el correo <span className="text-amber-300 font-mono font-semibold">{authUser.email}</span>{' '}
            y perfil de <strong className="text-amber-200 capitalize">{authUser.role === 'both' ? 'Jugador y Dungeon Master' : authUser.role === 'dm' ? 'Dungeon Master' : 'Jugador'}</strong> ha sido registrada exitosamente.
          </p>

          <div className="mt-6 p-4 rounded-2xl bg-[#121316] border border-amber-900/50 text-left text-xs text-stone-300 space-y-2">
            <div className="flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Por motivos de seguridad de las mesas, el Administrador debe aprobar tu cuenta antes de permitir la creación de fichas y partidas.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Una vez aprobada, podrás acceder a tus personajes o pantallas de DM automáticamente.</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onRefreshAuthStatus}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Comprobar si ya fui aprobado
            </button>
            <button
              onClick={onLogout}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-cinzel text-xs transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: REJECTED USER SCREEN
  // ==========================================
  if (authUser.status === 'rejected') {
    const customRejection =
      hostSettings.rejectionCustomMessage ||
      'Lo lamentamos, por el momento no puedes acceder a WeRoll. Manda mensaje a soporte@weroll.app si quieres una revisión manual de tu caso.';
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
        <div className="max-w-lg w-full bg-[#181920] border-2 border-red-700/80 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden animate-in fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-950/80 border border-red-600/80 text-red-400 mb-5 shadow-lg">
            <X className="w-8 h-8" />
          </div>

          <span className="px-3 py-1 rounded-full text-[11px] font-cinzel font-bold tracking-wider bg-red-950 border border-red-600/70 text-red-300 uppercase">
            Aprobación Rechazada
          </span>

          <h2 className="font-cinzel font-black text-2xl text-stone-100 mt-4">
            Solicitud no Aprobada
          </h2>

          <div className="mt-5 p-4 rounded-2xl bg-[#121316] border border-red-900/60 text-left text-xs text-stone-200 leading-relaxed font-sans">
            <p className="font-semibold text-red-300 mb-2 font-cinzel">Mensaje de la Administración:</p>
            <p className="text-stone-300">{customRejection}</p>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={onLogout}
              className="px-6 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-cinzel font-bold text-xs shadow-lg transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: APPROVED USER LOBBY PORTAL
  // ==========================================
  return (
    <div className="w-full max-w-[1700px] mx-auto px-2 sm:px-4 py-4 space-y-6 animate-in fade-in">
      {/* Lobby Top Banner: Welcome, Dual Role Badge, Security & Admin Actions */}
      <div className="bg-gradient-to-r from-[#171821] via-[#1c1d29] to-[#171821] border border-amber-900/60 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <BrandLogo hostSettings={hostSettings} size="lg" />
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-cinzel font-black text-2xl text-amber-300 tracking-wide">
                {hostSettings.headerTitle || 'WeRoll'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-950 border border-amber-700 text-amber-300">
                {hostSettings.headerSubtitle || 'Suite v0.9 Alfa'}
              </span>
              <button
                onClick={onOpenChangelog}
                title="Ver novedades de la versión v0.9 Alfa"
                className="px-2.5 py-1 rounded-xl bg-stone-800/80 hover:bg-amber-950 hover:border-amber-600/60 border border-stone-700 text-stone-300 text-xs font-cinzel transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Novedades</span>
              </button>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Bienvenido, <strong className="text-stone-200">{authUser.displayName}</strong> <span className="font-mono text-amber-400 font-bold">@{authUser.userTagId || '123'}</span> ({authUser.email})
            </p>
          </div>
        </div>

        {/* Dual Roles Badges & Quick Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap self-end md:self-center">
          {/* 1. Tipo de Jugador Badge */}
          <div className="px-3 py-1.5 rounded-xl bg-[#121316] border border-stone-800 flex items-center gap-1.5">
            {userPlayerType === 'dm' ? (
              <Crown className="w-3.5 h-3.5 text-purple-400" />
            ) : userPlayerType === 'both' ? (
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <User className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="text-[11px] font-cinzel font-bold text-stone-200 uppercase">
              {userPlayerType === 'dm'
                ? 'Dungeon Master'
                : userPlayerType === 'both'
                ? 'DM y Jugador'
                : 'Jugador'}
            </span>
          </div>

          {/* 2. Rol en la App Badge */}
          <div className="px-3 py-1.5 rounded-xl bg-[#121316] border border-stone-800 flex items-center gap-1.5">
            {userAppRole === 'admin' ? (
              <Shield className="w-3.5 h-3.5 text-blue-400" />
            ) : userAppRole === 'moderator' ? (
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            ) : (
              <User className="w-3.5 h-3.5 text-stone-400" />
            )}
            <span className="text-[11px] font-cinzel font-bold uppercase text-stone-300">
              {userAppRole === 'admin'
                ? 'Admin'
                : userAppRole === 'moderator'
                ? 'Moderador'
                : 'Cliente'}
            </span>
          </div>

          {/* Button: Seguridad & Contraseña Tool */}
          <button
            onClick={() => {
              if (onOpenSecurityModal) onOpenSecurityModal();
              else setIsSecurityModalOpen(true);
            }}
            title="Ajustar Seguridad, @ID y Contraseña"
            className="p-2.5 rounded-xl bg-[#15161e] hover:bg-[#1d1f2b] border border-stone-700 hover:border-amber-600/70 text-amber-400 transition shadow-sm flex items-center gap-1.5 text-xs font-cinzel font-bold"
          >
            <Wrench className="w-4 h-4" />
            <span className="hidden sm:inline">Seguridad</span>
          </button>

          {/* Button: Admin Panel (Solo Administrador) */}
          {isAdmin && (
            <button
              onClick={() => {
                if (onOpenAdminPanel) onOpenAdminPanel();
                else setIsAdminPanelOpen(true);
              }}
              title="Abrir Panel de Administrador"
              className="p-2.5 rounded-xl bg-blue-950/70 hover:bg-blue-900 border border-blue-700/70 text-blue-300 hover:text-white transition shadow-sm flex items-center gap-1.5 text-xs font-cinzel font-bold"
            >
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Panel Admin</span>
            </button>
          )}

          {/* Button: Moderator Panel (Moderador o Administrador) */}
          {isModerator && (
            <button
              onClick={() => {
                if (onOpenModeratorPanel) onOpenModeratorPanel();
                else setIsModeratorPanelOpen(true);
              }}
              title="Abrir Panel de Moderación"
              className="p-2.5 rounded-xl bg-purple-950/70 hover:bg-purple-900 border border-purple-700/70 text-purple-300 hover:text-white transition shadow-sm flex items-center gap-1.5 text-xs font-cinzel font-bold"
            >
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">Moderación</span>
            </button>
          )}
          {/* Button: Feedback (Solo para Clientes / Jugadores Normales) */}
          {!isAdmin && !isModeratorRole && (
            <button
              onClick={() => {
                if (onOpenFeedback) onOpenFeedback();
              }}
              title="Enviar feedback o reportar un bug"
              className="p-2.5 rounded-xl bg-amber-950/60 hover:bg-amber-900 border border-amber-800/60 text-amber-300 hover:text-amber-100 transition shadow-sm flex items-center gap-1.5 text-xs font-cinzel font-bold"
            >
              <MessageSquarePlus className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Feedback</span>
            </button>
          )}

          {/* Logout button */}
          <button
            onClick={onLogout}
            title="Cerrar Sesión"
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 border border-stone-700 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Admin Greeting / Maintenance Notification Banner */}
      {renderAdminGreetingBanner()}

      {/* =================================================================== */}
      {/* MAIN 2-COLUMN VIEWPORT: LEFT (1/3) & RIGHT FORUM (2/3)              */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (col-span-12 lg:col-span-5 xl:col-span-4 2xl:col-span-4 space-y-6) */}
        <div className="lg:col-span-5 xl:col-span-4 2xl:col-span-4 space-y-6">
          {/* Card 1: Fichas de Jugador / World Sheets */}
          <div className="bg-[#14151b] border border-amber-900/60 rounded-3xl p-5 shadow-xl space-y-4">
            {/* Dual Role Selector: Personajes vs World Sheets */}
            {canPlay && canDm && (
              <div className="flex items-center gap-1.5 p-1 bg-[#101116] border border-stone-800 rounded-2xl mb-2">
                <button
                  type="button"
                  onClick={() => setLeftTab('characters')}
                  className={`flex-1 py-2 px-3 rounded-xl font-cinzel font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                    leftTab === 'characters'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Personajes ({playerSheets.length}/3)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLeftTab('worlds')}
                  className={`flex-1 py-2 px-3 rounded-xl font-cinzel font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                    leftTab === 'worlds'
                      ? 'bg-purple-700 text-white shadow'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>World Sheets ({worldSheets.length}/3)</span>
                </button>
              </div>
            )}

            {(leftTab === 'characters' || !canDm) && canPlay && (
              <div className="space-y-5">
          {/* Hidden File Input for Importing Character JSON Locally */}
          <input
            type="file"
            ref={importCharFileInputRef}
            onChange={handleImportCharacterLocal}
            accept=".json,application/json"
            className="hidden"
          />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-stone-800/60">
            <div>
              <h2 className="font-cinzel font-bold text-xs sm:text-sm text-stone-100 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate">Mis Personajes ({playerSheets.length}/3)</span>
              </h2>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => importCharFileInputRef.current?.click()}
                disabled={playerSheets.length >= 3 || isImportingChar}
                title="Importar personaje desde un archivo JSON local"
                className={`px-2.5 py-1 rounded-lg font-cinzel font-bold text-[11px] flex items-center gap-1 transition shadow border ${
                  playerSheets.length >= 3
                    ? 'bg-stone-800 text-stone-500 cursor-not-allowed border-stone-700'
                    : 'bg-stone-900 hover:bg-stone-800 text-amber-300 border-amber-700/70'
                }`}
              >
                <Upload className="w-3 h-3" />
                <span>{isImportingChar ? '...' : 'Importar'}</span>
              </button>

              <button
                onClick={onCreateNewCharacter}
                disabled={playerSheets.length >= 3}
                className={`px-2.5 py-1 rounded-lg font-cinzel font-bold text-[11px] flex items-center gap-1 transition shadow ${
                  playerSheets.length >= 3
                    ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                    : 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                }`}
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>Crear</span>
              </button>
            </div>
          </div>

          {charImportExportMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">{charImportExportMsg}</span>
              </div>
              <button onClick={() => setCharImportExportMsg('')} className="text-emerald-400 hover:text-emerald-200 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {charImportExportError && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-700 text-red-200 text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="truncate">{charImportExportError}</span>
              </div>
              <button onClick={() => setCharImportExportError('')} className="text-red-400 hover:text-red-200 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {playerSheets.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#14151b] border-2 border-dashed border-stone-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-950/50 border border-amber-900 text-amber-400 flex items-center justify-center mx-auto">
                <User className="w-6 h-6" />
              </div>
              <h3 className="font-cinzel font-bold text-sm text-stone-200">
                Sin personajes registrados
              </h3>
              <p className="text-xs text-stone-400 max-w-xs mx-auto leading-relaxed">
                Crea tu primera ficha o importa un archivo JSON para unirte a las partidas.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  onClick={onCreateNewCharacter}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-cinzel font-bold text-xs shadow transition inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Personaje</span>
                </button>
                <button
                  type="button"
                  onClick={() => importCharFileInputRef.current?.click()}
                  disabled={isImportingChar}
                  className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 border border-amber-700/70 font-cinzel font-bold text-xs shadow transition inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importar JSON</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {playerSheets.map((char) => (
                <div
                  key={char.id}
                  className="bg-[#181922] border border-amber-900/50 hover:border-amber-600/70 rounded-2xl p-4 shadow-md transition-all duration-200 space-y-3 group"
                >
                  {/* Header: Avatar, Name & Class */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <EntityAvatar
                        avatarType={char.avatarType || (char.avatarCustomUrl || char.avatarUrl ? 'custom' : 'icon')}
                        customUrl={char.avatarCustomUrl || char.avatarUrl}
                        iconId={char.avatarIcon || 'anonymous'}
                        size="md"
                        className="shrink-0 shadow border border-amber-700/60"
                      />
                      <div className="min-w-0">
                        <h3 className="font-cinzel font-bold text-sm text-amber-300 group-hover:text-amber-200 transition truncate leading-snug">
                          {char.name}
                        </h3>
                        <p className="text-[11px] text-stone-400 truncate">
                          {char.race} {char.subrace ? `(${char.subrace}) ` : ''}• {char.characterClass}
                        </p>
                        <p className="text-[10px] text-stone-500 truncate">
                          Jugador: {char.playerName || authUser.displayName}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-950/80 border border-amber-700/60 font-mono font-bold text-[11px] text-amber-300 shrink-0">
                      Nv. {char.level}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-1.5 py-2 border-y border-stone-800/80 text-center">
                    <div className="bg-[#121316] rounded-lg p-1.5">
                      <span className="text-[9px] text-stone-500 uppercase tracking-wider block font-cinzel">HP</span>
                      <span className="font-mono font-bold text-xs text-emerald-400">
                        {char.currentHp}/{char.maxHp}
                      </span>
                    </div>
                    <div className="bg-[#121316] rounded-lg p-1.5">
                      <span className="text-[9px] text-stone-500 uppercase tracking-wider block font-cinzel">Armadura</span>
                      <span className="font-mono font-bold text-xs text-blue-400">
                        CA {char.armorClass}
                      </span>
                    </div>
                    <div className="bg-[#121316] rounded-lg p-1.5">
                      <span className="text-[9px] text-stone-500 uppercase tracking-wider block font-cinzel">Iniciativa</span>
                      <span className="font-mono font-bold text-xs text-amber-400">
                        {char.initiativeBonus >= 0 ? `+${char.initiativeBonus}` : char.initiativeBonus}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-1 flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setJoinModalChar(char);
                        setJoinError('');
                      }}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-cinzel font-bold text-xs shadow transition flex items-center justify-center gap-1 min-w-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                      <span className="truncate">Entrar a Mesa</span>
                    </button>

                    <button
                      onClick={() => onEditCharacterSolo(char)}
                      title="Editar ficha en solitario (sin mesa)"
                      className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition shrink-0"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportCharacterLocal(char)}
                      title="Descargar / Exportar personaje localmente (.json)"
                      className="p-2 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-700/60 transition shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setCharToDelete(char)}
                      title="Eliminar personaje"
                      className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/60 transition shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
              </div>
            )}

            {/* World Sheets Panel */}
            {(leftTab === 'worlds' || !canPlay) && canDm && (
              <div className="space-y-5">
          {/* Hidden File Input for Importing World Sheet JSON Locally */}
          <input
            type="file"
            ref={importWorldFileInputRef}
            onChange={handleImportWorldSheetLocal}
            accept=".json,application/json"
            className="hidden"
          />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-stone-800/60">
            <div>
              <h2 className="font-cinzel font-bold text-xs sm:text-sm text-stone-100 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-purple-400" />
                <span className="truncate">Mis World Sheets ({worldSheets.length}/3)</span>
              </h2>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => importWorldFileInputRef.current?.click()}
                disabled={worldSheets.length >= 3 || isImportingWorld}
                title="Importar World Sheet desde un archivo JSON local"
                className={`px-2.5 py-1 rounded-lg font-cinzel font-bold text-[11px] flex items-center gap-1 transition shadow border ${
                  worldSheets.length >= 3
                    ? 'bg-stone-800 text-stone-500 cursor-not-allowed border-stone-700'
                    : 'bg-stone-900 hover:bg-stone-800 text-purple-300 border-purple-700/70'
                }`}
              >
                <Upload className="w-3 h-3" />
                <span>{isImportingWorld ? '...' : 'Importar'}</span>
              </button>

              <button
                onClick={() => {
                  setIsCreateWorldOpen(true);
                  setWorldCreateError('');
                }}
                disabled={worldSheets.length >= 3}
                className={`px-2.5 py-1 rounded-lg font-cinzel font-bold text-[11px] flex items-center gap-1 transition shadow ${
                  worldSheets.length >= 3
                    ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                    : 'bg-purple-700 hover:bg-purple-600 text-white'
                }`}
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>Crear</span>
              </button>
            </div>
          </div>

          {worldImportExportMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">{worldImportExportMsg}</span>
              </div>
              <button onClick={() => setWorldImportExportMsg('')} className="text-emerald-400 hover:text-emerald-200 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {worldImportExportError && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-700 text-red-200 text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="truncate">{worldImportExportError}</span>
              </div>
              <button onClick={() => setWorldImportExportError('')} className="text-red-400 hover:text-red-200 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {worldSheets.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#14151b] border-2 border-dashed border-stone-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-950/50 border border-purple-900 text-purple-400 flex items-center justify-center mx-auto">
                <Crown className="w-6 h-6" />
              </div>
              <h3 className="font-cinzel font-bold text-sm text-stone-200">
                Sin World Sheets creados
              </h3>
              <p className="text-xs text-stone-400 max-w-xs mx-auto leading-relaxed">
                Crea tu primera pantalla de DM o importa un archivo JSON para comenzar.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => setIsCreateWorldOpen(true)}
                  className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-cinzel font-bold text-xs shadow transition inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear World Sheet</span>
                </button>
                <button
                  type="button"
                  onClick={() => importWorldFileInputRef.current?.click()}
                  disabled={isImportingWorld}
                  className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-purple-300 border border-purple-700/70 font-cinzel font-bold text-xs shadow transition inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Importar JSON</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {worldSheets.map((world) => (
                <div
                  key={world.id}
                  className="bg-[#191924] border border-purple-900/50 hover:border-purple-600/70 rounded-2xl p-4 shadow-md transition-all duration-200 space-y-3 group"
                >
                  <div>
                    {/* Header: World Title & Room Code */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="font-cinzel font-bold text-sm text-purple-300 group-hover:text-purple-200 transition truncate leading-snug">
                          {world.name}
                        </h3>
                        <p className="text-[11px] text-stone-400 flex items-center gap-1.5 mt-0.5">
                          <span>Mesa:</span>
                          <span className="font-mono font-bold text-amber-300 bg-[#121316] px-1.5 py-0.2 rounded border border-stone-800">
                            {world.roomCode}
                          </span>
                        </p>
                      </div>

                      {world.roomPassword ? (
                        <span title="Mesa con contraseña requerida" className="p-1 rounded-lg bg-amber-950/80 border border-amber-800 text-amber-300 shrink-0">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span title="Mesa de acceso libre" className="p-1 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 shrink-0">
                          <Unlock className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    {/* Entities Counts */}
                    <div className="grid grid-cols-3 gap-1.5 py-2 border-y border-stone-800/80 text-center my-2">
                      <div className="bg-[#121316] rounded-lg p-1.5">
                        <span className="text-[9px] text-stone-500 uppercase tracking-wider block font-cinzel">NPCs</span>
                        <span className="font-mono font-bold text-xs text-purple-300">
                          {world.workspace?.npcs?.length || 0}
                        </span>
                      </div>
                      <div className="bg-[#121316] rounded-lg p-1.5">
                        <span className="text-[9px] text-stone-500 uppercase tracking-wider block font-cinzel">Monstruos</span>
                        <span className="font-mono font-bold text-xs text-purple-300">
                          {world.workspace?.monsters?.length || 0}
                        </span>
                      </div>
                      <div className="bg-[#121316] rounded-lg p-1.5">
                        <span className="text-[9px] text-stone-500 uppercase tracking-wider block font-cinzel">Lugares</span>
                        <span className="font-mono font-bold text-xs text-purple-300">
                          {world.workspace?.locations?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-1 flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenWorldSheet(world)}
                      className="flex-1 py-2 px-2.5 rounded-xl bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 text-white font-cinzel font-bold text-xs shadow transition flex items-center justify-center gap-1 min-w-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                      <span className="truncate">Abrir Mesa DM</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingWorld(world);
                        setEditWorldName(world.name);
                        setEditWorldRoomCode(world.roomCode);
                        setEditWorldPassword(world.roomPassword || '');
                      }}
                      title="Editar configuración de la mesa"
                      className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition shrink-0"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportWorldSheetLocal(world)}
                      title="Descargar / Exportar World Sheet localmente (.json)"
                      className="p-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-700/60 transition shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setWorldToDelete(world)}
                      title="Eliminar World Sheet"
                      className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/60 transition shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
              </div>
            )}
          </div>

          {/* Single Unified Amigos Card */}
          <div className="bg-[#14151b] border border-emerald-900/60 rounded-3xl p-5 shadow-xl space-y-4">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-stone-800/80 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-500/80 flex items-center justify-center text-emerald-300 shrink-0 shadow">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-cinzel font-bold text-[13px] text-emerald-300 truncate">
                    <span className="inline-block max-w-[150px] truncate text-[13px]">Amigos ({friendsList.length})</span>
                  </h2>
                  <p className="text-[10px] text-stone-400 font-mono truncate">
                    Tu ID: <span className="text-amber-300 font-bold">{myFullTag}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons: ID & Actualizar Icon-only */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyMyFullTag}
                  className="w-[50px] h-[28px] px-1 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-[10px] font-cinzel font-bold transition flex items-center justify-center gap-0.5 shadow-sm"
                  title="Copiar mi Usuario@ID para enviarlo a mis amigos"
                >
                  {copiedMyTag ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-300 shrink-0" />
                      <span className="text-[8px]">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 shrink-0" />
                      <span className="text-[8px]">ID</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={fetchUserFriends}
                  disabled={isLoadingFriends}
                  className="w-[28px] h-[28px] p-0 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition flex items-center justify-center border border-stone-700"
                  title="Actualizar lista de amigos"
                >
                  <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isLoadingFriends ? 'animate-spin' : ''}`} />
                  <span className="sr-only">Actualizar</span>
                </button>
              </div>
            </div>

            {/* Notification Messages */}
            {friendStatusMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="min-w-0 truncate">{friendStatusMsg}</span>
              </div>
            )}

            {friendErrorMsg && (
              <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-700 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="min-w-0 truncate">{friendErrorMsg}</span>
              </div>
            )}

            {/* Input Form to Add Friend by Username@ID */}
            <form onSubmit={handleAddFriendSubmit} className="flex gap-2">
              <input
                type="text"
                value={friendTagInput}
                onChange={(e) => setFriendTagInput(e.target.value)}
                placeholder="Ingresa usuario@ID (ej. pedro@123)"
                required
                className="flex-1 min-w-0 bg-[#101116] border border-stone-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-stone-100 text-xs font-mono outline-none transition"
              />
              <button
                type="submit"
                disabled={isAddingFriend}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-cinzel font-bold text-xs shadow transition flex items-center justify-center gap-1 disabled:opacity-50 shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isAddingFriend ? '...' : 'Agregar'}</span>
              </button>
            </form>

            {/* Friends List */}
            <div className="space-y-2 pt-1">
              {friendsList.length === 0 ? (
                <div className="py-6 text-center space-y-1.5 bg-[#101116] border border-stone-800/80 rounded-2xl p-4">
                  <Users className="w-7 h-7 text-stone-600 mx-auto" />
                  <p className="text-xs font-cinzel text-stone-400">
                    Aún no tienes amigos agregados
                  </p>
                  <p className="text-[11px] text-stone-500 max-w-xs mx-auto leading-relaxed">
                    Escribe su <span className="font-mono text-emerald-400">usuario@ID</span> arriba o comparte tu ID (<span className="font-mono text-amber-300">{myFullTag}</span>).
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-0.5">
                  {friendsList.map((friend) => (
                    <div
                      key={friend.id}
                      className="bg-[#181922] border border-stone-800 hover:border-emerald-800/60 rounded-xl p-3 flex items-center justify-between gap-2 transition shadow-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-950/70 border border-emerald-700/60 flex items-center justify-center text-emerald-300 font-cinzel font-bold text-xs shrink-0">
                          {friend.displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="font-bold text-stone-100 text-xs truncate">
                              {friend.displayName}
                            </span>
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 shrink-0">
                              @{friend.userTagId}
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-400 font-cinzel block truncate mt-0.5">
                            {friend.role === 'moderator'
                              ? 'Administrador'
                              : friend.role === 'both'
                              ? 'Jugador & DM'
                              : friend.role === 'dm'
                              ? 'Dungeon Master'
                              : 'Jugador'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setChatFriend(friend);
                            setIsChatOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 text-xs font-cinzel font-bold transition flex items-center gap-1 shadow"
                          title="Enviar mensaje privado a este amigo"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span className="hidden sm:inline">Mensaje</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveFriend(friend.id, friend.fullTag)}
                          className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800/70 text-red-300 hover:text-white transition flex items-center justify-center"
                          title="Quitar de mis amigos"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
      </div>

        {/* Right Column: FORUM taking 2/3 of the screen width */}
        <div className="lg:col-span-7 xl:col-span-8 2xl:col-span-8 min-w-0 space-y-4">
          <ForumView
            authUser={authUser}
            onOpenLoginModal={onOpenAuthModal}
            onOpenModeratorPanel={() => {
              if (onOpenModeratorPanel) onOpenModeratorPanel();
              else setIsModeratorPanelOpen(true);
            }}
          />
        </div>
      </div>

      {/* Optional In-Lobby Security View if specifically selected */}
      {activeTab === 'security' && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
          {/* Header */}
          <div className="bg-[#161720] border border-amber-900/60 rounded-3xl p-6 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-500 flex items-center justify-center text-amber-300 shrink-0 shadow-lg">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-cinzel font-bold text-xl text-amber-300">
                Seguridad, Usuario @ ID & Contraseña
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Cuenta de <strong className="text-stone-200">{myFullTag}</strong> ({authUser.email})
              </p>
            </div>
          </div>

          {/* Section: Username (Read-only with Copy) & 3-Character Custom ID */}
          <form
            onSubmit={handleUserChangeTagId}
            className="bg-[#161720] border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
              <h3 className="font-cinzel font-bold text-base text-stone-200 flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                Mi Nombre de Usuario e Identificador (@ID)
              </h3>
              <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-emerald-950/90 border border-emerald-700 text-emerald-300 font-bold">
                {myFullTag}
              </span>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              Para que tus amigos puedan agregarte en el apartado de <strong className="text-emerald-300">Amigos</strong>, compárteles tu nombre de usuario seguido de <span className="font-mono text-amber-300">@</span> y tu ID de hasta 3 caracteres (por ejemplo: <span className="font-mono text-stone-200">usuario1@123</span> o <span className="font-mono text-stone-200">usuario2@top</span>).
            </p>

            {userTagStatusMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{userTagStatusMsg}</span>
              </div>
            )}

            {userTagErrorMsg && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-700 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{userTagErrorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
              {/* Read-only Username */}
              <div className="sm:col-span-6">
                <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                  Nombre de Usuario (Solo Lectura)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={authUser.displayName}
                    readOnly
                    disabled
                    className="w-full bg-[#111216] border border-stone-800 rounded-xl px-3.5 py-2.5 text-stone-300 text-sm font-medium cursor-not-allowed select-all"
                  />
                </div>
                <span className="text-[10px] text-stone-500 mt-1 block">
                  El cambio de nombre de usuario está deshabilitado por el momento.
                </span>
              </div>

              {/* Editable 3-Char Tag ID */}
              <div className="sm:col-span-6">
                <label className="block text-xs font-cinzel font-bold uppercase text-amber-300 mb-1">
                  Tu ID Personalizado (Máx. 3 Caracteres)
                </label>
                <div className="flex items-center bg-[#121316] border border-stone-700 focus-within:border-amber-500 rounded-xl overflow-hidden">
                  <span className="px-3 py-2.5 bg-stone-900 text-amber-400 font-mono font-bold text-sm border-r border-stone-800">
                    @
                  </span>
                  <input
                    type="text"
                    maxLength={3}
                    value={userNewTagId}
                    onChange={(e) => setUserNewTagId(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3))}
                    placeholder="123"
                    required
                    className="w-full bg-transparent px-3 py-2.5 text-amber-200 font-mono font-bold text-sm outline-none"
                  />
                </div>
                <span className="text-[10px] text-stone-500 mt-1 block">
                  Puedes usar números o letras (ej. 123, top, pro).
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-stone-800/80">
              <button
                type="button"
                onClick={handleCopyMyFullTag}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-cinzel font-bold text-xs border border-stone-700 transition flex items-center gap-2"
              >
                {copiedMyTag ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">¡Copiado ({myFullTag})!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-amber-400" />
                    <span>Copiar mi Usuario@ID ({myFullTag})</span>
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={isUpdatingUserTag}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isUpdatingUserTag ? 'Guardando ID...' : 'Guardar Nuevo ID'}
              </button>
            </div>
          </form>

          {/* Form: Change Password */}
          <form
            onSubmit={handleUserChangePassword}
            className="bg-[#161720] border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4"
          >
            <h3 className="font-cinzel font-bold text-base text-stone-200 flex items-center gap-2 border-b border-stone-800 pb-3">
              <Lock className="w-4 h-4 text-amber-400" />
              Cambiar mi Contraseña
            </h3>

            {userPassStatusMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{userPassStatusMsg}</span>
              </div>
            )}

            {userPassErrorMsg && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-700 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{userPassErrorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                Contraseña Actual
              </label>
              <input
                type="password"
                value={userOldPassword}
                onChange={(e) => setUserOldPassword(e.target.value)}
                placeholder="Tu contraseña actual..."
                required
                className="w-full bg-[#121316] border border-stone-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-stone-100 text-sm font-mono outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={userNewPassword}
                  onChange={(e) => setUserNewPassword(e.target.value)}
                  placeholder="Mínimo 3 caracteres..."
                  required
                  className="w-full bg-[#121316] border border-stone-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-stone-100 text-sm font-mono outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={userConfirmPassword}
                  onChange={(e) => setUserConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva clave..."
                  required
                  className="w-full bg-[#121316] border border-stone-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-stone-100 text-sm font-mono outline-none transition"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingUserPass}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isUpdatingUserPass ? 'Guardando...' : 'Actualizar Contraseña'}
              </button>
            </div>
          </form>

          {/* Form: Forgot / Assistance Box */}
          <div className="bg-[#161720] border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <h3 className="font-cinzel font-bold text-base text-stone-200 flex items-center gap-2 border-b border-stone-800 pb-3">
              <HelpCircle className="w-4 h-4 text-blue-400" />
              ¿Olvidaste tu contraseña o necesitas reseteo?
            </h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              Si no recuerdas tu contraseña actual para cambiarla, envía una solicitud formal de restablecimiento al Administrador del servidor. El moderador verá la solicitud en su panel y te asignará una nueva contraseña.
            </p>

            {userForgotMsg ? (
              <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{userForgotMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleUserRequestForgotInLobby} className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-cinzel font-semibold text-stone-400 mb-1">
                    Nota o Mensaje para el Administrador (Opcional):
                  </label>
                  <input
                    type="text"
                    value={userForgotNote}
                    onChange={(e) => setUserForgotNote(e.target.value)}
                    placeholder="Ej. Olvidé mi contraseña, por favor restablecer..."
                    className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-200 text-xs outline-none focus:border-amber-500 transition"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isRequestingForgotInLobby}
                    className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-cinzel font-bold text-xs border border-amber-800/60 shadow transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <Mail className="w-4 h-4" />
                    {isRequestingForgotInLobby ? 'Enviando...' : 'Solicitar Reseteo al Administrador'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ADMIN PANEL DEDICATED OVERLAY MODAL (SOLO ADMINISTRADOR / MODERADOR) */}
      {/* =================================================================== */}
      {(isAdminPanelOpen || isAdminModalOpen || activeTab === 'admin') && isModerator && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 animate-in fade-in">
          <div className="bg-[#14151b] border-2 border-blue-900/80 rounded-3xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Top Bar */}
            <div className="bg-[#181920] border-b border-stone-800 p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-950/70 border border-blue-600/70 flex items-center justify-center text-blue-300">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-cinzel font-black text-base text-blue-200">
                      Panel de Administración WeRoll
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 border border-blue-700/60 text-blue-300 font-bold">
                      v0.9 Alfa
                    </span>
                  </div>
                  <p className="text-xs text-stone-400">
                    Gestión integral de usuarios, asignación de roles, bóvedas de seguridad y respaldos en la nube.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsAdminPanelOpen(false);
                  if (activeTab === 'admin') setActiveTab('characters');
                  if (onCloseAdminModal) onCloseAdminModal();
                }}
                className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition"
                title="Cerrar Panel de Administrador"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-[#101115]">
          {/* Hidden file input for restore (available globally in Admin) */}
          <input
            type="file"
            ref={restoreFileInputRef}
            accept=".json,application/json"
            onChange={handleRestoreFileChange}
            className="hidden"
          />

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-cinzel font-bold bg-blue-950 border border-blue-600/70 text-blue-300 uppercase tracking-widest">
                  Acceso Restringido
                </span>
                <span className="text-xs text-stone-400">Moderador: {authUser.displayName}</span>
              </div>
              <h2 className="font-cinzel font-black text-2xl text-stone-100 flex items-center gap-2.5 mt-1">
                <Shield className="w-6 h-6 text-blue-400" />
                Panel de Control de Administrador
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                Gestión de cuentas y roles, bóveda maestra de respaldos, blog de actualizaciones y configuración del servidor.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => restoreFileInputRef.current?.click()}
                disabled={restoreLoading}
                className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                title="Importar y restaurar un archivo de respaldo completo en el servidor"
              >
                <Upload className="w-4 h-4" />
                {restoreLoading ? 'Restaurando...' : 'Importar Respaldo Total'}
              </button>

              <a
                href="/api/vault/backup-all"
                download
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-2"
                title="Descarga una copia completa de la base de datos (cuentas, contraseñas, fichas, mundos, novedades y feedback)"
              >
                <Download className="w-4 h-4" />
                Descargar Respaldo Total
              </a>
            </div>
          </div>

          {/* Global Admin Restore Status Message */}
          {restoreMessage && (
            <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="font-medium leading-relaxed">{restoreMessage}</span>
              </div>
              <button onClick={() => setRestoreMessage('')} className="p-1 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {restoreError && (
            <div className="p-4 rounded-2xl bg-red-950/80 border border-red-600 text-red-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span className="font-medium leading-relaxed">{restoreError}</span>
              </div>
              <button onClick={() => setRestoreError('')} className="p-1 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Sub-tabs Navigation */}
          <div className="flex items-center gap-2 border-b border-stone-800/80 pb-2 overflow-x-auto">
            <button
              onClick={() => setAdminSubTab('users')}
              className={`px-4 py-2 rounded-xl font-cinzel font-bold text-xs transition flex items-center gap-2 shrink-0 ${
                adminSubTab === 'users'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <Users className="w-4 h-4" />
              Gestión de Cuentas y Roles ({adminUsers.length})
            </button>

            <button
              onClick={() => {
                setAdminSubTab('vault');
                fetchVaultDetails();
              }}
              className={`px-4 py-2 rounded-xl font-cinzel font-bold text-xs transition flex items-center gap-2 shrink-0 ${
                adminSubTab === 'vault'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <Database className="w-4 h-4" />
              Bóveda y Copias de Seguridad ({vaultDetails.sheets.length + vaultDetails.worlds.length})
            </button>

            <button
              onClick={() => setAdminSubTab('autobackup')}
              className={`px-4 py-2 rounded-xl font-cinzel font-bold text-xs transition flex items-center gap-2 shrink-0 ${
                adminSubTab === 'autobackup'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <Clock className="w-4 h-4 text-cyan-400" />
              ☁️ Vincular Cuentas de Respaldo (Drive / GitHub)
            </button>

            <button
              onClick={() => {
                setAdminSubTab('updates');
                fetchAdminChangelog();
              }}
              className={`px-4 py-2 rounded-xl font-cinzel font-bold text-xs transition flex items-center gap-2 shrink-0 ${
                adminSubTab === 'updates'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Blog de Novedades y Versiones ({changelogList.length})
            </button>

            <button
              onClick={() => setAdminSubTab('settings')}
              className={`px-4 py-2 rounded-xl font-cinzel font-bold text-xs transition flex items-center gap-2 shrink-0 ${
                adminSubTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              Configuración del Servidor y Modelos IA
            </button>
          </div>

          {/* =================================================================== */}
          {/* SUB-TAB 1: USER MANAGEMENT & ROLE ASSIGNMENT                        */}
          {/* =================================================================== */}
          {adminSubTab === 'users' && (
            <div className="bg-[#161720] border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-cinzel font-bold text-base text-stone-100 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    Cuentas Registradas, IDs (@ID) y Roles en WeRoll
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Visualiza los IDs (<span className="font-mono text-amber-300">usuario@ID</span>), agrega usuarios registrados/de prueba manualmente, edita correos/IDs o borra cuentas.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminCreateUserOpen(true);
                      setAdminCreateUserMsg('');
                      setAdminCreateUserError('');
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-cinzel font-bold transition flex items-center gap-1.5 shadow"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    + Agregar Usuario (Prueba / Directo)
                  </button>
                  <button
                    onClick={fetchAdminUsers}
                    disabled={isLoadingUsers}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-cinzel transition flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                    Actualizar
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-800 text-stone-500 font-cinzel">
                      <th className="py-2.5 px-3">Usuario, @ID & Correo</th>
                      <th className="py-2.5 px-3">ID Tag & Amigos</th>
                      <th className="py-2.5 px-3">Tipo de Jugador</th>
                      <th className="py-2.5 px-3">Rol en la App</th>
                      <th className="py-2.5 px-3">Estado de Aprobación</th>
                      <th className="py-2.5 px-3">Registro</th>
                      <th className="py-2.5 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {adminUsers.map((u) => {
                      const tagId = u.userTagId || '123';
                      const fullUserTag = `${u.displayName}@${tagId}`;
                      const friendCount = Array.isArray(u.friends) ? u.friends.length : 0;
                      return (
                        <tr key={u.id} className="hover:bg-stone-800/30">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-stone-200 text-xs">{u.displayName}</span>
                              <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-700/60">
                                @{tagId}
                              </span>
                            </div>
                            <span className="font-mono text-[11px] text-stone-400 block">{u.email}</span>
                            {u.passwordResetRequested && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-300 font-bold bg-amber-950/90 border border-amber-600/70 px-2 py-0.5 rounded-full w-fit">
                                <AlertCircle className="w-3 h-3 text-amber-400" />
                                <span>Reseteo Solicitado</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono text-xs text-emerald-300 font-bold block">
                              {fullUserTag}
                            </span>
                            <span className="text-[10px] text-stone-400">
                              {friendCount} {friendCount === 1 ? 'amigo' : 'amigos'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <select
                              value={u.playerType || (u.role === 'dm' ? 'dm' : u.role === 'player' ? 'player' : 'both')}
                              onChange={(e) => handleAdminChangePlayerType(u.id, e.target.value)}
                              className="bg-[#121316] border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-cinzel font-semibold outline-none focus:border-blue-500"
                            >
                              <option value="dm">Dungeon Master únicamente</option>
                              <option value="player">Jugador únicamente</option>
                              <option value="both">DM y Jugador</option>
                            </select>
                          </td>
                          <td className="py-3 px-3">
                            <select
                              value={u.appRole || (u.role === 'admin' ? 'admin' : u.role === 'moderator' ? 'moderator' : 'client')}
                              onChange={(e) => handleAdminChangeAppRole(u.id, e.target.value)}
                              className="bg-[#121316] border border-blue-900/80 rounded-lg px-2.5 py-1 text-xs text-blue-300 font-cinzel font-semibold outline-none focus:border-blue-500"
                            >
                              <option value="client">Cliente</option>
                              <option value="moderator">Moderador</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-cinzel font-bold uppercase inline-block ${
                                u.status === 'approved'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : u.status === 'pending'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                                  : 'bg-red-950 text-red-300 border border-red-800'
                              }`}
                            >
                              {u.status === 'approved'
                                ? 'Aprobado'
                                : u.status === 'pending'
                                ? 'Pendiente por Aprobar'
                                : 'Rechazado'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-stone-400 font-mono text-[11px]">
                            {new Date(u.registeredAt || Date.now()).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                            {/* Edit User / Email / ID Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setAdminEditingUser(u);
                                setAdminEditUserName(u.displayName || '');
                                setAdminEditUserEmail(u.email || '');
                                setAdminEditUserTagId(u.userTagId || '123');
                                setAdminEditUserMsg('');
                                setAdminEditUserError('');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-700 text-blue-200 text-xs font-cinzel font-bold transition inline-flex items-center gap-1"
                              title="Editar nombre de usuario, correo o ID (@ID)"
                            >
                              <Edit className="w-3 h-3 text-blue-300" />
                              <span>Editar ID/Correo</span>
                            </button>

                            {/* Password Management Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setAdminManagingUserPassword(u);
                                setAdminUserNewPassword('');
                                setShowRevealedPassword(false);
                                setAdminUserPassMsg('');
                              }}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-cinzel font-bold transition inline-flex items-center gap-1 ${
                                u.passwordResetRequested
                                  ? 'bg-amber-950 border-amber-500 text-amber-200 animate-pulse'
                                  : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300'
                              }`}
                              title="Ver y gestionar contraseña del usuario"
                            >
                              <KeyRound className="w-3 h-3 text-amber-400" />
                              <span>Clave</span>
                            </button>

                            {/* Inject Sheet or World Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setAdminInjectingUser(u);
                                setInjectTargetType(u.role === 'dm' ? 'world' : 'player');
                                setInjectJsonContent('');
                                setInjectCustomTitle('');
                                setInjectRoomCode('');
                                setInjectRoomPassword('');
                                setInjectStatusMsg('');
                                setInjectErrorMsg('');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-600 text-purple-200 text-xs font-cinzel font-bold transition inline-flex items-center gap-1 shadow"
                              title="Inyectar o restaurar Player Sheet o World Sheet a este usuario"
                            >
                              <FileUp className="w-3 h-3 text-purple-300" />
                              <span>Inyectar</span>
                            </button>

                            {u.status !== 'approved' && (
                              <button
                                onClick={() => handleAdminApproveUser(u.id)}
                                className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-cinzel font-bold text-xs transition shadow"
                              >
                                Aprobar
                              </button>
                            )}
                            {u.status !== 'rejected' && u.role !== 'moderator' && (
                              <button
                                onClick={() => handleAdminRejectUser(u.id)}
                                className="px-3 py-1 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-200 font-cinzel font-bold text-xs transition border border-red-800/60"
                              >
                                Rechazar
                              </button>
                            )}

                            {/* Delete User Account Button */}
                            <button
                              type="button"
                              onClick={() => handleAdminDeleteUser(u)}
                              className="px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-800 border border-red-700/70 text-red-200 text-xs font-cinzel font-bold transition inline-flex items-center gap-1"
                              title="Borrar usuario y correo del servidor"
                            >
                              <Trash2 className="w-3 h-3 text-red-300" />
                              <span>Borrar</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* SUB-TAB 2: BÓVEDA DE COPIAS DE SEGURIDAD (VAULT)                    */}
          {/* =================================================================== */}
          {adminSubTab === 'vault' && (
            <div className="space-y-6">
              {/* Top Action Bar: Master Vault & Full Backup */}
              <div className="bg-gradient-to-r from-[#171822] via-[#1a1b26] to-[#171822] border-2 border-blue-900/60 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-950 border border-blue-500/80 flex items-center justify-center text-blue-200 shrink-0 shadow-lg">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-cinzel font-bold text-lg text-blue-200">
                          Bóveda Maestra & Respaldo Total de la Aplicación
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-950 border border-blue-600/70 text-blue-300 uppercase">
                          Sincronización Total
                        </span>
                      </div>
                      <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
                        Este respaldo exporta e importa absolutamente <strong>todo el estado de WeRoll</strong> en un único archivo JSON: cuentas con contraseñas y roles, fichas de jugadores, World Sheets de DM, respaldos rotativos de partidas, avisos, notas del blog de versiones y el buzón de feedback. Ideal para mover la app entre actualizaciones o respaldar antes de publicar en GitHub.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => restoreFileInputRef.current?.click()}
                      disabled={restoreLoading}
                      className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      {restoreLoading ? 'Restaurando...' : 'Importar Respaldo Total'}
                    </button>

                    <a
                      href="/api/vault/backup-all"
                      download
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Descargar Respaldo Total Maestro
                    </a>
                  </div>
                </div>

                {/* Badges of included elements */}
                <div className="pt-2 border-t border-stone-800/80 flex flex-wrap items-center gap-2 text-[11px] text-stone-400">
                  <span className="text-stone-300 font-cinzel font-bold">Incluido en el Respaldo Maestro:</span>
                  <span className="px-2 py-0.5 rounded-lg bg-[#121316] border border-stone-800 text-stone-300">
                    👥 {adminUsers.length} Cuentas & Roles
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-[#121316] border border-stone-800 text-stone-300">
                    📜 {vaultDetails.sheets.length} Fichas de Jugador
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-[#121316] border border-stone-800 text-stone-300">
                    🏰 {vaultDetails.worlds.length} World Sheets
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-[#121316] border border-stone-800 text-stone-300">
                    🔄 {vaultDetails.backups.length} Respaldos Rotativos
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-[#121316] border border-stone-800 text-stone-300">
                    📰 {changelogList.length} Entradas del Blog
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-[#121316] border border-stone-800 text-stone-300">
                    💬 {adminFeedbackList.length} Sugerencias & Feedback
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-[#121316] border border-stone-800 text-stone-300">
                    ⚙️ Configuración & Avisos
                  </span>
                </div>

                {/* Auto Cloud Backup Status Bar & Manual Action */}
                <div className="mt-3.5 p-3 rounded-xl bg-[#161722] border border-cyan-600/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
                    <div>
                      <span className="font-cinzel font-bold text-cyan-300 block">
                        Último Respaldo en la Nube ({hostSettings.autoBackup?.destination === 'drive' ? 'Google Drive' : hostSettings.autoBackup?.destination === 'github' ? 'GitHub Repo' : hostSettings.autoBackup?.destination === 'webhook' ? 'Webhook' : 'Sin Configurar'}):
                      </span>
                      <span className="text-stone-300 font-mono text-[11px]">
                        {hostSettings.autoBackup?.lastBackupAt
                          ? new Date(hostSettings.autoBackup.lastBackupAt).toLocaleString('es-ES', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : 'Aún no se ha realizado ninguna copia automática'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/admin/vault/trigger-autobackup', { method: 'POST' });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Error al guardar.');
                        alert(data.message || '¡Respaldo enviado a la nube exitosamente!');
                        window.location.reload();
                      } catch (err: any) {
                        alert('Error en respaldo manual: ' + err.message);
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-cinzel font-bold text-xs flex items-center gap-1.5 shrink-0 shadow transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>⚡ Hacer Copia Manual Ahora</span>
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
                <button
                  onClick={() => setVaultFilter('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-cinzel font-semibold transition ${
                    vaultFilter === 'all'
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Todos los Registros
                </button>
                <button
                  onClick={() => setVaultFilter('sheets')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-cinzel font-semibold transition ${
                    vaultFilter === 'sheets'
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Fichas de Jugador ({vaultDetails.sheets.length})
                </button>
                <button
                  onClick={() => setVaultFilter('worlds')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-cinzel font-semibold transition ${
                    vaultFilter === 'worlds'
                      ? 'bg-purple-700 text-white'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  World Sheets del DM ({vaultDetails.worlds.length})
                </button>
                <button
                  onClick={() => setVaultFilter('backups')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-cinzel font-semibold transition ${
                    vaultFilter === 'backups'
                      ? 'bg-blue-600 text-white'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Respaldos Rotativos de Sesión ({vaultDetails.backups.length})
                </button>
              </div>

              {/* 1. Player Sheets Table */}
              {(vaultFilter === 'all' || vaultFilter === 'sheets') && (
                <div className="bg-[#161720] border border-stone-800 rounded-3xl p-6 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-cinzel font-bold text-sm text-amber-300 flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-400" />
                      Fichas de Jugador en Bóveda ({vaultDetails.sheets.length})
                    </h4>
                    <span className="text-[11px] text-stone-500 font-cinzel">Descarga individual disponible</span>
                  </div>

                  {vaultDetails.sheets.length === 0 ? (
                    <p className="text-xs text-stone-500 py-4 text-center">No hay fichas de jugador guardadas en la bóveda.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-stone-800 text-stone-500 font-cinzel">
                            <th className="py-2 px-3">Personaje</th>
                            <th className="py-2 px-3">Propietario</th>
                            <th className="py-2 px-3">Clase & Raza</th>
                            <th className="py-2 px-3">Nivel / PG</th>
                            <th className="py-2 px-3">Última Modificación</th>
                            <th className="py-2 px-3 text-right">Descarga</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800/60">
                          {vaultDetails.sheets.map((s) => (
                            <tr key={s.id} className="hover:bg-stone-800/30">
                              <td className="py-2.5 px-3 font-semibold text-stone-200">{s.name}</td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-stone-400">{s.ownerEmail}</td>
                              <td className="py-2.5 px-3 text-stone-300">
                                {s.character?.race} {s.character?.characterClass}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-stone-300">
                                Nv. {s.character?.level} • {s.character?.currentHp}/{s.character?.maxHp} PG
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500">
                                {new Date(s.updatedAt || Date.now()).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <a
                                  href={`/api/admin/vault/sheet/${s.id}/download`}
                                  download
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-300 font-cinzel font-bold text-[11px] transition shadow"
                                >
                                  <FileDown className="w-3.5 h-3.5" />
                                  Descargar JSON
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 2. World Sheets Table */}
              {(vaultFilter === 'all' || vaultFilter === 'worlds') && (
                <div className="bg-[#161720] border border-stone-800 rounded-3xl p-6 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-cinzel font-bold text-sm text-purple-300 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-purple-400" />
                      World Sheets del Dungeon Master en Bóveda ({vaultDetails.worlds.length})
                    </h4>
                    <span className="text-[11px] text-stone-500 font-cinzel">Descarga individual disponible</span>
                  </div>

                  {vaultDetails.worlds.length === 0 ? (
                    <p className="text-xs text-stone-500 py-4 text-center">No hay World Sheets guardados en la bóveda.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-stone-800 text-stone-500 font-cinzel">
                            <th className="py-2 px-3">Campaña / Mundo</th>
                            <th className="py-2 px-3">Mesa & Contraseña</th>
                            <th className="py-2 px-3">Propietario DM</th>
                            <th className="py-2 px-3">Contenido Archivero</th>
                            <th className="py-2 px-3">Última Modificación</th>
                            <th className="py-2 px-3 text-right">Descarga</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800/60">
                          {vaultDetails.worlds.map((w) => (
                            <tr key={w.id} className="hover:bg-stone-800/30">
                              <td className="py-2.5 px-3 font-semibold text-stone-200">{w.name}</td>
                              <td className="py-2.5 px-3">
                                <span className="font-mono text-amber-300 font-bold bg-[#121316] px-2 py-0.5 rounded border border-stone-800 mr-1.5">
                                  {w.roomCode}
                                </span>
                                {w.roomPassword ? (
                                  <span className="text-[10px] text-amber-400 font-cinzel">Con Clave</span>
                                ) : (
                                  <span className="text-[10px] text-stone-500 font-cinzel">Abierta</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-stone-400">{w.ownerEmail}</td>
                              <td className="py-2.5 px-3 text-stone-300 text-[11px]">
                                {w.workspace?.npcs?.length || 0} NPCs • {w.workspace?.monsters?.length || 0} Monstruos • {w.workspace?.locations?.length || 0} Lugares
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500">
                                {new Date(w.updatedAt || Date.now()).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <a
                                  href={`/api/admin/vault/world/${w.id}/download`}
                                  download
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-300 font-cinzel font-bold text-[11px] transition shadow"
                                >
                                  <FileDown className="w-3.5 h-3.5" />
                                  Descargar JSON
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Rotating Backups Table */}
              {(vaultFilter === 'all' || vaultFilter === 'backups') && (
                <div className="bg-[#161720] border border-stone-800 rounded-3xl p-6 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-cinzel font-bold text-sm text-blue-300 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      Respaldos Rotativos de Sesión ({vaultDetails.backups.length})
                    </h4>
                    <span className="text-[11px] text-stone-500 font-cinzel">2 versiones por sesión por jugador</span>
                  </div>

                  {vaultDetails.backups.length === 0 ? (
                    <p className="text-xs text-stone-500 py-4 text-center">No hay respaldos rotativos registrados aún.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-stone-800 text-stone-500 font-cinzel">
                            <th className="py-2 px-3">Personaje</th>
                            <th className="py-2 px-3">Propietario</th>
                            <th className="py-2 px-3">Slots Guardados</th>
                            <th className="py-2 px-3">Última Rotación</th>
                            <th className="py-2 px-3 text-right">Descarga</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800/60">
                          {vaultDetails.backups.map((b) => (
                            <tr key={b.characterId} className="hover:bg-stone-800/30">
                              <td className="py-2.5 px-3 font-semibold text-stone-200">{b.characterName}</td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-stone-400">{b.ownerEmail}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#121316] border border-stone-700 text-amber-300">
                                  {b.slots?.length || 0} / 2 Versiones
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500">
                                {new Date(b.lastRotatedAt || Date.now()).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <a
                                  href={`/api/admin/vault/backup/${b.characterId}/download`}
                                  download
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-700/60 text-blue-300 font-cinzel font-bold text-[11px] transition shadow"
                                >
                                  <FileDown className="w-3.5 h-3.5" />
                                  Descargar JSON
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* SUB-TAB 5: AUTOMATED BACKUPS & DRIVE / GITHUB ACCOUNT LINKING       */}
          {/* =================================================================== */}
          {adminSubTab === 'autobackup' && (
            <div className="bg-[#161720] border border-cyan-800/80 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                <div>
                  <h3 className="font-cinzel font-bold text-base text-cyan-300 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-cyan-400 animate-pulse" />
                    Vinculación de Cuentas de Respaldo y Automatización en Nube
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Configura y vincula tu cuenta de Google Drive, repositorio de GitHub o Webhook para enviar automáticamente un Respaldo Maestro completo de la base de datos cada 12 o 24 horas.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAdminSaveSettings}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-400 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-2 shrink-0"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Ajustes de Respaldo</span>
                </button>
              </div>

              {/* Section 1: Activation, Event-Driven Instant Backup, Continuous Comparison & Schedule Frequency */}
              <div className="bg-[#121316] border border-stone-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <label className="font-cinzel font-bold text-sm text-amber-300 flex items-center gap-2">
                      <span>Estado del Servicio de Respaldo Automático (Cada 12h / 24h)</span>
                    </label>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Activa la casilla para programar ejecuciones periódicas y sincronización continua en el servidor.
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-2.5 cursor-pointer bg-[#181924] px-4 py-2 rounded-xl border border-cyan-700/60 hover:border-cyan-500 transition">
                    <input
                      type="checkbox"
                      checked={adminSettingsForm.autoBackup?.enabled ?? true}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setAdminSettingsForm((prev) => ({
                          ...prev,
                          autoBackup: {
                            ...prev.autoBackup,
                            enabled,
                            backupOnEveryChange: prev.autoBackup?.backupOnEveryChange ?? true,
                            continuousComparison: prev.autoBackup?.continuousComparison ?? true,
                            frequencyHours: prev.autoBackup?.frequencyHours || 12,
                            destination: prev.autoBackup?.destination || 'drive',
                          },
                        }));
                      }}
                      className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                    />
                    <span className="font-cinzel font-bold text-xs text-cyan-200">
                      {(adminSettingsForm.autoBackup?.enabled ?? true) ? 'AUTOMÁTICO ACTIVADO' : 'DESACTIVADO'}
                    </span>
                  </label>
                </div>

                {/* Checkboxes for Event-Driven Backup on Every Server Change & Continuous Cloud Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-stone-800/80">
                  <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#181924] border border-emerald-700/50 hover:border-emerald-500 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={adminSettingsForm.autoBackup?.backupOnEveryChange ?? true}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setAdminSettingsForm((prev) => ({
                          ...prev,
                          autoBackup: {
                            ...prev.autoBackup,
                            enabled: prev.autoBackup?.enabled ?? true,
                            backupOnEveryChange: val,
                            frequencyHours: prev.autoBackup?.frequencyHours || 12,
                            destination: prev.autoBackup?.destination || 'drive',
                          },
                        }));
                      }}
                      className="w-4 h-4 mt-0.5 accent-emerald-500 rounded cursor-pointer shrink-0"
                    />
                    <div>
                      <span className="font-cinzel font-bold text-xs text-emerald-300 block">
                        Respaldo Instantáneo en Cada Cambio del Servidor
                      </span>
                      <span className="text-[11px] text-stone-400 block mt-0.5 leading-relaxed">
                        Guarda un respaldo automático cada vez que se crea una cuenta, cambia un rol, se aprueba/rechaza un usuario, se crea o actualiza un Player Sheet o World Sheet (Warden), o se edita el Bloc de Notas, Feedback o Configuración.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#181924] border border-cyan-700/50 hover:border-cyan-500 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={adminSettingsForm.autoBackup?.continuousComparison ?? true}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setAdminSettingsForm((prev) => ({
                          ...prev,
                          autoBackup: {
                            ...prev.autoBackup,
                            enabled: prev.autoBackup?.enabled ?? true,
                            continuousComparison: val,
                            frequencyHours: prev.autoBackup?.frequencyHours || 12,
                            destination: prev.autoBackup?.destination || 'drive',
                          },
                        }));
                      }}
                      className="w-4 h-4 mt-0.5 accent-cyan-500 rounded cursor-pointer shrink-0"
                    />
                    <div>
                      <span className="font-cinzel font-bold text-xs text-cyan-300 block">
                        Comparación Continua (Archivo Base vs Nube) & Archivo Pre-Reemplazo
                      </span>
                      <span className="text-[11px] text-stone-400 block mt-0.5 leading-relaxed">
                        Compara constantemente los archivos locales con la nube. Si detecta el Archivo Base descarga el respaldo más actual; si detecta una versión antigua, primero respalda el archivo que va a reemplazar en otro apartado de la nube y luego descarga la versión más actual.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Frequency selector */}
                <div className="pt-3 border-t border-stone-800/80">
                  <label className="block text-xs font-cinzel font-bold text-stone-300 mb-2">
                    Frecuencia de Envío Programado Adicional (12h o 24h):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                    <button
                      type="button"
                      onClick={() => {
                        setAdminSettingsForm((prev) => ({
                          ...prev,
                          autoBackup: {
                            ...prev.autoBackup,
                            enabled: prev.autoBackup?.enabled ?? true,
                            frequencyHours: 12,
                            destination: prev.autoBackup?.destination || 'drive',
                          },
                        }));
                      }}
                      className={`p-3 rounded-xl border text-xs font-cinzel font-bold transition flex items-center justify-center gap-2 ${
                        (adminSettingsForm.autoBackup?.frequencyHours || 12) === 12
                          ? 'bg-cyan-950 border-cyan-500 text-cyan-200 shadow-md ring-1 ring-cyan-500'
                          : 'bg-[#181920] border-stone-800 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>Cada 12 Horas (2 veces al día)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAdminSettingsForm((prev) => ({
                          ...prev,
                          autoBackup: {
                            ...prev.autoBackup,
                            enabled: prev.autoBackup?.enabled ?? true,
                            frequencyHours: 24,
                            destination: prev.autoBackup?.destination || 'drive',
                          },
                        }));
                      }}
                      className={`p-3 rounded-xl border text-xs font-cinzel font-bold transition flex items-center justify-center gap-2 ${
                        (adminSettingsForm.autoBackup?.frequencyHours || 12) === 24
                          ? 'bg-cyan-950 border-cyan-500 text-cyan-200 shadow-md ring-1 ring-cyan-500'
                          : 'bg-[#181920] border-stone-800 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>Cada 24 Horas (1 vez al día)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 2: Destination Account Linking & Form Inputs ("Casillas") */}
              <div className="bg-[#121316] border border-stone-800 rounded-2xl p-5 space-y-4">
                <label className="font-cinzel font-bold text-sm text-cyan-300 block mb-1">
                  Selecciona la Plataforma / Cuenta donde Deseas Guardar la Copia:
                </label>

                {/* Destination Selector Tabs / Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminSettingsForm((prev) => ({
                        ...prev,
                        autoBackup: {
                          ...prev.autoBackup,
                          enabled: prev.autoBackup?.enabled ?? false,
                          frequencyHours: prev.autoBackup?.frequencyHours || 24,
                          destination: 'drive',
                        },
                      }));
                    }}
                    className={`p-3.5 rounded-2xl border text-xs font-cinzel font-bold transition flex items-center gap-3 ${
                      (adminSettingsForm.autoBackup?.destination || 'drive') === 'drive'
                        ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200 shadow-lg ring-1 ring-emerald-500'
                        : 'bg-[#181920] border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-900/50 border border-emerald-600 flex items-center justify-center text-emerald-300 shrink-0">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="block text-stone-100 font-bold">Google Drive</span>
                      <span className="text-[10px] text-stone-400 font-normal">Carpeta o Nube Google</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdminSettingsForm((prev) => ({
                        ...prev,
                        autoBackup: {
                          ...prev.autoBackup,
                          enabled: prev.autoBackup?.enabled ?? false,
                          frequencyHours: prev.autoBackup?.frequencyHours || 24,
                          destination: 'github',
                        },
                      }));
                    }}
                    className={`p-3.5 rounded-2xl border text-xs font-cinzel font-bold transition flex items-center gap-3 ${
                      (adminSettingsForm.autoBackup?.destination || 'drive') === 'github'
                        ? 'bg-purple-950/90 border-purple-500 text-purple-200 shadow-lg ring-1 ring-purple-500'
                        : 'bg-[#181920] border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-purple-900/50 border border-purple-600 flex items-center justify-center text-purple-300 shrink-0">
                      <GitBranch className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="block text-stone-100 font-bold">GitHub Repo</span>
                      <span className="text-[10px] text-stone-400 font-normal">Repositorio Git / Código</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdminSettingsForm((prev) => ({
                        ...prev,
                        autoBackup: {
                          ...prev.autoBackup,
                          enabled: prev.autoBackup?.enabled ?? false,
                          frequencyHours: prev.autoBackup?.frequencyHours || 24,
                          destination: 'webhook',
                        },
                      }));
                    }}
                    className={`p-3.5 rounded-2xl border text-xs font-cinzel font-bold transition flex items-center gap-3 ${
                      (adminSettingsForm.autoBackup?.destination || 'drive') === 'webhook'
                        ? 'bg-amber-950/90 border-amber-500 text-amber-200 shadow-lg ring-1 ring-amber-500'
                        : 'bg-[#181920] border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-900/50 border border-amber-600 flex items-center justify-center text-amber-300 shrink-0">
                      <Webhook className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="block text-stone-100 font-bold">Webhook HTTP</span>
                      <span className="text-[10px] text-stone-400 font-normal">Discord, N8N, Zapier</span>
                    </div>
                  </button>
                </div>

                {/* Fields for Google Drive */}
                {(adminSettingsForm.autoBackup?.destination || 'drive') === 'drive' && (
                  <div className="p-4 bg-[#181924] border border-emerald-800/80 rounded-2xl space-y-4 animate-in fade-in">
                    <div className="flex items-center gap-2 text-emerald-300 font-cinzel font-bold text-xs">
                      <HardDrive className="w-4 h-4 text-emerald-400" />
                      <span>Casillas de Vinculación con Google Drive</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-stone-300 mb-1">
                          Token de Acceso OAuth / Bearer Token (Google Drive):
                        </label>
                        <input
                          type="password"
                          value={adminSettingsForm.autoBackup?.driveAccessToken || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAdminSettingsForm((prev) => ({
                              ...prev,
                              autoBackup: { ...prev.autoBackup, driveAccessToken: val },
                            }));
                          }}
                          placeholder="ya29.a0A..."
                          className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-100 text-xs font-mono outline-none focus:border-emerald-500"
                        />
                        <span className="text-[10px] text-stone-400 block mt-1">
                          Ingresa un Access Token de tu cuenta de Google Drive para subir el respaldo directo.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-300 mb-1">
                          ID de la Carpeta Destino en Google Drive (Opcional):
                        </label>
                        <input
                          type="text"
                          value={adminSettingsForm.autoBackup?.driveFolderId || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAdminSettingsForm((prev) => ({
                              ...prev,
                              autoBackup: { ...prev.autoBackup, driveFolderId: val },
                            }));
                          }}
                          placeholder="ej: 1a2b3c4d5e6f7g8h9i..."
                          className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-100 text-xs font-mono outline-none focus:border-emerald-500"
                        />
                        <span className="text-[10px] text-stone-400 block mt-1">
                          Copia el código al final de la URL de tu carpeta de Google Drive.
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-stone-300 mb-1">
                          Etiqueta o Correo de la Cuenta de Drive Vinculada (Opcional):
                        </label>
                        <input
                          type="text"
                          value={adminSettingsForm.autoBackup?.driveAccountEmail || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAdminSettingsForm((prev) => ({
                              ...prev,
                              autoBackup: { ...prev.autoBackup, driveAccountEmail: val },
                            }));
                          }}
                          placeholder="ej: mi-cuenta-respaldos@gmail.com"
                          className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-100 text-xs outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-amber-300 mb-1">
                          ID de Carpeta en Drive para Respaldos Reemplazados (Pre-Reemplazo):
                        </label>
                        <input
                          type="text"
                          value={adminSettingsForm.autoBackup?.driveArchiveFolderId || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAdminSettingsForm((prev) => ({
                              ...prev,
                              autoBackup: { ...prev.autoBackup, driveArchiveFolderId: val },
                            }));
                          }}
                          placeholder="Opcional: ID de otra carpeta en Drive para archivos reemplazados"
                          className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-100 text-xs font-mono outline-none focus:border-amber-500"
                        />
                        <span className="text-[10px] text-stone-400 block mt-1">
                          Apartado en la nube donde se respalda primero una versión antigua antes de ser reemplazada por la más actual.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fields for GitHub */}
                {adminSettingsForm.autoBackup?.destination === 'github' && (
                  <div className="p-4 bg-[#181924] border border-purple-800/80 rounded-2xl space-y-4 animate-in fade-in">
                    <div className="flex items-center gap-2 text-purple-300 font-cinzel font-bold text-xs">
                      <GitBranch className="w-4 h-4 text-purple-400" />
                      <span>Casillas de Vinculación con Repositorio GitHub</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-stone-300 mb-1">
                          GitHub Personal Access Token (PAT):
                        </label>
                        <input
                          type="password"
                          value={adminSettingsForm.autoBackup?.githubToken || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAdminSettingsForm((prev) => ({
                              ...prev,
                              autoBackup: { ...prev.autoBackup, githubToken: val },
                            }));
                          }}
                          placeholder="ghp_xxxxxxxxxxxx"
                          className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-100 text-xs font-mono outline-none focus:border-purple-500"
                        />
                        <span className="text-[10px] text-stone-400 block mt-1">
                          Token de GitHub con alcance 'repo'.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-300 mb-1">
                          Repositorio Destino (usuario/repo):
                        </label>
                        <input
                          type="text"
                          value={adminSettingsForm.autoBackup?.githubRepo || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAdminSettingsForm((prev) => ({
                              ...prev,
                              autoBackup: { ...prev.autoBackup, githubRepo: val },
                            }));
                          }}
                          placeholder="miusuario/weroll-backups"
                          className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-100 text-xs font-mono outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-stone-300 mb-1">
                          Ruta del Archivo JSON Principal (Más Actual):
                        </label>
                        <input
                          type="text"
                          value={adminSettingsForm.autoBackup?.githubPath || 'backups/weroll-backup-latest.json'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAdminSettingsForm((prev) => ({
                              ...prev,
                              autoBackup: { ...prev.autoBackup, githubPath: val },
                            }));
                          }}
                          placeholder="backups/weroll-backup-latest.json"
                          className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-100 text-xs font-mono outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-amber-300 mb-1">
                          Apartado / Carpeta para Respaldos Reemplazados (Pre-Reemplazo):
                        </label>
                        <input
                          type="text"
                          value={adminSettingsForm.autoBackup?.githubArchivePath || 'backups/replaced-archive'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAdminSettingsForm((prev) => ({
                              ...prev,
                              autoBackup: { ...prev.autoBackup, githubArchivePath: val },
                            }));
                          }}
                          placeholder="backups/replaced-archive"
                          className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-100 text-xs font-mono outline-none focus:border-amber-500"
                        />
                        <span className="text-[10px] text-stone-400 block mt-1">
                          Carpeta donde se guarda primero una versión antigua antes de ser reemplazada por la más actual.
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-purple-900/50 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-[11px] text-stone-400">
                        ¿Deseas desvincular el repositorio o token de GitHub para evitar bloqueos y conflictos de sincronización?
                      </div>
                      <button
                        type="button"
                        onClick={handleUnlinkGithubInAdmin}
                        className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-700/60 text-red-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        <span>Desvincular Cuenta de GitHub</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Fields for Webhook */}
                {adminSettingsForm.autoBackup?.destination === 'webhook' && (
                  <div className="p-4 bg-[#181924] border border-amber-800/80 rounded-2xl space-y-4 animate-in fade-in">
                    <div className="flex items-center gap-2 text-amber-300 font-cinzel font-bold text-xs">
                      <Webhook className="w-4 h-4 text-amber-400" />
                      <span>Casillas de Vinculación por Webhook / Servidor</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1">
                        URL del Webhook Destino:
                      </label>
                      <input
                        type="text"
                        value={adminSettingsForm.autoBackup?.webhookUrl || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAdminSettingsForm((prev) => ({
                            ...prev,
                            autoBackup: { ...prev.autoBackup, webhookUrl: val },
                          }));
                        }}
                        placeholder="https://n8n.tu-servidor.com/webhook/weroll-backup"
                        className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-100 text-xs font-mono outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Status Summary & Manual Execution Trigger */}
              <div className="bg-[#121316] border border-cyan-700/60 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-500 flex items-center justify-center text-cyan-300 shrink-0 shadow-inner">
                      <Clock className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-xs font-cinzel font-bold text-stone-400 block uppercase tracking-wider">
                        Última Vez que se Hizo el Back Up:
                      </span>
                      <span className="text-sm font-mono font-bold text-cyan-200 block">
                        {adminSettingsForm.autoBackup?.lastBackupAt
                          ? new Date(adminSettingsForm.autoBackup.lastBackupAt).toLocaleString('es-ES', {
                              dateStyle: 'full',
                              timeStyle: 'medium',
                            })
                          : 'Aún no se ha registrado ninguna ejecución'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase border ${
                        adminSettingsForm.autoBackup?.lastBackupStatus === 'success'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                          : adminSettingsForm.autoBackup?.lastBackupStatus === 'error'
                          ? 'bg-red-950 text-red-300 border-red-700'
                          : 'bg-stone-800 text-stone-400 border-stone-700'
                      }`}
                    >
                      {adminSettingsForm.autoBackup?.lastBackupStatus === 'success'
                        ? '✓ Éxito'
                        : adminSettingsForm.autoBackup?.lastBackupStatus === 'error'
                        ? '✗ Error'
                        : 'Pendiente'}
                    </span>

                    <button
                      type="button"
                      onClick={handleRunAutoBackupTestInLobby}
                      disabled={autoBackupTestLoading}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{autoBackupTestLoading ? 'Enviando...' : '⚡ Hacer Respaldo Manual Ahora'}</span>
                    </button>
                  </div>
                </div>

                {adminSettingsForm.autoBackup?.lastBackupMessage && (
                  <div className="p-3 rounded-xl bg-[#181924] border border-stone-800 text-xs font-mono text-stone-300">
                    💬 <span className="text-cyan-400 font-bold">Detalles de la última ejecución:</span>{' '}
                    {adminSettingsForm.autoBackup.lastBackupMessage}
                  </div>
                )}

                {autoBackupTestMsg && (
                  <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-600 text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{autoBackupTestMsg}</span>
                  </div>
                )}

                {autoBackupTestError && (
                  <div className="p-3 rounded-xl bg-red-950 border border-red-600 text-red-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{autoBackupTestError}</span>
                  </div>
                )}
              </div>

              {/* Section 3.5: Continuous File Comparison Status & Pre-Replace Cloud Archive ("Apartado de Respaldos Reemplazados") */}
              <div className="bg-[#121316] border border-amber-700/60 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-cinzel font-bold text-sm text-amber-300 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-amber-400" />
                      <span>Monitor de Comparación Continua (Archivo Base vs Nube)</span>
                    </h4>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {syncMetadata?.isBaseState
                        ? 'Estado actual: ARCHIVO BASE (Listo para descargar automáticamente la versión más actual de la nube).'
                        : `Estado actual: ARCHIVO ACTIVO SINCRONIZADO • Revisión #${syncMetadata?.revision || 1} • Último cambio: ${syncMetadata?.lastMutationReason || 'Sincronizado'}`}
                    </p>
                    {syncMetadata?.lastComparisonStatus && (
                      <p className="text-[11px] font-mono text-cyan-300 mt-1">
                        🔍 Última comparación: {syncMetadata.lastComparisonStatus}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleRunManualCloudComparison}
                    disabled={cloudCompareLoading}
                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-2 shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${cloudCompareLoading ? 'animate-spin' : ''}`} />
                    <span>{cloudCompareLoading ? 'Comparando...' : '🔄 Comparar Archivos con la Nube Ahora'}</span>
                  </button>
                </div>

                {/* Apartado de Respaldos Reemplazados (Pre-Replace Safety Archive) */}
                <div className="pt-3 border-t border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-cinzel font-bold text-xs uppercase text-amber-200">
                      Apartado de Respaldos Reemplazados (Guardados antes de descargar versión más actual)
                    </span>
                    <span className="text-[11px] font-mono text-stone-400">
                      {replacedArchive.length} archivo(s) resguardado(s)
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-stone-800 bg-[#161720]">
                    {replacedArchive.length > 0 ? (
                      <div className="divide-y divide-stone-800">
                        {replacedArchive.map((item: any) => (
                          <div
                            key={item.id}
                            className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-[#1c1d29]"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 font-mono text-[10px] font-bold">
                                  Rev #{item.localRevision || 0}
                                </span>
                                <span className="text-stone-200 font-semibold">{item.reason}</span>
                              </div>
                              <div className="text-[10px] font-mono text-stone-400 mt-1">
                                Guardado en: <span className="text-cyan-300">{item.cloudLocation}</span> •{' '}
                                {new Date(item.archivedAt).toLocaleString('es-ES')} ({item.sizeKb} KB)
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={`/api/admin/vault/replaced-archive/${encodeURIComponent(item.id)}/download`}
                                download
                                className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-cinzel font-bold text-[10px] border border-stone-700 transition"
                              >
                                ⬇ Descargar JSON
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRestoreReplacedArchive(item.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-900/60 hover:bg-amber-800 text-amber-200 font-cinzel font-bold text-[10px] border border-amber-700 transition"
                              >
                                ↺ Restaurar Esta Versión
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-stone-500 italic">
                        Aún no se ha reemplazado ningún respaldo antiguo. Cuando el sistema detecte una versión local más antigua que la nube, primero guardará aquí (y en la carpeta de archivo de Drive/GitHub) una copia del archivo antes de reemplazarlo.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 4: History Table */}
              <div className="bg-[#121316] border border-stone-800 rounded-2xl p-5 space-y-3">
                <h4 className="font-cinzel font-bold text-xs uppercase text-stone-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Historial Reciente de Envíos Automáticos (Por Cambio en Servidor y Programados)
                </h4>
                <div className="max-h-52 overflow-y-auto rounded-xl border border-stone-800/80 bg-[#161720]">
                  {adminSettingsForm.autoBackup?.history && adminSettingsForm.autoBackup.history.length > 0 ? (
                    <div className="divide-y divide-stone-800">
                      {adminSettingsForm.autoBackup.history.map((log: AutoBackupLog) => (
                        <div key={log.id} className="p-3 flex items-center justify-between text-xs hover:bg-[#1c1d29]">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                                log.status === 'success'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-red-950 text-red-300 border border-red-800'
                              }`}
                            >
                              {log.status === 'success' ? 'Éxito' : 'Error'}
                            </span>
                            <span className="text-stone-200 font-mono text-[11px]">{log.message}</span>
                          </div>
                          <span className="text-stone-400 font-mono text-[10px]">
                            {new Date(log.timestamp).toLocaleString('es-ES')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-stone-500 italic">
                      No hay registros previos en el historial de respaldos.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* SUB-TAB 3: BLOG DE NOVEDADES Y VERSIONES (CHANGELOG & AVISOS)       */}
          {/* =================================================================== */}
          {adminSubTab === 'updates' && (
            <div className="space-y-6">
              {/* Top Sub-Switcher: Novedades & Versiones vs Sugerencias & Feedback */}
              <div className="flex items-center gap-2 bg-[#121316] p-1.5 rounded-2xl border border-stone-800 w-fit">
                <button
                  type="button"
                  onClick={() => setAdminUpdatesSection('changelog')}
                  className={`px-4 py-2 rounded-xl font-cinzel font-bold text-xs transition flex items-center gap-2 ${
                    adminUpdatesSection === 'changelog'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Novedades, Versiones & Saludo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdminUpdatesSection('feedback');
                    fetchAdminFeedback();
                  }}
                  className={`px-4 py-2 rounded-xl font-cinzel font-bold text-xs transition flex items-center gap-2 ${
                    adminUpdatesSection === 'feedback'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  Sugerencias & Feedback ({adminFeedbackList.length})
                  {adminFeedbackList.some((f) => f.status === 'unread') && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                </button>
              </div>

              {adminUpdatesSection === 'changelog' && (
                <>
              {/* 1. SECCIÓN EXCLUSIVA DE ADMINISTRADOR: SALUDO Y AVISO DE MANTENIMIENTO EN EL LOBBY */}
              <form
                onSubmit={handleSaveAdminGreeting}
                className="bg-[#161720] border-2 border-amber-600/50 rounded-3xl p-6 shadow-xl space-y-4 animate-in fade-in"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-950 border border-amber-500/80 flex items-center justify-center text-amber-300 shrink-0">
                      <Bell className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-cinzel font-bold text-base text-amber-300 flex items-center gap-2">
                        Saludo Personalizado del Administrador (Aviso en el Lobby)
                      </h3>
                      <p className="text-xs text-stone-400 mt-0.5">
                        Este aviso se muestra en el Lobby a todos los usuarios como un mensaje de notificación. Modifícalo aquí para anunciar mantenimientos, eventos o comunicados oficiales.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer bg-[#121316] hover:bg-stone-800 px-4 py-2 rounded-xl border border-stone-700 transition">
                    <input
                      type="checkbox"
                      checked={greetingEnabled}
                      onChange={(e) => setGreetingEnabled(e.target.checked)}
                      className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                    />
                    <span className="text-xs font-cinzel font-bold text-stone-200">
                      Activar Notificación en Lobby
                    </span>
                  </label>
                </div>

                {greetingSaveStatus && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{greetingSaveStatus}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                      Título del Saludo o Aviso
                    </label>
                    <input
                      type="text"
                      value={greetingTitle}
                      onChange={(e) => setGreetingTitle(e.target.value)}
                      placeholder="Ej: Mantenimiento programado hoy a las 23:00 hrs"
                      className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-100 text-xs outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                      Tipo de Notificación
                    </label>
                    <select
                      value={greetingType}
                      onChange={(e) => setGreetingType(e.target.value as any)}
                      className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-100 text-xs outline-none focus:border-amber-500 transition"
                    >
                      <option value="info">🔵 Informativo / General</option>
                      <option value="maintenance">🟡 Mantenimiento Programado</option>
                      <option value="alert">🔴 Alerta de Sistema</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                    Mensaje / Detalles del Comunicado
                  </label>
                  <textarea
                    rows={3}
                    value={greetingMessage}
                    onChange={(e) => setGreetingMessage(e.target.value)}
                    placeholder="Escribe aquí el saludo, instrucciones o la duración estimada del mantenimiento..."
                    className="w-full bg-[#121316] border border-stone-700 rounded-xl p-3.5 text-stone-100 text-xs outline-none focus:border-amber-500 resize-none transition"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Guardar Saludo y Transmitir a Todas las Instancias
                  </button>
                </div>
              </form>

              {/* 2. REGISTRO HISTÓRICO DE VERSIONES & MEJORAS */}
              <div className="bg-[#161720] border border-stone-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                  <div>
                    <h3 className="font-cinzel font-bold text-base text-stone-100 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Blog de Novedades y Registro de Versiones
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Publica nuevas versiones, edita las notas de versiones anteriores o elimínalas del registro público.
                    </p>
                  </div>

                  <button
                    onClick={handleOpenNewChangelogModal}
                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Publicar Nueva Actualización
                  </button>
                </div>

              {changelogList.length === 0 ? (
                <p className="text-xs text-stone-500 py-6 text-center">No hay entradas de actualización en el blog.</p>
              ) : (
                <div className="space-y-4">
                  {changelogList.map((entry, idx) => (
                    <div
                      key={entry.version + idx}
                      className="bg-[#121318] border border-stone-800 hover:border-amber-700/50 rounded-2xl p-4.5 transition shadow"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-600 text-white shadow">
                            v{entry.version}
                          </span>
                          <h4 className="font-cinzel font-bold text-sm text-stone-100">{entry.title}</h4>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-stone-400 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-stone-500" />
                            {entry.date}
                          </span>

                          <button
                            onClick={() => handleOpenEditChangelogModal(entry, idx)}
                            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                            title="Editar esta versión"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteChangelogSubmit(idx)}
                            className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 transition"
                            title="Eliminar del historial"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <ul className="space-y-1.5 mt-2 pl-2">
                        {entry.changes.map((c, cIdx) => (
                          <li key={cIdx} className="text-xs text-stone-300 leading-relaxed flex items-start gap-2">
                            <span className="text-amber-500 font-bold shrink-0">•</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              </div>
              </>
            )}

            {/* 2. SECCIÓN DE FEEDBACK Y SUGERENCIAS DE LA COMUNIDAD */}
            {adminUpdatesSection === 'feedback' && (
              <div className="bg-[#161720] border border-stone-800 rounded-3xl p-6 shadow-xl space-y-5 animate-in fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                  <div>
                    <h3 className="font-cinzel font-bold text-base text-emerald-300 flex items-center gap-2">
                      <MessageSquarePlus className="w-5 h-5 text-emerald-400" />
                      Buzón de Sugerencias y Reportes de la Comunidad ({adminFeedbackList.length})
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Mensajes enviados por aventureros y DMs a través del botón superior de Feedback.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fetchAdminFeedback}
                      disabled={isLoadingFeedback}
                      className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-cinzel transition flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFeedback ? 'animate-spin' : ''}`} />
                      Actualizar
                    </button>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { key: 'all', label: 'Todos', count: adminFeedbackList.length },
                    {
                      key: 'bug',
                      label: '🐛 Bugs / Errores',
                      count: adminFeedbackList.filter((f) => f.category === 'bug').length,
                    },
                    {
                      key: 'suggestion',
                      label: '💡 Sugerencias',
                      count: adminFeedbackList.filter((f) => f.category === 'suggestion').length,
                    },
                    {
                      key: 'other',
                      label: '❓ Otros',
                      count: adminFeedbackList.filter((f) => f.category === 'other').length,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setFeedbackCategoryFilter(tab.key as any)}
                      className={`px-3 py-1.5 rounded-xl font-cinzel font-bold text-xs transition flex items-center gap-1.5 ${
                        feedbackCategoryFilter === tab.key
                          ? 'bg-emerald-700 text-white shadow'
                          : 'bg-[#121316] text-stone-400 hover:text-stone-200 border border-stone-800'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-black/40">
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Feedback Cards */}
                {adminFeedbackList.filter(
                  (f) => feedbackCategoryFilter === 'all' || f.category === feedbackCategoryFilter
                ).length === 0 ? (
                  <div className="py-12 text-center text-xs text-stone-500">
                    No hay mensajes registrados en esta categoría de feedback.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {adminFeedbackList
                      .filter(
                        (f) => feedbackCategoryFilter === 'all' || f.category === feedbackCategoryFilter
                      )
                      .map((fb) => (
                        <div
                          key={fb.id}
                          className={`p-4 rounded-2xl border transition shadow flex flex-col sm:flex-row items-start justify-between gap-4 ${
                            fb.status === 'reviewed'
                              ? 'bg-[#121316]/70 border-stone-800/80 opacity-80'
                              : fb.category === 'bug'
                              ? 'bg-[#1a1214] border-red-900/60'
                              : fb.category === 'suggestion'
                              ? 'bg-[#121915] border-emerald-900/60'
                              : 'bg-[#12151d] border-blue-900/60'
                          }`}
                        >
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-cinzel font-bold uppercase ${
                                  fb.category === 'bug'
                                    ? 'bg-red-950 border border-red-700 text-red-300'
                                    : fb.category === 'suggestion'
                                    ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                                    : 'bg-blue-950 border border-blue-700 text-blue-300'
                                }`}
                              >
                                {fb.category === 'bug'
                                  ? '🐛 Bug / Error'
                                  : fb.category === 'suggestion'
                                  ? '💡 Sugerencia'
                                  : '❓ Otro'}
                              </span>

                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                  fb.status === 'reviewed'
                                    ? 'bg-stone-800 text-emerald-400'
                                    : 'bg-amber-950 text-amber-300 border border-amber-700'
                                }`}
                              >
                                {fb.status === 'reviewed' ? '✓ Revisado' : '● Sin revisar'}
                              </span>

                              <span className="text-[11px] font-mono text-stone-500">
                                {new Date(fb.createdAt || Date.now()).toLocaleString()}
                              </span>
                            </div>

                            <p className="text-xs text-stone-200 leading-relaxed font-sans whitespace-pre-wrap">
                              {fb.description}
                            </p>

                            {(fb.userName || fb.userEmail) && (
                              <div className="text-[11px] text-stone-400 font-cinzel flex items-center gap-2 pt-1">
                                <span>Remitente:</span>
                                <strong className="text-stone-300">{fb.userName || 'Usuario'}</strong>
                                {fb.userEmail && <span className="font-mono text-stone-400">({fb.userEmail})</span>}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleFeedbackStatus(fb.id, fb.status || 'unread')}
                              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-cinzel transition"
                            >
                              {fb.status === 'reviewed' ? 'Marcar pendiente' : 'Marcar revisado'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFeedback(fb.id)}
                              className="p-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 transition"
                              title="Eliminar mensaje"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
            </div>
          )}

          {/* =================================================================== */}
          {/* SUB-TAB 4: SERVER SETTINGS & AI MODELS CONFIGURATION                */}
          {/* =================================================================== */}
          {adminSubTab === 'settings' && (
            <form onSubmit={handleAdminSaveSettings} className="bg-[#161720] border border-stone-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="font-cinzel font-bold text-base text-stone-100 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-400" />
                  Configuración del Servidor y Modelos IA
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Personaliza títulos, selección de modelos Gemini oficiales, clave de moderador y mensaje de rechazo de cuentas.
                </p>
              </div>

              {adminSaveMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{adminSaveMessage}</span>
                </div>
              )}

              {/* General App Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                    Título de la Aplicación
                  </label>
                  <input
                    type="text"
                    value={adminSettingsForm.headerTitle || ''}
                    onChange={(e) => setAdminSettingsForm({ ...adminSettingsForm, headerTitle: e.target.value })}
                    className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-200 text-xs outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                    Subtítulo / Versión
                  </label>
                  <input
                    type="text"
                    value={adminSettingsForm.headerSubtitle || ''}
                    onChange={(e) => setAdminSettingsForm({ ...adminSettingsForm, headerSubtitle: e.target.value })}
                    className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-200 text-xs outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                    Contraseña Maestra de Moderador
                  </label>
                  <input
                    type="text"
                    value={adminSettingsForm.moderatorPassword || 'admin'}
                    onChange={(e) => setAdminSettingsForm({ ...adminSettingsForm, moderatorPassword: e.target.value })}
                    className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-200 text-xs font-mono outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                    Gemini API Key (Opcional - Servidor usa env por defecto)
                  </label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={adminSettingsForm.apiKeyOverride || ''}
                    onChange={(e) => setAdminSettingsForm({ ...adminSettingsForm, apiKeyOverride: e.target.value })}
                    className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-200 text-xs font-mono outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* BRAND LOGO CUSTOMIZATION SECTION */}
              <div className="p-5 rounded-2xl bg-[#121316] border border-amber-900/60 shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-3">
                  <div>
                    <h4 className="font-cinzel font-bold text-sm text-amber-300 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-400" />
                      Personalización del Logo de WeRoll
                    </h4>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Sube tu propio archivo de imagen (JPG, PNG, WebP) o elige entre la lista de iconos prefabricados D&D.
                    </p>
                  </div>

                  {/* Live Preview Box */}
                  <div className="px-3.5 py-2 rounded-xl bg-[#181920] border border-stone-800 flex items-center gap-3">
                    <span className="text-[10px] font-cinzel font-semibold uppercase text-stone-500">Vista Previa:</span>
                    <BrandLogo hostSettings={adminSettingsForm} size="md" />
                    <div>
                      <span className="font-cinzel font-bold text-xs text-amber-300 block leading-none">
                        {adminSettingsForm.headerTitle || 'WeRoll'}
                      </span>
                      <span className="text-[9px] text-stone-400 font-cinzel block mt-0.5">
                        {adminSettingsForm.headerSubtitle || 'Companion 5E'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hidden File Input for Logo Image */}
                <input
                  type="file"
                  ref={logoFileInputRef}
                  accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/svg+xml"
                  onChange={handleLogoFileUpload}
                  className="hidden"
                />

                {/* Logo Type Selector: Prefab Icons vs Custom Upload */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdminSettingsForm({ ...adminSettingsForm, logoType: 'icon' })}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 ${
                      (adminSettingsForm.logoType || 'icon') === 'icon'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500'
                        : 'bg-[#161720] border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-900/40 border border-amber-600/60 flex items-center justify-center text-amber-300 shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-cinzel font-bold text-xs block text-stone-200">Iconos Prefabricados D&D</span>
                      <span className="text-[10px] text-stone-400 block">Escudos, dragones, espadas, dados, pergaminos...</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdminSettingsForm({ ...adminSettingsForm, logoType: 'custom' });
                      if (!adminSettingsForm.customLogoUrl) {
                        logoFileInputRef.current?.click();
                      }
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 ${
                      adminSettingsForm.logoType === 'custom'
                        ? 'bg-purple-950/80 border-purple-500 text-purple-200 shadow-md ring-1 ring-purple-500'
                        : 'bg-[#161720] border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-900/40 border border-purple-600/60 flex items-center justify-center text-purple-300 shrink-0">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-cinzel font-bold text-xs block text-stone-200">Subir Logo Propio (JPG / PNG)</span>
                      <span className="text-[10px] text-stone-400 block">Usa la imagen de tu propia marca o servidor</span>
                    </div>
                  </button>
                </div>

                {/* Option A: Prefabricated Icons Selection */}
                {(adminSettingsForm.logoType || 'icon') === 'icon' && (
                  <div className="space-y-2 pt-1 animate-in fade-in">
                    <label className="block text-[11px] font-cinzel font-bold uppercase text-stone-400">
                      Selecciona un Icono de la Lista Prefabricada:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1 pr-2">
                      {PREFAB_LOGOS.map((item) => {
                        const IconComp = item.icon;
                        const isSelected =
                          (adminSettingsForm.headerLogoIcon || 'shield') === item.id ||
                          adminSettingsForm.logoIcon === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              setAdminSettingsForm({
                                ...adminSettingsForm,
                                logoType: 'icon',
                                headerLogoIcon: item.id,
                                logoIcon: item.id,
                              })
                            }
                            className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                              isSelected
                                ? 'bg-amber-950/90 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500 scale-[1.02]'
                                : 'bg-[#161720] border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                            }`}
                          >
                            <IconComp className={`w-5 h-5 ${isSelected ? 'text-amber-400' : 'text-stone-400'}`} />
                            <span className="text-[10px] font-cinzel font-semibold truncate w-full">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Option B: Custom Image Upload */}
                {adminSettingsForm.logoType === 'custom' && (
                  <div className="space-y-3 pt-1 animate-in fade-in bg-[#161720] border border-stone-800 rounded-2xl p-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div>
                        <span className="block text-xs font-cinzel font-bold text-stone-200">
                          Imagen Personalizada de la Marca
                        </span>
                        <span className="text-[11px] text-stone-400 block">
                          Formatos recomendados: PNG o JPG con fondo transparente o cuadrado de alto contraste.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-cinzel font-bold text-xs shadow transition flex items-center gap-2 shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {adminSettingsForm.customLogoUrl ? 'Cambiar Imagen JPG/PNG' : 'Seleccionar Archivo JPG/PNG'}
                      </button>
                    </div>

                    {adminSettingsForm.customLogoUrl ? (
                      <div className="p-3 bg-[#121316] border border-stone-800 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={adminSettingsForm.customLogoUrl}
                            alt="Custom Logo Preview"
                            className="w-12 h-12 rounded-xl object-cover border border-purple-500/80 shadow"
                          />
                          <div>
                            <span className="text-xs font-cinzel font-bold text-purple-300 block">
                              Imagen Personalizada Cargada
                            </span>
                            <span className="text-[10px] text-stone-500 font-mono block">
                              data:image/... ({Math.round(adminSettingsForm.customLogoUrl.length / 1024)} KB)
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setAdminSettingsForm({
                              ...adminSettingsForm,
                              logoType: 'icon',
                              customLogoUrl: undefined,
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-red-950 hover:text-red-300 text-stone-400 text-xs font-cinzel transition border border-stone-700"
                        >
                          Quitar Imagen
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => logoFileInputRef.current?.click()}
                        className="p-6 border-2 border-dashed border-stone-700 hover:border-purple-500 rounded-xl text-center cursor-pointer transition bg-[#121316]"
                      >
                        <Upload className="w-8 h-8 text-stone-500 mx-auto mb-2" />
                        <span className="text-xs font-cinzel font-bold text-stone-300 block">
                          Haz clic aquí para seleccionar tu imagen JPG o PNG
                        </span>
                        <span className="text-[10px] text-stone-500 block mt-0.5">
                          Formatos aceptados: PNG, JPG, JPEG, WEBP, GIF, SVG
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Gemini Models Selection (Only Gemini Flash Light Latest & Gemini Flash Latest + Manual custom option) */}
              <div className="p-4 rounded-2xl bg-[#121316] border border-stone-800 space-y-3">
                <label className="block text-xs font-cinzel font-bold uppercase text-blue-300">
                  Modelo Gemini para El Sabio Arcano y Asistente IA
                </label>
                <p className="text-[11px] text-stone-400">
                  Selecciona uno de los dos modelos recomendados o introduce manualmente el nombre de versión que desees.
                </p>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-stone-800 hover:border-blue-600/60 bg-[#161720] cursor-pointer transition">
                    <input
                      type="radio"
                      name="aiModelSelect"
                      checked={!isCustomAiModel && adminSettingsForm.aiModel === 'gemini-flash-lite-latest'}
                      onChange={() => {
                        setIsCustomAiModel(false);
                        setAdminSettingsForm({ ...adminSettingsForm, aiModel: 'gemini-flash-lite-latest' });
                      }}
                      className="accent-blue-500"
                    />
                    <div>
                      <span className="font-cinzel font-bold text-xs text-stone-200 block">Gemini Flash Light Latest</span>
                      <span className="text-[11px] text-stone-400">Alta velocidad y bajo consumo (gemini-flash-lite-latest)</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-stone-800 hover:border-blue-600/60 bg-[#161720] cursor-pointer transition">
                    <input
                      type="radio"
                      name="aiModelSelect"
                      checked={!isCustomAiModel && adminSettingsForm.aiModel === 'gemini-flash-latest'}
                      onChange={() => {
                        setIsCustomAiModel(false);
                        setAdminSettingsForm({ ...adminSettingsForm, aiModel: 'gemini-flash-latest' });
                      }}
                      className="accent-blue-500"
                    />
                    <div>
                      <span className="font-cinzel font-bold text-xs text-stone-200 block">Gemini Flash Latest</span>
                      <span className="text-[11px] text-stone-400">Excelente equilibrio de razonamiento y rapidez (gemini-flash-latest)</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-stone-800 hover:border-blue-600/60 bg-[#161720] cursor-pointer transition">
                    <input
                      type="radio"
                      name="aiModelSelect"
                      checked={isCustomAiModel}
                      onChange={() => setIsCustomAiModel(true)}
                      className="accent-blue-500"
                    />
                    <div>
                      <span className="font-cinzel font-bold text-xs text-stone-200 block">Especificar Versión Manualmente</span>
                      <span className="text-[11px] text-stone-400">Permite escribir cualquier identificador de modelo personalizado</span>
                    </div>
                  </label>

                  {isCustomAiModel && (
                    <div className="pt-2 pl-6">
                      <input
                        type="text"
                        placeholder="Ej: gemini-3.8-flash o gemini-2.5-flash"
                        value={customAiModelText}
                        onChange={(e) => {
                          setCustomAiModelText(e.target.value);
                          setAdminSettingsForm({ ...adminSettingsForm, aiModel: e.target.value });
                        }}
                        className="w-full max-w-md bg-[#161720] border border-blue-600/80 rounded-xl px-3.5 py-2 text-stone-100 font-mono text-xs outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Mensaje Personalizado de Rechazo */}
              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-red-300 mb-1">
                  Mensaje Personalizado para Cuentas Rechazadas
                </label>
                <p className="text-[11px] text-stone-400 mb-2">
                  Este mensaje se mostrará inmediatamente a los usuarios cuando intenten ingresar tras ser rechazados.
                </p>
                <textarea
                  rows={3}
                  value={
                    adminSettingsForm.rejectionCustomMessage ||
                    'Lo lamentamos, por el momento no puedes acceder a WeRoll. Manda mensaje a soporte@weroll.app si quieres una revisión manual de tu caso.'
                  }
                  onChange={(e) =>
                    setAdminSettingsForm({ ...adminSettingsForm, rejectionCustomMessage: e.target.value })
                  }
                  placeholder="Lo lamentamos, por el momento no puedes acceder a WeRoll, manda mensaje a ejemplo@com si quieres una revision manual de tu caso"
                  className="w-full bg-[#121316] border border-stone-700 rounded-xl p-3 text-stone-200 text-xs font-sans outline-none focus:border-red-500 resize-none leading-relaxed"
                />
              </div>

              {/* Saludo Sabio Arcano */}
              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                  Saludo Personalizado del Sabio Arcano
                </label>
                <textarea
                  rows={2}
                  value={adminSettingsForm.oracleWelcomeMessage || ''}
                  onChange={(e) =>
                    setAdminSettingsForm({ ...adminSettingsForm, oracleWelcomeMessage: e.target.value })
                  }
                  className="w-full bg-[#121316] border border-stone-700 rounded-xl p-3 text-stone-200 text-xs outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-cinzel font-bold text-xs shadow-lg transition"
                >
                  Guardar Configuración en el Servidor
                </button>
              </div>
            </form>
          )}

          {/* =================================================================== */}
          {/* MODAL: EDIT / CREATE CHANGELOG ENTRY                                */}
          {/* =================================================================== */}
          {isChangelogEditModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
              <div className="w-full max-w-lg bg-[#181922] border-2 border-amber-900/80 rounded-3xl p-6 shadow-2xl text-stone-200">
                <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-600/30 border border-amber-500 flex items-center justify-center text-amber-300">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-cinzel font-bold text-base text-amber-300">
                        {editingChangelogIdx === -1 ? 'Publicar Nueva Versión' : 'Editar Actualización'}
                      </h3>
                      <p className="text-[11px] text-stone-400">
                        Actualiza el registro de novedades visible para toda la comunidad
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsChangelogEditModalOpen(false)}
                    className="p-1 rounded-lg text-stone-400 hover:text-stone-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveChangelogSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                        Versión (ej. 0.2)
                      </label>
                      <input
                        type="text"
                        required
                        value={changelogFormVersion}
                        onChange={(e) => setChangelogFormVersion(e.target.value)}
                        className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-mono text-xs outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                        Fecha (AAAA-MM-DD)
                      </label>
                      <input
                        type="date"
                        required
                        value={changelogFormDate}
                        onChange={(e) => setChangelogFormDate(e.target.value)}
                        className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-mono text-xs outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                      Título de la Actualización
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Bóveda de Servidor, Seguridad de Roles y Modelos IA"
                      value={changelogFormTitle}
                      onChange={(e) => setChangelogFormTitle(e.target.value)}
                      className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-100 text-xs outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                      Cambios / Novedades (Una por línea)
                    </label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Novedad 1&#10;Novedad 2&#10;Novedad 3"
                      value={changelogFormChanges}
                      onChange={(e) => setChangelogFormChanges(e.target.value)}
                      className="w-full bg-[#121316] border border-stone-700 rounded-xl p-3 text-stone-100 text-xs outline-none focus:border-amber-500 font-sans leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsChangelogEditModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs text-stone-400 hover:text-stone-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold text-xs shadow-lg transition"
                    >
                      Guardar Novedad
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: JOIN TABLE AS PLAYER                                         */}
      {/* =================================================================== */}
      {joinModalChar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#181922] border-2 border-amber-900/80 rounded-3xl p-6 shadow-2xl text-stone-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600/30 border border-amber-500 flex items-center justify-center text-amber-300">
                  <Play className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="font-cinzel font-bold text-lg text-amber-300">
                    Entrar a Mesa en Vivo
                  </h3>
                  <p className="text-xs text-stone-400">
                    Personaje: <strong className="text-stone-200">{joinModalChar.name}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setJoinModalChar(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {joinError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs leading-relaxed flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{joinError}</span>
              </div>
            )}

            <form onSubmit={handleJoinTableSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1.5">
                  Nombre o Código de la Mesa del DM
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: MESA-DRAGON"
                  value={joinRoomCode}
                  onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#121316] border border-stone-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-stone-100 font-mono text-sm uppercase outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1.5">
                  Contraseña de la Mesa (Si el DM la configuró)
                </label>
                <input
                  type="password"
                  placeholder="Contraseña establecida por el DM..."
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  className="w-full bg-[#121316] border border-stone-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-stone-100 text-sm outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 text-[11px] text-stone-400 leading-relaxed">
                ℹ️ Si el Dungeon Master no ha abierto aún la mesa o la contraseña no coincide, no podrás entrar.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setJoinModalChar(null)}
                  className="px-4 py-2 rounded-xl text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isVerifyingJoin}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold text-xs shadow-lg transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isVerifyingJoin ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    'Entrar a la Partida'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CREATE WORLD SHEET                                           */}
      {/* =================================================================== */}
      {isCreateWorldOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#181924] border-2 border-purple-900/80 rounded-3xl p-6 shadow-2xl text-stone-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-700/30 border border-purple-500 flex items-center justify-center text-purple-300">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-cinzel font-bold text-lg text-purple-300">
                    Nuevo World Sheet de DM
                  </h3>
                  <p className="text-xs text-stone-400">
                    Nueva pantalla de campaña independiente desde cero.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCreateWorldOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {worldCreateError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs">
                {worldCreateError}
              </div>
            )}

            <form onSubmit={handleCreateWorldSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                  Nombre del World Sheet
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Campaña de la Costa de la Espada"
                  value={newWorldName}
                  onChange={(e) => setNewWorldName(e.target.value)}
                  className="w-full bg-[#121316] border border-stone-700 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-stone-100 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                  Código o Nombre de la Mesa para Jugadores
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: MESA-DRAGON"
                  value={newWorldRoomCode}
                  onChange={(e) => setNewWorldRoomCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#121316] border border-stone-700 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-stone-100 font-mono text-sm uppercase outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                  Contraseña de la Mesa (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Dejar en blanco para acceso público"
                  value={newWorldPassword}
                  onChange={(e) => setNewWorldPassword(e.target.value)}
                  className="w-full bg-[#121316] border border-stone-700 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-stone-100 text-sm outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#121316] border border-stone-800 text-[11px] text-stone-400 leading-relaxed">
                ✨ <strong>Lienzo Limpio:</strong> Las carpetas, NPCs, monstruos y lugares comenzarán desde cero para esta campaña, con acceso al compendio genérico SRD.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateWorldOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSavingWorld}
                  className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-cinzel font-bold text-xs shadow-lg transition"
                >
                  {isSavingWorld ? 'Creando...' : 'Crear World Sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: EDIT WORLD SHEET CONFIG                                      */}
      {/* =================================================================== */}
      {editingWorld && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#181924] border-2 border-purple-900/80 rounded-3xl p-6 shadow-2xl text-stone-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-cinzel font-bold text-lg text-purple-300">
                  Editar Configuración de Mesa
                </h3>
                <p className="text-xs text-stone-400">
                  Actualiza el nombre, código o contraseña de acceso.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingWorld(null);
                  setWorldCreateError('');
                }}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {worldCreateError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{worldCreateError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateWorldSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                  Nombre del World Sheet
                </label>
                <input
                  type="text"
                  required
                  value={editWorldName}
                  onChange={(e) => setEditWorldName(e.target.value)}
                  className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-100 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                  Código de la Mesa
                </label>
                <input
                  type="text"
                  required
                  value={editWorldRoomCode}
                  onChange={(e) => setEditWorldRoomCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-100 font-mono text-sm uppercase outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                  Contraseña de la Mesa
                </label>
                <input
                  type="text"
                  placeholder="Sin contraseña (pública)"
                  value={editWorldPassword}
                  onChange={(e) => setEditWorldPassword(e.target.value)}
                  className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-100 text-sm outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingWorld(null)}
                  className="px-4 py-2 rounded-xl text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-cinzel font-bold text-xs shadow-lg transition"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* CONFIRMATION: DELETE CHARACTER                                      */}
      {/* =================================================================== */}
      {charToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#181922] border-2 border-red-900/80 rounded-3xl p-6 shadow-2xl text-stone-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-700 text-red-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-cinzel font-bold text-lg text-red-300">
              ¿Eliminar Personaje?
            </h3>
            <p className="text-xs text-stone-400 mt-2 leading-relaxed">
              Estás a punto de eliminar a <strong className="text-stone-200">{charToDelete.name}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setCharToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs text-stone-400 hover:text-stone-200"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const id = charToDelete.id;
                  setCharToDelete(null);
                  await onDeleteCharacter(id);
                  fetchUserSheets();
                }}
                className="px-5 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-cinzel font-bold text-xs shadow-lg transition"
              >
                Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* CONFIRMATION: DELETE WORLD SHEET                                    */}
      {/* =================================================================== */}
      {worldToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#191924] border-2 border-red-900/80 rounded-3xl p-6 shadow-2xl text-stone-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-700 text-red-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-cinzel font-bold text-lg text-red-300">
              ¿Eliminar World Sheet?
            </h3>
            <p className="text-xs text-stone-400 mt-2 leading-relaxed">
              Estás a punto de eliminar <strong className="text-stone-200">{worldToDelete.name}</strong>. Se perderán todos sus NPCs, monstruos y notas.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setWorldToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs text-stone-400 hover:text-stone-200"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const id = worldToDelete.id;
                  setWorldToDelete(null);
                  await onDeleteWorldSheet(id);
                }}
                className="px-5 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-cinzel font-bold text-xs shadow-lg transition"
              >
                Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADMIN MANAGE USER PASSWORD                                   */}
      {/* =================================================================== */}
      {adminManagingUserPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-[#181922] border-2 border-amber-900/80 rounded-3xl p-6 shadow-2xl text-stone-200">
            <div className="flex items-start justify-between border-b border-stone-800 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-600/70 flex items-center justify-center text-amber-300">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-cinzel font-bold text-base text-amber-300">
                    Gestionar Contraseña
                  </h3>
                  <p className="text-xs text-stone-400">
                    Usuario: <strong className="text-stone-200">{adminManagingUserPassword.displayName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminManagingUserPassword(null)}
                className="p-1 rounded text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {adminUserPassMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{adminUserPassMsg}</span>
              </div>
            )}

            {adminManagingUserPassword.passwordResetRequested && (
              <div className="mb-4 p-3.5 rounded-xl bg-amber-950/80 border border-amber-600/70 text-xs text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-cinzel font-bold text-amber-300">
                  <AlertCircle className="w-4 h-4" />
                  <span>Este usuario solicitó restablecimiento</span>
                </div>
                {adminManagingUserPassword.passwordResetNote && (
                  <p className="text-[11px] text-stone-300 font-sans italic">
                    "{adminManagingUserPassword.passwordResetNote}"
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleAdminUpdateUserPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                  Contraseña Actual del Usuario
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showRevealedPassword ? 'text' : 'password'}
                    readOnly
                    value={adminManagingUserPassword.password || '(Sin registrar)'}
                    className="w-full bg-[#121316] border border-stone-800 rounded-xl px-3.5 py-2.5 text-stone-300 text-sm font-mono pr-10 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRevealedPassword((prev) => !prev)}
                    className="absolute right-3 text-stone-400 hover:text-amber-300 transition"
                    title={showRevealedPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showRevealedPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  Puedes ver la contraseña actual para entregársela al usuario si se le olvidó.
                </p>
              </div>

              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                  Asignar Nueva Contraseña
                </label>
                <input
                  type="text"
                  value={adminUserNewPassword}
                  onChange={(e) => setAdminUserNewPassword(e.target.value)}
                  placeholder="Escribe la nueva contraseña..."
                  required
                  className="w-full bg-[#121316] border border-stone-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-stone-100 text-sm font-mono outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setAdminManagingUserPassword(null)}
                  className="px-4 py-2 rounded-xl text-xs text-stone-400 hover:text-stone-200"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={isAdminSavingUserPassword}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isAdminSavingUserPassword ? 'Guardando...' : 'Guardar Nueva Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADMIN INJECT PLAYER SHEET OR WORLD SHEET TO USER             */}
      {/* =================================================================== */}
      {adminInjectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-[#181922] border-2 border-purple-900/80 rounded-3xl p-6 sm:p-7 shadow-2xl text-stone-200 max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-start justify-between border-b border-stone-800 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-600/70 flex items-center justify-center text-purple-300">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-cinzel font-bold text-base text-purple-300">
                    Inyectar Datos / Ficha a Usuario
                  </h3>
                  <p className="text-xs text-stone-400">
                    Destino: <strong className="text-stone-200">{adminInjectingUser.displayName}</strong> ({adminInjectingUser.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminInjectingUser(null)}
                className="p-1 rounded text-stone-400 hover:text-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {injectStatusMsg && (
              <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{injectStatusMsg}</span>
              </div>
            )}

            {injectErrorMsg && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-950/80 border border-red-700 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{injectErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAdminExecuteInject} className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Type Selection: Player Sheet vs World Sheet */}
              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1.5">
                  Tipo de Elemento a Inyectar
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setInjectTargetType('player')}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                      injectTargetType === 'player'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500'
                        : 'bg-[#121316] border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <User className="w-4 h-4 text-amber-400" />
                    <span className="font-cinzel font-bold text-xs">Ficha de Jugador</span>
                    <span className="text-[10px] text-stone-500">Player Sheet D&D 5E</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInjectTargetType('world')}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                      injectTargetType === 'world'
                        ? 'bg-purple-950/80 border-purple-500 text-purple-200 shadow-md ring-1 ring-purple-500'
                        : 'bg-[#121316] border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <Crown className="w-4 h-4 text-purple-400" />
                    <span className="font-cinzel font-bold text-xs">World Sheet DM</span>
                    <span className="text-[10px] text-stone-500">Pantalla & Mesa del DM</span>
                  </button>
                </div>
              </div>

              {/* Upload File Button & Hidden Input */}
              <div>
                <input
                  type="file"
                  ref={injectFileInputRef}
                  accept=".json,application/json"
                  onChange={handleInjectFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => injectFileInputRef.current?.click()}
                  className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-cinzel font-bold text-xs transition flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4 text-purple-400" />
                  Cargar Archivo JSON desde mi PC
                </button>
              </div>

              {/* Custom Title / Name */}
              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                  Nombre Personalizado (Opcional)
                </label>
                <input
                  type="text"
                  value={injectCustomTitle}
                  onChange={(e) => setInjectCustomTitle(e.target.value)}
                  placeholder={injectTargetType === 'player' ? 'Ej. Sir Roland Restaurado' : 'Ej. Campaña El Ojo de Fuego'}
                  className="w-full bg-[#121316] border border-stone-700 focus:border-purple-500 rounded-xl px-3 py-2 text-stone-100 text-xs outline-none"
                />
              </div>

              {/* If World Sheet: Room Code & Password */}
              {injectTargetType === 'world' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-cinzel font-semibold text-stone-400 mb-1">
                      Código de Mesa (Opcional)
                    </label>
                    <input
                      type="text"
                      value={injectRoomCode}
                      onChange={(e) => setInjectRoomCode(e.target.value.toUpperCase())}
                      placeholder="MESA-RESTORE"
                      className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-mono text-xs uppercase outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-cinzel font-semibold text-stone-400 mb-1">
                      Contraseña de Mesa (Opcional)
                    </label>
                    <input
                      type="text"
                      value={injectRoomPassword}
                      onChange={(e) => setInjectRoomPassword(e.target.value)}
                      placeholder="Opcional..."
                      className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-100 text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* JSON Raw Content */}
              <div>
                <label className="block text-xs font-cinzel font-bold uppercase text-stone-400 mb-1">
                  Contenido JSON de la Ficha o Mundo
                </label>
                <textarea
                  rows={6}
                  value={injectJsonContent}
                  onChange={(e) => setInjectJsonContent(e.target.value)}
                  placeholder="Pega aquí el objeto JSON del personaje o del World Sheet..."
                  required
                  className="w-full bg-[#121316] border border-stone-700 focus:border-purple-500 rounded-xl p-3 text-stone-200 font-mono text-[11px] outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setAdminInjectingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isInjectingData}
                  className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  {isInjectingData ? 'Inyectando...' : 'Inyectar y Guardar en la Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADMIN CREATE / ADD USER DIRECTLY (FOR TEST OR REGISTERED)    */}
      {/* =================================================================== */}
      {isAdminCreateUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#161720] border border-emerald-700/70 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-cinzel font-bold text-base text-stone-100">
                  Agregar Usuario Registrado / De Prueba
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminCreateUserOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminCreateUserSubmit} className="space-y-3.5">
              {adminCreateUserMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-600 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{adminCreateUserMsg}</span>
                </div>
              )}
              {adminCreateUserError && (
                <div className="p-3 rounded-xl bg-red-950/90 border border-red-600 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{adminCreateUserError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-cinzel font-bold uppercase text-stone-400 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={adminNewUserEmail}
                  onChange={(e) => setAdminNewUserEmail(e.target.value)}
                  placeholder="usuario.prueba@ejemplo.com"
                  required
                  className="w-full bg-[#121316] border border-stone-700 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-stone-100 text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-8">
                  <label className="block text-[11px] font-cinzel font-bold uppercase text-stone-400 mb-1">
                    Nombre / Usuario
                  </label>
                  <input
                    type="text"
                    value={adminNewUserName}
                    onChange={(e) => setAdminNewUserName(e.target.value)}
                    placeholder="Ej. JugadorPrueba"
                    required
                    className="w-full bg-[#121316] border border-stone-700 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-stone-100 text-xs outline-none"
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-[11px] font-cinzel font-bold uppercase text-amber-300 mb-1">
                    ID (3 Caract.)
                  </label>
                  <div className="flex items-center bg-[#121316] border border-stone-700 focus-within:border-amber-500 rounded-xl overflow-hidden">
                    <span className="px-2 py-2 bg-stone-900 text-amber-400 font-mono font-bold text-xs border-r border-stone-800">
                      @
                    </span>
                    <input
                      type="text"
                      maxLength={3}
                      value={adminNewUserTagId}
                      onChange={(e) => setAdminNewUserTagId(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3))}
                      placeholder="123"
                      required
                      className="w-full bg-transparent px-2 py-2 text-amber-200 font-mono font-bold text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-cinzel font-bold uppercase text-stone-400 mb-1">
                    Contraseña Inicial
                  </label>
                  <input
                    type="text"
                    value={adminNewUserPassword}
                    onChange={(e) => setAdminNewUserPassword(e.target.value)}
                    placeholder="123456"
                    required
                    className="w-full bg-[#121316] border border-stone-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-stone-100 font-mono text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-cinzel font-bold uppercase text-stone-400 mb-1">
                    Rol Asignado
                  </label>
                  <select
                    value={adminNewUserRole}
                    onChange={(e) => setAdminNewUserRole(e.target.value as UserRole)}
                    className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-cinzel font-bold outline-none"
                  >
                    <option value="both">DM y Jugador</option>
                    <option value="player">Jugador</option>
                    <option value="dm">Dungeon Master</option>
                    <option value="moderator">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsAdminCreateUserOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAdminCreatingUser}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {isAdminCreatingUser ? 'Creando...' : 'Crear Usuario Registrado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADMIN EDIT USER (EMAIL, USERNAME, 3-CHAR TAG ID)             */}
      {/* =================================================================== */}
      {adminEditingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#161720] border border-blue-700/70 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Edit className="w-5 h-5 text-blue-400" />
                <h3 className="font-cinzel font-bold text-base text-stone-100">
                  Editar Usuario, Correo e ID (@ID)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdminEditingUser(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminEditUserSubmit} className="space-y-3.5">
              {adminEditUserMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-600 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{adminEditUserMsg}</span>
                </div>
              )}
              {adminEditUserError && (
                <div className="p-3 rounded-xl bg-red-950/90 border border-red-600 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{adminEditUserError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-cinzel font-bold uppercase text-stone-400 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={adminEditUserEmail}
                  onChange={(e) => setAdminEditUserEmail(e.target.value)}
                  required
                  className="w-full bg-[#121316] border border-stone-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-stone-100 text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-8">
                  <label className="block text-[11px] font-cinzel font-bold uppercase text-stone-400 mb-1">
                    Nombre de Usuario
                  </label>
                  <input
                    type="text"
                    value={adminEditUserName}
                    onChange={(e) => setAdminEditUserName(e.target.value)}
                    required
                    className="w-full bg-[#121316] border border-stone-700 focus:border-blue-500 rounded-xl px-3.5 py-2 text-stone-100 text-xs outline-none"
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-[11px] font-cinzel font-bold uppercase text-amber-300 mb-1">
                    ID (Máx. 3)
                  </label>
                  <div className="flex items-center bg-[#121316] border border-stone-700 focus-within:border-amber-500 rounded-xl overflow-hidden">
                    <span className="px-2 py-2 bg-stone-900 text-amber-400 font-mono font-bold text-xs border-r border-stone-800">
                      @
                    </span>
                    <input
                      type="text"
                      maxLength={3}
                      value={adminEditUserTagId}
                      onChange={(e) => setAdminEditUserTagId(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3))}
                      required
                      className="w-full bg-transparent px-2 py-2 text-amber-200 font-mono font-bold text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setAdminEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAdminSavingUserEdit}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isAdminSavingUserEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Security & Password Modal */}
      {isSecurityModalOpen && (
        <UserSecurityModal
          isOpen={isSecurityModalOpen}
          onClose={() => setIsSecurityModalOpen(false)}
          authUser={authUser}
          onRefreshAuthStatus={onRefreshAuthStatus}
        />
      )}

      {/* Moderator Panel Modal */}
      {isModeratorPanelOpen && (
        <ModeratorPanelModal
          isOpen={isModeratorPanelOpen}
          onClose={() => setIsModeratorPanelOpen(false)}
          authUser={authUser}
        />
      )}

      {/* Direct Friend Messaging Modal */}
      {isChatOpen && chatFriend && (
        <FriendDirectChatModal
          isOpen={isChatOpen}
          onClose={() => {
            setIsChatOpen(false);
            setChatFriend(null);
          }}
          currentUser={authUser}
          friend={chatFriend}
        />
      )}
    </div>
  );
};
