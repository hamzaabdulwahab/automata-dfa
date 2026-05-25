/**
 * StorageAdapter — saves user-scoped automata to localStorage.
 * Swap this with a Postgres/Supabase-backed adapter later by implementing the same 4 methods.
 */

const STORAGE_KEY = 'automata-dfa:saved';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function userBucket(userId) {
  const all = readAll();
  if (!all[userId]) all[userId] = [];
  return { all, list: all[userId] };
}

function uid() {
  return `aut_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export const localStorageAdapter = {
  async list(userId) {
    const { list } = userBucket(userId);
    return list.slice().sort((a, b) => (b.updatedAt ?? b.savedAt) - (a.updatedAt ?? a.savedAt));
  },

  async save(userId, { name, definition, id }) {
    if (!userId) throw new Error('userId required');
    if (!name || typeof name !== 'string') throw new Error('name required');
    if (!definition) throw new Error('definition required');

    const { all, list } = userBucket(userId);
    const now = Date.now();
    if (id) {
      const existing = list.find((x) => x.id === id);
      if (existing) {
        existing.name = name;
        existing.definition = definition;
        existing.updatedAt = now;
        writeAll(all);
        return existing;
      }
    }
    const entry = { id: uid(), name, definition, savedAt: now, updatedAt: now };
    list.push(entry);
    writeAll(all);
    return entry;
  },

  async remove(userId, id) {
    const { all, list } = userBucket(userId);
    const idx = list.findIndex((x) => x.id === id);
    if (idx === -1) return false;
    list.splice(idx, 1);
    writeAll(all);
    return true;
  },

  async get(userId, id) {
    const { list } = userBucket(userId);
    return list.find((x) => x.id === id) ?? null;
  },
};
