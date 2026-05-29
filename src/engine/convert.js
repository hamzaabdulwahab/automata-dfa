import { DFA } from './dfa.js';

function setKey(set) {
  return [...set].sort().join(',');
}

/**
 * Generate a short, readable label for the n-th generated state.
 * Index 0 → A, 1 → B, ..., 25 → Z, 26 → A1, 27 → B1, ...
 * Stays compact for the usual case (<26 states) and predictable beyond it.
 */
function letterLabel(index) {
  const letter = String.fromCharCode(65 + (index % 26));
  const suffix = Math.floor(index / 26);
  return suffix === 0 ? letter : `${letter}${suffix}`;
}

/**
 * Subset construction: convert any NFA (with or without ε-transitions) to an equivalent DFA.
 * The resulting DFA is total (every state has every symbol defined), with a dedicated dead
 * state ∅ for unreachable subsets, and it preserves the original NFA's language.
 *
 * Generated states are named A, B, C, ... — short and readable. The original subset
 * for each name is available on dfa.toJSON().origin[label] (e.g. { A: ['q0'], B: ['q0','q1'] }).
 */
export function nfaToDfa(nfa) {
  const alphabet = [...nfa.alphabet];
  const startClosure = nfa.epsilonClosureOfSet(nfa.startStates);
  const startKey = setKey(startClosure);

  // subset-key -> { label, source: Set<originalState> }
  const subsets = new Map();
  let labelCounter = 0;
  subsets.set(startKey, { label: letterLabel(labelCounter++), source: startClosure });

  const transitions = {};
  const queue = [startClosure];
  const acceptStates = [];

  while (queue.length) {
    const subset = queue.shift();
    const fromKey = setKey(subset);
    const fromLabel = subsets.get(fromKey).label;
    transitions[fromLabel] = transitions[fromLabel] ?? {};

    // Accepting if any member is accepting in the source NFA
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
        subsets.set(toKey, { label: letterLabel(labelCounter++), source: closed });
        queue.push(closed);
      }
      transitions[fromLabel][symbol] = subsets.get(toKey).label;
    }
  }

  const states = [...subsets.values()].map((v) => v.label);
  const origin = {};
  for (const { label, source } of subsets.values()) {
    origin[label] = source.size === 0 ? ['∅'] : [...source].sort();
  }

  const dfa = new DFA({
    states,
    alphabet,
    transitions,
    startState: subsets.get(startKey).label,
    acceptStates,
  });
  dfa.origin = origin;
  return dfa;
}

/**
 * Hopcroft-style partition refinement minimization.
 * Removes unreachable states first, then merges equivalent states.
 * Returns a new minimized DFA that accepts the same language.
 *
 * The resulting states are renamed A, B, C, ... for legibility. The original
 * member states for each name are available on dfa.origin[label].
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

  // 3. Build the minimized DFA — one new state per partition, labelled A, B, C...
  //    Sort partitions so the start state's partition comes first (so it becomes A).
  const startPartitionIdx = partitions.findIndex((p) => p.has(dfa.startState));
  if (startPartitionIdx > 0) {
    const [start] = partitions.splice(startPartitionIdx, 1);
    partitions.unshift(start);
  }

  const labelOf = new Map(); // partition index -> label
  const origin = {};
  partitions.forEach((group, idx) => {
    const label = letterLabel(idx);
    labelOf.set(idx, label);
    origin[label] = [...group].sort();
  });

  const stateToPartition = new Map();
  partitions.forEach((group, idx) => {
    for (const s of group) stateToPartition.set(s, idx);
  });

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

  const result = new DFA({
    states: [...labelOf.values()],
    alphabet: [...dfa.alphabet],
    transitions: newTransitions,
    startState: labelOf.get(0),
    acceptStates: [...newAccept],
  });
  result.origin = origin;
  return result;
}
