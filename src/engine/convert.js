import { DFA } from './dfa.js';

function setKey(set) {
  return [...set].sort().join(',');
}

function setLabel(set) {
  if (set.size === 0) return '∅';
  return `{${[...set].sort().join('+')}}`;
}

/**
 * Subset construction: convert any NFA (with or without ε-transitions) to an equivalent DFA.
 * The resulting DFA is total (every state has every symbol defined), with a dedicated dead
 * state ∅ for unreachable subsets, and it preserves the original NFA's language.
 */
export function nfaToDfa(nfa) {
  const alphabet = [...nfa.alphabet];
  const startClosure = nfa.epsilonClosure(nfa.startState);
  const startKey = setKey(startClosure);

  // Map subset-key -> { label, sourceStates: Set<originalState> }
  const subsets = new Map();
  subsets.set(startKey, { label: setLabel(startClosure), source: startClosure });

  const transitions = {};
  const queue = [startClosure];
  const acceptStates = [];

  while (queue.length) {
    const subset = queue.shift();
    const fromKey = setKey(subset);
    const fromLabel = subsets.get(fromKey).label;
    transitions[fromLabel] = transitions[fromLabel] ?? {};

    // Mark as accepting if any member is accepting
    for (const s of subset) {
      if (nfa.acceptStates.has(s)) {
        if (!acceptStates.includes(fromLabel)) acceptStates.push(fromLabel);
        break;
      }
    }

    for (const symbol of alphabet) {
      const moved = nfa.move(subset, symbol);
      const closed = nfa.epsilonClosureOfSet(moved);
      const toKey = setKey(closed);
      if (!subsets.has(toKey)) {
        subsets.set(toKey, { label: setLabel(closed), source: closed });
        queue.push(closed);
      }
      transitions[fromLabel][symbol] = subsets.get(toKey).label;
    }
  }

  const states = [...subsets.values()].map((v) => v.label);

  return new DFA({
    states,
    alphabet,
    transitions,
    startState: subsets.get(startKey).label,
    acceptStates,
  });
}

/**
 * Hopcroft-style partition refinement minimization.
 * Removes unreachable states first, then merges equivalent states.
 * Returns a new minimized DFA that accepts the same language.
 */
export function minimizeDfa(dfa) {
  // 1. Remove unreachable states
  const reachable = dfa.reachableStates();
  const states = [...reachable];

  // 2. Initial partition: accept vs non-accept
  const accept = new Set();
  const nonAccept = new Set();
  for (const s of states) {
    if (dfa.acceptStates.has(s)) accept.add(s);
    else nonAccept.add(s);
  }

  let partitions = [accept, nonAccept].filter((p) => p.size > 0);

  // Helper: find which partition index contains a given state (or -1 if absent — dead transition)
  const partitionOf = (state) => {
    if (state === undefined) return -1;
    for (let i = 0; i < partitions.length; i += 1) {
      if (partitions[i].has(state)) return i;
    }
    return -1;
  };

  let changed = true;
  while (changed) {
    changed = false;
    const next = [];
    for (const group of partitions) {
      // Split this group by its outgoing signatures
      const bySignature = new Map();
      for (const state of group) {
        const sig = [];
        for (const symbol of dfa.alphabet) {
          const target = dfa.transitions.get(state)?.get(symbol);
          sig.push(partitionOf(target));
        }
        const key = sig.join('|');
        if (!bySignature.has(key)) bySignature.set(key, new Set());
        bySignature.get(key).add(state);
      }
      if (bySignature.size === 1) {
        next.push(group);
      } else {
        for (const sub of bySignature.values()) next.push(sub);
        changed = true;
      }
    }
    partitions = next;
  }

  // 3. Build the minimized DFA — one new state per partition.
  // Label each partition: use the original start-state's group label as start, otherwise use sorted members.
  const labelOf = new Map(); // partition index -> label
  partitions.forEach((group, idx) => {
    const sorted = [...group].sort();
    labelOf.set(idx, sorted.length === 1 ? sorted[0] : `[${sorted.join('+')}]`);
  });

  const stateToPartition = new Map();
  partitions.forEach((group, idx) => {
    for (const s of group) stateToPartition.set(s, idx);
  });

  const newStartIdx = stateToPartition.get(dfa.startState);
  const newAccept = new Set();
  partitions.forEach((group, idx) => {
    for (const s of group) {
      if (dfa.acceptStates.has(s)) {
        newAccept.add(labelOf.get(idx));
        break;
      }
    }
  });

  const newTransitions = {};
  partitions.forEach((group, idx) => {
    const representative = [...group][0];
    const fromLabel = labelOf.get(idx);
    newTransitions[fromLabel] = {};
    for (const symbol of dfa.alphabet) {
      const target = dfa.transitions.get(representative)?.get(symbol);
      const targetIdx = stateToPartition.get(target);
      if (targetIdx !== undefined) {
        newTransitions[fromLabel][symbol] = labelOf.get(targetIdx);
      }
    }
  });

  return new DFA({
    states: [...labelOf.values()],
    alphabet: [...dfa.alphabet],
    transitions: newTransitions,
    startState: labelOf.get(newStartIdx),
    acceptStates: [...newAccept],
  });
}
