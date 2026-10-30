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
  Download,
  Plus,
  X,
  Check,
  Trash2,
} from 'lucide-react';
import { EntityAvatar } from './EntityAvatar';
import { compressImageFileToDataUrl } from '../../utils/imageCompressor';
import { clampPortraitGallery } from '../../utils/dnd-math';

export interface AvatarCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  currentType?: 'icon' | 'custom';
  currentCustomUrl?: string;
  currentIconId?: string;
  currentPortraitGallery?: string[];
  maxPortraits?: number;
  aspectRatioCss?: string;
  category?: 'player' | 'npc' | 'monster' | 'item' | 'spell' | 'location' | 'journal';
  onSave: (data: {
    type: 'icon' | 'custom';
    customUrl?: string;
    iconId?: string;
    portraitGallery?: string[];
  }) => void;
}

export const AvatarCustomizerModal: React.FC<AvatarCustomizerModalProps> = ({
  isOpen,
  onClose,
  title,
  currentType = 'icon',
  currentCustomUrl,
  currentIconId = 'anonymous',
  currentPortraitGallery = [],
  maxPortraits = 4,
  aspectRatioCss = '1 / 1',
  category = 'player',
  onSave,
}) => {
  const safeMaxPortraits = Math.max(1, Math.min(24, Math.round(Number(maxPortraits) || 4)));
  const [logoType, setLogoType] = useState<'icon' | 'custom'>(currentType);
  const [customUrl, setCustomUrl] = useState<string | undefined>(currentCustomUrl);
  const [selectedIconId, setSelectedIconId] = useState<string>(currentIconId);
  const [portraitGallery, setPortraitGallery] = useState<string[]>(() =>
    clampPortraitGallery(
      currentCustomUrl
        ? [currentCustomUrl, ...(currentPortraitGallery || [])]
        : currentPortraitGallery || [],
      safeMaxPortraits
    )
  );
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

  const [isProcessingImg, setIsProcessingImg] = useState<boolean>(false);

  const registerNewPortrait = (dataUrl: string) => {
    setCustomUrl(dataUrl);
    setLogoType('custom');
    setPortraitGallery((prev) => {
      if (prev.includes(dataUrl)) return prev;
      if (prev.length < safeMaxPortraits) return [...prev, dataUrl];
      // Replace the last slot if already at max capacity
      return [...prev.slice(0, safeMaxPortraits - 1), dataUrl];
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    setIsProcessingImg(true);
    try {
      const optimizedDataUrl = await compressImageFileToDataUrl(file, 512, 0.85);
      registerNewPortrait(optimizedDataUrl);
    } catch (err: any) {
      console.warn('Fallback al lector directo de imagen:', err);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        if (dataUrl) registerNewPortrait(dataUrl);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsProcessingImg(false);
      e.target.value = '';
    }
  };

  const handleDownloadPortrait = (dataUrl: string, idx: number) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    const cleanTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'personaje';
    link.download = `${cleanTitle}_retrato_${idx + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRemoveFromGallery = (targetUrl: string) => {
    const next = portraitGallery.filter((u) => u !== targetUrl);
    setPortraitGallery(next);
    if (customUrl === targetUrl) {
      if (next.length > 0) {
        setCustomUrl(next[0]);
      } else {
        setCustomUrl(undefined);
        setLogoType('icon');
      }
    }
  };

  const handleSave = () => {
    const finalGallery = clampPortraitGallery(
      logoType === 'custom' && customUrl
        ? [customUrl, ...portraitGallery.filter((u) => u !== customUrl)]
        : portraitGallery,
      safeMaxPortraits
    );
    onSave({
      type: logoType,
      customUrl: logoType === 'custom' ? customUrl : undefined,
      iconId: selectedIconId,
      portraitGallery: finalGallery,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-[#181920] border-2 border-amber-900/80 rounded-3xl shadow-2xl p-6 text-stone-200 flex flex-col max-h-[92vh] overflow-hidden space-y-4">
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
                Personaliza hasta {safeMaxPortraits} retratos intercambiables y descargables
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
              if (!customUrl && portraitGallery.length === 0) {
                fileInputRef.current?.click();
              } else if (!customUrl && portraitGallery.length > 0) {
                setCustomUrl(portraitGallery[0]);
              }
            }}
            className={`p-3 rounded-2xl border text-center transition font-cinzel font-bold text-xs flex items-center justify-center gap-2 ${
              logoType === 'custom'
                ? 'bg-purple-950/80 border-purple-500 text-purple-200 shadow ring-1 ring-purple-500'
                : 'bg-[#121316] border-stone-800 text-stone-400 hover:border-stone-700'
            }`}
          >
            <Upload className="w-4 h-4 text-purple-400" />
            <span>Galería de Retratos ({portraitGallery.length}/{safeMaxPortraits})</span>
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

        {/* Mode B: Custom Upload & Dynamic Portrait Gallery (1 to 24 slots) */}
        {logoType === 'custom' && (
          <div className="space-y-3 bg-[#121316] border border-stone-800 rounded-2xl p-4 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-xs font-cinzel font-bold text-stone-200">
                  Galería de Retratos ({portraitGallery.length}/{safeMaxPortraits} Máximo)
                </span>
                <span className="text-[11px] text-stone-400 block">
                  Haz clic en cualquiera de tus {safeMaxPortraits} imágenes para activarla o descárgala cuando quieras.
                </span>
              </div>
              {portraitGallery.length < safeMaxPortraits && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingImg}
                  className="px-3 py-1.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 border border-purple-400/60 text-purple-100 text-xs font-cinzel font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Subir ({portraitGallery.length}/{safeMaxPortraits})</span>
                </button>
              )}
            </div>

            {/* Portrait Slots Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {Array.from({ length: safeMaxPortraits }, (_, slotIdx) => {
                const slotUrl = portraitGallery[slotIdx];
                const isCurrentActive = Boolean(slotUrl && customUrl === slotUrl);
                if (slotUrl) {
                  return (
                    <div
                      key={`portrait-slot-${slotIdx}`}
                      data-testid={`portrait-slot-${slotIdx}`}
                      onClick={() => {
                        setCustomUrl(slotUrl);
                        setLogoType('custom');
                      }}
                      className={`group relative rounded-xl border-2 p-1.5 flex flex-col items-center justify-between cursor-pointer transition ${
                        isCurrentActive
                          ? 'border-amber-400 bg-amber-950/30 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                          : 'border-stone-700 bg-[#181920] hover:border-purple-400'
                      }`}
                    >
                      <div
                        style={{ aspectRatio: aspectRatioCss }}
                        className="relative w-full rounded-lg overflow-hidden bg-black/60"
                      >
                        <img
                          src={slotUrl}
                          alt={`Retrato ${slotIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {isCurrentActive && (
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500 text-black font-cinzel font-black text-[9px] uppercase">
                            Activo
                          </span>
                        )}
                      </div>
                      <div className="w-full flex items-center justify-between gap-1 mt-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPortrait(slotUrl, slotIdx);
                          }}
                          className="flex-1 py-1 px-1.5 rounded bg-stone-800 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 text-[10px] font-cinzel font-bold flex items-center justify-center gap-1"
                          title="Descargar esta imagen de retrato"
                        >
                          <Download className="w-3 h-3" />
                          <span>Descargar</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFromGallery(slotUrl);
                          }}
                          className="p-1 rounded bg-stone-800 hover:bg-red-950 text-red-300 border border-red-500/30"
                          title="Quitar de la galería"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={`portrait-empty-${slotIdx}`}
                    type="button"
                    data-testid={`portrait-empty-${slotIdx}`}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ aspectRatio: aspectRatioCss }}
                    className="rounded-xl border-2 border-dashed border-stone-700 hover:border-purple-400 bg-[#181920]/70 p-3 flex flex-col items-center justify-center gap-1.5 text-stone-400 hover:text-purple-200 transition cursor-pointer"
                  >
                    <Upload className="w-5 h-5 text-purple-400" />
                    <span className="text-[10px] font-cinzel font-bold text-center">
                      Espacio {slotIdx + 1}/{safeMaxPortraits}
                    </span>
                  </button>
                );
              })}
            </div>
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
            Guardar Retrato
          </button>
        </div>
      </div>
    </div>
  );
};

