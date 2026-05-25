import { describe, it, expect } from 'vitest';
import { DFA } from './dfa.js';
import { ValidationError, EvaluationError } from './errors.js';

const endsInOne = () =>
  new DFA({
    states: ['q0', 'q1'],
    alphabet: ['0', '1'],
    transitions: {
      q0: { 0: 'q0', 1: 'q1' },
      q1: { 0: 'q0', 1: 'q1' },
    },
    startState: 'q0',
    acceptStates: ['q1'],
  });

describe('DFA construction & validation', () => {
  it('rejects empty states', () => {
    expect(
      () =>
        new DFA({
          states: [],
          alphabet: ['a'],
          transitions: {},
          startState: 'q0',
          acceptStates: [],
        })
    ).toThrow(ValidationError);
  });

  it('rejects empty alphabet', () => {
    expect(
      () =>
        new DFA({
          states: ['q0'],
          alphabet: [],
          transitions: {},
          startState: 'q0',
          acceptStates: [],
        })
    ).toThrow(ValidationError);
  });

  it('rejects ε in alphabet', () => {
    expect(
      () =>
        new DFA({
          states: ['q0'],
          alphabet: ['ε'],
          transitions: {},
          startState: 'q0',
          acceptStates: [],
        })
    ).toThrow(/ε/);
  });

  it('rejects startState not in states', () => {
    expect(
      () =>
        new DFA({
          states: ['q0'],
          alphabet: ['a'],
          transitions: {},
          startState: 'qx',
          acceptStates: [],
        })
    ).toThrow(ValidationError);
  });

  it('rejects accept state not in states', () => {
    expect(
      () =>
        new DFA({
          states: ['q0'],
          alphabet: ['a'],
          transitions: {},
          startState: 'q0',
          acceptStates: ['qx'],
        })
    ).toThrow(ValidationError);
  });

  it('rejects transition with unknown symbol', () => {
    expect(
      () =>
        new DFA({
          states: ['q0'],
          alphabet: ['a'],
          transitions: { q0: { b: 'q0' } },
          startState: 'q0',
          acceptStates: [],
        })
    ).toThrow(/not in the alphabet/);
  });

  it('rejects transition with unknown target', () => {
    expect(
      () =>
        new DFA({
          states: ['q0'],
          alphabet: ['a'],
          transitions: { q0: { a: 'qx' } },
          startState: 'q0',
          acceptStates: [],
        })
    ).toThrow(/not a declared state/);
  });

  it('accepts a valid construction', () => {
    expect(() => endsInOne()).not.toThrow();
  });
});

describe('DFA evaluation: "ends in 1"', () => {
  const dfa = endsInOne();

  it.each([
    ['', false],
    ['0', false],
    ['1', true],
    ['11', true],
    ['10', false],
    ['1011', true],
    ['1010', false],
    ['11111', true],
  ])('accepts(%j) === %j', (input, expected) => {
    expect(dfa.accepts(input)).toBe(expected);
  });

  it('throws on symbol outside alphabet', () => {
    expect(() => dfa.accepts('012')).toThrow(EvaluationError);
  });

  it('throws on non-string input', () => {
    expect(() => dfa.accepts(101)).toThrow(EvaluationError);
  });
});

describe('DFA evaluation: partial (incomplete) DFA', () => {
  const dfa = new DFA({
    states: ['q0', 'q1', 'q2'],
    alphabet: ['a', 'b'],
    transitions: {
      q0: { a: 'q1' },
      q1: { b: 'q2' },
    },
    startState: 'q0',
    acceptStates: ['q2'],
  });

  it('rejects when no transition exists (treated as dead)', () => {
    expect(dfa.accepts('aa')).toBe(false);
  });

  it('accepts the lone accepting word', () => {
    expect(dfa.accepts('ab')).toBe(true);
  });

  it('isComplete() returns false', () => {
    expect(dfa.isComplete()).toBe(false);
  });
});

describe('DFA evaluation: complete DFA', () => {
  it('isComplete() returns true', () => {
    expect(endsInOne().isComplete()).toBe(true);
  });
});

describe('DFA.trace', () => {
  it('returns step-by-step path for accepted input', () => {
    const result = endsInOne().trace('101');
    expect(result.accepted).toBe(true);
    expect(result.finalState).toBe('q1');
    expect(result.steps.map((s) => s.state)).toEqual(['q0', 'q1', 'q0', 'q1']);
  });

  it('returns rejection reason for invalid symbol mid-string', () => {
    const result = endsInOne().trace('1x0');
    expect(result.accepted).toBe(false);
    expect(result.rejectedAt).toBe(1);
    expect(result.reason).toMatch(/not in alphabet/);
  });

  it('returns rejection reason for missing transition', () => {
    const dfa = new DFA({
      states: ['q0', 'q1'],
      alphabet: ['a', 'b'],
      transitions: { q0: { a: 'q1' } },
      startState: 'q0',
      acceptStates: ['q1'],
    });
    const result = dfa.trace('ab');
    expect(result.accepted).toBe(false);
    expect(result.reason).toMatch(/no transition/);
  });
});

describe('DFA edge cases', () => {
  it('handles a DFA that accepts only the empty string', () => {
    const dfa = new DFA({
      states: ['q0', 'q1'],
      alphabet: ['a'],
      transitions: { q0: { a: 'q1' }, q1: { a: 'q1' } },
      startState: 'q0',
      acceptStates: ['q0'],
    });
    expect(dfa.accepts('')).toBe(true);
    expect(dfa.accepts('a')).toBe(false);
  });

  it('handles multiple accept states', () => {
    const dfa = new DFA({
      states: ['q0', 'q1', 'q2'],
      alphabet: ['a'],
      transitions: { q0: { a: 'q1' }, q1: { a: 'q2' }, q2: { a: 'q0' } },
      startState: 'q0',
      acceptStates: ['q1', 'q2'],
    });
    expect(dfa.accepts('')).toBe(false);
    expect(dfa.accepts('a')).toBe(true);
    expect(dfa.accepts('aa')).toBe(true);
    expect(dfa.accepts('aaa')).toBe(false);
  });

  it('detects unreachable states', () => {
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
    expect([...dfa.reachableStates()].sort()).toEqual(['q0', 'q1']);
  });

  it('round-trips through JSON', () => {
    const original = endsInOne();
    const restored = DFA.fromJSON(original.toJSON());
    expect(restored.accepts('1011')).toBe(true);
    expect(restored.accepts('1010')).toBe(false);
  });
});
