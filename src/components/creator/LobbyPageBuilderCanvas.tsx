import React, { useRef, useState } from 'react';
import {
  BookOpen,
  Compass,
  Copy,
  Crown,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FilePlus,
  Globe,
  GripHorizontal,
  Layers,
  LogOut,
  Maximize2,
  Megaphone,
  MessageSquare,
  Move,
  Palette,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Swords,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Wand2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type {
  AppSkinThemeTokens,
  LobbyBlockId,
  LobbyBlockLayoutConfig,
  LobbyInnerButtonConfig,
  LobbyPageLayoutConfig,
} from '../../types/dnd';
import {
  computeLobbyBlockContainerStyle,
  computeLobbyInnerButtonStyle,
  resetLobbyBlockToDefault,
  updateLobbyBlock,
  updateLobbyInnerButton,
} from '../../utils/lobbyPageLayout';

interface LobbyPageBuilderCanvasProps {
  layout: LobbyPageLayoutConfig;
  themeTokens: AppSkinThemeTokens;
  selectedBlockId: LobbyBlockId;
  selectedButtonId: string | null;
  onSelectBlock: (blockId: LobbyBlockId, buttonId?: string | null) => void;
  onChangeLayout: (nextLayout: LobbyPageLayoutConfig) => void;
}

export const LobbyPageBuilderCanvas: React.FC<LobbyPageBuilderCanvasProps> = ({
  layout,
  themeTokens,
  selectedBlockId,
  selectedButtonId,
  onSelectBlock,
  onChangeLayout,
}) => {
  const [zoom, setZoom] = useState<number>(0.55);
  const [interactiveEditMode, setInteractiveEditMode] = useState<'move_resize' | 'preview'>('move_resize');
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Active drag/resize state
  const [dragState, setDragState] = useState<{
    kind: 'move_block' | 'resize_block' | 'move_button';
    blockId: LobbyBlockId;
    buttonId?: string;
    resizeAxis?: 'e' | 's' | 'se';
    startClientX: number;
    startClientY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
  } | null>(null);

  const startBlockDrag = (
    e: React.MouseEvent,
    blockId: LobbyBlockId,
    kind: 'move_block' | 'resize_block',
    resizeAxis?: 'e' | 's' | 'se',
    fallbackDOMRect?: DOMRect
  ) => {
    if (interactiveEditMode === 'preview') return;
    e.stopPropagation();
    e.preventDefault();
    onSelectBlock(blockId, null);

    const block = layout.blocks[blockId];
    if (!block) return;

    const currentW =
      block.widthPx > 0
        ? block.widthPx
        : fallbackDOMRect
        ? Math.round(fallbackDOMRect.width / zoom)
        : 600;
    const currentH =
      block.heightPx > 0
        ? block.heightPx
        : fallbackDOMRect
        ? Math.round(fallbackDOMRect.height / zoom)
        : 220;

    setDragState({
      kind,
      blockId,
      resizeAxis,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialX: block.x || 0,
      initialY: block.y || 0,
      initialW: currentW,
      initialH: currentH,
    });
  };

  const startButtonDrag = (
    e: React.MouseEvent,
    blockId: LobbyBlockId,
    buttonId: string
  ) => {
    if (interactiveEditMode === 'preview') return;
    e.stopPropagation();
    onSelectBlock(blockId, buttonId);

    const btn = layout.blocks[blockId]?.innerButtonsConfig?.[buttonId];
    if (!btn) return;

    setDragState({
      kind: 'move_button',
      blockId,
      buttonId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialX: btn.x || 0,
      initialY: btn.y || 0,
      initialW: btn.widthPx || 0,
      initialH: btn.heightPx || 0,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState) return;
    const dx = Math.round((e.clientX - dragState.startClientX) / zoom);
    const dy = Math.round((e.clientY - dragState.startClientY) / zoom);

    if (dragState.kind === 'move_block') {
      onChangeLayout(
        updateLobbyBlock(layout, dragState.blockId, {
          x: dragState.initialX + dx,
          y: dragState.initialY + dy,
        })
      );
    } else if (dragState.kind === 'resize_block') {
      const patch: Partial<LobbyBlockLayoutConfig> = {};
      if (dragState.resizeAxis === 'e' || dragState.resizeAxis === 'se') {
        patch.widthPx = Math.max(180, dragState.initialW + dx);
      }
      if (dragState.resizeAxis === 's' || dragState.resizeAxis === 'se') {
        patch.heightPx = Math.max(48, dragState.initialH + dy);
      }
      onChangeLayout(updateLobbyBlock(layout, dragState.blockId, patch));
    } else if (dragState.kind === 'move_button' && dragState.buttonId) {
      onChangeLayout(
        updateLobbyInnerButton(layout, dragState.blockId, dragState.buttonId, {
          x: dragState.initialX + dx,
          y: dragState.initialY + dy,
        })
      );
    }
  };

  const handleMouseUp = () => {
    if (dragState) {
      setDragState(null);
    }
  };

  const renderInnerButton = (
    blockId: LobbyBlockId,
    btnId: string,
    defaultIcon: React.ReactNode,
    extraClassName = ''
  ) => {
    const block = layout.blocks[blockId];
    const btn: LobbyInnerButtonConfig | undefined = block?.innerButtonsConfig?.[btnId];
    if (!btn || btn.visible === false || (typeof btn.opacity === 'number' && btn.opacity <= 0.001)) {
      return null;
    }

    const isSelected = selectedBlockId === blockId && selectedButtonId === btnId;
    const btnStyle = computeLobbyInnerButtonStyle(btn);
    const iconPx = btn.iconSizePx || block?.iconSizePx || 14;

    return (
      <button
        key={btnId}
        type="button"
        onMouseDown={(e) => startButtonDrag(e, blockId, btnId)}
        onClick={(e) => {
          e.stopPropagation();
          onSelectBlock(blockId, btnId);
        }}
        style={btnStyle}
        title={`Clic para editar botón "${btn.label || btnId}" · Arrastra para mover`}
        className={`group/btn inline-flex items-center gap-1.5 font-semibold transition-all select-none ${
          interactiveEditMode === 'move_resize' ? 'cursor-move' : 'cursor-pointer'
        } ${
          isSelected
            ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-stone-950 shadow-lg shadow-amber-500/20'
            : 'hover:ring-1 hover:ring-amber-400/60'
        } ${extraClassName}`}
      >
        {btn.customIconUrl ? (
          <img
            src={btn.customIconUrl}
            alt=""
            style={{ width: `${iconPx}px`, height: `${iconPx}px` }}
            className="object-contain shrink-0"
          />
        ) : (
          <span
            style={{ width: `${iconPx}px`, height: `${iconPx}px` }}
            className="inline-flex items-center justify-center shrink-0"
          >
            {defaultIcon}
          </span>
        )}
        <span>{btn.label ?? btnId}</span>
      </button>
    );
  };

  /**
   * Wraps each real Lobby container block with interactive Shopify/Figma selection chrome,
   * pixel coordinate badge, drag bar, and 3 resize handles (Right, Bottom, Bottom-Right).
   */
  const renderInteractiveBlockWrapper = (
    blockId: LobbyBlockId,
    children: React.ReactNode,
    gridLayoutClass = 'w-full'
  ) => {
    const block = layout.blocks[blockId];
    if (!block) return null;

    const isHidden = !block.visible || block.opacity <= 0.001;
    if (isHidden && interactiveEditMode === 'preview') {
      return null;
    }

    const isSelected = selectedBlockId === blockId && !selectedButtonId;
    const isParentOfSelectedBtn = selectedBlockId === blockId && !!selectedButtonId;
    const containerStyle = computeLobbyBlockContainerStyle(block);

    // If hidden but in editor mode, show ghosted placeholder so the creator can still click & unhide it
    if (isHidden) {
      return (
        <div
          key={blockId}
          onClick={(e) => {
            e.stopPropagation();
            onSelectBlock(blockId, null);
          }}
          className={`${gridLayoutClass} relative rounded-xl border-2 border-dashed border-stone-700/80 bg-stone-950/40 p-3 flex items-center justify-between cursor-pointer opacity-55 hover:opacity-90`}
        >
          <span className="text-xs text-stone-400 flex items-center gap-2">
            <EyeOff className="w-3.5 h-3.5 text-rose-400" />
            Capa Oculta / Opacidad 0%: <strong>{block.name}</strong>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangeLayout(
                updateLobbyBlock(layout, blockId, {
                  visible: true,
                  opacity: block.opacity <= 0.01 ? 1 : block.opacity,
                })
              );
            }}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-[11px] font-semibold"
          >
            Mostrar Bloque
          </button>
        </div>
      );
    }

    return (
      <div
        key={blockId}
        data-builder-block={blockId}
        onClick={(e) => {
          e.stopPropagation();
          onSelectBlock(blockId, null);
        }}
        style={containerStyle}
        className={`${gridLayoutClass} group/block relative select-none ${
          interactiveEditMode === 'move_resize'
            ? isSelected
              ? 'ring-2 ring-amber-400 shadow-[0_0_0_4px_rgba(245,158,11,0.18)]'
              : isParentOfSelectedBtn
              ? 'ring-1 ring-amber-400/60'
              : 'hover:ring-1 hover:ring-amber-400/50'
            : ''
        }`}
      >
        {/* Top Floating Builder HUD Tag (Visible on hover or selection in move_resize mode) */}
        {interactiveEditMode === 'move_resize' && (
          <div
            onMouseDown={(e) => {
              const rect = e.currentTarget.parentElement?.getBoundingClientRect();
              startBlockDrag(e, blockId, 'move_block', undefined, rect);
            }}
            className={`absolute -top-7 left-2 z-50 flex items-center gap-2 px-2.5 py-1 rounded-t-lg text-[10px] font-bold tracking-wide cursor-move transition-opacity ${
              isSelected || isParentOfSelectedBtn
                ? 'opacity-100 bg-amber-500 text-stone-950 shadow-md'
                : 'opacity-0 group-hover/block:opacity-100 bg-stone-900/95 text-amber-200 border border-amber-500/40'
            }`}
          >
            <GripHorizontal className="w-3.5 h-3.5" />
            <span>{block.name}</span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-black/25">
              X:{block.x}px Y:{block.y}px · W:{block.widthPx > 0 ? `${block.widthPx}px` : 'Auto'} · H:
              {block.heightPx > 0 ? `${block.heightPx}px` : 'Auto'} · Marco:{Math.round(block.boxBgOpacity * 100)}%
            </span>
            {(block.x !== 0 || block.y !== 0 || block.widthPx > 0 || block.heightPx > 0) && (
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeLayout(
                    updateLobbyBlock(layout, blockId, {
                      x: 0,
                      y: 0,
                      widthPx: 0,
                      heightPx: 0,
                    })
                  );
                }}
                title="Restaurar posición y tamaño original"
                className="ml-1 px-1.5 py-0.5 rounded bg-black/30 hover:bg-black/50 text-[9px] inline-flex items-center gap-0.5"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Reset Pos
              </button>
            )}
          </div>
        )}

        {/* Actual Real Lobby Block Content */}
        {children}

        {/* 3 Resize Handles (Right, Bottom, Bottom-Right Corner) */}
        {interactiveEditMode === 'move_resize' && (
          <>
            {/* East (Width) Handle */}
            <div
              onMouseDown={(e) => {
                const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                startBlockDrag(e, blockId, 'resize_block', 'e', rect);
              }}
              title="Arrastra para cambiar el Ancho (Width en px)"
              className={`absolute top-1/2 -right-2 -translate-y-1/2 w-3.5 h-12 rounded-full cursor-ew-resize z-50 flex items-center justify-center transition-opacity ${
                isSelected
                  ? 'opacity-100 bg-amber-400 text-stone-950 shadow'
                  : 'opacity-0 group-hover/block:opacity-100 bg-amber-500/80 text-stone-950'
              }`}
            >
              <div className="w-0.5 h-5 bg-stone-950 rounded-full" />
            </div>

            {/* South (Height) Handle */}
            <div
              onMouseDown={(e) => {
                const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                startBlockDrag(e, blockId, 'resize_block', 's', rect);
              }}
              title="Arrastra para cambiar el Alto (Height en px)"
              className={`absolute -bottom-2 left-1/2 -translate-x-1/2 h-3.5 w-14 rounded-full cursor-ns-resize z-50 flex items-center justify-center transition-opacity ${
                isSelected
                  ? 'opacity-100 bg-amber-400 text-stone-950 shadow'
                  : 'opacity-0 group-hover/block:opacity-100 bg-amber-500/80 text-stone-950'
              }`}
            >
              <div className="h-0.5 w-6 bg-stone-950 rounded-full" />
            </div>

            {/* South-East (Corner Width + Height) Handle */}
            <div
              onMouseDown={(e) => {
                const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                startBlockDrag(e, blockId, 'resize_block', 'se', rect);
              }}
              title="Arrastra esquina para redimensionar Ancho y Alto (px)"
              className={`absolute -bottom-2.5 -right-2.5 w-5 h-5 rounded-md cursor-nwse-resize z-50 flex items-center justify-center transition-opacity ${
                isSelected
                  ? 'opacity-100 bg-amber-400 text-stone-950 shadow-md ring-2 ring-stone-950'
                  : 'opacity-0 group-hover/block:opacity-100 bg-amber-500 text-stone-950'
              }`}
            >
              <Maximize2 className="w-3 h-3 rotate-90" />
            </div>
          </>
        )}
      </div>
    );
  };

  // ============================================================================
  // EXACT REAL LOBBY BLOCK RENDERERS (1:1 WITH App.tsx & LobbyPortalView.tsx)
  // ============================================================================

  const renderRealTopHeaderBlock = () => {
    const block = layout.blocks.top_header;
    const headerIcons: Record<string, React.ReactNode> = {
      manual: <BookOpen className="w-full h-full" />,
      sabio: <Sparkles className="w-full h-full" />,
      account: <Settings className="w-full h-full" />,
      admin: <Shield className="w-full h-full" />,
      creator: <Palette className="w-full h-full" />,
      moderation: <Users className="w-full h-full" />,
      feedback: <MessageSquare className="w-full h-full" />,
    };

    return renderInteractiveBlockWrapper(
      'top_header',
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Left Brand: Logo + WEROLL + v1.3 Beta ? */}
        <div
          onMouseDown={(e) => {
            const rect = e.currentTarget.closest('[data-builder-block]')?.getBoundingClientRect();
            startBlockDrag(e, 'top_header', 'move_block', undefined, rect);
          }}
          className="flex items-center gap-3 cursor-move"
        >
          <div
            style={{
              width: `${block.avatarSizePx || 40}px`,
              height: `${block.avatarSizePx || 40}px`,
            }}
            className="rounded-xl bg-gradient-to-br from-amber-500/25 to-stone-900 border border-amber-500/40 flex items-center justify-center shadow-inner overflow-hidden shrink-0"
          >
            {themeTokens.customLogoUrl ? (
              <img src={themeTokens.customLogoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <Compass className="w-6 h-6 text-amber-400" />
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <span
              style={{
                fontSize: `${block.titleFontSizePx || 22}px`,
                color: block.titleColor || '#f59e0b',
                fontFamily: block.fontFamily || "'Cinzel', serif",
              }}
              className="font-bold tracking-[0.18em] uppercase"
            >
              {block.titleText || themeTokens.brandTitleText || 'WEROLL'}
            </span>
            {block.subtitleText !== '' && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/80 border border-amber-600/40 text-amber-300">
                {block.subtitleText || 'v1.3 Beta ?'}
              </span>
            )}
          </div>
        </div>

        {/* Right Utility Buttons (Exact icon-above-label layout from App.tsx) */}
        <div className="flex flex-wrap items-center gap-2">
          {block.innerButtonsOrder.map((btnId) => {
            const btn = block.innerButtonsConfig[btnId];
            if (!btn || btn.visible === false || (typeof btn.opacity === 'number' && btn.opacity <= 0.001)) {
              return null;
            }
            const isSelected = selectedBlockId === 'top_header' && selectedButtonId === btnId;
            const btnStyle = computeLobbyInnerButtonStyle(btn);
            const iconPx = btn.iconSizePx || block.iconSizePx || 16;

            return (
              <button
                key={btnId}
                type="button"
                onMouseDown={(e) => startButtonDrag(e, 'top_header', btnId)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectBlock('top_header', btnId);
                }}
                style={btnStyle}
                title={`Botón de Cabecera "${btn.label}" · Clic para editar o arrastra para mover`}
                className={`flex flex-col items-center justify-center gap-1 min-w-[68px] transition-all ${
                  isSelected
                    ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-stone-950'
                    : 'hover:ring-1 hover:ring-amber-400/50'
                }`}
              >
                {btn.customIconUrl ? (
                  <img
                    src={btn.customIconUrl}
                    alt=""
                    style={{ width: `${iconPx}px`, height: `${iconPx}px` }}
                    className="object-contain"
                  />
                ) : (
                  <span style={{ width: `${iconPx}px`, height: `${iconPx}px` }}>
                    {headerIcons[btnId] || <Sparkles className="w-full h-full" />}
                  </span>
                )}
                <span className="leading-tight text-center font-medium">{btn.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderRealAdminGreetingBlock = () => {
    const block = layout.blocks.admin_greeting;
    return renderInteractiveBlockWrapper(
      'admin_greeting',
      <div
        onMouseDown={(e) => {
          const rect = e.currentTarget.closest('[data-builder-block]')?.getBoundingClientRect();
          startBlockDrag(e, 'admin_greeting', 'move_block', undefined, rect);
        }}
        className="flex items-start gap-3.5 cursor-move"
      >
        <div
          style={{
            width: `${(block.iconSizePx || 20) + 16}px`,
            height: `${(block.iconSizePx || 20) + 16}px`,
          }}
          className="rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0"
        >
          <Megaphone
            style={{
              width: `${block.iconSizePx || 20}px`,
              height: `${block.iconSizePx || 20}px`,
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p
            style={{
              fontSize: `${block.titleFontSizePx || 12}px`,
              color: block.titleColor || '#fbbf24',
            }}
            className=" uppercase tracking-[0.2em] font-bold"
          >
            {block.titleText || 'Aviso Oficial del Administrador'}
          </p>
          <p
            style={{
              fontSize: `${block.bodyFontSizePx || 13}px`,
              color: block.textColor || '#fef3c7',
            }}
            className="mt-1 leading-relaxed"
          >
            {block.subtitleText ||
              'Bienvenidos a la temporada actual de WeRoll. ¡Explora tus campañas o diseña tus propios mundos!'}
          </p>
        </div>
      </div>
    );
  };

  const renderRealWelcomeBannerBlock = () => {
    const block = layout.blocks.welcome_banner;
    const avatarSize = block.avatarSizePx || 48;
    const shapeClass =
      block.avatarShape === 'square'
        ? 'rounded-none'
        : block.avatarShape === 'rounded'
        ? 'rounded-xl'
        : 'rounded-full';

    const welcomeIcons: Record<string, React.ReactNode> = {
      security: <Settings className="w-full h-full" />,
      admin_panel: <Shield className="w-full h-full" />,
      creator_studio: <Palette className="w-full h-full" />,
      moderation: <Users className="w-full h-full" />,
      logout: <LogOut className="w-full h-full" />,
    };

    return renderInteractiveBlockWrapper(
      'welcome_banner',
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left User Identity */}
        <div
          onMouseDown={(e) => {
            const rect = e.currentTarget.closest('[data-builder-block]')?.getBoundingClientRect();
            startBlockDrag(e, 'welcome_banner', 'move_block', undefined, rect);
          }}
          className="flex items-center gap-3 cursor-move"
        >
          <div
            style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
            className={`relative ${shapeClass} border-2 border-amber-500/60 bg-stone-900 flex items-center justify-center overflow-hidden shrink-0 shadow-md`}
          >
            {block.customAvatarFrameUrl ? (
              <img src={block.customAvatarFrameUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <Crown className="w-6 h-6 text-amber-400" />
            )}
          </div>
          <div>
            <p
              style={{
                fontSize: `${block.titleFontSizePx || 18}px`,
                color: block.titleColor || '#fef3c7',
                fontFamily: block.fontFamily || "'Cinzel', serif",
              }}
              className="font-semibold flex flex-wrap items-center gap-1.5"
            >
              <span>{block.titleText || 'Bienvenido,'}</span>
              <span className="font-bold">Aventurero</span>
              <span className="text-amber-400/90 font-mono text-sm">#0421</span>
              {block.showEmailTag !== false && (
                <span
                  style={{ fontSize: `${block.bodyFontSizePx || 12}px`, color: block.textColor || '#a8a29e' }}
                  className="font-normal"
                >
                  (aventurero@weroll.app)
                </span>
              )}
            </p>
            {block.showRoleBadges !== false && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-200 font-semibold">
                  {block.subtitleText || 'DM Y JUGADOR'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full border border-purple-500/40 bg-purple-500/15 text-purple-200 font-semibold">
                  ADMIN / MOD
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right User Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {block.innerButtonsOrder.map((btnId) =>
            renderInnerButton(
              'welcome_banner',
              btnId,
              welcomeIcons[btnId] || <Sparkles className="w-full h-full" />
            )
          )}
        </div>
      </div>
    );
  };

  const renderRealCharactersBoxBlock = () => {
    const block = layout.blocks.characters_box;
    const cardW = block.cardWidthPx || 195;
    const cardH = block.cardHeightPx || 285;

    return renderInteractiveBlockWrapper(
      'characters_box',
      <div className="space-y-4">
        {/* Top Selector & Actions Bar (1:1 with LobbyPortalView.tsx line 2553) */}
        <div
          onMouseDown={(e) => {
            const rect = e.currentTarget.closest('[data-builder-block]')?.getBoundingClientRect();
            startBlockDrag(e, 'characters_box', 'move_block', undefined, rect);
          }}
          className="flex flex-wrap items-center justify-between gap-2 cursor-move"
        >
          <div className="inline-flex rounded-xl border border-stone-700/80 bg-stone-900/90 p-1 gap-1">
            {renderInnerButton('characters_box', 'tab_characters', <Users className="w-full h-full" />)}
            {renderInnerButton('characters_box', 'tab_worlds', <Globe className="w-full h-full" />)}
          </div>

          <div className="flex items-center gap-2">
            {renderInnerButton('characters_box', 'btn_import', <Upload className="w-full h-full" />)}
            {renderInnerButton('characters_box', 'btn_create', <FilePlus className="w-full h-full" />)}
          </div>
        </div>

        {/* Tarot Cards Carousel / Grid (1:1 with LobbyPortalView Tarot Cards) */}
        <div className="flex flex-wrap items-stretch gap-4 pt-1">
          {[
            {
              name: 'Thorin Escudo de Roble',
              cls: 'Guerrero · Nivel 5',
              race: 'Enano de las Colinas',
              hp: '48 / 48 PV',
              ac: 'CA 18',
              accent: 'from-amber-900/40 via-stone-900 to-stone-950',
            },
            {
              name: 'Lyra Velo Estelar',
              cls: 'Hechicera · Nivel 4',
              race: 'Semielfa Astral',
              hp: '28 / 28 PV',
              ac: 'CA 15',
              accent: 'from-indigo-950/50 via-stone-900 to-stone-950',
            },
          ].map((char, idx) => (
            <div
              key={idx}
              style={{
                width: `${cardW}px`,
                minHeight: `${cardH}px`,
                backgroundColor: block.innerCardBgColor || '#1c1917',
                borderColor: block.innerCardBorderColor || '#78350f',
              }}
              className={`rounded-2xl border-2 p-3.5 flex flex-col justify-between bg-gradient-to-b ${char.accent} shadow-xl relative overflow-hidden`}
            >
              {/* Tarot Corner Ornaments */}
              <div className="flex items-center justify-between text-[10px] text-amber-400/80 font-mono">
                <span>✦ TAROT I{idx === 0 ? 'V' : 'X'}</span>
                <span className="px-2 py-0.5 rounded-full bg-stone-950/80 border border-amber-500/30 text-amber-300">
                  {char.ac}
                </span>
              </div>

              {/* Character Portrait Circle */}
              <div className="my-2 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full border-2 border-amber-400/60 bg-stone-950/80 flex items-center justify-center shadow-inner mb-2">
                  {idx === 0 ? (
                    <Swords className="w-7 h-7 text-amber-400" />
                  ) : (
                    <Wand2 className="w-7 h-7 text-purple-300" />
                  )}
                </div>
                <h4
                  style={{ color: block.titleColor || '#fbbf24', fontFamily: block.fontFamily }}
                  className="font-bold text-sm leading-snug"
                >
                  {char.name}
                </h4>
                <p className="text-[11px] text-stone-300 mt-0.5">{char.cls}</p>
                <p className="text-[10px] text-stone-400">{char.race}</p>
                <span className="mt-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
                  {char.hp}
                </span>
              </div>

              {/* Card Action Buttons (Entrar a Mesa, Editar, Exportar, Eliminar) */}
              <div className="space-y-1.5 pt-2 border-t border-stone-800/80">
                <div className="flex justify-center">
                  {renderInnerButton(
                    'characters_box',
                    'card_enter',
                    <Play className="w-full h-full" />,
                    'w-full justify-center'
                  )}
                </div>
                <div className="flex items-center justify-between gap-1">
                  {renderInnerButton('characters_box', 'card_edit', <Edit3 className="w-full h-full" />)}
                  {renderInnerButton('characters_box', 'card_export', <Download className="w-full h-full" />)}
                  {renderInnerButton('characters_box', 'card_delete', <Trash2 className="w-full h-full" />)}
                </div>
              </div>
            </div>
          ))}

          {/* Slot 3: Empty Tarot Card Slot */}
          <div
            style={{ width: `${cardW}px`, minHeight: `${cardH}px` }}
            className="rounded-2xl border-2 border-dashed border-stone-700/70 bg-stone-950/40 p-4 flex flex-col items-center justify-center text-center gap-2 text-stone-400"
          >
            <div className="w-12 h-12 rounded-full border border-stone-700 bg-stone-900/70 flex items-center justify-center text-amber-400/70">
              <Plus className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-stone-300">Espacio Disponible (2/3)</p>
            <p className="text-[11px] text-stone-500">Crea o importa una ficha de personaje</p>
          </div>
        </div>
      </div>,
      'w-full'
    );
  };

  const renderRealFriendsBoxBlock = () => {
    const block = layout.blocks.friends_box;

    return renderInteractiveBlockWrapper(
      'friends_box',
      <div className="space-y-3">
        {/* Exact Header from LobbyPortalView.tsx line 3054 */}
        <div
          onMouseDown={(e) => {
            const rect = e.currentTarget.closest('[data-builder-block]')?.getBoundingClientRect();
            startBlockDrag(e, 'friends_box', 'move_block', undefined, rect);
          }}
          className="flex items-center justify-between gap-2 cursor-move"
        >
          <div>
            <h3
              style={{
                fontSize: `${block.titleFontSizePx || 16}px`,
                color: block.titleColor || '#fef3c7',
                fontFamily: block.fontFamily || "'Cinzel', serif",
              }}
              className="font-semibold flex items-center gap-2"
            >
              <Users
                style={{
                  width: `${block.iconSizePx || 16}px`,
                  height: `${block.iconSizePx || 16}px`,
                  color: block.accentColor || '#f59e0b',
                }}
              />
              <span>{block.titleText || 'Amigos'} (2)</span>
            </h3>
            <p
              style={{ fontSize: `${block.bodyFontSizePx || 12}px`, color: block.textColor || '#a8a29e' }}
              className="mt-0.5"
            >
              {block.subtitleText || 'Tu ID:'}{' '}
              <span className="text-amber-300 font-mono">aventurero@0421</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {renderInnerButton('friends_box', 'copy_id', <Copy className="w-full h-full" />)}
            {renderInnerButton('friends_box', 'refresh_friends', <RefreshCw className="w-full h-full" />)}
          </div>
        </div>

        {/* Exact Input + Agregar Button from LobbyPortalView.tsx line 3076 */}
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value="Ingresa usuario@ID"
            style={{
              backgroundColor: block.innerInputBgColor || '#0c0a09',
              borderColor: block.innerInputBorderColor || '#44403c',
              color: block.textColor || '#d6d3d1',
            }}
            className="flex-1 rounded-lg border px-3 py-2 text-xs pointer-events-none"
          />
          {renderInnerButton('friends_box', 'add_friend', <UserPlus className="w-full h-full" />)}
        </div>

        {/* Friends List Rows (1:1 with LobbyPortalView.tsx) */}
        <div className="space-y-2 pt-1">
          {[
            {
              name: 'Sir Gideon',
              tag: 'gideon@104',
              status: 'En Mesa Activa (DM)',
              online: true,
              canJoin: true,
            },
            {
              name: 'Lady Morgana',
              tag: 'morgana@882',
              status: 'En el Lobby',
              online: true,
              canJoin: false,
            },
          ].map((friend, i) => (
            <div
              key={i}
              style={{
                backgroundColor: block.innerCardBgColor || '#1c1917',
                borderColor: block.innerCardBorderColor || '#292524',
              }}
              className="rounded-xl border p-2.5 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  style={{
                    backgroundColor: friend.online
                      ? themeTokens.friendsOnlineDotColor || '#10b981'
                      : '#78716c',
                  }}
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-200 truncate">
                    {friend.name}{' '}
                    <span className="text-[10px] font-mono text-amber-400/80">{friend.tag}</span>
                  </p>
                  <p className="text-[10px] text-emerald-400/90 truncate">{friend.status}</p>
                </div>
              </div>
              {friend.canJoin &&
                renderInnerButton('friends_box', 'join_table', <Play className="w-full h-full" />)}
            </div>
          ))}
        </div>
      </div>,
      'w-full'
    );
  };

  const renderRealForumBoxBlock = () => {
    const block = layout.blocks.forum_box;

    return renderInteractiveBlockWrapper(
      'forum_box',
      <div className="space-y-4">
        {/* Forum Header */}
        <div
          onMouseDown={(e) => {
            const rect = e.currentTarget.closest('[data-builder-block]')?.getBoundingClientRect();
            startBlockDrag(e, 'forum_box', 'move_block', undefined, rect);
          }}
          className="flex flex-wrap items-center justify-between gap-3 cursor-move"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <MessageSquare
                style={{
                  width: `${block.iconSizePx || 18}px`,
                  height: `${block.iconSizePx || 18}px`,
                }}
              />
            </div>
            <div>
              <h3
                style={{
                  fontSize: `${block.titleFontSizePx || 20}px`,
                  color: block.titleColor || '#fef3c7',
                  fontFamily: block.fontFamily || "'Cinzel', serif",
                }}
                className="font-bold"
              >
                {block.titleText || 'Foro de la Comunidad'}
              </h3>
              <p
                style={{ fontSize: `${block.bodyFontSizePx || 12}px`, color: block.textColor || '#a8a29e' }}
              >
                {block.subtitleText || 'Debates, Crónicas, Reclutamiento de Mesas y Guías'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {renderInnerButton('forum_box', 'new_topic', <Plus className="w-full h-full" />)}
          </div>
        </div>

        {/* Category Tabs & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {['cat_all', 'cat_announcements', 'cat_recruitment', 'cat_lore'].map((catBtnId) =>
              renderInnerButton('forum_box', catBtnId, <Layers className="w-full h-full" />)
            )}
          </div>
          <div
            style={{
              backgroundColor: block.innerInputBgColor || '#0c0a09',
              borderColor: block.innerInputBorderColor || '#44403c',
            }}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs text-stone-400 min-w-[220px]"
          >
            <Search className="w-3.5 h-3.5 text-stone-500" />
            <span>Buscar temas en el foro...</span>
          </div>
        </div>

        {/* Forum Topic Rows */}
        <div className="space-y-2">
          {[
            {
              title: '📌 Guía Oficial: Cómo diseñar Mundos y Campañas en WeRoll v1.3',
              author: 'Admin #0001',
              cat: 'Anuncios',
              replies: 24,
              time: 'Hace 2h',
            },
            {
              title: '⚔️ [Reclutamiento] La Maldición de Strahd — Buscamos 2 jugadores viernes noche',
              author: 'Sir Gideon #0104',
              cat: 'Buscando Grupo',
              replies: 9,
              time: 'Hace 5h',
            },
          ].map((topic, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: block.innerCardBgColor || '#1c1917',
                borderColor: block.innerCardBorderColor || '#292524',
              }}
              className="rounded-xl border p-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p
                  style={{ color: block.textColor || '#e7e5e4' }}
                  className="text-xs font-semibold truncate"
                >
                  {topic.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-stone-400">
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {topic.cat}
                  </span>
                  <span>Por {topic.author}</span>
                  <span>· {topic.time}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-700 text-[11px] text-amber-300 font-mono">
                  {topic.replies} resp.
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRealStoreBoxBlock = () => {
    const block = layout.blocks.store_box;

    return renderInteractiveBlockWrapper(
      'store_box',
      <div className="space-y-4">
        <div
          onMouseDown={(e) => {
            const rect = e.currentTarget.closest('[data-builder-block]')?.getBoundingClientRect();
            startBlockDrag(e, 'store_box', 'move_block', undefined, rect);
          }}
          className="flex flex-wrap items-center justify-between gap-3 cursor-move"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <ShoppingBag
                style={{
                  width: `${block.iconSizePx || 18}px`,
                  height: `${block.iconSizePx || 18}px`,
                }}
              />
            </div>
            <div>
              <h3
                style={{
                  fontSize: `${block.titleFontSizePx || 18}px`,
                  color: block.titleColor || '#fbbf24',
                  fontFamily: block.fontFamily || "'Cinzel', serif",
                }}
                className="font-bold"
              >
                {block.titleText || 'Bazar Arcano — Tienda de Skins y DLCs'}
              </h3>
              <p
                style={{ fontSize: `${block.bodyFontSizePx || 12}px`, color: block.textColor || '#d6d3d1' }}
              >
                {block.subtitleText ||
                  'Adquiere temas visuales para tu Lobby, Hojas de Jugador, Pantallas de DM y Módulos'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {renderInnerButton('store_box', 'filter_skins', <Palette className="w-full h-full" />)}
            {renderInnerButton('store_box', 'filter_dlcs', <BookOpen className="w-full h-full" />)}
            {renderInnerButton('store_box', 'redeem_code', <Sparkles className="w-full h-full" />)}
          </div>
        </div>

        {/* Store Cards Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              title: 'Skin Escarcha Invernal',
              scope: 'Skin de Lobby & App',
              badge: 'Temporada',
            },
            {
              title: 'Grimorio Carmesí',
              scope: 'Skin Hoja de Jugador',
              badge: 'Destacado',
            },
            {
              title: 'Crónicas de Umbra (DLC)',
              scope: 'Bestiario + Mapas + Objetos',
              badge: 'Módulo DLC',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: block.innerCardBgColor || '#1c1917',
                borderColor: block.innerCardBorderColor || '#78350f',
              }}
              className="rounded-xl border p-3.5 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                    {item.badge}
                  </span>
                  <span className="text-[11px] text-stone-400">{item.scope}</span>
                </div>
                <h4 className="text-sm font-bold text-amber-100 mt-2">{item.title}</h4>
              </div>
              <div className="flex items-center justify-end pt-2 border-t border-stone-800/80">
                {renderInnerButton('store_box', 'buy_claim_btn', <ShoppingBag className="w-full h-full" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render the exact 2-column Lobby structure from LobbyPortalView.tsx (lines 2543-3400)
  // while respecting user block reordering!
  const renderOrderedLobbyBlocks = () => {
    const rendered: React.ReactNode[] = [];
    const order = layout.blocksOrder;
    let mainTwoColGridRendered = false;

    const gridGroupIds: LobbyBlockId[] = ['characters_box', 'friends_box', 'admin_greeting', 'forum_box'];

    for (const blockId of order) {
      if (blockId === 'top_header') {
        rendered.push(<React.Fragment key="top_header">{renderRealTopHeaderBlock()}</React.Fragment>);
      } else if (blockId === 'welcome_banner') {
        rendered.push(
          <div key="welcome_banner" className="max-w-7xl mx-auto px-4 w-full">
            {renderRealWelcomeBannerBlock()}
          </div>
        );
      } else if (gridGroupIds.includes(blockId)) {
        if (!mainTwoColGridRendered) {
          mainTwoColGridRendered = true;
          const leftBlocks = order.filter((id) => id === 'characters_box' || id === 'friends_box');
          const rightBlocks = order.filter((id) => id === 'admin_greeting' || id === 'forum_box');

          rendered.push(
            <div
              key="main_lobby_two_col_grid"
              className="max-w-7xl mx-auto px-4 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              {/* Left Column (lg:col-span-5): Characters + Friends (1:1 with LobbyPortalView.tsx line 2545) */}
              <div className="lg:col-span-5 space-y-6">
                {leftBlocks.map((lId) =>
                  lId === 'characters_box' ? (
                    <React.Fragment key="characters_box">{renderRealCharactersBoxBlock()}</React.Fragment>
                  ) : (
                    <React.Fragment key="friends_box">{renderRealFriendsBoxBlock()}</React.Fragment>
                  )
                )}
              </div>

              {/* Right Column (lg:col-span-7): Admin Greeting + Community Forum (1:1 with LobbyPortalView.tsx line 3156) */}
              <div className="lg:col-span-7 space-y-6">
                {rightBlocks.map((rId) =>
                  rId === 'admin_greeting' ? (
                    <React.Fragment key="admin_greeting">{renderRealAdminGreetingBlock()}</React.Fragment>
                  ) : (
                    <React.Fragment key="forum_box">{renderRealForumBoxBlock()}</React.Fragment>
                  )
                )}
              </div>
            </div>
          );
        }
      } else if (blockId === 'store_box') {
        rendered.push(
          <div key="store_box" className="max-w-7xl mx-auto px-4 w-full">
            {renderRealStoreBoxBlock()}
          </div>
        );
      }
    }

    return rendered;
  };

  const wallpaperUrl =
    layout.wallpaperUrl || themeTokens.appGlobalWallpaperUrl || themeTokens.bgImageUrl || '';
  const wallpaperOpacity =
    typeof layout.wallpaperOpacity === 'number'
      ? layout.wallpaperOpacity
      : typeof themeTokens.bgImageOpacity === 'number'
      ? themeTokens.bgImageOpacity
      : 0.35;

  const customOverlayUrl =
    layout.customOverlayUrl || themeTokens.appCustomOverlayEffectUrl || '';
  const customOverlayOpacity =
    typeof layout.customOverlayOpacity === 'number'
      ? layout.customOverlayOpacity
      : typeof themeTokens.appCustomOverlayOpacity === 'number'
      ? themeTokens.appCustomOverlayOpacity
      : 0.5;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="flex flex-col h-full rounded-2xl border border-stone-800 bg-stone-950/90 overflow-hidden shadow-2xl"
    >
      {/* Top Sandbox Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 border-b border-stone-800 bg-stone-900/90">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-200 text-xs font-bold flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-amber-400" />
            Lienzo Visual del Lobby Real (1280px)
          </span>

          {/* Toggle between Interactive Drag/Resize vs Clean Preview */}
          <div className="inline-flex rounded-lg border border-stone-700 bg-stone-950 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setInteractiveEditMode('move_resize')}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors ${
                interactiveEditMode === 'move_resize'
                  ? 'bg-amber-500 text-stone-950'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Move className="w-3 h-3" /> Editar / Mover Cajas y Botones
            </button>
            <button
              type="button"
              onClick={() => setInteractiveEditMode('preview')}
              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors ${
                interactiveEditMode === 'preview'
                  ? 'bg-emerald-500 text-stone-950'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Eye className="w-3 h-3" /> Vista Limpia
            </button>
          </div>
        </div>

        {/* Zoom Controls + Reset Selected Block */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-stone-950 border border-stone-800 rounded-lg px-2 py-1 text-xs text-stone-300">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.45, Number((z - 0.06).toFixed(2))))}
              className="p-0.5 hover:text-amber-300"
              title="Alejar miniatura"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] min-w-[42px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1, Number((z + 0.06).toFixed(2))))}
              className="p-0.5 hover:text-amber-300"
              title="Acercar miniatura"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onChangeLayout(resetLobbyBlockToDefault(layout, selectedBlockId))}
            className="px-2.5 py-1 rounded-lg border border-stone-700 bg-stone-800/80 hover:bg-stone-700 text-stone-200 text-[11px] font-medium inline-flex items-center gap-1"
            title="Restaurar el bloque seleccionado a su diseño original del Lobby"
          >
            <RotateCcw className="w-3 h-3" /> Reset Bloque Actual
          </button>
        </div>
      </div>

      {/* Helper Instruction Bar */}
      <div className="px-3.5 py-1.5 bg-amber-950/25 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-200/90">
        <span>
          💡 <strong>Modo Shopify / Libre:</strong> Haz clic en cualquier caja o botón para inspeccionarlo.{' '}
          <strong>Arrastra cualquier caja o botón</strong> para moverlo, o tira de los{' '}
          <strong>bordes amarillos</strong> para cambiar su tamaño en píxeles.
        </span>
        {selectedButtonId && (
          <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-200 font-mono text-[10px]">
            Botón activo: <strong>{selectedButtonId}</strong> (en {layout.blocks[selectedBlockId]?.name})
          </span>
        )}
      </div>

      {/* Scaled Miniature Viewport of the Real 1280px Lobby */}
      <div className="flex-1 overflow-auto p-4 bg-[#070605]">
        <div
          style={{
            width: `${Math.round(1280 * zoom)}px`,
            minHeight: `${Math.round(1150 * zoom)}px`,
          }}
          className="mx-auto relative"
        >
          <div
            style={{
              width: '1280px',
              minHeight: '1150px',
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              backgroundColor: themeTokens.appBgColor || '#0c0a09',
              color: themeTokens.textPrimaryColor || '#f5f5f4',
              fontFamily: themeTokens.bodyFontFamily || "'Inter', sans-serif",
            }}
            className="relative rounded-2xl border border-stone-800 shadow-2xl overflow-hidden pb-14"
          >
            {/* Optional Custom Wallpaper Background */}
            {wallpaperUrl && (
              <div
                style={{
                  backgroundImage: `url("${wallpaperUrl}")`,
                  opacity: wallpaperOpacity,
                }}
                className="absolute inset-0 bg-cover bg-center pointer-events-none z-0"
              />
            )}

            {/* Optional Custom Overlay Image/GIF/Effect URL (Replaces hardcoded snow/particles) */}
            {customOverlayUrl && (
              <div
                style={{
                  backgroundImage: `url("${customOverlayUrl}")`,
                  opacity: customOverlayOpacity,
                }}
                className="absolute inset-0 bg-repeat bg-center pointer-events-none z-10"
              />
            )}

            {/* Real Lobby Vertical Flow */}
            <div className="relative z-20 space-y-6">
              {renderOrderedLobbyBlocks()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
