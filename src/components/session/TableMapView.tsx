import React, { useState, useMemo } from 'react';
import {
  Shield,
  Sword,
  Sparkles,
  BookOpen,
  Scroll,
  Plus,
  Minus,
  Upload,
  ArrowLeft,
  Coins,
  Compass,
  MapPin,
  Crown,
  MessageSquare,
  Dices,
  Eye,
  EyeOff,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Image as ImageIcon,
  Layers,
  Send,
  Skull,
  FolderPlus,
  Edit3,
} from 'lucide-react';
import { EntityAvatar } from '../common/EntityAvatar';
import {
  Character5e,
  DMWorkspace,
  AbilityKey,
  SkillKey,
  PartyMemberLive,
  LiveCombatantMini,
  LiveRoomProjection,
  DiceRollResult,
  PlaceAlbumPhoto,
  Combatant,
} from '../../types/dnd';
import {
  calculateModifier,
  formatModifier,
  calculateProficiencyBonus,
  calculatePassivePerception,
  deriveEquippedWeaponAttacks,
  getEffectiveAbilityModifier,
  buildAtlasBreadcrumbs,
  getChildFoldersForAtlas,
  ensureCompleteFolderHierarchy,
  getPinPositionForChildPlace,
  filterAlbumPhotosByPlace,
  MAX_ENCOUNTER_ENEMIES,
  canAddEnemyToEncounter,
  buildLiveProjectionFromWorkspace,
} from '../../utils/dnd-math';
import { CharacterTarotCard } from '../character/CharacterTarotCard';
import { ABILITY_LABELS, SKILL_METADATA } from '../../data/srd';
import { getFolderDepth } from '../../utils/storage';
import { compressImageFileToDataUrl } from '../../utils/imageCompressor';
import { soundFx } from '../../utils/audio';

interface TableMapViewProps {
  mode: 'player' | 'dm';
  roomCode: string;
  worldName?: string;
  // Player props
  character?: Character5e;
  onUpdateCharacter?: (updated: Character5e) => void;
  // DM props
  workspace?: DMWorkspace;
  onUpdateWorkspace?: (updated: DMWorkspace) => void;
  onDmAdjustPlayer?: (characterId: string, adjustment: { hpDelta?: number; gpDelta?: number }) => void;
  onUpdateDmLiveMessage?: (msg: string) => void;
  // Shared room state
  partyMembers: PartyMemberLive[];
  dmConnected?: boolean;
  dmLiveMessage?: string;
  showCombatantsOnTable?: boolean;
  liveCombatants?: LiveCombatantMini[];
  liveProjection?: LiveRoomProjection;
  rollFeed: DiceRollResult[];
  onRollSubmitted?: (result: DiceRollResult) => void;
  onRollComplete?: (result: DiceRollResult) => void;
  onTriggerRoll?: (title: string, modifier: number, diceType?: number) => void;
  onOpenRollFeed?: () => void;
  onSendPlayerMessageToDM?: (
    title: string,
    description: string
  ) => Promise<{ ok: boolean; message?: string; error?: string }>;
  // Navigation & Cloud Save
  onReturnToSheet: () => void;
  onSaveToCloud?: () => void;
}

const DICE_TYPES: { sides: number; label: string }[] = [
  { sides: 4, label: 'D4' },
  { sides: 6, label: 'D6' },
  { sides: 8, label: 'D8' },
  { sides: 10, label: 'D10' },
  { sides: 12, label: 'D12' },
  { sides: 20, label: 'D20' },
  { sides: 100, label: 'D100' },
];

function renderPolyhedralDieIcon(sides: number) {
  switch (sides) {
    case 4:
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12,3 21,19 3,19" />
          <line x1="12" y1="3" x2="12" y2="19" strokeOpacity="0.5" />
        </svg>
      );
    case 6:
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <circle cx="9" cy="9" r="1" fill="currentColor" />
          <circle cx="15" cy="15" r="1" fill="currentColor" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
        </svg>
      );
    case 8:
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12,2 21,12 12,22 3,12" />
          <line x1="3" y1="12" x2="21" y2="12" strokeOpacity="0.5" />
        </svg>
      );
    case 10:
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12,2 20,10 12,22 4,10" />
          <polyline points="4,10 12,13 20,10" strokeOpacity="0.5" />
        </svg>
      );
    case 12:
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12,2 21,8.5 17.5,19.5 6.5,19.5 3,8.5" />
          <polygon points="12,7 16,10 14.5,15 9.5,15 8,10" strokeOpacity="0.5" />
        </svg>
      );
    case 20:
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12,2 20.5,7 20.5,17 12,22 3.5,17 3.5,7" />
          <polygon points="12,6 17,15 7,15" strokeOpacity="0.55" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="12" r="6" />
          <circle cx="15" cy="12" r="6" strokeOpacity="0.7" />
        </svg>
      );
  }
}

export const TableMapView: React.FC<TableMapViewProps> = ({
  mode,
  roomCode,
  worldName = 'Reinos Olvidados',
  character,
  onUpdateCharacter,
  workspace,
  onUpdateWorkspace,
  onDmAdjustPlayer,
  onUpdateDmLiveMessage,
  partyMembers = [],
  dmConnected = true,
  dmLiveMessage = '',
  showCombatantsOnTable = false,
  liveCombatants = [],
  liveProjection,
  rollFeed = [],
  onRollSubmitted,
  onRollComplete,
  onOpenRollFeed,
  onSendPlayerMessageToDM,
  onReturnToSheet,
  onSaveToCloud,
}) => {
  // =========================================================================
  // 1. MINIMIZABLE OVERLAYS STATE (CARDS / PROJECTION & NOTEBOOK)
  // =========================================================================
  const [isLeftOverlayMinimized, setIsLeftOverlayMinimized] = useState<boolean>(false);
  const [isNotebookMinimized, setIsNotebookMinimized] = useState<boolean>(false);

  // Map Zoom & Pan Controls
  const [mapZoom, setMapZoom] = useState<number>(1);

  // Player Decks State (Read-only view of Attacks, Skills, Spells)
  const [activePlayerDeck, setActivePlayerDeck] = useState<'attacks' | 'skills' | 'spells'>('attacks');
  const [playerDeckScrollIdx, setPlayerDeckScrollIdx] = useState<number>(0);

  // DM Projection Overlay Tab ('gallery' | 'tactical')
  const [dmProjectionTab, setDmProjectionTab] = useState<'gallery' | 'tactical'>('gallery');

  // DM Edit Map / Upload Photo / Sub-Place Modals
  const [isEditMapModalOpen, setIsEditMapModalOpen] = useState<boolean>(false);
  const [isAddSubPlaceModalOpen, setIsAddSubPlaceModalOpen] = useState<boolean>(false);
  const [newSubPlaceName, setNewSubPlaceName] = useState<string>('');
  const [newGalleryTitle, setNewGalleryTitle] = useState<string>('');
  const [newGalleryUrl, setNewGalleryUrl] = useState<string>('');
  const [mapUrlDraft, setMapUrlDraft] = useState<string>('');
  const [isAddEnemyModalOpen, setIsAddEnemyModalOpen] = useState<boolean>(false);

  // Dice Box State (D4..D100 + 1 to 6 Dice Count + Roll Action)
  const [selectedDiceSides, setSelectedDiceSides] = useState<number>(20);
  const [selectedDiceCount, setSelectedDiceCount] = useState<number>(1);
  const [diceModifier, setDiceModifier] = useState<number>(0);
  const [lastBoxRoll, setLastBoxRoll] = useState<DiceRollResult | null>(null);
  const [isRollHistoryExpanded, setIsRollHistoryExpanded] = useState<boolean>(false);

  // Notebook / Chronicles Quick Entry State
  const [dmQuickLogTitle, setDmQuickLogTitle] = useState<string>('');
  const [dmQuickLogSummary, setDmQuickLogSummary] = useState<string>('');
  const [notebookSavedFeedback, setNotebookSavedFeedback] = useState<string>('');

  // DM Live Message Input
  const [dmMessageInput, setDmMessageInput] = useState<string>(
    workspace?.dmLiveMessage || dmLiveMessage || ''
  );
  const [dmMessageSentToast, setDmMessageSentToast] = useState<boolean>(false);

  // Player Whisper to DM Modal
  const [isWhisperModalOpen, setIsWhisperModalOpen] = useState<boolean>(false);
  const [whisperTitle, setWhisperTitle] = useState<string>('');
  const [whisperBody, setWhisperBody] = useState<string>('');
  const [whisperStatus, setWhisperStatus] = useState<string>('');

  // =========================================================================
  // 2. ATLAS / LOCATION & VISUAL PROJECTION RESOLUTION
  // =========================================================================
  const selectedFolder = useMemo(() => {
    if (mode === 'dm' && workspace) {
      return workspace.activeAtlasFolder || workspace.activeLiveVisual?.folder || 'all';
    }
    return liveProjection?.locationFolder || 'all';
  }, [mode, workspace, liveProjection]);

  const setDmSelectedFolder = (folderPath: string) => {
    if (!workspace || !onUpdateWorkspace) return;
    const shortName =
      folderPath === 'all'
        ? worldName || 'Mundo Completo'
        : folderPath.split('/').map((s) => s.trim()).filter(Boolean).pop() || folderPath;
    const mapForPlace = workspace.atlasMaps?.[folderPath] || '';
    const photosForPlace = filterAlbumPhotosByPlace(workspace.placeAlbumPhotos || [], folderPath);
    const nextVisual = mapForPlace
      ? {
          kind: 'map' as const,
          id: `map-${folderPath}`,
          title: `Mapa: ${shortName}`,
          imageUrl: mapForPlace,
          folder: folderPath,
        }
      : photosForPlace[0]
      ? {
          kind: 'album' as const,
          id: photosForPlace[0].id,
          title: photosForPlace[0].title,
          imageUrl: photosForPlace[0].imageUrl,
          folder: folderPath,
        }
      : {
          kind: 'map' as const,
          id: `map-${folderPath}`,
          title: shortName,
          imageUrl: '',
          folder: folderPath,
        };

    onUpdateWorkspace({
      ...workspace,
      activeAtlasFolder: folderPath,
      activeLiveVisual: nextVisual,
    });
  };

  const allHierarchyFolders = useMemo(
    () => ensureCompleteFolderHierarchy(workspace?.folders || []),
    [workspace?.folders]
  );

  const breadcrumbs = useMemo(() => buildAtlasBreadcrumbs(selectedFolder), [selectedFolder]);

  const childFolders = useMemo(
    () => getChildFoldersForAtlas(allHierarchyFolders, selectedFolder),
    [allHierarchyFolders, selectedFolder]
  );

  const currentPlaceShortName = useMemo(() => {
    if (mode === 'player' && liveProjection?.locationName) {
      return liveProjection.locationName;
    }
    if (selectedFolder === 'all') return worldName || 'Mundo Completo';
    const parts = selectedFolder.split('/').map((s) => s.trim());
    return parts[parts.length - 1] || selectedFolder;
  }, [mode, liveProjection, selectedFolder, worldName]);

  const currentPlaceDepth = useMemo(
    () => (selectedFolder === 'all' ? 0 : getFolderDepth(selectedFolder)),
    [selectedFolder]
  );

  const currentPlaceMapUrl = useMemo(() => {
    if (mode === 'dm' && workspace) {
      return workspace.atlasMaps?.[selectedFolder] || '';
    }
    return '';
  }, [mode, workspace, selectedFolder]);

  const filteredAlbumPhotos = useMemo(() => {
    if (mode === 'dm' && workspace) {
      return filterAlbumPhotosByPlace(workspace.placeAlbumPhotos || [], selectedFolder);
    }
    return liveProjection?.galleryPhotos || [];
  }, [mode, workspace, selectedFolder, liveProjection]);

  // Currently projected visual (Map or Gallery Image)
  const activeVisual = useMemo(() => {
    if (mode === 'dm' && workspace) {
      if (workspace.activeLiveVisual && workspace.activeLiveVisual.imageUrl) {
        return {
          id: workspace.activeLiveVisual.id,
          kind: workspace.activeLiveVisual.kind,
          title: workspace.activeLiveVisual.title,
          imageUrl: workspace.activeLiveVisual.imageUrl,
        };
      }
      if (currentPlaceMapUrl) {
        return {
          id: `map-${selectedFolder}`,
          kind: 'map' as const,
          title: `Mapa: ${currentPlaceShortName}`,
          imageUrl: currentPlaceMapUrl,
        };
      }
      if (filteredAlbumPhotos[0]) {
        return {
          id: filteredAlbumPhotos[0].id,
          kind: 'album' as const,
          title: filteredAlbumPhotos[0].title,
          imageUrl: filteredAlbumPhotos[0].imageUrl,
        };
      }
      return {
        id: `map-${selectedFolder}`,
        kind: 'map' as const,
        title: currentPlaceShortName,
        imageUrl: '',
      };
    }

    // Player mode uses liveProjection from DM (with workspace fallback for instant sync)
    const fallbackProj = workspace
      ? buildLiveProjectionFromWorkspace(workspace, worldName)
      : undefined;

    if (liveProjection && liveProjection.visualImageUrl) {
      return {
        id: 'live-proj',
        kind: liveProjection.visualKind || 'map',
        title:
          liveProjection.visualTitle ||
          liveProjection.locationName ||
          'Escena Actual',
        imageUrl: liveProjection.visualImageUrl,
      };
    }

    if (fallbackProj && fallbackProj.visualImageUrl) {
      return {
        id: 'ws-fallback-proj',
        kind: fallbackProj.visualKind || 'map',
        title: fallbackProj.visualTitle || fallbackProj.locationName || 'Escena Actual',
        imageUrl: fallbackProj.visualImageUrl,
      };
    }

    if (liveProjection?.galleryPhotos?.[0]?.imageUrl) {
      return {
        id: 'live-gallery-fallback',
        kind: 'photo' as const,
        title: liveProjection.galleryPhotos[0].title || currentPlaceShortName,
        imageUrl: liveProjection.galleryPhotos[0].imageUrl,
      };
    }

    return {
      id: 'default-proj',
      kind: (liveProjection?.visualKind || fallbackProj?.visualKind || 'map') as
        | 'map'
        | 'photo'
        | 'tactical',
      title:
        liveProjection?.visualTitle ||
        fallbackProj?.visualTitle ||
        currentPlaceShortName,
      imageUrl: '',
    };
  }, [mode, workspace, worldName, currentPlaceMapUrl, filteredAlbumPhotos, selectedFolder, currentPlaceShortName, liveProjection]);

  // =========================================================================
  // 3. PARTY PLAYER CARDS (SAME DESIGN AS PLAYER SHEET BOTTOM-RIGHT CARD)
  // =========================================================================
  const resolvedPlayerCards: PartyMemberLive[] = useMemo(() => {
    const map = new Map<string, PartyMemberLive>();
    for (const p of partyMembers) {
      if (p && p.characterId) {
        map.set(p.characterId, p);
      }
    }
    // Ensure the active player's own character is always present and up to date
    if (mode === 'player' && character) {
      const prof = calculateProficiencyBonus(character.level);
      const pp = calculatePassivePerception(
        character.abilities.wis.score,
        character.skills.perception,
        prof
      );
      map.set(character.id, {
        characterId: character.id,
        characterName: character.name,
        playerName: character.playerName || 'Jugador',
        avatarType: character.avatarType || (character.avatarUrl ? 'custom' : 'icon'),
        avatarCustomUrl: character.avatarCustomUrl || character.avatarUrl,
        avatarIcon: character.avatarIcon || 'anonymous',
        avatarUrl: character.avatarUrl,
        currentHp: character.currentHp,
        maxHp: character.maxHp,
        ac: character.armorClass,
        passivePerception: pp,
        level: character.level,
        experience: character.experience ?? character.xp ?? 0,
        alignment: character.alignment,
        speed: character.speed,
        initiative: character.initiativeBonus,
        race: character.race,
        characterClass: `${character.race} ${character.characterClass}`,
        lastPing: Date.now(),
        abilities: {
          str: character.abilities.str.score,
          dex: character.abilities.dex.score,
          con: character.abilities.con.score,
          int: character.abilities.int.score,
          wis: character.abilities.wis.score,
          cha: character.abilities.cha.score,
        },
        currency: character.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      });
    }
    return Array.from(map.values());
  }, [partyMembers, mode, character]);

  // =========================================================================
  // 4. ENEMY CARDS IN SALA EN VIVO
  // =========================================================================
  const resolvedEnemies: LiveCombatantMini[] = useMemo(() => {
    if (mode === 'dm' && workspace) {
      const combatants = workspace.activeEncounter?.combatants || [];
      return combatants
        .filter((c) => (c.faction || (c.isPlayer ? 'ally' : 'enemy')) === 'enemy')
        .map((c) => {
          const mon = (workspace.monsters || []).find(
            (m) => m.id === c.sourceId || m.name.toLowerCase() === c.name.toLowerCase()
          );
          return {
            id: c.id,
            name: c.name,
            hp: c.hp,
            maxHp: c.maxHp,
            ac: c.ac,
            passivePerception: c.passivePerception ?? 10,
            faction: 'enemy' as const,
            isPlayer: false,
            conditions: c.conditions || [],
            levelOrCr: mon?.cr ? `CR ${mon.cr}` : 'Niv 1',
            initiative: c.initiative || 10,
            speed: mon?.speed || '30 ft',
            avatarType: mon?.avatarType,
            avatarCustomUrl: mon?.avatarCustomUrl || mon?.avatarUrl,
            avatarIcon: mon?.avatarIcon || 'skull',
          };
        });
    }
    if (!showCombatantsOnTable) return [];
    return (liveCombatants || []).filter((c) => c.faction === 'enemy' && !c.isPlayer);
  }, [mode, workspace, showCombatantsOnTable, liveCombatants]);

  const handleDmAdjustEnemyHp = (combatantId: string, delta: number) => {
    if (mode !== 'dm' || !workspace || !onUpdateWorkspace) return;
    const enc = workspace.activeEncounter;
    if (!enc) return;
    const updatedCombatants = (enc.combatants || []).map((c) => {
      if (c.id !== combatantId) return c;
      const nextHp = Math.max(0, Math.min(c.maxHp, c.hp + delta));
      return { ...c, hp: nextHp };
    });
    onUpdateWorkspace({
      ...workspace,
      activeEncounter: {
        ...enc,
        combatants: updatedCombatants,
      },
    });
  };

  const handleDmToggleBroadcastEnemies = () => {
    if (mode !== 'dm' || !workspace || !onUpdateWorkspace) return;
    const enc = workspace.activeEncounter || {
      id: 'enc-default',
      name: 'Encuentro Activo',
      round: 1,
      currentTurnIndex: 0,
      combatants: [],
      isActive: true,
    };
    onUpdateWorkspace({
      ...workspace,
      activeEncounter: {
        ...enc,
        broadcastEnemiesToTable: !enc.broadcastEnemiesToTable,
      },
    });
  };

  const handleDmAddMonsterToTable = (monId: string) => {
    if (mode !== 'dm' || !workspace || !onUpdateWorkspace) return;
    const mon = (workspace.monsters || []).find((m) => m.id === monId);
    if (!mon) return;
    const enc = workspace.activeEncounter || {
      id: 'enc-default',
      name: 'Encuentro Activo',
      round: 1,
      currentTurnIndex: 0,
      combatants: [],
      isActive: true,
      broadcastEnemiesToTable: true,
    };
    if (!canAddEnemyToEncounter(enc.combatants || [], MAX_ENCOUNTER_ENEMIES)) {
      return;
    }
    const dexMod = calculateModifier(mon.dex || 10);
    const initRoll = Math.floor(Math.random() * 20) + 1 + dexMod;
    const newCombatant: Combatant = {
      id: `cmb-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: mon.name,
      initiative: initRoll,
      hp: mon.hp || mon.maxHp || 15,
      maxHp: mon.maxHp || 15,
      ac: mon.ac || 12,
      passivePerception: 10 + calculateModifier(mon.wis || 10),
      isPlayer: false,
      faction: 'enemy',
      conditions: [],
      sourceId: mon.id,
    };
    onUpdateWorkspace({
      ...workspace,
      activeEncounter: {
        ...enc,
        broadcastEnemiesToTable: true,
        combatants: [...(enc.combatants || []), newCombatant],
      },
    });
    setIsAddEnemyModalOpen(false);
  };

  // =========================================================================
  // 5. PLAYER READ-ONLY DECKS (ATAQUES, HABILIDADES, CONJUROS)
  // =========================================================================
  const playerAttackCards = useMemo(() => {
    if (!character) return [];
    const customAtks = character.attacks || [];
    const profBonus = calculateProficiencyBonus(character.level);
    const derivedWeaponAtks = deriveEquippedWeaponAttacks(
      character.inventory || [],
      character.abilities?.str?.score ?? 10,
      character.abilities?.dex?.score ?? 10,
      profBonus
    ).map((d) => ({
      ...d,
      damageDice: d.damageFormula || d.formula || '1d6',
    }));
    const existingNames = new Set(customAtks.map((a) => a.name.toLowerCase()));
    const combined = [
      ...customAtks,
      ...derivedWeaponAtks.filter((d) => !existingNames.has(d.name.toLowerCase())),
    ];
    return combined;
  }, [character]);

  const playerSkillCards = useMemo(() => {
    if (!character) return [];
    const profBonus = calculateProficiencyBonus(character.level);
    const srdProficient = (Object.keys(SKILL_METADATA) as SkillKey[])
      .filter((k) => character.skills[k] === 'proficient' || character.skills[k] === 'expertise')
      .map((k) => {
        const meta = SKILL_METADATA[k];
        const abilMod = getEffectiveAbilityModifier(character.abilities[meta.ability]);
        const totalMod =
          abilMod + (character.skills[k] === 'expertise' ? profBonus * 2 : profBonus);
        return {
          id: `srd-${k}`,
          name: meta.nameEs,
          abilityAbbr: ABILITY_LABELS[meta.ability].abbr,
          totalMod,
          proficiency: character.skills[k],
          description: meta.description,
        };
      });

    const custom = (character.customSkills || []).map((cs) => {
      const abilMod = getEffectiveAbilityModifier(character.abilities[cs.ability]);
      const totalMod =
        abilMod + (cs.proficiency === 'expertise' ? profBonus * 2 : profBonus);
      return {
        id: cs.id,
        name: cs.name,
        abilityAbbr: ABILITY_LABELS[cs.ability].abbr,
        totalMod,
        proficiency: cs.proficiency,
        description: cs.description || 'Habilidad de personaje',
      };
    });

    return [...srdProficient, ...custom];
  }, [character]);

  const playerSpellCards = useMemo(() => {
    if (!character) return [];
    return (character.spells || []).filter((s) => s.prepared || s.level === 0);
  }, [character]);

  const currentPlayerDeckCount =
    activePlayerDeck === 'attacks'
      ? playerAttackCards.length
      : activePlayerDeck === 'skills'
      ? playerSkillCards.length
      : playerSpellCards.length;

  const maxPlayerDeckScroll = Math.max(0, currentPlayerDeckCount - 3);
  const safePlayerDeckScroll = Math.min(playerDeckScrollIdx, maxPlayerDeckScroll);

  // =========================================================================
  // 6. DICE BOX ROLL HANDLER (SUPPORTS 1 TO 6 DICE)
  // =========================================================================
  const executeDiceRoll = (
    sides: number,
    count: number,
    mod: number,
    customTitle?: string
  ) => {
    const safeCount = Math.max(1, Math.min(6, count));
    const rolls: number[] = [];
    for (let i = 0; i < safeCount; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    const sumRolls = rolls.reduce((acc, r) => acc + r, 0);
    const total = sumRolls + mod;
    const formula = `${safeCount}d${sides}${mod !== 0 ? (mod > 0 ? `+${mod}` : `${mod}`) : ''}`;
    const rollerName =
      mode === 'dm'
        ? 'Dungeon Master'
        : character
        ? character.name
        : 'Aventurero';

    const result: DiceRollResult = {
      id: `roll-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      rollerName,
      rollTitle: customTitle || `Tirada ${safeCount}D${sides}`,
      formula,
      mode: 'normal',
      diceType: sides,
      rolls,
      chosenRoll: sumRolls,
      modifier: mod,
      total,
      isCrit: sides === 20 && rolls.includes(20),
      isFumble: sides === 20 && rolls.includes(1) && !rolls.includes(20),
      timestamp: Date.now(),
    };

    try {
      soundFx.playDiceRoll();
    } catch {}

    setLastBoxRoll(result);
    if (onRollSubmitted) {
      onRollSubmitted(result);
    } else if (onRollComplete) {
      onRollComplete(result);
    }
  };

  // =========================================================================
  // 7. DM MAP & GALLERY PROJECTION HANDLERS
  // =========================================================================
  const handleDmSelectMapProjection = () => {
    if (!workspace || !onUpdateWorkspace) return;
    onUpdateWorkspace({
      ...workspace,
      activeLiveVisual: {
        kind: 'map',
        id: `map-${selectedFolder}`,
        title: `Mapa: ${currentPlaceShortName}`,
        imageUrl: currentPlaceMapUrl,
        folder: selectedFolder,
      },
    });
  };

  const handleDmSelectGalleryPhoto = (photo: PlaceAlbumPhoto) => {
    if (!workspace || !onUpdateWorkspace) return;
    onUpdateWorkspace({
      ...workspace,
      activeLiveVisual: {
        kind: 'album',
        id: photo.id,
        title: photo.title,
        imageUrl: photo.imageUrl,
        folder: selectedFolder,
      },
    });
  };

  const handleDmUploadMapFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspace || !onUpdateWorkspace) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 1000, 0.86);
      onUpdateWorkspace({
        ...workspace,
        atlasMaps: {
          ...(workspace.atlasMaps || {}),
          [selectedFolder]: dataUrl,
        },
        activeLiveVisual: {
          kind: 'map',
          id: `map-${selectedFolder}`,
          title: `Mapa: ${currentPlaceShortName}`,
          imageUrl: dataUrl,
          folder: selectedFolder,
        },
      });
    } catch {}
    e.target.value = '';
  };

  const handleDmUploadGalleryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspace || !onUpdateWorkspace) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 1000, 0.86);
      const newPhoto: PlaceAlbumPhoto = {
        id: `photo-${Date.now()}`,
        title: newGalleryTitle.trim() || `Escena de ${currentPlaceShortName}`,
        imageUrl: dataUrl,
        folder: selectedFolder === 'all' ? 'General' : selectedFolder,
        createdAt: Date.now(),
      };
      onUpdateWorkspace({
        ...workspace,
        placeAlbumPhotos: [newPhoto, ...(workspace.placeAlbumPhotos || [])],
        activeLiveVisual: {
          kind: 'album',
          id: newPhoto.id,
          title: newPhoto.title,
          imageUrl: newPhoto.imageUrl,
          folder: selectedFolder,
        },
      });
      setNewGalleryTitle('');
    } catch {}
    e.target.value = '';
  };

  const handleDmAddGalleryByUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGalleryUrl.trim() || !workspace || !onUpdateWorkspace) return;
    const newPhoto: PlaceAlbumPhoto = {
      id: `photo-${Date.now()}`,
      title: newGalleryTitle.trim() || `Escena de ${currentPlaceShortName}`,
      imageUrl: newGalleryUrl.trim(),
      folder: selectedFolder === 'all' ? 'General' : selectedFolder,
      createdAt: Date.now(),
    };
    onUpdateWorkspace({
      ...workspace,
      placeAlbumPhotos: [newPhoto, ...(workspace.placeAlbumPhotos || [])],
      activeLiveVisual: {
        kind: 'album',
        id: newPhoto.id,
        title: newPhoto.title,
        imageUrl: newPhoto.imageUrl,
        folder: selectedFolder,
      },
    });
    setNewGalleryTitle('');
    setNewGalleryUrl('');
    setIsEditMapModalOpen(false);
  };

  const handleDmCreateSubPlace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubPlaceName.trim() || !workspace || !onUpdateWorkspace) return;
    const clean = newSubPlaceName.trim().replace(/\//g, '-');
    const newFolderPath =
      selectedFolder === 'all' ? clean : `${selectedFolder} / ${clean}`;
    const existingFolders = workspace.folders || [];
    const nextFolders = existingFolders.includes(newFolderPath)
      ? existingFolders
      : [...existingFolders, newFolderPath];

    onUpdateWorkspace({
      ...workspace,
      folders: nextFolders,
      activeAtlasFolder: newFolderPath,
      activeLiveVisual: {
        kind: 'map',
        id: `map-${newFolderPath}`,
        title: clean,
        imageUrl: workspace.atlasMaps?.[newFolderPath] || '',
        folder: newFolderPath,
      },
    });
    setNewSubPlaceName('');
    setIsAddSubPlaceModalOpen(false);
  };

  // =========================================================================
  // 8. NOTEBOOK / CHRONICLES HANDLERS
  // =========================================================================
  const handleSaveDmQuickChronicle = () => {
    if (!workspace || !onUpdateWorkspace) return;
    if (!dmQuickLogTitle.trim() && !dmQuickLogSummary.trim()) return;
    const newEntry = {
      id: `log-${Date.now()}`,
      sessionNumber: (workspace.campaignLogs?.length || 0) + 1,
      title: dmQuickLogTitle.trim() || `Crónica en ${currentPlaceShortName}`,
      date: new Date().toLocaleDateString(),
      summary: dmQuickLogSummary.trim(),
      publicNotes: dmQuickLogSummary.trim(),
      privateNotes: '',
      tags: [currentPlaceShortName],
      folder: selectedFolder === 'all' ? 'General' : selectedFolder,
    };
    onUpdateWorkspace({
      ...workspace,
      campaignLogs: [newEntry, ...(workspace.campaignLogs || [])],
    });
    setDmQuickLogTitle('');
    setDmQuickLogSummary('');
    setNotebookSavedFeedback('✓ Entrada guardada en Crónicas');
    setTimeout(() => setNotebookSavedFeedback(''), 2500);
  };

  const handleSendLiveMessageFromDm = () => {
    if (mode !== 'dm') return;
    if (workspace && onUpdateWorkspace) {
      onUpdateWorkspace({
        ...workspace,
        dmLiveMessage: dmMessageInput,
      });
    }
    if (onUpdateDmLiveMessage) {
      onUpdateDmLiveMessage(dmMessageInput);
    }
    setDmMessageSentToast(true);
    setTimeout(() => setDmMessageSentToast(false), 2500);
  };

  const handleSendWhisperToDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSendPlayerMessageToDM || !whisperTitle.trim() || !whisperBody.trim()) return;
    const res = await onSendPlayerMessageToDM(whisperTitle.trim(), whisperBody.trim());
    if (res.ok) {
      setWhisperStatus('✓ Mensaje enviado al Dungeon Master');
      setWhisperTitle('');
      setWhisperBody('');
      setTimeout(() => {
        setWhisperStatus('');
        setIsWhisperModalOpen(false);
      }, 1500);
    } else {
      setWhisperStatus(res.error || 'Error al enviar el mensaje');
    }
  };

  const latestRoll = lastBoxRoll || rollFeed[rollFeed.length - 1] || null;

  return (
    <div
      className="w-full max-w-[1920px] mx-auto px-1 sm:px-2.5 py-2 text-stone-200 select-none space-y-2.5"
      data-testid="table-map-view"
    >
      {/* =================================================================== */}
      {/* MAIN 3-COLUMN TABLETOP MAP GRID (Full Viewport Width Utilized)      */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-[385px_minmax(0,1fr)_325px] xl:grid-cols-[425px_minmax(0,1fr)_350px] gap-2.5 items-stretch">
        {/* ================================================================= */}
        {/* LEFT COLUMN: CARTAS DE JUGADORES (2x2 COMPACT GRID - 4 FIT AT ONCE) */}
        {/* ================================================================= */}
        <div className="bg-gradient-to-b from-[#171820] via-[#13141b] to-[#0f1016] border-2 border-[#c8a45c]/75 rounded-2xl p-2.5 flex flex-col justify-between shadow-[0_0_30px_rgba(0,0,0,0.85)]">
          <div>
            <div className="flex items-center justify-between border-b border-[#c8a45c]/35 pb-1.5 mb-2">
              <h2 className="font-cinzel font-black text-xs sm:text-sm text-[#f5e4be] tracking-wider uppercase">
                CARTAS DE JUGADORES
              </h2>
              <span className="text-[11px] font-mono text-[#e2c275]">
                {resolvedPlayerCards.length} en Sala
              </span>
            </div>

            {resolvedPlayerCards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#c8a45c]/40 bg-[#12131a]/80 p-6 text-center space-y-2 my-4">
                <Shield className="w-8 h-8 text-[#c8a45c]/60 mx-auto" />
                <p className="font-cinzel font-bold text-xs text-[#f5e4be]">
                  Sin aventureros conectados aún
                </p>
                <p className="text-[11px] text-stone-400">
                  Cuando los jugadores entren a la sala <strong className="text-amber-300">{roomCode}</strong>, sus cartas aparecerán aquí en tiempo real.
                </p>
              </div>
            ) : (
              <div
                data-testid="map-player-cards-grid"
                className="grid grid-cols-2 gap-2 max-h-[650px] overflow-y-auto pr-0.5 custom-scrollbar"
              >
                {resolvedPlayerCards.map((member) => (
                  <CharacterTarotCard
                    key={member.characterId}
                    member={member}
                    isOnline={true}
                    miniGrid={true}
                    showDmControls={mode === 'dm'}
                    onDmAdjustPlayer={onDmAdjustPlayer}
                    dataTestId={`map-player-card-${member.characterId}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* CENTER COLUMN: MAP VIEWPORT + MINIMIZABLE OVERLAYS                */}
        {/* ================================================================= */}
        <div className="flex flex-col gap-2.5 min-w-0">
          {/* DM-ONLY TOP LOCATION SWITCHER BAR ("Ruta de la Zona") */}
          {mode === 'dm' && workspace && (
            <div
              className="bg-gradient-to-r from-[#191b24] via-[#151720] to-[#191b24] border-2 border-[#c8a45c]/75 rounded-2xl px-3.5 py-2.5 shadow-xl space-y-2"
              data-testid="dm-map-top-location-bar"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-cinzel font-black text-xs sm:text-sm text-[#f5e4be] truncate">
                    Ruta de la Zona ( 🍺 {currentPlaceShortName} )
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    data-testid="btn-dm-map-edit"
                    onClick={() => {
                      setMapUrlDraft(currentPlaceMapUrl);
                      setIsEditMapModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-[#252019] hover:bg-[#332b20] border border-[#c8a45c]/80 text-[#f5e4be] font-cinzel font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-amber-300" />
                    <span>Editar Mapa / Galería</span>
                  </button>

                  {currentPlaceDepth < 4 && (
                    <button
                      type="button"
                      data-testid="btn-dm-add-subplace"
                      onClick={() => setIsAddSubPlaceModalOpen(true)}
                      className="px-2.5 py-1 rounded-xl bg-[#1a1d28] hover:bg-[#242938] border border-[#c8a45c]/60 text-[#f5e4be] font-cinzel font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-amber-300" />
                      <span>+ Sub-Lugar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Breadcrumbs + Direct Sub-Place Selector Pills */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.fullPath}>
                    {idx > 0 && (
                      <ChevronRight className="w-3.5 h-3.5 text-[#c8a45c]/70 shrink-0" />
                    )}
                    <button
                      type="button"
                      onClick={() => setDmSelectedFolder(crumb.fullPath)}
                      className={`px-2 py-0.5 rounded-lg font-cinzel font-bold transition cursor-pointer flex items-center gap-1 ${
                        selectedFolder === crumb.fullPath
                          ? 'bg-amber-950/90 border border-[#e2c275] text-[#f5e4be]'
                          : 'bg-black/40 border border-stone-700 text-stone-300 hover:text-white'
                      }`}
                    >
                      {idx === 0 && <Compass className="w-3 h-3 text-amber-400" />}
                      <span>{crumb.label}</span>
                    </button>
                  </React.Fragment>
                ))}

                {childFolders.length > 0 && (
                  <>
                    <span className="text-[10px] text-stone-400 font-cinzel ml-1">
                      Ir a sub-lugar:
                    </span>
                    {childFolders.map((sub) => {
                      const shortSub = sub.split('/').pop()?.trim() || sub;
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setDmSelectedFolder(sub)}
                          className="px-2 py-0.5 rounded-lg bg-[#1e2230] hover:bg-amber-950/70 border border-[#c8a45c]/50 text-amber-200 text-[11px] font-cinzel font-bold transition cursor-pointer flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{shortSub}</span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          )}

          {/* MAIN MAP / SCENE CANVAS CONTAINER */}
          <div className="relative flex-1 min-h-[530px] rounded-2xl bg-[#11131a] border-2 border-[#c8a45c]/80 overflow-hidden shadow-[0_0_35px_rgba(0,0,0,0.9)] flex flex-col justify-between">
            {/* Top Bar Inside Map Viewport: Active Visual Title Badge (Left) + Zoom Controls (Right) */}
            <div className="relative z-20 px-3.5 py-2 flex items-center justify-between gap-2 pointer-events-none">
              <div
                data-testid="active-projected-visual-badge"
                className="px-2.5 py-1 rounded-xl bg-black/75 border border-[#c8a45c]/60 text-[#f5e4be] text-[11px] font-cinzel font-bold flex items-center gap-1.5 shadow-lg pointer-events-auto truncate max-w-[70%]"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">
                  {activeVisual.kind === 'photo' || activeVisual.kind === 'album'
                    ? `🖼️ Imagen en Vivo: ${activeVisual.title}`
                    : activeVisual.kind === 'tactical'
                    ? `⚔️ Mapa Táctico: ${activeVisual.title}`
                    : `🗺️ ${activeVisual.title}`}
                </span>
              </div>

              <div className="flex items-center bg-black/75 border border-[#c8a45c]/50 rounded-xl overflow-hidden pointer-events-auto shadow-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setMapZoom((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))}
                  className="p-1.5 text-stone-300 hover:text-white hover:bg-stone-800 transition cursor-pointer"
                  title="Alejar mapa"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setMapZoom(1)}
                  className="px-2 text-[10px] font-mono text-amber-300 hover:text-white cursor-pointer"
                  title="Restablecer zoom"
                >
                  {Math.round(mapZoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setMapZoom((z) => Math.min(2.25, +(z + 0.25).toFixed(2)))}
                  className="p-1.5 text-stone-300 hover:text-white hover:bg-stone-800 transition cursor-pointer"
                  title="Acercar mapa"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Center Map / Gallery Image Layer */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#0d0e14]">
              {activeVisual.imageUrl ? (
                <img
                  data-testid="table-map-projected-image"
                  src={activeVisual.imageUrl}
                  alt={activeVisual.title}
                  style={{ transform: `scale(${mapZoom})` }}
                  className="w-full h-full object-contain transition-transform duration-200"
                />
              ) : (
                /* Stylized Tabletop Cartography Canvas Fallback when no custom image is set yet */
                <div
                  style={{ transform: `scale(${mapZoom})` }}
                  className="w-full h-full flex flex-col items-center justify-center relative bg-[radial-gradient(circle_at_center,#292016_0%,#15120e_70%,#0b0a09_100%)] transition-transform duration-200"
                >
                  {/* Subtle Dungeon / Parchment Grid Overlay */}
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, #c8a45c 1px, transparent 1px), linear-gradient(to bottom, #c8a45c 1px, transparent 1px)',
                      backgroundSize: '48px 48px',
                    }}
                  />
                  <div className="relative z-10 text-center px-6 py-8 rounded-3xl bg-black/55 border-2 border-[#c8a45c]/50 backdrop-blur-sm max-w-md space-y-2.5 shadow-2xl">
                    <Compass className="w-12 h-12 text-[#e2c275] mx-auto" />
                    <h3 className="font-cinzel font-black text-lg text-[#f5e4be] uppercase tracking-wider">
                      {currentPlaceShortName}
                    </h3>
                    <p className="text-xs text-[#cbb692] leading-relaxed">
                      {mode === 'dm'
                        ? 'Usa "Proyección de Zona" abajo a la izquierda o el botón "Editar Mapa / Galería" arriba para proyectar el mapa de este lugar o mostrar imágenes de su galería a los jugadores.'
                        : `Explorando ${currentPlaceShortName}. Aquí verás en vivo los mapas e imágenes de galería que proyecte el Dungeon Master.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Interactive Sub-Place Pins on Map for DM */}
              {mode === 'dm' &&
                activeVisual.kind === 'map' &&
                childFolders.map((subFolder, idx) => {
                  const shortLabel = subFolder.split('/').pop()?.trim() || subFolder;
                  const pos = getPinPositionForChildPlace(
                    subFolder,
                    idx,
                    childFolders.length,
                    workspace?.atlasPinPositions
                  );
                  return (
                    <button
                      key={subFolder}
                      type="button"
                      onClick={() => setDmSelectedFolder(subFolder)}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#171821]/95 hover:bg-amber-950 border-2 border-[#e2c275] text-[#f5e4be] text-xs font-cinzel font-bold flex items-center gap-1.5 shadow-[0_6px_20px_rgba(0,0,0,0.95)] hover:scale-105 transition cursor-pointer"
                      title={`Entrar a ${shortLabel}`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{shortLabel}</span>
                    </button>
                  );
                })}
            </div>

            {/* =============================================================== */}
            {/* BOTTOM OVERLAYS ROW ON MAP:                                     */}
            {/* Left: Player Cards OR DM Projection | Right: Open Notebook      */}
            {/* =============================================================== */}
            <div className="relative z-20 p-3 flex flex-col xl:flex-row items-end justify-between gap-3 pointer-events-none mt-auto">
              {/* ------------------------------------------------------------- */}
              {/* BOTTOM-LEFT OVERLAY:                                          */}
              {/* Player -> Read-Only Cards | DM -> Proyección de Zona          */}
              {/* ------------------------------------------------------------- */}
              <div className="w-full xl:w-[56%] pointer-events-auto">
                {mode === 'player' ? (
                  /* PLAYER MINIMIZABLE DECK OVERLAY (Ataques, Habilidades, Conjuros) */
                  <div
                    className="rounded-2xl bg-[#12131c]/95 backdrop-blur-md border-2 border-[#c8a45c]/85 shadow-[0_10px_30px_rgba(0,0,0,0.95)] overflow-hidden transition-all"
                    data-testid="player-map-cards-overlay"
                  >
                    {/* Header with Minimize Toggle */}
                    <div className="px-3 py-2 bg-gradient-to-r from-[#241c14] via-[#1a1510] to-[#14110d] border-b border-[#c8a45c]/40 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#e2c275]" />
                        <span className="font-cinzel font-black text-xs text-[#f5e4be] uppercase tracking-wider">
                          Mazos de {character?.name || 'Personaje'}
                        </span>
                      </div>
                      <button
                        type="button"
                        data-testid="btn-toggle-player-cards-overlay"
                        onClick={() => setIsLeftOverlayMinimized((prev) => !prev)}
                        className="px-2.5 py-1 rounded-lg bg-black/50 hover:bg-black/80 border border-[#c8a45c]/50 text-[#e2c275] text-[10px] font-cinzel font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {isLeftOverlayMinimized ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Abrir Cartas</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>Minimizar</span>
                          </>
                        )}
                      </button>
                    </div>

                    {!isLeftOverlayMinimized && (
                      <div className="p-2.5 space-y-2">
                        {/* 3 Deck Category Tabs (Ataques, Habilidades, Conjuros) */}
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActivePlayerDeck('attacks');
                              setPlayerDeckScrollIdx(0);
                            }}
                            className={`py-1.5 px-2 rounded-xl border font-cinzel font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer ${
                              activePlayerDeck === 'attacks'
                                ? 'bg-gradient-to-b from-[#3b2919] to-[#1d140c] border-[#f5e4be] text-[#f5e4be] shadow'
                                : 'bg-[#171923] border-[#c8a45c]/35 text-stone-300 hover:text-white'
                            }`}
                          >
                            <Sword className="w-3.5 h-3.5 text-amber-400" />
                            <span>Ataques ({playerAttackCards.length})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActivePlayerDeck('skills');
                              setPlayerDeckScrollIdx(0);
                            }}
                            className={`py-1.5 px-2 rounded-xl border font-cinzel font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer ${
                              activePlayerDeck === 'skills'
                                ? 'bg-gradient-to-b from-[#17303a] to-[#0f1c22] border-cyan-300 text-cyan-100 shadow'
                                : 'bg-[#171923] border-[#c8a45c]/35 text-stone-300 hover:text-white'
                            }`}
                          >
                            <Shield className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Habilidades ({playerSkillCards.length})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActivePlayerDeck('spells');
                              setPlayerDeckScrollIdx(0);
                            }}
                            className={`py-1.5 px-2 rounded-xl border font-cinzel font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer ${
                              activePlayerDeck === 'spells'
                                ? 'bg-gradient-to-b from-[#2f1a42] to-[#180d22] border-purple-300 text-purple-100 shadow'
                                : 'bg-[#171923] border-[#c8a45c]/35 text-stone-300 hover:text-white'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            <span>Conjuros ({playerSpellCards.length})</span>
                          </button>
                        </div>

                        {/* Cards Row with Scroll Arrows (Read-only, Click to Roll) */}
                        <div className="flex items-center gap-1.5">
                          {currentPlayerDeckCount > 3 && (
                            <button
                              type="button"
                              disabled={safePlayerDeckScroll === 0}
                              onClick={() =>
                                setPlayerDeckScrollIdx(Math.max(0, safePlayerDeckScroll - 1))
                              }
                              className="w-6 h-24 rounded-xl bg-[#191c28] hover:bg-amber-950 disabled:opacity-30 border border-[#c8a45c]/60 text-[#f5e4be] flex items-center justify-center shrink-0 cursor-pointer"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                          )}

                          <div className="flex-1 grid grid-cols-3 gap-2 min-h-[104px]">
                            {activePlayerDeck === 'attacks' &&
                              playerAttackCards
                                .slice(safePlayerDeckScroll, safePlayerDeckScroll + 3)
                                .map((atk) => (
                                  <button
                                    key={atk.id}
                                    type="button"
                                    onClick={() =>
                                      executeDiceRoll(20, 1, atk.attackBonus, `Ataque: ${atk.name}`)
                                    }
                                    className="rounded-xl bg-gradient-to-b from-[#251d15] to-[#13100c] border-2 border-[#c8a45c]/80 hover:border-[#f5e4be] p-2 flex flex-col justify-between text-left transition hover:-translate-y-0.5 cursor-pointer shadow"
                                    title={`Clic para tirar impacto con ${atk.name} (${formatModifier(atk.attackBonus)})`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <Sword className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                      <span className="text-[10px] font-mono font-bold text-amber-300 px-1.5 py-0.2 rounded bg-black/60 border border-amber-500/40">
                                        {formatModifier(atk.attackBonus)}
                                      </span>
                                    </div>
                                    <div className="font-cinzel font-black text-[11px] text-[#f5e4be] uppercase truncate my-1">
                                      {atk.name}
                                    </div>
                                    <div className="text-[10px] font-mono text-[#cbb692] truncate border-t border-[#c8a45c]/30 pt-1">
                                      Daño: {atk.damageDice}
                                    </div>
                                  </button>
                                ))}

                            {activePlayerDeck === 'skills' &&
                              playerSkillCards
                                .slice(safePlayerDeckScroll, safePlayerDeckScroll + 3)
                                .map((sk) => (
                                  <button
                                    key={sk.id}
                                    type="button"
                                    onClick={() =>
                                      executeDiceRoll(20, 1, sk.totalMod, `Habilidad: ${sk.name}`)
                                    }
                                    className="rounded-xl bg-gradient-to-b from-[#162730] to-[#10181d] border-2 border-cyan-500/65 hover:border-cyan-300 p-2 flex flex-col justify-between text-left transition hover:-translate-y-0.5 cursor-pointer shadow"
                                    title={`${sk.name}: ${sk.description}`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-[9px] font-cinzel font-bold text-cyan-300">
                                        {sk.abilityAbbr}
                                      </span>
                                      <span className="text-[10px] font-mono font-bold text-cyan-200 px-1.5 py-0.2 rounded bg-black/60 border border-cyan-500/40">
                                        {formatModifier(sk.totalMod)}
                                      </span>
                                    </div>
                                    <div className="font-cinzel font-black text-[11px] text-[#f5e4be] uppercase truncate my-1">
                                      {sk.name}
                                    </div>
                                    <div className="text-[9px] text-cyan-200/80 truncate border-t border-cyan-500/30 pt-1">
                                      {sk.proficiency === 'expertise' ? 'Pericia' : 'Competente'}
                                    </div>
                                  </button>
                                ))}

                            {activePlayerDeck === 'spells' &&
                              playerSpellCards
                                .slice(safePlayerDeckScroll, safePlayerDeckScroll + 3)
                                .map((sp) => (
                                  <button
                                    key={sp.id}
                                    type="button"
                                    onClick={() =>
                                      executeDiceRoll(20, 1, 0, `Conjuro: ${sp.name}`)
                                    }
                                    className="rounded-xl bg-gradient-to-b from-[#261736] to-[#130d1b] border-2 border-purple-400/70 hover:border-purple-200 p-2 flex flex-col justify-between text-left transition hover:-translate-y-0.5 cursor-pointer shadow"
                                    title={sp.description}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <Sparkles className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                                      <span className="text-[9px] font-mono font-bold text-purple-200 px-1.5 py-0.2 rounded bg-black/60 border border-purple-500/40">
                                        {sp.level === 0 ? 'Truco' : `Niv ${sp.level}`}
                                      </span>
                                    </div>
                                    <div className="font-cinzel font-black text-[11px] text-[#f5e4be] uppercase truncate my-1">
                                      {sp.name}
                                    </div>
                                    <div className="text-[9px] text-purple-200/80 truncate border-t border-purple-500/30 pt-1">
                                      {sp.castingTime || '1 Acción'}
                                    </div>
                                  </button>
                                ))}

                            {currentPlayerDeckCount === 0 && (
                              <div className="col-span-3 rounded-xl border border-dashed border-[#c8a45c]/35 bg-black/40 flex items-center justify-center p-3 text-center text-[11px] text-stone-400 font-cinzel">
                                Sin cartas preparadas en este mazo.
                              </div>
                            )}
                          </div>

                          {currentPlayerDeckCount > 3 && (
                            <button
                              type="button"
                              disabled={safePlayerDeckScroll >= maxPlayerDeckScroll}
                              onClick={() =>
                                setPlayerDeckScrollIdx(
                                  Math.min(maxPlayerDeckScroll, safePlayerDeckScroll + 1)
                                )
                              }
                              className="w-6 h-24 rounded-xl bg-[#191c28] hover:bg-amber-950 disabled:opacity-30 border border-[#c8a45c]/60 text-[#f5e4be] flex items-center justify-center shrink-0 cursor-pointer"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* DM MINIMIZABLE PROJECTION PANEL ("Proyección de Zona") */
                  <div
                    className="rounded-2xl bg-[#12141d]/95 backdrop-blur-md border-2 border-[#c8a45c]/85 shadow-[0_10px_30px_rgba(0,0,0,0.95)] overflow-hidden transition-all"
                    data-testid="dm-map-projection-overlay"
                  >
                    <div className="px-3 py-2 bg-gradient-to-r from-[#241d14] via-[#181510] to-[#13110e] border-b border-[#c8a45c]/40 flex items-center justify-between gap-2">
                      <span className="font-cinzel font-black text-xs text-[#f5e4be] truncate">
                        Proyección de Zona ( 🍺 {currentPlaceShortName} )
                      </span>
                      <button
                        type="button"
                        data-testid="btn-toggle-dm-projection-overlay"
                        onClick={() => setIsLeftOverlayMinimized((prev) => !prev)}
                        className="px-2.5 py-1 rounded-lg bg-black/50 hover:bg-black/80 border border-[#c8a45c]/50 text-[#e2c275] text-[10px] font-cinzel font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {isLeftOverlayMinimized ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Abrir Proyección</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>Minimizar</span>
                          </>
                        )}
                      </button>
                    </div>

                    {!isLeftOverlayMinimized && (
                      <div className="p-2.5 space-y-2.5">
                        {/* Tabs: Imágenes y Mapa | Mapas Tácticos */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDmProjectionTab('gallery')}
                            className={`py-1.5 px-2 rounded-xl font-cinzel font-bold text-xs border transition cursor-pointer ${
                              dmProjectionTab === 'gallery'
                                ? 'bg-amber-950/80 border-[#e2c275] text-[#f5e4be]'
                                : 'bg-[#181a24] border-stone-700 text-stone-400 hover:text-white'
                            }`}
                          >
                            Mapa e Imágenes ({filteredAlbumPhotos.length + 1})
                          </button>
                          <button
                            type="button"
                            onClick={() => setDmProjectionTab('tactical')}
                            className={`py-1.5 px-2 rounded-xl font-cinzel font-bold text-xs border transition cursor-pointer ${
                              dmProjectionTab === 'tactical'
                                ? 'bg-amber-950/80 border-[#e2c275] text-[#f5e4be]'
                                : 'bg-[#181a24] border-stone-700 text-stone-400 hover:text-white'
                            }`}
                          >
                            Mapas Tácticos
                          </button>
                        </div>

                        {dmProjectionTab === 'gallery' ? (
                          <>
                            {/* Horizontal Thumbnail Cards: Base Place Map + Gallery Photos */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[128px] overflow-y-auto pr-1">
                              {/* Card 1: Base Map of the Place */}
                              {(() => {
                                const isMapLive = activeVisual.kind === 'map';
                                return (
                                  <button
                                    type="button"
                                    onClick={handleDmSelectMapProjection}
                                    className={`rounded-xl border-2 p-1.5 flex flex-col justify-between text-left transition cursor-pointer overflow-hidden ${
                                      isMapLive
                                        ? 'bg-emerald-950/40 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                                        : 'bg-[#171922] border-stone-700 hover:border-[#c8a45c]'
                                    }`}
                                  >
                                    <span className="text-[10px] font-cinzel font-bold text-[#f5e4be] truncate w-full">
                                      Mapa: {currentPlaceShortName}
                                    </span>
                                    <div className="h-12 w-full rounded-lg bg-black/60 border border-stone-800 my-1 overflow-hidden flex items-center justify-center">
                                      {currentPlaceMapUrl ? (
                                        <img
                                          src={currentPlaceMapUrl}
                                          alt={currentPlaceShortName}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <Compass className="w-5 h-5 text-amber-400/70" />
                                      )}
                                    </div>
                                    <div className="flex items-center justify-center gap-1 text-[9px] font-cinzel font-bold">
                                      <span
                                        className={`w-2 h-2 rounded-full ${
                                          isMapLive ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'
                                        }`}
                                      />
                                      <span
                                        className={
                                          isMapLive ? 'text-emerald-300' : 'text-stone-400'
                                        }
                                      >
                                        {isMapLive ? 'EN VIVO' : 'MOSTRAR'}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })()}

                              {/* Gallery / Album Photos of the Place */}
                              {filteredAlbumPhotos.map((photo) => {
                                const isPhotoLive =
                                  activeVisual.kind === 'album' && activeVisual.id === photo.id;
                                return (
                                  <button
                                    key={photo.id}
                                    type="button"
                                    onClick={() => handleDmSelectGalleryPhoto(photo)}
                                    className={`rounded-xl border-2 p-1.5 flex flex-col justify-between text-left transition cursor-pointer overflow-hidden ${
                                      isPhotoLive
                                        ? 'bg-emerald-950/40 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                                        : 'bg-[#171922] border-stone-700 hover:border-[#c8a45c]'
                                    }`}
                                  >
                                    <span className="text-[10px] font-cinzel font-bold text-[#f5e4be] truncate w-full">
                                      {photo.title}
                                    </span>
                                    <div className="h-12 w-full rounded-lg bg-black/60 border border-stone-800 my-1 overflow-hidden flex items-center justify-center">
                                      <img
                                        src={photo.imageUrl}
                                        alt={photo.title}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <div className="flex items-center justify-center gap-1 text-[9px] font-cinzel font-bold">
                                      <span
                                        className={`w-2 h-2 rounded-full ${
                                          isPhotoLive
                                            ? 'bg-emerald-400 animate-pulse'
                                            : 'bg-stone-500'
                                        }`}
                                      />
                                      <span
                                        className={
                                          isPhotoLive ? 'text-emerald-300' : 'text-stone-400'
                                        }
                                      >
                                        {isPhotoLive ? 'EN VIVO' : 'IDLE'}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setMapUrlDraft(currentPlaceMapUrl);
                                setIsEditMapModalOpen(true);
                              }}
                              className="w-full py-1.5 px-3 rounded-xl bg-[#1a1d28] hover:bg-[#252a3a] border border-[#c8a45c]/65 text-[#f5e4be] font-cinzel font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 text-amber-300" />
                              <span>+ Subir Mapa o Imágenes de Galería</span>
                            </button>
                          </>
                        ) : (
                          <div className="rounded-xl bg-black/50 border border-[#c8a45c]/40 p-3 text-center space-y-1">
                            <span className="font-cinzel font-bold text-xs text-amber-300 block">
                              🗺️ Mapas Tácticos Interactivos (Próximamente)
                            </span>
                            <p className="text-[11px] text-stone-400">
                              Aquí podrás proyectar mapas tácticos con cuadrícula y tokens. Por ahora puedes proyectar el mapa del lugar o las imágenes de su galería.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ------------------------------------------------------------- */}
              {/* BOTTOM-RIGHT OVERLAY: MINIMIZABLE OPEN NOTEBOOK / LIBRETA     */}
              {/* ------------------------------------------------------------- */}
              <div className="w-full xl:w-[42%] pointer-events-auto">
                <div
                  className="rounded-2xl bg-gradient-to-b from-[#2b2117] via-[#1f1811] to-[#15100b] border-2 border-[#e2c275] shadow-[0_10px_30px_rgba(0,0,0,0.95)] overflow-hidden transition-all"
                  data-testid="map-notebook-overlay"
                >
                  {/* Notebook Spine Header with Minimize Toggle */}
                  <div className="px-3 py-2 bg-gradient-to-r from-[#3a2a19] via-[#281d12] to-[#1c140d] border-b border-[#e2c275]/50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="w-4 h-4 text-[#f5e4be] shrink-0" />
                      <span className="font-cinzel font-black text-xs text-[#f5e4be] truncate">
                        {mode === 'dm'
                          ? 'Crónicas del DM'
                          : `Libreta de ${character?.name || 'Aventurero'}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      data-testid="btn-toggle-notebook-overlay"
                      onClick={() => setIsNotebookMinimized((prev) => !prev)}
                      className="px-2.5 py-1 rounded-lg bg-black/50 hover:bg-black/80 border border-[#e2c275]/50 text-[#f5e4be] text-[10px] font-cinzel font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {isNotebookMinimized ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>Abrir Libreta</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>Minimizar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {!isNotebookMinimized && (
                    <div className="p-2.5 space-y-2">
                      {/* Open Parchment Pages Look */}
                      <div className="rounded-xl bg-gradient-to-r from-[#e8dab8] via-[#f3e7c9] to-[#e5d4ad] border-2 border-[#8c6732] p-2.5 text-[#2b1e10] shadow-inner space-y-1.5">
                        {mode === 'player' && character ? (
                          <>
                            <div className="flex items-center justify-between border-b border-[#8c6732]/40 pb-1">
                              <span className="font-cinzel font-bold text-[10px] uppercase tracking-wider text-[#5c3e18]">
                                Apuntes Rápidos de Sesión
                              </span>
                              <span className="text-[9px] font-mono text-[#6e4d23]">
                                Autoguardado
                              </span>
                            </div>
                            <textarea
                              rows={4}
                              value={character.notes || ''}
                              onChange={(e) => {
                                if (onUpdateCharacter) {
                                  onUpdateCharacter({
                                    ...character,
                                    notes: e.target.value,
                                  });
                                }
                              }}
                              placeholder="Escribe aquí tus pistas, nombres de NPCs o notas del mapa..."
                              className="w-full bg-transparent text-xs text-[#24180b] placeholder-[#7a5c37] font-serif leading-relaxed focus:outline-none resize-none"
                            />
                          </>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={dmQuickLogTitle}
                              onChange={(e) => setDmQuickLogTitle(e.target.value)}
                              placeholder={`Título (ej. Sucesos en ${currentPlaceShortName})...`}
                              className="w-full bg-transparent border-b border-[#8c6732]/40 pb-1 text-xs font-cinzel font-bold text-[#24180b] placeholder-[#7a5c37] focus:outline-none"
                            />
                            <textarea
                              rows={3}
                              value={dmQuickLogSummary}
                              onChange={(e) => setDmQuickLogSummary(e.target.value)}
                              placeholder="Anota eventos clave de la escena para el Gran Tomo de Crónicas..."
                              className="w-full bg-transparent text-xs text-[#24180b] placeholder-[#7a5c37] font-serif leading-relaxed focus:outline-none resize-none"
                            />
                          </>
                        )}
                      </div>

                      {mode === 'dm' && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-emerald-300 font-cinzel font-bold">
                            {notebookSavedFeedback}
                          </span>
                          <button
                            type="button"
                            onClick={handleSaveDmQuickChronicle}
                            className="px-3 py-1 rounded-xl bg-gradient-to-r from-[#3d2c19] to-[#261b0f] hover:from-amber-800 hover:to-amber-950 border border-[#e2c275] text-[#f5e4be] font-cinzel font-bold text-[11px] cursor-pointer shadow"
                          >
                            Nueva Entrada
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT COLUMN: SALA EN VIVO + HISTORIAL + CAJA DE DADOS            */}
        {/* ================================================================= */}
        <div className="flex flex-col justify-between gap-2.5 min-w-0">
          {/* 1. SALA EN VIVO: CARTAS DE MONSTRUOS Y ENEMIGOS EN MESA */}
          <div className="bg-gradient-to-b from-[#171820] via-[#13141b] to-[#101117] border-2 border-[#c8a45c]/75 rounded-2xl p-3 shadow-xl space-y-2">
            <div className="flex items-center justify-between border-b border-[#c8a45c]/35 pb-1.5">
              <div>
                <h3 className="font-cinzel font-black text-xs sm:text-sm text-[#f5e4be] uppercase tracking-wider leading-none">
                  COMBATE ({resolvedEnemies.length}/{MAX_ENCOUNTER_ENEMIES})
                </h3>
                <span className="text-[10px] font-cinzel text-[#cbb692] uppercase block mt-0.5">
                  Cartas de Monstruos y Enemigos en Mesa
                </span>
              </div>
              {mode === 'dm' && (
                <button
                  type="button"
                  disabled={resolvedEnemies.length >= MAX_ENCOUNTER_ENEMIES}
                  onClick={() => setIsAddEnemyModalOpen(true)}
                  className="px-2 py-1 rounded-lg bg-red-950/90 hover:bg-red-900 disabled:opacity-40 border border-red-500/60 text-red-100 font-cinzel font-bold text-[10px] flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed shrink-0"
                  title={
                    resolvedEnemies.length >= MAX_ENCOUNTER_ENEMIES
                      ? `Tope máximo de ${MAX_ENCOUNTER_ENEMIES} enemigos alcanzado`
                      : 'Añadir monstruo a la mesa'
                  }
                >
                  <Plus className="w-3 h-3" />
                  <span>Enemigo</span>
                </button>
              )}
            </div>

            {resolvedEnemies.length === 0 ? (
              <div className="rounded-xl bg-black/45 border border-stone-800 p-3 text-center text-[11px] text-stone-400 font-cinzel">
                {mode === 'dm'
                  ? 'Sin enemigos activos en mesa. Usa "+ Enemigo" para desplegar monstruos.'
                  : 'Sin enemigos visibles en la mesa en este momento.'}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[195px] overflow-y-auto pr-0.5">
                {resolvedEnemies.map((enemy) => {
                  const pct = Math.min(
                    100,
                    Math.max(0, (enemy.hp / Math.max(1, enemy.maxHp)) * 100)
                  );
                  return (
                    <div
                      key={enemy.id}
                      data-testid={`map-enemy-card-${enemy.id}`}
                      className="rounded-xl bg-gradient-to-b from-[#241619] to-[#140e10] border border-[#c8a45c]/65 p-2 flex flex-col justify-between gap-1.5 shadow"
                    >
                      <div className="flex items-center gap-1.5">
                        <EntityAvatar
                          avatarType={enemy.avatarType}
                          customUrl={enemy.avatarCustomUrl}
                          iconId={enemy.avatarIcon || 'skull'}
                          category="monster"
                          size="sm"
                          className="rounded-full border border-red-400/60 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-cinzel font-bold text-[11px] text-[#f5e4be] truncate leading-tight">
                            {enemy.name}
                          </div>
                          <div className="text-[9px] text-amber-300/90 font-mono">
                            {enemy.levelOrCr || 'Niv 1'}
                          </div>
                        </div>
                      </div>

                      {/* HP Bar */}
                      <div className="w-full h-3.5 rounded-full bg-black/80 border border-emerald-500/40 overflow-hidden relative">
                        <div
                          className={`h-full transition-all ${
                            pct > 50 ? 'bg-emerald-600' : pct > 25 ? 'bg-amber-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                        <span className="absolute inset-0 text-[9px] font-mono font-bold text-white flex items-center justify-center">
                          HP {enemy.hp}/{enemy.maxHp}
                        </span>
                      </div>

                      {/* Base Stats (CA, Inic, Vel) + DM-only HP +/- */}
                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-stone-300 pt-0.5 border-t border-white/10">
                        <div className="truncate">
                          <span className="text-[#e2c275] font-bold">CA {enemy.ac}</span>
                          {enemy.initiative !== undefined && (
                            <span className="text-stone-400"> • Inic {enemy.initiative}</span>
                          )}
                        </div>

                        {mode === 'dm' && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              data-testid={`dm-heal-enemy-${enemy.id}`}
                              onClick={() => handleDmAdjustEnemyHp(enemy.id, 1)}
                              className="w-5 h-5 rounded bg-emerald-950 hover:bg-emerald-800 border border-emerald-500/50 text-emerald-200 flex items-center justify-center font-bold cursor-pointer"
                              title="Curar +1 HP al enemigo"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              data-testid={`dm-damage-enemy-${enemy.id}`}
                              onClick={() => handleDmAdjustEnemyHp(enemy.id, -1)}
                              className="w-5 h-5 rounded bg-red-950 hover:bg-red-800 border border-red-500/50 text-red-200 flex items-center justify-center font-bold cursor-pointer"
                              title="Dañar -1 HP al enemigo"
                            >
                              -
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {mode === 'dm' && (
              <div className="pt-1 border-t border-[#c8a45c]/25 flex items-center justify-between text-[11px]">
                <span className="text-stone-400 font-cinzel">Visibilidad para Jugadores:</span>
                <button
                  type="button"
                  onClick={handleDmToggleBroadcastEnemies}
                  className={`font-cinzel font-bold flex items-center gap-1 cursor-pointer ${
                    workspace?.activeEncounter?.broadcastEnemiesToTable
                      ? 'text-emerald-400'
                      : 'text-stone-400'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>
                    Enemigos en Mesa:{' '}
                    {workspace?.activeEncounter?.broadcastEnemiesToTable ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* 2. HISTORIAL DE DADOS TIRADOS Y ÚLTIMOS DADOS */}
          <div className="bg-gradient-to-b from-[#171820] to-[#111218] border-2 border-[#c8a45c]/75 rounded-2xl p-3 shadow-xl space-y-2">
            <h3 className="font-cinzel font-black text-xs text-[#f5e4be] uppercase tracking-wider text-center">
              HISTORIAL DE DADOS TIRADOS Y ÚLTIMOS DADOS
            </h3>

            {/* Parchment Scroll Banner for Latest Roll */}
            <div className="rounded-xl bg-gradient-to-b from-[#d8c396] via-[#cbb17c] to-[#b59860] border-2 border-[#6e4f22] px-3 py-2.5 text-[#231709] shadow-inner">
              {latestRoll ? (
                <div className="space-y-0.5">
                  <div className="text-xs font-serif font-bold flex items-center justify-between gap-1">
                    <span className="truncate">
                      📜 Último: <strong>{latestRoll.rollerName}</strong>
                    </span>
                    <span className="font-mono font-black text-sm text-[#4a1c0b] shrink-0">
                      = {latestRoll.total}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#3b2810] flex items-center justify-between">
                    <span className="truncate">
                      {latestRoll.rollTitle} ({latestRoll.formula})
                    </span>
                    <span>[{latestRoll.rolls.join(', ')}]</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-serif italic text-center py-1 text-[#4a3519]">
                  📜 Aún no se han lanzado dados en esta sesión.
                </div>
              )}
            </div>

            {isRollHistoryExpanded && rollFeed.length > 0 && (
              <div className="max-h-28 overflow-y-auto space-y-1 bg-black/50 border border-[#c8a45c]/35 rounded-xl p-2 text-[11px]">
                {rollFeed
                  .slice()
                  .reverse()
                  .slice(0, 10)
                  .map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-2 border-b border-stone-800/80 pb-1 last:border-0"
                    >
                      <span className="text-stone-300 truncate">
                        <strong className="text-amber-300">{r.rollerName}</strong> • {r.formula}
                      </span>
                      <span className="font-mono font-bold text-emerald-300 shrink-0">
                        = {r.total} [{r.rolls.join(',')}]
                      </span>
                    </div>
                  ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsRollHistoryExpanded((prev) => !prev)}
              className="w-full py-1 px-3 rounded-xl bg-[#1a1c26] hover:bg-[#242736] border border-[#c8a45c]/50 text-[#e2c275] font-cinzel font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <span>
                {isRollHistoryExpanded ? 'Ocultar Historia [▼]' : `↑ Historia (${rollFeed.length}) [▲]`}
              </span>
            </button>
          </div>

          {/* 3. LA CAJA DE DADOS (D4..D100 + 1-6 MULTI-DICE SELECTOR + TIRAR) */}
          <div
            className="bg-gradient-to-b from-[#171820] via-[#13141b] to-[#0e0f14] border-2 border-[#e2c275] rounded-2xl p-3 shadow-xl space-y-2.5"
            data-testid="la-caja-de-dados"
          >
            <div className="flex items-center justify-between border-b border-[#c8a45c]/35 pb-1.5">
              <h3 className="font-cinzel font-black text-xs sm:text-sm text-[#f5e4be] uppercase tracking-wider">
                LA CAJA DE DADOS
              </h3>
              <span className="text-[11px] font-mono font-bold text-amber-300">
                {selectedDiceCount}D{selectedDiceSides}
                {diceModifier !== 0 ? (diceModifier > 0 ? `+${diceModifier}` : diceModifier) : ''}
              </span>
            </div>

            {/* Polyhedral Dice Selector Grid (D4, D6, D8, D10, D12, D20, D100) */}
            <div className="grid grid-cols-4 gap-1.5">
              {DICE_TYPES.map((d) => {
                const isSelected = selectedDiceSides === d.sides;
                return (
                  <button
                    key={d.sides}
                    type="button"
                    data-testid={`dice-select-d${d.sides}`}
                    onClick={() => setSelectedDiceSides(d.sides)}
                    className={`py-1.5 px-1 rounded-xl border font-cinzel font-bold flex flex-col items-center justify-center transition cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-b from-[#423119] to-[#241a0d] border-[#f5e4be] text-[#f5e4be] shadow-[0_0_12px_rgba(226,194,117,0.45)] scale-105'
                        : 'bg-[#181a24] hover:bg-[#222534] border-[#c8a45c]/45 text-[#cbb692]'
                    }`}
                  >
                    {renderPolyhedralDieIcon(d.sides)}
                    <span className="text-[10px] mt-0.5">{d.label}</span>
                  </button>
                );
              })}

              {/* Optional Modifier Mini Control */}
              <div className="rounded-xl bg-[#14161f] border border-[#c8a45c]/40 flex flex-col items-center justify-center px-1 py-1">
                <span className="text-[8px] font-cinzel text-stone-400 uppercase">Bono</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDiceModifier((m) => m - 1)}
                    className="text-xs font-mono font-bold text-stone-300 hover:text-white px-1 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-[10px] font-mono font-bold text-amber-300">
                    {diceModifier >= 0 ? `+${diceModifier}` : diceModifier}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDiceModifier((m) => m + 1)}
                    className="text-xs font-mono font-bold text-stone-300 hover:text-white px-1 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Selector of 1 to 6 Dice (Replaces the redundant "Regresar al Panel" slot inside Dice Box) */}
            <div className="bg-[#12141c] border border-[#c8a45c]/55 rounded-xl p-2 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-cinzel text-[#cbb692]">
                <span>Cantidad de Dados (1 a 6):</span>
                <span className="font-mono font-bold text-amber-300">
                  {selectedDiceCount} {selectedDiceCount === 1 ? 'Dado' : 'Dados'}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {[1, 2, 3, 4, 5, 6].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    data-testid={`dice-count-${cnt}`}
                    onClick={() => setSelectedDiceCount(cnt)}
                    className={`py-1 rounded-lg font-mono font-bold text-xs border transition cursor-pointer ${
                      selectedDiceCount === cnt
                        ? 'bg-amber-500 text-stone-950 border-[#f5e4be] shadow'
                        : 'bg-[#1a1d28] text-stone-300 border-stone-700 hover:border-[#c8a45c]'
                    }`}
                  >
                    {cnt}D
                  </button>
                ))}
              </div>
            </div>

            {/* Emerald TIRAR Button (Replaces the redundant "Guardar" slot inside Dice Box) */}
            <button
              type="button"
              data-testid="btn-roll-dice-box"
              onClick={() =>
                executeDiceRoll(selectedDiceSides, selectedDiceCount, diceModifier)
              }
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 hover:from-emerald-600 hover:to-emerald-500 border-2 border-emerald-300/80 text-white font-cinzel font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition cursor-pointer"
            >
              <Dices className="w-4 h-4 text-amber-200" />
              <span>
                Tirar {selectedDiceCount}D{selectedDiceSides}
                {diceModifier !== 0
                  ? diceModifier > 0
                    ? ` + ${diceModifier}`
                    : ` - ${Math.abs(diceModifier)}`
                  : ''}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* BOTTOM BAR: RETURN TO SHEET/WORLD + DM PURPLE FLAG + LOCATION BOX   */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* Left 3 Cols: Return to Character Sheet / World Sheet & Save to Cloud */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-1.5">
          <button
            type="button"
            data-testid="btn-map-return-sheet"
            onClick={onReturnToSheet}
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#23201c] to-[#191714] hover:from-[#302b25] border border-[#c8a45c]/75 text-[#f5e4be] font-cinzel font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#e2c275] shrink-0" />
            <span>
              {mode === 'dm'
                ? 'Regresar a World Sheet'
                : 'Regresar a Hoja de Personaje'}
            </span>
          </button>

          {onSaveToCloud && (
            <button
              type="button"
              data-testid="btn-map-save-cloud"
              onClick={onSaveToCloud}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-950 via-emerald-900/90 to-emerald-950 hover:from-emerald-900 hover:to-emerald-800 border border-emerald-400/75 text-emerald-100 font-cinzel font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>GUARDAR EN LA NUBE</span>
            </button>
          )}
        </div>

        {/* Center 7 Cols: DUNGEON MASTER Banner with Generic Purple Heraldic Flag */}
        <div className="lg:col-span-7 bg-gradient-to-r from-[#1c1528] via-[#15121f] to-[#1c1528] border-2 border-[#c8a45c]/80 rounded-2xl px-4 py-2.5 flex items-center gap-3.5 shadow-2xl relative overflow-hidden">
          {/* Generic Purple Heraldic Flag / Banner ("Estandarte Morado Genérico") */}
          <div
            data-testid="dm-purple-banner-flag"
            className="relative w-12 h-14 rounded-b-2xl rounded-t-md bg-gradient-to-b from-purple-700 via-purple-900 to-[#241038] border-2 border-[#e2c275] flex flex-col items-center justify-center shrink-0 shadow-[0_5px_15px_rgba(88,28,135,0.8)]"
            title="Estandarte del Dungeon Master"
          >
            <div className="w-full h-1 bg-[#e2c275]/80 absolute top-0.5" />
            <Crown className="w-6 h-6 text-[#f5e4be] drop-shadow" />
            <span className="text-[7px] font-cinzel font-bold text-purple-200 uppercase tracking-widest mt-0.5">
              DM
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-cinzel font-black text-sm sm:text-base text-[#f5e4be] uppercase tracking-wider">
                  DUNGEON MASTER
                </span>
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  En Línea • Mesa: {roomCode}
                </span>
                {dmMessageSentToast && (
                  <span className="text-[10px] font-bold text-amber-300">
                    ✓ Mensaje actualizado en mesa
                  </span>
                )}
              </div>

              {mode === 'player' && onSendPlayerMessageToDM && (
                <button
                  type="button"
                  onClick={() => setIsWhisperModalOpen(true)}
                  className="px-3 py-1 rounded-xl bg-purple-800/80 hover:bg-purple-700 border border-purple-400/60 text-white font-cinzel font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Susurrar al DM</span>
                </button>
              )}
            </div>

            {mode === 'dm' ? (
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="text"
                  value={dmMessageInput}
                  onChange={(e) => setDmMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendLiveMessageFromDm()}
                  placeholder="⚔️ ¡Aventureros en posición! Escribe un mensaje en vivo para la sala..."
                  className="flex-1 bg-[#0e1017] border border-stone-700 focus:border-[#c8a45c] rounded-xl px-3 py-1.5 text-xs text-stone-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendLiveMessageFromDm}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-cinzel font-black text-xs flex items-center gap-1.5 cursor-pointer shrink-0 shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar</span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-purple-100/95 truncate mt-1">
                ⚔️{' '}
                {dmLiveMessage ||
                  '¡Aventureros en posición! El Dungeon Master guía la exploración de la zona.'}
              </p>
            )}
          </div>
        </div>

        {/* Right 2 Cols: CURRENT LOCATION BOX (Shows where the party is instead of "MAPA EN VIVO") */}
        <div
          data-testid="map-current-location-box"
          className="lg:col-span-2 rounded-2xl bg-gradient-to-b from-[#231e17] to-[#14161f] border-2 border-[#e2c275] px-3 py-2 flex flex-col items-center justify-center text-center shadow-xl"
        >
          <span className="text-[9px] font-cinzel font-bold uppercase tracking-widest text-[#cbb692]">
            Ubicación Actual
          </span>
          <div className="font-cinzel font-black text-xs sm:text-sm text-[#f5e4be] uppercase truncate max-w-full mt-0.5 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{currentPlaceShortName}</span>
          </div>
          <span className="text-[10px] text-emerald-300 font-medium truncate max-w-full mt-0.5 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0" />
            <span className="truncate">Viendo: {activeVisual.title}</span>
          </span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MODALS: EDIT MAP/GALLERY, ADD SUB-PLACE, ADD ENEMY, WHISPER TO DM   */}
      {/* =================================================================== */}

      {/* 1. DM Edit Map & Upload Gallery Image Modal */}
      {isEditMapModalOpen && mode === 'dm' && workspace && onUpdateWorkspace && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-[#171922] border-2 border-[#e2c275] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
              <h3 className="font-cinzel font-black text-base text-[#f5e4be]">
                Mapa y Galería de: {currentPlaceShortName}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditMapModalOpen(false)}
                className="text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section A: Base Map of the Place */}
            <div className="space-y-2 bg-[#12141c] border border-[#c8a45c]/40 rounded-xl p-3">
              <label className="block text-xs font-cinzel font-bold text-amber-300">
                1. Mapa Principal de {currentPlaceShortName}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={mapUrlDraft}
                  onChange={(e) => setMapUrlDraft(e.target.value)}
                  placeholder="Pegar URL de imagen del mapa..."
                  className="flex-1 bg-black/60 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    onUpdateWorkspace({
                      ...workspace,
                      atlasMaps: {
                        ...(workspace.atlasMaps || {}),
                        [selectedFolder]: mapUrlDraft.trim(),
                      },
                      activeLiveVisual: {
                        kind: 'map',
                        id: `map-${selectedFolder}`,
                        title: `Mapa: ${currentPlaceShortName}`,
                        imageUrl: mapUrlDraft.trim(),
                        folder: selectedFolder,
                      },
                    });
                    setIsEditMapModalOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-cinzel font-bold text-xs cursor-pointer"
                >
                  Guardar URL
                </button>
              </div>
              <div>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222534] hover:bg-[#2c3044] border border-[#c8a45c]/60 text-[#f5e4be] font-cinzel font-bold text-xs cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-amber-300" />
                  <span>Subir Archivo de Mapa desde tu PC</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleDmUploadMapFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Section B: Add Photo to Place Gallery / Album */}
            <form
              onSubmit={handleDmAddGalleryByUrl}
              className="space-y-2 bg-[#12141c] border border-[#c8a45c]/40 rounded-xl p-3"
            >
              <label className="block text-xs font-cinzel font-bold text-emerald-300">
                2. Agregar Imagen a la Galería de {currentPlaceShortName}
              </label>
              <input
                type="text"
                value={newGalleryTitle}
                onChange={(e) => setNewGalleryTitle(e.target.value)}
                placeholder="Título de la escena o foto (ej. Barra de la Taberna, Sótano)..."
                className="w-full bg-black/60 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-white"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newGalleryUrl}
                  onChange={(e) => setNewGalleryUrl(e.target.value)}
                  placeholder="URL de la foto de galería..."
                  className="flex-1 bg-black/60 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-white"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-cinzel font-bold text-xs cursor-pointer"
                >
                  Añadir URL
                </button>
              </div>
              <div className="pt-1">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-100 font-cinzel font-bold text-xs cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Subir Foto de Galería desde tu PC</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleDmUploadGalleryFile}
                    className="hidden"
                  />
                </label>
              </div>
            </form>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsEditMapModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-stone-800 text-stone-300 text-xs font-cinzel cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. DM Create Sub-Place Modal */}
      {isAddSubPlaceModalOpen && mode === 'dm' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleDmCreateSubPlace}
            className="w-full max-w-md bg-[#171922] border-2 border-[#e2c275] rounded-2xl p-5 space-y-3.5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h3 className="font-cinzel font-black text-base text-[#f5e4be]">
                Nuevo Sub-Lugar dentro de {currentPlaceShortName}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddSubPlaceModalOpen(false)}
                className="text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              required
              value={newSubPlaceName}
              onChange={(e) => setNewSubPlaceName(e.target.value)}
              placeholder="Ej. Piso 1, Sótano Secreto, Sala del Trono..."
              className="w-full bg-black/60 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddSubPlaceModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-stone-800 text-stone-300 text-xs font-cinzel cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-cinzel font-black text-xs cursor-pointer"
              >
                Crear Sub-Lugar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. DM Add Monster to Table Modal */}
      {isAddEnemyModalOpen && mode === 'dm' && workspace && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[#171922] border-2 border-red-500/80 rounded-2xl p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h3 className="font-cinzel font-black text-base text-red-200">
                Desplegar Enemigo en la Sala en Vivo
              </h3>
              <button
                type="button"
                onClick={() => setIsAddEnemyModalOpen(false)}
                className="text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {(workspace.monsters || []).map((mon) => (
                <div
                  key={mon.id}
                  className="bg-[#12141c] border border-stone-800 rounded-xl p-2.5 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-cinzel font-bold text-xs text-[#f5e4be]">
                      {mon.name}
                    </div>
                    <div className="text-[10px] font-mono text-red-300">
                      CR {mon.cr} • HP {mon.maxHp} • CA {mon.ac}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDmAddMonsterToTable(mon.id)}
                    className="px-3 py-1 rounded-lg bg-red-900 hover:bg-red-800 text-white font-cinzel font-bold text-xs cursor-pointer"
                  >
                    + Desplegar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Player Whisper to DM Modal */}
      {isWhisperModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSendWhisperToDm}
            className="w-full max-w-md bg-[#181522] border-2 border-purple-400 rounded-2xl p-5 space-y-3.5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-purple-900 pb-2">
              <h3 className="font-cinzel font-bold text-base text-purple-200">
                Susurrar al Dungeon Master ({roomCode})
              </h3>
              <button
                type="button"
                onClick={() => setIsWhisperModalOpen(false)}
                className="text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-cinzel text-purple-200 mb-1">Asunto *</label>
              <input
                type="text"
                required
                value={whisperTitle}
                onChange={(e) => setWhisperTitle(e.target.value)}
                placeholder="Ej. Acción sigilosa / Revisar puerta..."
                className="w-full bg-black/50 border border-purple-500/40 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-cinzel text-purple-200 mb-1">Mensaje *</label>
              <textarea
                rows={3}
                required
                value={whisperBody}
                onChange={(e) => setWhisperBody(e.target.value)}
                placeholder="Escribe tu mensaje privado para el DM..."
                className="w-full bg-black/50 border border-purple-500/40 rounded-xl p-3 text-xs text-white"
              />
            </div>
            {whisperStatus && (
              <p className="text-xs font-cinzel font-bold text-emerald-300">{whisperStatus}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsWhisperModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-cinzel cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-cinzel font-bold text-xs cursor-pointer"
              >
                Enviar al DM
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
