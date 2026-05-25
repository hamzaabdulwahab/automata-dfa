import { describe, it, expect } from 'vitest';
import { NFA } from './nfa.js';
import { ValidationError, EvaluationError } from './errors.js';

describe('NFA (no epsilon)', () => {
  // Language: strings over {0,1} containing "01"
  const containsOne = () =>
    new NFA({
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

  it.each([
    ['', false],
    ['0', false],
    ['1', false],
    ['01', true],
    ['001', true],
    ['10', false],
    ['100', false],
    ['1001', true],
    ['0010', true],
  ])('accepts(%j) === %j', (input, expected) => {
    expect(containsOne().accepts(input)).toBe(expected);
  });

  it('supports a single state as a transition target (auto-wrapped)', () => {
    const nfa = new NFA({
      states: ['q0', 'q1'],
      alphabet: ['a'],
      transitions: { q0: { a: 'q1' } },
      startState: 'q0',
      acceptStates: ['q1'],
    });
    expect(nfa.accepts('a')).toBe(true);
  });

  it('rejects unknown target state', () => {
    expect(
      () =>
        new NFA({
          states: ['q0'],
          alphabet: ['a'],
          transitions: { q0: { a: ['qx'] } },
          startState: 'q0',
          acceptStates: [],
        })
    ).toThrow(ValidationError);
  });
});

describe('ε-NFA', () => {
  // Language: a*b (zero or more a's followed by exactly one b)
  // Using epsilon to express "skip directly to b".
  const aStarB = () =>
    new NFA({
      states: ['s', 'a', 'b'],
      alphabet: ['a', 'b'],
      transitions: {
        s: { ε: ['a'] },
        a: { a: ['a'], b: ['b'] },
      },
      startState: 's',
      acceptStates: ['b'],
    });

  it('hasEpsilon === true', () => {
    expect(aStarB().hasEpsilon).toBe(true);
  });

  it('epsilonClosure of a state with an outgoing ε reaches the target', () => {
    const nfa = aStarB();
    const closure = nfa.epsilonClosure('s');
    expect([...closure].sort()).toEqual(['a', 's']);
  });

  it.each([
    ['', false],
    ['b', true],
    ['ab', true],
    ['aaab', true],
    ['a', false],
    ['ba', false],
    ['bab', false],
  ])('accepts(%j) === %j for a*b', (input, expected) => {
    expect(aStarB().accepts(input)).toBe(expected);
  });

  it('handles chained epsilon transitions', () => {
    const nfa = new NFA({
      states: ['q0', 'q1', 'q2', 'q3'],
      alphabet: ['a'],
      transitions: {
        q0: { ε: ['q1'] },
        q1: { ε: ['q2'] },
        q2: { a: ['q3'] },
      },
      startState: 'q0',
      acceptStates: ['q3'],
    });
    expect([...nfa.epsilonClosure('q0')].sort()).toEqual(['q0', 'q1', 'q2']);
    expect(nfa.accepts('a')).toBe(true);
    expect(nfa.accepts('')).toBe(false);
  });

  it('handles epsilon cycles without infinite loop', () => {
    const nfa = new NFA({
      states: ['q0', 'q1'],
      alphabet: ['a'],
      transitions: {
        q0: { ε: ['q1'] },
        q1: { ε: ['q0'], a: ['q1'] },
      },
      startState: 'q0',
      acceptStates: ['q1'],
    });
    const closure = nfa.epsilonClosure('q0');
    expect([...closure].sort()).toEqual(['q0', 'q1']);
    expect(nfa.accepts('a')).toBe(true);
  });

  it('start state in accept set + epsilon means empty string is accepted', () => {
    const nfa = new NFA({
      states: ['q0', 'q1'],
      alphabet: ['a'],
      transitions: { q0: { ε: ['q1'] }, q1: { a: ['q1'] } },
      startState: 'q0',
      acceptStates: ['q1'],
    });
    expect(nfa.accepts('')).toBe(true);
  });

  it('throws on input with symbol outside alphabet', () => {
    expect(() => aStarB().accepts('abx')).toThrow(EvaluationError);
  });
});
