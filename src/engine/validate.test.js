import { describe, expect, it } from 'vitest';
import { validateAutomaton, validateDFA, validateNFA, validateEpsilonNFA } from './validate.js';

describe('validateAutomaton wrapper', () => {
  it('dispatches to correct validators', () => {
    const definition = {
      states: ['q0'],
      alphabet: ['a'],
      startState: 'q0',
      acceptStates: ['q0'],
      transitions: { q0: { a: 'q0' } },
    };
    expect(validateAutomaton('DFA', definition).valid).toBe(true);
    expect(validateAutomaton('NFA', definition).valid).toBe(true);
    expect(validateAutomaton('EPSILON_NFA', definition).valid).toBe(true);
    expect(validateAutomaton('UNKNOWN', definition).valid).toBe(false);
  });
});

describe('validateDFA', () => {
  it('validates a correct DFA', () => {
    const dfa = {
      states: ['q0', 'q1'],
      alphabet: ['0', '1'],
      startState: 'q0',
      acceptStates: ['q1'],
      transitions: {
        q0: { 0: 'q0', 1: 'q1' },
        q1: { 0: 'q0', 1: 'q1' },
      },
    };
    const result = validateDFA(dfa);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects empty states or alphabet', () => {
    const emptyStates = {
      states: [],
      alphabet: ['a'],
      startState: 'q0',
      transitions: {},
    };
    expect(validateDFA(emptyStates).valid).toBe(false);

    const emptyAlphabet = {
      states: ['q0'],
      alphabet: [],
      startState: 'q0',
      transitions: {},
    };
    expect(validateDFA(emptyAlphabet).valid).toBe(false);
  });

  it('rejects missing or invalid start state', () => {
    const missingStart = {
      states: ['q0'],
      alphabet: ['a'],
      transitions: {},
    };
    expect(validateDFA(missingStart).valid).toBe(false);

    const invalidStart = {
      states: ['q0'],
      alphabet: ['a'],
      startState: 'q_other',
      transitions: {},
    };
    expect(validateDFA(invalidStart).valid).toBe(false);
  });

  it('rejects ε in alphabet or transitions', () => {
    const epsilonAlphabet = {
      states: ['q0'],
      alphabet: ['ε'],
      startState: 'q0',
      transitions: {},
    };
    expect(validateDFA(epsilonAlphabet).valid).toBe(false);

    const epsilonTransition = {
      states: ['q0', 'q1'],
      alphabet: ['a'],
      startState: 'q0',
      transitions: {
        q0: { ε: 'q1' },
      },
    };
    expect(validateDFA(epsilonTransition).valid).toBe(false);
  });

  it('rejects multiple targets / comma in transition target cell', () => {
    const commaTransition = {
      states: ['q0', 'q1', 'q2'],
      alphabet: ['a'],
      startState: 'q0',
      transitions: {
        q0: { a: 'q1,q2' },
      },
    };
    const result = validateDFA(commaTransition);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('multiple targets'))).toBe(true);
  });

  it('warns about incomplete transition table', () => {
    const partialDfa = {
      states: ['q0', 'q1'],
      alphabet: ['a', 'b'],
      startState: 'q0',
      transitions: {
        q0: { a: 'q1' },
      },
    };
    const result = validateDFA(partialDfa);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('incomplete'))).toBe(true);
  });

  it('warns about missing accept states', () => {
    const noAccept = {
      states: ['q0'],
      alphabet: ['a'],
      startState: 'q0',
      transitions: { q0: { a: 'q0' } },
    };
    const result = validateDFA(noAccept);
    expect(result.warnings.some((w) => w.includes('no final states'))).toBe(true);
  });
});

describe('validateNFA', () => {
  it('validates a correct NFA with multiple start states', () => {
    const nfa = {
      states: ['q0', 'q1', 'q2'],
      alphabet: ['0', '1'],
      startStates: ['q0', 'q1'],
      acceptStates: ['q2'],
      transitions: {
        q0: { 0: ['q0', 'q1'], 1: ['q2'] },
      },
    };
    const result = validateNFA(nfa);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects ε in transitions', () => {
    const epsilonTransition = {
      states: ['q0', 'q1'],
      alphabet: ['a'],
      startStates: ['q0'],
      transitions: {
        q0: { ε: ['q1'] },
      },
    };
    const result = validateNFA(epsilonTransition);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('does not use ε-transitions'))).toBe(true);
  });

  it('rejects missing start states', () => {
    const missingStart = {
      states: ['q0'],
      alphabet: ['a'],
      transitions: {},
    };
    expect(validateNFA(missingStart).valid).toBe(false);
  });
});

describe('validateEpsilonNFA', () => {
  it('allows ε transitions and multiple start states', () => {
    const epsilonNfa = {
      states: ['q0', 'q1', 'q2'],
      alphabet: ['a'],
      startStates: ['q0', 'q1'],
      acceptStates: ['q2'],
      transitions: {
        q0: { ε: ['q1', 'q2'] },
      },
    };
    const result = validateEpsilonNFA(epsilonNfa);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
