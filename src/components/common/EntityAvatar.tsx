import React from 'react';
import {
  User,
  Shield,
  Crown,
  Flame,
  Dices,
  BookOpen,
  Compass,
  Wand2,
  Scroll,
  Castle,
  Skull,
  Swords,
  Sparkles,
  Axe,
  Gem,
  Trophy,
  Ghost,
  Moon,
  Zap,
  Crosshair,
  Feather,
  HelpCircle,
} from 'lucide-react';

export interface EntityAvatarProps {
  avatarType?: 'icon' | 'custom';
  customUrl?: string;
  iconId?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  iconClassName?: string;
  onClick?: () => void;
  title?: string;
}

export const EntityAvatar: React.FC<EntityAvatarProps> = ({
  avatarType = 'icon',
  customUrl,
  iconId = 'anonymous',
  size = 'md',
  className = '',
  iconClassName = '',
  onClick,
  title,
}) => {
  const isCustom = avatarType === 'custom' && Boolean(customUrl);

  const containerSizes = {
    xs: 'w-6 h-6 rounded-lg text-xs',
    sm: 'w-8 h-8 rounded-xl text-sm',
    md: 'w-10 h-10 rounded-xl text-base',
    lg: 'w-12 h-12 rounded-2xl text-lg',
    xl: 'w-16 h-16 rounded-2xl text-xl',
    '2xl': 'w-20 h-20 rounded-3xl text-2xl',
  };

  const svgSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
    '2xl': 'w-10 h-10',
  };

  const getIconComponent = (id?: string) => {
    switch (id) {
      case 'male':
      case 'female':
      case 'anonymous':
      case 'user':
        return User;
      case 'warrior':
      case 'swords':
        return Swords;
      case 'mage':
      case 'wand':
        return Wand2;
      case 'rogue':
      case 'axe':
        return Axe;
      case 'cleric':
      case 'paladin':
      case 'shield':
        return Shield;
      case 'ranger':
      case 'crosshair':
        return Crosshair;
      case 'crown':
      case 'king':
      case 'noble':
        return Crown;
      case 'dragon':
      case 'flame':
      case 'fire':
        return Flame;
      case 'skull':
      case 'undead':
        return Skull;
      case 'ghost':
      case 'spectre':
        return Ghost;
      case 'book':
      case 'spellbook':
        return BookOpen;
      case 'scroll':
      case 'journal':
        return Scroll;
      case 'feather':
        return Feather;
      case 'castle':
      case 'dungeon':
        return Castle;
      case 'compass':
      case 'location':
        return Compass;
      case 'gem':
      case 'item':
        return Gem;
      case 'sparkles':
      case 'magic':
        return Sparkles;
      case 'zap':
      case 'lightning':
        return Zap;
      default:
        return User;
    }
  };

  const IconComp = getIconComponent(iconId);

  const containerClass = `relative inline-flex items-center justify-center shrink-0 overflow-hidden bg-gradient-to-br from-amber-700/80 via-amber-900 to-stone-900 border border-amber-500/70 text-amber-200 shadow-md ${
    containerSizes[size]
  } ${onClick ? 'cursor-pointer hover:border-amber-400 hover:scale-[1.03] transition' : ''} ${className}`;

  return (
    <div className={containerClass} onClick={onClick} title={title}>
      {isCustom ? (
        <img
          src={customUrl}
          alt="Avatar"
          className="w-full h-full object-cover rounded-inherit"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <IconComp className={`${svgSizes[size]} ${iconClassName}`} />
      )}
    </div>
  );
};
