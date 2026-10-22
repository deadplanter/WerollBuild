import React, { useState } from 'react';
import {
  Shield,
  Heart,
  Zap,
  Sword,
  BookOpen,
  Backpack,
  Scroll,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  Flame,
  Edit2,
  Edit3,
  Lock,
  Unlock,
  Upload,
  ArrowLeft,
  Coins,
  Settings,
  Palette,
  Compass,
  Map as MapIcon,
  Crown,
  MessageSquare,
  Dices,
  Eye,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { EntityAvatar } from '../common/EntityAvatar';
import { AvatarCustomizerModal } from '../common/AvatarCustomizerModal';
import { CharacterSettingsModal } from './CharacterSettingsModal';
import { CharacterJournalBookModal } from './CharacterJournalBookModal';
import { CharacterBackpackModal } from './CharacterBackpackModal';
import { CharacterParchmentModal } from './CharacterParchmentModal';
import {
  Character5e,
  AbilityKey,
  SkillKey,
  AttackAction,
  CustomSkillEntry,
  PartyMemberLive,
  LiveCombatantMini,
  DiceRollResult,
} from '../../types/dnd';
import {
  calculateModifier,
  formatModifier,
  calculateProficiencyBonus,
  calculatePassivePerception,
  calculateSpellSaveDC,
  calculateSpellAttackBonus,
  calculateCarryCapacity,
  deriveEquippedWeaponAttacks,
  getEffectiveAbilityModifier,
  buildJournalIndexEntries,
} from '../../utils/dnd-math';
import { ABILITY_LABELS, SKILL_METADATA } from '../../data/srd';

const DEFAULT_SRD_SKILL_DESCRIPTIONS: Record<SkillKey, string> = {
  acrobatics: 'Mantener el equilibrio, hacer piruetas, escapar de agarres o aterrizar de pie.',
  animalHandling: 'Calmar animales domesticados, intuir intenciones de una bestia o guiar monturas.',
  arcana: 'Recordar conocimiento sobre hechizos, objetos mágicos, símbolos arcanos y planos.',
  athletics: 'Escalar muros escarpados, saltar grandes distancias, nadar o forcejear.',
  deception: 'Ocultar la verdad, mentir con convicción, disfrazarse o engañar.',
  history: 'Recordar eventos históricos, reinos antiguos, guerras pasadas y leyendas.',
  insight: 'Determinar las verdaderas intenciones de una criatura o detectar mentiras.',
  intimidation: 'Influir en alguien mediante amenazas abiertas o presencia imponente.',
  investigation: 'Buscar pistas ocultas, hacer deducciones lógicas o hallar mecanismos.',
  medicine: 'Estabilizar a un compañero moribundo o diagnosticar enfermedades y heridas.',
  nature: 'Recordar información sobre el terreno, plantas, animales y ciclos naturales.',
  perception: 'Detectar la presencia de algo oculto, escuchar ruidos o notar detalles.',
  performance: 'Deleitar a una audiencia con música, danza, actuación o narración.',
  persuasion: 'Influir en otros con tacto, diplomacia, gracia social o buena fe.',
  religion: 'Recordar conocimientos sobre deidades, ritos sagrados y símbolos divinos.',
  sleightOfHand: 'Realizar trucos de prestidigitación, robar bolsas u ocultar objetos.',
  stealth: 'Esconderse de los enemigos, caminar en silencio o escabullirse en las sombras.',
  survival: 'Seguir rastros, cazar presas, guiar al grupo por tierras salvajes o predecir clima.',
};

interface CharacterSheetViewProps {
  character: Character5e;
  onUpdateCharacter: (updated: Character5e) => void;
  onTriggerRoll: (title: string, modifier: number, diceType?: number) => void;
  isLocked?: boolean;
  onUnlockRequest?: () => void;
  onSaveToCloud?: () => void;
  onReturnToLobby?: () => void;
  isInActiveRoom?: boolean;
  roomCode?: string;
  partyMembers?: PartyMemberLive[];
  dmConnected?: boolean;
  dmLiveMessage?: string;
  showCombatantsOnTable?: boolean;
  liveCombatants?: LiveCombatantMini[];
  activeAnnouncement?: { title: string; content: string } | null;
  onDismissAnnouncement?: () => void;
  onOpenRollFeed?: () => void;
  rollFeed?: DiceRollResult[];
  onSendPlayerMessageToDM?: (
    title: string,
    description: string
  ) => Promise<{ ok: boolean; message?: string; error?: string }>;
}

export const CharacterSheetView: React.FC<CharacterSheetViewProps> = ({
  character,
  onUpdateCharacter,
  onTriggerRoll,
  isLocked = false,
  onUnlockRequest,
  onSaveToCloud,
  onReturnToLobby,
  isInActiveRoom = false,
  roomCode = 'MESA-1',
  partyMembers = [],
  dmConnected = false,
  dmLiveMessage = '',
  showCombatantsOnTable = false,
  liveCombatants = [],
  activeAnnouncement = null,
  onDismissAnnouncement,
  onOpenRollFeed,
  rollFeed = [],
  onSendPlayerMessageToDM,
}) => {
  // Active Deck in "Mazos de Juego" & Horizontal Card Carousel Index
  const [activeDeck, setActiveDeck] = useState<'combat' | 'skills' | 'spells'>('combat');
  const [playerDeckScrollIndex, setPlayerDeckScrollIndex] = useState<number>(0);

  // Interactive Modals for "El Rincón del Aventurero" & Settings
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState<boolean>(false);
  const [isBackpackModalOpen, setIsBackpackModalOpen] = useState<boolean>(false);
  const [isParchmentModalOpen, setIsParchmentModalOpen] = useState<boolean>(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState<boolean>(false);
  const [skinNotice, setSkinNotice] = useState<boolean>(false);

  // Table Mode Modals (Map & Private Message to DM)
  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(false);
  const [isDmMsgModalOpen, setIsDmMsgModalOpen] = useState<boolean>(false);
  const [dmMsgTitle, setDmMsgTitle] = useState<string>('');
  const [dmMsgBody, setDmMsgBody] = useState<string>('');
  const [dmMsgStatus, setDmMsgStatus] = useState<string>('');

  // HP Adjustment Modal
  const [hpChangeAmount, setHpChangeAmount] = useState<number>(5);
  const [showHpModal, setShowHpModal] = useState<boolean>(false);
  const [hpModalMode, setHpModalMode] = useState<'heal' | 'damage' | 'temp'>('damage');

  // Add Combat Card Modal
  const [showAddCombatCardModal, setShowAddCombatCardModal] = useState<boolean>(false);
  const [combatCardForm, setCombatCardForm] = useState<{
    name: string;
    type: 'melee' | 'ranged' | 'spell';
    attackBonus: number;
    damageDice: string;
    damageType: string;
    notes: string;
  }>({
    name: '',
    type: 'melee',
    attackBonus: 4,
    damageDice: '1d8+2',
    damageType: 'Cortante',
    notes: '',
  });

  // Add Skill Card Modal
  const [showAddSkillCardModal, setShowAddSkillCardModal] = useState<boolean>(false);
  const [skillCardForm, setSkillCardForm] = useState<{
    srdKey: SkillKey | 'custom';
    name: string;
    ability: AbilityKey;
    proficiency: 'proficient' | 'expertise';
    description: string;
  }>({
    srdKey: 'perception',
    name: 'Percepción',
    ability: 'wis',
    proficiency: 'proficient',
    description: DEFAULT_SRD_SKILL_DESCRIPTIONS.perception,
  });

  const profBonus = calculateProficiencyBonus(character.level);
  const wisEffectiveMod = getEffectiveAbilityModifier(character.abilities.wis);
  const percProf = character.skills?.perception || 'none';
  const passivePerception =
    10 +
    wisEffectiveMod +
    (percProf === 'expertise' ? profBonus * 2 : percProf === 'proficient' ? profBonus : 0);

  const spellAbilityKey: AbilityKey = character.spellcastingAbility || 'wis';
  const spellAbilityScore = character.abilities[spellAbilityKey]?.score || 10;
  const spellSaveDC =
    character.spellSaveDcOverride !== undefined
      ? character.spellSaveDcOverride
      : calculateSpellSaveDC(spellAbilityScore, profBonus);
  const spellAttackBonus =
    character.spellAttackBonusOverride !== undefined
      ? character.spellAttackBonusOverride
      : calculateSpellAttackBonus(spellAbilityScore, profBonus);

  // Derived Equipped Weapons & Attacks for "Combates y Acciones" Deck
  const equippedWeaponAttacks = React.useMemo(
    () =>
      deriveEquippedWeaponAttacks(
        character.inventory || [],
        character.abilities.str.score,
        character.abilities.dex.score,
        profBonus
      ),
    [character.inventory, character.abilities.str.score, character.abilities.dex.score, profBonus]
  );

  // Derived Possessed / Unlocked Skills for "Habilidades" Deck
  const possessedSkills: CustomSkillEntry[] = React.useMemo(() => {
    if (Array.isArray(character.customSkills) && character.customSkills.length > 0) {
      return character.customSkills;
    }
    const entries: CustomSkillEntry[] = [];
    (Object.keys(SKILL_METADATA) as SkillKey[]).forEach((k) => {
      const prof = character.skills?.[k] || 'none';
      if (prof !== 'none') {
        entries.push({
          id: `skill-${k}`,
          srdKey: k,
          name: SKILL_METADATA[k].nameEs,
          ability: SKILL_METADATA[k].ability,
          proficiency: prof,
          description: DEFAULT_SRD_SKILL_DESCRIPTIONS[k] || '',
        });
      }
    });
    return entries;
  }, [character.customSkills, character.skills]);

  // Derived Prepared Spells for "Lanzar Conjuros" Deck
  const preparedSpells = React.useMemo(
    () => (character.spells || []).filter((s) => s.prepared !== false),
    [character.spells]
  );

  const totalWeight = (character.inventory || []).reduce(
    (sum, item) => sum + (Number(item.weight) || 0) * (Number(item.quantity) || 1),
    0
  );
  const carryCap = calculateCarryCapacity(character.abilities.str.score);
  const journalIndex = buildJournalIndexEntries(character.playerJournal || []);
  const currency = character.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };

  // Handlers
  const applyHpChange = () => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    const amt = Math.max(0, Number(hpChangeAmount) || 0);
    const updated = { ...character };

    if (hpModalMode === 'heal') {
      updated.currentHp = Math.min(updated.maxHp, updated.currentHp + amt);
    } else if (hpModalMode === 'damage') {
      if (updated.tempHp > 0) {
        if (amt <= updated.tempHp) {
          updated.tempHp -= amt;
        } else {
          const rem = amt - updated.tempHp;
          updated.tempHp = 0;
          updated.currentHp = Math.max(0, updated.currentHp - rem);
        }
      } else {
        updated.currentHp = Math.max(0, updated.currentHp - amt);
      }
    } else if (hpModalMode === 'temp') {
      updated.tempHp = amt;
    }

    onUpdateCharacter(updated);
    setShowHpModal(false);
  };

  const handleShortRestHitDie = () => {
    const match = (character.hitDiceTotal || '1d8').match(/d(\d+)/);
    const dieSides = match ? parseInt(match[1], 10) : 8;
    const conMod = getEffectiveAbilityModifier(character.abilities.con);
    onTriggerRoll(`Descanso Corto: Dado de Golpe (1d${dieSides} + CON)`, conMod, dieSides);

    const maxDiceCount = parseInt(character.hitDiceTotal, 10) || character.level;
    if (character.hitDiceUsed < maxDiceCount && !isLocked) {
      onUpdateCharacter({
        ...character,
        hitDiceUsed: character.hitDiceUsed + 1,
      });
    }
  };

  const handleLongRest = () => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    const maxDiceCount = parseInt(character.hitDiceTotal, 10) || character.level;
    const diceRegained = Math.max(1, Math.floor(maxDiceCount / 2));
    onUpdateCharacter({
      ...character,
      currentHp: character.maxHp,
      tempHp: 0,
      hitDiceUsed: Math.max(0, character.hitDiceUsed - diceRegained),
      deathSaves: { successes: 0, failures: 0 },
      spellSlots: (character.spellSlots || []).map((s) => ({ ...s, expended: 0 })),
    });
  };

  const toggleDeathSave = (type: 'successes' | 'failures', index: number) => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    const current = character.deathSaves[type];
    const nextVal = current === index + 1 ? index : index + 1;
    onUpdateCharacter({
      ...character,
      deathSaves: {
        ...character.deathSaves,
        [type]: nextVal,
      },
    });
  };

  const updateAbilityBaseScore = (key: AbilityKey, nextScore: number) => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    const clamped = Math.max(1, Math.min(30, Math.round(nextScore || 10)));
    onUpdateCharacter({
      ...character,
      abilities: {
        ...character.abilities,
        [key]: {
          ...character.abilities[key],
          score: clamped,
        },
      },
    });
  };

  const toggleSaveProficiency = (key: AbilityKey) => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    onUpdateCharacter({
      ...character,
      abilities: {
        ...character.abilities,
        [key]: {
          ...character.abilities[key],
          proficientSave: !character.abilities[key].proficientSave,
        },
      },
    });
  };

  const handleAddCombatCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!combatCardForm.name.trim()) return;
    const newAttack: AttackAction = {
      id: `atk-${Date.now()}`,
      name: combatCardForm.name.trim(),
      type: combatCardForm.type,
      attackBonus: Number(combatCardForm.attackBonus) || 0,
      damageDice: combatCardForm.damageDice.trim() || '1d6',
      damageType: combatCardForm.damageType.trim() || 'Cortante',
      notes: combatCardForm.notes.trim(),
    };
    onUpdateCharacter({
      ...character,
      attacks: [...(character.attacks || []), newAttack],
    });
    setShowAddCombatCardModal(false);
    setCombatCardForm({
      name: '',
      type: 'melee',
      attackBonus: 4,
      damageDice: '1d8+2',
      damageType: 'Cortante',
      notes: '',
    });
  };

  const handleDeleteAttackCard = (id: string) => {
    if (isLocked) return;
    onUpdateCharacter({
      ...character,
      attacks: (character.attacks || []).filter((a) => a.id !== id),
    });
  };

  const handleAddSkillCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillCardForm.name.trim()) return;
    const newEntry: CustomSkillEntry = {
      id: `cskill-${Date.now()}`,
      srdKey: skillCardForm.srdKey !== 'custom' ? skillCardForm.srdKey : undefined,
      name: skillCardForm.name.trim(),
      ability: skillCardForm.ability,
      proficiency: skillCardForm.proficiency,
      description: skillCardForm.description.trim() || 'Habilidad desbloqueada.',
    };
    const nextCustom = [...possessedSkills, newEntry];
    const nextSkills = { ...character.skills };
    if (skillCardForm.srdKey !== 'custom') {
      nextSkills[skillCardForm.srdKey] = skillCardForm.proficiency;
    }
    onUpdateCharacter({
      ...character,
      skills: nextSkills,
      customSkills: nextCustom,
    });
    setShowAddSkillCardModal(false);
  };

  const handleRemoveSkillCard = (id: string, srdKey?: SkillKey) => {
    if (isLocked) return;
    const nextCustom = possessedSkills.filter((s) => s.id !== id);
    const nextSkills = { ...character.skills };
    if (srdKey) {
      nextSkills[srdKey] = 'none';
    }
    onUpdateCharacter({
      ...character,
      skills: nextSkills,
      customSkills: nextCustom,
    });
  };

  const handleSubmitMessageToDM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSendPlayerMessageToDM || !dmMsgTitle.trim() || !dmMsgBody.trim()) return;
    const res = await onSendPlayerMessageToDM(dmMsgTitle.trim(), dmMsgBody.trim());
    if (res.ok) {
      setDmMsgStatus(res.message || '¡Mensaje enviado al DM!');
      setDmMsgTitle('');
      setDmMsgBody('');
      setTimeout(() => {
        setDmMsgStatus('');
        setIsDmMsgModalOpen(false);
      }, 1500);
    } else {
      setDmMsgStatus(res.error || 'Error al enviar mensaje.');
    }
  };

  // Allies & Enemies for Table Mode Right Sidebar (Max 8 each in 4x2 grid)
  const tableAllies = React.useMemo(() => {
    const list: {
      id: string;
      name: string;
      hp: number;
      maxHp: number;
      avatarType?: 'icon' | 'custom';
      avatarCustomUrl?: string;
      avatarIcon?: string;
    }[] = [];

    // Ensure current character is always first ally
    list.push({
      id: character.id,
      name: character.name,
      hp: character.currentHp,
      maxHp: character.maxHp,
      avatarType: character.avatarType,
      avatarCustomUrl: character.avatarCustomUrl || character.avatarUrl,
      avatarIcon: character.avatarIcon || 'anonymous',
    });

    partyMembers.forEach((pm) => {
      if (pm.characterId !== character.id && list.length < 8) {
        list.push({
          id: pm.characterId,
          name: pm.characterName,
          hp: pm.currentHp,
          maxHp: pm.maxHp,
          avatarType: pm.avatarType,
          avatarCustomUrl: pm.avatarCustomUrl || pm.avatarUrl,
          avatarIcon: pm.avatarIcon || 'anonymous',
        });
      }
    });

    if (showCombatantsOnTable) {
      liveCombatants
        .filter((c) => c.faction === 'ally' && !c.isPlayer)
        .forEach((ally) => {
          if (list.length < 8) {
            list.push({
              id: ally.id,
              name: ally.name,
              hp: ally.hp,
              maxHp: ally.maxHp,
              avatarIcon: 'shield',
            });
          }
        });
    }

    return list.slice(0, 8);
  }, [character, partyMembers, showCombatantsOnTable, liveCombatants]);

  const tableEnemies = React.useMemo(() => {
    if (!showCombatantsOnTable) return [];
    return liveCombatants.filter((c) => c.faction === 'enemy').slice(0, 8);
  }, [showCombatantsOnTable, liveCombatants]);

  const hitDiceAvailable = Math.max(
    0,
    (parseInt(character.hitDiceTotal, 10) || character.level) - (character.hitDiceUsed || 0)
  );

  return (
    <div className="space-y-2.5 select-none">
      {/* Optional DM Announcement Toast in Table Mode */}
      {isInActiveRoom && activeAnnouncement && (
        <div className="bg-gradient-to-r from-purple-950/90 via-[#1a1329] to-purple-950/90 border border-purple-500/70 rounded-xl px-4 py-2 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-cinzel font-bold text-xs text-amber-300">
              {activeAnnouncement.title}:
            </span>
            <span className="text-xs text-purple-100">{activeAnnouncement.content}</span>
          </div>
          {onDismissAnnouncement && (
            <button
              type="button"
              onClick={onDismissAnnouncement}
              className="text-purple-300 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* MAIN GRID: Full Width in Solo Mode | 9 Cols + 3 Cols Right Sidebar in Table Mode */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-start">
        {/* ================================================================= */}
        {/* MAIN CHARACTER SHEET PANEL (12 cols in Solo, 9 cols in Table Mode)*/}
        {/* ================================================================= */}
        <div
          className={`${
            isInActiveRoom ? 'xl:col-span-9' : 'xl:col-span-12'
          } bg-gradient-to-b from-[#1a1c24] via-[#15171e] to-[#121319] border-2 border-[#c8a45c]/65 rounded-2xl p-3 sm:p-3.5 shadow-[0_15px_50px_rgba(0,0,0,0.85)] space-y-2.5 relative overflow-hidden`}
        >
          {/* Decorative Corner Accents */}
          <div className="pointer-events-none absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 border-[#e2c275]/60 rounded-tl" />
          <div className="pointer-events-none absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 border-[#e2c275]/60 rounded-tr" />
          <div className="pointer-events-none absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 border-[#e2c275]/60 rounded-bl" />
          <div className="pointer-events-none absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 border-[#e2c275]/60 rounded-br" />

          {/* --------------------------------------------------------------- */}
          {/* ROW 1: CHARACTER IDENTITY & 4 ORNATE COMBAT STAT BOXES          */}
          {/* --------------------------------------------------------------- */}
          <div className="bg-[#12141b]/90 border border-[#c8a45c]/45 rounded-xl px-3 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            {/* Left: Circular Gold Avatar + Name + Subtitle */}
            <div className="flex items-center gap-3.5">
              <div
                onClick={() => !isLocked && setIsAvatarModalOpen(true)}
                className={`relative group shrink-0 rounded-full p-0.5 bg-gradient-to-b from-[#f3dfb2] via-[#c8a45c] to-[#785a28] shadow-lg ${
                  !isLocked ? 'cursor-pointer' : ''
                }`}
                title={!isLocked ? 'Cambiar retrato o icono del personaje' : undefined}
              >
                <div className="rounded-full overflow-hidden bg-[#14161d]">
                  <EntityAvatar
                    avatarType={character.avatarType || (character.avatarUrl ? 'custom' : 'icon')}
                    customUrl={character.avatarCustomUrl || character.avatarUrl}
                    iconId={character.avatarIcon || 'anonymous'}
                    size="lg"
                    className="rounded-full"
                  />
                </div>
                {!isLocked && (
                  <button
                    type="button"
                    aria-label="Editar retrato"
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#241c12] border border-[#e2c275] text-[#e2c275] flex items-center justify-center shadow"
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="font-cinzel font-black text-xl sm:text-2xl text-[#f5e4be] tracking-wide leading-none">
                    {character.name}
                  </h1>

                  <button
                    type="button"
                    onClick={() => {
                      if (isLocked) {
                        if (onUnlockRequest) onUnlockRequest();
                        return;
                      }
                      onUpdateCharacter({ ...character, inspiration: !character.inspiration });
                    }}
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-cinzel font-bold tracking-wider uppercase flex items-center gap-1.5 border transition cursor-pointer ${
                      character.inspiration
                        ? 'bg-gradient-to-r from-[#8c6218] to-[#b88628] text-white border-[#f5e4be] shadow-[0_0_12px_rgba(226,194,117,0.4)]'
                        : 'bg-[#1b1e28] text-[#cbb692] border-[#c8a45c]/50 hover:border-[#e2c275]'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-[#e2c275]" />
                    <span>INSPIRACIÓN</span>
                  </button>
                </div>

                {/* Subtitle with Race, Class, Level, XP, Background, Alignment & circular Edit/Lock */}
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#d6c5a7]">
                  <span className="font-semibold text-[#f3dfb2]">
                    {character.race} {character.characterClass}
                  </span>
                  <span className="text-[#8a7656]">•</span>
                  <span className="font-semibold text-[#e2c275]">Nivel {character.level}</span>
                  <span className="text-[#8a7656]">•</span>
                  <span className="font-mono text-[#e2c275]">
                    XP {character.xp ?? character.experience ?? 0}
                  </span>
                  <span className="text-[#8a7656]">•</span>
                  <span>{character.background}</span>
                  <span className="text-[#8a7656]">•</span>
                  <span>{character.alignment}</span>

                  {/* Circular Quick Edit Identity Button */}
                  <button
                    type="button"
                    onClick={() => setIsSettingsModalOpen(true)}
                    aria-label="Editar identidad y estadísticas del personaje"
                    className="w-5 h-5 rounded-full bg-[#1e222d] hover:bg-[#2c3140] border border-[#c8a45c]/60 text-[#e2c275] flex items-center justify-center transition cursor-pointer ml-1"
                    title="Abrir Ajustes de Personaje"
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                  </button>

                  {character.password && (
                    <button
                      type="button"
                      onClick={onUnlockRequest}
                      aria-label={isLocked ? 'Desbloquear hoja' : 'Hoja desbloqueada'}
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition cursor-pointer ${
                        isLocked
                          ? 'bg-red-950/80 border-red-500/60 text-red-300'
                          : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                      }`}
                      title={isLocked ? 'Hoja bloqueada' : 'Hoja desbloqueada'}
                    >
                      {isLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right: 4 Tall Ornate Gold-Bordered Combat Stat Boxes */}
            <div className="grid grid-cols-4 gap-2 shrink-0">
              <div className="bg-gradient-to-b from-[#1d202b] to-[#12141c] border-2 border-[#c8a45c]/70 rounded-xl px-2.5 py-1 text-center min-w-[68px] shadow-inner">
                <div className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-[#cbb692] flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3 text-[#e2c275]" />
                  <span>CA</span>
                </div>
                <div className="font-cinzel font-black text-xl text-[#f5e4be] leading-tight">
                  {character.armorClass}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onTriggerRoll('Iniciativa', character.initiativeBonus)}
                className="bg-gradient-to-b from-[#1d202b] to-[#12141c] hover:from-[#262a38] border-2 border-[#c8a45c]/70 hover:border-[#f3dfb2] rounded-xl px-2.5 py-1 text-center min-w-[68px] shadow-inner transition cursor-pointer"
                title="Tirar Iniciativa (1d20)"
              >
                <div className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-[#cbb692] flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3 text-[#e2c275]" />
                  <span>INIC.</span>
                </div>
                <div className="font-cinzel font-black text-xl text-white leading-tight">
                  {formatModifier(character.initiativeBonus)}
                </div>
              </button>

              <div className="bg-gradient-to-b from-[#1d202b] to-[#12141c] border-2 border-[#c8a45c]/70 rounded-xl px-2.5 py-1 text-center min-w-[78px] shadow-inner">
                <div className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-[#cbb692]">
                  VELOCIDAD
                </div>
                <div className="font-cinzel font-black text-lg text-white leading-tight">
                  {character.speed} <span className="text-[10px] text-[#cbb692]">FT</span>
                </div>
              </div>

              <div className="bg-gradient-to-b from-[#1d202b] to-[#12141c] border-2 border-[#c8a45c]/70 rounded-xl px-2.5 py-1 text-center min-w-[68px] shadow-inner">
                <div className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-[#cbb692]">
                  COMP.
                </div>
                <div className="font-cinzel font-black text-xl text-[#e2c275] leading-tight">
                  +{profBonus}
                </div>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* ROW 2: HP BAR + TIRADAS DE MUERTE + AJUSTES/SKIN + DESCANSOS    */}
          {/* --------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
            {/* Left 7 Cols: PG Actual & Glowing Green HP Bar */}
            <div className="lg:col-span-7 bg-[#12141b]/95 border border-[#c8a45c]/45 rounded-xl px-3 py-2 flex flex-col justify-between gap-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500 fill-red-500/30" />
                  <span className="font-cinzel font-bold text-xs sm:text-sm text-[#f5e4be]">
                    PG Actual:{' '}
                    <strong className="text-white text-base">
                      {character.currentHp}/{character.maxHp}
                    </strong>
                  </span>
                  {character.tempHp > 0 && (
                    <span className="px-2 py-0.5 rounded bg-sky-950 border border-sky-500/50 text-sky-300 text-[11px] font-mono font-bold">
                      +{character.tempHp} Temp
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setHpModalMode('damage');
                      setShowHpModal(true);
                    }}
                    className="px-2.5 py-0.5 rounded-lg bg-gradient-to-b from-red-900/90 to-red-950 hover:from-red-800 border border-red-500/60 text-red-100 font-cinzel font-bold text-[11px] transition cursor-pointer shadow"
                  >
                    - Daño
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHpModalMode('heal');
                      setShowHpModal(true);
                    }}
                    className="px-2.5 py-0.5 rounded-lg bg-gradient-to-b from-emerald-800/90 to-emerald-950 hover:from-emerald-700 border border-emerald-500/60 text-emerald-100 font-cinzel font-bold text-[11px] transition cursor-pointer shadow"
                  >
                    + Curar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHpModalMode('temp');
                      setShowHpModal(true);
                    }}
                    className="px-2.5 py-0.5 rounded-lg bg-gradient-to-b from-sky-900/90 to-sky-950 hover:from-sky-800 border border-sky-500/60 text-sky-100 font-cinzel font-bold text-[11px] transition cursor-pointer shadow"
                  >
                    PG Temp
                  </button>
                </div>
              </div>

              {/* Glowing Green Health Bar with Dados de Golpe overlaid inside right */}
              <div className="relative h-6 rounded-lg bg-[#0b0d12] border border-[#c8a45c]/50 overflow-hidden shadow-inner flex items-center">
                <div
                  className={`h-full transition-all duration-300 ${
                    character.currentHp / Math.max(1, character.maxHp) > 0.45
                      ? 'bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.6)]'
                      : character.currentHp / Math.max(1, character.maxHp) > 0.2
                      ? 'bg-gradient-to-r from-amber-700 via-amber-500 to-amber-400'
                      : 'bg-gradient-to-r from-red-800 via-red-600 to-red-500 animate-pulse'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, (character.currentHp / Math.max(1, character.maxHp)) * 100)
                    )}%`,
                  }}
                />
                <div className="absolute inset-0 px-2.5 flex items-center justify-end pointer-events-none">
                  <span className="text-[10px] font-cinzel font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] bg-black/45 px-2 py-0.5 rounded">
                    Dados de Golpe: {character.hitDiceTotal} ({hitDiceAvailable} disp.)
                  </span>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Tiradas de Muerte + Ajustes & Skin + Descanso Corto/Largo */}
            <div className="lg:col-span-5 bg-[#12141b]/95 border border-[#c8a45c]/45 rounded-xl px-2.5 py-2 flex flex-col justify-between gap-1.5">
              <div className="flex items-center justify-between gap-2">
                {/* Tiradas de Muerte Box */}
                <div className="flex-1 bg-[#171a24] border border-[#c8a45c]/35 rounded-lg px-2.5 py-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-cinzel font-bold text-[10px] uppercase tracking-wider text-[#f3dfb2]">
                      TIRADAS DE MUERTE
                    </span>
                    <button
                      type="button"
                      onClick={() => onTriggerRoll('Salvación de Muerte', 0)}
                      className="text-[10px] font-cinzel font-bold text-[#e2c275] hover:underline cursor-pointer"
                    >
                      d20
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map((idx) => (
                        <button
                          key={`suc-${idx}`}
                          type="button"
                          aria-label={`Éxito de muerte ${idx + 1}`}
                          onClick={() => toggleDeathSave('successes', idx)}
                          className={`w-3 h-3 rounded-full border transition cursor-pointer ${
                            character.deathSaves.successes > idx
                              ? 'bg-emerald-400 border-emerald-200 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                              : 'bg-black/60 border-stone-600'
                          }`}
                        />
                      ))}
                      <span className="text-[#cbb692] ml-0.5">Éxitos</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map((idx) => (
                        <button
                          key={`fail-${idx}`}
                          type="button"
                          aria-label={`Fracaso de muerte ${idx + 1}`}
                          onClick={() => toggleDeathSave('failures', idx)}
                          className={`w-3 h-3 rounded-full border transition cursor-pointer ${
                            character.deathSaves.failures > idx
                              ? 'bg-red-500 border-red-300 shadow-[0_0_6px_rgba(239,68,68,0.8)]'
                              : 'bg-black/60 border-stone-600'
                          }`}
                        />
                      ))}
                      <span className="text-[#cbb692] ml-0.5">Fracasos</span>
                    </div>
                  </div>
                </div>

                {/* Ajustes & Skin Buttons (Right below Velocidad/Comp) */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="w-13 h-11 rounded-lg bg-gradient-to-b from-[#25221d] to-[#171512] hover:from-[#332e26] border border-[#c8a45c]/70 flex flex-col items-center justify-center gap-0.5 text-[#f3dfb2] shadow transition cursor-pointer"
                    title="Abrir Ajustes completos del personaje (Stats base, modificadores extra, raza, clase y nivel)"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#e2c275]" />
                    <span className="font-cinzel font-bold text-[9px]">Ajustes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSkinNotice(true);
                      setTimeout(() => setSkinNotice(false), 2500);
                    }}
                    className="w-13 h-11 rounded-lg bg-gradient-to-b from-[#25221d] to-[#171512] hover:from-[#332e26] border border-[#c8a45c]/70 flex flex-col items-center justify-center gap-0.5 text-[#f3dfb2] shadow transition cursor-pointer relative"
                    title="Aspectos visuales de hoja (Próximamente)"
                  >
                    <Palette className="w-3.5 h-3.5 text-[#e2c275]" />
                    <span className="font-cinzel font-bold text-[9px]">Skin</span>
                    {skinNotice && (
                      <span className="absolute -top-7 right-0 px-2 py-0.5 rounded bg-amber-950 border border-amber-400 text-[9px] text-amber-200 whitespace-nowrap shadow-lg z-20">
                        Próximamente
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Short Rest & Long Rest Buttons */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={handleShortRestHitDie}
                  className="py-1 px-2 rounded-lg bg-gradient-to-r from-[#2c2219] to-[#211a14] hover:from-[#3b2d21] border border-[#c8a45c]/50 text-[#f3dfb2] font-cinzel font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>Descanso Corto</span>
                </button>
                <button
                  type="button"
                  onClick={handleLongRest}
                  className="py-1 px-2 rounded-lg bg-gradient-to-r from-[#1d2233] to-[#161926] hover:from-[#262d45] border border-indigo-400/50 text-indigo-100 font-cinzel font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-indigo-300" />
                  <span>Descanso Largo</span>
                </button>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* ROW 3: 6 ORNATE ABILITY SCORE CARDS (FUE, DES, CON, INT, SAB, CAR)*/}
          {/* --------------------------------------------------------------- */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {(Object.keys(ABILITY_LABELS) as AbilityKey[]).map((key) => {
              const ab = character.abilities[key];
              const effectiveMod = getEffectiveAbilityModifier(ab);
              const saveMod = effectiveMod + (ab.proficientSave ? profBonus : 0);
              const meta = ABILITY_LABELS[key];

              return (
                <div
                  key={key}
                  className="bg-gradient-to-b from-[#1e212d] via-[#161821] to-[#11131a] border-2 border-[#c8a45c]/65 rounded-xl px-2 py-1.5 flex flex-col items-center justify-between shadow-md relative group hover:border-[#f3dfb2] transition"
                >
                  {/* Top Label */}
                  <div className="text-center">
                    <div className="font-cinzel font-black text-xs text-[#f5e4be] tracking-wider leading-none">
                      {meta.abbr}
                    </div>
                    <div className="text-[10px] text-[#b8a68e]">{meta.nameEs}</div>
                  </div>

                  {/* Center Large Modifier Button */}
                  <button
                    type="button"
                    onClick={() => onTriggerRoll(`Prueba de ${meta.nameEs}`, effectiveMod)}
                    className="my-0.5 w-13 h-9 rounded-xl bg-[#0e1016] border border-[#c8a45c]/50 group-hover:border-[#e2c275] flex items-center justify-center font-cinzel font-black text-xl text-white group-hover:text-[#f5e4be] transition shadow-inner cursor-pointer"
                    title={`Tirar prueba de ${meta.nameEs} (1d20 ${formatModifier(effectiveMod)})`}
                  >
                    {formatModifier(effectiveMod)}
                  </button>

                  {/* Base Score & Save Proficiency Row */}
                  <div className="text-[10px] font-mono text-[#cbb692] mb-0.5">
                    Puntos: <strong className="text-[#f3dfb2]">{ab.score}</strong>
                    {ab.customModifier ? (
                      <span className="text-amber-300 ml-1">
                        ({ab.customModifier > 0 ? `+${ab.customModifier}` : ab.customModifier})
                      </span>
                    ) : null}
                  </div>

                  {/* Bottom Control Bar: [-] [Save Dot & Roll] [+] */}
                  <div className="w-full flex items-center justify-between pt-1 border-t border-[#c8a45c]/25">
                    <button
                      type="button"
                      aria-label={`Restar 1 a ${meta.nameEs}`}
                      onClick={() => updateAbilityBaseScore(key, ab.score - 1)}
                      className="w-4 h-4 rounded bg-[#232634] hover:bg-[#32364a] border border-[#c8a45c]/40 text-[#f3dfb2] text-[10px] font-bold flex items-center justify-center cursor-pointer"
                      title="Disminuir puntos base (-1)"
                    >
                      -
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Competencia en salvación de ${meta.nameEs}`}
                        onClick={() => toggleSaveProficiency(key)}
                        className={`w-2.5 h-2.5 rounded-full border cursor-pointer ${
                          ab.proficientSave
                            ? 'bg-[#e2c275] border-[#fff1cc] shadow-[0_0_6px_rgba(226,194,117,0.8)]'
                            : 'bg-black/50 border-stone-500'
                        }`}
                        title="Competencia en Tirada de Salvación"
                      />
                      <button
                        type="button"
                        onClick={() => onTriggerRoll(`Salvación de ${meta.nameEs}`, saveMod)}
                        className="text-[10px] font-mono text-[#d6c5a7] hover:text-[#e2c275] cursor-pointer"
                        title="Tirar Salvación"
                      >
                        Salv {formatModifier(saveMod)}
                      </button>
                    </div>

                    <button
                      type="button"
                      aria-label={`Sumar 1 a ${meta.nameEs}`}
                      onClick={() => updateAbilityBaseScore(key, ab.score + 1)}
                      className="w-4 h-4 rounded bg-[#232634] hover:bg-[#32364a] border border-[#c8a45c]/40 text-[#f3dfb2] text-[10px] font-bold flex items-center justify-center cursor-pointer"
                      title="Aumentar puntos base (+1)"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* --------------------------------------------------------------- */}
          {/* ROW 4: MAZOS DE JUEGO (LEFT) & EL RINCÓN DEL AVENTURERO (RIGHT) */}
          {/* --------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-0.5">
            {/* LEFT 7 COLS: MAZOS DE JUEGO (Standing Deck Cards + Overlapping Foreground Hand + Scroll Arrows) */}
            <div className="lg:col-span-7 bg-[#12141b]/90 border border-[#c8a45c]/45 rounded-xl p-3 flex flex-col justify-between">
              {(() => {
                const combatCardsCount = Math.max(1, equippedWeaponAttacks.length);
                const currentPlayerDeckCount =
                  activeDeck === 'combat'
                    ? combatCardsCount
                    : activeDeck === 'skills'
                    ? possessedSkills.length
                    : preparedSpells.length;
                const maxScrollIdx = Math.max(0, currentPlayerDeckCount - 3);
                const safeScrollIdx = Math.min(playerDeckScrollIndex, maxScrollIdx);

                return (
                  <div className="flex flex-col justify-between h-full">
                    {/* Section Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="font-cinzel font-black text-sm text-[#f5e4be] tracking-wider uppercase whitespace-nowrap">
                        MAZOS DE JUEGO
                      </h2>
                      <div className="h-px flex-1 bg-gradient-to-r from-[#c8a45c]/60 to-transparent" />
                      {currentPlayerDeckCount > 3 && (
                        <span className="text-[10px] font-mono text-amber-300 bg-[#181b26] px-2 py-0.5 rounded border border-[#c8a45c]/40">
                          Cartas {safeScrollIdx + 1}–{Math.min(currentPlayerDeckCount, safeScrollIdx + 3)} de {currentPlayerDeckCount}
                        </span>
                      )}
                      <span className="text-[10px] font-cinzel text-[#cbb692]">
                        {activeDeck === 'combat'
                          ? 'Combate y Acciones'
                          : activeDeck === 'skills'
                          ? 'Habilidades Equipadas'
                          : 'Conjuros Preparados'}
                      </span>
                    </div>

                    {/* LAYER 1 (BACK): 3 Tall Standing Deck Cards (La mitad inferior queda cubierta por las cartas abiertas) */}
                    <div className="grid grid-cols-3 gap-2.5 px-1">
                      {/* Standing Deck 1: COMBATES Y ACCIONES */}
                      <button
                        type="button"
                        data-testid="player-deck-combat"
                        onClick={() => {
                          setActiveDeck('combat');
                          setPlayerDeckScrollIndex(0);
                        }}
                        className={`relative h-[148px] rounded-2xl p-2.5 border-2 text-center transition-all duration-200 cursor-pointer overflow-hidden flex flex-col items-center justify-start ${
                          activeDeck === 'combat'
                            ? 'bg-gradient-to-b from-[#3b2714] via-[#24180c] to-[#171008] border-[#f3dfb2] shadow-[0_0_22px_rgba(226,194,117,0.35)] -translate-y-1 z-10'
                            : 'bg-gradient-to-b from-[#211912] to-[#130f0b] border-[#c8a45c]/40 opacity-80 hover:opacity-100 hover:-translate-y-0.5'
                        }`}
                      >
                        <div className="absolute inset-1.5 rounded-xl border border-amber-400/20 pointer-events-none" />
                        <div className="flex items-center gap-1.5 z-10 mt-0.5">
                          <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
                            <Sword className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-left">
                            <div className="font-cinzel font-black text-[10px] sm:text-[11px] text-[#f5e4be] leading-none uppercase">
                              COMBATES Y ACCIONES
                            </div>
                            <div className="text-[9px] text-amber-300/90 font-mono mt-0.5">
                              {combatCardsCount} Cartas
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 opacity-20 pointer-events-none">
                          <Sword className="w-12 h-12 text-amber-300" />
                        </div>
                      </button>

                      {/* Standing Deck 2: HABILIDADES */}
                      <button
                        type="button"
                        data-testid="player-deck-skills"
                        onClick={() => {
                          setActiveDeck('skills');
                          setPlayerDeckScrollIndex(0);
                        }}
                        className={`relative h-[148px] rounded-2xl p-2.5 border-2 text-center transition-all duration-200 cursor-pointer overflow-hidden flex flex-col items-center justify-start ${
                          activeDeck === 'skills'
                            ? 'bg-gradient-to-b from-[#132c3d] via-[#0e1f2b] to-[#09131c] border-cyan-300 shadow-[0_0_22px_rgba(34,211,238,0.3)] -translate-y-1 z-10'
                            : 'bg-gradient-to-b from-[#111d26] to-[#0b1218] border-cyan-500/35 opacity-80 hover:opacity-100 hover:-translate-y-0.5'
                        }`}
                      >
                        <div className="absolute inset-1.5 rounded-xl border border-cyan-400/20 pointer-events-none" />
                        <div className="flex items-center gap-1.5 z-10 mt-0.5">
                          <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-inner shrink-0">
                            <BookOpen className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-left">
                            <div className="font-cinzel font-black text-[10px] sm:text-[11px] text-cyan-100 leading-none uppercase">
                              HABILIDADES
                            </div>
                            <div className="text-[9px] text-cyan-300 font-mono mt-0.5">
                              {possessedSkills.length} Cartas
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 opacity-20 pointer-events-none">
                          <BookOpen className="w-12 h-12 text-cyan-300" />
                        </div>
                      </button>

                      {/* Standing Deck 3: LANZAR CONJUROS */}
                      <button
                        type="button"
                        data-testid="player-deck-spells"
                        onClick={() => {
                          setActiveDeck('spells');
                          setPlayerDeckScrollIndex(0);
                        }}
                        className={`relative h-[148px] rounded-2xl p-2.5 border-2 text-center transition-all duration-200 cursor-pointer overflow-hidden flex flex-col items-center justify-start ${
                          activeDeck === 'spells'
                            ? 'bg-gradient-to-b from-[#2d1742] via-[#1e102e] to-[#12091c] border-purple-300 shadow-[0_0_22px_rgba(192,132,252,0.32)] -translate-y-1 z-10'
                            : 'bg-gradient-to-b from-[#1d1229] to-[#110b18] border-purple-500/35 opacity-80 hover:opacity-100 hover:-translate-y-0.5'
                        }`}
                      >
                        <div className="absolute inset-1.5 rounded-xl border border-purple-400/20 pointer-events-none" />
                        <div className="flex items-center gap-1.5 z-10 mt-0.5">
                          <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-400/60 flex items-center justify-center text-purple-300 shadow-inner shrink-0">
                            <Flame className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-left">
                            <div className="font-cinzel font-black text-[10px] sm:text-[11px] text-purple-100 leading-none uppercase">
                              LANZAR CONJUROS
                            </div>
                            <div className="text-[9px] text-purple-300 font-mono mt-0.5">
                              {preparedSpells.length} Preparados
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 opacity-20 pointer-events-none">
                          <Flame className="w-12 h-12 text-purple-300" />
                        </div>
                      </button>
                    </div>

                    {/* LAYER 2 (FOREGROUND OVERLAPPING LOWER HALF): Playable RPG Cards + Scroll Arrows + Compact Empty-Card Add Slot */}
                    <div className="relative -mt-20 z-20 rounded-2xl bg-[#0f1119]/95 backdrop-blur-md border-2 border-[#c8a45c]/75 p-2 shadow-[0_-10px_25px_rgba(0,0,0,0.95)] flex items-center gap-1.5">
                      {/* Left Scroll Arrow (when > 3 cards) */}
                      {currentPlayerDeckCount > 3 && (
                        <button
                          type="button"
                          data-testid="btn-player-deck-prev"
                          disabled={safeScrollIdx === 0}
                          onClick={() => setPlayerDeckScrollIndex(Math.max(0, safeScrollIdx - 1))}
                          className="w-6 h-28 rounded-xl bg-[#191c29] hover:bg-amber-950/80 disabled:opacity-30 border border-[#c8a45c]/60 text-[#f5e4be] flex items-center justify-center shrink-0 transition cursor-pointer disabled:cursor-default shadow"
                          title="Ver cartas anteriores"
                        >
                          <ChevronLeft className="w-4 h-4 text-amber-300" />
                        </button>
                      )}

                      {/* 3 Visible Open Cards Grid */}
                      <div className="flex-1 grid grid-cols-3 gap-2 min-h-[144px]">
                        {/* DECK 1 CARDS: COMBATES Y ACCIONES */}
                        {activeDeck === 'combat' && (
                          <>
                            {equippedWeaponAttacks
                              .slice(safeScrollIdx, safeScrollIdx + 3)
                              .map((watk) => (
                                <div
                                  key={watk.id}
                                  data-testid={`player-card-${watk.id}`}
                                  onClick={() =>
                                    onTriggerRoll(
                                      `${watk.weaponName}: ${watk.attackName} (${watk.damageFormula} ${watk.damageType})`,
                                      watk.toHitBonus,
                                      20
                                    )
                                  }
                                  className="group relative rounded-xl border-2 border-[#c8a45c]/80 hover:border-[#fff0c2] bg-gradient-to-b from-[#2b1f14] via-[#1c150e] to-[#120d09] p-2.5 flex flex-col justify-between min-h-[140px] shadow-xl hover:-translate-y-0.5 transition cursor-pointer"
                                >
                                  <div className="flex items-center justify-between text-[10px] text-[#e2c275] font-cinzel font-bold border-b border-[#c8a45c]/30 pb-1">
                                    <span className="truncate">{watk.weaponName}</span>
                                    <Sword className="w-3 h-3 shrink-0 text-amber-400" />
                                  </div>

                                  <div className="my-1 text-center">
                                    <div className="font-cinzel font-black text-xs text-white leading-tight line-clamp-2">
                                      {watk.attackName}
                                    </div>
                                    <div className="mt-1.5 inline-block px-2 py-0.5 rounded bg-black/60 border border-amber-500/40 font-mono font-bold text-xs text-amber-300">
                                      {watk.damageFormula}
                                    </div>
                                    <div className="text-[10px] text-[#cbb692] mt-0.5">
                                      {watk.damageType}
                                    </div>
                                  </div>

                                  <div className="pt-1 border-t border-[#c8a45c]/30 flex items-center justify-between text-[10px] font-mono text-[#f3dfb2]">
                                    <span>Impacto: {formatModifier(watk.toHitBonus)}</span>
                                    <span className="text-amber-400 font-bold">Tirar</span>
                                  </div>
                                </div>
                              ))}

                            {equippedWeaponAttacks.length === 0 && (
                              <div
                                onClick={() =>
                                  onTriggerRoll(
                                    'Golpe Desarmado',
                                    getEffectiveAbilityModifier(character.abilities.str) + profBonus,
                                    20
                                  )
                                }
                                className="group relative rounded-xl border-2 border-[#c8a45c]/60 hover:border-[#e2c275] bg-gradient-to-b from-[#221c17] to-[#13100d] p-2.5 flex flex-col justify-between min-h-[140px] shadow hover:-translate-y-0.5 transition cursor-pointer"
                              >
                                <div className="flex items-center justify-between text-[10px] text-[#cbb692] font-cinzel font-bold border-b border-white/10 pb-1">
                                  <span>BÁSICO</span>
                                  <Sword className="w-3 h-3 text-[#e2c275]" />
                                </div>
                                <div className="my-1.5 text-center">
                                  <div className="font-cinzel font-black text-xs text-[#f5e4be]">
                                    Golpe Desarmado
                                  </div>
                                  <div className="mt-1 inline-block px-2 py-0.5 rounded bg-black/50 text-xs font-mono text-amber-300">
                                    1 + {getEffectiveAbilityModifier(character.abilities.str)}
                                  </div>
                                  <div className="text-[10px] text-stone-400 mt-0.5">Contundente</div>
                                </div>
                                <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-[#cbb692]">
                                  <span>
                                    Impacto:{' '}
                                    {formatModifier(
                                      getEffectiveAbilityModifier(character.abilities.str) + profBonus
                                    )}
                                  </span>
                                  <span className="text-amber-300">Tirar</span>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* DECK 2 CARDS: HABILIDADES */}
                        {activeDeck === 'skills' &&
                          possessedSkills
                            .slice(safeScrollIdx, safeScrollIdx + 3)
                            .map((sk) => {
                              const abMod = getEffectiveAbilityModifier(character.abilities[sk.ability]);
                              const totalBonus =
                                abMod +
                                (sk.proficiency === 'expertise'
                                  ? profBonus * 2
                                  : sk.proficiency === 'proficient'
                                  ? profBonus
                                  : 0);
                              return (
                                <div
                                  key={sk.id}
                                  data-testid={`player-card-${sk.id}`}
                                  onClick={() => onTriggerRoll(`Habilidad: ${sk.name}`, totalBonus, 20)}
                                  className="group relative rounded-xl border-2 border-cyan-400/75 hover:border-cyan-200 bg-gradient-to-b from-[#132838] via-[#0e1c28] to-[#09121a] p-2.5 flex flex-col justify-between min-h-[140px] shadow-xl hover:-translate-y-0.5 transition cursor-pointer"
                                >
                                  <div className="flex items-center justify-between text-[10px] text-cyan-300 font-cinzel font-bold border-b border-cyan-500/30 pb-1">
                                    <span>{ABILITY_LABELS[sk.ability].abbr}</span>
                                    {!isLocked && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveSkillCard(sk.id, sk.srdKey);
                                        }}
                                        className="text-red-400 hover:text-red-200"
                                        title="Quitar habilidad del mazo"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>

                                  <div className="my-1 text-center">
                                    <div className="font-cinzel font-black text-xs text-white leading-tight">
                                      {sk.name}
                                    </div>
                                    <div className="mt-1 inline-block px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-400/50 font-mono font-black text-xs text-cyan-200">
                                      {formatModifier(totalBonus)}
                                    </div>
                                    <p className="text-[10px] text-cyan-100/75 line-clamp-2 mt-1">
                                      {sk.description}
                                    </p>
                                  </div>

                                  <div className="pt-1 border-t border-cyan-500/30 flex items-center justify-between text-[10px] font-mono text-cyan-200">
                                    <span>
                                      {sk.proficiency === 'expertise' ? 'Pericia' : 'Competente'}
                                    </span>
                                    <span className="font-bold">d20</span>
                                  </div>
                                </div>
                              );
                            })}

                        {/* DECK 3 CARDS: LANZAR CONJUROS (PREPARED SPELLS) */}
                        {activeDeck === 'spells' && (
                          <>
                            {preparedSpells.slice(safeScrollIdx, safeScrollIdx + 3).map((sp) => (
                              <div
                                key={sp.id}
                                data-testid={`player-card-${sp.id}`}
                                onClick={() =>
                                  onTriggerRoll(
                                    `Conjuro: ${sp.name} ${sp.damageOrHeal ? `(${sp.damageOrHeal})` : ''}`,
                                    spellAttackBonus,
                                    20
                                  )
                                }
                                className="group relative rounded-xl border-2 border-purple-400/75 hover:border-purple-200 bg-gradient-to-b from-[#28153d] via-[#1b0e29] to-[#11091a] p-2.5 flex flex-col justify-between min-h-[140px] shadow-xl hover:-translate-y-0.5 transition cursor-pointer"
                              >
                                <div className="flex items-center justify-between text-[10px] text-purple-300 font-cinzel font-bold border-b border-purple-500/30 pb-1">
                                  <span>{sp.level === 0 ? 'TRUCO' : `NIVEL ${sp.level}`}</span>
                                  <Flame className="w-3 h-3 text-purple-300" />
                                </div>

                                <div className="my-1 text-center">
                                  <div className="font-cinzel font-black text-xs text-white leading-tight line-clamp-2">
                                    {sp.name}
                                  </div>
                                  {sp.damageOrHeal && (
                                    <div className="mt-1 inline-block px-2 py-0.5 rounded bg-black/60 border border-purple-400/40 font-mono font-bold text-xs text-amber-300">
                                      {sp.damageOrHeal}
                                    </div>
                                  )}
                                  <p className="text-[10px] text-purple-200/80 line-clamp-2 mt-1">
                                    {sp.description}
                                  </p>
                                </div>

                                <div className="pt-1 border-t border-purple-500/30 flex items-center justify-between text-[10px] font-mono text-purple-200">
                                  <span className="truncate">{sp.range || '60 ft'}</span>
                                  <span className="text-amber-300 font-bold">Lanzar</span>
                                </div>
                              </div>
                            ))}

                            {preparedSpells.length === 0 && (
                              <div className="col-span-3 rounded-xl border border-dashed border-purple-400/40 bg-[#151221]/70 flex flex-col items-center justify-center p-3 text-center">
                                <span className="font-cinzel font-bold text-xs text-purple-100">
                                  No tienes conjuros preparados
                                </span>
                                <span className="text-[10px] text-purple-300/80 mt-0.5">
                                  Usa el botón "+" a la derecha para preparar conjuros en tu grimorio
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Right Scroll Arrow (when > 3 cards) */}
                      {currentPlayerDeckCount > 3 && (
                        <button
                          type="button"
                          data-testid="btn-player-deck-next"
                          disabled={safeScrollIdx >= maxScrollIdx}
                          onClick={() => setPlayerDeckScrollIndex(Math.min(maxScrollIdx, safeScrollIdx + 1))}
                          className="w-6 h-28 rounded-xl bg-[#191c29] hover:bg-amber-950/80 disabled:opacity-30 border border-[#c8a45c]/60 text-[#f5e4be] flex items-center justify-center shrink-0 transition cursor-pointer disabled:cursor-default shadow"
                          title="Ver siguientes cartas"
                        >
                          <ChevronRight className="w-4 h-4 text-amber-300" />
                        </button>
                      )}

                      {/* Compact Empty-Card Slot ("+ Nueva") on the Right Edge */}
                      <button
                        type="button"
                        data-testid="btn-player-deck-add"
                        onClick={() => {
                          if (activeDeck === 'combat') setShowAddCombatCardModal(true);
                          else if (activeDeck === 'skills') setShowAddSkillCardModal(true);
                          else setIsBackpackModalOpen(true);
                        }}
                        className="w-14 sm:w-16 min-h-[140px] rounded-xl border-2 border-dashed border-[#c8a45c]/55 hover:border-[#f5e4be] bg-[#161925]/80 hover:bg-[#1e2233] p-1.5 flex flex-col items-center justify-center gap-1.5 shrink-0 text-[#e8d8b9] hover:text-white transition cursor-pointer group"
                        title="Agregar nueva carta a este mazo"
                      >
                        <div className="w-7 h-7 rounded-full border border-[#c8a45c]/70 bg-amber-950/40 group-hover:scale-110 flex items-center justify-center transition">
                          <Plus className="w-3.5 h-3.5 text-[#e2c275]" />
                        </div>
                        <span className="font-cinzel font-bold text-[9px] uppercase tracking-wider text-center leading-tight">
                          Nueva
                          <br />
                          Carta
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* RIGHT 5 COLS: EL RINCÓN DEL AVENTURERO */}
            <div className="lg:col-span-5 bg-[#12141b]/90 border border-[#c8a45c]/45 rounded-xl p-3 flex flex-col justify-between space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="font-cinzel font-black text-sm text-[#f5e4be] tracking-wider uppercase whitespace-nowrap">
                  EL RINCÓN DEL AVENTURERO
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-[#c8a45c]/60 to-transparent" />
              </div>

              <div className="space-y-2 flex-1 flex flex-col justify-between">
                {/* 1. DIARIO DE [NOMBRE DEL PERSONAJE] */}
                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(true)}
                  className="w-full text-left rounded-xl border-2 border-[#c8a45c]/70 hover:border-[#f5e4be] bg-gradient-to-r from-[#281e15] via-[#1d1610] to-[#14100c] p-2.5 flex items-center gap-3 shadow-md hover:shadow-xl transition cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-[#5e3a1e] to-[#2e1b0d] border-2 border-[#e2c275] flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition">
                    <BookOpen className="w-6 h-6 text-[#f5e4be]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-cinzel font-black text-xs sm:text-sm text-[#f5e4be] group-hover:text-amber-300 truncate uppercase">
                        DIARIO DE {character.name}
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/50 border border-[#c8a45c]/40 text-[#e2c275] shrink-0">
                        {journalIndex.totalSheets} Hojas
                      </span>
                    </div>
                    <p className="text-[11px] text-[#cbb692] line-clamp-1 mt-0.5">
                      {character.notes
                        ? `Apunte: "${character.notes}"`
                        : 'Cuaderno de crónicas, apunte rápido e índice de hojas de sesión.'}
                    </p>
                  </div>
                </button>

                {/* 2. EQUIPO E INVENTARIO (MOCHILA + DINERO) */}
                <button
                  type="button"
                  onClick={() => setIsBackpackModalOpen(true)}
                  className="w-full text-left rounded-xl border-2 border-[#c8a45c]/70 hover:border-[#f5e4be] bg-gradient-to-r from-[#261c14] via-[#1c150f] to-[#14100c] p-2.5 flex items-center gap-3 shadow-md hover:shadow-xl transition cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-[#694322] to-[#331f0e] border-2 border-[#e2c275] flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition">
                    <Backpack className="w-6 h-6 text-[#f5e4be]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-cinzel font-black text-xs sm:text-sm text-[#f5e4be] group-hover:text-amber-300 uppercase">
                        EQUIPO E INVENTARIO
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/50 border border-[#c8a45c]/40 text-[#e2c275] shrink-0">
                        {totalWeight.toFixed(0)}/{carryCap.maxCarry} lb
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-amber-300 font-mono">
                      <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>
                        {currency.gp} PO • {currency.sp} PP • {currency.cp} PC
                      </span>
                      <span className="text-[#a89270] text-[10px] truncate">
                        • {(character.inventory || []).length} objetos
                      </span>
                    </div>
                  </div>
                </button>

                {/* 3. RASGOS Y TRASFONDO (PERGAMINO 5E) */}
                <button
                  type="button"
                  onClick={() => setIsParchmentModalOpen(true)}
                  className="w-full text-left rounded-xl border-2 border-[#c8a45c]/70 hover:border-[#f5e4be] bg-gradient-to-r from-[#292015] via-[#1e1710] to-[#14100c] p-2.5 flex items-center gap-3 shadow-md hover:shadow-xl transition cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-[#735129] to-[#382611] border-2 border-[#e2c275] flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition">
                    <Scroll className="w-6 h-6 text-[#f5e4be]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-cinzel font-black text-xs sm:text-sm text-[#f5e4be] group-hover:text-amber-300 uppercase">
                        RASGOS Y TRASFONDO
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/50 border border-[#c8a45c]/40 text-[#e2c275] shrink-0">
                        {(character.featuresAndTraits || []).length} Dotes
                      </span>
                    </div>
                    <p className="text-[11px] text-[#cbb692] truncate mt-0.5">
                      Pergamino 5E: {character.background} • Personalidad, Ideales, Vínculos e Historial
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT SIDEBAR IN TABLE MODE (SALA EN VIVO + CARTA DE JUGADOR)     */}
        {/* ================================================================= */}
        {isInActiveRoom && (
          <div className="xl:col-span-3 space-y-3">
            {/* 1. SALA EN VIVO (Aliados 4x2 max 8 & Enemigos 4x2 max 8) */}
            <div className="bg-gradient-to-b from-[#1a1c24] to-[#12141b] border-2 border-[#c8a45c]/65 rounded-2xl p-3.5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-[#c8a45c]/30 pb-2">
                <h3 className="font-cinzel font-black text-sm text-[#f5e4be] tracking-wider uppercase">
                  SALA EN VIVO
                </h3>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {roomCode}
                </span>
              </div>

              {/* Aliados (Max 8, 4x2 grid) */}
              <div>
                <div className="flex items-center justify-between text-xs font-cinzel font-bold text-[#cbb692] mb-1.5">
                  <span>Aliados</span>
                  <span className="text-[10px] font-mono text-[#e2c275]">
                    {tableAllies.length}/8
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {tableAllies.map((ally) => {
                    const pct = Math.min(
                      100,
                      Math.max(0, (ally.hp / Math.max(1, ally.maxHp)) * 100)
                    );
                    return (
                      <div
                        key={ally.id}
                        className="bg-[#11131a] border border-[#c8a45c]/50 rounded-lg p-1 flex flex-col items-center text-center"
                        title={`${ally.name}: ${ally.hp}/${ally.maxHp} PG`}
                      >
                        <EntityAvatar
                          avatarType={ally.avatarType}
                          customUrl={ally.avatarCustomUrl}
                          iconId={ally.avatarIcon || 'anonymous'}
                          size="sm"
                          className="rounded-md"
                        />
                        <span className="text-[9px] font-cinzel font-bold text-[#f3dfb2] truncate w-full mt-1">
                          {ally.name}
                        </span>
                        <div className="w-full h-2.5 bg-black/80 rounded-full overflow-hidden border border-emerald-500/40 mt-0.5 relative">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${pct}%` }}
                          />
                          <span className="absolute inset-0 text-[8px] font-mono font-bold text-white flex items-center justify-center leading-none">
                            {ally.hp}/{ally.maxHp}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Enemigos (Max 8, 4x2 grid) */}
              <div>
                <div className="flex items-center justify-between text-xs font-cinzel font-bold text-[#cbb692] mb-1.5">
                  <span>Enemigos</span>
                  <span className="text-[10px] font-mono text-red-400">
                    {tableEnemies.length}/8
                  </span>
                </div>
                {tableEnemies.length === 0 ? (
                  <div className="bg-[#11131a]/80 border border-stone-800 rounded-xl p-2.5 text-center text-[11px] text-stone-400 font-cinzel">
                    Sin enemigos visibles en la mesa
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {tableEnemies.map((enemy) => {
                      const pct = Math.min(
                        100,
                        Math.max(0, (enemy.hp / Math.max(1, enemy.maxHp)) * 100)
                      );
                      return (
                        <div
                          key={enemy.id}
                          className="bg-[#1a1113] border border-red-500/50 rounded-lg p-1 flex flex-col items-center text-center"
                          title={`${enemy.name}: ${enemy.hp}/${enemy.maxHp} PG`}
                        >
                          <EntityAvatar iconId="skull" size="sm" className="rounded-md" />
                          <span className="text-[9px] font-cinzel font-bold text-red-200 truncate w-full mt-1">
                            {enemy.name}
                          </span>
                          <div className="w-full h-2.5 bg-black/80 rounded-full overflow-hidden border border-red-500/40 mt-0.5 relative">
                            <div className="h-full bg-red-600" style={{ width: `${pct}%` }} />
                            <span className="absolute inset-0 text-[8px] font-mono font-bold text-white flex items-center justify-center leading-none">
                              {enemy.hp}/{enemy.maxHp}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 2. CARTA DE JUGADOR (Ornate Gold-Bordered Summary Card with Money Bag) */}
            <div className="bg-gradient-to-b from-[#231d15] via-[#181410] to-[#120f0c] border-2 border-[#e2c275] rounded-2xl p-3.5 shadow-xl space-y-3">
              <div className="flex items-center gap-3">
                <EntityAvatar
                  avatarType={character.avatarType || (character.avatarUrl ? 'custom' : 'icon')}
                  customUrl={character.avatarCustomUrl || character.avatarUrl}
                  iconId={character.avatarIcon || 'anonymous'}
                  size="md"
                  className="rounded-full border border-[#e2c275]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-cinzel font-black text-base text-[#f5e4be] truncate">
                      {character.name}
                    </h4>
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      En Línea
                    </span>
                  </div>
                  <div className="text-[11px] text-[#cbb692] truncate">
                    Niv {character.level} {character.race} {character.characterClass}
                  </div>
                </div>
              </div>

              {/* CA, PP & Mini HP Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-cinzel font-bold">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-black/50 border border-[#c8a45c]/40 text-[#e2c275]">
                      CA {character.armorClass}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-black/50 border border-[#c8a45c]/40 text-[#cbb692]">
                      PP {passivePerception}
                    </span>
                  </div>
                  <span className="font-mono text-emerald-300">
                    PG {character.currentHp}/{character.maxHp}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-black/70 border border-emerald-500/40 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, (character.currentHp / Math.max(1, character.maxHp)) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* 3x2 Mini Ability Modifiers Grid */}
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(ABILITY_LABELS) as AbilityKey[]).map((k) => {
                  const mod = getEffectiveAbilityModifier(character.abilities[k]);
                  return (
                    <div
                      key={`mini-${k}`}
                      className="bg-black/45 border border-[#c8a45c]/30 rounded-lg py-1 px-2 flex items-center justify-between text-[11px]"
                    >
                      <span className="font-cinzel font-bold text-[#cbb692]">
                        {ABILITY_LABELS[k].abbr}
                      </span>
                      <span className="font-mono font-bold text-white">{formatModifier(mod)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Bolsa de Monedas Footer inside Player Card */}
              <button
                type="button"
                onClick={() => setIsBackpackModalOpen(true)}
                className="w-full bg-[#14100c] hover:bg-[#1f1812] border border-[#c8a45c]/50 rounded-xl px-3 py-2 flex items-center justify-between text-xs transition cursor-pointer"
                title="Haz clic para abrir tu Bolsa de Monedas en la Mochila"
              >
                <span className="flex items-center gap-1.5 font-cinzel font-bold text-[#e2c275]">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>Bolsa:</span>
                </span>
                <div className="flex items-center gap-2 font-mono font-bold text-[11px]">
                  <span className="text-amber-300">{currency.gp} PO</span>
                  <span className="text-slate-300">{currency.sp} PP</span>
                  <span className="text-orange-300">{currency.cp} PC</span>
                  <span className="text-indigo-200">{currency.pp} PL</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* TABLE MODE BOTTOM BAR: LOBBY/CLOUD + DUNGEON MASTER BANNER + MAPA   */}
      {/* =================================================================== */}
      {isInActiveRoom && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch pt-1">
          {/* Left 3 Cols: Stacked REGRESAR AL LOBBY & GUARDAR EN LA NUBE */}
          <div className="lg:col-span-3 flex flex-col justify-between gap-2">
            {onReturnToLobby && (
              <button
                type="button"
                onClick={onReturnToLobby}
                className="flex-1 py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#23201c] to-[#191714] hover:from-[#302b25] border border-[#c8a45c]/60 text-[#f5e4be] font-cinzel font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#e2c275]" />
                <span>REGRESAR AL LOBBY</span>
              </button>
            )}
            {onSaveToCloud && (
              <button
                type="button"
                onClick={onSaveToCloud}
                className="flex-1 py-2 px-3.5 rounded-xl bg-gradient-to-r from-emerald-900/90 to-emerald-950 hover:from-emerald-800 border border-emerald-500/60 text-emerald-100 font-cinzel font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-300" />
                <span>GUARDAR EN LA NUBE</span>
              </button>
            )}
          </div>

          {/* Center 7 Cols: DUNGEON MASTER Live Banner */}
          <div className="lg:col-span-7 bg-gradient-to-r from-[#1c1528] via-[#15121f] to-[#1c1528] border-2 border-[#c8a45c]/70 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-purple-950/90 border-2 border-[#e2c275] flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
                <Crown className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-cinzel font-black text-sm sm:text-base text-[#f5e4be] uppercase tracking-wider">
                    DUNGEON MASTER
                  </span>
                  <span
                    className={`text-[11px] font-bold flex items-center gap-1 ${
                      dmConnected ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        dmConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    {dmConnected ? 'En Línea' : 'Conectado a Sala'} • Mesa: {roomCode}
                  </span>
                </div>
                <p className="text-xs text-purple-200/90 truncate mt-0.5">
                  {dmLiveMessage || 'El Dungeon Master observa la mesa en silencio...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onOpenRollFeed && (
                <button
                  type="button"
                  onClick={onOpenRollFeed}
                  className="px-3 py-1.5 rounded-xl bg-black/50 hover:bg-black/70 border border-purple-400/40 text-purple-200 font-cinzel font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  title="Ver historial de tiradas de la sala"
                >
                  <Dices className="w-4 h-4 text-amber-400" />
                  <span>Tiradas ({rollFeed.length})</span>
                </button>
              )}
              {onSendPlayerMessageToDM && (
                <button
                  type="button"
                  onClick={() => setIsDmMsgModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-800/80 hover:bg-purple-700 border border-purple-400/60 text-white font-cinzel font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  title="Enviar mensaje o susurro privado al Dungeon Master"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Susurrar al DM</span>
                </button>
              )}
            </div>
          </div>

          {/* Right 2 Cols: COMPACT MAPA BUTTON (Sized cleanly so it never collides with Rasgos y Trasfondo) */}
          <div className="lg:col-span-2 flex items-stretch">
            <button
              type="button"
              onClick={() => setIsMapModalOpen(true)}
              className="w-full h-full min-h-[64px] rounded-2xl border-2 border-[#e2c275] bg-gradient-to-b from-[#2e2216] via-[#21180f] to-[#140e09] hover:from-[#3d2d1d] px-3 py-2 flex items-center justify-center gap-2.5 shadow-xl transition cursor-pointer group"
              title="Abrir Mapa de la Mesa"
            >
              <div className="w-10 h-10 rounded-xl bg-[#3d2b18] border border-[#e2c275] flex items-center justify-center text-[#f5e4be] group-hover:scale-105 transition shrink-0">
                <Compass className="w-5 h-5 text-amber-300" />
              </div>
              <div className="text-left">
                <span className="font-cinzel font-black text-sm text-[#f5e4be] tracking-wider uppercase block leading-none">
                  MAPA
                </span>
                <span className="text-[10px] text-[#cbb692] block mt-0.5">Ver Región</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* INTERACTIVE MODALS                                                  */}
      {/* =================================================================== */}

      {/* 1. Ajustes de Personaje Modal (Base Stats, Custom Modifiers, Race, Class, Level) */}
      <CharacterSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        character={character}
        onSaveCharacter={onUpdateCharacter}
      />

      {/* 2. Diario de [Nombre] Notebook Modal */}
      <CharacterJournalBookModal
        isOpen={isJournalModalOpen}
        onClose={() => setIsJournalModalOpen(false)}
        character={character}
        onUpdateCharacter={onUpdateCharacter}
        isLocked={isLocked}
        onUnlockRequest={onUnlockRequest}
      />

      {/* 3. Mochila Abierta Modal (Armas, Armaduras, Objetos, Dinero y Grimorio Completo) */}
      <CharacterBackpackModal
        isOpen={isBackpackModalOpen}
        onClose={() => setIsBackpackModalOpen(false)}
        character={character}
        onUpdateCharacter={onUpdateCharacter}
        isLocked={isLocked}
        onUnlockRequest={onUnlockRequest}
      />

      {/* 4. Pergamino 5E Modal (Rasgos, Dotes y Trasfondo) */}
      <CharacterParchmentModal
        isOpen={isParchmentModalOpen}
        onClose={() => setIsParchmentModalOpen(false)}
        character={character}
        onUpdateCharacter={onUpdateCharacter}
        isLocked={isLocked}
        onUnlockRequest={onUnlockRequest}
      />

      {/* 5. Avatar Customizer Modal */}
      {isAvatarModalOpen && (
        <AvatarCustomizerModal
          isOpen={isAvatarModalOpen}
          onClose={() => setIsAvatarModalOpen(false)}
          title={`Retrato de ${character.name}`}
          currentAvatarType={character.avatarType || (character.avatarUrl ? 'custom' : 'icon')}
          currentCustomUrl={character.avatarCustomUrl || character.avatarUrl || ''}
          currentIconId={character.avatarIcon || 'anonymous'}
          onSave={(newType, newUrl, newIcon) => {
            onUpdateCharacter({
              ...character,
              avatarType: newType,
              avatarCustomUrl: newUrl,
              avatarIcon: newIcon,
              avatarUrl: newType === 'custom' ? newUrl : undefined,
            });
            setIsAvatarModalOpen(false);
          }}
        />
      )}

      {/* 6. HP Damage / Heal / Temp Modal */}
      {showHpModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-[#171922] border-2 border-[#c8a45c] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h3 className="font-cinzel font-bold text-base text-[#f5e4be]">
                {hpModalMode === 'damage'
                  ? 'Aplicar Daño'
                  : hpModalMode === 'heal'
                  ? 'Aplicar Curación'
                  : 'Definir PG Temporales'}
              </h3>
              <button
                type="button"
                onClick={() => setShowHpModal(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs text-stone-300 mb-1 font-cinzel">Cantidad de PG</label>
              <input
                type="number"
                min={1}
                value={hpChangeAmount}
                onChange={(e) => setHpChangeAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full bg-[#101218] border border-[#c8a45c]/60 rounded-xl py-2 px-3 text-center font-mono font-bold text-lg text-white"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowHpModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-cinzel"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyHpChange}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-cinzel font-black text-xs"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Add Combat Action Card Modal */}
      {showAddCombatCardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleAddCombatCard}
            className="w-full max-w-md bg-[#171922] border-2 border-[#c8a45c] rounded-2xl p-5 space-y-3.5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h3 className="font-cinzel font-bold text-base text-[#f5e4be]">
                Nueva Carta de Combate o Acción
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCombatCardModal(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-cinzel text-[#cbb692] mb-1">
                Nombre de la Acción o Ataque *
              </label>
              <input
                type="text"
                required
                value={combatCardForm.name}
                onChange={(e) => setCombatCardForm({ ...combatCardForm, name: e.target.value })}
                placeholder="Ej. Espadazo Divino / Aliento de Dragón"
                className="w-full bg-[#101218] border border-stone-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-cinzel text-[#cbb692] mb-1">
                  Bono Impacto
                </label>
                <input
                  type="number"
                  value={combatCardForm.attackBonus}
                  onChange={(e) =>
                    setCombatCardForm({
                      ...combatCardForm,
                      attackBonus: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full bg-[#101218] border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-cinzel text-[#cbb692] mb-1">
                  Dados de Daño
                </label>
                <input
                  type="text"
                  value={combatCardForm.damageDice}
                  onChange={(e) =>
                    setCombatCardForm({ ...combatCardForm, damageDice: e.target.value })
                  }
                  placeholder="1d8+3"
                  className="w-full bg-[#101218] border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-cinzel text-[#cbb692] mb-1">
                  Tipo Daño
                </label>
                <input
                  type="text"
                  value={combatCardForm.damageType}
                  onChange={(e) =>
                    setCombatCardForm({ ...combatCardForm, damageType: e.target.value })
                  }
                  placeholder="Cortante"
                  className="w-full bg-[#101218] border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCombatCardModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-cinzel"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-cinzel font-black text-xs"
              >
                Añadir Carta al Mazo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 8. Add Skill Card Modal */}
      {showAddSkillCardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleAddSkillCard}
            className="w-full max-w-md bg-[#171922] border-2 border-cyan-400 rounded-2xl p-5 space-y-3.5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <h3 className="font-cinzel font-bold text-base text-cyan-200">
                Desbloquear / Equipar Carta de Habilidad
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSkillCardModal(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-cinzel text-cyan-200 mb-1">
                Seleccionar Habilidad 5E o Personalizada
              </label>
              <select
                value={skillCardForm.srdKey}
                onChange={(e) => {
                  const val = e.target.value as SkillKey | 'custom';
                  if (val === 'custom') {
                    setSkillCardForm({
                      ...skillCardForm,
                      srdKey: 'custom',
                      name: '',
                      description: '',
                    });
                  } else {
                    const meta = SKILL_METADATA[val];
                    setSkillCardForm({
                      srdKey: val,
                      name: meta.nameEs,
                      ability: meta.ability,
                      proficiency: 'proficient',
                      description: DEFAULT_SRD_SKILL_DESCRIPTIONS[val] || meta.description,
                    });
                  }
                }}
                className="w-full bg-[#101218] border border-stone-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                {(Object.keys(SKILL_METADATA) as SkillKey[]).map((k) => (
                  <option key={k} value={k}>
                    {SKILL_METADATA[k].nameEs} ({ABILITY_LABELS[SKILL_METADATA[k].ability].abbr})
                  </option>
                ))}
                <option value="custom">✨ Crear Habilidad Personalizada...</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-cinzel text-stone-300 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={skillCardForm.name}
                  onChange={(e) => setSkillCardForm({ ...skillCardForm, name: e.target.value })}
                  className="w-full bg-[#101218] border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-cinzel text-stone-300 mb-1">
                  Nivel de Dominio
                </label>
                <select
                  value={skillCardForm.proficiency}
                  onChange={(e) =>
                    setSkillCardForm({
                      ...skillCardForm,
                      proficiency: e.target.value as 'proficient' | 'expertise',
                    })
                  }
                  className="w-full bg-[#101218] border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-white"
                >
                  <option value="proficient">Competente (+{profBonus})</option>
                  <option value="expertise">Pericia (+{profBonus * 2})</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddSkillCardModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-cinzel"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-cinzel font-black text-xs"
              >
                Añadir al Mazo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 9. Map Modal in Table Mode */}
      {isMapModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-[#181512] border-2 border-[#e2c275] rounded-2xl p-6 space-y-4 shadow-2xl text-center">
            <div className="flex items-center justify-between border-b border-[#5e4522] pb-3">
              <div className="flex items-center gap-2.5">
                <MapIcon className="w-5 h-5 text-amber-400" />
                <h3 className="font-cinzel font-black text-lg text-[#f5e4be] uppercase">
                  Cartografía de la Mesa ({roomCode})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMapModalOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-10 px-4 rounded-xl bg-[#120e0a] border border-[#5e4522] space-y-2">
              <Compass className="w-12 h-12 text-amber-400 mx-auto animate-pulse" />
              <p className="font-cinzel font-bold text-base text-[#f5e4be]">
                Mapa Táctico de la Sesión Activa
              </p>
              <p className="text-xs text-[#cbb692] max-w-md mx-auto">
                {dmLiveMessage
                  ? `Ubicación / Estado actual del DM: "${dmLiveMessage}"`
                  : 'El Dungeon Master proyectará aquí los mapas y regiones descubiertas por el grupo.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 10. Private Message to DM Modal */}
      {isDmMsgModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSubmitMessageToDM}
            className="w-full max-w-md bg-[#181522] border-2 border-purple-400 rounded-2xl p-5 space-y-3.5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-purple-900 pb-2">
              <h3 className="font-cinzel font-bold text-base text-purple-200">
                Susurrar al Dungeon Master ({roomCode})
              </h3>
              <button
                type="button"
                onClick={() => setIsDmMsgModalOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-cinzel text-purple-200 mb-1">Asunto *</label>
              <input
                type="text"
                required
                value={dmMsgTitle}
                onChange={(e) => setDmMsgTitle(e.target.value)}
                placeholder="Ej. Acción secreta / Pregunta de percepción"
                className="w-full bg-black/50 border border-purple-500/40 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-cinzel text-purple-200 mb-1">Mensaje *</label>
              <textarea
                rows={3}
                required
                value={dmMsgBody}
                onChange={(e) => setDmMsgBody(e.target.value)}
                placeholder="Escribe tu mensaje privado para el DM..."
                className="w-full bg-black/50 border border-purple-500/40 rounded-xl p-3 text-xs text-white"
              />
            </div>
            {dmMsgStatus && (
              <p className="text-xs font-cinzel font-bold text-emerald-300">{dmMsgStatus}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDmMsgModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-cinzel"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-cinzel font-bold text-xs"
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
