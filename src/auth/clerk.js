import { Clerk } from '@clerk/clerk-js';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const DEV_USER_ENABLED =
  import.meta.env.DEV && (!PUBLISHABLE_KEY || PUBLISHABLE_KEY === 'pk_test_replace_me');

let clerkInstance = null;
let loadPromise = null;

export class AuthConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthConfigError';
  }
}

const DEV_USER = {
  id: 'dev-user',
  primaryEmailAddress: { emailAddress: 'dev@local.test' },
};

export async function getClerk() {
  if (DEV_USER_ENABLED) {
    console.info('[auth] Dev mode: using fake user because VITE_CLERK_PUBLISHABLE_KEY is not set.');
    return null;
  }
  if (clerkInstance) return clerkInstance;
  if (loadPromise) return loadPromise;

  if (!PUBLISHABLE_KEY || PUBLISHABLE_KEY === 'pk_test_replace_me') {
    throw new AuthConfigError(
      'Missing VITE_CLERK_PUBLISHABLE_KEY. Add it to .env.local — get yours at https://dashboard.clerk.com'
    );
  }

  loadPromise = (async () => {
    const c = new Clerk(PUBLISHABLE_KEY);
    await c.load();
    clerkInstance = c;
    return c;
  })();
  return loadPromise;
}

export async function signInWithGoogle({ redirectUrl } = {}) {
  if (DEV_USER_ENABLED) {
    window.location.replace(redirectUrl ?? '/');
    return;
  }
  const clerk = await getClerk();
  await clerk.authenticateWithRedirect({
    strategy: 'oauth_google',
    redirectUrl: redirectUrl ?? new URL('/', window.location.origin).toString(),
    redirectUrlComplete: redirectUrl ?? new URL('/', window.location.origin).toString(),
  });
}

export async function signOut({ redirectUrl } = {}) {
  if (DEV_USER_ENABLED) {
    window.location.replace(redirectUrl ?? '/auth.html');
    return;
  }
  const clerk = await getClerk();
  await clerk.signOut({
    redirectUrl: redirectUrl ?? new URL('/auth.html', window.location.origin).toString(),
  });
}

export async function getUser() {
  if (DEV_USER_ENABLED) {
    // In dev, treat the auth page as "signed-out" so you can see the sign-in UI.
    if (typeof window !== 'undefined' && window.location.pathname.includes('auth.html')) {
      return null;
    }
    return DEV_USER;
  }
  const clerk = await getClerk();
  return clerk?.user ?? null;
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

export function onSession(callback) {
  let cleanup = () => {};
  getClerk()
    .then((clerk) => {
      cleanup = clerk.addListener(({ user, session }) => callback({ user, session }));
    })
    .catch((err) => callback({ error: err }));
  return () => cleanup();
}
