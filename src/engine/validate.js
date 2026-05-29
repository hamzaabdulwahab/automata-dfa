import { EPSILON } from './dfa.js';

/**
 * Validate an automaton definition for the given mode.
 * @param {'DFA'|'NFA'|'EPSILON_NFA'} mode
 * @param {object} definition - { states, alphabet, startState?, startStates?, acceptStates, transitions }
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateAutomaton(mode, definition) {
  if (!definition || typeof definition !== 'object') {
    return { valid: false, errors: ['Definition must be an object'], warnings: [] };
  }
  switch (mode) {
    case 'DFA':
      return validateDFA(definition);
    case 'NFA':
      return validateNFA(definition);
    case 'EPSILON_NFA':
      return validateEpsilonNFA(definition);
    default:
      return { valid: false, errors: [`Unknown mode: ${mode}`], warnings: [] };
  }
}

// Shared validator helper
function runSharedChecks(definition, allowEpsilon) {
  const errors = [];
  const warnings = [];

  // Check states
  const states = definition.states;
  if (!states || (!Array.isArray(states) && !(states instanceof Set))) {
    errors.push('states must be an array or Set');
  } else {
    const statesSet = new Set(states);
    if (statesSet.size === 0) {
      errors.push('states must not be empty');
    }
    for (const s of statesSet) {
      if (typeof s !== 'string' || s.length === 0) {
        errors.push('states entries must be non-empty strings');
      }
    }
  }

  // Check alphabet
  const alphabet = definition.alphabet;
  if (!alphabet || (!Array.isArray(alphabet) && !(alphabet instanceof Set))) {
    errors.push('alphabet must be an array or Set');
  } else {
    const alphabetSet = new Set(alphabet);
    if (alphabetSet.size === 0) {
      errors.push('alphabet must not be empty');
    }
    for (const sym of alphabetSet) {
      if (typeof sym !== 'string' || sym.length === 0) {
        errors.push('alphabet entries must be non-empty strings');
      }
      if (sym === EPSILON) {
        errors.push('alphabet must not literally contain ε; epsilon transitions are implicit');
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings, statesSet: new Set(), alphabetSet: new Set() };
  }

  const statesSet = new Set(states);
  const alphabetSet = new Set(alphabet);

  // Check acceptStates
  const acceptStates = definition.acceptStates;
  if (acceptStates !== undefined && acceptStates !== null) {
    if (!Array.isArray(acceptStates) && !(acceptStates instanceof Set)) {
      errors.push('acceptStates must be an array or Set');
    } else {
      const acceptSet = new Set(acceptStates);
      if (acceptSet.size === 0) {
        warnings.push('This automaton has no final states, so it cannot accept any string.');
      } else {
        for (const s of acceptSet) {
          if (!statesSet.has(s)) {
            errors.push(`accept state "${s}" is not a declared state`);
          }
        }
      }
    }
  } else {
    warnings.push('This automaton has no final states, so it cannot accept any string.');
  }

  return { valid: true, errors, warnings, statesSet, alphabetSet };
}

export function validateDFA(definition) {
  const shared = runSharedChecks(definition, false);
  if (!shared.valid) {
    return { valid: false, errors: shared.errors, warnings: shared.warnings };
  }
  const { errors, warnings, statesSet, alphabetSet } = shared;

  // DFA startState validation
  const startState = definition.startState;
  const startStates = definition.startStates;
  if (startStates !== undefined && startStates !== null) {
    const startSet = new Set(startStates);
    if (startSet.size > 1) {
      errors.push('DFA needs exactly one start state.');
    } else if (startSet.size === 1) {
      const singleStart = [...startSet][0];
      if (!statesSet.has(singleStart)) {
        errors.push(`startState "${singleStart}" must be one of the states`);
      }
    } else {
      errors.push('DFA needs exactly one start state.');
    }
  } else {
    if (typeof startState !== 'string' || !statesSet.has(startState)) {
      errors.push(`startState "${startState}" must be one of the states`);
    }
  }

  // Transitions validation
  const transitions = definition.transitions;
  if (transitions && typeof transitions === 'object') {
    for (const [from, symbolMap] of Object.entries(transitions)) {
      if (!statesSet.has(from)) {
        errors.push(`transition source "${from}" is not a declared state`);
        continue;
      }
      if (!symbolMap || typeof symbolMap !== 'object') {
        errors.push(`transitions["${from}"] must be an object`);
        continue;
      }
      for (const [symbol, to] of Object.entries(symbolMap)) {
        if (symbol === EPSILON) {
          errors.push('DFA does not support ε-transitions.');
        } else if (!alphabetSet.has(symbol)) {
          errors.push(`symbol "${symbol}" on state "${from}" is not in the alphabet`);
        }
        if (typeof to === 'string') {
          if (to.includes(',')) {
            errors.push(
              `DFA allows only one transition per state-symbol pair. δ(${from}, ${symbol}) has multiple targets.`
            );
          } else if (!statesSet.has(to)) {
            errors.push(
              `transition target "${to}" (from ${from} on ${symbol}) is not a declared state`
            );
          }
        } else {
          errors.push(
            `DFA allows only one transition per state-symbol pair. Transition target on ${symbol} from state ${from} must be a single string.`
          );
        }
      }
    }

    // Warning if incomplete
    let incomplete = false;
    for (const state of statesSet) {
      const row = transitions[state];
      if (!row) {
        incomplete = true;
        break;
      }
      for (const symbol of alphabetSet) {
        if (row[symbol] === undefined) {
          incomplete = true;
          break;
        }
      }
      if (incomplete) break;
    }
    if (incomplete) {
      warnings.push(
        'Transition table is incomplete. Missing transitions will act as implicit rejection.'
      );
    }
  } else if (transitions !== undefined) {
    errors.push('transitions must be an object');
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateNFA(definition) {
  return validateNFAOrEpsilonNFA(definition, false);
}

export function validateEpsilonNFA(definition) {
  return validateNFAOrEpsilonNFA(definition, true);
}

function validateNFAOrEpsilonNFA(definition, allowEpsilon) {
  const shared = runSharedChecks(definition, allowEpsilon);
  if (!shared.valid) {
    return { valid: false, errors: shared.errors, warnings: shared.warnings };
  }
  const { errors, warnings, statesSet, alphabetSet } = shared;

  // NFA startStates validation
  const startStates = definition.startStates;
  const startState = definition.startState;
  const actualStartStates = new Set();

  if (startStates !== undefined && startStates !== null) {
    if (!Array.isArray(startStates) && !(startStates instanceof Set)) {
      errors.push('startStates must be an array or Set');
    } else {
      for (const s of startStates) {
        if (typeof s !== 'string' || !statesSet.has(s)) {
          errors.push(`startState "${s}" must be one of the states`);
        } else {
          actualStartStates.add(s);
        }
      }
    }
  } else if (startState !== undefined && startState !== null) {
    if (typeof startState !== 'string' || !statesSet.has(startState)) {
      errors.push(`startState "${startState}" must be one of the states`);
    } else {
      actualStartStates.add(startState);
    }
  }

  if (actualStartStates.size === 0 && errors.length === 0) {
    errors.push('At least one start state must be specified');
  }

  // Transitions validation
  const transitions = definition.transitions;
  if (transitions && typeof transitions === 'object') {
    for (const [from, symbolMap] of Object.entries(transitions)) {
      if (!statesSet.has(from)) {
        errors.push(`transition source "${from}" is not a declared state`);
        continue;
      }
      if (!symbolMap || typeof symbolMap !== 'object') {
        errors.push(`transitions["${from}"] must be an object`);
        continue;
      }
      for (const [symbol, targets] of Object.entries(symbolMap)) {
        if (symbol === EPSILON) {
          if (!allowEpsilon) {
            errors.push('NFA mode does not use ε-transitions. Use ε-NFA mode for epsilon moves.');
          }
        } else if (!alphabetSet.has(symbol)) {
          errors.push(`symbol "${symbol}" on state "${from}" is not in the alphabet`);
        }

        const list = Array.isArray(targets) ? targets : [targets];
        for (const t of list) {
          if (typeof t !== 'string' || !statesSet.has(t)) {
            errors.push(
              `transition target "${t}" (from ${from} on ${symbol}) is not a declared state`
            );
          }
        }
      }
    }
  } else if (transitions !== undefined) {
    errors.push('transitions must be an object');
  }

  return { valid: errors.length === 0, errors, warnings };
}
