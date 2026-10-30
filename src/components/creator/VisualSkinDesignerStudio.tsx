import React, { useState, useEffect } from 'react';
import {
  Palette,
  ArrowLeft,
  Save,
  Globe,
  Check,
  Eye,
  Type,
  Sliders,
  Shield,
  Heart,
  Dices,
  Layers,
  Sparkles,
  Layout,
  Crown,
  Volume2,
  Package,
  Users,
  BookOpen,
  Compass,
  ShoppingBag,
  MessageSquare,
  RotateCw,
  Plus,
  Trash2,
  Download,
  Upload,
  Zap,
  Skull,
  Sword,
  ArrowUp,
  ArrowDown,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  EyeOff,
  RotateCcw,
  Move,
  Image as ImageIcon,
} from 'lucide-react';
import {
  AppSkinRecord,
  AppSkinThemeTokens,
  PopupSkinConfig,
  CustomLayerToken,
  AbilityKey,
  LobbyBlockId,
  LobbyBlockLayoutConfig,
  LobbyInnerButtonConfig,
  LobbyPageLayoutConfig,
  GeometricShapeType,
  SkinModalPopupOverride,
  SkinModalTargetId,
  SpatialInnerElementConfig,
} from '../../types/dnd';
import { soundFx } from '../../utils/audio';
import {
  createDefaultLobbyPageLayout,
  moveLobbyBlockOrder,
  moveLobbyInnerButtonOrder,
  resetLobbyBlockToDefault,
  resolveLobbyPageLayout,
  updateLobbyBlock,
  updateLobbyInnerButton,
} from '../../utils/lobbyPageLayout';
import { resolveModalPopupConfig } from '../../utils/playerSkinLayout';
import { LobbyPageBuilderCanvas } from './LobbyPageBuilderCanvas';
import { InteractivePopupBuilderCanvas } from './InteractivePopupBuilderCanvas';
import { PlayerSkinFourApartadosEditor } from './PlayerSkinFourApartadosEditor';
import { invalidateTarotSkinCache } from '../character/CharacterTarotCard';
import { SAMPLE_CHARACTER } from '../../data/srd';

interface VisualSkinDesignerStudioProps {
  skin: AppSkinRecord;
  isAdmin: boolean;
  currentUserEmail: string;
  currentUserName: string;
  onSave: (updatedSkin: AppSkinRecord) => Promise<void>;
  onActivateOnline: (skinId: string, scope: 'app' | 'player' | 'dm') => Promise<void>;
  onClose: () => void;
}

type PlayerLayerId =
  | 'J-0'
  | 'J-1'
  | 'J-2'
  | 'J-3'
  | 'J-4'
  | 'J-5'
  | 'J-6'
  | 'J-7'
  | 'J-8';

type DmLayerId =
  | 'DM-0'
  | 'DM-1'
  | 'DM-2'
  | 'DM-3'
  | 'DM-4'
  | 'DM-5'
  | 'DM-6'
  | 'DM-7'
  | 'DM-8'
  | 'DM-9';

type AppLayerId =
  | 'App-0'
  | 'App-1'
  | 'App-2'
  | 'App-3'
  | 'App-4'
  | 'App-5'
  | 'App-6'
  | 'App-7'
  | 'App-8';

type MapSubLayerId = '7A' | '7B' | '7C' | '7D' | '7E' | '7F' | '7G';

const PLAYER_LAYERS: { id: PlayerLayerId; label: string; subtitle: string }[] = [
  { id: 'J-0', label: 'Capa J-0: Fondo y Plantilla Base', subtitle: 'Lienzo exterior, marco envolvente y PNG base' },
  { id: 'J-1', label: 'Capa J-1: Cabecera, Retrato e Identidad', subtitle: 'Avatar, marco retrato, nombre e INSPIRACIÓN' },
  { id: 'J-2', label: 'Capa J-2: Cajas de Características', subtitle: 'FUE, DES, CON, INT, SAB, CAR individuales/globales' },
  { id: 'J-3', label: 'Capa J-3: Núcleo de Vida (HP & FX)', subtitle: 'Barra de vida, fading/glitch/engranajes y sonidos' },
  { id: 'J-4', label: 'Capa J-4: Rincón del Aventurero', subtitle: 'Mochila/Cofre, Diario/Tablet, Monedas y Tarot' },
  { id: 'J-5', label: 'Capa J-5: Mazo de Juego y Acciones', subtitle: 'Combate, Habilidades, Conjuros y textos editables' },
  { id: 'J-6', label: 'Capa J-6: Carta Tarot 3D (Frente/Reverso)', subtitle: 'Marco, reverso, giro 3D, partículas y proyección' },
  { id: 'J-7', label: 'Capa J-7: Modo Mapa (7 Sub-Capas)', subtitle: '7A Aliados, 7B Enemigos, 7C Dados, 7D Mapa, 7F DM...' },
  { id: 'J-8', label: 'Capa J-8: Pop-ups, Audio y Capas Extra', subtitle: 'Modales skinneables (Inventario, Diario) y SFX' },
];

const DM_LAYERS: { id: DmLayerId; label: string; subtitle: string }[] = [
  { id: 'DM-0', label: 'Capa DM-0: Fondo y Plantilla del DM', subtitle: 'Textura de mando, bordes y opacidad general' },
  { id: 'DM-1', label: 'Capa DM-1: Barra Superior y Sala', subtitle: 'Título del mundo, código de sala y visor Live/DM' },
  { id: 'DM-2', label: 'Capa DM-2: Estandarte y Capucha Pública', subtitle: 'Identidad del DM proyectada a toda la mesa' },
  { id: 'DM-3', label: 'Capa DM-3: Cartas de Monstruos, NPCs y Botín', subtitle: 'Marcos de criaturas, actitud de PNJs y objetos' },
  { id: 'DM-4', label: 'Capa DM-4: Área y Monitor de Combate', subtitle: 'Iniciativa, turno activo, aliados vs enemigos' },
  { id: 'DM-5', label: 'Capa DM-5: Log y Feed de Tiradas', subtitle: 'Historial de dados públicos y tiradas ocultas' },
  { id: 'DM-6', label: 'Capa DM-6: Atlas Mundi y Explorador', subtitle: 'Marco geográfico, pestañas de zonas y pines' },
  { id: 'DM-7', label: 'Capa DM-7: Libro de Crónicas del DM', subtitle: 'Páginas de lectura pública y caja de secretos' },
  { id: 'DM-8', label: 'Capa DM-8: Modo Mapa del DM', subtitle: 'Lienzo, selector Live/Offline, cola visual y dados' },
  { id: 'DM-9', label: 'Capa DM-9: Pop-ups y Modales del DM', subtitle: 'Editores de monstruos/PNJs, transferencias y buzón' },
];

const APP_LAYERS: { id: AppLayerId; label: string; subtitle: string }[] = [
  { id: 'App-0', label: 'Capa App-0: Fondo Universal y Temporada', subtitle: 'Wallpaper global, atmósfera y gradientes' },
  { id: 'App-1', label: 'Capa App-1: Cabecera Universal de WeRoll', subtitle: 'Logo, título, Sabio Arcano, Manual y Compendio' },
  { id: 'App-2', label: 'Capa App-2: Banner Hero y Bienvenida', subtitle: 'Saludo de temporada y botones de acción primaria' },
  { id: 'App-3', label: 'Capa App-3: Tarjetas de Personajes y Mesas', subtitle: 'Fichas en el lobby y selector de salas' },
  { id: 'App-4', label: 'Capa App-4: Caja y Panel de Amigos', subtitle: 'Dimensiones, marco PNG, estados online y chat' },
  { id: 'App-5', label: 'Capa App-5: Foro Comunitario', subtitle: 'Paneles de discusión, tarjetas de hilo y flairs' },
  { id: 'App-6', label: 'Capa App-6: Tienda de Skins (Escaparate)', subtitle: 'Tarjetas de escaparate, filtros y botón de canje' },
  { id: 'App-7', label: 'Capa App-7: Pop-ups del Sistema', subtitle: 'Ventana de chat con amigos y modal unirse a sala' },
  { id: 'App-8', label: 'Capa App-8: Herencia Armónica Admin/Creador', subtitle: 'Adaptación automática de paleta y fondo' },
];

export const VisualSkinDesignerStudio: React.FC<VisualSkinDesignerStudioProps> = ({
  skin,
  isAdmin,
  onSave,
  onActivateOnline,
  onClose,
}) => {
  const targetScope: 'player' | 'dm' | 'app' = (skin.scope || skin.target || 'player') as
    | 'player'
    | 'dm'
    | 'app';
  const scope: string = targetScope;

  const [draft, setDraft] = useState<AppSkinRecord>(() => {
    const copy = JSON.parse(JSON.stringify(skin));
    copy.scope = targetScope;
    copy.target = targetScope;
    return copy;
  });

  // Strictly scoped active layer ID
  const [activePlayerLayer, setActivePlayerLayer] = useState<PlayerLayerId>('J-0');
  const [activeDmLayer, setActiveDmLayer] = useState<DmLayerId>('DM-0');
  const [activeAppLayer, setActiveAppLayer] = useState<AppLayerId>('App-0');
  const [activeMapSubLayer, setActiveMapSubLayer] = useState<MapSubLayerId>('7A');
  const [activePopupId, setActivePopupId] = useState<string>(
    scope === 'player'
      ? 'modal_inventory'
      : scope === 'dm'
      ? 'modal_monster_edit'
      : 'modal_friend_chat'
  );

  // Lobby Visual Page Builder states (for scope === 'app')
  const [activeAppSection, setActiveAppSection] = useState<'global' | 'block' | 'popup'>('block');
  const [selectedLobbyBlockId, setSelectedLobbyBlockId] = useState<LobbyBlockId>('friends_box');
  const [selectedLobbyButtonId, setSelectedLobbyButtonId] = useState<string | null>(null);
  const [selectedLobbyPopupInnerId, setSelectedLobbyPopupInnerId] = useState<string | null>(null);

  // Preview Sub-Mode (strictly isolated to the current scope!)
  const [playerPreviewMode, setPlayerPreviewMode] = useState<'sheet' | 'tarot' | 'map' | 'popup'>('sheet');
  const [dmPreviewMode, setDmPreviewMode] = useState<'screen' | 'map' | 'popup'>('screen');
  const [appPreviewMode, setAppPreviewMode] = useState<'lobby' | 'store' | 'popup'>('lobby');

  // Interactive Sandbox Live Simulation States
  const [sandboxHp, setSandboxHp] = useState<number>(38);
  const [sandboxMaxHp] = useState<number>(45);
  const [sandboxHpAnimActive, setSandboxHpAnimActive] = useState<'damage' | 'heal' | null>(null);
  const [floatingCombatText, setFloatingCombatText] = useState<{
    id: number;
    text: string;
    type: 'damage' | 'heal';
  } | null>(null);
  const [isTarotFlipped, setIsTarotFlipped] = useState<boolean>(false);
  const [sandboxDiceResult, setSandboxDiceResult] = useState<number | null>(20);
  const [isRollingSandboxDice, setIsRollingSandboxDice] = useState<boolean>(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState('');

  const t: AppSkinThemeTokens = draft.themeTokens || {};
  const lobbyLayout: LobbyPageLayoutConfig = resolveLobbyPageLayout(t);

  const updateToken = <K extends keyof AppSkinThemeTokens>(
    key: K,
    val: AppSkinThemeTokens[K]
  ) => {
    setDraft((d) => ({
      ...d,
      themeTokens: {
        ...(d.themeTokens || {}),
        [key]: val,
      },
    }));
  };

  const updateTokensBatch = (patch: Partial<AppSkinThemeTokens>) => {
    setDraft((d) => ({
      ...d,
      themeTokens: {
        ...(d.themeTokens || {}),
        ...patch,
      },
    }));
  };

  const handleLobbyLayoutChange = (nextLayout: LobbyPageLayoutConfig) => {
    setDraft((d) => ({
      ...d,
      themeTokens: {
        ...(d.themeTokens || {}),
        lobbyPageLayout: nextLayout,
        // Keep legacy top-level tokens synced for backwards compatibility
        appGlobalWallpaperUrl: nextLayout.wallpaperUrl,
        appCustomOverlayEffectUrl: nextLayout.customOverlayUrl,
        appCustomOverlayOpacity: nextLayout.customOverlayOpacity,
        friendsBoxCustomPngUrl: nextLayout.blocks.friends_box?.bgImageUrl,
        storePanelBg: nextLayout.blocks.store_box?.bgColor,
      },
    }));
  };

  const uploadLocalImageFile = (onLoadedUrl: (dataUrl: string) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.gif,.webp,.png,.jpg,.jpeg,.svg';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onLoadedUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const currentPopupConfig: PopupSkinConfig = (t.popupConfigs && t.popupConfigs[activePopupId]) || {
    popupId: activePopupId,
    geometry: {
      maxWidth: '640px',
      borderRadius: 18,
      backdropBlur: 8,
      opacity: 98,
      animationType: 'zoom',
      animationDurationMs: 220,
    },
    visuals: {
      bgColor: '#141722',
      borderColor: '#c8a45c',
      borderWidth: 2,
      headerBgColor: '#1c1813',
    },
    typography: {
      titleFontFamily: 'cinzel',
      titleColor: '#f5e4be',
      bodyColor: '#e7e5e4',
    },
    innerElements: {
      categoryTabsBg: '#0e1017',
      categoryTabsActiveBg: '#d97706',
      coinsDisplayBg: '#1b1610',
      subItemCardBg: '#181c29',
      subItemCardBorder: '#3f3f46',
    },
  };

  const updatePopupConfig = (patch: Partial<PopupSkinConfig>) => {
    const merged: PopupSkinConfig = {
      ...currentPopupConfig,
      ...patch,
      geometry: { ...(currentPopupConfig.geometry || {}), ...(patch.geometry || {}) },
      visuals: { ...(currentPopupConfig.visuals || {}), ...(patch.visuals || {}) },
      typography: { ...(currentPopupConfig.typography || {}), ...(patch.typography || {}) },
      innerElements: {
        ...(currentPopupConfig.innerElements || {}),
        ...(patch.innerElements || {}),
      },
    };
    updateToken('popupConfigs', {
      ...(t.popupConfigs || {}),
      [activePopupId]: merged,
    });
  };

  const activeLobbyPopupOverride: SkinModalPopupOverride = resolveModalPopupConfig(
    t,
    (activePopupId as SkinModalTargetId) || 'modal_friend_chat'
  );

  const handleUpdateLobbyPopupConfig = (patch: Partial<SkinModalPopupOverride>) => {
    const targetId = (activePopupId as SkinModalTargetId) || 'modal_friend_chat';
    const nextCfg: SkinModalPopupOverride = {
      ...activeLobbyPopupOverride,
      ...patch,
    };
    updateTokensBatch({
      modalPopupOverrides: {
        ...(t.modalPopupOverrides || {}),
        [targetId]: nextCfg,
      },
      popupConfigs: {
        ...(t.popupConfigs || {}),
        [targetId]: {
          ...currentPopupConfig,
          geometry: {
            ...(currentPopupConfig.geometry || {}),
            borderRadius: nextCfg.borderRadiusPx ?? currentPopupConfig.geometry?.borderRadius ?? 18,
            opacity: Math.round((nextCfg.boxBgOpacity ?? 0.96) * 100),
          },
          visuals: {
            ...(currentPopupConfig.visuals || {}),
            bgColor: nextCfg.bgColor || currentPopupConfig.visuals?.bgColor || '#141722',
            borderColor: nextCfg.borderColor || currentPopupConfig.visuals?.borderColor || '#c8a45c',
            customFramePngUrl:
              nextCfg.customBgPngUrl ?? currentPopupConfig.visuals?.customFramePngUrl,
          },
          typography: {
            ...(currentPopupConfig.typography || {}),
            titleColor: nextCfg.headerTextColor || currentPopupConfig.typography?.titleColor || '#f5e4be',
          },
        },
      },
    });
  };

  const handleUpdateLobbyPopupInner = (
    innerId: string,
    patch: Partial<SpatialInnerElementConfig>
  ) => {
    const existing = activeLobbyPopupOverride.innerElementsConfig?.[innerId] || {
      id: innerId,
      label: innerId,
      x: 0,
      y: 0,
      widthPx: 0,
      heightPx: 0,
      scale: 1,
      opacity: 1,
      bgOpacity: 0.92,
      visible: true,
    };
    handleUpdateLobbyPopupConfig({
      innerElementsConfig: {
        ...(activeLobbyPopupOverride.innerElementsConfig || {}),
        [innerId]: {
          ...existing,
          ...patch,
        },
      },
    });
  };

  // Auto-save debounce (500ms) to local storage draft backup
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`weroll_skin_draft_${draft.id}`, JSON.stringify(draft));
      } catch {
        // ignore quota errors
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [draft]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ ...draft, scope: targetScope, target: targetScope, updatedAt: Date.now() });
      invalidateTarotSkinCache();
      setSaveToast('💾 ¡Skin guardada y sincronizada en la nube!');
      setTimeout(() => setSaveToast(''), 4000);
    } catch {
      setSaveToast('⚠️ Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  // Apply Preset Templates
  const applyPresetTemplate = (preset: 'classic' | 'steampunk' | 'cyber_glitch' | 'leather') => {
    if (preset === 'steampunk') {
      setDraft((d) => ({
        ...d,
        themeTokens: {
          ...(d.themeTokens || {}),
          sheetBgColor: '#1a1410',
          sheetBaseFrameBg: '#241b14',
          sheetBaseFrameBorder: '#d97706',
          sheetStatBoxBg: '#2b2017',
          sheetStatBoxBorder: '#f59e0b',
          sheetHpBarFill: '#ea580c',
          sheetHpAnimationType: 'clockwork',
          skinAudioDiceRoll: 'clockwork_gears',
          skinAudioDamageTaken: 'gear_grind',
          skinAudioInventoryOpen: 'metal_chest',
          tarotBorderColor: '#d97706',
          tarotGlowColor: 'rgba(245, 158, 11, 0.45)',
          tarotParticleEffect: 'fire',
        },
      }));
      setSaveToast('⚙️ Plantilla Steampunk Engranajes aplicada');
    } else if (preset === 'cyber_glitch') {
      setDraft((d) => ({
        ...d,
        themeTokens: {
          ...(d.themeTokens || {}),
          sheetBgColor: '#090d16',
          sheetBaseFrameBg: '#0f172a',
          sheetBaseFrameBorder: '#06b6d4',
          sheetStatBoxBg: '#111c33',
          sheetStatBoxBorder: '#22d3ee',
          sheetHpBarFill: '#06b6d4',
          sheetHpAnimationType: 'glitch',
          mapDiceDisplayStyle: 'digital_tablet',
          skinAudioDiceRoll: 'tablet_digital',
          skinAudioDamageTaken: 'cyber_glitch',
          skinAudioHeal: 'arcane_recharge',
          skinAudioInventoryOpen: 'holo_screen',
          tarotBorderColor: '#22d3ee',
          tarotGlowColor: 'rgba(6, 182, 212, 0.45)',
          tarotParticleEffect: 'stars',
        },
      }));
      setSaveToast('⚡ Plantilla Arcana / Tableta Glitch aplicada');
    } else if (preset === 'leather') {
      setDraft((d) => ({
        ...d,
        themeTokens: {
          ...(d.themeTokens || {}),
          sheetBgColor: '#1c1613',
          sheetBaseFrameBg: '#261e1a',
          sheetBaseFrameBorder: '#a16207',
          sheetStatBoxBg: '#2e241f',
          sheetStatBoxBorder: '#ca8a04',
          sheetHpBarFill: '#b91c1c',
          sheetHpAnimationType: 'fading',
          skinAudioDiceRoll: 'wood_classic',
          skinAudioInventoryOpen: 'leather_bag',
          tarotBorderColor: '#a16207',
          tarotParticleEffect: 'runes',
        },
      }));
      setSaveToast('📜 Plantilla Cuero Minimalista aplicada');
    } else {
      setDraft((d) => ({
        ...d,
        themeTokens: {
          ...(d.themeTokens || {}),
          sheetBgColor: '#11131a',
          sheetBaseFrameBg: '#151821',
          sheetBaseFrameBorder: '#c8a45c',
          sheetStatBoxBg: '#181b26',
          sheetStatBoxBorder: '#c8a45c',
          sheetHpBarFill: '#dc2626',
          sheetHpAnimationType: 'fading',
          mapDiceDisplayStyle: 'polyhedral_3d',
          skinAudioDiceRoll: 'wood_classic',
          skinAudioDamageTaken: 'sword_slash',
          skinAudioHeal: 'holy_chime',
          skinAudioInventoryOpen: 'leather_bag',
          tarotBorderColor: '#c8a45c',
          tarotParticleEffect: 'stars',
        },
      }));
      setSaveToast('👑 Plantilla Clásica Fantasía restaurada');
    }
    setTimeout(() => setSaveToast(''), 3000);
  };

  // Interactive Sandbox Simulators
  const triggerSandboxDamage = () => {
    soundFx.playDamageHit(t.skinAudioDamageTaken || 'sword_slash');
    setSandboxHp((prev) => Math.max(0, prev - 10));
    setSandboxHpAnimActive('damage');
    setFloatingCombatText({ id: Date.now(), text: '-10 Cortante', type: 'damage' });
    setTimeout(() => setSandboxHpAnimActive(null), 650);
    setTimeout(() => setFloatingCombatText(null), 1100);
  };

  const triggerSandboxHeal = () => {
    soundFx.playHealChime(t.skinAudioHeal || 'holy_chime');
    setSandboxHp((prev) => Math.min(sandboxMaxHp, prev + 10));
    setSandboxHpAnimActive('heal');
    setFloatingCombatText({ id: Date.now(), text: '+10 Curación', type: 'heal' });
    setTimeout(() => setSandboxHpAnimActive(null), 650);
    setTimeout(() => setFloatingCombatText(null), 1100);
  };

  const triggerSandboxDice = () => {
    soundFx.playDiceTumble(t.skinAudioDiceRoll || 'wood_classic');
    setIsRollingSandboxDice(true);
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 20) + 1;
      setSandboxDiceResult(roll);
      setIsRollingSandboxDice(false);
      if (roll === 20) soundFx.playCriticalHit();
      if (roll === 1) soundFx.playCriticalFumble();
    }, 350);
  };

  const triggerSandboxFlipTarot = () => {
    soundFx.playCardFlip(t.skinAudioCardFlip || 'parchment_whisper');
    setIsTarotFlipped((prev) => !prev);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(draft, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${draft.id || 'skin'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      data-testid="visual-skin-designer-studio"
      className="fixed inset-0 z-50 bg-[#0b0c12] text-stone-100 flex flex-col overflow-hidden animate-fadeIn"
    >
      {/* =================================================================== */}
      {/* TOP BAR: STRICT SCOPE BADGE + SANDBOX SIMULATORS + CLOUD SAVE       */}
      {/* =================================================================== */}
      <header className="px-4 py-2.5 bg-[#12141f] border-b border-amber-500/40 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="btn-visual-designer-back"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-cinzel font-bold text-xs flex items-center gap-1.5 border border-stone-600 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Volver</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                  scope === 'player'
                    ? 'bg-cyan-950/90 border-cyan-500/60 text-cyan-300'
                    : scope === 'dm'
                    ? 'bg-red-950/90 border-red-500/60 text-red-300'
                    : 'bg-purple-950/90 border-purple-500/60 text-purple-300'
                }`}
              >
                {scope === 'player'
                  ? 'ÁMBITO EXCLUSIVO: SKIN DE JUGADOR (HOJA + TAROT + MAPA)'
                  : scope === 'dm'
                  ? 'ÁMBITO EXCLUSIVO: SKIN DE DUNGEON MASTER (PANTALLA + ESTANDARTE + MAPA DM)'
                  : 'ÁMBITO GLOBAL: SKIN DE LA APP (LOBBY + FORO + TIENDA + HERENCIA)'}
              </span>
              <span className="text-[11px] font-mono text-stone-400">
                Auto-guardado activo
              </span>
            </div>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="font-cinzel font-black text-base sm:text-lg text-[#f5e4be] bg-transparent border-b border-transparent hover:border-amber-400 focus:border-amber-400 focus:outline-none px-1"
            />
          </div>
        </div>

        {/* Live Sandbox Quick Test Bar */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#090b10] px-3 py-1.5 rounded-xl border border-stone-800">
          <span className="text-[10px] font-mono text-amber-300 uppercase mr-1">
            Laboratorio Sandbox:
          </span>
          {scope !== 'app' && (
            <>
              <button
                type="button"
                onClick={triggerSandboxDamage}
                className="px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                title="Probar animación y sonido al recibir daño"
              >
                <Heart className="w-3 h-3 text-red-400" />
                <span>-10 Daño</span>
              </button>
              <button
                type="button"
                onClick={triggerSandboxHeal}
                className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                title="Probar animación y sonido al curar"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>+10 Curar</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={triggerSandboxDice}
            className="px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            title="Probar tirada de dados y sonido por skin"
          >
            <Dices className="w-3 h-3 text-amber-400" />
            <span>Tirar D20</span>
          </button>
          {scope === 'player' && (
            <button
              type="button"
              onClick={triggerSandboxFlipTarot}
              className="px-2.5 py-1 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              title="Probar giro 3D de la Carta Tarot y ver su reverso"
            >
              <RotateCw className="w-3 h-3 text-purple-400" />
              <span>Girar Tarot 3D</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              soundFx.playInventoryOpen(t.skinAudioInventoryOpen || 'leather_bag');
              if (scope === 'player') setPlayerPreviewMode('popup');
              else if (scope === 'dm') setDmPreviewMode('popup');
              else setAppPreviewMode('popup');
            }}
            className="px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            title="Probar sonido y aspecto de Pop-ups"
          >
            <Volume2 className="w-3 h-3 text-cyan-400" />
            <span>Probar Modal</span>
          </button>
        </div>

        {/* Save & Online Activation */}
        <div className="flex items-center gap-2">
          {saveToast && (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500/60 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              {saveToast}
            </span>
          )}

          <button
            type="button"
            onClick={handleExportJson}
            className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-mono flex items-center gap-1 border border-stone-700 cursor-pointer"
            title="Exportar configuración de Skin en JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">JSON</span>
          </button>

          <button
            type="button"
            data-testid="btn-visual-designer-save"
            disabled={isSaving}
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-stone-950 font-cinzel font-black text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : 'Guardar en Nube'}</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              data-testid="btn-visual-designer-activate-online"
              onClick={async () => {
                await handleSave();
                await onActivateOnline(draft.id, targetScope);
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-cinzel font-black text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
              title="Establecer como la Skin Default Dinámica de Temporada en el servidor"
            >
              <Globe className="w-4 h-4" />
              <span>Activar como Default Online</span>
            </button>
          )}
        </div>
      </header>

      {/* =================================================================== */}
      {/* PLAYER SKIN STUDIO: 4 APARTADOS INTERACTIVOS (COMO EL LOBBY)        */}
      {/* =================================================================== */}
      {scope === 'player' ? (
        <PlayerSkinFourApartadosEditor
          draft={draft}
          tokens={t}
          sampleCharacter={SAMPLE_CHARACTER}
          updateToken={updateToken}
          updateTokensBatch={updateTokensBatch}
        />
      ) : (
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* ================================================================= */}
        {/* COLUMN 1: HIERARCHICAL COMPONENT TREE (3 cols)                    */}
        {/* ================================================================= */}
        <aside className="lg:col-span-3 border-r border-stone-800 bg-[#0e1017] flex flex-col overflow-hidden">
          <div className="p-3 bg-[#131622] border-b border-stone-800 flex items-center justify-between">
            <span className="font-cinzel font-bold text-xs text-amber-300 uppercase flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span>Árbol de Capas ({scope.toUpperCase()})</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => applyPresetTemplate('classic')}
                className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[10px] text-amber-300 cursor-pointer"
                title="Preset Clásico"
              >
                Clásico
              </button>
              <button
                type="button"
                onClick={() => applyPresetTemplate('steampunk')}
                className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[10px] text-orange-300 cursor-pointer"
                title="Preset Steampunk Engranajes"
              >
                Steampunk
              </button>
              <button
                type="button"
                onClick={() => applyPresetTemplate('cyber_glitch')}
                className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[10px] text-cyan-300 cursor-pointer"
                title="Preset Tableta / Glitch"
              >
                Glitch
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {scope === 'player' &&
              PLAYER_LAYERS.map((layer) => {
                const isSelected = activePlayerLayer === layer.id;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => {
                      setActivePlayerLayer(layer.id);
                      if (layer.id === 'J-6') setPlayerPreviewMode('tarot');
                      else if (layer.id === 'J-7') setPlayerPreviewMode('map');
                      else if (layer.id === 'J-8') setPlayerPreviewMode('popup');
                      else setPlayerPreviewMode('sheet');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400 text-cyan-100 shadow-md'
                        : 'bg-[#131620] border-stone-800/80 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    <div className="font-cinzel font-bold text-xs">{layer.label}</div>
                    <div className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">
                      {layer.subtitle}
                    </div>
                  </button>
                );
              })}

            {scope === 'dm' &&
              DM_LAYERS.map((layer) => {
                const isSelected = activeDmLayer === layer.id;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => {
                      setActiveDmLayer(layer.id);
                      if (layer.id === 'DM-8') setDmPreviewMode('map');
                      else if (layer.id === 'DM-9') setDmPreviewMode('popup');
                      else setDmPreviewMode('screen');
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-red-950/60 border-red-400 text-red-100 shadow-md'
                        : 'bg-[#131620] border-stone-800/80 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    <div className="font-cinzel font-bold text-xs">{layer.label}</div>
                    <div className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">
                      {layer.subtitle}
                    </div>
                  </button>
                );
              })}

            {scope === 'app' && (
              <div className="space-y-2">
                {/* 0. Global Wallpaper & Overlay Folder */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveAppSection('global');
                    setSelectedLobbyButtonId(null);
                    setAppPreviewMode('lobby');
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer ${
                    activeAppSection === 'global'
                      ? 'bg-purple-950/70 border-purple-400 text-purple-100 shadow-md'
                      : 'bg-[#131620] border-stone-800/80 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  <div className="font-cinzel font-bold text-xs flex items-center justify-between">
                    <span>0. Fondo Global, Wallpaper & Overlays</span>
                    <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">
                    Imagen/GIF de fondo, transparencia, tipografía y herencia
                  </div>
                </button>

                <div className="pt-1 pb-0.5 px-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-amber-300/90">
                  <span>Cajas Reales del Lobby (Ordenables)</span>
                  <button
                    type="button"
                    onClick={() => handleLobbyLayoutChange(createDefaultLobbyPageLayout())}
                    className="text-[9px] text-stone-400 hover:text-amber-300 inline-flex items-center gap-0.5"
                    title="Restaurar todas las cajas del Lobby a su diseño por defecto"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> Reset Todo
                  </button>
                </div>

                {/* 1..7 Real Lobby Blocks in Live Order */}
                {lobbyLayout.blocksOrder.map((blockId, idx) => {
                  const block = lobbyLayout.blocks[blockId];
                  if (!block) return null;
                  const isBlockSelected =
                    activeAppSection === 'block' && selectedLobbyBlockId === blockId;

                  return (
                    <div
                      key={blockId}
                      className={`rounded-xl border transition ${
                        isBlockSelected
                          ? 'bg-amber-950/40 border-amber-400 shadow-md'
                          : 'bg-[#131620] border-stone-800/80 hover:border-stone-700'
                      }`}
                    >
                      <div
                        onClick={() => {
                          setActiveAppSection('block');
                          setSelectedLobbyBlockId(blockId);
                          setSelectedLobbyButtonId(null);
                          setAppPreviewMode('lobby');
                        }}
                        className="p-2.5 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-cinzel font-bold text-xs text-amber-100 truncate">
                            {idx + 1}. {block.name}
                          </span>
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-0.5 shrink-0"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleLobbyLayoutChange(moveLobbyBlockOrder(lobbyLayout, blockId, 'up'))
                              }
                              disabled={idx === 0}
                              title="Subir bloque en el Lobby"
                              className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-amber-300 disabled:opacity-25"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleLobbyLayoutChange(moveLobbyBlockOrder(lobbyLayout, blockId, 'down'))
                              }
                              disabled={idx === lobbyLayout.blocksOrder.length - 1}
                              title="Bajar bloque en el Lobby"
                              className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-amber-300 disabled:opacity-25"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleLobbyLayoutChange(
                                  updateLobbyBlock(lobbyLayout, blockId, {
                                    visible: !block.visible,
                                    opacity: !block.visible && block.opacity <= 0.01 ? 1 : block.opacity,
                                  })
                                )
                              }
                              title={block.visible ? 'Ocultar caja' : 'Mostrar caja'}
                              className={`p-1 rounded hover:bg-stone-800 ${
                                block.visible && block.opacity > 0.01
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {block.visible && block.opacity > 0.01 ? (
                                <Eye className="w-3 h-3" />
                              ) : (
                                <EyeOff className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="mt-1 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                          <span>
                            X:{block.x}px Y:{block.y}px · W:{block.widthPx > 0 ? `${block.widthPx}px` : 'Auto'}
                          </span>
                          <span>Marco: {Math.round(block.boxBgOpacity * 100)}%</span>
                        </div>
                      </div>

                      {/* Expandable Inner Buttons List for the Selected Block */}
                      {isBlockSelected && block.innerButtonsOrder.length > 0 && (
                        <div className="px-2.5 pb-2.5 pt-1.5 border-t border-stone-800/90 bg-stone-950/60 space-y-1">
                          <div className="text-[10px] font-mono text-amber-300/90 flex items-center justify-between">
                            <span>Botones internos ({block.innerButtonsOrder.length}):</span>
                            {selectedLobbyButtonId && (
                              <button
                                type="button"
                                onClick={() => setSelectedLobbyButtonId(null)}
                                className="text-[9px] text-amber-400 underline"
                              >
                                Editar Caja Padre
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {block.innerButtonsOrder.map((btnId, bIdx) => {
                              const btn = block.innerButtonsConfig[btnId];
                              if (!btn) return null;
                              const isBtnSelected = selectedLobbyButtonId === btnId;
                              return (
                                <div
                                  key={btnId}
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] transition ${
                                    isBtnSelected
                                      ? 'bg-amber-500 text-stone-950 border-amber-300 font-bold'
                                      : 'bg-stone-900 text-stone-300 border-stone-700 hover:border-amber-500/50'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => setSelectedLobbyButtonId(btnId)}
                                    className="truncate max-w-[115px]"
                                  >
                                    {btn.label || btnId}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleLobbyLayoutChange(
                                        moveLobbyInnerButtonOrder(lobbyLayout, blockId, btnId, 'left')
                                      )
                                    }
                                    disabled={bIdx === 0}
                                    title="Mover botón a la izquierda"
                                    className="opacity-70 hover:opacity-100 disabled:opacity-20"
                                  >
                                    <ArrowLeftIcon className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleLobbyLayoutChange(
                                        moveLobbyInnerButtonOrder(lobbyLayout, blockId, btnId, 'right')
                                      )
                                    }
                                    disabled={bIdx === block.innerButtonsOrder.length - 1}
                                    title="Mover botón a la derecha"
                                    className="opacity-70 hover:opacity-100 disabled:opacity-20"
                                  >
                                    <ArrowRightIcon className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 8. Popups & Modals */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveAppSection('popup');
                    setAppPreviewMode('popup');
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer ${
                    activeAppSection === 'popup'
                      ? 'bg-purple-950/70 border-purple-400 text-purple-100 shadow-md'
                      : 'bg-[#131620] border-stone-800/80 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  <div className="font-cinzel font-bold text-xs">8. Pop-ups y Ventanas del Lobby</div>
                  <div className="text-[10px] text-stone-400 mt-0.5">
                    Personaliza ventanas emergentes del sistema
                  </div>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ================================================================= */}
        {/* COLUMN 2: DEEP PROPERTY INSPECTOR FOR ACTIVE LAYER                */}
        {/* ================================================================= */}
        <section
          className={`${
            scope === 'app' ? 'lg:col-span-3' : 'lg:col-span-4'
          } border-r border-stone-800 bg-[#10121b] flex flex-col overflow-hidden`}
        >
          <div className="p-3 bg-[#151824] border-b border-stone-800 flex items-center justify-between">
            <span className="font-cinzel font-bold text-xs text-[#f5e4be] uppercase flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>
                Inspector de Propiedades (
                {scope === 'player'
                  ? activePlayerLayer
                  : scope === 'dm'
                  ? activeDmLayer
                  : selectedLobbyButtonId
                  ? `Botón: ${selectedLobbyButtonId}`
                  : selectedLobbyBlockId
                  ? `Caja: ${lobbyLayout.blocks[selectedLobbyBlockId]?.name || selectedLobbyBlockId}`
                  : activeAppSection === 'global'
                  ? 'Lienzo Global'
                  : 'Cajas y Pop-ups'}
                )
              </span>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* ============================================================= */}
            {/* PLAYER SCOPE INSPECTOR (J-0 to J-8)                           */}
            {/* ============================================================= */}
            {scope === 'player' && activePlayerLayer === 'J-0' && (
              <div className="space-y-4">
                <h4 className="font-cinzel font-bold text-cyan-300 text-sm">
                  Capa J-0: Plantilla Base y Fondo Exterior
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Color de Lienzo Exterior:</label>
                    <input
                      type="color"
                      value={t.sheetBgColor || '#11131a'}
                      onChange={(e) => updateToken('sheetBgColor', e.target.value)}
                      className="w-full h-8 rounded bg-transparent border border-stone-700 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Color Marco Principal:</label>
                    <input
                      type="color"
                      value={t.sheetBaseFrameBg || '#151821'}
                      onChange={(e) => updateToken('sheetBaseFrameBg', e.target.value)}
                      className="w-full h-8 rounded bg-transparent border border-stone-700 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-[11px] text-stone-300">
                      Textura / Imagen de Fondo Exterior (PNG o JPG):
                    </label>
                    <button
                      type="button"
                      data-testid="btn-upload-player-bg-png"
                      onClick={() =>
                        uploadLocalImageFile((dataUrl) => updateToken('sheetBgTextureUrl', dataUrl))
                      }
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Upload className="w-3 h-3" /> Subir Archivo PNG
                    </button>
                  </div>
                  <input
                    type="text"
                    value={t.sheetBgTextureUrl || ''}
                    onChange={(e) => updateToken('sheetBgTextureUrl', e.target.value)}
                    placeholder="Sube un archivo PNG o pega URL (https://...)"
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-[11px] text-amber-300">
                      Marco PNG Transparente para la Plantilla Base:
                    </label>
                    <button
                      type="button"
                      data-testid="btn-upload-player-frame-png"
                      onClick={() =>
                        uploadLocalImageFile((dataUrl) =>
                          updateToken('sheetBaseFrameCustomPngUrl', dataUrl)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Upload className="w-3 h-3" /> Subir Archivo PNG
                    </button>
                  </div>
                  <input
                    type="text"
                    value={t.sheetBaseFrameCustomPngUrl || ''}
                    onChange={(e) => updateToken('sheetBaseFrameCustomPngUrl', e.target.value)}
                    placeholder="Sube un archivo PNG o pega URL (https://...)"
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">
                      Opacidad Marco ({t.sheetBaseFrameOpacity ?? 100}%):
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={t.sheetBaseFrameOpacity ?? 100}
                      onChange={(e) => updateToken('sheetBaseFrameOpacity', parseInt(e.target.value, 10))}
                      className="w-full accent-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">
                      Redondeo Esquinas ({t.sheetBaseFrameRadius ?? 20}px):
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={t.sheetBaseFrameRadius ?? 20}
                      onChange={(e) => updateToken('sheetBaseFrameRadius', parseInt(e.target.value, 10))}
                      className="w-full accent-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-stone-300 mb-1">Tipografía General de la Hoja:</label>
                  <select
                    value={t.sheetFontFamily || 'cinzel'}
                    onChange={(e) => updateToken('sheetFontFamily', e.target.value as any)}
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5"
                  >
                    <option value="cinzel">Cinzel (Fantasía Clásica)</option>
                    <option value="serif">Serif Editorial</option>
                    <option value="sans">Sans-Serif Moderna</option>
                    <option value="mono">Monoespaciada / Sci-Fi</option>
                    <option value="custom">Fuente Externa (@font-face)</option>
                  </select>
                </div>

                {t.sheetFontFamily === 'custom' && (
                  <div className="space-y-2 p-2.5 rounded-xl bg-stone-900/80 border border-stone-800">
                    <input
                      type="text"
                      value={t.customFontFamilyName || ''}
                      onChange={(e) => updateToken('customFontFamilyName', e.target.value)}
                      placeholder="Nombre de familia (ej. Alagard)"
                      className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 text-[11px]"
                    />
                    <input
                      type="text"
                      value={t.customFontUrl || ''}
                      onChange={(e) => updateToken('customFontUrl', e.target.value)}
                      placeholder="URL del archivo .woff2 / .ttf"
                      className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 text-[11px] font-mono"
                    />
                  </div>
                )}
              </div>
            )}

            {scope === 'player' && activePlayerLayer === 'J-1' && (
              <div className="space-y-4">
                <h4 className="font-cinzel font-bold text-cyan-300 text-sm">
                  Capa J-1: Cabecera, Retrato y Botón de Inspiración
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Tamaño del Retrato:</label>
                    <select
                      value={t.sheetPortraitSize || 'md'}
                      onChange={(e) => updateToken('sheetPortraitSize', e.target.value as any)}
                      className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5"
                    >
                      <option value="sm">Compacto (SM)</option>
                      <option value="md">Estándar (MD)</option>
                      <option value="lg">Heroico Grande (LG)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Forma del Retrato:</label>
                    <select
                      value={t.sheetPortraitShape || 'rounded'}
                      onChange={(e) => updateToken('sheetPortraitShape', e.target.value as any)}
                      className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5"
                    >
                      <option value="circle">Circular</option>
                      <option value="rounded">Cuadrado Redondeado</option>
                      <option value="square">Cuadrado Recto</option>
                      <option value="hexagon">Hexagonal</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-[11px] text-amber-300">
                      Marco PNG del Retrato (ej. Engranajes Steampunk, Marco Glitch):
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        uploadLocalImageFile((dataUrl) =>
                          updateToken('sheetPortraitFramePngUrl', dataUrl)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Upload className="w-3 h-3" /> Subir PNG
                    </button>
                  </div>
                  <input
                    type="text"
                    value={t.sheetPortraitFramePngUrl || ''}
                    onChange={(e) => updateToken('sheetPortraitFramePngUrl', e.target.value)}
                    placeholder="Sube un archivo PNG o pega URL (https://...)"
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Color del Nombre:</label>
                    <input
                      type="color"
                      value={t.sheetNameColor || '#f5e4be'}
                      onChange={(e) => updateToken('sheetNameColor', e.target.value)}
                      className="w-full h-8 rounded bg-transparent border border-stone-700 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Color Clase y Nivel:</label>
                    <input
                      type="color"
                      value={t.sheetClassLevelColor || '#fbbf24'}
                      onChange={(e) => updateToken('sheetClassLevelColor', e.target.value)}
                      className="w-full h-8 rounded bg-transparent border border-stone-700 cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-amber-300 mb-1">
                    Icono PNG Personalizado para el Botón INSPIRACIÓN:
                  </label>
                  <input
                    type="text"
                    value={t.sheetInspirationPngUrl || ''}
                    onChange={(e) => updateToken('sheetInspirationPngUrl', e.target.value)}
                    placeholder="https://.../icono-inspiracion.png"
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>
              </div>
            )}

            {scope === 'player' && activePlayerLayer === 'J-2' && (
              <div className="space-y-4">
                <h4 className="font-cinzel font-bold text-cyan-300 text-sm">
                  Capa J-2: Cajas de Características (FUE, DES, CON, INT, SAB, CAR)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Fondo de Cajas:</label>
                    <input
                      type="color"
                      value={t.sheetStatBoxBg || '#181b26'}
                      onChange={(e) => updateToken('sheetStatBoxBg', e.target.value)}
                      className="w-full h-8 rounded bg-transparent border border-stone-700 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Borde de Cajas:</label>
                    <input
                      type="color"
                      value={t.sheetStatBoxBorder || '#c8a45c'}
                      onChange={(e) => updateToken('sheetStatBoxBorder', e.target.value)}
                      className="w-full h-8 rounded bg-transparent border border-stone-700 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-[11px] text-amber-300">
                      PNG Global para Todas las Cajas de Stats:
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        uploadLocalImageFile((dataUrl) =>
                          updateToken('sheetStatBoxCustomPngUrl', dataUrl)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Upload className="w-3 h-3" /> Subir PNG
                    </button>
                  </div>
                  <input
                    type="text"
                    value={t.sheetStatBoxCustomPngUrl || ''}
                    onChange={(e) => updateToken('sheetStatBoxCustomPngUrl', e.target.value)}
                    placeholder="Sube un archivo PNG o pega URL (https://...)"
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>

                <div className="p-3 rounded-xl bg-stone-900/70 border border-stone-800 space-y-2">
                  <span className="font-cinzel font-bold text-[11px] text-amber-200 block">
                    PNG Individual por Característica (Opcional):
                  </span>
                  {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityKey[]).map((ab) => (
                    <div key={ab} className="flex items-center gap-2">
                      <span className="w-10 font-mono uppercase text-[10px] text-stone-400">
                        {ab}:
                      </span>
                      <input
                        type="text"
                        value={t.sheetStatIndividualPngs?.[ab] || ''}
                        onChange={(e) =>
                          updateToken('sheetStatIndividualPngs', {
                            ...(t.sheetStatIndividualPngs || {}),
                            [ab]: e.target.value,
                          })
                        }
                        placeholder={`URL PNG para ${ab.toUpperCase()}`}
                        className="flex-1 bg-[#0b0d14] border border-stone-800 rounded-lg px-2 py-1 font-mono text-[10px]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scope === 'player' && activePlayerLayer === 'J-3' && (
              <div className="space-y-4">
                <h4 className="font-cinzel font-bold text-red-300 text-sm">
                  Capa J-3: Núcleo de Vida (HP) y Animación al Perder/Ganar Vida
                </h4>

                <div>
                  <label className="block text-[11px] font-bold text-amber-300 mb-1">
                    Estilo de Animación al Perder / Ganar Vida:
                  </label>
                  <select
                    value={t.sheetHpAnimationType || 'fading'}
                    onChange={(e) => updateToken('sheetHpAnimationType', e.target.value as any)}
                    className="w-full bg-[#0b0d14] border border-red-500/50 rounded-xl px-2.5 py-2 text-stone-100"
                  >
                    <option value="fading">Drenaje Líquido Suave (Fading Out Clásico)</option>
                    <option value="glitch">Efecto Glitch Cibernético / Arcano</option>
                    <option value="clockwork">Engranajes Mecánicos en Movimiento (Clockwork)</option>
                    <option value="blood_flash">Destello Carmesí de Sangre / Fuego</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Color Relleno de Vida:</label>
                    <input
                      type="color"
                      value={t.sheetHpBarFill || '#dc2626'}
                      onChange={(e) => updateToken('sheetHpBarFill', e.target.value)}
                      className="w-full h-8 rounded bg-transparent border border-stone-700 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Color Fondo Barra:</label>
                    <input
                      type="color"
                      value={t.sheetHpBarBg || '#2a1215'}
                      onChange={(e) => updateToken('sheetHpBarBg', e.target.value)}
                      className="w-full h-8 rounded bg-transparent border border-stone-700 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-[11px] text-stone-300">
                      PNG Marco Exterior de la Barra de Vida:
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        uploadLocalImageFile((dataUrl) =>
                          updateToken('sheetHpBarCustomFramePngUrl', dataUrl)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Upload className="w-3 h-3" /> Subir PNG
                    </button>
                  </div>
                  <input
                    type="text"
                    value={t.sheetHpBarCustomFramePngUrl || ''}
                    onChange={(e) => updateToken('sheetHpBarCustomFramePngUrl', e.target.value)}
                    placeholder="Sube un archivo PNG o pega URL (https://...)"
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-[11px] text-stone-300">
                      PNG Textura de Relleno Interior de Vida:
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        uploadLocalImageFile((dataUrl) =>
                          updateToken('sheetHpBarCustomFillPngUrl', dataUrl)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Upload className="w-3 h-3" /> Subir PNG
                    </button>
                  </div>
                  <input
                    type="text"
                    value={t.sheetHpBarCustomFillPngUrl || ''}
                    onChange={(e) => updateToken('sheetHpBarCustomFillPngUrl', e.target.value)}
                    placeholder="Sube un archivo PNG o pega URL (https://...)"
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>
              </div>
            )}

            {scope === 'player' && activePlayerLayer === 'J-4' && (
              <div className="space-y-4">
                <h4 className="font-cinzel font-bold text-amber-300 text-sm">
                  Capa J-4: El Rincón del Aventurero (Mochila, Diario, Monedas)
                </h4>

                <div>
                  <label className="block text-[11px] text-stone-300 mb-1">
                    Título Editable de la Sección:
                  </label>
                  <input
                    type="text"
                    value={t.adventurerCornerTitleText || 'Rincón del Aventurero'}
                    onChange={(e) => updateToken('adventurerCornerTitleText', e.target.value)}
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Texto Botón Mochila:</label>
                    <input
                      type="text"
                      value={t.sheetBackpackLabelText || 'Equipo e Inventario'}
                      onChange={(e) => updateToken('sheetBackpackLabelText', e.target.value)}
                      className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Texto Botón Diario:</label>
                    <input
                      type="text"
                      value={t.sheetJournalLabelText || 'Diario de Campaña'}
                      onChange={(e) => updateToken('sheetJournalLabelText', e.target.value)}
                      className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-[11px] text-amber-300">
                      PNG Icono de Mochila (ej. Cofre, Alforja, Caja Táctica):
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        uploadLocalImageFile((dataUrl) =>
                          updateToken('sheetBackpackCustomPngUrl', dataUrl)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Upload className="w-3 h-3" /> Subir PNG
                    </button>
                  </div>
                  <input
                    type="text"
                    value={t.sheetBackpackCustomPngUrl || ''}
                    onChange={(e) => updateToken('sheetBackpackCustomPngUrl', e.target.value)}
                    placeholder="Sube un archivo PNG o pega URL (https://...)"
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-[11px] text-amber-300">
                      PNG Icono de Diario (ej. Tableta Sci-Fi, Grimorio, Pergamino):
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        uploadLocalImageFile((dataUrl) =>
                          updateToken('sheetJournalCustomPngUrl', dataUrl)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Upload className="w-3 h-3" /> Subir PNG
                    </button>
                  </div>
                  <input
                    type="text"
                    value={t.sheetJournalCustomPngUrl || ''}
                    onChange={(e) => updateToken('sheetJournalCustomPngUrl', e.target.value)}
                    placeholder="Sube un archivo PNG o pega URL (https://...)"
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-[11px] text-amber-300">
                      PNG Icono de Bolsa de Monedas:
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        uploadLocalImageFile((dataUrl) =>
                          updateToken('sheetCoinPouchCustomPngUrl', dataUrl)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Upload className="w-3 h-3" /> Subir PNG
                    </button>
                  </div>
                  <input
                    type="text"
                    value={t.sheetCoinPouchCustomPngUrl || ''}
                    onChange={(e) => updateToken('sheetCoinPouchCustomPngUrl', e.target.value)}
                    placeholder="Sube un archivo PNG o pega URL (https://...)"
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>
              </div>
            )}

            {scope === 'player' && activePlayerLayer === 'J-5' && (
              <div className="space-y-4">
                <h4 className="font-cinzel font-bold text-amber-300 text-sm">
                  Capa J-5: Mazo de Juego (Combate, Habilidades y Conjuros)
                </h4>

                <div>
                  <label className="block text-[11px] text-stone-300 mb-1">
                    Título Principal del Apartado (ej. &quot;Mazo de Juego&quot; o &quot;Arsenal&quot;):
                  </label>
                  <input
                    type="text"
                    value={t.deckSectionTitleText || 'Mazo de Juego'}
                    onChange={(e) => updateToken('deckSectionTitleText', e.target.value)}
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-stone-400 mb-1">Título Combate:</label>
                    <input
                      type="text"
                      value={t.deckCombatTitleText || 'Combate y Acciones'}
                      onChange={(e) => updateToken('deckCombatTitleText', e.target.value)}
                      className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-400 mb-1">Título Habilidades:</label>
                    <input
                      type="text"
                      value={t.deckSkillsTitleText || 'Habilidades'}
                      onChange={(e) => updateToken('deckSkillsTitleText', e.target.value)}
                      className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-400 mb-1">Título Conjuros:</label>
                    <input
                      type="text"
                      value={t.deckSpellsTitleText || 'Lanzar Conjuros'}
                      onChange={(e) => updateToken('deckSpellsTitleText', e.target.value)}
                      className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 text-[11px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Posición Fórmula Daño:</label>
                    <select
                      value={t.deckDamageBadgePosition || 'right'}
                      onChange={(e) => updateToken('deckDamageBadgePosition', e.target.value as any)}
                      className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5"
                    >
                      <option value="right">A la derecha (1d8+2)</option>
                      <option value="bottom">Debajo del nombre</option>
                      <option value="inline">Integrado en línea</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Alineación de Icono:</label>
                    <select
                      value={t.deckIconAlignment || 'left'}
                      onChange={(e) => updateToken('deckIconAlignment', e.target.value as any)}
                      className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5"
                    >
                      <option value="left">Izquierda</option>
                      <option value="center">Centrado Arriba</option>
                      <option value="right">Derecha</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-[11px] text-amber-300">
                      Marco PNG para las Cartas del Mazo:
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        uploadLocalImageFile((dataUrl) =>
                          updateToken('deckCardCustomPngUrl', dataUrl)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Upload className="w-3 h-3" /> Subir PNG
                    </button>
                  </div>
                  <input
                    type="text"
                    value={t.deckCardCustomPngUrl || ''}
                    onChange={(e) => updateToken('deckCardCustomPngUrl', e.target.value)}
                    placeholder="Sube un archivo PNG o pega URL (https://...)"
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>
              </div>
            )}

            {scope === 'player' && activePlayerLayer === 'J-6' && (
              <div className="space-y-4">
                <h4 className="font-cinzel font-bold text-amber-300 text-sm">
                  Capa J-6: Carta Tarot 3D (Frente, Reverso, Giro y Partículas)
                </h4>
                <p className="text-[11px] text-stone-400">
                  Esta carta es tu identidad pública: todos los jugadores en la mesa y el lobby verán tu personaje con este diseño.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Borde de la Carta:</label>
                    <input
                      type="color"
                      value={t.tarotBorderColor || '#c8a45c'}
                      onChange={(e) => updateToken('tarotBorderColor', e.target.value)}
                      className="w-full h-8 rounded bg-transparent border border-stone-700 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Efecto de Partículas:</label>
                    <select
                      value={t.tarotParticleEffect || 'stars'}
                      onChange={(e) => updateToken('tarotParticleEffect', e.target.value as any)}
                      className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5"
                    >
                      <option value="none">Sin partículas</option>
                      <option value="fire">Brasas y Fuego</option>
                      <option value="stars">Polvo de Estrellas</option>
                      <option value="snow">Copos de Nieve</option>
                      <option value="runes">Runas Flotantes</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-[11px] text-amber-300">
                      PNG Marco Frontal de la Carta Tarot:
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        uploadLocalImageFile((dataUrl) =>
                          updateToken('tarotCardCustomFramePngUrl', dataUrl)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Upload className="w-3 h-3" /> Subir PNG
                    </button>
                  </div>
                  <input
                    type="text"
                    value={t.tarotCardCustomFramePngUrl || ''}
                    onChange={(e) => updateToken('tarotCardCustomFramePngUrl', e.target.value)}
                    placeholder="Sube un archivo PNG o pega URL (https://...)"
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-[11px] text-purple-300">
                      PNG Reverso de la Carta Tarot (Al girar en 3D):
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        uploadLocalImageFile((dataUrl) =>
                          updateToken('tarotCardBackCustomPngUrl', dataUrl)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Upload className="w-3 h-3" /> Subir PNG
                    </button>
                  </div>
                  <input
                    type="text"
                    value={t.tarotCardBackCustomPngUrl || ''}
                    onChange={(e) => updateToken('tarotCardBackCustomPngUrl', e.target.value)}
                    placeholder="Sube un archivo PNG o pega URL (https://...)"
                    className="w-full bg-[#0b0d14] border border-purple-500/50 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-stone-300 mb-1">
                    Ubicación de Estadísticas en la Carta:
                  </label>
                  <select
                    value={t.tarotCardStatPlacement || 'bottom'}
                    onChange={(e) => updateToken('tarotCardStatPlacement', e.target.value as any)}
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5"
                  >
                    <option value="bottom">Barra Inferior Clásica</option>
                    <option value="corners">En las 4 Esquinas</option>
                    <option value="side">Columna Lateral</option>
                    <option value="floating">Insignias Flotantes</option>
                  </select>
                </div>
              </div>
            )}

            {scope === 'player' && activePlayerLayer === 'J-7' && (
              <div className="space-y-4">
                <h4 className="font-cinzel font-bold text-emerald-300 text-sm">
                  Capa J-7: Modo Mapa del Jugador (7 Sub-Capas Tácticas)
                </h4>

                {/* Sub-layer selector */}
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: '7A', name: '7A Aliados' },
                      { id: '7B', name: '7B Enemigos' },
                      { id: '7C', name: '7C Dados' },
                      { id: '7D', name: '7D Mapa' },
                      { id: '7E', name: '7E Botones' },
                      { id: '7F', name: '7F Panel DM' },
                      { id: '7G', name: '7G Top Nav' },
                    ] as { id: MapSubLayerId; name: string }[]
                  ).map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setActiveMapSubLayer(sub.id)}
                      className={`px-2 py-1.5 rounded-lg font-mono text-[10px] font-bold border cursor-pointer ${
                        activeMapSubLayer === sub.id
                          ? 'bg-emerald-600 text-stone-950 border-emerald-300'
                          : 'bg-[#0b0d14] text-stone-300 border-stone-800'
                      }`}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>

                {activeMapSubLayer === '7A' && (
                  <div className="space-y-3 p-3 rounded-xl bg-stone-900/60 border border-stone-800">
                    <div className="font-bold text-emerald-200">Sub-Capa 7A: Cartas de Jugadores / Aliados</div>
                    <div>
                      <label className="block text-[11px] text-stone-300 mb-1">Posición del Panel:</label>
                      <select
                        value={t.mapAlliesPanelPosition || 'left'}
                        onChange={(e) => updateToken('mapAlliesPanelPosition', e.target.value as any)}
                        className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      >
                        <option value="left">Columna Izquierda</option>
                        <option value="right">Columna Derecha</option>
                        <option value="floating">Barra Flotante Inferior</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-300 mb-1">Color Borde de Aliados:</label>
                      <input
                        type="color"
                        value={t.mapAlliesCardBorder || '#c8a45c'}
                        onChange={(e) => updateToken('mapAlliesCardBorder', e.target.value)}
                        className="w-full h-8 rounded bg-transparent border border-stone-700"
                      />
                    </div>
                  </div>
                )}

                {activeMapSubLayer === '7B' && (
                  <div className="space-y-3 p-3 rounded-xl bg-stone-900/60 border border-stone-800">
                    <div className="font-bold text-red-300">Sub-Capa 7B: Cartas de Enemigos en Mesa</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-stone-300 mb-1">Fondo Tarjeta Enemigo:</label>
                        <input
                          type="color"
                          value={t.mapEnemiesCardBg || '#241216'}
                          onChange={(e) => updateToken('mapEnemiesCardBg', e.target.value)}
                          className="w-full h-8 rounded bg-transparent border border-stone-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-stone-300 mb-1">Borde Hostil:</label>
                        <input
                          type="color"
                          value={t.mapEnemiesCardBorder || '#dc2626'}
                          onChange={(e) => updateToken('mapEnemiesCardBorder', e.target.value)}
                          className="w-full h-8 rounded bg-transparent border border-stone-700"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeMapSubLayer === '7C' && (
                  <div className="space-y-3 p-3 rounded-xl bg-stone-900/60 border border-stone-800">
                    <div className="font-bold text-amber-300">Sub-Capa 7C: Caja y Visualizador de Dados</div>
                    <div>
                      <label className="block text-[11px] text-stone-300 mb-1">
                        Estilo Visual al Lanzar Dados:
                      </label>
                      <select
                        value={t.mapDiceDisplayStyle || 'polyhedral_3d'}
                        onChange={(e) => updateToken('mapDiceDisplayStyle', e.target.value as any)}
                        className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5"
                      >
                        <option value="polyhedral_3d">Dados Poliédricos Clásicos</option>
                        <option value="digital_tablet">Iconos en Tableta Digital / HUD</option>
                        <option value="runic_dial">Rueda Rúnica Giratoria</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-300 mb-1">
                        PNG Personalizado para la Caja de Dados:
                      </label>
                      <input
                        type="text"
                        value={t.mapDiceBoxCustomPngUrl || ''}
                        onChange={(e) => updateToken('mapDiceBoxCustomPngUrl', e.target.value)}
                        placeholder="https://.../caja-dados.png"
                        className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                )}

                {activeMapSubLayer === '7D' && (
                  <div className="space-y-3 p-3 rounded-xl bg-stone-900/60 border border-stone-800">
                    <div className="font-bold text-emerald-300">Sub-Capa 7D: Lienzo del Mapa</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-stone-300 mb-1">Fondo Lienzo:</label>
                        <input
                          type="color"
                          value={t.mapModeFrameBg || '#0d0f17'}
                          onChange={(e) => updateToken('mapModeFrameBg', e.target.value)}
                          className="w-full h-8 rounded bg-transparent border border-stone-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-stone-300 mb-1">Borde del Mapa:</label>
                        <input
                          type="color"
                          value={t.mapModeFrameBorder || '#c8a45c'}
                          onChange={(e) => updateToken('mapModeFrameBorder', e.target.value)}
                          className="w-full h-8 rounded bg-transparent border border-stone-700"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-300 mb-1">
                        Marco PNG Alrededor del Lienzo del Mapa:
                      </label>
                      <input
                        type="text"
                        value={t.mapCanvasCustomFramePngUrl || ''}
                        onChange={(e) => updateToken('mapCanvasCustomFramePngUrl', e.target.value)}
                        placeholder="https://.../marco-mapa.png"
                        className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                )}

                {activeMapSubLayer === '7E' && (
                  <div className="space-y-3 p-3 rounded-xl bg-stone-900/60 border border-stone-800">
                    <div className="font-bold text-cyan-300">Sub-Capa 7E: Botones y Controles Tácticos</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-stone-300 mb-1">Color Botones:</label>
                        <input
                          type="color"
                          value={t.mapModeButtonBg || '#d97706'}
                          onChange={(e) => updateToken('mapModeButtonBg', e.target.value)}
                          className="w-full h-8 rounded bg-transparent border border-stone-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-stone-300 mb-1">Texto Botones:</label>
                        <input
                          type="color"
                          value={t.mapModeButtonText || '#0b0c10'}
                          onChange={(e) => updateToken('mapModeButtonText', e.target.value)}
                          className="w-full h-8 rounded bg-transparent border border-stone-700"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeMapSubLayer === '7F' && (
                  <div className="space-y-3 p-3 rounded-xl bg-stone-900/60 border border-stone-800">
                    <div className="font-bold text-purple-300">Sub-Capa 7F: Panel Inferior del DM y su Mensaje</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-stone-300 mb-1">Fondo Recuadro DM:</label>
                        <input
                          type="color"
                          value={t.mapModeDmHoodBg || '#1c1526'}
                          onChange={(e) => updateToken('mapModeDmHoodBg', e.target.value)}
                          className="w-full h-8 rounded bg-transparent border border-stone-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-stone-300 mb-1">Borde Recuadro DM:</label>
                        <input
                          type="color"
                          value={t.mapModeDmHoodBorder || '#9333ea'}
                          onChange={(e) => updateToken('mapModeDmHoodBorder', e.target.value)}
                          className="w-full h-8 rounded bg-transparent border border-stone-700"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeMapSubLayer === '7G' && (
                  <div className="space-y-3 p-3 rounded-xl bg-stone-900/60 border border-stone-800">
                    <div className="font-bold text-amber-300">Sub-Capa 7G: Botones Regresar y Guardar en Nube</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-stone-300 mb-1">Botón Volver:</label>
                        <input
                          type="color"
                          value={t.mapTopNavReturnBtnBg || '#292524'}
                          onChange={(e) => updateToken('mapTopNavReturnBtnBg', e.target.value)}
                          className="w-full h-8 rounded bg-transparent border border-stone-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-stone-300 mb-1">Botón Guardar:</label>
                        <input
                          type="color"
                          value={t.mapTopNavSaveBtnBg || '#059669'}
                          onChange={(e) => updateToken('mapTopNavSaveBtnBg', e.target.value)}
                          className="w-full h-8 rounded bg-transparent border border-stone-700"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {scope === 'player' && activePlayerLayer === 'J-8' && (
              <div className="space-y-4">
                <h4 className="font-cinzel font-bold text-purple-300 text-sm">
                  Capa J-8: Modales Skinneables y Perfiles de Audio por Skin
                </h4>

                {/* Audio Profiles */}
                <div className="p-3 rounded-xl bg-stone-900/80 border border-amber-500/30 space-y-2.5">
                  <div className="font-cinzel font-bold text-amber-300 text-xs">
                    Perfiles de Sonido Propios de esta Skin:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-stone-400">Sonido de Dados:</label>
                      <select
                        value={t.skinAudioDiceRoll || 'wood_classic'}
                        onChange={(e) => {
                          updateToken('skinAudioDiceRoll', e.target.value as any);
                          soundFx.playDiceTumble(e.target.value as any);
                        }}
                        className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 text-[11px]"
                      >
                        <option value="wood_classic">Dados de Madera</option>
                        <option value="tablet_digital">Tableta Digital</option>
                        <option value="crystal_arcane">Cristal Arcano</option>
                        <option value="clockwork_gears">Engranajes</option>
                        <option value="runic_stone">Piedra Rúnica</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-400">Sonido de Daño:</label>
                      <select
                        value={t.skinAudioDamageTaken || 'sword_slash'}
                        onChange={(e) => {
                          updateToken('skinAudioDamageTaken', e.target.value as any);
                          soundFx.playDamageHit(e.target.value as any);
                        }}
                        className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 text-[11px]"
                      >
                        <option value="sword_slash">Corte de Espada</option>
                        <option value="cyber_glitch">Glitch Digital</option>
                        <option value="gear_grind">Fricción Engranajes</option>
                        <option value="crimson_pulse">Pulso Carmesí</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-400">Abrir Mochila:</label>
                      <select
                        value={t.skinAudioInventoryOpen || 'leather_bag'}
                        onChange={(e) => {
                          updateToken('skinAudioInventoryOpen', e.target.value as any);
                          soundFx.playInventoryOpen(e.target.value as any);
                        }}
                        className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 text-[11px]"
                      >
                        <option value="leather_bag">Bolsa de Cuero</option>
                        <option value="metal_chest">Cofre Metálico</option>
                        <option value="holo_screen">Holopantalla</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-400">Girar Carta Tarot:</label>
                      <select
                        value={t.skinAudioCardFlip || 'parchment_whisper'}
                        onChange={(e) => {
                          updateToken('skinAudioCardFlip', e.target.value as any);
                          soundFx.playCardFlip(e.target.value as any);
                        }}
                        className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 text-[11px]"
                      >
                        <option value="parchment_whisper">Susurro Pergamino</option>
                        <option value="heavy_tome">Tomo Pesado</option>
                        <option value="mystic_hum">Resonancia Mística</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Modal Skinning Selector */}
                <div className="p-3 rounded-xl bg-stone-900/80 border border-purple-500/30 space-y-3">
                  <label className="block text-[11px] font-bold text-purple-300">
                    Selecciona qué Pop-up / Ventana deseas personalizar por dentro:
                  </label>
                  <select
                    value={activePopupId}
                    onChange={(e) => {
                      setActivePopupId(e.target.value);
                      setPlayerPreviewMode('popup');
                    }}
                    className="w-full bg-[#0b0d14] border border-purple-500/50 rounded-xl px-2.5 py-1.5"
                  >
                    <option value="modal_inventory">Pop-up de Inventario / Mochila (Carpetas y Oro)</option>
                    <option value="modal_journal">Pop-up del Diario del Personaje</option>
                    <option value="modal_item_edit">Pop-up de Crear/Editar Arma, Objeto o Conjuro</option>
                    <option value="modal_hp_adjust">Pop-up de Aumentar / Quitar Vida</option>
                    <option value="modal_lore">Pop-up de Historia y Rasgos</option>
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-stone-400">Fondo del Pop-up:</label>
                      <input
                        type="color"
                        value={currentPopupConfig.visuals?.bgColor || '#141722'}
                        onChange={(e) =>
                          updatePopupConfig({ visuals: { bgColor: e.target.value } })
                        }
                        className="w-full h-7 rounded bg-transparent border border-stone-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-stone-400">Borde del Pop-up:</label>
                      <input
                        type="color"
                        value={currentPopupConfig.visuals?.borderColor || '#c8a45c'}
                        onChange={(e) =>
                          updatePopupConfig({ visuals: { borderColor: e.target.value } })
                        }
                        className="w-full h-7 rounded bg-transparent border border-stone-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-amber-300 mb-1">
                      Marco PNG del Pop-up Completo:
                    </label>
                    <input
                      type="text"
                      value={currentPopupConfig.visuals?.customFramePngUrl || ''}
                      onChange={(e) =>
                        updatePopupConfig({ visuals: { customFramePngUrl: e.target.value } })
                      }
                      placeholder="https://.../marco-popup-inventario.png"
                      className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono text-[10px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* DM SCOPE INSPECTOR (DM-0 to DM-9)                             */}
            {/* ============================================================= */}
                {scope === 'dm' && activeDmLayer === 'DM-0' && (
              <div className="space-y-4">
                <h4 className="font-cinzel font-bold text-red-300 text-sm">
                  Capa DM-0: Fondo y Plantilla de la Pantalla del DM
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Color de Fondo DM:</label>
                    <input
                      type="color"
                      value={t.dmScreenBgColor || '#0f0d14'}
                      onChange={(e) => updateToken('dmScreenBgColor', e.target.value)}
                      className="w-full h-8 rounded bg-transparent border border-stone-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Borde Principal DM:</label>
                    <input
                      type="color"
                      value={t.dmScreenBaseBorder || '#dc2626'}
                      onChange={(e) => updateToken('dmScreenBaseBorder', e.target.value)}
                      className="w-full h-8 rounded bg-transparent border border-stone-700"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-[11px] text-stone-300">
                      Textura / Archivo PNG de Fondo de la Hoja del DM:
                    </label>
                    <button
                      type="button"
                      data-testid="btn-upload-dm-bg-png"
                      onClick={() =>
                        uploadLocalImageFile((dataUrl) =>
                          updateToken('dmScreenCustomBgTextureUrl', dataUrl)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Upload className="w-3 h-3" /> Subir Archivo PNG
                    </button>
                  </div>
                  <input
                    type="text"
                    data-testid="input-dm-bg-png-url"
                    value={t.dmScreenCustomBgTextureUrl || ''}
                    onChange={(e) => updateToken('dmScreenCustomBgTextureUrl', e.target.value)}
                    placeholder="Sube un archivo PNG/imagen o pega URL (https://...)"
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>
              </div>
            )}

            {scope === 'dm' && activeDmLayer === 'DM-1' && (
              <div className="space-y-4">
                <h4 className="font-cinzel font-bold text-red-300 text-sm">
                  Capa DM-1: Barra Superior del DM y Estado de Sala
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Fondo Barra Superior:</label>
                    <input
                      type="color"
                      value={t.dmHeaderBg || '#18111a'}
                      onChange={(e) => updateToken('dmHeaderBg', e.target.value)}
                      className="w-full h-8 rounded bg-transparent border border-stone-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Color Título Mundo:</label>
                    <input
                      type="color"
                      value={t.dmHeaderTitleColor || '#f5e4be'}
                      onChange={(e) => updateToken('dmHeaderTitleColor', e.target.value)}
                      className="w-full h-8 rounded bg-transparent border border-stone-700"
                    />
                  </div>
                </div>
              </div>
            )}

            {scope === 'dm' && activeDmLayer === 'DM-2' && (
              <div className="space-y-4">
                <h4 className="font-cinzel font-bold text-amber-300 text-sm">
                  Capa DM-2: Estandarte y Capucha del DM (Identidad Pública)
                </h4>
                <p className="text-[11px] text-stone-400">
                  Este estandarte se muestra a todos los jugadores en el lobby y en la parte inferior del mapa táctico.
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-[11px] text-amber-300">
                      PNG Estandarte / Capucha del DM (Subir Archivo o URL):
                    </label>
                    <button
                      type="button"
                      data-testid="btn-upload-dm-hood-png"
                      onClick={() =>
                        uploadLocalImageFile((dataUrl) =>
                          updateToken('dmScreenHoodCustomPngUrl', dataUrl)
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Upload className="w-3 h-3" /> Subir Archivo PNG
                    </button>
                  </div>
                  <input
                    type="text"
                    data-testid="input-dm-hood-png-url"
                    value={t.dmScreenHoodCustomPngUrl || ''}
                    onChange={(e) => updateToken('dmScreenHoodCustomPngUrl', e.target.value)}
                    placeholder="Sube un archivo PNG/imagen o pega URL (https://...)"
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-300 mb-1">Color Acento del Estandarte:</label>
                  <input
                    type="color"
                    value={t.dmBannerAccentColor || '#f59e0b'}
                    onChange={(e) => updateToken('dmBannerAccentColor', e.target.value)}
                    className="w-full h-8 rounded bg-transparent border border-stone-700"
                  />
                </div>
              </div>
            )}

            {scope === 'dm' && activeDmLayer === 'DM-3' && (
              <div className="space-y-4">
                <h4 className="font-cinzel font-bold text-red-300 text-sm">
                  Capa DM-3: Cartas del DM (Monstruos, NPCs y Objetos)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Fondo Carta Monstruo:</label>
                    <input
                      type="color"
                      value={t.dmMonsterCardBg || '#1e1318'}
                      onChange={(e) => updateToken('dmMonsterCardBg', e.target.value)}
                      className="w-full h-8 rounded bg-transparent border border-stone-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Borde Carta Monstruo:</label>
                    <input
                      type="color"
                      value={t.dmMonsterCardBorder || '#dc2626'}
                      onChange={(e) => updateToken('dmMonsterCardBorder', e.target.value)}
                      className="w-full h-8 rounded bg-transparent border border-stone-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Fondo Carta PNJ:</label>
                    <input
                      type="color"
                      value={t.dmNpcCardBg || '#1a1813'}
                      onChange={(e) => updateToken('dmNpcCardBg', e.target.value)}
                      className="w-full h-8 rounded bg-transparent border border-stone-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Fondo Carta Objeto:</label>
                    <input
                      type="color"
                      value={t.dmItemCardBg || '#181424'}
                      onChange={(e) => updateToken('dmItemCardBg', e.target.value)}
                      className="w-full h-8 rounded bg-transparent border border-stone-700"
                    />
                  </div>
                </div>
              </div>
            )}

            {scope === 'dm' &&
              ['DM-4', 'DM-5', 'DM-6', 'DM-7', 'DM-8'].includes(activeDmLayer) && (
                <div className="space-y-4">
                  <h4 className="font-cinzel font-bold text-red-300 text-sm">
                    Configuración Visual de {activeDmLayer}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-stone-300 mb-1">Color de Superficie:</label>
                      <input
                        type="color"
                        value={
                          activeDmLayer === 'DM-4'
                            ? t.dmCombatTrackerBg || '#1c1217'
                            : activeDmLayer === 'DM-5'
                            ? t.dmRollFeedBg || '#12151f'
                            : activeDmLayer === 'DM-6'
                            ? t.dmAtlasFrameBg || '#111a17'
                            : activeDmLayer === 'DM-7'
                            ? t.dmChroniclesPageBg || '#1c1813'
                            : t.dmMapQueuePanelBg || '#141722'
                        }
                        onChange={(e) => {
                          if (activeDmLayer === 'DM-4') updateToken('dmCombatTrackerBg', e.target.value);
                          else if (activeDmLayer === 'DM-5') updateToken('dmRollFeedBg', e.target.value);
                          else if (activeDmLayer === 'DM-6') updateToken('dmAtlasFrameBg', e.target.value);
                          else if (activeDmLayer === 'DM-7')
                            updateToken('dmChroniclesPageBg', e.target.value);
                          else updateToken('dmMapQueuePanelBg', e.target.value);
                        }}
                        className="w-full h-8 rounded bg-transparent border border-stone-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-300 mb-1">Color de Borde / Acento:</label>
                      <input
                        type="color"
                        value={
                          activeDmLayer === 'DM-4'
                            ? t.dmCombatEnemyBorder || '#ef4444'
                            : activeDmLayer === 'DM-5'
                            ? t.dmRollFeedBorder || '#f59e0b'
                            : activeDmLayer === 'DM-6'
                            ? t.dmAtlasPinColor || '#10b981'
                            : activeDmLayer === 'DM-7'
                            ? t.dmChroniclesSecretBorder || '#dc2626'
                            : t.dmMapCanvasBorder || '#c8a45c'
                        }
                        onChange={(e) => {
                          if (activeDmLayer === 'DM-4')
                            updateToken('dmCombatEnemyBorder', e.target.value);
                          else if (activeDmLayer === 'DM-5')
                            updateToken('dmRollFeedBorder', e.target.value);
                          else if (activeDmLayer === 'DM-6') updateToken('dmAtlasPinColor', e.target.value);
                          else if (activeDmLayer === 'DM-7')
                            updateToken('dmChroniclesSecretBorder', e.target.value);
                          else updateToken('dmMapCanvasBorder', e.target.value);
                        }}
                        className="w-full h-8 rounded bg-transparent border border-stone-700"
                      />
                    </div>
                  </div>
                </div>
              )}

            {scope === 'dm' && activeDmLayer === 'DM-9' && (
              <div className="space-y-4">
                <h4 className="font-cinzel font-bold text-red-300 text-sm">
                  Capa DM-9: Pop-ups y Modales del Dungeon Master
                </h4>
                <select
                  value={activePopupId}
                  onChange={(e) => {
                    setActivePopupId(e.target.value);
                    setDmPreviewMode('popup');
                  }}
                  className="w-full bg-[#0b0d14] border border-red-500/50 rounded-xl px-2.5 py-1.5"
                >
                  <option value="modal_monster_edit">Modal Crear/Editar Monstruo</option>
                  <option value="modal_npc_edit">Modal Crear/Editar PNJ</option>
                  <option value="modal_chronicles">Modal Libro de Crónicas</option>
                  <option value="modal_player_messages">Modal Buzón de Mensajes de Jugadores</option>
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Fondo del Modal:</label>
                    <input
                      type="color"
                      value={currentPopupConfig.visuals?.bgColor || '#141722'}
                      onChange={(e) => updatePopupConfig({ visuals: { bgColor: e.target.value } })}
                      className="w-full h-8 rounded bg-transparent border border-stone-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Borde del Modal:</label>
                    <input
                      type="color"
                      value={currentPopupConfig.visuals?.borderColor || '#dc2626'}
                      onChange={(e) => updatePopupConfig({ visuals: { borderColor: e.target.value } })}
                      className="w-full h-8 rounded bg-transparent border border-stone-700"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* APP SCOPE INSPECTOR: SHOPIFY-STYLE LOBBY PAGE BUILDER         */}
            {/* ============================================================= */}
            {scope === 'app' && activeAppSection === 'global' && (
              <div className="space-y-4">
                <h4 className="font-cinzel font-bold text-purple-300 text-sm">
                  0. Fondo Global del Lobby, Wallpaper y Overlays Descargados
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Color Base del Lobby:</label>
                    <input
                      type="color"
                      value={t.appBgColor || '#0c0a09'}
                      onChange={(e) => updateToken('appBgColor', e.target.value)}
                      className="w-full h-8 rounded bg-transparent border border-stone-700 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-stone-300 mb-1">Color Acento General:</label>
                    <input
                      type="color"
                      value={t.accentColor || '#f59e0b'}
                      onChange={(e) => updateToken('accentColor', e.target.value)}
                      className="w-full h-8 rounded bg-transparent border border-stone-700 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Wallpaper Image Upload or URL */}
                <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-300">
                      Imagen / Wallpaper de Fondo del Lobby:
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        uploadLocalImageFile((dataUrl) =>
                          handleLobbyLayoutChange({ ...lobbyLayout, wallpaperUrl: dataUrl })
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" /> Subir Imagen PC
                    </button>
                  </div>
                  <input
                    type="text"
                    value={lobbyLayout.wallpaperUrl || ''}
                    onChange={(e) =>
                      handleLobbyLayoutChange({ ...lobbyLayout, wallpaperUrl: e.target.value })
                    }
                    placeholder="Pega URL (https://...) o sube desde tu PC"
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                  />
                  <div>
                    <div className="flex justify-between text-[10px] text-stone-400 mb-1">
                      <span>Opacidad del Wallpaper:</span>
                      <span className="font-mono text-amber-300">
                        {Math.round((lobbyLayout.wallpaperOpacity ?? 0.35) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round((lobbyLayout.wallpaperOpacity ?? 0.35) * 100)}
                      onChange={(e) =>
                        handleLobbyLayoutChange({
                          ...lobbyLayout,
                          wallpaperOpacity: Number(e.target.value) / 100,
                        })
                      }
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>

                {/* Custom Downloaded Overlay / Effect URL (GIF / WebP / PNG) */}
                <div className="p-3 rounded-xl bg-stone-900/80 border border-purple-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-purple-300">
                      Overlay / Efecto Descargado (GIF / PNG Transparente):
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        uploadLocalImageFile((dataUrl) =>
                          handleLobbyLayoutChange({ ...lobbyLayout, customOverlayUrl: dataUrl })
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" /> Subir GIF / PNG
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-400">
                    Sube cualquier animación GIF, textura de partículas o marco atmosférico que hayas descargado.
                  </p>
                  <input
                    type="text"
                    value={lobbyLayout.customOverlayUrl || ''}
                    onChange={(e) =>
                      handleLobbyLayoutChange({ ...lobbyLayout, customOverlayUrl: e.target.value })
                    }
                    placeholder="URL de GIF/PNG transparente o sube archivo..."
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                  />
                  <div>
                    <div className="flex justify-between text-[10px] text-stone-400 mb-1">
                      <span>Opacidad del Overlay:</span>
                      <span className="font-mono text-purple-300">
                        {Math.round((lobbyLayout.customOverlayOpacity ?? 0.5) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round((lobbyLayout.customOverlayOpacity ?? 0.5) * 100)}
                      onChange={(e) =>
                        handleLobbyLayoutChange({
                          ...lobbyLayout,
                          customOverlayOpacity: Number(e.target.value) / 100,
                        })
                      }
                      className="w-full accent-purple-500"
                    />
                  </div>
                </div>

                {/* Global Logo & Brand */}
                <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-300">
                      Logo Principal de la App (Esquina Superior):
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        uploadLocalImageFile((dataUrl) => updateToken('customLogoUrl', dataUrl))
                      }
                      className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" /> Subir Logo
                    </button>
                  </div>
                  <input
                    type="text"
                    value={t.customLogoUrl || ''}
                    onChange={(e) => updateToken('customLogoUrl', e.target.value)}
                    placeholder="https://.../mi-logo.png"
                    className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                  />
                </div>

                {/* Harmonized Palette Inheritance for Admin / Creator / Moderation */}
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-900/60 border border-stone-800 text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={t.adminHarmonizedInherit !== false}
                    onChange={(e) => updateToken('adminHarmonizedInherit', e.target.checked)}
                    className="rounded accent-purple-500"
                  />
                  <span className="text-[11px]">
                    Heredar automáticamente esta paleta de colores en los paneles de Admin, Creador y Moderación
                  </span>
                </label>
              </div>
            )}

            {scope === 'app' &&
              activeAppSection === 'block' &&
              (() => {
                const activeBlock: LobbyBlockLayoutConfig =
                  lobbyLayout.blocks[selectedLobbyBlockId] ||
                  createDefaultLobbyPageLayout().blocks[selectedLobbyBlockId];
                const activeBtn: LobbyInnerButtonConfig | null =
                  selectedLobbyButtonId && activeBlock.innerButtonsConfig[selectedLobbyButtonId]
                    ? activeBlock.innerButtonsConfig[selectedLobbyButtonId]
                    : null;

                // ===========================================================
                // SUB-INSPECTOR A: EDITING AN INDIVIDUAL INNER BUTTON
                // ===========================================================
                if (activeBtn && selectedLobbyButtonId) {
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-800">
                        <div>
                          <span className="text-[10px] font-mono uppercase text-amber-400">
                            Editando Botón Individual
                          </span>
                          <h4 className="font-cinzel font-bold text-amber-200 text-sm">
                            {activeBtn.label || selectedLobbyButtonId}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedLobbyButtonId(null)}
                          className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 text-[10px] font-semibold"
                        >
                          ← Volver a Caja
                        </button>
                      </div>

                      {/* Button Label & Visibility */}
                      <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-stone-200">Texto del Botón:</label>
                          <label className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={activeBtn.visible !== false}
                              onChange={(e) =>
                                handleLobbyLayoutChange(
                                  updateLobbyInnerButton(
                                    lobbyLayout,
                                    selectedLobbyBlockId,
                                    selectedLobbyButtonId,
                                    { visible: e.target.checked }
                                  )
                                )
                              }
                              className="accent-emerald-500"
                            />
                            Mostrar Botón
                          </label>
                        </div>
                        <input
                          type="text"
                          value={activeBtn.label ?? ''}
                          onChange={(e) =>
                            handleLobbyLayoutChange(
                              updateLobbyInnerButton(
                                lobbyLayout,
                                selectedLobbyBlockId,
                                selectedLobbyButtonId,
                                { label: e.target.value }
                              )
                            )
                          }
                          className="w-full bg-[#0b0d14] border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs"
                        />

                        {/* Reorder Left / Right */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleLobbyLayoutChange(
                                moveLobbyInnerButtonOrder(
                                  lobbyLayout,
                                  selectedLobbyBlockId,
                                  selectedLobbyButtonId,
                                  'left'
                                )
                              )
                            }
                            className="flex-1 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[11px] font-semibold inline-flex items-center justify-center gap-1"
                          >
                            <ArrowLeftIcon className="w-3 h-3" /> Mover Antes
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleLobbyLayoutChange(
                                moveLobbyInnerButtonOrder(
                                  lobbyLayout,
                                  selectedLobbyBlockId,
                                  selectedLobbyButtonId,
                                  'right'
                                )
                              )
                            }
                            className="flex-1 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-[11px] font-semibold inline-flex items-center justify-center gap-1"
                          >
                            Mover Después <ArrowRightIcon className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Button Pixel Position & Dimensions */}
                      <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-amber-300">
                            Posición y Tamaño en Píxeles:
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleLobbyLayoutChange(
                                updateLobbyInnerButton(
                                  lobbyLayout,
                                  selectedLobbyBlockId,
                                  selectedLobbyButtonId,
                                  { x: 0, y: 0, widthPx: 0, heightPx: 0 }
                                )
                              )
                            }
                            className="text-[10px] text-stone-400 hover:text-amber-300"
                          >
                            Reset Pos
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-stone-400">Desplazar X (px):</label>
                            <input
                              type="number"
                              value={activeBtn.x || 0}
                              onChange={(e) =>
                                handleLobbyLayoutChange(
                                  updateLobbyInnerButton(
                                    lobbyLayout,
                                    selectedLobbyBlockId,
                                    selectedLobbyButtonId,
                                    { x: Number(e.target.value) }
                                  )
                                )
                              }
                              className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-stone-400">Desplazar Y (px):</label>
                            <input
                              type="number"
                              value={activeBtn.y || 0}
                              onChange={(e) =>
                                handleLobbyLayoutChange(
                                  updateLobbyInnerButton(
                                    lobbyLayout,
                                    selectedLobbyBlockId,
                                    selectedLobbyButtonId,
                                    { y: Number(e.target.value) }
                                  )
                                )
                              }
                              className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-stone-400">Ancho Fijo (0=Auto px):</label>
                            <input
                              type="number"
                              min={0}
                              max={500}
                              value={activeBtn.widthPx || 0}
                              onChange={(e) =>
                                handleLobbyLayoutChange(
                                  updateLobbyInnerButton(
                                    lobbyLayout,
                                    selectedLobbyBlockId,
                                    selectedLobbyButtonId,
                                    { widthPx: Math.max(0, Number(e.target.value)) }
                                  )
                                )
                              }
                              className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-stone-400">Alto Fijo (0=Auto px):</label>
                            <input
                              type="number"
                              min={0}
                              max={240}
                              value={activeBtn.heightPx || 0}
                              onChange={(e) =>
                                handleLobbyLayoutChange(
                                  updateLobbyInnerButton(
                                    lobbyLayout,
                                    selectedLobbyBlockId,
                                    selectedLobbyButtonId,
                                    { heightPx: Math.max(0, Number(e.target.value)) }
                                  )
                                )
                              }
                              className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-stone-400">Tamaño Icono (px):</label>
                            <input
                              type="number"
                              min={8}
                              max={64}
                              value={activeBtn.iconSizePx || 15}
                              onChange={(e) =>
                                handleLobbyLayoutChange(
                                  updateLobbyInnerButton(
                                    lobbyLayout,
                                    selectedLobbyBlockId,
                                    selectedLobbyButtonId,
                                    { iconSizePx: Math.max(8, Number(e.target.value)) }
                                  )
                                )
                              }
                              className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-stone-400">Tamaño Letra (px):</label>
                            <input
                              type="number"
                              min={8}
                              max={36}
                              value={activeBtn.fontSizePx || 12}
                              onChange={(e) =>
                                handleLobbyLayoutChange(
                                  updateLobbyInnerButton(
                                    lobbyLayout,
                                    selectedLobbyBlockId,
                                    selectedLobbyButtonId,
                                    { fontSizePx: Math.max(8, Number(e.target.value)) }
                                  )
                                )
                              }
                              className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Button Transparency & Colors */}
                      <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-2.5">
                        <span className="text-[11px] font-bold text-amber-300">
                          Transparencia, Colores e Imagen del Botón:
                        </span>

                        <div>
                          <div className="flex justify-between text-[10px] text-stone-400 mb-1">
                            <span>Opacidad del Marco/Fondo del Botón (0% = sin recuadro):</span>
                            <span className="font-mono text-amber-300">
                              {Math.round((activeBtn.bgOpacity ?? 1) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={Math.round((activeBtn.bgOpacity ?? 1) * 100)}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyInnerButton(
                                  lobbyLayout,
                                  selectedLobbyBlockId,
                                  selectedLobbyButtonId,
                                  { bgOpacity: Number(e.target.value) / 100 }
                                )
                              )
                            }
                            className="w-full accent-amber-500"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] text-stone-400 mb-1">Fondo:</label>
                            <input
                              type="color"
                              value={activeBtn.bgColor || '#1c1917'}
                              onChange={(e) =>
                                handleLobbyLayoutChange(
                                  updateLobbyInnerButton(
                                    lobbyLayout,
                                    selectedLobbyBlockId,
                                    selectedLobbyButtonId,
                                    { bgColor: e.target.value }
                                  )
                                )
                              }
                              className="w-full h-7 rounded bg-transparent border border-stone-700"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-stone-400 mb-1">Texto/Icono:</label>
                            <input
                              type="color"
                              value={activeBtn.textColor || '#fde68a'}
                              onChange={(e) =>
                                handleLobbyLayoutChange(
                                  updateLobbyInnerButton(
                                    lobbyLayout,
                                    selectedLobbyBlockId,
                                    selectedLobbyButtonId,
                                    { textColor: e.target.value }
                                  )
                                )
                              }
                              className="w-full h-7 rounded bg-transparent border border-stone-700"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-stone-400 mb-1">Borde:</label>
                            <input
                              type="color"
                              value={activeBtn.borderColor || '#78350f'}
                              onChange={(e) =>
                                handleLobbyLayoutChange(
                                  updateLobbyInnerButton(
                                    lobbyLayout,
                                    selectedLobbyBlockId,
                                    selectedLobbyButtonId,
                                    { borderColor: e.target.value }
                                  )
                                )
                              }
                              className="w-full h-7 rounded bg-transparent border border-stone-700"
                            />
                          </div>
                        </div>

                        {/* Custom Icon & Button Background Image */}
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-stone-300">Icono PNG/SVG Personalizado:</span>
                            <button
                              type="button"
                              onClick={() =>
                                uploadLocalImageFile((dataUrl) =>
                                  handleLobbyLayoutChange(
                                    updateLobbyInnerButton(
                                      lobbyLayout,
                                      selectedLobbyBlockId,
                                      selectedLobbyButtonId,
                                      { customIconUrl: dataUrl }
                                    )
                                  )
                                )
                              }
                              className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200 text-[10px]"
                            >
                              Subir Icono
                            </button>
                          </div>
                          <input
                            type="text"
                            value={activeBtn.customIconUrl || ''}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyInnerButton(
                                  lobbyLayout,
                                  selectedLobbyBlockId,
                                  selectedLobbyButtonId,
                                  { customIconUrl: e.target.value }
                                )
                              )
                            }
                            placeholder="URL de icono o sube desde PC..."
                            className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono text-[10px]"
                          />

                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-stone-300">Imagen de Fondo del Botón:</span>
                            <button
                              type="button"
                              onClick={() =>
                                uploadLocalImageFile((dataUrl) =>
                                  handleLobbyLayoutChange(
                                    updateLobbyInnerButton(
                                      lobbyLayout,
                                      selectedLobbyBlockId,
                                      selectedLobbyButtonId,
                                      { bgImageUrl: dataUrl }
                                    )
                                  )
                                )
                              }
                              className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200 text-[10px]"
                            >
                              Subir Fondo Botón
                            </button>
                          </div>
                          <input
                            type="text"
                            value={activeBtn.bgImageUrl || ''}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyInnerButton(
                                  lobbyLayout,
                                  selectedLobbyBlockId,
                                  selectedLobbyButtonId,
                                  { bgImageUrl: e.target.value }
                                )
                              )
                            }
                            placeholder="URL de textura de botón o sube desde PC..."
                            className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono text-[10px]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                }

                // ===========================================================
                // SUB-INSPECTOR B: EDITING A LOBBY CONTAINER BLOCK
                // ===========================================================
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-800">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-amber-400">
                          Caja del Lobby Seleccionada
                        </span>
                        <h4 className="font-cinzel font-bold text-amber-200 text-sm">
                          {activeBlock.name}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleLobbyLayoutChange(
                            resetLobbyBlockToDefault(lobbyLayout, selectedLobbyBlockId)
                          )
                        }
                        className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-[10px] inline-flex items-center gap-1"
                        title="Restaurar este bloque a sus valores originales"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset
                      </button>
                    </div>

                    {/* 1. POSICIÓN Y TAMAÑO EN PÍXELES (SHOPIFY / FIGMA) */}
                    <div className="p-3 rounded-xl bg-stone-900/80 border border-amber-500/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-cinzel font-bold text-amber-300 text-xs flex items-center gap-1.5">
                          <Move className="w-3.5 h-3.5" /> 1. Posición y Tamaño (Píxeles)
                        </span>
                        <label className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={activeBlock.visible}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                  visible: e.target.checked,
                                  opacity:
                                    e.target.checked && activeBlock.opacity <= 0.01
                                      ? 1
                                      : activeBlock.opacity,
                                })
                              )
                            }
                            className="accent-emerald-500"
                          />
                          Visible
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-0.5">
                            Posición X (px):
                          </label>
                          <input
                            type="number"
                            value={activeBlock.x}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                  x: Number(e.target.value),
                                })
                              )
                            }
                            className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-0.5">
                            Posición Y (px):
                          </label>
                          <input
                            type="number"
                            value={activeBlock.y}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                  y: Number(e.target.value),
                                })
                              )
                            }
                            className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-0.5">
                            Ancho Caja (0 = Auto px):
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={1280}
                            value={activeBlock.widthPx}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                  widthPx: Math.max(0, Number(e.target.value)),
                                })
                              )
                            }
                            className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-0.5">
                            Alto Mínimo (0 = Auto px):
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={1200}
                            value={activeBlock.heightPx}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                  heightPx: Math.max(0, Number(e.target.value)),
                                })
                              )
                            }
                            className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-0.5">
                            Padding Interno (px):
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={64}
                            value={activeBlock.paddingPx}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                  paddingPx: Math.max(0, Number(e.target.value)),
                                })
                              )
                            }
                            className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-0.5">
                            Escala del Bloque (%):
                          </label>
                          <input
                            type="number"
                            min={50}
                            max={150}
                            value={Math.round((activeBlock.scale || 1) * 100)}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                  scale: Math.max(0.5, Math.min(1.5, Number(e.target.value) / 100)),
                                })
                              )
                            }
                            className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2. TRANSPARENCIA DE CAJA, MARCO E IMAGEN PERSONALIZADA */}
                    <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-2.5">
                      <span className="font-cinzel font-bold text-amber-300 text-xs block">
                        2. Transparencia, Marco e Imagen de la Caja
                      </span>

                      <div>
                        <div className="flex justify-between text-[10px] text-stone-300 mb-1">
                          <span>Opacidad del Marco/Fondo de Caja (0% = Caja Invisible):</span>
                          <span className="font-mono text-amber-300">
                            {Math.round(activeBlock.boxBgOpacity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={Math.round(activeBlock.boxBgOpacity * 100)}
                          onChange={(e) =>
                            handleLobbyLayoutChange(
                              updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                boxBgOpacity: Number(e.target.value) / 100,
                              })
                            )
                          }
                          className="w-full accent-amber-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-stone-400 mb-1">
                          <span>Opacidad Total del Bloque + Contenido (0% = Oculto):</span>
                          <span className="font-mono text-stone-200">
                            {Math.round(activeBlock.opacity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={Math.round(activeBlock.opacity * 100)}
                          onChange={(e) => {
                            const val = Number(e.target.value) / 100;
                            handleLobbyLayoutChange(
                              updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                opacity: val,
                                visible: val > 0.005,
                              })
                            );
                          }}
                          className="w-full accent-purple-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-1">Color Fondo Caja:</label>
                          <input
                            type="color"
                            value={activeBlock.bgColor || '#16110d'}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                  bgColor: e.target.value,
                                })
                              )
                            }
                            className="w-full h-8 rounded bg-transparent border border-stone-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-1">Color Borde Caja:</label>
                          <input
                            type="color"
                            value={activeBlock.borderColor || '#3f2e21'}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                  borderColor: e.target.value,
                                })
                              )
                            }
                            className="w-full h-8 rounded bg-transparent border border-stone-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-0.5">
                            Grosor Borde (px):
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={16}
                            value={activeBlock.borderWidthPx}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                  borderWidthPx: Math.max(0, Number(e.target.value)),
                                  hideBorder: Number(e.target.value) <= 0,
                                })
                              )
                            }
                            className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-0.5">
                            Redondeo Esquinas (px):
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={60}
                            value={activeBlock.borderRadiusPx}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                  borderRadiusPx: Math.max(0, Number(e.target.value)),
                                })
                              )
                            }
                            className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                          />
                        </div>
                      </div>

                      {/* Custom Image for this Box */}
                      <div className="pt-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-amber-300">
                            Imagen / Marco PNG para esta Caja:
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              uploadLocalImageFile((dataUrl) =>
                                handleLobbyLayoutChange(
                                  updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                    bgImageUrl: dataUrl,
                                  })
                                )
                              )
                            }
                            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Upload className="w-3 h-3" /> Subir Imagen
                          </button>
                        </div>
                        <input
                          type="text"
                          value={activeBlock.bgImageUrl || ''}
                          onChange={(e) =>
                            handleLobbyLayoutChange(
                              updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                bgImageUrl: e.target.value,
                              })
                            )
                          }
                          placeholder="URL de imagen PNG/JPG o sube desde tu PC..."
                          className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono text-[10px]"
                        />
                        {activeBlock.bgImageUrl && (
                          <div className="flex items-center gap-2">
                            <select
                              value={activeBlock.bgImageFit || 'cover'}
                              onChange={(e) =>
                                handleLobbyLayoutChange(
                                  updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                    bgImageFit: e.target.value as any,
                                  })
                                )
                              }
                              className="flex-1 bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 text-[10px]"
                            >
                              <option value="cover">Ajuste: Cubrir (Cover)</option>
                              <option value="stretch">Ajuste: Estirar al Marco (100% 100%)</option>
                              <option value="contain">Ajuste: Contener Completo (Contain)</option>
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                handleLobbyLayoutChange(
                                  updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                    bgImageUrl: '',
                                  })
                                )
                              }
                              className="px-2 py-1 rounded bg-rose-950/70 border border-rose-500/40 text-rose-300 text-[10px]"
                            >
                              Quitar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. TIPOGRAFÍA, TÍTULOS E ICONOS DEL BLOQUE */}
                    <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-2.5">
                      <span className="font-cinzel font-bold text-amber-300 text-xs block">
                        3. Textos, Tipografía e Iconos del Bloque
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-0.5">
                            Título del Bloque:
                          </label>
                          <input
                            type="text"
                            value={activeBlock.titleText ?? ''}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                  titleText: e.target.value,
                                })
                              )
                            }
                            className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-0.5">
                            Subtítulo / Etiqueta:
                          </label>
                          <input
                            type="text"
                            value={activeBlock.subtitleText ?? ''}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                  subtitleText: e.target.value,
                                })
                              )
                            }
                            className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-0.5">
                            Tamaño Título (px):
                          </label>
                          <input
                            type="number"
                            min={10}
                            max={48}
                            value={activeBlock.titleFontSizePx || 18}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                  titleFontSizePx: Number(e.target.value),
                                })
                              )
                            }
                            className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-0.5">
                            Tamaño Iconos (px):
                          </label>
                          <input
                            type="number"
                            min={10}
                            max={48}
                            value={activeBlock.iconSizePx || 16}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                  iconSizePx: Number(e.target.value),
                                })
                              )
                            }
                            className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-1">Color Título:</label>
                          <input
                            type="color"
                            value={activeBlock.titleColor || '#fbbf24'}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                  titleColor: e.target.value,
                                })
                              )
                            }
                            className="w-full h-7 rounded bg-transparent border border-stone-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-1">Color Texto:</label>
                          <input
                            type="color"
                            value={activeBlock.textColor || '#e7e5e4'}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                  textColor: e.target.value,
                                })
                              )
                            }
                            className="w-full h-7 rounded bg-transparent border border-stone-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-1">Color Acento:</label>
                          <input
                            type="color"
                            value={activeBlock.accentColor || '#f59e0b'}
                            onChange={(e) =>
                              handleLobbyLayoutChange(
                                updateLobbyBlock(lobbyLayout, selectedLobbyBlockId, {
                                  accentColor: e.target.value,
                                })
                              )
                            }
                            className="w-full h-7 rounded bg-transparent border border-stone-700"
                          />
                        </div>
                      </div>

                      {/* Block-specific controls: Tarot Card Dimensions for characters_box */}
                      {selectedLobbyBlockId === 'characters_box' && (
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800">
                          <div>
                            <label className="block text-[10px] text-amber-300">
                              Ancho Carta Tarot (px):
                            </label>
                            <input
                              type="number"
                              min={150}
                              max={380}
                              value={activeBlock.cardWidthPx || 220}
                              onChange={(e) =>
                                handleLobbyLayoutChange(
                                  updateLobbyBlock(lobbyLayout, 'characters_box', {
                                    cardWidthPx: Number(e.target.value),
                                  })
                                )
                              }
                              className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-amber-300">
                              Alto Carta Tarot (px):
                            </label>
                            <input
                              type="number"
                              min={200}
                              max={520}
                              value={activeBlock.cardHeightPx || 330}
                              onChange={(e) =>
                                handleLobbyLayoutChange(
                                  updateLobbyBlock(lobbyLayout, 'characters_box', {
                                    cardHeightPx: Number(e.target.value),
                                  })
                                )
                              }
                              className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {/* Block-specific controls: Avatar Size & Shape for welcome_banner */}
                      {selectedLobbyBlockId === 'welcome_banner' && (
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800">
                          <div>
                            <label className="block text-[10px] text-amber-300">
                              Tamaño Avatar (px):
                            </label>
                            <input
                              type="number"
                              min={28}
                              max={110}
                              value={activeBlock.avatarSizePx || 48}
                              onChange={(e) =>
                                handleLobbyLayoutChange(
                                  updateLobbyBlock(lobbyLayout, 'welcome_banner', {
                                    avatarSizePx: Number(e.target.value),
                                  })
                                )
                              }
                              className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-amber-300">
                              Forma del Avatar:
                            </label>
                            <select
                              value={activeBlock.avatarShape || 'circle'}
                              onChange={(e) =>
                                handleLobbyLayoutChange(
                                  updateLobbyBlock(lobbyLayout, 'welcome_banner', {
                                    avatarShape: e.target.value as any,
                                  })
                                )
                              }
                              className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 text-[11px]"
                            >
                              <option value="circle">Circular</option>
                              <option value="rounded">Cuadrado Redondeado</option>
                              <option value="square">Cuadrado Recto</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 4. QUICK BUTTON SELECTOR FOR THIS BLOCK */}
                    {activeBlock.innerButtonsOrder.length > 0 && (
                      <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-2">
                        <span className="font-cinzel font-bold text-amber-300 text-xs block">
                          4. Botones de esta Caja (Clic para editar posición/tamaño/imagen)
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {activeBlock.innerButtonsOrder.map((btnId) => {
                            const btn = activeBlock.innerButtonsConfig[btnId];
                            if (!btn) return null;
                            return (
                              <button
                                key={btnId}
                                type="button"
                                onClick={() => setSelectedLobbyButtonId(btnId)}
                                className="px-2.5 py-1.5 rounded-lg bg-stone-950 hover:bg-amber-950/40 border border-stone-700 hover:border-amber-500/50 text-left text-[11px] flex items-center justify-between"
                              >
                                <span className="truncate font-medium text-stone-200">
                                  {btn.label || btnId}
                                </span>
                                <span className="text-[9px] text-amber-400 font-mono">Editar →</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

            {scope === 'app' && activeAppSection === 'popup' && (
              <div className="space-y-4">
                <h4 className="font-cinzel font-bold text-purple-300 text-sm">
                  8. Ventanas Emergentes y Modales 1:1 del Lobby (4 Pop-ups)
                </h4>
                <p className="text-[11px] text-stone-400">
                  Elige un pop-up y arrastra o redimensiona cualquiera de sus piezas directamente en el lienzo interactivo 1:1:
                </p>

                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'modal_forum_create', label: '1. Crear en el Foro', sub: 'Nueva Publicación' },
                    { id: 'modal_friend_chat', label: '2. Mensajes de Amigos', sub: 'Chat Usuario Uno ↔ Dos' },
                    { id: 'modal_account_settings', label: '3. Ajustes de Cuenta', sub: 'Perfil y Avatar' },
                    { id: 'modal_join_room', label: '4. Unirse a Sala', sub: 'Código de Campaña' },
                  ].map((pop) => (
                    <button
                      key={pop.id}
                      type="button"
                      data-testid={`lobby-popup-select-${pop.id}`}
                      onClick={() => {
                        setActivePopupId(pop.id);
                        setSelectedLobbyPopupInnerId(null);
                        setAppPreviewMode('popup');
                      }}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        activePopupId === pop.id
                          ? 'bg-purple-950/70 border-purple-400 text-purple-100 shadow-md'
                          : 'bg-[#131620] border-stone-800 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <div className="font-cinzel font-bold text-[11px]">{pop.label}</div>
                      <div className="text-[9px] text-stone-400">{pop.sub}</div>
                    </button>
                  ))}
                </div>

                {/* Inner Elements Selector Pills for the Active Lobby Pop-up */}
                <div className="p-2.5 rounded-xl bg-stone-950/80 border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-cinzel font-bold text-amber-300 uppercase">
                      Piezas Internas Arrastrables del Pop-up
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedLobbyPopupInnerId(null)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                        !selectedLobbyPopupInnerId
                          ? 'bg-purple-500 text-white'
                          : 'bg-stone-800 text-stone-300'
                      }`}
                    >
                      Marco Ventana
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(activeLobbyPopupOverride.innerElementsOrder || []).map((elId) => {
                      const el = activeLobbyPopupOverride.innerElementsConfig?.[elId];
                      if (!el) return null;
                      const isSel = selectedLobbyPopupInnerId === elId;
                      return (
                        <button
                          key={elId}
                          type="button"
                          data-testid={`lobby-popup-inner-pill-${elId}`}
                          onClick={() => setSelectedLobbyPopupInnerId(elId)}
                          className={`px-2 py-1 rounded-lg text-[10px] border transition cursor-pointer ${
                            isSel
                              ? 'bg-cyan-950 border-cyan-400 text-cyan-100 font-bold'
                              : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                          }`}
                        >
                          {el.label || elId}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Inspector for Selected Inner Piece OR Popup Window Frame */}
                {selectedLobbyPopupInnerId &&
                activeLobbyPopupOverride.innerElementsConfig?.[selectedLobbyPopupInnerId] ? (
                  (() => {
                    const el =
                      activeLobbyPopupOverride.innerElementsConfig![selectedLobbyPopupInnerId];
                    return (
                      <div className="p-3 rounded-xl bg-stone-900/90 border border-cyan-500/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-cinzel font-bold text-cyan-300 uppercase">
                            Editando Pieza: {el.label || el.id}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateLobbyPopupInner(el.id, {
                                x: 0,
                                y: 0,
                                widthPx: 0,
                                heightPx: 0,
                              })
                            }
                            className="text-[9px] text-amber-300 hover:underline"
                          >
                            Reset Pos/Tam
                          </button>
                        </div>

                        <div>
                          <label className="block text-[10px] text-stone-300 mb-1">
                            Texto / Etiqueta Editable:
                          </label>
                          <input
                            type="text"
                            value={el.label || ''}
                            onChange={(e) =>
                              handleUpdateLobbyPopupInner(el.id, { label: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0b0d14] border border-stone-700 text-xs text-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-stone-300 mb-1">
                              Figura Geométrica:
                            </label>
                            <select
                              value={el.shape || 'rounded'}
                              onChange={(e) =>
                                handleUpdateLobbyPopupInner(el.id, {
                                  shape: e.target.value as GeometricShapeType,
                                })
                              }
                              className="w-full px-2 py-1.5 rounded-lg bg-[#0b0d14] border border-stone-700 text-[11px] text-white"
                            >
                              <option value="rounded">Redondeado</option>
                              <option value="square">Cuadrado Recto</option>
                              <option value="circle">Círculo / Píldora</option>
                              <option value="hexagon">Hexágono</option>
                              <option value="octagon">Octágono</option>
                              <option value="diamond">Rombo / Diamante</option>
                              <option value="pentagon">Pentágono</option>
                              <option value="triangle">Triángulo</option>
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
                                handleUpdateLobbyPopupInner(el.id, {
                                  bgOpacity: parseFloat(e.target.value),
                                })
                              }
                              className="w-full accent-cyan-400"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[9px] text-stone-400 mb-1">Fondo:</label>
                            <input
                              type="color"
                              value={el.bgColor || '#151924'}
                              onChange={(e) =>
                                handleUpdateLobbyPopupInner(el.id, { bgColor: e.target.value })
                              }
                              className="w-full h-7 rounded bg-stone-950 border border-stone-700"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-stone-400 mb-1">Borde:</label>
                            <input
                              type="color"
                              value={el.borderColor || '#c8a45c'}
                              onChange={(e) =>
                                handleUpdateLobbyPopupInner(el.id, { borderColor: e.target.value })
                              }
                              className="w-full h-7 rounded bg-stone-950 border border-stone-700"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-stone-400 mb-1">Texto:</label>
                            <input
                              type="color"
                              value={el.textColor || '#f5e4be'}
                              onChange={(e) =>
                                handleUpdateLobbyPopupInner(el.id, { textColor: e.target.value })
                              }
                              className="w-full h-7 rounded bg-stone-950 border border-stone-700"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-stone-300">PNG / Textura de esta Pieza:</span>
                            <button
                              type="button"
                              onClick={() =>
                                uploadLocalImageFile((dataUrl) =>
                                  handleUpdateLobbyPopupInner(el.id, { bgImageUrl: dataUrl })
                                )
                              }
                              className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-[10px] font-bold"
                            >
                              Subir PNG
                            </button>
                          </div>
                          <input
                            type="text"
                            value={el.bgImageUrl || ''}
                            onChange={(e) =>
                              handleUpdateLobbyPopupInner(el.id, { bgImageUrl: e.target.value })
                            }
                            placeholder="https://... o sube archivo PNG"
                            className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 text-[10px] font-mono"
                          />
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-stone-300 mb-1">Fondo del Modal:</label>
                        <input
                          type="color"
                          value={activeLobbyPopupOverride.bgColor || '#141722'}
                          onChange={(e) =>
                            handleUpdateLobbyPopupConfig({ bgColor: e.target.value })
                          }
                          className="w-full h-8 rounded bg-transparent border border-stone-700 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-stone-300 mb-1">Borde del Modal:</label>
                        <input
                          type="color"
                          value={activeLobbyPopupOverride.borderColor || '#c8a45c'}
                          onChange={(e) =>
                            handleUpdateLobbyPopupConfig({ borderColor: e.target.value })
                          }
                          className="w-full h-8 rounded bg-transparent border border-stone-700 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-stone-300 mb-1">Figura Ventana:</label>
                        <select
                          value={activeLobbyPopupOverride.shape || 'rounded'}
                          onChange={(e) =>
                            handleUpdateLobbyPopupConfig({
                              shape: e.target.value as GeometricShapeType,
                            })
                          }
                          className="w-full px-2 py-1.5 rounded bg-[#0b0d14] border border-stone-700 text-[11px] text-white"
                        >
                          <option value="rounded">Redondeado</option>
                          <option value="square">Cuadrado Recto</option>
                          <option value="hexagon">Hexágono</option>
                          <option value="octagon">Octágono</option>
                          <option value="diamond">Rombo</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-stone-300 mb-1">Color Título:</label>
                        <input
                          type="color"
                          value={activeLobbyPopupOverride.headerTextColor || '#f5e4be'}
                          onChange={(e) =>
                            handleUpdateLobbyPopupConfig({ headerTextColor: e.target.value })
                          }
                          className="w-full h-8 rounded bg-transparent border border-stone-700 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-stone-300 mb-1">
                        <span>Opacidad del Marco de Ventana</span>
                        <span className="font-mono text-purple-300">
                          {Math.round((activeLobbyPopupOverride.boxBgOpacity ?? 0.96) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={activeLobbyPopupOverride.boxBgOpacity ?? 0.96}
                        onChange={(e) =>
                          handleUpdateLobbyPopupConfig({
                            boxBgOpacity: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-purple-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-stone-300">Imagen / Marco PNG de Fondo:</span>
                        <button
                          type="button"
                          onClick={() =>
                            uploadLocalImageFile((dataUrl) =>
                              handleUpdateLobbyPopupConfig({ customBgPngUrl: dataUrl })
                            )
                          }
                          className="px-2 py-1 rounded bg-purple-500/20 border border-purple-500/40 text-purple-200 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3 h-3" /> Subir PNG
                        </button>
                      </div>
                      <input
                        type="text"
                        value={activeLobbyPopupOverride.customBgPngUrl || ''}
                        onChange={(e) =>
                          handleUpdateLobbyPopupConfig({ customBgPngUrl: e.target.value })
                        }
                        placeholder="https://.../modal-bg.png"
                        className="w-full bg-[#0b0d14] border border-stone-700 rounded-lg px-2 py-1 text-[10px] font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ================================================================= */}
        {/* COLUMN 3: INTERACTIVE LIVE SANDBOX & CLICK-TO-INSPECT             */}
        {/* ================================================================= */}
        <main
          className={`${
            scope === 'app' ? 'lg:col-span-6' : 'lg:col-span-5'
          } bg-[#090a0f] flex flex-col overflow-hidden`}
        >
          {/* Strictly Scoped Preview Mode Switcher */}
          <div className="px-4 py-2.5 bg-[#12141e] border-b border-stone-800 flex items-center justify-between shrink-0">
            <span className="font-cinzel font-bold text-xs text-stone-300 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-amber-400" />
              <span>Lienzo Sandbox Interactivo (Haz clic en cualquier pieza para editarla)</span>
            </span>

            {scope === 'player' && (
              <div className="flex items-center gap-1">
                {(['sheet', 'tarot', 'map', 'popup'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPlayerPreviewMode(m)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-cinzel font-bold uppercase cursor-pointer ${
                      playerPreviewMode === m
                        ? 'bg-cyan-500 text-stone-950'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {m === 'sheet'
                      ? 'Hoja'
                      : m === 'tarot'
                      ? 'Tarot 3D'
                      : m === 'map'
                      ? 'Mapa (7A-7G)'
                      : 'Pop-up'}
                  </button>
                ))}
              </div>
            )}

            {scope === 'dm' && (
              <div className="flex items-center gap-1">
                {(['screen', 'map', 'popup'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDmPreviewMode(m)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-cinzel font-bold uppercase cursor-pointer ${
                      dmPreviewMode === m
                        ? 'bg-red-600 text-white'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {m === 'screen' ? 'Pantalla DM' : m === 'map' ? 'Mapa DM' : 'Pop-up DM'}
                  </button>
                ))}
              </div>
            )}

            {scope === 'app' && (
              <div className="flex items-center gap-1">
                {(['lobby', 'popup'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setAppPreviewMode(m);
                      if (m === 'popup') setActiveAppSection('popup');
                      else if (activeAppSection === 'popup') setActiveAppSection('block');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-cinzel font-bold uppercase cursor-pointer ${
                      (m === 'lobby' && appPreviewMode !== 'popup') || appPreviewMode === m
                        ? 'bg-purple-600 text-white'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {m === 'lobby' ? 'Lobby Completo en Miniatura (1280px)' : 'Pop-ups'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sandbox Interactive Canvas */}
          <div
            className={`flex-1 overflow-y-auto ${
              scope === 'app' && appPreviewMode !== 'popup'
                ? 'p-2 flex flex-col'
                : 'p-5 flex items-center justify-center'
            } relative`}
          >
            {/* Floating Combat Text Overlay */}
            {floatingCombatText && (
              <div
                className={`absolute top-12 z-50 px-4 py-1.5 rounded-full font-cinzel font-black text-base shadow-2xl animate-bounce ${
                  floatingCombatText.type === 'damage'
                    ? 'bg-red-950/90 text-red-300 border border-red-500'
                    : 'bg-emerald-950/90 text-emerald-300 border border-emerald-500'
                }`}
              >
                {floatingCombatText.text}
              </div>
            )}

            {/* ============================================================= */}
            {/* 1. PLAYER SHEET INTERACTIVE PREVIEW                           */}
            {/* ============================================================= */}
            {scope === 'player' && playerPreviewMode === 'sheet' && (
              <div
                onClick={() => setActivePlayerLayer('J-0')}
                style={{
                  backgroundColor: t.sheetBgColor || '#11131a',
                  backgroundImage: t.sheetBgTextureUrl ? `url(${t.sheetBgTextureUrl})` : undefined,
                  backgroundSize: 'cover',
                  borderRadius: `${t.sheetBaseFrameRadius ?? 20}px`,
                  borderColor: t.sheetBaseFrameBorder || '#c8a45c',
                }}
                className="w-full max-w-xl p-4 border-2 shadow-2xl space-y-3.5 cursor-pointer transition-all"
              >
                {/* J-1: Header & Portrait */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePlayerLayer('J-1');
                  }}
                  className="p-3 rounded-xl bg-black/40 border border-stone-800 hover:border-cyan-400 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 bg-amber-950/50 border-2 border-amber-400 flex items-center justify-center font-cinzel font-black text-amber-300 ${
                        t.sheetPortraitShape === 'circle'
                          ? 'rounded-full'
                          : t.sheetPortraitShape === 'square'
                          ? 'rounded-none'
                          : 'rounded-xl'
                      }`}
                    >
                      K
                    </div>
                    <div>
                      <div
                        style={{ color: t.sheetNameColor || '#f5e4be' }}
                        className="font-cinzel font-black text-sm"
                      >
                        Kaelen el Juramentado
                      </div>
                      <div
                        style={{ color: t.sheetClassLevelColor || '#fbbf24' }}
                        className="text-[11px] font-mono"
                      >
                        Paladín Nv. 5 • Trasfondo Noble
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      soundFx.playClick();
                      setActivePlayerLayer('J-1');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400 text-amber-200 font-cinzel font-bold text-[10px]"
                  >
                    ✨ INSPIRACIÓN
                  </button>
                </div>

                {/* J-2: Stat Boxes */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePlayerLayer('J-2');
                  }}
                  className="grid grid-cols-6 gap-2"
                >
                  {[
                    { k: 'FUE', v: '18 (+4)' },
                    { k: 'DES', v: '12 (+1)' },
                    { k: 'CON', v: '16 (+3)' },
                    { k: 'INT', v: '10 (+0)' },
                    { k: 'SAB', v: '14 (+2)' },
                    { k: 'CAR', v: '16 (+3)' },
                  ].map((st) => (
                    <div
                      key={st.k}
                      style={{
                        backgroundColor: t.sheetStatBoxBg || '#181b26',
                        borderColor: t.sheetStatBoxBorder || '#c8a45c',
                        borderRadius: `${t.sheetStatBoxBorderRadius ?? 12}px`,
                      }}
                      className="p-2 border text-center hover:scale-105 transition"
                    >
                      <div className="text-[9px] font-mono text-stone-400">{st.k}</div>
                      <div className="font-cinzel font-black text-xs text-amber-200">{st.v}</div>
                    </div>
                  ))}
                </div>

                {/* J-3: HP Core with Live Animation Style */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePlayerLayer('J-3');
                  }}
                  className={`p-3 rounded-xl bg-black/50 border transition-all ${
                    sandboxHpAnimActive === 'damage' && t.sheetHpAnimationType === 'glitch'
                      ? 'border-cyan-400 translate-x-1 skew-x-2'
                      : sandboxHpAnimActive === 'damage' && t.sheetHpAnimationType === 'blood_flash'
                      ? 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.85)]'
                      : 'border-red-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-cinzel font-bold text-red-300 flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-red-500" />
                      <span>
                        Puntos de Golpe ({t.sheetHpAnimationType || 'fading'})
                      </span>
                    </span>
                    <span className="font-mono font-bold text-stone-200">
                      {sandboxHp} / {sandboxMaxHp} PG
                    </span>
                  </div>
                  <div
                    style={{ backgroundColor: t.sheetHpBarBg || '#2a1215' }}
                    className="w-full h-4 rounded-full overflow-hidden border border-stone-700 relative"
                  >
                    <div
                      style={{
                        width: `${Math.round((sandboxHp / sandboxMaxHp) * 100)}%`,
                        backgroundColor: t.sheetHpBarFill || '#dc2626',
                      }}
                      className="h-full transition-all duration-300"
                    />
                  </div>
                </div>

                {/* J-4: Adventurer's Corner */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePlayerLayer('J-4');
                  }}
                  style={{
                    backgroundColor: t.adventurerCornerBg || '#141722',
                    borderColor: t.adventurerCornerBorder || '#b45309',
                  }}
                  className="p-3 rounded-xl border space-y-2"
                >
                  <div className="font-cinzel font-bold text-xs text-amber-300">
                    {t.adventurerCornerTitleText || 'Rincón del Aventurero'}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        soundFx.playInventoryOpen(t.skinAudioInventoryOpen || 'leather_bag');
                        setActivePlayerLayer('J-4');
                      }}
                      className="p-2 rounded-lg bg-black/40 border border-stone-700 text-[11px] font-cinzel text-amber-200 hover:border-amber-400 cursor-pointer"
                    >
                      🎒 {t.sheetBackpackLabelText || 'Equipo e Inventario'}
                    </button>
                    <button
                      type="button"
                      className="p-2 rounded-lg bg-black/40 border border-stone-700 text-[11px] font-cinzel text-cyan-200"
                    >
                      📖 {t.sheetJournalLabelText || 'Diario de Campaña'}
                    </button>
                    <div className="p-2 rounded-lg bg-black/40 border border-stone-700 text-[11px] font-mono text-yellow-300 text-center">
                      🪙 150 PO
                    </div>
                  </div>
                </div>

                {/* J-5: Deck of Cards */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePlayerLayer('J-5');
                  }}
                  className="p-3 rounded-xl bg-black/40 border border-stone-800 space-y-2"
                >
                  <div className="font-cinzel font-bold text-xs text-amber-200">
                    {t.deckSectionTitleText || 'Mazo de Juego'}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div
                      style={{
                        backgroundColor: t.deckTarotCardBg || '#161924',
                        borderColor: t.deckTarotCardBorder || '#d97706',
                      }}
                      className="p-2.5 rounded-xl border text-center"
                    >
                      <Sword className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                      <div className="font-cinzel font-bold text-[11px]">
                        {t.deckCombatTitleText || 'Combate y Acciones'}
                      </div>
                      <div className="text-[10px] font-mono text-amber-300 mt-1">
                        Mandoble • 2d6+4
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor: t.deckTarotCardBg || '#161924',
                        borderColor: t.deckTarotCardBorder || '#d97706',
                      }}
                      className="p-2.5 rounded-xl border text-center"
                    >
                      <Compass className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                      <div className="font-cinzel font-bold text-[11px]">
                        {t.deckSkillsTitleText || 'Habilidades'}
                      </div>
                      <div className="text-[10px] font-mono text-cyan-300 mt-1">
                        Percepción +5
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor: t.deckTarotCardBg || '#161924',
                        borderColor: t.deckTarotCardBorder || '#d97706',
                      }}
                      className="p-2.5 rounded-xl border text-center"
                    >
                      <Sparkles className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                      <div className="font-cinzel font-bold text-[11px]">
                        {t.deckSpellsTitleText || 'Lanzar Conjuros'}
                      </div>
                      <div className="text-[10px] font-mono text-purple-300 mt-1">
                        Castigo Divino
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* 2. PLAYER TAROT 3D FLIP PREVIEW                               */}
            {/* ============================================================= */}
            {scope === 'player' && playerPreviewMode === 'tarot' && (
              <div className="flex flex-col items-center gap-4">
                <div
                  onClick={triggerSandboxFlipTarot}
                  style={{
                    borderColor: t.tarotBorderColor || '#c8a45c',
                    boxShadow: `0 0 30px ${t.tarotGlowColor || 'rgba(245, 158, 11, 0.35)'}`,
                  }}
                  className="w-64 h-96 rounded-2xl border-2 bg-[#141622] p-4 flex flex-col justify-between cursor-pointer transition-transform duration-500 hover:scale-105 relative overflow-hidden"
                >
                  {!isTarotFlipped ? (
                    <>
                      <div className="flex items-center justify-between text-xs font-mono text-amber-300">
                        <span>NV. 5 PALADÍN</span>
                        <span>CA 18</span>
                      </div>
                      <div className="text-center my-auto space-y-2">
                        <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 mx-auto flex items-center justify-center font-cinzel font-black text-2xl text-amber-300">
                          K
                        </div>
                        <h3 className="font-cinzel font-black text-lg text-[#f5e4be]">
                          Kaelen el Juramentado
                        </h3>
                        <p className="text-[11px] font-mono text-stone-400">
                          Partículas: {t.tarotParticleEffect || 'stars'}
                        </p>
                      </div>
                      <div className="p-2 rounded-xl bg-black/60 border border-stone-800 flex justify-around text-xs font-mono">
                        <span className="text-red-300">PG {sandboxHp}/{sandboxMaxHp}</span>
                        <span className="text-cyan-300">VEL 30ft</span>
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        backgroundImage: t.tarotCardBackCustomPngUrl
                          ? `url(${t.tarotCardBackCustomPngUrl})`
                          : undefined,
                        backgroundSize: 'cover',
                      }}
                      className="w-full h-full rounded-xl border border-purple-500/40 bg-gradient-to-br from-purple-950/80 via-[#12131f] to-amber-950/60 flex flex-col items-center justify-center p-4 text-center"
                    >
                      <Sparkles className="w-10 h-10 text-amber-400 mb-2" />
                      <div className="font-cinzel font-black text-sm text-amber-200">
                        REVERSO DE LA CARTA TAROT
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1">
                        Haz clic para volver al frente
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* 3. PLAYER MAP MODE (7 SUB-LAYERS 7A to 7G) PREVIEW            */}
            {/* ============================================================= */}
            {scope === 'player' && playerPreviewMode === 'map' && (
              <div
                style={{
                  backgroundColor: t.mapModeFrameBg || '#0d0f17',
                  borderColor: t.mapModeFrameBorder || '#c8a45c',
                }}
                className="w-full max-w-xl rounded-2xl border-2 p-3 space-y-3 shadow-2xl"
              >
                {/* 7G: Top Navigation */}
                <div
                  onClick={() => {
                    setActivePlayerLayer('J-7');
                    setActiveMapSubLayer('7G');
                  }}
                  className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-stone-800 cursor-pointer"
                >
                  <span
                    style={{ backgroundColor: t.mapTopNavReturnBtnBg || '#292524' }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-cinzel font-bold text-stone-200"
                  >
                    ← 7G: Volver a Hoja
                  </span>
                  <span className="text-[11px] font-cinzel text-amber-300">
                    7D: Mapa Táctico Activo
                  </span>
                  <span
                    style={{ backgroundColor: t.mapTopNavSaveBtnBg || '#059669' }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-cinzel font-bold text-white"
                  >
                    💾 Guardar
                  </span>
                </div>

                {/* Middle Grid: 7A Allies + 7D Canvas + 7B Enemies */}
                <div className="grid grid-cols-12 gap-2 h-48">
                  <div
                    onClick={() => {
                      setActivePlayerLayer('J-7');
                      setActiveMapSubLayer('7A');
                    }}
                    style={{ borderColor: t.mapAlliesCardBorder || '#c8a45c' }}
                    className="col-span-3 rounded-xl bg-black/40 border p-2 flex flex-col justify-between cursor-pointer"
                  >
                    <span className="text-[10px] font-cinzel font-bold text-amber-300">
                      7A: Aliados
                    </span>
                    <div className="text-[10px] font-mono text-stone-300">Kaelen (38 PG)</div>
                  </div>

                  <div
                    onClick={() => {
                      setActivePlayerLayer('J-7');
                      setActiveMapSubLayer('7D');
                    }}
                    className="col-span-6 rounded-xl bg-stone-900 border border-emerald-500/40 flex flex-col items-center justify-center p-2 cursor-pointer relative"
                  >
                    <span className="text-xs font-cinzel font-bold text-emerald-300">
                      7D: Lienzo del Mapa
                    </span>
                    <span className="text-[10px] font-mono text-stone-400 mt-1">
                      Cuadrícula Táctica + Niebla
                    </span>
                  </div>

                  <div
                    onClick={() => {
                      setActivePlayerLayer('J-7');
                      setActiveMapSubLayer('7B');
                    }}
                    style={{
                      backgroundColor: t.mapEnemiesCardBg || '#241216',
                      borderColor: t.mapEnemiesCardBorder || '#dc2626',
                    }}
                    className="col-span-3 rounded-xl border p-2 flex flex-col justify-between cursor-pointer"
                  >
                    <span className="text-[10px] font-cinzel font-bold text-red-300">
                      7B: Enemigos
                    </span>
                    <div className="text-[10px] font-mono text-red-200">Dragón Rojo</div>
                  </div>
                </div>

                {/* 7C Dice Box & 7F DM Banner */}
                <div className="grid grid-cols-12 gap-2">
                  <div
                    onClick={() => {
                      setActivePlayerLayer('J-7');
                      setActiveMapSubLayer('7C');
                    }}
                    className="col-span-5 p-2.5 rounded-xl bg-black/50 border border-amber-500/40 flex items-center justify-between cursor-pointer"
                  >
                    <span className="text-[10px] font-cinzel font-bold text-amber-300">
                      7C: Dados ({t.mapDiceDisplayStyle === 'digital_tablet' ? 'Tableta' : '3D'})
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-stone-950 font-mono font-black text-xs">
                      {isRollingSandboxDice ? '...' : sandboxDiceResult}
                    </span>
                  </div>

                  <div
                    onClick={() => {
                      setActivePlayerLayer('J-7');
                      setActiveMapSubLayer('7F');
                    }}
                    style={{
                      backgroundColor: t.mapModeDmHoodBg || '#1c1526',
                      borderColor: t.mapModeDmHoodBorder || '#9333ea',
                    }}
                    className="col-span-7 p-2.5 rounded-xl border flex items-center justify-between cursor-pointer"
                  >
                    <span className="text-[10px] font-cinzel font-bold text-purple-300">
                      👑 7F: Estandarte DM: &quot;La cripta tiembla...&quot;
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* 4. DM SCREEN PREVIEW                                          */}
            {/* ============================================================= */}
            {scope === 'dm' && dmPreviewMode === 'screen' && (
              <div
                style={{
                  backgroundColor: t.dmScreenBgColor || '#0f0d14',
                  borderColor: t.dmScreenBaseBorder || '#dc2626',
                }}
                className="w-full max-w-xl rounded-2xl border-2 p-4 space-y-3 shadow-2xl"
              >
                <div
                  onClick={() => setActiveDmLayer('DM-1')}
                  style={{ backgroundColor: t.dmHeaderBg || '#18111a' }}
                  className="p-2.5 rounded-xl border border-red-500/30 flex items-center justify-between cursor-pointer"
                >
                  <span
                    style={{ color: t.dmHeaderTitleColor || '#f5e4be' }}
                    className="font-cinzel font-black text-xs"
                  >
                    DM-1: Crónicas de la Costa • Sala #A9F2
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-700 text-white text-[10px] font-mono">
                    VISTA EN VIVO
                  </span>
                </div>

                <div
                  onClick={() => setActiveDmLayer('DM-2')}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-red-950/70 to-amber-950/50 border border-amber-500/40 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-cinzel font-bold text-xs text-amber-200">
                    👑 DM-2: Estandarte Público del Dungeon Master
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div
                    onClick={() => setActiveDmLayer('DM-3')}
                    style={{
                      backgroundColor: t.dmMonsterCardBg || '#1e1318',
                      borderColor: t.dmMonsterCardBorder || '#dc2626',
                    }}
                    className="p-3 rounded-xl border cursor-pointer"
                  >
                    <div className="font-cinzel font-bold text-xs text-red-200">
                      DM-3: Cartas Monstruos / PNJs
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1">
                      Gólem Rúnico • CA 17 • PG 95
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveDmLayer('DM-4')}
                    style={{ backgroundColor: t.dmCombatTrackerBg || '#1c1217' }}
                    className="p-3 rounded-xl border border-red-500/40 cursor-pointer"
                  >
                    <div className="font-cinzel font-bold text-xs text-amber-200">
                      DM-4: Área de Combate
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1">
                      Ronda 2 • Turno: Kaelen (Inic. 18)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div
                    onClick={() => setActiveDmLayer('DM-5')}
                    style={{ backgroundColor: t.dmRollFeedBg || '#12151f' }}
                    className="p-2.5 rounded-xl border border-stone-800 cursor-pointer"
                  >
                    <div className="font-cinzel font-bold text-[11px] text-amber-300">
                      DM-5: Log Dados
                    </div>
                  </div>
                  <div
                    onClick={() => setActiveDmLayer('DM-6')}
                    style={{ backgroundColor: t.dmAtlasFrameBg || '#111a17' }}
                    className="p-2.5 rounded-xl border border-stone-800 cursor-pointer"
                  >
                    <div className="font-cinzel font-bold text-[11px] text-emerald-300">
                      DM-6: Atlas Mundi
                    </div>
                  </div>
                  <div
                    onClick={() => setActiveDmLayer('DM-7')}
                    style={{ backgroundColor: t.dmChroniclesPageBg || '#1c1813' }}
                    className="p-2.5 rounded-xl border border-stone-800 cursor-pointer"
                  >
                    <div className="font-cinzel font-bold text-[11px] text-amber-200">
                      DM-7: Crónicas
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* 5. REAL INTERACTIVE LOBBY PAGE BUILDER CANVAS (1280px)        */}
            {/* ============================================================= */}
            {scope === 'app' && appPreviewMode !== 'popup' && (
              <div className="w-full h-full flex-1 flex flex-col">
                <LobbyPageBuilderCanvas
                  layout={lobbyLayout}
                  themeTokens={t}
                  selectedBlockId={selectedLobbyBlockId}
                  selectedButtonId={selectedLobbyButtonId}
                  onSelectBlock={(blockId, buttonId) => {
                    setActiveAppSection('block');
                    setSelectedLobbyBlockId(blockId);
                    setSelectedLobbyButtonId(buttonId ?? null);
                  }}
                  onChangeLayout={handleLobbyLayoutChange}
                />
              </div>
            )}

            {/* ============================================================= */}
            {/* 6. UNIVERSAL POP-UP / MODAL LIVE INTERACTIVE BUILDER          */}
            {/* ============================================================= */}
            {scope === 'app' && appPreviewMode === 'popup' && (
              <div className="w-full max-w-3xl">
                <InteractivePopupBuilderCanvas
                  modalId={(activePopupId as SkinModalTargetId) || 'modal_friend_chat'}
                  modalTitle={
                    activePopupId === 'modal_forum_create'
                      ? 'Crear Publicación en el Foro'
                      : activePopupId === 'modal_friend_chat'
                      ? 'Mensajes de Amigos (Usuario Uno ↔ Usuario Dos)'
                      : activePopupId === 'modal_account_settings'
                      ? 'Ajustes de Cuenta y Perfil'
                      : 'Unirse a Sala de Campaña'
                  }
                  config={activeLobbyPopupOverride}
                  selectedInnerId={selectedLobbyPopupInnerId}
                  onSelectInnerId={setSelectedLobbyPopupInnerId}
                  onUpdateModalConfig={handleUpdateLobbyPopupConfig}
                  onUpdateInnerElement={handleUpdateLobbyPopupInner}
                />
              </div>
            )}

            {((scope === 'player' && playerPreviewMode === 'popup') ||
              (scope === 'dm' && dmPreviewMode === 'popup')) && (
              <div
                style={{
                  backgroundColor: currentPopupConfig.visuals?.bgColor || '#141722',
                  borderColor: currentPopupConfig.visuals?.borderColor || '#c8a45c',
                  borderRadius: `${currentPopupConfig.geometry?.borderRadius ?? 18}px`,
                  opacity: (currentPopupConfig.geometry?.opacity ?? 98) / 100,
                  backgroundImage: currentPopupConfig.visuals?.customFramePngUrl
                    ? `url("${currentPopupConfig.visuals.customFramePngUrl}")`
                    : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
                className="w-full max-w-md border-2 p-5 space-y-3 shadow-2xl animate-fadeIn"
              >
                <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                  <h4
                    style={{ color: currentPopupConfig.typography?.titleColor || '#f5e4be' }}
                    className="font-cinzel font-black text-sm uppercase"
                  >
                    Vista Previa ({activePopupId})
                  </h4>
                  <span className="text-[10px] font-mono text-amber-300">Pop-up</span>
                </div>
                <p
                  style={{ color: currentPopupConfig.typography?.bodyColor || '#e7e5e4' }}
                  className="text-xs"
                >
                  Cada ventana emergente adapta sus colores, bordes, marcos PNG y opacidad según tu diseño.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
      )}
    </div>
  );
};
