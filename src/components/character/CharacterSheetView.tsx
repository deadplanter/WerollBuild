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
  RefreshCw,
  Flame,
  CheckCircle,
  XCircle,
  Award,
  ChevronDown,
  ChevronUp,
  Edit2,
  Edit3,
  Lock,
  Unlock,
  Upload,
  ArrowLeft,
  Cloud,
  Coins,
} from 'lucide-react';
import { EntityAvatar } from '../common/EntityAvatar';
import { AvatarCustomizerModal } from '../common/AvatarCustomizerModal';
import {
  Character5e,
  AbilityKey,
  SkillKey,
  AttackAction,
  InventoryItem,
  SpellItem,
  Currency,
  CustomSkillEntry,
  PlayerJournalEntry,
  WeaponAttack,
} from '../../types/dnd';
import {
  calculateModifier,
  formatModifier,
  calculateProficiencyBonus,
  calculatePassivePerception,
  calculateSpellSaveDC,
  calculateSpellAttackBonus,
  calculateCarryCapacity,
  classifyInventoryItemKey as classifyInventoryItemGroup,
  deriveEquippedWeaponAttacks,
  formatWeaponAttackFormula,
  getSpanishAbilityLabel,
} from '../../utils/dnd-math';
import { ABILITY_LABELS, SKILL_METADATA, SRD_CLASSES, SRD_RACES } from '../../data/srd';

const DEFAULT_SRD_SKILL_DESCRIPTIONS: Record<SkillKey, string> = {
  acrobatics: 'Mantener el equilibrio, hacer piruetas, escapar de agarres o aterrizar de pie en superficies difíciles.',
  animalHandling: 'Calmar animales domesticados, intuir las intenciones de una bestia o controlar una montura en peligro.',
  arcana: 'Recordar conocimiento sobre hechizos, objetos mágicos, símbolos arcanos, planos de existencia y criaturas mágicas.',
  athletics: 'Escalar muros escarpados, saltar grandes distancias, nadar en aguas turbulentas o forcejear físicamente.',
  deception: 'Ocultar la verdad, mentir con convicción, disfrazarse o engañar mediante palabras y gestos.',
  history: 'Recordar eventos históricos, reinos antiguos, guerras pasadas, leyendas y civilizaciones perdidas.',
  insight: 'Determinar las verdaderas intenciones de una criatura, detectar mentiras o predecir su próximo movimiento.',
  intimidation: 'Influir en alguien mediante amenazas abiertas, acciones hostiles o presencia física imponente.',
  investigation: 'Buscar pistas ocultas, hacer deducciones lógicas a partir de pruebas o encontrar mecanismos secretos.',
  medicine: 'Estabilizar a un compañero moribundo, diagnosticar enfermedades o determinar la causa de una herida.',
  nature: 'Recordar información sobre el terreno, plantas, animales, el clima y los ciclos naturales.',
  perception: 'Detectar la presencia de algo oculto, escuchar ruidos lejanos o notar detalles mediante los sentidos.',
  performance: 'Deleitar a una audiencia con música, danza, actuación, narración de historias u otra forma de entretenimiento.',
  persuasion: 'Influir en otros con tacto, diplomacia, gracia social o buena fe para lograr un acuerdo.',
  religion: 'Recordar conocimientos sobre deidades, ritos sagrados, oraciones, jerarquías religiosas y símbolos divinos.',
  sleightOfHand: 'Realizar trucos de prestidigitación, robar bolsas de monedas u ocultar objetos en la ropa sin ser visto.',
  stealth: 'Esconderse de los enemigos, caminar en silencio sin ser detectado o escabullirse entre las sombras.',
  survival: 'Seguir rastros, cazar presas, guiar al grupo por tierras salvajes, predecir el clima o evitar peligros naturales.',
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
  roomCode,
}) => {
  const [activeTab, setActiveTab] = useState<'combat' | 'skills' | 'spells' | 'inventory' | 'features' | 'journal'>('combat');
  const [hpChangeAmount, setHpChangeAmount] = useState<number>(1);
  const [showHpModal, setShowHpModal] = useState<boolean>(false);
  const [hpModalMode, setHpModalMode] = useState<'heal' | 'damage' | 'temp'>('damage');
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState<boolean>(false);

  // Inventory filter sub-tab: Todos, Armas, Armaduras, Objetos comunes
  const [inventoryGroupFilter, setInventoryGroupFilter] = useState<'all' | 'weapon' | 'armor' | 'common'>('all');
  const [activeItemAttackTabIdx, setActiveItemAttackTabIdx] = useState<number>(0);

  // Skills Modal state (Add / Edit possessed skill)
  const [showSkillModal, setShowSkillModal] = useState<boolean>(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [skillForm, setSkillForm] = useState<{
    srdKey?: SkillKey;
    name: string;
    ability: AbilityKey;
    proficiency: 'none' | 'proficient' | 'expertise';
    description: string;
  }>({
    name: '',
    ability: 'cha',
    proficiency: 'proficient',
    description: '',
  });

  // Player Journal state (Diario del Jugador)
  const [showJournalModal, setShowJournalModal] = useState<boolean>(false);
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [journalSearch, setJournalSearch] = useState<string>('');
  const [journalForm, setJournalForm] = useState<{
    sessionNumber: number;
    title: string;
    dateInGame: string;
    summary: string;
    notes: string;
  }>({
    sessionNumber: 1,
    title: '',
    dateInGame: '',
    summary: '',
    notes: '',
  });

  // Modal for Editing Character Identity (Race, Class, Alignment, Level, XP, Background, Name)
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState<boolean>(false);
  const [identityForm, setIdentityForm] = useState<{
    name: string;
    race: string;
    subrace: string;
    characterClass: string;
    subclass: string;
    level: number;
    xp: number;
    background: string;
    alignment: string;
  }>({
    name: character.name || '',
    race: character.race || 'Humano',
    subrace: character.subrace || '',
    characterClass: character.characterClass || 'Guerrero',
    subclass: character.subclass || '',
    level: character.level || 1,
    xp: character.xp || 0,
    background: character.background || 'Soldado',
    alignment: character.alignment || 'Neutral Bueno',
  });

  const [isCustomRace, setIsCustomRace] = useState<boolean>(
    !SRD_RACES.some((r) => r.name === (character.race || 'Humano'))
  );
  const [isCustomClass, setIsCustomClass] = useState<boolean>(
    !Object.keys(SRD_CLASSES).includes(character.characterClass || 'Guerrero')
  );

  const handleOpenIdentityModal = () => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    const currentRace = character.race || 'Humano';
    const currentClass = character.characterClass || 'Guerrero';
    setIsCustomRace(!SRD_RACES.some((r) => r.name === currentRace));
    setIsCustomClass(!Object.keys(SRD_CLASSES).includes(currentClass));
    setIdentityForm({
      name: character.name || '',
      race: currentRace,
      subrace: character.subrace || '',
      characterClass: currentClass,
      subclass: character.subclass || '',
      level: character.level || 1,
      xp: character.xp || 0,
      background: character.background || 'Soldado',
      alignment: character.alignment || 'Neutral Bueno',
    });
    setIsIdentityModalOpen(true);
  };

  const handleQuickLevelChange = (newLvl: number) => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    const validLevel = Math.max(1, Math.min(20, newLvl));
    const classDef = SRD_CLASSES[character.characterClass];
    const hitDieSuffix = classDef ? classDef.hitDie : (character.hitDiceTotal?.match(/d\d+/)?.[0] || 'd8');
    onUpdateCharacter({
      ...character,
      level: validLevel,
      hitDiceTotal: `${validLevel}${hitDieSuffix}`,
    });
  };

  const handleSaveIdentity = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    const newLevel = Math.max(1, Math.min(20, Number(identityForm.level) || 1));
    const newXp = Math.max(0, Number(identityForm.xp) || 0);
    const classDef = SRD_CLASSES[identityForm.characterClass];
    const hitDieSuffix = classDef ? classDef.hitDie : (character.hitDiceTotal?.match(/d\d+/)?.[0] || 'd8');

    onUpdateCharacter({
      ...character,
      name: identityForm.name.trim() || character.name,
      race: identityForm.race.trim() || character.race,
      subrace: identityForm.subrace.trim() || undefined,
      characterClass: identityForm.characterClass.trim() || character.characterClass,
      subclass: identityForm.subclass.trim() || undefined,
      level: newLevel,
      xp: newXp,
      hitDiceTotal: `${newLevel}${hitDieSuffix}`,
      background: identityForm.background.trim() || character.background,
      alignment: identityForm.alignment.trim() || character.alignment,
    });
    setIsIdentityModalOpen(false);
  };

  // Modals for Adding / Editing Attacks
  const [editingAttack, setEditingAttack] = useState<AttackAction | null>(null);
  const [attackForm, setAttackForm] = useState<Partial<AttackAction>>({
    name: '',
    type: 'melee',
    attackBonus: 5,
    damageDice: '1d8+3',
    damageType: 'Cortante',
    range: '',
    notes: '',
  });

  // Modals for Adding / Editing Inventory Items
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState<Partial<InventoryItem>>({
    name: '',
    quantity: 1,
    weight: 1,
    category: 'Equipo',
    rarity: 'Común',
    description: '',
    equipped: false,
    attunement: false,
  });

  // Modals for Adding / Editing Spells
  const [editingSpell, setEditingSpell] = useState<SpellItem | null>(null);
  const [spellForm, setSpellForm] = useState<Partial<SpellItem>>({
    name: '',
    level: 1,
    school: 'Evocación',
    castingTime: '1 Acción',
    range: '60 pies',
    components: 'V, S',
    duration: 'Instantáneo',
    description: '',
    prepared: true,
  });

  // Currency Modal & State
  const [showCurrencyModal, setShowCurrencyModal] = useState<boolean>(false);
  const [currencyForm, setCurrencyForm] = useState<Currency>({
    gp: 0,
    sp: 0,
    cp: 0,
    ep: 0,
    pp: 0,
  });
  const [quickDelta, setQuickDelta] = useState<number>(10);
  const [quickCoin, setQuickCoin] = useState<keyof Currency>('gp');

  const handleOpenCurrencyModal = () => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    const curr = character.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
    setCurrencyForm({
      cp: curr.cp ?? 0,
      sp: curr.sp ?? 0,
      ep: curr.ep ?? 0,
      gp: curr.gp ?? 0,
      pp: curr.pp ?? 0,
    });
    setShowCurrencyModal(true);
  };

  const handleSaveCurrency = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    onUpdateCharacter({
      ...character,
      currency: {
        cp: Math.max(0, Math.floor(Number(currencyForm.cp) || 0)),
        sp: Math.max(0, Math.floor(Number(currencyForm.sp) || 0)),
        ep: Math.max(0, Math.floor(Number(currencyForm.ep) || 0)),
        gp: Math.max(0, Math.floor(Number(currencyForm.gp) || 0)),
        pp: Math.max(0, Math.floor(Number(currencyForm.pp) || 0)),
      },
    });
    setShowCurrencyModal(false);
  };

  const adjustQuickCurrency = (coin: keyof Currency, delta: number) => {
    setCurrencyForm((prev) => ({
      ...prev,
      [coin]: Math.max(0, (Number(prev[coin]) || 0) + delta),
    }));
  };

  const profBonus = calculateProficiencyBonus(character.level);
  const passivePerception = calculatePassivePerception(
    character.abilities.wis.score,
    character.skills.perception,
    profBonus
  );

  // HP Adjustments
  const applyHpChange = () => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    const amt = Math.max(0, hpChangeAmount);
    let updated = { ...character };

    if (hpModalMode === 'heal') {
      updated.currentHp = Math.min(updated.maxHp, updated.currentHp + amt);
    } else if (hpModalMode === 'damage') {
      if (updated.tempHp > 0) {
        if (amt <= updated.tempHp) {
          updated.tempHp -= amt;
        } else {
          const remaining = amt - updated.tempHp;
          updated.tempHp = 0;
          updated.currentHp = Math.max(0, updated.currentHp - remaining);
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

  // Short rest hit dice roll
  const handleShortRestHitDie = () => {
    const match = character.hitDiceTotal.match(/d(\d+)/);
    const dieSides = match ? parseInt(match[1], 10) : 8;
    const conMod = calculateModifier(character.abilities.con.score);

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
      spellSlots: character.spellSlots.map((s) => ({ ...s, expended: 0 })),
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

  const cycleSkillProficiency = (key: SkillKey) => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    const current = character.skills[key] || 'none';
    const next: 'none' | 'proficient' | 'expertise' =
      current === 'none' ? 'proficient' : current === 'proficient' ? 'expertise' : 'none';

    onUpdateCharacter({
      ...character,
      skills: {
        ...character.skills,
        [key]: next,
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

  const totalWeight = character.inventory.reduce((sum, item) => sum + (item.weight * (item.quantity || 1)), 0);
  const carryCap = calculateCarryCapacity(character.abilities.str.score);

  // Derive possessed skills list (only the skills the character has, not all 18 SRD factory skills)
  const possessedSkills: CustomSkillEntry[] = React.useMemo(() => {
    if (Array.isArray(character.customSkills)) {
      return character.customSkills;
    }
    // Fallback for legacy characters: only include skills where proficiency !== 'none'
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

  // Derive equipped weapon attacks for Combat & Actions tab
  const equippedWeaponAttacks = React.useMemo(
    () => deriveEquippedWeaponAttacks(character.inventory || []),
    [character.inventory]
  );

  // Item weapon attacks helper for inventory item modal
  const handleSetItemFormAttackCount = (count: number) => {
    const safeCount = Math.max(1, Math.min(12, count));
    const current = [...(itemForm.weaponAttacks || [])];
    if (safeCount > current.length) {
      for (let i = current.length; i < safeCount; i++) {
        current.push({
          id: `iatk-${Date.now()}-${i + 1}`,
          name: i === 0 ? 'Ataque Principal' : `Ataque ${i + 1}`,
          description: '',
          dice: i === 0 ? '1d6' : '1d8',
          potenciador: 0,
          damageType: 'Cortante',
          attackBonus: 0,
          range: '5 pies',
        });
      }
    } else if (safeCount < current.length) {
      current.splice(safeCount);
    }
    setItemForm((prev) => ({ ...prev, weaponAttacks: current }));
    if (activeItemAttackTabIdx >= safeCount) {
      setActiveItemAttackTabIdx(Math.max(0, safeCount - 1));
    }
  };

  const handleUpdateItemFormAttackTab = (idx: number, patch: Partial<WeaponAttack>) => {
    const current = [...(itemForm.weaponAttacks || [])];
    if (!current[idx]) return;
    current[idx] = { ...current[idx], ...patch };
    setItemForm((prev) => ({ ...prev, weaponAttacks: current }));
  };

  // Base Ability Score direct editor helper
  const updateAbilityBaseScore = (key: AbilityKey, nextScore: number) => {
    if (isLocked) return;
    const clamped = Math.max(1, Math.min(30, Number.isFinite(nextScore) ? Math.round(nextScore) : 10));
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

  // Special Traits & Feats (Rasgos Especiales y Dotes) editor state
  const [showTraitForm, setShowTraitForm] = useState<boolean>(false);
  const [editingTraitId, setEditingTraitId] = useState<string | null>(null);
  const [traitForm, setTraitForm] = useState<{ name: string; source: string; description: string }>({
    name: '',
    source: 'Raza / Clase / Dote',
    description: '',
  });

  const handleSaveTrait = () => {
    if (isLocked || !traitForm.name.trim()) return;
    const currentList = Array.isArray(character.featuresAndTraits) ? [...character.featuresAndTraits] : [];
    if (editingTraitId) {
      const updated = currentList.map((ft) =>
        ft.id === editingTraitId
          ? {
              ...ft,
              name: traitForm.name.trim(),
              source: traitForm.source.trim() || 'Rasgo Especial',
              description: traitForm.description.trim(),
            }
          : ft
      );
      onUpdateCharacter({ ...character, featuresAndTraits: updated });
    } else {
      currentList.push({
        id: `feat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: traitForm.name.trim(),
        source: traitForm.source.trim() || 'Rasgo Especial',
        description: traitForm.description.trim(),
      });
      onUpdateCharacter({ ...character, featuresAndTraits: currentList });
    }
    setShowTraitForm(false);
    setEditingTraitId(null);
    setTraitForm({ name: '', source: 'Raza / Clase / Dote', description: '' });
  };

  const handleDeleteTrait = (id: string) => {
    if (isLocked) return;
    onUpdateCharacter({
      ...character,
      featuresAndTraits: (character.featuresAndTraits || []).filter((ft) => ft.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      {/* Lobby Navigation & Cloud Save Bar */}
      {(onReturnToLobby || onSaveToCloud) && (
        <div className="bg-[#14151b] border border-amber-900/50 rounded-2xl p-3 px-4 shadow-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onReturnToLobby && (
              <button
                onClick={onReturnToLobby}
                className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-cinzel font-bold text-xs transition flex items-center gap-2 border border-stone-700 shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Regresar al Lobby</span>
              </button>
            )}
            {isInActiveRoom && roomCode ? (
              <span className="px-3 py-1 rounded-xl bg-[#181922] border border-stone-800 text-xs font-mono text-amber-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Mesa: <strong>{roomCode}</strong>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-400 font-cinzel">
                Modo Edición en Solitario
              </span>
            )}
          </div>

          {onSaveToCloud && (
            <button
              onClick={onSaveToCloud}
              className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-cinzel font-bold text-xs shadow-md transition flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Guardar en la Nube
            </button>
          )}
        </div>
      )}

      {/* 1. Header Banner: Character Identity & Lock Status */}
      <div className="bg-[#1b1c23] border border-amber-900/40 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div
              className={`relative group ${!isLocked ? 'cursor-pointer' : ''}`}
              onClick={() => !isLocked && setIsAvatarModalOpen(true)}
              title={!isLocked ? 'Haz clic para cambiar la ilustración o el icono del personaje' : undefined}
            >
              <EntityAvatar
                avatarType={character.avatarType || (character.avatarUrl ? 'custom' : 'icon')}
                customUrl={character.avatarCustomUrl || character.avatarUrl}
                iconId={character.avatarIcon || 'anonymous'}
                size="2xl"
                className="group-hover:border-amber-400 transition shadow-xl"
              />
              {!isLocked && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-3xl flex items-center justify-center transition text-amber-300">
                  <Edit3 className="w-6 h-6" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold font-cinzel text-amber-200 tracking-wide">
                  {character.name}
                </h1>
                <button
                  onClick={() => {
                    if (isLocked) {
                      if (onUnlockRequest) onUnlockRequest();
                      return;
                    }
                    onUpdateCharacter({ ...character, inspiration: !character.inspiration });
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-cinzel font-bold tracking-wider flex items-center gap-1 border transition ${
                    character.inspiration
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-amber-500/20 shadow-md animate-pulse'
                      : 'bg-stone-800 text-stone-500 border-stone-700 hover:text-stone-300'
                  }`}
                  title="Inspiración del DM"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {character.inspiration ? 'INSPIRADO' : 'Inspiración'}
                </button>

                {/* Password / Lock Indicator */}
                {character.password && (
                  <button
                    onClick={onUnlockRequest}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono flex items-center gap-1 border transition ${
                      isLocked
                        ? 'bg-red-950/80 text-red-300 border-red-700 hover:bg-red-900'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                    }`}
                    title={isLocked ? 'Hoja bloqueada con contraseña. Haz clic para desbloquear edición.' : 'Hoja desbloqueada para editar'}
                  >
                    {isLocked ? <Lock className="w-3 h-3 text-red-400" /> : <Unlock className="w-3 h-3 text-emerald-400" />}
                    <span>{isLocked ? 'Solo Lectura' : 'Editando'}</span>
                  </button>
                )}
              </div>
              <div className="text-stone-400 text-xs sm:text-sm mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className="font-semibold text-amber-400/90">
                  {character.race} {character.subrace ? `(${character.subrace}) ` : ''}
                  {character.characterClass}
                </span>

                {/* Interactive Level Control in Header */}
                {!isLocked ? (
                  <div className="inline-flex items-center gap-1 bg-[#121316] border border-amber-700/70 rounded-lg px-1.5 py-0.5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => handleQuickLevelChange((character.level || 1) - 1)}
                      disabled={(character.level || 1) <= 1}
                      className="p-0.5 rounded hover:bg-stone-800 text-stone-300 hover:text-amber-300 disabled:opacity-30 transition"
                      title="Bajar 1 Nivel"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <select
                      value={character.level || 1}
                      onChange={(e) => handleQuickLevelChange(parseInt(e.target.value, 10) || 1)}
                      className="bg-transparent text-amber-300 font-cinzel font-bold text-xs outline-none cursor-pointer"
                      title="Cambiar Nivel del Personaje (1 - 20)"
                    >
                      {Array.from({ length: 20 }, (_, i) => i + 1).map((lvl) => (
                        <option key={lvl} value={lvl} className="bg-[#181920] text-amber-300">
                          Nivel {lvl}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleQuickLevelChange((character.level || 1) + 1)}
                      disabled={(character.level || 1) >= 20}
                      className="p-0.5 rounded hover:bg-stone-800 text-stone-300 hover:text-amber-300 disabled:opacity-30 transition"
                      title="Subir 1 Nivel"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span>• Nivel {character.level}</span>
                )}

                {/* Interactive XP Indicator right next to Level */}
                <div className="inline-flex items-center gap-1.5 bg-[#121316] border border-amber-700/70 rounded-lg px-2 py-0.5 shadow-sm">
                  <span className="text-[11px] font-cinzel font-black text-amber-400">XP</span>
                  {!isLocked ? (
                    <input
                      type="number"
                      min={0}
                      aria-label="Experiencia XP"
                      value={character.xp ?? 0}
                      onChange={(e) => {
                        const nextXp = Math.max(0, parseInt(e.target.value, 10) || 0);
                        onUpdateCharacter({ ...character, xp: nextXp });
                      }}
                      className="w-20 bg-transparent text-amber-200 font-mono font-bold text-xs outline-none border-b border-amber-800/60 focus:border-amber-400 text-center"
                      title="Edita tu experiencia (XP) actual"
                    />
                  ) : (
                    <span className="font-mono font-bold text-xs text-amber-200">{character.xp ?? 0}</span>
                  )}
                </div>

                {character.subclass && <span>({character.subclass})</span>}
                <span>• {character.background}</span>
                <span>• {character.alignment}</span>
                {!isLocked && (
                  <button
                    type="button"
                    onClick={handleOpenIdentityModal}
                    className="ml-1 px-2.5 py-0.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-700/70 text-amber-300 text-[11px] font-cinzel font-bold flex items-center gap-1 transition shadow-sm"
                    title="Modificar Raza, Clase, Alineamiento, Nivel o Trasfondo"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Editar Raza / Clase / Nivel</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Badges: CA, Iniciativa, Velocidad, Competencia */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="bg-[#121316] border border-amber-900/50 rounded-xl px-3.5 py-2 text-center min-w-[70px]">
              <div className="text-[10px] uppercase tracking-wider text-stone-400 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3 text-amber-500" />
                CA
              </div>
              <div className="text-xl font-cinzel font-black text-amber-300">{character.armorClass}</div>
            </div>

            <div
              onClick={() => onTriggerRoll('Iniciativa', character.initiativeBonus)}
              className="cursor-pointer bg-[#121316] border border-amber-900/50 hover:border-amber-500 rounded-xl px-3.5 py-2 text-center min-w-[70px] transition group"
              title="Haz clic para tirar Iniciativa"
            >
              <div className="text-[10px] uppercase tracking-wider text-stone-400 flex items-center justify-center gap-1 group-hover:text-amber-400">
                <Zap className="w-3 h-3 text-amber-500" />
                Inic.
              </div>
              <div className="text-xl font-cinzel font-black text-stone-100 group-hover:text-amber-300">
                {formatModifier(character.initiativeBonus)}
              </div>
            </div>

            <div className="bg-[#121316] border border-amber-900/50 rounded-xl px-3.5 py-2 text-center min-w-[70px]">
              <div className="text-[10px] uppercase tracking-wider text-stone-400">Velocidad</div>
              <div className="text-xl font-cinzel font-black text-stone-100">{character.speed} ft</div>
            </div>

            <div className="bg-[#121316] border border-amber-900/50 rounded-xl px-3.5 py-2 text-center min-w-[70px]">
              <div className="text-[10px] uppercase tracking-wider text-stone-400">Comp.</div>
              <div className="text-xl font-cinzel font-black text-amber-400">+{profBonus}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Health & Survival Bar + Rest Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* HP Tracker Box */}
        <div className="md:col-span-2 bg-[#181920] border border-stone-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              <span className="font-cinzel font-bold text-sm text-stone-200">Puntos de Golpe (PG)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setHpModalMode('damage');
                  setShowHpModal(true);
                }}
                className="px-2.5 py-1 text-xs font-bold rounded bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 transition"
              >
                - Daño
              </button>
              <button
                onClick={() => {
                  setHpModalMode('heal');
                  setShowHpModal(true);
                }}
                className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition"
              >
                + Curar
              </button>
              <button
                onClick={() => {
                  setHpModalMode('temp');
                  setShowHpModal(true);
                }}
                className="px-2 py-1 text-xs rounded bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800 transition"
              >
                PG Temp
              </button>
            </div>
          </div>

          {/* Bar */}
          <div className="h-4 bg-stone-900 rounded-full overflow-hidden border border-stone-700/60 mb-2 relative">
            <div
              className={`h-full transition-all duration-300 ${
                character.currentHp / character.maxHp > 0.5
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500'
                  : character.currentHp / character.maxHp > 0.2
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500'
                  : 'bg-gradient-to-r from-red-700 to-red-500 animate-pulse'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, (character.currentHp / character.maxHp) * 100))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-stone-400 font-mono">
            <div>
              Actual: <span className="font-bold text-lg text-stone-100">{character.currentHp}</span> / {character.maxHp}
              {character.tempHp > 0 && (
                <span className="text-blue-400 font-bold ml-2">+{character.tempHp} Temp</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span>
                Dados de Golpe: {character.hitDiceTotal} ({parseInt(character.hitDiceTotal, 10) - character.hitDiceUsed} disp.)
              </span>
            </div>
          </div>
        </div>

        {/* Death Saves & Rests Box */}
        <div className="bg-[#181920] border border-stone-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold font-cinzel text-stone-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Tiradas de Muerte</span>
              <button
                onClick={() => onTriggerRoll('Tirada de Salvación contra Muerte', 0)}
                className="text-[10px] text-amber-400 hover:underline"
              >
                Tirar d20
              </button>
            </div>
            {/* Successes */}
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-emerald-400">Éxitos:</span>
              <div className="flex items-center gap-2">
                {[0, 1, 2].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDeathSave('successes', idx)}
                    className={`w-4 h-4 rounded-full border transition ${
                      character.deathSaves.successes > idx
                        ? 'bg-emerald-500 border-emerald-400 shadow-sm'
                        : 'border-stone-600 hover:border-emerald-500'
                    }`}
                  />
                ))}
              </div>
            </div>
            {/* Failures */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-red-400">Fracasos:</span>
              <div className="flex items-center gap-2">
                {[0, 1, 2].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDeathSave('failures', idx)}
                    className={`w-4 h-4 rounded-full border transition ${
                      character.deathSaves.failures > idx
                        ? 'bg-red-600 border-red-500 shadow-sm'
                        : 'border-stone-600 hover:border-red-500'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-stone-800 mt-2">
            <button
              onClick={handleShortRestHitDie}
              className="flex-1 py-1 px-2 text-[11px] font-semibold rounded bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition"
              title="Gasta 1 Dado de Golpe y suma mod CON"
            >
              Descanso Corto
            </button>
            <button
              onClick={handleLongRest}
              className="flex-1 py-1 px-2 text-[11px] font-semibold rounded bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800 transition"
              title="Recupera todos los PG y mitad de Dados de Golpe"
            >
              Descanso Largo
            </button>
          </div>
        </div>
      </div>

      {/* 3. Ability Scores Grid (6 Attributes) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {(Object.keys(character.abilities) as AbilityKey[]).map((key) => {
          const ab = character.abilities[key];
          const mod = calculateModifier(ab.score);
          const saveMod = mod + (ab.proficientSave ? profBonus : 0);
          const meta = ABILITY_LABELS[key];

          return (
            <div
              key={key}
              className="bg-[#181920] border border-amber-900/30 rounded-xl p-3 flex flex-col items-center justify-between shadow relative hover:border-amber-700/60 transition group"
            >
              <div className="text-xs font-cinzel font-bold text-amber-400/90 tracking-wider">
                {meta.abbr}
              </div>
              <div className="text-[11px] text-stone-400">{meta.nameEs}</div>

              <button
                type="button"
                onClick={() => onTriggerRoll(`Prueba de ${meta.nameEs}`, mod)}
                className="my-1 w-14 h-14 rounded-full bg-[#121316] border-2 border-stone-700 group-hover:border-amber-500 flex items-center justify-center font-cinzel font-black text-2xl text-stone-100 group-hover:text-amber-300 transition shadow"
                title={`Haz clic para tirar Prueba de ${meta.nameEs} (d20 + ${mod})`}
              >
                {formatModifier(mod)}
              </button>

              {!isLocked ? (
                <div className="flex items-center gap-1 mt-0.5" title="Modificar puntuación base de estadística">
                  <button
                    type="button"
                    onClick={() => updateAbilityBaseScore(key, ab.score - 1)}
                    className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold flex items-center justify-center border border-stone-700"
                    title="Disminuir puntuación base (-1)"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={ab.score}
                    onChange={(e) => updateAbilityBaseScore(key, parseInt(e.target.value, 10) || 10)}
                    aria-label={`Puntuación base de ${meta.nameEs}`}
                    className="w-11 bg-[#121316] border border-stone-700 focus:border-amber-500 rounded px-1 py-0.5 text-center text-xs font-mono font-bold text-amber-300 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateAbilityBaseScore(key, ab.score + 1)}
                    className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold flex items-center justify-center border border-stone-700"
                    title="Aumentar puntuación base (+1)"
                  >
                    +
                  </button>
                </div>
              ) : (
                <div className="text-xs text-stone-400 font-mono">Puntuación: {ab.score}</div>
              )}

              <div className="w-full mt-2 pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => toggleSaveProficiency(key)}
                  className={`w-3.5 h-3.5 rounded-full border ${
                    ab.proficientSave ? 'bg-amber-500 border-amber-400' : 'border-stone-600'
                  }`}
                  title="Competencia en Tirada de Salvación"
                />
                <button
                  type="button"
                  onClick={() => onTriggerRoll(`Salvación de ${meta.nameEs}`, saveMod)}
                  className="font-medium text-stone-300 hover:text-amber-400 transition"
                  title="Tirar Salvación"
                >
                  Salv: {formatModifier(saveMod)}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Tab Navigation (6 Tabs including Diario del Jugador) */}
      <div className="border-b border-stone-800 flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
        {[
          { id: 'combat', label: 'Combate y Acciones', icon: Sword },
          { id: 'skills', label: 'Habilidades (Skills)', icon: BookOpen },
          { id: 'spells', label: 'Lanza-Conjuros', icon: Flame },
          { id: 'inventory', label: 'Equipo e Inventario', icon: Backpack },
          { id: 'features', label: 'Rasgos y Trasfondo', icon: Scroll },
          { id: 'journal', label: 'Diario', icon: Edit3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs sm:text-sm font-cinzel font-semibold tracking-wider transition whitespace-nowrap border-b-2 ${
                isActive
                  ? 'bg-[#1e2029] text-amber-300 border-amber-500'
                  : 'text-stone-400 border-transparent hover:text-stone-200 hover:bg-[#15161c]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 5. TAB CONTENTS */}
      {/* TAB 1: Combat & Attacks (Non-editable, automatically populated from Equipped Weapons) */}
      {activeTab === 'combat' && (
        <div className="space-y-4">
          <div className="bg-[#181920] border border-amber-900/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow">
            <div>
              <h3 className="font-cinzel font-bold text-lg text-amber-200 flex items-center gap-2">
                <Sword className="w-5 h-5 text-amber-400" />
                <span>Combate y Acciones (Armas Equipadas)</span>
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Esta pestaña muestra automáticamente los ataques y habilidades de las armas que tengas marcadas como <strong>Equipadas</strong> en tu inventario.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setInventoryGroupFilter('weapon');
                setActiveTab('inventory');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-950/90 hover:bg-amber-900 border border-amber-700 text-amber-300 text-xs font-cinzel font-bold transition shadow shrink-0"
            >
              <Backpack className="w-4 h-4" />
              <span>Equipar Armas en Inventario</span>
            </button>
          </div>

          {equippedWeaponAttacks.length === 0 ? (
            <div className="bg-[#181920] border border-stone-800 rounded-2xl p-8 text-center space-y-3">
              <Sword className="w-10 h-10 text-stone-600 mx-auto" />
              <h4 className="font-cinzel font-bold text-base text-stone-200">
                No tienes ningún arma equipada actualmente
              </h4>
              <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                Ve a la pestaña de <strong>Equipo e Inventario</strong>, selecciona la sección de <strong>Armas</strong> y pulsa el botón <strong>Equipar</strong> en tu arma para que sus tipos de ataque aparezcan automáticamente aquí.
              </p>
              <button
                type="button"
                onClick={() => {
                  setInventoryGroupFilter('weapon');
                  setActiveTab('inventory');
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold text-xs shadow transition inline-flex items-center gap-1.5"
              >
                <Sword className="w-4 h-4" />
                <span>Ir a Armas del Inventario</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {equippedWeaponAttacks.map((atk) => {
                const toHitTotal = (atk.attackBonus || 0) + profBonus;
                return (
                  <div
                    key={atk.id}
                    className="bg-[#181920] border border-amber-900/50 rounded-xl p-4 shadow-lg flex flex-col justify-between hover:border-amber-600/70 transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <span className="font-bold text-amber-200 font-cinzel text-base block">
                            {atk.name}
                          </span>
                          <span className="text-[11px] text-amber-400/90 font-semibold flex items-center gap-1 mt-0.5">
                            <Sword className="w-3 h-3" />
                            <span>Arma Equipada: {atk.weaponName}</span>
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-lg bg-amber-950/90 border border-amber-700/70 text-amber-300 font-mono font-bold text-xs shrink-0">
                          {atk.formula}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-300 my-2 bg-[#121316] px-2.5 py-1.5 rounded-lg border border-stone-800">
                        <span>
                          <strong>Dado:</strong> <span className="font-mono text-amber-300">{atk.dice}</span>
                        </span>
                        <span>•</span>
                        <span>
                          <strong>Potenciador:</strong>{' '}
                          <span className="font-mono text-amber-300">
                            {atk.potenciador === 0
                              ? 'Sin potenciador (0)'
                              : atk.potenciador > 0
                              ? `+${atk.potenciador}`
                              : atk.potenciador}
                          </span>
                        </span>
                        <span>•</span>
                        <span>
                          <strong>Daño:</strong> {atk.damageType}
                        </span>
                      </div>

                      {atk.description && (
                        <p className="text-xs text-stone-300 leading-relaxed mb-3">
                          {atk.description}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-stone-800">
                      <button
                        type="button"
                        onClick={() => onTriggerRoll(`Ataque: ${atk.name} (${atk.weaponName})`, toHitTotal)}
                        className="py-1.5 px-2 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-300 font-bold text-xs flex items-center justify-center gap-1 transition"
                        title="Tirar d20 de impacto"
                      >
                        <Sword className="w-3.5 h-3.5" />
                        <span>{formatModifier(toHitTotal)} Impacto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const match = atk.dice.match(/^(\d*)d(\d+)/i);
                          const sides = match ? parseInt(match[2], 10) : 6;
                          onTriggerRoll(
                            `Daño: ${atk.name} (${atk.weaponName} - ${atk.damageType})`,
                            atk.potenciador || 0,
                            sides
                          );
                        }}
                        className="py-1.5 px-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-100 text-xs font-mono font-bold flex items-center justify-center gap-1 transition"
                        title={`Tirar daño (${atk.formula} ${atk.damageType})`}
                      >
                        <span>{atk.formula}</span>
                        <span className="text-[10px] text-amber-400">({atk.damageType})</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Skills & Proficiencies (Only possessed skills, Spanish stats, descriptions, editable & addable) */}
      {activeTab === 'skills' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#181920] p-4 rounded-xl border border-stone-800">
            <div>
              <div className="text-sm font-cinzel font-bold text-amber-300">
                Habilidades del Personaje ({possessedSkills.length})
              </div>
              <div className="text-xs text-stone-400 mt-0.5">
                <span className="font-bold text-amber-400">Percepción Pasiva:</span> {passivePerception} • Solo se muestran las habilidades que posee tu personaje.
              </div>
            </div>

            {!isLocked && (
              <button
                type="button"
                onClick={() => {
                  setEditingSkillId(null);
                  setSkillForm({
                    srdKey: undefined,
                    name: '',
                    ability: 'cha',
                    proficiency: 'proficient',
                    description: '',
                  });
                  setShowSkillModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold text-xs shadow transition shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Agregar Habilidad</span>
              </button>
            )}
          </div>

          {/* DM-Shared Abilities that can be added to Skills with 1 click */}
          {(() => {
            const unaddedShared = (character.featuresAndTraits || []).filter(
              (ft) =>
                (ft.source === 'Dote' || ft.isSkill) &&
                !possessedSkills.some((ps) => ps.id === ft.id || ps.name.toLowerCase() === ft.name.toLowerCase())
            );
            if (unaddedShared.length === 0) return null;
            return (
              <div className="p-3.5 rounded-xl bg-emerald-950/25 border border-emerald-700/60 space-y-2">
                <div className="text-xs font-cinzel font-bold text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Habilidades Compartidas por el DM disponibles para agregar:</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {unaddedShared.map((shared) => (
                    <div
                      key={shared.id}
                      className="flex items-center justify-between gap-2 bg-[#121316] p-2.5 rounded-lg border border-emerald-800/60"
                    >
                      <div>
                        <div className="text-xs font-bold text-emerald-200">{shared.name}</div>
                        <div className="text-[10px] text-emerald-400">
                          Estadística: {getSpanishAbilityLabel(shared.abilityStat || 'int')}
                        </div>
                        <div className="text-[11px] text-stone-400 line-clamp-1">{shared.description}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newEntry: CustomSkillEntry = {
                            id: shared.id || `cskill-${Date.now()}`,
                            name: shared.name,
                            ability: shared.abilityStat || 'int',
                            proficiency: 'proficient',
                            description: shared.description,
                          };
                          onUpdateCharacter({
                            ...character,
                            customSkills: [...possessedSkills, newEntry],
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-cinzel font-bold shrink-0"
                      >
                        + Agregar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {possessedSkills.length === 0 ? (
            <div className="text-center py-8 bg-[#181920] border border-stone-800 rounded-xl text-stone-400 text-xs space-y-2">
              <p>Aún no has agregado habilidades a tu personaje.</p>
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSkillId(null);
                    setSkillForm({
                      srdKey: undefined,
                      name: '',
                      ability: 'cha',
                      proficiency: 'proficient',
                      description: '',
                    });
                    setShowSkillModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold text-xs"
                >
                  + Agregar Primera Habilidad
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {possessedSkills.map((skill) => {
                const abilityMod = calculateModifier(character.abilities[skill.ability]?.score ?? 10);
                const totalBonus =
                  abilityMod +
                  (skill.proficiency === 'expertise'
                    ? profBonus * 2
                    : skill.proficiency === 'proficient'
                    ? profBonus
                    : 0);

                return (
                  <div
                    key={skill.id}
                    className="p-3.5 bg-[#181920] border border-stone-800 hover:border-amber-800/70 rounded-xl transition flex flex-col justify-between gap-2 shadow"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (isLocked) {
                                if (onUnlockRequest) onUnlockRequest();
                                return;
                              }
                              const nextProf: 'none' | 'proficient' | 'expertise' =
                                skill.proficiency === 'proficient'
                                  ? 'expertise'
                                  : skill.proficiency === 'expertise'
                                  ? 'none'
                                  : 'proficient';
                              const updatedCustom = possessedSkills.map((s) =>
                                s.id === skill.id ? { ...s, proficiency: nextProf } : s
                              );
                              const updatedSkillsMap = { ...character.skills };
                              if (skill.srdKey) {
                                updatedSkillsMap[skill.srdKey] = nextProf;
                              }
                              onUpdateCharacter({
                                ...character,
                                skills: updatedSkillsMap,
                                customSkills: updatedCustom,
                              });
                            }}
                            className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] transition shrink-0 ${
                              skill.proficiency === 'expertise'
                                ? 'bg-amber-600 border-amber-400 text-stone-950 font-black shadow-sm'
                                : skill.proficiency === 'proficient'
                                ? 'bg-amber-500 border-amber-400 text-stone-950 font-bold'
                                : 'border-stone-600 hover:border-stone-400 text-stone-400'
                            }`}
                            title="Cambiar entre Competente, Pericia (x2) o Base"
                          >
                            {skill.proficiency === 'expertise' ? '★' : '●'}
                          </button>
                          <div>
                            <div className="text-sm font-cinzel font-bold text-stone-100">
                              {skill.name}
                            </div>
                            {/* Spanish Stat label below the skill name */}
                            <div className="text-[11px] font-semibold text-amber-400 mt-0.5">
                              Estadística: {getSpanishAbilityLabel(skill.ability)}
                              {skill.proficiency === 'expertise'
                                ? ' • Pericia (x2)'
                                : skill.proficiency === 'proficient'
                                ? ' • Competente'
                                : ' • Sin bonificador de comp.'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onTriggerRoll(`Prueba de ${skill.name}`, totalBonus)}
                            className="px-2.5 py-1 rounded-lg bg-[#121316] hover:bg-amber-950/80 border border-amber-700/60 font-mono font-bold text-xs text-amber-300 transition shadow-sm"
                            title={`Tirar ${skill.name} (1d20 + ${totalBonus})`}
                          >
                            {formatModifier(totalBonus)}
                          </button>
                          {!isLocked && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSkillId(skill.id);
                                  setSkillForm({
                                    srdKey: skill.srdKey,
                                    name: skill.name,
                                    ability: skill.ability,
                                    proficiency: skill.proficiency,
                                    description: skill.description || '',
                                  });
                                  setShowSkillModal(true);
                                }}
                                className="p-1 text-stone-400 hover:text-amber-300 rounded hover:bg-stone-800"
                                title="Editar habilidad y su descripción"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedCustom = possessedSkills.filter((s) => s.id !== skill.id);
                                  const updatedSkillsMap = { ...character.skills };
                                  if (skill.srdKey) {
                                    updatedSkillsMap[skill.srdKey] = 'none';
                                  }
                                  onUpdateCharacter({
                                    ...character,
                                    skills: updatedSkillsMap,
                                    customSkills: updatedCustom,
                                  });
                                }}
                                className="p-1 text-stone-500 hover:text-red-400 rounded hover:bg-stone-800"
                                title="Quitar habilidad"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-stone-300 leading-relaxed mt-2 pl-7">
                        {skill.description || 'Sin descripción registrada. Haz clic en editar para añadir qué hace esta habilidad.'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add / Edit Skill Modal */}
          {showSkillModal && (
            <div className="bg-[#1b1c24] border-2 border-amber-700/80 rounded-2xl p-4 mt-3 space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <h4 className="font-cinzel font-bold text-sm text-amber-300">
                  {editingSkillId ? 'Editar Habilidad (Skill)' : 'Agregar Habilidad al Personaje'}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowSkillModal(false)}
                  className="text-xs text-stone-400 hover:text-stone-200"
                >
                  ✕
                </button>
              </div>

              {!editingSkillId && (
                <div>
                  <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                    Autocompletar desde habilidad clásica 5E (Opcional):
                  </label>
                  <select
                    value={skillForm.srdKey || ''}
                    onChange={(e) => {
                      const k = e.target.value as SkillKey;
                      if (!k) {
                        setSkillForm({
                          ...skillForm,
                          srdKey: undefined,
                        });
                        return;
                      }
                      const meta = SKILL_METADATA[k];
                      setSkillForm({
                        srdKey: k,
                        name: meta.nameEs,
                        ability: meta.ability,
                        proficiency: 'proficient',
                        description: DEFAULT_SRD_SKILL_DESCRIPTIONS[k] || '',
                      });
                    }}
                    className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100"
                  >
                    <option value="">-- Crear habilidad personalizada o seleccionar del listado --</option>
                    {(Object.keys(SKILL_METADATA) as SkillKey[]).map((k) => (
                      <option key={k} value={k}>
                        {SKILL_METADATA[k].nameEs} ({getSpanishAbilityLabel(SKILL_METADATA[k].ability)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                    Nombre de la Habilidad:
                  </label>
                  <input
                    type="text"
                    value={skillForm.name}
                    onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                    placeholder="Ej. Engaño, Intimidación, Sigilo Sombrío..."
                    className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                    Estadística que usa (En Español):
                  </label>
                  <select
                    value={skillForm.ability}
                    onChange={(e) => setSkillForm({ ...skillForm, ability: e.target.value as AbilityKey })}
                    className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100"
                  >
                    <option value="str">Fuerza (FUE)</option>
                    <option value="dex">Destreza (DES)</option>
                    <option value="con">Constitución (CON)</option>
                    <option value="int">Inteligencia (INT)</option>
                    <option value="wis">Sabiduría (SAB)</option>
                    <option value="cha">Carisma (CAR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                    Nivel de Competencia:
                  </label>
                  <select
                    value={skillForm.proficiency}
                    onChange={(e) => setSkillForm({ ...skillForm, proficiency: e.target.value as any })}
                    className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100"
                  >
                    <option value="proficient">Competente (+Bono)</option>
                    <option value="expertise">Pericia (x2 Bono)</option>
                    <option value="none">Base (Solo Estadística)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                  Descripción (¿Qué hace esta habilidad?):
                </label>
                <textarea
                  rows={2}
                  value={skillForm.description}
                  onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
                  placeholder="Ej. Engaño permite ocultar la verdad, mentir con convicción o disfrazar tus intenciones..."
                  className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSkillModal(false)}
                  className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!skillForm.name.trim()) return;
                    const updatedSkillsMap = { ...character.skills };
                    if (skillForm.srdKey) {
                      updatedSkillsMap[skillForm.srdKey] = skillForm.proficiency;
                    }
                    if (editingSkillId) {
                      const nextList = possessedSkills.map((s) =>
                        s.id === editingSkillId
                          ? {
                              ...s,
                              srdKey: skillForm.srdKey,
                              name: skillForm.name.trim(),
                              ability: skillForm.ability,
                              proficiency: skillForm.proficiency,
                              description: skillForm.description.trim(),
                            }
                          : s
                      );
                      onUpdateCharacter({
                        ...character,
                        skills: updatedSkillsMap,
                        customSkills: nextList,
                      });
                    } else {
                      const newEntry: CustomSkillEntry = {
                        id: `skill-${Date.now()}`,
                        srdKey: skillForm.srdKey,
                        name: skillForm.name.trim(),
                        ability: skillForm.ability,
                        proficiency: skillForm.proficiency,
                        description:
                          skillForm.description.trim() ||
                          'Habilidad especial del personaje.',
                      };
                      onUpdateCharacter({
                        ...character,
                        skills: updatedSkillsMap,
                        customSkills: [...possessedSkills, newEntry],
                      });
                    }
                    setShowSkillModal(false);
                  }}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-cinzel font-bold shadow"
                >
                  Guardar Habilidad
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Spellcasting */}
      {activeTab === 'spells' && (
        <div className="space-y-4">
          <div className="bg-[#181920] border border-amber-900/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-cinzel font-bold text-amber-300 text-lg">Grimorio de Conjuros</h3>
              <p className="text-xs text-stone-400">
                Gestiona tus espacios de conjuro por nivel y conjuros preparados.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-[#121316] border border-amber-900/40 px-3 py-1.5 rounded-lg text-center">
                <div className="text-[10px] text-stone-400 uppercase">CD Salvación</div>
                <div className="font-cinzel font-black text-amber-400 text-lg">
                  {character.spellSaveDcOverride || calculateSpellSaveDC(character.abilities.int.score, profBonus)}
                </div>
              </div>
              <div className="bg-[#121316] border border-amber-900/40 px-3 py-1.5 rounded-lg text-center">
                <div className="text-[10px] text-stone-400 uppercase">Ataque Conjuro</div>
                <div className="font-cinzel font-black text-stone-100 text-lg">
                  +{character.spellAttackBonusOverride || calculateSpellAttackBonus(character.abilities.int.score, profBonus)}
                </div>
              </div>
              <button
                onClick={() => {
                  if (isLocked) {
                    if (onUnlockRequest) onUnlockRequest();
                    return;
                  }
                  setEditingSpell({
                    id: `spell-${Date.now()}`,
                    name: '',
                    level: 1,
                    school: 'Evocación',
                    castingTime: '1 Acción',
                    range: '60 pies',
                    components: 'V, S',
                    duration: 'Instantáneo',
                    description: '',
                    prepared: true,
                  });
                  setSpellForm({
                    name: '',
                    level: 1,
                    school: 'Evocación',
                    castingTime: '1 Acción',
                    range: '60 pies',
                    components: 'V, S',
                    duration: 'Instantáneo',
                    description: '',
                    prepared: true,
                  });
                }}
                className="flex items-center gap-1 px-3 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg text-xs font-cinzel font-bold transition shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Conjuro</span>
              </button>
            </div>
          </div>

          {/* Spell Slots tracker (Levels 1 to 9) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => {
              const slot = character.spellSlots.find((s) => s.level === lvl) || {
                level: lvl,
                total: lvl <= 2 ? 4 - lvl : 0,
                expended: 0,
              };

              return (
                <div key={lvl} className="bg-[#181920] border border-stone-800 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-cinzel font-bold text-amber-400/90">Nivel {lvl}</span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {slot.total - slot.expended}/{slot.total}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: slot.total }).map((_, idx) => {
                      const isUsed = idx < slot.expended;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (isLocked) {
                              if (onUnlockRequest) onUnlockRequest();
                              return;
                            }
                            const newSlots = [...character.spellSlots];
                            const existingIdx = newSlots.findIndex((s) => s.level === lvl);
                            const nextExpended = isUsed ? slot.expended - 1 : slot.expended + 1;

                            if (existingIdx >= 0) {
                              newSlots[existingIdx].expended = Math.max(0, Math.min(slot.total, nextExpended));
                            } else {
                              newSlots.push({ level: lvl, total: slot.total, expended: nextExpended });
                            }
                            onUpdateCharacter({ ...character, spellSlots: newSlots });
                          }}
                          className={`w-4 h-4 rounded-full border transition ${
                            isUsed
                              ? 'bg-stone-800 border-stone-700'
                              : 'bg-amber-500 border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                          }`}
                          title={`Espacio de nivel ${lvl} (${isUsed ? 'Gastado' : 'Disponible'})`}
                        />
                      );
                    })}
                    {slot.total === 0 && <span className="text-[10px] text-stone-600 italic">Sin espacios</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Spells List */}
          <div className="space-y-2">
            {character.spells.length === 0 ? (
              <div className="text-center py-8 bg-[#181920] border border-stone-800 rounded-xl text-stone-500 text-sm italic">
                Aún no tienes conjuros registrados. ¡Añade trucos o conjuros a tu grimorio!
              </div>
            ) : (
              character.spells.map((spell) => (
                <div
                  key={spell.id}
                  className="bg-[#181920] border border-stone-800 rounded-xl p-3.5 hover:border-amber-900/60 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (isLocked) {
                            if (onUnlockRequest) onUnlockRequest();
                            return;
                          }
                          const updated = character.spells.map((s) =>
                            s.id === spell.id ? { ...s, prepared: !s.prepared } : s
                          );
                          onUpdateCharacter({ ...character, spells: updated });
                        }}
                        className={`text-xs px-2 py-0.5 rounded font-cinzel font-bold border transition ${
                          spell.prepared
                            ? 'bg-amber-950/80 text-amber-300 border-amber-600'
                            : 'bg-stone-800 text-stone-500 border-stone-700'
                        }`}
                        title="Marcar como preparado"
                      >
                        {spell.prepared ? 'Preparado' : 'No prep.'}
                      </button>
                      <span className="font-bold font-cinzel text-stone-100">{spell.name}</span>
                      <span className="text-xs text-stone-400">
                        ({spell.level === 0 ? 'Truco' : `Nivel ${spell.level}`} - {spell.school})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          onTriggerRoll(
                            `Conjuro: ${spell.name}`,
                            calculateSpellAttackBonus(character.abilities.int.score, profBonus)
                          )
                        }
                        className="px-2 py-1 text-xs bg-amber-950 hover:bg-amber-900 border border-amber-800 text-amber-300 rounded font-semibold"
                      >
                        Lanzar
                      </button>
                      <button
                        onClick={() => {
                          if (isLocked) {
                            if (onUnlockRequest) onUnlockRequest();
                            return;
                          }
                          setEditingSpell(spell);
                          setSpellForm(spell);
                        }}
                        className="text-stone-400 hover:text-amber-400 p-1"
                        title="Editar conjuro"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (isLocked) {
                            if (onUnlockRequest) onUnlockRequest();
                            return;
                          }
                          onUpdateCharacter({
                            ...character,
                            spells: character.spells.filter((s) => s.id !== spell.id),
                          });
                        }}
                        className="text-stone-500 hover:text-red-400 p-1"
                        title="Eliminar conjuro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-stone-400 flex flex-wrap gap-x-4 gap-y-1 mb-2">
                    <span>Tiempo: {spell.castingTime}</span>
                    <span>Alcance: {spell.range}</span>
                    <span>Componentes: {spell.components}</span>
                    <span>Duración: {spell.duration}</span>
                  </div>
                  {spell.description && <div className="text-xs text-stone-300 leading-relaxed">{spell.description}</div>}
                </div>
              ))
            )}
          </div>

          {/* Edit / Add Spell Modal */}
          {editingSpell && (
            <div className="bg-[#1b1c24] border border-amber-800/80 rounded-xl p-4 mt-3 animate-in fade-in">
              <h4 className="font-cinzel font-bold text-sm text-amber-300 mb-3">
                {character.spells.some((s) => s.id === editingSpell.id) ? 'Editar Conjuro' : 'Añadir Nuevo Conjuro'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">Nombre del Conjuro</label>
                  <input
                    type="text"
                    value={spellForm.name}
                    onChange={(e) => setSpellForm({ ...spellForm, name: e.target.value })}
                    placeholder="Ej. Proyectil Mágico"
                    className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">Nivel (0 para Truco)</label>
                  <input
                    type="number"
                    min="0"
                    max="9"
                    value={spellForm.level}
                    onChange={(e) => setSpellForm({ ...spellForm, level: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">Escuela de Magia</label>
                  <input
                    type="text"
                    value={spellForm.school}
                    onChange={(e) => setSpellForm({ ...spellForm, school: e.target.value })}
                    placeholder="Evocación, Ilusión, etc."
                    className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">Tiempo de Lanzamiento</label>
                  <input
                    type="text"
                    value={spellForm.castingTime}
                    onChange={(e) => setSpellForm({ ...spellForm, castingTime: e.target.value })}
                    placeholder="1 Acción, 1 Acción Adicional"
                    className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">Alcance</label>
                  <input
                    type="text"
                    value={spellForm.range}
                    onChange={(e) => setSpellForm({ ...spellForm, range: e.target.value })}
                    placeholder="60 pies, Tacto, Personal"
                    className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">Componentes (V, S, M)</label>
                  <input
                    type="text"
                    value={spellForm.components}
                    onChange={(e) => setSpellForm({ ...spellForm, components: e.target.value })}
                    placeholder="V, S, M"
                    className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">Duración</label>
                  <input
                    type="text"
                    value={spellForm.duration}
                    onChange={(e) => setSpellForm({ ...spellForm, duration: e.target.value })}
                    placeholder="Instantáneo, Concentración (1 min)"
                    className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-[11px] font-semibold text-stone-400 mb-1">Efectos y Descripción del Conjuro</label>
                <textarea
                  value={spellForm.description}
                  onChange={(e) => setSpellForm({ ...spellForm, description: e.target.value })}
                  rows={2}
                  className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingSpell(null)} className="px-3 py-1 text-xs text-stone-400">
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (spellForm.name) {
                      const exists = character.spells.some((s) => s.id === editingSpell.id);
                      const updated = exists
                        ? character.spells.map((s) =>
                            s.id === editingSpell.id ? { ...s, ...(spellForm as SpellItem) } : s
                          )
                        : [...character.spells, { ...spellForm, id: editingSpell.id } as SpellItem];

                      onUpdateCharacter({ ...character, spells: updated });
                      setEditingSpell(null);
                    }
                  }}
                  className="px-4 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-cinzel font-bold"
                >
                  Guardar Conjuro
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Inventory & Currency */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="bg-[#181920] border border-amber-900/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-950/80 border border-amber-600/60 flex items-center justify-center text-amber-300 shadow">
                <Coins className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="font-cinzel font-bold text-amber-300 text-sm flex items-center gap-1.5">
                  Bolsa de Monedas & Tesoro
                </div>
                <div className="text-[10px] text-stone-400 font-sans">
                  Total aprox: ~{(
                    ((character.currency?.pp || 0) * 10) +
                    (character.currency?.gp || 0) +
                    ((character.currency?.ep || 0) * 0.5) +
                    ((character.currency?.sp || 0) * 0.1) +
                    ((character.currency?.cp || 0) * 0.01)
                  ).toFixed(2)} PO en valor
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {[
                  { key: 'gp', name: 'Oro', label: 'PO', color: 'text-amber-300', border: 'hover:border-amber-500/80' },
                  { key: 'sp', name: 'Plata', label: 'PP', color: 'text-stone-300', border: 'hover:border-stone-400/80' },
                  { key: 'cp', name: 'Cobre', label: 'PC', color: 'text-orange-400', border: 'hover:border-orange-500/80' },
                  { key: 'ep', name: 'Electro', label: 'PE', color: 'text-yellow-600', border: 'hover:border-yellow-600/80' },
                  { key: 'pp', name: 'Platino', label: 'PL', color: 'text-cyan-300', border: 'hover:border-cyan-400/80' },
                ].map((coin) => (
                  <button
                    key={coin.key}
                    type="button"
                    onClick={handleOpenCurrencyModal}
                    title={`Editar monedas de ${coin.name}. Haz clic para abrir la bolsa.`}
                    className={`flex items-center gap-1.5 bg-[#121316] hover:bg-stone-800/80 px-2.5 py-1.5 rounded-lg border border-stone-800 transition ${coin.border} cursor-pointer group`}
                  >
                    <span className={`font-bold font-mono text-xs sm:text-sm ${coin.color}`}>
                      {(character.currency?.[coin.key as keyof typeof character.currency] ?? 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-stone-500 group-hover:text-stone-300 uppercase font-mono font-bold">
                      {coin.label}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleOpenCurrencyModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-cinzel font-bold text-xs shadow-md transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar Bolsa</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#181920] p-3 rounded-xl border border-stone-800">
            {/* 3-Type Filter Bar: Todos / Armas / Armaduras / Objetos comunes */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                {
                  id: 'all',
                  label: `Todos (${character.inventory.length})`,
                },
                {
                  id: 'weapon',
                  label: `⚔️ Armas (${character.inventory.filter((i) => classifyInventoryItemGroup(i) === 'weapon').length})`,
                },
                {
                  id: 'armor',
                  label: `🛡️ Armaduras (${character.inventory.filter((i) => classifyInventoryItemGroup(i) === 'armor').length})`,
                },
                {
                  id: 'common',
                  label: `🎒 Objetos comunes (${character.inventory.filter((i) => classifyInventoryItemGroup(i) === 'common').length})`,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInventoryGroupFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-cinzel font-bold transition whitespace-nowrap ${
                    inventoryGroupFilter === tab.id
                      ? 'bg-amber-600 text-white shadow'
                      : 'bg-[#121316] text-stone-400 hover:text-stone-200 border border-stone-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-stone-400">
              <span>
                Peso:{' '}
                <span className={`font-bold font-mono ${totalWeight > carryCap.maxCarry ? 'text-red-400' : 'text-stone-200'}`}>
                  {totalWeight.toFixed(1)}
                </span>{' '}
                / {carryCap.maxCarry} lbs
              </span>
              <button
                type="button"
                onClick={() => {
                  if (isLocked) {
                    if (onUnlockRequest) onUnlockRequest();
                    return;
                  }
                  const defaultGroup = inventoryGroupFilter === 'all' ? 'weapon' : inventoryGroupFilter;
                  setActiveItemAttackTabIdx(0);
                  setEditingItem({
                    id: `item-${Date.now()}`,
                    name: '',
                    quantity: 1,
                    weight: 1,
                    category: defaultGroup === 'weapon' ? 'Arma' : defaultGroup === 'armor' ? 'Armadura' : 'Objeto',
                    itemGroup: defaultGroup,
                    rarity: 'Común',
                    description: '',
                    equipped: false,
                    attunement: false,
                    weaponAttacks:
                      defaultGroup === 'weapon'
                        ? [
                            {
                              id: `iatk-${Date.now()}-1`,
                              name: 'Ataque Principal',
                              description: 'Ataque base con el arma.',
                              dice: '1d6',
                              potenciador: 2,
                              damageType: 'Cortante',
                              attackBonus: 2,
                              range: '5 pies',
                            },
                          ]
                        : [],
                  });
                  setItemForm({
                    name: '',
                    quantity: 1,
                    weight: 1,
                    category: defaultGroup === 'weapon' ? 'Arma' : defaultGroup === 'armor' ? 'Armadura' : 'Objeto',
                    itemGroup: defaultGroup,
                    rarity: 'Común',
                    description: '',
                    equipped: false,
                    attunement: false,
                    weaponAttacks:
                      defaultGroup === 'weapon'
                        ? [
                            {
                              id: `iatk-${Date.now()}-1`,
                              name: 'Ataque Principal',
                              description: 'Ataque base con el arma.',
                              dice: '1d6',
                              potenciador: 2,
                              damageType: 'Cortante',
                              attackBonus: 2,
                              range: '5 pies',
                            },
                          ]
                        : [],
                  });
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold font-cinzel transition shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Objeto / Arma</span>
              </button>
            </div>
          </div>

          {/* Grouped Inventory Sections: Armas, Armaduras, Objetos comunes */}
          {(['weapon', 'armor', 'common'] as const)
            .filter((groupKey) => inventoryGroupFilter === 'all' || inventoryGroupFilter === groupKey)
            .map((groupKey) => {
              const groupItems = character.inventory.filter(
                (i) => classifyInventoryItemGroup(i) === groupKey
              );
              const groupMeta =
                groupKey === 'weapon'
                  ? {
                      title: '⚔️ Armas (Al equiparlas, sus ataques aparecen en Combate y Acciones)',
                      empty: 'No tienes armas en tu inventario.',
                      badge: 'Arma',
                    }
                  : groupKey === 'armor'
                  ? {
                      title: '🛡️ Armaduras y Escudos',
                      empty: 'No tienes armaduras registradas.',
                      badge: 'Armadura',
                    }
                  : {
                      title: '🎒 Objetos Comunes y Equipo de Aventura',
                      empty: 'No tienes objetos comunes registrados.',
                      badge: 'Objeto Común',
                    };

              return (
                <div key={groupKey} className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="font-cinzel font-bold text-sm text-amber-300">{groupMeta.title}</h4>
                    <span className="text-[11px] text-stone-400 font-mono">{groupItems.length} elemento(s)</span>
                  </div>

                  {groupItems.length === 0 ? (
                    <div className="bg-[#181920]/60 border border-stone-800/80 rounded-xl p-4 text-center text-xs text-stone-500 italic">
                      {groupMeta.empty}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {groupItems.map((item) => {
                        const isWeapon = groupKey === 'weapon';
                        const isArmor = groupKey === 'armor';
                        return (
                          <div
                            key={item.id}
                            className={`bg-[#181920] border rounded-xl p-3.5 flex flex-col justify-between transition shadow ${
                              item.equipped
                                ? 'border-amber-500/80 bg-amber-950/10'
                                : 'border-stone-800 hover:border-amber-900/60'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-stone-100 text-sm font-cinzel">
                                    {item.name}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-amber-300 font-semibold">
                                    {groupMeta.badge}
                                  </span>
                                  {item.rarity && item.rarity !== 'Común' && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                                      {item.rarity}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isLocked) {
                                        if (onUnlockRequest) onUnlockRequest();
                                        return;
                                      }
                                      setActiveItemAttackTabIdx(0);
                                      setEditingItem(item);
                                      setItemForm({
                                        ...item,
                                        itemGroup: classifyInventoryItemGroup(item),
                                        weaponAttacks:
                                          item.weaponAttacks && item.weaponAttacks.length > 0
                                            ? item.weaponAttacks
                                            : isWeapon
                                            ? [
                                                {
                                                  id: `iatk-${Date.now()}-1`,
                                                  name: `Ataque con ${item.name}`,
                                                  description: item.description || '',
                                                  dice: '1d6',
                                                  potenciador: 0,
                                                  damageType: 'Cortante',
                                                  attackBonus: 0,
                                                  range: '5 pies',
                                                },
                                              ]
                                            : [],
                                      });
                                    }}
                                    className="text-stone-400 hover:text-amber-400 p-1"
                                    title="Editar objeto"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isLocked) {
                                        if (onUnlockRequest) onUnlockRequest();
                                        return;
                                      }
                                      onUpdateCharacter({
                                        ...character,
                                        inventory: character.inventory.filter((i) => i.id !== item.id),
                                      });
                                    }}
                                    className="text-stone-500 hover:text-red-400 p-1"
                                    title="Eliminar objeto"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="text-xs text-stone-400 mb-2">
                                Cantidad: x{item.quantity} • Peso: {item.weight} lbs c/u
                              </div>
                              {item.description && (
                                <div className="text-xs text-stone-300 mb-2 leading-relaxed whitespace-pre-line">
                                  {item.description}
                                </div>
                              )}

                              {/* Weapon attacks preview */}
                              {isWeapon && item.weaponAttacks && item.weaponAttacks.length > 0 && (
                                <div className="p-2 rounded-lg bg-[#121316] border border-amber-900/40 mb-2 space-y-1">
                                  <span className="text-[10px] font-cinzel font-bold text-amber-400 uppercase block">
                                    Ataques configurados ({item.weaponAttacks.length}):
                                  </span>
                                  {item.weaponAttacks.map((atk, idx) => (
                                    <div key={atk.id || idx} className="flex items-center justify-between text-[11px]">
                                      <span className="text-stone-200 font-semibold">{atk.name}</span>
                                      <span className="font-mono text-amber-300">
                                        {formatWeaponAttackFormula(atk.dice, atk.potenciador ?? atk.bonus ?? 0)} {atk.damageType}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-2.5 border-t border-stone-800 text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isLocked) {
                                    if (onUnlockRequest) onUnlockRequest();
                                    return;
                                  }
                                  const nextEq = !item.equipped;
                                  const updated = character.inventory.map((i) =>
                                    i.id === item.id ? { ...i, equipped: nextEq } : i
                                  );
                                  onUpdateCharacter({ ...character, inventory: updated });
                                }}
                                className={`px-3 py-1.5 rounded-lg font-cinzel font-bold text-xs flex items-center gap-1.5 transition border ${
                                  item.equipped
                                    ? 'bg-amber-600 text-white border-amber-400 shadow'
                                    : 'bg-[#121316] text-stone-300 border-stone-700 hover:border-amber-500 hover:text-amber-300'
                                }`}
                              >
                                {item.equipped ? (
                                  <CheckCircle className="w-3.5 h-3.5" />
                                ) : isWeapon ? (
                                  <Sword className="w-3.5 h-3.5" />
                                ) : (
                                  <Shield className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {item.equipped
                                    ? isWeapon
                                      ? 'Arma Equipada (En Combate)'
                                      : isArmor
                                      ? 'Armadura Equipada'
                                      : 'Equipado'
                                    : 'Equipar'}
                                </span>
                              </button>

                              {item.attunement && (
                                <span className="text-[10px] text-amber-400 font-semibold tracking-wider">
                                  Requiere Sintonización
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

          {/* Edit / Add Inventory Item Modal */}
          {editingItem && (
            <div className="bg-[#1b1c24] border-2 border-amber-800/80 rounded-2xl p-4 mt-3 space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <h4 className="font-cinzel font-bold text-sm text-amber-300">
                  {character.inventory.some((i) => i.id === editingItem.id)
                    ? 'Editar Elemento del Inventario'
                    : 'Añadir al Inventario'}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="text-xs text-stone-400 hover:text-stone-200"
                >
                  ✕
                </button>
              </div>

              {/* 3-Type Selector: Arma / Armadura / Objeto común */}
              <div>
                <label className="block text-[11px] font-cinzel font-bold text-amber-300 uppercase mb-1.5">
                  Tipo de Elemento en el Inventario:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'weapon', label: '⚔️ Arma', cat: 'Arma' },
                    { id: 'armor', label: '🛡️ Armadura', cat: 'Armadura' },
                    { id: 'common', label: '🎒 Objeto común', cat: 'Objeto' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        const existingAtks =
                          itemForm.weaponAttacks && itemForm.weaponAttacks.length > 0
                            ? itemForm.weaponAttacks
                            : [
                                {
                                  id: `iatk-${Date.now()}-1`,
                                  name: 'Ataque Principal',
                                  description: 'Ataque base con el arma.',
                                  dice: '1d6',
                                  potenciador: 2,
                                  damageType: 'Cortante',
                                  attackBonus: 2,
                                  range: '5 pies',
                                },
                              ];
                        setItemForm({
                          ...itemForm,
                          itemGroup: g.id as any,
                          category: g.cat as any,
                          weaponAttacks: g.id === 'weapon' ? existingAtks : itemForm.weaponAttacks,
                        });
                      }}
                      className={`py-2 px-3 rounded-lg border text-xs font-cinzel font-bold transition ${
                        (itemForm.itemGroup || classifyInventoryItemGroup(itemForm as InventoryItem)) === g.id
                          ? 'bg-amber-600/25 border-amber-500 text-amber-200 shadow'
                          : 'bg-[#121316] border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    placeholder="Ej. Espada de Fuego, Cota de Malla, Cuerda..."
                    className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({ ...itemForm, quantity: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">Peso Unitario (lbs)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={itemForm.weight}
                    onChange={(e) => setItemForm({ ...itemForm, weight: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
                  />
                </div>
              </div>

              {/* Weapon Multi-Attack Tabs inside Player Inventory Modal */}
              {(itemForm.itemGroup || classifyInventoryItemGroup(itemForm as InventoryItem)) === 'weapon' && (
                <div className="p-3 rounded-xl bg-[#121316] border border-amber-700/60 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-800">
                    <span className="text-xs font-cinzel font-bold text-amber-300">
                      Ataques del Arma (Se mostrarán en Combate y Acciones al equipar):
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-stone-400 mr-1">Cantidad de ataques:</span>
                      {[1, 2, 3, 4].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => handleSetItemFormAttackCount(n)}
                          className={`w-6 h-6 rounded text-xs font-bold border ${
                            (itemForm.weaponAttacks || []).length === n
                              ? 'bg-amber-600 text-white border-amber-400'
                              : 'bg-[#181920] text-stone-400 border-stone-700'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Attack Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {(itemForm.weaponAttacks || []).map((atk, idx) => (
                      <button
                        key={atk.id || idx}
                        type="button"
                        onClick={() => setActiveItemAttackTabIdx(idx)}
                        className={`px-2.5 py-1 rounded text-xs font-cinzel font-bold border whitespace-nowrap ${
                          activeItemAttackTabIdx === idx
                            ? 'bg-amber-600 text-white border-amber-400'
                            : 'bg-[#181920] text-stone-400 border-stone-800'
                        }`}
                      >
                        Pestaña {idx + 1}: {atk.name || `Ataque ${idx + 1}`} (
                        {formatWeaponAttackFormula(atk.dice || '1d6', atk.potenciador || 0)})
                      </button>
                    ))}
                  </div>

                  {(() => {
                    const currentAtk =
                      (itemForm.weaponAttacks || [])[activeItemAttackTabIdx] ||
                      (itemForm.weaponAttacks || [])[0];
                    const editIdx = (itemForm.weaponAttacks || [])[activeItemAttackTabIdx]
                      ? activeItemAttackTabIdx
                      : 0;
                    if (!currentAtk) return null;
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-0.5">Tipo / Nombre de Ataque</label>
                          <input
                            type="text"
                            value={currentAtk.name || ''}
                            onChange={(e) => handleUpdateItemFormAttackTab(editIdx, { name: e.target.value })}
                            placeholder="Ej. Ataque de Fuego"
                            className="w-full bg-[#181920] border border-stone-700 rounded px-2 py-1 text-xs text-stone-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-0.5">Dado (ej. 1d6, 1d8)</label>
                          <input
                            type="text"
                            value={currentAtk.dice || '1d6'}
                            onChange={(e) => handleUpdateItemFormAttackTab(editIdx, { dice: e.target.value })}
                            className="w-full bg-[#181920] border border-stone-700 rounded px-2 py-1 text-xs text-amber-300 font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-0.5">Potenciador (+Bono)</label>
                          <input
                            type="number"
                            value={currentAtk.potenciador ?? 0}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 0;
                              handleUpdateItemFormAttackTab(editIdx, { potenciador: val, attackBonus: val });
                            }}
                            className="w-full bg-[#181920] border border-stone-700 rounded px-2 py-1 text-xs text-amber-300 font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-0.5">Tipo de Daño</label>
                          <input
                            type="text"
                            value={currentAtk.damageType || 'Cortante'}
                            onChange={(e) => handleUpdateItemFormAttackTab(editIdx, { damageType: e.target.value })}
                            className="w-full bg-[#181920] border border-stone-700 rounded px-2 py-1 text-xs text-stone-100"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] text-stone-400 mb-0.5">Descripción del Ataque</label>
                          <input
                            type="text"
                            value={currentAtk.description || ''}
                            onChange={(e) => handleUpdateItemFormAttackTab(editIdx, { description: e.target.value })}
                            placeholder="Descripción del efecto del ataque..."
                            className="w-full bg-[#181920] border border-stone-700 rounded px-2 py-1 text-xs text-stone-100"
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-stone-400 mb-1">Descripción y Propiedades</label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  rows={2}
                  placeholder="Detalles, apariencia, uso..."
                  className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
                />
              </div>

              <div className="flex items-center gap-4 text-xs text-stone-300">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemForm.equipped}
                    onChange={(e) => setItemForm({ ...itemForm, equipped: e.target.checked })}
                    className="rounded border-stone-700 text-amber-600 focus:ring-0"
                  />
                  <span>Equipado</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemForm.attunement}
                    onChange={(e) => setItemForm({ ...itemForm, attunement: e.target.checked })}
                    className="rounded border-stone-700 text-amber-600 focus:ring-0"
                  />
                  <span>Requiere Sintonización</span>
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingItem(null)} className="px-3 py-1 text-xs text-stone-400">
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (itemForm.name) {
                      const exists = character.inventory.some((i) => i.id === editingItem.id);
                      const updated = exists
                        ? character.inventory.map((i) =>
                            i.id === editingItem.id ? { ...i, ...(itemForm as InventoryItem) } : i
                          )
                        : [...character.inventory, { ...itemForm, id: editingItem.id } as InventoryItem];

                      onUpdateCharacter({ ...character, inventory: updated });
                      setEditingItem(null);
                    }
                  }}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-cinzel font-bold shadow"
                >
                  Guardar en Inventario
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Features, Personality & Backstory */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          {/* Quick Identity Summary & Edit Card */}
          <div className="bg-[#181920] border border-amber-900/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-cinzel font-bold text-amber-300 text-sm">
                Identidad del Personaje (Raza, Clase y Alineamiento)
              </h4>
              <p className="text-xs text-stone-300 mt-0.5">
                <strong>Raza:</strong> {character.race}{' '}
                {character.subrace ? `(${character.subrace})` : ''} •{' '}
                <strong>Clase:</strong> {character.characterClass}{' '}
                {character.subclass ? `(${character.subclass})` : ''} (Nivel {character.level}) •{' '}
                <strong>Alineamiento:</strong> {character.alignment} •{' '}
                <strong>Trasfondo:</strong> {character.background}
              </p>
            </div>
            {!isLocked && (
              <button
                type="button"
                onClick={handleOpenIdentityModal}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold text-xs shadow transition flex items-center gap-1.5 shrink-0"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Modificar Raza / Clase / Alineamiento</span>
              </button>
            )}
          </div>

          <div className="bg-[#181920] border border-stone-800 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <label className="font-cinzel font-bold text-amber-300 text-sm">
                Trasfondo del Personaje (Background)
              </label>
              <span className="text-[10px] text-emerald-400 font-mono">Autoguardado activo</span>
            </div>
            <input
              type="text"
              disabled={isLocked}
              value={character.background || ''}
              onChange={(e) => onUpdateCharacter({ ...character, background: e.target.value })}
              placeholder="Ej. Sabio, Soldado, Criminal, Acólito, Forastero, Noble..."
              className="w-full bg-[#121316] border border-stone-700 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-stone-100 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#181920] border border-stone-800 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h4 className="font-cinzel font-bold text-amber-300 text-sm">Rasgos de Personalidad</h4>
                <span className="text-[10px] text-stone-500 font-mono">Editable</span>
              </div>
              <textarea
                rows={3}
                disabled={isLocked}
                value={character.personalityTraits || ''}
                onChange={(e) => onUpdateCharacter({ ...character, personalityTraits: e.target.value })}
                placeholder="Describe cómo actúa tu personaje, sus manías, virtudes o costumbres..."
                className="w-full bg-[#121316] border border-stone-700 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-stone-200 leading-relaxed outline-none resize-y"
              />
            </div>

            <div className="bg-[#181920] border border-stone-800 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h4 className="font-cinzel font-bold text-amber-300 text-sm">Ideales</h4>
                <span className="text-[10px] text-stone-500 font-mono">Editable</span>
              </div>
              <textarea
                rows={3}
                disabled={isLocked}
                value={character.ideals || ''}
                onChange={(e) => onUpdateCharacter({ ...character, ideals: e.target.value })}
                placeholder="¿Qué principios morales, éticos o creencias impulsan a tu personaje?"
                className="w-full bg-[#121316] border border-stone-700 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-stone-200 leading-relaxed outline-none resize-y"
              />
            </div>

            <div className="bg-[#181920] border border-stone-800 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h4 className="font-cinzel font-bold text-amber-300 text-sm">Vínculos</h4>
                <span className="text-[10px] text-stone-500 font-mono">Editable</span>
              </div>
              <textarea
                rows={3}
                disabled={isLocked}
                value={character.bonds || ''}
                onChange={(e) => onUpdateCharacter({ ...character, bonds: e.target.value })}
                placeholder="Personas, lugares, reliquias o promesas que tu personaje juró proteger..."
                className="w-full bg-[#121316] border border-stone-700 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-stone-200 leading-relaxed outline-none resize-y"
              />
            </div>

            <div className="bg-[#181920] border border-stone-800 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h4 className="font-cinzel font-bold text-amber-300 text-sm">Defectos</h4>
                <span className="text-[10px] text-stone-500 font-mono">Editable</span>
              </div>
              <textarea
                rows={3}
                disabled={isLocked}
                value={character.flaws || ''}
                onChange={(e) => onUpdateCharacter({ ...character, flaws: e.target.value })}
                placeholder="Miedos, vicios, debilidades o secretos que pueden poner en riesgo a tu personaje..."
                className="w-full bg-[#121316] border border-stone-700 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-stone-200 leading-relaxed outline-none resize-y"
              />
            </div>
          </div>

          <div className="bg-[#181920] border border-stone-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-cinzel font-bold text-amber-300 text-sm">Rasgos Especiales y Dotes</h4>
                <p className="text-[11px] text-stone-400">
                  Agrega o edita rasgos de raza, clase, trasfondo o dotes especiales de tu personaje.
                </p>
              </div>
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTraitId(null);
                    setTraitForm({ name: '', source: 'Raza / Clase / Dote', description: '' });
                    setShowTraitForm(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-cinzel font-bold text-xs flex items-center gap-1.5 transition shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Agregar Rasgo Especial</span>
                </button>
              )}
            </div>

            {showTraitForm && !isLocked && (
              <div className="bg-[#121316] border border-amber-700/70 rounded-xl p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-cinzel font-bold uppercase text-stone-400 mb-1">
                      Nombre del Rasgo o Dote *
                    </label>
                    <input
                      type="text"
                      value={traitForm.name}
                      onChange={(e) => setTraitForm({ ...traitForm, name: e.target.value })}
                      placeholder="Ej. Visión en la Oscuridad, Ataque Furtivo, Afortunado..."
                      className="w-full bg-[#181920] border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-cinzel font-bold uppercase text-stone-400 mb-1">
                      Origen / Fuente
                    </label>
                    <input
                      type="text"
                      value={traitForm.source}
                      onChange={(e) => setTraitForm({ ...traitForm, source: e.target.value })}
                      placeholder="Ej. Raza (Elfo), Clase (Pícaro), Dote..."
                      className="w-full bg-[#181920] border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-cinzel font-bold uppercase text-stone-400 mb-1">
                    Descripción del Rasgo Especial
                  </label>
                  <textarea
                    rows={3}
                    value={traitForm.description}
                    onChange={(e) => setTraitForm({ ...traitForm, description: e.target.value })}
                    placeholder="Explica qué efecto o beneficio otorga este rasgo..."
                    className="w-full bg-[#181920] border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTraitForm(false);
                      setEditingTraitId(null);
                    }}
                    className="px-3 py-1 rounded-lg text-xs text-stone-400 hover:bg-stone-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTrait}
                    className="px-3.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold text-xs"
                  >
                    {editingTraitId ? 'Guardar Cambios' : 'Agregar Rasgo'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              {(character.featuresAndTraits || []).length === 0 ? (
                <p className="text-xs text-stone-500 italic">
                  No hay rasgos especiales registrados aún. Usa "+ Agregar Rasgo Especial" para añadir uno.
                </p>
              ) : (
                (character.featuresAndTraits || []).map((f) => (
                  <div key={f.id} className="p-3 bg-[#121316] rounded-lg border border-stone-800 hover:border-amber-900/50 transition">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div>
                        <span className="font-bold text-xs text-amber-200 mr-2">{f.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-stone-400 uppercase font-mono">
                          {f.source}
                        </span>
                      </div>
                      {!isLocked && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTraitId(f.id);
                              setTraitForm({
                                name: f.name,
                                source: f.source || 'Rasgo Especial',
                                description: f.description || '',
                              });
                              setShowTraitForm(true);
                            }}
                            className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-amber-300"
                            title="Editar rasgo especial"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTrait(f.id)}
                            className="p-1 rounded hover:bg-red-950/60 text-stone-500 hover:text-red-400"
                            title="Eliminar rasgo especial"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-stone-300 whitespace-pre-line leading-relaxed">{f.description}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-[#181920] border border-stone-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h4 className="font-cinzel font-bold text-amber-300 text-sm">Historia del Personaje (Historial)</h4>
              <span className="text-[10px] text-emerald-400 font-mono">Autoguardado activo</span>
            </div>
            <textarea
              rows={5}
              disabled={isLocked}
              value={character.backstory || ''}
              onChange={(e) => onUpdateCharacter({ ...character, backstory: e.target.value })}
              placeholder="Escribe aquí el pasado, origen, familia, hazañas previas y motivaciones de tu personaje..."
              className="w-full bg-[#121316] border border-stone-700 focus:border-amber-500 rounded-lg px-3.5 py-2.5 text-xs text-stone-200 leading-relaxed outline-none resize-y"
            />
          </div>
        </div>
      )}

      {/* TAB 6: Diario del Jugador (Create, Edit, Delete entries & Auto-saved Quick Notes) */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          <div className="bg-[#181920] border border-amber-900/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow">
            <div>
              <h3 className="font-cinzel font-bold text-lg text-amber-300 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <span>Diario del Jugador</span>
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Registra tus notas de sesión, pistas, eventos importantes y crónicas de la aventura. Todo se autoguarda automáticamente en la nube.
              </p>
            </div>
            {!isLocked && (
              <button
                type="button"
                onClick={() => {
                  const currentList = character.playerJournal || [];
                  const nextSession =
                    currentList.length > 0
                      ? Math.max(...currentList.map((j) => Number(j.sessionNumber) || 1)) + 1
                      : 1;
                  setEditingJournalId(null);
                  setJournalForm({
                    sessionNumber: nextSession,
                    title: '',
                    dateInGame: '',
                    summary: '',
                    notes: '',
                  });
                  setShowJournalModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold text-xs shadow transition shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nueva Nota del Diario</span>
              </button>
            )}
          </div>

          {/* Quick Auto-saving Scratchpad Notes for the Player */}
          <div className="bg-[#181920] border border-stone-800 rounded-xl p-4 space-y-2 shadow">
            <div className="flex items-center justify-between">
              <label className="font-cinzel font-bold text-xs text-amber-300 uppercase tracking-wider">
                Apuntes Rápidos del Jugador (Autoguardado instantáneo):
              </label>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>Autoguardado activo</span>
              </span>
            </div>
            <textarea
              rows={3}
              disabled={isLocked}
              value={character.notes || ''}
              onChange={(e) => {
                onUpdateCharacter({
                  ...character,
                  notes: e.target.value,
                });
              }}
              placeholder="Escribe aquí apuntes rápidos, nombres de NPCs, acertijos o recordatorios de la sesión..."
              className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 leading-relaxed focus:border-amber-500 outline-none"
            />
          </div>

          {/* Search bar for Player Journal Entries */}
          {(character.playerJournal || []).length > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={journalSearch}
                onChange={(e) => setJournalSearch(e.target.value)}
                placeholder="Buscar en tus entradas del Diario del Jugador..."
                className="w-full bg-[#181920] border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-200 focus:border-amber-600 outline-none"
              />
            </div>
          )}

          {/* Create / Edit Journal Modal Inline */}
          {showJournalModal && (
            <div className="bg-[#1b1c24] border-2 border-amber-700/80 rounded-2xl p-4 space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <h4 className="font-cinzel font-bold text-sm text-amber-300">
                  {editingJournalId ? 'Editar Entrada del Diario del Jugador' : 'Nueva Entrada del Diario del Jugador'}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowJournalModal(false)}
                  className="text-xs text-stone-400 hover:text-stone-200"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">Sesión #</label>
                  <input
                    type="number"
                    min={1}
                    value={journalForm.sessionNumber}
                    onChange={(e) =>
                      setJournalForm({ ...journalForm, sessionNumber: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-amber-300 font-mono font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                    Título de la Entrada / Crónica
                  </label>
                  <input
                    type="text"
                    value={journalForm.title}
                    onChange={(e) => setJournalForm({ ...journalForm, title: e.target.value })}
                    placeholder="Ej. El Secreto de la Cripta Hundida"
                    className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                    Fecha en el Mundo (Opcional)
                  </label>
                  <input
                    type="text"
                    value={journalForm.dateInGame}
                    onChange={(e) => setJournalForm({ ...journalForm, dateInGame: e.target.value })}
                    placeholder="Ej. Día 14 de Tarsakh"
                    className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                  Resumen de lo que ha estado pasando:
                </label>
                <textarea
                  rows={2}
                  value={journalForm.summary}
                  onChange={(e) => setJournalForm({ ...journalForm, summary: e.target.value })}
                  placeholder="Resumen principal de los acontecimientos de esta sesión..."
                  className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                  Notas detalladas, pistas, botín o decisiones:
                </label>
                <textarea
                  rows={3}
                  value={journalForm.notes}
                  onChange={(e) => setJournalForm({ ...journalForm, notes: e.target.value })}
                  placeholder="Detalles adicionales, pistas del misterio, promesas o planes del grupo..."
                  className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowJournalModal(false)}
                  className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!journalForm.title.trim()) return;
                    const currentEntries = character.playerJournal || [];
                    if (editingJournalId) {
                      const updated = currentEntries.map((entry) =>
                        entry.id === editingJournalId
                          ? {
                              ...entry,
                              sessionNumber: journalForm.sessionNumber,
                              title: journalForm.title.trim(),
                              dateInGame: journalForm.dateInGame.trim() || 'En curso',
                              summary: journalForm.summary.trim(),
                              notes: journalForm.notes.trim(),
                            }
                          : entry
                      );
                      onUpdateCharacter({
                        ...character,
                        playerJournal: updated,
                      });
                    } else {
                      const newEntry: PlayerJournalEntry = {
                        id: `pjournal-${Date.now()}`,
                        sessionNumber: journalForm.sessionNumber,
                        title: journalForm.title.trim(),
                        dateInGame: journalForm.dateInGame.trim() || 'En curso',
                        realDate: new Date().toISOString().slice(0, 10),
                        summary: journalForm.summary.trim(),
                        notes: journalForm.notes.trim(),
                      };
                      onUpdateCharacter({
                        ...character,
                        playerJournal: [newEntry, ...currentEntries],
                      });
                    }
                    setShowJournalModal(false);
                  }}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-cinzel font-bold shadow"
                >
                  Guardar en el Diario
                </button>
              </div>
            </div>
          )}

          {/* Entries List */}
          {(() => {
            const entries = (character.playerJournal || []).filter(
              (e) =>
                !journalSearch.trim() ||
                e.title.toLowerCase().includes(journalSearch.toLowerCase()) ||
                e.summary.toLowerCase().includes(journalSearch.toLowerCase()) ||
                e.notes.toLowerCase().includes(journalSearch.toLowerCase())
            );
            if (entries.length === 0) {
              return (
                <div className="bg-[#181920] border border-stone-800 rounded-2xl p-8 text-center text-stone-400 text-xs space-y-2">
                  <p className="font-cinzel font-bold text-amber-300 text-sm">
                    Tu Diario del Jugador aún no tiene entradas por sesión
                  </p>
                  <p>
                    Haz clic en <strong>"+ Nueva Nota del Diario"</strong> para registrar tus crónicas, descubrimientos y notas de campaña.
                  </p>
                </div>
              );
            }
            return (
              <div className="space-y-3">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-[#181920] border border-stone-800 hover:border-amber-800/70 rounded-xl p-4 shadow transition space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-700/70 text-amber-300 font-mono font-bold text-[11px]">
                            Sesión #{entry.sessionNumber}
                          </span>
                          <h4 className="font-cinzel font-bold text-stone-100 text-sm sm:text-base">
                            {entry.title}
                          </h4>
                          {entry.dateInGame && (
                            <span className="text-[11px] text-stone-400">• {entry.dateInGame}</span>
                          )}
                        </div>
                      </div>

                      {!isLocked && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingJournalId(entry.id);
                              setJournalForm({
                                sessionNumber: entry.sessionNumber,
                                title: entry.title,
                                dateInGame: entry.dateInGame || '',
                                summary: entry.summary || '',
                                notes: entry.notes || '',
                              });
                              setShowJournalModal(true);
                            }}
                            className="p-1.5 text-stone-400 hover:text-amber-300 rounded hover:bg-stone-800"
                            title="Editar nota del diario"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateCharacter({
                                ...character,
                                playerJournal: (character.playerJournal || []).filter(
                                  (j) => j.id !== entry.id
                                ),
                              });
                            }}
                            className="p-1.5 text-stone-500 hover:text-red-400 rounded hover:bg-stone-800"
                            title="Borrar nota del diario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {entry.summary && (
                      <div className="text-xs text-amber-100/90 bg-[#121316] p-2.5 rounded-lg border border-stone-800/80 leading-relaxed">
                        <strong className="text-amber-400 block text-[10px] uppercase mb-0.5">
                          Resumen de lo ocurrido:
                        </strong>
                        {entry.summary}
                      </div>
                    )}

                    {entry.notes && (
                      <p className="text-xs text-stone-300 leading-relaxed whitespace-pre-line">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* HP Adjustment Modal */}
      {showHpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#181920] border-2 border-stone-700 rounded-xl p-5 text-stone-200 shadow-2xl">
            <h3 className="font-cinzel font-bold text-lg mb-3 text-stone-100">
              {hpModalMode === 'heal'
                ? 'Curar Puntos de Golpe'
                : hpModalMode === 'damage'
                ? 'Recibir Daño'
                : 'Asignar PG Temporales'}
            </h3>
            <p className="text-xs text-stone-400 mb-4">
              Ingresa la cantidad a {hpModalMode === 'heal' ? 'recuperar' : hpModalMode === 'damage' ? 'restar' : 'establecer'}:
            </p>
            <div className="flex items-center gap-3 mb-5">
              <input
                type="number"
                min="1"
                value={hpChangeAmount}
                onChange={(e) => setHpChangeAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full bg-[#121316] border border-stone-700 text-2xl font-mono font-bold text-center rounded py-2 text-amber-400"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowHpModal(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-400 hover:text-stone-200"
              >
                Cancelar
              </button>
              <button
                onClick={applyHpChange}
                className={`px-5 py-2 text-xs font-cinzel font-bold rounded text-white shadow ${
                  hpModalMode === 'heal'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : hpModalMode === 'damage'
                    ? 'bg-red-700 hover:bg-red-600'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Currency Adjustment Modal */}
      {showCurrencyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-[#181920] border-2 border-amber-900/80 rounded-3xl p-6 sm:p-7 text-stone-200 shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-950 border border-amber-500/80 flex items-center justify-center text-amber-200 shadow-md">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-cinzel font-bold text-lg text-amber-300">
                    Bolsa de Monedas y Tesoro
                  </h3>
                  <p className="text-xs text-stone-400">
                    Ajusta o escribe la cantidad de monedas que porta {character.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCurrencyModal(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCurrency} className="flex-1 overflow-y-auto space-y-5 pr-1">
              {/* Total Worth Summary */}
              <div className="bg-gradient-to-r from-amber-950/50 via-stone-900 to-amber-950/50 border border-amber-900/50 rounded-2xl p-3.5 flex items-center justify-between">
                <span className="text-xs font-cinzel font-semibold text-stone-300">
                  Valor Estimado Total:
                </span>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  ~{(
                    ((Number(currencyForm.pp) || 0) * 10) +
                    (Number(currencyForm.gp) || 0) +
                    ((Number(currencyForm.ep) || 0) * 0.5) +
                    ((Number(currencyForm.sp) || 0) * 0.1) +
                    ((Number(currencyForm.cp) || 0) * 0.01)
                  ).toFixed(2)} Piezas de Oro (PO)
                </span>
              </div>

              {/* Coins Input Grid */}
              <div className="space-y-3">
                {[
                  {
                    key: 'gp' as const,
                    name: 'Piezas de Oro (PO)',
                    abbr: 'PO / GP',
                    color: 'text-amber-300',
                    border: 'border-amber-600/60 focus-within:border-amber-400',
                    btnBg: 'hover:bg-amber-900/60 text-amber-300',
                    desc: 'Moneda estándar de comercio (1 PO = 10 PP = 100 PC)',
                  },
                  {
                    key: 'sp' as const,
                    name: 'Piezas de Plata (PP)',
                    abbr: 'PP / SP',
                    color: 'text-stone-300',
                    border: 'border-stone-600/60 focus-within:border-stone-300',
                    btnBg: 'hover:bg-stone-800 text-stone-300',
                    desc: 'Usada para gastos cotidianos (10 PP = 1 PO)',
                  },
                  {
                    key: 'cp' as const,
                    name: 'Piezas de Cobre (PC)',
                    abbr: 'PC / CP',
                    color: 'text-orange-400',
                    border: 'border-orange-600/60 focus-within:border-orange-400',
                    btnBg: 'hover:bg-orange-950/60 text-orange-400',
                    desc: 'Monedas de menor denominación (100 PC = 1 PO)',
                  },
                  {
                    key: 'ep' as const,
                    name: 'Piezas de Electro (PE)',
                    abbr: 'PE / EP',
                    color: 'text-yellow-600',
                    border: 'border-yellow-700/60 focus-within:border-yellow-500',
                    btnBg: 'hover:bg-yellow-950/60 text-yellow-500',
                    desc: 'Aleación antigua (1 PE = 0.5 PO = 5 PP)',
                  },
                  {
                    key: 'pp' as const,
                    name: 'Piezas de Platino (PL)',
                    abbr: 'PL / PP',
                    color: 'text-cyan-300',
                    border: 'border-cyan-600/60 focus-within:border-cyan-400',
                    btnBg: 'hover:bg-cyan-950/60 text-cyan-300',
                    desc: 'Moneda de alto valor (1 PL = 10 PO)',
                  },
                ].map((c) => (
                  <div
                    key={c.key}
                    className={`bg-[#121316] border ${c.border} rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-cinzel font-bold text-xs ${c.color}`}>
                          {c.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-400 font-semibold">
                          {c.abbr}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-0.5">{c.desc}</p>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => adjustQuickCurrency(c.key, -10)}
                        className={`w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 font-mono text-xs font-bold transition flex items-center justify-center ${c.btnBg}`}
                        title="Restar 10"
                      >
                        -10
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustQuickCurrency(c.key, -1)}
                        className={`w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 font-mono text-xs font-bold transition flex items-center justify-center ${c.btnBg}`}
                        title="Restar 1"
                      >
                        -1
                      </button>

                      <input
                        type="number"
                        min="0"
                        value={currencyForm[c.key]}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setCurrencyForm((prev) => ({ ...prev, [c.key]: val }));
                        }}
                        className={`w-20 bg-stone-900/90 border border-stone-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sm outline-none ${c.color}`}
                      />

                      <button
                        type="button"
                        onClick={() => adjustQuickCurrency(c.key, 1)}
                        className={`w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 font-mono text-xs font-bold transition flex items-center justify-center ${c.btnBg}`}
                        title="Sumar 1"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustQuickCurrency(c.key, 10)}
                        className={`w-7 h-7 rounded-lg bg-stone-900 border border-stone-800 font-mono text-xs font-bold transition flex items-center justify-center ${c.btnBg}`}
                        title="Sumar 10"
                      >
                        +10
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botones de acción rápida de botín */}
              <div className="bg-[#121316] border border-stone-800 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-cinzel font-bold text-stone-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Ajuste Rápido de Botín / Compra
                  </span>
                  <div className="flex items-center gap-1">
                    {(['gp', 'sp', 'cp', 'pp'] as const).map((coin) => (
                      <button
                        key={coin}
                        type="button"
                        onClick={() => setQuickCoin(coin)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition ${
                          quickCoin === coin
                            ? 'bg-amber-600 text-white'
                            : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {coin}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                  {[-100, -50, -25, -5, +5, +25, +50, +100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => adjustQuickCurrency(quickCoin, amt)}
                      className={`py-1 rounded-lg text-[11px] font-mono font-bold transition border ${
                        amt > 0
                          ? 'bg-emerald-950/60 border-emerald-800/70 text-emerald-300 hover:bg-emerald-900'
                          : 'bg-red-950/60 border-red-800/70 text-red-300 hover:bg-red-900'
                      }`}
                    >
                      {amt > 0 ? `+${amt}` : amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 border-t border-stone-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCurrencyModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-cinzel text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Guardar Monedas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Avatar Customizer Modal */}
      {isAvatarModalOpen && (
        <AvatarCustomizerModal
          isOpen={isAvatarModalOpen}
          onClose={() => setIsAvatarModalOpen(false)}
          title={`Icono / Avatar de ${character.name}`}
          currentType={character.avatarType || (character.avatarUrl ? 'custom' : 'icon')}
          currentCustomUrl={character.avatarCustomUrl || character.avatarUrl}
          currentIconId={character.avatarIcon || 'anonymous'}
          category="player"
          onSave={(data) => {
            onUpdateCharacter({
              ...character,
              avatarType: data.type,
              avatarCustomUrl: data.customUrl,
              avatarUrl: data.customUrl,
              avatarIcon: data.iconId,
            });
          }}
        />
      )}

      {/* Character Identity Editor Modal (Modify Race, Class, Alignment, Level, Background after creation) */}
      {isIdentityModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-[#181920] border-2 border-amber-700/80 rounded-3xl p-6 text-stone-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-950 border border-amber-600/80 flex items-center justify-center text-amber-300">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-cinzel font-bold text-base text-amber-300">
                    Modificar Identidad del Personaje
                  </h3>
                  <p className="text-xs text-stone-400">
                    Cambia la raza, clase, alineamiento, nivel o nombre de tu ficha
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsIdentityModalOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIdentity} className="space-y-4">
              {/* Name & Level */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-cinzel font-bold text-stone-300 mb-1">
                    Nombre del Personaje:
                  </label>
                  <input
                    type="text"
                    value={identityForm.name}
                    onChange={(e) => setIdentityForm({ ...identityForm, name: e.target.value })}
                    className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:border-amber-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-cinzel font-bold text-amber-300 mb-1">
                    Nivel (1 - 20):
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setIdentityForm((prev) => ({
                          ...prev,
                          level: Math.max(1, (Number(prev.level) || 1) - 1),
                        }))
                      }
                      className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition"
                      title="Bajar Nivel"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <select
                      value={identityForm.level}
                      onChange={(e) =>
                        setIdentityForm({
                          ...identityForm,
                          level: Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)),
                        })
                      }
                      className="w-full bg-[#121316] border border-amber-700/80 rounded-xl px-2 py-2 text-xs text-amber-300 font-mono font-bold text-center"
                    >
                      {Array.from({ length: 20 }, (_, i) => i + 1).map((lvl) => (
                        <option key={lvl} value={lvl}>
                          Nivel {lvl}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setIdentityForm((prev) => ({
                          ...prev,
                          level: Math.min(20, (Number(prev.level) || 1) + 1),
                        }))
                      }
                      className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition"
                      title="Subir Nivel"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Race & Subrace */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#14151c] border border-stone-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-cinzel font-bold text-amber-300">
                      Raza:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isCustomRace) {
                          setIsCustomRace(true);
                          setIdentityForm({ ...identityForm, race: '' });
                        } else {
                          setIsCustomRace(false);
                          setIdentityForm({ ...identityForm, race: 'Humano' });
                        }
                      }}
                      className="text-[10px] font-cinzel font-bold text-amber-300 hover:text-amber-200 underline"
                    >
                      {isCustomRace ? 'Elegir del manual' : '✨ Raza personalizada'}
                    </button>
                  </div>

                  <select
                    value={isCustomRace ? '__custom__' : identityForm.race}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomRace(true);
                        if (SRD_RACES.some((r) => r.name === identityForm.race)) {
                          setIdentityForm({ ...identityForm, race: '' });
                        }
                      } else {
                        setIsCustomRace(false);
                        setIdentityForm({ ...identityForm, race: e.target.value });
                      }
                    }}
                    className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                  >
                    {SRD_RACES.map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                    <option value="__custom__">✨ Raza Personalizada (Poner mi propia raza)</option>
                  </select>

                  <div>
                    <label className="block text-[10px] text-amber-300/90 font-semibold mb-1">
                      {isCustomRace
                        ? 'Escribe tu Raza Personalizada:'
                        : 'O escribe aquí cualquier raza personalizada:'}
                    </label>
                    <input
                      type="text"
                      value={identityForm.race}
                      onChange={(e) => {
                        const val = e.target.value;
                        setIsCustomRace(!SRD_RACES.some((r) => r.name === val));
                        setIdentityForm({ ...identityForm, race: val });
                      }}
                      placeholder="Ej. Aasimar, Tabaxi, Vampiro, Forjado..."
                      className={`w-full bg-[#121316] border rounded-lg px-2.5 py-1.5 text-xs text-stone-100 ${
                        isCustomRace ? 'border-amber-500 font-bold' : 'border-stone-800'
                      }`}
                    />
                  </div>
                </div>

                <div className="bg-[#14151c] border border-stone-800 rounded-xl p-3 space-y-2">
                  <label className="block text-xs font-cinzel font-bold text-stone-300">
                    Subraza / Linaje (Opcional):
                  </label>
                  <input
                    type="text"
                    value={identityForm.subrace}
                    onChange={(e) => setIdentityForm({ ...identityForm, subrace: e.target.value })}
                    placeholder="Ej. Elfo de los Bosques, Enano de las Colinas..."
                    className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                  />
                  <p className="text-[10px] text-stone-500 leading-relaxed">
                    Puedes especificar una variante racial, linaje o subraza de tu personaje.
                  </p>
                </div>
              </div>

              {/* Class & Subclass */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#14151c] border border-stone-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-cinzel font-bold text-amber-300">
                      Clase:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isCustomClass) {
                          setIsCustomClass(true);
                          setIdentityForm({ ...identityForm, characterClass: '' });
                        } else {
                          setIsCustomClass(false);
                          setIdentityForm({ ...identityForm, characterClass: 'Guerrero' });
                        }
                      }}
                      className="text-[10px] font-cinzel font-bold text-amber-300 hover:text-amber-200 underline"
                    >
                      {isCustomClass ? 'Elegir del manual' : '✨ Clase personalizada'}
                    </button>
                  </div>

                  <select
                    value={isCustomClass ? '__custom__' : identityForm.characterClass}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomClass(true);
                        if (Object.keys(SRD_CLASSES).includes(identityForm.characterClass)) {
                          setIdentityForm({ ...identityForm, characterClass: '' });
                        }
                      } else {
                        setIsCustomClass(false);
                        setIdentityForm({ ...identityForm, characterClass: e.target.value });
                      }
                    }}
                    className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                  >
                    {Object.keys(SRD_CLASSES).map((cls) => (
                      <option key={cls} value={cls}>
                        {cls} ({SRD_CLASSES[cls].hitDie})
                      </option>
                    ))}
                    <option value="__custom__">✨ Clase Personalizada / Multiclase...</option>
                  </select>

                  <div>
                    <label className="block text-[10px] text-amber-300/90 font-semibold mb-1">
                      {isCustomClass
                        ? 'Escribe tu Clase Personalizada:'
                        : 'O escribe clase personalizada / multiclase:'}
                    </label>
                    <input
                      type="text"
                      value={identityForm.characterClass}
                      onChange={(e) => {
                        const val = e.target.value;
                        setIsCustomClass(!Object.keys(SRD_CLASSES).includes(val));
                        setIdentityForm({ ...identityForm, characterClass: val });
                      }}
                      placeholder="Ej. Artífice, Cazador de Sangre, Guerrero / Mago..."
                      className={`w-full bg-[#121316] border rounded-lg px-2.5 py-1.5 text-xs text-stone-100 ${
                        isCustomClass ? 'border-amber-500 font-bold' : 'border-stone-800'
                      }`}
                    />
                  </div>
                </div>

                <div className="bg-[#14151c] border border-stone-800 rounded-xl p-3 space-y-2">
                  <label className="block text-xs font-cinzel font-bold text-stone-300">
                    Subclase / Arquetipo (Opcional):
                  </label>
                  <input
                    type="text"
                    value={identityForm.subclass}
                    onChange={(e) => setIdentityForm({ ...identityForm, subclass: e.target.value })}
                    placeholder="Ej. Campeón, Círculo de la Luna, Dominio de la Vida..."
                    className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                  />
                  <p className="text-[10px] text-stone-500 leading-relaxed">
                    Indica la especialización, colegio, juramento o arquetipo de tu clase.
                  </p>
                </div>
              </div>

              {/* Alignment & Background */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-cinzel font-bold text-amber-300 mb-1">
                    Alineamiento:
                  </label>
                  <select
                    value={identityForm.alignment}
                    onChange={(e) => setIdentityForm({ ...identityForm, alignment: e.target.value })}
                    className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                  >
                    <option value="Legal Bueno">Legal Bueno</option>
                    <option value="Neutral Bueno">Neutral Bueno</option>
                    <option value="Caótico Bueno">Caótico Bueno</option>
                    <option value="Legal Neutral">Legal Neutral</option>
                    <option value="Neutral Puro">Neutral Puro</option>
                    <option value="Caótico Neutral">Caótico Neutral</option>
                    <option value="Legal Maligno">Legal Maligno</option>
                    <option value="Neutral Maligno">Neutral Maligno</option>
                    <option value="Caótico Maligno">Caótico Maligno</option>
                    <option value="Sin Alineamiento">Sin Alineamiento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-cinzel font-bold text-stone-300 mb-1">
                    Trasfondo:
                  </label>
                  <input
                    type="text"
                    value={identityForm.background}
                    onChange={(e) =>
                      setIdentityForm({ ...identityForm, background: e.target.value })
                    }
                    placeholder="Ej. Soldado, Sabio, Criminal, Acólito..."
                    className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsIdentityModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-cinzel transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
