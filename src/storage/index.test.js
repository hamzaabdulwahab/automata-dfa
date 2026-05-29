import { describe, it, expect } from 'vitest';
import { storageAdapter, localStorageAdapter, firestoreAdapter } from './index.js';

describe('storage routing', () => {
  it('exports both adapters and the default storageAdapter', () => {
    expect(localStorageAdapter).toBeDefined();
    expect(firestoreAdapter).toBeDefined();
    expect(storageAdapter).toBeDefined();
  });

  it('correctly resolves storageAdapter based on DEV environment and Firebase Config settings', () => {
    const isDev = import.meta.env.DEV;
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const isDevBypass = isDev && (!apiKey || apiKey === 'replace_me');

    if (isDevBypass) {
      expect(storageAdapter).toBe(localStorageAdapter);
    } else {
      expect(storageAdapter).toBe(firestoreAdapter);
    }
  });
});
