import React from 'react';
import {
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
} from 'lucide-react';
import { HostSettings } from '../../types/dnd';

export interface BrandLogoProps {
  hostSettings?: HostSettings;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  iconClassName?: string;
}

export const PREFAB_LOGOS = [
  { id: 'shield', label: 'Escudo Real', icon: Shield },
  { id: 'swords', label: 'Espadas Cruzadas', icon: Swords },
  { id: 'crown', label: 'Corona de Rey', icon: Crown },
  { id: 'dragon', label: 'Llama de Dragón', icon: Flame },
  { id: 'dices', label: 'Dados D20', icon: Dices },
  { id: 'book', label: 'Libro de Conjuros', icon: BookOpen },
  { id: 'skull', label: 'Calavera Liche', icon: Skull },
  { id: 'castle', label: 'Castillo Fortaleza', icon: Castle },
  { id: 'wand', label: 'Varita Mágica', icon: Wand2 },
  { id: 'compass', label: 'Brújula de Viaje', icon: Compass },
  { id: 'scroll', label: 'Pergamino Antiguo', icon: Scroll },
  { id: 'sparkles', label: 'Destello Arcano', icon: Sparkles },
  { id: 'axe', label: 'Hacha de Batalla', icon: Axe },
  { id: 'gem', label: 'Gema Mágica', icon: Gem },
  { id: 'trophy', label: 'Trofeo de Misión', icon: Trophy },
  { id: 'ghost', label: 'Espectro', icon: Ghost },
  { id: 'moon', label: 'Luna Misteriosa', icon: Moon },
];

export const BrandLogo: React.FC<BrandLogoProps> = ({
  hostSettings,
  size = 'md',
  className = '',
  iconClassName = '',
}) => {
  const logoType = hostSettings?.logoType || (hostSettings?.customLogoUrl ? 'custom' : 'icon');
  const customUrl = hostSettings?.customLogoUrl;
  const iconId = hostSettings?.headerLogoIcon || hostSettings?.logoIcon || 'shield';

  // Size mappings
  const containerSizes = {
    xs: 'w-6 h-6 rounded-lg',
    sm: 'w-7 h-7 rounded-xl',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
    xl: 'w-16 h-16 rounded-3xl',
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const containerClass = `${containerSizes[size]} bg-gradient-to-br from-amber-600 to-amber-950 border border-amber-500/80 shadow flex items-center justify-center text-amber-200 shrink-0 overflow-hidden ${className}`;
  const svgClass = `${iconSizes[size]} ${iconClassName}`;

  // Render Custom Uploaded Image
  if (logoType === 'custom' && customUrl) {
    return (
      <div className={containerClass}>
        <img
          src={customUrl}
          alt="WeRoll Logo"
          className="w-full h-full object-cover rounded-inherit"
          onError={(e) => {
            // Fallback if image breaks
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  // Render Prefabricated Icon
  const matched = PREFAB_LOGOS.find((item) => item.id === iconId);
  const IconComponent = matched ? matched.icon : Shield;

  return (
    <div className={containerClass}>
      <IconComponent className={svgClass} />
    </div>
  );
};
