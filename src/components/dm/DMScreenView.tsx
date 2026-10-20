import React, { useState } from 'react';
import {
  Users,
  Skull,
  MapPin,
  BookOpen,
  Sword,
  Sparkles,
  Plus,
  Trash2,
  Folder,
  Radio,
  Eye,
  Shield,
  Heart,
  ChevronRight,
  Send,
  Wand2,
  Edit,
  RotateCcw,
  CheckCircle,
  FileText,
  AlertTriangle,
  Flame,
  Archive,
  Calendar,
  Layers,
  Check,
  Upload,
  ArrowLeft,
  Save,
  Edit3,
  MessageSquare,
} from 'lucide-react';
import { EntityAvatar } from '../common/EntityAvatar';
import { AvatarCustomizerModal } from '../common/AvatarCustomizerModal';
import {
  DMWorkspace,
  NPCRecord,
  MonsterRecord,
  LocationRecord,
  CampaignLogEntry,
  Combatant,
  CombatSummary,
  CombatLogEvent,
  MonsterAttack,
  DMCustomItemOrSpell,
  InventoryItem,
  PartyMemberLive,
  PlayerMessageToDM,
} from '../../types/dnd';
import { rollDiceExpression } from '../../utils/dnd-math';
import { soundFx } from '../../utils/audio';
import { FolderManagerModal } from './FolderManagerModal';
import { DMItemsAndSpellsView } from './DMItemsAndSpellsView';
import { folderMatchesFilter, getFolderDepth } from '../../utils/storage';

interface DMScreenViewProps {
  workspace: DMWorkspace;
  onUpdateWorkspace: (updated: DMWorkspace) => void;
  onTriggerRoll: (title: string, modifier: number, diceType?: number) => void;
  onBroadcastAnnouncement: (title: string, content: string) => void;
  onOpenAIOracle: (initialPrompt?: string, isDmContext?: boolean) => void;
  onUpdateDmLiveMessage?: (msg: string) => void;
  onGiveItemToPlayer?: (item: InventoryItem) => void;
  onSaveAndReturnToLobby?: () => void;
  onSaveToCloud?: () => void;
  worldName?: string;
  roomCode?: string;
  partyMembers?: PartyMemberLive[];
  playerMessages?: PlayerMessageToDM[];
  onDeletePlayerMessage?: (messageId: string) => void;
  onMarkPlayerMessageRead?: (messageId: string) => void;
}

export const DMScreenView: React.FC<DMScreenViewProps> = ({
  workspace,
  onUpdateWorkspace,
  onTriggerRoll,
  onBroadcastAnnouncement,
  onOpenAIOracle,
  onUpdateDmLiveMessage,
  onGiveItemToPlayer,
  onSaveAndReturnToLobby,
  onSaveToCloud,
  worldName,
  roomCode,
  partyMembers = [],
  playerMessages,
  onDeletePlayerMessage,
  onMarkPlayerMessageRead,
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'initiative'
    | 'combatSummaries'
    | 'npcs'
    | 'monsters'
    | 'itemsAndSpells'
    | 'locations'
    | 'chronicles'
    | 'playerMessages'
  >('initiative');

  const resolvedPlayerMessages: PlayerMessageToDM[] = React.useMemo(() => {
    const fromProp = Array.isArray(playerMessages) ? playerMessages : [];
    const fromWorkspace = Array.isArray(workspace.playerMessages) ? workspace.playerMessages : [];
    const map = new Map<string, PlayerMessageToDM>();
    [...fromProp, ...fromWorkspace].forEach((m) => {
      if (m && m.id) map.set(m.id, m);
    });
    return Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [playerMessages, workspace.playerMessages]);

  const unreadMessagesCount = resolvedPlayerMessages.filter((m) => !m.readByDm).length;
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState<boolean>(false);
  const [liveMessageInput, setLiveMessageInput] = useState<string>(workspace.dmLiveMessage || '');
  const [liveMessageSentAlert, setLiveMessageSentAlert] = useState<boolean>(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);

  // Moving Entity Modal state
  const [movingEntity, setMovingEntity] = useState<{
    type: 'npc' | 'monster' | 'location' | 'log' | 'summary';
    id: string;
    name: string;
    currentFolder: string;
  } | null>(null);


  // Combat live note input
  const [combatNoteInput, setCombatNoteInput] = useState<string>('');
  const [showResetCombatModal, setShowResetCombatModal] = useState<boolean>(false);

  // NPC Modal State (Add or Edit)
  const [showNpcModal, setShowNpcModal] = useState<boolean>(false);
  const [editingNpcId, setEditingNpcId] = useState<string | null>(null);
  const [npcForm, setNpcForm] = useState<Partial<NPCRecord>>({
    name: '',
    folder: 'General',
    race: 'Humano',
    occupation: '',
    attitude: 'Neutral',
    location: '',
    appearance: '',
    personality: '',
    secretOrHook: '',
    notes: '',
    evolution: '',
  });

  // Monster Modal State (Add or Edit)
  const [showMonsterModal, setShowMonsterModal] = useState<boolean>(false);
  const [editingMonsterId, setEditingMonsterId] = useState<string | null>(null);
  const [monsterForm, setMonsterForm] = useState<Partial<MonsterRecord>>({
    name: '',
    cr: '1',
    size: 'Mediano',
    type: 'Humanoide',
    alignment: 'Neutral',
    ac: 13,
    hp: 20,
    maxHp: 20,
    speed: '30 pies',
    str: 14,
    dex: 12,
    con: 14,
    int: 10,
    wis: 10,
    cha: 10,
    traits: [],
    actions: [
      {
        id: 'atk-1',
        name: 'Espada Larga',
        type: 'melee',
        toHit: 4,
        damage: '1d8+2',
        damageType: 'Cortante',
        range: '5 pies',
        description: 'Ataque con arma a una mano',
      },
    ],
    folder: 'General',
    notes: '',
  });
  // Attack form inside Monster Modal
  const [newAttack, setNewAttack] = useState<Partial<MonsterAttack>>({
    name: '',
    type: 'melee',
    toHit: 4,
    damage: '1d6+2',
    damageType: 'Cortante',
    range: '5 pies',
    description: '',
  });

  // Location Modal State (Add or Edit)
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [newPoiInput, setNewPoiInput] = useState<string>('');
  const [locationForm, setLocationForm] = useState<Partial<LocationRecord>>({
    name: '',
    region: '',
    type: 'Ciudad',
    description: '',
    secretsForDm: '',
    notes: '',
    evolution: '',
    pointsOfInterest: [],
    folder: 'General',
  });

  // Campaign Log Modal State (Add or Edit)
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [logForm, setLogForm] = useState<Partial<CampaignLogEntry>>({
    sessionNumber: (workspace.campaignLogs?.length || 0) + 1,
    title: '',
    date: 'Día de Aventura',
    summary: '',
    publicNotes: '',
    privateNotes: '',
    tags: ['Aventura'],
    folder: 'General',
  });

  // Avatar Customizer Modal Config State for NPCs, Monsters, Locations & Logs
  const [avatarCustomizerConfig, setAvatarCustomizerConfig] = useState<{
    isOpen: boolean;
    title: string;
    category: 'npc' | 'monster' | 'location' | 'journal';
    currentType?: 'icon' | 'custom';
    currentCustomUrl?: string;
    currentIconId?: string;
    onSave: (data: { type: 'icon' | 'custom'; customUrl?: string; iconId?: string }) => void;
  } | null>(null);

  // Active Combat Encounter references
  const activeEncounter = workspace.activeEncounter || {
    id: 'enc-default',
    name: 'Encuentro Activo',
    round: 1,
    currentTurnIndex: 0,
    combatants: [],
    isActive: true,
    combatNotes: '',
    combatLog: [],
  };

  const combatSummaries = workspace.combatSummaries || [];

  // ==================== COMBAT TRACKER ACTIONS ====================

  const handleNextTurn = () => {
    if (activeEncounter.combatants.length === 0) return;
    const nextIdx = (activeEncounter.currentTurnIndex + 1) % activeEncounter.combatants.length;
    const nextRound = nextIdx === 0 ? activeEncounter.round + 1 : activeEncounter.round;

    const nextCombatant = activeEncounter.combatants[nextIdx];

    onUpdateWorkspace({
      ...workspace,
      activeEncounter: {
        ...activeEncounter,
        currentTurnIndex: nextIdx,
        round: nextRound,
      },
    });

    if (nextCombatant) {
      soundFx.playTurnAlert();
    }
  };

  const handleSortInitiative = () => {
    const sorted = [...activeEncounter.combatants].sort((a, b) => b.initiative - a.initiative);
    onUpdateWorkspace({
      ...workspace,
      activeEncounter: {
        ...activeEncounter,
        combatants: sorted,
        currentTurnIndex: 0,
      },
    });
  };

  const handleUpdateCombatantHp = (id: string, delta: number) => {
    const target = activeEncounter.combatants.find((c) => c.id === id);
    const updated = activeEncounter.combatants.map((c) => {
      if (c.id === id) {
        const nextHp = Math.max(0, Math.min(c.maxHp, c.hp + delta));
        return { ...c, hp: nextHp };
      }
      return c;
    });

    // Auto-record to combat log if significant
    const logEvent: CombatLogEvent = {
      id: `cle-${Date.now()}`,
      round: activeEncounter.round,
      turn: activeEncounter.combatants[activeEncounter.currentTurnIndex]?.name || 'Turno',
      note: `${target?.name || 'Combatiente'} ${delta > 0 ? `recuperó +${delta} PG` : `sufrió ${delta} daño`} (PG: ${Math.max(0, (target?.hp || 0) + delta)}/${target?.maxHp})`,
      timestamp: Date.now(),
    };

    onUpdateWorkspace({
      ...workspace,
      activeEncounter: {
        ...activeEncounter,
        combatants: updated,
        combatLog: [logEvent, ...(activeEncounter.combatLog || [])],
      },
    });

    if (delta < 0) soundFx.playDamageHit();
    else soundFx.playHealChime();
  };

  const handleAddCombatLogNote = (customNote?: string) => {
    const text = (customNote || combatNoteInput).trim();
    if (!text) return;

    const newEvent: CombatLogEvent = {
      id: `cle-${Date.now()}`,
      round: activeEncounter.round,
      turn: activeEncounter.combatants[activeEncounter.currentTurnIndex]?.name || 'DM',
      note: text,
      timestamp: Date.now(),
    };

    onUpdateWorkspace({
      ...workspace,
      activeEncounter: {
        ...activeEncounter,
        combatLog: [newEvent, ...(activeEncounter.combatLog || [])],
      },
    });

    setCombatNoteInput('');
  };

  // Finalize and archive combat into Combat Summaries
  const handleSaveCombatSummary = () => {
    const summary: CombatSummary = {
      id: `cs-${Date.now()}`,
      name: activeEncounter.name || `Combate Ronda ${activeEncounter.round}`,
      date: new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      roundsCount: activeEncounter.round,
      participants: activeEncounter.combatants.map((c) => c.name),
      notes: activeEncounter.combatNotes || 'Combate finalizado sin notas adicionales.',
      logEvents: activeEncounter.combatLog || [],
    };

    onUpdateWorkspace({
      ...workspace,
      combatSummaries: [summary, ...combatSummaries],
      activeEncounter: {
        ...activeEncounter,
        isActive: false,
      },
    });

    setShowResetCombatModal(true);
  };

  // Reset encounter (Round to 1, turn to 0, optionally clear combatants)
  const handleResetEncounter = (clearCombatants: boolean) => {
    onUpdateWorkspace({
      ...workspace,
      activeEncounter: {
        id: `enc-${Date.now()}`,
        name: 'Nuevo Encuentro',
        round: 1,
        currentTurnIndex: 0,
        combatants: clearCombatants
          ? []
          : activeEncounter.combatants.map((c) => ({ ...c, hp: c.maxHp })),
        isActive: true,
        combatNotes: '',
        combatLog: [],
      },
    });
    setShowResetCombatModal(false);
  };

  // Add Monster to Active Combat with Faction (Enemy or Ally)
  const handleAddMonsterToCombat = (mon: MonsterRecord, faction: 'enemy' | 'ally' = 'enemy') => {
    const wisMod = Math.floor(((mon.wis || 10) - 10) / 2);
    const pp = 10 + wisMod;

    const newCombatant: Combatant = {
      id: `c-mon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${mon.name} #${activeEncounter.combatants.filter((c) => c.name.startsWith(mon.name)).length + 1}`,
      initiative: Math.floor(Math.random() * 20) + 1 + Math.floor(((mon.dex || 10) - 10) / 2),
      hp: mon.maxHp,
      maxHp: mon.maxHp,
      ac: mon.ac,
      passivePerception: pp,
      isPlayer: false,
      faction,
      conditions: [],
    };

    const updatedCombatants = [...activeEncounter.combatants, newCombatant];

    onUpdateWorkspace({
      ...workspace,
      activeEncounter: {
        ...activeEncounter,
        combatants: updatedCombatants,
      },
    });
    setActiveTab('initiative');
  };

  // Toggle combatant faction (Ally <-> Enemy)
  const handleToggleCombatantFaction = (combatantId: string) => {
    const updated = activeEncounter.combatants.map((c) => {
      if (c.id === combatantId) {
        const nextFaction: 'enemy' | 'ally' = c.faction === 'ally' ? 'enemy' : 'ally';
        return { ...c, faction: nextFaction };
      }
      return c;
    });

    onUpdateWorkspace({
      ...workspace,
      activeEncounter: {
        ...activeEncounter,
        combatants: updated,
      },
    });
  };

  // Toggle broadcast of enemies to live player table (Offline <-> Online)
  const handleToggleBroadcastEnemies = () => {
    const nextBroadcast = !activeEncounter.broadcastEnemiesToTable;
    onUpdateWorkspace({
      ...workspace,
      activeEncounter: {
        ...activeEncounter,
        broadcastEnemiesToTable: nextBroadcast,
      },
    });
  };

  // Roll monster attack directly from card
  const handleRollMonsterAttack = (mon: MonsterRecord, attack: MonsterAttack) => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const totalHit = d20 + attack.toHit;
    const isCrit = d20 === 20;
    const isFumble = d20 === 1;

    // Roll damage
    const damageRoll = rollDiceExpression(attack.damage);

    soundFx.playDiceRoll(d20 === 20);

    const logNote = `⚔️ ${mon.name} usó "${attack.name}": Tiró d20(${d20}) + ${attack.toHit} = **${totalHit} al impacto** ${
      isCrit ? '💥 ¡CRÍTICO NATURAL!' : isFumble ? '⚠️ ¡PIFIA (1)!' : ''
    }. Daño estimado: **${damageRoll.total}** (${attack.damageType}).`;

    handleAddCombatLogNote(logNote);
    onTriggerRoll(`${mon.name} - ${attack.name}`, attack.toHit, 20);
  };

  // ==================== FOLDER MANAGEMENT & HIERARCHY ====================
  const handleSendDmLiveMessage = () => {
    const text = liveMessageInput.trim();
    onUpdateWorkspace({
      ...workspace,
      dmLiveMessage: text,
    });
    if (onUpdateDmLiveMessage) {
      onUpdateDmLiveMessage(text);
    }
    setLiveMessageSentAlert(true);
    setTimeout(() => setLiveMessageSentAlert(false), 2500);
  };

  const handleMoveEntityFolder = (targetFolder: string) => {
    if (!movingEntity) return;
    const { type, id } = movingEntity;
    let updatedWorkspace = { ...workspace };

    if (type === 'npc') {
      updatedWorkspace.npcs = (workspace.npcs || []).map((n) => (n.id === id ? { ...n, folder: targetFolder } : n));
    } else if (type === 'monster') {
      updatedWorkspace.monsters = (workspace.monsters || []).map((m) => (m.id === id ? { ...m, folder: targetFolder } : m));
    } else if (type === 'location') {
      updatedWorkspace.locations = (workspace.locations || []).map((l) => (l.id === id ? { ...l, folder: targetFolder } : l));
    } else if (type === 'log') {
      updatedWorkspace.campaignLogs = (workspace.campaignLogs || []).map((l) => (l.id === id ? { ...l, folder: targetFolder } : l));
    } else if (type === 'summary') {
      updatedWorkspace.combatSummaries = (workspace.combatSummaries || []).map((s) => (s.id === id ? { ...s, folder: targetFolder } : s));
    }

    onUpdateWorkspace(updatedWorkspace);
    setMovingEntity(null);
  };

  // Cumulative hierarchical filtering:
  // Selecting 'Ciudad Olvidada' shows everything in 'Ciudad Olvidada' AND subfolders ('Ciudad Olvidada / Taberna', etc.)
  const filteredNpcs = (workspace.npcs || []).filter((n) => folderMatchesFilter(n.folder, selectedFolder));
  const filteredMonsters = (workspace.monsters || []).filter((m) => folderMatchesFilter(m.folder, selectedFolder));
  const filteredLocations = (workspace.locations || []).filter((l) => folderMatchesFilter(l.folder, selectedFolder));
  const filteredLogs = (workspace.campaignLogs || []).filter((log) => folderMatchesFilter(log.folder, selectedFolder));
  const filteredCombatSummaries = (workspace.combatSummaries || []).filter((sum) => folderMatchesFilter(sum.folder, selectedFolder));
  const filteredItemsAndSpells = (workspace.customItemsAndSpells || []).filter((item) => folderMatchesFilter(item.folder, selectedFolder));

  const totalFilteredCount =
    filteredNpcs.length +
    filteredMonsters.length +
    filteredLocations.length +
    filteredLogs.length +
    filteredCombatSummaries.length +
    filteredItemsAndSpells.length;

  // ==================== AI CO-PILOT ASSISTANTS ====================

  // AI NPC Generator / Assist
  const handleAiAssistNpc = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/gemini/generate-npc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: npcForm.name,
          race: npcForm.race,
          occupation: npcForm.occupation,
          location: npcForm.location || (selectedFolder !== 'all' ? selectedFolder : 'Taberna local'),
          attitude: npcForm.attitude,
          theme: selectedFolder !== 'all' ? selectedFolder : 'Fantasía medieval 5E',
        }),
      });
      const data = await res.json();
      if (data && data.name) {
        setNpcForm((prev) => ({
          ...prev,
          name: data.name,
          race: data.race || prev.race,
          occupation: data.occupation || prev.occupation,
          attitude: data.attitude || prev.attitude,
          location: data.location || prev.location,
          appearance: data.appearance || prev.appearance,
          personality: data.personality || prev.personality,
          secretOrHook: data.secretOrHook || prev.secretOrHook,
          notes: data.notes || prev.notes,
          evolution: data.evolution || prev.evolution,
          stats: data.stats || prev.stats,
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // AI Monster Generator / Assist
  const handleAiAssistMonster = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/gemini/generate-monster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: monsterForm.name,
          cr: monsterForm.cr,
          type: monsterForm.type,
          environment: selectedFolder !== 'all' ? selectedFolder : 'Mazmorra oscura',
        }),
      });
      const data = await res.json();
      if (data && data.name) {
        setMonsterForm((prev) => ({
          ...prev,
          name: data.name,
          cr: data.cr || prev.cr,
          size: data.size || prev.size,
          type: data.type || prev.type,
          alignment: data.alignment || prev.alignment,
          ac: data.ac || prev.ac,
          hp: data.hp || prev.hp,
          maxHp: data.maxHp || prev.maxHp,
          speed: data.speed || prev.speed,
          str: data.str || prev.str,
          dex: data.dex || prev.dex,
          con: data.con || prev.con,
          int: data.int || prev.int,
          wis: data.wis || prev.wis,
          cha: data.cha || prev.cha,
          traits: data.traits || prev.traits,
          actions: data.actions && data.actions.length > 0 ? data.actions : prev.actions,
          notes: data.notes || prev.notes,
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // AI Location Generator / Assist
  const handleAiAssistLocation = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/gemini/generate-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: locationForm.name,
          type: locationForm.type,
          region: locationForm.region,
          theme: selectedFolder !== 'all' ? selectedFolder : 'Misterio y peligro en 5E',
        }),
      });
      const data = await res.json();
      if (data && data.name) {
        setLocationForm((prev) => ({
          ...prev,
          name: data.name,
          type: data.type || prev.type,
          region: data.region || prev.region,
          description: data.description || prev.description,
          secretsForDm: data.secretsForDm || prev.secretsForDm,
          notes: data.notes || prev.notes,
          evolution: data.evolution || prev.evolution,
          pointsOfInterest: data.pointsOfInterest || prev.pointsOfInterest,
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // ==================== EDIT OPENERS ====================

  const openAddNpc = () => {
    setEditingNpcId(null);
    setNpcForm({
      name: '',
      folder: selectedFolder !== 'all' ? selectedFolder : 'General',
      race: 'Humano',
      occupation: '',
      attitude: 'Neutral',
      location: '',
      appearance: '',
      personality: '',
      secretOrHook: '',
      notes: '',
      evolution: '',
    });
    setShowNpcModal(true);
  };

  const openEditNpc = (npc: NPCRecord) => {
    setEditingNpcId(npc.id);
    setNpcForm({ ...npc });
    setShowNpcModal(true);
  };

  const openAddMonster = () => {
    setEditingMonsterId(null);
    setMonsterForm({
      name: '',
      cr: '1',
      size: 'Mediano',
      type: 'Monstruosidad',
      alignment: 'Caótico Maligno',
      ac: 13,
      hp: 25,
      maxHp: 25,
      speed: '30 pies',
      str: 14,
      dex: 12,
      con: 14,
      int: 8,
      wis: 10,
      cha: 8,
      traits: [],
      actions: [
        {
          id: `atk-${Date.now()}`,
          name: 'Cimitarra',
          type: 'melee',
          toHit: 4,
          damage: '1d6+2',
          damageType: 'Cortante',
          range: '5 pies',
          description: 'Ataque cuerpo a cuerpo ágil',
        },
      ],
      folder: selectedFolder !== 'all' ? selectedFolder : 'General',
      notes: '',
    });
    setShowMonsterModal(true);
  };

  const openEditMonster = (mon: MonsterRecord) => {
    setEditingMonsterId(mon.id);
    setMonsterForm({ ...mon });
    setShowMonsterModal(true);
  };

  const openAddLocation = () => {
    setEditingLocationId(null);
    setLocationForm({
      name: '',
      region: '',
      type: 'Ciudad',
      description: '',
      secretsForDm: '',
      notes: '',
      evolution: '',
      pointsOfInterest: [],
      folder: selectedFolder !== 'all' ? selectedFolder : 'General',
    });
    setShowLocationModal(true);
  };

  const openEditLocation = (loc: LocationRecord) => {
    setEditingLocationId(loc.id);
    setLocationForm({ ...loc });
    setShowLocationModal(true);
  };

  const openAddLog = () => {
    setEditingLogId(null);
    setLogForm({
      sessionNumber: (workspace.campaignLogs?.length || 0) + 1,
      title: '',
      date: 'Día de Aventura',
      summary: '',
      publicNotes: '',
      privateNotes: '',
      tags: ['Aventura'],
      folder: selectedFolder !== 'all' ? selectedFolder : 'General',
    });
    setShowLogModal(true);
  };

  const openEditLog = (log: CampaignLogEntry) => {
    setEditingLogId(log.id);
    setLogForm({ ...log });
    setShowLogModal(true);
  };

  // ==================== RENDER ====================

  return (
    <div className="space-y-6">
      {/* Lobby Navigation, World Sheet Badge & Cloud Save Bar */}
      {(onSaveAndReturnToLobby || onSaveToCloud) && (
        <div className="bg-[#14151b] border border-purple-900/60 rounded-2xl p-3 px-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {onSaveAndReturnToLobby && (
              <button
                onClick={onSaveAndReturnToLobby}
                className="px-4 py-2 rounded-xl bg-red-950/70 hover:bg-red-900 border border-red-700/80 text-red-200 font-cinzel font-bold text-xs transition flex items-center gap-2 shadow"
                title="Guarda la partida y cierra la mesa. La mesa deja de existir hasta que vuelvas a abrirla."
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Guardar Partida y Regresar al Lobby</span>
              </button>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-xl bg-purple-950/80 border border-purple-800 text-xs font-cinzel text-purple-200">
                World Sheet: <strong className="text-white">{worldName || 'Campaña Activa'}</strong>
              </span>
              {roomCode && (
                <span className="px-3 py-1 rounded-xl bg-[#181922] border border-stone-800 text-xs font-mono text-amber-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Mesa: <strong>{roomCode}</strong>
                </span>
              )}
            </div>
          </div>

          {onSaveToCloud && (
            <button
              onClick={onSaveToCloud}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-cinzel font-bold text-xs shadow-md transition flex items-center gap-1.5"
              title="Guardar estado del World Sheet en la nube sin salir"
            >
              <Upload className="w-3.5 h-3.5" />
              Guardar en la Nube
            </button>
          )}
        </div>
      )}

      {/* 1. DM Header with Folder Navigator & Live Message */}
      <div className="bg-[#191a21] border border-amber-900/50 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-amber-500" />
              <h1 className="text-2xl sm:text-3xl font-bold font-cinzel text-amber-200 tracking-wide">
                Pantalla del Dungeon Master (DM)
              </h1>
            </div>
            <p className="text-stone-400 text-xs sm:text-sm mt-1">
              Gestiona combates, bestiario, objetos legendarios, NPCs, lugares y la trama jerárquica de tu campaña.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenAIOracle('¿Qué secretos o ganchos de trama tengo listos para mi sesión de hoy?', true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-600/70 text-purple-200 text-xs font-cinzel font-bold transition shadow"
              title="Consultar al Asistente de Campaña y Oráculo del DM"
            >
              <Wand2 className="w-4 h-4 text-purple-400 animate-pulse" />
              <span>Cerebro de Campaña (IA)</span>
            </button>
          </div>
        </div>

        {/* Live Broadcast Message to the Table (Directly on DM Screen) */}
        <div className="mt-4 pt-3 border-t border-stone-800 bg-purple-950/30 rounded-xl p-3 border border-purple-800/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 shrink-0">
            <Radio className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="font-cinzel font-bold text-purple-300 text-xs tracking-wider uppercase whitespace-nowrap">
              Mensaje en Vivo para la Mesa:
            </span>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={liveMessageInput}
              onChange={(e) => setLiveMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendDmLiveMessage()}
              placeholder="Escribe el mensaje que todos los jugadores verán en tu recuadro de la mesa..."
              className="flex-1 bg-[#121316] border border-purple-700/60 rounded-lg px-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-purple-400"
            />
            <button
              onClick={handleSendDmLiveMessage}
              className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-xs font-cinzel font-bold shadow flex items-center gap-1 shrink-0"
              title="Transmitir mensaje inmediatamente a todos los jugadores"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar a Mesa</span>
            </button>
          </div>
          {liveMessageSentAlert && (
            <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
              <Check className="w-3.5 h-3.5" /> ¡Mensaje transmitido a la mesa!
            </span>
          )}
        </div>

        {/* Hierarchical Folder Bar (Max 3 Levels) */}
        <div className="mt-3 pt-3 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-stone-400 flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-amber-500" />
              Filtrar por Carpeta:
            </span>

            <button
              onClick={() => setSelectedFolder('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                selectedFolder === 'all'
                  ? 'bg-amber-600 text-white font-bold shadow'
                  : 'bg-[#121316] text-stone-400 hover:text-stone-200'
              }`}
            >
              Todas ({totalFilteredCount})
            </button>

            {/* Folder list with hierarchy indentation */}
            {(workspace.folders || []).map((f) => {
              const depth = getFolderDepth(f);
              const parts = f.split(' / ');
              const shortName = parts[parts.length - 1];
              return (
                <button
                  key={f}
                  onClick={() => setSelectedFolder(f)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                    selectedFolder === f
                      ? 'bg-amber-600 text-white font-bold shadow'
                      : 'bg-[#121316] text-stone-400 hover:text-stone-200 border border-stone-800/80'
                  }`}
                  title={`Ver todo en ${f} y subcarpetas`}
                >
                  <span className="text-[10px] opacity-75">
                    {depth === 1 ? '📁' : depth === 2 ? '↳ 📂' : '   ↳ 📄'}
                  </span>
                  <span>{shortName}</span>
                </button>
              );
            })}
          </div>

          {/* Manage Folders button */}
          <button
            onClick={() => setIsFolderManagerOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-300 text-xs font-cinzel font-bold flex items-center gap-1.5 transition ml-auto"
            title="Crear subcarpetas (hasta 3 niveles), renombrar o reestructurar"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Gestionar Carpetas (Hasta 3 Niveles)</span>
          </button>
        </div>

        {/* Selected Folder Notice */}
        {selectedFolder !== 'all' && (
          <div className="mt-2 text-[11px] text-amber-300/80 bg-amber-950/30 px-3 py-1 rounded-lg border border-amber-900/40 flex items-center justify-between">
            <span>
              Mostrando contenido de: <strong className="text-amber-200">{selectedFolder}</strong> y todas sus subcarpetas ({totalFilteredCount} elementos totales)
            </span>
            <button
              onClick={() => setSelectedFolder('all')}
              className="text-stone-400 hover:text-stone-200 text-[10px] underline"
            >
              Ver todas
            </button>
          </div>
        )}
      </div>

      {/* 2. DM Categorized Navigation Tabs (Visual Organization) */}
      <div className="bg-[#181920] border border-stone-800 rounded-2xl p-2.5 shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* Sector A: Combate & Táctica */}
          <div className="bg-[#13141a] border border-stone-800/80 rounded-xl p-2 flex flex-col gap-1.5">
            <span className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-amber-400/90 px-1">
              ⚔️ Combate & Táctica
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setActiveTab('initiative')}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-cinzel font-bold transition ${
                  activeTab === 'initiative'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/80'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Sword className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Iniciativa</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 font-mono">
                  {activeEncounter.combatants?.length || 0}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('combatSummaries')}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-cinzel font-bold transition ${
                  activeTab === 'combatSummaries'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/80'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Archive className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Resúmenes</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 font-mono">
                  {filteredCombatSummaries.length}
                </span>
              </button>
            </div>
          </div>

          {/* Sector B: Códice & Bestiario */}
          <div className="bg-[#13141a] border border-stone-800/80 rounded-xl p-2 flex flex-col gap-1.5">
            <span className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-purple-400/90 px-1">
              👥 Códice, Bestias & Tesoros
            </span>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => setActiveTab('npcs')}
                className={`flex items-center justify-between px-2 py-2 rounded-lg text-[11px] font-cinzel font-bold transition ${
                  activeTab === 'npcs'
                    ? 'bg-purple-700 text-white shadow'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/80'
                }`}
              >
                <div className="flex items-center gap-1 truncate">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">NPCs</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 font-mono">
                  {filteredNpcs.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('monsters')}
                className={`flex items-center justify-between px-2 py-2 rounded-lg text-[11px] font-cinzel font-bold transition ${
                  activeTab === 'monsters'
                    ? 'bg-purple-700 text-white shadow'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/80'
                }`}
              >
                <div className="flex items-center gap-1 truncate">
                  <Skull className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Monstruos</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 font-mono">
                  {filteredMonsters.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('itemsAndSpells')}
                className={`flex items-center justify-between px-2 py-2 rounded-lg text-[11px] font-cinzel font-bold transition ${
                  activeTab === 'itemsAndSpells'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/80'
                }`}
                title="Objetos y conjuros únicos del DM + compendio genérico SRD"
              >
                <div className="flex items-center gap-1 truncate">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Objetos</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 font-mono">
                  {filteredItemsAndSpells.length}
                </span>
              </button>
            </div>
          </div>

          {/* Sector C: Mundo & Trama */}
          <div className="bg-[#13141a] border border-stone-800/80 rounded-xl p-2 flex flex-col gap-1.5">
            <span className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-emerald-400/90 px-1">
              🗺️ Mundo & Trama
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setActiveTab('locations')}
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-cinzel font-bold transition ${
                  activeTab === 'locations'
                    ? 'bg-emerald-700 text-white shadow'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/80'
                }`}
              >
                <div className="flex items-center gap-1 truncate">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Lugares</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 font-mono">
                  {filteredLocations.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('chronicles')}
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-cinzel font-bold transition ${
                  activeTab === 'chronicles'
                    ? 'bg-emerald-700 text-white shadow'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/80'
                }`}
              >
                <div className="flex items-center gap-1 truncate">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Diario / Crónicas</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 font-mono">
                  {filteredLogs.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('playerMessages')}
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-cinzel font-bold transition relative ${
                  activeTab === 'playerMessages'
                    ? 'bg-purple-700 text-white shadow'
                    : unreadMessagesCount > 0
                    ? 'bg-purple-950/60 border border-purple-500/60 text-purple-200 hover:bg-purple-900/60'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/80'
                }`}
                title="Mensajes privados enviados por los jugadores en la sala"
              >
                <div className="flex items-center gap-1 truncate">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                  <span className="truncate">Mensaje de Jugadores</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    unreadMessagesCount > 0
                      ? 'bg-purple-500 text-white font-bold animate-pulse'
                      : 'bg-black/40'
                  }`}
                >
                  {resolvedPlayerMessages.length}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TAB CONTENT */}


      {/* TAB 1: Initiative Tracker & Live Combat Notepad */}
      {activeTab === 'initiative' && (
        <div className="space-y-4">
          {/* Header Controls: Round, Turn, Siguiente, Reiniciar, Guardar */}
          <div className="bg-[#181920] border border-stone-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-stone-400">Ronda de Combate:</span>
                <div className="text-2xl font-cinzel font-black text-amber-400">
                  Ronda {activeEncounter.round}
                </div>
              </div>
              <div className="h-8 w-px bg-stone-700" />
              <div>
                <span className="text-xs uppercase tracking-wider text-stone-400">Turno Actual:</span>
                <div className="text-base font-cinzel font-bold text-stone-100">
                  {activeEncounter.combatants[activeEncounter.currentTurnIndex]?.name || 'Nadie en turno'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleBroadcastEnemies}
                className={`px-3 py-1.5 rounded-lg text-xs font-cinzel font-bold flex items-center gap-1.5 transition shadow border ${
                  activeEncounter.broadcastEnemiesToTable
                    ? 'bg-red-950/90 hover:bg-red-900 border-red-500 text-red-200 shadow-red-950'
                    : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-400'
                }`}
                title={
                  activeEncounter.broadcastEnemiesToTable
                    ? 'Combatientes visibles en la mesa en vivo (ONLINE). Haz clic para ocultar.'
                    : 'Activar para que los combatientes aparezcan en la mesa debajo de los jugadores (OFFLINE).'
                }
              >
                <Radio
                  className={`w-3.5 h-3.5 ${
                    activeEncounter.broadcastEnemiesToTable ? 'text-red-400 animate-pulse' : 'text-stone-500'
                  }`}
                />
                <span>
                  {activeEncounter.broadcastEnemiesToTable
                    ? 'Enemigos en Mesa: ONLINE'
                    : 'Enemigos en Mesa: OFFLINE'}
                </span>
              </button>

              <button
                onClick={handleSortInitiative}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold font-cinzel border border-stone-700 transition"
              >
                Ordenar Iniciativa
              </button>

              <button
                onClick={handleNextTurn}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-cinzel font-bold transition shadow flex items-center gap-1"
              >
                <span>Siguiente Turno</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowResetCombatModal(true)}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 hover:text-amber-200 text-xs font-cinzel font-bold border border-amber-900/50 flex items-center gap-1 transition"
                title="Reiniciar ronda de combate a 1 o iniciar nuevo combate"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar Ronda</span>
              </button>

              <button
                onClick={handleSaveCombatSummary}
                className="px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 text-xs font-cinzel font-bold flex items-center gap-1 transition shadow"
                title="Finalizar y archivar este combate en el Resumen de Combates"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Finalizar y Guardar Resumen</span>
              </button>
            </div>
          </div>

          {/* COMBATANTS LIST & LIVE COMBAT NOTEPAD (2 columns on large screens) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: Combatants (2 cols) */}
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-cinzel font-bold text-stone-400 uppercase tracking-wider">
                  Combatientes en Escena ({activeEncounter.combatants.length})
                </span>
                <button
                  onClick={() => setActiveTab('monsters')}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-cinzel"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Criatura del Bestiario</span>
                </button>
              </div>

              {activeEncounter.combatants.length === 0 ? (
                <div className="text-center py-10 bg-[#181920] border border-stone-800 rounded-xl text-stone-400 text-sm">
                  No hay combatientes en el encuentro. ¡Añade monstruos desde la pestaña de "Monstruos" o tus jugadores se conectarán en vivo!
                </div>
              ) : (
                activeEncounter.combatants.map((c, idx) => {
                  const isCurrent = idx === activeEncounter.currentTurnIndex;
                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                          : 'bg-[#181920] border-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Turn indicator */}
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-cinzel font-bold text-xs ${
                            isCurrent
                              ? 'bg-amber-500 text-stone-950 shadow-md animate-pulse'
                              : 'bg-stone-800 text-stone-400'
                          }`}
                        >
                          {idx + 1}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-cinzel font-bold text-stone-100 text-base">{c.name}</span>
                            {c.isPlayer ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                                Jugador
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleCombatantFaction(c.id)}
                                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border transition ${
                                  c.faction === 'ally'
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
                                    : 'bg-red-950 text-red-300 border-red-800 hover:bg-red-900'
                                }`}
                                title="Clic para alternar entre Enemigo (Rojo) y Aliado (Verde)"
                              >
                                {c.faction === 'ally' ? '🟢 Aliado' : '🔴 Enemigo'}
                              </button>
                            )}
                          </div>
                          <div className="text-xs text-stone-400 flex items-center gap-3 mt-0.5">
                            <span>
                              Iniciativa: <strong className="text-amber-400">{c.initiative}</strong>
                            </span>
                            <span>
                              CA: <strong className="text-stone-200">{c.ac}</strong>
                            </span>
                            <span>
                              PP: <strong className="text-stone-300">{c.passivePerception ?? 10}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* HP and Damage Controls */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-stone-400">PG:</div>
                          <div className="text-sm font-mono font-bold">
                            <span className={c.hp < c.maxHp * 0.3 ? 'text-red-400 animate-pulse' : 'text-stone-100'}>
                              {c.hp}
                            </span>{' '}
                            / {c.maxHp}
                          </div>
                        </div>

                        {/* Quick damage/heal buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateCombatantHp(c.id, -5)}
                            className="px-2 py-1 bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-mono font-bold rounded"
                            title="-5 Daño"
                          >
                            -5
                          </button>
                          <button
                            onClick={() => handleUpdateCombatantHp(c.id, -1)}
                            className="px-2 py-1 bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-mono font-bold rounded"
                            title="-1 Daño"
                          >
                            -1
                          </button>
                          <button
                            onClick={() => handleUpdateCombatantHp(c.id, 1)}
                            className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-mono font-bold rounded"
                            title="+1 Curar"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => handleUpdateCombatantHp(c.id, 5)}
                            className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-mono font-bold rounded"
                            title="+5 Curar"
                          >
                            +5
                          </button>
                          <button
                            onClick={() =>
                              onUpdateWorkspace({
                                ...workspace,
                                activeEncounter: {
                                  ...activeEncounter,
                                  combatants: activeEncounter.combatants.filter((item) => item.id !== c.id),
                                },
                              })
                            }
                            className="p-1.5 text-stone-500 hover:text-red-400 ml-1"
                            title="Eliminar de la escena"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right: Real-time Combat Notepad & Action Log */}
            <div className="bg-[#181920] border border-stone-800 rounded-xl p-4 flex flex-col justify-between shadow">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-stone-800 mb-3">
                  <span className="text-xs font-cinzel font-bold text-amber-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-400" />
                    Bloc de Notas de Combate en Vivo
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    Ronda {activeEncounter.round}
                  </span>
                </div>

                {/* Input for action */}
                <div className="flex items-center gap-1.5 mb-3">
                  <input
                    type="text"
                    placeholder="Ej. PJ 1 tiró d20 e hizo 14 daño..."
                    value={combatNoteInput}
                    onChange={(e) => setCombatNoteInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCombatLogNote()}
                    className="flex-1 bg-[#121316] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => handleAddCombatLogNote()}
                    className="p-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow"
                    title="Anotar acción"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Event log feed */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {(activeEncounter.combatLog || []).length === 0 ? (
                    <p className="text-xs text-stone-500 italic py-4 text-center">
                      Sin acciones anotadas en este combate. Escribe arriba o tira ataques de monstruos para registrarlas automáticamente.
                    </p>
                  ) : (
                    (activeEncounter.combatLog || []).map((ev) => (
                      <div
                        key={ev.id}
                        className="text-xs p-2 rounded-lg bg-[#14151a] border border-stone-800/80 leading-relaxed text-stone-300"
                      >
                        <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono mb-0.5">
                          <span>
                            Rnd {ev.round} • Turno: <strong className="text-amber-400">{ev.turn}</strong>
                          </span>
                        </div>
                        <div>{ev.note}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Combat general notes */}
              <div className="pt-3 mt-3 border-t border-stone-800">
                <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block mb-1">
                  Notas Generales del Encuentro:
                </span>
                <textarea
                  rows={2}
                  placeholder="Anota detalles tácticos, refuerzos que llegarán en ronda 3, etc..."
                  value={activeEncounter.combatNotes || ''}
                  onChange={(e) =>
                    onUpdateWorkspace({
                      ...workspace,
                      activeEncounter: {
                        ...activeEncounter,
                        combatNotes: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#121316] border border-stone-700 rounded-lg p-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Combat Summaries (Archived Combats) */}
      {activeTab === 'combatSummaries' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-cinzel font-bold text-lg text-amber-200">
                Resúmenes de Combates Archivados ({combatSummaries.length})
              </h3>
              <p className="text-xs text-stone-400">
                Historial de batallas, duración en rondas, participantes y notas tácticas guardadas.
              </p>
            </div>
          </div>

          {combatSummaries.length === 0 ? (
            <div className="text-center py-12 bg-[#181920] border border-stone-800 rounded-xl text-stone-400 text-sm">
              <Archive className="w-8 h-8 text-stone-600 mx-auto mb-2" />
              No tienes combates archivados todavía. En la pestaña "Iniciativa y Combate", pulsa "Finalizar y Guardar Resumen" para registrar cada pelea.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCombatSummaries.map((sum) => (
                <div
                  key={sum.id}
                  className="bg-[#181920] border border-stone-800 rounded-xl p-4 shadow hover:border-amber-900/60 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-stone-800">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-cinzel font-bold text-xs border border-emerald-800">
                        {sum.roundsCount} {sum.roundsCount === 1 ? 'Ronda' : 'Rondas'}
                      </span>
                      <h4 className="font-cinzel font-bold text-stone-100 text-base">{sum.name}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-stone-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-500" />
                        {sum.date}
                      </span>
                      <button
                        onClick={() =>
                          setMovingEntity({
                            type: 'summary',
                            id: sum.id,
                            name: sum.name,
                            currentFolder: sum.folder || 'General',
                          })
                        }
                        className="text-stone-400 hover:text-amber-400 p-1"
                        title="Mover resumen de combate a otra carpeta"
                      >
                        <Folder className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          onUpdateWorkspace({
                            ...workspace,
                            combatSummaries: (workspace.combatSummaries || []).filter((s) => s.id !== sum.id),
                          })
                        }
                        className="text-stone-500 hover:text-red-400 p-1"
                        title="Eliminar resumen archivado"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {sum.folder && (
                    <div className="text-[10px] text-stone-500 font-mono mb-2 flex items-center gap-1">
                      <Folder className="w-3 h-3 text-amber-500" />
                      <span>Carpeta: {sum.folder}</span>
                    </div>
                  )}

                  <div className="text-xs text-stone-300 mb-2">
                    <strong className="text-amber-400">Participantes:</strong>{' '}
                    {(sum.participants || []).join(', ') || 'Sin participantes listados'}
                  </div>

                  {/* Summary Notes */}
                  <div className="p-2.5 rounded-lg bg-[#121316] border border-stone-800 text-xs text-stone-300 mb-3">
                    <strong className="text-amber-300 block mb-1">Notas del Encuentro:</strong>
                    <p className="leading-relaxed whitespace-pre-line">{sum.notes}</p>
                  </div>

                  {/* Action Log Events if any */}
                  {sum.logEvents && sum.logEvents.length > 0 && (
                    <div>
                      <span className="text-[11px] font-cinzel font-bold text-stone-400 uppercase tracking-wider block mb-1">
                        Registro de Acciones ({sum.logEvents.length}):
                      </span>
                      <div className="max-h-40 overflow-y-auto space-y-1 bg-[#14151a] p-2 rounded border border-stone-800/60">
                        {sum.logEvents.map((ev, eIdx) => (
                          <div key={eIdx} className="text-[11px] text-stone-400 flex items-start gap-1.5">
                            <span className="text-amber-400 font-mono shrink-0">R{ev.round}:</span>
                            <span className="text-stone-300">{ev.note}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: NPCs (renamed from PNJs) */}
      {activeTab === 'npcs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-cinzel font-bold text-lg text-amber-200">
              Personajes No Jugadores (NPCs)
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={openAddNpc}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xs font-cinzel font-bold transition shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo NPC</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredNpcs.map((npc) => (
              <div
                key={npc.id}
                className="bg-[#181920] border border-stone-800 rounded-xl p-4 flex flex-col justify-between hover:border-amber-800/60 transition shadow"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      {npc.avatarUrl ? (
                        <img src={npc.avatarUrl} alt={npc.name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-amber-950 border border-amber-700/60 flex items-center justify-center font-cinzel font-bold text-amber-400">
                          {npc.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-cinzel font-bold text-stone-100 text-base">{npc.name}</div>
                        <div className="text-[11px] text-stone-400">
                          {npc.race} • {npc.occupation}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        npc.attitude === 'Aliado' || npc.attitude === 'Amistoso'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : npc.attitude === 'Hostil'
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : 'bg-stone-800 text-stone-300'
                      }`}
                    >
                      {npc.attitude}
                    </span>
                  </div>

                  <div className="text-xs text-stone-300 mb-2">
                    <strong className="text-stone-400">Lugar:</strong> {npc.location}
                  </div>
                  {npc.appearance && (
                    <div className="text-xs text-stone-400 mb-2 italic">"{npc.appearance}"</div>
                  )}

                  {/* Secret for DM */}
                  {npc.secretOrHook && (
                    <div className="p-2 rounded bg-amber-950/30 border border-amber-900/40 text-[11px] text-amber-300/90 mb-2">
                      <strong className="text-amber-400">Secreto DM:</strong> {npc.secretOrHook}
                    </div>
                  )}

                  {/* Block 1: DM Private Notes */}
                  {npc.notes && (
                    <div className="p-2 rounded bg-[#13141a] border border-stone-800 text-[11px] text-stone-300 mb-2">
                      <strong className="text-stone-400 block mb-0.5">Notas Privadas:</strong>
                      {npc.notes}
                    </div>
                  )}

                  {/* Block 2: Evolution over time */}
                  {npc.evolution && (
                    <div className="p-2 rounded bg-purple-950/20 border border-purple-900/40 text-[11px] text-purple-200/90 mb-2">
                      <strong className="text-purple-400 block mb-0.5">Evolución y Cambios:</strong>
                      {npc.evolution}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-stone-500 font-mono">Carpeta: {npc.folder}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setMovingEntity({
                          type: 'npc',
                          id: npc.id,
                          name: npc.name,
                          currentFolder: npc.folder || 'General',
                        })
                      }
                      className="p-1 text-stone-400 hover:text-amber-400"
                      title="Mover a otra carpeta"
                    >
                      <Folder className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEditNpc(npc)}
                      className="p-1 text-stone-400 hover:text-amber-400"
                      title="Editar NPC"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        onUpdateWorkspace({
                          ...workspace,
                          npcs: (workspace.npcs || []).filter((n) => n.id !== npc.id),
                        })
                      }
                      className="text-stone-500 hover:text-red-400 p-1"
                      title="Eliminar NPC"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Monsters & Beasts */}
      {activeTab === 'monsters' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-cinzel font-bold text-lg text-amber-200">Monstruos y Bestiario</h3>
              <p className="text-xs text-stone-400">
                Añade monstruos con ataques personalizables (cuerpo a cuerpo, a distancia, aliento) y tíralos en un click.
              </p>
            </div>
            <button
              onClick={openAddMonster}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xs font-cinzel font-bold transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Monstruo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredMonsters.map((mon) => (
              <div
                key={mon.id}
                className="bg-[#181920] border border-stone-800 rounded-xl p-4 flex flex-col justify-between hover:border-amber-800/60 transition shadow"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-cinzel font-bold text-stone-100 text-base">{mon.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-mono font-bold">
                      CR {mon.cr}
                    </span>
                  </div>
                  <div className="text-xs text-stone-400 mb-2">
                    {mon.size} • {mon.type} • {mon.alignment}
                  </div>

                  {/* Core stats block */}
                  <div className="grid grid-cols-3 gap-1 bg-[#121316] p-2 rounded text-center text-xs mb-3 font-mono">
                    <div>
                      <span className="text-[10px] text-stone-500 block">CA</span>
                      <strong className="text-stone-200">{mon.ac}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">PG Máx</span>
                      <strong className="text-red-400">{mon.maxHp}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">Velocidad</span>
                      <strong className="text-stone-300">{mon.speed}</strong>
                    </div>
                  </div>

                  {/* Custom Attacks List with Roll Button */}
                  <div className="space-y-1.5 mb-3">
                    <span className="text-[10px] font-cinzel font-bold text-stone-400 uppercase tracking-wider block">
                      Ataques ({mon.actions?.length || 0}):
                    </span>
                    {(mon.actions || []).map((act, i) => (
                      <div
                        key={i}
                        className="text-xs bg-[#121316] p-2 rounded border border-stone-800 flex items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-bold text-amber-300">{act.name}</span>
                          <span className="text-[11px] text-stone-400 block">
                            +{act.toHit} al impactar • {act.damage} {act.damageType} {act.range ? `(${act.range})` : ''}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRollMonsterAttack(mon, act)}
                          className="px-2 py-1 rounded bg-amber-950 hover:bg-amber-900 border border-amber-800 text-amber-300 text-[11px] font-cinzel font-bold transition shrink-0"
                          title="Tirar ataque y daño a la vez"
                        >
                          ⚔️ Tirar
                        </button>
                      </div>
                    ))}
                  </div>

                  {mon.notes && (
                    <div className="text-xs text-stone-400 italic mb-2">
                      <strong>Estrategia DM:</strong> {mon.notes}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-stone-800 flex items-center justify-between">
                  <div className="flex-1 flex items-center gap-1.5">
                    <button
                      onClick={() => handleAddMonsterToCombat(mon, 'enemy')}
                      className="flex-1 py-1 px-2 rounded bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-cinzel font-bold flex items-center justify-center gap-1 transition shadow-sm"
                      title="Llevar a combate como Enemigo (Rojo)"
                    >
                      <Skull className="w-3.5 h-3.5 text-red-400" />
                      <span>+ Enemigo</span>
                    </button>
                    <button
                      onClick={() => handleAddMonsterToCombat(mon, 'ally')}
                      className="py-1 px-2 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-cinzel font-bold flex items-center justify-center gap-1 transition shadow-sm"
                      title="Llevar a combate como Aliado (Verde)"
                    >
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      <span>+ Aliado</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() =>
                        setMovingEntity({
                          type: 'monster',
                          id: mon.id,
                          name: mon.name,
                          currentFolder: mon.folder || 'General',
                        })
                      }
                      className="text-stone-400 hover:text-amber-400 p-1"
                      title="Mover a otra carpeta"
                    >
                      <Folder className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEditMonster(mon)}
                      className="text-stone-400 hover:text-amber-400 p-1"
                      title="Editar Monstruo"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        onUpdateWorkspace({
                          ...workspace,
                          monsters: (workspace.monsters || []).filter((m) => m.id !== mon.id),
                        })
                      }
                      className="text-stone-500 hover:text-red-400 p-1"
                      title="Eliminar Monstruo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Custom Items & Spells with Generic SRD Manual */}
      {activeTab === 'itemsAndSpells' && (
        <DMItemsAndSpellsView
          customItemsAndSpells={workspace.customItemsAndSpells || []}
          onUpdateItemsAndSpells={(updated) =>
            onUpdateWorkspace({
              ...workspace,
              customItemsAndSpells: updated,
            })
          }
          selectedFolder={selectedFolder}
          folders={workspace.folders || []}
          onGiveItemToPlayer={onGiveItemToPlayer}
          roomCode={roomCode}
          partyMembers={partyMembers}
        />
      )}

      {/* TAB 5: Locations & Maps */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-cinzel font-bold text-lg text-amber-200">Lugares, Mazmorras y Mapas</h3>
              <p className="text-xs text-stone-400">
                Puntos de interés, secretos ocultos, peligros ambientales y registro de cómo evoluciona cada lugar.
              </p>
            </div>
            <button
              onClick={openAddLocation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xs font-cinzel font-bold transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Lugar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLocations.map((loc) => (
              <div
                key={loc.id}
                className="bg-[#181920] border border-stone-800 rounded-xl p-4 flex flex-col justify-between hover:border-amber-800/60 transition shadow"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-cinzel font-bold text-stone-100 text-base">{loc.name}</span>
                      <div className="text-xs text-stone-400">
                        {loc.type} • Región: {loc.region || 'Desconocida'}
                      </div>
                    </div>
                    {loc.folder && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-400 font-mono">
                        {loc.folder}
                      </span>
                    )}
                  </div>

                  {loc.mapImageUrl && (
                    <img
                      src={loc.mapImageUrl}
                      alt={loc.name}
                      className="w-full h-36 object-cover rounded-lg mb-3 border border-stone-700"
                    />
                  )}

                  <p className="text-xs text-stone-300 leading-relaxed mb-3">{loc.description}</p>

                  {/* Secrets */}
                  {loc.secretsForDm && (
                    <div className="p-2.5 rounded bg-amber-950/40 border border-amber-900/50 text-xs text-amber-300 mb-2">
                      <strong className="text-amber-400">Secretos y Trampas (DM):</strong> {loc.secretsForDm}
                    </div>
                  )}

                  {/* Block 1: Tactical notes */}
                  {loc.notes && (
                    <div className="p-2 rounded bg-[#13141a] border border-stone-800 text-xs text-stone-300 mb-2">
                      <strong className="text-stone-400 block mb-0.5">Notas Tácticas y Ambientales:</strong>
                      {loc.notes}
                    </div>
                  )}

                  {/* Block 2: Evolution */}
                  {loc.evolution && (
                    <div className="p-2 rounded bg-purple-950/20 border border-purple-900/40 text-xs text-purple-200 mb-2">
                      <strong className="text-purple-400 block mb-0.5">Evolución del Lugar en Campaña:</strong>
                      {loc.evolution}
                    </div>
                  )}

                  {loc.pointsOfInterest && loc.pointsOfInterest.length > 0 && (
                    <div className="text-xs text-stone-400">
                      <span className="font-semibold text-stone-300">Puntos Clave:</span>{' '}
                      {loc.pointsOfInterest.join(', ')}
                    </div>
                  )}
                </div>

                <div className="pt-2 mt-3 border-t border-stone-800 flex items-center justify-between">
                  <span className="text-[10px] text-stone-500 font-mono">Carpeta: {loc.folder}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setMovingEntity({
                          type: 'location',
                          id: loc.id,
                          name: loc.name,
                          currentFolder: loc.folder || 'General',
                        })
                      }
                      className="text-stone-400 hover:text-amber-400 p-1"
                      title="Mover a otra carpeta"
                    >
                      <Folder className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEditLocation(loc)}
                      className="text-stone-400 hover:text-amber-400 p-1"
                      title="Editar Lugar"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        onUpdateWorkspace({
                          ...workspace,
                          locations: (workspace.locations || []).filter((l) => l.id !== loc.id),
                        })
                      }
                      className="text-stone-500 hover:text-red-400 p-1"
                      title="Eliminar Lugar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: Campaign Chronicles */}
      {activeTab === 'chronicles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-cinzel font-bold text-lg text-amber-200">Diario de Campaña y Crónicas</h3>
              <p className="text-xs text-stone-400">
                Registra lo que ocurre en cada sesión y transmite revelaciones narrativas a los jugadores.
              </p>
            </div>
            <button
              onClick={openAddLog}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xs font-cinzel font-bold transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Entrada de Sesión</span>
            </button>
          </div>

          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-[#181920] border border-stone-800 rounded-xl p-4 shadow hover:border-amber-800/60 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-cinzel font-bold text-xs border border-amber-800">
                      Sesión {log.sessionNumber}
                    </span>
                    <h4 className="font-cinzel font-bold text-stone-100 text-base">{log.title}</h4>
                  </div>
                  <span className="text-xs text-stone-500 font-mono">{log.date}</span>
                </div>

                <p className="text-xs text-stone-300 leading-relaxed mb-3">{log.summary}</p>

                {/* Public Read Aloud with Broadcast Button */}
                {log.publicNotes && (
                  <div className="p-3 rounded-lg bg-[#121316] border border-amber-900/40 mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-cinzel font-bold text-amber-400 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        Texto Público (Para Leer o Revelar a Jugadores):
                      </span>
                      <button
                        onClick={() => onBroadcastAnnouncement(log.title, log.publicNotes)}
                        className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-cinzel font-bold flex items-center gap-1 transition shadow"
                        title="Envía una tarjeta flotante en vivo a todas las pantallas de los jugadores conectados"
                      >
                        <Radio className="w-3 h-3 animate-pulse" />
                        <span>Transmitir a Jugadores</span>
                      </button>
                    </div>
                    <p className="text-xs text-amber-200/90 italic leading-relaxed">{log.publicNotes}</p>
                  </div>
                )}

                {/* Private DM Notes */}
                {log.privateNotes && (
                  <div className="p-2.5 rounded bg-red-950/20 border border-red-900/30 text-xs text-red-200/80 mb-2">
                    <strong className="text-red-400">Notas Secretas del DM:</strong> {log.privateNotes}
                  </div>
                )}

                <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-stone-500 font-mono flex items-center gap-1">
                    <Folder className="w-3 h-3 text-amber-500" />
                    {log.folder || 'General'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setMovingEntity({
                          type: 'log',
                          id: log.id,
                          name: log.title,
                          currentFolder: log.folder || 'General',
                        })
                      }
                      className="text-stone-400 hover:text-amber-400 p-1"
                      title="Mover a otra carpeta"
                    >
                      <Folder className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEditLog(log)}
                      className="text-stone-400 hover:text-amber-400 p-1"
                      title="Editar Entrada"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        onUpdateWorkspace({
                          ...workspace,
                          campaignLogs: (workspace.campaignLogs || []).filter((l) => l.id !== log.id),
                        })
                      }
                      className="text-stone-500 hover:text-red-400 p-1"
                      title="Eliminar Entrada"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: Player Private Messages to DM */}
      {activeTab === 'playerMessages' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#16171f] border border-purple-800/40 rounded-xl p-4">
            <div>
              <h3 className="font-cinzel font-bold text-lg text-purple-200 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-400" />
                Mensajes de Jugadores
              </h3>
              <p className="text-xs text-stone-400">
                Bandeja privada de mensajes enviados por los personajes conectados en la sala ({roomCode || 'Mesa'}). Por ahora la comunicación es únicamente de jugador hacia DM.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-purple-950/70 border border-purple-700/60 text-purple-200">
                Total: <strong>{resolvedPlayerMessages.length}</strong>
              </span>
              {unreadMessagesCount > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-600/60 text-amber-300 font-bold">
                  Nuevos: {unreadMessagesCount}
                </span>
              )}
            </div>
          </div>

          {resolvedPlayerMessages.length === 0 ? (
            <div className="bg-[#181920] border border-stone-800 rounded-xl p-8 text-center">
              <MessageSquare className="w-8 h-8 text-stone-600 mx-auto mb-2" />
              <p className="font-cinzel font-bold text-stone-300 text-sm mb-1">
                Aún no hay mensajes de jugadores
              </p>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Cuando un jugador conectado a la sala haga clic en el botón de mensaje junto a su estado online, su mensaje privado aparecerá aquí con su personaje, jugador, ID, título y descripción.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {resolvedPlayerMessages.map((msg) => {
                const cleanTag = (msg.playerTagId || '123').replace(/^@+/, '');
                const fullTag = msg.playerFullTag || `${msg.playerName}@${cleanTag}`;
                return (
                  <div
                    key={msg.id}
                    className={`bg-[#181920] border rounded-xl p-4 shadow transition ${
                      !msg.readByDm
                        ? 'border-purple-500/80 ring-1 ring-purple-500/20'
                        : 'border-stone-800 hover:border-purple-800/50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-stone-800/80">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-950/80 border border-amber-700/60 text-amber-300 font-cinzel font-bold text-xs">
                          Personaje: {msg.characterName}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-purple-950/80 border border-purple-700/60 text-purple-200 font-mono text-xs">
                          Jugador: <strong>{msg.playerName}</strong> • ID: <strong>@{cleanTag}</strong> ({fullTag})
                        </span>
                        {!msg.readByDm && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-bold uppercase tracking-wider">
                            Nuevo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-stone-500 font-mono">
                        <span>
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                        {!msg.readByDm && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onMarkPlayerMessageRead) {
                                onMarkPlayerMessageRead(msg.id);
                              }
                              const nextMsgs = resolvedPlayerMessages.map((m) =>
                                m.id === msg.id ? { ...m, readByDm: true } : m
                              );
                              onUpdateWorkspace({
                                ...workspace,
                                playerMessages: nextMsgs,
                              });
                            }}
                            className="px-2 py-0.5 rounded bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-[10px] font-sans font-semibold flex items-center gap-1 transition"
                            title="Marcar como leído"
                          >
                            <Check className="w-3 h-3" />
                            Leído
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (onDeletePlayerMessage) {
                              onDeletePlayerMessage(msg.id);
                            }
                            const nextMsgs = resolvedPlayerMessages.filter((m) => m.id !== msg.id);
                            onUpdateWorkspace({
                              ...workspace,
                              playerMessages: nextMsgs,
                            });
                          }}
                          className="p-1 rounded hover:bg-red-950/60 text-stone-500 hover:text-red-400 transition"
                          title="Eliminar mensaje"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mb-1.5">
                      <span className="text-[10px] font-cinzel uppercase tracking-wider text-stone-400 block">
                        Título del Mensaje:
                      </span>
                      <h4 className="font-cinzel font-bold text-stone-100 text-sm sm:text-base">
                        {msg.title}
                      </h4>
                    </div>

                    <div className="bg-[#121318] border border-stone-800/90 rounded-lg p-3">
                      <span className="text-[10px] font-cinzel uppercase tracking-wider text-stone-400 block mb-1">
                        Descripción del Mensaje:
                      </span>
                      <p className="text-xs sm:text-sm text-stone-200 whitespace-pre-wrap leading-relaxed">
                        {msg.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== MODALS ==================== */}

      {/* 1. RESET COMBAT MODAL */}
      {showResetCombatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181920] border border-amber-600/80 rounded-2xl max-w-md w-full p-5 text-stone-200 shadow-2xl">
            <h3 className="text-lg font-cinzel font-bold text-amber-300 mb-2 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-400" />
              Reiniciar Encuentro de Combate
            </h3>
            <p className="text-xs text-stone-300 mb-4 leading-relaxed">
              La ronda actual es <strong>Ronda {activeEncounter.round}</strong>. ¿Cómo deseas reiniciar el combate?
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleResetEncounter(false)}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold text-xs transition shadow text-left"
              >
                Reiniciar a Ronda 1 (Mantener mismos combatientes con PG restaurados)
              </button>
              <button
                onClick={() => handleResetEncounter(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 font-cinzel font-bold text-xs transition text-left"
              >
                Limpiar todo el combate (Ronda 1 y vaciar la lista de combatientes)
              </button>
              <button
                onClick={() => setShowResetCombatModal(false)}
                className="w-full py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition mt-2 text-center"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. NPC MODAL (ADD / EDIT) */}
      {showNpcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181920] border-2 border-amber-800/80 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 text-stone-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-3">
              <h3 className="text-base font-cinzel font-bold text-amber-300">
                {editingNpcId ? 'Editar NPC' : 'Nuevo NPC'}
              </h3>
              <button
                onClick={handleAiAssistNpc}
                disabled={isGeneratingAi}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-700 text-xs font-cinzel font-bold transition shadow"
              >
                <Sparkles className={`w-3.5 h-3.5 text-purple-400 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                <span>{isGeneratingAi ? 'Rellenando...' : 'Completar con IA'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <input
                type="text"
                placeholder="Nombre del NPC"
                value={npcForm.name || ''}
                onChange={(e) => setNpcForm({ ...npcForm, name: e.target.value })}
                className="bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100"
              />
              <input
                type="text"
                placeholder="Raza (ej. Enano, Elfo)"
                value={npcForm.race || ''}
                onChange={(e) => setNpcForm({ ...npcForm, race: e.target.value })}
                className="bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100"
              />
              <input
                type="text"
                placeholder="Oficio / Rol (ej. Herrero, Guardia)"
                value={npcForm.occupation || ''}
                onChange={(e) => setNpcForm({ ...npcForm, occupation: e.target.value })}
                className="bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100"
              />
              <select
                value={npcForm.attitude || 'Neutral'}
                onChange={(e) => setNpcForm({ ...npcForm, attitude: e.target.value as any })}
                className="bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100"
              >
                <option value="Aliado">Aliado</option>
                <option value="Amistoso">Amistoso</option>
                <option value="Neutral">Neutral</option>
                <option value="Desconfiado">Desconfiado</option>
                <option value="Hostil">Hostil</option>
              </select>
              <input
                type="text"
                placeholder="Ubicación o Lugar exacto"
                value={npcForm.location || ''}
                onChange={(e) => setNpcForm({ ...npcForm, location: e.target.value })}
                className="bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100"
              />
              <select
                value={npcForm.folder || 'General'}
                onChange={(e) => setNpcForm({ ...npcForm, folder: e.target.value })}
                className="bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100"
              >
                <option value="General">General</option>
                {(workspace.folders || []).map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              placeholder="Descripción física y apariencia (ej. Cicatriz en la ceja, túnica roja raída)..."
              value={npcForm.appearance || ''}
              onChange={(e) => setNpcForm({ ...npcForm, appearance: e.target.value })}
              rows={2}
              className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 mb-2"
            />
            <textarea
              placeholder="Personalidad y modo de hablar (ej. Habla en susurros, desconfía de la magia)..."
              value={npcForm.personality || ''}
              onChange={(e) => setNpcForm({ ...npcForm, personality: e.target.value })}
              rows={2}
              className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 mb-2"
            />
            <textarea
              placeholder="Secreto del DM o Gancho de Misión (ej. Robó la gema sagrada y la esconde en su bota)..."
              value={npcForm.secretOrHook || ''}
              onChange={(e) => setNpcForm({ ...npcForm, secretOrHook: e.target.value })}
              rows={2}
              className="w-full bg-[#121316] border border-amber-900/60 rounded-lg px-3 py-2 text-xs text-amber-200 mb-3"
            />

            {/* TWO NOTE BLOCKS REQUIRED BY USER */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[11px] font-cinzel font-bold text-stone-400 uppercase tracking-wider block mb-1">
                  1. Notas Privadas del DM:
                </label>
                <textarea
                  placeholder="Notas libres, inventario, relaciones secretas..."
                  value={npcForm.notes || ''}
                  onChange={(e) => setNpcForm({ ...npcForm, notes: e.target.value })}
                  rows={3}
                  className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100"
                />
              </div>
              <div>
                <label className="text-[11px] font-cinzel font-bold text-purple-400 uppercase tracking-wider block mb-1">
                  2. Evolución y Registro de Cambios:
                </label>
                <textarea
                  placeholder="Ej. Empezó a odiar al elfo, perdió un brazo en el puente, se alió con el gremio..."
                  value={npcForm.evolution || ''}
                  onChange={(e) => setNpcForm({ ...npcForm, evolution: e.target.value })}
                  rows={3}
                  className="w-full bg-[#121316] border border-purple-900/60 rounded-lg px-3 py-2 text-xs text-purple-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => setShowNpcModal(false)}
                className="px-4 py-1.5 rounded-lg text-xs text-stone-400 hover:text-stone-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!npcForm.name?.trim()) return;
                  if (editingNpcId) {
                    onUpdateWorkspace({
                      ...workspace,
                      npcs: (workspace.npcs || []).map((n) =>
                        n.id === editingNpcId ? ({ ...n, ...npcForm } as NPCRecord) : n
                      ),
                    });
                  } else {
                    const newNpc: NPCRecord = {
                      id: `npc-${Date.now()}`,
                      name: npcForm.name.trim(),
                      folder: npcForm.folder || 'General',
                      race: npcForm.race || 'Humano',
                      occupation: npcForm.occupation || 'Habitante',
                      attitude: npcForm.attitude || 'Neutral',
                      location: npcForm.location || 'Local',
                      appearance: npcForm.appearance || '',
                      personality: npcForm.personality || '',
                      secretOrHook: npcForm.secretOrHook || '',
                      notes: npcForm.notes || '',
                      evolution: npcForm.evolution || '',
                    };
                    onUpdateWorkspace({
                      ...workspace,
                      npcs: [...(workspace.npcs || []), newNpc],
                    });
                  }
                  setShowNpcModal(false);
                }}
                className="px-5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-cinzel font-bold transition shadow"
              >
                Guardar NPC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MONSTER MODAL (ADD / EDIT with CUSTOM ATTACKS) */}
      {showMonsterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181920] border-2 border-amber-800/80 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-5 text-stone-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-3">
              <h3 className="text-base font-cinzel font-bold text-amber-300">
                {editingMonsterId ? 'Editar Monstruo' : 'Nuevo Monstruo / Criatura'}
              </h3>
              <button
                onClick={handleAiAssistMonster}
                disabled={isGeneratingAi}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-700 text-xs font-cinzel font-bold transition shadow"
              >
                <Sparkles className={`w-3.5 h-3.5 text-purple-400 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                <span>{isGeneratingAi ? 'Generando...' : 'Completar con IA'}</span>
              </button>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <input
                type="text"
                placeholder="Nombre (ej. Orco Guerrero)"
                value={monsterForm.name || ''}
                onChange={(e) => setMonsterForm({ ...monsterForm, name: e.target.value })}
                className="bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 col-span-2"
              />
              <input
                type="text"
                placeholder="Desafío (CR ej. 1/2, 2, 5)"
                value={monsterForm.cr || ''}
                onChange={(e) => setMonsterForm({ ...monsterForm, cr: e.target.value })}
                className="bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100"
              />
              <select
                value={monsterForm.size || 'Mediano'}
                onChange={(e) => setMonsterForm({ ...monsterForm, size: e.target.value as any })}
                className="bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100"
              >
                <option value="Diminuto">Diminuto</option>
                <option value="Pequeño">Pequeño</option>
                <option value="Mediano">Mediano</option>
                <option value="Grande">Grande</option>
                <option value="Enorme">Enorme</option>
                <option value="Gargantuesco">Gargantuesco</option>
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <input
                type="number"
                placeholder="Clase de Armadura (CA)"
                value={monsterForm.ac || 10}
                onChange={(e) => setMonsterForm({ ...monsterForm, ac: parseInt(e.target.value, 10) || 10 })}
                className="bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100"
              />
              <input
                type="number"
                placeholder="Puntos de Golpe Máx"
                value={monsterForm.maxHp || 10}
                onChange={(e) => {
                  const hp = parseInt(e.target.value, 10) || 10;
                  setMonsterForm({ ...monsterForm, maxHp: hp, hp });
                }}
                className="bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100"
              />
              <input
                type="text"
                placeholder="Velocidad (ej. 30 pies)"
                value={monsterForm.speed || ''}
                onChange={(e) => setMonsterForm({ ...monsterForm, speed: e.target.value })}
                className="bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100"
              />
              <select
                value={monsterForm.folder || 'General'}
                onChange={(e) => setMonsterForm({ ...monsterForm, folder: e.target.value })}
                className="bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100"
              >
                <option value="General">General</option>
                {(workspace.folders || []).map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* CUSTOM ATTACKS EDITOR */}
            <div className="bg-[#13141a] p-3 rounded-xl border border-stone-800 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-cinzel font-bold text-amber-300">
                  Acciones y Ataques del Monstruo (Configura armas, arcos, hechizos)
                </span>
                <span className="text-[10px] text-stone-400">Total: {monsterForm.actions?.length || 0}</span>
              </div>

              {/* List of current attacks */}
              <div className="space-y-1.5 mb-3 max-h-36 overflow-y-auto pr-1">
                {(monsterForm.actions || []).length === 0 ? (
                  <p className="text-xs text-stone-500 italic">Sin ataques. Agrega uno abajo.</p>
                ) : (
                  (monsterForm.actions || []).map((atk, aIdx) => (
                    <div
                      key={atk.id || aIdx}
                      className="p-2 bg-[#181920] border border-stone-800 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <strong className="text-amber-400">{atk.name}</strong>{' '}
                        <span className="text-stone-400">
                          ({atk.type === 'melee' ? 'Cuerpo a cuerpo' : 'A distancia'}) • +{atk.toHit} al impactar • {atk.damage} {atk.damageType}
                        </span>
                        {atk.description && <span className="block text-[11px] text-stone-500">{atk.description}</span>}
                      </div>
                      <button
                        onClick={() =>
                          setMonsterForm({
                            ...monsterForm,
                            actions: (monsterForm.actions || []).filter((_, i) => i !== aIdx),
                          })
                        }
                        className="text-stone-500 hover:text-red-400 p-1"
                        title="Quitar ataque"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Attack Form inline */}
              <div className="pt-2 border-t border-stone-800/80">
                <span className="text-[11px] font-bold text-stone-300 block mb-1.5">+ Añadir Nuevo Ataque:</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Nombre (ej. Cimitarra, Arco corto)"
                    value={newAttack.name || ''}
                    onChange={(e) => setNewAttack({ ...newAttack, name: e.target.value })}
                    className="bg-[#181920] border border-stone-700 rounded px-2 py-1 text-xs text-stone-100 col-span-2"
                  />
                  <select
                    value={newAttack.type || 'melee'}
                    onChange={(e) => setNewAttack({ ...newAttack, type: e.target.value as any })}
                    className="bg-[#181920] border border-stone-700 rounded px-2 py-1 text-xs text-stone-100"
                  >
                    <option value="melee">Cuerpo a cuerpo</option>
                    <option value="ranged">A distancia</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Bono (+impacto)"
                    value={newAttack.toHit || 0}
                    onChange={(e) => setNewAttack({ ...newAttack, toHit: parseInt(e.target.value, 10) || 0 })}
                    className="bg-[#181920] border border-stone-700 rounded px-2 py-1 text-xs text-stone-100"
                  />
                  <input
                    type="text"
                    placeholder="Daño (ej. 1d8+3)"
                    value={newAttack.damage || ''}
                    onChange={(e) => setNewAttack({ ...newAttack, damage: e.target.value })}
                    className="bg-[#181920] border border-stone-700 rounded px-2 py-1 text-xs text-stone-100"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Tipo de daño (ej. Cortante, Fuego, Veneno)"
                    value={newAttack.damageType || ''}
                    onChange={(e) => setNewAttack({ ...newAttack, damageType: e.target.value })}
                    className="flex-1 bg-[#181920] border border-stone-700 rounded px-2 py-1 text-xs text-stone-100"
                  />
                  <button
                    onClick={() => {
                      if (!newAttack.name?.trim()) return;
                      const addedAttack: MonsterAttack = {
                        id: `ma-${Date.now()}`,
                        name: newAttack.name.trim(),
                        type: newAttack.type || 'melee',
                        toHit: newAttack.toHit || 0,
                        damage: newAttack.damage || '1d6',
                        damageType: newAttack.damageType || 'Cortante',
                        range: newAttack.type === 'ranged' ? '80/320 pies' : '5 pies',
                        description: newAttack.description || '',
                      };
                      setMonsterForm({
                        ...monsterForm,
                        actions: [...(monsterForm.actions || []), addedAttack],
                      });
                      setNewAttack({
                        name: '',
                        type: 'melee',
                        toHit: 4,
                        damage: '1d6+2',
                        damageType: 'Cortante',
                      });
                    }}
                    className="px-3 py-1 bg-amber-700 hover:bg-amber-600 text-white rounded text-xs font-cinzel font-bold"
                  >
                    + Agregar Ataque
                  </button>
                </div>
              </div>
            </div>

            <textarea
              placeholder="Notas tácticas o estrategia del monstruo..."
              value={monsterForm.notes || ''}
              onChange={(e) => setMonsterForm({ ...monsterForm, notes: e.target.value })}
              rows={2}
              className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 mb-3"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => setShowMonsterModal(false)}
                className="px-4 py-1.5 rounded-lg text-xs text-stone-400 hover:text-stone-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!monsterForm.name?.trim()) return;
                  if (editingMonsterId) {
                    onUpdateWorkspace({
                      ...workspace,
                      monsters: (workspace.monsters || []).map((m) =>
                        m.id === editingMonsterId ? ({ ...m, ...monsterForm } as MonsterRecord) : m
                      ),
                    });
                  } else {
                    const newMon: MonsterRecord = {
                      id: `mon-${Date.now()}`,
                      name: monsterForm.name.trim(),
                      size: monsterForm.size || 'Mediano',
                      type: monsterForm.type || 'Monstruosidad',
                      alignment: monsterForm.alignment || 'Caótico Maligno',
                      cr: monsterForm.cr || '1',
                      ac: monsterForm.ac || 12,
                      hp: monsterForm.maxHp || 20,
                      maxHp: monsterForm.maxHp || 20,
                      speed: monsterForm.speed || '30 pies',
                      str: monsterForm.str || 12,
                      dex: monsterForm.dex || 12,
                      con: monsterForm.con || 12,
                      int: monsterForm.int || 8,
                      wis: monsterForm.wis || 10,
                      cha: monsterForm.cha || 8,
                      traits: monsterForm.traits || [],
                      actions: monsterForm.actions && monsterForm.actions.length > 0 ? monsterForm.actions : [],
                      folder: monsterForm.folder || 'General',
                      notes: monsterForm.notes || '',
                    };
                    onUpdateWorkspace({
                      ...workspace,
                      monsters: [...(workspace.monsters || []), newMon],
                    });
                  }
                  setShowMonsterModal(false);
                }}
                className="px-5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-cinzel font-bold transition shadow"
              >
                Guardar Monstruo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. LOCATION MODAL (ADD / EDIT) */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181920] border-2 border-amber-800/80 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 text-stone-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-3">
              <h3 className="text-base font-cinzel font-bold text-amber-300">
                {editingLocationId ? 'Editar Lugar o Mazmorra' : 'Nuevo Lugar o Mazmorra'}
              </h3>
              <button
                onClick={handleAiAssistLocation}
                disabled={isGeneratingAi}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-700 text-xs font-cinzel font-bold transition shadow"
              >
                <Sparkles className={`w-3.5 h-3.5 text-purple-400 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                <span>{isGeneratingAi ? 'Estructurando...' : 'Estructurar con IA'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <input
                type="text"
                placeholder="Nombre (ej. Criptas de la Sombra)"
                value={locationForm.name || ''}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                className="bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100"
              />
              <input
                type="text"
                placeholder="Región geográfica"
                value={locationForm.region || ''}
                onChange={(e) => setLocationForm({ ...locationForm, region: e.target.value })}
                className="bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100"
              />
              <select
                value={locationForm.folder || 'General'}
                onChange={(e) => setLocationForm({ ...locationForm, folder: e.target.value })}
                className="bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100"
              >
                <option value="General">General</option>
                {(workspace.folders || []).map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              placeholder="Descripción sensorial para leer a los jugadores..."
              value={locationForm.description || ''}
              onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })}
              rows={2}
              className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 mb-2"
            />
            <textarea
              placeholder="Secretos, trampas, pistas y tesoros para el DM..."
              value={locationForm.secretsForDm || ''}
              onChange={(e) => setLocationForm({ ...locationForm, secretsForDm: e.target.value })}
              rows={2}
              className="w-full bg-[#121316] border border-amber-900/60 rounded-lg px-3 py-2 text-xs text-amber-200 mb-3"
            />

            {/* TWO NOTE BLOCKS REQUIRED BY USER */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] font-cinzel font-bold text-stone-400 uppercase tracking-wider block mb-1">
                  1. Notas Tácticas y Ambientales (DM):
                </label>
                <textarea
                  placeholder="Peligros de frío, cerraduras CD 15, patrullas..."
                  value={locationForm.notes || ''}
                  onChange={(e) => setLocationForm({ ...locationForm, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100"
                />
              </div>
              <div>
                <label className="text-[11px] font-cinzel font-bold text-purple-400 uppercase tracking-wider block mb-1">
                  2. Evolución del Lugar en Campaña:
                </label>
                <textarea
                  placeholder="Ej. La taberna se incendió en la sesión 3, los orcos fortificaron la entrada..."
                  value={locationForm.evolution || ''}
                  onChange={(e) => setLocationForm({ ...locationForm, evolution: e.target.value })}
                  rows={2}
                  className="w-full bg-[#121316] border border-purple-900/60 rounded-lg px-3 py-2 text-xs text-purple-200"
                />
              </div>
            </div>

            {/* Points of Interest list */}
            <div className="bg-[#121316] p-2.5 rounded-lg border border-stone-800 mb-3">
              <span className="text-[11px] font-bold text-stone-300 block mb-1.5">Puntos de Interés:</span>
              <div className="flex items-center gap-1.5 mb-2">
                <input
                  type="text"
                  placeholder="+ Punto clave (ej. La Forja Antigua)"
                  value={newPoiInput}
                  onChange={(e) => setNewPoiInput(e.target.value)}
                  className="flex-1 bg-[#181920] border border-stone-700 rounded px-2 py-1 text-xs text-stone-100"
                />
                <button
                  onClick={() => {
                    if (newPoiInput.trim()) {
                      setLocationForm({
                        ...locationForm,
                        pointsOfInterest: [...(locationForm.pointsOfInterest || []), newPoiInput.trim()],
                      });
                      setNewPoiInput('');
                    }
                  }}
                  className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded"
                >
                  Añadir
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {(locationForm.pointsOfInterest || []).map((poi, pIdx) => (
                  <span
                    key={pIdx}
                    className="text-[11px] px-2 py-0.5 rounded bg-[#181920] border border-stone-700 text-stone-300 flex items-center gap-1"
                  >
                    {poi}
                    <button
                      onClick={() =>
                        setLocationForm({
                          ...locationForm,
                          pointsOfInterest: (locationForm.pointsOfInterest || []).filter((_, i) => i !== pIdx),
                        })
                      }
                      className="text-stone-500 hover:text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => setShowLocationModal(false)}
                className="px-4 py-1.5 rounded-lg text-xs text-stone-400 hover:text-stone-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!locationForm.name?.trim()) return;
                  if (editingLocationId) {
                    onUpdateWorkspace({
                      ...workspace,
                      locations: (workspace.locations || []).map((l) =>
                        l.id === editingLocationId ? ({ ...l, ...locationForm } as LocationRecord) : l
                      ),
                    });
                  } else {
                    const newLoc: LocationRecord = {
                      id: `loc-${Date.now()}`,
                      name: locationForm.name.trim(),
                      region: locationForm.region || '',
                      type: locationForm.type || 'Ciudad',
                      description: locationForm.description || '',
                      secretsForDm: locationForm.secretsForDm || '',
                      notes: locationForm.notes || '',
                      evolution: locationForm.evolution || '',
                      pointsOfInterest: locationForm.pointsOfInterest || [],
                      folder: locationForm.folder || 'General',
                    };
                    onUpdateWorkspace({
                      ...workspace,
                      locations: [...(workspace.locations || []), newLoc],
                    });
                  }
                  setShowLocationModal(false);
                }}
                className="px-5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-cinzel font-bold transition shadow"
              >
                Guardar Lugar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. LOG / CHRONICLE MODAL (ADD / EDIT) */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181920] border-2 border-amber-800/80 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 text-stone-200 shadow-2xl">
            <h3 className="text-base font-cinzel font-bold text-amber-300 mb-3">
              {editingLogId ? 'Editar Entrada de Sesión' : 'Nueva Entrada del Diario'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                placeholder="Título del Capítulo o Sesión"
                value={logForm.title || ''}
                onChange={(e) => setLogForm({ ...logForm, title: e.target.value })}
                className="bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100"
              />
              <input
                type="text"
                placeholder="Fecha en el mundo (ej. 15 de Mirtul)"
                value={logForm.date || ''}
                onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                className="bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100"
              />
            </div>
            <textarea
              placeholder="Resumen general de los acontecimientos..."
              value={logForm.summary || ''}
              onChange={(e) => setLogForm({ ...logForm, summary: e.target.value })}
              rows={2}
              className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 mb-2"
            />
            <textarea
              placeholder="Texto narrativo público (lo que los jugadores ven o escuchan)..."
              value={logForm.publicNotes || ''}
              onChange={(e) => setLogForm({ ...logForm, publicNotes: e.target.value })}
              rows={2}
              className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 mb-2"
            />
            <textarea
              placeholder="Notas secretas y planes para el DM..."
              value={logForm.privateNotes || ''}
              onChange={(e) => setLogForm({ ...logForm, privateNotes: e.target.value })}
              rows={2}
              className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 mb-3"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => setShowLogModal(false)}
                className="px-4 py-1.5 rounded-lg text-xs text-stone-400 hover:text-stone-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!logForm.title?.trim()) return;
                  if (editingLogId) {
                    onUpdateWorkspace({
                      ...workspace,
                      campaignLogs: (workspace.campaignLogs || []).map((l) =>
                        l.id === editingLogId ? ({ ...l, ...logForm } as CampaignLogEntry) : l
                      ),
                    });
                  } else {
                    const newLog: CampaignLogEntry = {
                      id: `log-${Date.now()}`,
                      sessionNumber: logForm.sessionNumber || 1,
                      title: logForm.title.trim(),
                      date: logForm.date || 'Día 1',
                      realDate: new Date().toISOString().split('T')[0],
                      summary: logForm.summary || '',
                      publicNotes: logForm.publicNotes || '',
                      privateNotes: logForm.privateNotes || '',
                      tags: ['Sesión'],
                      folder: logForm.folder || 'General',
                    };
                    onUpdateWorkspace({
                      ...workspace,
                      campaignLogs: [...(workspace.campaignLogs || []), newLog],
                    });
                  }
                  setShowLogModal(false);
                }}
                className="px-5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-cinzel font-bold transition shadow"
              >
                Guardar en Crónica
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. HIERARCHICAL FOLDER MANAGER MODAL (UP TO 3 LEVELS) */}
      <FolderManagerModal
        isOpen={isFolderManagerOpen}
        onClose={() => setIsFolderManagerOpen(false)}
        workspace={workspace}
        onUpdateWorkspace={onUpdateWorkspace}
        onSelectFolder={(f) => setSelectedFolder(f)}
      />

      {/* 7. QUICK MOVE ENTITY MODAL */}
      {movingEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181920] border-2 border-stone-700 rounded-xl max-w-sm w-full p-5 text-stone-200 shadow-2xl">
            <h4 className="font-cinzel font-bold text-sm text-amber-300 mb-2 flex items-center gap-1.5">
              <Folder className="w-4 h-4 text-amber-400" />
              Mover "{movingEntity.name}"
            </h4>
            <p className="text-xs text-stone-400 mb-3">
              Carpeta actual:{' '}
              <strong className="text-amber-400">{movingEntity.currentFolder || 'General'}</strong>
            </p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 mb-4">
              <button
                onClick={() => handleMoveEntityFolder('General')}
                className={`w-full text-left p-2 rounded text-xs transition ${
                  movingEntity.currentFolder === 'General'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-[#121316] text-stone-300 hover:bg-stone-800'
                }`}
              >
                📁 General (Sin carpeta)
              </button>
              {(workspace.folders || []).map((f) => {
                const depth = getFolderDepth(f);
                return (
                  <button
                    key={f}
                    onClick={() => handleMoveEntityFolder(f)}
                    className={`w-full text-left p-2 rounded text-xs transition ${
                      movingEntity.currentFolder === f
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-[#121316] text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    {depth === 1 ? `📁 ${f}` : depth === 2 ? `↳ 📂 ${f}` : `   ↳ 📄 ${f}`}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setMovingEntity(null)}
                className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

