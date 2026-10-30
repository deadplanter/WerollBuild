import React, { useRef, useState } from 'react';
import {
  Layers,
  Map as MapIcon,
  Shapes,
  Sparkles,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Plus,
  Trash2,
  Copy,
  ArrowLeftRight,
  Move,
  Maximize2,
  Sliders,
  Image as ImageIcon,
  Type,
  Shield,
  Heart,
  Swords,
  BookOpen,
  Backpack,
  Dices,
  ChevronRight,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Users,
  Minimize2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import type {
  AppSkinThemeTokens,
  Character5e,
  DeckCardGraphicTemplate,
  GeometricShapeType,
  PlayerMapBlockId,
  PlayerSheetBlockId,
  PortraitAspectRatioPreset,
  SkinModalPopupOverride,
  SkinModalTargetId,
  SpatialBlockConfig,
  SpatialInnerElementConfig,
  StatBoxGraphicConfig,
  TarotCardExclusiveStudioConfig,
  TarotCardModuleItem,
  TarotCardModuleKind,
  TarotStudioSurfaceSide,
} from '../../types/dnd';
import {
  ALL_9_ALIGNMENTS_5E,
  ALL_PLAYER_MAP_BLOCK_IDS,
  ALL_PLAYER_SHEET_BLOCK_IDS,
  SAMPLE_ROOM_PLAYERS_5E,
  addCustomTarotModule,
  buildGeometricElementStyle,
  buildSpatialBlockInlineStyle,
  createDefaultPlayerMapLayout,
  createDefaultPlayerSheetLayout,
  createDefaultTarotStudioConfig,
  duplicateTarotModule,
  getAspectRatioCssValue,
  makeInnerEl,
  movePlayerSheetBlockOrder,
  moveSpatialBlockInnerButtonOrder,
  removeTarotModule,
  resolveDeckCardTemplate,
  resolveModalPopupConfig,
  resolvePlayerMapLayout,
  resolvePlayerSheetLayout,
  resolveStatBoxGraphicConfig,
  resolveTarotStudioConfig,
  updatePlayerMapBlock,
  updatePlayerSheetBlock,
  updateSpatialBlockInnerButton,
  updateTarotModule,
} from '../../utils/playerSkinLayout';
import { applyColorWithOpacity } from '../../utils/lobbyPageLayout';
import { ImageSourcePicker } from '../common/ImageSourcePicker';
import { GeometricSvgBorder } from '../common/GeometricSvgBorder';
import { InteractivePopupBuilderCanvas } from './InteractivePopupBuilderCanvas';

export type PlayerSkinApartadoId =
  | 'apartado_1_sheet'
  | 'apartado_2_map'
  | 'apartado_3_graphics'
  | 'apartado_4_tarot';

export interface PlayerSkinFourApartadosEditorProps {
  draft?: unknown;
  tokens: AppSkinThemeTokens;
  sampleCharacter: Character5e;
  activeApartado?: PlayerSkinApartadoId;
  onChangeApartado?: (apartado: PlayerSkinApartadoId) => void;
  onUpdateTokens?: (patch: Partial<AppSkinThemeTokens>) => void;
  updateTokensBatch?: (patch: Partial<AppSkinThemeTokens>) => void;
  updateToken?: <K extends keyof AppSkinThemeTokens>(
    key: K,
    val: AppSkinThemeTokens[K]
  ) => void;
}

const GEOMETRIC_SHAPES: Array<{ id: GeometricShapeType; label: string }> = [
  { id: 'rounded', label: 'Redondeado' },
  { id: 'square', label: 'Cuadrado Recto' },
  { id: 'circle', label: 'Círculo / Óvalo' },
  { id: 'hexagon', label: 'Hexágono' },
  { id: 'octagon', label: 'Octágono' },
  { id: 'diamond', label: 'Rombo / Diamante' },
  { id: 'pentagon', label: 'Pentágono' },
  { id: 'triangle', label: 'Triángulo' },
];

const ASPECT_RATIO_PRESETS: Array<{ id: PortraitAspectRatioPreset; label: string }> = [
  { id: '1:1', label: '1:1 Cuadrado' },
  { id: '3:4', label: '3:4 Retrato Clásico' },
  { id: '9:16', label: '9:16 Vertical' },
  { id: '4:3', label: '4:3 Horizontal' },
  { id: '16:9', label: '16:9 Panorámico' },
  { id: 'custom', label: 'Personalizado' },
];

const FONT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "'Cinzel', serif", label: 'Cinzel (Clásica Fantasía)' },
  { value: "'Inter', sans-serif", label: 'Inter / Sans (Moderna)' },
  { value: "'Georgia', serif", label: 'Georgia (Editorial)' },
  { value: "'JetBrains Mono', monospace", label: 'Monospace (Táctica)' },
];

const SHEET_POPUP_TARGETS: Array<{ id: SkinModalTargetId; label: string; desc: string }> = [
  {
    id: 'modal_inventory',
    label: 'Equipo e Inventario',
    desc: 'Capacidad de carga, monedas, pestañas Armas/Armaduras/Objetos/Conjuros, botón + Añadir y tarjetas.',
  },
  {
    id: 'modal_journal',
    label: 'Diario de Sesiones',
    desc: 'Índice de hojas de sesión, editor de crónicas y botones de nueva entrada y guardado.',
  },
  {
    id: 'modal_traits',
    label: 'Rasgos y Trasfondo',
    desc: 'Pestañas de rasgos de clase, trasfondo militar, biografía y botón de añadir dote.',
  },
  {
    id: 'modal_character_settings',
    label: 'Ajustes del Héroe',
    desc: 'Selector de skin equipada, perfil de sonido de dados y exportación de personaje.',
  },
];

export const PlayerSkinFourApartadosEditor: React.FC<
  PlayerSkinFourApartadosEditorProps
> = ({
  tokens,
  sampleCharacter,
  activeApartado: controlledApartado,
  onChangeApartado,
  onUpdateTokens: onUpdateTokensProp,
  updateTokensBatch,
}) => {
  const onUpdateTokens = (patch: Partial<AppSkinThemeTokens>) => {
    onUpdateTokensProp?.(patch);
    updateTokensBatch?.(patch);
  };
  const resolvedCharacter = sampleCharacter || {
    id: 'char_sample_valeros',
    name: 'Valeros del Alba',
    avatarUrl:
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80',
    avatarCustomUrl: '',
    characterClass: 'Guerrero',
    level: 3,
    race: 'Humano',
  };
  const [internalApartado, setInternalApartado] =
    useState<PlayerSkinApartadoId>('apartado_1_sheet');
  const activeApartado = controlledApartado || internalApartado;

  const setActiveApartado = (next: PlayerSkinApartadoId) => {
    setInternalApartado(next);
    onChangeApartado?.(next);
  };

  // Apartado 1 selection state
  const [selectedSheetBlockId, setSelectedSheetBlockId] =
    useState<PlayerSheetBlockId>('identity_header');
  const [selectedSheetInnerId, setSelectedSheetInnerId] = useState<string | null>(
    null
  );
  const [expandedSheetBlocks, setExpandedSheetBlocks] = useState<
    Record<string, boolean>
  >({
    identity_header: true,
    ability_scores_grid: true,
  });
  const [sheetZoom, setSheetZoom] = useState<number>(0.85);

  // Apartado 2 selection state
  const [selectedMapBlockId, setSelectedMapBlockId] =
    useState<PlayerMapBlockId>('map_top_bar');
  const [selectedMapInnerId, setSelectedMapInnerId] = useState<string | null>(
    null
  );
  const [expandedMapBlocks, setExpandedMapBlocks] = useState<
    Record<string, boolean>
  >({
    map_top_bar: true,
    map_dice_box_panel: true,
  });
  const [mapZoom, setMapZoom] = useState<number>(0.85);

  // Apartado 3 sub-studio state
  const [apartado3SubTab, setApartado3SubTab] = useState<
    | 'portrait_and_alignments'
    | 'stat_boxes_studio'
    | 'deck_cards_studio'
    | 'sheet_popups_studio'
  >('portrait_and_alignments');
  const [activeDeckKind, setActiveDeckKind] = useState<
    'combat' | 'skills' | 'spells'
  >('combat');
  const [selectedStatPartId, setSelectedStatPartId] = useState<string | null>(
    'part_label'
  );
  const [selectedDeckPartId, setSelectedDeckPartId] = useState<string | null>(
    'card_header_title'
  );
  const [activeSheetPopupId, setActiveSheetPopupId] =
    useState<SkinModalTargetId>('modal_inventory');
  const [selectedPopupInnerId, setSelectedPopupInnerId] = useState<
    string | null
  >(null);

  // Apartado 4 Tarot & Tactical Token Modular Studio state
  const [selectedTarotModuleId, setSelectedTarotModuleId] =
    useState<string>('mod_portrait');
  const [tarotInspectTarget, setTarotInspectTarget] = useState<
    'module' | 'card_frame' | 'token_frame'
  >('module');

  // Full-screen real 1:1 spacious canvas mode (minimizable directly to inspector)
  const [fullScreenCanvasMode, setFullScreenCanvasMode] = useState<
    'none' | 'sheet' | 'map'
  >('none');

  // Sample players count (1 to 8) for room preview in Apartado 1 & Apartado 2
  const [samplePlayersCount, setSamplePlayersCount] = useState<number>(4);

  // Apartado 1: Sheet Tarot Dock preview side (front or back)
  const [sheetDockCardSide, setSheetDockCardSide] = useState<'front' | 'back'>(
    'front'
  );

  // Apartado 4: Tarot Studio Surface View Switcher ('front' | 'back' | 'token' | 'all')
  const [tarotSurfaceView, setTarotSurfaceView] = useState<
    'front' | 'back' | 'token' | 'all'
  >('front');

  // Resolved configs
  const sheetLayout = resolvePlayerSheetLayout(tokens);
  const mapLayout = resolvePlayerMapLayout(tokens);
  const statBoxConfig = resolveStatBoxGraphicConfig(tokens);
  const deckTemplate = resolveDeckCardTemplate(tokens, activeDeckKind);
  const tarotConfig = resolveTarotStudioConfig(tokens);
  const activePopupConfig = resolveModalPopupConfig(tokens, activeSheetPopupId);

  // Refs for interactive drag & resize
  const blockDomRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const innerDomRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tarotFrontRef = useRef<HTMLDivElement | null>(null);
  const tarotBackRef = useRef<HTMLDivElement | null>(null);
  const tarotTokenRef = useRef<HTMLDivElement | null>(null);
  const tarotModRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ==========================================================================
  // SHARED DRAG & RESIZE HANDLERS FOR APARTADO 1 & APARTADO 2
  // ==========================================================================
  const startSpatialBlockDrag = <TId extends string>(
    e: React.MouseEvent,
    block: SpatialBlockConfig<TId>,
    zoom: number,
    onSelect: () => void,
    onUpdate: (patch: Partial<SpatialBlockConfig<TId>>) => void
  ) => {
    e.stopPropagation();
    onSelect();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startX = block.x || 0;
    const startY = block.y || 0;
    const safeZoom = Math.max(0.4, zoom || 1);

    const onMove = (ev: MouseEvent) => {
      const dx = Math.round((ev.clientX - startMouseX) / safeZoom);
      const dy = Math.round((ev.clientY - startMouseY) / safeZoom);
      onUpdate({ x: startX + dx, y: startY + dy, offsetX: startX + dx, offsetY: startY + dy });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startSpatialBlockResize = <TId extends string>(
    e: React.MouseEvent,
    block: SpatialBlockConfig<TId>,
    edge: 'e' | 's' | 'se',
    zoom: number,
    onSelect: () => void,
    onUpdate: (patch: Partial<SpatialBlockConfig<TId>>) => void
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    const domEl = blockDomRefs.current[block.id];
    const rect = domEl?.getBoundingClientRect();
    const safeZoom = Math.max(0.4, zoom || 1);
    const startW =
      block.widthPx > 0 ? block.widthPx : Math.round((rect?.width || 600) / safeZoom);
    const startH =
      block.heightPx > 0 ? block.heightPx : Math.round((rect?.height || 140) / safeZoom);
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startMouseX) / safeZoom;
      const dy = (ev.clientY - startMouseY) / safeZoom;
      const patch: Partial<SpatialBlockConfig<TId>> = {};
      if (edge === 'e' || edge === 'se') {
        patch.widthPx = Math.max(180, Math.round(startW + dx));
      }
      if (edge === 's' || edge === 'se') {
        patch.heightPx = Math.max(48, Math.round(startH + dy));
      }
      onUpdate(patch);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startInnerElDrag = (
    e: React.MouseEvent,
    inner: SpatialInnerElementConfig,
    zoom: number,
    onSelect: () => void,
    onUpdate: (patch: Partial<SpatialInnerElementConfig>) => void
  ) => {
    e.stopPropagation();
    onSelect();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startX = inner.x || 0;
    const startY = inner.y || 0;
    const safeZoom = Math.max(0.4, zoom || 1);

    const onMove = (ev: MouseEvent) => {
      const dx = Math.round((ev.clientX - startMouseX) / safeZoom);
      const dy = Math.round((ev.clientY - startMouseY) / safeZoom);
      onUpdate({ x: startX + dx, y: startY + dy });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startInnerElResize = (
    e: React.MouseEvent,
    inner: SpatialInnerElementConfig,
    domKey: string,
    edge: 'e' | 's' | 'se',
    zoom: number,
    onSelect: () => void,
    onUpdate: (patch: Partial<SpatialInnerElementConfig>) => void
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    const domEl = innerDomRefs.current[domKey];
    const rect = domEl?.getBoundingClientRect();
    const safeZoom = Math.max(0.4, zoom || 1);
    const startW =
      inner.widthPx && inner.widthPx > 0
        ? inner.widthPx
        : Math.round((rect?.width || 130) / safeZoom);
    const startH =
      inner.heightPx && inner.heightPx > 0
        ? inner.heightPx
        : Math.round((rect?.height || 40) / safeZoom);
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startMouseX) / safeZoom;
      const dy = (ev.clientY - startMouseY) / safeZoom;
      const patch: Partial<SpatialInnerElementConfig> = {};
      if (edge === 'e' || edge === 'se') {
        patch.widthPx = Math.max(40, Math.round(startW + dx));
      }
      if (edge === 's' || edge === 'se') {
        patch.heightPx = Math.max(22, Math.round(startH + dy));
      }
      onUpdate(patch);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ==========================================================================
  // RENDER INTERACTIVE INNER ELEMENT BOX (Used in Apartado 1, 2, and 3)
  // ==========================================================================
  const renderInteractiveInnerElement = (
    inner: SpatialInnerElementConfig,
    domKey: string,
    isSelected: boolean,
    zoom: number,
    onSelect: () => void,
    onUpdate: (patch: Partial<SpatialInnerElementConfig>) => void,
    overrideShape?: GeometricShapeType,
    overrideEdgeFade?: number,
    customChildren?: React.ReactNode,
    className = ''
  ) => {
    if (inner.visible === false || (inner.opacity ?? 1) <= 0.01) {
      return (
        <div
          key={domKey}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="px-2 py-1 rounded border border-dashed border-stone-700/70 bg-stone-950/50 text-[9px] text-stone-500 cursor-pointer inline-flex items-center gap-1"
        >
          <EyeOff className="w-2.5 h-2.5" /> {inner.label || inner.id} (Oculto)
        </div>
      );
    }

    const effectiveShape = overrideShape || inner.shape || 'rounded';
    const effectiveFade = overrideEdgeFade ?? inner.edgeFadePercent ?? 0;

    const geoStyle = buildGeometricElementStyle({
      shape: effectiveShape,
      edgeFadePercent: effectiveFade,
      hideBorder: inner.hideBorder,
      borderRadiusPx: inner.borderRadiusPx ?? 10,
      bgColor: applyColorWithOpacity(
        inner.bgColor || '#1e2230',
        inner.bgOpacity ?? 0.92
      ),
      borderColor: inner.borderColor || '#c8a45c',
      borderWidthPx: inner.borderWidthPx ?? 1,
      customPngUrl: inner.bgImageUrl,
      opacity: inner.opacity ?? 1,
    });

    return (
      <div
        key={domKey}
        ref={(el) => {
          innerDomRefs.current[domKey] = el;
        }}
        data-testid={`interactive-inner-${domKey}`}
        onMouseDown={(e) => startInnerElDrag(e, inner, zoom, onSelect, onUpdate)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        style={{
          ...geoStyle,
          color: inner.textColor || '#f5e4be',
          fontFamily: inner.fontFamily || "'Cinzel', serif",
          fontSize: inner.fontSizePx ? `${inner.fontSizePx}px` : undefined,
          paddingLeft: inner.paddingXPx !== undefined ? `${inner.paddingXPx}px` : '10px',
          paddingRight: inner.paddingXPx !== undefined ? `${inner.paddingXPx}px` : '10px',
          paddingTop: inner.paddingYPx !== undefined ? `${inner.paddingYPx}px` : '6px',
          paddingBottom: inner.paddingYPx !== undefined ? `${inner.paddingYPx}px` : '6px',
          width: inner.widthPx && inner.widthPx > 0 ? `${inner.widthPx}px` : undefined,
          minHeight: inner.heightPx && inner.heightPx > 0 ? `${inner.heightPx}px` : undefined,
          transform:
            inner.x || inner.y
              ? `translate(${inner.x || 0}px, ${inner.y || 0}px)`
              : undefined,
        }}
        className={`relative group/inner cursor-move select-none transition-shadow ${
          isSelected
            ? 'ring-2 ring-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.4)] z-30'
            : 'hover:ring-1 hover:ring-amber-400/60'
        } ${className}`}
      >
        <GeometricSvgBorder
          shape={effectiveShape}
          borderColor={inner.borderColor || '#c8a45c'}
          borderWidthPx={inner.borderWidthPx ?? 1}
          hideBorder={inner.hideBorder}
        />

        {isSelected && (
          <div className="absolute -top-6 left-0 z-40 flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/95 border border-cyan-400/80 text-[8px] font-mono text-cyan-200 whitespace-nowrap shadow">
            <Move className="w-2.5 h-2.5 text-cyan-300" />
            <span>
              {inner.x || 0},{inner.y || 0}px
            </span>
            {((inner.x || 0) !== 0 ||
              (inner.y || 0) !== 0 ||
              (inner.widthPx || 0) > 0 ||
              (inner.heightPx || 0) > 0) && (
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ x: 0, y: 0, widthPx: 0, heightPx: 0 });
                }}
                className="ml-0.5 px-1 rounded bg-cyan-900 hover:bg-cyan-800 text-white"
                title="Restablecer posición/tamaño"
              >
                <RotateCcw className="w-2 h-2" />
              </button>
            )}
          </div>
        )}

        <div className="relative z-10">
          {customChildren || (
            <div className="flex items-center gap-1.5">
              {inner.customIconUrl && (
                <img
                  src={inner.customIconUrl}
                  alt=""
                  style={{
                    width: `${inner.iconSizePx || 14}px`,
                    height: `${inner.iconSizePx || 14}px`,
                  }}
                  className="object-contain shrink-0"
                />
              )}
              <div className="min-w-0">
                {inner.label !== '' && (
                  <div className="font-bold leading-tight truncate">
                    {inner.label ?? inner.id}
                  </div>
                )}
                {inner.exampleValue && (
                  <div className="text-[10px] opacity-85 leading-tight truncate">
                    {inner.exampleValue}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {isSelected && (
          <>
            <div
              onMouseDown={(e) =>
                startInnerElResize(e, inner, domKey, 'e', zoom, onSelect, onUpdate)
              }
              className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-5 rounded-full bg-cyan-400 border border-stone-950 cursor-ew-resize z-40"
              title="Estirar ancho (↔)"
            />
            <div
              onMouseDown={(e) =>
                startInnerElResize(e, inner, domKey, 's', zoom, onSelect, onUpdate)
              }
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-2.5 rounded-full bg-cyan-400 border border-stone-950 cursor-ns-resize z-40"
              title="Estirar alto (↕)"
            />
            <div
              onMouseDown={(e) =>
                startInnerElResize(e, inner, domKey, 'se', zoom, onSelect, onUpdate)
              }
              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded bg-cyan-300 border border-stone-950 cursor-nwse-resize z-40"
              title="Redimensionar esquina (↘)"
            />
          </>
        )}
      </div>
    );
  };

  // ==========================================================================
  // SHARED CENTER INSPECTOR FOR SPATIAL BLOCK OR INNER ELEMENT (Apartados 1 & 2)
  // ==========================================================================
  const renderBlockOrInnerInspector = <TId extends string>(params: {
    block: SpatialBlockConfig<TId>;
    selectedInnerId: string | null;
    onClearInnerSelection: () => void;
    onUpdateBlock: (patch: Partial<SpatialBlockConfig<TId>>) => void;
    onUpdateInner: (innerId: string, patch: Partial<SpatialInnerElementConfig>) => void;
  }) => {
    const {
      block,
      selectedInnerId,
      onClearInnerSelection,
      onUpdateBlock,
      onUpdateInner,
    } = params;

    const selectedInner = selectedInnerId
      ? block.innerButtonsConfig?.[selectedInnerId]
      : null;

    if (selectedInner) {
      return (
        <div
          data-testid="spatial-inner-element-inspector"
          className="space-y-3 p-3.5 rounded-2xl bg-stone-900/95 border border-cyan-500/40 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
            <div>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-[9px] font-bold text-cyan-300 uppercase">
                Elemento / Botón Interno Seleccionado
              </span>
              <h4 className="text-xs font-cinzel font-bold text-white mt-1">
                {selectedInner.label || selectedInner.id}
              </h4>
            </div>
            <button
              type="button"
              onClick={onClearInnerSelection}
              className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-[10px] font-bold text-amber-300 border border-amber-500/30"
            >
              ← Volver al Bloque
            </button>
          </div>

          {/* Label & Example Text */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-stone-300">
                  Texto / Etiqueta
                </label>
                <button
                  type="button"
                  onClick={() => onUpdateInner(selectedInner.id, { label: '' })}
                  className="text-[9px] text-cyan-300 hover:underline"
                >
                  Vaciar texto
                </button>
              </div>
              <input
                type="text"
                value={selectedInner.label ?? ''}
                onChange={(e) =>
                  onUpdateInner(selectedInner.id, { label: e.target.value })
                }
                placeholder="(Sin texto / Solo PNG)"
                className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-xs text-stone-100"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-300 mb-1">
                Valor de Ejemplo (Dinámico en Juego)
              </label>
              <input
                type="text"
                value={selectedInner.exampleValue ?? ''}
                onChange={(e) =>
                  onUpdateInner(selectedInner.id, { exampleValue: e.target.value })
                }
                placeholder="Ej. Valeros del Alba / +4 / 18"
                className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-xs text-stone-100"
              />
            </div>
          </div>

          {/* Position & Size */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-[9px] text-stone-400">Posición X (px)</label>
              <input
                type="number"
                value={selectedInner.x || 0}
                onChange={(e) =>
                  onUpdateInner(selectedInner.id, { x: Number(e.target.value) || 0 })
                }
                className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] text-stone-400">Posición Y (px)</label>
              <input
                type="number"
                value={selectedInner.y || 0}
                onChange={(e) =>
                  onUpdateInner(selectedInner.id, { y: Number(e.target.value) || 0 })
                }
                className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] text-stone-400">Ancho (0=Auto)</label>
              <input
                type="number"
                min={0}
                value={selectedInner.widthPx || 0}
                onChange={(e) =>
                  onUpdateInner(selectedInner.id, {
                    widthPx: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] text-stone-400">Alto (0=Auto)</label>
              <input
                type="number"
                min={0}
                value={selectedInner.heightPx || 0}
                onChange={(e) =>
                  onUpdateInner(selectedInner.id, {
                    heightPx: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Geometric Shape & Edge Fade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-stone-300 mb-1">
                Figura Geométrica (Borde SVG Continuo)
              </label>
              <select
                value={selectedInner.shape || 'rounded'}
                onChange={(e) =>
                  onUpdateInner(selectedInner.id, {
                    shape: e.target.value as GeometricShapeType,
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-xs text-stone-100"
              >
                {GEOMETRIC_SHAPES.map((sh) => (
                  <option key={sh.id} value={sh.id}>
                    {sh.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-300 mb-1">
                Difuminado de Bordes ({selectedInner.edgeFadePercent || 0}%)
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={selectedInner.edgeFadePercent || 0}
                onChange={(e) =>
                  onUpdateInner(selectedInner.id, {
                    edgeFadePercent: Number(e.target.value) || 0,
                  })
                }
                className="w-full accent-cyan-400"
              />
            </div>
          </div>

          {/* Opacity & Frame Transparency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[10px] text-stone-300 mb-1">
                Opacidad Total ({Math.round((selectedInner.opacity ?? 1) * 100)}%)
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={selectedInner.opacity ?? 1}
                onChange={(e) =>
                  onUpdateInner(selectedInner.id, {
                    opacity: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-cyan-400"
              />
            </div>
            <div>
              <label className="block text-[10px] text-stone-300 mb-1">
                Opacidad Fondo ({Math.round((selectedInner.bgOpacity ?? 0.9) * 100)}%)
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={selectedInner.bgOpacity ?? 0.9}
                onChange={(e) =>
                  onUpdateInner(selectedInner.id, {
                    bgOpacity: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-cyan-400"
              />
            </div>
            <div className="flex items-center pt-4">
              <label className="flex items-center gap-2 text-xs text-stone-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(selectedInner.hideBorder)}
                  onChange={(e) =>
                    onUpdateInner(selectedInner.id, {
                      hideBorder: e.target.checked,
                    })
                  }
                  className="rounded border-stone-600"
                />
                <span>Quitar Borde</span>
              </label>
            </div>
          </div>

          {/* Colors & Font Size */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-[9px] text-stone-400 mb-1">Color Fondo</label>
              <input
                type="color"
                value={selectedInner.bgColor || '#1e2230'}
                onChange={(e) =>
                  onUpdateInner(selectedInner.id, { bgColor: e.target.value })
                }
                className="w-full h-8 rounded bg-stone-950 border border-stone-700 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[9px] text-stone-400 mb-1">Color Borde</label>
              <input
                type="color"
                value={selectedInner.borderColor || '#c8a45c'}
                onChange={(e) =>
                  onUpdateInner(selectedInner.id, { borderColor: e.target.value })
                }
                className="w-full h-8 rounded bg-stone-950 border border-stone-700 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[9px] text-stone-400 mb-1">Color Texto</label>
              <input
                type="color"
                value={selectedInner.textColor || '#f5e4be'}
                onChange={(e) =>
                  onUpdateInner(selectedInner.id, { textColor: e.target.value })
                }
                className="w-full h-8 rounded bg-stone-950 border border-stone-700 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[9px] text-stone-400 mb-1">
                Tamaño Fuente ({selectedInner.fontSizePx || 12}px)
              </label>
              <input
                type="number"
                min={8}
                max={42}
                value={selectedInner.fontSizePx || 12}
                onChange={(e) =>
                  onUpdateInner(selectedInner.id, {
                    fontSizePx: Number(e.target.value) || 12,
                  })
                }
                className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Custom PNG Background & Icon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <ImageSourcePicker
              label="PNG / Textura de Fondo del Elemento"
              value={selectedInner.bgImageUrl || ''}
              onChange={(url) =>
                onUpdateInner(selectedInner.id, { bgImageUrl: url })
              }
            />
            <ImageSourcePicker
              label="Icono PNG Acompañante"
              value={selectedInner.customIconUrl || ''}
              onChange={(url) =>
                onUpdateInner(selectedInner.id, { customIconUrl: url })
              }
            />
          </div>
        </div>
      );
    }

    // Block Inspector
    return (
      <div
        data-testid="spatial-block-inspector"
        className="space-y-3 p-3.5 rounded-2xl bg-stone-900/95 border border-amber-500/35 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
          <div>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-bold text-amber-300 uppercase">
              Bloque Principal Seleccionado
            </span>
            <h4 className="text-xs font-cinzel font-bold text-amber-100 mt-1">
              {block.name}
            </h4>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateBlock({
                x: 0,
                y: 0,
                offsetX: 0,
                offsetY: 0,
                widthPx: 0,
                heightPx: 0,
                scale: 1,
              })
            }
            className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-[10px] text-amber-300 border border-amber-500/30 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset Pos/Tamaño
          </button>
        </div>

        {/* Title & Typography */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] font-bold text-stone-300 mb-1">
              Título del Bloque
            </label>
            <input
              type="text"
              value={block.titleText || ''}
              onChange={(e) =>
                onUpdateBlock({
                  titleText: e.target.value,
                  customTitle: e.target.value,
                })
              }
              className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-xs text-stone-100"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-300 mb-1">
              Tipografía del Bloque
            </label>
            <select
              value={block.fontFamily || "'Cinzel', serif"}
              onChange={(e) => onUpdateBlock({ fontFamily: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-xs text-stone-100"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* X, Y, W, H */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className="block text-[9px] text-stone-400">Desplazamiento X</label>
            <input
              type="number"
              value={block.x || 0}
              onChange={(e) => {
                const v = Number(e.target.value) || 0;
                onUpdateBlock({ x: v, offsetX: v });
              }}
              className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[9px] text-stone-400">Desplazamiento Y</label>
            <input
              type="number"
              value={block.y || 0}
              onChange={(e) => {
                const v = Number(e.target.value) || 0;
                onUpdateBlock({ y: v, offsetY: v });
              }}
              className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[9px] text-stone-400">Ancho W (0=Auto)</label>
            <input
              type="number"
              min={0}
              value={block.widthPx || 0}
              onChange={(e) =>
                onUpdateBlock({ widthPx: Math.max(0, Number(e.target.value) || 0) })
              }
              className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[9px] text-stone-400">Alto H (0=Auto)</label>
            <input
              type="number"
              min={0}
              value={block.heightPx || 0}
              onChange={(e) =>
                onUpdateBlock({ heightPx: Math.max(0, Number(e.target.value) || 0) })
              }
              className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-white font-mono"
            />
          </div>
        </div>

        {/* Shape, Edge Fade & Scale */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[10px] text-stone-300 mb-1">
              Figura del Bloque
            </label>
            <select
              value={block.shape || 'rounded'}
              onChange={(e) =>
                onUpdateBlock({ shape: e.target.value as GeometricShapeType })
              }
              className="w-full px-2 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-xs text-stone-100"
            >
              {GEOMETRIC_SHAPES.map((sh) => (
                <option key={sh.id} value={sh.id}>
                  {sh.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-stone-300 mb-1">
              Difuminado Bordes ({block.edgeFadePercent || 0}%)
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={block.edgeFadePercent || 0}
              onChange={(e) =>
                onUpdateBlock({ edgeFadePercent: Number(e.target.value) || 0 })
              }
              className="w-full accent-amber-400"
            />
          </div>
          <div>
            <label className="block text-[10px] text-stone-300 mb-1">
              Escala ({Math.round((block.scale || 1) * 100)}%)
            </label>
            <input
              type="range"
              min={0.6}
              max={1.4}
              step={0.05}
              value={block.scale || 1}
              onChange={(e) =>
                onUpdateBlock({ scale: parseFloat(e.target.value) })
              }
              className="w-full accent-amber-400"
            />
          </div>
        </div>

        {/* Opacity & Frame Opacity */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[10px] text-stone-300 mb-1">
              Opacidad Bloque ({Math.round((block.opacity ?? 1) * 100)}%)
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={block.opacity ?? 1}
              onChange={(e) =>
                onUpdateBlock({ opacity: parseFloat(e.target.value) })
              }
              className="w-full accent-amber-400"
            />
          </div>
          <div>
            <label className="block text-[10px] text-stone-300 mb-1">
              Opacidad Marco/Fondo ({Math.round((block.boxBgOpacity ?? 0.94) * 100)}%)
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={block.boxBgOpacity ?? 0.94}
              onChange={(e) =>
                onUpdateBlock({ boxBgOpacity: parseFloat(e.target.value) })
              }
              className="w-full accent-amber-400"
            />
          </div>
          <div className="flex items-center pt-4">
            <label className="flex items-center gap-2 text-xs text-stone-200 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(block.hideBorder)}
                onChange={(e) => onUpdateBlock({ hideBorder: e.target.checked })}
                className="rounded border-stone-600"
              />
              <span>Ocultar Borde</span>
            </label>
          </div>
        </div>

        {/* Colors & Border */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className="block text-[9px] text-stone-400 mb-1">Fondo</label>
            <input
              type="color"
              value={block.bgColor || '#171a26'}
              onChange={(e) => onUpdateBlock({ bgColor: e.target.value })}
              className="w-full h-8 rounded bg-stone-950 border border-stone-700 cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-[9px] text-stone-400 mb-1">Borde</label>
            <input
              type="color"
              value={block.borderColor || '#c8a45c'}
              onChange={(e) => onUpdateBlock({ borderColor: e.target.value })}
              className="w-full h-8 rounded bg-stone-950 border border-stone-700 cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-[9px] text-stone-400 mb-1">Color Título</label>
            <input
              type="color"
              value={block.titleColor || '#f5e4be'}
              onChange={(e) => onUpdateBlock({ titleColor: e.target.value })}
              className="w-full h-8 rounded bg-stone-950 border border-stone-700 cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-[9px] text-stone-400 mb-1">
              Grosor Borde ({block.borderWidthPx ?? 2}px)
            </label>
            <input
              type="number"
              min={0}
              max={12}
              value={block.borderWidthPx ?? 2}
              onChange={(e) =>
                onUpdateBlock({ borderWidthPx: Number(e.target.value) || 0 })
              }
              className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-white font-mono"
            />
          </div>
        </div>

        {/* Custom PNG for Block */}
        <ImageSourcePicker
          label="Imagen PNG / Textura del Bloque"
          value={block.bgImageUrl || ''}
          onChange={(url) => onUpdateBlock({ bgImageUrl: url })}
        />
      </div>
    );
  };

  // ==========================================================================
  // RENDER INTERACTIVE BLOCK CONTAINER WITH DRAG HEADER & 3 RESIZE HANDLES
  // ==========================================================================
  const renderInteractiveBlockContainer = <TId extends string>(params: {
    block: SpatialBlockConfig<TId>;
    isSelected: boolean;
    zoom: number;
    onSelectBlock: () => void;
    onUpdateBlock: (patch: Partial<SpatialBlockConfig<TId>>) => void;
    children: React.ReactNode;
  }) => {
    const {
      block,
      isSelected,
      zoom,
      onSelectBlock,
      onUpdateBlock,
      children,
    } = params;

    if (!block.visible || block.hidden) {
      return (
        <div
          key={block.id}
          onClick={onSelectBlock}
          className="p-2.5 rounded-xl border border-dashed border-stone-700/70 bg-stone-950/40 text-xs text-stone-500 flex items-center justify-between cursor-pointer hover:border-amber-500/40"
        >
          <span className="flex items-center gap-2">
            <EyeOff className="w-3.5 h-3.5" /> {block.name} (Bloque Oculto)
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateBlock({ visible: true, hidden: false });
            }}
            className="px-2 py-0.5 rounded bg-stone-800 text-amber-300 text-[10px]"
          >
            Mostrar
          </button>
        </div>
      );
    }

    const blockStyle = buildSpatialBlockInlineStyle(block, false);

    return (
      <div
        key={block.id}
        ref={(el) => {
          blockDomRefs.current[block.id] = el;
        }}
        data-testid={`spatial-canvas-block-${block.id}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelectBlock();
        }}
        style={blockStyle}
        className={`relative group/block transition-shadow ${
          isSelected
            ? 'ring-2 ring-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.28)] z-20'
            : 'hover:ring-1 hover:ring-amber-500/40'
        }`}
      >
        <GeometricSvgBorder
          shape={block.shape}
          borderColor={block.borderColor}
          borderWidthPx={block.borderWidthPx}
          hideBorder={block.hideBorder}
        />

        {/* Floating Drag Header Bar (just like LobbyPageBuilderCanvas) */}
        <div
          onMouseDown={(e) =>
            startSpatialBlockDrag(e, block, zoom, onSelectBlock, onUpdateBlock)
          }
          className={`flex items-center justify-between gap-2 px-2.5 py-1 mb-2 rounded-lg cursor-move select-none text-[10px] border ${
            isSelected
              ? 'bg-amber-950/90 border-amber-400/70 text-amber-100'
              : 'bg-stone-950/80 border-stone-700/70 text-stone-300 opacity-85 group-hover/block:opacity-100'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <Move className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="font-cinzel font-bold truncate">
              {block.titleText || block.name}
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[9px] shrink-0">
            <span>
              ({block.x || 0},{block.y || 0})
            </span>
            <span>
              {block.widthPx > 0 ? `${block.widthPx}px` : 'Auto'}×
              {block.heightPx > 0 ? `${block.heightPx}px` : 'Auto'}
            </span>
            <span>Marco {Math.round((block.boxBgOpacity ?? 0.94) * 100)}%</span>
            {(block.x !== 0 ||
              block.y !== 0 ||
              block.widthPx > 0 ||
              block.heightPx > 0) && (
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateBlock({
                    x: 0,
                    y: 0,
                    offsetX: 0,
                    offsetY: 0,
                    widthPx: 0,
                    heightPx: 0,
                  });
                }}
                className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-200"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Inner Content */}
        <div className="relative z-10">{children}</div>

        {/* East, South, South-East Resize Handles */}
        <div
          onMouseDown={(e) =>
            startSpatialBlockResize(
              e,
              block,
              'e',
              zoom,
              onSelectBlock,
              onUpdateBlock
            )
          }
          className="absolute top-1/2 -right-2 -translate-y-1/2 w-3 h-10 rounded-full bg-amber-400/90 hover:bg-amber-300 border border-stone-950 cursor-ew-resize z-30 shadow"
          title="Estirar ancho del bloque (↔)"
        />
        <div
          onMouseDown={(e) =>
            startSpatialBlockResize(
              e,
              block,
              's',
              zoom,
              onSelectBlock,
              onUpdateBlock
            )
          }
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-3 rounded-full bg-amber-400/90 hover:bg-amber-300 border border-stone-950 cursor-ns-resize z-30 shadow"
          title="Estirar alto del bloque (↕)"
        />
        <div
          onMouseDown={(e) =>
            startSpatialBlockResize(
              e,
              block,
              'se',
              zoom,
              onSelectBlock,
              onUpdateBlock
            )
          }
          className="absolute -bottom-2 -right-2 w-4 h-4 rounded bg-amber-300 hover:bg-amber-200 border border-stone-950 cursor-nwse-resize z-30 shadow"
          title="Redimensionar esquina del bloque (↘)"
        />
      </div>
    );
  };

  // Reusable toolbar to select sample players count (1 to 8)
  const renderSamplePlayersToolbar = (accentColor = 'amber') => (
    <div
      data-testid="sample-players-toolbar"
      className="flex flex-wrap items-center gap-2 px-2.5 py-1.5 rounded-xl bg-stone-950/90 border border-stone-800 text-xs shadow-inner"
    >
      <div className="flex items-center gap-1.5 text-stone-300 font-cinzel font-bold text-[11px]">
        <Users className="w-3.5 h-3.5 text-amber-400" />
        <span>Jugadores en Sala:</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          data-testid="btn-decrease-sample-players"
          onClick={() => setSamplePlayersCount((n) => Math.max(1, n - 1))}
          className="w-6 h-6 rounded flex items-center justify-center bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs cursor-pointer"
          title="Quitar jugador de ejemplo"
        >
          -
        </button>
        <span
          data-testid="sample-players-count-badge"
          className="px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-200 font-mono font-bold text-xs"
        >
          {samplePlayersCount} {samplePlayersCount === 1 ? 'jugador' : 'jugadores'} (Máx 8)
        </span>
        <button
          type="button"
          data-testid="btn-increase-sample-players"
          onClick={() => setSamplePlayersCount((n) => Math.min(8, n + 1))}
          className="w-6 h-6 rounded flex items-center justify-center bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs cursor-pointer"
          title="Añadir jugador de ejemplo (hasta 8)"
        >
          +
        </button>
      </div>
      <div className="hidden sm:flex items-center gap-1 ml-1">
        {[1, 2, 4, 6, 8].map((qty) => (
          <button
            key={qty}
            type="button"
            data-testid={`btn-preset-players-${qty}`}
            onClick={() => setSamplePlayersCount(qty)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition ${
              samplePlayersCount === qty
                ? 'bg-amber-500 text-stone-950 font-black shadow'
                : 'bg-stone-900 text-stone-400 hover:text-stone-200'
            }`}
          >
            {qty}P
          </button>
        ))}
      </div>
    </div>
  );

  // ==========================================================================
  // SHARED TAROT & TACTICAL TOKEN HELPERS (Used in Apartado 1, 2, and 4)
  // ==========================================================================
  const commitTarotConfig = (next: TarotCardExclusiveStudioConfig) => {
    onUpdateTokens({ tarotStudioConfig: next });
  };

  const handlePatchTarotModule = (
    moduleId: string,
    patch: Partial<TarotCardModuleItem>
  ) => {
    const next = updateTarotModule(tarotConfig, moduleId, patch);
    commitTarotConfig(next);
  };

  const handleDuplicateTarotModule = (
    moduleId: string,
    targetSide?: TarotStudioSurfaceSide
  ) => {
    const { config: nextCfg, createdModuleId } = duplicateTarotModule(
      tarotConfig,
      moduleId,
      targetSide
    );
    commitTarotConfig(nextCfg);
    setSelectedTarotModuleId(createdModuleId);
    setTarotInspectTarget('module');
  };

  const handleAddCustomTarotModule = (
    side: TarotStudioSurfaceSide,
    kind: TarotCardModuleKind
  ) => {
    const { config: nextCfg, createdModuleId } = addCustomTarotModule(
      tarotConfig,
      side,
      kind
    );
    commitTarotConfig(nextCfg);
    setSelectedTarotModuleId(createdModuleId);
    setTarotInspectTarget('module');
  };

  const handleDeleteTarotModule = (moduleId: string) => {
    const allModules = tarotConfig.modules || [];
    if (allModules.length <= 1) return;
    const nextCfg = removeTarotModule(tarotConfig, moduleId);
    commitTarotConfig(nextCfg);
    if (selectedTarotModuleId === moduleId && nextCfg.modules?.[0]) {
      setSelectedTarotModuleId(nextCfg.modules[0].id);
    }
  };

  const startCardFrameResize = (
    e: React.MouseEvent,
    edge: 'e' | 's' | 'se'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const startW = tarotConfig.cardWidthPx || 290;
    const startH = tarotConfig.cardHeightPx || 450;
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startMouseX;
      const dy = ev.clientY - startMouseY;
      const nextW =
        edge === 'e' || edge === 'se'
          ? Math.max(200, Math.min(520, Math.round(startW + dx)))
          : startW;
      const nextH =
        edge === 's' || edge === 'se'
          ? Math.max(260, Math.min(720, Math.round(startH + dy)))
          : startH;
      commitTarotConfig({
        ...tarotConfig,
        cardWidthPx: nextW,
        cardHeightPx: nextH,
      });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startTarotModuleDrag = (
    e: React.MouseEvent,
    mod: TarotCardModuleItem
  ) => {
    e.stopPropagation();
    setSelectedTarotModuleId(mod.id);
    setTarotInspectTarget('module');
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startX = mod.x || 0;
    const startY = mod.y || 0;

    const onMove = (ev: MouseEvent) => {
      const dx = Math.round(ev.clientX - startMouseX);
      const dy = Math.round(ev.clientY - startMouseY);

      // Allow dragging modules directly between Anverso ('front'), Dorso ('back'), and Ficha de Jugador ('token')!
      const frontRect = tarotFrontRef.current?.getBoundingClientRect();
      const backRect = tarotBackRef.current?.getBoundingClientRect();
      const tokenRect = tarotTokenRef.current?.getBoundingClientRect();
      let targetSide: TarotStudioSurfaceSide = mod.side;
      let nextX = startX + dx;
      let nextY = startY + dy;

      if (
        tokenRect &&
        ev.clientX >= tokenRect.left &&
        ev.clientX <= tokenRect.right &&
        ev.clientY >= tokenRect.top &&
        ev.clientY <= tokenRect.bottom
      ) {
        targetSide = 'token';
        if (mod.side !== 'token') {
          nextX = Math.max(4, Math.round(ev.clientX - tokenRect.left - (mod.widthPx || 60) / 2));
          nextY = Math.max(4, Math.round(ev.clientY - tokenRect.top - (mod.heightPx || 24) / 2));
        }
      } else if (
        backRect &&
        ev.clientX >= backRect.left &&
        ev.clientX <= backRect.right &&
        ev.clientY >= backRect.top &&
        ev.clientY <= backRect.bottom
      ) {
        targetSide = 'back';
        if (mod.side !== 'back') {
          nextX = Math.round(ev.clientX - backRect.left - (mod.widthPx || 60) / 2);
          nextY = Math.round(ev.clientY - backRect.top - (mod.heightPx || 24) / 2);
        }
      } else if (
        frontRect &&
        ev.clientX >= frontRect.left &&
        ev.clientX <= frontRect.right &&
        ev.clientY >= frontRect.top &&
        ev.clientY <= frontRect.bottom
      ) {
        targetSide = 'front';
        if (mod.side !== 'front') {
          nextX = Math.round(ev.clientX - frontRect.left - (mod.widthPx || 60) / 2);
          nextY = Math.round(ev.clientY - frontRect.top - (mod.heightPx || 24) / 2);
        }
      }

      handlePatchTarotModule(mod.id, {
        x: nextX,
        y: nextY,
        side: targetSide,
      });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startTarotModuleResize = (
    e: React.MouseEvent,
    mod: TarotCardModuleItem,
    edge: 'e' | 's' | 'se'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedTarotModuleId(mod.id);
    setTarotInspectTarget('module');
    const domEl = tarotModRefs.current[mod.id];
    const rect = domEl?.getBoundingClientRect();
    const startW = mod.widthPx > 0 ? mod.widthPx : Math.round(rect?.width || 80);
    const startH = mod.heightPx > 0 ? mod.heightPx : Math.round(rect?.height || 32);
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startMouseX;
      const dy = ev.clientY - startMouseY;
      const patch: Partial<TarotCardModuleItem> = {};
      if (edge === 'e' || edge === 'se') {
        patch.widthPx = Math.max(24, Math.round(startW + dx));
      }
      if (edge === 's' || edge === 'se') {
        patch.heightPx = Math.max(18, Math.round(startH + dy));
      }
      handlePatchTarotModule(mod.id, patch);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const renderTarotModuleOnCanvas = (mod: TarotCardModuleItem) => {
    if (!mod.visible || mod.opacity <= 0.01) return null;
    const isSelected =
      tarotInspectTarget === 'module' && selectedTarotModuleId === mod.id;

    const modGeoStyle = buildGeometricElementStyle({
      shape: mod.shape || 'rounded',
      edgeFadePercent: mod.edgeFadePercent || 0,
      hideBorder: mod.hideBorder,
      borderRadiusPx: mod.borderRadiusPx ?? 8,
      bgColor: applyColorWithOpacity(
        mod.bgColor || '#11141d',
        mod.boxBgOpacity ?? 0.92
      ),
      borderColor: mod.borderColor || '#c8a45c',
      borderWidthPx: mod.borderWidthPx ?? 1,
      customPngUrl: mod.bgImageUrl,
      opacity: mod.opacity ?? 1,
    });

    const renderModuleInnerVisual = () => {
      if (mod.kind === 'hp_bar') {
        const dir = mod.fillDirection || 'left_to_right';
        const isVertical =
          dir === 'bottom_to_top' || dir === 'top_to_bottom';
        return (
          <div
            style={{ backgroundColor: mod.emptyBgColor || '#0e1118' }}
            className="relative w-full h-full flex items-center justify-center overflow-hidden rounded"
          >
            <div
              style={{
                backgroundColor: mod.fillColor || '#22b573',
                backgroundImage: mod.fillTexturePngUrl
                  ? `url(${mod.fillTexturePngUrl})`
                  : undefined,
                backgroundSize: 'cover',
                width: isVertical ? '100%' : '82%',
                height: isVertical ? '82%' : '100%',
                left: dir === 'right_to_left' ? 'auto' : 0,
                right: dir === 'right_to_left' ? 0 : 'auto',
                bottom: dir === 'bottom_to_top' ? 0 : 'auto',
                top: dir === 'top_to_bottom' ? 0 : 'auto',
              }}
              className="absolute transition-all"
            />
            {mod.frameOverlayPngUrl && (
              <img
                src={mod.frameOverlayPngUrl}
                alt=""
                className="pointer-events-none absolute inset-0 w-full h-full object-fill z-10"
              />
            )}
            <div className="relative z-20 flex items-center gap-1.5 px-2">
              {mod.customIconUrl && (
                <img
                  src={mod.customIconUrl}
                  alt=""
                  className="w-3.5 h-3.5 object-contain"
                />
              )}
              {mod.label !== '' && (
                <span className="font-bold">{mod.label}</span>
              )}
              {mod.showNumericText !== false && (
                <span className="font-mono font-black">
                  {mod.exampleValue || '44 / 44'}
                </span>
              )}
            </div>
          </div>
        );
      }

      if (mod.kind === 'portrait') {
        const portraitSrc =
          mod.bgImageUrl ||
          mod.customIconUrl ||
          resolvedCharacter?.avatarCustomUrl ||
          resolvedCharacter?.avatarUrl ||
          '';
        return (
          <div className="w-full h-full flex flex-col items-center justify-center text-center relative overflow-hidden">
            {portraitSrc ? (
              <img
                src={portraitSrc}
                alt=""
                className="w-full h-full object-cover pointer-events-none"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-amber-950/60 via-stone-900 to-stone-950 flex flex-col items-center justify-center p-1">
                <span className="text-lg font-cinzel font-black text-amber-300 leading-none">
                  {(resolvedCharacter?.name || 'V').charAt(0)}
                </span>
                <span className="text-[9px] font-cinzel font-bold text-amber-200 mt-0.5">
                  {mod.side === 'token' ? 'Ficha' : 'Retrato'}
                </span>
                <span className="text-[8px] text-stone-400">
                  {mod.shape}
                </span>
              </div>
            )}
          </div>
        );
      }

      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center px-1">
          <div className="flex items-center justify-center gap-1">
            {mod.customIconUrl && (
              <img
                src={mod.customIconUrl}
                alt=""
                className="w-3.5 h-3.5 object-contain shrink-0"
              />
            )}
            {mod.label !== '' && (
              <span
                style={{
                  color: mod.labelColor || '#e5c478',
                  fontSize: mod.labelFontSizePx
                    ? `${mod.labelFontSizePx}px`
                    : '9px',
                }}
                className="font-bold uppercase leading-none"
              >
                {mod.label}
              </span>
            )}
          </div>
          {mod.exampleValue && (
            <span
              style={{
                color: mod.textColor || '#ffffff',
                fontSize: `${mod.fontSizePx || 12}px`,
              }}
              className="font-black leading-tight truncate max-w-full"
            >
              {mod.exampleValue}
            </span>
          )}
        </div>
      );
    };

    return (
      <div
        key={mod.id}
        ref={(el) => {
          tarotModRefs.current[mod.id] = el;
        }}
        data-testid={`tarot-module-${mod.id}`}
        onMouseDown={(e) => startTarotModuleDrag(e, mod)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedTarotModuleId(mod.id);
          setTarotInspectTarget('module');
        }}
        style={{
          ...modGeoStyle,
          position: 'absolute',
          left: `${mod.x}px`,
          top: `${mod.y}px`,
          width: `${mod.widthPx || 80}px`,
          height: `${mod.heightPx || 32}px`,
          zIndex: isSelected ? 50 : mod.zIndex || 10,
          fontFamily: mod.fontFamily || tarotConfig.fontFamily || "'Cinzel', serif",
        }}
        className={`cursor-move select-none transition-shadow ${
          isSelected
            ? 'ring-2 ring-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.5)]'
            : 'hover:ring-1 hover:ring-amber-400/70'
        }`}
      >
        <GeometricSvgBorder
          shape={mod.shape}
          borderColor={mod.borderColor || '#c8a45c'}
          borderWidthPx={mod.borderWidthPx ?? 1}
          hideBorder={mod.hideBorder}
        />

        {isSelected && (
          <div className="absolute -top-5 left-0 z-50 px-1.5 py-0.5 rounded bg-cyan-950/95 border border-cyan-400 text-[8px] font-mono text-cyan-200 whitespace-nowrap shadow">
            {mod.name} ({mod.x},{mod.y})
          </div>
        )}

        <div className="relative z-10 w-full h-full overflow-hidden">
          {renderModuleInnerVisual()}
        </div>

        {isSelected && (
          <>
            <div
              onMouseDown={(e) => startTarotModuleResize(e, mod, 'e')}
              className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-4 rounded-full bg-cyan-400 border border-stone-950 cursor-ew-resize z-50"
            />
            <div
              onMouseDown={(e) => startTarotModuleResize(e, mod, 's')}
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-2.5 rounded-full bg-cyan-400 border border-stone-950 cursor-ns-resize z-50"
            />
            <div
              onMouseDown={(e) => startTarotModuleResize(e, mod, 'se')}
              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded bg-cyan-300 border border-stone-950 cursor-nwse-resize z-50"
            />
          </>
        )}
      </div>
    );
  };

  // ==========================================================================
  // APARTADO 1: 1:1 PLAYER SHEET INTERACTIVE BUILDER (Style Lobby Sandbox)
  // ==========================================================================
  const renderApartado1SheetBuilder = () => {
    const activeBlock =
      sheetLayout.blocks[selectedSheetBlockId] ||
      sheetLayout.blocks.identity_header;

    const handleUpdateSheetBlock = (
      blockId: PlayerSheetBlockId,
      patch: Partial<SpatialBlockConfig<PlayerSheetBlockId>>
    ) => {
      const nextLayout = updatePlayerSheetBlock(sheetLayout, blockId, patch);
      onUpdateTokens({ playerSheetLayout: nextLayout });
    };

    const handleUpdateSheetInner = (
      blockId: PlayerSheetBlockId,
      innerId: string,
      patch: Partial<SpatialInnerElementConfig>
    ) => {
      const targetBlock = sheetLayout.blocks[blockId];
      if (!targetBlock) return;
      const updatedBlock = updateSpatialBlockInnerButton(
        targetBlock,
        innerId,
        patch
      );
      handleUpdateSheetBlock(blockId, {
        innerButtonsConfig: updatedBlock.innerButtonsConfig,
        innerButtonsOrder: updatedBlock.innerButtonsOrder,
      });
    };

    const renderSheetBlockBody = (
      block: SpatialBlockConfig<PlayerSheetBlockId>
    ) => {
      const order =
        block.innerButtonsOrder || Object.keys(block.innerButtonsConfig || {});
      const isAbilityGrid = block.id === 'ability_scores_grid';
      const isCombatBar = block.id === 'combat_stats_bar';
      const isDecksPanel = block.id === 'game_decks_panel';
      const isIdentity = block.id === 'identity_header';

      // 1. Dedicated Live Table Combatants Bar (1 to 8 players)
      if (block.id === 'live_table_combatants_bar') {
        const visiblePlayers = SAMPLE_ROOM_PLAYERS_5E.slice(0, samplePlayersCount);
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {order.map((innerId) => {
                const inner =
                  block.innerButtonsConfig?.[innerId] || makeInnerEl(innerId, innerId);
                const domKey = `sheet-${block.id}-${innerId}`;
                const isInnerSelected =
                  selectedSheetBlockId === block.id && selectedSheetInnerId === innerId;
                return renderInteractiveInnerElement(
                  inner,
                  domKey,
                  isInnerSelected,
                  sheetZoom,
                  () => {
                    setSelectedSheetBlockId(block.id);
                    setSelectedSheetInnerId(innerId);
                  },
                  (patch) => handleUpdateSheetInner(block.id, innerId, patch)
                );
              })}
            </div>

            <div
              data-testid="live-combatants-preview-strip"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1"
            >
              {visiblePlayers.map((player, pIdx) => (
                <div
                  key={player.id}
                  style={{
                    backgroundColor: '#121622',
                    borderColor: player.color,
                    borderWidth: '1px',
                  }}
                  className="p-2.5 rounded-xl border flex items-center gap-2.5 shadow-md relative overflow-hidden"
                >
                  <div
                    style={buildGeometricElementStyle({
                      shape: tokens.portraitGeometricShape || 'circle',
                      edgeFadePercent: tokens.portraitEdgeFadePercent || 0,
                      bgColor: player.color,
                      borderColor: player.color,
                      borderWidthPx: 2,
                    })}
                    className="w-10 h-10 shrink-0 flex items-center justify-center font-cinzel font-black text-stone-950 text-xs shadow"
                  >
                    {player.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-white truncate">
                        {player.name}
                      </span>
                      {pIdx === 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold text-[8px] uppercase">
                          Tú
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-stone-400 truncate">
                      {player.role} • CA {player.ac}
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-stone-950 overflow-hidden mt-1 border border-stone-800">
                      <div
                        style={{
                          width: `${Math.round((player.hp / player.maxHp) * 100)}%`,
                          backgroundColor:
                            player.hp > player.maxHp * 0.5 ? '#10b981' : '#f59e0b',
                        }}
                        className="h-full rounded-full transition-all"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[8px] font-mono text-stone-400 mt-0.5">
                      <span>{player.hp}/{player.maxHp} PG</span>
                      <span>Inic +{player.initiative}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // 2. Dedicated Sheet Tarot Dock (Previewing Apartado 4 Tarot Card in table)
      if (block.id === 'sheet_tarot_dock') {
        const sideMods =
          sheetDockCardSide === 'front'
            ? (tarotConfig.modules || []).filter((m) => m.side === 'front')
            : (tarotConfig.modules || []).filter((m) => m.side === 'back');
        const bgImg =
          sheetDockCardSide === 'front'
            ? tarotConfig.frontBgImageUrl
            : tarotConfig.backBgImageUrl;
        const bgColor =
          sheetDockCardSide === 'front'
            ? tarotConfig.frontBgColor || '#1a1f2c'
            : tarotConfig.backBgColor || '#120e1c';
        const cardW = tarotConfig.cardWidthPx || 290;
        const cardH = tarotConfig.cardHeightPx || 450;
        const scaleFactor = 0.7;

        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                {order.map((innerId) => {
                  const inner =
                    block.innerButtonsConfig?.[innerId] || makeInnerEl(innerId, innerId);
                  const domKey = `sheet-${block.id}-${innerId}`;
                  const isInnerSelected =
                    selectedSheetBlockId === block.id && selectedSheetInnerId === innerId;
                  return renderInteractiveInnerElement(
                    inner,
                    domKey,
                    isInnerSelected,
                    sheetZoom,
                    () => {
                      setSelectedSheetBlockId(block.id);
                      setSelectedSheetInnerId(innerId);
                    },
                    (patch) => handleUpdateSheetInner(block.id, innerId, patch)
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="btn-flip-sheet-dock-card"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSheetDockCardSide((s) => (s === 'front' ? 'back' : 'front'));
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-bold cursor-pointer transition"
                >
                  <RefreshCw className="w-3 h-3 text-amber-300" />
                  <span>
                    Voltear Carta: Ver {sheetDockCardSide === 'front' ? 'Reverso' : 'Anverso'}
                  </span>
                </button>
                <button
                  type="button"
                  data-testid="btn-go-apartado4-from-dock"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveApartado('apartado_4_tarot');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs cursor-pointer"
                >
                  <span>Editar Carta (Apartado 4)</span>
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </button>
              </div>
            </div>

            <div className="flex justify-center py-2">
              <div
                style={{
                  width: `${Math.round(cardW * scaleFactor)}px`,
                  height: `${Math.round(cardH * scaleFactor)}px`,
                }}
                className="relative overflow-visible"
              >
                <div
                  style={{
                    ...buildGeometricElementStyle({
                      shape: tarotConfig.cardShape || 'rounded',
                      hideBorder: tarotConfig.hideBorder,
                      borderRadiusPx: tarotConfig.borderRadiusPx ?? 18,
                      bgColor: applyColorWithOpacity(
                        bgColor,
                        tarotConfig.frontBoxBgOpacity ?? 0.96
                      ),
                      borderColor: tarotConfig.borderColor || '#c8a45c',
                      borderWidthPx: tarotConfig.borderWidthPx ?? 2,
                      customPngUrl: bgImg,
                    }),
                    width: `${cardW}px`,
                    height: `${cardH}px`,
                    transform: `scale(${scaleFactor})`,
                    transformOrigin: 'top left',
                  }}
                  className="relative shadow-2xl"
                >
                  <GeometricSvgBorder
                    shape={tarotConfig.cardShape || 'rounded'}
                    borderColor={tarotConfig.borderColor || '#c8a45c'}
                    borderWidthPx={tarotConfig.borderWidthPx ?? 2}
                    hideBorder={tarotConfig.hideBorder}
                  />

                  {sideMods.map((m) => renderTarotModuleOnCanvas(m))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div
          className={
            isAbilityGrid
              ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5'
              : isCombatBar
              ? 'grid grid-cols-2 sm:grid-cols-5 gap-2.5'
              : isDecksPanel
              ? 'grid grid-cols-1 sm:grid-cols-3 gap-2.5'
              : 'flex flex-wrap items-center gap-2.5'
          }
        >
          {order.map((innerId) => {
            const inner =
              block.innerButtonsConfig?.[innerId] || makeInnerEl(innerId, innerId);
            const domKey = `sheet-${block.id}-${innerId}`;
            const isInnerSelected =
              selectedSheetBlockId === block.id &&
              selectedSheetInnerId === innerId;

            // Connect Apartado 3 geometric shapes automatically!
            const autoShape: GeometricShapeType | undefined =
              isIdentity && innerId === 'portrait_box'
                ? tokens.portraitGeometricShape || inner.shape || 'rounded'
                : isAbilityGrid || isCombatBar
                ? statBoxConfig.shape || inner.shape || 'rounded'
                : isDecksPanel && innerId.startsWith('card_slot_')
                ? deckTemplate.cardShape || inner.shape || 'rounded'
                : inner.shape;

            const autoFade =
              isIdentity && innerId === 'portrait_box'
                ? tokens.portraitEdgeFadePercent ?? inner.edgeFadePercent
                : isAbilityGrid || isCombatBar
                ? statBoxConfig.edgeFadePercent ?? inner.edgeFadePercent
                : isDecksPanel && innerId.startsWith('card_slot_')
                ? deckTemplate.edgeFadePercent ?? inner.edgeFadePercent
                : inner.edgeFadePercent;

            // For Ability Scores Grid, render the modular internal stat parts inside each stat box!
            const customStatBoxContent = isAbilityGrid ? (
              <div className="space-y-1 text-center py-1">
                <div className="text-[10px] font-cinzel font-bold text-amber-300 uppercase">
                  {inner.label || innerId}
                </div>
                <div className="text-base font-cinzel font-black text-white">
                  {inner.exampleValue || '+4 (18)'}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1 text-[8px] text-stone-300 opacity-85">
                  <span className="px-1 rounded bg-black/40">Base 14</span>
                  <span className="px-1 rounded bg-emerald-950/60 text-emerald-300">
                    Obj +4
                  </span>
                  <span className="px-1 rounded bg-purple-950/60 text-purple-200">
                    Salv +7
                  </span>
                </div>
              </div>
            ) : undefined;

            return renderInteractiveInnerElement(
              inner,
              domKey,
              isInnerSelected,
              sheetZoom,
              () => {
                setSelectedSheetBlockId(block.id);
                setSelectedSheetInnerId(innerId);
              },
              (patch) => handleUpdateSheetInner(block.id, innerId, patch),
              autoShape,
              autoFade,
              customStatBoxContent
            );
          })}
        </div>
      );
    };

    return (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Tree of 8 Sheet Blocks + Expandable Inner Elements */}
        <div className="xl:col-span-3 space-y-2.5 bg-stone-900/90 border border-stone-800 rounded-2xl p-3 max-h-[780px] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <span className="text-xs font-cinzel font-bold text-amber-300 uppercase">
              Secciones y Botones (Hoja 1:1)
            </span>
            <span className="text-[10px] font-mono text-stone-400">
              {sheetLayout.blocksOrder.length} Bloques
            </span>
          </div>

          {sheetLayout.blocksOrder.map((blockId, idx) => {
            const blk = sheetLayout.blocks[blockId];
            if (!blk) return null;
            const isSelected =
              selectedSheetBlockId === blockId && !selectedSheetInnerId;
            const isExpanded = Boolean(expandedSheetBlocks[blockId]);
            const innerOrder =
              blk.innerButtonsOrder || Object.keys(blk.innerButtonsConfig || {});

            return (
              <div
                key={blockId}
                className={`rounded-xl border transition ${
                  selectedSheetBlockId === blockId
                    ? 'border-amber-500/60 bg-stone-950/90'
                    : 'border-stone-800 bg-stone-950/50'
                }`}
              >
                <div
                  onClick={() => {
                    setSelectedSheetBlockId(blockId);
                    setSelectedSheetInnerId(null);
                  }}
                  className={`flex items-center justify-between gap-1.5 p-2 cursor-pointer rounded-t-xl ${
                    isSelected ? 'bg-amber-500/15' : 'hover:bg-stone-900'
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedSheetBlocks((prev) => ({
                        ...prev,
                        [blockId]: !prev[blockId],
                      }));
                    }}
                    className="p-0.5 text-stone-400 hover:text-amber-300"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-stone-100 truncate">
                      {idx + 1}. {blk.name}
                    </div>
                    <div className="text-[9px] text-stone-400 font-mono">
                      {innerOrder.length} elementos internos
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = movePlayerSheetBlockOrder(
                          sheetLayout,
                          blockId,
                          'up'
                        );
                        onUpdateTokens({ playerSheetLayout: next });
                      }}
                      className="p-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-400"
                      title="Subir bloque"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = movePlayerSheetBlockOrder(
                          sheetLayout,
                          blockId,
                          'down'
                        );
                        onUpdateTokens({ playerSheetLayout: next });
                      }}
                      className="p-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-400"
                      title="Bajar bloque"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateSheetBlock(blockId, {
                          visible: !blk.visible,
                          hidden: blk.visible,
                        });
                      }}
                      className={`p-1 rounded ${
                        blk.visible
                          ? 'text-emerald-400 bg-emerald-950/40'
                          : 'text-stone-500 bg-stone-900'
                      }`}
                    >
                      {blk.visible ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expandable Inner Buttons / Elements */}
                {isExpanded && (
                  <div className="px-2 pb-2 pt-1 border-t border-stone-800/80 space-y-1">
                    {innerOrder.map((inId) => {
                      const inCfg =
                        blk.innerButtonsConfig?.[inId] || makeInnerEl(inId, inId);
                      const isInSelected =
                        selectedSheetBlockId === blockId &&
                        selectedSheetInnerId === inId;
                      return (
                        <div
                          key={inId}
                          onClick={() => {
                            setSelectedSheetBlockId(blockId);
                            setSelectedSheetInnerId(inId);
                          }}
                          className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg text-[10px] cursor-pointer ${
                            isInSelected
                              ? 'bg-cyan-950/80 border border-cyan-400/60 text-cyan-200 font-bold'
                              : 'bg-stone-900/70 hover:bg-stone-800/80 text-stone-300'
                          }`}
                        >
                          <span className="truncate">
                            • {inCfg.label || inCfg.id}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const reordered = moveSpatialBlockInnerButtonOrder(
                                  blk,
                                  inId,
                                  'up'
                                );
                                handleUpdateSheetBlock(blockId, {
                                  innerButtonsOrder: reordered.innerButtonsOrder,
                                });
                              }}
                              className="p-0.5 hover:text-amber-300"
                            >
                              <ArrowUp className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const reordered = moveSpatialBlockInnerButtonOrder(
                                  blk,
                                  inId,
                                  'down'
                                );
                                handleUpdateSheetBlock(blockId, {
                                  innerButtonsOrder: reordered.innerButtonsOrder,
                                });
                              }}
                              className="p-0.5 hover:text-amber-300"
                            >
                              <ArrowDown className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateSheetInner(blockId, inId, {
                                  visible: inCfg.visible === false,
                                });
                              }}
                              className={
                                inCfg.visible === false
                                  ? 'text-stone-600'
                                  : 'text-emerald-400'
                              }
                            >
                              {inCfg.visible === false ? (
                                <EyeOff className="w-2.5 h-2.5" />
                              ) : (
                                <Eye className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CENTER COLUMN: Deep Property Inspector */}
        <div className="xl:col-span-4 space-y-3">
          {renderBlockOrInnerInspector({
            block: activeBlock,
            selectedInnerId: selectedSheetInnerId,
            onClearInnerSelection: () => setSelectedSheetInnerId(null),
            onUpdateBlock: (patch) =>
              handleUpdateSheetBlock(activeBlock.id, patch),
            onUpdateInner: (innerId, patch) =>
              handleUpdateSheetInner(activeBlock.id, innerId, patch),
          })}
        </div>

        {/* RIGHT COLUMN: 1:1 Interactive Sandbox Canvas of the Player Sheet */}
        <div className="xl:col-span-5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-stone-900/90 border border-amber-500/30 text-xs">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span className="font-cinzel font-bold text-amber-200">
                Lienzo Sandbox 1:1: Hoja y Sala
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="btn-open-fullscreen-sheet"
                onClick={() => setFullScreenCanvasMode('sheet')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[11px] shadow cursor-pointer transition"
                title="Abrir lienzo en pantalla completa 1:1 para evitar apreturas"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Vista Completa 1:1</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setSheetZoom((z) => Math.max(0.55, Number((z - 0.1).toFixed(2))))
                }
                className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-amber-300 px-1">
                {Math.round(sheetZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() =>
                  setSheetZoom((z) => Math.min(1.05, Number((z + 0.1).toFixed(2))))
                }
                className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {renderSamplePlayersToolbar('amber')}

          <div
            onClick={() => setSelectedSheetInnerId(null)}
            style={{
              backgroundColor: tokens.sheetBgColor || '#0d1018',
              backgroundImage: tokens.sheetBgTextureUrl
                ? `url(${tokens.sheetBgTextureUrl})`
                : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            className="rounded-2xl border-2 border-stone-800 p-4 overflow-auto max-h-[740px] shadow-2xl"
          >
            <div
              style={{
                transform: `scale(${sheetZoom})`,
                transformOrigin: 'top left',
                width: `${Math.round(100 / sheetZoom)}%`,
              }}
              className="space-y-3 pb-10"
            >
              {sheetLayout.blocksOrder.map((blockId) => {
                const blk = sheetLayout.blocks[blockId];
                if (!blk) return null;
                return renderInteractiveBlockContainer({
                  block: blk,
                  isSelected:
                    selectedSheetBlockId === blockId && !selectedSheetInnerId,
                  zoom: sheetZoom,
                  onSelectBlock: () => {
                    setSelectedSheetBlockId(blockId);
                    setSelectedSheetInnerId(null);
                  },
                  onUpdateBlock: (patch) =>
                    handleUpdateSheetBlock(blockId, patch),
                  children: renderSheetBlockBody(blk),
                });
              })}
            </div>
          </div>
        </div>

        {/* Full-Screen Spacious 1:1 Player Sheet Modal */}
        {fullScreenCanvasMode === 'sheet' && (
          <div
            data-testid="modal-fullscreen-sheet"
            className="fixed inset-0 z-50 bg-[#0c0e15]/98 backdrop-blur-md flex flex-col overflow-hidden text-white"
          >
            {/* Top Floating Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-stone-800 bg-stone-950/90 shadow-xl shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-cinzel font-black text-sm tracking-wide text-amber-300 flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-amber-400" />
                  Vista Real 1:1 en Pantalla Completa: Hoja de Personaje
                </span>
                <span className="text-xs text-stone-400 hidden lg:inline">
                  Arrastra y mueve bloques libremente sin apreturas. Haz clic en cualquier elemento para seleccionarlo.
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {renderSamplePlayersToolbar('amber')}

                {/* Quick Action: Minimize & Edit Selected Element in Center Inspector */}
                <button
                  type="button"
                  data-testid="btn-minimize-fullscreen-edit"
                  onClick={() => setFullScreenCanvasMode('none')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer transition"
                  title="Minimizar lienzo y abrir inspector para este elemento"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>
                    {selectedSheetInnerId
                      ? `Minimizar y Editar "${activeBlock.innerButtonsConfig?.[selectedSheetInnerId]?.label || selectedSheetInnerId}"`
                      : `Minimizar y Editar "${activeBlock.name}"`}
                  </span>
                </button>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-stone-900 border border-stone-700 px-2 py-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() =>
                      setSheetZoom((z) => Math.max(0.55, Number((z - 0.1).toFixed(2))))
                    }
                    className="p-1 hover:text-amber-300 cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono text-amber-300 w-12 text-center">
                    {Math.round(sheetZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSheetZoom((z) => Math.min(1.2, Number((z + 0.1).toFixed(2))))
                    }
                    className="p-1 hover:text-amber-300 cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  data-testid="btn-close-fullscreen-sheet"
                  onClick={() => setFullScreenCanvasMode('none')}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-xs font-bold cursor-pointer"
                >
                  ✕ Cerrar Vista
                </button>
              </div>
            </div>

            {/* Spacious 1:1 Canvas Container */}
            <div
              onClick={() => setSelectedSheetInnerId(null)}
              className="flex-1 overflow-auto p-6 flex justify-center bg-[#07090e]"
            >
              <div
                style={{
                  backgroundColor: tokens.sheetBgColor || '#0d1018',
                  backgroundImage: tokens.sheetBgTextureUrl
                    ? `url(${tokens.sheetBgTextureUrl})`
                    : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  transform: `scale(${sheetZoom})`,
                  transformOrigin: 'top center',
                  width: `${Math.round(100 / sheetZoom)}%`,
                  maxWidth: '1440px',
                }}
                className="rounded-2xl border-2 border-stone-800 p-6 shadow-2xl space-y-4 min-h-[900px]"
              >
                {sheetLayout.blocksOrder.map((blockId) => {
                  const blk = sheetLayout.blocks[blockId];
                  if (!blk) return null;
                  return renderInteractiveBlockContainer({
                    block: blk,
                    isSelected:
                      selectedSheetBlockId === blockId && !selectedSheetInnerId,
                    zoom: sheetZoom,
                    onSelectBlock: () => {
                      setSelectedSheetBlockId(blockId);
                      setSelectedSheetInnerId(null);
                    },
                    onUpdateBlock: (patch) =>
                      handleUpdateSheetBlock(blockId, patch),
                    children: renderSheetBlockBody(blk),
                  });
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================================================
  // APARTADO 2: 1:1 PLAYER MAP MODE INTERACTIVE BUILDER (Style Lobby Sandbox)
  // ==========================================================================
  const renderApartado2MapBuilder = () => {
    const activeBlock =
      mapLayout.blocks[selectedMapBlockId] || mapLayout.blocks.map_top_bar;

    const handleUpdateMapBlock = (
      blockId: PlayerMapBlockId,
      patch: Partial<SpatialBlockConfig<PlayerMapBlockId>>
    ) => {
      const nextLayout = updatePlayerMapBlock(mapLayout, blockId, patch);
      onUpdateTokens({ playerMapLayout: nextLayout });
    };

    const handleUpdateMapInner = (
      blockId: PlayerMapBlockId,
      innerId: string,
      patch: Partial<SpatialInnerElementConfig>
    ) => {
      const targetBlock = mapLayout.blocks[blockId];
      if (!targetBlock) return;
      const updatedBlock = updateSpatialBlockInnerButton(
        targetBlock,
        innerId,
        patch
      );
      handleUpdateMapBlock(blockId, {
        innerButtonsConfig: updatedBlock.innerButtonsConfig,
        innerButtonsOrder: updatedBlock.innerButtonsOrder,
      });
    };

    const renderMapBlockBody = (block: SpatialBlockConfig<PlayerMapBlockId>) => {
      const order =
        block.innerButtonsOrder || Object.keys(block.innerButtonsConfig || {});

      // Dedicated Map Mini Tarot Dock (displaying 1 to 8 mini cards for players in the room)
      if (block.id === 'map_mini_tarot_dock') {
        const visiblePlayers = SAMPLE_ROOM_PLAYERS_5E.slice(0, samplePlayersCount);
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                {order.map((innerId) => {
                  const inner =
                    block.innerButtonsConfig?.[innerId] || makeInnerEl(innerId, innerId);
                  const domKey = `map-${block.id}-${innerId}`;
                  const isInnerSelected =
                    selectedMapBlockId === block.id && selectedMapInnerId === innerId;
                  return renderInteractiveInnerElement(
                    inner,
                    domKey,
                    isInnerSelected,
                    mapZoom,
                    () => {
                      setSelectedMapBlockId(block.id);
                      setSelectedMapInnerId(innerId);
                    },
                    (patch) => handleUpdateMapInner(block.id, innerId, patch)
                  );
                })}
              </div>
              <span className="text-[10px] text-stone-400 font-mono">
                {samplePlayersCount} Mini Cartas en Dock Inferior
              </span>
            </div>

            <div
              data-testid="map-mini-tarot-dock-preview"
              className="flex flex-wrap items-center gap-2.5 pt-1"
            >
              {visiblePlayers.map((player, pIdx) => (
                <div
                  key={player.id}
                  style={{
                    backgroundColor: '#121520',
                    borderColor: player.color,
                    borderWidth: '1.5px',
                  }}
                  className="p-2 rounded-xl border flex items-center gap-2 shadow-lg min-w-[140px] max-w-[200px]"
                >
                  <div
                    style={buildGeometricElementStyle({
                      shape: tokens.portraitGeometricShape || 'circle',
                      bgColor: player.color,
                      borderColor: '#c8a45c',
                      borderWidthPx: 1,
                    })}
                    className="w-8 h-8 shrink-0 flex items-center justify-center font-cinzel font-black text-stone-950 text-[10px]"
                  >
                    {player.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-white truncate flex items-center justify-between">
                      <span className="truncate">{player.name}</span>
                      {pIdx === 0 && (
                        <span className="text-[7px] text-amber-300 font-bold uppercase ml-1">
                          Tú
                        </span>
                      )}
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-stone-950 overflow-hidden my-0.5 border border-stone-800">
                      <div
                        style={{
                          width: `${Math.round((player.hp / player.maxHp) * 100)}%`,
                          backgroundColor:
                            player.hp > player.maxHp * 0.5 ? '#10b981' : '#f59e0b',
                        }}
                        className="h-full rounded-full"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[8px] font-mono text-stone-400">
                      <span>{player.hp}/{player.maxHp} PG</span>
                      <span>CA {player.ac}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      return (
        <div className="flex flex-wrap items-center gap-2.5">
          {order.map((innerId) => {
            const inner =
              block.innerButtonsConfig?.[innerId] || makeInnerEl(innerId, innerId);
            const domKey = `map-${block.id}-${innerId}`;
            const isInnerSelected =
              selectedMapBlockId === block.id && selectedMapInnerId === innerId;

            return renderInteractiveInnerElement(
              inner,
              domKey,
              isInnerSelected,
              mapZoom,
              () => {
                setSelectedMapBlockId(block.id);
                setSelectedMapInnerId(innerId);
              },
              (patch) => handleUpdateMapInner(block.id, innerId, patch)
            );
          })}
        </div>
      );
    };

    return (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: 8 Map Mode Blocks + Inner Buttons */}
        <div className="xl:col-span-3 space-y-2.5 bg-stone-900/90 border border-stone-800 rounded-2xl p-3 max-h-[780px] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <span className="text-xs font-cinzel font-bold text-emerald-300 uppercase">
              Secciones y Botones (Mapa 1:1)
            </span>
            <span className="text-[10px] font-mono text-stone-400">
              {mapLayout.blocksOrder.length} Bloques
            </span>
          </div>

          {mapLayout.blocksOrder.map((blockId, idx) => {
            const blk = mapLayout.blocks[blockId];
            if (!blk) return null;
            const isSelected =
              selectedMapBlockId === blockId && !selectedMapInnerId;
            const isExpanded = Boolean(expandedMapBlocks[blockId]);
            const innerOrder =
              blk.innerButtonsOrder || Object.keys(blk.innerButtonsConfig || {});

            return (
              <div
                key={blockId}
                className={`rounded-xl border transition ${
                  selectedMapBlockId === blockId
                    ? 'border-emerald-500/60 bg-stone-950/90'
                    : 'border-stone-800 bg-stone-950/50'
                }`}
              >
                <div
                  onClick={() => {
                    setSelectedMapBlockId(blockId);
                    setSelectedMapInnerId(null);
                  }}
                  className={`flex items-center justify-between gap-1.5 p-2 cursor-pointer rounded-t-xl ${
                    isSelected ? 'bg-emerald-500/15' : 'hover:bg-stone-900'
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedMapBlocks((prev) => ({
                        ...prev,
                        [blockId]: !prev[blockId],
                      }));
                    }}
                    className="p-0.5 text-stone-400 hover:text-emerald-300"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-stone-100 truncate">
                      {idx + 1}. {blk.name}
                    </div>
                    <div className="text-[9px] text-stone-400 font-mono">
                      {innerOrder.length} elementos internos
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateMapBlock(blockId, {
                        visible: !blk.visible,
                        hidden: blk.visible,
                      });
                    }}
                    className={`p-1 rounded ${
                      blk.visible
                        ? 'text-emerald-400 bg-emerald-950/40'
                        : 'text-stone-500 bg-stone-900'
                    }`}
                  >
                    {blk.visible ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div className="px-2 pb-2 pt-1 border-t border-stone-800/80 space-y-1">
                    {innerOrder.map((inId) => {
                      const inCfg =
                        blk.innerButtonsConfig?.[inId] || makeInnerEl(inId, inId);
                      const isInSelected =
                        selectedMapBlockId === blockId &&
                        selectedMapInnerId === inId;
                      return (
                        <div
                          key={inId}
                          onClick={() => {
                            setSelectedMapBlockId(blockId);
                            setSelectedMapInnerId(inId);
                          }}
                          className={`flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg text-[10px] cursor-pointer ${
                            isInSelected
                              ? 'bg-cyan-950/80 border border-cyan-400/60 text-cyan-200 font-bold'
                              : 'bg-stone-900/70 hover:bg-stone-800/80 text-stone-300'
                          }`}
                        >
                          <span className="truncate">
                            • {inCfg.label || inCfg.id}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateMapInner(blockId, inId, {
                                visible: inCfg.visible === false,
                              });
                            }}
                            className={
                              inCfg.visible === false
                                ? 'text-stone-600'
                                : 'text-emerald-400'
                            }
                          >
                            {inCfg.visible === false ? (
                              <EyeOff className="w-2.5 h-2.5" />
                            ) : (
                              <Eye className="w-2.5 h-2.5" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CENTER COLUMN: Inspector */}
        <div className="xl:col-span-4 space-y-3">
          {renderBlockOrInnerInspector({
            block: activeBlock,
            selectedInnerId: selectedMapInnerId,
            onClearInnerSelection: () => setSelectedMapInnerId(null),
            onUpdateBlock: (patch) =>
              handleUpdateMapBlock(activeBlock.id, patch),
            onUpdateInner: (innerId, patch) =>
              handleUpdateMapInner(activeBlock.id, innerId, patch),
          })}
        </div>

        {/* RIGHT COLUMN: 1:1 Interactive Map Mode Canvas */}
        <div className="xl:col-span-5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-stone-900/90 border border-emerald-500/30 text-xs">
            <div className="flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-emerald-400" />
              <span className="font-cinzel font-bold text-emerald-200">
                Lienzo Sandbox 1:1: Modo Mapa
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="btn-open-fullscreen-map"
                onClick={() => setFullScreenCanvasMode('map')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-[11px] shadow cursor-pointer transition"
                title="Abrir mapa en pantalla completa 1:1 para evitar apreturas"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Vista Completa 1:1</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setMapZoom((z) => Math.max(0.55, Number((z - 0.1).toFixed(2))))
                }
                className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-emerald-300 px-1">
                {Math.round(mapZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() =>
                  setMapZoom((z) => Math.min(1.05, Number((z + 0.1).toFixed(2))))
                }
                className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {renderSamplePlayersToolbar('emerald')}

          <div
            onClick={() => setSelectedMapInnerId(null)}
            className="rounded-2xl border-2 border-stone-800 bg-[#090c14] p-4 overflow-auto max-h-[740px] shadow-2xl"
          >
            <div
              style={{
                transform: `scale(${mapZoom})`,
                transformOrigin: 'top left',
                width: `${Math.round(100 / mapZoom)}%`,
              }}
              className="space-y-3 pb-10"
            >
              {mapLayout.blocksOrder.map((blockId) => {
                const blk = mapLayout.blocks[blockId];
                if (!blk) return null;
                return renderInteractiveBlockContainer({
                  block: blk,
                  isSelected:
                    selectedMapBlockId === blockId && !selectedMapInnerId,
                  zoom: mapZoom,
                  onSelectBlock: () => {
                    setSelectedMapBlockId(blockId);
                    setSelectedMapInnerId(null);
                  },
                  onUpdateBlock: (patch) => handleUpdateMapBlock(blockId, patch),
                  children: renderMapBlockBody(blk),
                });
              })}
            </div>
          </div>
        </div>

        {/* Full-Screen Spacious 1:1 Player Map Modal */}
        {fullScreenCanvasMode === 'map' && (
          <div
            data-testid="modal-fullscreen-map"
            className="fixed inset-0 z-50 bg-[#0c0e15]/98 backdrop-blur-md flex flex-col overflow-hidden text-white"
          >
            {/* Top Floating Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-stone-800 bg-stone-950/90 shadow-xl shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-cinzel font-black text-sm tracking-wide text-emerald-300 flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-emerald-400" />
                  Vista Real 1:1 en Pantalla Completa: Modo Mapa
                </span>
                <span className="text-xs text-stone-400 hidden lg:inline">
                  Arrastra mapas, mazos y dados libremente sin apreturas. Haz clic en cualquier elemento para seleccionarlo.
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {renderSamplePlayersToolbar('emerald')}

                {/* Quick Action: Minimize & Edit Selected Element in Center Inspector */}
                <button
                  type="button"
                  data-testid="btn-minimize-fullscreen-edit"
                  onClick={() => setFullScreenCanvasMode('none')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer transition"
                  title="Minimizar lienzo y abrir inspector para este elemento"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>
                    {selectedMapInnerId
                      ? `Minimizar y Editar "${activeBlock.innerButtonsConfig?.[selectedMapInnerId]?.label || selectedMapInnerId}"`
                      : `Minimizar y Editar "${activeBlock.name}"`}
                  </span>
                </button>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-stone-900 border border-stone-700 px-2 py-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() =>
                      setMapZoom((z) => Math.max(0.55, Number((z - 0.1).toFixed(2))))
                    }
                    className="p-1 hover:text-emerald-300 cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono text-emerald-300 w-12 text-center">
                    {Math.round(mapZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setMapZoom((z) => Math.min(1.2, Number((z + 0.1).toFixed(2))))
                    }
                    className="p-1 hover:text-emerald-300 cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  data-testid="btn-close-fullscreen-map"
                  onClick={() => setFullScreenCanvasMode('none')}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-xs font-bold cursor-pointer"
                >
                  ✕ Cerrar Vista
                </button>
              </div>
            </div>

            {/* Spacious 1:1 Canvas Container */}
            <div
              onClick={() => setSelectedMapInnerId(null)}
              className="flex-1 overflow-auto p-6 flex justify-center bg-[#07090e]"
            >
              <div
                style={{
                  backgroundColor: '#090c14',
                  transform: `scale(${mapZoom})`,
                  transformOrigin: 'top center',
                  width: `${Math.round(100 / mapZoom)}%`,
                  maxWidth: '1440px',
                }}
                className="rounded-2xl border-2 border-stone-800 p-6 shadow-2xl space-y-4 min-h-[900px]"
              >
                {mapLayout.blocksOrder.map((blockId) => {
                  const blk = mapLayout.blocks[blockId];
                  if (!blk) return null;
                  return renderInteractiveBlockContainer({
                    block: blk,
                    isSelected:
                      selectedMapBlockId === blockId && !selectedMapInnerId,
                    zoom: mapZoom,
                    onSelectBlock: () => {
                      setSelectedMapBlockId(blockId);
                      setSelectedMapInnerId(null);
                    },
                    onUpdateBlock: (patch) =>
                      handleUpdateMapBlock(blockId, patch),
                    children: renderMapBlockBody(blk),
                  });
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================================================
  // APARTADO 3: GEOMETRIC SHAPES (UNBROKEN SVG POLYGON BORDERS), EDGE FADE,
  // 1-24 PORTRAITS, STAT BOX SUB-ELEMENTS, 3 DECK TEMPLATES & 1:1 SHEET POP-UPS
  // ==========================================================================
  const renderApartado3GraphicsStudio = () => {
    const updateStatBox = (patch: Partial<StatBoxGraphicConfig>) => {
      onUpdateTokens({
        statBoxGraphicConfig: {
          ...statBoxConfig,
          ...patch,
        },
      });
    };

    const updateStatPart = (
      partId: string,
      patch: Partial<SpatialInnerElementConfig>
    ) => {
      const currentMap = statBoxConfig.innerButtonsConfig || {};
      const existing = currentMap[partId] || makeInnerEl(partId, partId);
      updateStatBox({
        innerButtonsConfig: {
          ...currentMap,
          [partId]: { ...existing, ...patch, id: partId },
        },
      });
    };

    const updateDeckTpl = (patch: Partial<DeckCardGraphicTemplate>) => {
      const next = { ...deckTemplate, ...patch };
      if (activeDeckKind === 'combat') {
        onUpdateTokens({ combatCardTemplate: next });
      } else if (activeDeckKind === 'skills') {
        onUpdateTokens({ skillsCardTemplate: next });
      } else {
        onUpdateTokens({ spellsCardTemplate: next });
      }
    };

    const updateDeckPart = (
      partId: string,
      patch: Partial<SpatialInnerElementConfig>
    ) => {
      const currentMap = deckTemplate.innerButtonsConfig || {};
      const existing = currentMap[partId] || makeInnerEl(partId, partId);
      updateDeckTpl({
        innerButtonsConfig: {
          ...currentMap,
          [partId]: { ...existing, ...patch, id: partId },
        },
      });
    };

    const handleUpdateSheetPopupConfig = (
      patch: Partial<SkinModalPopupOverride>
    ) => {
      const nextPopup: SkinModalPopupOverride = {
        ...activePopupConfig,
        ...patch,
      };
      onUpdateTokens({
        modalPopupConfigs: {
          ...(tokens.modalPopupConfigs || {}),
          [activeSheetPopupId]: nextPopup,
        },
      });
    };

    const handleUpdateSheetPopupInner = (
      innerId: string,
      patch: Partial<SpatialInnerElementConfig>
    ) => {
      const currentMap = activePopupConfig.innerButtonsConfig || {};
      const existing = currentMap[innerId] || makeInnerEl(innerId, innerId);
      handleUpdateSheetPopupConfig({
        innerButtonsConfig: {
          ...currentMap,
          [innerId]: {
            ...existing,
            ...patch,
            id: innerId,
          },
        },
      });
    };

    return (
      <div className="space-y-4">
        {/* Sub-Tabs for Apartado 3 */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-stone-900/95 border border-stone-800">
          {[
            {
              id: 'portrait_and_alignments',
              label: '1. Portada (1–24 PNGs), Figuras y 9 Alineamientos',
            },
            {
              id: 'stat_boxes_studio',
              label: '2. Cajas de Estadísticas y Sub-Elementos 1:1',
            },
            {
              id: 'deck_cards_studio',
              label: '3. Las 3 Plantillas de Cartas del Mazo 1:1',
            },
            {
              id: 'sheet_popups_studio',
              label: '4. Los 4 Pop-ups de Hoja 1:1 (Inventario, Diario, Rasgos, Ajustes)',
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-testid={`apartado3-subtab-${tab.id}`}
              onClick={() => setApartado3SubTab(tab.id as any)}
              className={`px-3 py-2 rounded-xl text-xs font-cinzel font-bold transition cursor-pointer ${
                apartado3SubTab === tab.id
                  ? 'bg-amber-500/20 border border-amber-400 text-amber-200 shadow'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* SUB-TAB 1: PORTRAIT + 1-24 GALLERY + 9 ALIGNMENTS */}
        {apartado3SubTab === 'portrait_and_alignments' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-7 space-y-4 p-4 rounded-2xl bg-stone-900/95 border border-stone-800">
              <h4 className="text-sm font-cinzel font-bold text-amber-300">
                Geometría de Portada, Difuminado y Galería de 1 a 24 Retratos PNG
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Figura Geométrica del Retrato
                  </label>
                  <select
                    data-testid="select-portrait-geometric-shape"
                    value={tokens.portraitGeometricShape || 'rounded'}
                    onChange={(e) =>
                      onUpdateTokens({
                        portraitGeometricShape: e.target.value as GeometricShapeType,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-xs text-white"
                  >
                    {GEOMETRIC_SHAPES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Difuminado de Bordes ({tokens.portraitEdgeFadePercent || 0}%)
                  </label>
                  <input
                    data-testid="slider-portrait-edge-fade"
                    type="range"
                    min={0}
                    max={100}
                    value={tokens.portraitEdgeFadePercent || 0}
                    onChange={(e) =>
                      onUpdateTokens({
                        portraitEdgeFadePercent: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full accent-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Límite de Retratos en Galería (1 a 24 PNGs):{' '}
                    <span className="text-amber-300 font-mono">
                      {tokens.maxPortraitGalleryCount ?? 4}
                    </span>
                  </label>
                  <input
                    data-testid="slider-max-portrait-gallery-count"
                    type="range"
                    min={1}
                    max={24}
                    value={tokens.maxPortraitGalleryCount ?? 4}
                    onChange={(e) =>
                      onUpdateTokens({
                        maxPortraitGalleryCount: Number(e.target.value) || 4,
                      })
                    }
                    className="w-full accent-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Proporción de Portada (Aspect Ratio)
                  </label>
                  <select
                    data-testid="select-portrait-aspect-ratio"
                    value={tokens.portraitAspectRatio || '1:1'}
                    onChange={(e) =>
                      onUpdateTokens({
                        portraitAspectRatio: e.target.value as PortraitAspectRatioPreset,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-xs text-white"
                  >
                    {ASPECT_RATIO_PRESETS.map((ar) => (
                      <option key={ar.id} value={ar.id}>
                        {ar.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-stone-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(tokens.portraitHideBorder)}
                    onChange={(e) =>
                      onUpdateTokens({ portraitHideBorder: e.target.checked })
                    }
                    className="rounded border-stone-600"
                  />
                  <span>Quitar borde de la portada</span>
                </label>
              </div>

              <ImageSourcePicker
                label="Marco PNG Superpuesto al Retrato (Opcional)"
                value={tokens.sheetPortraitFramePngUrl || ''}
                onChange={(url) =>
                  onUpdateTokens({ sheetPortraitFramePngUrl: url })
                }
              />

              {/* 9 Alignment Custom Icons */}
              <div className="pt-3 border-t border-stone-800 space-y-2.5">
                <h5 className="text-xs font-cinzel font-bold text-amber-300 uppercase">
                  Iconos PNG para los 9 Alineamientos de D&D
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {ALL_9_ALIGNMENTS_5E.map((align) => (
                    <div
                      key={align}
                      className="p-2.5 rounded-xl bg-stone-950/90 border border-stone-800 space-y-1.5"
                    >
                      <div className="text-[10px] font-bold text-amber-200">
                        {align}
                      </div>
                      <ImageSourcePicker
                        label="Subir Icono PNG"
                        value={tokens.alignmentCustomIcons?.[align] || ''}
                        onChange={(url) =>
                          onUpdateTokens({
                            alignmentCustomIcons: {
                              ...(tokens.alignmentCustomIcons || {}),
                              [align]: url,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Preview of Geometric Portrait with Unbroken SVG Polygon Border */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-stone-950 border border-stone-800 flex flex-col items-center justify-center space-y-4">
              <span className="text-xs font-cinzel font-bold text-amber-300 uppercase">
                Vista Previa 1:1 de Portada con Borde Geométrico SVG Continuo
              </span>
              <div
                data-testid="preview-portrait-geometric-box"
                style={{
                  ...buildGeometricElementStyle({
                    shape: tokens.portraitGeometricShape || 'rounded',
                    edgeFadePercent: tokens.portraitEdgeFadePercent || 0,
                    hideBorder: tokens.portraitHideBorder,
                    borderRadiusPx: 18,
                    bgColor: '#171c28',
                    borderColor: '#c8a45c',
                    borderWidthPx: 3,
                  }),
                  width: '210px',
                  aspectRatio: getAspectRatioCssValue(
                    tokens.portraitAspectRatio || '1:1',
                    tokens.portraitCustomAspectW,
                    tokens.portraitCustomAspectH
                  ),
                }}
                className="relative flex flex-col items-center justify-center shadow-2xl overflow-hidden"
              >
                <GeometricSvgBorder
                  shape={tokens.portraitGeometricShape || 'rounded'}
                  borderColor="#c8a45c"
                  borderWidthPx={3}
                  hideBorder={tokens.portraitHideBorder}
                />
                <div className="text-center p-4 z-10">
                  <div className="text-sm font-cinzel font-black text-amber-200">
                    {resolvedCharacter?.name || 'Valeros del Alba'}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-1">
                    Figura: {tokens.portraitGeometricShape || 'rounded'}
                  </div>
                  <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                    Galería: hasta {tokens.maxPortraitGalleryCount ?? 4} PNGs
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-stone-400 text-center max-w-sm">
                Esta figura geométrica se aplica automáticamente al retrato en la Hoja (Apartado 1) y permite bordes continuos incluso en triángulos, rombos, pentágonos, hexágonos y octágonos.
              </p>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: STAT BOXES & INTERNAL SUB-ELEMENTS 1:1 */}
        {apartado3SubTab === 'stat_boxes_studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left: Stat Box Outer Shape + Internal Parts List */}
            <div className="lg:col-span-4 space-y-3 p-4 rounded-2xl bg-stone-900/95 border border-stone-800">
              <h4 className="text-xs font-cinzel font-bold text-amber-300 uppercase">
                Geometría Exterior de Caja de Estadística
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-stone-300 mb-1">
                    Figura de Caja
                  </label>
                  <select
                    data-testid="select-statbox-shape"
                    value={statBoxConfig.shape}
                    onChange={(e) =>
                      updateStatBox({
                        shape: e.target.value as GeometricShapeType,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-xs text-white"
                  >
                    {GEOMETRIC_SHAPES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-stone-300 mb-1">
                    Difuminado ({statBoxConfig.edgeFadePercent || 0}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={statBoxConfig.edgeFadePercent || 0}
                    onChange={(e) =>
                      updateStatBox({
                        edgeFadePercent: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full accent-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] text-stone-400 mb-1">Fondo</label>
                  <input
                    type="color"
                    value={statBoxConfig.bgColor}
                    onChange={(e) => updateStatBox({ bgColor: e.target.value })}
                    className="w-full h-8 rounded bg-stone-950 border border-stone-700"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-stone-400 mb-1">Borde</label>
                  <input
                    type="color"
                    value={statBoxConfig.borderColor}
                    onChange={(e) =>
                      updateStatBox({ borderColor: e.target.value })
                    }
                    className="w-full h-8 rounded bg-stone-950 border border-stone-700"
                  />
                </div>
                <div className="flex items-center pt-4">
                  <label className="flex items-center gap-1.5 text-[10px] text-stone-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={statBoxConfig.hideBorder}
                      onChange={(e) =>
                        updateStatBox({ hideBorder: e.target.checked })
                      }
                    />
                    <span>Sin Borde</span>
                  </label>
                </div>
              </div>

              <ImageSourcePicker
                label="Marco / Fondo PNG para Cajas de Estadísticas"
                value={statBoxConfig.customPngUrl || ''}
                onChange={(url) =>
                  updateStatBox({ customPngUrl: url, customFramePngUrl: url })
                }
              />

              {/* List of 7 Internal Stat Box Pieces */}
              <div className="pt-3 border-t border-stone-800 space-y-1.5">
                <div className="text-[11px] font-cinzel font-bold text-cyan-300 uppercase">
                  Sub-Elementos Internos de la Estadística (Arrastrables)
                </div>
                {(statBoxConfig.innerButtonsOrder || []).map((partId) => {
                  const part =
                    statBoxConfig.innerButtonsConfig?.[partId] ||
                    makeInnerEl(partId, partId);
                  return (
                    <div
                      key={partId}
                      onClick={() => setSelectedStatPartId(partId)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer ${
                        selectedStatPartId === partId
                          ? 'bg-cyan-950/90 border border-cyan-400 text-cyan-200 font-bold'
                          : 'bg-stone-950/70 hover:bg-stone-800 text-stone-300'
                      }`}
                    >
                      <span>{part.label || part.id}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatPart(partId, {
                            visible: part.visible === false,
                          });
                        }}
                        className={
                          part.visible === false
                            ? 'text-stone-600'
                            : 'text-emerald-400'
                        }
                      >
                        {part.visible === false ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Center: Selected Stat Part Inspector */}
            <div className="lg:col-span-4">
              {selectedStatPartId &&
                statBoxConfig.innerButtonsConfig?.[selectedStatPartId] && (
                  <div className="p-4 rounded-2xl bg-stone-900/95 border border-cyan-500/40 space-y-3">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-[9px] font-bold text-cyan-300 uppercase">
                      Sub-Elemento de Estadística
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-stone-300 mb-1">
                          Texto / Etiqueta
                        </label>
                        <input
                          type="text"
                          value={
                            statBoxConfig.innerButtonsConfig[selectedStatPartId]
                              .label ?? ''
                          }
                          onChange={(e) =>
                            updateStatPart(selectedStatPartId, {
                              label: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-stone-300 mb-1">
                          Tamaño Fuente (px)
                        </label>
                        <input
                          type="number"
                          value={
                            statBoxConfig.innerButtonsConfig[selectedStatPartId]
                              .fontSizePx || 12
                          }
                          onChange={(e) =>
                            updateStatPart(selectedStatPartId, {
                              fontSizePx: Number(e.target.value) || 12,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-stone-300 mb-1">
                          Posición X (px)
                        </label>
                        <input
                          type="number"
                          value={
                            statBoxConfig.innerButtonsConfig[selectedStatPartId]
                              .x || 0
                          }
                          onChange={(e) =>
                            updateStatPart(selectedStatPartId, {
                              x: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-stone-300 mb-1">
                          Posición Y (px)
                        </label>
                        <input
                          type="number"
                          value={
                            statBoxConfig.innerButtonsConfig[selectedStatPartId]
                              .y || 0
                          }
                          onChange={(e) =>
                            updateStatPart(selectedStatPartId, {
                              y: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[9px] text-stone-400 mb-1">
                          Color Fondo
                        </label>
                        <input
                          type="color"
                          value={
                            statBoxConfig.innerButtonsConfig[selectedStatPartId]
                              .bgColor || '#181b26'
                          }
                          onChange={(e) =>
                            updateStatPart(selectedStatPartId, {
                              bgColor: e.target.value,
                            })
                          }
                          className="w-full h-8 rounded bg-stone-950 border border-stone-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-stone-400 mb-1">
                          Color Texto
                        </label>
                        <input
                          type="color"
                          value={
                            statBoxConfig.innerButtonsConfig[selectedStatPartId]
                              .textColor || '#ffffff'
                          }
                          onChange={(e) =>
                            updateStatPart(selectedStatPartId, {
                              textColor: e.target.value,
                            })
                          }
                          className="w-full h-8 rounded bg-stone-950 border border-stone-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-stone-400 mb-1">
                          Figura Interna
                        </label>
                        <select
                          value={
                            statBoxConfig.innerButtonsConfig[selectedStatPartId]
                              .shape || 'rounded'
                          }
                          onChange={(e) =>
                            updateStatPart(selectedStatPartId, {
                              shape: e.target.value as GeometricShapeType,
                            })
                          }
                          className="w-full px-2 py-1.5 rounded bg-stone-950 border border-stone-700 text-[10px] text-white"
                        >
                          {GEOMETRIC_SHAPES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
            </div>

            {/* Right: 1:1 Interactive Stat Box Sandbox */}
            <div className="lg:col-span-4 p-6 rounded-2xl bg-stone-950 border border-stone-800 flex flex-col items-center justify-center space-y-4">
              <span className="text-xs font-cinzel font-bold text-amber-300 uppercase">
                Lienzo 1:1 de Caja de Estadística (Arrastra cada parte)
              </span>
              <div
                data-testid="statbox-interactive-preview"
                style={{
                  ...buildGeometricElementStyle({
                    shape: statBoxConfig.shape,
                    edgeFadePercent: statBoxConfig.edgeFadePercent,
                    hideBorder: statBoxConfig.hideBorder,
                    borderRadiusPx: statBoxConfig.borderRadiusPx,
                    bgColor: applyColorWithOpacity(
                      statBoxConfig.bgColor,
                      statBoxConfig.boxBgOpacity
                    ),
                    borderColor: statBoxConfig.borderColor,
                    borderWidthPx: statBoxConfig.borderWidthPx,
                    customPngUrl: statBoxConfig.customPngUrl,
                  }),
                  width: '250px',
                  minHeight: '270px',
                }}
                className="relative p-4 flex flex-col items-center justify-between gap-2 shadow-2xl"
              >
                <GeometricSvgBorder
                  shape={statBoxConfig.shape}
                  borderColor={statBoxConfig.borderColor}
                  borderWidthPx={statBoxConfig.borderWidthPx}
                  hideBorder={statBoxConfig.hideBorder}
                />
                {(statBoxConfig.innerButtonsOrder || []).map((partId) => {
                  const part =
                    statBoxConfig.innerButtonsConfig?.[partId] ||
                    makeInnerEl(partId, partId);
                  return renderInteractiveInnerElement(
                    part,
                    `statpart-${partId}`,
                    selectedStatPartId === partId,
                    1,
                    () => setSelectedStatPartId(partId),
                    (patch) => updateStatPart(partId, patch)
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 3: 3 DECK CARD TEMPLATES 1:1 */}
        {apartado3SubTab === 'deck_cards_studio' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {(
                [
                  { id: 'combat', label: '⚔️ Mazo: Combates y Acciones' },
                  { id: 'skills', label: '🎯 Mazo: Habilidades' },
                  { id: 'spells', label: '✨ Mazo: Lanzar Conjuros' },
                ] as const
              ).map((dk) => (
                <button
                  key={dk.id}
                  type="button"
                  onClick={() => setActiveDeckKind(dk.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-cinzel font-bold border transition cursor-pointer ${
                    activeDeckKind === dk.id
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-stone-900 border-stone-800 text-stone-400'
                  }`}
                >
                  {dk.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-4 space-y-3 p-4 rounded-2xl bg-stone-900/95 border border-stone-800">
                <h4 className="text-xs font-cinzel font-bold text-amber-300 uppercase">
                  Plantilla: {deckTemplate.label}
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-stone-300 mb-1">
                      Figura Exterior de Carta
                    </label>
                    <select
                      value={deckTemplate.cardShape}
                      onChange={(e) =>
                        updateDeckTpl({
                          cardShape: e.target.value as GeometricShapeType,
                        })
                      }
                      className="w-full px-2 py-1.5 rounded bg-stone-950 border border-stone-700 text-xs text-white"
                    >
                      {GEOMETRIC_SHAPES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-300 mb-1">
                      Figura Recuadro Ilustración
                    </label>
                    <select
                      value={deckTemplate.illustrationShape}
                      onChange={(e) =>
                        updateDeckTpl({
                          illustrationShape: e.target.value as GeometricShapeType,
                          artworkShape: e.target.value as GeometricShapeType,
                        })
                      }
                      className="w-full px-2 py-1.5 rounded bg-stone-950 border border-stone-700 text-xs text-white"
                    >
                      {GEOMETRIC_SHAPES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-stone-300 mb-1">
                      Difuminado Carta ({deckTemplate.edgeFadePercent || 0}%)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={deckTemplate.edgeFadePercent || 0}
                      onChange={(e) =>
                        updateDeckTpl({
                          edgeFadePercent: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-300 mb-1">
                      Difuminado Ilustración ({deckTemplate.illustrationEdgeFadePercent || 0}%)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={deckTemplate.illustrationEdgeFadePercent || 0}
                      onChange={(e) =>
                        updateDeckTpl({
                          illustrationEdgeFadePercent: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>

                <ImageSourcePicker
                  label="Marco / Fondo PNG de la Carta del Mazo"
                  value={deckTemplate.customBgPngUrl || ''}
                  onChange={(url) =>
                    updateDeckTpl({
                      customBgPngUrl: url,
                      customFramePngUrl: url,
                    })
                  }
                />
              </div>

              {/* Center: Deck Part Inspector */}
              <div className="lg:col-span-4 space-y-2.5 p-4 rounded-2xl bg-stone-900/95 border border-cyan-500/40">
                <div className="text-xs font-cinzel font-bold text-cyan-300 uppercase">
                  Elementos Internos de la Carta (Clic para Editar / Arrastrar)
                </div>
                {(deckTemplate.innerButtonsOrder || []).map((pId) => {
                  const part =
                    deckTemplate.innerButtonsConfig?.[pId] ||
                    makeInnerEl(pId, pId);
                  return (
                    <div
                      key={pId}
                      onClick={() => setSelectedDeckPartId(pId)}
                      className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between ${
                        selectedDeckPartId === pId
                          ? 'bg-cyan-950 border border-cyan-400 text-cyan-200 font-bold'
                          : 'bg-stone-950/70 text-stone-300'
                      }`}
                    >
                      <span>{part.label || part.id}</span>
                      <span className="font-mono text-[10px]">
                        ({part.x || 0},{part.y || 0})
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Right: 1:1 Interactive Deck Card Preview */}
              <div className="lg:col-span-4 p-6 rounded-2xl bg-stone-950 border border-stone-800 flex flex-col items-center justify-center space-y-3">
                <span className="text-xs font-cinzel font-bold text-amber-300 uppercase">
                  Lienzo 1:1: Carta de {deckTemplate.label}
                </span>
                <div
                  data-testid={`deck-card-preview-${activeDeckKind}`}
                  style={{
                    ...buildGeometricElementStyle({
                      shape: deckTemplate.cardShape,
                      edgeFadePercent: deckTemplate.edgeFadePercent,
                      hideBorder: deckTemplate.hideBorder,
                      borderRadiusPx: deckTemplate.borderRadiusPx,
                      bgColor: applyColorWithOpacity(
                        deckTemplate.bgColor,
                        deckTemplate.boxBgOpacity
                      ),
                      borderColor: deckTemplate.borderColor,
                      borderWidthPx: deckTemplate.borderWidthPx,
                      customPngUrl: deckTemplate.customBgPngUrl,
                    }),
                    width: '260px',
                    minHeight: '340px',
                  }}
                  className="relative p-4 flex flex-col justify-between gap-2.5 shadow-2xl"
                >
                  <GeometricSvgBorder
                    shape={deckTemplate.cardShape}
                    borderColor={deckTemplate.borderColor}
                    borderWidthPx={deckTemplate.borderWidthPx}
                    hideBorder={deckTemplate.hideBorder}
                  />
                  {(deckTemplate.innerButtonsOrder || []).map((pId) => {
                    const part =
                      deckTemplate.innerButtonsConfig?.[pId] ||
                      makeInnerEl(pId, pId);
                    const isIllust = pId === 'card_illustration_box';
                    return renderInteractiveInnerElement(
                      part,
                      `deckpart-${pId}`,
                      selectedDeckPartId === pId,
                      1,
                      () => setSelectedDeckPartId(pId),
                      (patch) => updateDeckPart(pId, patch),
                      isIllust ? deckTemplate.illustrationShape : part.shape,
                      isIllust
                        ? deckTemplate.illustrationEdgeFadePercent
                        : part.edgeFadePercent
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 4: THE 4 PLAYER SHEET POP-UPS 1:1 */}
        {apartado3SubTab === 'sheet_popups_studio' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {SHEET_POPUP_TARGETS.map((pop) => (
                <button
                  key={pop.id}
                  type="button"
                  data-testid={`select-sheet-popup-${pop.id}`}
                  onClick={() => {
                    setActiveSheetPopupId(pop.id);
                    setSelectedPopupInnerId(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    activeSheetPopupId === pop.id
                      ? 'bg-amber-500/20 border-amber-400 text-amber-100 shadow-lg'
                      : 'bg-stone-900/90 border-stone-800 text-stone-300 hover:bg-stone-800/70'
                  }`}
                >
                  <div className="text-xs font-cinzel font-bold">{pop.label}</div>
                  <div className="text-[10px] text-stone-400 mt-1 line-clamp-2">
                    {pop.desc}
                  </div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
              {/* Left/Center Inspector for Popup Container or Selected Inner Element */}
              <div className="xl:col-span-4 space-y-3 p-4 rounded-2xl bg-stone-900/95 border border-stone-800">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <span className="text-xs font-cinzel font-bold text-amber-300 uppercase">
                    {selectedPopupInnerId
                      ? `Elemento: ${
                          activePopupConfig.innerButtonsConfig?.[
                            selectedPopupInnerId
                          ]?.label || selectedPopupInnerId
                        }`
                      : `Ventana: ${
                          SHEET_POPUP_TARGETS.find(
                            (p) => p.id === activeSheetPopupId
                          )?.label
                        }`}
                  </span>
                  {selectedPopupInnerId && (
                    <button
                      type="button"
                      onClick={() => setSelectedPopupInnerId(null)}
                      className="px-2 py-0.5 rounded bg-stone-800 text-[10px] text-amber-300"
                    >
                      ← Ventana Principal
                    </button>
                  )}
                </div>

                {selectedPopupInnerId &&
                activePopupConfig.innerButtonsConfig?.[selectedPopupInnerId] ? (
                  (() => {
                    const el =
                      activePopupConfig.innerButtonsConfig![selectedPopupInnerId];
                    return (
                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-[10px] text-stone-300 mb-1">
                            Texto del Botón / Pestaña
                          </label>
                          <input
                            type="text"
                            value={el.label ?? ''}
                            onChange={(e) =>
                              handleUpdateSheetPopupInner(el.id, {
                                label: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-xs text-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] text-stone-400">
                              Posición X (px)
                            </label>
                            <input
                              type="number"
                              value={el.x || 0}
                              onChange={(e) =>
                                handleUpdateSheetPopupInner(el.id, {
                                  x: Number(e.target.value) || 0,
                                })
                              }
                              className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-stone-400">
                              Posición Y (px)
                            </label>
                            <input
                              type="number"
                              value={el.y || 0}
                              onChange={(e) =>
                                handleUpdateSheetPopupInner(el.id, {
                                  y: Number(e.target.value) || 0,
                                })
                              }
                              className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-white font-mono"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-stone-300 mb-1">
                              Figura Geométrica
                            </label>
                            <select
                              value={el.shape || 'rounded'}
                              onChange={(e) =>
                                handleUpdateSheetPopupInner(el.id, {
                                  shape: e.target.value as GeometricShapeType,
                                })
                              }
                              className="w-full px-2 py-1.5 rounded bg-stone-950 border border-stone-700 text-xs text-white"
                            >
                              {GEOMETRIC_SHAPES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-stone-300 mb-1">
                              Opacidad Fondo ({Math.round((el.bgOpacity ?? 0.92) * 100)}%)
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={el.bgOpacity ?? 0.92}
                              onChange={(e) =>
                                handleUpdateSheetPopupInner(el.id, {
                                  bgOpacity: parseFloat(e.target.value),
                                })
                              }
                              className="w-full accent-cyan-400"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[9px] text-stone-400 mb-1">
                              Fondo
                            </label>
                            <input
                              type="color"
                              value={el.bgColor || '#1e2230'}
                              onChange={(e) =>
                                handleUpdateSheetPopupInner(el.id, {
                                  bgColor: e.target.value,
                                })
                              }
                              className="w-full h-8 rounded bg-stone-950 border border-stone-700"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-stone-400 mb-1">
                              Borde
                            </label>
                            <input
                              type="color"
                              value={el.borderColor || '#c8a45c'}
                              onChange={(e) =>
                                handleUpdateSheetPopupInner(el.id, {
                                  borderColor: e.target.value,
                                })
                              }
                              className="w-full h-8 rounded bg-stone-950 border border-stone-700"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-stone-400 mb-1">
                              Texto
                            </label>
                            <input
                              type="color"
                              value={el.textColor || '#f5e4be'}
                              onChange={(e) =>
                                handleUpdateSheetPopupInner(el.id, {
                                  textColor: e.target.value,
                                })
                              }
                              className="w-full h-8 rounded bg-stone-950 border border-stone-700"
                            />
                          </div>
                        </div>
                        <ImageSourcePicker
                          label="PNG del Botón / Pestaña"
                          value={el.bgImageUrl || ''}
                          onChange={(url) =>
                            handleUpdateSheetPopupInner(el.id, {
                              bgImageUrl: url,
                            })
                          }
                        />
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-stone-300 mb-1">
                          Figura de Ventana
                        </label>
                        <select
                          value={activePopupConfig.shape || 'rounded'}
                          onChange={(e) =>
                            handleUpdateSheetPopupConfig({
                              shape: e.target.value as GeometricShapeType,
                            })
                          }
                          className="w-full px-2 py-1.5 rounded bg-stone-950 border border-stone-700 text-xs text-white"
                        >
                          {GEOMETRIC_SHAPES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-stone-300 mb-1">
                          Opacidad Marco ({Math.round((activePopupConfig.boxBgOpacity ?? 0.96) * 100)}%)
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={activePopupConfig.boxBgOpacity ?? 0.96}
                          onChange={(e) =>
                            handleUpdateSheetPopupConfig({
                              boxBgOpacity: parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-amber-400"
                        />
                      </div>
                    </div>
                    <ImageSourcePicker
                      label="Fondo PNG de la Ventana Pop-up"
                      value={activePopupConfig.customBgPngUrl || ''}
                      onChange={(url) =>
                        handleUpdateSheetPopupConfig({ customBgPngUrl: url })
                      }
                    />
                  </div>
                )}
              </div>

              {/* Right: 1:1 Interactive Popup Canvas */}
              <div className="xl:col-span-8">
                <InteractivePopupBuilderCanvas
                  modalId={activeSheetPopupId}
                  modalTitle={
                    SHEET_POPUP_TARGETS.find((p) => p.id === activeSheetPopupId)
                      ?.label || activeSheetPopupId
                  }
                  config={activePopupConfig}
                  selectedInnerId={selectedPopupInnerId}
                  onSelectInnerId={setSelectedPopupInnerId}
                  onUpdateModalConfig={handleUpdateSheetPopupConfig}
                  onUpdateInnerElement={handleUpdateSheetPopupInner}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================================================
  // APARTADO 4: 100% MODULAR CHARACTER TAROT CARD STUDIO (ANVERSO & DORSO)
  // + FICHA DE JUGADOR (TOKEN CUADRADO PARA MAPAS TÁCTICOS)
  // ==========================================================================
  const renderApartado4TarotStudio = () => {
    const modules = tarotConfig.modules || [];
    const frontModules = modules.filter((m) => m.side === 'front');
    const backModules = modules.filter((m) => m.side === 'back');
    const tokenModules = modules.filter((m) => m.side === 'token');
    const selectedModule =
      modules.find((m) => m.id === selectedTarotModuleId) || modules[0];

    const handlePatchModule = handlePatchTarotModule;
    const handleDuplicateModule = handleDuplicateTarotModule;
    const handleAddCustomModule = handleAddCustomTarotModule;
    const handleDeleteModule = handleDeleteTarotModule;

    const cardW = tarotConfig.cardWidthPx || 290;
    const cardH = tarotConfig.cardHeightPx || 450;
    const bleedPct = tarotConfig.outerBleedPercent ?? 20;
    const bleedPadX = Math.round(cardW * (bleedPct / 100));
    const bleedPadY = Math.round(cardH * (bleedPct / 100));

    const tokenSquarePx = tarotConfig.tokenSquareSizePx || 180;
    const tokenInnerPct = tarotConfig.tokenInnerRatioPercent ?? 80;
    const tokenShape = tarotConfig.tokenShape || 'circle';

    const renderTarotSideCanvas = (side: 'front' | 'back') => {
      const sideMods = side === 'front' ? frontModules : backModules;
      const bgImg =
        side === 'front'
          ? tarotConfig.frontBgImageUrl
          : tarotConfig.backBgImageUrl;
      const bgColor =
        side === 'front'
          ? tarotConfig.frontBgColor || '#1a1f2c'
          : tarotConfig.backBgColor || '#120e1c';
      const boxOpacity =
        side === 'front'
          ? tarotConfig.frontBoxBgOpacity ?? 0.96
          : tarotConfig.backBoxBgOpacity ?? 0.96;

      return (
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center justify-between w-full px-2">
            <span className="text-xs font-cinzel font-bold text-amber-200 uppercase">
              {side === 'front' ? '🎴 Anverso (Frente)' : '🔄 Dorso (Reverso)'} •{' '}
              {sideMods.length} Módulos
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid={`btn-flip-canvas-${side}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setTarotSurfaceView(side === 'front' ? 'back' : 'front');
                }}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-[10px] font-bold text-amber-200 cursor-pointer transition shadow"
                title={`Cambiar vista al ${side === 'front' ? 'Reverso (Dorso)' : 'Anverso (Frente)'}`}
              >
                <RefreshCw className="w-3 h-3 text-amber-300" />
                <span>
                  {side === 'front'
                    ? 'Voltear a Reverso (Dorso) →'
                    : '← Voltear a Frente (Anverso)'}
                </span>
              </button>
              <span className="text-[10px] font-mono text-cyan-300">
                80% + {bleedPct}% Margen
              </span>
            </div>
          </div>

          {/* 20% Outer Margin Bleed Zone Container */}
          <div
            data-testid={`tarot-bleed-zone-${side}`}
            style={{
              paddingLeft: `${bleedPadX}px`,
              paddingRight: `${bleedPadX}px`,
              paddingTop: `${bleedPadY}px`,
              paddingBottom: `${bleedPadY}px`,
            }}
            className="relative rounded-2xl border-2 border-dashed border-cyan-500/35 bg-stone-950/80 shadow-inner"
          >
            <span className="pointer-events-none absolute top-1.5 left-2.5 text-[8px] font-mono uppercase tracking-wider text-cyan-400/75">
              Zona Margen Exterior 20% (Para Bordes GIF / PNGs Sobresalientes)
            </span>

            {/* Stretchable 80% Core Card Body */}
            <div
              ref={side === 'front' ? tarotFrontRef : tarotBackRef}
              data-testid={`tarot-card-canvas-${side}`}
              onClick={() => setTarotInspectTarget('card_frame')}
              style={{
                ...buildGeometricElementStyle({
                  shape: tarotConfig.cardShape || 'rounded',
                  hideBorder: tarotConfig.hideBorder,
                  borderRadiusPx: tarotConfig.borderRadiusPx ?? 18,
                  bgColor: applyColorWithOpacity(bgColor, boxOpacity),
                  borderColor: tarotConfig.borderColor || '#c8a45c',
                  borderWidthPx: tarotConfig.borderWidthPx ?? 2,
                  customPngUrl: bgImg,
                }),
                width: `${cardW}px`,
                height: `${cardH}px`,
              }}
              className="relative shadow-[0_14px_40px_rgba(0,0,0,0.9)] overflow-visible"
            >
              <GeometricSvgBorder
                shape={tarotConfig.cardShape || 'rounded'}
                borderColor={tarotConfig.borderColor || '#c8a45c'}
                borderWidthPx={tarotConfig.borderWidthPx ?? 2}
                hideBorder={tarotConfig.hideBorder}
              />

              {/* Optional Animated Border GIF */}
              {tarotConfig.animatedBorderGifUrl && (
                <img
                  src={tarotConfig.animatedBorderGifUrl}
                  alt=""
                  className="pointer-events-none absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)] object-fill z-20"
                />
              )}

              {/* Modules on this side (can extend into the 20% outer bleed margin!) */}
              {sideMods.map((m) => renderTarotModuleOnCanvas(m))}

              {/* Stretch Handles for the Card Body */}
              <div
                onMouseDown={(e) => startCardFrameResize(e, 'e')}
                className="absolute top-1/2 -right-2 -translate-y-1/2 w-3 h-12 rounded-full bg-amber-400 hover:bg-amber-300 border border-stone-950 cursor-ew-resize z-40 shadow"
                title="Estirar ancho de la carta (↔)"
              />
              <div
                onMouseDown={(e) => startCardFrameResize(e, 's')}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-3 rounded-full bg-amber-400 hover:bg-amber-300 border border-stone-950 cursor-ns-resize z-40 shadow"
                title="Estirar alto de la carta (↕)"
              />
              <div
                onMouseDown={(e) => startCardFrameResize(e, 'se')}
                className="absolute -bottom-2 -right-2 w-4 h-4 rounded bg-amber-300 hover:bg-amber-200 border border-stone-950 cursor-nwse-resize z-40 shadow"
                title="Redimensionar carta (↘)"
              />
            </div>
          </div>
        </div>
      );
    };

    const renderTarotTokenCanvas = () => {
      const innerSizePx = Math.round(tokenSquarePx * (tokenInnerPct / 100));
      const innerOffsetPx = Math.round((tokenSquarePx - innerSizePx) / 2);

      return (
        <div className="flex flex-col items-center space-y-2 p-3 rounded-2xl bg-stone-950/90 border border-emerald-500/35 shadow-lg">
          <div className="flex items-center justify-between w-full gap-3 px-1">
            <div>
              <span className="text-xs font-cinzel font-bold text-emerald-300 uppercase block">
                Ficha de Jugador (Token de Cuadrícula Táctica) • {tokenModules.length} Módulos
              </span>
              <span className="text-[10px] text-stone-400">
                Base circular limpia por defecto. Copia o arrastra aquí Vida, Oro, Alineamiento o GIFs en loop dentro del perímetro cuadrado ({tokenSquarePx}×{tokenSquarePx}px).
              </span>
            </div>
            <button
              type="button"
              data-testid="btn-canvas-inspect-token-frame"
              onClick={() => setTarotInspectTarget('token_frame')}
              className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-400/50 text-[10px] font-bold text-emerald-200 shrink-0 cursor-pointer"
            >
              Configurar Ficha y Borde GIF
            </button>
          </div>

          {/* Outer 1x1 Grid Cell Square Perimeter (Strict Square Boundary: everything inside shows on Tactical Map!) */}
          <div
            ref={tarotTokenRef}
            data-testid="tarot-token-square-canvas"
            onClick={() => setTarotInspectTarget('token_frame')}
            style={{
              width: `${tokenSquarePx}px`,
              height: `${tokenSquarePx}px`,
            }}
            className={`relative overflow-hidden rounded-lg border-2 border-dashed bg-[#0b0e15] shadow-[0_10px_30px_rgba(0,0,0,0.85)] cursor-pointer transition ${
              tarotInspectTarget === 'token_frame'
                ? 'border-emerald-400 ring-2 ring-emerald-400/40'
                : 'border-emerald-500/45 hover:border-emerald-400'
            }`}
          >
            {/* Subtle Tactical Grid Crosshair Background */}
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(52,211,153,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(52,211,153,0.3) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
            <span className="pointer-events-none absolute top-1 left-1.5 z-40 text-[7px] font-mono uppercase tracking-wider text-emerald-300/80 bg-stone-950/80 px-1 rounded">
              Casilla 1×1 ({tokenSquarePx}px)
            </span>

            {/* Base Token Geometric Shape inside the Square */}
            <div
              data-testid="tarot-token-inner-shape"
              style={{
                ...buildGeometricElementStyle({
                  shape: tokenShape,
                  edgeFadePercent: tarotConfig.tokenEdgeFadePercent || 0,
                  hideBorder: tarotConfig.tokenHideBorder,
                  borderRadiusPx: tokenShape === 'circle' ? 999 : 14,
                  bgColor: applyColorWithOpacity(
                    tarotConfig.tokenBgColor || '#141824',
                    tarotConfig.tokenBoxBgOpacity ?? 0.96
                  ),
                  borderColor: tarotConfig.tokenBorderColor || '#c8a45c',
                  borderWidthPx: tarotConfig.tokenBorderWidthPx ?? 3,
                  customPngUrl: tarotConfig.tokenCustomFramePngUrl,
                }),
                position: 'absolute',
                left: `${innerOffsetPx}px`,
                top: `${innerOffsetPx}px`,
                width: `${innerSizePx}px`,
                height: `${innerSizePx}px`,
              }}
              className="pointer-events-none z-10 shadow-inner"
            >
              <GeometricSvgBorder
                shape={tokenShape}
                borderColor={tarotConfig.tokenBorderColor || '#c8a45c'}
                borderWidthPx={tarotConfig.tokenBorderWidthPx ?? 3}
                hideBorder={tarotConfig.tokenHideBorder}
              />
            </div>

            {/* Optional Looping Animated GIF around the Token Border (contained within the Square Perimeter!) */}
            {tarotConfig.tokenAnimatedBorderGifUrl && (
              <img
                src={tarotConfig.tokenAnimatedBorderGifUrl}
                alt="Animación GIF de borde de ficha"
                data-testid="tarot-token-animated-gif"
                className="pointer-events-none absolute inset-0 w-full h-full object-contain z-20"
              />
            )}

            {/* Draggable/Resizable Modules inside the Tactical Token Square (Default: Circular Portrait + any copied Tarot modules like HP, Gold, Alignment) */}
            {tokenModules.map((m) => renderTarotModuleOnCanvas(m))}
          </div>
        </div>
      );
    };

    return (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Card Frame + Token Frame + Modules Tree for Front, Back & Token */}
        <div className="xl:col-span-3 space-y-3 bg-stone-900/95 border border-stone-800 rounded-2xl p-3 max-h-[860px] overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between gap-1 border-b border-stone-800 pb-2">
            <span className="text-xs font-cinzel font-bold text-amber-300 uppercase">
              Carta y Ficha Táctica
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-testid="btn-inspect-card-frame"
                onClick={() => {
                  setTarotInspectTarget('card_frame');
                  if (tarotSurfaceView === 'token') {
                    setTarotSurfaceView('front');
                  }
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                  tarotInspectTarget === 'card_frame'
                    ? 'bg-amber-500 text-stone-950 border-amber-300'
                    : 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                }`}
              >
                Marco Carta
              </button>
              <button
                type="button"
                data-testid="btn-inspect-token-frame"
                onClick={() => {
                  setTarotInspectTarget('token_frame');
                  setTarotSurfaceView('token');
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                  tarotInspectTarget === 'token_frame'
                    ? 'bg-emerald-500 text-stone-950 border-emerald-300'
                    : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                }`}
              >
                Marco Ficha
              </button>
            </div>
          </div>

          {/* Quick Add Custom Layer / Extra HP Bar / Token Layer */}
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              data-testid="btn-add-tarot-custom-layer"
              onClick={() => handleAddCustomModule('front', 'custom_layer')}
              className="px-1.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-[9px] font-bold text-cyan-200 flex items-center justify-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> PNG Carta
            </button>
            <button
              type="button"
              data-testid="btn-add-tarot-hp-bar"
              onClick={() => handleAddCustomModule('back', 'hp_bar')}
              className="px-1.5 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-[9px] font-bold text-amber-200 flex items-center justify-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Barra Vida
            </button>
            <button
              type="button"
              data-testid="btn-add-token-custom-layer"
              onClick={() => handleAddCustomModule('token', 'custom_layer')}
              className="px-1.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-[9px] font-bold text-emerald-200 flex items-center justify-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> PNG Ficha
            </button>
          </div>

          {/* Front Modules List */}
          <div className="space-y-1">
            <div className="text-[10px] font-cinzel font-bold text-amber-300 uppercase px-1">
              1. Anverso de Carta ({frontModules.length})
            </div>
            {frontModules.map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  setSelectedTarotModuleId(m.id);
                  setTarotInspectTarget('module');
                  if (tarotSurfaceView === 'back' || tarotSurfaceView === 'token') {
                    setTarotSurfaceView('front');
                  }
                }}
                className={`flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg text-[10px] cursor-pointer ${
                  tarotInspectTarget === 'module' &&
                  selectedTarotModuleId === m.id
                    ? 'bg-cyan-950 border border-cyan-400 text-cyan-100 font-bold'
                    : 'bg-stone-950/70 hover:bg-stone-800 text-stone-300'
                }`}
              >
                <span className="truncate">{m.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    data-testid={`btn-copy-to-token-${m.id}`}
                    title="Copiar este módulo a la Ficha de Jugador (Mapa Táctico)"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateModule(m.id, 'token');
                    }}
                    className="px-1 py-0.5 rounded bg-emerald-950 hover:bg-emerald-800 border border-emerald-500/40 text-[8px] font-bold text-emerald-200"
                  >
                    +Ficha
                  </button>
                  <button
                    type="button"
                    title="Pasar al Dorso (Reverso)"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePatchModule(m.id, { side: 'back' });
                    }}
                    className="p-0.5 hover:text-amber-300"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    title="Duplicar Módulo"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateModule(m.id);
                    }}
                    className="p-0.5 hover:text-cyan-300"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePatchModule(m.id, { visible: !m.visible });
                    }}
                    className={
                      m.visible ? 'text-emerald-400' : 'text-stone-600'
                    }
                  >
                    {m.visible ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Back Modules List */}
          <div className="space-y-1 pt-2 border-t border-stone-800">
            <div className="text-[10px] font-cinzel font-bold text-purple-300 uppercase px-1">
              2. Dorso de Carta ({backModules.length})
            </div>
            {backModules.map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  setSelectedTarotModuleId(m.id);
                  setTarotInspectTarget('module');
                  setTarotSurfaceView('back');
                }}
                className={`flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg text-[10px] cursor-pointer ${
                  tarotInspectTarget === 'module' &&
                  selectedTarotModuleId === m.id
                    ? 'bg-cyan-950 border border-cyan-400 text-cyan-100 font-bold'
                    : 'bg-stone-950/70 hover:bg-stone-800 text-stone-300'
                }`}
              >
                <span className="truncate">{m.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    data-testid={`btn-copy-to-token-${m.id}`}
                    title="Copiar este módulo a la Ficha de Jugador (Mapa Táctico)"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateModule(m.id, 'token');
                    }}
                    className="px-1 py-0.5 rounded bg-emerald-950 hover:bg-emerald-800 border border-emerald-500/40 text-[8px] font-bold text-emerald-200"
                  >
                    +Ficha
                  </button>
                  <button
                    type="button"
                    title="Pasar al Anverso (Frente)"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePatchModule(m.id, { side: 'front' });
                    }}
                    className="p-0.5 hover:text-amber-300"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    title="Duplicar Módulo"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateModule(m.id);
                    }}
                    className="p-0.5 hover:text-cyan-300"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePatchModule(m.id, { visible: !m.visible });
                    }}
                    className={
                      m.visible ? 'text-emerald-400' : 'text-stone-600'
                    }
                  >
                    {m.visible ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Tactical Token Modules List */}
          <div className="space-y-1 pt-2 border-t border-stone-800">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-cinzel font-bold text-emerald-300 uppercase">
                3. Ficha de Jugador ({tokenModules.length})
              </span>
              <span className="text-[9px] font-mono text-emerald-400/80">
                Mapa Táctico
              </span>
            </div>
            {tokenModules.map((m) => (
              <div
                key={m.id}
                data-testid={`tree-token-module-${m.id}`}
                onClick={() => {
                  setSelectedTarotModuleId(m.id);
                  setTarotInspectTarget('module');
                  setTarotSurfaceView('token');
                }}
                className={`flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg text-[10px] cursor-pointer ${
                  tarotInspectTarget === 'module' &&
                  selectedTarotModuleId === m.id
                    ? 'bg-emerald-950 border border-emerald-400 text-emerald-100 font-bold'
                    : 'bg-stone-950/70 hover:bg-stone-800 text-stone-300'
                }`}
              >
                <span className="truncate">{m.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    title="Pasar al Anverso de la Carta"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePatchModule(m.id, { side: 'front' });
                    }}
                    className="p-0.5 hover:text-amber-300"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    title="Duplicar en Ficha"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateModule(m.id, 'token');
                    }}
                    className="p-0.5 hover:text-cyan-300"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePatchModule(m.id, { visible: !m.visible });
                    }}
                    className={
                      m.visible ? 'text-emerald-400' : 'text-stone-600'
                    }
                  >
                    {m.visible ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER COLUMN: Inspector for Selected Module OR Card Frame OR Token Frame */}
        <div className="xl:col-span-4 space-y-3">
          {tarotInspectTarget === 'token_frame' ? (
            <div
              data-testid="tarot-token-frame-inspector"
              className="p-4 rounded-2xl bg-stone-900/95 border border-emerald-500/40 space-y-3"
            >
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-[9px] font-bold text-emerald-300 uppercase">
                Marco y Perímetro Cuadrado de la Ficha de Jugador (Mapa Táctico)
              </span>
              <p className="text-[11px] text-stone-300">
                La ficha vive dentro de un cuadrado de cuadrícula. La base por defecto es circular con solo la imagen del personaje, pero puedes cambiar su figura, borde o añadir un GIF en loop alrededor sin rebasar el perímetro cuadrado.
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-stone-300 mb-1">
                    Perímetro Cuadrado ({tokenSquarePx}px)
                  </label>
                  <input
                    type="range"
                    min={120}
                    max={260}
                    value={tokenSquarePx}
                    onChange={(e) =>
                      commitTarotConfig({
                        ...tarotConfig,
                        tokenSquareSizePx: Number(e.target.value) || 180,
                      })
                    }
                    className="w-full accent-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-stone-300 mb-1">
                    Tamaño Figura Interior ({tokenInnerPct}%)
                  </label>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    value={tokenInnerPct}
                    onChange={(e) =>
                      commitTarotConfig({
                        ...tarotConfig,
                        tokenInnerRatioPercent: Number(e.target.value) || 80,
                      })
                    }
                    className="w-full accent-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-stone-300 mb-1">
                    Figura Base de la Ficha
                  </label>
                  <select
                    data-testid="select-token-frame-shape"
                    value={tokenShape}
                    onChange={(e) =>
                      commitTarotConfig({
                        ...tarotConfig,
                        tokenShape: e.target.value as GeometricShapeType,
                      })
                    }
                    className="w-full px-2 py-1.5 rounded bg-stone-950 border border-stone-700 text-xs text-white"
                  >
                    {GEOMETRIC_SHAPES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-stone-300 mb-1">
                    Grosor Borde Ficha ({tarotConfig.tokenBorderWidthPx ?? 3}px)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={tarotConfig.tokenBorderWidthPx ?? 3}
                    onChange={(e) =>
                      commitTarotConfig({
                        ...tarotConfig,
                        tokenBorderWidthPx: Number(e.target.value),
                        tokenHideBorder: Number(e.target.value) <= 0,
                      })
                    }
                    className="w-full accent-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[9px] text-stone-400 mb-1">
                    Color Fondo de Ficha
                  </label>
                  <input
                    type="color"
                    value={tarotConfig.tokenBgColor || '#141824'}
                    onChange={(e) =>
                      commitTarotConfig({
                        ...tarotConfig,
                        tokenBgColor: e.target.value,
                      })
                    }
                    className="w-full h-8 rounded bg-stone-950 border border-stone-700"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-stone-400 mb-1">
                    Color Borde de Ficha
                  </label>
                  <input
                    type="color"
                    value={tarotConfig.tokenBorderColor || '#c8a45c'}
                    onChange={(e) =>
                      commitTarotConfig({
                        ...tarotConfig,
                        tokenBorderColor: e.target.value,
                      })
                    }
                    className="w-full h-8 rounded bg-stone-950 border border-stone-700"
                  />
                </div>
              </div>

              <ImageSourcePicker
                label="Marco PNG Alrededor de la Ficha (Dentro del Cuadrado)"
                value={tarotConfig.tokenCustomFramePngUrl || ''}
                onChange={(url) =>
                  commitTarotConfig({
                    ...tarotConfig,
                    tokenCustomFramePngUrl: url,
                  })
                }
              />

              <ImageSourcePicker
                label="GIF en Loop de Animación Alrededor del Borde (Sin Rebasar el Cuadrado)"
                value={tarotConfig.tokenAnimatedBorderGifUrl || ''}
                onChange={(url) =>
                  commitTarotConfig({
                    ...tarotConfig,
                    tokenAnimatedBorderGifUrl: url,
                  })
                }
              />
            </div>
          ) : tarotInspectTarget === 'card_frame' || !selectedModule ? (
            <div
              data-testid="tarot-card-frame-inspector"
              className="p-4 rounded-2xl bg-stone-900/95 border border-amber-500/40 space-y-3"
            >
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-[9px] font-bold text-amber-300 uppercase">
                Dimensiones y Marco de la Carta (Anverso y Dorso)
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-stone-300 mb-1">
                    Ancho de Carta ({cardW}px)
                  </label>
                  <input
                    type="range"
                    min={200}
                    max={460}
                    value={cardW}
                    onChange={(e) =>
                      commitTarotConfig({
                        ...tarotConfig,
                        cardWidthPx: Number(e.target.value) || 290,
                      })
                    }
                    className="w-full accent-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-stone-300 mb-1">
                    Alto de Carta ({cardH}px)
                  </label>
                  <input
                    type="range"
                    min={260}
                    max={640}
                    value={cardH}
                    onChange={(e) =>
                      commitTarotConfig({
                        ...tarotConfig,
                        cardHeightPx: Number(e.target.value) || 450,
                      })
                    }
                    className="w-full accent-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-stone-300 mb-1">
                    Figura Exterior de la Carta
                  </label>
                  <select
                    value={tarotConfig.cardShape || 'rounded'}
                    onChange={(e) =>
                      commitTarotConfig({
                        ...tarotConfig,
                        cardShape: e.target.value as GeometricShapeType,
                      })
                    }
                    className="w-full px-2 py-1.5 rounded bg-stone-950 border border-stone-700 text-xs text-white"
                  >
                    {GEOMETRIC_SHAPES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-stone-300 mb-1">
                    Margen Exterior Bleed ({bleedPct}%)
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={35}
                    value={bleedPct}
                    onChange={(e) =>
                      commitTarotConfig({
                        ...tarotConfig,
                        outerBleedPercent: Number(e.target.value) || 20,
                      })
                    }
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] text-stone-400 mb-1">
                    Fondo Anverso
                  </label>
                  <input
                    type="color"
                    value={tarotConfig.frontBgColor || '#1a1f2c'}
                    onChange={(e) =>
                      commitTarotConfig({
                        ...tarotConfig,
                        frontBgColor: e.target.value,
                      })
                    }
                    className="w-full h-8 rounded bg-stone-950 border border-stone-700"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-stone-400 mb-1">
                    Fondo Dorso
                  </label>
                  <input
                    type="color"
                    value={tarotConfig.backBgColor || '#120e1c'}
                    onChange={(e) =>
                      commitTarotConfig({
                        ...tarotConfig,
                        backBgColor: e.target.value,
                      })
                    }
                    className="w-full h-8 rounded bg-stone-950 border border-stone-700"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-stone-400 mb-1">
                    Color Borde
                  </label>
                  <input
                    type="color"
                    value={tarotConfig.borderColor || '#c8a45c'}
                    onChange={(e) =>
                      commitTarotConfig({
                        ...tarotConfig,
                        borderColor: e.target.value,
                      })
                    }
                    className="w-full h-8 rounded bg-stone-950 border border-stone-700"
                  />
                </div>
              </div>

              <ImageSourcePicker
                label="PNG / Arte de Fondo del Anverso (Frente)"
                value={tarotConfig.frontBgImageUrl || ''}
                onChange={(url) =>
                  commitTarotConfig({
                    ...tarotConfig,
                    frontBgImageUrl: url,
                    frontCustomPngUrl: url,
                  })
                }
              />
              <ImageSourcePicker
                label="PNG / Arte de Fondo del Dorso (Reverso)"
                value={tarotConfig.backBgImageUrl || ''}
                onChange={(url) =>
                  commitTarotConfig({
                    ...tarotConfig,
                    backBgImageUrl: url,
                    backCustomPngUrl: url,
                  })
                }
              />
              <ImageSourcePicker
                label="Marco GIF / PNG Animado en Borde Exterior (Opcional)"
                value={tarotConfig.animatedBorderGifUrl || ''}
                onChange={(url) =>
                  commitTarotConfig({
                    ...tarotConfig,
                    animatedBorderGifUrl: url,
                  })
                }
              />
            </div>
          ) : (
            <div
              data-testid="tarot-module-inspector"
              className="p-4 rounded-2xl bg-stone-900/95 border border-cyan-500/40 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2">
                <div>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-[9px] font-bold text-cyan-300 uppercase">
                    Módulo en{' '}
                    {selectedModule.side === 'front'
                      ? 'Anverso'
                      : selectedModule.side === 'back'
                      ? 'Dorso'
                      : 'Ficha de Jugador'}
                  </span>
                  <h4 className="text-xs font-cinzel font-bold text-white mt-1">
                    {selectedModule.name}
                  </h4>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    data-testid="btn-duplicate-tarot-module"
                    onClick={() => handleDuplicateModule(selectedModule.id)}
                    className="px-2 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-400/50 text-[10px] font-bold text-cyan-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> Duplicar
                  </button>
                  {selectedModule.side !== 'token' && (
                    <button
                      type="button"
                      data-testid="btn-copy-tarot-module-to-token"
                      onClick={() =>
                        handleDuplicateModule(selectedModule.id, 'token')
                      }
                      className="px-2 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-400/60 text-[10px] font-bold text-emerald-200 flex items-center gap-1 cursor-pointer"
                      title="Copiar este módulo (ej. Vida, Oro, Alineamiento) a la Ficha de Jugador"
                    >
                      <Copy className="w-3 h-3" /> Copiar a Ficha
                    </button>
                  )}
                  <button
                    type="button"
                    data-testid="btn-flip-tarot-module-side"
                    onClick={() =>
                      handlePatchModule(selectedModule.id, {
                        side:
                          selectedModule.side === 'front'
                            ? 'back'
                            : selectedModule.side === 'back'
                            ? 'token'
                            : 'front',
                      })
                    }
                    className="px-2 py-1 rounded-lg bg-amber-950 hover:bg-amber-900 border border-amber-400/50 text-[10px] font-bold text-amber-200 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3 h-3" /> Mover a{' '}
                    {selectedModule.side === 'front'
                      ? 'Dorso'
                      : selectedModule.side === 'back'
                      ? 'Ficha'
                      : 'Anverso'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteModule(selectedModule.id)}
                    className="p-1 rounded-lg bg-red-950/70 hover:bg-red-900 border border-red-500/40 text-red-300"
                    title="Eliminar módulo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Label (can be cleared to "") & Example Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-stone-300">
                      Etiqueta (Ej. FUE, PG, CA)
                    </label>
                    <button
                      type="button"
                      data-testid="btn-clear-tarot-module-label"
                      onClick={() =>
                        handlePatchModule(selectedModule.id, { label: '' })
                      }
                      className="text-[9px] text-cyan-300 hover:underline"
                    >
                      Vaciar etiqueta
                    </button>
                  </div>
                  <input
                    type="text"
                    value={selectedModule.label}
                    onChange={(e) =>
                      handlePatchModule(selectedModule.id, {
                        label: e.target.value,
                      })
                    }
                    placeholder="(Sin texto / Usar PNG)"
                    className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-300 mb-1">
                    Valor Ejemplo (En vivo usa el del Héroe)
                  </label>
                  <input
                    type="text"
                    value={selectedModule.exampleValue}
                    onChange={(e) =>
                      handlePatchModule(selectedModule.id, {
                        exampleValue: e.target.value,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-700 text-xs text-white"
                  />
                </div>
              </div>

              {/* Coordinates X, Y (can be negative to enter the 20% bleed margin!) & Size W, H */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[9px] text-stone-400">
                    Posición X (px)
                  </label>
                  <input
                    type="number"
                    value={selectedModule.x}
                    onChange={(e) =>
                      handlePatchModule(selectedModule.id, {
                        x: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-stone-400">
                    Posición Y (px)
                  </label>
                  <input
                    type="number"
                    value={selectedModule.y}
                    onChange={(e) =>
                      handlePatchModule(selectedModule.id, {
                        y: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-stone-400">
                    Ancho W (px)
                  </label>
                  <input
                    type="number"
                    min={20}
                    value={selectedModule.widthPx}
                    onChange={(e) =>
                      handlePatchModule(selectedModule.id, {
                        widthPx: Math.max(20, Number(e.target.value) || 60),
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-stone-400">
                    Alto H (px)
                  </label>
                  <input
                    type="number"
                    min={16}
                    value={selectedModule.heightPx}
                    onChange={(e) =>
                      handlePatchModule(selectedModule.id, {
                        heightPx: Math.max(16, Number(e.target.value) || 32),
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Shape, Edge Fade & Frame Opacity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-stone-300 mb-1">
                    Figura Geométrica
                  </label>
                  <select
                    value={selectedModule.shape}
                    onChange={(e) =>
                      handlePatchModule(selectedModule.id, {
                        shape: e.target.value as GeometricShapeType,
                      })
                    }
                    className="w-full px-2 py-1.5 rounded bg-stone-950 border border-stone-700 text-xs text-white"
                  >
                    {GEOMETRIC_SHAPES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-stone-300 mb-1">
                    Difuminado ({selectedModule.edgeFadePercent || 0}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={selectedModule.edgeFadePercent || 0}
                    onChange={(e) =>
                      handlePatchModule(selectedModule.id, {
                        edgeFadePercent: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full accent-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-stone-300 mb-1">
                    Opacidad Caja ({Math.round((selectedModule.boxBgOpacity ?? 0.9) * 100)}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={selectedModule.boxBgOpacity ?? 0.9}
                    onChange={(e) =>
                      handlePatchModule(selectedModule.id, {
                        boxBgOpacity: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>

              {/* Modular HP Bar Constructor (when kind === 'hp_bar') */}
              {selectedModule.kind === 'hp_bar' && (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2.5">
                  <div className="text-[10px] font-cinzel font-bold text-emerald-300 uppercase">
                    Constructor Modular de Barra de Vida (Sin Estilos Prediseñados)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-stone-300 mb-1">
                        Dirección de Llenado
                      </label>
                      <select
                        value={selectedModule.fillDirection || 'left_to_right'}
                        onChange={(e) =>
                          handlePatchModule(selectedModule.id, {
                            fillDirection: e.target.value as any,
                          })
                        }
                        className="w-full px-2 py-1 rounded bg-stone-950 border border-stone-700 text-[11px] text-white"
                      >
                        <option value="left_to_right">Izquierda a Derecha (→)</option>
                        <option value="right_to_left">Derecha a Izquierda (←)</option>
                        <option value="bottom_to_top">Abajo hacia Arriba (↑)</option>
                        <option value="top_to_bottom">Arriba hacia Abajo (↓)</option>
                      </select>
                    </div>
                    <div className="flex items-center pt-4">
                      <label className="flex items-center gap-1.5 text-[10px] text-stone-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedModule.showNumericText !== false}
                          onChange={(e) =>
                            handlePatchModule(selectedModule.id, {
                              showNumericText: e.target.checked,
                            })
                          }
                        />
                        <span>Mostrar números (44/44)</span>
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-stone-400 mb-1">
                        Color Relleno Vida
                      </label>
                      <input
                        type="color"
                        value={selectedModule.fillColor || '#22b573'}
                        onChange={(e) =>
                          handlePatchModule(selectedModule.id, {
                            fillColor: e.target.value,
                          })
                        }
                        className="w-full h-7 rounded bg-stone-950 border border-stone-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-stone-400 mb-1">
                        Color Fondo Vacío
                      </label>
                      <input
                        type="color"
                        value={selectedModule.emptyBgColor || '#0e1118'}
                        onChange={(e) =>
                          handlePatchModule(selectedModule.id, {
                            emptyBgColor: e.target.value,
                          })
                        }
                        className="w-full h-7 rounded bg-stone-950 border border-stone-700"
                      />
                    </div>
                  </div>
                  <ImageSourcePicker
                    label="PNG / GIF de Relleno Líquido o Textura de Vida"
                    value={selectedModule.fillTexturePngUrl || ''}
                    onChange={(url) =>
                      handlePatchModule(selectedModule.id, {
                        fillTexturePngUrl: url,
                      })
                    }
                  />
                  <ImageSourcePicker
                    label="PNG / GIF de Marco Superpuesto a la Barra"
                    value={selectedModule.frameOverlayPngUrl || ''}
                    onChange={(url) =>
                      handlePatchModule(selectedModule.id, {
                        frameOverlayPngUrl: url,
                      })
                    }
                  />
                </div>
              )}

              {/* Colors & Custom PNG/GIF for Module */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] text-stone-400 mb-1">
                    Fondo Módulo
                  </label>
                  <input
                    type="color"
                    value={selectedModule.bgColor || '#11141d'}
                    onChange={(e) =>
                      handlePatchModule(selectedModule.id, {
                        bgColor: e.target.value,
                      })
                    }
                    className="w-full h-8 rounded bg-stone-950 border border-stone-700"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-stone-400 mb-1">
                    Borde Módulo
                  </label>
                  <input
                    type="color"
                    value={selectedModule.borderColor || '#c8a45c'}
                    onChange={(e) =>
                      handlePatchModule(selectedModule.id, {
                        borderColor: e.target.value,
                      })
                    }
                    className="w-full h-8 rounded bg-stone-950 border border-stone-700"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-stone-400 mb-1">
                    Color Valor
                  </label>
                  <input
                    type="color"
                    value={selectedModule.textColor || '#ffffff'}
                    onChange={(e) =>
                      handlePatchModule(selectedModule.id, {
                        textColor: e.target.value,
                      })
                    }
                    className="w-full h-8 rounded bg-stone-950 border border-stone-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <ImageSourcePicker
                  label="PNG / GIF de Fondo del Módulo"
                  value={selectedModule.bgImageUrl || ''}
                  onChange={(url) =>
                    handlePatchModule(selectedModule.id, { bgImageUrl: url })
                  }
                />
                <ImageSourcePicker
                  label="Icono PNG (Reemplaza o acompaña etiqueta)"
                  value={selectedModule.customIconUrl || ''}
                  onChange={(url) =>
                    handlePatchModule(selectedModule.id, {
                      customIconUrl: url,
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Surface View Switcher + Anverso / Dorso / Ficha de Jugador */}
        <div className="xl:col-span-5 space-y-4 p-4 rounded-2xl bg-stone-900/90 border border-stone-800 overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2">
            <div>
              <span className="font-cinzel font-bold text-amber-200 text-xs block">
                Lienzo Modular de Carta y Ficha
              </span>
              <span className="text-[10px] text-stone-400">
                Alterna fácilmente entre Frente, Reverso y Ficha Táctica
              </span>
            </div>
            {/* Direct Switcher Tabs */}
            <div className="flex flex-wrap items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
              <button
                type="button"
                data-testid="btn-tarot-view-front"
                onClick={() => setTarotSurfaceView('front')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-cinzel font-bold transition cursor-pointer ${
                  tarotSurfaceView === 'front'
                    ? 'bg-amber-500 text-stone-950 font-black shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                🎴 Frente (Anverso)
              </button>
              <button
                type="button"
                data-testid="btn-tarot-view-back"
                onClick={() => setTarotSurfaceView('back')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-cinzel font-bold transition cursor-pointer ${
                  tarotSurfaceView === 'back'
                    ? 'bg-purple-600 text-white font-black shadow'
                    : 'text-purple-300 hover:text-purple-100'
                }`}
              >
                🔄 Reverso (Dorso)
              </button>
              <button
                type="button"
                data-testid="btn-tarot-view-token"
                onClick={() => setTarotSurfaceView('token')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-cinzel font-bold transition cursor-pointer ${
                  tarotSurfaceView === 'token'
                    ? 'bg-emerald-500 text-stone-950 font-black shadow'
                    : 'text-emerald-300 hover:text-emerald-100'
                }`}
              >
                🛡️ Ficha Táctica
              </button>
              <button
                type="button"
                data-testid="btn-tarot-view-all"
                onClick={() => setTarotSurfaceView('all')}
                className={`px-2 py-1 rounded-lg text-[10px] font-cinzel font-bold transition cursor-pointer ${
                  tarotSurfaceView === 'all'
                    ? 'bg-cyan-600 text-white font-black shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                👁️ Ver Todo
              </button>
            </div>
          </div>

          {/* Quick prominent flip button when viewing single card side */}
          {tarotSurfaceView !== 'all' && tarotSurfaceView !== 'token' && (
            <div className="flex justify-center">
              <button
                type="button"
                data-testid="btn-quick-flip-tarot-surface"
                onClick={() =>
                  setTarotSurfaceView((curr) => (curr === 'front' ? 'back' : 'front'))
                }
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-purple-500/30 border border-amber-400/50 text-amber-200 text-xs font-cinzel font-bold cursor-pointer transition shadow"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Voltear a {tarotSurfaceView === 'front' ? 'Parte Trasera / Dorso (Reverso)' : 'Frente (Anverso)'}
                </span>
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-start justify-center gap-6 py-2">
            {(tarotSurfaceView === 'front' || tarotSurfaceView === 'all') &&
              renderTarotSideCanvas('front')}
            {(tarotSurfaceView === 'back' || tarotSurfaceView === 'all') &&
              renderTarotSideCanvas('back')}
          </div>
          {(tarotSurfaceView === 'token' || tarotSurfaceView === 'all') &&
            renderTarotTokenCanvas()}
        </div>
      </div>
    );
  };

  return (
    <div
      data-testid="player-skin-four-apartados-editor"
      className="space-y-4"
    >
      {/* Top 4 Apartados Navigation Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 p-2 rounded-2xl bg-stone-950/90 border border-amber-500/30 shadow-lg">
        {[
          {
            id: 'apartado_1_sheet',
            title: 'Apartado 1: Hoja de Personaje 1:1',
            subtitle: 'Bloques, Sala en Vivo y Botones Arrastrables',
            icon: Layers,
          },
          {
            id: 'apartado_2_map',
            title: 'Apartado 2: Modo Mapa 1:1',
            subtitle: 'Lienzo, Mazos, Dados y Dock Miniatura',
            icon: MapIcon,
          },
          {
            id: 'apartado_3_graphics',
            title: 'Apartado 3: Figuras, Mazos y Pop-ups 1:1',
            subtitle: 'Polígonos SVG, 1–24 PNGs, Stats y 4 Pop-ups',
            icon: Shapes,
          },
          {
            id: 'apartado_4_tarot',
            title: 'Apartado 4: Carta y Ficha Táctica Modular',
            subtitle: 'Anverso/Dorso, Ficha de Jugador y Copiar Módulos',
            icon: Sparkles,
          },
        ].map((ap) => {
          const IconComp = ap.icon;
          const isActive = activeApartado === ap.id;
          return (
            <button
              key={ap.id}
              type="button"
              data-testid={`tab-player-skin-${ap.id}`}
              onClick={() => setActiveApartado(ap.id as PlayerSkinApartadoId)}
              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-br from-amber-500/25 via-amber-900/20 to-stone-900 border-amber-400 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                  : 'bg-stone-900/80 border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                    : 'bg-stone-950 text-stone-500'
                }`}
              >
                <IconComp className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-cinzel font-bold truncate">
                  {ap.title}
                </div>
                <div className="text-[10px] opacity-80 truncate mt-0.5">
                  {ap.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Render Active Apartado */}
      {activeApartado === 'apartado_1_sheet' && renderApartado1SheetBuilder()}
      {activeApartado === 'apartado_2_map' && renderApartado2MapBuilder()}
      {activeApartado === 'apartado_3_graphics' && renderApartado3GraphicsStudio()}
      {activeApartado === 'apartado_4_tarot' && renderApartado4TarotStudio()}
    </div>
  );
};
