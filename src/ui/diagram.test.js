import { describe, expect, it } from 'vitest';
import { renderAutomatonDiagram } from './diagram.js';

describe('renderAutomatonDiagram', () => {
  it('renders state nodes, accept rings, and transition labels', () => {
    const container = document.createElement('div');
    const result = renderAutomatonDiagram(container, {
      states: ['q0', 'q1'],
      alphabet: ['0', '1'],
      startState: 'q0',
      acceptStates: ['q1'],
      transitions: {
        q0: { 0: 'q0', 1: 'q1' },
        q1: { 0: 'q0', 1: 'q1' },
      },
    });

    expect(result).toEqual({ stateCount: 2, edgeCount: 4 });
    expect(container.querySelectorAll('.diagram__state')).toHaveLength(2);
    expect(container.querySelectorAll('.diagram__accept-ring')).toHaveLength(1);
    expect(container.textContent).toContain('q0');
    expect(container.textContent).toContain('1');
  });

  it('renders one edge for each NFA target in a branching cell', () => {
    const container = document.createElement('div');
    const result = renderAutomatonDiagram(container, {
      states: ['q0', 'q1', 'q2'],
      alphabet: ['a'],
      startState: 'q0',
      acceptStates: ['q2'],
      transitions: {
        q0: { a: ['q1', 'q2'] },
      },
    });

    expect(result.edgeCount).toBe(2);
    expect(container.textContent).toContain('a');
  });

  it('shows an empty prompt when no states exist', () => {
    const container = document.createElement('div');
    const result = renderAutomatonDiagram(container, {
      states: [],
      alphabet: [],
      startState: '',
      acceptStates: [],
      transitions: {},
    });

    expect(result).toEqual({ stateCount: 0, edgeCount: 0 });
    expect(container.textContent).toContain('Add states');
  });
});
