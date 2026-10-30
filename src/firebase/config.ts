import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Detect whether configuration contains valid keys or placeholders across GitHub copies
export const isConfigValid: boolean = Boolean(
  firebaseConfig &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey &&
    !firebaseConfig.projectId.includes('placeholder') &&
    !firebaseConfig.projectId.includes('remixed-project-id')
);

let initializedApp: FirebaseApp;
let firestoreDb: Firestore;
let firebaseAuth: Auth;

try {
  if (getApps().length > 0) {
    initializedApp = getApps()[0];
  } else {
    initializedApp = initializeApp(firebaseConfig);
  }

  // Initialize Firestore with configured databaseId (CRITICAL for AI Studio Firestore)
  firestoreDb = firebaseConfig.firestoreDatabaseId
    ? getFirestore(initializedApp, firebaseConfig.firestoreDatabaseId)
    : getFirestore(initializedApp);

  firebaseAuth = getAuth(initializedApp);
} catch (err) {
  console.warn('[Firebase Config] Inicialización en modo contingencia/local:', err);
  // Fallback graceful initialization
  if (getApps().length > 0) {
    initializedApp = getApps()[0];
    firestoreDb = getFirestore(initializedApp);
    firebaseAuth = getAuth(initializedApp);
  } else {
    initializedApp = initializeApp(firebaseConfig);
    firestoreDb = getFirestore(initializedApp);
    firebaseAuth = getAuth(initializedApp);
  }
}

export const app = initializedApp;
export const db = firestoreDb;
export const auth = firebaseAuth;
export const googleProvider = new GoogleAuthProvider();

export function isFirebaseAvailable(): boolean {
  return Boolean(isConfigValid && db && auth);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || false,
      isAnonymous: auth?.currentUser?.isAnonymous || false,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test as required by Firebase integration skill
export async function testFirestoreConnection(): Promise<boolean> {
  if (!isFirebaseAvailable()) {
    console.log('[Firebase] Operando en modo local para esta instancia / copia de GitHub.');
    return false;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Conexión a Firestore verificada con éxito.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Cliente sin conexión; funcionando con adaptador local.');
    } else {
      console.log('[Firebase] Servidor Firestore alcanzado.');
    }
    return false;
  }
}
