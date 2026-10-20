import React, { useState } from 'react';
import { X, Dices, Sparkles, AlertOctagon, Volume2, VolumeX, Radio } from 'lucide-react';
import { DiceRollResult, RollMode } from '../../types/dnd';
import { soundFx } from '../../utils/audio';

interface DiceRollerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rollerName: string;
  initialRollTitle?: string;
  initialModifier?: number;
  initialDiceType?: number;
  initialMode?: RollMode;
  onRollComplete?: (result: DiceRollResult) => void;
  broadcastToRoom?: (result: DiceRollResult) => void;
}

const DICE_TYPES = [
  { sides: 4, label: 'd4', shape: 'tetrahedron' },
  { sides: 6, label: 'd6', shape: 'cube' },
  { sides: 8, label: 'd8', shape: 'octahedron' },
  { sides: 10, label: 'd10', shape: 'decagon' },
  { sides: 12, label: 'd12', shape: 'dodecahedron' },
  { sides: 20, label: 'd20', shape: 'icosahedron' },
  { sides: 100, label: 'd100', shape: 'percentile' },
];

export const DiceRollerModal: React.FC<DiceRollerModalProps> = ({
  isOpen,
  onClose,
  rollerName,
  initialRollTitle = 'Tirada General',
  initialModifier = 0,
  initialDiceType = 20,
  initialMode = 'normal',
  onRollComplete,
  broadcastToRoom,
}) => {
  const [sides, setSides] = useState<number>(initialDiceType);
  const [modifier, setModifier] = useState<number>(initialModifier);
  const [mode, setMode] = useState<RollMode>(initialMode);
  const [title, setTitle] = useState<string>(initialRollTitle);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<DiceRollResult | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(soundFx.isEnabled());
  const [autoBroadcast, setAutoBroadcast] = useState<boolean>(true);

  // Sync props when opening
  React.useEffect(() => {
    if (isOpen) {
      setTitle(initialRollTitle);
      setModifier(initialModifier);
      setSides(initialDiceType);
      setMode(initialMode);
    }
  }, [isOpen, initialRollTitle, initialModifier, initialDiceType, initialMode]);

  if (!isOpen) return null;

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFx.setEnabled(next);
  };

  const handleRoll = () => {
    if (isRolling) return;
    setIsRolling(true);
    soundFx.playDiceTumble();

    setTimeout(() => {
      let rawRolls: number[] = [];
      if (sides === 20 && (mode === 'advantage' || mode === 'disadvantage')) {
        rawRolls = [
          Math.floor(Math.random() * sides) + 1,
          Math.floor(Math.random() * sides) + 1,
        ];
      } else {
        rawRolls = [Math.floor(Math.random() * sides) + 1];
      }

      let chosen = rawRolls[0];
      if (mode === 'advantage' && rawRolls.length > 1) {
        chosen = Math.max(rawRolls[0], rawRolls[1]);
      } else if (mode === 'disadvantage' && rawRolls.length > 1) {
        chosen = Math.min(rawRolls[0], rawRolls[1]);
      }

      const isCrit = sides === 20 && chosen === 20;
      const isFumble = sides === 20 && chosen === 1;

      if (isCrit) {
        soundFx.playCriticalHit();
      } else if (isFumble) {
        soundFx.playCriticalFumble();
      }

      const total = chosen + modifier;
      const formula =
        sides === 20 && mode !== 'normal'
          ? `2d20 (${mode === 'advantage' ? 'Ventaja' : 'Desventaja'}) ${modifier >= 0 ? '+' : ''}${modifier}`
          : `1d${sides} ${modifier >= 0 ? '+' : ''}${modifier}`;

      const result: DiceRollResult = {
        id: `roll-${Date.now()}`,
        rollerName: rollerName || 'Aventurero',
        rollTitle: title || 'Tirada de Dados',
        formula,
        mode,
        diceType: sides,
        rolls: rawRolls,
        chosenRoll: chosen,
        modifier,
        total,
        isCrit,
        isFumble,
        timestamp: Date.now(),
      };

      setLastResult(result);
      setIsRolling(false);

      if (onRollComplete) onRollComplete(result);
      if (autoBroadcast && broadcastToRoom) broadcastToRoom(result);
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dice-roller-title"
    >
      <div className="relative w-full max-w-lg bg-[#18191e] border-2 border-amber-900/60 rounded-xl shadow-2xl p-6 text-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/30 mb-4">
          <div className="flex items-center gap-2">
            <Dices className="w-6 h-6 text-amber-500 animate-pulse" />
            <h2 id="dice-roller-title" className="text-xl font-bold font-cinzel text-amber-400">
              Lanzador de Dados Arcano
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className="p-1.5 text-stone-400 hover:text-amber-400 rounded-lg hover:bg-stone-800 transition"
              title={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
              aria-label={soundEnabled ? 'Silenciar efectos' : 'Activar efectos'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5 text-amber-500" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition"
              aria-label="Cerrar lanzador"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Motivo o Título */}
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">
            Motivo / Acción de la Tirada
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Ataque con Espada, Salvación de Destreza, Sigilo..."
            className="w-full bg-[#121316] border border-stone-700 focus:border-amber-500 focus:outline-none rounded px-3 py-2 text-stone-100 text-sm"
          />
        </div>

        {/* Selector de Dado */}
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
            Tipo de Dado
          </label>
          <div className="grid grid-cols-7 gap-1.5">
            {DICE_TYPES.map((die) => (
              <button
                key={die.sides}
                type="button"
                onClick={() => setSides(die.sides)}
                className={`py-2 px-1 text-center rounded font-cinzel font-bold text-sm transition border ${
                  sides === die.sides
                    ? 'bg-amber-600 text-white border-amber-400 shadow-md scale-105'
                    : 'bg-[#22242b] text-stone-300 border-stone-800 hover:border-amber-800 hover:bg-[#2b2d36]'
                }`}
              >
                {die.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modos de D20 (Ventaja / Normal / Desventaja) */}
        {sides === 20 && (
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
              Modo de Tirada d20
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode('disadvantage')}
                className={`py-1.5 px-3 rounded text-xs font-medium border transition ${
                  mode === 'disadvantage'
                    ? 'bg-red-950/80 text-red-300 border-red-600'
                    : 'bg-[#22242b] text-stone-400 border-stone-800 hover:border-red-900'
                }`}
              >
                Desventaja (Menor)
              </button>
              <button
                type="button"
                onClick={() => setMode('normal')}
                className={`py-1.5 px-3 rounded text-xs font-medium border transition ${
                  mode === 'normal'
                    ? 'bg-stone-700 text-amber-200 border-amber-600'
                    : 'bg-[#22242b] text-stone-400 border-stone-800 hover:border-stone-700'
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setMode('advantage')}
                className={`py-1.5 px-3 rounded text-xs font-medium border transition ${
                  mode === 'advantage'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                    : 'bg-[#22242b] text-stone-400 border-stone-800 hover:border-emerald-900'
                }`}
              >
                Ventaja (Mayor)
              </button>
            </div>
          </div>
        )}

        {/* Modificador */}
        <div className="mb-5 flex items-center justify-between bg-[#121316] p-3 rounded-lg border border-stone-800">
          <span className="text-sm font-medium text-stone-300">Modificador Sumado:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModifier((m) => m - 1)}
              className="w-8 h-8 rounded bg-stone-800 text-stone-200 hover:bg-stone-700 flex items-center justify-center font-bold text-lg"
              aria-label="Restar modificador"
            >
              -
            </button>
            <span className="w-12 text-center font-mono font-bold text-lg text-amber-400">
              {modifier >= 0 ? `+${modifier}` : modifier}
            </span>
            <button
              type="button"
              onClick={() => setModifier((m) => m + 1)}
              className="w-8 h-8 rounded bg-stone-800 text-stone-200 hover:bg-stone-700 flex items-center justify-center font-bold text-lg"
              aria-label="Sumar modificador"
            >
              +
            </button>
          </div>
        </div>

        {/* Checkbox para emitir a la sala de juego */}
        <div className="mb-5 flex items-center gap-2 text-xs text-stone-400">
          <input
            type="checkbox"
            id="broadcast-toggle"
            checked={autoBroadcast}
            onChange={(e) => setAutoBroadcast(e.target.checked)}
            className="w-4 h-4 rounded border-stone-700 text-amber-600 focus:ring-0 focus:ring-offset-0 bg-stone-900"
          />
          <label htmlFor="broadcast-toggle" className="cursor-pointer flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-amber-500" />
            Compartir resultado en vivo con la mesa (DM y grupo)
          </label>
        </div>

        {/* Botón Principal de Lanzar */}
        <button
          type="button"
          onClick={handleRoll}
          disabled={isRolling}
          className={`w-full py-3.5 rounded-xl font-cinzel font-bold text-lg tracking-wider text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
            isRolling
              ? 'bg-amber-800 opacity-80 cursor-not-allowed animate-pulse'
              : 'bg-gradient-to-r from-amber-700 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-500 active:scale-[0.99] border border-amber-500/50'
          }`}
        >
          <Dices className={`w-6 h-6 ${isRolling ? 'animate-spin' : ''}`} />
          {isRolling ? 'RODANDO DADOS...' : `¡LANZAR 1d${sides}${modifier >= 0 ? `+${modifier}` : modifier}!`}
        </button>

        {/* Tarjeta de Resultado */}
        {lastResult && (
          <div
            className={`mt-5 p-4 rounded-xl border text-center transition-all animate-in fade-in zoom-in-95 duration-200 ${
              lastResult.isCrit
                ? 'bg-gradient-to-b from-amber-950/80 to-amber-900/40 border-amber-500 shadow-amber-500/20 shadow-xl'
                : lastResult.isFumble
                ? 'bg-gradient-to-b from-red-950/80 to-stone-900/60 border-red-600 shadow-red-600/20 shadow-xl'
                : 'bg-[#14151a] border-stone-700'
            }`}
          >
            {lastResult.isCrit && (
              <div className="flex items-center justify-center gap-1.5 text-amber-400 font-cinzel font-black text-sm tracking-widest mb-1 animate-bounce">
                <Sparkles className="w-4 h-4 text-amber-400" />
                ¡20 NATURAL! ¡GOLPE CRÍTICO!
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
            )}
            {lastResult.isFumble && (
              <div className="flex items-center justify-center gap-1.5 text-red-400 font-cinzel font-bold text-sm tracking-widest mb-1">
                <AlertOctagon className="w-4 h-4 text-red-400" />
                ¡1 NATURAL! ¡PIFIA TOTAL!
                <AlertOctagon className="w-4 h-4 text-red-400" />
              </div>
            )}

            <div className="text-xs text-stone-400 mb-1">{lastResult.rollTitle}</div>

            {/* Número Total Grande */}
            <div
              className={`text-5xl font-black font-cinzel my-1 ${
                lastResult.isCrit
                  ? 'text-amber-300 drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]'
                  : lastResult.isFumble
                  ? 'text-red-400'
                  : 'text-stone-100'
              }`}
            >
              {lastResult.total}
            </div>

            {/* Desglose de la Tirada */}
            <div className="text-xs text-stone-400 flex items-center justify-center gap-2 mt-2 font-mono">
              <span>
                Dados:{' '}
                {lastResult.rolls.length > 1
                  ? `[${lastResult.rolls.join(', ')}] -> Elegido: ${lastResult.chosenRoll}`
                  : `${lastResult.chosenRoll}`}
              </span>
              <span>+</span>
              <span>Mod: {lastResult.modifier >= 0 ? `+${lastResult.modifier}` : lastResult.modifier}</span>
              <span>=</span>
              <span className="font-bold text-amber-400">{lastResult.total}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
