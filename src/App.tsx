import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  User,
  Users,
  Dices,
  BookOpen,
  Sparkles,
  Download,
  Upload,
  Plus,
  RefreshCw,
  Folder,
  Radio,
  FileText,
  HelpCircle,
  Settings,
  KeyRound,
  Crown,
  Lock,
  Unlock,
  Flame,
  CheckCircle,
  X,
  Layers,
  ArrowLeft,
  LayoutGrid,
  MessageSquarePlus,
  Bot,
  Database,
  Gift,
  Check,
  Wrench,
  ShieldCheck,
} from 'lucide-react';
import {
  Character5e,
  DMWorkspace,
  DiceRollResult,
  RollMode,
  UserRole,
  HostSettings,
  InventoryItem,
  WorldSheetSummary,
  LiveCombatantMini,
  PendingDmOffer,
  PlayerMessageToDM,
} from './types/dnd';
import {
  loadCharacters,
  saveCharacters,
  loadActiveCharacterId,
  saveActiveCharacterId,
  loadDMWorkspace,
  saveDMWorkspace,
  loadRoomCode,
  saveRoomCode,
  loadUserRole,
  saveUserRole,
  loadHostSettings,
  saveHostSettings,
  loadAuthUser,
  saveAuthUser,
  AuthSessionUser,
  isCharacterUnlocked,
  setCharacterUnlocked,
  isDMUnlocked,
  setDMUnlocked,
  exportBackupData,
  importBackupData,
} from './utils/storage';
import { CharacterSheetView } from './components/character/CharacterSheetView';
import { CharacterCreatorModal } from './components/character/CharacterCreatorModal';
import { DMScreenView } from './components/dm/DMScreenView';
import { DiceRollerModal } from './components/dice/DiceRollerModal';
import { QuickDiceBar } from './components/dice/QuickDiceBar';
import { RulesCompendiumModal } from './components/rules/RulesCompendiumModal';
import { ArcaneOracleModal } from './components/ai/ArcaneOracleModal';
import { PartySessionBar } from './components/session/PartySessionBar';
import { LiveRollFeedModal } from './components/session/LiveRollFeedModal';
import { RoleSelectionModal } from './components/auth/RoleSelectionModal';
import { PasswordPromptModal } from './components/auth/PasswordPromptModal';
import { ChangelogModal } from './components/host/ChangelogModal';
import { LobbyPortalView } from './components/lobby/LobbyPortalView';
import { FeedbackModal } from './components/feedback/FeedbackModal';
import { UserSecurityModal } from './components/auth/UserSecurityModal';
import { ModeratorPanelModal } from './components/admin/ModeratorPanelModal';
import { BrandLogo } from './components/common/BrandLogo';
import { calculateProficiencyBonus, calculatePassivePerception } from './utils/dnd-math';
import { SAMPLE_DM_WORKSPACE } from './data/srd';

export default function App() {
  // Authentication & Session
  const [authUser, setAuthUser] = useState<AuthSessionUser | null>(() => loadAuthUser());
  const [userRole, setUserRole] = useState<UserRole>(() => loadUserRole() || authUser?.role || 'player');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isModeratorModalOpen, setIsModeratorModalOpen] = useState<boolean>(false);

  // App View Architecture: 'lobby' is the primary portal
  const [appView, setAppView] = useState<'lobby' | 'player-session' | 'player-solo' | 'dm-session'>('lobby');

  // Host Settings
  const [hostSettings, setHostSettings] = useState<HostSettings>(() => loadHostSettings());
  const [isChangelogOpen, setIsChangelogOpen] = useState<boolean>(false);
  const [dismissedDevNotice, setDismissedDevNotice] = useState<boolean>(false);

  // Persistence State
  const [characters, setCharacters] = useState<Character5e[]>(() => loadCharacters());
  const [activeCharId, setActiveCharId] = useState<string>(() => loadActiveCharacterId());
  const [dmWorkspace, setDmWorkspace] = useState<DMWorkspace>(() => loadDMWorkspace());
  const [roomCode, setRoomCode] = useState<string>(() => loadRoomCode() || 'MESA-DRAGON');
  const [worldSheets, setWorldSheets] = useState<WorldSheetSummary[]>([]);
  const [activeWorld, setActiveWorld] = useState<WorldSheetSummary | null>(null);

  // Password Prompt Modal State
  const [passwordModalConfig, setPasswordModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    expectedPassword?: string;
    onSuccess: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onSuccess: () => {},
  });

  // Active Character
  const activeCharacter = characters.find((c) => c.id === activeCharId) || characters[0];

  // Modals
  const [isCreatorOpen, setIsCreatorOpen] = useState<boolean>(false);
  const [isCompendiumOpen, setIsCompendiumOpen] = useState<boolean>(false);
  const [isOracleOpen, setIsOracleOpen] = useState<boolean>(false);
  const [oracleInitialPrompt, setOracleInitialPrompt] = useState<string>('');
  const [isRollFeedOpen, setIsRollFeedOpen] = useState<boolean>(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false);

  // App Total Backup Restore
  const appRestoreFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isAppRestoring, setIsAppRestoring] = useState<boolean>(false);
  const [appRestoreMsg, setAppRestoreMsg] = useState<string>('');

  const handleAppRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAppRestoring(true);
    setAppRestoreMsg('');
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch('/api/vault/restore-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al restaurar respaldo.');
      setAppRestoreMsg(data.message || '¡Respaldo Maestro Restaurado con Éxito!');

      // Immediately save the newly restored state into local mirror snapshot so sync comparison respects it as newest
      if (data.latestBackup) {
        try {
          localStorage.setItem('weroll_cloud_mirror_snapshot_v2', JSON.stringify(data.latestBackup));
        } catch {}
      }

      if (data.latestBackup?.settings) {
        setHostSettings(data.latestBackup.settings);
        saveHostSettings(data.latestBackup.settings);
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: 'SETTINGS_UPDATED',
            payload: data.latestBackup.settings,
          });
        }
      } else {
        fetch('/api/settings')
          .then((r) => r.json())
          .then((d) => {
            if (d) setHostSettings(d);
          })
          .catch(() => {});
      }
      fetchWorldSheets();
    } catch (err: any) {
      alert('Error al restaurar respaldo: ' + err.message);
    } finally {
      setIsAppRestoring(false);
      if (e.target) e.target.value = '';
    }
  };

  // Dice Roller State
  const [isRollerOpen, setIsRollerOpen] = useState<boolean>(false);
  const [rollerTitle, setRollerTitle] = useState<string>('Tirada General');
  const [rollerMod, setRollerMod] = useState<number>(0);
  const [rollerSides, setRollerSides] = useState<number>(20);
  const [rollerMode, setRollerMode] = useState<RollMode>('normal');
  const [recentRoll, setRecentRoll] = useState<DiceRollResult | null>(null);

  // Multiplayer Live Session State
  const [partyMembers, setPartyMembers] = useState<any[]>([]);
  const [rollFeed, setRollFeed] = useState<DiceRollResult[]>([]);
  const [activeAnnouncement, setActiveAnnouncement] = useState<{ title: string; content: string } | null>(null);
  const [roomPlayerMessages, setRoomPlayerMessages] = useState<PlayerMessageToDM[]>([]);
  const [serverDmConnected, setServerDmConnected] = useState<boolean>(false);
  const [serverDmLiveMessage, setServerDmLiveMessage] = useState<string>('');
  const [serverDmLastRoll, setServerDmLastRoll] = useState<DiceRollResult | undefined>(undefined);
  const [roomClosedAlert, setRoomClosedAlert] = useState<string>('');
  const [showCombatantsOnTable, setShowCombatantsOnTable] = useState<boolean>(false);
  const [liveCombatants, setLiveCombatants] = useState<LiveCombatantMini[]>([]);

  // DM -> Player Share Offer Notifications & Resolutions
  const [pendingPlayerOffers, setPendingPlayerOffers] = useState<PendingDmOffer[]>([]);
  const [isRespondingOffer, setIsRespondingOffer] = useState<boolean>(false);
  const [playerOfferFeedback, setPlayerOfferFeedback] = useState<string>('');
  const [dmOfferNotifications, setDmOfferNotifications] = useState<
    { id: string; offerId: string; accepted: boolean; message: string; timestamp: number }[]
  >([]);
  const seenResolvedOffersRef = useRef<Set<string>>(new Set());

  // Refs to always access freshest state inside intervals and async callbacks without stale closures
  const activeCharacterRef = useRef<Character5e | undefined>(activeCharacter);
  useEffect(() => {
    activeCharacterRef.current = activeCharacter;
  }, [activeCharacter]);

  const appViewRef = useRef(appView);
  useEffect(() => {
    appViewRef.current = appView;
  }, [appView]);

  const roomCodeRef = useRef(roomCode);
  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  const dmWorkspaceRef = useRef<DMWorkspace>(dmWorkspace);
  useEffect(() => {
    dmWorkspaceRef.current = dmWorkspace;
  }, [dmWorkspace]);

  // Broadcast channel for instantaneous cross-tab communication
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('dnd_5e_session_channel');
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'NEW_ROLL') {
          setRecentRoll(payload);
          setRollFeed((prev) => [...prev, payload]);
        } else if (type === 'ANNOUNCEMENT') {
          setActiveAnnouncement(payload);
        } else if (type === 'DM_LIVE_MESSAGE') {
          setServerDmLiveMessage(payload);
        } else if (type === 'COMBATANTS_UPDATE') {
          setShowCombatantsOnTable(payload.showCombatantsOnTable);
          setLiveCombatants(payload.liveCombatants || []);
        } else if (type === 'SETTINGS_UPDATED') {
          setHostSettings(payload);
          saveHostSettings(payload);
        } else if (type === 'DM_OFFER_CREATED' && payload) {
          const offer = payload as PendingDmOffer;
          if (
            appViewRef.current === 'player-session' &&
            offer.roomCode === (roomCodeRef.current || '').trim().toUpperCase() &&
            offer.targetCharacterId === activeCharacterRef.current?.id &&
            offer.status === 'pending'
          ) {
            setPendingPlayerOffers((prev) =>
              prev.some((o) => o.id === offer.id) ? prev : [...prev, offer]
            );
          }
        } else if (type === 'DM_OFFER_RESPONDED' && payload) {
          const offer = payload as PendingDmOffer;
          if (
            appViewRef.current === 'dm-session' &&
            offer.roomCode === (roomCodeRef.current || '').trim().toUpperCase() &&
            (offer.status === 'accepted' || offer.status === 'declined') &&
            !seenResolvedOffersRef.current.has(offer.id)
          ) {
            seenResolvedOffersRef.current.add(offer.id);
            const kindLabel =
              offer.kind === 'spell'
                ? 'el conjuro'
                : offer.kind === 'ability'
                ? 'la habilidad'
                : 'el objeto';
            const accepted = offer.status === 'accepted';
            const msg = accepted
              ? `✅ ¡${offer.targetCharacterName} (${offer.targetPlayerName || 'Jugador'}) ACEPTÓ recibir ${kindLabel} "${offer.title}"! Ya se encuentra en su ficha.`
              : `❌ ${offer.targetCharacterName} (${offer.targetPlayerName || 'Jugador'}) RECHAZÓ recibir ${kindLabel} "${offer.title}".`;
            setDmOfferNotifications((prev) => [
              {
                id: `dm-notif-${Date.now()}-${offer.id}`,
                offerId: offer.id,
                accepted,
                message: msg,
                timestamp: Date.now(),
              },
              ...prev,
            ]);
            fetch(
              `/api/session/room/${encodeURIComponent(offer.roomCode)}/offer/${encodeURIComponent(offer.id)}/ack-dm`,
              { method: 'POST' }
            ).catch(() => {});
          }
        }
      };

      return () => {
        channel.close();
      };
    }
  }, []);

  // Live synchronize host settings across all instances, browsers & computers
  useEffect(() => {
    let isMounted = true;
    const syncHostSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok && isMounted) {
          const fresh: HostSettings = await res.json();
          if (fresh && typeof fresh === 'object') {
            setHostSettings((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(fresh)) {
                saveHostSettings(fresh);
                return fresh;
              }
              return prev;
            });
          }
        }
      } catch (err) {}
    };

    syncHostSettings();
    const interval = setInterval(syncHostSettings, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Continuous Cloud & Mirror Backup Comparison (Archivo Base vs Latest Backup & Pre-Replace Archiving)
  useEffect(() => {
    let isMounted = true;
    const MIRROR_STORAGE_KEY = 'weroll_cloud_mirror_snapshot_v2';

    const runContinuousBackupComparison = async () => {
      if (!isMounted) return;
      try {
        let mirrorObj: any = null;
        try {
          const rawMirror = localStorage.getItem(MIRROR_STORAGE_KEY);
          if (rawMirror) {
            mirrorObj = JSON.parse(rawMirror);
          }
        } catch {}

        const clientTimestamp =
          mirrorObj?.backupTimestamp ||
          (mirrorObj?.exportedAt ? new Date(mirrorObj.exportedAt).getTime() : 0);
        const clientRevision = mirrorObj?.revision || 0;
        const clientHash = mirrorObj?.contentHash || '';
        const savedSettings = loadHostSettings();
        const clientAb = savedSettings?.autoBackup
          ? {
              ...savedSettings.autoBackup,
              githubToken: '',
              githubRepo: '',
            }
          : undefined;

        const checkRes = await fetch('/api/vault/sync-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientTimestamp,
            clientRevision,
            clientHash,
            clientAutoBackupConfig: clientAb,
          }),
        });

        if (!checkRes.ok || !isMounted) return;
        const checkData = await checkRes.json();

        // Case A: Server is on Archivo Base or older backup than our Mirror -> Send full mirror snapshot so server archives older state and restores newest!
        if (checkData.action === 'REQUEST_CLIENT_MIRROR_UPLOAD' && mirrorObj) {
          const uploadRes = await fetch('/api/vault/sync-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientTimestamp,
              clientRevision,
              clientHash,
              clientAutoBackupConfig: clientAb,
              clientMirrorSnapshot: mirrorObj,
            }),
          });
          if (uploadRes.ok && isMounted) {
            fetchWorldSheets();
          }
        }
        // Case B: Server has a newer backup (from a mutation or cloud recovery) -> Save to our local mirror!
        else if (checkData.action === 'UPDATE_CLIENT_MIRROR' && checkData.latestBackup) {
          try {
            localStorage.setItem(MIRROR_STORAGE_KEY, JSON.stringify(checkData.latestBackup));
          } catch {}
        }
      } catch (err) {
        // Silent network retry on next interval
      }
    };

    runContinuousBackupComparison();
    const compareInterval = setInterval(runContinuousBackupComparison, 8000);
    return () => {
      isMounted = false;
      clearInterval(compareInterval);
    };
  }, [authUser?.email]);

  // Send player heartbeat to room server
  const sendPlayerHeartbeat = async (char?: Character5e) => {
    const target = char || activeCharacterRef.current;
    if (!target) return;
    try {
      const prof = calculateProficiencyBonus(target.level);
      const pp = calculatePassivePerception(
        target.abilities.wis.score,
        target.skills.perception,
        prof
      );

      const resolvedPlayerName = target.playerName || authUser?.displayName || 'Jugador';
      const resolvedTagId = (authUser?.userTagId || '123').replace(/^@+/, '').trim() || '123';

      await fetch(`/api/session/room/${roomCode}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: target.id,
          characterName: target.name,
          playerName: resolvedPlayerName,
          playerTagId: resolvedTagId,
          playerFullTag: `${resolvedPlayerName}@${resolvedTagId}`,
          playerEmail: authUser?.email,
          avatarType: target.avatarType,
          avatarCustomUrl: target.avatarCustomUrl,
          avatarIcon: target.avatarIcon,
          avatarUrl: target.avatarUrl,
          currentHp: target.currentHp,
          maxHp: target.maxHp,
          ac: target.armorClass,
          passivePerception: pp,
          level: target.level,
          characterClass: `${target.race} ${target.characterClass}`,
          lastRoll: recentRoll,
          abilities: {
            str: target.abilities.str.score,
            dex: target.abilities.dex.score,
            con: target.abilities.con.score,
            int: target.abilities.int.score,
            wis: target.abilities.wis.score,
            cha: target.abilities.cha.score,
          },
          currency: target.currency,
        }),
      });
    } catch (e) {}
  };

  // Send DM heartbeat & active combatants to room server
  const sendDmHeartbeat = async (ws?: DMWorkspace) => {
    const targetWs = ws || dmWorkspaceRef.current;
    if (!targetWs) return;

    try {
      const shouldBroadcast = Boolean(targetWs.activeEncounter?.broadcastEnemiesToTable);
      const combatantsMini: LiveCombatantMini[] = (targetWs.activeEncounter?.combatants || []).map((c) => ({
        id: c.id,
        name: c.name,
        hp: c.hp,
        maxHp: c.maxHp,
        ac: c.ac,
        passivePerception: c.passivePerception ?? 10,
        faction: c.faction || (c.isPlayer ? 'ally' : 'enemy'),
        isPlayer: Boolean(c.isPlayer),
        conditions: c.conditions || [],
      }));

      await fetch(`/api/session/room/${roomCode}/dm-heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dmLiveMessage: targetWs.dmLiveMessage || '',
          dmConnected: true,
          showCombatantsOnTable: shouldBroadcast,
          liveCombatants: combatantsMini,
        }),
      });
    } catch (e) {}
  };

  // Fetch world sheets for the authenticated DM
  const fetchWorldSheets = async () => {
    if (!authUser?.email) return;
    try {
      const res = await fetch(`/api/vault/worlds?ownerEmail=${encodeURIComponent(authUser.email)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.worlds)) {
          setWorldSheets(data.worlds);
        }
      }
    } catch (err) {
      console.error('Error fetching world sheets:', err);
    }
  };

  useEffect(() => {
    if (authUser && authUser.status === 'approved') {
      fetchWorldSheets();
    }
  }, [authUser?.email, authUser?.status]);

  // Poll room server state & heartbeat active character / DM (Only when inside active session)
  useEffect(() => {
    if (appView !== 'player-session' && appView !== 'dm-session') {
      return;
    }

    let isMounted = true;

    const syncSession = async () => {
      try {
        // Send player heartbeat if player session
        if (appView === 'player-session') {
          await sendPlayerHeartbeat(activeCharacterRef.current);
        }

        // Send DM heartbeat if DM session
        if (appView === 'dm-session') {
          await sendDmHeartbeat(dmWorkspaceRef.current);
        }

        // Fetch full room state
        const res = await fetch(`/api/session/room/${roomCode}`);
        if (!isMounted) return;

        if (res.status === 404) {
          const data = await res.json().catch(() => ({}));
          // If the room was closed by DM or does not exist, return player to lobby
          if (appView === 'player-session') {
            setRoomClosedAlert(data.error || 'La mesa ha sido cerrada por el Dungeon Master.');
            setAppView('lobby');
            return;
          }
        }

        if (res.ok) {
          const data = await res.json();
          if (data.closed && appView === 'player-session') {
            setRoomClosedAlert(data.error || 'El Dungeon Master ha cerrado la mesa.');
            setAppView('lobby');
            return;
          }

          setPartyMembers(data.party || []);
          if (Array.isArray(data.rollFeed)) {
            setRollFeed(data.rollFeed);
          }
          setServerDmConnected(Boolean(data.dmConnected));
          setServerDmLiveMessage(data.dmLiveMessage || '');
          if (data.dmLastRoll) {
            setServerDmLastRoll(data.dmLastRoll);
          }
          if (data.showCombatantsOnTable !== undefined) {
            setShowCombatantsOnTable(Boolean(data.showCombatantsOnTable));
          }
          if (Array.isArray(data.liveCombatants)) {
            setLiveCombatants(data.liveCombatants);
          }
          if (Array.isArray(data.playerMessages)) {
            setRoomPlayerMessages(data.playerMessages);
          }

          // Process DM -> Player share offers & resolutions
          if (Array.isArray(data.pendingOffers)) {
            const offers: PendingDmOffer[] = data.pendingOffers;

            if (appView === 'player-session' && activeCharacterRef.current) {
              const myCharId = activeCharacterRef.current.id;
              const myPending = offers.filter(
                (o) => o.status === 'pending' && o.targetCharacterId === myCharId
              );
              setPendingPlayerOffers(myPending);
            }

            if (appView === 'dm-session') {
              const newlyResolved = offers.filter(
                (o) =>
                  (o.status === 'accepted' || o.status === 'declined') &&
                  !o.dmNotified &&
                  !seenResolvedOffersRef.current.has(o.id)
              );

              if (newlyResolved.length > 0) {
                const newNotifs: {
                  id: string;
                  offerId: string;
                  accepted: boolean;
                  message: string;
                  timestamp: number;
                }[] = [];

                for (const o of newlyResolved) {
                  seenResolvedOffersRef.current.add(o.id);
                  const kindLabel =
                    o.kind === 'spell'
                      ? 'el conjuro'
                      : o.kind === 'ability'
                      ? 'la habilidad'
                      : 'el objeto';
                  const accepted = o.status === 'accepted';
                  const msg = accepted
                    ? `✅ ¡${o.targetCharacterName} (${o.targetPlayerName || 'Jugador'}) ACEPTÓ recibir ${kindLabel} "${o.title}"! Ya se encuentra en su ficha.`
                    : `❌ ${o.targetCharacterName} (${o.targetPlayerName || 'Jugador'}) RECHAZÓ recibir ${kindLabel} "${o.title}".`;
                  newNotifs.push({
                    id: `dm-notif-${Date.now()}-${o.id}`,
                    offerId: o.id,
                    accepted,
                    message: msg,
                    timestamp: Date.now(),
                  });

                  fetch(
                    `/api/session/room/${encodeURIComponent(roomCode)}/offer/${encodeURIComponent(o.id)}/ack-dm`,
                    { method: 'POST' }
                  ).catch(() => {});
                }

                setDmOfferNotifications((prev) => [...newNotifs, ...prev]);
              }
            }
          }
        }
      } catch (err) {
        // Offline handling
      }
    };

    syncSession();
    const interval = setInterval(syncSession, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [appView, roomCode]);

  // Auth / Role Selection Callback
  const handleSelectRole = (role: UserRole, user?: AuthSessionUser) => {
    setUserRole(role);
    saveUserRole(role);
    if (user) {
      setAuthUser(user);
      saveAuthUser(user);
    }
    setIsRoleModalOpen(false);
    setAppView('lobby');
  };

  const handleLogout = () => {
    setAuthUser(null);
    saveAuthUser(null);
    saveUserRole(null);
    setAppView('lobby');
  };

  const handleRefreshAuthStatus = async () => {
    if (!authUser?.email) return;
    try {
      const res = await fetch(`/api/auth/me?email=${encodeURIComponent(authUser.email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.status) {
          const updated: AuthSessionUser = {
            id: data.id,
            email: data.email,
            displayName: data.displayName,
            userTagId: data.userTagId || authUser.userTagId || '123',
            fullTag: data.fullTag || `${data.displayName}@${data.userTagId || '123'}`,
            friends: Array.isArray(data.friends) ? data.friends : authUser.friends || [],
            role: data.role || authUser.role,
            status: data.status,
          };
          setAuthUser(updated);
          saveAuthUser(updated);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Launch Player Sheet into active table
  const handleSelectCharacterToPlay = (character: Character5e, code: string) => {
    setCharacters((prev) => {
      const exists = prev.some((c) => c.id === character.id);
      const next = exists ? prev.map((c) => (c.id === character.id ? character : c)) : [...prev, character];
      saveCharacters(next);
      return next;
    });
    activeCharacterRef.current = character;
    setActiveCharId(character.id);
    saveActiveCharacterId(character.id);
    setRoomCode(code);
    saveRoomCode(code);
    setAppView('player-session');
  };

  // Open Player Sheet in solo / editing mode from lobby
  const handleEditCharacterSolo = (character: Character5e) => {
    setCharacters((prev) => {
      const exists = prev.some((c) => c.id === character.id);
      const next = exists ? prev.map((c) => (c.id === character.id ? character : c)) : [...prev, character];
      saveCharacters(next);
      return next;
    });
    activeCharacterRef.current = character;
    setActiveCharId(character.id);
    saveActiveCharacterId(character.id);
    setAppView('player-solo');
  };

  // Player responds (Accept or Decline) to a DM shared Item, Spell, or Ability offer
  const handleRespondToDmOffer = async (offer: PendingDmOffer, decision: 'accepted' | 'declined') => {
    if (!activeCharacterRef.current) return;
    setIsRespondingOffer(true);
    try {
      const currentChar = activeCharacterRef.current;
      const normRoom = (roomCode || 'MESA-PRINCIPAL').trim().toUpperCase();

      const res = await fetch(
        `/api/session/room/${encodeURIComponent(normRoom)}/offer/${encodeURIComponent(offer.id)}/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decision,
            character: currentChar,
          }),
        }
      );

      const data = await res.json();

      if (decision === 'accepted') {
        // Immediately apply the received item, spell, or ability to the player's active character state
        const updatedChar: Character5e = {
          ...currentChar,
          inventory: [...(currentChar.inventory || [])],
          spells: [...(currentChar.spells || [])],
          featuresAndTraits: [...(currentChar.featuresAndTraits || [])],
          customSkills: [...(currentChar.customSkills || [])],
        };

        if (offer.kind === 'item' && offer.item) {
          if (!updatedChar.inventory.some((i) => i.id === offer.item!.id)) {
            updatedChar.inventory.push(offer.item);
          }
        } else if (offer.kind === 'spell' && offer.spell) {
          if (!updatedChar.spells.some((s) => s.id === offer.spell!.id)) {
            updatedChar.spells.push(offer.spell);
          }
        } else if (offer.kind === 'ability' && offer.ability) {
          if (!updatedChar.featuresAndTraits.some((f) => f.id === offer.ability!.id)) {
            updatedChar.featuresAndTraits.push(offer.ability);
          }
          if (!updatedChar.customSkills!.some((cs) => cs.id === offer.ability!.id || cs.name === offer.ability!.name)) {
            updatedChar.customSkills!.push({
              id: offer.ability.id || `cskill-${Date.now()}`,
              name: offer.ability.name,
              ability: offer.ability.abilityStat || 'int',
              proficiency: 'proficient',
              description: offer.ability.description || 'Habilidad otorgada por el Dungeon Master.',
            });
          }
        }

        handleUpdateCharacter(updatedChar);

        // Also sync to vault immediately
        if (authUser?.email) {
          fetch('/api/vault/sheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              character: updatedChar,
              ownerEmail: authUser.email,
              reason: 'manual',
            }),
          }).catch(() => {});
        }

        const kindText =
          offer.kind === 'spell'
            ? 'el conjuro'
            : offer.kind === 'ability'
            ? 'la habilidad'
            : 'el objeto';
        setPlayerOfferFeedback(
          `🎁 ¡Has aceptado y recibido ${kindText} "${offer.title}" en la hoja de ${updatedChar.name}!`
        );
      } else {
        setPlayerOfferFeedback(`Has rechazado recibir "${offer.title}" del Dungeon Master.`);
      }

      setTimeout(() => setPlayerOfferFeedback(''), 6000);

      // Remove from pending offers
      setPendingPlayerOffers((prev) => prev.filter((o) => o.id !== offer.id));

      // Notify DM instantaneously if on same browser
      if (broadcastChannelRef.current && data?.offer) {
        broadcastChannelRef.current.postMessage({
          type: 'DM_OFFER_RESPONDED',
          payload: data.offer,
        });
      }
    } catch (e) {
      console.error('Error responding to DM offer:', e);
    } finally {
      setIsRespondingOffer(false);
    }
  };

  // Delete Character
  const handleDeleteCharacter = async (charId: string): Promise<boolean> => {
    if (!authUser?.email) return false;
    try {
      const res = await fetch(`/api/vault/sheets/${charId}?ownerEmail=${encodeURIComponent(authUser.email)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCharacters((prev) => prev.filter((c) => c.id !== charId));
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  // Save Character to Cloud Vault
  const handlePlayerSaveToCloud = async () => {
    if (activeCharacter && authUser?.email) {
      try {
        await fetch('/api/vault/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            character: activeCharacter,
            ownerEmail: authUser.email,
            reason: 'manual',
          }),
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Player leaves table and returns to lobby
  const handlePlayerReturnToLobby = async () => {
    if (activeCharacter && authUser?.email) {
      await handlePlayerSaveToCloud();
      try {
        await fetch(`/api/session/room/${roomCode}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId: activeCharacter.id,
            character: activeCharacter,
            ownerEmail: authUser.email,
          }),
        });
      } catch (e) {}
    }
    setAppView('lobby');
  };

  // Create World Sheet (Clean slate starting from zero)
  const handleCreateWorldSheet = async (config: { name: string; roomCode: string; roomPassword?: string }) => {
    if (!authUser?.email) return;

    const newWorld: WorldSheetSummary = {
      id: `world-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ownerEmail: authUser.email,
      name: config.name,
      roomCode: config.roomCode,
      roomPassword: config.roomPassword,
      lastPlayed: Date.now(),
      workspace: {
        ...SAMPLE_DM_WORKSPACE,
        npcs: [],
        monsters: [],
        locations: [],
        campaignLogs: [],
        combatSummaries: [],
        customItemsAndSpells: [],
        folders: ['General', 'Campaña'],
        activeEncounter: {
          id: `enc-${Date.now()}`,
          name: 'Combate',
          round: 1,
          currentTurnIndex: 0,
          combatants: [],
          isActive: false,
          combatNotes: '',
          combatLog: [],
        },
      },
    };

    const res = await fetch('/api/vault/worlds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ world: newWorld }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al guardar World Sheet.');
    }

    setWorldSheets((prev) => [...prev, newWorld]);
  };

  // Update World Sheet Config (Name, RoomCode, Password)
  const handleUpdateWorldSheetConfig = async (worldId: string, updates: { name: string; roomCode: string; roomPassword?: string }) => {
    if (!authUser?.email) return;
    const res = await fetch(`/api/vault/worlds/${worldId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, ownerEmail: authUser.email }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Ya existe una mesa con ese nombre creada por otro Dungeon Master.');
    }
    setWorldSheets((prev) =>
      prev.map((w) => (w.id === worldId ? { ...w, ...updates } : w))
    );
  };

  // Delete World Sheet
  const handleDeleteWorldSheet = async (worldId: string) => {
    if (!authUser?.email) return;
    try {
      const res = await fetch(`/api/vault/worlds/${worldId}?ownerEmail=${encodeURIComponent(authUser.email)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setWorldSheets((prev) => prev.filter((w) => w.id !== worldId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // DM Opens World Sheet -> Room becomes ACTIVE on server (validates unique room name across DMs)
  const handleOpenWorldSheet = async (world: WorldSheetSummary) => {
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: world.roomCode,
          name: world.name,
          dmEmail: authUser?.email || 'dm@weroll.app',
          dmDisplayName: authUser?.displayName || 'Dungeon Master',
          password: world.roomPassword,
          worldSheetId: world.id,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setRoomClosedAlert(
          errData.error ||
            `No se pudo abrir la sala "${world.roomCode}" porque ya existe una mesa con ese nombre creada por otro Dungeon Master.`
        );
        return;
      }
    } catch (e) {
      console.error('Error activating room:', e);
    }

    setActiveWorld(world);
    setDmWorkspace(world.workspace);
    setRoomPlayerMessages(Array.isArray(world.workspace?.playerMessages) ? world.workspace.playerMessages : []);
    setRoomCode(world.roomCode);
    saveRoomCode(world.roomCode);
    setAppView('dm-session');
  };

  // DM Saves World Sheet to Cloud Vault
  const handleDmSaveToCloud = async () => {
    if (activeWorld && authUser?.email) {
      try {
        await fetch('/api/vault/worlds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            world: {
              ...activeWorld,
              workspace: dmWorkspace,
              lastPlayed: Date.now(),
            },
          }),
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  // DM Saves World Sheet and Closes Room (Table ceases to exist!)
  const handleDmSaveAndReturnToLobby = async () => {
    await handleDmSaveToCloud();

    // Close room on server
    try {
      await fetch('/api/rooms/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode }),
      });
    } catch (e) {
      console.error('Error closing room:', e);
    }

    setAppView('lobby');
    fetchWorldSheets();
  };

  // Character updates
  const handleUpdateCharacter = (updated: Character5e) => {
    activeCharacterRef.current = updated;
    const newChars = characters.some((c) => c.id === updated.id)
      ? characters.map((c) => (c.id === updated.id ? updated : c))
      : [...characters, updated];
    setCharacters(newChars);
    saveCharacters(newChars);

    if (authUser?.email) {
      fetch('/api/vault/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: updated,
          ownerEmail: authUser.email,
          reason: 'manual',
        }),
      }).catch(() => {});
    }

    if (appView === 'player-session') {
      const prof = calculateProficiencyBonus(updated.level);
      const pp = calculatePassivePerception(
        updated.abilities.wis.score,
        updated.skills.perception,
        prof
      );

      // Optimistic update of local player card so HP, stats, race/class and coins refresh INSTANTLY
      setPartyMembers((prev) =>
        prev.map((m) =>
          m.characterId === updated.id
            ? {
                ...m,
                characterName: updated.name,
                playerName: updated.playerName,
                avatarType: updated.avatarType,
                avatarCustomUrl: updated.avatarCustomUrl,
                avatarIcon: updated.avatarIcon,
                avatarUrl: updated.avatarUrl,
                level: updated.level,
                characterClass: `${updated.race} ${updated.characterClass}`,
                currentHp: updated.currentHp,
                maxHp: updated.maxHp,
                ac: updated.armorClass,
                passivePerception: pp,
                abilities: {
                  str: updated.abilities.str.score,
                  dex: updated.abilities.dex.score,
                  con: updated.abilities.con.score,
                  int: updated.abilities.int.score,
                  wis: updated.abilities.wis.score,
                  cha: updated.abilities.cha.score,
                },
                currency: updated.currency,
              }
            : m
        )
      );

      // Immediate heartbeat push to server
      sendPlayerHeartbeat(updated);
    }
  };

  // Handle dice rolls
  const handleTriggerRoll = (title: string, modifier: number, diceType: number = 20) => {
    setRollerTitle(title);
    setRollerMod(modifier);
    setRollerSides(diceType);
    setRollerMode('normal');
    setIsRollerOpen(true);
  };

  const handleRollComplete = async (result: DiceRollResult) => {
    setRecentRoll(result);
    setRollFeed((prev) => [...prev, result]);

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'NEW_ROLL',
        payload: result,
      });
    }

    try {
      const isDmRoll = appView === 'dm-session';
      await fetch(`/api/session/room/${roomCode}/roll?isDm=${isDmRoll}&characterId=${activeCharacter?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
    } catch (e) {}
  };

  const handleBroadcastAnnouncement = (title: string, content: string) => {
    const ann = { title, content };
    setActiveAnnouncement(ann);

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'ANNOUNCEMENT',
        payload: ann,
      });
    }
  };

  const handleOpenAIOracle = (initialPrompt?: string) => {
    if (initialPrompt) setOracleInitialPrompt(initialPrompt);
    setIsOracleOpen(true);
  };

  const handleSaveHostSettings = async (newSettings: HostSettings) => {
    setHostSettings(newSettings);
    saveHostSettings(newSettings);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.settings) {
          setHostSettings(data.settings);
          saveHostSettings(data.settings);
        }
      }
    } catch (e) {
      console.error(e);
    }

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'SETTINGS_UPDATED',
        payload: newSettings,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#101115] text-[#e2d9cc] flex flex-col font-sans selection:bg-amber-700 selection:text-white">
      {/* =================================================================== */}
      {/* TOP COMPACT APPLICATION HEADER                                      */}
      {/* =================================================================== */}
      <header className="sticky top-0 z-40 bg-[#14151b]/95 backdrop-blur-md border-b border-amber-900/40 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Left: Branding & Return to Lobby */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAppView('lobby')}
              className="flex items-center gap-2.5 text-left group transition"
            >
              <BrandLogo hostSettings={hostSettings} size="md" className="group-hover:scale-105 transition" />
              <div>
                <span className="font-cinzel font-black text-lg text-amber-300 tracking-wider block leading-tight group-hover:text-amber-200 transition">
                  {hostSettings.headerTitle || 'WeRoll'}
                </span>
                <span className="text-[10px] text-stone-400 font-cinzel font-semibold tracking-wider block">
                  {hostSettings.headerSubtitle || 'Companion & DM Suite v0.4'}
                </span>
              </div>
            </button>

            {appView !== 'lobby' && (
              <button
                onClick={() => {
                  if (appView === 'dm-session') {
                    handleDmSaveAndReturnToLobby();
                  } else {
                    handlePlayerReturnToLobby();
                  }
                }}
                className="ml-3 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-cinzel font-bold text-xs transition flex items-center gap-1.5 border border-stone-700 shadow"
                title="Salir al portal principal"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Lobby</span>
              </button>
            )}
          </div>

          {/* Center: Quick Dice Roller - ONLY displayed inside active table / session */}
          {(appView === 'player-session' || appView === 'dm-session') && (
            <div className="hidden md:flex items-center">
              <QuickDiceBar
                onQuickRoll={(sides) => handleTriggerRoll(`d${sides}`, 0, sides)}
                onOpenFullRoller={() => {
                  setRollerTitle('Tirada General');
                  setRollerMod(0);
                  setRollerSides(20);
                  setRollerMode('normal');
                  setIsRollerOpen(true);
                }}
                recentRoll={recentRoll}
              />
            </div>
          )}

          {/* Right: Tools & Utilities (Discreet, Sleek, Modern Icons) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Manual SRD 5E */}
            <button
              onClick={() => setIsCompendiumOpen(true)}
              className="p-1.5 sm:p-2 rounded-xl bg-[#181920] hover:bg-[#20212b] border border-stone-800 hover:border-amber-700/60 text-stone-300 hover:text-amber-300 transition flex items-center justify-center shadow-sm"
              title="Manual SRD 5E"
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
            </button>

            {/* Oracle IA */}
            <button
              onClick={() => {
                setOracleInitialPrompt('');
                setIsOracleOpen(true);
              }}
              className="p-1.5 sm:p-2 rounded-xl bg-purple-950/50 hover:bg-purple-900 border border-purple-800/60 text-purple-200 transition flex items-center justify-center shadow-sm"
              title="Sabio Arcano IA"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 animate-pulse" />
            </button>

            {/* Herramienta: Seguridad, @ID y Contraseña */}
            {authUser && (
              <button
                onClick={() => setIsSecurityModalOpen(true)}
                className="p-1.5 sm:p-2 rounded-xl bg-[#181920] hover:bg-[#20212b] border border-stone-800 hover:border-amber-600/70 text-stone-300 hover:text-amber-300 transition flex items-center justify-center shadow-sm"
                title="Ajustar Seguridad, @ID y Contraseña"
              >
                <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              </button>
            )}

            {/* Admin Panel (for admin) */}
            {(authUser?.appRole === 'admin' || authUser?.role === 'admin') && (
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="p-1.5 sm:p-2 rounded-xl bg-blue-950/70 hover:bg-blue-900 border border-blue-700/70 text-blue-300 hover:text-white transition flex items-center justify-center shadow-sm"
                title="Panel de Administrador WeRoll"
              >
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
              </button>
            )}

            {/* Moderator Panel (for moderator or admin) */}
            {((authUser?.appRole === 'admin' || authUser?.role === 'admin') || (authUser?.appRole === 'moderator' || authUser?.role === 'moderator')) && (
              <button
                onClick={() => setIsModeratorModalOpen(true)}
                className="p-1.5 sm:p-2 rounded-xl bg-purple-950/70 hover:bg-purple-900 border border-purple-700/70 text-purple-300 hover:text-white transition flex items-center justify-center shadow-sm"
                title="Panel de Moderación Comunitaria"
              >
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
              </button>
            )}

            {/* Feedback (for normal players) */}
            {!((authUser?.appRole === 'admin' || authUser?.role === 'admin') || (authUser?.appRole === 'moderator' || authUser?.role === 'moderator')) && (
              <button
                onClick={() => setIsFeedbackOpen(true)}
                className="p-1.5 sm:p-2 rounded-xl bg-amber-950/60 hover:bg-amber-900 border border-amber-800/60 text-amber-300 hover:text-amber-100 transition flex items-center justify-center shadow-sm"
                title="Enviar feedback o reportar un bug"
              >
                <MessageSquarePlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              </button>
            )}

            {/* Updates Blog */}
            <button
              onClick={() => setIsChangelogOpen(true)}
              className="p-1.5 sm:p-2 rounded-xl bg-[#181920] hover:bg-[#20212b] border border-stone-800 hover:border-amber-700/60 text-stone-300 hover:text-amber-400 text-xs font-cinzel transition flex items-center justify-center shadow-sm"
              title="Blog de actualizaciones v0.9.5 Alfa"
            >
              <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            </button>
          </div>
        </div>
      </header>

      {/* =================================================================== */}
      {/* MAIN CONTENT AREA (Extended Viewport - Anti Slop Layout)            */}
      {/* =================================================================== */}
      <main className="w-full max-w-[1650px] mx-auto px-3 sm:px-6 py-5 space-y-6 flex-1">
        {/* Room Closed Notification Alert */}
        {roomClosedAlert && (
          <div className="bg-red-950/80 border border-red-700 rounded-2xl p-4 shadow-lg flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-900/60 border border-red-600 flex items-center justify-center text-red-200 shrink-0">
                <X className="w-4 h-4" />
              </div>
              <p className="text-xs text-red-200 font-cinzel font-bold leading-relaxed">
                {roomClosedAlert}
              </p>
            </div>
            <button
              onClick={() => setRoomClosedAlert('')}
              className="p-1 rounded text-red-400 hover:text-red-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Global Developer Announcement Banner (Configured in Admin Settings) */}
        {(hostSettings.developerAnnouncement?.enabled || (hostSettings.developerAnnouncement as any)?.active) &&
          hostSettings.developerAnnouncement?.content &&
          !dismissedDevNotice && (
            <div className="bg-gradient-to-r from-amber-950/80 via-stone-900 to-amber-950/80 border border-amber-600/50 rounded-2xl p-4 shadow-lg flex items-start justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-cinzel font-bold text-sm text-amber-300">
                    {hostSettings.developerAnnouncement.title || 'Anuncio del Desarrollador'}
                  </h4>
                  <p className="text-xs text-stone-300 mt-0.5 leading-relaxed">
                    {hostSettings.developerAnnouncement.content}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDismissedDevNotice(true)}
                className="text-stone-400 hover:text-stone-200 p-1"
                title="Cerrar anuncio"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

        {/* 1. LOBBY VIEW (Primary Portal) */}
        {appView === 'lobby' && (
          <LobbyPortalView
            authUser={authUser}
            hostSettings={hostSettings}
            onLogout={handleLogout}
            onOpenAuthModal={() => setIsRoleModalOpen(true)}
            onOpenChangelog={() => setIsChangelogOpen(true)}
            onSelectCharacterToPlay={handleSelectCharacterToPlay}
            onEditCharacterSolo={handleEditCharacterSolo}
            onDeleteCharacter={handleDeleteCharacter}
            onCreateNewCharacter={() => setIsCreatorOpen(true)}
            onImportCharacter={(importedChar) => {
              const updatedList = [...characters.filter((c) => c.id !== importedChar.id), importedChar];
              setCharacters(updatedList);
              saveCharacters(updatedList);
              setActiveCharId(importedChar.id);
              saveActiveCharacterId(importedChar.id);
            }}
            worldSheets={worldSheets}
            onOpenWorldSheet={handleOpenWorldSheet}
            onCreateWorldSheet={handleCreateWorldSheet}
            onImportWorldSheet={(importedWorld) => {
              setWorldSheets((prev) => [...prev.filter((w) => w.id !== importedWorld.id), importedWorld]);
            }}
            onUpdateWorldSheetConfig={handleUpdateWorldSheetConfig}
            onDeleteWorldSheet={handleDeleteWorldSheet}
            onSaveHostSettings={handleSaveHostSettings}
            onRefreshAuthStatus={handleRefreshAuthStatus}
            charactersCount={characters.length}
            onOpenCompendium={() => setIsCompendiumOpen(true)}
            onOpenOracle={(prompt) => {
              setOracleInitialPrompt(prompt || '');
              setIsOracleOpen(true);
            }}
            onOpenFeedback={() => setIsFeedbackOpen(true)}
            onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
            onOpenAdminPanel={() => setIsAdminModalOpen(true)}
            onOpenModeratorPanel={() => setIsModeratorModalOpen(true)}
            isAdminModalOpen={isAdminModalOpen}
            onCloseAdminModal={() => setIsAdminModalOpen(false)}
          />
        )}

        {/* 2. ACTIVE SESSION: PARTY STATUS BAR (In Session Only) */}
        {(appView === 'player-session' || appView === 'dm-session') && (
          <PartySessionBar
            roomCode={roomCode}
            onChangeRoomCode={(code) => {
              setRoomCode(code);
              saveRoomCode(code);
            }}
            partyMembers={partyMembers}
            recentRollsCount={rollFeed.length}
            dmLastRoll={serverDmLastRoll}
            onOpenRollFeed={() => setIsRollFeedOpen(true)}
            activeAnnouncement={activeAnnouncement}
            onDismissAnnouncement={() => setActiveAnnouncement(null)}
            isDmMode={appView === 'dm-session'}
            dmConnected={serverDmConnected}
            dmLiveMessage={serverDmLiveMessage}
            showCombatantsOnTable={showCombatantsOnTable}
            liveCombatants={liveCombatants}
            currentCharacterId={activeCharacter?.id}
            currentCharacterName={activeCharacter?.name}
            currentPlayerName={activeCharacter?.playerName || authUser?.displayName || 'Jugador'}
            currentPlayerTagId={authUser?.userTagId || '123'}
            currentPlayerEmail={authUser?.email}
            onSendPlayerMessageToDM={async (title, description) => {
              const pName = activeCharacter?.playerName || authUser?.displayName || 'Jugador';
              const pTag = (authUser?.userTagId || '123').replace(/^@+/, '').trim() || '123';
              try {
                const res = await fetch(
                  `/api/session/room/${encodeURIComponent(roomCode)}/player-message`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      characterId: activeCharacter?.id || 'char-live',
                      characterName: activeCharacter?.name || 'Aventurero',
                      playerName: pName,
                      playerTagId: pTag,
                      playerFullTag: `${pName}@${pTag}`,
                      playerEmail: authUser?.email,
                      title,
                      description,
                    }),
                  }
                );
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  return { ok: false, error: data.error || 'Error al enviar el mensaje al DM.' };
                }
                if (Array.isArray(data.playerMessages)) {
                  setRoomPlayerMessages(data.playerMessages);
                }
                return {
                  ok: true,
                  message: data.message || '¡Mensaje privado enviado al Dungeon Master!',
                };
              } catch {
                return { ok: false, error: 'Error de conexión con la sala.' };
              }
            }}
            onUpdateDmLiveMessage={(msg) => {
              setServerDmLiveMessage(msg);
              if (broadcastChannelRef.current) {
                broadcastChannelRef.current.postMessage({
                  type: 'DM_LIVE_MESSAGE',
                  payload: msg,
                });
              }
            }}
          />
        )}

        {/* DM OFFER RESOLUTION NOTIFICATIONS (Shown to DM when a player Accepts or Declines a shared item/spell/ability) */}
        {appView === 'dm-session' && dmOfferNotifications.length > 0 && (
          <div className="space-y-2">
            {dmOfferNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-2xl border shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-2 ${
                  notif.accepted
                    ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-100'
                    : 'bg-red-950/90 border-red-600/80 text-red-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      notif.accepted
                        ? 'bg-emerald-900/70 border-emerald-400 text-emerald-200'
                        : 'bg-red-900/70 border-red-400 text-red-200'
                    }`}
                  >
                    {notif.accepted ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="text-[10px] font-cinzel uppercase tracking-wider font-bold block opacity-80">
                      Respuesta del Jugador en Sala ({roomCode})
                    </span>
                    <p className="text-xs sm:text-sm font-cinzel font-bold">{notif.message}</p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setDmOfferNotifications((prev) => prev.filter((n) => n.id !== notif.id))
                  }
                  className="p-1.5 rounded-lg hover:bg-black/30 text-stone-300 hover:text-white transition"
                  title="Cerrar notificación"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* PLAYER OFFER FEEDBACK TOAST */}
        {appView === 'player-session' && playerOfferFeedback && (
          <div className="p-4 rounded-2xl bg-amber-950/90 border border-amber-500/80 text-amber-100 shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="text-xs sm:text-sm font-cinzel font-bold">{playerOfferFeedback}</span>
            </div>
            <button
              onClick={() => setPlayerOfferFeedback('')}
              className="p-1 rounded hover:bg-black/30 text-amber-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* PLAYER INCOMING DM SHARE OFFER MODAL (Accept or Decline Item / Spell / Ability) */}
        {appView === 'player-session' && pendingPlayerOffers.length > 0 && activeCharacter && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
            role="dialog"
            aria-modal="true"
          >
            {(() => {
              const offer = pendingPlayerOffers[0];
              const kindBadge =
                offer.kind === 'spell'
                  ? 'Conjuro Mágico'
                  : offer.kind === 'ability'
                  ? 'Habilidad / Rasgo'
                  : 'Objeto / Equipo';
              return (
                <div className="relative w-full max-w-md bg-[#181920] border-2 border-amber-500 rounded-3xl shadow-2xl p-6 text-stone-200 space-y-4">
                  <div className="flex items-center gap-3 border-b border-stone-800 pb-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-950 border border-amber-500 flex items-center justify-center text-amber-300 shadow-lg shrink-0">
                      <Gift className="w-6 h-6 animate-bounce" />
                    </div>
                    <div>
                      <span className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-amber-400 block">
                        Notificación del Dungeon Master • Sala {roomCode}
                      </span>
                      <h3 className="font-cinzel font-black text-base text-stone-100">
                        El DM está compartiendo {offer.kind === 'spell' ? 'un Conjuro' : offer.kind === 'ability' ? 'una Habilidad' : 'un Objeto'}
                      </h3>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#121316] border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-cinzel font-bold text-amber-300 text-sm sm:text-base">
                        {offer.title}
                      </h4>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-950 border border-amber-700 text-amber-300 font-bold uppercase">
                        {kindBadge} {offer.rarity ? `• ${offer.rarity}` : ''}
                      </span>
                    </div>
                    {offer.category && (
                      <div className="text-[11px] text-stone-400 font-mono">
                        Categoría: {offer.category}
                      </div>
                    )}
                    {offer.description && (
                      <p className="text-xs text-stone-300 whitespace-pre-line leading-relaxed pt-1 border-t border-stone-800/80">
                        {offer.description}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-center text-stone-300 font-cinzel">
                    ¿Deseas recibir <strong className="text-amber-300">"{offer.title}"</strong> en la ficha de{' '}
                    <strong className="text-stone-100">{activeCharacter.name}</strong>?
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isRespondingOffer}
                      onClick={() => handleRespondToDmOffer(offer, 'declined')}
                      className="py-2.5 px-4 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-200 font-cinzel font-bold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      <span>No, Rechazar</span>
                    </button>

                    <button
                      type="button"
                      disabled={isRespondingOffer}
                      onClick={() => handleRespondToDmOffer(offer, 'accepted')}
                      className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>Sí, Recibir</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 3. PLAYER SHEET (Active Session or Solo Edit) */}
        {(appView === 'player-session' || appView === 'player-solo') && activeCharacter && (
          <CharacterSheetView
            character={activeCharacter}
            onUpdateCharacter={handleUpdateCharacter}
            onTriggerRoll={handleTriggerRoll}
            isInActiveRoom={appView === 'player-session'}
            roomCode={roomCode}
            onReturnToLobby={handlePlayerReturnToLobby}
            onSaveToCloud={handlePlayerSaveToCloud}
            isLocked={!isCharacterUnlocked(activeCharacter.id, activeCharacter.password)}
            onUnlockRequest={() => {
              setPasswordModalConfig({
                isOpen: true,
                title: `Desbloquear ${activeCharacter.name}`,
                description: 'Esta ficha de personaje está protegida por contraseña.',
                expectedPassword: activeCharacter.password,
                onSuccess: () => setCharacterUnlocked(activeCharacter.id),
              });
            }}
          />
        )}

        {/* 4. DUNGEON MASTER SCREEN (Active Session) */}
        {appView === 'dm-session' && (
          <DMScreenView
            workspace={dmWorkspace}
            onUpdateWorkspace={(updated) => {
              dmWorkspaceRef.current = updated;
              setDmWorkspace(updated);
              saveDMWorkspace(updated);

              const shouldBroadcast = Boolean(updated.activeEncounter?.broadcastEnemiesToTable);
              setShowCombatantsOnTable(shouldBroadcast);

              const combatantsMini: LiveCombatantMini[] = (updated.activeEncounter?.combatants || []).map((c) => ({
                id: c.id,
                name: c.name,
                hp: c.hp,
                maxHp: c.maxHp,
                ac: c.ac,
                passivePerception: c.passivePerception ?? 10,
                faction: c.faction || (c.isPlayer ? 'ally' : 'enemy'),
                isPlayer: Boolean(c.isPlayer),
                conditions: c.conditions || [],
              }));
              setLiveCombatants(combatantsMini);

              if (broadcastChannelRef.current) {
                broadcastChannelRef.current.postMessage({
                  type: 'COMBATANTS_UPDATE',
                  payload: {
                    showCombatantsOnTable: shouldBroadcast,
                    liveCombatants: combatantsMini,
                  },
                });
              }

              sendDmHeartbeat(updated);
            }}
            worldName={activeWorld?.name}
            roomCode={roomCode}
            partyMembers={partyMembers}
            playerMessages={roomPlayerMessages}
            onMarkPlayerMessageRead={(messageId) => {
              setRoomPlayerMessages((prev) =>
                prev.map((m) => (m.id === messageId ? { ...m, readByDm: true } : m))
              );
              fetch(
                `/api/session/room/${encodeURIComponent(roomCode)}/player-message/${encodeURIComponent(messageId)}/read`,
                { method: 'POST' }
              ).catch(() => {});
            }}
            onDeletePlayerMessage={(messageId) => {
              setRoomPlayerMessages((prev) => prev.filter((m) => m.id !== messageId));
              fetch(
                `/api/session/room/${encodeURIComponent(roomCode)}/player-message/${encodeURIComponent(messageId)}`,
                { method: 'DELETE' }
              ).catch(() => {});
            }}
            onSaveAndReturnToLobby={handleDmSaveAndReturnToLobby}
            onSaveToCloud={handleDmSaveToCloud}
            onTriggerRoll={handleTriggerRoll}
            onBroadcastAnnouncement={handleBroadcastAnnouncement}
            onOpenAIOracle={handleOpenAIOracle}
            onUpdateDmLiveMessage={(msg) => {
              setServerDmLiveMessage(msg);
              if (broadcastChannelRef.current) {
                broadcastChannelRef.current.postMessage({
                  type: 'DM_LIVE_MESSAGE',
                  payload: msg,
                });
              }
            }}
          />
        )}
      </main>

      {/* Persistent AI Assistant Reference & Total Backup Banner (Admin/Moderator Only) */}
      {(authUser?.role === 'moderator' || authUser?.role === 'admin' || userRole === 'moderator' || userRole === 'admin') && (
        <footer className="max-w-7xl mx-auto px-4 pb-8 w-full">
          <div className="bg-[#121316] border border-stone-800/90 rounded-2xl p-4 shadow-xl text-stone-300">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shrink-0 shadow-inner">
                  <Bot className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-cinzel font-bold text-xs text-cyan-300 flex items-center gap-2">
                    <span>Asistente de Desarrollo WeRoll AI</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-200 border border-cyan-700 font-mono">
                      Sincronización Total Activa
                    </span>
                  </h4>
                  <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">
                    Cualquier modificación en la web (logo personalizado de la marca, avatares/iconos de personajes, NPCs, monstruos, objetos, World Sheets, contraseñas, roles, sugerencias y ajustes del servidor) está resguardada en la base de datos y 100% garantizada dentro del <strong>Respaldo Total JSON</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <input
                  type="file"
                  ref={appRestoreFileInputRef}
                  onChange={handleAppRestoreBackup}
                  accept=".json,application/json"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => appRestoreFileInputRef.current?.click()}
                  disabled={isAppRestoring}
                  className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-1.5 disabled:opacity-50"
                  title="Importa y restaura un archivo JSON de respaldo total"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isAppRestoring ? 'Restaurando...' : 'Importar Respaldo Total'}</span>
                </button>

                <a
                  href="/api/vault/backup-all"
                  download
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-cinzel font-bold text-xs shadow-lg transition flex items-center gap-1.5"
                  title="Descarga el archivo JSON completo de la base de datos"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Respaldo Total</span>
                </a>
              </div>
            </div>

            {appRestoreMsg && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-950 border border-emerald-600 text-emerald-200 text-xs flex items-center justify-between">
                <span>{appRestoreMsg}</span>
                <button onClick={() => setAppRestoreMsg('')} className="p-1 text-emerald-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </footer>
      )}

      {/* =================================================================== */}
      {/* GLOBAL MODALS                                                       */}
      {/* =================================================================== */}

      {/* Character Creator Modal */}
      {isCreatorOpen && (
        <CharacterCreatorModal
          isOpen={isCreatorOpen}
          onClose={() => setIsCreatorOpen(false)}
          onCharacterCreated={async (newChar) => {
            const charWithOwner = {
              ...newChar,
              ownerEmail: authUser?.email || 'jugador@weroll.app',
            };

            // Save to server vault
            if (authUser?.email) {
              try {
                await fetch('/api/vault/sheets', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    character: charWithOwner,
                    ownerEmail: authUser.email,
                  }),
                });
              } catch (e) {
                console.error(e);
              }
            }

            const updatedList = [...characters, charWithOwner];
            setCharacters(updatedList);
            saveCharacters(updatedList);
            setActiveCharId(charWithOwner.id);
            saveActiveCharacterId(charWithOwner.id);
            setIsCreatorOpen(false);
          }}
        />
      )}

      {/* Role Selection / Login / Register Modal */}
      {isRoleModalOpen && (
        <RoleSelectionModal
          isOpen={isRoleModalOpen}
          canClose={Boolean(authUser)}
          onClose={() => setIsRoleModalOpen(false)}
          dmPasswordExpected={hostSettings.dmPassword || ''}
          moderatorPasswordExpected={hostSettings.moderatorPassword || 'admin'}
          hostSettings={hostSettings}
          onSelectRole={handleSelectRole}
        />
      )}

      {/* Password Prompt Modal */}
      {passwordModalConfig.isOpen && (
        <PasswordPromptModal
          isOpen={passwordModalConfig.isOpen}
          title={passwordModalConfig.title}
          description={passwordModalConfig.description}
          expectedPassword={passwordModalConfig.expectedPassword}
          onClose={() => setPasswordModalConfig((prev) => ({ ...prev, isOpen: false }))}
          onSuccess={() => {
            passwordModalConfig.onSuccess();
            setPasswordModalConfig((prev) => ({ ...prev, isOpen: false }));
          }}
        />
      )}

      {/* Changelog Modal */}
      {isChangelogOpen && (
        <ChangelogModal
          isOpen={isChangelogOpen}
          onClose={() => setIsChangelogOpen(false)}
          changelog={hostSettings.changelog || []}
          currentVersion={hostSettings.headerSubtitle?.replace(/[^0-9.]/g, '') || '0.1'}
        />
      )}

      {/* Rules Compendium Modal */}
      {isCompendiumOpen && (
        <RulesCompendiumModal
          isOpen={isCompendiumOpen}
          onClose={() => setIsCompendiumOpen(false)}
          onAskOracle={(topic) => {
            setIsCompendiumOpen(false);
            handleOpenAIOracle(topic);
          }}
        />
      )}

      {/* Arcane Oracle (Gemini Flash) */}
      {isOracleOpen && (
        <ArcaneOracleModal
          isOpen={isOracleOpen}
          onClose={() => setIsOracleOpen(false)}
          initialPrompt={oracleInitialPrompt}
          characterContext={appView !== 'dm-session' ? activeCharacter : undefined}
          dmContext={appView === 'dm-session' ? dmWorkspace : undefined}
          welcomeMessage={hostSettings.oracleWelcomeMessage}
          customApiKey={hostSettings.apiKeyOverride}
          customModel={hostSettings.aiModel}
        />
      )}

      {/* Live Dice Roll Feed Modal */}
      {isRollFeedOpen && (
        <LiveRollFeedModal
          isOpen={isRollFeedOpen}
          onClose={() => setIsRollFeedOpen(false)}
          rolls={rollFeed}
        />
      )}

      {/* Full Dice Roller Modal */}
      {isRollerOpen && (
        <DiceRollerModal
          isOpen={isRollerOpen}
          onClose={() => setIsRollerOpen(false)}
          initialRollTitle={rollerTitle}
          initialModifier={rollerMod}
          initialDiceType={rollerSides}
          initialMode={rollerMode}
          rollerName={
            appView === 'dm-session'
              ? 'Dungeon Master'
              : activeCharacter
              ? `${activeCharacter.name} (${activeCharacter.playerName})`
              : authUser?.displayName || 'Aventurero'
          }
          onRollComplete={handleRollComplete}
        />
      )}

      {/* Community Feedback Modal */}
      {isFeedbackOpen && (
        <FeedbackModal
          isOpen={isFeedbackOpen}
          onClose={() => setIsFeedbackOpen(false)}
          authUser={authUser}
        />
      )}

      {/* User Security & Password Modal */}
      {isSecurityModalOpen && authUser && (
        <UserSecurityModal
          isOpen={isSecurityModalOpen}
          onClose={() => setIsSecurityModalOpen(false)}
          authUser={authUser}
          onRefreshAuthStatus={handleRefreshAuthStatus}
        />
      )}

      {/* Moderator Panel Modal */}
      {isModeratorModalOpen && authUser && (
        <ModeratorPanelModal
          isOpen={isModeratorModalOpen}
          onClose={() => setIsModeratorModalOpen(false)}
          authUser={authUser}
          onSwitchToAdminPanel={() => setIsAdminModalOpen(true)}
        />
      )}
    </div>
  );
}
