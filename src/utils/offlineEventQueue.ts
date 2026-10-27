import type { DiceRollResult } from '../types/dnd.ts';

export const OFFLINE_EVENT_QUEUE_KEY = 'weroll_local_event_queue_v1';

export type OfflineTableEventType =
  | 'ROLL'
  | 'HP_ADJUST'
  | 'GOLD_ADJUST'
  | 'SHEET_DELTA'
  | 'PLAYER_MESSAGE';

export interface OfflineTableEvent {
  id: string;
  roomCode: string;
  characterId?: string;
  actorEmail?: string;
  type: OfflineTableEventType;
  payload: Record<string, any>;
  createdAt: number;
  retryCount: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function getSafeStorage(customStorage?: StorageLike): StorageLike | null {
  if (customStorage) return customStorage;
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

export function loadOfflineEventQueue(customStorage?: StorageLike): OfflineTableEvent[] {
  const storage = getSafeStorage(customStorage);
  if (!storage) return [];
  try {
    const raw = storage.getItem(OFFLINE_EVENT_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOfflineEventQueue(
  events: OfflineTableEvent[],
  customStorage?: StorageLike
): void {
  const storage = getSafeStorage(customStorage);
  if (!storage) return;
  try {
    storage.setItem(OFFLINE_EVENT_QUEUE_KEY, JSON.stringify(events.slice(-100)));
  } catch {
    // Ignore storage quota errors
  }
}

export function enqueueOfflineTableEvent(
  params: {
    roomCode: string;
    characterId?: string;
    characterName?: string;
    playerName?: string;
    actorEmail?: string;
    type: OfflineTableEventType;
    payload: Record<string, any>;
  },
  customStorage?: StorageLike
): OfflineTableEvent {
  const list = loadOfflineEventQueue(customStorage);
  const normRoom = (params.roomCode || 'MESA-PRINCIPAL').trim().toUpperCase();
  const entry: OfflineTableEvent = {
    id: `qev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    roomCode: normRoom,
    characterId: params.characterId,
    actorEmail: params.actorEmail,
    type: params.type,
    payload: {
      ...params.payload,
      ...(params.characterName ? { characterName: params.characterName } : {}),
      ...(params.playerName ? { playerName: params.playerName } : {}),
    },
    createdAt: Date.now(),
    retryCount: 0,
  };

  // Coalesce consecutive HP_ADJUST or SHEET_DELTA for the same character to keep queue compact
  if (params.type === 'SHEET_DELTA' && params.characterId) {
    const existingIdx = list.findIndex(
      (e) =>
        e.roomCode === normRoom &&
        e.type === 'SHEET_DELTA' &&
        e.characterId === params.characterId
    );
    if (existingIdx >= 0) {
      list[existingIdx] = {
        ...list[existingIdx],
        payload: {
          ...list[existingIdx].payload,
          ...params.payload,
        },
        createdAt: Date.now(),
      };
      saveOfflineEventQueue(list, customStorage);
      return list[existingIdx];
    }
  }

  list.push(entry);
  saveOfflineEventQueue(list, customStorage);
  return entry;
}

export function getQueuedOfflineTableEvents(
  roomCode?: string,
  customStorage?: StorageLike
): OfflineTableEvent[] {
  const list = loadOfflineEventQueue(customStorage);
  if (!roomCode) return list;
  const norm = roomCode.trim().toUpperCase();
  return list.filter((e) => e.roomCode === norm);
}

export function removeProcessedOfflineEvents(
  eventIds: string[],
  customStorage?: StorageLike
): OfflineTableEvent[] {
  if (!eventIds.length) return loadOfflineEventQueue(customStorage);
  const idSet = new Set(eventIds);
  const remaining = loadOfflineEventQueue(customStorage).filter((e) => !idSet.has(e.id));
  saveOfflineEventQueue(remaining, customStorage);
  return remaining;
}

/**
 * Pure decision helper to prevent micro-disconnections from kicking players back to the Lobby.
 * Only returns `shouldReturnToLobby: true` / `shouldKickToLobby: true` if the DM explicitly closed
 * the room OR after >= 3 consecutive confirmed closed responses (never on a network timeout or transient 502/504).
 */
export function evaluateRoomClosureResilience(params: {
  networkError?: boolean;
  httpStatus?: number;
  responseStatus?: number;
  closedFlag?: boolean;
  responseClosed?: boolean;
  explicitlyClosedByDm?: boolean;
  previousConsecutiveClosedCount?: number;
  consecutiveClosedCount?: number;
  isPreviewSessionUrl?: boolean;
}): {
  shouldReturnToLobby: boolean;
  shouldKickToLobby: boolean;
  nextConsecutiveClosedCount: number;
  isReconnecting: boolean;
  showReconnectingNotice: boolean;
  statusMessage?: string;
} {
  const prevCount =
    typeof params.previousConsecutiveClosedCount === 'number'
      ? params.previousConsecutiveClosedCount
      : params.consecutiveClosedCount || 0;
  const status =
    typeof params.httpStatus === 'number' ? params.httpStatus : params.responseStatus;

  if (params.isPreviewSessionUrl) {
    return {
      shouldReturnToLobby: false,
      shouldKickToLobby: false,
      nextConsecutiveClosedCount: 0,
      isReconnecting: false,
      showReconnectingNotice: false,
    };
  }

  if (params.networkError || status === 0 || (typeof status === 'number' && status >= 500)) {
    return {
      shouldReturnToLobby: false,
      shouldKickToLobby: false,
      nextConsecutiveClosedCount: prevCount,
      isReconnecting: true,
      showReconnectingNotice: true,
      statusMessage: 'Reconectando con la mesa... Tus tiradas y cambios están protegidos en la cola local.',
    };
  }

  if (params.explicitlyClosedByDm) {
    return {
      shouldReturnToLobby: true,
      shouldKickToLobby: true,
      nextConsecutiveClosedCount: prevCount + 1,
      isReconnecting: false,
      showReconnectingNotice: false,
      statusMessage: 'El Dungeon Master ha cerrado la sesión de esta mesa.',
    };
  }

  const isClosed = Boolean(params.closedFlag || params.responseClosed || status === 404);
  if (isClosed) {
    const nextCount = prevCount + 1;
    if (nextCount >= 3) {
      return {
        shouldReturnToLobby: true,
        shouldKickToLobby: true,
        nextConsecutiveClosedCount: nextCount,
        isReconnecting: false,
        showReconnectingNotice: false,
        statusMessage: 'La sala ya no se encuentra activa.',
      };
    }
    return {
      shouldReturnToLobby: false,
      shouldKickToLobby: false,
      nextConsecutiveClosedCount: nextCount,
      isReconnecting: true,
      showReconnectingNotice: true,
      statusMessage: 'Verificando estado de la sala tras micro-desconexión...',
    };
  }

  return {
    shouldReturnToLobby: false,
    shouldKickToLobby: false,
    nextConsecutiveClosedCount: 0,
    isReconnecting: false,
    showReconnectingNotice: false,
  };
}

export async function flushOfflineTableEvents(
  roomCode: string,
  customStorage?: StorageLike,
  fetchFn: typeof fetch = fetch
): Promise<{ flushedCount: number; remainingCount: number }> {
  const queued = getQueuedOfflineTableEvents(roomCode, customStorage);
  if (queued.length === 0) {
    return { flushedCount: 0, remainingCount: 0 };
  }

  try {
    const res = await fetchFn(
      `/api/session/room/${encodeURIComponent(roomCode.trim().toUpperCase())}/batch-events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: queued }),
      }
    );

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const processedIds: string[] = Array.isArray(data.processedIds)
        ? data.processedIds
        : queued.map((e) => e.id);
      const remaining = removeProcessedOfflineEvents(processedIds, customStorage);
      return {
        flushedCount: processedIds.length,
        remainingCount: remaining.filter((e) => e.roomCode === roomCode.trim().toUpperCase()).length,
      };
    }
  } catch {
    // Still offline; keep events in local queue
  }

  return { flushedCount: 0, remainingCount: queued.length };
}
