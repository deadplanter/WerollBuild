import React, { useRef, useState } from 'react';
import {
  Move,
  RotateCcw,
  Eye,
  EyeOff,
  Maximize2,
  MessageSquare,
  Send,
  Backpack,
  BookOpen,
  Sparkles,
  Settings,
  Users,
  Shield,
  Coins,
  Plus,
  X,
} from 'lucide-react';
import type {
  GeometricShapeType,
  SkinModalPopupOverride,
  SkinModalTargetId,
  SpatialInnerElementConfig,
} from '../../types/dnd';
import { applyColorWithOpacity } from '../../utils/lobbyPageLayout';
import {
  buildGeometricElementStyle,
  makeInnerEl,
} from '../../utils/playerSkinLayout';
import { GeometricSvgBorder } from '../common/GeometricSvgBorder';

export interface InteractivePopupBuilderCanvasProps {
  modalId: SkinModalTargetId;
  modalTitle: string;
  config: SkinModalPopupOverride;
  selectedInnerId: string | null;
  onSelectInnerId: (innerId: string | null) => void;
  onUpdateModalConfig: (patch: Partial<SkinModalPopupOverride>) => void;
  onUpdateInnerElement: (
    innerId: string,
    patch: Partial<SpatialInnerElementConfig>
  ) => void;
}

type DragState =
  | {
      kind: 'resize_modal';
      edge: 'e' | 's' | 'se';
      startMouseX: number;
      startMouseY: number;
      startW: number;
      startH: number;
    }
  | {
      kind: 'drag_inner';
      innerId: string;
      startMouseX: number;
      startMouseY: number;
      startX: number;
      startY: number;
    }
  | {
      kind: 'resize_inner';
      innerId: string;
      edge: 'e' | 's' | 'se';
      startMouseX: number;
      startMouseY: number;
      startW: number;
      startH: number;
    };

export const InteractivePopupBuilderCanvas: React.FC<
  InteractivePopupBuilderCanvasProps
> = ({
  modalId,
  modalTitle,
  config,
  selectedInnerId,
  onSelectInnerId,
  onUpdateModalConfig,
  onUpdateInnerElement,
}) => {
  const modalBoxRef = useRef<HTMLDivElement | null>(null);
  const innerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [dragState, setDragState] = useState<DragState | null>(null);

  const getInner = (
    id: string,
    fallbackLabel: string,
    overrides: Partial<SpatialInnerElementConfig> = {}
  ): SpatialInnerElementConfig => {
    const existing = config.innerButtonsConfig?.[id];
    if (existing) return existing;
    return makeInnerEl(id, fallbackLabel, overrides);
  };

  const startModalResize = (
    e: React.MouseEvent,
    edge: 'e' | 's' | 'se'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = modalBoxRef.current?.getBoundingClientRect();
    const startW = config.widthPx && config.widthPx > 0 ? config.widthPx : Math.round(rect?.width || 620);
    const startH = config.heightPx && config.heightPx > 0 ? config.heightPx : Math.round(rect?.height || 460);

    const state: DragState = {
      kind: 'resize_modal',
      edge,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startW,
      startH,
    };
    setDragState(state);

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - state.startMouseX;
      const dy = ev.clientY - state.startMouseY;
      const patch: Partial<SkinModalPopupOverride> = {};
      if (edge === 'e' || edge === 'se') {
        patch.widthPx = Math.max(320, Math.round(state.startW + dx));
      }
      if (edge === 's' || edge === 'se') {
        patch.heightPx = Math.max(240, Math.round(state.startH + dy));
      }
      onUpdateModalConfig(patch);
    };

    const onUp = () => {
      setDragState(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startInnerDrag = (
    e: React.MouseEvent,
    inner: SpatialInnerElementConfig
  ) => {
    e.stopPropagation();
    onSelectInnerId(inner.id);
    const startX = inner.x || 0;
    const startY = inner.y || 0;
    const state: DragState = {
      kind: 'drag_inner',
      innerId: inner.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX,
      startY,
    };
    setDragState(state);

    const onMove = (ev: MouseEvent) => {
      const dx = Math.round(ev.clientX - state.startMouseX);
      const dy = Math.round(ev.clientY - state.startMouseY);
      onUpdateInnerElement(inner.id, {
        x: state.startX + dx,
        y: state.startY + dy,
      });
    };

    const onUp = () => {
      setDragState(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startInnerResize = (
    e: React.MouseEvent,
    inner: SpatialInnerElementConfig,
    edge: 'e' | 's' | 'se'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectInnerId(inner.id);
    const domEl = innerRefs.current[inner.id];
    const rect = domEl?.getBoundingClientRect();
    const startW =
      inner.widthPx && inner.widthPx > 0
        ? inner.widthPx
        : Math.round(rect?.width || 160);
    const startH =
      inner.heightPx && inner.heightPx > 0
        ? inner.heightPx
        : Math.round(rect?.height || 42);

    const state: DragState = {
      kind: 'resize_inner',
      innerId: inner.id,
      edge,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startW,
      startH,
    };
    setDragState(state);

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - state.startMouseX;
      const dy = ev.clientY - state.startMouseY;
      const patch: Partial<SpatialInnerElementConfig> = {};
      if (edge === 'e' || edge === 'se') {
        patch.widthPx = Math.max(48, Math.round(state.startW + dx));
      }
      if (edge === 's' || edge === 'se') {
        patch.heightPx = Math.max(24, Math.round(state.startH + dy));
      }
      onUpdateInnerElement(inner.id, patch);
    };

    const onUp = () => {
      setDragState(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const renderDraggablePiece = (
    inner: SpatialInnerElementConfig,
    content: React.ReactNode,
    extraClassName = ''
  ) => {
    if (inner.visible === false || (inner.opacity ?? 1) <= 0.01) {
      return (
        <div
          key={inner.id}
          onClick={(e) => {
            e.stopPropagation();
            onSelectInnerId(inner.id);
          }}
          className="px-2 py-1 rounded border border-dashed border-stone-700/60 bg-stone-950/40 text-[9px] text-stone-500 cursor-pointer flex items-center gap-1"
        >
          <EyeOff className="w-3 h-3" /> {inner.label || inner.id} (Oculto)
        </div>
      );
    }

    const isSelected = selectedInnerId === inner.id;
    const shapeStyle = buildGeometricElementStyle({
      shape: inner.shape || 'rounded',
      edgeFadePercent: inner.edgeFadePercent || 0,
      hideBorder: inner.hideBorder,
      borderRadiusPx: inner.borderRadiusPx ?? 12,
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
        key={inner.id}
        ref={(el) => {
          innerRefs.current[inner.id] = el;
        }}
        data-testid={`popup-inner-${inner.id}`}
        onMouseDown={(e) => startInnerDrag(e, inner)}
        onClick={(e) => {
          e.stopPropagation();
          onSelectInnerId(inner.id);
        }}
        style={{
          ...shapeStyle,
          color: inner.textColor || '#f5e4be',
          fontFamily: inner.fontFamily || config.fontFamily || "'Cinzel', serif",
          fontSize: inner.fontSizePx ? `${inner.fontSizePx}px` : undefined,
          paddingLeft: inner.paddingXPx !== undefined ? `${inner.paddingXPx}px` : '12px',
          paddingRight: inner.paddingXPx !== undefined ? `${inner.paddingXPx}px` : '12px',
          paddingTop: inner.paddingYPx !== undefined ? `${inner.paddingYPx}px` : '8px',
          paddingBottom: inner.paddingYPx !== undefined ? `${inner.paddingYPx}px` : '8px',
          width: inner.widthPx && inner.widthPx > 0 ? `${inner.widthPx}px` : undefined,
          minHeight: inner.heightPx && inner.heightPx > 0 ? `${inner.heightPx}px` : undefined,
          transform:
            inner.x || inner.y
              ? `translate(${inner.x || 0}px, ${inner.y || 0}px)`
              : undefined,
        }}
        className={`relative group/piece cursor-move select-none transition-shadow ${
          isSelected
            ? 'ring-2 ring-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.35)] z-30'
            : 'hover:ring-1 hover:ring-amber-400/60'
        } ${extraClassName}`}
      >
        <GeometricSvgBorder
          shape={inner.shape}
          borderColor={inner.borderColor || '#c8a45c'}
          borderWidthPx={inner.borderWidthPx ?? 1}
          hideBorder={inner.hideBorder}
        />

        {/* Floating coordinate chip when selected */}
        {isSelected && (
          <div className="absolute -top-6 left-0 z-40 flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/95 border border-cyan-400/70 text-[9px] font-mono text-cyan-200 whitespace-nowrap shadow-lg">
            <Move className="w-2.5 h-2.5 text-cyan-300" />
            <span>{inner.label || inner.id}</span>
            <span className="text-cyan-400">
              ({inner.x || 0}px, {inner.y || 0}px)
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
                  onUpdateInnerElement(inner.id, {
                    x: 0,
                    y: 0,
                    widthPx: 0,
                    heightPx: 0,
                  });
                }}
                className="ml-1 px-1 rounded bg-cyan-900/80 hover:bg-cyan-800 text-cyan-100"
                title="Restablecer posición y tamaño"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )}

        <div className="relative z-10">{content}</div>

        {/* Resize handles for selected inner element */}
        {isSelected && (
          <>
            <div
              onMouseDown={(e) => startInnerResize(e, inner, 'e')}
              className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-6 rounded-full bg-cyan-400 border border-stone-950 cursor-ew-resize z-40"
              title="Estirar ancho (↔)"
            />
            <div
              onMouseDown={(e) => startInnerResize(e, inner, 's')}
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-2.5 rounded-full bg-cyan-400 border border-stone-950 cursor-ns-resize z-40"
              title="Estirar alto (↕)"
            />
            <div
              onMouseDown={(e) => startInnerResize(e, inner, 'se')}
              className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded bg-cyan-300 border border-stone-950 cursor-nwse-resize z-40"
              title="Redimensionar esquina (↘)"
            />
          </>
        )}
      </div>
    );
  };

  const modalShapeStyle = buildGeometricElementStyle({
    shape: config.shape || 'rounded',
    edgeFadePercent: config.edgeFadePercent || 0,
    hideBorder: config.hideBorder,
    borderRadiusPx: config.borderRadiusPx ?? 18,
    bgColor: applyColorWithOpacity(
      config.bgColor || '#141722',
      config.boxBgOpacity ?? 0.96
    ),
    borderColor: config.borderColor || '#c8a45c',
    borderWidthPx: config.borderWidthPx ?? 2,
    customPngUrl: config.customBgPngUrl,
    opacity: config.opacity ?? 1,
  });

  const renderFriendChatBody = () => {
    const header = getInner('chat_header', 'Usuario Dos (Aragorn#7721)');
    const msgR1 = getInner('msg_received_1', 'Usuario Dos');
    const msgS1 = getInner('msg_sent_1', 'Usuario Uno (Tú)');
    const msgR2 = getInner('msg_received_2', 'Usuario Dos');
    const msgS2 = getInner('msg_sent_2', 'Usuario Uno (Tú)');
    const inputBox = getInner('chat_input_box', 'Escribe un mensaje a Usuario Dos...');
    const sendBtn = getInner('chat_send_btn', 'Enviar Mensaje');

    return (
      <div className="space-y-3">
        {/* Chat Header */}
        {renderDraggablePiece(
          header,
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {header.customIconUrl ? (
                <img
                  src={header.customIconUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover border border-amber-500/40"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-950/90 border border-emerald-500/50 flex items-center justify-center text-emerald-300 font-bold text-xs">
                  U2
                </div>
              )}
              <div>
                <div className="font-bold text-sm leading-tight">
                  {header.label || 'Usuario Dos (Aragorn#7721)'}
                </div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {header.exampleValue || 'En Línea • Chat Directo con Usuario Uno'}
                </div>
              </div>
            </div>
            <div className="px-2 py-1 rounded bg-stone-900/80 border border-stone-700 text-[10px] text-stone-400 flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-amber-400" /> Chat 1 a 1
            </div>
          </div>
        )}

        {/* Messages Stream */}
        <div className="p-3 rounded-xl bg-stone-950/55 border border-stone-800/80 space-y-2.5 min-h-[220px] flex flex-col justify-between">
          <div className="space-y-2.5">
            {/* Received Message 1 */}
            <div className="flex justify-start">
              {renderDraggablePiece(
                msgR1,
                <div className="max-w-md space-y-0.5">
                  <div className="text-[9px] font-bold uppercase tracking-wider opacity-75 flex items-center justify-between gap-3">
                    <span>{msgR1.label || 'Usuario Dos'}</span>
                    <span className="font-mono text-[8px] opacity-60">20:14</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    {msgR1.exampleValue ||
                      '¡Hola Usuario Uno! ¿Ya tienes lista tu hoja para la sesión de hoy?'}
                  </p>
                </div>,
                'w-4/5'
              )}
            </div>

            {/* Sent Message 1 */}
            <div className="flex justify-end">
              {renderDraggablePiece(
                msgS1,
                <div className="max-w-md space-y-0.5 text-right">
                  <div className="text-[9px] font-bold uppercase tracking-wider opacity-80 flex items-center justify-end gap-2">
                    <span className="font-mono text-[8px] opacity-60">20:15</span>
                    <span>{msgS1.label || 'Usuario Uno (Tú)'}</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    {msgS1.exampleValue ||
                      '¡Lista! Acabo de equipar la Espada Larga +1 y preparar mis conjuros.'}
                  </p>
                </div>,
                'w-4/5'
              )}
            </div>

            {/* Received Message 2 */}
            <div className="flex justify-start">
              {renderDraggablePiece(
                msgR2,
                <div className="max-w-md space-y-0.5">
                  <div className="text-[9px] font-bold uppercase tracking-wider opacity-75 flex items-center justify-between gap-3">
                    <span>{msgR2.label || 'Usuario Dos'}</span>
                    <span className="font-mono text-[8px] opacity-60">20:16</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    {msgR2.exampleValue ||
                      '¡Genial! El DM ya abrió la sala MESA-01, entremos juntos.'}
                  </p>
                </div>,
                'w-4/5'
              )}
            </div>

            {/* Sent Message 2 */}
            <div className="flex justify-end">
              {renderDraggablePiece(
                msgS2,
                <div className="max-w-md space-y-0.5 text-right">
                  <div className="text-[9px] font-bold uppercase tracking-wider opacity-80 flex items-center justify-end gap-2">
                    <span className="font-mono text-[8px] opacity-60">20:17</span>
                    <span>{msgS2.label || 'Usuario Uno (Tú)'}</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    {msgS2.exampleValue ||
                      '¡Voy entrando ahora mismo! Nos vemos en el mapa táctico.'}
                  </p>
                </div>,
                'w-4/5'
              )}
            </div>
          </div>
        </div>

        {/* Bottom Input + Send Button */}
        <div className="flex items-center gap-2.5 pt-1">
          <div className="flex-1">
            {renderDraggablePiece(
              inputBox,
              <div className="flex items-center justify-between text-xs opacity-85 py-1">
                <span>{inputBox.label || 'Escribe un mensaje a Usuario Dos...'}</span>
                <span className="text-[9px] font-mono opacity-50">ENTER</span>
              </div>,
              'w-full'
            )}
          </div>
          {renderDraggablePiece(
            sendBtn,
            <div className="flex items-center gap-1.5 font-bold text-xs whitespace-nowrap py-1">
              {sendBtn.customIconUrl ? (
                <img src={sendBtn.customIconUrl} alt="" className="w-4 h-4 object-contain" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{sendBtn.label || 'Enviar Mensaje'}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderInventoryPopupBody = () => {
    const header = getInner('inv_header', 'Equipo e Inventario de Valeros del Alba');
    const carryBar = getInner('inv_carry_bar', 'Capacidad de Carga: 39 / 270 lb');
    const coinsBar = getInner('inv_coins_bar', 'Bolsa de Monedas');
    const tabWeapons = getInner('tab_weapons', '⚔️ Armas (3)');
    const tabArmors = getInner('tab_armors', '🛡️ Armaduras (2)');
    const tabObjects = getInner('tab_objects', '🎒 Objetos (8)');
    const tabSpells = getInner('tab_spells', '✨ Conjuros (4)');
    const btnAdd = getInner('btn_add_item', '+ Añadir al Inventario');
    const item1 = getInner('item_card_1', 'Espada Larga +1 (Equipada)');
    const item2 = getInner('item_card_2', 'Cota de Mallas Real (Equipada)');
    const item3 = getInner('item_card_3', 'Poción de Curación Mayor (x2)');

    return (
      <div className="space-y-3">
        {renderDraggablePiece(
          header,
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Backpack className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-sm">
                {header.label || 'Equipo e Inventario de Valeros del Alba'}
              </span>
            </div>
            <span className="text-[10px] opacity-75">
              {header.exampleValue || 'Mochila del Aventurero'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {renderDraggablePiece(
            carryBar,
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold">{carryBar.label}</span>
              <span className="text-[10px] opacity-80">{carryBar.exampleValue}</span>
            </div>
          )}
          {renderDraggablePiece(
            coinsBar,
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" /> {coinsBar.label}
              </span>
              <span className="text-[10px] font-mono">{coinsBar.exampleValue}</span>
            </div>
          )}
        </div>

        {/* Category Tabs + Add Button */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {renderDraggablePiece(
              tabWeapons,
              <span className="font-bold text-xs">{tabWeapons.label}</span>
            )}
            {renderDraggablePiece(
              tabArmors,
              <span className="font-bold text-xs">{tabArmors.label}</span>
            )}
            {renderDraggablePiece(
              tabObjects,
              <span className="font-bold text-xs">{tabObjects.label}</span>
            )}
            {renderDraggablePiece(
              tabSpells,
              <span className="font-bold text-xs">{tabSpells.label}</span>
            )}
          </div>
          {renderDraggablePiece(
            btnAdd,
            <span className="font-bold text-xs flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> {btnAdd.label}
            </span>
          )}
        </div>

        {/* Item Cards */}
        <div className="space-y-2 pt-1">
          {[item1, item2, item3].map((it) =>
            renderDraggablePiece(
              it,
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-xs">{it.label}</div>
                  <div className="text-[10px] opacity-80">{it.exampleValue}</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-stone-950/60 border border-amber-500/30 text-[9px] uppercase font-bold">
                  Usar / Equipar
                </span>
              </div>
            )
          )}
        </div>
      </div>
    );
  };

  const renderGenericOrderedBody = () => {
    const order =
      config.innerButtonsOrder || Object.keys(config.innerButtonsConfig || {});
    return (
      <div className="space-y-2.5">
        {order.map((id) => {
          const item = getInner(id, id);
          return renderDraggablePiece(
            item,
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-xs">{item.label || item.id}</div>
                {item.exampleValue && (
                  <div className="text-[10px] opacity-75 mt-0.5">
                    {item.exampleValue}
                  </div>
                )}
              </div>
              <span className="text-[9px] font-mono opacity-60 uppercase">
                Arrastrable 1:1
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      onClick={() => onSelectInnerId(null)}
      className="relative rounded-2xl border border-stone-800 bg-stone-950/90 p-6 min-h-[540px] flex flex-col items-center justify-center overflow-auto"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 20%, rgba(245, 158, 11, 0.08), rgba(10, 12, 18, 0.96) 75%)',
      }}
    >
      {/* Top Studio Helper Bar */}
      <div className="w-full max-w-3xl mb-4 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-stone-900/90 border border-amber-500/30 text-[11px] text-stone-300">
        <div className="flex items-center gap-2">
          <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold text-amber-200">
            Lienzo Pop-up Interactivo 1:1: {modalTitle}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-stone-400">
          <span>
            Haz clic en cualquier elemento o burbuja para moverlo, estirarlo o cambiar su figura
          </span>
          {(config.widthPx || config.heightPx) ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateModalConfig({ widthPx: 0, heightPx: 0 });
              }}
              className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30"
            >
              Reset Tamaño Ventana
            </button>
          ) : null}
        </div>
      </div>

      {/* Simulated Backdrop + 1:1 Interactive Modal Container */}
      <div
        ref={modalBoxRef}
        data-testid={`interactive-popup-box-${modalId}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelectInnerId(null);
        }}
        style={{
          ...modalShapeStyle,
          width:
            config.widthPx && config.widthPx > 0 ? `${config.widthPx}px` : '100%',
          maxWidth:
            config.widthPx && config.widthPx > 0 ? 'none' : '680px',
          minHeight:
            config.heightPx && config.heightPx > 0
              ? `${config.heightPx}px`
              : '420px',
          fontFamily: config.fontFamily || "'Cinzel', serif",
        }}
        className={`relative p-5 shadow-2xl transition-shadow ${
          selectedInnerId === null
            ? 'ring-2 ring-amber-400/80'
            : 'hover:ring-1 hover:ring-amber-500/40'
        }`}
      >
        <GeometricSvgBorder
          shape={config.shape}
          borderColor={config.borderColor || '#c8a45c'}
          borderWidthPx={config.borderWidthPx ?? 2}
          hideBorder={config.hideBorder}
        />

        {/* Modal Top Frame Badge */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-700/60">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-bold text-amber-300 uppercase">
              Ventana Pop-up 1:1
            </span>
            <span className="text-xs font-bold" style={{ color: config.textColor || '#f5e4be' }}>
              {modalTitle}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-stone-400">
              {config.widthPx ? `${config.widthPx}px` : 'Auto W'} ×{' '}
              {config.heightPx ? `${config.heightPx}px` : 'Auto H'}
            </span>
            <div className="w-6 h-6 rounded-lg bg-stone-900/80 border border-stone-700 flex items-center justify-center text-stone-400">
              <X className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* 1:1 Specific Modal Content */}
        <div className="relative z-10">
          {modalId === 'modal_friend_chat'
            ? renderFriendChatBody()
            : modalId === 'modal_inventory'
            ? renderInventoryPopupBody()
            : renderGenericOrderedBody()}
        </div>

        {/* East / South / South-East Resize Handles for the Modal Window itself */}
        <div
          onMouseDown={(e) => startModalResize(e, 'e')}
          className="absolute top-1/2 -right-2 -translate-y-1/2 w-3 h-12 rounded-full bg-amber-400/90 hover:bg-amber-300 border border-stone-950 cursor-ew-resize z-30 shadow"
          title="Estirar ancho de la ventana Pop-up (↔)"
        />
        <div
          onMouseDown={(e) => startModalResize(e, 's')}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-3 rounded-full bg-amber-400/90 hover:bg-amber-300 border border-stone-950 cursor-ns-resize z-30 shadow"
          title="Estirar alto de la ventana Pop-up (↕)"
        />
        <div
          onMouseDown={(e) => startModalResize(e, 'se')}
          className="absolute -bottom-2 -right-2 w-4 h-4 rounded bg-amber-300 hover:bg-amber-200 border border-stone-950 cursor-nwse-resize z-30 shadow"
          title="Redimensionar ventana Pop-up (↘)"
        />
      </div>
    </div>
  );
};
