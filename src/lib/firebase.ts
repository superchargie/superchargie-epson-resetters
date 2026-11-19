import { initializeApp } from 'firebase/app';
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const ADMIN_EMAILS = ['martin.mbuco@gmail.com', 'izzlamartin@gmail.com'];

export function isAdminUser(user: User | null): boolean {
  if (!user || !user.email || !user.emailVerified) return false;
  return ADMIN_EMAILS.includes(user.email.toLowerCase());
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
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
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

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export function formatAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  if (code === 'auth/unauthorized-domain') {
    const host = window.location.hostname;
    return `Domain "${host}" is not authorized in Firebase Authentication yet. Add "${host}" in Firebase Console -> Authentication -> Settings -> Authorized domains (Project: ${FIREBASE_PROJECT_ID}).`;
  }
  if (code === 'auth/popup-blocked') {
    return 'Your browser blocked the Google sign-in popup. Allow popups for this site and try again.';
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Google sign-in window was closed before completing.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Google Sign-In is disabled in Firebase Console. Enable Google under Authentication -> Sign-in method.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Could not complete Google Sign-In. Please try again.';
}

export async function completeRedirectSignInIfPresent(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      void syncCustomerProfile(result.user);
      return result.user;
    }
  } catch (error) {
    console.warn('Redirect sign-in check:', formatAuthError(error));
  }
  return null;
}

export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    void syncCustomerProfile(result.user);
    return result.user;
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code || '')
        : '';

    // On standalone custom domains (not inside an iframe), fall back to redirect if popups are blocked
    const isTopWindow = window.self === window.top;
    if (code === 'auth/popup-blocked' && isTopWindow) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    throw new Error(formatAuthError(error));
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function syncCustomerProfile(user: User, phone?: string): Promise<void> {
  if (!user.uid || !user.email) return;
  const path = `customers/${user.uid}`;
  const ref = doc(db, 'customers', user.uid);
  try {
    const snap = await getDoc(ref);
    const displayName = (user.displayName || user.email.split('@')[0] || 'Customer').slice(0, 100);
    const email = user.email.slice(0, 120);

    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        displayName,
        email,
        ...(phone ? { phone: phone.slice(0, 30) } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName,
        email,
        ...(phone ? { phone: phone.slice(0, 30) } : {}),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
