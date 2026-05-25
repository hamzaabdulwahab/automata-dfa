export function parseList(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseTargets(value) {
  return parseList(value);
}

export const EXAMPLES = {
  DFA: {
    name: 'Ends in 1',
    states: ['q0', 'q1'],
    alphabet: ['0', '1'],
    startState: 'q0',
    acceptStates: ['q1'],
    transitions: {
      q0: { 0: 'q0', 1: 'q1' },
      q1: { 0: 'q0', 1: 'q1' },
    },
  },
  NFA: {
    name: 'Contains 01',
    states: ['q0', 'q1', 'q2'],
    alphabet: ['0', '1'],
    startState: 'q0',
    acceptStates: ['q2'],
    transitions: {
      q0: { 0: ['q0', 'q1'], 1: ['q0'] },
      q1: { 1: ['q2'] },
      q2: { 0: ['q2'], 1: ['q2'] },
    },
  },
  EPSILON_NFA: {
    name: 'a*b (with ε)',
    states: ['s', 'a', 'b'],
    alphabet: ['a', 'b'],
    startState: 's',
    acceptStates: ['b'],
    transitions: {
      s: { ε: ['a'] },
      a: { a: ['a'], b: ['b'] },
    },
  },
};
