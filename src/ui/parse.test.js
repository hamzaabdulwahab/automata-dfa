import { describe, it, expect } from 'vitest';
import { parseList, parseTargets, EXAMPLES } from './parse.js';
import { DFA, NFA } from '../engine/index.js';

describe('parseList', () => {
  it('returns empty array for empty/null input', () => {
    expect(parseList('')).toEqual([]);
    expect(parseList(null)).toEqual([]);
    expect(parseList(undefined)).toEqual([]);
  });

  it('splits on commas and trims', () => {
    expect(parseList('q0, q1, q2')).toEqual(['q0', 'q1', 'q2']);
  });

  it('skips blanks from trailing commas', () => {
    expect(parseList('a,b,, ,c')).toEqual(['a', 'b', 'c']);
  });

  it('parseTargets is the same as parseList', () => {
    expect(parseTargets('q1, q2')).toEqual(['q1', 'q2']);
  });
});

describe('built-in EXAMPLES', () => {
  it('DFA example constructs and accepts the right strings', () => {
    const dfa = new DFA(EXAMPLES.DFA);
    expect(dfa.accepts('1')).toBe(true);
    expect(dfa.accepts('10')).toBe(false);
    expect(EXAMPLES.DFA.tests).toContain('');
  });

  it('NFA example accepts strings containing 01', () => {
    const nfa = new NFA(EXAMPLES.NFA);
    expect(nfa.accepts('001')).toBe(true);
    expect(nfa.accepts('10')).toBe(false);
    expect(EXAMPLES.NFA.tests).toContain('1001');
  });

  it('ε-NFA example matches a*b', () => {
    const nfa = new NFA(EXAMPLES.EPSILON_NFA);
    expect(nfa.accepts('b')).toBe(true);
    expect(nfa.accepts('aaab')).toBe(true);
    expect(nfa.accepts('a')).toBe(false);
    expect(EXAMPLES.EPSILON_NFA.tests).toContain('aaab');
  });
});
