import { describe, it, expect } from 'vitest';
import { DFA } from './dfa.js';
import { NFA } from './nfa.js';
import { nfaToDfa, minimizeDfa } from './convert.js';

function languageEquivalent(a, b, samples) {
  for (const s of samples) {
    if (a.accepts(s) !== b.accepts(s)) {
      return { equivalent: false, sample: s, aResult: a.accepts(s), bResult: b.accepts(s) };
    }
  }
  return { equivalent: true };
}

function allBinaryStringsUpTo(n) {
  const out = [''];
  let frontier = [''];
  for (let i = 0; i < n; i += 1) {
    const next = [];
    for (const s of frontier) {
      next.push(s + '0', s + '1');
    }
    out.push(...next);
    frontier = next;
  }
  return out;
}

describe('nfaToDfa — subset construction', () => {
  it('converts a simple NFA (strings containing "01") and preserves the language', () => {
    const nfa = new NFA({
      states: ['q0', 'q1', 'q2'],
      alphabet: ['0', '1'],
      transitions: {
        q0: { 0: ['q0', 'q1'], 1: ['q0'] },
        q1: { 1: ['q2'] },
        q2: { 0: ['q2'], 1: ['q2'] },
      },
      startState: 'q0',
      acceptStates: ['q2'],
    });
    const dfa = nfaToDfa(nfa);
    expect(dfa).toBeInstanceOf(DFA);
    const result = languageEquivalent(nfa, dfa, allBinaryStringsUpTo(6));
    expect(result).toEqual({ equivalent: true });
    expect(dfa.isComplete()).toBe(true);
  });

  it('converts an ε-NFA correctly (a*b)', () => {
    const nfa = new NFA({
      states: ['s', 'a', 'b'],
      alphabet: ['a', 'b'],
      transitions: {
        s: { ε: ['a'] },
        a: { a: ['a'], b: ['b'] },
      },
      startState: 's',
      acceptStates: ['b'],
    });
    const dfa = nfaToDfa(nfa);
    // Generate strings over {a,b} up to length 5
    const samples = [''];
    for (let len = 1; len <= 5; len += 1) {
      const totalCombos = 2 ** len;
      for (let i = 0; i < totalCombos; i += 1) {
        let s = '';
        for (let bit = 0; bit < len; bit += 1) {
          s += (i >> bit) & 1 ? 'b' : 'a';
        }
        samples.push(s);
      }
    }
    expect(languageEquivalent(nfa, dfa, samples)).toEqual({ equivalent: true });
  });
});

describe('minimizeDfa', () => {
  it('removes unreachable states', () => {
    const dfa = new DFA({
      states: ['q0', 'q1', 'orphan'],
      alphabet: ['a'],
      transitions: {
        q0: { a: 'q1' },
        q1: { a: 'q0' },
        orphan: { a: 'orphan' },
      },
      startState: 'q0',
      acceptStates: ['q1'],
    });
    const min = minimizeDfa(dfa);
    expect(min.states.has('orphan')).toBe(false);
    expect(min.accepts('a')).toBe(true);
    expect(min.accepts('aa')).toBe(false);
  });

  it('merges equivalent states (ends-in-1 DFA stays the same size — already minimal)', () => {
    const dfa = new DFA({
      states: ['q0', 'q1'],
      alphabet: ['0', '1'],
      transitions: {
        q0: { 0: 'q0', 1: 'q1' },
        q1: { 0: 'q0', 1: 'q1' },
      },
      startState: 'q0',
      acceptStates: ['q1'],
    });
    const min = minimizeDfa(dfa);
    expect(min.states.size).toBe(2);
    expect(languageEquivalent(dfa, min, allBinaryStringsUpTo(5))).toEqual({ equivalent: true });
  });

  it('shrinks a non-minimal DFA — odd number of 0s, with redundant states', () => {
    // 4 states where two pairs are equivalent. Language: strings over {0,1} with odd # of 0s.
    // Minimal version has 2 states. We construct a 4-state version by duplicating each.
    const dfa = new DFA({
      states: ['e1', 'e2', 'o1', 'o2'],
      alphabet: ['0', '1'],
      transitions: {
        e1: { 0: 'o1', 1: 'e2' },
        e2: { 0: 'o2', 1: 'e1' },
        o1: { 0: 'e1', 1: 'o2' },
        o2: { 0: 'e2', 1: 'o1' },
      },
      startState: 'e1',
      acceptStates: ['o1', 'o2'],
    });
    const min = minimizeDfa(dfa);
    expect(min.states.size).toBe(2);
    expect(languageEquivalent(dfa, min, allBinaryStringsUpTo(6))).toEqual({ equivalent: true });
  });

  it('preserves single-state DFA', () => {
    const dfa = new DFA({
      states: ['q0'],
      alphabet: ['a'],
      transitions: { q0: { a: 'q0' } },
      startState: 'q0',
      acceptStates: ['q0'],
    });
    const min = minimizeDfa(dfa);
    expect(min.states.size).toBe(1);
    expect(min.accepts('')).toBe(true);
    expect(min.accepts('aaa')).toBe(true);
  });

  it('NFA → DFA → minimize round-trip preserves language', () => {
    const nfa = new NFA({
      states: ['q0', 'q1', 'q2'],
      alphabet: ['0', '1'],
      transitions: {
        q0: { 0: ['q0', 'q1'], 1: ['q0'] },
        q1: { 1: ['q2'] },
        q2: { 0: ['q2'], 1: ['q2'] },
      },
      startState: 'q0',
      acceptStates: ['q2'],
    });
    const dfa = nfaToDfa(nfa);
    const min = minimizeDfa(dfa);
    expect(languageEquivalent(nfa, min, allBinaryStringsUpTo(6))).toEqual({ equivalent: true });
    expect(min.states.size).toBeLessThanOrEqual(dfa.states.size);
  });

  it('converts an NFA with multiple start states correctly', () => {
    const nfa = new NFA({
      states: ['q0', 'q1', 'q2'],
      alphabet: ['a'],
      transitions: {
        q0: { a: ['q2'] },
        q1: {},
      },
      startStates: ['q0', 'q1'],
      acceptStates: ['q2'],
    });
    const dfa = nfaToDfa(nfa);
    expect(dfa.accepts('')).toBe(false);
    expect(dfa.accepts('a')).toBe(true);
    expect(dfa.accepts('aa')).toBe(false);
  });
});
