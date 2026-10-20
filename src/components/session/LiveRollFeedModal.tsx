import React from 'react';
import { X, Radio, Dices, Sparkles, AlertOctagon, Trash2 } from 'lucide-react';
import { DiceRollResult } from '../../types/dnd';

interface LiveRollFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  rolls: DiceRollResult[];
  onClearRolls?: () => void;
}

export const LiveRollFeedModal: React.FC<LiveRollFeedModalProps> = ({
  isOpen,
  onClose,
  rolls,
  onClearRolls,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="roll-feed-title"
    >
      <div className="relative w-full max-w-xl max-h-[85vh] bg-[#181920] border-2 border-amber-900/60 rounded-2xl shadow-2xl p-6 text-stone-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/30 mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-6 h-6 text-amber-500 animate-pulse" />
            <h2 id="roll-feed-title" className="text-xl font-bold font-cinzel text-amber-400">
              Registro de Tiradas en Vivo
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {onClearRolls && rolls.length > 0 && (
              <button
                onClick={onClearRolls}
                className="p-1.5 text-stone-500 hover:text-red-400 rounded hover:bg-stone-800 transition"
                title="Limpiar registro"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Rolls list */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {rolls.length === 0 ? (
            <div className="text-center py-12 text-stone-500 text-sm italic">
              Aún no se han registrado tiradas en esta sesión. ¡Lanza tus dados para que aparezcan aquí!
            </div>
          ) : (
            rolls.slice().reverse().map((roll) => (
              <div
                key={roll.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                  roll.isCrit
                    ? 'bg-amber-950/60 border-amber-500 shadow-md'
                    : roll.isFumble
                    ? 'bg-red-950/60 border-red-700 shadow-md'
                    : 'bg-[#121316] border-stone-800'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-cinzel text-stone-200 text-xs sm:text-sm">
                      {roll.rollerName}
                    </span>
                    <span className="text-xs text-stone-400">({roll.rollTitle})</span>
                    {roll.isCrit && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/50 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        ¡Crítico!
                      </span>
                    )}
                    {roll.isFumble && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 font-bold border border-red-500/50 flex items-center gap-1">
                        <AlertOctagon className="w-3 h-3 text-red-400" />
                        ¡Pifia!
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                    Fórmula: {roll.formula} • Dados: [{roll.rolls.join(', ')}]
                    {roll.mode !== 'normal' && ` (${roll.mode === 'advantage' ? 'Ventaja' : 'Desventaja'})`}
                  </div>
                </div>

                <div
                  className={`text-2xl font-black font-cinzel ${
                    roll.isCrit
                      ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                      : roll.isFumble
                      ? 'text-red-400'
                      : 'text-stone-100'
                  }`}
                >
                  {roll.total}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
