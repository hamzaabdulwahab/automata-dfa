import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createWorkspace } from './workspace.js';

const html = readFileSync('index.html', 'utf8')
  .replace(/<script type="module" src="\/src\/main\.entry\.js"><\/script>/, '')
  .replace(/<link[^>]+fonts\.googleapis\.com[^>]+>/g, '');

function mountWorkspace(storageOverrides = {}) {
  document.open();
  document.write(html);
  document.close();

  const saved = [];
  const storage = {
    async list() {
      return [];
    },
    async get() {
      return null;
    },
    async remove() {
      return true;
    },
    async save(_userId, item) {
      saved.push(item);
      return {
        id: item.id ?? 'aut_test',
        name: item.name,
        definition: item.definition,
        updatedAt: Date.now(),
      };
    },
    ...storageOverrides,
  };

  createWorkspace({
    storage,
    user: { id: 'user_test', primaryEmailAddress: { emailAddress: 'test@example.com' } },
    onSignOut: vi.fn(),
  });

  return {
    saved,
    $: (selector) => document.querySelector(selector),
    $$: (selector) => [...document.querySelectorAll(selector)],
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('workspace integration', () => {
  it('loads a beginner-ready DFA example with tests, diagram, and accessible matrix cells', () => {
    const { $, $$ } = mountWorkspace();

    expect($('#automaton-name-display').textContent).toContain('Ends in 1');
    expect($('#input-batch').value).toContain('1011');
    expect($('#diagram-status').textContent).toContain('2 states');
    expect($$('.diagram__state')).toHaveLength(2);
    expect($('input[aria-label="δ(q0, 0)"]')).toBeTruthy();
    expect($('#inspector-summary').textContent).toBe('Ready');
  });

  it('explains ε-NFA simulation, batch tests, conversion provenance, and stale result clearing', () => {
    const { $, $$ } = mountWorkspace();

    $('[data-type="EPSILON_NFA"]').click();
    $('#action-example').click();
    $('#input-test').value = 'ab';
    $('#action-test').click();

    expect($('#test-result').hidden).toBe(false);
    expect($('#test-trace').textContent).toContain('{b}');

    $('#input-batch').value = 'ε\nb\nab';
    $('#action-batch').click();
    expect($('#batch-results').hidden).toBe(false);
    expect($$('#batch-results tbody tr')).toHaveLength(3);

    $('#action-convert').click();
    expect($('#provenance-panel').hidden).toBe(false);
    expect($$('#provenance-list li').length).toBeGreaterThan(0);
    expect($('#batch-results').hidden).toBe(true);
  });

  it('persists saved batch test strings with the automaton definition', async () => {
    const { $, saved } = mountWorkspace();

    $('#input-name').value = 'Saved DFA';
    $('#input-name').dispatchEvent(new Event('input', { bubbles: true }));
    $('#input-batch').value = 'ε\n1\n10';
    $('#action-save').click();

    await Promise.resolve();
    expect(saved).toHaveLength(1);
    expect(saved[0].definition.tests).toEqual(['', '1', '10']);
  });

  it('shows the beginner guide when a named machine has no structure', () => {
    const { $ } = mountWorkspace();

    $('#input-name').value = 'Draft';
    $('#input-name').dispatchEvent(new Event('input', { bubbles: true }));
    $('#input-states').value = '';
    $('#input-states').dispatchEvent(new Event('input', { bubbles: true }));
    $('#input-alphabet').value = '';
    $('#input-alphabet').dispatchEvent(new Event('input', { bubbles: true }));

    expect($('#empty-onboarding').hidden).toBe(false);
  });

  it('supports entering multiple start states for NFA and verifies they render correctly', () => {
    const { $, $$ } = mountWorkspace();

    $('[data-type="NFA"]').click();

    $('#input-states').value = 'q0, q1, q2';
    $('#input-states').dispatchEvent(new Event('input', { bubbles: true }));
    $('#input-alphabet').value = 'a';
    $('#input-alphabet').dispatchEvent(new Event('input', { bubbles: true }));

    $('#input-start').value = 'q0, q1';
    $('#input-start').dispatchEvent(new Event('input', { bubbles: true }));

    expect($('#label-start-name').textContent).toBe('Start states');
    expect($('#hint-start').textContent).toContain('Comma-separated');

    const startPills = $$('.pill--start');
    expect(startPills).toHaveLength(2);
  });
});
