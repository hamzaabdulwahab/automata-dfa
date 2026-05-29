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

describe('NFA.trace', () => {
  it('returns the reachable frontier after each symbol', () => {
    const nfa = new NFA({
      states: ['q0', 'q1', 'q2'],
      alphabet: ['0', '1'],
      transitions: {
        q0: { 0: ['q0', 'q1'], 1: ['q0'] },
        q1: { 1: ['q2'] },
      },
      startState: 'q0',
      acceptStates: ['q2'],
    });

    const result = nfa.trace('01');
    expect(result.accepted).toBe(true);
    expect(result.finalStates).toEqual(['q0', 'q2']);
    expect(result.steps.map((s) => s.states)).toEqual([['q0'], ['q0', 'q1'], ['q0', 'q2']]);
  });

  it('includes epsilon closure in each frontier', () => {
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

    const result = nfa.trace('ab');
    expect(result.accepted).toBe(true);
    expect(result.steps[0].states).toEqual(['a', 's']);
    expect(result.steps[1].moveStates).toEqual(['a']);
    expect(result.steps[2].states).toEqual(['b']);
  });

  it('returns a rejection reason when no paths remain', () => {
    const nfa = new NFA({
      states: ['q0', 'q1'],
      alphabet: ['a', 'b'],
      transitions: { q0: { a: ['q1'] } },
      startState: 'q0',
      acceptStates: ['q1'],
    });

    const result = nfa.trace('ab');
    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/no computation paths remain/);
    expect(result.finalStates).toEqual([]);
  });
});

describe('NFA with multiple start states and advanced epsilon rules', () => {
  it('supports multiple start states', () => {
    const nfa = new NFA({
      states: ['q0', 'q1', 'q2'],
      alphabet: ['a'],
      transitions: {
        q0: { a: ['q2'] },
        q1: { a: ['q2'] },
      },
      startStates: ['q0', 'q1'],
      acceptStates: ['q2'],
    });
    expect(nfa.accepts('a')).toBe(true);
  });

  it('one of many start states is final → empty string accepted', () => {
    const nfa = new NFA({
      states: ['q0', 'q1'],
      alphabet: ['a'],
      transitions: {},
      startStates: ['q0', 'q1'],
      acceptStates: ['q1'],
    });
    expect(nfa.accepts('')).toBe(true);
  });

  it('empty string rejected when no start state is final', () => {
    const nfa = new NFA({
      states: ['q0', 'q1'],
      alphabet: ['a'],
      transitions: {},
      startStates: ['q0', 'q1'],
      acceptStates: [],
    });
    expect(nfa.accepts('')).toBe(false);
  });

  it('one path dies but another accepts', () => {
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
    expect(nfa.accepts('a')).toBe(true);
  });

  it('all paths die → reject', () => {
    const nfa = new NFA({
      states: ['q0', 'q1', 'q2'],
      alphabet: ['a'],
      transitions: {
        q0: {},
        q1: {},
      },
      startStates: ['q0', 'q1'],
      acceptStates: ['q2'],
    });
    expect(nfa.accepts('a')).toBe(false);
  });

  it('ε-transition blocked in NFA mode (allowEpsilon: false)', () => {
    expect(() => {
      new NFA({
        states: ['q0', 'q1'],
        alphabet: ['a'],
        transitions: {
          q0: { ε: ['q1'] },
        },
        startStates: ['q0'],
        acceptStates: ['q1'],
        allowEpsilon: false,
      });
    }).toThrow(ValidationError);
  });

  it('large active state set (5+ states branching)', () => {
    const nfa = new NFA({
      states: ['q0', 'q1', 'q2', 'q3', 'q4', 'q5'],
      alphabet: ['a'],
      transitions: {
        q0: { a: ['q1', 'q2', 'q3', 'q4', 'q5'] },
      },
      startStates: ['q0'],
      acceptStates: ['q5'],
    });
    expect(nfa.accepts('a')).toBe(true);
  });

  it('ε self-loop (q0 --ε--> q0) does not loop infinitely', () => {
    const nfa = new NFA({
      states: ['q0'],
      alphabet: ['a'],
      transitions: { q0: { ε: ['q0'] } },
      startStates: ['q0'],
      acceptStates: ['q0'],
    });
    expect(nfa.epsilonClosure('q0')).toEqual(new Set(['q0']));
    expect(nfa.accepts('')).toBe(true);
  });

  it('multiple start states with ε-closures', () => {
    const nfa = new NFA({
      states: ['q0', 'q1', 'q2', 'q3'],
      alphabet: ['a'],
      transitions: {
        q0: { ε: ['q2'] },
        q1: { ε: ['q3'] },
      },
      startStates: ['q0', 'q1'],
      acceptStates: ['q2', 'q3'],
    });
    expect(nfa.accepts('')).toBe(true);
  });

  it('ε-transition from start directly to final → empty string accepted', () => {
    const nfa = new NFA({
      states: ['q0', 'q1'],
      alphabet: ['a'],
      transitions: {
        q0: { ε: ['q1'] },
      },
      startStates: ['q0'],
      acceptStates: ['q1'],
    });
    expect(nfa.accepts('')).toBe(true);
  });

  it('ε chain: q0→q1→q2 all via ε, q2 is final → empty string accepted', () => {
    const nfa = new NFA({
      states: ['q0', 'q1', 'q2'],
      alphabet: ['a'],
      transitions: {
        q0: { ε: ['q1'] },
        q1: { ε: ['q2'] },
      },
      startStates: ['q0'],
      acceptStates: ['q2'],
    });
    expect(nfa.accepts('')).toBe(true);
  });

  it('normal transition followed by ε transition', () => {
    const nfa = new NFA({
      states: ['q0', 'q1', 'q2'],
      alphabet: ['a'],
      transitions: {
        q0: { a: ['q1'] },
        q1: { ε: ['q2'] },
      },
      startStates: ['q0'],
      acceptStates: ['q2'],
    });
    expect(nfa.accepts('a')).toBe(true);
  });

  it('ε transition followed by normal transition', () => {
    const nfa = new NFA({
      states: ['q0', 'q1', 'q2'],
      alphabet: ['a'],
      transitions: {
        q0: { ε: ['q1'] },
        q1: { a: ['q2'] },
      },
      startStates: ['q0'],
      acceptStates: ['q2'],
    });
    expect(nfa.accepts('a')).toBe(true);
  });

  it('final state reachable only after ε-closure', () => {
    const nfa = new NFA({
      states: ['q0', 'q1', 'q2'],
      alphabet: ['a'],
      transitions: {
        q0: { a: ['q1'] },
        q1: { ε: ['q2'] },
      },
      startStates: ['q0'],
      acceptStates: ['q2'],
    });
    expect(nfa.accepts('a')).toBe(true);
  });

  it('multiple epsilon paths (q0 --ε--> q1, q0 --ε--> q2)', () => {
    const nfa = new NFA({
      states: ['q0', 'q1', 'q2'],
      alphabet: ['a'],
      transitions: {
        q0: { ε: ['q1', 'q2'] },
      },
      startStates: ['q0'],
      acceptStates: ['q2'],
    });
    expect(nfa.accepts('')).toBe(true);
  });

  it('NFA.trace with multiple start states verifies correct frontier', () => {
    const nfa = new NFA({
      states: ['q0', 'q1', 'q2'],
      alphabet: ['a'],
      transitions: {
        q0: { a: ['q2'] },
        q1: { a: ['q2'] },
      },
      startStates: ['q0', 'q1'],
      acceptStates: ['q2'],
    });
    const result = nfa.trace('a');
    expect(result.accepted).toBe(true);
    expect(result.steps[0].states).toEqual(['q0', 'q1']);
    expect(result.steps[1].states).toEqual(['q2']);
  });
});
