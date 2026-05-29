import { ValidationError, EvaluationError } from './errors.js';

export const EPSILON = 'ε';

function asSet(values, label) {
  if (!Array.isArray(values) && !(values instanceof Set)) {
    throw new ValidationError(`${label} must be an array or Set`);
  }
  const set = new Set(values);
  if (set.size === 0) throw new ValidationError(`${label} must not be empty`);
  for (const v of set) {
    if (typeof v !== 'string' || v.length === 0) {
      throw new ValidationError(`${label} entries must be non-empty strings`);
    }
  }
  return set;
}

export class DFA {
  constructor({ states, alphabet, transitions, startState, acceptStates }) {
    this.states = asSet(states, 'states');
    this.alphabet = asSet(alphabet, 'alphabet');

    if (this.alphabet.has(EPSILON)) {
      throw new ValidationError(`alphabet must not contain ε (use NFA for epsilon transitions)`);
    }

    if (typeof startState !== 'string' || !this.states.has(startState)) {
      throw new ValidationError(`startState "${startState}" must be one of the states`);
    }
    this.startState = startState;

    const accept = new Set(acceptStates ?? []);
    for (const s of accept) {
      if (!this.states.has(s)) {
        throw new ValidationError(`accept state "${s}" is not a declared state`);
      }
    }
    this.acceptStates = accept;

    this.transitions = this.#normalizeTransitions(transitions);
  }

  #normalizeTransitions(transitions) {
    if (!transitions || typeof transitions !== 'object') {
      throw new ValidationError('transitions must be an object: { state: { symbol: nextState } }');
    }
    const normalized = new Map();
    for (const [from, symbolMap] of Object.entries(transitions)) {
      if (!this.states.has(from)) {
        throw new ValidationError(`transition source "${from}" is not a declared state`);
      }
      if (!symbolMap || typeof symbolMap !== 'object') {
        throw new ValidationError(`transitions["${from}"] must be an object of { symbol: state }`);
      }
      const row = new Map();
      for (const [symbol, to] of Object.entries(symbolMap)) {
        if (!this.alphabet.has(symbol)) {
          throw new ValidationError(`symbol "${symbol}" on state "${from}" is not in the alphabet`);
        }
        if (typeof to === 'string' && to.includes(',')) {
          throw new ValidationError(
            `DFA allows only one transition per state-symbol pair. δ(${from}, ${symbol}) has multiple targets.`
          );
        }
        if (!this.states.has(to)) {
          throw new ValidationError(
            `transition target "${to}" (from ${from} on ${symbol}) is not a declared state`
          );
        }
        row.set(symbol, to);
      }
      normalized.set(from, row);
    }
    return normalized;
  }

  isComplete() {
    for (const state of this.states) {
      const row = this.transitions.get(state);
      if (!row) return false;
      for (const symbol of this.alphabet) {
        if (!row.has(symbol)) return false;
      }
    }
    return true;
  }

  step(state, symbol) {
    if (!this.states.has(state)) {
      throw new EvaluationError(`unknown state "${state}"`);
    }
    if (!this.alphabet.has(symbol)) {
      throw new EvaluationError(`symbol "${symbol}" is not in the alphabet`);
    }
    return this.transitions.get(state)?.get(symbol);
  }

  accepts(input) {
    if (typeof input !== 'string') {
      throw new EvaluationError('input must be a string');
    }
    let current = this.startState;
    const symbols = [...input];
    for (let i = 0; i < symbols.length; i += 1) {
      const symbol = symbols[i];
      if (!this.alphabet.has(symbol)) {
        throw new EvaluationError(`symbol "${symbol}" at position ${i} is not in the alphabet`);
      }
      const next = this.transitions.get(current)?.get(symbol);
      if (next === undefined) {
        return false;
      }
      current = next;
    }
    return this.acceptStates.has(current);
  }

  trace(input) {
    if (typeof input !== 'string') {
      throw new EvaluationError('input must be a string');
    }
    const steps = [{ index: 0, state: this.startState, symbol: null }];
    let current = this.startState;
    const symbols = [...input];
    for (let i = 0; i < symbols.length; i += 1) {
      const symbol = symbols[i];
      if (!this.alphabet.has(symbol)) {
        return {
          accepted: false,
          rejectedAt: i,
          reason: `symbol "${symbol}" not in alphabet`,
          steps,
        };
      }
      const next = this.transitions.get(current)?.get(symbol);
      if (next === undefined) {
        return {
          accepted: false,
          rejectedAt: i,
          reason: `no transition from ${current} on ${symbol}`,
          steps,
        };
      }
      current = next;
      steps.push({ index: i + 1, state: current, symbol });
    }
    return {
      accepted: this.acceptStates.has(current),
      finalState: current,
      steps,
    };
  }

  reachableStates() {
    const reachable = new Set([this.startState]);
    const queue = [this.startState];
    while (queue.length) {
      const s = queue.shift();
      const row = this.transitions.get(s);
      if (!row) continue;
      for (const next of row.values()) {
        if (!reachable.has(next)) {
          reachable.add(next);
          queue.push(next);
        }
      }
    }
    return reachable;
  }

  toJSON() {
    const transitions = {};
    for (const [from, row] of this.transitions) {
      transitions[from] = Object.fromEntries(row);
    }
    return {
      type: 'DFA',
      states: [...this.states],
      alphabet: [...this.alphabet],
      transitions,
      startState: this.startState,
      acceptStates: [...this.acceptStates],
    };
  }

  static fromJSON(json) {
    return new DFA({
      states: json.states,
      alphabet: json.alphabet,
      transitions: json.transitions,
      startState: json.startState,
      acceptStates: json.acceptStates,
    });
  }
}
