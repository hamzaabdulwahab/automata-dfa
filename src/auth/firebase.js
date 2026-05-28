import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  GithubAuthProvider,
  onAuthStateChanged,
} from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const DEV_USER_ENABLED =
  import.meta.env.DEV && (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'replace_me');

const DEV_USER = {
  id: 'dev-user',
  primaryEmailAddress: { emailAddress: 'dev@local.test' },
};

export class AuthConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthConfigError';
  }
}

let app = null;
let auth = null;

export function getFirebase() {
  if (DEV_USER_ENABLED) {
    return null;
  }
  if (auth) return auth;

  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'replace_me') {
    throw new AuthConfigError(
      'Missing VITE_FIREBASE_API_KEY. Add it to .env.local — get yours at https://console.firebase.google.com'
    );
  }

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);

  if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
    try {
      getAnalytics(app);
    } catch (e) {
      console.warn('Analytics initialization failed:', e);
    }
  }

  return auth;
}

// Convert a Firebase User object to the Clerk-like format used by the application
function formatUser(firebaseUser) {
  if (!firebaseUser) return null;
  return {
    id: firebaseUser.uid,
    primaryEmailAddress: {
      emailAddress:
        firebaseUser.email || firebaseUser.providerData[0]?.email || 'no-email@local.test',
    },
  };
}

export async function signInWithOAuth({ provider, redirectUrl } = {}) {
  if (DEV_USER_ENABLED) {
    window.location.replace(redirectUrl ?? '/');
    return;
  }
  const authInstance = getFirebase();
  let authProvider;

  if (provider === 'google') {
    authProvider = new GoogleAuthProvider();
  } else if (provider === 'github') {
    authProvider = new GithubAuthProvider();
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  // Use signInWithPopup for a cleaner OAuth flow on the same page
  await signInWithPopup(authInstance, authProvider);
  window.location.replace(redirectUrl ?? '/');
}

export async function signInWithGoogle({ redirectUrl } = {}) {
  return signInWithOAuth({ provider: 'google', redirectUrl });
}

export async function signInWithGithub({ redirectUrl } = {}) {
  return signInWithOAuth({ provider: 'github', redirectUrl });
}

export async function signOut({ redirectUrl } = {}) {
  if (DEV_USER_ENABLED) {
    window.location.replace(redirectUrl ?? '/auth.html');
    return;
  }
  const authInstance = getFirebase();
  await firebaseSignOut(authInstance);
  window.location.replace(redirectUrl ?? '/auth.html');
}

// Wrap onAuthStateChanged to resolve the user in a promise
export function getUser() {
  if (DEV_USER_ENABLED) {
    if (typeof window !== 'undefined' && window.location.pathname.includes('auth.html')) {
      return Promise.resolve(null);
    }
    return Promise.resolve(DEV_USER);
  }
  const authInstance = getFirebase();
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(authInstance, (user) => {
      unsubscribe();
      resolve(formatUser(user));
    });
  });
}

export async function requireUser({ redirectTo = '/auth.html' } = {}) {
  try {
    const user = await getUser();
    if (!user) {
      window.location.replace(redirectTo);
      return null;
    }
    return user;
  } catch (err) {
    if (err instanceof AuthConfigError) throw err;
    window.location.replace(redirectTo);
    return null;
  }
}

export async function redirectIfSignedIn({ redirectTo = '/' } = {}) {
  const user = await getUser();
  if (user) window.location.replace(redirectTo);
}
