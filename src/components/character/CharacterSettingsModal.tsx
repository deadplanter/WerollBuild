import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Shield,
  Heart,
  Zap,
  CheckCircle,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  User,
  Flame,
} from 'lucide-react';
import { Character5e, AbilityKey, AbilityScore } from '../../types/dnd';
import { ABILITY_LABELS, SRD_CLASSES, SRD_RACES } from '../../data/srd';
import {
  calculateModifier,
  formatModifier,
  calculateProficiencyBonus,
  getEffectiveAbilityModifier,
  calculateEquippedItemStatBonuses,
  calculateTotalAbilityScore,
} from '../../utils/dnd-math';

interface CharacterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character5e;
  onSaveCharacter: (updated: Character5e) => void;
}

export const CharacterSettingsModal: React.FC<CharacterSettingsModalProps> = ({
  isOpen,
  onClose,
  character,
  onSaveCharacter,
}) => {
  const [activeSection, setActiveSection] = useState<'stats' | 'identity' | 'combat'>('stats');

  // Identity state
  const [name, setName] = useState<string>(character.name || '');
  const [playerName, setPlayerName] = useState<string>(character.playerName || '');
  const [race, setRace] = useState<string>(character.race || 'Humano');
  const [subrace, setSubrace] = useState<string>(character.subrace || '');
  const [characterClass, setCharacterClass] = useState<string>(character.characterClass || 'Clérigo');
  const [subclass, setSubclass] = useState<string>(character.subclass || '');
  const [level, setLevel] = useState<number>(character.level || 1);
  const [xp, setXp] = useState<number>(character.xp ?? character.experience ?? 0);
  const [background, setBackground] = useState<string>(character.background || 'Soldado');
  const [alignment, setAlignment] = useState<string>(character.alignment || 'Caótico Bueno');

  // Combat & Vitality state
  const [maxHp, setMaxHp] = useState<number>(character.maxHp || 10);
  const [currentHp, setCurrentHp] = useState<number>(character.currentHp ?? 10);
  const [tempHp, setTempHp] = useState<number>(character.tempHp || 0);
  const [armorClass, setArmorClass] = useState<number>(character.armorClass ?? 10);
  const [initiativeBonus, setInitiativeBonus] = useState<number>(character.initiativeBonus ?? 0);
  const [speed, setSpeed] = useState<number>(character.speed || 30);
  const [hitDiceTotal, setHitDiceTotal] = useState<string>(character.hitDiceTotal || '1d8');
  const [spellSaveDcOverride, setSpellSaveDcOverride] = useState<string>(
    character.spellSaveDcOverride !== undefined ? String(character.spellSaveDcOverride) : ''
  );
  const [spellAttackBonusOverride, setSpellAttackBonusOverride] = useState<string>(
    character.spellAttackBonusOverride !== undefined ? String(character.spellAttackBonusOverride) : ''
  );

  // Abilities state (Base Score + Custom Modifier Bonus / Override + Save Proficiency)
  const [abilities, setAbilities] = useState<Record<AbilityKey, AbilityScore>>(() => ({
    str: { ...character.abilities.str },
    dex: { ...character.abilities.dex },
    con: { ...character.abilities.con },
    int: { ...character.abilities.int },
    wis: { ...character.abilities.wis },
    cha: { ...character.abilities.cha },
  }));

  const [isCustomRace, setIsCustomRace] = useState<boolean>(
    !SRD_RACES.some((r) => r.name === (character.race || 'Humano'))
  );
  const [isCustomClass, setIsCustomClass] = useState<boolean>(
    !Object.keys(SRD_CLASSES).includes(character.characterClass || 'Clérigo')
  );

  useEffect(() => {
    if (isOpen) {
      setName(character.name || '');
      setPlayerName(character.playerName || '');
      setRace(character.race || 'Humano');
      setSubrace(character.subrace || '');
      setCharacterClass(character.characterClass || 'Clérigo');
      setSubclass(character.subclass || '');
      setLevel(character.level || 1);
      setXp(character.xp ?? character.experience ?? 0);
      setBackground(character.background || 'Soldado');
      setAlignment(character.alignment || 'Caótico Bueno');
      setMaxHp(character.maxHp || 10);
      setCurrentHp(character.currentHp ?? 10);
      setTempHp(character.tempHp || 0);
      setArmorClass(character.armorClass ?? 10);
      setInitiativeBonus(character.initiativeBonus ?? 0);
      setSpeed(character.speed || 30);
      setHitDiceTotal(character.hitDiceTotal || '1d8');
      setSpellSaveDcOverride(
        character.spellSaveDcOverride !== undefined ? String(character.spellSaveDcOverride) : ''
      );
      setSpellAttackBonusOverride(
        character.spellAttackBonusOverride !== undefined ? String(character.spellAttackBonusOverride) : ''
      );
      setAbilities({
        str: { ...character.abilities.str },
        dex: { ...character.abilities.dex },
        con: { ...character.abilities.con },
        int: { ...character.abilities.int },
        wis: { ...character.abilities.wis },
        cha: { ...character.abilities.cha },
      });
      setIsCustomRace(!SRD_RACES.some((r) => r.name === (character.race || 'Humano')));
      setIsCustomClass(!Object.keys(SRD_CLASSES).includes(character.characterClass || 'Clérigo'));
    }
  }, [isOpen, character]);

  if (!isOpen) return null;

  const profBonus = calculateProficiencyBonus(level);

  const equippedBonuses = calculateEquippedItemStatBonuses(character.inventory || []);

  const handleUpdateAbilityBase = (key: AbilityKey, nextBase: number) => {
    const clamped = Math.max(1, Math.min(30, Math.round(nextBase || 10)));
    setAbilities((prev) => {
      const cur = prev[key];
      const extra = cur.extraScore ?? cur.customModifier ?? 0;
      const items = equippedBonuses[key] || 0;
      return {
        ...prev,
        [key]: {
          ...cur,
          baseScore: clamped,
          extraScore: extra,
          itemScore: items,
          score: clamped + extra + items,
        },
      };
    });
  };

  const handleUpdateCustomModifier = (key: AbilityKey, nextExtra: number) => {
    const clamped = Math.max(-10, Math.min(20, Math.round(nextExtra || 0)));
    setAbilities((prev) => {
      const cur = prev[key];
      const base = cur.baseScore ?? cur.score ?? 10;
      const items = equippedBonuses[key] || 0;
      return {
        ...prev,
        [key]: {
          ...cur,
          baseScore: base,
          extraScore: clamped,
          customModifier: clamped,
          itemScore: items,
          score: base + clamped + items,
          modifierOverride: undefined,
        },
      };
    });
  };

  const handleToggleSaveProf = (key: AbilityKey) => {
    setAbilities((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        proficientSave: !prev[key].proficientSave,
      },
    }));
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    const validLevel = Math.max(1, Math.min(20, Number(level) || 1));
    const validXp = Math.max(0, Number(xp) || 0);
    const validMaxHp = Math.max(1, Number(maxHp) || 1);
    const validCurrentHp = Math.max(0, Math.min(validMaxHp, Number(currentHp) || 0));

    const finalAbilities = { ...abilities };
    (Object.keys(finalAbilities) as AbilityKey[]).forEach((key) => {
      const cur = finalAbilities[key];
      const items = equippedBonuses[key] || 0;
      const base = cur.baseScore ?? cur.score ?? 10;
      const extra = cur.extraScore ?? cur.customModifier ?? 0;
      finalAbilities[key] = {
        ...cur,
        baseScore: base,
        extraScore: extra,
        customModifier: extra,
        itemScore: items,
        score: base + extra + items,
      };
    });

    onSaveCharacter({
      ...character,
      name: name.trim() || character.name,
      playerName: playerName.trim() || character.playerName,
      race: race.trim() || character.race,
      subrace: subrace.trim() || undefined,
      characterClass: characterClass.trim() || character.characterClass,
      subclass: subclass.trim() || undefined,
      level: validLevel,
      xp: validXp,
      experience: validXp,
      background: background.trim() || character.background,
      alignment: alignment.trim() || character.alignment,
      maxHp: validMaxHp,
      currentHp: validCurrentHp,
      tempHp: Math.max(0, Number(tempHp) || 0),
      armorClass: Number(armorClass) || 10,
      initiativeBonus: Number(initiativeBonus) || 0,
      speed: Math.max(0, Number(speed) || 30),
      hitDiceTotal: hitDiceTotal.trim() || `${validLevel}d8`,
      spellSaveDcOverride: spellSaveDcOverride.trim() !== '' ? Number(spellSaveDcOverride) : undefined,
      spellAttackBonusOverride:
        spellAttackBonusOverride.trim() !== '' ? Number(spellAttackBonusOverride) : undefined,
      abilities: finalAbilities,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Ajustes de Hoja de Personaje"
    >
      <div className="w-full max-w-4xl bg-[#15171e] border-2 border-[#c8a45a]/70 rounded-2xl shadow-2xl text-stone-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#1c1f29] via-[#171922] to-[#1c1f29] border-b border-[#c8a45a]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-[#c8a45a]/70 flex items-center justify-center text-[#e6c77c] shadow-inner">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-cinzel font-black text-base sm:text-lg text-[#e6c77c] tracking-wide uppercase">
                Ajustes de Personaje • {name || character.name}
              </h2>
              <p className="text-xs text-stone-400">
                Configura puntos base, modificadores personalizados, nivel, raza, clase y vitalidad
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-stone-100 border border-stone-700/70 transition"
            aria-label="Cerrar ajustes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-2 bg-[#12141a] border-b border-stone-800/90 overflow-x-auto">
          {[
            { id: 'stats', label: 'Atributos y Modificadores', icon: Sparkles },
            { id: 'identity', label: 'Identidad, Raza, Clase y Nivel', icon: User },
            { id: 'combat', label: 'Combate, PG, CA y Velocidad', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id as any)}
                className={`px-4 py-2 rounded-xl font-cinzel font-bold text-xs flex items-center gap-2 transition whitespace-nowrap border ${
                  active
                    ? 'bg-[#232634] text-[#e6c77c] border-[#c8a45a] shadow-md'
                    : 'bg-[#171922] text-stone-400 border-stone-800 hover:text-stone-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveAll} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* SECTION 1: STATS & CUSTOM MODIFIERS */}
          {activeSection === 'stats' && (
            <div className="space-y-4">
              <div className="bg-[#1b1e28] border border-[#c8a45a]/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-cinzel font-bold text-sm text-[#e6c77c]">
                    Puntos Base y Modificadores Personalizados (Razas/Clases Propias)
                  </h3>
                  <p className="text-xs text-stone-400">
                    Ajusta tanto los <strong>Puntos Base</strong> (ej. 8, 10, 16) como el <strong>Modificador Final o Bono Extra</strong> para adaptarlo a cualquier raza o clase personalizada.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const reset: Record<AbilityKey, AbilityScore> = { ...abilities };
                    (Object.keys(reset) as AbilityKey[]).forEach((k) => {
                      reset[k] = {
                        ...reset[k],
                        customModifier: 0,
                        modifierOverride: undefined,
                      };
                    });
                    setAbilities(reset);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-cinzel flex items-center gap-1.5 border border-stone-700 shrink-0"
                  title="Restablecer bonos extra a cálculo 5E estándar"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Resetear Bonos Extra</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {(Object.keys(ABILITY_LABELS) as AbilityKey[]).map((key) => {
                  const meta = ABILITY_LABELS[key];
                  const ab = abilities[key];
                  const itemBonus = equippedBonuses[key] || 0;
                  const breakdown = calculateTotalAbilityScore(ab, itemBonus);
                  const saveMod = breakdown.modifier + (ab.proficientSave ? profBonus : 0);

                  return (
                    <div
                      key={key}
                      className="bg-[#181b24] border border-[#c8a45a]/40 rounded-xl p-4 flex flex-col justify-between space-y-2.5 shadow-lg"
                    >
                      <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                        <div>
                          <span className="font-cinzel font-black text-base text-[#e6c77c]">
                            {meta.abbr}
                          </span>
                          <span className="text-xs text-stone-400 ml-2">{meta.nameEs}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-amber-300">
                            Total: {breakdown.totalScore}
                          </span>
                          <div className="px-2 py-0.5 rounded-lg bg-[#111319] border border-[#c8a45a]/50 font-cinzel font-black text-base text-white">
                            {formatModifier(breakdown.modifier)}
                          </div>
                        </div>
                      </div>

                      {/* 1. Puntos Base (Score) */}
                      <div className="bg-[#12141b] rounded-lg p-2 border border-stone-800/90">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-stone-300 font-semibold text-[11px]">1. Puntos Base:</span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            Mod base: {formatModifier(calculateModifier(breakdown.baseScore))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateAbilityBase(key, breakdown.baseScore - 1)}
                            className="w-7 h-7 rounded-lg bg-[#222530] hover:bg-stone-700 text-stone-200 border border-stone-700 flex items-center justify-center font-bold text-xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            aria-label={`Puntos base de ${meta.nameEs}`}
                            value={breakdown.baseScore}
                            onChange={(e) => handleUpdateAbilityBase(key, parseInt(e.target.value, 10) || 10)}
                            className="w-20 bg-[#181b24] border border-stone-700 focus:border-[#c8a45a] rounded-lg py-0.5 text-center font-mono font-bold text-sm text-[#e6c77c] outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateAbilityBase(key, breakdown.baseScore + 1)}
                            className="w-7 h-7 rounded-lg bg-[#222530] hover:bg-stone-700 text-stone-200 border border-stone-700 flex items-center justify-center font-bold text-xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* 2. Puntos Extra Asignados */}
                      <div className="bg-[#12141b] rounded-lg p-2 border border-amber-900/30">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[#e6c77c] font-semibold text-[11px]">2. Puntos Extra:</span>
                          <span className="text-[10px] text-amber-400 font-mono">
                            {breakdown.extraScore >= 0 ? `+${breakdown.extraScore}` : breakdown.extraScore} pts
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateCustomModifier(key, breakdown.extraScore - 1)}
                            className="w-7 h-7 rounded-lg bg-[#222530] hover:bg-amber-950 text-amber-200 border border-amber-800/60 flex items-center justify-center font-bold text-xs"
                            title="Restar 1 punto extra"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min={-10}
                            max={20}
                            aria-label={`Puntos extra de ${meta.nameEs}`}
                            value={breakdown.extraScore}
                            onChange={(e) =>
                              handleUpdateCustomModifier(key, parseInt(e.target.value, 10) || 0)
                            }
                            className="w-20 bg-[#181b24] border border-amber-700/60 focus:border-amber-400 rounded-lg py-0.5 text-center font-mono font-bold text-sm text-white outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateCustomModifier(key, breakdown.extraScore + 1)}
                            className="w-7 h-7 rounded-lg bg-[#222530] hover:bg-amber-950 text-amber-200 border border-amber-800/60 flex items-center justify-center font-bold text-xs"
                            title="Sumar 1 punto extra"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* 3. Puntos Dados por Objetos Equipados (Read-only) */}
                      <div className="bg-[#12141b] rounded-lg p-2 border border-emerald-900/40 flex items-center justify-between">
                        <div>
                          <span className="text-emerald-300 font-semibold text-[11px] flex items-center gap-1">
                            <Shield className="w-3 h-3 text-emerald-400" /> 3. Objetos Equipados:
                          </span>
                          <span className="text-[10px] text-stone-400">Sumado automáticamente de tu equipo</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono font-bold text-xs">
                          {breakdown.itemScore >= 0 ? `+${breakdown.itemScore}` : breakdown.itemScore}
                        </span>
                      </div>

                      {/* 4. Competencia en Salvación */}
                      <div className="flex items-center justify-between pt-1 border-t border-stone-800/80 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={ab.proficientSave}
                            onChange={() => handleToggleSaveProf(key)}
                            className="rounded border-stone-600 text-amber-500 focus:ring-0"
                          />
                          <span className="text-stone-300">Competente en Salvación</span>
                        </label>
                        <span className="font-mono font-bold text-[#e6c77c]">
                          Salv: {formatModifier(saveMod)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 2: IDENTITY, RACE, CLASS, LEVEL, XP, ALIGNMENT */}
          {activeSection === 'identity' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-cinzel font-bold text-[#e6c77c] mb-1">
                    Nombre del Personaje
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#12141b] border border-stone-700 focus:border-[#c8a45a] rounded-xl px-3.5 py-2 text-sm text-white font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-cinzel font-bold text-stone-300 mb-1">
                    Nombre del Jugador
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full bg-[#12141b] border border-stone-700 focus:border-[#c8a45a] rounded-xl px-3.5 py-2 text-sm text-stone-200 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-cinzel font-bold text-[#e6c77c] mb-1">
                    Nivel (1 - 20)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLevel((l) => Math.max(1, l - 1))}
                      className="p-2 rounded-xl bg-[#222530] hover:bg-stone-700 border border-stone-700 text-stone-200"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={level}
                      onChange={(e) => setLevel(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
                      className="w-full bg-[#12141b] border border-[#c8a45a]/60 rounded-xl py-2 text-center font-mono font-bold text-sm text-[#e6c77c]"
                    />
                    <button
                      type="button"
                      onClick={() => setLevel((l) => Math.min(20, l + 1))}
                      className="p-2 rounded-xl bg-[#222530] hover:bg-stone-700 border border-stone-700 text-stone-200"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-cinzel font-bold text-[#e6c77c] mb-1">
                    Experiencia (XP)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={xp}
                    onChange={(e) => setXp(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-[#12141b] border border-stone-700 focus:border-[#c8a45a] rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-amber-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-cinzel font-bold text-stone-300 mb-1">
                    Bono de Competencia (Automático)
                  </label>
                  <div className="w-full bg-[#12141b] border border-stone-800 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-[#e6c77c] text-center">
                    +{profBonus}
                  </div>
                </div>
              </div>

              {/* Race & Class */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-[#181b24] border border-stone-800 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-cinzel font-bold text-[#e6c77c]">Raza</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomRace(!isCustomRace)}
                      className="text-[11px] text-amber-300 hover:underline font-cinzel"
                    >
                      {isCustomRace ? 'Usar lista SRD' : 'Escribir raza propia'}
                    </button>
                  </div>
                  {!isCustomRace ? (
                    <select
                      value={race}
                      onChange={(e) => setRace(e.target.value)}
                      className="w-full bg-[#12141b] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                    >
                      {SRD_RACES.map((r) => (
                        <option key={r.name} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={race}
                      onChange={(e) => setRace(e.target.value)}
                      placeholder="Escribe tu raza personalizada..."
                      className="w-full bg-[#12141b] border border-[#c8a45a] rounded-xl px-3 py-2 text-xs text-white font-bold"
                    />
                  )}
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Subraza / Linaje (Opcional)</label>
                    <input
                      type="text"
                      value={subrace}
                      onChange={(e) => setSubrace(e.target.value)}
                      placeholder="Ej. Elfo de los Bosques, Tiefling Infernal..."
                      className="w-full bg-[#12141b] border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-200"
                    />
                  </div>
                </div>

                <div className="bg-[#181b24] border border-stone-800 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-cinzel font-bold text-[#e6c77c]">Clase</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomClass(!isCustomClass)}
                      className="text-[11px] text-amber-300 hover:underline font-cinzel"
                    >
                      {isCustomClass ? 'Usar lista SRD' : 'Escribir clase propia'}
                    </button>
                  </div>
                  {!isCustomClass ? (
                    <select
                      value={characterClass}
                      onChange={(e) => setCharacterClass(e.target.value)}
                      className="w-full bg-[#12141b] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                    >
                      {Object.keys(SRD_CLASSES).map((cls) => (
                        <option key={cls} value={cls}>
                          {cls} ({SRD_CLASSES[cls].hitDie})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={characterClass}
                      onChange={(e) => setCharacterClass(e.target.value)}
                      placeholder="Escribe tu clase personalizada..."
                      className="w-full bg-[#12141b] border border-[#c8a45a] rounded-xl px-3 py-2 text-xs text-white font-bold"
                    />
                  )}
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Subclase / Arquetipo (Opcional)</label>
                    <input
                      type="text"
                      value={subclass}
                      onChange={(e) => setSubclass(e.target.value)}
                      placeholder="Ej. Dominio de la Vida, Campeón..."
                      className="w-full bg-[#12141b] border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-200"
                    />
                  </div>
                </div>
              </div>

              {/* Background & Alignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-cinzel font-bold text-[#e6c77c] mb-1">
                    Trasfondo (Background)
                  </label>
                  <input
                    type="text"
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    placeholder="Ej. Soldado, Sabio, Acólito, Criminal..."
                    className="w-full bg-[#12141b] border border-stone-700 focus:border-[#c8a45a] rounded-xl px-3.5 py-2 text-xs text-stone-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-cinzel font-bold text-[#e6c77c] mb-1">
                    Alineamiento
                  </label>
                  <select
                    value={alignment}
                    onChange={(e) => setAlignment(e.target.value)}
                    className="w-full bg-[#12141b] border border-stone-700 focus:border-[#c8a45a] rounded-xl px-3.5 py-2 text-xs text-stone-100 outline-none"
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
              </div>
            </div>
          )}

          {/* SECTION 3: COMBAT & VITALITY */}
          {activeSection === 'combat' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="bg-[#181b24] border border-stone-800 rounded-xl p-3.5">
                  <label className="block text-xs font-cinzel font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5" /> PG Máximos
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={maxHp}
                    onChange={(e) => setMaxHp(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-[#12141b] border border-stone-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white"
                  />
                </div>

                <div className="bg-[#181b24] border border-stone-800 rounded-xl p-3.5">
                  <label className="block text-xs font-cinzel font-bold text-stone-300 mb-1">
                    PG Actuales
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={currentHp}
                    onChange={(e) => setCurrentHp(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-[#12141b] border border-stone-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-emerald-300"
                  />
                </div>

                <div className="bg-[#181b24] border border-stone-800 rounded-xl p-3.5">
                  <label className="block text-xs font-cinzel font-bold text-blue-400 mb-1">
                    PG Temporales
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={tempHp}
                    onChange={(e) => setTempHp(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-[#12141b] border border-stone-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-blue-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-[#181b24] border border-stone-800 rounded-xl p-3.5">
                  <label className="block text-xs font-cinzel font-bold text-[#e6c77c] mb-1">
                    Clase de Armadura (CA)
                  </label>
                  <input
                    type="number"
                    value={armorClass}
                    onChange={(e) => setArmorClass(parseInt(e.target.value, 10) || 10)}
                    className="w-full bg-[#12141b] border border-stone-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-[#e6c77c]"
                  />
                </div>

                <div className="bg-[#181b24] border border-stone-800 rounded-xl p-3.5">
                  <label className="block text-xs font-cinzel font-bold text-[#e6c77c] mb-1 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> Iniciativa
                  </label>
                  <input
                    type="number"
                    value={initiativeBonus}
                    onChange={(e) => setInitiativeBonus(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-[#12141b] border border-stone-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white"
                  />
                </div>

                <div className="bg-[#181b24] border border-stone-800 rounded-xl p-3.5">
                  <label className="block text-xs font-cinzel font-bold text-[#e6c77c] mb-1">
                    Velocidad (FT)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={speed}
                    onChange={(e) => setSpeed(Math.max(0, parseInt(e.target.value, 10) || 30))}
                    className="w-full bg-[#12141b] border border-stone-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white"
                  />
                </div>

                <div className="bg-[#181b24] border border-stone-800 rounded-xl p-3.5">
                  <label className="block text-xs font-cinzel font-bold text-[#e6c77c] mb-1">
                    Dados de Golpe
                  </label>
                  <input
                    type="text"
                    value={hitDiceTotal}
                    onChange={(e) => setHitDiceTotal(e.target.value)}
                    placeholder="Ej. 1d8, 3d10"
                    className="w-full bg-[#12141b] border border-stone-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-amber-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-[#181b24] border border-stone-800 rounded-xl p-3.5">
                  <label className="block text-xs font-cinzel font-bold text-purple-300 mb-1 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-purple-400" /> CD Salvación de Conjuros (Opcional)
                  </label>
                  <input
                    type="number"
                    value={spellSaveDcOverride}
                    onChange={(e) => setSpellSaveDcOverride(e.target.value)}
                    placeholder="Automático si se deja vacío"
                    className="w-full bg-[#12141b] border border-stone-700 rounded-xl px-3 py-2 text-xs font-mono text-purple-200"
                  />
                </div>

                <div className="bg-[#181b24] border border-stone-800 rounded-xl p-3.5">
                  <label className="block text-xs font-cinzel font-bold text-purple-300 mb-1">
                    Bono de Ataque de Conjuro (Opcional)
                  </label>
                  <input
                    type="number"
                    value={spellAttackBonusOverride}
                    onChange={(e) => setSpellAttackBonusOverride(e.target.value)}
                    placeholder="Automático si se deja vacío"
                    className="w-full bg-[#12141b] border border-stone-700 rounded-xl px-3 py-2 text-xs font-mono text-purple-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-cinzel font-bold text-xs transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#b88c38] to-[#d6ab54] hover:from-[#c99b42] hover:to-[#e3ba64] text-stone-950 font-cinzel font-black text-xs shadow-lg transition flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Guardar Ajustes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
