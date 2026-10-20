import React, { useState, useRef } from 'react';
import { X, Sparkles, Wand2, Shield, User, Upload, Plus, Minus, Check, BookOpen } from 'lucide-react';
import { Character5e, AbilityKey, SkillKey, CustomSkillEntry } from '../../types/dnd';
import { SRD_CLASSES, SRD_RACES, ABILITY_LABELS, SKILL_METADATA } from '../../data/srd';
import { calculateModifier, calculateProficiencyBonus, getSpanishAbilityLabel } from '../../utils/dnd-math';
import { EntityAvatar } from '../common/EntityAvatar';
import { compressImageFileToDataUrl } from '../../utils/imageCompressor';

interface CharacterCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCharacterCreated: (character: Character5e) => void;
}

export const CharacterCreatorModal: React.FC<CharacterCreatorModalProps> = ({
  isOpen,
  onClose,
  onCharacterCreated,
}) => {
  const [step, setStep] = useState<number>(1);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('Jugador');
  const [level, setLevel] = useState<number>(1);

  const [characterClass, setCharacterClass] = useState<string>('Guerrero');
  const [isCustomClass, setIsCustomClass] = useState<boolean>(false);
  const [customClassName, setCustomClassName] = useState<string>('');
  const [subclass, setSubclass] = useState<string>('');

  const [race, setRace] = useState<string>('Humano');
  const [isCustomRace, setIsCustomRace] = useState<boolean>(false);
  const [customRaceName, setCustomRaceName] = useState<string>('');
  const [subrace, setSubrace] = useState<string>('');

  const [background, setBackground] = useState<string>('Soldado');
  const [alignment, setAlignment] = useState<string>('Neutral Bueno');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

  const [scores, setScores] = useState<Record<AbilityKey, number>>({
    str: 15,
    dex: 14,
    con: 13,
    int: 12,
    wis: 10,
    cha: 8,
  });

  const [personalityTraits, setPersonalityTraits] = useState<string>('');
  const [ideals, setIdeals] = useState<string>('');
  const [bonds, setBonds] = useState<string>('');
  const [flaws, setFlaws] = useState<string>('');
  const [backstory, setBackstory] = useState<string>('');

  // Selected initial skills (only the ones chosen here will appear on the character sheet)
  const [selectedSkillKeys, setSelectedSkillKeys] = useState<SkillKey[]>([
    'athletics',
    'perception',
    'intimidation',
  ]);
  const [customDescriptions, setCustomDescriptions] = useState<Partial<Record<SkillKey, string>>>({});
  const [extraCustomSkills, setExtraCustomSkills] = useState<CustomSkillEntry[]>([]);
  const [newSkillName, setNewSkillName] = useState<string>('');
  const [newSkillAbility, setNewSkillAbility] = useState<AbilityKey>('dex');
  const [newSkillDesc, setNewSkillDesc] = useState<string>('');

  if (!isOpen) return null;

  const toggleSkillSelection = (key: SkillKey) => {
    setSelectedSkillKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleAddExtraSkill = () => {
    if (!newSkillName.trim()) return;
    const entry: CustomSkillEntry = {
      id: `custom-skill-${Date.now()}`,
      name: newSkillName.trim(),
      ability: newSkillAbility,
      proficiency: 'proficient',
      description:
        newSkillDesc.trim() ||
        `Habilidad especial de ${newSkillName.trim()} basada en ${getSpanishAbilityLabel(newSkillAbility)}.`,
    };
    setExtraCustomSkills((prev) => [...prev, entry]);
    setNewSkillName('');
    setNewSkillDesc('');
  };

  const finalRace = isCustomRace ? (customRaceName.trim() || 'Raza Personalizada') : race;
  const finalClass = isCustomClass ? (customClassName.trim() || 'Aventurero') : characterClass;

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    try {
      const optimized = await compressImageFileToDataUrl(file, 512, 0.85);
      if (optimized) setAvatarUrl(optimized);
    } catch {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        if (dataUrl) setAvatarUrl(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAiGenerate = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/gemini/generate-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: `${finalRace} ${finalClass} con trasfondo ${background}`,
          characterClass: finalClass,
          race: finalRace,
        }),
      });
      const data = await res.json();
      if (data) {
        if (data.name) setName(data.name);
        if (data.backstory) setBackstory(data.backstory);
        if (data.personalityTraits) setPersonalityTraits(data.personalityTraits);
        if (data.ideals) setIdeals(data.ideals);
        if (data.bonds) setBonds(data.bonds);
        if (data.flaws) setFlaws(data.flaws);
        if (data.recommendedScores) setScores(data.recommendedScores);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleFinish = () => {
    const classData = SRD_CLASSES[finalClass] || SRD_CLASSES.Guerrero;
    const hitDieNum = parseInt(classData.hitDie.replace('d', ''), 10) || 10;
    const conMod = calculateModifier(scores.con);
    const validLevel = Math.max(1, Math.min(20, Number(level) || 1));
    const avgPerLevel = Math.floor(hitDieNum / 2) + 1;
    const maxHp = Math.max(
      1,
      hitDieNum + conMod + (validLevel - 1) * Math.max(1, avgPerLevel + conMod)
    );
    const profBonus = calculateProficiencyBonus(validLevel);

    const skillsRecord: Record<SkillKey, 'none' | 'proficient' | 'expertise'> = {
      acrobatics: 'none',
      animalHandling: 'none',
      arcana: 'none',
      athletics: 'none',
      deception: 'none',
      history: 'none',
      insight: 'none',
      intimidation: 'none',
      investigation: 'none',
      medicine: 'none',
      nature: 'none',
      perception: 'none',
      performance: 'none',
      persuasion: 'none',
      religion: 'none',
      sleightOfHand: 'none',
      stealth: 'none',
      survival: 'none',
    };

    const chosenCustomSkills: CustomSkillEntry[] = selectedSkillKeys.map((key) => {
      skillsRecord[key] = 'proficient';
      const meta = SKILL_METADATA[key];
      return {
        id: key,
        skillKey: key,
        name: meta.nameEs,
        ability: meta.ability,
        proficiency: 'proficient',
        description: customDescriptions[key]?.trim() || meta.description,
      };
    });

    const allCharacterSkills = [...chosenCustomSkills, ...extraCustomSkills];

    const newChar: Character5e = {
      id: `char-${Date.now()}`,
      name: name.trim() || 'Aventurero Sin Nombre',
      playerName: playerName.trim() || 'Jugador',
      race: finalRace,
      subrace: subrace.trim() || undefined,
      characterClass: finalClass,
      subclass: subclass.trim() || undefined,
      level: validLevel,
      experience: 0,
      background: background.trim() || 'Soldado',
      alignment,
      avatarType: avatarUrl ? 'custom' : 'icon',
      avatarCustomUrl: avatarUrl || undefined,
      avatarUrl: avatarUrl || undefined,
      avatarIcon: 'anonymous',
      maxHp,
      currentHp: maxHp,
      tempHp: 0,
      armorClass: 10 + calculateModifier(scores.dex),
      initiativeBonus: calculateModifier(scores.dex),
      speed: 30,
      hitDiceTotal: `${validLevel}${classData.hitDie}`,
      hitDiceUsed: 0,
      deathSaves: { successes: 0, failures: 0 },
      inspiration: false,
      abilities: {
        str: { score: scores.str, proficientSave: classData.savingThrows.includes('str') },
        dex: { score: scores.dex, proficientSave: classData.savingThrows.includes('dex') },
        con: { score: scores.con, proficientSave: classData.savingThrows.includes('con') },
        int: { score: scores.int, proficientSave: classData.savingThrows.includes('int') },
        wis: { score: scores.wis, proficientSave: classData.savingThrows.includes('wis') },
        cha: { score: scores.cha, proficientSave: classData.savingThrows.includes('cha') },
      },
      skills: skillsRecord,
      customSkills: allCharacterSkills,
      armorProficiencies: classData.armorProficiencies,
      weaponProficiencies: classData.weaponProficiencies,
      toolProficiencies: [],
      languages: ['Común'],
      attacks: [
        {
          id: `atk-init-${Date.now()}`,
          name: 'Arma Inicial',
          type: 'melee',
          attackBonus: calculateModifier(scores.str) + profBonus,
          damageDice: '1d6+2',
          damageType: 'Cortante',
        },
      ],
      spellSlots: [],
      spells: [],
      inventory: [
        {
          id: `inv-weap-${Date.now()}`,
          name: `Espada de ${finalClass}`,
          quantity: 1,
          weight: 3,
          equipped: true,
          category: 'Arma',
          rarity: 'Común',
          description: 'Arma principal equilibrada con ataque primario y secundario.',
          weaponAttacks: [
            {
              id: `wa-1-${Date.now()}`,
              name: 'Ataque Principal',
              description: 'Corte directo con potenciador marcial.',
              dice: '1d6',
              bonus: 2,
              damageType: 'Cortante',
              attackType: 'melee',
              range: '5 pies',
            },
            {
              id: `wa-2-${Date.now()}`,
              name: 'Habilidad Secundaria',
              description: 'Golpe pesado sin potenciador adicional.',
              dice: '1d8',
              bonus: 0,
              damageType: 'Cortante',
              attackType: 'melee',
              range: '5 pies',
            },
          ],
        },
        {
          id: `inv-arm-${Date.now()}`,
          name: 'Armadura de Cuero Tachonado',
          quantity: 1,
          weight: 13,
          equipped: true,
          category: 'Armadura',
          rarity: 'Común',
          description: 'Protección ligera y flexible para aventureros (CA 12 + Mod DES).',
        },
        {
          id: `inv-pack-${Date.now()}`,
          name: 'Mochila de Aventurero',
          quantity: 1,
          weight: 12,
          category: 'Objeto Común',
          rarity: 'Común',
          description: 'Raciones, odre de agua, cuerda de 50 pies, yesquero.',
        },
      ],
      currency: { cp: 10, sp: 10, ep: 0, gp: 15, pp: 0 },
      featuresAndTraits: [
        {
          id: `feat-${Date.now()}`,
          name: `Competencias de ${finalClass}`,
          source: 'Clase',
          description: classData.description,
        },
      ],
      personalityTraits: personalityTraits || 'Curioso y valiente.',
      ideals: ideals || 'Honor: Cumplo mi palabra.',
      bonds: bonds || 'Protejo a mis compañeros de grupo.',
      flaws: flaws || 'A veces actúo sin pensar en el peligro.',
      backstory: backstory || 'Comenzó su viaje para descubrir los misterios del reino.',
      notes: '',
      playerJournal: [],
    };

    onCharacterCreated(newChar);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="creator-title"
    >
      <div className="relative w-full max-w-2xl bg-[#181920] border-2 border-amber-900/60 rounded-2xl shadow-2xl p-6 text-stone-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/30 mb-4">
          <div className="flex items-center gap-2">
            <User className="w-6 h-6 text-amber-500" />
            <h2 id="creator-title" className="text-xl font-bold font-cinzel text-amber-400">
              Creador de Personaje 5E (Paso {step} de 3)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Auto-generate button */}
        <div className="mb-4 p-3 rounded-xl bg-purple-950/40 border border-purple-800/60 flex items-center justify-between gap-3">
          <div className="text-xs text-purple-200">
            ¿Quieres que <strong>Gemini Flash</strong> genere una historia, nombre e ideales coherentes?
          </div>
          <button
            type="button"
            onClick={handleAiGenerate}
            disabled={isAiLoading}
            className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white font-cinzel font-bold text-xs flex items-center gap-1.5 shrink-0 transition shadow"
          >
            <Wand2 className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
            <span>{isAiLoading ? 'Invocando...' : 'Autocompletar con IA'}</span>
          </button>
        </div>

        {/* STEP 1: Basic Identity */}
        {step === 1 && (
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Row 1: Name, Player Name, Level */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">
                  Nombre del Personaje
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Kaelen Vientosombrío"
                  className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-100 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">
                  Nombre del Jugador
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-100 text-sm"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
                  Nivel (1-20)
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setLevel((prev) => Math.max(1, prev - 1))}
                    className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition"
                    title="Bajar nivel"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <select
                    value={level}
                    onChange={(e) => setLevel(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
                    className="w-full bg-[#121316] border border-amber-700/70 rounded-xl px-1.5 py-2 text-amber-300 font-mono font-bold text-sm text-center"
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((lvl) => (
                      <option key={lvl} value={lvl}>
                        Nv. {lvl}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setLevel((prev) => Math.min(20, prev + 1))}
                    className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition"
                    title="Subir nivel"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Race (with Custom Race option) & Class (with Custom Class option) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Raza Box */}
              <div className="bg-[#14151c] border border-stone-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Raza
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomRace(!isCustomRace)}
                    className="text-[10px] font-cinzel font-bold text-amber-300 hover:text-amber-200 underline"
                  >
                    {isCustomRace ? 'Elegir raza del manual' : '✨ Poner raza personalizada'}
                  </button>
                </div>

                <select
                  value={isCustomRace ? '__custom__' : race}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomRace(true);
                    } else {
                      setIsCustomRace(false);
                      setRace(e.target.value);
                    }
                  }}
                  className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm"
                >
                  {SRD_RACES.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                  <option value="__custom__">✨ Raza Personalizada (Poner mi propia raza)</option>
                </select>

                {isCustomRace && (
                  <div className="animate-in fade-in pt-1">
                    <label className="block text-[11px] text-amber-300 font-semibold mb-1">
                      Escribe tu Raza Personalizada:
                    </label>
                    <input
                      type="text"
                      value={customRaceName}
                      onChange={(e) => setCustomRaceName(e.target.value)}
                      placeholder="Ej. Aasimar, Tabaxi, Vampiro, Forjado..."
                      className="w-full bg-[#121316] border border-amber-600/80 rounded-lg px-3 py-1.5 text-stone-100 text-xs font-semibold focus:outline-none focus:border-amber-400"
                      autoFocus
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-stone-400 uppercase tracking-wider mb-1">
                    Subraza / Variante (Opcional)
                  </label>
                  <input
                    type="text"
                    value={subrace}
                    onChange={(e) => setSubrace(e.target.value)}
                    placeholder="Ej. Elfo de los Bosques, Linaje Celestial..."
                    className="w-full bg-[#121316] border border-stone-800 rounded-lg px-2.5 py-1.5 text-stone-200 text-xs"
                  />
                </div>
              </div>

              {/* Clase Box */}
              <div className="bg-[#14151c] border border-stone-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Clase
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomClass(!isCustomClass)}
                    className="text-[10px] font-cinzel font-bold text-amber-300 hover:text-amber-200 underline"
                  >
                    {isCustomClass ? 'Elegir clase del manual' : '✨ Clase personalizada'}
                  </button>
                </div>

                <select
                  value={isCustomClass ? '__custom__' : characterClass}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomClass(true);
                    } else {
                      setIsCustomClass(false);
                      setCharacterClass(e.target.value);
                    }
                  }}
                  className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-sm"
                >
                  {Object.keys(SRD_CLASSES).map((cls) => (
                    <option key={cls} value={cls}>
                      {cls} ({SRD_CLASSES[cls].hitDie})
                    </option>
                  ))}
                  <option value="__custom__">✨ Clase Personalizada (Escribir clase)</option>
                </select>

                {isCustomClass && (
                  <div className="animate-in fade-in pt-1">
                    <label className="block text-[11px] text-amber-300 font-semibold mb-1">
                      Escribe tu Clase Personalizada:
                    </label>
                    <input
                      type="text"
                      value={customClassName}
                      onChange={(e) => setCustomClassName(e.target.value)}
                      placeholder="Ej. Artífice, Cazador de Sangre, Caballero..."
                      className="w-full bg-[#121316] border border-amber-600/80 rounded-lg px-3 py-1.5 text-stone-100 text-xs font-semibold focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-stone-400 uppercase tracking-wider mb-1">
                    Subclase / Arquetipo (Opcional)
                  </label>
                  <input
                    type="text"
                    value={subclass}
                    onChange={(e) => setSubclass(e.target.value)}
                    placeholder="Ej. Campeón, Círculo de la Luna..."
                    className="w-full bg-[#121316] border border-stone-800 rounded-lg px-2.5 py-1.5 text-stone-200 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Alignment & Background */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">
                  Alineamiento
                </label>
                <select
                  value={alignment}
                  onChange={(e) => setAlignment(e.target.value)}
                  className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-100 text-sm"
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">
                  Trasfondo (Background)
                </label>
                <input
                  type="text"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  placeholder="Ej. Soldado, Sabio, Criminal, Forastero..."
                  className="w-full bg-[#121316] border border-stone-700 rounded-xl px-3 py-2 text-stone-100 text-sm"
                />
              </div>
            </div>

            {/* Row 4: Character Photo / Avatar (Upload or URL) */}
            <div className="bg-[#14151c] border border-stone-800 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <EntityAvatar
                avatarType={avatarUrl ? 'custom' : 'icon'}
                customUrl={avatarUrl}
                iconId="anonymous"
                size="lg"
                className="shrink-0 border border-amber-700/60"
              />
              <div className="flex-1 w-full space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-300">
                    Foto / Retrato del Personaje (Se mostrará en tu ficha y en la mesa)
                  </label>
                  <input
                    type="file"
                    ref={avatarFileInputRef}
                    onChange={handleAvatarFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-300 text-xs font-cinzel font-bold flex items-center gap-1 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Foto</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="O pega la URL de una imagen (https://...)"
                  className="w-full bg-[#121316] border border-stone-700 rounded-lg px-3 py-1.5 text-stone-100 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Ability Scores & Initial Character Skills Selection */}
        {step === 2 && (
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            <div>
              <h4 className="font-cinzel font-bold text-sm text-amber-300 mb-1">
                1. Puntuaciones de Característica (Estadísticas Base)
              </h4>
              <p className="text-xs text-stone-400 mb-2">
                Distribuye las puntuaciones de característica (conjunto estándar 15, 14, 13, 12, 10, 8 o personalizado):
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {(Object.keys(scores) as AbilityKey[]).map((key) => {
                  const val = scores[key];
                  const mod = calculateModifier(val);
                  const meta = ABILITY_LABELS[key];

                  return (
                    <div key={key} className="bg-[#121316] border border-stone-800 rounded-xl p-2.5 text-center">
                      <span className="font-cinzel font-bold text-amber-400 text-xs block">
                        {meta.nameEs} ({meta.abbr})
                      </span>
                      <input
                        type="number"
                        min="3"
                        max="20"
                        value={val}
                        onChange={(e) =>
                          setScores({
                            ...scores,
                            [key]: Math.max(3, Math.min(20, parseInt(e.target.value, 10) || 10)),
                          })
                        }
                        className="w-14 bg-[#181920] border border-stone-700 font-mono font-bold text-base text-center rounded py-1 my-1 text-stone-100"
                      />
                      <div className="text-[11px] text-stone-400 font-mono">Mod: {mod >= 0 ? `+${mod}` : mod}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SKILL SELECTION FOR THIS CHARACTER */}
            <div className="bg-[#14151c] border border-amber-900/50 rounded-xl p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-cinzel font-bold text-sm text-amber-300 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span>2. Escoge las Habilidades (Skills) de tu Personaje</span>
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    Selecciona únicamente las habilidades que posee tu personaje. Una vez creada tu ficha, solo verás las que tengas aquí (en español y con descripción editable), y podrás agregar más cuando quieras.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-700/70 text-amber-300 font-cinzel font-bold text-xs shrink-0">
                  {selectedSkillKeys.length + extraCustomSkills.length} Habilidades Elegidas
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {(Object.keys(SKILL_METADATA) as SkillKey[]).map((key) => {
                  const meta = SKILL_METADATA[key];
                  const isSelected = selectedSkillKeys.includes(key);
                  const statEs = getSpanishAbilityLabel(meta.ability);
                  const descValue = customDescriptions[key] ?? meta.description;

                  return (
                    <div
                      key={key}
                      onClick={() => toggleSkillSelection(key)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-500/80 text-stone-100 shadow-sm'
                          : 'bg-[#121316] border-stone-800 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border ${
                              isSelected
                                ? 'bg-amber-500 border-amber-400 text-stone-950'
                                : 'border-stone-600 bg-stone-900'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="font-cinzel font-bold text-xs text-stone-100">
                            {meta.nameEs}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 text-amber-300">
                          {statEs}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1 leading-snug">
                        {descValue}
                      </p>
                      {isSelected && (
                        <div className="mt-1.5 pt-1.5 border-t border-amber-900/40" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={descValue}
                            onChange={(e) =>
                              setCustomDescriptions((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            placeholder="Personalizar descripción de qué hace esta habilidad..."
                            className="w-full bg-[#101115] border border-amber-700/50 rounded px-2 py-1 text-[11px] text-amber-200 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Extra Custom Skills Added During Creation */}
              {extraCustomSkills.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-stone-800">
                  <span className="text-[11px] font-cinzel font-bold text-emerald-300 block">
                    Habilidades Personalizadas Añadidas:
                  </span>
                  {extraCustomSkills.map((sk) => (
                    <div
                      key={sk.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-emerald-950/30 border border-emerald-700/50 text-xs"
                    >
                      <div>
                        <strong className="text-emerald-200">{sk.name}</strong>{' '}
                        <span className="text-amber-300 text-[10px]">({getSpanishAbilityLabel(sk.ability)})</span>
                        <p className="text-[11px] text-stone-300">{sk.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExtraCustomSkills((prev) => prev.filter((s) => s.id !== sk.id))}
                        className="text-stone-400 hover:text-red-400 px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Add Custom Skill */}
              <div className="pt-2 border-t border-stone-800 grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="+ Otra habilidad (ej. Alquimia)"
                  className="bg-[#121316] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100"
                />
                <select
                  value={newSkillAbility}
                  onChange={(e) => setNewSkillAbility(e.target.value as AbilityKey)}
                  className="bg-[#121316] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100"
                >
                  <option value="str">Fuerza (FUE)</option>
                  <option value="dex">Destreza (DES)</option>
                  <option value="con">Constitución (CON)</option>
                  <option value="int">Inteligencia (INT)</option>
                  <option value="wis">Sabiduría (SAB)</option>
                  <option value="cha">Carisma (CAR)</option>
                </select>
                <input
                  type="text"
                  value={newSkillDesc}
                  onChange={(e) => setNewSkillDesc(e.target.value)}
                  placeholder="Descripción de qué hace..."
                  className="bg-[#121316] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100"
                />
                <button
                  type="button"
                  onClick={handleAddExtraSkill}
                  className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-cinzel font-bold text-xs transition"
                >
                  + Agregar Habilidad
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Personality & Backstory */}
        {step === 3 && (
          <div className="space-y-3 overflow-y-auto flex-1 pr-1">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">
                Rasgos de Personalidad
              </label>
              <textarea
                value={personalityTraits}
                onChange={(e) => setPersonalityTraits(e.target.value)}
                rows={2}
                placeholder="¿Cómo se comporta tu personaje ante extraños o peligros?"
                className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">
                Ideales y Vínculos
              </label>
              <textarea
                value={ideals}
                onChange={(e) => setIdeals(e.target.value)}
                rows={2}
                placeholder="¿Por qué lucha? ¿A quién protege?"
                className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">
                Historia de Origen (Backstory)
              </label>
              <textarea
                value={backstory}
                onChange={(e) => setBackstory(e.target.value)}
                rows={3}
                placeholder="El pasado que lo llevó a convertirse en aventurero..."
                className="w-full bg-[#121316] border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
              />
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="pt-4 border-t border-stone-800 flex justify-between items-center mt-3">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-xs font-semibold rounded bg-stone-800 text-stone-300 hover:bg-stone-700"
            >
              Anterior
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2 text-xs font-cinzel font-bold rounded bg-amber-600 hover:bg-amber-500 text-white"
            >
              Siguiente Paso
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-6 py-2 text-xs font-cinzel font-bold rounded bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg"
            >
              Crear Hoja de Personaje
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
