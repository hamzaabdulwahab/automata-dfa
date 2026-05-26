import { ValidationError, EvaluationError } from './errors.js';
import { EPSILON } from './dfa.js';

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

function sorted(set) {
  return [...set].sort();
}

/**
 * NFA — also supports ε-NFA when transitions include the ε symbol.
 * transitions shape: { state: { symbol: [nextState, ...] } }
 */
export class NFA {
  constructor({ states, alphabet, transitions, startState, acceptStates, allowEpsilon = true }) {
    this.states = asSet(states, 'states');
    this.alphabet = asSet(alphabet, 'alphabet');
    this.allowEpsilon = Boolean(allowEpsilon);

    if (this.alphabet.has(EPSILON)) {
      throw new ValidationError(
        `alphabet must not literally contain ε; epsilon transitions are implicit`
      );
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

    this.transitions = this.#normalize(transitions);
    this.hasEpsilon = this.#detectEpsilon();
  }

  #normalize(transitions) {
    if (!transitions || typeof transitions !== 'object') {
      throw new ValidationError('transitions must be { state: { symbol: [nextStates] } }');
    }
    const normalized = new Map();
    for (const [from, symbolMap] of Object.entries(transitions)) {
      if (!this.states.has(from)) {
        throw new ValidationError(`transition source "${from}" is not a declared state`);
      }
      if (!symbolMap || typeof symbolMap !== 'object') {
        throw new ValidationError(`transitions["${from}"] must be an object`);
      }
      const row = new Map();
      for (const [symbol, targets] of Object.entries(symbolMap)) {
        if (symbol !== EPSILON && !this.alphabet.has(symbol)) {
          throw new ValidationError(`symbol "${symbol}" on state "${from}" is not in the alphabet`);
        }
        if (symbol === EPSILON && !this.allowEpsilon) {
          throw new ValidationError(`epsilon transitions are not allowed on this NFA`);
        }
        const list = Array.isArray(targets) ? targets : [targets];
        const set = new Set();
        for (const t of list) {
          if (!this.states.has(t)) {
            throw new ValidationError(
              `transition target "${t}" (from ${from} on ${symbol}) is not a declared state`
            );
          }
          set.add(t);
        }
        row.set(symbol, set);
      }
      normalized.set(from, row);
    }
    return normalized;
  }

  #detectEpsilon() {
    for (const row of this.transitions.values()) {
      if (row.has(EPSILON) && row.get(EPSILON).size > 0) return true;
    }
    return false;
  }

  /** ε-closure of a single state. */
  epsilonClosure(state) {
    return this.epsilonClosureOfSet(new Set([state]));
  }

  /** ε-closure of a set of states. */
  epsilonClosureOfSet(states) {
    const closure = new Set(states);
    const stack = [...states];
    while (stack.length) {
      const s = stack.pop();
      const epsTargets = this.transitions.get(s)?.get(EPSILON);
      if (!epsTargets) continue;
      for (const t of epsTargets) {
        if (!closure.has(t)) {
          closure.add(t);
          stack.push(t);
        }
      }
    }
    return closure;
  }

  /** Move: set of states reachable from `states` on a single symbol (no epsilon). */
  move(states, symbol) {
    if (!this.alphabet.has(symbol)) {
      throw new EvaluationError(`symbol "${symbol}" is not in the alphabet`);
    }
    const result = new Set();
    for (const s of states) {
      const targets = this.transitions.get(s)?.get(symbol);
      if (targets) {
        for (const t of targets) result.add(t);
      }
    }
    return result;
  }

  accepts(input) {
    if (typeof input !== 'string') {
      throw new EvaluationError('input must be a string');
    }
    let current = this.epsilonClosure(this.startState);
    const symbols = [...input];
    for (let i = 0; i < symbols.length; i += 1) {
      const symbol = symbols[i];
      if (!this.alphabet.has(symbol)) {
        throw new EvaluationError(`symbol "${symbol}" at position ${i} is not in the alphabet`);
      }
      const moved = this.move(current, symbol);
      current = this.epsilonClosureOfSet(moved);
      if (current.size === 0) return false;
    }
    for (const s of current) {
      if (this.acceptStates.has(s)) return true;
    }
    return false;
  }

  trace(input) {
    if (typeof input !== 'string') {
      throw new EvaluationError('input must be a string');
    }

    let current = this.epsilonClosure(this.startState);
    const steps = [
      {
        index: 0,
        symbol: null,
        states: sorted(current),
      },
    ];

    const symbols = [...input];
    for (let i = 0; i < symbols.length; i += 1) {
      const symbol = symbols[i];
      if (!this.alphabet.has(symbol)) {
        return {
          accepted: false,
          rejectedAt: i,
          reason: `symbol "${symbol}" not in alphabet`,
          finalStates: sorted(current),
          steps,
        };
      }

      const before = current;
      const moved = this.move(before, symbol);
      current = this.epsilonClosureOfSet(moved);
      steps.push({
        index: i + 1,
        symbol,
        fromStates: sorted(before),
        moveStates: sorted(moved),
        states: sorted(current),
      });

      if (current.size === 0) {
        return {
          accepted: false,
          rejectedAt: i,
          reason: `no computation paths remain after "${symbol}" at position ${i}`,
          finalStates: [],
          steps,
        };
      }
    }

    return {
      accepted: sorted(current).some((s) => this.acceptStates.has(s)),
      finalStates: sorted(current),
      steps,
    };
  }

  toJSON() {
    const transitions = {};
    for (const [from, row] of this.transitions) {
      transitions[from] = {};
      for (const [symbol, targets] of row) {
        transitions[from][symbol] = [...targets];
      }
    }
    return {
      type: this.hasEpsilon ? 'ε-NFA' : 'NFA',
      states: [...this.states],
      alphabet: [...this.alphabet],
      transitions,
      startState: this.startState,
      acceptStates: [...this.acceptStates],
    };
  }

  static fromJSON(json) {
    return new NFA({
      states: json.states,
      alphabet: json.alphabet,
      transitions: json.transitions,
      startState: json.startState,
      acceptStates: json.acceptStates,
    });
  }
}
