import { describe, expect, it } from 'vitest';
import { analyzeAutomaton, formatSet } from './inspector.js';

describe('analyzeAutomaton', () => {
  it('reports a coherent complete DFA as ready', () => {
    const report = analyzeAutomaton({
      type: 'DFA',
      states: ['q0', 'q1'],
      alphabet: ['0', '1'],
      startState: 'q0',
      acceptStates: ['q1'],
      transitions: {
        q0: { 0: 'q0', 1: 'q1' },
        q1: { 0: 'q0', 1: 'q1' },
      },
    });

    expect(report.problemCount).toBe(0);
    expect(report.warnCount).toBe(0);
    expect(report.entries.map((entry) => entry.severity)).toContain('ok');
  });

  it('warns for partial and unreachable DFA structure', () => {
    const report = analyzeAutomaton({
      type: 'DFA',
      states: ['q0', 'q1', 'q2'],
      alphabet: ['a', 'b'],
      startState: 'q0',
      acceptStates: ['q1'],
      transitions: {
        q0: { a: 'q1' },
        q2: { a: 'q2', b: 'q2' },
      },
    });

    expect(report.warnCount).toBeGreaterThan(0);
    expect(report.entries.some((entry) => entry.text.includes('partial'))).toBe(true);
    expect(report.entries.some((entry) => entry.text.includes('Unreachable'))).toBe(true);
  });

  it('counts branching and epsilon transitions for ε-NFAs', () => {
    const report = analyzeAutomaton({
      type: 'EPSILON_NFA',
      states: ['s', 'a', 'b'],
      alphabet: ['a', 'b'],
      startState: 's',
      acceptStates: ['b'],
      transitions: {
        s: { ε: ['a', 'b'] },
        a: { a: ['a'], b: ['b'] },
      },
    });

    expect(report.entries.some((entry) => entry.text.includes('branching'))).toBe(true);
    expect(report.entries.some((entry) => entry.text.includes('ε-transition'))).toBe(true);
  });

  it('explains common beginner definition mistakes', () => {
    const report = analyzeAutomaton({
      type: 'DFA',
      states: ['q0', 'q1'],
      alphabet: ['ab'],
      startState: 'q0',
      acceptStates: ['q1'],
      transitions: {
        q0: { ab: 'q0, q1' },
      },
    });

    expect(report.entries.some((entry) => entry.text.includes('one character at a time'))).toBe(
      true
    );
    expect(report.entries.some((entry) => entry.text.includes('multiple targets'))).toBe(true);
  });
});

describe('formatSet', () => {
  it('uses ∅ for an empty set and sorts non-empty values', () => {
    expect(formatSet([])).toBe('∅');
    expect(formatSet(['q2', 'q0', 'q1'])).toBe('{q0, q1, q2}');
  });
});
