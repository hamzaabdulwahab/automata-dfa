import { describe, it, expect, beforeEach } from 'vitest';
import { localStorageAdapter } from './local.js';

beforeEach(() => {
  localStorage.clear();
});

const sample = {
  name: 'ends in 1',
  definition: { type: 'DFA', states: ['q0', 'q1'], alphabet: ['0', '1'] },
};

describe('localStorageAdapter', () => {
  it('returns empty list initially', async () => {
    expect(await localStorageAdapter.list('user_1')).toEqual([]);
  });

  it('saves and lists an entry', async () => {
    const saved = await localStorageAdapter.save('user_1', sample);
    expect(saved.id).toMatch(/^aut_/);
    const list = await localStorageAdapter.list('user_1');
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('ends in 1');
  });

  it('updates an entry by id', async () => {
    const saved = await localStorageAdapter.save('user_1', sample);
    await localStorageAdapter.save('user_1', { ...sample, id: saved.id, name: 'renamed' });
    const list = await localStorageAdapter.list('user_1');
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('renamed');
  });

  it('scopes entries per user', async () => {
    await localStorageAdapter.save('user_a', sample);
    await localStorageAdapter.save('user_b', { ...sample, name: 'B item' });
    expect(await localStorageAdapter.list('user_a')).toHaveLength(1);
    expect(await localStorageAdapter.list('user_b')).toHaveLength(1);
    expect((await localStorageAdapter.list('user_b'))[0].name).toBe('B item');
  });

  it('removes an entry', async () => {
    const saved = await localStorageAdapter.save('user_1', sample);
    expect(await localStorageAdapter.remove('user_1', saved.id)).toBe(true);
    expect(await localStorageAdapter.list('user_1')).toEqual([]);
  });

  it('remove returns false for unknown id', async () => {
    expect(await localStorageAdapter.remove('user_1', 'missing')).toBe(false);
  });

  it('save validates required fields', async () => {
    await expect(localStorageAdapter.save('', sample)).rejects.toThrow(/userId/);
    await expect(localStorageAdapter.save('u', { definition: {} })).rejects.toThrow(/name/);
    await expect(localStorageAdapter.save('u', { name: 'x' })).rejects.toThrow(/definition/);
  });

  it('list returns most-recently-updated first', async () => {
    const a = await localStorageAdapter.save('user_1', { ...sample, name: 'A' });
    // Force a tick so timestamps differ
    await new Promise((r) => setTimeout(r, 5));
    await localStorageAdapter.save('user_1', { ...sample, name: 'B' });
    await new Promise((r) => setTimeout(r, 5));
    await localStorageAdapter.save('user_1', { ...sample, id: a.id, name: 'A-updated' });
    const list = await localStorageAdapter.list('user_1');
    expect(list[0].name).toBe('A-updated');
  });
});
