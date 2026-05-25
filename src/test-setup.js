// Node 26 exposes an experimental `localStorage` global that's gated by
// --localstorage-file. happy-dom's web storage doesn't get hoisted as the
// top-level identifier reliably under this Node version. We install a small
// deterministic shim so tests get clean, isolated storage every run.

class MemoryStorage {
  #store = new Map();
  get length() {
    return this.#store.size;
  }
  key(i) {
    return [...this.#store.keys()][i] ?? null;
  }
  getItem(k) {
    return this.#store.has(k) ? this.#store.get(k) : null;
  }
  setItem(k, v) {
    this.#store.set(String(k), String(v));
  }
  removeItem(k) {
    this.#store.delete(k);
  }
  clear() {
    this.#store.clear();
  }
}

const localShim = new MemoryStorage();
const sessionShim = new MemoryStorage();

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  get: () => localShim,
});
Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  get: () => sessionShim,
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { configurable: true, get: () => localShim });
  Object.defineProperty(window, 'sessionStorage', { configurable: true, get: () => sessionShim });
}
