import { localStorageAdapter } from './local.js';
import { firestoreAdapter } from './firestore.js';

// Configuration check to switch adapters dynamically
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
};

const DEV_USER_ENABLED =
  import.meta.env.DEV && (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'replace_me');

// Export storageAdapter that automatically switches based on environment/config
export const storageAdapter = DEV_USER_ENABLED ? localStorageAdapter : firestoreAdapter;
export { localStorageAdapter, firestoreAdapter };
