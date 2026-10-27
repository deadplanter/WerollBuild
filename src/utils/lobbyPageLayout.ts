import type { CSSProperties } from 'react';
import type {
  AppSkinThemeTokens,
  LobbyBlockId,
  LobbyBlockLayoutConfig,
  LobbyInnerButtonConfig,
  LobbyPageLayoutConfig,
} from '../types/dnd';

export const ALL_LOBBY_BLOCK_IDS: LobbyBlockId[] = [
  'top_header',
  'admin_greeting',
  'welcome_banner',
  'characters_box',
  'friends_box',
  'forum_box',
  'store_box',
];

/**
 * Converts a hex (#rrggbb or #rgb) or rgba/rgb string into an rgba string with a multiplied alpha.
 * When alpha is 0, returns 'transparent'.
 */
export function applyColorWithOpacity(color: string | undefined, opacity: number | undefined): string {
  const safeOpacity = typeof opacity === 'number' ? Math.max(0, Math.min(1, opacity)) : 1;
  if (safeOpacity <= 0.001) return 'transparent';
  if (!color || color === 'transparent' || color === 'none') return 'transparent';

  const trimmed = color.trim();
  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const existingA = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        const finalA = Number((existingA * safeOpacity).toFixed(3));
        return `rgba(${r}, ${g}, ${b}, ${finalA})`;
      }
    }
  }

  const rgbaMatch = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgbaMatch) {
    const r = Number(rgbaMatch[1]);
    const g = Number(rgbaMatch[2]);
    const b = Number(rgbaMatch[3]);
    const baseA = rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1;
    const finalA = Number((baseA * safeOpacity).toFixed(3));
    return `rgba(${r}, ${g}, ${b}, ${finalA})`;
  }

  if (safeOpacity >= 0.999) return trimmed;
  return trimmed;
}

export function createDefaultLobbyPageLayout(): LobbyPageLayoutConfig {
  const blocks: Record<LobbyBlockId, LobbyBlockLayoutConfig> = {
    top_header: {
      id: 'top_header',
      name: 'Barra Superior Global (WEROLL Header)',
      visible: true,
      order: 0,
      zIndex: 40,
      x: 0,
      y: 0,
      widthPx: 0, // 0 = 100% full width
      heightPx: 72,
      scale: 1,
      paddingPx: 14,
      opacity: 1,
      boxBgOpacity: 0.95,
      hideBorder: false,
      bgColor: '#0e0b09',
      borderColor: '#3f2e21',
      borderWidthPx: 1,
      borderRadiusPx: 0,
      backdropBlurPx: 8,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
      bgImageUrl: '',
      bgImageFit: 'cover',
      titleText: 'WEROLL',
      subtitleText: 'v1.3 Beta ?',
      fontFamily: "'Cinzel', serif",
      titleFontSizePx: 22,
      bodyFontSizePx: 11,
      titleColor: '#f59e0b',
      textColor: '#e7e5e4',
      accentColor: '#f59e0b',
      iconSizePx: 16,
      avatarSizePx: 40,
      innerButtonsOrder: [
        'manual',
        'sabio',
        'account',
        'admin',
        'creator',
        'moderation',
        'feedback',
      ],
      innerButtonsConfig: {
        manual: {
          id: 'manual',
          label: 'Manual',
          visible: true,
          opacity: 1,
          bgOpacity: 0.85,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 6,
          fontSizePx: 10,
          iconSizePx: 16,
          borderRadiusPx: 12,
          borderWidthPx: 1,
          bgColor: '#1c1917',
          textColor: '#fde68a',
          borderColor: '#78350f',
        },
        sabio: {
          id: 'sabio',
          label: 'Sabio Arcano',
          visible: true,
          opacity: 1,
          bgOpacity: 0.85,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 6,
          fontSizePx: 10,
          iconSizePx: 16,
          borderRadiusPx: 12,
          borderWidthPx: 1,
          bgColor: '#1c1917',
          textColor: '#fde68a',
          borderColor: '#78350f',
        },
        account: {
          id: 'account',
          label: 'Configuración de cuenta',
          visible: true,
          opacity: 1,
          bgOpacity: 0.85,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 6,
          fontSizePx: 10,
          iconSizePx: 16,
          borderRadiusPx: 12,
          borderWidthPx: 1,
          bgColor: '#1c1917',
          textColor: '#e7e5e4',
          borderColor: '#44403c',
        },
        admin: {
          id: 'admin',
          label: 'Admin',
          visible: true,
          opacity: 1,
          bgOpacity: 0.85,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 6,
          fontSizePx: 10,
          iconSizePx: 16,
          borderRadiusPx: 12,
          borderWidthPx: 1,
          bgColor: '#3b0764',
          textColor: '#e9d5ff',
          borderColor: '#7e22ce',
        },
        creator: {
          id: 'creator',
          label: 'Creador de Contenido',
          visible: true,
          opacity: 1,
          bgOpacity: 0.85,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 6,
          fontSizePx: 10,
          iconSizePx: 16,
          borderRadiusPx: 12,
          borderWidthPx: 1,
          bgColor: '#064e3b',
          textColor: '#a7f3d0',
          borderColor: '#059669',
        },
        moderation: {
          id: 'moderation',
          label: 'Moderación',
          visible: true,
          opacity: 1,
          bgOpacity: 0.85,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 6,
          fontSizePx: 10,
          iconSizePx: 16,
          borderRadiusPx: 12,
          borderWidthPx: 1,
          bgColor: '#083344',
          textColor: '#a5f3fc',
          borderColor: '#0891b2',
        },
        feedback: {
          id: 'feedback',
          label: 'Feedback',
          visible: true,
          opacity: 1,
          bgOpacity: 0.85,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 6,
          fontSizePx: 10,
          iconSizePx: 16,
          borderRadiusPx: 12,
          borderWidthPx: 1,
          bgColor: '#451a03',
          textColor: '#fde68a',
          borderColor: '#b45309',
        },
      },
    },

    admin_greeting: {
      id: 'admin_greeting',
      name: 'Aviso Oficial del Administrador / Comunicado',
      visible: true,
      order: 1,
      zIndex: 20,
      x: 0,
      y: 0,
      widthPx: 0,
      heightPx: 0,
      scale: 1,
      paddingPx: 16,
      opacity: 1,
      boxBgOpacity: 0.9,
      hideBorder: false,
      bgColor: '#291507',
      borderColor: '#b45309',
      borderWidthPx: 1,
      borderRadiusPx: 16,
      backdropBlurPx: 6,
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
      bgImageUrl: '',
      bgImageFit: 'cover',
      titleText: 'Aviso Oficial del Administrador',
      subtitleText: 'Bienvenidos a la temporada actual de WeRoll. ¡Explora tus campañas o diseña tus propios mundos!',
      fontFamily: "'Cinzel', serif",
      titleFontSizePx: 12,
      bodyFontSizePx: 13,
      titleColor: '#fbbf24',
      textColor: '#fef3c7',
      accentColor: '#f59e0b',
      iconSizePx: 20,
      innerButtonsOrder: [],
      innerButtonsConfig: {},
    },

    welcome_banner: {
      id: 'welcome_banner',
      name: 'Banner de Bienvenida de Usuario (Perfil y Accesos)',
      visible: true,
      order: 2,
      zIndex: 20,
      x: 0,
      y: 0,
      widthPx: 0,
      heightPx: 0,
      scale: 1,
      paddingPx: 16,
      opacity: 1,
      boxBgOpacity: 0.92,
      hideBorder: false,
      bgColor: '#16110d',
      borderColor: '#78350f',
      borderWidthPx: 1,
      borderRadiusPx: 16,
      backdropBlurPx: 8,
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
      bgImageUrl: '',
      bgImageFit: 'cover',
      titleText: 'Bienvenido,',
      subtitleText: 'DM Y JUGADOR',
      fontFamily: "'Cinzel', serif",
      titleFontSizePx: 18,
      bodyFontSizePx: 12,
      titleColor: '#fef3c7',
      textColor: '#a8a29e',
      accentColor: '#f59e0b',
      iconSizePx: 15,
      avatarSizePx: 48,
      avatarShape: 'circle',
      customAvatarFrameUrl: '',
      showRoleBadges: true,
      showEmailTag: true,
      innerButtonsOrder: [
        'security',
        'admin_panel',
        'creator_studio',
        'moderation',
        'logout',
      ],
      innerButtonsConfig: {
        security: {
          id: 'security',
          label: 'Seguridad',
          visible: true,
          opacity: 1,
          bgOpacity: 0.9,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 8,
          fontSizePx: 12,
          iconSizePx: 14,
          borderRadiusPx: 12,
          borderWidthPx: 1,
          bgColor: '#1c1917',
          textColor: '#d6d3d1',
          borderColor: '#44403c',
        },
        admin_panel: {
          id: 'admin_panel',
          label: 'Panel Admin',
          visible: true,
          opacity: 1,
          bgOpacity: 0.9,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 8,
          fontSizePx: 12,
          iconSizePx: 14,
          borderRadiusPx: 12,
          borderWidthPx: 1,
          bgColor: '#3b0764',
          textColor: '#e9d5ff',
          borderColor: '#7e22ce',
        },
        creator_studio: {
          id: 'creator_studio',
          label: 'Creador de Contenido',
          visible: true,
          opacity: 1,
          bgOpacity: 0.9,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 8,
          fontSizePx: 12,
          iconSizePx: 14,
          borderRadiusPx: 12,
          borderWidthPx: 1,
          bgColor: '#064e3b',
          textColor: '#a7f3d0',
          borderColor: '#059669',
        },
        moderation: {
          id: 'moderation',
          label: 'Moderación',
          visible: true,
          opacity: 1,
          bgOpacity: 0.9,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 8,
          fontSizePx: 12,
          iconSizePx: 14,
          borderRadiusPx: 12,
          borderWidthPx: 1,
          bgColor: '#083344',
          textColor: '#a5f3fc',
          borderColor: '#0891b2',
        },
        logout: {
          id: 'logout',
          label: 'Salir de la Cuenta',
          visible: true,
          opacity: 1,
          bgOpacity: 0.9,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 8,
          fontSizePx: 12,
          iconSizePx: 14,
          borderRadiusPx: 12,
          borderWidthPx: 1,
          bgColor: '#450a0a',
          textColor: '#fecaca',
          borderColor: '#dc2626',
        },
      },
    },

    characters_box: {
      id: 'characters_box',
      name: 'Caja de Personajes & World Sheets (Tarot)',
      visible: true,
      order: 3,
      zIndex: 20,
      x: 0,
      y: 0,
      widthPx: 0, // 0 = occupies left 8/12 grid column by default
      heightPx: 0,
      scale: 1,
      paddingPx: 20,
      opacity: 1,
      boxBgOpacity: 0.92,
      hideBorder: false,
      bgColor: '#16110d',
      borderColor: '#3f2e21',
      borderWidthPx: 1,
      borderRadiusPx: 16,
      backdropBlurPx: 8,
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
      bgImageUrl: '',
      bgImageFit: 'cover',
      titleText: 'Personajes',
      subtitleText: 'World Sheets',
      fontFamily: "'Cinzel', serif",
      titleFontSizePx: 14,
      bodyFontSizePx: 12,
      titleColor: '#fbbf24',
      textColor: '#e7e5e4',
      accentColor: '#f59e0b',
      iconSizePx: 16,
      cardWidthPx: 220,
      cardHeightPx: 330,
      innerCardBgColor: '#1c1917',
      innerCardBorderColor: '#78350f',
      innerButtonsOrder: [
        'tab_characters',
        'tab_worlds',
        'btn_import',
        'btn_create',
        'card_enter',
        'card_edit',
        'card_export',
        'card_delete',
      ],
      innerButtonsConfig: {
        tab_characters: {
          id: 'tab_characters',
          label: 'Personajes',
          visible: true,
          opacity: 1,
          bgOpacity: 1,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 14,
          paddingYPx: 8,
          fontSizePx: 12,
          iconSizePx: 15,
          borderRadiusPx: 10,
          borderWidthPx: 1,
          bgColor: '#d97706',
          textColor: '#0c0a09',
          borderColor: '#f59e0b',
        },
        tab_worlds: {
          id: 'tab_worlds',
          label: 'World Sheets',
          visible: true,
          opacity: 1,
          bgOpacity: 0.85,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 14,
          paddingYPx: 8,
          fontSizePx: 12,
          iconSizePx: 15,
          borderRadiusPx: 10,
          borderWidthPx: 1,
          bgColor: '#1c1917',
          textColor: '#a8a29e',
          borderColor: '#44403c',
        },
        btn_import: {
          id: 'btn_import',
          label: 'Importar',
          visible: true,
          opacity: 1,
          bgOpacity: 0.9,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 8,
          fontSizePx: 12,
          iconSizePx: 14,
          borderRadiusPx: 10,
          borderWidthPx: 1,
          bgColor: '#292524',
          textColor: '#d6d3d1',
          borderColor: '#44403c',
        },
        btn_create: {
          id: 'btn_create',
          label: 'Crear Personaje',
          visible: true,
          opacity: 1,
          bgOpacity: 1,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 14,
          paddingYPx: 8,
          fontSizePx: 12,
          iconSizePx: 14,
          borderRadiusPx: 10,
          borderWidthPx: 1,
          bgColor: '#d97706',
          textColor: '#0c0a09',
          borderColor: '#fbbf24',
        },
        card_enter: {
          id: 'card_enter',
          label: 'Entrar a Mesa',
          visible: true,
          opacity: 1,
          bgOpacity: 1,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 7,
          fontSizePx: 11,
          iconSizePx: 14,
          borderRadiusPx: 8,
          borderWidthPx: 1,
          bgColor: '#059669',
          textColor: '#ecfdf5',
          borderColor: '#10b981',
        },
        card_edit: {
          id: 'card_edit',
          label: 'Editar',
          visible: true,
          opacity: 1,
          bgOpacity: 0.9,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 10,
          paddingYPx: 6,
          fontSizePx: 11,
          iconSizePx: 13,
          borderRadiusPx: 8,
          borderWidthPx: 1,
          bgColor: '#292524',
          textColor: '#fde68a',
          borderColor: '#78350f',
        },
        card_export: {
          id: 'card_export',
          label: 'Exportar',
          visible: true,
          opacity: 1,
          bgOpacity: 0.9,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 10,
          paddingYPx: 6,
          fontSizePx: 11,
          iconSizePx: 13,
          borderRadiusPx: 8,
          borderWidthPx: 1,
          bgColor: '#1c1917',
          textColor: '#d6d3d1',
          borderColor: '#44403c',
        },
        card_delete: {
          id: 'card_delete',
          label: 'Eliminar',
          visible: true,
          opacity: 1,
          bgOpacity: 0.9,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 10,
          paddingYPx: 6,
          fontSizePx: 11,
          iconSizePx: 13,
          borderRadiusPx: 8,
          borderWidthPx: 1,
          bgColor: '#450a0a',
          textColor: '#fca5a5',
          borderColor: '#991b1b',
        },
      },
    },

    friends_box: {
      id: 'friends_box',
      name: 'Caja de Amigos y Mesas Activas',
      visible: true,
      order: 4,
      zIndex: 20,
      x: 0,
      y: 0,
      widthPx: 0, // 0 = occupies right 4/12 grid column by default
      heightPx: 0,
      scale: 1,
      paddingPx: 20,
      opacity: 1,
      boxBgOpacity: 0.92,
      hideBorder: false,
      bgColor: '#16110d',
      borderColor: '#3f2e21',
      borderWidthPx: 1,
      borderRadiusPx: 16,
      backdropBlurPx: 8,
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
      bgImageUrl: '',
      bgImageFit: 'cover',
      titleText: 'Amigos',
      subtitleText: 'Tu ID:',
      fontFamily: "'Cinzel', serif",
      titleFontSizePx: 16,
      bodyFontSizePx: 12,
      titleColor: '#fef3c7',
      textColor: '#d6d3d1',
      accentColor: '#f59e0b',
      iconSizePx: 16,
      innerInputBgColor: '#0c0a09',
      innerInputBorderColor: '#44403c',
      innerCardBgColor: '#1c1917',
      innerCardBorderColor: '#292524',
      innerButtonsOrder: [
        'copy_id',
        'refresh_friends',
        'add_friend',
        'join_table',
      ],
      innerButtonsConfig: {
        copy_id: {
          id: 'copy_id',
          label: 'ID',
          visible: true,
          opacity: 1,
          bgOpacity: 0.9,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 10,
          paddingYPx: 6,
          fontSizePx: 11,
          iconSizePx: 13,
          borderRadiusPx: 8,
          borderWidthPx: 1,
          bgColor: '#292524',
          textColor: '#d6d3d1',
          borderColor: '#44403c',
        },
        refresh_friends: {
          id: 'refresh_friends',
          label: 'Actualizar',
          visible: true,
          opacity: 1,
          bgOpacity: 0.9,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 8,
          paddingYPx: 6,
          fontSizePx: 11,
          iconSizePx: 14,
          borderRadiusPx: 8,
          borderWidthPx: 1,
          bgColor: '#292524',
          textColor: '#d6d3d1',
          borderColor: '#44403c',
        },
        add_friend: {
          id: 'add_friend',
          label: 'Agregar',
          visible: true,
          opacity: 1,
          bgOpacity: 1,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 8,
          fontSizePx: 12,
          iconSizePx: 14,
          borderRadiusPx: 8,
          borderWidthPx: 1,
          bgColor: '#451a03',
          textColor: '#fcd34d',
          borderColor: '#b45309',
        },
        join_table: {
          id: 'join_table',
          label: 'Unirse a Mesa',
          visible: true,
          opacity: 1,
          bgOpacity: 1,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 10,
          paddingYPx: 6,
          fontSizePx: 11,
          iconSizePx: 13,
          borderRadiusPx: 8,
          borderWidthPx: 1,
          bgColor: '#064e3b',
          textColor: '#a7f3d0',
          borderColor: '#059669',
        },
      },
    },

    forum_box: {
      id: 'forum_box',
      name: 'Foro de la Comunidad (Tablón y Temas)',
      visible: true,
      order: 5,
      zIndex: 20,
      x: 0,
      y: 0,
      widthPx: 0,
      heightPx: 0,
      scale: 1,
      paddingPx: 20,
      opacity: 1,
      boxBgOpacity: 0.92,
      hideBorder: false,
      bgColor: '#16110d',
      borderColor: '#3f2e21',
      borderWidthPx: 1,
      borderRadiusPx: 16,
      backdropBlurPx: 8,
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
      bgImageUrl: '',
      bgImageFit: 'cover',
      titleText: 'Foro de la Comunidad',
      subtitleText: 'Debates, Crónicas, Reclutamiento de Mesas y Guías',
      fontFamily: "'Cinzel', serif",
      titleFontSizePx: 20,
      bodyFontSizePx: 13,
      titleColor: '#fef3c7',
      textColor: '#d6d3d1',
      accentColor: '#f59e0b',
      iconSizePx: 18,
      innerInputBgColor: '#0c0a09',
      innerInputBorderColor: '#44403c',
      innerCardBgColor: '#1c1917',
      innerCardBorderColor: '#292524',
      innerButtonsOrder: [
        'new_topic',
        'cat_all',
        'cat_announcements',
        'cat_recruitment',
        'cat_lore',
      ],
      innerButtonsConfig: {
        new_topic: {
          id: 'new_topic',
          label: 'Nuevo Tema',
          visible: true,
          opacity: 1,
          bgOpacity: 1,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 14,
          paddingYPx: 8,
          fontSizePx: 12,
          iconSizePx: 15,
          borderRadiusPx: 10,
          borderWidthPx: 1,
          bgColor: '#d97706',
          textColor: '#0c0a09',
          borderColor: '#fbbf24',
        },
        cat_all: {
          id: 'cat_all',
          label: 'Todos',
          visible: true,
          opacity: 1,
          bgOpacity: 1,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 6,
          fontSizePx: 11,
          iconSizePx: 13,
          borderRadiusPx: 8,
          borderWidthPx: 1,
          bgColor: '#451a03',
          textColor: '#fde68a',
          borderColor: '#b45309',
        },
        cat_announcements: {
          id: 'cat_announcements',
          label: 'Anuncios',
          visible: true,
          opacity: 1,
          bgOpacity: 0.85,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 6,
          fontSizePx: 11,
          iconSizePx: 13,
          borderRadiusPx: 8,
          borderWidthPx: 1,
          bgColor: '#1c1917',
          textColor: '#a8a29e',
          borderColor: '#44403c',
        },
        cat_recruitment: {
          id: 'cat_recruitment',
          label: 'Buscando Grupo',
          visible: true,
          opacity: 1,
          bgOpacity: 0.85,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 6,
          fontSizePx: 11,
          iconSizePx: 13,
          borderRadiusPx: 8,
          borderWidthPx: 1,
          bgColor: '#1c1917',
          textColor: '#a8a29e',
          borderColor: '#44403c',
        },
        cat_lore: {
          id: 'cat_lore',
          label: 'Lore & Reglas',
          visible: true,
          opacity: 1,
          bgOpacity: 0.85,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 6,
          fontSizePx: 11,
          iconSizePx: 13,
          borderRadiusPx: 8,
          borderWidthPx: 1,
          bgColor: '#1c1917',
          textColor: '#a8a29e',
          borderColor: '#44403c',
        },
      },
    },

    store_box: {
      id: 'store_box',
      name: 'Tienda de Skins & DLCs (Marketplace)',
      visible: true,
      order: 6,
      zIndex: 20,
      x: 0,
      y: 0,
      widthPx: 0,
      heightPx: 0,
      scale: 1,
      paddingPx: 20,
      opacity: 1,
      boxBgOpacity: 0.92,
      hideBorder: false,
      bgColor: '#16110d',
      borderColor: '#78350f',
      borderWidthPx: 1,
      borderRadiusPx: 16,
      backdropBlurPx: 8,
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
      bgImageUrl: '',
      bgImageFit: 'cover',
      titleText: 'Bazar Arcano — Tienda de Skins y DLCs',
      subtitleText: 'Adquiere temas visuales para tu Lobby, Hojas de Jugador, Pantallas de DM y Módulos de Aventura',
      fontFamily: "'Cinzel', serif",
      titleFontSizePx: 18,
      bodyFontSizePx: 12,
      titleColor: '#fbbf24',
      textColor: '#e7e5e4',
      accentColor: '#f59e0b',
      iconSizePx: 16,
      innerCardBgColor: '#1c1917',
      innerCardBorderColor: '#78350f',
      innerButtonsOrder: [
        'filter_skins',
        'filter_dlcs',
        'redeem_code',
        'buy_claim_btn',
      ],
      innerButtonsConfig: {
        filter_skins: {
          id: 'filter_skins',
          label: 'Skins Visuales',
          visible: true,
          opacity: 1,
          bgOpacity: 1,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 6,
          fontSizePx: 11,
          iconSizePx: 14,
          borderRadiusPx: 8,
          borderWidthPx: 1,
          bgColor: '#451a03',
          textColor: '#fde68a',
          borderColor: '#d97706',
        },
        filter_dlcs: {
          id: 'filter_dlcs',
          label: 'Paquetes DLC',
          visible: true,
          opacity: 1,
          bgOpacity: 0.85,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 6,
          fontSizePx: 11,
          iconSizePx: 14,
          borderRadiusPx: 8,
          borderWidthPx: 1,
          bgColor: '#1c1917',
          textColor: '#d6d3d1',
          borderColor: '#44403c',
        },
        redeem_code: {
          id: 'redeem_code',
          label: 'Canjear Código',
          visible: true,
          opacity: 1,
          bgOpacity: 0.9,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 6,
          fontSizePx: 11,
          iconSizePx: 14,
          borderRadiusPx: 8,
          borderWidthPx: 1,
          bgColor: '#064e3b',
          textColor: '#a7f3d0',
          borderColor: '#059669',
        },
        buy_claim_btn: {
          id: 'buy_claim_btn',
          label: 'Reclamar / Equipar',
          visible: true,
          opacity: 1,
          bgOpacity: 1,
          x: 0,
          y: 0,
          widthPx: 0,
          heightPx: 0,
          paddingXPx: 12,
          paddingYPx: 6,
          fontSizePx: 11,
          iconSizePx: 13,
          borderRadiusPx: 8,
          borderWidthPx: 1,
          bgColor: '#d97706',
          textColor: '#0c0a09',
          borderColor: '#fbbf24',
        },
      },
    },
  };

  return {
    version: 1,
    canvasWidthPx: 1280,
    wallpaperUrl: '',
    wallpaperOpacity: 0.35,
    customOverlayUrl: '',
    customOverlayOpacity: 0.5,
    blocksOrder: [...ALL_LOBBY_BLOCK_IDS],
    blocks,
  };
}

/**
 * Merges a potentially partial or undefined `themeTokens.lobbyPageLayout` with the complete default layout,
 * while also inheriting legacy top-level themeTokens (like `friendsBoxCustomPngUrl`, `cardBgColor`, etc.)
 * when not explicitly overridden in the block config.
 */
export function resolveLobbyPageLayout(themeTokens?: Partial<AppSkinThemeTokens> | null): LobbyPageLayoutConfig {
  const defaults = createDefaultLobbyPageLayout();
  if (!themeTokens) return defaults;

  const saved = themeTokens.lobbyPageLayout;
  const mergedBlocks = { ...defaults.blocks };

  for (const blockId of ALL_LOBBY_BLOCK_IDS) {
    const defBlock = defaults.blocks[blockId];
    const savedBlock = saved?.blocks?.[blockId];

    // Inherit general themeTokens if savedBlock didn't customize them
    const inheritedBgColor =
      savedBlock?.bgColor ||
      (blockId === 'store_box' && themeTokens.storePanelBg ? themeTokens.storePanelBg : undefined) ||
      (themeTokens.cardBgColor ? themeTokens.cardBgColor : defBlock.bgColor);

    const inheritedBorderColor =
      savedBlock?.borderColor ||
      (themeTokens.cardBorderColor ? themeTokens.cardBorderColor : defBlock.borderColor);

    const inheritedBgImage =
      savedBlock?.bgImageUrl !== undefined
        ? savedBlock.bgImageUrl
        : blockId === 'friends_box' && themeTokens.friendsBoxCustomPngUrl
        ? themeTokens.friendsBoxCustomPngUrl
        : blockId === 'top_header' && themeTokens.customHeaderBannerUrl
        ? themeTokens.customHeaderBannerUrl
        : defBlock.bgImageUrl;

    const mergedInnerButtonsConfig: Record<string, LobbyInnerButtonConfig> = {
      ...defBlock.innerButtonsConfig,
    };

    if (savedBlock?.innerButtonsConfig) {
      for (const [btnId, btnOverride] of Object.entries(savedBlock.innerButtonsConfig)) {
        if (btnOverride) {
          mergedInnerButtonsConfig[btnId] = {
            ...(defBlock.innerButtonsConfig[btnId] || { id: btnId, label: btnId, visible: true, opacity: 1 }),
            ...btnOverride,
          };
        }
      }
    }

    const savedOrder = Array.isArray(savedBlock?.innerButtonsOrder) && savedBlock.innerButtonsOrder.length > 0
      ? savedBlock.innerButtonsOrder
      : defBlock.innerButtonsOrder;

    // Ensure all default button keys exist in innerButtonsOrder
    const completeOrder = [...savedOrder];
    for (const defBtnId of defBlock.innerButtonsOrder) {
      if (!completeOrder.includes(defBtnId)) {
        completeOrder.push(defBtnId);
      }
    }

    mergedBlocks[blockId] = {
      ...defBlock,
      ...(savedBlock || {}),
      id: blockId,
      bgColor: inheritedBgColor,
      borderColor: inheritedBorderColor,
      bgImageUrl: inheritedBgImage,
      fontFamily: savedBlock?.fontFamily || themeTokens.headingFontFamily || defBlock.fontFamily,
      titleColor: savedBlock?.titleColor || themeTokens.accentColor || defBlock.titleColor,
      textColor: savedBlock?.textColor || themeTokens.textPrimaryColor || defBlock.textColor,
      accentColor: savedBlock?.accentColor || themeTokens.accentColor || defBlock.accentColor,
      innerButtonsOrder: completeOrder,
      innerButtonsConfig: mergedInnerButtonsConfig,
    };
  }

  const savedBlocksOrder =
    Array.isArray(saved?.blocksOrder) && saved.blocksOrder.length > 0
      ? saved.blocksOrder.filter((id): id is LobbyBlockId => ALL_LOBBY_BLOCK_IDS.includes(id))
      : [...ALL_LOBBY_BLOCK_IDS];

  for (const id of ALL_LOBBY_BLOCK_IDS) {
    if (!savedBlocksOrder.includes(id)) {
      savedBlocksOrder.push(id);
    }
  }

  return {
    version: saved?.version || 1,
    canvasWidthPx: saved?.canvasWidthPx || 1280,
    wallpaperUrl:
      saved?.wallpaperUrl !== undefined
        ? saved.wallpaperUrl
        : themeTokens.appGlobalWallpaperUrl || themeTokens.bgImageUrl || '',
    wallpaperOpacity:
      typeof saved?.wallpaperOpacity === 'number'
        ? saved.wallpaperOpacity
        : typeof themeTokens.bgImageOpacity === 'number'
        ? themeTokens.bgImageOpacity
        : 0.35,
    customOverlayUrl:
      saved?.customOverlayUrl !== undefined
        ? saved.customOverlayUrl
        : themeTokens.appCustomOverlayEffectUrl || '',
    customOverlayOpacity:
      typeof saved?.customOverlayOpacity === 'number'
        ? saved.customOverlayOpacity
        : typeof themeTokens.appCustomOverlayOpacity === 'number'
        ? themeTokens.appCustomOverlayOpacity
        : 0.5,
    blocksOrder: savedBlocksOrder,
    blocks: mergedBlocks,
  };
}

export function updateLobbyBlock(
  layout: LobbyPageLayoutConfig,
  blockId: LobbyBlockId,
  patch: Partial<LobbyBlockLayoutConfig>
): LobbyPageLayoutConfig {
  const existing = layout.blocks[blockId] || createDefaultLobbyPageLayout().blocks[blockId];
  return {
    ...layout,
    blocks: {
      ...layout.blocks,
      [blockId]: {
        ...existing,
        ...patch,
        id: blockId,
      },
    },
  };
}

export function updateLobbyInnerButton(
  layout: LobbyPageLayoutConfig,
  blockId: LobbyBlockId,
  buttonId: string,
  patch: Partial<LobbyInnerButtonConfig>
): LobbyPageLayoutConfig {
  const block = layout.blocks[blockId] || createDefaultLobbyPageLayout().blocks[blockId];
  const existingBtn = block.innerButtonsConfig[buttonId] || {
    id: buttonId,
    label: buttonId,
    visible: true,
    opacity: 1,
    bgOpacity: 1,
    x: 0,
    y: 0,
  };
  return updateLobbyBlock(layout, blockId, {
    innerButtonsConfig: {
      ...block.innerButtonsConfig,
      [buttonId]: {
        ...existingBtn,
        ...patch,
        id: buttonId,
      },
    },
  });
}

export function moveLobbyInnerButtonOrder(
  layout: LobbyPageLayoutConfig,
  blockId: LobbyBlockId,
  buttonId: string,
  direction: 'left' | 'right'
): LobbyPageLayoutConfig {
  const block = layout.blocks[blockId];
  if (!block) return layout;
  const order = [...block.innerButtonsOrder];
  const idx = order.indexOf(buttonId);
  if (idx === -1) return layout;
  const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= order.length) return layout;
  const temp = order[idx];
  order[idx] = order[targetIdx];
  order[targetIdx] = temp;
  return updateLobbyBlock(layout, blockId, { innerButtonsOrder: order });
}

export function moveLobbyBlockOrder(
  layout: LobbyPageLayoutConfig,
  blockId: LobbyBlockId,
  direction: 'up' | 'down'
): LobbyPageLayoutConfig {
  const order = [...layout.blocksOrder];
  const idx = order.indexOf(blockId);
  if (idx === -1) return layout;
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= order.length) return layout;
  const temp = order[idx];
  order[idx] = order[targetIdx];
  order[targetIdx] = temp;
  return {
    ...layout,
    blocksOrder: order,
  };
}

export function resetLobbyBlockToDefault(
  layout: LobbyPageLayoutConfig,
  blockId: LobbyBlockId
): LobbyPageLayoutConfig {
  const def = createDefaultLobbyPageLayout().blocks[blockId];
  return {
    ...layout,
    blocks: {
      ...layout.blocks,
      [blockId]: def,
    },
  };
}

/**
 * Computes the inline CSS style for a Lobby container block (`top_header`, `welcome_banner`, `friends_box`, etc.)
 * so both the Sandbox Canvas and the live `LobbyPortalView` / `App.tsx` render identical geometry & styling.
 */
export function computeLobbyBlockContainerStyle(
  block: LobbyBlockLayoutConfig | undefined,
  options?: { ignoreTransform?: boolean }
): CSSProperties {
  if (!block) return {};
  if (!block.visible || block.opacity <= 0.001) {
    return { display: 'none' };
  }

  const transforms: string[] = [];
  if (!options?.ignoreTransform) {
    if (block.x || block.y) {
      transforms.push(`translate(${Math.round(block.x)}px, ${Math.round(block.y)}px)`);
    }
    if (block.scale && Math.abs(block.scale - 1) > 0.01) {
      transforms.push(`scale(${block.scale})`);
    }
  }

  const bgWithAlpha = applyColorWithOpacity(block.bgColor, block.boxBgOpacity);
  const borderWithAlpha =
    block.hideBorder || block.borderWidthPx <= 0 || block.boxBgOpacity <= 0.001
      ? 'transparent'
      : applyColorWithOpacity(block.borderColor, Math.max(0.2, block.boxBgOpacity));

  const style: CSSProperties = {
    position: 'relative',
    zIndex: block.zIndex ?? 20,
    opacity: block.opacity,
    backgroundColor: bgWithAlpha,
    borderColor: borderWithAlpha,
    borderWidth: block.hideBorder ? 0 : `${block.borderWidthPx}px`,
    borderStyle: block.hideBorder || block.borderWidthPx <= 0 ? 'none' : 'solid',
    borderRadius: `${block.borderRadiusPx}px`,
    padding: `${block.paddingPx}px`,
    boxShadow: block.boxBgOpacity <= 0.05 ? 'none' : block.boxShadow || undefined,
    backdropFilter:
      block.boxBgOpacity <= 0.05 || !block.backdropBlurPx
        ? undefined
        : `blur(${block.backdropBlurPx}px)`,
    color: block.textColor || undefined,
    fontFamily: block.fontFamily || undefined,
    transform: transforms.length > 0 ? transforms.join(' ') : undefined,
    transformOrigin: 'top left',
    transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
  };

  if (block.widthPx && block.widthPx > 0) {
    style.width = `${Math.round(block.widthPx)}px`;
    style.maxWidth = 'none';
  }
  if (block.heightPx && block.heightPx > 0) {
    style.minHeight = `${Math.round(block.heightPx)}px`;
  }

  if (block.bgImageUrl && block.bgImageUrl.trim()) {
    style.backgroundImage = `url("${block.bgImageUrl.trim()}")`;
    style.backgroundPosition = 'center';
    style.backgroundRepeat = 'no-repeat';
    style.backgroundSize =
      block.bgImageFit === 'contain'
        ? 'contain'
        : block.bgImageFit === 'stretch'
        ? '100% 100%'
        : 'cover';
  }

  return style;
}

/**
 * Computes the inline CSS style for an inner button inside any Lobby block.
 */
export function computeLobbyInnerButtonStyle(
  btn: LobbyInnerButtonConfig | undefined
): CSSProperties {
  if (!btn) return {};
  if (btn.visible === false || (typeof btn.opacity === 'number' && btn.opacity <= 0.001)) {
    return { display: 'none' };
  }

  const transforms: string[] = [];
  if (btn.x || btn.y) {
    transforms.push(`translate(${Math.round(btn.x || 0)}px, ${Math.round(btn.y || 0)}px)`);
  }

  const bgOpacity = typeof btn.bgOpacity === 'number' ? btn.bgOpacity : 1;
  const bgWithAlpha = applyColorWithOpacity(btn.bgColor, bgOpacity);
  const borderWithAlpha =
    (btn.borderWidthPx ?? 1) <= 0 || bgOpacity <= 0.001
      ? 'transparent'
      : applyColorWithOpacity(btn.borderColor, Math.max(0.25, bgOpacity));

  const style: CSSProperties = {
    position: 'relative',
    opacity: typeof btn.opacity === 'number' ? btn.opacity : 1,
    backgroundColor: bgWithAlpha,
    color: btn.textColor || undefined,
    borderColor: borderWithAlpha,
    borderWidth: btn.borderWidthPx !== undefined ? `${btn.borderWidthPx}px` : undefined,
    borderStyle: (btn.borderWidthPx ?? 1) <= 0 ? 'none' : 'solid',
    borderRadius: btn.borderRadiusPx !== undefined ? `${btn.borderRadiusPx}px` : undefined,
    paddingLeft: btn.paddingXPx !== undefined ? `${btn.paddingXPx}px` : undefined,
    paddingRight: btn.paddingXPx !== undefined ? `${btn.paddingXPx}px` : undefined,
    paddingTop: btn.paddingYPx !== undefined ? `${btn.paddingYPx}px` : undefined,
    paddingBottom: btn.paddingYPx !== undefined ? `${btn.paddingYPx}px` : undefined,
    fontSize: btn.fontSizePx ? `${btn.fontSizePx}px` : undefined,
    transform: transforms.length > 0 ? transforms.join(' ') : undefined,
  };

  if (btn.widthPx && btn.widthPx > 0) {
    style.width = `${Math.round(btn.widthPx)}px`;
    style.justifyContent = 'center';
  }
  if (btn.heightPx && btn.heightPx > 0) {
    style.height = `${Math.round(btn.heightPx)}px`;
  }
  if (btn.bgImageUrl && btn.bgImageUrl.trim()) {
    style.backgroundImage = `url("${btn.bgImageUrl.trim()}")`;
    style.backgroundSize = 'cover';
    style.backgroundPosition = 'center';
  }

  return style;
}
