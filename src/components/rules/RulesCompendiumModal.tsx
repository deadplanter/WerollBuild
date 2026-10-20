import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Search,
  Shield,
  Zap,
  Sparkles,
  AlertCircle,
  Sword,
  Users,
  Compass,
  Scroll,
} from 'lucide-react';
import {
  SRD_CLASSES,
  SRD_RACES,
  SRD_CONDITIONS,
  SRD_COMPREHENSIVE_RULES,
  SRD_WEAPONS,
  SRD_ARMORS,
  SRD_COMMON_SPELLS,
  SKILL_METADATA,
} from '../../data/srd';

interface RulesCompendiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAskOracle: (topic: string) => void;
}

export const RulesCompendiumModal: React.FC<RulesCompendiumModalProps> = ({
  isOpen,
  onClose,
  onAskOracle,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [category, setCategory] = useState<
    'combat' | 'classes' | 'races' | 'magic' | 'equipment' | 'conditions' | 'skills'
  >('combat');

  if (!isOpen) return null;

  const term = searchTerm.toLowerCase();

  const filteredCombat = SRD_COMPREHENSIVE_RULES.filter(
    (r) =>
      r.category === 'combate' &&
      (r.title.toLowerCase().includes(term) || r.description.toLowerCase().includes(term))
  );

  const filteredMagicRules = SRD_COMPREHENSIVE_RULES.filter(
    (r) =>
      r.category === 'magia' &&
      (r.title.toLowerCase().includes(term) || r.description.toLowerCase().includes(term))
  );

  const filteredSpells = SRD_COMMON_SPELLS.filter(
    (s) =>
      s.name.toLowerCase().includes(term) ||
      s.school.toLowerCase().includes(term) ||
      s.description.toLowerCase().includes(term)
  );

  const filteredWeapons = SRD_WEAPONS.filter(
    (w) =>
      w.name.toLowerCase().includes(term) ||
      w.category.toLowerCase().includes(term) ||
      w.properties.some((p) => p.toLowerCase().includes(term))
  );

  const filteredArmors = SRD_ARMORS.filter(
    (a) =>
      a.name.toLowerCase().includes(term) ||
      a.category.toLowerCase().includes(term) ||
      a.ac.toLowerCase().includes(term)
  );

  const filteredClasses = Object.values(SRD_CLASSES).filter(
    (cl) =>
      cl.name.toLowerCase().includes(term) ||
      cl.description.toLowerCase().includes(term) ||
      cl.keyFeatures.some((f) => f.name.toLowerCase().includes(term) || f.desc.toLowerCase().includes(term))
  );

  const filteredRaces = SRD_RACES.filter(
    (r) => r.name.toLowerCase().includes(term) || r.description.toLowerCase().includes(term)
  );

  const filteredConditions = SRD_CONDITIONS.filter(
    (c) => c.name.toLowerCase().includes(term) || c.effect.toLowerCase().includes(term)
  );

  const filteredSkills = Object.entries(SKILL_METADATA).filter(
    ([key, meta]) =>
      meta.nameEs.toLowerCase().includes(term) ||
      meta.description.toLowerCase().includes(term) ||
      key.toLowerCase().includes(term)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compendium-title"
    >
      <div className="relative w-full max-w-5xl h-[90vh] bg-[#181920] border-2 border-amber-900/60 rounded-2xl shadow-2xl p-4 sm:p-6 text-stone-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/30 mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-500" />
            <div>
              <h2 id="compendium-title" className="text-lg sm:text-xl font-bold font-cinzel text-amber-400">
                Manual y Compendio Completo de Reglas 5E (SRD)
              </h2>
              <p className="text-[11px] text-stone-400">
                Reglas oficiales, clases, razas, combate, magia, equipo y estados alterados de 5ª Edición.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition"
            aria-label="Cerrar compendio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Tabs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar en el manual (ej. Concentración, Furia, Espadón, Cegado, CD 15)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#121316] border border-stone-700 focus:border-amber-500 focus:outline-none rounded-lg pl-9 pr-3 py-2 text-stone-100 text-xs sm:text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'combat', label: 'Combate', icon: Sword },
              { id: 'classes', label: 'Clases', icon: Shield },
              { id: 'races', label: 'Razas', icon: Users },
              { id: 'magic', label: 'Magia', icon: Sparkles },
              { id: 'equipment', label: 'Armas & Equipo', icon: Zap },
              { id: 'conditions', label: 'Estados', icon: AlertCircle },
              { id: 'skills', label: 'Habilidades', icon: Compass },
            ].map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-cinzel font-bold transition whitespace-nowrap border ${
                    category === cat.id
                      ? 'bg-amber-600 text-white border-amber-400 shadow-sm'
                      : 'bg-[#121316] text-stone-400 border-stone-800 hover:text-stone-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* 1. COMBAT */}
          {category === 'combat' && (
            <div className="space-y-3">
              {filteredCombat.map((rule, idx) => (
                <div key={idx} className="p-4 bg-[#121316] border border-stone-800 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-cinzel font-bold text-amber-300 text-base">{rule.title}</h3>
                    <button
                      onClick={() => onAskOracle(`Explícame a fondo la regla de "${rule.title}" de D&D 5E`)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/60"
                    >
                      <Sparkles className="w-3 h-3" />
                      Preguntar a IA
                    </button>
                  </div>
                  <div className="text-xs text-stone-300 leading-relaxed whitespace-pre-line">
                    {rule.description}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. CLASSES */}
          {category === 'classes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredClasses.map((cls, idx) => (
                <div key={idx} className="p-4 bg-[#121316] border border-stone-800 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="font-cinzel font-bold text-amber-300 text-lg">{cls.name}</h3>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                        Dado de Golpe: {cls.hitDie}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mb-3 italic">{cls.description}</p>

                    <div className="text-xs text-stone-300 space-y-1 bg-[#181920] p-2.5 rounded-lg border border-stone-800/80 mb-3 font-mono">
                      <div>
                        <strong className="text-amber-400 font-sans">Atributo Primario:</strong> {cls.primaryAbility}
                      </div>
                      <div>
                        <strong className="text-amber-400 font-sans">Salvaciones:</strong> {cls.savingThrows.map((s) => s.toUpperCase()).join(', ')}
                      </div>
                      <div>
                        <strong className="text-amber-400 font-sans">Armaduras:</strong> {cls.armorProficiencies.join(', ')}
                      </div>
                      <div>
                        <strong className="text-amber-400 font-sans">Armas:</strong> {cls.weaponProficiencies.join(', ')}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-cinzel font-bold text-stone-400 uppercase tracking-wider block">
                        Rasgos Clave de Nivel 1 a 3:
                      </span>
                      {cls.keyFeatures.map((feat, fIdx) => (
                        <div key={fIdx} className="text-xs bg-[#15161c] p-2 rounded border border-stone-800/60">
                          <span className="font-bold text-amber-300">
                            Nvl {feat.level} • {feat.name}:
                          </span>{' '}
                          <span className="text-stone-300">{feat.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-stone-800/80 flex justify-end">
                    <button
                      onClick={() => onAskOracle(`Dame una guía detallada y recomendaciones para jugar un ${cls.name} en D&D 5E`)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Consultar Estrategia con IA
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. RACES */}
          {category === 'races' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredRaces.map((race, idx) => (
                <div key={idx} className="p-4 bg-[#121316] border border-stone-800 rounded-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-cinzel font-bold text-amber-300 text-base">{race.name}</h3>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-stone-800 text-stone-300">
                      Velocidad: {race.speed} pies
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed">{race.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* 4. MAGIC */}
          {category === 'magic' && (
            <div className="space-y-4">
              {/* Magic Rules */}
              <div className="space-y-3">
                <h4 className="font-cinzel font-bold text-sm text-purple-300 uppercase tracking-wider">
                  Reglas Fundamentales del Lanzamiento de Conjuros
                </h4>
                {filteredMagicRules.map((rule, idx) => (
                  <div key={idx} className="p-3.5 bg-[#121316] border border-purple-950/40 rounded-xl">
                    <h3 className="font-cinzel font-bold text-purple-300 text-sm mb-1">{rule.title}</h3>
                    <div className="text-xs text-stone-300 leading-relaxed whitespace-pre-line">
                      {rule.description}
                    </div>
                  </div>
                ))}
              </div>

              {/* Spells List */}
              <div className="pt-3 border-t border-stone-800">
                <h4 className="font-cinzel font-bold text-sm text-amber-300 uppercase tracking-wider mb-3">
                  Compendio de Conjuros Comunes (Nivel 0 a 3)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredSpells.map((sp, idx) => (
                    <div key={idx} className="p-3 bg-[#121316] border border-stone-800 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-cinzel font-bold text-stone-100 text-sm">{sp.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                          {sp.level === 0 ? 'Truco' : `Nivel ${sp.level}`} • {sp.school}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-400 mb-2 font-mono">
                        Tiempo: {sp.castingTime} | Alcance: {sp.range} | Duración: {sp.duration}
                      </div>
                      <p className="text-xs text-stone-300 leading-relaxed">{sp.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. EQUIPMENT & WEAPONS */}
          {category === 'equipment' && (
            <div className="space-y-5">
              {/* Weapons Table */}
              <div>
                <h4 className="font-cinzel font-bold text-sm text-amber-300 uppercase tracking-wider mb-2">
                  Tabla Oficial de Armas Simples y Marciales
                </h4>
                <div className="overflow-x-auto border border-stone-800 rounded-xl">
                  <table className="w-full text-left text-xs text-stone-300 bg-[#121316]">
                    <thead className="bg-[#181920] text-amber-400 font-cinzel text-[11px] border-b border-stone-800">
                      <tr>
                        <th className="py-2.5 px-3">Nombre</th>
                        <th className="py-2.5 px-3">Categoría</th>
                        <th className="py-2.5 px-3">Daño</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3">Peso</th>
                        <th className="py-2.5 px-3">Propiedades</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/60 font-mono">
                      {filteredWeapons.map((w, idx) => (
                        <tr key={idx} className="hover:bg-stone-900/50">
                          <td className="py-2 px-3 font-cinzel font-bold text-stone-100">{w.name}</td>
                          <td className="py-2 px-3 text-stone-400">{w.category} ({w.rangeType})</td>
                          <td className="py-2 px-3 font-bold text-amber-300">{w.damage}</td>
                          <td className="py-2 px-3 text-stone-400">{w.damageType}</td>
                          <td className="py-2 px-3 text-stone-400">{w.weight} lb</td>
                          <td className="py-2 px-3 text-stone-300 font-sans text-[11px]">{w.properties.join(', ') || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Armors Table */}
              <div>
                <h4 className="font-cinzel font-bold text-sm text-amber-300 uppercase tracking-wider mb-2">
                  Tabla de Armaduras y Escudos
                </h4>
                <div className="overflow-x-auto border border-stone-800 rounded-xl">
                  <table className="w-full text-left text-xs text-stone-300 bg-[#121316]">
                    <thead className="bg-[#181920] text-amber-400 font-cinzel text-[11px] border-b border-stone-800">
                      <tr>
                        <th className="py-2.5 px-3">Armadura</th>
                        <th className="py-2.5 px-3">Categoría</th>
                        <th className="py-2.5 px-3">Clase de Armadura (CA)</th>
                        <th className="py-2.5 px-3">Fuerza Req.</th>
                        <th className="py-2.5 px-3">Sigilo</th>
                        <th className="py-2.5 px-3">Coste</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/60 font-mono">
                      {filteredArmors.map((a, idx) => (
                        <tr key={idx} className="hover:bg-stone-900/50">
                          <td className="py-2 px-3 font-cinzel font-bold text-stone-100">{a.name}</td>
                          <td className="py-2 px-3 text-stone-400">{a.category}</td>
                          <td className="py-2 px-3 font-bold text-emerald-400">{a.ac}</td>
                          <td className="py-2 px-3 text-stone-400">{a.strengthReq ? `FUE ${a.strengthReq}` : '—'}</td>
                          <td className="py-2 px-3 text-stone-400">
                            {a.stealthDisadvantage ? (
                              <span className="text-red-400 font-sans text-[10px]">Desventaja</span>
                            ) : (
                              'Normal'
                            )}
                          </td>
                          <td className="py-2 px-3 text-amber-300">{a.cost}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6. CONDITIONS */}
          {category === 'conditions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredConditions.map((cond, idx) => (
                <div key={idx} className="p-3.5 bg-[#121316] border border-red-950/50 rounded-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-cinzel font-bold text-red-300 text-sm flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                      {cond.name}
                    </h3>
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed whitespace-pre-line">{cond.effect}</p>
                </div>
              ))}
            </div>
          )}

          {/* 7. SKILLS */}
          {category === 'skills' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredSkills.map(([key, meta]) => (
                <div key={key} className="p-3.5 bg-[#121316] border border-stone-800 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-cinzel font-bold text-stone-100 text-sm">{meta.nameEs}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono font-bold uppercase">
                        {meta.ability}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mb-2">{meta.description}</p>
                  </div>
                  <div className="text-[10px] text-stone-500 italic bg-[#15161c] p-1.5 rounded border border-stone-800/60">
                    {meta.dcExamples}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
