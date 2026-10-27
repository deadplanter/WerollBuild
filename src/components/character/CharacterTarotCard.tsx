import React, { useState } from 'react';
import { Shield, Zap, Eye, Plus, Minus, RotateCw } from 'lucide-react';
import { EntityAvatar } from '../common/EntityAvatar';
import { Character5e, PartyMemberLive, AppSkinThemeTokens, DiceRollResult } from '../../types/dnd';
import { soundManager } from '../../utils/audio';
import {
  calculateModifier,
  formatModifier,
  calculateProficiencyBonus,
  calculatePassivePerception,
  getEffectiveAbilityModifier,
  parseAlignmentDescriptor,
  calculateEquippedItemStatBonuses,
  calculateTotalAbilityScore,
  resolveTarotCardAbilityScores,
  formatCompactRollDieBadge,
} from '../../utils/dnd-math';

export interface CharacterTarotCardProps {
  character?: Character5e;
  member?: PartyMemberLive;
  skinTokens?: AppSkinThemeTokens;
  isOnline?: boolean;
  compact?: boolean;
  miniGrid?: boolean;
  miniature?: boolean;
  showLastRollInMap?: boolean;
  lastRoll?: DiceRollResult | null;
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

const MapLastRollDieBadge: React.FC<{
  roll?: DiceRollResult | null;
  size?: 'xs' | 'sm';
}> = ({ roll, size = 'sm' }) => {
  const parsed = formatCompactRollDieBadge(roll);
  const sides = parsed?.sides || 20;
  const valueText = parsed ? String(parsed.displayValue) : '—';
  const labelText = parsed ? parsed.diceLabel.toUpperCase() : '1D20';
  const strokeColor = parsed?.isCritSuccess
    ? '#34d399'
    : parsed?.isCritFail
    ? '#f87171'
    : '#e5c478';
  const fillColor = parsed?.isCritSuccess
    ? '#064e3b'
    : parsed?.isCritFail
    ? '#7f1d1d'
    : '#141824';

  const svgSizeClass = size === 'xs' ? 'w-6 h-6' : 'w-8 h-8';

  return (
    <div
      data-testid="tarot-map-last-roll-badge"
      title={
        roll
          ? `Última tirada: ${roll.label || labelText} = ${valueText} (${roll.formula || labelText})`
          : 'Sin tiradas recientes'
      }
      className="flex flex-col items-center justify-center bg-[#0d1018]/90 border border-[#c8a45c]/75 rounded-lg px-1.5 py-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.85)] select-none"
    >
      <div className={`relative ${svgSizeClass} flex items-center justify-center`}>
        <svg viewBox="0 0 36 36" className="w-full h-full drop-shadow">
          {sides === 4 && (
            <polygon
              points="18,3 33,31 3,31"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          )}
          {sides === 6 && (
            <rect
              x="5"
              y="5"
              width="26"
              height="26"
              rx="4"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.2"
            />
          )}
          {sides === 8 && (
            <polygon
              points="18,2 33,18 18,34 3,18"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          )}
          {sides === 10 && (
            <polygon
              points="18,2 33,14 27,33 9,33 3,14"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          )}
          {sides === 12 && (
            <polygon
              points="18,2 31,9 34,23 25,33 11,33 2,23 5,9"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          )}
          {(sides === 20 || sides === 100) && (
            <polygon
              points="18,2 32,10 32,26 18,34 4,26 4,10"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
          )}
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center font-cinzel font-black ${
            sides === 4 ? 'pt-1.5 text-[9px]' : size === 'xs' ? 'text-[10px]' : 'text-[11px]'
          } text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] leading-none`}
        >
          {valueText}
        </span>
      </div>
      <span className="text-[7px] font-mono font-black text-[#e5c478] tracking-tighter leading-none mt-0.5 uppercase">
        {labelText}
      </span>
    </div>
  );
};

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
  skinTokens,
  isOnline = true,
  compact = false,
  miniGrid = false,
  miniature = false,
  showLastRollInMap = false,
  lastRoll,
  onClickCoinPouch,
  showDmControls = false,
  onDmAdjustPlayer,
  footerActions,
  className = '',
  dataTestId,
  testId,
}) => {
  const isMini = Boolean(miniature || miniGrid);

  // Resolve unified fields from either Character5e or PartyMemberLive
  const resolvedLastRoll = lastRoll ?? member?.lastRoll ?? null;
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

  const equippedBonuses = React.useMemo(
    () => (character?.inventory ? calculateEquippedItemStatBonuses(character.inventory) : null),
    [character?.inventory]
  );

  const ac = character
    ? (character.armorClass ?? 10) + (equippedBonuses?.ac ?? 0)
    : member?.ac ?? 10;
  const speed = character
    ? (character.speed ?? 30) + (equippedBonuses?.speed ?? 0)
    : member?.speed ?? 30;

  // Total Ability Scores & Modifiers (FUE, DES, CON, INT, SAB, CAR)
  const resolvedAbilities = React.useMemo(
    () => resolveTarotCardAbilityScores(character, member),
    [character, member]
  );

  const strScore = resolvedAbilities.str.totalScore;
  const dexScore = resolvedAbilities.dex.totalScore;
  const conScore = resolvedAbilities.con.totalScore;
  const intScore = resolvedAbilities.int.totalScore;
  const wisScore = resolvedAbilities.wis.totalScore;
  const chaScore = resolvedAbilities.cha.totalScore;

  const dexMod = resolvedAbilities.dex.modifier;

  const pp = character
    ? calculatePassivePerception(
        wisScore,
        character.skills.perception,
        profBonus
      )
    : member?.passivePerception ?? 10;

  const baseInit = character
    ? (typeof character.initiative === 'number'
        ? character.initiative
        : dexMod)
    : (typeof member?.initiative === 'number'
        ? member.initiative
        : dexMod);
  const initiative = baseInit + (equippedBonuses?.initiative ?? 0);

  const currentHp = character?.currentHp ?? member?.currentHp ?? 10;
  const baseMaxHp = Math.max(1, character?.maxHp ?? member?.maxHp ?? 10);
  const maxHp = baseMaxHp + (equippedBonuses?.maxHp ?? 0);
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

  const effectiveSkinTokens = skinTokens || member?.skinTokens;
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  const activePlayerSkinId =
    character?.playerSkinId || member?.playerSkinId || 'skin-player-default';
  const skinVisuals = React.useMemo(() => {
    if (activePlayerSkinId === 'skin-player-crimson-dragon') {
      return {
        cardBg: 'from-[#321216] via-[#210d11] to-[#14080a]',
        border: 'border-red-500/90 ring-red-400/30',
        titleColor: 'text-amber-300',
        badgeText: 'Escamas Carmesí',
        badgeClasses: 'bg-red-950/90 border-red-400/70 text-red-200',
      };
    }
    if (activePlayerSkinId === 'skin-player-frost-2026') {
      return {
        cardBg: 'from-[#0d2238] via-[#091829] to-[#06101c]',
        border: 'border-cyan-400/90 ring-cyan-300/35',
        titleColor: 'text-cyan-200',
        badgeText: 'Escarcha Invernal 2026',
        badgeClasses: 'bg-cyan-950/90 border-cyan-400/70 text-cyan-200',
      };
    }
    if (activePlayerSkinId && activePlayerSkinId !== 'skin-player-default') {
      return {
        cardBg: 'from-[#231934] via-[#181226] to-[#110c1c]',
        border: 'border-purple-400/90 ring-purple-300/30',
        titleColor: 'text-purple-200',
        badgeText: 'Skin de Héroe',
        badgeClasses: 'bg-purple-950/90 border-purple-400/70 text-purple-200',
      };
    }
    return {
      cardBg: 'from-[#1f2533] via-[#1a1f2c] to-[#141822]',
      border: 'border-[#c8a45c] ring-[#e2c275]/25',
      titleColor: 'text-[#e5c478]',
      badgeText: null,
      badgeClasses: '',
    };
  }, [activePlayerSkinId]);

  const handleToggleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playCardFlip(effectiveSkinTokens?.sheetAudioProfile);
    setIsFlipped((prev) => !prev);
  };

  if (isFlipped) {
    return (
      <div
        data-testid={dataTestId || testId || `character-tarot-card-${charId}`}
        data-player-skin={activePlayerSkinId}
        onClick={handleToggleFlip}
        style={{
          borderColor: effectiveSkinTokens?.tarotBorderColor || '#c8a45c',
          boxShadow: effectiveSkinTokens?.tarotGlowColor
            ? `0 0 28px ${effectiveSkinTokens.tarotGlowColor}`
            : undefined,
          backgroundImage: effectiveSkinTokens?.tarotCardBackCustomPngUrl
            ? `url(${effectiveSkinTokens.tarotCardBackCustomPngUrl})`
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        className={`relative rounded-2xl bg-gradient-to-b from-[#1a1326] via-[#120e1c] to-[#0b0912] border-2 ${skinVisuals.border} ring-1 ring-inset shadow-[0_12px_35px_rgba(0,0,0,0.85)] ${
          isMini
            ? 'p-2.5 min-h-[245px]'
            : compact
            ? 'p-3.5 min-h-[320px]'
            : 'p-4 sm:p-5 min-h-[420px]'
        } flex flex-col items-center justify-center text-[#f5e4be] select-none overflow-hidden cursor-pointer transition-all duration-500 ${className}`}
      >
        {!effectiveSkinTokens?.tarotCardBackCustomPngUrl && (
          <div className="p-4 rounded-2xl border-2 border-amber-500/40 bg-black/50 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-12 h-12 rounded-full border-2 border-amber-400/70 flex items-center justify-center text-xl shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              ✦
            </div>
            <span className="font-cinzel font-black text-xs sm:text-sm text-amber-300 uppercase tracking-widest">
              {name}
            </span>
            <span className="text-[10px] font-mono text-stone-400">
              Reverso Tarot Arcano • Clic para voltear
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={handleToggleFlip}
          className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-black/75 border border-amber-500/60 text-amber-200 font-cinzel font-bold text-[10px] flex items-center gap-1 z-30 cursor-pointer"
        >
          <RotateCw className="w-3 h-3" />
          <span>Anverso</span>
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid={dataTestId || testId || `character-tarot-card-${charId}`}
      data-player-skin={activePlayerSkinId}
      style={{
        borderColor: effectiveSkinTokens?.tarotBorderColor || undefined,
        boxShadow: effectiveSkinTokens?.tarotGlowColor
          ? `0 0 25px ${effectiveSkinTokens.tarotGlowColor}`
          : undefined,
      }}
      className={`relative rounded-2xl bg-gradient-to-b ${skinVisuals.cardBg} border-2 ${skinVisuals.border} ring-1 ring-inset shadow-[0_12px_35px_rgba(0,0,0,0.85)] ${
        isMini
          ? 'p-2.5 space-y-1.5'
          : compact
          ? 'p-3.5 space-y-2.5'
          : 'p-4 sm:p-5 space-y-3.5'
      } flex flex-col justify-between text-[#f5e4be] select-none overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Optional Custom Frame PNG and Holo Overlay PNG */}
      {effectiveSkinTokens?.tarotCardCustomFramePngUrl && (
        <img
          src={effectiveSkinTokens.tarotCardCustomFramePngUrl}
          alt="Tarot Frame"
          className="pointer-events-none absolute inset-0 w-full h-full object-fill z-20 rounded-2xl"
        />
      )}
      {effectiveSkinTokens?.tarotCardCustomOverlayPngUrl && (
        <img
          src={effectiveSkinTokens.tarotCardCustomOverlayPngUrl}
          alt="Tarot Overlay"
          className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen z-10 rounded-2xl"
        />
      )}
      {effectiveSkinTokens?.tarotParticleEffect &&
        effectiveSkinTokens.tarotParticleEffect !== 'none' && (
          <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 text-[10px] opacity-75 z-20">
            {effectiveSkinTokens.tarotParticleEffect === 'embers' && '🔥 ✨ 🔥'}
            {effectiveSkinTokens.tarotParticleEffect === 'snow' && '❄️ ❅ ❄️'}
            {effectiveSkinTokens.tarotParticleEffect === 'arcane_sparkles' && '✨ 🔮 ✨'}
            {effectiveSkinTokens.tarotParticleEffect === 'golden_dust' && '🌟 ✨ 🌟'}
          </div>
        )}

      {/* Top-Left Active Player Skin Badge & 3D Flip Button */}
      <div
        className={`absolute ${
          isMini ? 'top-2 left-2.5' : 'top-3.5 left-4'
        } flex items-center gap-1 z-30`}
      >
        {skinVisuals.badgeText && (
          <div
            className={`px-1.5 py-0.5 rounded-md border ${
              isMini ? 'text-[8px]' : 'text-[9px]'
            } font-cinzel font-bold uppercase tracking-wider shadow ${skinVisuals.badgeClasses}`}
          >
            ✨ {skinVisuals.badgeText}
          </div>
        )}
        <button
          type="button"
          onClick={handleToggleFlip}
          title="Voltear Carta Tarot 3D"
          className="p-1 rounded-md bg-black/50 hover:bg-black/80 border border-[#c8a45c]/50 text-[#e5c478] transition cursor-pointer"
        >
          <RotateCw className={isMini ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
        </button>
      </div>

      {/* Top-Right Online Status Pill + Map Mode Last Die Roll Badge */}
      {(isOnline || showLastRollInMap) && (
        <div
          className={`absolute ${
            isMini ? 'top-2 right-2.5 gap-1' : 'top-3.5 right-4 gap-1.5'
          } flex flex-col items-end z-30`}
        >
          {isOnline && (
            <div
              className={`flex items-center gap-1 text-emerald-400 ${
                isMini ? 'text-[9px]' : 'text-xs'
              } font-semibold`}
            >
              <span
                className={`${
                  isMini ? 'w-1.5 h-1.5' : 'w-2.5 h-2.5'
                } rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]`}
              />
              <span>En Línea</span>
            </div>
          )}
          {showLastRollInMap && (
            <MapLastRollDieBadge roll={resolvedLastRoll} size={isMini ? 'xs' : 'sm'} />
          )}
        </div>
      )}

      {/* 1. Circular Gold-Framed Portrait + Overlapping Level & XP Ribbon */}
      <div className="flex flex-col items-center pt-0.5">
        <div
          className={`relative ${
            isMini
              ? 'w-14 h-14'
              : compact
              ? 'w-20 h-20'
              : 'w-24 h-24 sm:w-28 sm:h-28'
          } rounded-full p-0.5 bg-gradient-to-b from-[#e6c77c] via-[#b89146] to-[#785920] shadow-[0_6px_20px_rgba(0,0,0,0.85)]`}
        >
          <EntityAvatar
            avatarType={avatarType}
            customUrl={avatarCustomUrl}
            iconId={avatarIcon}
            category="player"
            size={isMini ? 'md' : 'lg'}
            className="w-full h-full rounded-full object-cover bg-[#131722]"
          />
        </div>

        {/* Overlapping Ribbon Banner: Niv. X • Y XP */}
        <div
          className={`relative ${
            isMini ? '-mt-2.5' : '-mt-3.5'
          } z-10 flex items-center justify-center`}
        >
          {/* Left Ribbon Tail */}
          <svg
            viewBox="0 0 18 24"
            className={`${
              isMini ? 'w-3 h-4' : 'w-4 h-5'
            } -mr-1 text-[#9e7c3c] fill-[#171b26] stroke-current`}
            strokeWidth="2"
          >
            <polygon points="18,2 2,2 8,12 2,22 18,22" />
          </svg>
          <div
            className={`${
              isMini
                ? 'px-2.5 py-0.5 text-[10px]'
                : 'px-3.5 py-0.5 text-xs sm:text-sm'
            } rounded bg-gradient-to-b from-[#232938] to-[#171b26] border border-[#c8a45c] shadow-md font-sans font-bold text-[#f3e3c3] tracking-wide whitespace-nowrap`}
          >
            Niv. {level} • {experience} XP
          </div>
          {/* Right Ribbon Tail */}
          <svg
            viewBox="0 0 18 24"
            className={`${
              isMini ? 'w-3 h-4' : 'w-4 h-5'
            } -ml-1 text-[#9e7c3c] fill-[#171b26] stroke-current`}
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
              isMini
                ? 'text-xs sm:text-sm'
                : compact
                ? 'text-sm sm:text-base'
                : 'text-base sm:text-lg'
            } ${skinVisuals.titleColor} uppercase tracking-wider leading-tight truncate`}
            title={name}
          >
            {name}
          </h3>
          <AlignmentBadgeIcon alignment={alignment} size={isMini ? 'xs' : 'sm'} />
        </div>
        <div
          className={`${
            isMini ? 'text-[10px]' : 'text-xs sm:text-sm'
          } text-[#9aa3b5] font-medium tracking-wide truncate`}
        >
          {raceAndClass}
        </div>
      </div>

      {/* 3. 4-Box Combat Stat Row: CA | INIC | VEL | PP */}
      <div className={`grid grid-cols-4 ${isMini ? 'gap-1' : 'gap-1.5 sm:gap-2'}`}>
        {/* CA */}
        <div
          className={`${
            isMini ? 'rounded-lg py-1 px-0.5' : 'rounded-xl py-1.5 px-1'
          } bg-[#11141d] border border-[#c8a45c]/70 flex flex-col items-center justify-center shadow-inner`}
        >
          <div
            className={`flex items-center gap-0.5 ${
              isMini ? 'text-[8px]' : 'text-[10px] sm:text-[11px]'
            } font-cinzel font-bold text-[#cbb692] uppercase`}
          >
            <Shield className={isMini ? 'w-2.5 h-2.5 text-[#d6b265]' : 'w-3 h-3 text-[#d6b265]'} />
            <span>CA</span>
          </div>
          <span
            className={`font-cinzel font-black ${
              isMini ? 'text-xs sm:text-sm' : 'text-base sm:text-lg'
            } text-white leading-tight`}
          >
            {ac}
          </span>
        </div>

        {/* INIC */}
        <div
          className={`${
            isMini ? 'rounded-lg py-1 px-0.5' : 'rounded-xl py-1.5 px-1'
          } bg-[#11141d] border border-[#c8a45c]/70 flex flex-col items-center justify-center shadow-inner`}
        >
          <div
            className={`flex items-center gap-0.5 ${
              isMini ? 'text-[8px]' : 'text-[10px] sm:text-[11px]'
            } font-cinzel font-bold text-[#cbb692] uppercase`}
          >
            <Zap className={isMini ? 'w-2.5 h-2.5 text-[#d6b265]' : 'w-3 h-3 text-[#d6b265]'} />
            <span>INIC</span>
          </div>
          <span
            className={`font-cinzel font-black ${
              isMini ? 'text-xs sm:text-sm' : 'text-base sm:text-lg'
            } text-white leading-tight`}
          >
            {formatModifier(initiative)}
          </span>
        </div>

        {/* VEL */}
        <div
          className={`${
            isMini ? 'rounded-lg py-1 px-0.5' : 'rounded-xl py-1.5 px-1'
          } bg-[#11141d] border border-[#c8a45c]/70 flex flex-col items-center justify-center shadow-inner`}
        >
          <div
            className={`flex items-center gap-0.5 ${
              isMini ? 'text-[8px]' : 'text-[10px] sm:text-[11px]'
            } font-cinzel font-bold text-[#cbb692] uppercase`}
          >
            <span className={`text-[#d6b265] ${isMini ? 'text-[8px]' : 'text-[10px]'}`}>🦶</span>
            <span>VEL</span>
          </div>
          <span
            className={`font-cinzel font-black ${
              isMini ? 'text-xs sm:text-sm' : 'text-base sm:text-lg'
            } text-white leading-tight`}
          >
            {speed}{' '}
            <small className={`${isMini ? 'text-[8px]' : 'text-[10px]'} font-normal text-[#cbb692]`}>
              FT
            </small>
          </span>
        </div>

        {/* PP */}
        <div
          className={`${
            isMini ? 'rounded-lg py-1 px-0.5' : 'rounded-xl py-1.5 px-1'
          } bg-[#11141d] border border-[#c8a45c]/70 flex flex-col items-center justify-center shadow-inner`}
        >
          <div
            className={`flex items-center gap-0.5 ${
              isMini ? 'text-[8px]' : 'text-[10px] sm:text-[11px]'
            } font-cinzel font-bold text-[#cbb692] uppercase`}
          >
            <Eye className={isMini ? 'w-2.5 h-2.5 text-[#d6b265]' : 'w-3 h-3 text-[#d6b265]'} />
            <span>PP</span>
          </div>
          <span
            className={`font-cinzel font-black ${
              isMini ? 'text-xs sm:text-sm' : 'text-base sm:text-lg'
            } text-white leading-tight`}
          >
            {pp}
          </span>
        </div>
      </div>

      {/* 4. Glossy Emerald Health Bar (PG X/Y) + Optional DM Controls */}
      <div className="space-y-1">
        <div
          className={`w-full ${
            isMini ? 'h-5.5 rounded-lg p-0.5' : 'h-8 rounded-xl p-1'
          } bg-[#0e1118] border border-[#c8a45c]/80 shadow-inner relative overflow-hidden`}
        >
          <div
            className={`h-full ${
              isMini ? 'rounded' : 'rounded-lg'
            } transition-all duration-300 ${
              hpPercent > 50
                ? 'bg-gradient-to-r from-[#148858] via-[#22b573] to-[#3ddc97]'
                : hpPercent > 25
                ? 'bg-gradient-to-r from-amber-700 via-amber-500 to-amber-400'
                : 'bg-gradient-to-r from-red-800 via-red-600 to-red-500'
            }`}
            style={{ width: `${hpPercent}%` }}
          />
          <span
            className={`absolute inset-0 flex items-center justify-center font-sans font-bold ${
              isMini ? 'text-[10px]' : 'text-xs sm:text-sm'
            } text-white tracking-wider drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]`}
          >
            PG {currentHp}/{maxHp}
          </span>
        </div>

        {/* DM-only HP Heal / Damage Controls */}
        {showDmControls && onDmAdjustPlayer && (
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              data-testid={`dm-heal-player-${charId}`}
              onClick={() => onDmAdjustPlayer(charId, { hpDelta: 1 })}
              className={`${
                isMini ? 'py-0.5 px-1.5 text-[9px]' : 'py-1 px-2 text-[10px]'
              } rounded-lg bg-emerald-950/90 hover:bg-emerald-800 border border-emerald-500/60 text-emerald-200 font-cinzel font-bold flex items-center justify-center gap-1 transition cursor-pointer`}
            >
              <Plus className="w-2.5 h-2.5" />
              <span>Salud (+1)</span>
            </button>
            <button
              type="button"
              data-testid={`dm-damage-player-${charId}`}
              onClick={() => onDmAdjustPlayer(charId, { hpDelta: -1 })}
              className={`${
                isMini ? 'py-0.5 px-1.5 text-[9px]' : 'py-1 px-2 text-[10px]'
              } rounded-lg bg-red-950/90 hover:bg-red-800 border border-red-500/60 text-red-200 font-cinzel font-bold flex items-center justify-center gap-1 transition cursor-pointer`}
            >
              <Minus className="w-2.5 h-2.5" />
              <span>Daño (-1)</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. 3x2 Total Ability Scores Grid (FUE, DES, CON, INT, SAB, CAR) */}
      <div className={`grid grid-cols-3 ${isMini ? 'gap-1' : 'gap-1.5 sm:gap-2'}`}>
        {(
          [
            { abbr: 'FUE', score: strScore },
            { abbr: 'DES', score: dexScore },
            { abbr: 'CON', score: conScore },
            { abbr: 'INT', score: intScore },
            { abbr: 'SAB', score: wisScore },
            { abbr: 'CAR', score: chaScore },
          ] as const
        ).map((st) => (
          <div
            key={st.abbr}
            data-testid={`tarot-stat-${st.abbr.toLowerCase()}`}
            className={`${
              isMini ? 'rounded-lg py-0.5 px-1' : 'rounded-xl py-1.5 px-2'
            } bg-[#11141d] border border-[#c8a45c]/70 flex flex-col items-center justify-center shadow-inner`}
          >
            <span
              className={`${
                isMini ? 'text-[8px]' : 'text-[10px] sm:text-xs'
              } font-cinzel font-bold text-[#d8ba73] uppercase tracking-wider leading-tight`}
            >
              {st.abbr}
            </span>
            <span
              className={`font-cinzel font-black ${
                isMini ? 'text-xs sm:text-sm' : 'text-base sm:text-lg'
              } text-white leading-tight`}
            >
              {st.score}
            </span>
          </div>
        ))}
      </div>

      {/* 6. Divider + Leather Coin Pouch & 4 Metallic Coins (PO, PP, PC, PL) */}
      <div className={`${isMini ? 'pt-1' : 'pt-2'} border-t border-[#c8a45c]/35`}>
        <div
          onClick={onClickCoinPouch}
          className={`flex items-center justify-between ${
            isMini ? 'gap-1.5' : 'gap-2'
          } ${onClickCoinPouch ? 'cursor-pointer hover:opacity-95 transition' : ''}`}
          title={onClickCoinPouch ? 'Clic para gestionar monedas e inventario' : undefined}
        >
          {/* Illustrated Leather Coin Pouch SVG */}
          <div
            className={`${
              isMini ? 'w-8 h-8' : 'w-11 h-11 sm:w-12 sm:h-12'
            } flex items-center justify-center shrink-0`}
          >
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
          <div className={`flex-1 grid grid-cols-4 ${isMini ? 'gap-1' : 'gap-1.5'}`}>
            {/* PO - Gold */}
            <div className="flex flex-col items-center">
              <div
                className={`${
                  isMini ? 'w-7 h-7' : 'w-10 h-10 sm:w-11 sm:h-11'
                } rounded-full bg-gradient-to-b from-[#fbe285] via-[#d9a738] to-[#9b6c15] p-0.5 shadow-md flex items-center justify-center`}
              >
                <div className="w-full h-full rounded-full border border-dashed border-[#5c3d06]/70 bg-gradient-to-b from-[#f3cf65] to-[#b88622] flex items-center justify-center">
                  <span
                    className={`font-cinzel font-black ${
                      isMini ? 'text-[10px]' : 'text-xs sm:text-sm'
                    } text-[#2b1a03]`}
                  >
                    {currency.gp || 0}
                  </span>
                </div>
              </div>
              <span
                className={`${
                  isMini ? 'text-[8px]' : 'text-[10px]'
                } font-cinzel font-bold text-[#e2c275] mt-0.5`}
              >
                PO
              </span>
            </div>

            {/* PP - Silver */}
            <div className="flex flex-col items-center">
              <div
                className={`${
                  isMini ? 'w-7 h-7' : 'w-10 h-10 sm:w-11 sm:h-11'
                } rounded-full bg-gradient-to-b from-[#f1f5f9] via-[#94a3b8] to-[#475569] p-0.5 shadow-md flex items-center justify-center`}
              >
                <div className="w-full h-full rounded-full border border-dashed border-slate-700/70 bg-gradient-to-b from-[#e2e8f0] to-[#94a3b8] flex items-center justify-center">
                  <span
                    className={`font-cinzel font-black ${
                      isMini ? 'text-[10px]' : 'text-xs sm:text-sm'
                    } text-slate-900`}
                  >
                    {currency.sp || 0}
                  </span>
                </div>
              </div>
              <span
                className={`${
                  isMini ? 'text-[8px]' : 'text-[10px]'
                } font-cinzel font-bold text-slate-300 mt-0.5`}
              >
                PP
              </span>
            </div>

            {/* PC - Copper */}
            <div className="flex flex-col items-center">
              <div
                className={`${
                  isMini ? 'w-7 h-7' : 'w-10 h-10 sm:w-11 sm:h-11'
                } rounded-full bg-gradient-to-b from-[#f6ad85] via-[#c46d3b] to-[#7c3a16] p-0.5 shadow-md flex items-center justify-center`}
              >
                <div className="w-full h-full rounded-full border border-dashed border-[#4d2109]/70 bg-gradient-to-b from-[#e39264] to-[#9e4f24] flex items-center justify-center">
                  <span
                    className={`font-cinzel font-black ${
                      isMini ? 'text-[10px]' : 'text-xs sm:text-sm'
                    } text-[#291003]`}
                  >
                    {currency.cp || 0}
                  </span>
                </div>
              </div>
              <span
                className={`${
                  isMini ? 'text-[8px]' : 'text-[10px]'
                } font-cinzel font-bold text-[#d98a5f] mt-0.5`}
              >
                PC
              </span>
            </div>

            {/* PL - Platinum */}
            <div className="flex flex-col items-center">
              <div
                className={`${
                  isMini ? 'w-7 h-7' : 'w-10 h-10 sm:w-11 sm:h-11'
                } rounded-full bg-gradient-to-b from-[#ffffff] via-[#cbd5e1] to-[#64748b] p-0.5 shadow-md flex items-center justify-center`}
              >
                <div className="w-full h-full rounded-full border border-[#334155]/70 bg-gradient-to-b from-[#f8fafc] to-[#cbd5e1] flex items-center justify-center">
                  <span
                    className={`font-cinzel font-black ${
                      isMini ? 'text-[10px]' : 'text-xs sm:text-sm'
                    } text-slate-900`}
                  >
                    {currency.pp || 0}
                  </span>
                </div>
              </div>
              <span
                className={`${
                  isMini ? 'text-[8px]' : 'text-[10px]'
                } font-cinzel font-bold text-cyan-200 mt-0.5`}
              >
                PL
              </span>
            </div>
          </div>
        </div>

        {/* Optional DM Gold Controls */}
        {showDmControls && onDmAdjustPlayer && (
          <div className="flex items-center justify-end gap-1.5 mt-1.5">
            <span className={`${isMini ? 'text-[9px]' : 'text-[10px]'} font-cinzel text-[#cbb692]`}>
              Ajustar Oro (DM):
            </span>
            <button
              type="button"
              onClick={() => onDmAdjustPlayer(charId, { gpDelta: 1 })}
              className="px-1.5 py-0.5 rounded bg-amber-950 hover:bg-amber-800 border border-amber-500/60 text-amber-200 text-[9px] font-mono font-bold cursor-pointer"
            >
              +1 PO
            </button>
            <button
              type="button"
              onClick={() => onDmAdjustPlayer(charId, { gpDelta: -1 })}
              className="px-1.5 py-0.5 rounded bg-stone-900 hover:bg-red-950 border border-stone-700 text-stone-300 text-[9px] font-mono font-bold cursor-pointer"
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

