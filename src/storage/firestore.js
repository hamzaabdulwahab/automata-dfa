import { initializeApp, getApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  orderBy,
} from 'firebase/firestore';

// Configuration from env variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let db = null;

function getDb() {
  if (db) return db;
  let app;
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  db = getFirestore(app);
  return db;
}

export const firestoreAdapter = {
  async list(userId) {
    if (!userId) throw new Error('userId required');
    const database = getDb();
    const q = query(
      collection(database, 'automata'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const results = [];
    snapshot.forEach((d) => {
      const data = d.data();
      results.push({
        id: d.id,
        name: data.name,
        definition: data.definition,
        savedAt: data.savedAt,
        updatedAt: data.updatedAt,
      });
    });
    return results;
  },

  async save(userId, { name, definition, id }) {
    if (!userId) throw new Error('userId required');
    if (!name || typeof name !== 'string') throw new Error('name required');
    if (!definition) throw new Error('definition required');

    const database = getDb();
    const now = Date.now();

    // If id is provided, update existing, otherwise generate a new doc ID
    const docId = id || doc(collection(database, 'automata')).id;
    const docRef = doc(database, 'automata', docId);

    let savedAt = now;
    if (id) {
      const existingDoc = await getDoc(docRef);
      if (existingDoc.exists()) {
        savedAt = existingDoc.data().savedAt || now;
      }
    }

    const entry = {
      userId,
      name,
      definition,
      savedAt,
      updatedAt: now,
    };

    await setDoc(docRef, entry);
    return {
      id: docId,
      name,
      definition,
      savedAt,
      updatedAt: now,
    };
  },

  async remove(userId, id) {
    if (!userId) throw new Error('userId required');
    if (!id) throw new Error('id required');

    const database = getDb();
    const docRef = doc(database, 'automata', id);

    // Ownership check
    const existingDoc = await getDoc(docRef);
    if (!existingDoc.exists()) return false;
    if (existingDoc.data().userId !== userId) {
      throw new Error('Unauthorized delete operation');
    }

    await deleteDoc(docRef);
    return true;
  },

  async get(userId, id) {
    if (!userId) throw new Error('userId required');
    if (!id) throw new Error('id required');

    const database = getDb();
    const docRef = doc(database, 'automata', id);
    const existingDoc = await getDoc(docRef);
    if (!existingDoc.exists()) return null;

    const data = existingDoc.data();
    if (data.userId !== userId) {
      return null; // Security leak prevention
    }

    return {
      id: existingDoc.id,
      name: data.name,
      definition: data.definition,
      savedAt: data.savedAt,
      updatedAt: data.updatedAt,
    };
  },
};
