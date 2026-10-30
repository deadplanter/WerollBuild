import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import {
  db,
  auth,
  isFirebaseAvailable,
  handleFirestoreError,
  OperationType,
} from '../firebase/config';
import type {
  Character5e,
  DMWorkspace,
  HostSettings,
  WorldSheetSummary,
} from '../types/dnd';
import {
  loadCharacters as loadCharactersLocal,
  saveCharacters as saveCharactersLocal,
  loadDMWorkspace as loadDMWorkspaceLocal,
  saveDMWorkspace as saveDMWorkspaceLocal,
  loadHostSettings as loadHostSettingsLocal,
  saveHostSettings as saveHostSettingsLocal,
  loadAuthUser as loadAuthUserLocal,
  saveAuthUser as saveAuthUserLocal,
  AuthSessionUser,
} from '../utils/storage';

/**
 * Service Layer / Adapter entre WeRoll 5E y Firebase Firestore.
 *
 * Características de Resiliencia:
 * 1. Multi-cuenta y GitHub Safe: Si la app se clona o se ejecuta en otra cuenta
 *    de AI Studio donde Firebase aún no está provisionado o no hay sesión de usuario,
 *    opera de forma transparente con el almacenamiento local sin romper la app.
 * 2. Persistencia Asíncrona Dual: Guarda inmediatamente en caché local para respuesta
 *    instantánea y sincroniza en paralelo con Firestore en segundo plano.
 * 3. Escucha en Tiempo Real: Métodos de subscripción (onSnapshot) para sincronizar
 *    personajes, mundos del DM y perfiles entre pestañas y dispositivos.
 */

// ==========================================
// 1. SERVICIO DE PERSONAJES (CHARACTERS)
// ==========================================

export interface FirestoreCharacterDoc {
  id: string;
  ownerId: string;
  name: string;
  level: number;
  race: string;
  class: string;
  currentHp: number;
  maxHp: number;
  data: string; // JSON serializado de Character5e
  createdAt?: string;
  updatedAt: string;
}

/**
 * Guarda una lista de personajes en Firestore y en caché local.
 */
export async function saveCharactersAsync(
  characters: Character5e[],
  currentUser?: AuthSessionUser | null
): Promise<void> {
  // 1. Siempre guardar en caché local primero para cero latencia y tolerancia a fallos
  saveCharactersLocal(characters);

  if (!isFirebaseAvailable()) return;

  const currentUid = auth?.currentUser?.uid || currentUser?.id;
  if (!currentUid) return;

  try {
    const promises = characters.map(async (char) => {
      const cleanLevel = Math.max(1, Math.min(20, Math.floor(char.level || 1)));
      const charDocData: FirestoreCharacterDoc = {
        id: char.id,
        ownerId: currentUid,
        name: (char.name || 'Sin Nombre').slice(0, 100),
        level: cleanLevel,
        race: (char.race || 'Humano').slice(0, 100),
        class: (char.characterClass || 'Guerrero').slice(0, 100),
        currentHp: char.currentHp ?? 10,
        maxHp: char.maxHp ?? 10,
        data: JSON.stringify(char),
        updatedAt: new Date().toISOString(),
      };

      const docRef = doc(db, 'characters', char.id);
      await setDoc(docRef, charDocData, { merge: true });
    });

    await Promise.all(promises);
  } catch (error) {
    console.warn('[FirebaseService] Sincronización en la nube diferida:', error);
  }
}

/**
 * Guarda un solo personaje en Firestore y en caché local.
 */
export async function saveSingleCharacterAsync(
  character: Character5e,
  currentUser?: AuthSessionUser | null
): Promise<void> {
  const currentList = loadCharactersLocal();
  const updatedList = [
    ...currentList.filter((c) => c.id !== character.id),
    character,
  ];
  await saveCharactersAsync(updatedList, currentUser);
}

/**
 * Carga personajes combinando Firestore y la caché local.
 */
export async function loadCharactersAsync(
  currentUser?: AuthSessionUser | null
): Promise<Character5e[]> {
  const localChars = loadCharactersLocal();

  if (!isFirebaseAvailable()) return localChars;

  const currentUid = auth?.currentUser?.uid || currentUser?.id;
  if (!currentUid) return localChars;

  try {
    const q = query(
      collection(db, 'characters'),
      where('ownerId', '==', currentUid)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Si en Firestore está vacío pero tenemos locales, subimos los locales
      if (localChars.length > 0) {
        saveCharactersAsync(localChars, currentUser).catch(() => {});
      }
      return localChars;
    }

    const firestoreChars: Character5e[] = [];
    snapshot.forEach((docSnap) => {
      const raw = docSnap.data() as FirestoreCharacterDoc;
      if (raw.data) {
        try {
          const parsed = JSON.parse(raw.data);
          firestoreChars.push(parsed);
        } catch {}
      }
    });

    if (firestoreChars.length > 0) {
      saveCharactersLocal(firestoreChars);
      return firestoreChars;
    }
    return localChars;
  } catch (error) {
    console.warn('[FirebaseService] Error leyendo personajes en Firestore; usando copia local:', error);
    return localChars;
  }
}

/**
 * Elimina un personaje en Firestore y en caché local.
 */
export async function deleteCharacterAsync(
  characterId: string,
  currentUser?: AuthSessionUser | null
): Promise<void> {
  const currentList = loadCharactersLocal();
  const filtered = currentList.filter((c) => c.id !== characterId);
  saveCharactersLocal(filtered);

  if (!isFirebaseAvailable()) return;

  const currentUid = auth?.currentUser?.uid || currentUser?.id;
  if (!currentUid) return;

  try {
    const docRef = doc(db, 'characters', characterId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn('[FirebaseService] Error al eliminar personaje en Firestore:', error);
  }
}

/**
 * Escucha cambios en tiempo real en los personajes del usuario.
 */
export function subscribeToCharacters(
  onUpdate: (characters: Character5e[]) => void,
  currentUser?: AuthSessionUser | null
): Unsubscribe {
  if (!isFirebaseAvailable()) {
    return () => {};
  }

  const currentUid = auth?.currentUser?.uid || currentUser?.id;
  if (!currentUid) {
    return () => {};
  }

  const q = query(
    collection(db, 'characters'),
    where('ownerId', '==', currentUid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const chars: Character5e[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data() as FirestoreCharacterDoc;
        if (d.data) {
          try {
            chars.push(JSON.parse(d.data));
          } catch {}
        }
      });
      if (chars.length > 0) {
        saveCharactersLocal(chars);
        onUpdate(chars);
      }
    },
    (err) => {
      console.warn('[FirebaseService] Listener de personajes cerrado o sin permisos:', err.message);
    }
  );
}

// ==========================================
// 2. SERVICIO DEL DUNGEON MASTER & MUNDOS
// ==========================================

export interface FirestoreCampaignDoc {
  id: string;
  dmUserId: string;
  title: string;
  description: string;
  data: string; // JSON serializado de DMWorkspace
  createdAt?: string;
  updatedAt: string;
}

/**
 * Guarda el espacio de trabajo del DM en Firestore y en local.
 */
export async function saveDMWorkspaceAsync(
  workspace: DMWorkspace,
  currentUser?: AuthSessionUser | null,
  worldId?: string
): Promise<void> {
  saveDMWorkspaceLocal(workspace);

  if (!isFirebaseAvailable()) return;

  const currentUid = auth?.currentUser?.uid || currentUser?.id;
  if (!currentUid) return;

  const campaignId = worldId || `dm_${currentUid}`;

  try {
    const campaignData: FirestoreCampaignDoc = {
      id: campaignId,
      dmUserId: currentUid,
      title: (workspace.dmName || 'Mundo de Campaña').slice(0, 150),
      description: (workspace.currentQuest || 'Aventura Activa').slice(0, 4000),
      data: JSON.stringify(workspace),
      updatedAt: new Date().toISOString(),
    };

    const docRef = doc(db, 'campaigns', campaignId);
    await setDoc(docRef, campaignData, { merge: true });
  } catch (error) {
    console.warn('[FirebaseService] Sincronización del DM en Firestore diferida:', error);
  }
}

/**
 * Carga el espacio de trabajo del DM combinando Firestore y local.
 */
export async function loadDMWorkspaceAsync(
  currentUser?: AuthSessionUser | null,
  worldId?: string
): Promise<DMWorkspace> {
  const localWs = loadDMWorkspaceLocal();

  if (!isFirebaseAvailable()) return localWs;

  const currentUid = auth?.currentUser?.uid || currentUser?.id;
  if (!currentUid) return localWs;

  const campaignId = worldId || `dm_${currentUid}`;

  try {
    const docRef = doc(db, 'campaigns', campaignId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const cDoc = snap.data() as FirestoreCampaignDoc;
      if (cDoc.data) {
        const parsed = JSON.parse(cDoc.data);
        saveDMWorkspaceLocal(parsed);
        return parsed;
      }
    }
    return localWs;
  } catch (error) {
    console.warn('[FirebaseService] Error cargando DM Workspace de Firestore:', error);
    return localWs;
  }
}

/**
 * Escucha cambios en tiempo real en la campaña del DM.
 */
export function subscribeToDMWorkspace(
  worldId: string,
  onUpdate: (workspace: DMWorkspace) => void,
  currentUser?: AuthSessionUser | null
): Unsubscribe {
  if (!isFirebaseAvailable()) return () => {};

  const currentUid = auth?.currentUser?.uid || currentUser?.id;
  if (!currentUid) return () => {};

  const campaignId = worldId || `dm_${currentUid}`;
  const docRef = doc(db, 'campaigns', campaignId);

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const cDoc = snap.data() as FirestoreCampaignDoc;
        if (cDoc.data) {
          try {
            const parsed = JSON.parse(cDoc.data);
            saveDMWorkspaceLocal(parsed);
            onUpdate(parsed);
          } catch {}
        }
      }
    },
    (err) => {
      console.warn('[FirebaseService] Listener de campaña cerrado:', err.message);
    }
  );
}

// ==========================================
// 3. SERVICIO DE PERFIL DE USUARIO
// ==========================================

export interface FirestoreUserDoc {
  id: string;
  email: string;
  displayName: string;
  role: 'player' | 'dm' | 'moderator';
  playerType?: 'player' | 'dm' | 'both';
  userTagId?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt: string;
}

/**
 * Guarda el perfil del usuario en Firestore y en caché local.
 */
export async function saveUserProfileAsync(user: AuthSessionUser): Promise<void> {
  saveAuthUserLocal(user);

  if (!isFirebaseAvailable()) return;

  const uid = auth?.currentUser?.uid || user.id;
  if (!uid) return;

  try {
    const mappedRole =
      user.role === 'admin'
        ? 'moderator'
        : user.role === 'creator'
        ? 'dm'
        : (user.role as 'player' | 'dm' | 'moderator');

    const userDoc: FirestoreUserDoc = {
      id: uid,
      email: user.email,
      displayName: user.displayName.slice(0, 100),
      role: mappedRole,
      playerType: user.playerType || 'player',
      userTagId: (user.userTagId || '123').slice(0, 10),
      avatarUrl: (user.avatarUrl || '').slice(0, 2048),
      updatedAt: new Date().toISOString(),
    };

    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, userDoc, { merge: true });
  } catch (error) {
    console.warn('[FirebaseService] Error guardando perfil de usuario en Firestore:', error);
  }
}

// ==========================================
// 4. SERVICIO DE AJUSTES DEL SERVIDOR / HOST
// ==========================================

export async function saveHostSettingsAsync(settings: HostSettings): Promise<void> {
  saveHostSettingsLocal(settings);
}

export async function loadHostSettingsAsync(): Promise<HostSettings> {
  return loadHostSettingsLocal();
}
