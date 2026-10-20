import React from 'react';
import { Dices, Sparkles } from 'lucide-react';
import { DiceRollResult } from '../../types/dnd';

interface QuickDiceBarProps {
  onQuickRoll: (sides: number) => void;
  onOpenFullRoller: () => void;
  recentRoll?: DiceRollResult | null;
}

export const QuickDiceBar: React.FC<QuickDiceBarProps> = ({
  onQuickRoll,
  onOpenFullRoller,
  recentRoll,
}) => {
  const dice = [4, 6, 8, 10, 12, 20, 100];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[#17181f]/95 border border-amber-900/60 shadow-2xl backdrop-blur-md px-3 py-2 rounded-2xl flex items-center gap-2 max-w-[95vw] overflow-x-auto">
      {/* Quick button to open full custom modal */}
      <button
        onClick={onOpenFullRoller}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white rounded-lg font-cinzel font-bold text-xs uppercase tracking-wider transition shadow shrink-0"
        title="Abrir lanzador personalizado con modificadores y ventaja"
      >
        <Dices className="w-4 h-4" />
        <span>Tirador</span>
      </button>

      <div className="h-6 w-px bg-stone-700 shrink-0" />

      {/* Instant dice buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {dice.map((d) => (
          <button
            key={d}
            onClick={() => onQuickRoll(d)}
            className="px-2.5 py-1 bg-stone-800/90 hover:bg-stone-700 text-stone-200 hover:text-amber-300 font-cinzel font-bold text-xs rounded border border-stone-700 hover:border-amber-700/60 transition active:scale-95"
            title={`Tirar 1d${d}`}
          >
            d{d}
          </button>
        ))}
      </div>

      {/* Recent roll notification bubble if exists */}
      {recentRoll && (
        <>
          <div className="h-6 w-px bg-stone-700 shrink-0" />
          <div
            onClick={onOpenFullRoller}
            className={`cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded text-xs shrink-0 font-mono font-medium transition ${
              recentRoll.isCrit
                ? 'bg-amber-950 text-amber-300 border border-amber-500/80 animate-pulse'
                : recentRoll.isFumble
                ? 'bg-red-950 text-red-300 border border-red-700'
                : 'bg-stone-800 text-stone-300'
            }`}
          >
            {recentRoll.isCrit && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
            <span className="text-[10px] text-stone-400 max-w-[90px] truncate">{recentRoll.rollerName}:</span>
            <span className="font-bold text-amber-400">{recentRoll.total}</span>
            <span className="text-[10px] text-stone-500">({recentRoll.formula})</span>
          </div>
        </>
      )}
    </div>
  );
};
