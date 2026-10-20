import React, { useState, useRef } from 'react';
import {
  User,
  Shield,
  Crown,
  Flame,
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
  Ghost,
  Zap,
  Crosshair,
  Feather,
  Upload,
  X,
  Check,
  Trash2,
} from 'lucide-react';
import { EntityAvatar } from './EntityAvatar';

export interface AvatarCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  currentType?: 'icon' | 'custom';
  currentCustomUrl?: string;
  currentIconId?: string;
  category?: 'player' | 'npc' | 'monster' | 'item' | 'spell' | 'location' | 'journal';
  onSave: (data: { type: 'icon' | 'custom'; customUrl?: string; iconId?: string }) => void;
}

export const AvatarCustomizerModal: React.FC<AvatarCustomizerModalProps> = ({
  isOpen,
  onClose,
  title,
  currentType = 'icon',
  currentCustomUrl,
  currentIconId = 'anonymous',
  category = 'player',
  onSave,
}) => {
  const [logoType, setLogoType] = useState<'icon' | 'custom'>(currentType);
  const [customUrl, setCustomUrl] = useState<string | undefined>(currentCustomUrl);
  const [selectedIconId, setSelectedIconId] = useState<string>(currentIconId);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Prefabricated Icons by Category
  const PREFAB_ICONS_BY_CATEGORY = {
    player: [
      { id: 'male', label: 'Hombre', icon: User },
      { id: 'female', label: 'Mujer', icon: User },
      { id: 'anonymous', label: 'Anónimo / Sin Diseño', icon: User },
      { id: 'warrior', label: 'Guerrero', icon: Swords },
      { id: 'mage', label: 'Mago', icon: Wand2 },
      { id: 'rogue', label: 'Pícaro', icon: Axe },
      { id: 'cleric', label: 'Clérigo / Paladín', icon: Shield },
      { id: 'ranger', label: 'Explorador', icon: Crosshair },
      { id: 'crown', label: 'Noble', icon: Crown },
      { id: 'skull', label: 'Antihéroe / Liche', icon: Skull },
    ],
    npc: [
      { id: 'male', label: 'Hombre', icon: User },
      { id: 'female', label: 'Mujer', icon: User },
      { id: 'anonymous', label: 'Silueta Anónima', icon: User },
      { id: 'noble', label: 'Noble / Rey', icon: Crown },
      { id: 'warrior', label: 'Guardia / Mercenario', icon: Swords },
      { id: 'mage', label: 'Erudito / Mago', icon: Wand2 },
      { id: 'scroll', label: 'Comerciante', icon: Scroll },
      { id: 'skull', label: 'Villano / Sospechoso', icon: Skull },
    ],
    monster: [
      { id: 'dragon', label: 'Dragón', icon: Flame },
      { id: 'skull', label: 'Muerto Viviente', icon: Skull },
      { id: 'ghost', label: 'Espectro', icon: Ghost },
      { id: 'warrior', label: 'Enemigo Marcial', icon: Swords },
      { id: 'shield', label: 'Guardián', icon: Shield },
      { id: 'sparkles', label: 'Elemental', icon: Sparkles },
      { id: 'axe', label: 'Bestia / Gigante', icon: Axe },
    ],
    item: [
      { id: 'swords', label: 'Arma / Espada', icon: Swords },
      { id: 'shield', label: 'Escudo / Armadura', icon: Shield },
      { id: 'flame', label: 'Poción / Elixir', icon: Flame },
      { id: 'gem', label: 'Joya / Reliquia', icon: Gem },
      { id: 'scroll', label: 'Pergamino Mágico', icon: Scroll },
      { id: 'book', label: 'Libro Antiguo', icon: BookOpen },
      { id: 'wand', label: 'Báculo / Varita', icon: Wand2 },
      { id: 'crown', label: 'Corona / Artefacto', icon: Crown },
    ],
    spell: [
      { id: 'flame', label: 'Fuego / Evocación', icon: Flame },
      { id: 'sparkles', label: 'Arcano / Encantamiento', icon: Sparkles },
      { id: 'wand', label: 'Lanzamiento / Báculo', icon: Wand2 },
      { id: 'skull', label: 'Nigromancia', icon: Skull },
      { id: 'shield', label: 'Abjuración / Escudo', icon: Shield },
      { id: 'zap', label: 'Rayo / Electricidad', icon: Zap },
    ],
    location: [
      { id: 'castle', label: 'Castillo / Fortaleza', icon: Castle },
      { id: 'compass', label: 'Región / Bosque', icon: Compass },
      { id: 'shield', label: 'Templo / Ruinas', icon: Shield },
      { id: 'crown', label: 'Ciudad / Poblado', icon: Crown },
      { id: 'skull', label: 'Mazmorra / Cueva', icon: Skull },
    ],
    journal: [
      { id: 'scroll', label: 'Pergamino', icon: Scroll },
      { id: 'book', label: 'Diario de Campaña', icon: BookOpen },
      { id: 'feather', label: 'Pluma de Escribano', icon: Feather },
      { id: 'compass', label: 'Descubrimiento', icon: Compass },
    ],
  };

  const activePrefabs = PREFAB_ICONS_BY_CATEGORY[category] || PREFAB_ICONS_BY_CATEGORY.player;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP, GIF, SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      setCustomUrl(dataUrl);
      setLogoType('custom');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onSave({
      type: logoType,
      customUrl: logoType === 'custom' ? customUrl : undefined,
      iconId: selectedIconId,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-[#181920] border-2 border-amber-900/80 rounded-3xl shadow-2xl p-6 text-stone-200 flex flex-col max-h-[92vh] overflow-hidden space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-3">
            <EntityAvatar
              avatarType={logoType}
              customUrl={customUrl}
              iconId={selectedIconId}
              size="lg"
            />
            <div>
              <h3 className="font-cinzel font-bold text-lg text-amber-300">
                {title}
              </h3>
              <p className="text-xs text-stone-400">
                Personaliza la ilustración o el icono prefabricado
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/svg+xml"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Type Switcher */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setLogoType('icon')}
            className={`p-3 rounded-2xl border text-center transition font-cinzel font-bold text-xs flex items-center justify-center gap-2 ${
              logoType === 'icon'
                ? 'bg-amber-950/80 border-amber-500 text-amber-200 shadow ring-1 ring-amber-500'
                : 'bg-[#121316] border-stone-800 text-stone-400 hover:border-stone-700'
            }`}
          >
            <User className="w-4 h-4 text-amber-400" />
            <span>Iconos Prefabricados</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLogoType('custom');
              if (!customUrl) {
                fileInputRef.current?.click();
              }
            }}
            className={`p-3 rounded-2xl border text-center transition font-cinzel font-bold text-xs flex items-center justify-center gap-2 ${
              logoType === 'custom'
                ? 'bg-purple-950/80 border-purple-500 text-purple-200 shadow ring-1 ring-purple-500'
                : 'bg-[#121316] border-stone-800 text-stone-400 hover:border-stone-700'
            }`}
          >
            <Upload className="w-4 h-4 text-purple-400" />
            <span>Subir Imagen JPG / PNG</span>
          </button>
        </div>

        {/* Mode A: Prefabricated Icons */}
        {logoType === 'icon' && (
          <div className="space-y-2 flex-1 overflow-y-auto pr-1">
            <label className="block text-xs font-cinzel font-bold uppercase text-stone-400">
              Selecciona un Icono:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activePrefabs.map((item) => {
                const IconComp = item.icon;
                const isSelected = selectedIconId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedIconId(item.id)}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-950/90 border-amber-500 text-amber-200 ring-1 ring-amber-500 scale-[1.02]'
                        : 'bg-[#121316] border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                    }`}
                  >
                    <IconComp className={`w-5 h-5 ${isSelected ? 'text-amber-400' : 'text-stone-400'}`} />
                    <span className="text-[11px] font-cinzel font-semibold truncate w-full">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Mode B: Custom Upload */}
        {logoType === 'custom' && (
          <div className="space-y-3 bg-[#121316] border border-stone-800 rounded-2xl p-4 flex-1">
            <span className="block text-xs font-cinzel font-bold text-stone-200">
              Imagen Personalizada de la Entidad
            </span>
            <span className="text-[11px] text-stone-400 block">
              Formatos aceptados: PNG, JPG, JPEG, WEBP.
            </span>

            {customUrl ? (
              <div className="p-3 bg-[#181920] border border-stone-800 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={customUrl}
                    alt="Custom Avatar"
                    className="w-12 h-12 rounded-xl object-cover border border-purple-500 shadow"
                  />
                  <div>
                    <span className="text-xs font-cinzel font-bold text-purple-300 block">
                      Imagen Cargada
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono block">
                      ~{Math.round(customUrl.length / 1024)} KB
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCustomUrl(undefined);
                    setLogoType('icon');
                  }}
                  className="p-2 rounded-lg bg-stone-800 hover:bg-red-950 hover:text-red-300 text-stone-400 text-xs font-cinzel transition border border-stone-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Borrar</span>
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-stone-700 hover:border-purple-500 rounded-xl text-center cursor-pointer transition bg-[#181920]"
              >
                <Upload className="w-8 h-8 text-stone-500 mx-auto mb-2" />
                <span className="text-xs font-cinzel font-bold text-stone-300 block">
                  Haz clic aquí para seleccionar tu imagen JPG o PNG
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-cinzel transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Guardar Icono
          </button>
        </div>
      </div>
    </div>
  );
};
