import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Package,
  Palette,
  Copy,
  Check,
  Plus,
  Trash2,
  Globe,
  Shield,
  Crown,
  Gift,
  KeyRound,
  Lock,
  Save,
  ArrowRight,
  Sliders,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  UserCheck,
} from 'lucide-react';
import {
  DLCPackageRecord,
  AppSkinRecord,
  AppSkinThemeTokens,
  CreatorCatalogPayload,
} from '../../types/dnd';
import { DlcWorkspaceStudio } from './DlcWorkspaceStudio';
import { VisualSkinDesignerStudio } from './VisualSkinDesignerStudio';
import { PlayerSkinFourApartadosEditor } from './PlayerSkinFourApartadosEditor';

interface CreatorStudioPanelProps {
  currentUserEmail: string;
  currentUserName: string;
  currentUserRole: 'client' | 'moderator' | 'creator' | 'admin' | string;
  onCatalogUpdated?: (catalog: CreatorCatalogPayload) => void;
}

export const DEFAULT_THEME_TOKENS: AppSkinThemeTokens = {
  headerBgColor: '#0e0f14',
  headerBorderColor: '#78350f',
  headerTitleText: 'WILL ROLL',
  manualButtonLabel: 'Compendio 5E',
  oracleButtonLabel: 'Sabio Arcano',
  lobbyBgGradient: 'linear-gradient(180deg, #13151f 0%, #0b0c10 100%)',
  forumCardBg: '#161822',
  forumBorderColor: '#c8a45c',
  forumAccentColor: '#f59e0b',
  charactersSectionBg: '#14161f',
  charactersSectionBorder: '#c8a45c',
  friendsSectionBg: '#14161f',
  friendsSectionBorder: '#c8a45c',
  primaryButtonBg: '#d97706',
  primaryButtonText: '#ffffff',
  buttonScale: 'md',
  titleFontScale: 'md',
  cardFrameColor: '#c8a45c',
  cardBgColor: '#161822',
  cardHeaderBg: '#231c14',
  cardTextColor: '#f5e4be',
  cardBadgeColor: '#f59e0b',
  // Deep Player Sheet Tokens
  sheetIconScale: 'md',
  sheetBgColor: '#11131a',
  sheetBgTextureUrl: '',
  sheetStatBoxBg: '#181b26',
  sheetStatBoxBorder: '#c8a45c',
  sheetStatBoxStyle: 'ornate',
  sheetFontFamily: 'cinzel',
  sheetPortraitSize: 'md',
  sheetHpBarBg: '#2a1215',
  sheetHpBarFill: '#dc2626',
  sheetHpBarStyle: 'classic',
  deckTarotCardBg: '#161924',
  deckTarotCardBorder: '#d97706',
  deckTarotHeaderBg: '#261c14',
  adventurerCornerBg: '#141722',
  adventurerCornerBorder: '#b45309',
  // Player Map Mode Tokens
  mapModeFrameBg: '#0d0f17',
  mapModeFrameBorder: '#c8a45c',
  mapModeCardBg: '#171a26',
  mapModeButtonBg: '#d97706',
  mapModeButtonText: '#0b0c10',
  mapModeDmHoodBg: '#1c1526',
  mapModeDmHoodBorder: '#9333ea',
  mapModeDmHoodAccent: '#e9d5ff',
  // Tarot Card Tokens
  tarotBorderColor: '#c8a45c',
  tarotGlowColor: 'rgba(245, 158, 11, 0.35)',
  tarotHeaderGradient: 'linear-gradient(135deg, #2a1f14 0%, #14161f 100%)',
  tarotBadgeBg: '#78350f',
  tarotBadgeText: '#fde68a',
};

export const CreatorStudioPanel: React.FC<CreatorStudioPanelProps> = ({
  currentUserEmail,
  currentUserName,
  currentUserRole,
  onCatalogUpdated,
}) => {
  const isAdmin = currentUserRole === 'admin';
  const [activeTab, setActiveTab] = useState<
    'dlcs' | 'app_skins' | 'player_skins' | 'dm_skins' | 'reviews' | 'entitlements'
  >(isAdmin ? 'app_skins' : 'dlcs');
  const [dlcs, setDlcs] = useState<DLCPackageRecord[]>([]);
  const [skins, setSkins] = useState<AppSkinRecord[]>([]);
  const [ownedDlcIds, setOwnedDlcIds] = useState<string[]>([]);
  const [ownedSkinIds, setOwnedSkinIds] = useState<string[]>([]);
  const [activeOnlineLobbySkinId, setActiveOnlineLobbySkinId] = useState<string>('skin-app-online-default');
  const [activeOnlinePlayerSkinId, setActiveOnlinePlayerSkinId] = useState<string>('skin-player-classic-gold');
  const [activeOnlineDmSkinId, setActiveOnlineDmSkinId] = useState<string>('skin-dm-obsidian-throne');
  const [accountEntitlements, setAccountEntitlements] = useState<
    Array<{
      email: string;
      displayName: string;
      appRole: string;
      ownedDlcIds: string[];
      ownedSkinIds: string[];
      updatedAt: number;
    }>
  >([]);
  const [toastMsg, setToastMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Selected Skin in the visual editor
  const [selectedAppSkinId, setSelectedAppSkinId] = useState<string>('skin-player-classic-gold');
  const [editingSkinDraft, setEditingSkinDraft] = useState<AppSkinRecord | null>(null);
  const [editorSubSection, setEditorSubSection] = useState<
    'player_sheet' | 'map_mode' | 'tarot_card' | 'lobby_app' | 'credits'
  >('player_sheet');
  const [duplicateSkinName, setDuplicateSkinName] = useState<string>('');
  const [promoteTargetScope, setPromoteTargetScope] = useState<'player' | 'dm'>('player');
  const [promoteSkinName, setPromoteSkinName] = useState<string>('');
  const [promoteSeasonTag, setPromoteSeasonTag] = useState<string>('Temporada Especial 2026');
  const [promoteCode, setPromoteCode] = useState<string>('');
  const [promoteEditorCredit, setPromoteEditorCredit] = useState<string>('');
  const [promoteCustomDesc, setPromoteCustomDesc] = useState<string>('');

  // DLC creation / edit form
  const [showNewDlcForm, setShowNewDlcForm] = useState<boolean>(false);
  const [editingDlcId, setEditingDlcId] = useState<string | null>(null);
  const [newDlcDraft, setNewDlcDraft] = useState<{
    name: string;
    description: string;
    seasonTag: string;
    acquisitionCode: string;
    isLimitedTime: boolean;
    availableUntil: string;
    editorCreditName: string;
    customCreditDescription: string;
    monsterName: string;
    monsterCr: string;
    npcName: string;
    npcRole: string;
    itemName: string;
    itemRarity: string;
    placeName: string;
    photoTitle: string;
    photoUrl: string;
  }>({
    name: '',
    description: '',
    seasonTag: 'Temporada 2026',
    acquisitionCode: '',
    isLimitedTime: true,
    availableUntil: '2026-12-31',
    editorCreditName: '',
    customCreditDescription: '',
    monsterName: 'Gólem de Escarcha Rúnica',
    monsterCr: '4',
    npcName: 'Elowen la Cartógrafa',
    npcRole: 'Exploradora Arcana',
    itemName: 'Hoja del Solsticio',
    itemRarity: 'Muy Raro',
    placeName: 'Valle de la Escarcha / Santuario Norte',
    photoTitle: 'Santuario del Solsticio',
    photoUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80',
  });

  // Cloud Entitlement Grant Form (Admin) & Redeem Code
  const [grantEmailInput, setGrantEmailInput] = useState<string>(currentUserEmail || '');
  const [grantDlcIdInput, setGrantDlcIdInput] = useState<string>('');
  const [grantSkinIdInput, setGrantSkinIdInput] = useState<string>('');
  const [redeemCodeInput, setRedeemCodeInput] = useState<string>('');
  const [accountFilterInput, setAccountFilterInput] = useState<string>('');

  const [activeDlcWorkspace, setActiveDlcWorkspace] = useState<DLCPackageRecord | null>(null);
  const [isVisualDesignerFullScreen, setIsVisualDesignerFullScreen] = useState<boolean>(false);
  const [appSkinCategoryFilter, setAppSkinCategoryFilter] = useState<'all' | 'player' | 'dm' | 'app'>('all');
  const [entitlementCategoryFilter, setEntitlementCategoryFilter] = useState<'all' | 'player' | 'dm' | 'dlc'>('all');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleOpenNewDlcWorkspace = () => {
    const blankDlc: DLCPackageRecord = {
      id: `dlc-${Date.now()}`,
      name: `Nuevo Paquete DLC (${new Date().toLocaleDateString()})`,
      description:
        'Mundo prefabricado y campaña personalizada con monstruos, NPCs, objetos y mapas interactivos con pines.',
      version: '1.0.0',
      seasonTag: 'Temporada 2026',
      acquisitionCode: `DLC-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      authorEmail: currentUserEmail,
      authorName: currentUserName,
      createdByAdmin: isAdmin,
      hideCreatorCredit: isAdmin,
      editorCreditName: isAdmin ? '' : currentUserName,
      customCreditDescription: '',
      monsters: [],
      npcs: [],
      itemsAndSpells: [],
      locations: [],
      albumPhotos: [],
      campaignLogs: [],
      updatedAt: Date.now(),
    };
    setActiveDlcWorkspace(blankDlc);
  };

  const handleDeleteSkin = async (skinId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta skin de forma permanente?')) return;
    try {
      const res = await fetch(`/api/creator/skins/${encodeURIComponent(skinId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorEmail: currentUserEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchCatalog();
        showToast('🗑️ Skin eliminada correctamente.');
      } else {
        showToast(`⚠️ ${data.error || 'No se pudo eliminar la skin.'}`);
      }
    } catch {
      showToast('⚠️ Error al eliminar la skin.');
    }
  };

  const handleDeleteDlc = async (dlcId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este paquete DLC de forma permanente?')) return;
    try {
      const res = await fetch(`/api/creator/dlcs/${encodeURIComponent(dlcId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorEmail: currentUserEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchCatalog();
        showToast('🗑️ Paquete DLC eliminado correctamente.');
      } else {
        showToast(`⚠️ ${data.error || 'No se pudo eliminar el DLC.'}`);
      }
    } catch {
      showToast('⚠️ Error al eliminar el DLC.');
    }
  };

  const fetchCatalog = async () => {
    setIsLoading(true);
    try {
      const q = currentUserEmail ? `?email=${encodeURIComponent(currentUserEmail)}` : '';
      const res = await fetch(`/api/creator/catalog${q}`);
      if (!res.ok) return;
      const data: CreatorCatalogPayload = await res.json();
      setDlcs(data.dlcs || []);
      setSkins(data.skins || []);
      setOwnedDlcIds(data.ownedDlcIds || []);
      setOwnedSkinIds(data.ownedSkinIds || []);
      if (data.activeOnlineLobbySkinId) setActiveOnlineLobbySkinId(data.activeOnlineLobbySkinId);
      if (data.activeOnlinePlayerSkinId) setActiveOnlinePlayerSkinId(data.activeOnlinePlayerSkinId);
      if (data.activeOnlineDmSkinId) setActiveOnlineDmSkinId(data.activeOnlineDmSkinId);
      if (data.accountEntitlements) {
        const rawAcc = data.accountEntitlements as any;
        const normalizedAcc = Array.isArray(rawAcc)
          ? rawAcc
          : Object.entries(rawAcc).map(([email, info]: [string, any]) => ({
              email,
              displayName: info?.displayName || email,
              appRole: info?.appRole || 'client',
              ownedDlcIds: Array.isArray(info?.ownedDlcIds) ? info.ownedDlcIds : [],
              ownedSkinIds: Array.isArray(info?.ownedSkinIds) ? info.ownedSkinIds : [],
              updatedAt: info?.updatedAt || Date.now(),
            }));
        setAccountEntitlements(normalizedAcc);
      }
      if (onCatalogUpdated) onCatalogUpdated(data);

      const allSkins = data.skins || [];
      const currentSelected =
        allSkins.find((s) => s.id === selectedAppSkinId) ||
        allSkins.find((s) => s.id === data.activeOnlinePlayerSkinId) ||
        allSkins.find((s) => s.isOnlineDefault) ||
        allSkins[0];
      if (currentSelected) {
        setSelectedAppSkinId(currentSelected.id);
        setEditingSkinDraft({
          ...JSON.parse(JSON.stringify(currentSelected)),
          themeTokens: {
            ...DEFAULT_THEME_TOKENS,
            ...(currentSelected.themeTokens || {}),
          },
        });
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [currentUserEmail]);

  // Filter items according to role (Admins see all; Creators see their own + official defaults)
  const canEditItem = (authorEmail?: string, isOfficial?: boolean) => {
    if (isAdmin) return true;
    if (isOfficial) return false;
    return (
      Boolean(authorEmail) &&
      authorEmail?.trim().toLowerCase() === currentUserEmail.trim().toLowerCase()
    );
  };

  const appSkins = skins.filter((s) => s.scope === 'app');
  const playerSkins = skins.filter((s) => s.scope === 'player');
  const dmSkins = skins.filter((s) => s.scope === 'dm');
  const catalogPlayerSkins = playerSkins.filter(
    (s) =>
      !s.isOfficialDefault &&
      !s.isDefault &&
      s.id !== 'skin-player-default' &&
      s.id !== activeOnlinePlayerSkinId
  );
  const catalogDmSkins = dmSkins.filter(
    (s) =>
      !s.isOfficialDefault &&
      !s.isDefault &&
      s.id !== 'skin-dm-default' &&
      s.id !== activeOnlineDmSkinId
  );

  const onlineLobbySkin =
    skins.find((s) => s.id === activeOnlineLobbySkinId) ||
    appSkins.find((s) => s.isOnlineDefault) ||
    appSkins[0];
  const onlinePlayerSkin =
    skins.find((s) => s.id === activeOnlinePlayerSkinId) ||
    playerSkins.find((s) => s.isOnlineDefault) ||
    playerSkins[0];
  const onlineDmSkin =
    skins.find((s) => s.id === activeOnlineDmSkinId) ||
    dmSkins.find((s) => s.isOnlineDefault) ||
    dmSkins[0];

  const pendingReviewSkins = skins.filter(
    (s) => s.reviewStatus === 'pending_review' || Boolean(s.pendingDraft)
  );
  const pendingReviewDlcs = dlcs.filter(
    (d) => d.reviewStatus === 'pending_review' || Boolean(d.pendingDraft)
  );
  const totalPendingReviews = pendingReviewSkins.length + pendingReviewDlcs.length;

  const handleSelectAppSkinToEdit = (skin: AppSkinRecord) => {
    setSelectedAppSkinId(skin.id);
    setEditingSkinDraft({
      ...JSON.parse(JSON.stringify(skin)),
      themeTokens: {
        ...DEFAULT_THEME_TOKENS,
        ...(skin.themeTokens || {}),
      },
    });
    if (skin.scope === 'app') {
      setEditorSubSection('lobby_app');
    } else if (skin.scope === 'dm') {
      setEditorSubSection('map_mode');
    } else {
      setEditorSubSection('player_sheet');
    }
  };

  const handleCreateNewBlankSkin = async (scope: 'app' | 'player' | 'dm') => {
    const scopeLabel =
      scope === 'app' ? 'Lobby' : scope === 'player' ? 'Jugador' : 'Dungeon Master';
    const newPayload: Partial<AppSkinRecord> = {
      name: `Nueva Skin de ${scopeLabel} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      description: `Diseño personalizado de ${scopeLabel} creado por ${currentUserName || 'Creador'}.`,
      scope,
      authorEmail: currentUserEmail,
      authorName: currentUserName,
      createdByAdmin: isAdmin,
      hideCreatorCredit: isAdmin,
      editorCreditName: isAdmin ? '' : currentUserName,
      customCreditDescription: '',
      themeTokens: { ...DEFAULT_THEME_TOKENS },
    };

    try {
      const res = await fetch('/api/creator/skins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPayload,
          requesterEmail: currentUserEmail,
          requesterName: currentUserName,
          requesterRole: currentUserRole,
        }),
      });
      const data = await res.json();
      if (res.ok && data.skin) {
        await fetchCatalog();
        handleSelectAppSkinToEdit(data.skin);
        setIsVisualDesignerFullScreen(true);
        showToast(
          isAdmin
            ? `✨ Nueva Skin "${data.skin.name}" creada y abierta en el Estudio Visual (${scopeLabel}).`
            : `🕒 Skin "${data.skin.name}" creada y enviada a revisión de Administrador.`
        );
      } else {
        showToast(`⚠️ ${data.error || 'No se pudo crear la skin.'}`);
      }
    } catch {
      showToast('⚠️ Error de conexión al crear la skin.');
    }
  };

  const handleDuplicateSkin = async (sourceId: string) => {
    try {
      const res = await fetch('/api/creator/skins/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSkinId: sourceId,
          newName: duplicateSkinName.trim() || undefined,
          authorEmail: currentUserEmail,
          authorName: currentUserName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.skin) {
        setDuplicateSkinName('');
        await fetchCatalog();
        handleSelectAppSkinToEdit(data.skin);
        showToast(`✨ Skin duplicada: "${data.skin.name}". Ya puedes editarla libremente.`);
      }
    } catch {
      showToast('⚠️ Error al duplicar la skin.');
    }
  };

  const handleSaveEditedSkin = async () => {
    if (!editingSkinDraft) return;
    try {
      const res = await fetch('/api/creator/skins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingSkinDraft,
          requesterEmail: currentUserEmail,
          requesterName: currentUserName,
          requesterRole: currentUserRole,
        }),
      });
      const data = await res.json();
      if (res.ok && data.skin) {
        await fetchCatalog();
        showToast(
          isAdmin
            ? `💾 Cambios guardados en la skin "${data.skin.name}".`
            : `🕒 Cambios de "${data.skin.name}" enviados a revisión del Administrador.`
        );
      } else {
        showToast(`⚠️ ${data.error || 'No se pudo guardar la skin.'}`);
      }
    } catch {
      showToast('⚠️ No se pudo guardar la skin.');
    }
  };

  const handleSetOnlineDefaultByScope = async (
    skinId: string,
    scope: 'app' | 'player' | 'dm'
  ) => {
    try {
      const res = await fetch('/api/creator/skins/set-online-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skinId, scope }),
      });
      const data = await res.json();
      if (res.ok && data.skin) {
        await fetchCatalog();
        const scopeLabel =
          scope === 'app' ? 'Lobby' : scope === 'player' ? 'Jugador' : 'Dungeon Master';
        showToast(
          `🌐 "${data.skin.name}" ahora es la Skin Online (Default) activa de ${scopeLabel} para toda la plataforma.`
        );
      }
    } catch {
      showToast('⚠️ Error al publicar la Skin Online.');
    }
  };

  const handlePromoteSkin = async () => {
    if (!editingSkinDraft) return;
    try {
      await fetch('/api/creator/skins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingSkinDraft,
          requesterEmail: currentUserEmail,
          requesterName: currentUserName,
          requesterRole: currentUserRole,
        }),
      });
      const res = await fetch('/api/creator/skins/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSkinId: editingSkinDraft.id,
          targetScope: promoteTargetScope,
          newName:
            promoteSkinName.trim() ||
            `${editingSkinDraft.name} (${promoteTargetScope === 'player' ? 'Jugador' : 'DM'})`,
          seasonTag: promoteSeasonTag.trim() || 'Permanente / Temporada',
          acquisitionCode:
            promoteCode.trim().toUpperCase() ||
            `SKIN-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
          isLimitedTime: true,
          editorCreditName: promoteEditorCredit.trim() || editingSkinDraft.editorCreditName || '',
          customCreditDescription:
            promoteCustomDesc.trim() || editingSkinDraft.customCreditDescription || '',
          hideCreatorCredit:
            !promoteEditorCredit.trim() &&
            !promoteCustomDesc.trim() &&
            Boolean(editingSkinDraft.hideCreatorCredit),
        }),
      });
      const data = await res.json();
      if (res.ok && data.skin) {
        setPromoteSkinName('');
        setPromoteCode('');
        setPromoteEditorCredit('');
        setPromoteCustomDesc('');
        await fetchCatalog();
        showToast(
          `🎁 Skin convertida en permanente dentro de ${
            promoteTargetScope === 'player' ? 'Skins de Jugador' : 'Skins de DM'
          } (Código: ${data.skin.acquisitionCode})`
        );
      }
    } catch {
      showToast('⚠️ Error al traspasar la skin.');
    }
  };

  const handleCreateOrSaveDlcPackage = async () => {
    if (!newDlcDraft.name.trim()) return;
    try {
      const existingDlc = editingDlcId ? dlcs.find((d) => d.id === editingDlcId) : undefined;
      const dlcPayload: Partial<DLCPackageRecord> & Record<string, any> = {
        ...(existingDlc || {}),
        id: editingDlcId || undefined,
        name: newDlcDraft.name.trim(),
        description:
          newDlcDraft.description.trim() ||
          'Paquete de expansión con monstruos, NPCs, objetos, lugares e imágenes para inyectar en cualquier campaña.',
        version: existingDlc ? '1.1.0' : '1.0.0',
        authorEmail: existingDlc?.authorEmail || currentUserEmail,
        authorName: existingDlc?.authorName || currentUserName,
        createdByAdmin: existingDlc ? existingDlc.createdByAdmin : isAdmin,
        hideCreatorCredit: isAdmin && !newDlcDraft.editorCreditName.trim(),
        editorCreditName: newDlcDraft.editorCreditName.trim() || (isAdmin ? '' : currentUserName),
        customCreditDescription: newDlcDraft.customCreditDescription.trim(),
        isOfficialSrd: false,
        isLimitedTime: newDlcDraft.isLimitedTime,
        seasonTag: newDlcDraft.seasonTag.trim() || 'Temporada 2026',
        availableUntil: newDlcDraft.availableUntil || undefined,
        acquisitionCode:
          newDlcDraft.acquisitionCode.trim().toUpperCase() ||
          existingDlc?.acquisitionCode ||
          `DLC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        requesterEmail: currentUserEmail,
        requesterName: currentUserName,
        requesterRole: currentUserRole,
        monsters: newDlcDraft.monsterName.trim()
          ? [
              {
                id: `mon-dlc-${Date.now()}`,
                name: newDlcDraft.monsterName.trim(),
                cr: newDlcDraft.monsterCr || '2',
                size: 'Mediano',
                type: 'Monstruosidad',
                alignment: 'Caótico Maligno',
                ac: 15,
                hp: 45,
                maxHp: 45,
                speed: '30 pies',
                str: 16,
                dex: 12,
                con: 15,
                int: 10,
                wis: 12,
                cha: 8,
                traits: [{ name: 'Origen DLC', description: 'Incluido en DLC' }],
                actions: [
                  {
                    id: `atk-dlc-${Date.now()}`,
                    name: 'Golpe Arcano',
                    type: 'melee',
                    toHit: 6,
                    damage: '2d8+3',
                    damageType: 'Frío',
                    range: '5 pies',
                  },
                ],
                folder: newDlcDraft.placeName.trim() || 'General',
                notes: `Criatura del DLC ${newDlcDraft.name.trim()}`,
              },
            ]
          : existingDlc?.monsters || [],
        npcs: newDlcDraft.npcName.trim()
          ? [
              {
                id: `npc-dlc-${Date.now()}`,
                name: newDlcDraft.npcName.trim(),
                folder: newDlcDraft.placeName.trim() || 'General',
                race: 'Elfo',
                occupation: newDlcDraft.npcRole.trim() || 'Guía',
                attitude: 'Amistoso',
                location: newDlcDraft.placeName.trim() || 'General',
                appearance: 'Atuendo de viajero con insignias del DLC.',
                personality: 'Sabio y observador.',
                secretOrHook: 'Conoce la entrada oculta del santuario.',
                notes: `NPC de ${newDlcDraft.name.trim()}`,
                evolution: 'Aliado clave',
              },
            ]
          : existingDlc?.npcs || [],
        itemsAndSpells: newDlcDraft.itemName.trim()
          ? [
              {
                id: `item-dlc-${Date.now()}`,
                name: newDlcDraft.itemName.trim(),
                kind: 'item',
                itemGroup: 'weapon',
                rarity: (newDlcDraft.itemRarity as any) || 'Raro',
                category: 'Arma (DLC)',
                whoHasIt: 'Tesoro del DLC',
                whereFound: newDlcDraft.placeName.trim() || 'Santuario',
                description: `Objeto especial incluido en el DLC ${newDlcDraft.name.trim()}.`,
                properties: '+1 al ataque y daño • +1d6 daño elemental.',
                dmSecrets: 'Reliquia de temporada.',
                folder: newDlcDraft.placeName.trim() || 'General',
                weight: 3,
              },
            ]
          : existingDlc?.itemsAndSpells || [],
        locations: newDlcDraft.placeName.trim()
          ? [
              {
                id: `loc-dlc-${Date.now()}`,
                name: newDlcDraft.placeName.split('/').pop()?.trim() || newDlcDraft.placeName.trim(),
                region: 'Región DLC',
                type: 'Zona de Aventura',
                description: `Lugar importado desde el DLC ${newDlcDraft.name.trim()}.`,
                secretsForDm: 'Contiene reliquias ocultas.',
                notes: '',
                evolution: '',
                pointsOfInterest: ['Entrada Principal', 'Altar Antiguo'],
                folder: newDlcDraft.placeName.trim(),
                mapImageUrl: newDlcDraft.photoUrl.trim() || undefined,
              },
            ]
          : existingDlc?.locations || [],
        albumPhotos: newDlcDraft.photoUrl.trim()
          ? [
              {
                id: `photo-dlc-${Date.now()}`,
                title: newDlcDraft.photoTitle.trim() || newDlcDraft.name.trim(),
                imageUrl: newDlcDraft.photoUrl.trim(),
                folder: newDlcDraft.placeName.trim() || 'General',
                createdAt: Date.now(),
              },
            ]
          : existingDlc?.albumPhotos || [],
      };

      const res = await fetch('/api/creator/dlcs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dlcPayload),
      });
      const data = await res.json();
      if (res.ok && data.dlc) {
        setShowNewDlcForm(false);
        setEditingDlcId(null);
        setNewDlcDraft((p) => ({
          ...p,
          name: '',
          description: '',
          acquisitionCode: '',
          editorCreditName: '',
          customCreditDescription: '',
        }));
        await fetchCatalog();
        showToast(
          isAdmin
            ? `📦 DLC "${data.dlc.name}" guardado y publicado en la nube (Código: ${data.dlc.acquisitionCode}).`
            : `🕒 DLC "${data.dlc.name}" enviado a la cola de revisión del Administrador.`
        );
      } else {
        showToast(`⚠️ ${data.error || 'Error al guardar el DLC.'}`);
      }
    } catch {
      showToast('⚠️ Error al guardar el DLC.');
    }
  };

  const handleReviewDecision = async (
    kind: 'skin' | 'dlc',
    itemId: string,
    decision: 'approved' | 'rejected'
  ) => {
    try {
      const res = await fetch('/api/creator/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          itemId,
          decision,
          reviewerEmail: currentUserEmail,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        await fetchCatalog();
        showToast(
          decision === 'approved'
            ? `✅ Elemento aprobado y publicado. Se notificó por mensaje a los poseedores.`
            : `❌ Revisión rechazada.`
        );
      } else {
        showToast(`⚠️ ${data.error || 'No se pudo procesar la revisión.'}`);
      }
    } catch {
      showToast('⚠️ Error al revisar el elemento.');
    }
  };

  const handleGrantEntitlement = async () => {
    if (!grantEmailInput.trim()) return;
    try {
      const res = await fetch('/api/creator/entitlements/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: grantEmailInput.trim(),
          dlcId: grantDlcIdInput || undefined,
          skinId: grantSkinIdInput || undefined,
        }),
      });
      if (res.ok) {
        await fetchCatalog();
        showToast(`✅ Licencia otorgada en la nube a la cuenta ${grantEmailInput.trim()}.`);
      }
    } catch {
      showToast('⚠️ No se pudo asignar la licencia.');
    }
  };

  const handleRevokeEntitlement = async (
    targetEmail: string,
    opts: { dlcId?: string; skinId?: string }
  ) => {
    try {
      const res = await fetch('/api/creator/entitlements/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          dlcId: opts.dlcId,
          skinId: opts.skinId,
        }),
      });
      if (res.ok) {
        await fetchCatalog();
        showToast(`🗑️ Licencia retirada de la cuenta ${targetEmail}.`);
      }
    } catch {
      showToast('⚠️ No se pudo retirar la licencia.');
    }
  };

  const handleRedeemCode = async () => {
    if (!redeemCodeInput.trim()) return;
    try {
      const res = await fetch('/api/creator/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUserEmail || 'invitado@willroll.local',
          code: redeemCodeInput.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setRedeemCodeInput('');
        await fetchCatalog();
        showToast(`🎁 ${data.message}`);
      } else {
        showToast(`⚠️ ${data.error || 'Código inválido'}`);
      }
    } catch {
      showToast('⚠️ Error al canjear el código.');
    }
  };

  const updateThemeToken = <K extends keyof AppSkinThemeTokens>(
    key: K,
    val: AppSkinThemeTokens[K]
  ) => {
    if (!editingSkinDraft) return;
    setEditingSkinDraft({
      ...editingSkinDraft,
      themeTokens: {
        ...DEFAULT_THEME_TOKENS,
        ...(editingSkinDraft.themeTokens || {}),
        [key]: val,
      },
    });
  };

  const filteredAccounts = (Array.isArray(accountEntitlements) ? accountEntitlements : []).filter((acc) => {
    if (!accountFilterInput.trim()) return true;
    const q = accountFilterInput.trim().toLowerCase();
    return (
      acc.email.toLowerCase().includes(q) ||
      (acc.displayName || '').toLowerCase().includes(q)
    );
  });

  const t = editingSkinDraft?.themeTokens || DEFAULT_THEME_TOKENS;

  if (activeDlcWorkspace) {
    return (
      <DlcWorkspaceStudio
        dlc={activeDlcWorkspace}
        isAdmin={isAdmin}
        currentUserEmail={currentUserEmail}
        currentUserName={currentUserName}
        currentUserRole={currentUserRole}
        onSave={async (updatedDlc) => {
          const res = await fetch('/api/creator/dlcs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...updatedDlc,
              requesterEmail: currentUserEmail,
              requesterName: currentUserName,
              requesterRole: currentUserRole,
            }),
          });
          if (res.ok) {
            await fetchCatalog();
            setActiveDlcWorkspace(null);
          }
        }}
        onClose={() => setActiveDlcWorkspace(null)}
      />
    );
  }

  if (isVisualDesignerFullScreen && editingSkinDraft) {
    return (
      <VisualSkinDesignerStudio
        skin={editingSkinDraft}
        isAdmin={isAdmin}
        currentUserEmail={currentUserEmail}
        currentUserName={currentUserName}
        onSave={async (updatedSkin) => {
          const res = await fetch('/api/creator/skins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...updatedSkin,
              requesterEmail: currentUserEmail,
              requesterName: currentUserName,
              requesterRole: currentUserRole,
            }),
          });
          if (res.ok) {
            await fetchCatalog();
            setEditingSkinDraft(updatedSkin);
          }
        }}
        onActivateOnline={async (skinId, scope) => {
          await handleSetOnlineDefaultByScope(skinId, scope);
        }}
        onClose={() => setIsVisualDesignerFullScreen(false)}
      />
    );
  }

  return (
    <div
      data-testid="creator-studio-panel"
      className="space-y-5 bg-[#12141d] border-2 border-[#c8a45c]/75 rounded-3xl p-5 sm:p-6 shadow-[0_18px_50px_rgba(0,0,0,0.85)] text-stone-100"
    >
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#c8a45c]/35">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[11px] font-cinzel font-bold uppercase tracking-wider mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              Estudio de Creador de Contenido • Rol:{' '}
              {isAdmin ? 'ADMIN (Control Total)' : 'CREADOR (Con Revisión de Admin)'}
            </span>
          </div>
          <h2 className="font-cinzel font-black text-xl sm:text-2xl text-[#f5e4be] uppercase tracking-wide">
            Panel de Creador de Contenido, Skins Online y DLCs
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            {isAdmin
              ? 'Edita las 3 Skins Online (Lobby, Jugador y Dungeon Master), personaliza cada detalle visual del Player Sheet, Modo Mapa y Carta de Personaje, revisa paquetes de creadores y administra qué skins o DLCs posee cada cuenta.'
              : 'Crea y edita tus propios paquetes DLC y Skins. Cada creación o actualización pasa por revisión de un Administrador antes de publicarse y notificar a sus poseedores.'}
          </p>
        </div>

        {/* Quick Code Redeemer for current account */}
        <div className="p-3 rounded-2xl bg-[#181b28] border border-[#c8a45c]/50 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
          <input
            type="text"
            data-testid="creator-redeem-code-input"
            value={redeemCodeInput}
            onChange={(e) => setRedeemCodeInput(e.target.value.toUpperCase())}
            placeholder="Código (ej. NAVIDAD-2026)"
            className="bg-[#10121a] border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs font-mono text-amber-200 w-44"
          />
          <button
            type="button"
            data-testid="creator-redeem-code-btn"
            onClick={handleRedeemCode}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-cinzel font-black text-xs cursor-pointer shrink-0"
          >
            Canjear
          </button>
        </div>
      </div>

      {toastMsg && (
        <div
          data-testid="creator-studio-toast"
          className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/70 text-emerald-200 text-xs font-cinzel font-bold flex items-center gap-2 shadow-lg"
        >
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs inside Creator Studio */}
      <div className="flex items-center gap-2 flex-wrap">
        {isAdmin && (
          <button
            type="button"
            data-testid="creator-tab-app-skins"
            onClick={() => setActiveTab('app_skins')}
            className={`px-4 py-2 rounded-xl font-cinzel font-bold text-xs flex items-center gap-2 border transition cursor-pointer ${
              activeTab === 'app_skins'
                ? 'bg-purple-600 text-white border-purple-300 shadow-lg'
                : 'bg-[#181b28] text-stone-300 border-stone-700 hover:border-purple-500/50'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Skins de la App & Editor Visual ({skins.length})</span>
          </button>
        )}

        <button
          type="button"
          data-testid="creator-tab-player-skins"
          onClick={() => setActiveTab('player_skins')}
          className={`px-4 py-2 rounded-xl font-cinzel font-bold text-xs flex items-center gap-2 border transition cursor-pointer ${
            activeTab === 'player_skins'
              ? 'bg-cyan-600 text-stone-950 border-cyan-300 shadow-lg'
              : 'bg-[#181b28] text-stone-300 border-stone-700 hover:border-cyan-500/50'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Skins de Jugador ({catalogPlayerSkins.length})</span>
        </button>

        <button
          type="button"
          data-testid="creator-tab-dm-skins"
          onClick={() => setActiveTab('dm_skins')}
          className={`px-4 py-2 rounded-xl font-cinzel font-bold text-xs flex items-center gap-2 border transition cursor-pointer ${
            activeTab === 'dm_skins'
              ? 'bg-red-700 text-white border-red-300 shadow-lg'
              : 'bg-[#181b28] text-stone-300 border-stone-700 hover:border-red-500/50'
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>Skins de Dungeon Master ({catalogDmSkins.length})</span>
        </button>

        <button
          type="button"
          data-testid="creator-tab-dlcs"
          onClick={() => setActiveTab('dlcs')}
          className={`px-4 py-2 rounded-xl font-cinzel font-bold text-xs flex items-center gap-2 border transition cursor-pointer ${
            activeTab === 'dlcs'
              ? 'bg-amber-600 text-stone-950 border-amber-300 shadow-lg'
              : 'bg-[#181b28] text-stone-300 border-stone-700 hover:border-amber-500/50'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Paquetes DLC ({dlcs.length})</span>
        </button>

        {isAdmin && (
          <>
            <button
              type="button"
              data-testid="creator-tab-reviews"
              onClick={() => setActiveTab('reviews')}
              className={`px-4 py-2 rounded-xl font-cinzel font-bold text-xs flex items-center gap-2 border transition cursor-pointer ${
                activeTab === 'reviews'
                  ? 'bg-amber-500 text-stone-950 border-amber-200 shadow-lg'
                  : 'bg-[#181b28] text-stone-300 border-stone-700 hover:border-amber-500/50'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Cola de Revisión ({totalPendingReviews})</span>
            </button>

            <button
              type="button"
              data-testid="creator-tab-entitlements"
              onClick={() => setActiveTab('entitlements')}
              className={`px-4 py-2 rounded-xl font-cinzel font-bold text-xs flex items-center gap-2 border transition cursor-pointer ${
                activeTab === 'entitlements'
                  ? 'bg-emerald-600 text-stone-950 border-emerald-300 shadow-lg'
                  : 'bg-[#181b28] text-stone-300 border-stone-700 hover:border-emerald-500/50'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Licencias por Cuenta ({accountEntitlements.length})</span>
            </button>
          </>
        )}
      </div>

      {/* ================================================================= */}
      {/* TAB: SKINS DE LA APP + 3 SKINS ONLINE + EDITOR VISUAL PROFUNDO    */}
      {/* ================================================================= */}
      {activeTab === 'app_skins' && isAdmin && (
        <div className="space-y-5">
          {/* 3 ACTIVE ONLINE DEFAULT SKINS SELECTOR BANNER */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1a162b] via-[#151824] to-[#171d26] border-2 border-purple-500/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-cinzel font-black text-sm sm:text-base text-[#f5e4be] uppercase flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-400" />
                  <span>Las 3 Skins Online Activas de la App (Lobby, Jugador y Dungeon Master)</span>
                </h3>
                <p className="text-xs text-stone-300 mt-0.5">
                  Elige cuál skin se muestra por defecto en vivo para toda la comunidad. Las skins de Jugador y DM solo se vuelven permanentes en una cuenta si tú decides convertirlas o regalarlas; de lo contrario funcionan como la Skin Default Online.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="btn-create-new-player-skin"
                  onClick={() => handleCreateNewBlankSkin('player')}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-stone-950 font-cinzel font-black text-xs flex items-center gap-1 cursor-pointer shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva Skin Jugador</span>
                </button>
                <button
                  type="button"
                  data-testid="btn-create-new-lobby-skin"
                  onClick={() => handleCreateNewBlankSkin('app')}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-cinzel font-black text-xs flex items-center gap-1 cursor-pointer shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva Skin Lobby</span>
                </button>
                <button
                  type="button"
                  data-testid="btn-create-new-dm-skin"
                  onClick={() => handleCreateNewBlankSkin('dm')}
                  className="px-3 py-1.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-cinzel font-black text-xs flex items-center gap-1 cursor-pointer shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva Skin DM</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 1. Skin Online del Lobby */}
              <div className="p-3.5 rounded-xl bg-[#11131c] border border-purple-500/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-cinzel font-bold uppercase text-purple-300">
                    1. Skin Online del Lobby
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/60 text-[10px] font-mono text-emerald-300">
                    Activa: {onlineLobbySkin?.name || 'Default'}
                  </span>
                </div>
                <select
                  data-testid="select-online-lobby-skin"
                  value={onlineLobbySkin?.id || ''}
                  onChange={(e) => handleSetOnlineDefaultByScope(e.target.value, 'app')}
                  className="w-full bg-[#181b28] border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-stone-100"
                >
                  {appSkins.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (por {s.authorName || 'Admin'})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Skin Online del Jugador */}
              <div className="p-3.5 rounded-xl bg-[#11131c] border border-cyan-500/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-cinzel font-bold uppercase text-cyan-300">
                    2. Skin Online del Jugador (Default)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/60 text-[10px] font-mono text-emerald-300">
                    Activa: {onlinePlayerSkin?.name || 'Default'}
                  </span>
                </div>
                <select
                  data-testid="select-online-player-skin"
                  value={onlinePlayerSkin?.id || ''}
                  onChange={(e) => handleSetOnlineDefaultByScope(e.target.value, 'player')}
                  className="w-full bg-[#181b28] border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-stone-100"
                >
                  {playerSkins.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (por {s.authorName || 'Admin'})
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Skin Online del Dungeon Master */}
              <div className="p-3.5 rounded-xl bg-[#11131c] border border-red-500/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-cinzel font-bold uppercase text-red-300">
                    3. Skin Online del Dungeon Master
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/60 text-[10px] font-mono text-emerald-300">
                    Activa: {onlineDmSkin?.name || 'Default'}
                  </span>
                </div>
                <select
                  data-testid="select-online-dm-skin"
                  value={onlineDmSkin?.id || ''}
                  onChange={(e) => handleSetOnlineDefaultByScope(e.target.value, 'dm')}
                  className="w-full bg-[#181b28] border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-stone-100"
                >
                  {dmSkins.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (por {s.authorName || 'Admin'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 4 Cols: All Skins List + Duplicate + Publish Online */}
            <div className="lg:col-span-4 space-y-3">
              <div className="p-4 rounded-2xl bg-[#181b28] border border-purple-500/50 space-y-2.5">
                <label className="text-[11px] font-cinzel font-bold text-purple-300 block">
                  Duplicar Skin Seleccionada para Crear Nueva Variante:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    data-testid="input-duplicate-skin-name"
                    value={duplicateSkinName}
                    onChange={(e) => setDuplicateSkinName(e.target.value)}
                    placeholder="Nombre de la nueva copia..."
                    className="flex-1 bg-[#10121a] border border-stone-700 rounded-xl px-2.5 py-1.5 text-xs text-stone-100"
                  />
                  <button
                    type="button"
                    data-testid="btn-duplicate-app-skin"
                    onClick={() => handleDuplicateSkin(selectedAppSkinId)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-cinzel font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicar</span>
                  </button>
                </div>
              </div>

              {/* Category Filter for Skins */}
              <div className="flex items-center gap-1.5 flex-wrap p-2 rounded-xl bg-[#141622] border border-stone-800">
                <button
                  type="button"
                  data-testid="filter-skin-all"
                  onClick={() => setAppSkinCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-cinzel font-bold transition cursor-pointer ${
                    appSkinCategoryFilter === 'all'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Todas ({skins.length})
                </button>
                <button
                  type="button"
                  data-testid="filter-skin-player"
                  onClick={() => setAppSkinCategoryFilter('player')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-cinzel font-bold transition cursor-pointer ${
                    appSkinCategoryFilter === 'player'
                      ? 'bg-cyan-600 text-stone-950 shadow'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Jugador ({playerSkins.length})
                </button>
                <button
                  type="button"
                  data-testid="filter-skin-dm"
                  onClick={() => setAppSkinCategoryFilter('dm')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-cinzel font-bold transition cursor-pointer ${
                    appSkinCategoryFilter === 'dm'
                      ? 'bg-red-700 text-white shadow'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Dungeon Master ({dmSkins.length})
                </button>
                <button
                  type="button"
                  data-testid="filter-skin-app"
                  onClick={() => setAppSkinCategoryFilter('app')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-cinzel font-bold transition cursor-pointer ${
                    appSkinCategoryFilter === 'app'
                      ? 'bg-purple-700 text-purple-100 shadow'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Lobby ({appSkins.length})
                </button>
              </div>

              <button
                type="button"
                data-testid="btn-open-full-visual-designer"
                onClick={() => setIsVisualDesignerFullScreen(true)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white font-cinzel font-black text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
              >
                <Palette className="w-4 h-4 text-amber-300" />
                <span>Abrir Diseñador Visual Completo (Pantalla Completa)</span>
              </button>

              {/* Filtered Skins Selector List */}
              <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
                {skins
                  .filter((s) => appSkinCategoryFilter === 'all' || s.scope === appSkinCategoryFilter)
                  .map((skin) => {
                  const isSelected = skin.id === selectedAppSkinId;
                  const isOnlineForItsScope =
                    (skin.scope === 'app' && skin.id === onlineLobbySkin?.id) ||
                    (skin.scope === 'player' && skin.id === onlinePlayerSkin?.id) ||
                    (skin.scope === 'dm' && skin.id === onlineDmSkin?.id);
                  const isCustomSkin = !skin.isDefault && !skin.isOnlineDefault;
                  return (
                    <div
                      key={skin.id}
                      data-testid={`app-skin-item-${skin.id}`}
                      onClick={() => handleSelectAppSkinToEdit(skin)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer space-y-2 ${
                        isSelected
                          ? 'bg-[#211d30] border-amber-400 shadow-lg'
                          : 'bg-[#181b28] border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold ${
                              skin.scope === 'app'
                                ? 'bg-purple-950 text-purple-300 border border-purple-500/50'
                                : skin.scope === 'player'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                                : 'bg-red-950 text-red-300 border border-red-500/50'
                            }`}
                          >
                            {skin.scope === 'app' ? 'LOBBY' : skin.scope === 'player' ? 'JUGADOR' : 'DM'}
                          </span>
                          <span className="font-cinzel font-black text-xs text-[#f5e4be]">
                            {skin.name}
                          </span>
                        </div>
                        {isOnlineForItsScope ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-400 text-emerald-300 text-[9px] font-cinzel font-bold shrink-0">
                            🟢 ONLINE DEFAULT
                          </span>
                        ) : (
                          <button
                            type="button"
                            data-testid={`btn-publish-online-skin-${skin.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetOnlineDefaultByScope(skin.id, skin.scope);
                            }}
                            className="px-2.5 py-0.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-cinzel font-black text-[10px] cursor-pointer shrink-0"
                          >
                            Activar Online
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 pt-1 border-t border-stone-800/80">
                        <span>Creador: {skin.authorName || 'Admin'}</span>
                        <div className="flex items-center gap-2">
                          <span>Código: {skin.acquisitionCode || 'ONLINE'}</span>
                          {isCustomSkin && (
                            <button
                              type="button"
                              data-testid={`btn-delete-skin-${skin.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSkin(skin.id);
                              }}
                              className="text-stone-500 hover:text-red-400 p-0.5 cursor-pointer"
                              title="Eliminar skin"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-stone-400 hover:text-red-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 8 Cols: Deep Visual Editor (Player Sheet, Map Mode, Tarot Card, Lobby, Credits) */}
            <div className="lg:col-span-8 space-y-4">
              {editingSkinDraft ? (
                <div className="p-5 rounded-2xl bg-[#181b28] border border-[#c8a45c]/60 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-800">
                    <div className="space-y-1 flex-1 min-w-[240px]">
                      <span className="text-[10px] font-mono uppercase text-amber-300 block">
                        Editando Skin [{editingSkinDraft.scope.toUpperCase()}] • Creador:{' '}
                        {editingSkinDraft.authorName || 'Admin'}
                      </span>
                      <input
                        type="text"
                        data-testid="input-edit-app-skin-name"
                        value={editingSkinDraft.name}
                        onChange={(e) =>
                          setEditingSkinDraft({ ...editingSkinDraft, name: e.target.value })
                        }
                        className="w-full font-cinzel font-black text-lg text-[#f5e4be] bg-[#10121a] border border-amber-500/50 rounded-xl px-3 py-1 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        data-testid="btn-save-app-skin-tokens"
                        onClick={handleSaveEditedSkin}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-cinzel font-black text-xs flex items-center gap-1.5 shadow cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>Guardar Cambios</span>
                      </button>
                      <button
                        type="button"
                        data-testid="btn-activate-editing-skin-online"
                        onClick={async () => {
                          await handleSaveEditedSkin();
                          await handleSetOnlineDefaultByScope(
                            editingSkinDraft.id,
                            editingSkinDraft.scope
                          );
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-cinzel font-black text-xs flex items-center gap-1.5 shadow cursor-pointer"
                      >
                        <Globe className="w-4 h-4" />
                        <span>Usar como Skin Online ({editingSkinDraft.scope.toUpperCase()})</span>
                      </button>
                    </div>
                  </div>

                  {editingSkinDraft.scope === 'player' ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap bg-[#11131c] p-2.5 rounded-2xl border border-stone-800">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            data-testid="editor-subtab-player-sheet"
                            onClick={() => setEditorSubSection('player_sheet')}
                            className={`px-3 py-1.5 rounded-xl font-cinzel font-bold text-xs cursor-pointer transition ${
                              editorSubSection !== 'credits'
                                ? 'bg-amber-500 text-stone-950 font-black shadow'
                                : 'text-stone-300 hover:bg-stone-800'
                            }`}
                          >
                            ✨ Estudio Interactivo de 4 Apartados (Skin de Jugador)
                          </button>
                          <button
                            type="button"
                            data-testid="editor-subtab-credits"
                            onClick={() => setEditorSubSection('credits')}
                            className={`px-3 py-1.5 rounded-xl font-cinzel font-bold text-xs cursor-pointer transition ${
                              editorSubSection === 'credits'
                                ? 'bg-rose-600 text-white font-black'
                                : 'text-stone-300 hover:bg-stone-800'
                            }`}
                          >
                            Créditos del Creador
                          </button>
                        </div>
                        <button
                          type="button"
                          data-testid="btn-launch-player-4-apartados"
                          onClick={() => setIsVisualDesignerFullScreen(true)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-amber-500 hover:from-cyan-400 hover:to-amber-400 text-stone-950 font-cinzel font-black text-xs flex items-center gap-1.5 shadow cursor-pointer"
                        >
                          <Palette className="w-3.5 h-3.5" />
                          <span>Ampliar a Pantalla Completa</span>
                        </button>
                      </div>

                      {editorSubSection !== 'credits' && (
                        <PlayerSkinFourApartadosEditor
                          tokens={t}
                          updateToken={updateThemeToken}
                        />
                      )}
                    </div>
                  ) : (
                    /* Sub-Section Selector inside Visual Editor for DM & App */
                    <div className="flex items-center gap-1.5 flex-wrap bg-[#11131c] p-2 rounded-2xl border border-stone-800">
                      {editingSkinDraft.scope === 'dm' && (
                        <button
                          type="button"
                          data-testid="editor-subtab-map-mode"
                          onClick={() => setEditorSubSection('map_mode')}
                          className={`px-3 py-1.5 rounded-xl font-cinzel font-bold text-xs cursor-pointer transition ${
                            editorSubSection === 'map_mode'
                              ? 'bg-red-600 text-white font-black'
                              : 'text-stone-300 hover:bg-stone-800'
                          }`}
                        >
                          1. Pantalla del DM, Carátula y Modo Mapa DM
                        </button>
                      )}

                      {editingSkinDraft.scope === 'app' && (
                        <button
                          type="button"
                          data-testid="editor-subtab-lobby-app"
                          onClick={() => setEditorSubSection('lobby_app')}
                          className={`px-3 py-1.5 rounded-xl font-cinzel font-bold text-xs cursor-pointer transition ${
                            editorSubSection === 'lobby_app'
                              ? 'bg-emerald-600 text-stone-950 font-black'
                              : 'text-stone-300 hover:bg-stone-800'
                          }`}
                        >
                          1. Lobby, Foro, Tienda y Barra Superior
                        </button>
                      )}

                      <button
                        type="button"
                        data-testid="editor-subtab-credits"
                        onClick={() => setEditorSubSection('credits')}
                        className={`px-3 py-1.5 rounded-xl font-cinzel font-bold text-xs cursor-pointer transition ${
                          editorSubSection === 'credits'
                            ? 'bg-rose-600 text-white font-black'
                            : 'text-stone-300 hover:bg-stone-800'
                        }`}
                      >
                        Créditos del Creador
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsVisualDesignerFullScreen(true)}
                        className="ml-auto px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-purple-600 text-white font-cinzel font-black text-xs cursor-pointer shadow"
                      >
                        ✨ Abrir Editor Modular por Capas ({editingSkinDraft.scope.toUpperCase()})
                      </button>
                    </div>
                  )}

                  {/* SUB-SECTION 1: PLAYER SHEET VISUAL EDITOR (Only if non-player scope) */}
                  {editingSkinDraft.scope !== 'player' && editorSubSection === 'player_sheet' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      {/* Tipografía, Iconos, Retrato y Fondo */}
                      <div className="p-3.5 rounded-xl bg-[#12141d] border border-stone-800 space-y-2.5">
                        <h4 className="font-cinzel font-bold text-cyan-300 uppercase">
                          A. Iconos, Fuente, Retrato y Fondo del Player Sheet
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-stone-400 block mb-0.5">
                              Tamaño Iconos:
                            </label>
                            <select
                              data-testid="select-sheet-icon-scale"
                              value={t.sheetIconScale || 'md'}
                              onChange={(e) =>
                                updateThemeToken('sheetIconScale', e.target.value as 'sm' | 'md' | 'lg')
                              }
                              className="w-full bg-[#181b28] border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-100"
                            >
                              <option value="sm">Compacto (SM)</option>
                              <option value="md">Estándar (MD)</option>
                              <option value="lg">Grande (LG)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block mb-0.5">
                              Fuente (Font):
                            </label>
                            <select
                              data-testid="select-sheet-font-family"
                              value={t.sheetFontFamily || 'cinzel'}
                              onChange={(e) =>
                                updateThemeToken(
                                  'sheetFontFamily',
                                  e.target.value as 'cinzel' | 'sans' | 'serif' | 'mono'
                                )
                              }
                              className="w-full bg-[#181b28] border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-100"
                            >
                              <option value="cinzel">Épica (Cinzel)</option>
                              <option value="serif">Clásica (Serif)</option>
                              <option value="sans">Moderna (Sans)</option>
                              <option value="mono">Rúnica / Técnica (Mono)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block mb-0.5">
                              Tamaño Retrato:
                            </label>
                            <select
                              data-testid="select-sheet-portrait-size"
                              value={t.sheetPortraitSize || 'md'}
                              onChange={(e) =>
                                updateThemeToken(
                                  'sheetPortraitSize',
                                  e.target.value as 'sm' | 'md' | 'lg'
                                )
                              }
                              className="w-full bg-[#181b28] border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-100"
                            >
                              <option value="sm">Retrato SM</option>
                              <option value="md">Retrato MD</option>
                              <option value="lg">Retrato LG</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-stone-400 block mb-0.5">
                              Color Fondo Player Sheet:
                            </label>
                            <input
                              type="color"
                              value={t.sheetBgColor || '#11131a'}
                              onChange={(e) => updateThemeToken('sheetBgColor', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block mb-0.5">
                              URL Textura Fondo (Opcional):
                            </label>
                            <input
                              type="text"
                              value={t.sheetBgTextureUrl || ''}
                              onChange={(e) => updateThemeToken('sheetBgTextureUrl', e.target.value)}
                              placeholder="https://..."
                              className="w-full bg-[#181b28] border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-200"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Diseño de Cajitas de Estadísticas y Barra de Vida */}
                      <div className="p-3.5 rounded-xl bg-[#12141d] border border-stone-800 space-y-2.5">
                        <h4 className="font-cinzel font-bold text-cyan-300 uppercase">
                          B. Cajitas de Atributos y Diseño de Barra de Vida (HP)
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-stone-400 block mb-0.5">
                              Estilo Cajitas:
                            </label>
                            <select
                              data-testid="select-sheet-stat-box-style"
                              value={t.sheetStatBoxStyle || 'ornate'}
                              onChange={(e) =>
                                updateThemeToken(
                                  'sheetStatBoxStyle',
                                  e.target.value as 'ornate' | 'minimal' | 'parchment' | 'runic'
                                )
                              }
                              className="w-full bg-[#181b28] border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-100"
                            >
                              <option value="ornate">Ornamental</option>
                              <option value="parchment">Pergamino</option>
                              <option value="runic">Rúnico</option>
                              <option value="minimal">Minimalista</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block mb-0.5">
                              Fondo Cajita:
                            </label>
                            <input
                              type="color"
                              value={t.sheetStatBoxBg || '#181b26'}
                              onChange={(e) => updateThemeToken('sheetStatBoxBg', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block mb-0.5">
                              Borde Cajita:
                            </label>
                            <input
                              type="color"
                              value={t.sheetStatBoxBorder || '#c8a45c'}
                              onChange={(e) => updateThemeToken('sheetStatBoxBorder', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div>
                            <label className="text-[10px] text-stone-400 block mb-0.5">
                              Estilo Barra Vida:
                            </label>
                            <select
                              data-testid="select-sheet-hp-bar-style"
                              value={t.sheetHpBarStyle || 'classic'}
                              onChange={(e) =>
                                updateThemeToken(
                                  'sheetHpBarStyle',
                                  e.target.value as 'classic' | 'segmented' | 'crystal' | 'ember'
                                )
                              }
                              className="w-full bg-[#181b28] border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-100"
                            >
                              <option value="classic">Clásica</option>
                              <option value="segmented">Segmentada</option>
                              <option value="crystal">Cristal Arcano</option>
                              <option value="ember">Ascua / Fuego</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block mb-0.5">
                              Color Relleno HP:
                            </label>
                            <input
                              type="color"
                              value={t.sheetHpBarFill || '#dc2626'}
                              onChange={(e) => updateThemeToken('sheetHpBarFill', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block mb-0.5">
                              Fondo Barra HP:
                            </label>
                            <input
                              type="color"
                              value={t.sheetHpBarBg || '#2a1215'}
                              onChange={(e) => updateThemeToken('sheetHpBarBg', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Mazos de Juego (Cartas de Tarot) y Rincón del Aventurero */}
                      <div className="p-3.5 rounded-xl bg-[#12141d] border border-stone-800 space-y-2.5 sm:col-span-2">
                        <h4 className="font-cinzel font-bold text-cyan-300 uppercase">
                          C. Diseño de Cartas de Tarot (Mazos de Juego) y El Rincón del Aventurero
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          <div>
                            <label className="text-[10px] text-stone-400 block">
                              Fondo Carta Mazo:
                            </label>
                            <input
                              type="color"
                              value={t.deckTarotCardBg || '#161924'}
                              onChange={(e) => updateThemeToken('deckTarotCardBg', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block">
                              Borde Carta Mazo:
                            </label>
                            <input
                              type="color"
                              value={t.deckTarotCardBorder || '#d97706'}
                              onChange={(e) => updateThemeToken('deckTarotCardBorder', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block">
                              Cabecera Mazo:
                            </label>
                            <input
                              type="color"
                              value={t.deckTarotHeaderBg || '#261c14'}
                              onChange={(e) => updateThemeToken('deckTarotHeaderBg', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block">
                              Fondo Rincón Aventurero:
                            </label>
                            <input
                              type="color"
                              value={t.adventurerCornerBg || '#141722'}
                              onChange={(e) => updateThemeToken('adventurerCornerBg', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block">
                              Borde Rincón Aventurero:
                            </label>
                            <input
                              type="color"
                              value={t.adventurerCornerBorder || '#b45309'}
                              onChange={(e) =>
                                updateThemeToken('adventurerCornerBorder', e.target.value)
                              }
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-SECTION 2: MAP MODE VISUAL EDITOR */}
                  {editorSubSection === 'map_mode' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 rounded-xl bg-[#12141d] border border-stone-800 space-y-2.5">
                        <h4 className="font-cinzel font-bold text-amber-300 uppercase">
                          A. Marco del Mapa, Cartas en Mesa y Botones de Acción
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-stone-400 block">
                              Fondo Marco Mapa:
                            </label>
                            <input
                              type="color"
                              value={t.mapModeFrameBg || '#0d0f17'}
                              onChange={(e) => updateThemeToken('mapModeFrameBg', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block">
                              Borde Marco Mapa:
                            </label>
                            <input
                              type="color"
                              value={t.mapModeFrameBorder || '#c8a45c'}
                              onChange={(e) => updateThemeToken('mapModeFrameBorder', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block">
                              Fondo Cartas en Mapa:
                            </label>
                            <input
                              type="color"
                              value={t.mapModeCardBg || '#171a26'}
                              onChange={(e) => updateThemeToken('mapModeCardBg', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="text-[10px] text-stone-400 block">
                              Fondo Botones Mapa:
                            </label>
                            <input
                              type="color"
                              value={t.mapModeButtonBg || '#d97706'}
                              onChange={(e) => updateThemeToken('mapModeButtonBg', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block">
                              Texto Botones Mapa:
                            </label>
                            <input
                              type="color"
                              value={t.mapModeButtonText || '#0b0c10'}
                              onChange={(e) => updateThemeToken('mapModeButtonText', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#12141d] border border-stone-800 space-y-2.5">
                        <h4 className="font-cinzel font-bold text-purple-300 uppercase">
                          B. Carátula del Dungeon Master en Modo Mapa
                        </h4>
                        <p className="text-[11px] text-stone-400">
                          Personaliza cómo ve el jugador la carátula en vivo del Dungeon Master dentro de la mesa.
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-stone-400 block">
                              Fondo Carátula DM:
                            </label>
                            <input
                              type="color"
                              value={t.mapModeDmHoodBg || '#1c1526'}
                              onChange={(e) => updateThemeToken('mapModeDmHoodBg', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block">
                              Borde Carátula DM:
                            </label>
                            <input
                              type="color"
                              value={t.mapModeDmHoodBorder || '#9333ea'}
                              onChange={(e) =>
                                updateThemeToken('mapModeDmHoodBorder', e.target.value)
                              }
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block">
                              Acento / Texto DM:
                            </label>
                            <input
                              type="color"
                              value={t.mapModeDmHoodAccent || '#e9d5ff'}
                              onChange={(e) =>
                                updateThemeToken('mapModeDmHoodAccent', e.target.value)
                              }
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-SECTION 3: CHARACTER TAROT CARD (LOBBY & MAP) */}
                  {editorSubSection === 'tarot_card' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 rounded-xl bg-[#12141d] border border-stone-800 space-y-2.5">
                        <h4 className="font-cinzel font-bold text-purple-300 uppercase">
                          Carta de Tarot del Personaje (Se muestra en Lobby y en Mesa)
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-stone-400 block">Marco Carta:</label>
                            <input
                              type="color"
                              value={t.cardFrameColor}
                              onChange={(e) => {
                                updateThemeToken('cardFrameColor', e.target.value);
                                updateThemeToken('tarotBorderColor', e.target.value);
                              }}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block">Fondo Carta:</label>
                            <input
                              type="color"
                              value={t.cardBgColor}
                              onChange={(e) => updateThemeToken('cardBgColor', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block">
                              Cabecera Carta:
                            </label>
                            <input
                              type="color"
                              value={t.cardHeaderBg}
                              onChange={(e) => updateThemeToken('cardHeaderBg', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div>
                            <label className="text-[10px] text-stone-400 block">Texto Carta:</label>
                            <input
                              type="color"
                              value={t.cardTextColor}
                              onChange={(e) => updateThemeToken('cardTextColor', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block">
                              Fondo Insignia:
                            </label>
                            <input
                              type="color"
                              value={t.tarotBadgeBg || '#78350f'}
                              onChange={(e) => updateThemeToken('tarotBadgeBg', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block">
                              Borde Insignia:
                            </label>
                            <input
                              type="color"
                              value={t.cardBadgeColor}
                              onChange={(e) => updateThemeToken('cardBadgeColor', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Mini Preview of Character Tarot Card */}
                      <div className="p-3.5 rounded-xl bg-[#12141d] border border-stone-800 flex flex-col justify-between">
                        <span className="text-[10px] font-mono uppercase text-stone-400">
                          Vista Previa de Carta de Personaje (Lobby / Mesa)
                        </span>
                        <div
                          style={{
                            backgroundColor: t.cardBgColor,
                            borderColor: t.cardFrameColor,
                            color: t.cardTextColor,
                          }}
                          className="p-3 rounded-2xl border-2 space-y-2 shadow-lg mt-2"
                        >
                          <div
                            style={{ backgroundColor: t.cardHeaderBg }}
                            className="p-2 rounded-xl flex items-center justify-between"
                          >
                            <span className="font-cinzel font-black text-xs">
                              Sir Gareth • Paladín Nv. 5
                            </span>
                            <span
                              style={{
                                backgroundColor: t.tarotBadgeBg || '#78350f',
                                borderColor: t.cardBadgeColor,
                              }}
                              className="px-2 py-0.5 rounded-full text-[9px] font-bold border"
                            >
                              CA 18 • HP 44/44
                            </span>
                          </div>
                          <p className="text-[10px] opacity-85">
                            Esta carta se sincroniza en el Lobby y en la Mesa con la Skin equipada por el jugador.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-SECTION 4: LOBBY, FORO Y CARÁTULA SUPERIOR */}
                  {editorSubSection === 'lobby_app' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 rounded-xl bg-[#12141d] border border-stone-800 space-y-2.5">
                        <h4 className="font-cinzel font-bold text-amber-300 uppercase">
                          1. Carátula Superior (Will Roll, Manual y Sabio Arcano)
                        </h4>
                        <div>
                          <label className="text-[11px] text-stone-400 block mb-0.5">
                            Título Principal en Barra Superior:
                          </label>
                          <input
                            type="text"
                            data-testid="input-skin-header-title"
                            value={t.headerTitleText}
                            onChange={(e) => updateThemeToken('headerTitleText', e.target.value)}
                            className="w-full bg-[#181b28] border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-100"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-stone-400 block mb-0.5">
                              Texto Botón Manual:
                            </label>
                            <input
                              type="text"
                              value={t.manualButtonLabel}
                              onChange={(e) => updateThemeToken('manualButtonLabel', e.target.value)}
                              className="w-full bg-[#181b28] border border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-100"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-stone-400 block mb-0.5">
                              Texto Sabio Arcano:
                            </label>
                            <input
                              type="text"
                              value={t.oracleButtonLabel}
                              onChange={(e) => updateThemeToken('oracleButtonLabel', e.target.value)}
                              className="w-full bg-[#181b28] border border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-100"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-stone-400 block mb-0.5">
                              Color Fondo Carátula:
                            </label>
                            <input
                              type="color"
                              value={t.headerBgColor}
                              onChange={(e) => updateThemeToken('headerBgColor', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-stone-400 block mb-0.5">
                              Color Borde Carátula:
                            </label>
                            <input
                              type="color"
                              value={t.headerBorderColor}
                              onChange={(e) => updateThemeToken('headerBorderColor', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#12141d] border border-stone-800 space-y-2.5">
                        <h4 className="font-cinzel font-bold text-amber-300 uppercase">
                          2. Botones, Foro de la Comunidad y Amigos
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-stone-400 block mb-0.5">
                              Tamaño de Botones:
                            </label>
                            <select
                              data-testid="select-skin-button-scale"
                              value={t.buttonScale}
                              onChange={(e) =>
                                updateThemeToken('buttonScale', e.target.value as 'sm' | 'md' | 'lg')
                              }
                              className="w-full bg-[#181b28] border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-100"
                            >
                              <option value="sm">Compacto (SM)</option>
                              <option value="md">Estándar (MD)</option>
                              <option value="lg">Grande (LG)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] text-stone-400 block mb-0.5">
                              Escala de Títulos:
                            </label>
                            <select
                              value={t.titleFontScale}
                              onChange={(e) =>
                                updateThemeToken(
                                  'titleFontScale',
                                  e.target.value as 'sm' | 'md' | 'lg'
                                )
                              }
                              className="w-full bg-[#181b28] border border-stone-700 rounded-lg px-2 py-1.5 text-xs text-stone-100"
                            >
                              <option value="sm">Discreto (SM)</option>
                              <option value="md">Normal (MD)</option>
                              <option value="lg">Monumental (LG)</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-stone-400 block">Fondo Foro:</label>
                            <input
                              type="color"
                              value={t.forumCardBg}
                              onChange={(e) => updateThemeToken('forumCardBg', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block">Borde Foro:</label>
                            <input
                              type="color"
                              value={t.forumBorderColor}
                              onChange={(e) => updateThemeToken('forumBorderColor', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 block">Fondo Amigos:</label>
                            <input
                              type="color"
                              value={t.friendsSectionBg}
                              onChange={(e) => updateThemeToken('friendsSectionBg', e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-SECTION 5: CREATOR CREDITS & ATTRIBUTION */}
                  {editorSubSection === 'credits' && (
                    <div className="p-4 rounded-xl bg-[#12141d] border border-rose-500/40 space-y-3 text-xs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="font-cinzel font-bold text-rose-300 uppercase flex items-center gap-1.5">
                          <Award className="w-4 h-4" />
                          <span>Créditos del Creador / Editor al Equipar la Skin</span>
                        </h4>
                        <label className="inline-flex items-center gap-2 cursor-pointer text-[11px] text-stone-300">
                          <input
                            type="checkbox"
                            checked={!editingSkinDraft.hideCreatorCredit}
                            onChange={(e) =>
                              setEditingSkinDraft({
                                ...editingSkinDraft,
                                hideCreatorCredit: !e.target.checked,
                              })
                            }
                            className="rounded accent-rose-500"
                          />
                          <span>Mostrar sello de Créditos al jugador/DM cuando active esta Skin</span>
                        </label>
                      </div>
                      <p className="text-[11px] text-stone-400">
                        Por defecto, las skins default o creadas por un Administrador no muestran etiqueta de editor a menos que personalices aquí el título del Creador/Editor y su descripción conmemorativa (por ejemplo: <em>&quot;Edición Especial Navidad 2026&quot;</em>).
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-cinzel font-bold text-amber-300 mb-1">
                            Nombre del Editor / Creador:
                          </label>
                          <input
                            type="text"
                            data-testid="input-skin-editor-credit"
                            value={editingSkinDraft.editorCreditName || ''}
                            onChange={(e) =>
                              setEditingSkinDraft({
                                ...editingSkinDraft,
                                editorCreditName: e.target.value,
                                hideCreatorCredit: e.target.value.trim()
                                  ? false
                                  : editingSkinDraft.hideCreatorCredit,
                              })
                            }
                            placeholder="Ej. Estudio Real / Nombre del Creador"
                            className="w-full bg-[#181b28] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-cinzel font-bold text-amber-300 mb-1">
                            Descripción Conmemorativa de Créditos:
                          </label>
                          <input
                            type="text"
                            data-testid="input-skin-credit-desc"
                            value={editingSkinDraft.customCreditDescription || ''}
                            onChange={(e) =>
                              setEditingSkinDraft({
                                ...editingSkinDraft,
                                customCreditDescription: e.target.value,
                                hideCreatorCredit: e.target.value.trim()
                                  ? false
                                  : editingSkinDraft.hideCreatorCredit,
                              })
                            }
                            placeholder="Ej. Skin conmemorativa del Solsticio de Invierno 2026"
                            className="w-full bg-[#181b28] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LIVE INTERACTIVE PREVIEW OF PLAYER SHEET + MAP MODE + TAROT */}
                  <div
                    data-testid="skin-live-preview-box"
                    style={{
                      backgroundColor: t.sheetBgColor || '#11131a',
                      borderColor: t.cardFrameColor || '#c8a45c',
                    }}
                    className="p-4 rounded-2xl border-2 space-y-3 shadow-inner"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        <span>
                          Vista Previa en Vivo (Player Sheet • Fuente: {t.sheetFontFamily || 'cinzel'} • Iconos: {(t.sheetIconScale || 'md').toUpperCase()})
                        </span>
                      </span>
                      {!editingSkinDraft.hideCreatorCredit &&
                        (editingSkinDraft.editorCreditName || !editingSkinDraft.createdByAdmin) && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-950/90 border border-amber-500/60 text-amber-200 text-[10px] font-cinzel">
                            ✨ Creado por: {editingSkinDraft.editorCreditName || editingSkinDraft.authorName}
                          </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Stat Box & HP Bar Preview */}
                      <div
                        style={{
                          backgroundColor: t.sheetStatBoxBg || '#181b26',
                          borderColor: t.sheetStatBoxBorder || '#c8a45c',
                        }}
                        className="p-3 rounded-xl border space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold" style={{ color: t.cardTextColor }}>
                            FUERZA (Estilo: {t.sheetStatBoxStyle || 'ornate'})
                          </span>
                          <span className="px-2 py-0.5 rounded bg-black/40 font-mono text-amber-300">
                            18 (+4)
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-stone-300">
                            <span>Puntos de Golpe ({t.sheetHpBarStyle || 'classic'})</span>
                            <span>44 / 52 HP</span>
                          </div>
                          <div
                            style={{ backgroundColor: t.sheetHpBarBg || '#2a1215' }}
                            className="w-full h-3 rounded-full overflow-hidden border border-white/10"
                          >
                            <div
                              style={{
                                width: '84%',
                                backgroundColor: t.sheetHpBarFill || '#dc2626',
                              }}
                              className="h-full transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Tarot Deck & Rincón del Aventurero Preview */}
                      <div
                        style={{
                          backgroundColor: t.deckTarotCardBg || '#161924',
                          borderColor: t.deckTarotCardBorder || '#d97706',
                        }}
                        className="p-3 rounded-xl border space-y-1.5"
                      >
                        <div
                          style={{ backgroundColor: t.deckTarotHeaderBg || '#261c14' }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-200 flex justify-between"
                        >
                          <span>🃏 Mazo: Castigo Divino</span>
                          <span>Nv. 2</span>
                        </div>
                        <div
                          style={{
                            backgroundColor: t.adventurerCornerBg || '#141722',
                            borderColor: t.adventurerCornerBorder || '#b45309',
                          }}
                          className="p-2 rounded-lg border text-[10px] text-stone-300"
                        >
                          ⛺ <strong>Rincón del Aventurero:</strong> Mochila, Oro y Notas.
                        </div>
                      </div>

                      {/* Map Mode & DM Hood Preview */}
                      <div
                        style={{
                          backgroundColor: t.mapModeFrameBg || '#0d0f17',
                          borderColor: t.mapModeFrameBorder || '#c8a45c',
                        }}
                        className="p-3 rounded-xl border space-y-2"
                      >
                        <div
                          style={{
                            backgroundColor: t.mapModeDmHoodBg || '#1c1526',
                            borderColor: t.mapModeDmHoodBorder || '#9333ea',
                            color: t.mapModeDmHoodAccent || '#e9d5ff',
                          }}
                          className="px-2.5 py-1.5 rounded-lg border text-[10px] font-bold flex items-center justify-between"
                        >
                          <span>👑 Carátula DM en Mapa</span>
                          <span>En Línea</span>
                        </div>
                        <button
                          type="button"
                          style={{
                            backgroundColor: t.mapModeButtonBg || '#d97706',
                            color: t.mapModeButtonText || '#0b0c10',
                          }}
                          className="w-full py-1 rounded-lg font-cinzel font-black text-[10px]"
                        >
                          Botón de Acción en Modo Mapa
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Convert / Promote this Skin to a Permanent Player Skin or DM Skin */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-[#21182b] via-[#191524] to-[#14161f] border border-purple-500/60 space-y-3">
                    <div>
                      <h4 className="font-cinzel font-black text-xs sm:text-sm text-purple-200 uppercase flex items-center gap-1.5">
                        <Gift className="w-4 h-4 text-amber-400" />
                        <span>
                          Convertir / Guardar como Skin Permanente (Con Créditos Conmemorativos Opcionales)
                        </span>
                      </h4>
                      <p className="text-[11px] text-stone-400">
                        Únicamente se cambia la skin de un jugador de forma permanente si tú decides convertirla y otorgarla aquí; de lo contrario permanecerá como Skin Default Online.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <select
                        data-testid="select-promote-skin-scope"
                        value={promoteTargetScope}
                        onChange={(e) => setPromoteTargetScope(e.target.value as 'player' | 'dm')}
                        className="bg-[#10121a] border border-purple-500/60 rounded-xl px-3 py-2 text-xs font-cinzel font-bold text-purple-200"
                      >
                        <option value="player">🛡️ Convertir a Skin de Jugador Permanente</option>
                        <option value="dm">👑 Convertir a Skin de DM Permanente</option>
                      </select>
                      <input
                        type="text"
                        data-testid="input-promote-skin-name"
                        value={promoteSkinName}
                        onChange={(e) => setPromoteSkinName(e.target.value)}
                        placeholder="Nombre (ej. Skin Navidad 2026)"
                        className="bg-[#10121a] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                      />
                      <input
                        type="text"
                        data-testid="input-promote-skin-code"
                        value={promoteCode}
                        onChange={(e) => setPromoteCode(e.target.value.toUpperCase())}
                        placeholder="Código (ej. NAVIDAD-2026)"
                        className="bg-[#10121a] border border-stone-700 rounded-xl px-3 py-2 text-xs font-mono text-amber-200"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                      <input
                        type="text"
                        value={promoteEditorCredit}
                        onChange={(e) => setPromoteEditorCredit(e.target.value)}
                        placeholder="Editor/Creador (Opcional, ej. Evento Navidad)"
                        className="bg-[#10121a] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                      />
                      <input
                        type="text"
                        value={promoteCustomDesc}
                        onChange={(e) => setPromoteCustomDesc(e.target.value)}
                        placeholder="Descripción en Créditos al activar (Opcional)"
                        className="bg-[#10121a] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                      />
                      <button
                        type="button"
                        data-testid="btn-promote-skin-submit"
                        onClick={handlePromoteSkin}
                        className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-cinzel font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>Guardar Skin Permanente</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB: SKINS DE JUGADOR / SKINS DE DM (ADMIN & CREATOR)             */}
      {/* ================================================================= */}
      {(activeTab === 'player_skins' || activeTab === 'dm_skins') && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#181b28] border border-[#c8a45c]/50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-cinzel font-black text-base text-[#f5e4be] uppercase">
                {activeTab === 'player_skins'
                  ? '🛡️ Catálogo en Nube de Skins de Jugador (Player Sheet, Modo Mapa y Carta)'
                  : '👑 Catálogo en Nube de Skins de Dungeon Master (Hojas de Mundo)'}
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                {isAdmin
                  ? 'Como Administrador puedes ver quién creó cada skin, editar cualquiera de ellas, definir cuál es la Skin Online por defecto o regalarlas a cualquier cuenta.'
                  : 'Solo puedes editar las skins creadas por tu cuenta. Al guardar cambios se enviarán a revisión de un Administrador.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                handleCreateNewBlankSkin(activeTab === 'player_skins' ? 'player' : 'dm')
              }
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-cinzel font-black text-xs flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Plus className="w-4 h-4" />
              <span>
                Crear Nueva Skin de {activeTab === 'player_skins' ? 'Jugador' : 'Dungeon Master'}
              </span>
            </button>
          </div>

          {(activeTab === 'player_skins' ? catalogPlayerSkins : catalogDmSkins).length === 0 && (
            <div className="p-6 rounded-2xl bg-[#141724] border border-dashed border-stone-700 text-center space-y-2">
              <p className="text-xs font-cinzel font-bold text-amber-300">
                No hay skins permanentes o de evento registradas en esta categoría todavía.
              </p>
              <p className="text-[11px] text-stone-400 max-w-xl mx-auto">
                Las skins Default Online se administran en la pestaña <strong>Skins de la App & Editor Visual</strong>. Aquí aparecerán únicamente las skins permanentes o de temporada (ej. Navidad, Halloween) que pueden regalarse o desbloquearse con código para que los jugadores las conserven para siempre.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(activeTab === 'player_skins' ? catalogPlayerSkins : catalogDmSkins).map((skin) => {
              const editable = canEditItem(skin.authorEmail, skin.isOfficialDefault);
              const isOnlineActive =
                (skin.scope === 'player' && skin.id === onlinePlayerSkin?.id) ||
                (skin.scope === 'dm' && skin.id === onlineDmSkin?.id);
              return (
                <div
                  key={skin.id}
                  data-testid={`catalog-skin-card-${skin.id}`}
                  style={{
                    borderColor: skin.themeTokens?.cardFrameColor || '#c8a45c',
                    backgroundColor: skin.themeTokens?.cardBgColor || '#161822',
                  }}
                  className="p-4 rounded-2xl border-2 flex flex-col justify-between gap-3 shadow-xl"
                >
                  <div className="space-y-2">
                    <div
                      style={{ backgroundColor: skin.themeTokens?.cardHeaderBg || '#231c14' }}
                      className="p-2.5 rounded-xl border border-white/10 flex items-center justify-between gap-2"
                    >
                      <span
                        style={{ color: skin.themeTokens?.cardTextColor || '#f5e4be' }}
                        className="font-cinzel font-black text-sm"
                      >
                        {skin.name}
                      </span>
                      <div className="flex items-center gap-1">
                        {isOnlineActive && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-400 text-emerald-300 text-[9px] font-bold">
                            ONLINE DEFAULT
                          </span>
                        )}
                        <span
                          style={{
                            borderColor: skin.themeTokens?.cardBadgeColor || '#f59e0b',
                            color: skin.themeTokens?.cardTextColor || '#f5e4be',
                          }}
                          className="px-2 py-0.5 rounded-full text-[9px] font-cinzel font-bold border bg-black/40"
                        >
                          {skin.seasonTag || 'Permanente'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-stone-300">{skin.description}</p>

                    <div className="text-[11px] text-stone-400 font-mono space-y-0.5">
                      <div>
                        Creador: <strong className="text-stone-200">{skin.authorName}</strong> (
                        {skin.authorEmail})
                      </div>
                      {!skin.hideCreatorCredit &&
                        (skin.editorCreditName || !skin.createdByAdmin) && (
                          <div className="text-amber-300">
                            Crédito visible: {skin.editorCreditName || skin.authorName}
                          </div>
                        )}
                      {skin.reviewStatus === 'pending_review' && (
                        <div className="text-amber-400 font-bold">
                          🕒 Pendiente de Revisión de Admin
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-amber-300">
                        Código: <strong>{skin.acquisitionCode || 'DEFAULT'}</strong>
                      </span>
                      <span className="text-emerald-300">
                        {ownedSkinIds.includes(skin.id) ? '✓ En tu Cuenta' : 'En Servidor'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {editable && (
                        <button
                          type="button"
                          data-testid={`btn-edit-catalog-skin-${skin.id}`}
                          onClick={() => {
                            handleSelectAppSkinToEdit(skin);
                            setIsVisualDesignerFullScreen(true);
                          }}
                          className="flex-1 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white font-cinzel font-black text-xs cursor-pointer shadow flex items-center justify-center gap-1"
                        >
                          <Palette className="w-3.5 h-3.5" />
                          <span>Diseñar en Estudio Completo</span>
                        </button>
                      )}
                      {editable && !skin.isOfficialDefault && (
                        <button
                          type="button"
                          data-testid={`btn-delete-skin-${skin.id}`}
                          onClick={() => handleDeleteSkin(skin.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/60 text-red-200 font-cinzel font-bold text-[10px] cursor-pointer flex items-center gap-1"
                          title="Eliminar esta Skin permanentemente"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                          <span>Eliminar</span>
                        </button>
                      )}
                      {isAdmin && !isOnlineActive && (
                        <button
                          type="button"
                          onClick={() => handleSetOnlineDefaultByScope(skin.id, skin.scope)}
                          className="px-2.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-cinzel font-bold text-[10px] cursor-pointer"
                        >
                          Usar como Default Online
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB: PAQUETES DLC (Available to Creator & Admin)                  */}
      {/* ================================================================= */}
      {activeTab === 'dlcs' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#181b28] border border-[#c8a45c]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-cinzel font-black text-sm sm:text-base text-[#f5e4be] uppercase">
                📦 Biblioteca de DLCs (SRD 5E Stock y Paquetes de Temporada)
              </h3>
              <p className="text-xs text-stone-400">
                Cada creador solo puede editar sus propios DLCs. Cuando un creador edita o sube un DLC, pasa por revisión de un Administrador; al aprobarse se actualiza y envía una notificación automática a quienes poseen el DLC.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="btn-open-create-dlc-workspace"
                onClick={handleOpenNewDlcWorkspace}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-cinzel font-black text-xs flex items-center gap-1.5 shadow-lg cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>✨ Crear Nuevo DLC en Estudio Completo</span>
              </button>
              <button
                type="button"
                data-testid="btn-open-create-dlc-form"
                onClick={() => {
                  setEditingDlcId(null);
                  setShowNewDlcForm((prev) => !prev);
                }}
                className="px-3 py-2 rounded-xl bg-[#12141c] hover:bg-[#1a1d29] border border-amber-500/50 text-amber-200 font-cinzel font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showNewDlcForm ? 'Cerrar' : 'Formulario Rápido'}</span>
              </button>
            </div>
          </div>

          {showNewDlcForm && (
            <div
              data-testid="form-create-new-dlc"
              className="p-5 rounded-2xl bg-[#161925] border-2 border-amber-500/70 space-y-4"
            >
              <h4 className="font-cinzel font-black text-sm text-amber-300 uppercase">
                {editingDlcId
                  ? 'Editar Paquete DLC Existente'
                  : 'Crear Nuevo Paquete DLC (Monstruos, NPCs, Objetos, Lugares e Imágenes)'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  data-testid="input-new-dlc-name"
                  value={newDlcDraft.name}
                  onChange={(e) => setNewDlcDraft({ ...newDlcDraft, name: e.target.value })}
                  placeholder="Nombre del DLC (ej. Crónicas de Escarcha 2026)"
                  className="bg-[#10121a] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                />
                <input
                  type="text"
                  value={newDlcDraft.seasonTag}
                  onChange={(e) => setNewDlcDraft({ ...newDlcDraft, seasonTag: e.target.value })}
                  placeholder="Etiqueta de Temporada (ej. Diciembre 2026)"
                  className="bg-[#10121a] border border-stone-700 rounded-xl px-3 py-2 text-xs text-amber-200"
                />
                <input
                  type="text"
                  data-testid="input-new-dlc-code"
                  value={newDlcDraft.acquisitionCode}
                  onChange={(e) =>
                    setNewDlcDraft({
                      ...newDlcDraft,
                      acquisitionCode: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="Código de Canje (ej. INVIERNO-2026)"
                  className="bg-[#10121a] border border-stone-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300"
                />
              </div>

              <textarea
                rows={2}
                value={newDlcDraft.description}
                onChange={(e) => setNewDlcDraft({ ...newDlcDraft, description: e.target.value })}
                placeholder="Descripción del contenido incluido en el DLC..."
                className="w-full bg-[#10121a] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200"
              />

              {/* Créditos del Creador en DLC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newDlcDraft.editorCreditName}
                  onChange={(e) =>
                    setNewDlcDraft({ ...newDlcDraft, editorCreditName: e.target.value })
                  }
                  placeholder="Nombre en Créditos del Creador (Opcional si eres Admin)"
                  className="bg-[#10121a] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                />
                <input
                  type="text"
                  value={newDlcDraft.customCreditDescription}
                  onChange={(e) =>
                    setNewDlcDraft({ ...newDlcDraft, customCreditDescription: e.target.value })
                  }
                  placeholder="Mensaje de créditos al activar el DLC en World Sheet..."
                  className="bg-[#10121a] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#10121a] border border-stone-800 space-y-1.5">
                  <span className="font-cinzel font-bold text-red-300 block">
                    💀 Monstruo Incluido:
                  </span>
                  <input
                    type="text"
                    value={newDlcDraft.monsterName}
                    onChange={(e) => setNewDlcDraft({ ...newDlcDraft, monsterName: e.target.value })}
                    placeholder="Nombre del Monstruo"
                    className="w-full bg-[#181b28] border border-stone-700 rounded px-2 py-1 text-xs"
                  />
                  <input
                    type="text"
                    value={newDlcDraft.monsterCr}
                    onChange={(e) => setNewDlcDraft({ ...newDlcDraft, monsterCr: e.target.value })}
                    placeholder="CR (ej. 4)"
                    className="w-full bg-[#181b28] border border-stone-700 rounded px-2 py-1 text-xs"
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#10121a] border border-stone-800 space-y-1.5">
                  <span className="font-cinzel font-bold text-amber-300 block">
                    🧙 NPC Incluido:
                  </span>
                  <input
                    type="text"
                    value={newDlcDraft.npcName}
                    onChange={(e) => setNewDlcDraft({ ...newDlcDraft, npcName: e.target.value })}
                    placeholder="Nombre del NPC"
                    className="w-full bg-[#181b28] border border-stone-700 rounded px-2 py-1 text-xs"
                  />
                  <input
                    type="text"
                    value={newDlcDraft.npcRole}
                    onChange={(e) => setNewDlcDraft({ ...newDlcDraft, npcRole: e.target.value })}
                    placeholder="Ocupación / Rol"
                    className="w-full bg-[#181b28] border border-stone-700 rounded px-2 py-1 text-xs"
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#10121a] border border-stone-800 space-y-1.5">
                  <span className="font-cinzel font-bold text-purple-300 block">
                    ⚔️ Objeto / Conjuro:
                  </span>
                  <input
                    type="text"
                    value={newDlcDraft.itemName}
                    onChange={(e) => setNewDlcDraft({ ...newDlcDraft, itemName: e.target.value })}
                    placeholder="Nombre del Objeto"
                    className="w-full bg-[#181b28] border border-stone-700 rounded px-2 py-1 text-xs"
                  />
                  <input
                    type="text"
                    value={newDlcDraft.itemRarity}
                    onChange={(e) => setNewDlcDraft({ ...newDlcDraft, itemRarity: e.target.value })}
                    placeholder="Rareza (ej. Muy Raro)"
                    className="w-full bg-[#181b28] border border-stone-700 rounded px-2 py-1 text-xs"
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#10121a] border border-stone-800 space-y-1.5">
                  <span className="font-cinzel font-bold text-emerald-300 block">
                    📍 Lugar y Álbum:
                  </span>
                  <input
                    type="text"
                    value={newDlcDraft.placeName}
                    onChange={(e) => setNewDlcDraft({ ...newDlcDraft, placeName: e.target.value })}
                    placeholder="Carpeta / Lugar del Atlas"
                    className="w-full bg-[#181b28] border border-stone-700 rounded px-2 py-1 text-xs"
                  />
                  <input
                    type="text"
                    value={newDlcDraft.photoUrl}
                    onChange={(e) => setNewDlcDraft({ ...newDlcDraft, photoUrl: e.target.value })}
                    placeholder="URL de Imagen de Álbum"
                    className="w-full bg-[#181b28] border border-stone-700 rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewDlcForm(false);
                    setEditingDlcId(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-cinzel font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  data-testid="btn-submit-new-dlc"
                  onClick={handleCreateOrSaveDlcPackage}
                  disabled={!newDlcDraft.name.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 font-cinzel font-black text-xs cursor-pointer shadow"
                >
                  {isAdmin
                    ? 'Guardar y Publicar DLC en la Nube'
                    : 'Enviar DLC a Revisión de Administrador'}
                </button>
              </div>
            </div>
          )}

          {/* DLC Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dlcs.map((dlc) => {
              const isOwned = ownedDlcIds.includes(dlc.id) || dlc.isOfficialSrd;
              const editable = canEditItem(dlc.authorEmail, dlc.isOfficialSrd);
              return (
                <div
                  key={dlc.id}
                  data-testid={`creator-dlc-card-${dlc.id}`}
                  className="p-4 rounded-2xl bg-[#181b28] border border-[#c8a45c]/55 flex flex-col justify-between gap-3 shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-cinzel font-black text-base text-[#f5e4be]">
                            {dlc.name}
                          </h4>
                          {dlc.isOfficialSrd && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-[10px] font-cinzel font-bold">
                              Manual 5E Stock
                            </span>
                          )}
                          {dlc.seasonTag && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-950 border border-purple-500/60 text-purple-200 text-[10px] font-mono">
                              {dlc.seasonTag}
                            </span>
                          )}
                          {dlc.reviewStatus === 'pending_review' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-400 text-amber-300 text-[10px] font-bold">
                              🕒 En Revisión
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-stone-400 font-mono">
                          Creador: {dlc.authorName} ({dlc.authorEmail}) • v{dlc.version}
                        </span>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-cinzel font-bold border ${
                          isOwned
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
                            : 'bg-stone-900 text-stone-400 border-stone-700'
                        }`}
                      >
                        {isOwned ? '✓ En tu Cuenta' : '🔒 Requiere Código'}
                      </span>
                    </div>

                    <p className="text-xs text-stone-300 leading-relaxed">{dlc.description}</p>

                    <div className="grid grid-cols-5 gap-1.5 pt-1 text-center font-mono text-[10px]">
                      <div className="p-1.5 rounded-lg bg-[#11131c] border border-stone-800">
                        <strong className="text-red-300 block text-xs">
                          {(dlc.monsters || []).length}
                        </strong>
                        <span className="text-stone-400">Monstruos</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-[#11131c] border border-stone-800">
                        <strong className="text-amber-300 block text-xs">
                          {(dlc.npcs || []).length}
                        </strong>
                        <span className="text-stone-400">NPCs</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-[#11131c] border border-stone-800">
                        <strong className="text-purple-300 block text-xs">
                          {(dlc.itemsAndSpells || []).length}
                        </strong>
                        <span className="text-stone-400">Objetos</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-[#11131c] border border-stone-800">
                        <strong className="text-emerald-300 block text-xs">
                          {(dlc.locations || []).length}
                        </strong>
                        <span className="text-stone-400">Lugares</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-[#11131c] border border-stone-800">
                        <strong className="text-cyan-300 block text-xs">
                          {(dlc.albumPhotos || []).length}
                        </strong>
                        <span className="text-stone-400">Imágenes</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-800 flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-[11px] text-amber-300">
                      Código: <strong>{dlc.acquisitionCode || 'SRD-5E-OFICIAL'}</strong>
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        data-testid={`btn-open-dlc-workspace-${dlc.id}`}
                        onClick={() => setActiveDlcWorkspace(dlc)}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-cinzel font-black text-[11px] flex items-center gap-1 cursor-pointer shadow"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Abrir Estudio de Creación</span>
                      </button>
                      {editable && !dlc.isOfficialSrd && (
                        <button
                          type="button"
                          data-testid={`btn-delete-dlc-${dlc.id}`}
                          onClick={() => handleDeleteDlc(dlc.id)}
                          className="px-2 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500/60 text-red-200 font-cinzel font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                          title="Eliminar este Paquete DLC permanentemente"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                          <span>Eliminar</span>
                        </button>
                      )}
                      <span className="text-[10px] text-stone-400">
                        World Sheet → Ajustes
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB: COLA DE REVISIÓN DE CREADORES (ADMIN ONLY)                   */}
      {/* ================================================================= */}
      {activeTab === 'reviews' && isAdmin && (
        <div className="p-5 rounded-2xl bg-[#181b28] border border-amber-500/60 space-y-4">
          <div>
            <h3 className="font-cinzel font-black text-base text-[#f5e4be] uppercase flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Cola de Revisión de Paquetes DLC y Skins de Creadores</span>
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Cuando un Creador de Contenido sube o edita una Skin o paquete DLC, no se publica directamente para evitar abusos o errores. Revísalo aquí; al aprobarlo se publica y se envía un mensaje automático a los poseedores.
            </p>
          </div>

          {totalPendingReviews === 0 ? (
            <div className="p-6 rounded-xl bg-[#11131c] border border-stone-800 text-center text-xs text-stone-400">
              No hay paquetes DLC ni Skins pendientes de revisión en este momento.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingReviewSkins.map((skin) => (
                <div
                  key={skin.id}
                  className="p-4 rounded-xl bg-[#11131c] border border-amber-500/50 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px] font-mono mr-2">
                      SKIN [{skin.scope.toUpperCase()}]
                    </span>
                    <strong className="font-cinzel text-sm text-[#f5e4be]">{skin.name}</strong>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Enviado por: {skin.authorName} ({skin.authorEmail})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleReviewDecision('skin', skin.id, 'approved')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-cinzel font-black text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Aprobar y Notificar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewDecision('skin', skin.id, 'rejected')}
                      className="px-3 py-1.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-cinzel font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Rechazar</span>
                    </button>
                  </div>
                </div>
              ))}

              {pendingReviewDlcs.map((dlc) => (
                <div
                  key={dlc.id}
                  className="p-4 rounded-xl bg-[#11131c] border border-amber-500/50 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-mono mr-2">
                      PAQUETE DLC
                    </span>
                    <strong className="font-cinzel text-sm text-[#f5e4be]">{dlc.name}</strong>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Enviado por: {dlc.authorName} ({dlc.authorEmail}) • {dlc.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleReviewDecision('dlc', dlc.id, 'approved')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-cinzel font-black text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Aprobar y Notificar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewDecision('dlc', dlc.id, 'rejected')}
                      className="px-3 py-1.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-cinzel font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Rechazar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB: LICENCIAS POR CUENTA (OTORGAR, QUITAR Y VER INVENTARIO)      */}
      {/* ================================================================= */}
      {activeTab === 'entitlements' && isAdmin && (
        <div className="p-5 rounded-2xl bg-[#181b28] border border-emerald-500/60 space-y-5">
          <div>
            <h3 className="font-cinzel font-black text-base text-[#f5e4be] uppercase flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Gestor de Licencias por Cuenta (Regalar, Quitar e Inspeccionar Skins y DLCs)</span>
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Regala cualquier Skin o paquete DLC a un usuario, consulta qué Skins y DLCs tiene registrados cada cuenta a su nombre, o retira cualquier licencia con un clic.
            </p>
          </div>

          {/* Grant Form */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end p-4 rounded-2xl bg-[#11131c] border border-stone-800">
            <div>
              <label className="block text-[11px] font-cinzel font-bold text-amber-300 mb-1">
                Correo de la Cuenta:
              </label>
              <input
                type="email"
                data-testid="input-grant-email"
                value={grantEmailInput}
                onChange={(e) => setGrantEmailInput(e.target.value)}
                placeholder="jugador@correo.com"
                className="w-full bg-[#181b28] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-cinzel font-bold text-amber-300 mb-1">
                Regalar / Otorgar Paquete DLC:
              </label>
              <select
                data-testid="select-grant-dlc"
                value={grantDlcIdInput}
                onChange={(e) => setGrantDlcIdInput(e.target.value)}
                className="w-full bg-[#181b28] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
              >
                <option value="">-- Ninguno --</option>
                {dlcs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.acquisitionCode || 'SRD'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-cinzel font-bold text-amber-300 mb-1">
                Regalar / Otorgar Skin:
              </label>
              <select
                data-testid="select-grant-skin"
                value={grantSkinIdInput}
                onChange={(e) => setGrantSkinIdInput(e.target.value)}
                className="w-full bg-[#181b28] border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
              >
                <option value="">-- Ninguna --</option>
                {skins
                  .filter((s) => s.scope !== 'app')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.scope === 'player' ? 'JUGADOR' : 'DM'}] {s.name}
                    </option>
                  ))}
              </select>
            </div>

            <button
              type="button"
              data-testid="btn-grant-entitlement"
              onClick={handleGrantEntitlement}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-cinzel font-black text-xs cursor-pointer shadow"
            >
              Regalar / Asignar a Cuenta
            </button>
          </div>

          {/* Per-Account Entitlements Table with Category Filters & Revoke Controls */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-cinzel font-bold text-xs text-emerald-300 uppercase">
                Inventario de Skins y DLCs Registrados por Cuenta ({filteredAccounts.length})
              </h4>
              <input
                type="text"
                value={accountFilterInput}
                onChange={(e) => setAccountFilterInput(e.target.value)}
                placeholder="Buscar cuenta por correo o nombre..."
                className="bg-[#10121a] border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-200 w-64"
              />
            </div>

            {/* Category Filter Pills for Account Licenses */}
            <div className="flex items-center gap-1.5 flex-wrap p-2 rounded-xl bg-[#141622] border border-stone-800">
              <button
                type="button"
                data-testid="filter-entitlement-all"
                onClick={() => setEntitlementCategoryFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-cinzel font-bold transition cursor-pointer ${
                  entitlementCategoryFilter === 'all'
                    ? 'bg-emerald-600 text-stone-950 font-black shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Todos los Paquetes
              </button>
              <button
                type="button"
                data-testid="filter-entitlement-player"
                onClick={() => setEntitlementCategoryFilter('player')}
                className={`px-3 py-1 rounded-lg text-xs font-cinzel font-bold transition cursor-pointer ${
                  entitlementCategoryFilter === 'player'
                    ? 'bg-cyan-600 text-stone-950 font-black shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                🛡️ Skins de Jugador
              </button>
              <button
                type="button"
                data-testid="filter-entitlement-dm"
                onClick={() => setEntitlementCategoryFilter('dm')}
                className={`px-3 py-1 rounded-lg text-xs font-cinzel font-bold transition cursor-pointer ${
                  entitlementCategoryFilter === 'dm'
                    ? 'bg-red-700 text-white font-black shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                👑 Skins de Dungeon Master
              </button>
              <button
                type="button"
                data-testid="filter-entitlement-dlc"
                onClick={() => setEntitlementCategoryFilter('dlc')}
                className={`px-3 py-1 rounded-lg text-xs font-cinzel font-bold transition cursor-pointer ${
                  entitlementCategoryFilter === 'dlc'
                    ? 'bg-amber-600 text-stone-950 font-black shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                📦 Paquetes DLC
              </button>
            </div>

            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredAccounts.map((acc) => {
                // Lobby skins are strictly excluded from per-account licenses
                const accountSkins = acc.ownedSkinIds
                  .map((sId) => skins.find((x) => x.id === sId) || { id: sId, name: sId, scope: 'player' as const })
                  .filter((s) => s.scope !== 'app')
                  .filter((s) => {
                    if (entitlementCategoryFilter === 'player') return s.scope === 'player';
                    if (entitlementCategoryFilter === 'dm') return s.scope === 'dm';
                    return true;
                  });

                const showSkinsRow = entitlementCategoryFilter !== 'dlc';
                const showDlcsRow =
                  entitlementCategoryFilter === 'all' || entitlementCategoryFilter === 'dlc';

                return (
                  <div
                    key={acc.email}
                    data-testid={`account-entitlement-row-${acc.email}`}
                    className="p-3.5 rounded-2xl bg-[#11131c] border border-stone-800 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-cinzel font-bold text-sm text-[#f5e4be]">
                          {acc.displayName}
                        </span>
                        <span className="text-xs font-mono text-stone-400 ml-2">({acc.email})</span>
                        <span className="ml-2 px-2 py-0.5 rounded bg-stone-800 text-[10px] font-mono uppercase text-amber-300">
                          {acc.appRole}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGrantEmailInput(acc.email)}
                        className="text-[11px] text-emerald-400 hover:underline font-mono cursor-pointer"
                      >
                        Seleccionar correo para regalar
                      </button>
                    </div>

                    {/* Owned Skins (Lobby skins excluded) */}
                    {showSkinsRow && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-[10px] font-mono uppercase text-cyan-300 mr-1">
                          Skins ({accountSkins.length}):
                        </span>
                        {accountSkins.length === 0 ? (
                          <span className="text-[11px] text-stone-500">Ninguna asignada</span>
                        ) : (
                          accountSkins.map((sk) => (
                            <span
                              key={sk.id}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[11px] ${
                                sk.scope === 'dm'
                                  ? 'bg-red-950/70 border-red-600/50 text-red-200'
                                  : 'bg-cyan-950/70 border-cyan-600/50 text-cyan-200'
                              }`}
                            >
                              <span>
                                [{sk.scope === 'dm' ? 'DM' : 'JUGADOR'}] {sk.name}
                              </span>
                              <button
                                type="button"
                                data-testid={`btn-revoke-skin-${acc.email}-${sk.id}`}
                                onClick={() =>
                                  handleRevokeEntitlement(acc.email, { skinId: sk.id })
                                }
                                title="Quitar esta Skin de la cuenta"
                                className="text-red-400 hover:text-red-200 font-bold cursor-pointer"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    )}

                    {/* Owned DLCs */}
                    {showDlcsRow && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-[10px] font-mono uppercase text-amber-300 mr-1">
                          DLCs ({acc.ownedDlcIds.length}):
                        </span>
                        {acc.ownedDlcIds.length === 0 ? (
                          <span className="text-[11px] text-stone-500">Ninguno asignado</span>
                        ) : (
                          acc.ownedDlcIds.map((dId) => {
                            const dl = dlcs.find((x) => x.id === dId);
                            return (
                              <span
                                key={dId}
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-950/70 border border-amber-600/50 text-amber-200 text-[11px]"
                              >
                                <span>{dl ? dl.name : dId}</span>
                                <button
                                  type="button"
                                  data-testid={`btn-revoke-dlc-${acc.email}-${dId}`}
                                  onClick={() =>
                                    handleRevokeEntitlement(acc.email, { dlcId: dId })
                                  }
                                  title="Quitar este DLC de la cuenta"
                                  className="text-red-400 hover:text-red-200 font-bold cursor-pointer"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
