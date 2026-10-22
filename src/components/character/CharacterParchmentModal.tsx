import React, { useState } from 'react';
import { X, Plus, Trash2, Scroll, Award, BookOpen, Edit2 } from 'lucide-react';
import { Character5e } from '../../types/dnd';

interface CharacterParchmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character5e;
  onUpdateCharacter: (updated: Character5e) => void;
  isLocked?: boolean;
  onUnlockRequest?: () => void;
}

const COMMON_BACKGROUNDS = [
  'Acólito',
  'Artesano Gremial',
  'Charlatán',
  'Criminal',
  'Erudito',
  'Ermitaño',
  'Forastero',
  'Héroe del Pueblo',
  'Huérfano',
  'Marinero',
  'Noble',
  'Sabio',
  'Soldado',
];

export const CharacterParchmentModal: React.FC<CharacterParchmentModalProps> = ({
  isOpen,
  onClose,
  character,
  onUpdateCharacter,
  isLocked = false,
  onUnlockRequest,
}) => {
  const [newTraitTitle, setNewTraitTitle] = useState('');
  const [newTraitSource, setNewTraitSource] = useState('Raza / Clase / Dote');
  const [newTraitDesc, setNewTraitDesc] = useState('');
  const [editingTraitId, setEditingTraitId] = useState<string | null>(null);

  if (!isOpen) return null;

  const featuresList = character.featuresAndTraits || [];

  const handleSaveTrait = () => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    if (!newTraitTitle.trim()) return;

    if (editingTraitId) {
      onUpdateCharacter({
        ...character,
        featuresAndTraits: featuresList.map((t) =>
          t.id === editingTraitId
            ? {
                ...t,
                name: newTraitTitle.trim(),
                source: newTraitSource.trim() || 'Rasgo Especial',
                description: newTraitDesc.trim() || 'Rasgo de personaje.',
              }
            : t
        ),
      });
      setEditingTraitId(null);
    } else {
      onUpdateCharacter({
        ...character,
        featuresAndTraits: [
          ...featuresList,
          {
            id: `feat-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            name: newTraitTitle.trim(),
            source: newTraitSource.trim() || 'Rasgo Especial',
            description: newTraitDesc.trim() || 'Rasgo de personaje.',
          },
        ],
      });
    }
    setNewTraitTitle('');
    setNewTraitDesc('');
  };

  const removeTrait = (id: string) => {
    if (isLocked) {
      if (onUnlockRequest) onUnlockRequest();
      return;
    }
    onUpdateCharacter({
      ...character,
      featuresAndTraits: featuresList.filter((t) => t.id !== id),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Pergamino 5E de Rasgos y Trasfondo"
    >
      <div
        className="relative w-full max-w-5xl my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Wooden & Gold Scroll Roller */}
        <div className="h-7 rounded-full bg-gradient-to-b from-[#6a4423] via-[#3d2511] to-[#231408] border-2 border-[#d4af37] shadow-[0_6px_20px_rgba(0,0,0,0.85)] flex items-center justify-between px-4 z-10">
          <div className="w-6 h-3 rounded-full bg-[#d4af37]" />
          <span className="font-cinzel text-[11px] tracking-[0.35em] text-[#f3dfb2] font-bold uppercase">
            PERGAMINO OFICIAL DE AVENTURERO 5E
          </span>
          <div className="w-6 h-3 rounded-full bg-[#d4af37]" />
        </div>

        {/* Unrolled Aged Parchment Body */}
        <div className="mx-3 sm:mx-6 flex-1 overflow-y-auto bg-gradient-to-b from-[#f3e5c8] via-[#ead7b3] to-[#dfc699] text-[#2b1d0e] border-x-4 border-[#8c6635] shadow-[inset_0_0_50px_rgba(107,70,27,0.35)] p-5 sm:p-8 space-y-6">
          {/* Header Banner inside Parchment */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#6e471f] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#3a2410] border-2 border-[#c8a45c] flex items-center justify-center text-[#f3dfb2]">
                <Scroll className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-cinzel text-2xl sm:text-3xl font-black text-[#2b1808] tracking-wide uppercase">
                  RASGOS, DOTES Y TRASFONDO
                </h2>
                <p className="text-xs sm:text-sm text-[#5c3e1e] font-semibold">
                  {character.name} • {character.race} {character.characterClass} (Nivel{' '}
                  {character.level}) • {character.alignment}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar pergamino"
              className="px-3.5 py-2 rounded-xl bg-[#3a2410] hover:bg-[#523418] text-[#f5e6c8] border border-[#c8a45c] font-cinzel text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" /> Cerrar Pergamino
            </button>
          </div>

          {/* Trasfondo Selector & Languages Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#e4cea4]/80 border-2 border-[#8c6635] rounded-xl p-4">
            <div>
              <label className="block font-cinzel text-xs font-extrabold uppercase tracking-wider text-[#4a2e12] mb-1">
                Trasfondo del Personaje
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled={isLocked}
                  value={character.background || ''}
                  onChange={(e) =>
                    onUpdateCharacter({ ...character, background: e.target.value })
                  }
                  className="flex-1 bg-[#fbf3e4] border border-[#8c6635] rounded-lg px-3 py-1.5 text-sm font-bold text-[#2b1808]"
                />
                <select
                  disabled={isLocked}
                  onChange={(e) => {
                    if (e.target.value) {
                      onUpdateCharacter({ ...character, background: e.target.value });
                    }
                  }}
                  value=""
                  className="bg-[#3a2410] text-[#f5e6c8] text-xs font-bold px-2.5 rounded-lg"
                >
                  <option value="">SRD...</option>
                  {COMMON_BACKGROUNDS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-cinzel text-xs font-extrabold uppercase tracking-wider text-[#4a2e12] mb-1">
                Idiomas y Competencias
              </label>
              <input
                type="text"
                disabled={isLocked}
                value={(character.languages || ['Común']).join(', ')}
                onChange={(e) =>
                  onUpdateCharacter({
                    ...character,
                    languages: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                className="w-full bg-[#fbf3e4] border border-[#8c6635] rounded-lg px-3 py-1.5 text-sm font-medium text-[#2b1808]"
              />
            </div>
          </div>

          {/* Classic 5E 2-Column Layout: Left = 4 Personality Boxes, Right = Special Traits & Feats */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5E Column: Rasgos de Personalidad, Ideales, Vínculos, Defectos */}
            <div className="lg:col-span-5 space-y-3">
              {(
                [
                  {
                    field: 'personalityTraits',
                    label: 'Rasgos de Personalidad',
                    placeholder: '¿Cómo actúa y habla tu personaje?',
                  },
                  {
                    field: 'ideals',
                    label: 'Ideales',
                    placeholder: '¿Qué principios guían sus decisiones?',
                  },
                  {
                    field: 'bonds',
                    label: 'Vínculos',
                    placeholder: '¿Qué personas, lugares o reliquias protege?',
                  },
                  {
                    field: 'flaws',
                    label: 'Defectos',
                    placeholder: '¿Cuál es su debilidad, miedo o vicio?',
                  },
                ] as const
              ).map((box) => (
                <div
                  key={box.field}
                  className="bg-[#fbf3e4] border-2 border-[#7b5628] rounded-xl p-3 shadow-sm relative"
                >
                  <textarea
                    rows={2}
                    disabled={isLocked}
                    value={character[box.field] || ''}
                    onChange={(e) =>
                      onUpdateCharacter({
                        ...character,
                        [box.field]: e.target.value,
                      })
                    }
                    placeholder={box.placeholder}
                    className="w-full bg-transparent text-sm text-[#2b1808] resize-none focus:outline-none font-medium"
                  />
                  <div className="border-t border-[#bba073] pt-1 mt-1 text-center font-cinzel text-[11px] font-extrabold uppercase tracking-widest text-[#5c3e1e]">
                    {box.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Right 5E Column: Rasgos Especiales, Atributos de Clase y Dotes */}
            <div className="lg:col-span-7 flex flex-col bg-[#fbf3e4] border-2 border-[#7b5628] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between border-b-2 border-[#8c6635] pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#6e471f]" />
                  <h3 className="font-cinzel text-base font-black text-[#2b1808] uppercase">
                    Rasgos Especiales y Dotes
                  </h3>
                </div>
                <span className="text-xs font-bold text-[#6e471f]">
                  {featuresList.length} registrados
                </span>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 mb-4">
                {featuresList.map((tr) => (
                  <div
                    key={tr.id}
                    className="bg-[#efe1c6] border border-[#b59461] rounded-lg p-3 flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-cinzel font-bold text-sm text-[#2b1808]">
                          {tr.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#3a2410] text-[#f3dfb2] font-bold">
                          {tr.source}
                        </span>
                      </div>
                      <p className="text-xs text-[#422b13] mt-1 leading-relaxed">
                        {tr.description}
                      </p>
                    </div>
                    {!isLocked && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTraitId(tr.id);
                            setNewTraitTitle(tr.name);
                            setNewTraitSource(tr.source);
                            setNewTraitDesc(tr.description);
                          }}
                          className="text-[#4a2e12] hover:text-black p-1 cursor-pointer"
                          title="Editar rasgo"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTrait(tr.id)}
                          className="text-red-800 hover:text-red-600 p-1 cursor-pointer"
                          title="Eliminar rasgo o dote"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add / Edit Feat / Trait inside Parchment */}
              {!isLocked && (
                <div className="mt-auto bg-[#e6d3ad] border border-[#9e7742] rounded-lg p-3 space-y-2">
                  <div className="text-xs font-cinzel font-bold text-[#3a2410]">
                    {editingTraitId ? 'Editar Rasgo o Dote' : '+ Añadir Nuevo Rasgo o Dote'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newTraitTitle}
                      onChange={(e) => setNewTraitTitle(e.target.value)}
                      placeholder="Nombre (Ej. Visión en la Oscuridad)"
                      className="sm:col-span-2 bg-[#fbf3e4] border border-[#8c6635] rounded px-2.5 py-1 text-xs text-[#2b1808]"
                    />
                    <input
                      type="text"
                      value={newTraitSource}
                      onChange={(e) => setNewTraitSource(e.target.value)}
                      placeholder="Origen (Raza, Clase, Dote)"
                      className="bg-[#fbf3e4] border border-[#8c6635] rounded px-2.5 py-1 text-xs text-[#2b1808]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTraitDesc}
                      onChange={(e) => setNewTraitDesc(e.target.value)}
                      placeholder="Descripción del efecto o beneficio..."
                      className="flex-1 bg-[#fbf3e4] border border-[#8c6635] rounded px-2.5 py-1 text-xs text-[#2b1808]"
                    />
                    <button
                      type="button"
                      onClick={handleSaveTrait}
                      className="px-3 py-1 rounded bg-[#3a2410] hover:bg-[#523418] text-[#f5e6c8] text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> {editingTraitId ? 'Guardar' : 'Agregar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Full-width Backstory / Historial del Personaje */}
          <div className="bg-[#fbf3e4] border-2 border-[#7b5628] rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#bba073] pb-2 mb-2">
              <BookOpen className="w-4 h-4 text-[#6e471f]" />
              <h3 className="font-cinzel text-sm font-black uppercase tracking-wider text-[#2b1808]">
                Historial del Personaje
              </h3>
            </div>
            <textarea
              rows={4}
              disabled={isLocked}
              value={character.backstory || ''}
              onChange={(e) =>
                onUpdateCharacter({ ...character, backstory: e.target.value })
              }
              placeholder="Escribe aquí el origen, juramentos, cicatrices y leyenda de tu personaje..."
              className="w-full bg-transparent text-sm text-[#2b1808] leading-relaxed focus:outline-none"
            />
          </div>
        </div>

        {/* Bottom Wooden & Gold Scroll Roller */}
        <div className="h-7 rounded-full bg-gradient-to-b from-[#6a4423] via-[#3d2511] to-[#231408] border-2 border-[#d4af37] shadow-[0_6px_20px_rgba(0,0,0,0.85)] flex items-center justify-between px-4 z-10">
          <div className="w-6 h-3 rounded-full bg-[#d4af37]" />
          <span className="font-cinzel text-[10px] tracking-[0.25em] text-[#cbb692]">
            TODOS LOS CAMBIOS SE GUARDAN AUTOMÁTICAMENTE
          </span>
          <div className="w-6 h-3 rounded-full bg-[#d4af37]" />
        </div>
      </div>
    </div>
  );
};
