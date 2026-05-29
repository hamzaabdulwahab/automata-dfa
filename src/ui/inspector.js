import { EPSILON } from '../engine/index.js';

export const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

export const sorted = (values) => [...values].sort();

export function formatSet(values) {
  const list = sorted(values ?? []);
  return list.length ? `{${list.join(', ')}}` : '∅';
}

function duplicates(values) {
  const seen = new Set();
  const dupes = new Set();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return [...dupes];
}

function transitionTargets(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value) return [value];
  return [];
}

function countFilledTransitions(definition, symbols) {
  let count = 0;
  for (const fromState of definition.states) {
    const row = definition.transitions[fromState] ?? {};
    for (const symbol of symbols) {
      const value = row[symbol];
      if (Array.isArray(value) ? value.length > 0 : Boolean(value)) count += 1;
    }
  }
  return count;
}

function reachableStates(definition) {
  const declared = new Set(definition.states);
  const startSet = new Set();

  if (definition.type === 'DFA' || !definition.startStates) {
    if (definition.startState && declared.has(definition.startState)) {
      startSet.add(definition.startState);
    }
  } else if (definition.startStates) {
    for (const s of definition.startStates) {
      if (declared.has(s)) startSet.add(s);
    }
  }

  if (startSet.size === 0) return new Set();

  const reachable = new Set(startSet);
  const queue = [...startSet];
  while (queue.length) {
    const from = queue.shift();
    const row = definition.transitions[from] ?? {};
    for (const value of Object.values(row)) {
      for (const target of transitionTargets(value)) {
        if (declared.has(target) && !reachable.has(target)) {
          reachable.add(target);
          queue.push(target);
        }
      }
    }
  }
  return reachable;
}

function statesThatCanReachAccept(definition) {
  const declared = new Set(definition.states);
  const reverse = new Map(definition.states.map((s) => [s, new Set()]));
  for (const from of definition.states) {
    const row = definition.transitions[from] ?? {};
    for (const value of Object.values(row)) {
      for (const target of transitionTargets(value)) {
        if (declared.has(target)) reverse.get(target)?.add(from);
      }
    }
  }

  const productive = new Set(definition.acceptStates.filter((s) => declared.has(s)));
  const queue = [...productive];
  while (queue.length) {
    const stateName = queue.shift();
    for (const previous of reverse.get(stateName) ?? []) {
      if (!productive.has(previous)) {
        productive.add(previous);
        queue.push(previous);
      }
    }
  }
  return productive;
}

export function analyzeAutomaton(definition) {
  const symbols =
    definition.symbols ??
    (definition.type === 'EPSILON_NFA'
      ? [...definition.alphabet, EPSILON]
      : [...definition.alphabet]);
  const stateSet = new Set(definition.states);
  const alphabetSet = new Set(definition.alphabet);
  const entries = [];
  const add = (severity, text) => entries.push({ severity, text });

  if (definition.states.length === 0) add('problem', 'Q is empty. Add at least one state.');
  if (definition.alphabet.length === 0)
    add('problem', 'Σ is empty. Add at least one input symbol.');

  if (definition.type === 'DFA') {
    if (!definition.startState) {
      add('problem', 'q₀ is empty. Choose one declared start state.');
    } else if (!stateSet.has(definition.startState)) {
      add('problem', `q₀ = ${definition.startState} is not in Q.`);
    }
  } else {
    const startStates =
      definition.startStates || (definition.startState ? [definition.startState] : []);
    if (startStates.length === 0) {
      add('problem', 'S is empty. Choose at least one declared start state.');
    } else {
      const invalidStarts = startStates.filter((s) => !stateSet.has(s));
      if (invalidStarts.length > 0) {
        add('problem', `Start states contains undeclared states: ${invalidStarts.join(', ')}.`);
      }
    }
  }

  const duplicateStates = duplicates(definition.states);
  const duplicateSymbols = duplicates(definition.alphabet);
  if (duplicateStates.length)
    add('problem', `Duplicate state names: ${duplicateStates.join(', ')}.`);
  if (duplicateSymbols.length)
    add('problem', `Duplicate symbols in Σ: ${duplicateSymbols.join(', ')}.`);
  if (alphabetSet.has(EPSILON)) add('problem', 'Do not put ε in Σ. Use the ε-NFA type instead.');
  const multiSymbol = definition.alphabet.find((symbol) => [...symbol].length > 1);
  if (multiSymbol) {
    add('warn', `Σ contains "${multiSymbol}". The simulator reads input one character at a time.`);
  }

  const unknownAccept = definition.acceptStates.filter((s) => !stateSet.has(s));
  if (unknownAccept.length)
    add('problem', `F contains undeclared states: ${unknownAccept.join(', ')}.`);
  if (definition.acceptStates.length === 0)
    add('warn', 'This automaton has no final states, so it cannot accept any string.');

  const allowedSymbols = new Set(symbols);
  let unknownTargetCount = 0;
  for (const [from, row] of Object.entries(definition.transitions)) {
    if (!stateSet.has(from)) add('problem', `δ has a row for undeclared state ${from}.`);
    for (const [symbol, value] of Object.entries(row ?? {})) {
      if (!allowedSymbols.has(symbol))
        add('problem', `δ(${from}, ${symbol}) uses a symbol outside Σ.`);
      if (definition.type === 'DFA' && typeof value === 'string' && value.includes(',')) {
        add(
          'problem',
          `DFA allows only one transition per state-symbol pair. δ(${from}, ${symbol}) has multiple targets.`
        );
      }
      for (const target of transitionTargets(value)) {
        if (!stateSet.has(target)) unknownTargetCount += 1;
      }
    }
  }
  if (unknownTargetCount)
    add('problem', plural(unknownTargetCount, 'transition target') + ' outside Q.');

  const possibleCells = definition.states.length * symbols.length;
  const filledCells = countFilledTransitions(definition, symbols);
  if (definition.type === 'DFA' && possibleCells > 0 && filledCells < possibleCells) {
    add('warn', `DFA is partial: ${possibleCells - filledCells} δ cells are blank.`);
  }

  const reachable = reachableStates(definition);
  const startEmpty =
    definition.type === 'DFA'
      ? !definition.startState
      : !definition.startStates || definition.startStates.length === 0;

  const unreachable = definition.states.filter((s) => !startEmpty && !reachable.has(s));
  if (unreachable.length) {
    const fromLabel = definition.type === 'DFA' ? 'q₀' : 'S';
    add('warn', `Unreachable from ${fromLabel}: ${unreachable.join(', ')}.`);
  }

  const reachableAccepts = definition.acceptStates.filter((s) => reachable.has(s));
  if (definition.acceptStates.length > 0 && reachable.size > 0 && reachableAccepts.length === 0) {
    const startLabel = definition.type === 'DFA' ? 'q₀' : 'S';
    add('warn', `No accept state is reachable from ${startLabel}.`);
  }

  const productive = statesThatCanReachAccept(definition);
  const nonProductive = definition.states.filter(
    (s) => definition.acceptStates.length > 0 && !productive.has(s)
  );
  if (nonProductive.length && nonProductive.length < definition.states.length) {
    add('note', `No path to F from: ${nonProductive.join(', ')}.`);
  }

  if (definition.type !== 'DFA' && filledCells > 0) {
    let branchingCells = 0;
    let epsilonCells = 0;
    for (const row of Object.values(definition.transitions)) {
      for (const [symbol, value] of Object.entries(row ?? {})) {
        const targets = transitionTargets(value);
        if (targets.length > 1) branchingCells += 1;
        if (symbol === EPSILON) epsilonCells += 1;
      }
    }
    if (branchingCells) add('note', plural(branchingCells, 'branching δ cell'));
    if (epsilonCells) add('note', plural(epsilonCells, 'ε-transition'));
  }

  if (!entries.some((entry) => entry.severity === 'problem' || entry.severity === 'warn')) {
    add(
      'ok',
      definition.type === 'DFA'
        ? 'Coherent DFA. Ready to decide strings.'
        : definition.type === 'NFA'
          ? 'Coherent NFA. Blank cells mean no branch.'
          : 'Coherent ε-NFA. Ready to decide strings.'
    );
  }

  return {
    entries,
    stateCount: definition.states.length,
    symbolCount: symbols.length,
    filledCells,
    possibleCells,
    problemCount: entries.filter((entry) => entry.severity === 'problem').length,
    warnCount: entries.filter((entry) => entry.severity === 'warn').length,
  };
}
