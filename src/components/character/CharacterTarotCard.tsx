import React from 'react';
import { Shield, Zap, Eye, Plus, Minus } from 'lucide-react';
import { EntityAvatar } from '../common/EntityAvatar';
import { Character5e, PartyMemberLive } from '../../types/dnd';
import {
  calculateModifier,
  formatModifier,
  calculateProficiencyBonus,
  calculatePassivePerception,
  getEffectiveAbilityModifier,
  parseAlignmentDescriptor,
} from '../../utils/dnd-math';

export interface CharacterTarotCardProps {
  character?: Character5e;
  member?: PartyMemberLive;
  isOnline?: boolean;
  compact?: boolean;
  miniGrid?: boolean;
  onClickCoinPouch?: () => void;
  showDmControls?: boolean;
  onDmAdjustPlayer?: (
    characterId: string,
    updates: { hpDelta?: number; setHp?: number; gpDelta?: number }
  ) => void;
  footerActions?: React.ReactNode;
  className?: string;
  dataTestId?: string;
  testId?: string;
}

/**
 * Renders the alignment icon based on ethics (shape) and morality (color):
 * - Morality (Color): Bueno -> Green, Neutral -> Gray/Silver, Malvado -> Red
 * - Ethics (Shape): Caótico -> Spiral/Vortex, Neutral -> Equilibrium Symbol, Legal -> Scales/Law Book
 */
export const AlignmentBadgeIcon: React.FC<{
  alignment?: string;
  size?: 'xs' | 'sm' | 'md';
}> = ({ alignment = 'Neutral Bueno', size = 'md' }) => {
  const desc = parseAlignmentDescriptor(alignment);

  const colorClasses =
    desc.colorTone === 'green'
      ? {
          icon: 'text-emerald-400',
          glow: 'shadow-[0_0_12px_rgba(16,185,129,0.55)]',
          bg: 'from-emerald-950/90 to-[#11181c]',
          stroke: '#34d399',
          secondaryStroke: '#10b981',
        }
      : desc.colorTone === 'red'
      ? {
          icon: 'text-red-400',
          glow: 'shadow-[0_0_12px_rgba(239,68,68,0.55)]',
          bg: 'from-red-950/90 to-[#1c1113]',
          stroke: '#f87171',
          secondaryStroke: '#ef4444',
        }
      : {
          icon: 'text-slate-300',
          glow: 'shadow-[0_0_12px_rgba(148,163,184,0.45)]',
          bg: 'from-slate-800/90 to-[#14171f]',
          stroke: '#cbd5e1',
          secondaryStroke: '#94a3b8',
        };

  const boxDim =
    size === 'xs'
      ? 'w-5 h-5 rounded'
      : size === 'sm'
      ? 'w-6 h-6 rounded-md'
      : 'w-8 h-8 rounded-lg';
  const svgDim =
    size === 'xs' ? 'w-3.5 h-3.5' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div
      className={`relative group inline-flex items-center justify-center ${boxDim} bg-gradient-to-b ${colorClasses.bg} border border-[#c8a45c]/85 ${colorClasses.glow} cursor-help shrink-0 select-none`}
      data-testid="character-alignment-badge"
      aria-label={`Alineamiento: ${desc.labelEs}`}
    >
      {desc.shape === 'spiral' && (
        /* Caótico: Swirling Arcane Vortex / Spiral */
        <svg viewBox="0 0 24 24" className={svgDim} fill="none">
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke={colorClasses.secondaryStroke}
            strokeWidth="1.2"
            strokeDasharray="3 2"
            opacity="0.65"
          />
          <path
            d="M12 12c0-2.2 1.8-4 4-4s4 1.8 4 4c0 3.5-2.8 6.3-6.3 6.3-4.6 0-8.2-3.7-8.2-8.2 0-5.2 4.3-9.1 9.5-9.1"
            stroke={colorClasses.stroke}
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M12 12c0 2.2-1.8 4-4 4s-4-1.8-4-4c0-3.5 2.8-6.3 6.3-6.3 4.6 0 8.2 3.7 8.2 8.2"
            stroke={colorClasses.secondaryStroke}
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.85"
          />
          <circle cx="12" cy="12" r="2" fill={colorClasses.stroke} />
        </svg>
      )}

      {desc.shape === 'equilibrium' && (
        /* Neutral: Cosmic Equilibrium / Balance Crest */
        <svg viewBox="0 0 24 24" className={svgDim} fill="none">
          <circle
            cx="12"
            cy="12"
            r="8.5"
            stroke={colorClasses.stroke}
            strokeWidth="1.8"
          />
          <polygon
            points="12,4.5 19.5,12 12,19.5 4.5,12"
            stroke={colorClasses.secondaryStroke}
            strokeWidth="1.6"
            fill={colorClasses.stroke}
            fillOpacity="0.18"
          />
          <line
            x1="4"
            y1="12"
            x2="20"
            y2="12"
            stroke={colorClasses.stroke}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="2.2" fill={colorClasses.stroke} />
        </svg>
      )}

      {desc.shape === 'scales' && (
        /* Legal: Scales of Justice & Law */
        <svg viewBox="0 0 24 24" className={svgDim} fill="none">
          <line
            x1="12"
            y1="3.5"
            x2="12"
            y2="19.5"
            stroke={colorClasses.stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="8"
            y1="19.5"
            x2="16"
            y2="19.5"
            stroke={colorClasses.stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M5 7.5h14"
            stroke={colorClasses.stroke}
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <path
            d="M6 7.5L3.8 13h4.4L6 7.5z"
            stroke={colorClasses.secondaryStroke}
            strokeWidth="1.5"
            fill={colorClasses.stroke}
            fillOpacity="0.25"
          />
          <path
            d="M18 7.5L15.8 13h4.4L18 7.5z"
            stroke={colorClasses.secondaryStroke}
            strokeWidth="1.5"
            fill={colorClasses.stroke}
            fillOpacity="0.25"
          />
          <circle cx="12" cy="5" r="1.5" fill={colorClasses.stroke} />
        </svg>
      )}

      {/* Floating Beginner Tooltip on Hover */}
      <div
        role="tooltip"
        data-testid="alignment-hover-tooltip"
        className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 p-2.5 rounded-xl bg-[#11131a]/98 border-2 border-[#c8a45c] shadow-[0_10px_25px_rgba(0,0,0,0.95)] text-left"
      >
        <div className="flex items-center justify-between gap-1 border-b border-[#c8a45c]/35 pb-1 mb-1">
          <span className={`font-cinzel font-black text-xs uppercase ${colorClasses.icon}`}>
            {desc.labelEs}
          </span>
          <span className="text-[9px] font-mono text-[#cbb692] uppercase">Alineamiento</span>
        </div>
        <p className="text-[11px] font-sans text-stone-200 leading-snug font-normal normal-case">
          {desc.descriptionEs}
        </p>
      </div>
    </div>
  );
};

export const CharacterTarotCard: React.FC<CharacterTarotCardProps> = ({
  character,
  member,
  isOnline = true,
  compact = false,
  miniGrid = false,
  onClickCoinPouch,
  showDmControls = false,
  onDmAdjustPlayer,
  footerActions,
  className = '',
  dataTestId,
  testId,
}) => {
  // Resolve unified fields from either Character5e or PartyMemberLive
  const charId = character?.id || member?.characterId || 'char-card';
  const name = character?.name || member?.characterName || 'Aventurero';
  const level = character?.level ?? member?.level ?? 1;
  const experience = character?.experience ?? member?.experience ?? 0;
  const alignment = character?.alignment || member?.alignment || 'Neutral Bueno';

  const raceAndClass = character
    ? `${character.race || 'Humano'} • ${character.characterClass || 'Guerrero'}`
    : member?.race && member?.characterClass && !member.characterClass.includes(member.race)
    ? `${member.race} • ${member.characterClass}`
    : (member?.characterClass || 'Humano • Aventurero').replace(/\s+/, ' • ');

  const profBonus = calculateProficiencyBonus(level);
  const ac = character?.armorClass ?? member?.ac ?? 10;
  const speed = character?.speed ?? member?.speed ?? 30;
  const pp = character
    ? calculatePassivePerception(
        character.abilities.wis.score,
        character.skills.perception,
        profBonus
      )
    : member?.passivePerception ?? 10;

  const strMod = character
    ? getEffectiveAbilityModifier(character.abilities.str)
    : calculateModifier(member?.abilities?.str ?? 10);
  const dexMod = character
    ? getEffectiveAbilityModifier(character.abilities.dex)
    : calculateModifier(member?.abilities?.dex ?? 10);
  const conMod = character
    ? getEffectiveAbilityModifier(character.abilities.con)
    : calculateModifier(member?.abilities?.con ?? 10);
  const intMod = character
    ? getEffectiveAbilityModifier(character.abilities.int)
    : calculateModifier(member?.abilities?.int ?? 10);
  const wisMod = character
    ? getEffectiveAbilityModifier(character.abilities.wis)
    : calculateModifier(member?.abilities?.wis ?? 10);
  const chaMod = character
    ? getEffectiveAbilityModifier(character.abilities.cha)
    : calculateModifier(member?.abilities?.cha ?? 10);

  const initiative = character
    ? typeof character.initiative === 'number'
      ? character.initiative
      : dexMod
    : typeof member?.initiative === 'number'
    ? member.initiative
    : dexMod;

  const currentHp = character?.currentHp ?? member?.currentHp ?? 10;
  const maxHp = Math.max(1, character?.maxHp ?? member?.maxHp ?? 10);
  const hpPercent = Math.min(100, Math.max(0, (currentHp / maxHp) * 100));

  const currency = character?.currency ||
    member?.currency || {
      cp: 0,
      sp: 0,
      ep: 0,
      gp: 0,
      pp: 0,
    };

  const avatarType = character?.avatarType || member?.avatarType;
  const avatarCustomUrl =
    character?.avatarCustomUrl ||
    character?.avatarUrl ||
    member?.avatarCustomUrl ||
    member?.avatarUrl;
  const avatarIcon = character?.avatarIcon || member?.avatarIcon;

  // =========================================================================
  // MINI-GRID MODE (Used in TableMapView 2x2 Player Cards Grid: 4 cards fit simultaneously)
  // =========================================================================
  if (miniGrid) {
    return (
      <div
        data-testid={dataTestId || testId || `character-tarot-card-${charId}`}
        className={`relative rounded-xl bg-gradient-to-b from-[#1f2533] via-[#1a1f2c] to-[#141822] border-[1.5px] border-[#c8a45c] ring-1 ring-inset ring-[#e2c275]/20 shadow-[0_6px_18px_rgba(0,0,0,0.85)] p-2 space-y-1 flex flex-col justify-between text-[#f5e4be] select-none ${className}`}
      >
        {/* Top-Right Compact Online Dot */}
        {isOnline && (
          <div className="absolute top-1.5 right-2 flex items-center gap-1 text-emerald-400 text-[9px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <span>En Línea</span>
          </div>
        )}

        {/* 1. Compact Circular Gold Portrait + Niv/XP Ribbon */}
        <div className="flex flex-col items-center">
          <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-b from-[#e6c77c] via-[#b89146] to-[#785920] shadow-md">
            <EntityAvatar
              avatarType={avatarType}
              customUrl={avatarCustomUrl}
              iconId={avatarIcon}
              category="player"
              size="sm"
              className="w-full h-full rounded-full object-cover bg-[#131722]"
            />
          </div>

          <div className="relative -mt-2 z-10 flex items-center justify-center">
            <div className="px-2 py-0.2 rounded bg-gradient-to-b from-[#232938] to-[#171b26] border border-[#c8a45c]/90 shadow text-[9px] font-sans font-bold text-[#f3e3c3] tracking-tight whitespace-nowrap">
              Niv. {level} • {experience} XP
            </div>
          </div>
        </div>

        {/* 2. Name + Alignment Badge + Race • Class */}
        <div className="text-center leading-tight">
          <div className="flex items-center justify-center gap-1 flex-nowrap max-w-full">
            <h3
              className="font-cinzel font-black text-[11px] text-[#e5c478] uppercase tracking-wide truncate"
              title={name}
            >
              {name}
            </h3>
            <AlignmentBadgeIcon alignment={alignment} size="xs" />
          </div>
          <div className="text-[9px] text-[#9aa3b5] font-medium truncate">
            {raceAndClass}
          </div>
        </div>

        {/* 3. 4-Box Combat Stat Row: CA | INIC | VEL | PP */}
        <div className="grid grid-cols-4 gap-1">
          <div className="rounded-lg bg-[#11141d] border border-[#c8a45c]/65 py-0.5 px-0.5 flex flex-col items-center justify-center">
            <span className="text-[8px] font-cinzel font-bold text-[#cbb692] uppercase leading-none">
              CA
            </span>
            <span className="font-cinzel font-black text-xs text-white leading-tight">
              {ac}
            </span>
          </div>

          <div className="rounded-lg bg-[#11141d] border border-[#c8a45c]/65 py-0.5 px-0.5 flex flex-col items-center justify-center">
            <span className="text-[8px] font-cinzel font-bold text-[#cbb692] uppercase leading-none">
              INIC
            </span>
            <span className="font-cinzel font-black text-xs text-white leading-tight">
              {formatModifier(initiative)}
            </span>
          </div>

          <div className="rounded-lg bg-[#11141d] border border-[#c8a45c]/65 py-0.5 px-0.5 flex flex-col items-center justify-center">
            <span className="text-[8px] font-cinzel font-bold text-[#cbb692] uppercase leading-none">
              VEL
            </span>
            <span className="font-cinzel font-black text-[11px] text-white leading-tight">
              {speed}
            </span>
          </div>

          <div className="rounded-lg bg-[#11141d] border border-[#c8a45c]/65 py-0.5 px-0.5 flex flex-col items-center justify-center">
            <span className="text-[8px] font-cinzel font-bold text-[#cbb692] uppercase leading-none">
              PP
            </span>
            <span className="font-cinzel font-black text-xs text-white leading-tight">
              {pp}
            </span>
          </div>
        </div>

        {/* 4. Glossy Health Bar (PG X/Y) + Compact DM Controls */}
        <div className="space-y-1">
          <div className="w-full h-4.5 rounded-lg bg-[#0e1118] border border-[#c8a45c]/80 p-0.5 shadow-inner relative overflow-hidden">
            <div
              className={`h-full rounded transition-all duration-300 ${
                hpPercent > 50
                  ? 'bg-gradient-to-r from-[#148858] via-[#22b573] to-[#3ddc97]'
                  : hpPercent > 25
                  ? 'bg-gradient-to-r from-amber-700 via-amber-500 to-amber-400'
                  : 'bg-gradient-to-r from-red-800 via-red-600 to-red-500'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center font-sans font-bold text-[9px] text-white tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
              PG {currentHp}/{maxHp}
            </span>
          </div>

          {showDmControls && onDmAdjustPlayer && (
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                data-testid={`dm-heal-player-${charId}`}
                onClick={() => onDmAdjustPlayer(charId, { hpDelta: 1 })}
                className="py-0.5 px-1 rounded bg-emerald-950/90 hover:bg-emerald-800 border border-emerald-500/60 text-emerald-200 font-cinzel font-bold text-[8px] flex items-center justify-center gap-0.5 transition cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>+1 PG</span>
              </button>
              <button
                type="button"
                data-testid={`dm-damage-player-${charId}`}
                onClick={() => onDmAdjustPlayer(charId, { hpDelta: -1 })}
                className="py-0.5 px-1 rounded bg-red-950/90 hover:bg-red-800 border border-red-500/60 text-red-200 font-cinzel font-bold text-[8px] flex items-center justify-center gap-0.5 transition cursor-pointer"
              >
                <Minus className="w-2.5 h-2.5" />
                <span>-1 PG</span>
              </button>
            </div>
          )}
        </div>

        {/* 5. 3x2 Ability Modifiers Grid (FUE, DES, CON, INT, SAB, CAR) */}
        <div className="grid grid-cols-3 gap-1">
          {(
            [
              { abbr: 'FUE', mod: strMod },
              { abbr: 'DES', mod: dexMod },
              { abbr: 'CON', mod: conMod },
              { abbr: 'INT', mod: intMod },
              { abbr: 'SAB', mod: wisMod },
              { abbr: 'CAR', mod: chaMod },
            ] as const
          ).map((st) => (
            <div
              key={st.abbr}
              className="rounded-lg bg-[#11141d] border border-[#c8a45c]/65 py-0.5 px-1 flex flex-col items-center justify-center"
            >
              <span className="text-[8px] font-cinzel font-bold text-[#d8ba73] uppercase leading-none">
                {st.abbr}
              </span>
              <span className="font-cinzel font-black text-[11px] text-white leading-tight">
                {formatModifier(st.mod)}
              </span>
            </div>
          ))}
        </div>

        {/* 6. Compact Leather Coin Pouch & 4 Metallic Coins */}
        <div className="pt-1 border-t border-[#c8a45c]/30">
          <div className="flex items-center justify-between gap-1">
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow">
                <path
                  d="M22 14 C24 10, 29 12, 32 10 C35 12, 40 10, 42 14 L38 22 L26 22 Z"
                  fill="#7a5436"
                  stroke="#23160c"
                  strokeWidth="2.2"
                />
                <path
                  d="M24 22 C13 28, 10 44, 15 52 C19 57, 45 57, 49 52 C54 44, 51 28, 40 22 Z"
                  fill="#8c6240"
                  stroke="#23160c"
                  strokeWidth="2.4"
                />
                <rect
                  x="23"
                  y="20"
                  width="18"
                  height="4"
                  rx="2"
                  fill="#c8a45c"
                  stroke="#23160c"
                  strokeWidth="1.8"
                />
              </svg>
            </div>

            <div className="flex-1 grid grid-cols-4 gap-0.5">
              {/* PO */}
              <div className="flex flex-col items-center">
                <div className="w-5.5 h-5.5 rounded-full bg-gradient-to-b from-[#fbe285] via-[#d9a738] to-[#9b6c15] flex items-center justify-center border border-[#5c3d06]/70">
                  <span className="font-cinzel font-black text-[9px] text-[#2b1a03] leading-none">
                    {currency.gp || 0}
                  </span>
                </div>
                <span className="text-[7px] font-cinzel font-bold text-[#e2c275] leading-none mt-0.5">
                  PO
                </span>
              </div>

              {/* PP */}
              <div className="flex flex-col items-center">
                <div className="w-5.5 h-5.5 rounded-full bg-gradient-to-b from-[#f1f5f9] via-[#94a3b8] to-[#475569] flex items-center justify-center border border-slate-700/70">
                  <span className="font-cinzel font-black text-[9px] text-slate-900 leading-none">
                    {currency.sp || 0}
                  </span>
                </div>
                <span className="text-[7px] font-cinzel font-bold text-slate-300 leading-none mt-0.5">
                  PP
                </span>
              </div>

              {/* PC */}
              <div className="flex flex-col items-center">
                <div className="w-5.5 h-5.5 rounded-full bg-gradient-to-b from-[#f6ad85] via-[#c46d3b] to-[#7c3a16] flex items-center justify-center border border-[#4d2109]/70">
                  <span className="font-cinzel font-black text-[9px] text-[#291003] leading-none">
                    {currency.cp || 0}
                  </span>
                </div>
                <span className="text-[7px] font-cinzel font-bold text-[#d98a5f] leading-none mt-0.5">
                  PC
                </span>
              </div>

              {/* PL */}
              <div className="flex flex-col items-center">
                <div className="w-5.5 h-5.5 rounded-full bg-gradient-to-b from-[#ffffff] via-[#cbd5e1] to-[#64748b] flex items-center justify-center border border-[#334155]/70">
                  <span className="font-cinzel font-black text-[9px] text-slate-900 leading-none">
                    {currency.pp || 0}
                  </span>
                </div>
                <span className="text-[7px] font-cinzel font-bold text-cyan-200 leading-none mt-0.5">
                  PL
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid={dataTestId || testId || `character-tarot-card-${charId}`}
      className={`relative rounded-2xl bg-gradient-to-b from-[#1f2533] via-[#1a1f2c] to-[#141822] border-2 border-[#c8a45c] ring-1 ring-inset ring-[#e2c275]/25 shadow-[0_12px_35px_rgba(0,0,0,0.85)] ${
        compact ? 'p-3.5 space-y-2.5' : 'p-4 sm:p-5 space-y-3.5'
      } flex flex-col justify-between text-[#f5e4be] select-none ${className}`}
    >
      {/* Top-Right Online Status Pill */}
      {isOnline && (
        <div className="absolute top-3.5 right-4 flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <span>En Línea</span>
        </div>
      )}

      {/* 1. Circular Gold-Framed Portrait + Overlapping Level & XP Ribbon */}
      <div className="flex flex-col items-center pt-1">
        <div
          className={`relative ${
            compact ? 'w-20 h-20' : 'w-24 h-24 sm:w-28 sm:h-28'
          } rounded-full p-0.5 bg-gradient-to-b from-[#e6c77c] via-[#b89146] to-[#785920] shadow-[0_6px_20px_rgba(0,0,0,0.85)]`}
        >
          <EntityAvatar
            avatarType={avatarType}
            customUrl={avatarCustomUrl}
            iconId={avatarIcon}
            category="player"
            size="lg"
            className="w-full h-full rounded-full object-cover bg-[#131722]"
          />
        </div>

        {/* Overlapping Ribbon Banner: Niv. X • Y XP */}
        <div className="relative -mt-3.5 z-10 flex items-center justify-center">
          {/* Left Ribbon Tail */}
          <svg
            viewBox="0 0 18 24"
            className="w-4 h-5 -mr-1 text-[#9e7c3c] fill-[#171b26] stroke-current"
            strokeWidth="2"
          >
            <polygon points="18,2 2,2 8,12 2,22 18,22" />
          </svg>
          <div className="px-3.5 py-0.5 rounded bg-gradient-to-b from-[#232938] to-[#171b26] border border-[#c8a45c] shadow-md text-xs sm:text-sm font-sans font-bold text-[#f3e3c3] tracking-wide whitespace-nowrap">
            Niv. {level} • {experience} XP
          </div>
          {/* Right Ribbon Tail */}
          <svg
            viewBox="0 0 18 24"
            className="w-4 h-5 -ml-1 text-[#9e7c3c] fill-[#171b26] stroke-current"
            strokeWidth="2"
          >
            <polygon points="0,2 16,2 10,12 16,22 0,22" />
          </svg>
        </div>
      </div>

      {/* 2. Character Name + Alignment Badge + Race • Class */}
      <div className="text-center space-y-0.5 px-1">
        <div className="flex items-center justify-center gap-1.5 flex-nowrap max-w-full">
          <h3
            className={`font-cinzel font-black ${
              compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
            } text-[#e5c478] uppercase tracking-wider leading-tight truncate`}
            title={name}
          >
            {name}
          </h3>
          <AlignmentBadgeIcon alignment={alignment} size="sm" />
        </div>
        <div className="text-xs sm:text-sm text-[#9aa3b5] font-medium tracking-wide">
          {raceAndClass}
        </div>
      </div>

      {/* 3. 4-Box Combat Stat Row: CA | INIC | VEL | PP */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {/* CA */}
        <div className="rounded-xl bg-[#11141d] border border-[#c8a45c]/70 py-1.5 px-1 flex flex-col items-center justify-center shadow-inner">
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-cinzel font-bold text-[#cbb692] uppercase">
            <Shield className="w-3 h-3 text-[#d6b265]" />
            <span>CA</span>
          </div>
          <span className="font-cinzel font-black text-base sm:text-lg text-white leading-tight">
            {ac}
          </span>
        </div>

        {/* INIC */}
        <div className="rounded-xl bg-[#11141d] border border-[#c8a45c]/70 py-1.5 px-1 flex flex-col items-center justify-center shadow-inner">
          <div className="flex items-center gap-0.5 text-[10px] sm:text-[11px] font-cinzel font-bold text-[#cbb692] uppercase">
            <Zap className="w-3 h-3 text-[#d6b265]" />
            <span>INIC</span>
          </div>
          <span className="font-cinzel font-black text-base sm:text-lg text-white leading-tight">
            {formatModifier(initiative)}
          </span>
        </div>

        {/* VEL */}
        <div className="rounded-xl bg-[#11141d] border border-[#c8a45c]/70 py-1.5 px-1 flex flex-col items-center justify-center shadow-inner">
          <div className="flex items-center gap-0.5 text-[10px] sm:text-[11px] font-cinzel font-bold text-[#cbb692] uppercase">
            <span className="text-[#d6b265] text-[10px]">🦶</span>
            <span>VEL</span>
          </div>
          <span className="font-cinzel font-black text-base sm:text-lg text-white leading-tight">
            {speed} <small className="text-[10px] font-normal text-[#cbb692]">FT</small>
          </span>
        </div>

        {/* PP */}
        <div className="rounded-xl bg-[#11141d] border border-[#c8a45c]/70 py-1.5 px-1 flex flex-col items-center justify-center shadow-inner">
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-cinzel font-bold text-[#cbb692] uppercase">
            <Eye className="w-3 h-3 text-[#d6b265]" />
            <span>PP</span>
          </div>
          <span className="font-cinzel font-black text-base sm:text-lg text-white leading-tight">
            {pp}
          </span>
        </div>
      </div>

      {/* 4. Glossy Emerald Health Bar (PG X/Y) + Optional DM Controls */}
      <div className="space-y-1.5">
        <div className="w-full h-8 rounded-xl bg-[#0e1118] border border-[#c8a45c]/80 p-1 shadow-inner relative overflow-hidden">
          <div
            className={`h-full rounded-lg transition-all duration-300 ${
              hpPercent > 50
                ? 'bg-gradient-to-r from-[#148858] via-[#22b573] to-[#3ddc97]'
                : hpPercent > 25
                ? 'bg-gradient-to-r from-amber-700 via-amber-500 to-amber-400'
                : 'bg-gradient-to-r from-red-800 via-red-600 to-red-500'
            }`}
            style={{ width: `${hpPercent}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center font-sans font-bold text-xs sm:text-sm text-white tracking-wider drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
            PG {currentHp}/{maxHp}
          </span>
        </div>

        {/* DM-only HP Heal / Damage Controls */}
        {showDmControls && onDmAdjustPlayer && (
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              data-testid={`dm-heal-player-${charId}`}
              onClick={() => onDmAdjustPlayer(charId, { hpDelta: 1 })}
              className="py-1 px-2 rounded-lg bg-emerald-950/90 hover:bg-emerald-800 border border-emerald-500/60 text-emerald-200 font-cinzel font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Salud (+1)</span>
            </button>
            <button
              type="button"
              data-testid={`dm-damage-player-${charId}`}
              onClick={() => onDmAdjustPlayer(charId, { hpDelta: -1 })}
              className="py-1 px-2 rounded-lg bg-red-950/90 hover:bg-red-800 border border-red-500/60 text-red-200 font-cinzel font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <Minus className="w-3 h-3" />
              <span>Daño (-1)</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. 3x2 Ability Modifiers Grid (FUE, DES, CON, INT, SAB, CAR) */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {(
          [
            { abbr: 'FUE', mod: strMod },
            { abbr: 'DES', mod: dexMod },
            { abbr: 'CON', mod: conMod },
            { abbr: 'INT', mod: intMod },
            { abbr: 'SAB', mod: wisMod },
            { abbr: 'CAR', mod: chaMod },
          ] as const
        ).map((st) => (
          <div
            key={st.abbr}
            className="rounded-xl bg-[#11141d] border border-[#c8a45c]/70 py-1.5 px-2 flex flex-col items-center justify-center shadow-inner"
          >
            <span className="text-[10px] sm:text-xs font-cinzel font-bold text-[#d8ba73] uppercase tracking-wider">
              {st.abbr}
            </span>
            <span className="font-cinzel font-black text-base sm:text-lg text-white leading-tight">
              {formatModifier(st.mod)}
            </span>
          </div>
        ))}
      </div>

      {/* 6. Divider + Leather Coin Pouch & 4 Metallic Coins (PO, PP, PC, PL) */}
      <div className="pt-2 border-t border-[#c8a45c]/35">
        <div
          onClick={onClickCoinPouch}
          className={`flex items-center justify-between gap-2 ${
            onClickCoinPouch ? 'cursor-pointer hover:opacity-95 transition' : ''
          }`}
          title={onClickCoinPouch ? 'Clic para gestionar monedas e inventario' : undefined}
        >
          {/* Illustrated Leather Coin Pouch SVG */}
          <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-md">
              {/* Pouch Top Frill */}
              <path
                d="M22 14 C24 10, 29 12, 32 10 C35 12, 40 10, 42 14 L38 22 L26 22 Z"
                fill="#7a5436"
                stroke="#23160c"
                strokeWidth="2.2"
              />
              {/* Main Leather Bag Body */}
              <path
                d="M24 22 C13 28, 10 44, 15 52 C19 57, 45 57, 49 52 C54 44, 51 28, 40 22 Z"
                fill="#8c6240"
                stroke="#23160c"
                strokeWidth="2.4"
              />
              {/* Bag Shading / Creases */}
              <path
                d="M22 28 C18 36, 18 46, 22 52"
                stroke="#593b22"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M40 28 C44 36, 44 46, 40 52"
                stroke="#ab7e57"
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
              />
              {/* Drawstring Cord */}
              <rect
                x="23"
                y="20"
                width="18"
                height="4"
                rx="2"
                fill="#c8a45c"
                stroke="#23160c"
                strokeWidth="1.8"
              />
              <path
                d="M35 23 C38 28, 39 34, 37 40"
                stroke="#c8a45c"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* 4 Metallic Medallion Coins: PO (Gold), PP (Silver), PC (Copper), PL (Platinum) */}
          <div className="flex-1 grid grid-cols-4 gap-1.5">
            {/* PO - Gold */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-b from-[#fbe285] via-[#d9a738] to-[#9b6c15] p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full rounded-full border border-dashed border-[#5c3d06]/70 bg-gradient-to-b from-[#f3cf65] to-[#b88622] flex items-center justify-center">
                  <span className="font-cinzel font-black text-xs sm:text-sm text-[#2b1a03]">
                    {currency.gp || 0}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-cinzel font-bold text-[#e2c275] mt-0.5">PO</span>
            </div>

            {/* PP - Silver */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-b from-[#f1f5f9] via-[#94a3b8] to-[#475569] p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full rounded-full border border-dashed border-slate-700/70 bg-gradient-to-b from-[#e2e8f0] to-[#94a3b8] flex items-center justify-center">
                  <span className="font-cinzel font-black text-xs sm:text-sm text-slate-900">
                    {currency.sp || 0}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-cinzel font-bold text-slate-300 mt-0.5">PP</span>
            </div>

            {/* PC - Copper */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-b from-[#f6ad85] via-[#c46d3b] to-[#7c3a16] p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full rounded-full border border-dashed border-[#4d2109]/70 bg-gradient-to-b from-[#e39264] to-[#9e4f24] flex items-center justify-center">
                  <span className="font-cinzel font-black text-xs sm:text-sm text-[#291003]">
                    {currency.cp || 0}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-cinzel font-bold text-[#d98a5f] mt-0.5">PC</span>
            </div>

            {/* PL - Platinum */}
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-b from-[#ffffff] via-[#cbd5e1] to-[#64748b] p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full rounded-full border border-[#334155]/70 bg-gradient-to-b from-[#f8fafc] to-[#cbd5e1] flex items-center justify-center">
                  <span className="font-cinzel font-black text-xs sm:text-sm text-slate-900">
                    {currency.pp || 0}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-cinzel font-bold text-cyan-200 mt-0.5">PL</span>
            </div>
          </div>
        </div>

        {/* Optional DM Gold Controls */}
        {showDmControls && onDmAdjustPlayer && (
          <div className="flex items-center justify-end gap-1.5 mt-2">
            <span className="text-[10px] font-cinzel text-[#cbb692]">Ajustar Oro (DM):</span>
            <button
              type="button"
              onClick={() => onDmAdjustPlayer(charId, { gpDelta: 1 })}
              className="px-2 py-0.5 rounded bg-amber-950 hover:bg-amber-800 border border-amber-500/60 text-amber-200 text-[10px] font-mono font-bold cursor-pointer"
            >
              +1 PO
            </button>
            <button
              type="button"
              onClick={() => onDmAdjustPlayer(charId, { gpDelta: -1 })}
              className="px-2 py-0.5 rounded bg-stone-900 hover:bg-red-950 border border-stone-700 text-stone-300 text-[10px] font-mono font-bold cursor-pointer"
            >
              -1 PO
            </button>
          </div>
        )}
      </div>

      {/* Optional Footer Actions (e.g. inside Lobby Character Deck) */}
      {footerActions && <div className="pt-2 border-t border-[#c8a45c]/30">{footerActions}</div>}
    </div>
  );
};

