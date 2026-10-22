export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export interface AbilityScore {
  score: number;
  proficientSave: boolean;
  customModifier?: number;
  modifierOverride?: number;
}

export type SkillKey =
  | 'acrobatics'
  | 'animalHandling'
  | 'arcana'
  | 'athletics'
  | 'deception'
  | 'history'
  | 'insight'
  | 'intimidation'
  | 'investigation'
  | 'medicine'
  | 'nature'
  | 'perception'
  | 'performance'
  | 'persuasion'
  | 'religion'
  | 'sleightOfHand'
  | 'stealth'
  | 'survival';

export type SkillProficiencyLevel = 'none' | 'proficient' | 'expertise';

export interface AttackAction {
  id: string;
  name: string;
  type: 'melee' | 'ranged' | 'spell';
  attackBonus: number;
  damageDice: string; // e.g. "1d8+3"
  damageType: string; // "Cortante", "Perforante", "Contundente", "Fuego", etc.
  range?: string;
  notes?: string;
}

export interface SpellSlot {
  level: number;
  total: number;
  expended: number;
}

export interface SpellItem {
  id: string;
  name: string;
  level: number; // 0 for cantrips
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  prepared?: boolean;
  damageOrHeal?: string;
}

export interface WeaponAttack {
  id: string;
  name: string; // Qué tipo / nombre de ataque es (ej. "Ataque de Fuego", "Tajo Principal", "Habilidad Secundaria")
  description: string; // Descripción del ataque
  dice: string; // Qué tipo de dado usa (ej. "1d6", "1d8", "2d6")
  bonus?: number; // Qué potenciador tiene (ej. 2 para +2, 0 para sin potenciador)
  potenciador?: number;
  attackBonus?: number;
  damageType: string; // "Cortante", "Perforante", "Contundente", "Fuego", etc.
  attackType?: 'melee' | 'ranged' | 'spell';
  range?: string;
}

export interface CustomSkillEntry {
  id: string;
  skillKey?: SkillKey;
  srdKey?: SkillKey;
  name: string;
  ability: AbilityKey;
  proficiency: SkillProficiencyLevel;
  description: string;
}

export interface PlayerJournalEntry {
  id: string;
  sessionNumber: number;
  title: string;
  date?: string;
  dateInGame?: string;
  realDate: string;
  summary: string;
  notes: string;
  tags?: string[];
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  weight: number;
  equipped?: boolean;
  attunement?: boolean;
  description: string;
  itemGroup?: 'weapon' | 'armor' | 'common';
  category: 'Objeto Común' | 'Objeto' | 'Arma' | 'Armadura' | 'Poción' | 'Mágico' | 'Equipo' | 'Herramienta' | 'Munición' | 'Otro';
  rarity?: 'Común' | 'Poco común' | 'Raro' | 'Muy Raro' | 'Legendario' | 'Artefacto';
  weaponAttacks?: WeaponAttack[];
}

export interface Currency {
  cp: number; // cobre
  sp: number; // plata
  ep: number; // electro
  gp: number; // oro
  pp: number; // platino
}

export interface Character5e {
  id: string;
  name: string;
  playerName: string;
  password?: string; // Optional character password protection
  race: string;
  subrace?: string;
  characterClass: string;
  subclass?: string;
  level: number;
  experience: number;
  xp?: number;
  ownerEmail?: string;
  background: string;
  alignment: string;
  avatarUrl?: string;
  avatarType?: 'icon' | 'custom';
  avatarCustomUrl?: string;
  avatarIcon?: string;

  // Combat Stats
  maxHp: number;
  currentHp: number;
  tempHp: number;
  armorClass: number;
  initiativeBonus: number;
  speed: number;
  hitDiceTotal: string; // e.g. "1d10"
  hitDiceUsed: number;
  deathSaves: {
    successes: number; // 0-3
    failures: number; // 0-3
  };
  inspiration: boolean;

  // Ability Scores
  abilities: Record<AbilityKey, AbilityScore>;

  // Skills
  skills: Record<SkillKey, SkillProficiencyLevel>;
  customSkills?: CustomSkillEntry[];

  // Proficiencies & Languages
  armorProficiencies: string[];
  weaponProficiencies: string[];
  toolProficiencies: string[];
  languages: string[];

  // Combat & Magic
  attacks: AttackAction[];
  spellcastingAbility?: AbilityKey;
  spellSaveDcOverride?: number;
  spellAttackBonusOverride?: number;
  spellSlots: SpellSlot[];
  spells: SpellItem[];

  // Inventory & Economy
  inventory: InventoryItem[];
  currency: Currency;

  // Lore, Personality & Features
  featuresAndTraits: {
    id: string;
    name: string;
    source: string;
    description: string;
    isSkill?: boolean;
    abilityStat?: AbilityKey;
  }[];
  personalityTraits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  backstory: string;
  notes: string;
  playerJournal?: PlayerJournalEntry[];
}

// DM Suite Types
export interface NPCRecord {
  id: string;
  name: string;
  folder: string; // e.g. "Taberna del Jabalí", "Nobles de Aguasprofundas", "Cultistas"
  race: string;
  occupation: string;
  attitude: 'Aliado' | 'Amistoso' | 'Neutral' | 'Desconfiado' | 'Hostil';
  location: string;
  appearance: string;
  personality: string;
  secretOrHook: string;
  notes?: string; // General DM private notes
  evolution?: string; // Evolution over time (e.g., "perdió un brazo en el puente, odia al elfo")
  stats?: {
    hp: number;
    ac: number;
    cr?: string;
    notes?: string;
  };
  avatarUrl?: string;
  avatarType?: 'icon' | 'custom';
  avatarCustomUrl?: string;
  avatarIcon?: string;
}

export interface MonsterAttack {
  id: string;
  name: string;
  type: 'melee' | 'ranged';
  toHit: number;
  damage: string; // e.g. "1d8+2"
  damageType: string; // e.g. "Cortante"
  description?: string;
  range?: string;
}

export interface MonsterRecord {
  id: string;
  name: string;
  size: 'Diminuto' | 'Pequeño' | 'Mediano' | 'Grande' | 'Enorme' | 'Gargantuesco';
  type: string;
  alignment: string;
  cr: string; // e.g. "1/4", "1", "5"
  ac: number;
  hp: number;
  maxHp: number;
  speed: string;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  savingThrows?: string;
  skills?: string;
  senses?: string;
  languages?: string;
  traits: { name: string; description: string }[];
  actions: MonsterAttack[];
  legendaryActions?: { name: string; description: string }[];
  folder?: string;
  notes?: string;
  avatarUrl?: string;
  avatarType?: 'icon' | 'custom';
  avatarCustomUrl?: string;
  avatarIcon?: string;
}

export interface LocationRecord {
  id: string;
  name: string;
  region: string;
  type: 'Ciudad' | 'Mazmorra' | 'Templo' | 'Bosque' | 'Castillo' | 'Taberna' | 'Ruinas' | 'Poblado' | 'Zona' | 'Zona Táctica' | 'Otro' | string;
  description: string;
  secretsForDm: string;
  notes?: string; // DM private notes
  evolution?: string; // Changes to location over campaign
  pointsOfInterest: string[];
  mapImageUrl?: string;
  folder?: string;
}

export interface CampaignLogEntry {
  id: string;
  sessionNumber: number;
  title: string;
  date: string;
  realDate?: string;
  summary: string;
  publicNotes: string; // To read aloud or share with players
  privateNotes: string; // DM only
  tags: string[];
  folder?: string;
}

export interface Combatant {
  id: string;
  name: string;
  initiative: number;
  hp: number;
  maxHp: number;
  ac: number;
  passivePerception?: number;
  isPlayer: boolean;
  characterId?: string;
  conditions: string[];
  notes?: string;
  faction?: 'enemy' | 'ally';
}

export interface CombatLogEvent {
  id: string;
  round: number;
  turn: string;
  note: string;
  timestamp: number;
}

export interface CombatSummary {
  id: string;
  name: string;
  date: string;
  roundsCount: number;
  participants: string[];
  notes: string;
  logEvents: CombatLogEvent[];
  folder?: string;
}

export interface EncounterState {
  id: string;
  name: string;
  round: number;
  currentTurnIndex: number;
  combatants: Combatant[];
  isActive: boolean;
  combatNotes: string;
  combatLog: CombatLogEvent[];
  broadcastEnemiesToTable?: boolean;
}

export interface SharedFeatureOrAbility {
  id: string;
  name: string;
  source: 'Raza' | 'Clase' | 'Trasfondo' | 'Dote' | 'Otro';
  description: string;
  ability?: AbilityKey;
  abilityStat?: AbilityKey;
  isSkill?: boolean;
}

export interface DMCustomItemOrSpell {
  id: string;
  name: string;
  kind: 'item' | 'spell' | 'ability'; // 'item', 'spell' or 'ability'
  itemGroup?: 'weapon' | 'armor' | 'common';
  rarity: 'Común' | 'Poco común' | 'Raro' | 'Muy Raro' | 'Legendario' | 'Artefacto';
  category: string; // 'Arma' | 'Armadura' | 'Objeto Común' | 'Poción' | 'Objeto Mágico' | 'Truco' | 'Conjuro' | 'Habilidad' | 'Dote' | 'Otro'
  whoHasIt: string; // Quién lo tenía / portador actual
  whereFound: string; // Dónde se consigue / ubicación o botín
  description: string;
  properties?: string; // Daño, bonificadores, alcance, cargas, componentes...
  dmSecrets?: string; // Notas secretas del DM, maldiciones, efectos ocultos
  folder?: string;
  weaponAttacks?: WeaponAttack[];
  skillAbility?: AbilityKey;
  abilityStat?: AbilityKey;
}

export interface PendingDmOffer {
  id: string;
  roomCode: string;
  targetCharacterId: string;
  targetCharacterName: string;
  targetPlayerName?: string;
  kind: 'item' | 'spell' | 'ability';
  title: string;
  rarity?: string;
  category?: string;
  description?: string;
  item?: InventoryItem;
  spell?: SpellItem;
  ability?: SharedFeatureOrAbility;
  status: 'pending' | 'accepted' | 'declined';
  dmNotified?: boolean;
  createdAt: number;
  resolvedAt?: number;
}

export interface PlayerMessageToDM {
  id: string;
  roomCode: string;
  characterId: string;
  characterName: string;
  playerName: string;
  playerTagId: string;
  playerFullTag: string;
  playerEmail?: string;
  title: string;
  description: string;
  createdAt: number;
  read?: boolean;
  readByDm?: boolean;
}

export interface PlaceAlbumPhoto {
  id: string;
  title: string;
  imageUrl: string;
  folder: string;
  description?: string;
  createdAt: number;
}

export interface AtlasPinPosition {
  x: number; // percentage 0-100 on the 1:1 square map
  y: number; // percentage 0-100 on the 1:1 square map
}

export interface DMWorkspace {
  dmPassword?: string;
  password?: string;
  dmName?: string;
  dmAvatarType?: 'icon' | 'custom';
  dmAvatarUrl?: string;
  dmAvatarIcon?: string;
  npcs: NPCRecord[];
  monsters: MonsterRecord[];
  customItems: InventoryItem[];
  customItemsAndSpells: DMCustomItemOrSpell[];
  locations: LocationRecord[];
  campaignLogs: CampaignLogEntry[];
  combatSummaries: CombatSummary[];
  playerMessages?: PlayerMessageToDM[];
  folders: string[];
  atlasMaps?: Record<string, string>; // key: 'all' or folder path -> square map image URL / DataURL
  atlasPinPositions?: Record<string, AtlasPinPosition>; // key: child folder path -> { x, y }
  placeAlbumPhotos?: PlaceAlbumPhoto[];
  activeLiveVisual?: {
    kind: 'album' | 'tactical';
    id: string;
    title: string;
    imageUrl?: string;
    folder?: string;
  };
  activeEncounter: EncounterState;
  currentQuest?: string; // DM's active quest objective broadcast
  quickNotification?: string; // Quick alert banner
  dmLiveMessage?: string; // Live status message from DM to table
  favoritesSRD: string[]; // List of favorited rule IDs or titles
}

// Dice & Session Types
export type RollMode = 'normal' | 'advantage' | 'disadvantage';

export interface DiceRollResult {
  id: string;
  rollerName: string;
  rollTitle: string; // e.g. "Tirada de Salvación: Destreza", "Ataque con Espada"
  formula: string; // e.g. "1d20+5"
  mode: RollMode;
  diceType: number; // 20, 6, 8, etc.
  rolls: number[]; // e.g. [18] or [14, 18] for adv
  chosenRoll: number;
  modifier: number;
  total: number;
  isCrit: boolean; // Natural 20
  isFumble: boolean; // Natural 1
  timestamp: number;
}

export type PresenceStatus = 'active' | 'idle' | 'thinking' | 'afk' | 'offline';

export interface PartyMemberLive {
  characterId: string;
  characterName: string;
  playerName: string;
  playerTagId?: string;
  playerFullTag?: string;
  playerEmail?: string;
  avatarType?: 'icon' | 'custom';
  avatarCustomUrl?: string;
  avatarIcon?: string;
  avatarUrl?: string;
  currentHp: number;
  maxHp: number;
  ac: number;
  passivePerception: number;
  level: number;
  characterClass: string;
  lastPing: number;
  presenceStatus?: PresenceStatus;
  idleSeconds?: number;
  lastRoll?: DiceRollResult;
  abilities?: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  currency?: {
    cp: number;
    sp: number;
    ep: number;
    gp: number;
    pp: number;
  };
}

export interface LiveCombatantMini {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  ac: number;
  passivePerception: number;
  faction: 'enemy' | 'ally';
  isPlayer: boolean;
  conditions?: string[];
}

export interface SharedSessionData {
  roomCode: string;
  partyMembers: PartyMemberLive[];
  dmConnected?: boolean;
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
  playerMessages?: PlayerMessageToDM[];
}

export type UserRole = 'player' | 'dm' | 'both' | 'moderator' | 'creator' | 'admin';

// Distinct Role Architecture: Table / Player Type vs. Application Role
export type PlayerType = 'player' | 'dm' | 'both';
export type AppRole = 'client' | 'moderator' | 'creator' | 'admin';

export interface PlayerSheetRecord {
  id: string;
  ownerEmail: string;
  name: string;
  character: Character5e;
  updatedAt: number;
}

export interface UserAccountPublic {
  id: string;
  email: string;
  displayName: string;
  userTagId?: string;
  fullTag?: string;
  avatarUrl?: string;
  friends?: string[];
  role: UserRole;
  playerType: PlayerType;
  appRole: AppRole;
  canPostInForum: boolean;
  forumPermissionsRequested?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  registeredAt: number;
  approvedAt?: number;
  approvedBy?: string;
  lastActiveAt: number;
}

// Forum Data Structures (WeRoll Forum)
export type ForumCategory = 'app-updates' | 'general' | 'community';
export type ForumAuthorRoleFilter = 'all' | 'dm' | 'player';
export type ForumFlair = 'Reglas 5E' | 'Duda' | 'Historia de Mesa' | 'Guía DM' | 'Búsqueda de Grupo' | 'Actualización' | 'General';

export interface ForumPost {
  id: string;
  category: ForumCategory;
  title: string;
  content: string;
  authorEmail: string;
  authorName: string;
  authorTagId: string;
  authorFullTag: string;
  authorPlayerType: PlayerType;
  authorAppRole: AppRole;
  flair?: ForumFlair;
  createdAt: number;
  updatedAt?: number;
  upvotes: number;
  upvoters?: string[]; // emails or user IDs who have upvoted
  commentsCount: number;
  pinned?: boolean;
}

export interface ForumComment {
  id: string;
  postId: string;
  content: string;
  authorEmail: string;
  authorName: string;
  authorTagId: string;
  authorFullTag: string;
  authorPlayerType: PlayerType;
  authorAppRole: AppRole;
  createdAt: number;
  upvotes: number;
  upvoters?: string[];
}

// Direct Message Between Friends
export interface FriendDirectMessage {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  fromUserTagId: string;
  fromFullTag: string;
  fromEmail: string;
  toUserId: string;
  toDisplayName: string;
  toUserTagId: string;
  toFullTag: string;
  toEmail: string;
  content: string;
  createdAt: number;
  read: boolean;
}

export interface WorldSheetSummary {
  id: string;
  ownerEmail?: string;
  name: string;
  roomName?: string;
  description?: string;
  roomCode: string;
  roomPassword?: string;
  roomMode?: 'online' | 'offline';
  lastPlayed: number;
  workspace: DMWorkspace;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export interface ReplacedBackupArchiveSummary {
  id: string;
  archivedAt: number;
  replacedByTimestamp: number;
  localTimestampBeforeReplace: number;
  localRevisionBeforeReplace: number;
  reason: string;
  cloudLocation?: string;
  summary: {
    usersCount: number;
    sheetsCount: number;
    worldsCount: number;
    feedbackCount: number;
  };
}

export interface AutoBackupLog {
  id: string;
  timestamp: number;
  destination: 'github' | 'drive' | 'webhook' | 'cloud-vault';
  status: 'success' | 'error';
  message: string;
  sizeKb?: number;
  triggerReason?: string;
}

export interface AutoBackupConfig {
  enabled: boolean;
  backupOnEveryChange?: boolean;
  continuousComparison?: boolean;
  frequencyHours: 12 | 24;
  destination: 'github' | 'drive' | 'webhook';
  githubToken?: string;
  githubRepo?: string;
  githubPath?: string;
  githubArchivePath?: string;
  driveFolderId?: string;
  driveArchiveFolderId?: string;
  driveAccessToken?: string;
  driveAccountEmail?: string;
  driveAccountName?: string;
  webhookUrl?: string;
  lastBackupAt?: number;
  lastBackupStatus?: 'success' | 'error' | 'idle';
  lastBackupMessage?: string;
  lastComparisonAt?: number;
  lastComparisonStatus?: string;
  history?: AutoBackupLog[];
}

export interface LiveBroadcastPopup {
  id: string;
  title: string;
  message: string;
  senderName: string;
  senderTag?: string;
  senderRole?: string;
  sentAt: number;
}

export interface HostSettings {
  apiKeyOverride?: string;
  aiModel?: string; // 'gemini-flash-lite-latest' | 'gemini-flash-latest' | custom string
  modelOverride?: string;
  dmPassword?: string;
  moderatorPassword?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  headerLogoIcon?: string; // 'shield' | 'dragon' | 'book' | 'skull' | 'swords' | etc.
  logoIcon?: string;
  logoType?: 'icon' | 'custom';
  customLogoUrl?: string; // Base64 data URL or image path for uploaded custom logo
  rejectionCustomMessage?: string;
  autoBackup?: AutoBackupConfig;
  developerNotice?: {
    enabled: boolean;
    title: string;
    content: string;
    version: string;
  };
  developerAnnouncement?: {
    enabled: boolean;
    title: string;
    content: string;
    version?: string;
  };
  oracleWelcomeMessage?: string;
  adminGreeting?: {
    enabled: boolean;
    title: string;
    message: string;
    type?: 'info' | 'maintenance' | 'alert';
    updatedAt?: number;
  };
  liveBroadcastPopup?: LiveBroadcastPopup;
  changelog?: ChangelogEntry[];
  roleSwitchingAllowed?: 'strict' | 'open'; // 'strict' locks player to player and DM to DM; 'open' allows switcher
}
