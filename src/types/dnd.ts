export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export interface AbilityScore {
  score: number;
  baseScore?: number; // Puntos base (ej. 14)
  extraScore?: number; // Puntos extra asignados manualmente (ej. 1)
  itemScore?: number; // Puntos dados por objetos equipados (calculados)
  proficientSave: boolean;
  customModifier?: number;
  modifierOverride?: number;
}

export type StatModifierTarget =
  | 'str'
  | 'dex'
  | 'con'
  | 'int'
  | 'wis'
  | 'cha'
  | 'ac'
  | 'speed'
  | 'maxHp'
  | 'initiative';

export interface ItemStatModifier {
  id: string;
  stat: StatModifierTarget;
  value: number; // e.g. +1, +2, -1
  label?: string; // Optional descriptive label
}

export interface ItemSpecialAction {
  id: string;
  name: string; // Nombre de la acción
  description: string; // Descripción
  dice: string; // e.g. "1d6", "1d8", "2d6"
  bonus?: number; // Potenciador / bono
  potenciador?: number;
  attackBonus?: number;
  damageType: string; // Cortante, Perforante, Contundente, Fuego, etc.
  actionType?: 'action' | 'bonus' | 'reaction' | 'melee' | 'ranged' | 'spell' | 'special';
  range?: string;
  usesMax?: number;
  usesLeft?: number;
  recharge?: string;
  imageUrl?: string;
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
  imageUrl?: string;
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
  imageUrl?: string;
  statModifiers?: ItemStatModifier[];
  itemActions?: ItemSpecialAction[];
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
  imageUrl?: string;
}

export interface CustomSkillEntry {
  id: string;
  skillKey?: SkillKey;
  srdKey?: SkillKey;
  name: string;
  ability: AbilityKey;
  proficiency: SkillProficiencyLevel;
  description: string;
  imageUrl?: string;
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
  imageUrl?: string;
  weaponAttacks?: WeaponAttack[];
  statModifiers?: ItemStatModifier[];
  itemActions?: ItemSpecialAction[];
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
  portraitGallery?: string[]; // Up to 4 switchable & downloadable portraits

  // Combat Stats
  maxHp: number;
  currentHp: number;
  tempHp: number;
  armorClass: number;
  initiativeBonus: number;
  initiative?: number;
  speed: number;
  hitDiceTotal: string; // e.g. "1d10"
  hitDiceUsed: number;
  deathSaves: {
    successes: number; // 0-3
    failures: number; // 0-3
  };
  inspiration: boolean;
  playerSkinId?: string; // Optional Creator Studio Player Skin ID

  // Ability Scores
  abilities: Record<AbilityKey, AbilityScore>;

  // Skills
  skills: Record<SkillKey, SkillProficiencyLevel>;
  customSkills?: CustomSkillEntry[];
  skillDescriptions?: Partial<Record<SkillKey, string>>;
  skillImages?: Partial<Record<SkillKey, string>>;

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
  imageUrl?: string;
  avatarType?: 'icon' | 'custom';
  avatarCustomUrl?: string;
  avatarIcon?: string;
  alignment?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
  equipment?: string;
  dlcSourceId?: string;
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
  imageUrl?: string;
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
  imageUrl?: string;
  avatarUrl?: string;
  avatarType?: 'icon' | 'custom';
  avatarCustomUrl?: string;
  avatarIcon?: string;
  dlcSourceId?: string;
}

export interface TacticalMapToken {
  id: string;
  label: string;
  kind: 'player' | 'monster' | 'npc' | 'enemy';
  x?: number; // grid column (0-indexed)
  y?: number; // grid row (0-indexed)
  col?: number; // grid column alias
  row?: number; // grid row alias
  color?: string;
  avatarUrl?: string;
  linkedId?: string;
}

export interface ZoneMapRecord {
  id: string;
  title: string;
  imageUrl: string;
  folder: string;
  isCover?: boolean;
  createdAt: number;
}

export interface VisualQueueItem {
  queueId: string;
  id: string;
  sourceId?: string;
  kind: 'map' | 'album' | 'tactical';
  title: string;
  imageUrl: string;
  folder: string;
  addedAt: number;
}

export interface LocationRecord {
  id: string;
  name: string;
  region?: string;
  type: 'Ciudad' | 'Mazmorra' | 'Templo' | 'Bosque' | 'Castillo' | 'Taberna' | 'Ruinas' | 'Poblado' | 'Zona' | 'Zona Táctica' | 'Mapa Táctico' | 'Otro' | string;
  status?: string;
  description: string;
  secretsForDm?: string;
  dmSecrets?: string;
  notes?: string; // DM private notes
  evolution?: string; // Changes to location over campaign
  pointsOfInterest?: string[];
  mapImageUrl?: string;
  pinX?: number;
  pinY?: number;
  folder?: string;
  gridCols?: number;
  gridRows?: number;
  gridType?: 'square' | 'hex' | 'triangle';
  blockedCells?: string[];
  tacticalTokens?: TacticalMapToken[];
  tokens?: TacticalMapToken[];
  suggestedMonsters?: string[];
  suggestedNpcs?: string[];
  suggestedItems?: string[];
  dlcSourceId?: string;
}

export type CampaignLogEntryType = 'session' | 'chapter' | 'summary' | 'prologue';
export type ChronicleEntryType = CampaignLogEntryType;

export interface CampaignLogEntry {
  id: string;
  sessionNumber: number;
  entryType?: CampaignLogEntryType; // 'session' | 'chapter' | 'summary' | 'prologue'
  title: string;
  date: string;
  realDate?: string;
  summary: string;
  publicNotes: string; // To read aloud or share with players
  privateNotes: string; // DM only
  tags: string[];
  folder?: string;
  dlcSourceId?: string;
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
  sourceId?: string;
  conditions: string[];
  notes?: string;
  faction?: 'enemy' | 'ally';
  avatarType?: 'icon' | 'custom';
  avatarCustomUrl?: string;
  avatarIcon?: string;
  avatarUrl?: string;
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
  imageUrl?: string;
  ability?: AbilityKey;
  abilityStat?: AbilityKey;
  isSkill?: boolean;
  statModifiers?: ItemStatModifier[];
  itemActions?: ItemSpecialAction[];
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
  imageUrl?: string;
  properties?: string; // Daño, bonificadores, alcance, cargas, componentes...
  dmSecrets?: string; // Notas secretas del DM, maldiciones, efectos ocultos
  folder?: string;
  weight?: number; // Peso en libras
  weaponAttacks?: WeaponAttack[];
  statModifiers?: ItemStatModifier[];
  itemActions?: ItemSpecialAction[];
  skillAbility?: AbilityKey;
  abilityStat?: AbilityKey;
  dlcSourceId?: string;
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
  dlcSourceId?: string;
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
  zoneMaps?: ZoneMapRecord[]; // Multiple maps per folder/zone
  atlasPinPositions?: Record<string, AtlasPinPosition>; // key: child folder path -> { x, y }
  placeAlbumPhotos?: PlaceAlbumPhoto[];
  visualQueue?: VisualQueueItem[]; // Ordered visual storytelling queue prepared by the DM
  tacticalTokensByMapId?: Record<string, TacticalMapToken[]>; // Tokens per tactical map ID
  activeAtlasFolder?: string; // Current folder/place path selected by the DM
  autoSyncLiveOnZoneChange?: boolean; // When true, changing activeAtlasFolder automatically updates activeLiveVisual for players
  autoSyncLiveMapOnZoneChange?: boolean;
  dmPreviewVisual?: {
    kind: 'album' | 'tactical' | 'map';
    id: string;
    title: string;
    imageUrl?: string;
    folder?: string;
    gridCols?: number;
    gridRows?: number;
    tacticalTokens?: TacticalMapToken[];
  };
  activeLiveVisual?: {
    kind: 'album' | 'tactical' | 'map';
    id: string;
    title: string;
    imageUrl?: string;
    folder?: string;
    gridCols?: number;
    gridRows?: number;
    tacticalTokens?: TacticalMapToken[];
  };
  dmSkinId?: string; // Optional Creator Studio DM Skin ID
  installedDlcIds?: string[]; // Installed Creator Studio DLC package IDs
  activeEncounter: EncounterState;
  currentQuest?: string; // DM's active quest objective broadcast
  quickNotification?: string; // Quick alert banner
  dmLiveMessage?: string; // Live status message from DM to table
  favoritesSRD: string[]; // List of favorited rule IDs or titles
}

export interface LiveRoomProjection {
  locationName: string;
  locationFolder: string;
  visualId?: string;
  visualKind: 'map' | 'album' | 'photo' | 'tactical';
  visualTitle: string;
  visualImageUrl?: string;
  gridCols?: number;
  gridRows?: number;
  tacticalGridCols?: number;
  tacticalGridRows?: number;
  tacticalTokens?: TacticalMapToken[];
  galleryPhotos?: Array<{
    id: string;
    title: string;
    imageUrl: string;
    folder?: string;
    placePath?: string;
    description?: string;
    createdAt?: number;
  }>;
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
  experience?: number;
  alignment?: string;
  speed?: number;
  initiative?: number;
  race?: string;
  characterClass: string;
  lastPing: number;
  dmModifiedAt?: number;
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
  playerSkinId?: string;
  skinTokens?: AppSkinThemeTokens;
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
  levelOrCr?: string;
  initiative?: number;
  speed?: string;
  avatarType?: 'icon' | 'custom';
  avatarCustomUrl?: string;
  avatarIcon?: string;
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
  liveProjection?: LiveRoomProjection;
  playerMessages?: PlayerMessageToDM[];
  dmSkinId?: string;
  dmSkinTokens?: AppSkinThemeTokens;
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
  requestedPlayerType?: PlayerType;
  playerTypeChangeRequested?: boolean;
  appRole: AppRole;
  canPostInForum: boolean;
  forumPermissionsRequested?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  registeredAt: number;
  approvedAt?: number;
  approvedBy?: string;
  lastActiveAt: number;
  isOnline?: boolean;
  totalConnectedMs?: number;
  sessionCount?: number;
  currentActivity?: string;
  ownedDlcIds?: string[]; // Cloud-verified DLC entitlements for this user account
  ownedSkinIds?: string[]; // Cloud-verified Player/DM/App Skin entitlements for this user account
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
  activeAppSkinId?: string; // Global Online Lobby/App skin ID
  activeOnlineLobbySkinId?: string;
  activeOnlinePlayerSkinId?: string;
  activeOnlineDmSkinId?: string;
}

// ==========================================
// CREATOR STUDIO (4 APARTADOS) & DELTA SYNC TYPES
// ==========================================

export type CreatorModuleKind =
  | 'creator_skin_player'
  | 'creator_skin_dm'
  | 'creator_dlc'
  | 'creator_skin_app';

export type CreatorReviewStatus = 'approved' | 'pending_review' | 'rejected';

export interface CreatorPlayerSkin {
  id: string;
  name: string;
  authorTag: string;
  description: string;
  seasonTag?: string;
  claimCode?: string;
  availableFrom?: string; // ISO date e.g. '2026-12-01'
  availableUntil?: string; // ISO date e.g. '2026-12-31'
  isDefault?: boolean;
  sheetTheme: {
    backgroundTextureUrl?: string;
    primaryBorderColor: string;
    accentColor: string;
    cardFrameStyle: string;
    headerGradient?: string;
    titleColor?: string;
  };
  tarotCardDesign: {
    frameBorderUrl?: string;
    glowColor: string;
    badgeStyle: string;
    cardBgGradient?: string;
  };
  updatedAt: number;
}

export interface CreatorDmSkin {
  id: string;
  name: string;
  authorTag: string;
  description: string;
  seasonTag?: string;
  claimCode?: string;
  availableFrom?: string;
  availableUntil?: string;
  isDefault?: boolean;
  worldSheetTheme: {
    panelBgColor: string;
    borderGoldTone: string;
    mapHudFrameStyle: string;
    headerGradient?: string;
    accentColor?: string;
  };
  updatedAt: number;
}

export interface CreatorDlcPackage {
  id: string;
  name: string;
  version: string;
  authorTag: string;
  description: string;
  seasonTag?: string;
  claimCode?: string;
  availableFrom?: string;
  availableUntil?: string;
  isOfficialSrd?: boolean;
  isFreeForAll?: boolean;
  counts: {
    maps: number;
    albums: number;
    monsters: number;
    itemsAndWeapons: number;
    stories: number;
    npcs?: number;
  };
  contentPayload?: {
    monsters?: MonsterRecord[];
    npcs?: NPCRecord[];
    itemsAndSpells?: DMCustomItemOrSpell[];
    locations?: LocationRecord[];
    albumPhotos?: PlaceAlbumPhoto[];
    campaignLogs?: CampaignLogEntry[];
    folders?: string[];
  };
  updatedAt: number;
}

export interface CreatorAppSkin {
  id: string;
  name: string;
  seasonTag: string; // e.g. 'Original', 'Navidad 2026', 'Halloween', 'Aniversario'
  authorTag: string;
  description: string;
  claimCode?: string;
  availableFrom?: string;
  availableUntil?: string;
  themeTokens: {
    headerBannerBg: string;
    headerTitleColor?: string;
    headerTitleScale?: 'sm' | 'md' | 'lg';
    buttonScale?: 'sm' | 'md' | 'lg';
    lobbyBgAccent: string;
    forumAccentColor: string;
    forumPanelBg?: string;
    charactersSectionBg?: string;
    friendsSectionBg?: string;
    buttonPrimaryGradient: string;
    borderOrnamentColor?: string;
  };
  isDefault?: boolean;
  isOnlineActive?: boolean;
  updatedAt: number;
}

export type DeltaEntityKind =
  | 'sheet'
  | 'world'
  | 'user'
  | 'settings'
  | 'creator_skin_player'
  | 'creator_skin_dm'
  | 'creator_dlc'
  | 'creator_skin_app';

export interface DeltaSyncRecord {
  id: string;
  revision: number;
  timestamp: number;
  entityKind: DeltaEntityKind;
  entityId: string;
  entityLabel: string;
  actorEmail?: string;
  changedFields: string[];
  payloadSizeKb: number;
  summary: string;
}

export interface SeparatedAssetEntry {
  assetId: string;
  hash: string;
  category: 'atlas_map' | 'album_photo' | 'character_avatar' | 'dm_avatar' | 'creator_skin_asset';
  ownerEntityId: string;
  ownerLabel: string;
  title: string;
  mimeType: string;
  sizeKb: number;
  updatedAt: number;
}

export interface AppSkinThemeTokens {
  // Global / Lobby tokens
  headerBannerBg?: string;
  headerBgColor?: string;
  headerBorderColor?: string;
  headerTitleColor?: string;
  headerTitleText?: string;
  headerTitleScale?: 'sm' | 'md' | 'lg';
  titleFontScale?: 'sm' | 'md' | 'lg';
  buttonScale?: 'sm' | 'md' | 'lg';
  lobbyBgAccent?: string;
  lobbyBgGradient?: string;
  forumAccentColor?: string;
  forumPanelBg?: string;
  charactersSectionBg?: string;
  charactersSectionBorder?: string;
  friendsSectionBg?: string;
  friendsSectionBorder?: string;
  forumCardBg?: string;
  forumBorderColor?: string;
  buttonPrimaryGradient?: string;
  primaryButtonBg?: string;
  primaryButtonText?: string;
  borderOrnamentColor?: string;
  appBgGradient?: string;
  topHeaderBg?: string;
  topHeaderBorder?: string;
  headerBrandText?: string;
  compendiumButtonLabel?: string;
  manualButtonLabel?: string;
  oracleButtonLabel?: string;
  titleColor?: string;
  cardBg?: string;
  cardBorder?: string;
  cardFrameColor?: string;
  cardBgColor?: string;
  cardHeaderBg?: string;
  cardTextColor?: string;
  cardBadgeColor?: string;
  accentBadgeBg?: string;
  accentBadgeText?: string;
  buttonSize?: 'sm' | 'md' | 'lg';

  // Deep Player Skin Editor Tokens (Player Sheet + Map Mode + Character Tarot Card)
  sheetIconScale?: 'sm' | 'md' | 'lg';
  sheetFontFamily?: 'cinzel' | 'sans' | 'serif' | 'mono' | 'custom';
  customFontUrl?: string;
  customFontFamilyName?: string;
  sheetPortraitSize?: 'sm' | 'md' | 'lg';
  sheetBgColor?: string;
  sheetBgTextureUrl?: string;

  // Stat Boxes Detailed Customization
  sheetStatBoxBg?: string;
  sheetStatBoxBorder?: string;
  sheetStatBoxStyle?: 'rounded' | 'ornate' | 'sharp' | 'crystal' | 'minimal' | 'parchment' | 'runic' | 'custom_png';
  sheetStatBoxCustomPngUrl?: string;
  sheetStatBoxOpacity?: number;
  sheetStatBoxBorderWidth?: number;
  sheetStatBoxBorderRadius?: number;
  sheetStatBoxHideBox?: boolean;
  sheetStatBoxBlur?: number;

  // HP Bar Detailed Customization
  sheetHpBarBg?: string;
  sheetHpBarFill?: string;
  sheetHpBarStyle?: 'classic' | 'segmented' | 'arcane' | 'dragon' | 'crystal' | 'ember' | 'custom_png';
  sheetHpBarCustomFramePngUrl?: string;
  sheetHpBarCustomFillPngUrl?: string;
  sheetHpBarCustomBgPngUrl?: string;
  sheetHpBarOpacity?: number;
  sheetHpBarBorderRadius?: number;
  sheetHpBarHeight?: number;

  // Custom UI Objects Drawings / PNGs
  sheetBackpackCustomPngUrl?: string;
  sheetCoinPouchCustomPngUrl?: string;
  sheetJournalCustomPngUrl?: string;
  sheetDeckTarotCustomPngUrl?: string;
  sheetDiceBoxCustomPngUrl?: string;
  sheetD20ButtonCustomPngUrl?: string;
  sheetButtonCustomPngUrl?: string;
  sheetButtonsOpacity?: number;
  sheetButtonsBorderRadius?: number;

  deckTarotCardBg?: string;
  deckTarotCardBorder?: string;
  deckTarotHeaderBg?: string;
  adventurerCornerBg?: string;
  adventurerCornerBorder?: string;

  // Player Map Mode Tokens
  mapModeFrameBg?: string;
  mapModeFrameBorder?: string;
  mapModeCardBg?: string;
  mapModeButtonBg?: string;
  mapModeButtonText?: string;
  mapModeDmHoodBg?: string;
  mapModeDmHoodBorder?: string;
  mapModeDmHoodAccent?: string;
  mapModeD20CustomPngUrl?: string;
  mapModeDeckFramePngUrl?: string;
  mapModeHoodCustomPngUrl?: string;
  mapModePanelsOpacity?: number;

  // Character Tarot Card Tokens (Lobby & Table)
  tarotGlowColor?: string;
  tarotBorderColor?: string;
  tarotHeaderGradient?: string;
  tarotBadgeBg?: string;
  tarotBadgeText?: string;
  tarotCardCustomFramePngUrl?: string;
  tarotCardCustomOverlayPngUrl?: string;
  tarotCardArtworkOverlayPngUrl?: string;
  tarotCardStatPlacement?: 'bottom' | 'side' | 'floating' | 'corners';
  tarotCardOpacity?: number;
  tarotCardBorderRadius?: number;

  // Lobby & Header Tokens (Admin)
  lobbyCustomLogoPngUrl?: string;
  lobbyCustomTopBarPngUrl?: string;
  lobbyButtonsOpacity?: number;
  lobbyButtonsBorderRadius?: number;

  // DM Screen Tokens
  dmScreenCustomBgTextureUrl?: string;
  dmScreenDiceBoxCustomPngUrl?: string;
  dmScreenHoodCustomPngUrl?: string;
  dmScreenPanelsOpacity?: number;

  // ==========================================
  // EXTENDED PLAYER LAYERS (J-0 to J-8)
  // ==========================================
  // J-0: Base & Fondo
  sheetBaseFrameBg?: string;
  sheetBaseFrameBorder?: string;
  sheetBaseFrameCustomPngUrl?: string;
  sheetBaseFrameRadius?: number;
  sheetBaseFrameOpacity?: number;
  sheetBaseFrameBlur?: number;
  sheetBaseFramePadding?: number;

  // J-1: Cabecera, Retrato e Identidad
  sheetPortraitShape?: 'circle' | 'rounded' | 'square' | 'hexagon';
  sheetPortraitFramePngUrl?: string;
  sheetNameColor?: string;
  sheetClassLevelColor?: string;
  sheetInspirationPngUrl?: string;
  sheetInspirationScale?: 'sm' | 'md' | 'lg';
  sheetInspirationGlow?: string;

  // J-2: Cajas de Características (Individuales & Etiquetas)
  sheetStatLabelColor?: string;
  sheetStatValueColor?: string;
  sheetStatIndividualPngs?: Partial<Record<AbilityKey, string>>;

  // J-3: Núcleo de Vida & Animación
  sheetHpAnimationType?: 'fading' | 'glitch' | 'clockwork' | 'blood_flash';
  sheetHpBoxBg?: string;
  sheetHpBoxBorder?: string;
  sheetHpDamageBtnBg?: string;
  sheetHpHealBtnBg?: string;
  sheetDeathSavesStyle?: 'classic' | 'gems' | 'skulls' | 'runes';

  // J-4: Rincón del Aventurero
  adventurerCornerCustomPngUrl?: string;
  adventurerCornerTitleText?: string;
  sheetBackpackLabelText?: string;
  sheetJournalLabelText?: string;

  // J-5: Mazo de Juego
  deckSectionTitleText?: string;
  deckSectionCustomPngUrl?: string;
  deckCombatTitleText?: string;
  deckSkillsTitleText?: string;
  deckSpellsTitleText?: string;
  deckCardCustomPngUrl?: string;
  deckIconAlignment?: 'left' | 'center' | 'right';
  deckDamageBadgePosition?: 'right' | 'bottom' | 'inline';

  // J-6: Carta Tarot 3D (Frente, Reverso, Giro, Partículas)
  tarotCardBackCustomPngUrl?: string;
  tarotCardFlipDurationMs?: number;
  tarotParticleEffect?: 'none' | 'fire' | 'stars' | 'snow' | 'runes';

  // J-7: Modo Mapa del Jugador (7 Sub-capas 7A a 7G)
  // 7A: Cartas de Aliados
  mapAlliesPanelPosition?: 'left' | 'right' | 'floating';
  mapAlliesCardScale?: 'sm' | 'md' | 'lg';
  mapAlliesCardBorder?: string;
  mapAlliesSpacing?: number;
  // 7B: Cartas de Enemigos
  mapEnemiesCardBg?: string;
  mapEnemiesCardBorder?: string;
  mapEnemiesHpBarColor?: string;
  // 7C: Caja de Dados
  mapDiceBoxBg?: string;
  mapDiceBoxBorder?: string;
  mapDiceBoxCustomPngUrl?: string;
  mapDiceDisplayStyle?: 'polyhedral_3d' | 'digital_tablet' | 'runic_dial';
  // 7D: Lienzo del Mapa
  mapCanvasCustomFramePngUrl?: string;
  mapZoomControlsBg?: string;
  // 7G: Navegación Superior y Guardado
  mapTopNavBg?: string;
  mapTopNavReturnBtnBg?: string;
  mapTopNavSaveBtnBg?: string;

  // Audio Profiles por Skin
  skinAudioDiceRoll?: 'wood_classic' | 'crystal_arcane' | 'tablet_digital' | 'clockwork_gears' | 'runic_stone';
  skinAudioDamageTaken?: 'sword_slash' | 'cyber_glitch' | 'gear_grind' | 'crimson_pulse';
  skinAudioHeal?: 'holy_chime' | 'arcane_recharge' | 'alchemical_potion';
  skinAudioInventoryOpen?: 'leather_bag' | 'metal_chest' | 'holo_screen';
  skinAudioCardFlip?: 'parchment_whisper' | 'heavy_tome' | 'mystic_hum';

  // ==========================================
  // EXTENDED DUNGEON MASTER LAYERS (DM-0 to DM-9)
  // ==========================================
  // DM-0: Fondo y Plantilla
  dmScreenBgColor?: string;
  dmScreenBaseBorder?: string;
  dmScreenBaseCustomPngUrl?: string;
  // DM-1: Barra Superior y Estado de Sala
  dmHeaderBg?: string;
  dmHeaderTitleColor?: string;
  dmHeaderBorderColor?: string;
  dmViewportToggleActiveBg?: string;
  // DM-2: Estandarte y Capucha Pública del DM
  dmHoodAvatarFramePngUrl?: string;
  dmBannerBgGradient?: string;
  dmBannerAccentColor?: string;
  // DM-3: Cartas del DM (Monstruos, NPCs, Objetos)
  dmMonsterCardBg?: string;
  dmMonsterCardBorder?: string;
  dmMonsterCardCustomPngUrl?: string;
  dmNpcCardBg?: string;
  dmNpcCardBorder?: string;
  dmNpcCardCustomPngUrl?: string;
  dmItemCardBg?: string;
  dmItemCardBorder?: string;
  // DM-4: Área y Monitor de Combate
  dmCombatTrackerBg?: string;
  dmCombatActiveTurnGlow?: string;
  dmCombatAllyBorder?: string;
  dmCombatEnemyBorder?: string;
  // DM-5: Log y Feed de Tiradas de Dados
  dmRollFeedBg?: string;
  dmRollFeedBorder?: string;
  dmRollSecretBadgeBg?: string;
  // DM-6: Atlas Mundi y Explorador Geográfico
  dmAtlasFrameBg?: string;
  dmAtlasFolderTabBg?: string;
  dmAtlasPinColor?: string;
  // DM-7: Libro de Crónicas del DM
  dmChroniclesPageBg?: string;
  dmChroniclesPublicTextColor?: string;
  dmChroniclesSecretBoxBg?: string;
  dmChroniclesSecretBorder?: string;
  // DM-8: Modo Mapa del DM
  dmMapCanvasBorder?: string;
  dmMapQueuePanelBg?: string;
  dmMapLiveBadgeColor?: string;

  // ==========================================
  // EXTENDED APP LAYERS (App-0 to App-8) & VISUAL PAGE BUILDER
  // ==========================================
  appGlobalWallpaperUrl?: string;
  appCustomOverlayEffectUrl?: string;
  appCustomOverlayOpacity?: number;
  friendsBoxCustomPngUrl?: string;
  friendsPanelWidth?: string;
  friendsOnlineDotColor?: string;
  friendsActionBtnBg?: string;
  storePanelBg?: string;
  storeCardBg?: string;
  storeCardBorder?: string;
  storeClaimBtnBg?: string;
  storeSeasonBadgeBg?: string;
  adminHarmonizedInherit?: boolean;

  // Spatial Page Builder for App / Lobby Skin (Shopify-style full block & button customization)
  lobbyPageLayout?: LobbyPageLayoutConfig;

  // ==========================================
  // POP-UPS & MODALS SKINNING + EXTENSIBLE LAYERS
  // ==========================================
  popupConfigs?: Record<string, PopupSkinConfig>;
  customLayers?: CustomLayerToken[];
  extensibleTokens?: Record<string, any>;
}

export type LobbyBlockId =
  | 'top_header'
  | 'admin_greeting'
  | 'welcome_banner'
  | 'characters_box'
  | 'friends_box'
  | 'forum_box'
  | 'store_box';

export interface LobbyInnerButtonConfig {
  id: string;
  label?: string;
  visible?: boolean;
  opacity?: number; // 0 to 1
  x?: number; // px offset
  y?: number; // px offset
  widthPx?: number; // 0 = auto
  heightPx?: number; // 0 = auto
  paddingXPx?: number;
  paddingYPx?: number;
  fontSizePx?: number;
  iconSizePx?: number;
  borderRadiusPx?: number;
  borderWidthPx?: number;
  bgColor?: string;
  bgOpacity?: number; // 0 to 1 (0 = transparent button frame)
  textColor?: string;
  borderColor?: string;
  bgImageUrl?: string;
  customIconUrl?: string;
}

export interface LobbyBlockLayoutConfig {
  id: LobbyBlockId;
  name: string;
  visible: boolean;
  order: number;
  zIndex: number;
  // Spatial coordinates & dimensions in pixels
  x: number; // Horizontal offset in px from default slot (or canvas X)
  y: number; // Vertical offset in px from default slot (or canvas Y)
  widthPx: number; // 0 = default responsive width, >0 = explicit width in px
  heightPx: number; // 0 = auto height, >0 = explicit min/fixed height in px
  scale: number; // 0.5 to 1.5
  paddingPx: number;
  // Opacity & Frame visibility
  opacity: number; // 0 to 1 (entire block opacity; 0 = completely invisible)
  boxBgOpacity: number; // 0 to 1 (container background/frame opacity; 0 = invisible box frame)
  hideBorder: boolean;
  // Visual styling & Custom Images
  bgColor: string;
  borderColor: string;
  borderWidthPx: number;
  borderRadiusPx: number;
  backdropBlurPx: number;
  boxShadow: string;
  bgImageUrl: string;
  bgImageFit: 'cover' | 'contain' | 'stretch';
  // Typography & Content inside the block
  titleText?: string;
  subtitleText?: string;
  fontFamily?: string;
  titleFontSizePx?: number;
  bodyFontSizePx?: number;
  titleColor?: string;
  textColor?: string;
  accentColor?: string;
  iconSizePx?: number;
  // Block-specific extra settings (e.g. avatar size, tarot card size, input colors)
  avatarSizePx?: number;
  avatarShape?: 'circle' | 'rounded' | 'square' | 'hexagon';
  customAvatarFrameUrl?: string;
  showRoleBadges?: boolean;
  showEmailTag?: boolean;
  cardWidthPx?: number;
  cardHeightPx?: number;
  innerInputBgColor?: string;
  innerInputBorderColor?: string;
  innerCardBgColor?: string;
  innerCardBorderColor?: string;
  // Inner Buttons Order & Individual Button Customization
  innerButtonsOrder: string[];
  innerButtonsConfig: Record<string, LobbyInnerButtonConfig>;
}

export interface LobbyPageLayoutConfig {
  version: number;
  canvasWidthPx: number;
  wallpaperUrl?: string;
  wallpaperOpacity?: number;
  customOverlayUrl?: string; // Custom GIF/WebM/PNG overlay instead of hardcoded effects
  customOverlayOpacity?: number;
  blocksOrder: LobbyBlockId[];
  blocks: Record<LobbyBlockId, LobbyBlockLayoutConfig>;
}

export interface PopupSkinConfig {
  popupId: string;
  label?: string;
  geometry?: {
    maxWidth?: string;
    borderRadius?: number;
    backdropBlur?: number;
    opacity?: number;
    animationType?: 'fade' | 'zoom' | 'slide_down' | 'unfold';
    animationDurationMs?: number;
  };
  visuals?: {
    bgColor?: string;
    bgTextureUrl?: string;
    customFramePngUrl?: string;
    borderColor?: string;
    borderWidth?: number;
    boxShadow?: string;
    headerBgColor?: string;
    headerBorderColor?: string;
  };
  typography?: {
    titleFontFamily?: string;
    titleColor?: string;
    bodyFontFamily?: string;
    bodyColor?: string;
  };
  innerElements?: {
    categoryTabsBg?: string;
    categoryTabsActiveBg?: string;
    coinsDisplayBg?: string;
    subItemCardBg?: string;
    subItemCardBorder?: string;
    closeButtonPngUrl?: string;
  };
}

export interface CustomLayerToken {
  layerId: string;
  name: string;
  targetScope: 'player' | 'dm' | 'app';
  visible: boolean;
  orderIndex: number;
  geometry?: {
    width?: string;
    height?: string;
    position?: 'static' | 'absolute' | 'fixed';
    top?: string;
    left?: string;
    borderRadius?: number;
    opacity?: number;
  };
  visuals?: {
    bgColor?: string;
    bgImageUrl?: string;
    borderWidth?: number;
    borderColor?: string;
    boxShadow?: string;
  };
  typography?: {
    fontFamily?: string;
    fontSize?: string;
    color?: string;
  };
  audioFx?: {
    clickSound?: string;
    hoverSound?: string;
  };
}

export interface AppSkinRecord {
  id: string;
  name: string;
  seasonTag?: string;
  authorTag?: string;
  authorName?: string;
  authorEmail?: string;
  description: string;
  target?: 'app' | 'player' | 'dm';
  scope?: 'app' | 'player' | 'dm';
  isDefault?: boolean;
  isOfficialDefault?: boolean;
  isOnlineDefault?: boolean;
  isOnlineActive?: boolean;
  isAcquirable?: boolean;
  isLimitedTime?: boolean;
  isSeasonal?: boolean;
  seasonLabel?: string;
  priceLabel?: string;
  claimCode?: string;
  acquisitionCode?: string;
  availableFrom?: string;
  availableUntil?: string;
  // Creator Credit & Attribution fields
  createdByAdmin?: boolean;
  hideCreatorCredit?: boolean;
  editorCreditName?: string;
  customCreditDescription?: string;
  // Review & Approval Workflow fields
  reviewStatus?: CreatorReviewStatus;
  reviewNotes?: string;
  submittedByEmail?: string;
  submittedByName?: string;
  submittedAt?: number;
  reviewedByEmail?: string;
  reviewedAt?: number;
  pendingDraft?: Partial<AppSkinRecord>;
  themeTokens: AppSkinThemeTokens;
  createdAt?: number;
  updatedAt?: number;
}

export interface DLCPackageRecord {
  id: string;
  name: string;
  version: string;
  authorTag?: string;
  authorName?: string;
  authorEmail?: string;
  description: string;
  seasonTag?: string;
  seasonLabel?: string;
  priceLabel?: string;
  claimCode?: string;
  acquisitionCode?: string;
  availableFrom?: string;
  availableUntil?: string;
  isOfficialSrd?: boolean;
  isFreeForAll?: boolean;
  isLimitedTime?: boolean;
  isSeasonal?: boolean;
  // Creator Credit & Attribution fields
  createdByAdmin?: boolean;
  hideCreatorCredit?: boolean;
  editorCreditName?: string;
  customCreditDescription?: string;
  // Review & Approval Workflow fields
  reviewStatus?: CreatorReviewStatus;
  reviewNotes?: string;
  submittedByEmail?: string;
  submittedByName?: string;
  submittedAt?: number;
  reviewedByEmail?: string;
  reviewedAt?: number;
  pendingDraft?: Partial<DLCPackageRecord>;
  counts?: {
    maps: number;
    albums: number;
    monsters: number;
    itemsAndWeapons: number;
    stories: number;
    npcs?: number;
  };
  monsters?: MonsterRecord[];
  npcs?: NPCRecord[];
  itemsAndSpells?: DMCustomItemOrSpell[];
  locations?: LocationRecord[];
  placeAlbumPhotos?: PlaceAlbumPhoto[];
  albumPhotos?: PlaceAlbumPhoto[];
  campaignLogs?: CampaignLogEntry[];
  contentPayload?: {
    monsters?: MonsterRecord[];
    npcs?: NPCRecord[];
    itemsAndSpells?: DMCustomItemOrSpell[];
    locations?: LocationRecord[];
    albumPhotos?: PlaceAlbumPhoto[];
    campaignLogs?: CampaignLogEntry[];
    folders?: string[];
  };
  createdAt?: number;
  updatedAt?: number;
}

export interface CreatorCatalogPayload {
  dlcs: DLCPackageRecord[];
  skins?: AppSkinRecord[];
  appSkins: AppSkinRecord[];
  playerSkins: AppSkinRecord[];
  dmSkins: AppSkinRecord[];
  activeOnlineAppSkinId: string;
  activeOnlineLobbySkinId?: string;
  activeOnlinePlayerSkinId?: string;
  activeOnlineDmSkinId?: string;
  ownedDlcIds?: string[];
  ownedSkinIds?: string[];
  accountEntitlements?: Array<{
    email: string;
    displayName: string;
    appRole: string;
    ownedDlcIds: string[];
    ownedSkinIds: string[];
    updatedAt: number;
  }>;
}



