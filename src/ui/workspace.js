import {
  DFA,
  NFA,
  nfaToDfa,
  minimizeDfa,
  EPSILON,
  ValidationError,
  EvaluationError,
} from '../engine/index.js';
import { renderIcons } from './icons.js';
import { parseList, parseTargets, EXAMPLES } from './parse.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const TYPES = ['DFA', 'NFA', 'EPSILON_NFA'];
const TYPE_NAMES = {
  DFA: 'Deterministic finite automaton',
  NFA: 'Non-deterministic finite automaton',
  EPSILON_NFA: 'Non-deterministic finite automaton with ε-transitions',
};

const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

export function createWorkspace({ storage, user, onSignOut }) {
  const state = {
    type: 'DFA',
    name: '',
    states: [],
    alphabet: [],
    startState: '',
    acceptStates: [],
    transitions: {},
    activeId: null,
  };

  const els = {
    name: $('#input-name'),
    nameDisplay: $('#automaton-name-display'),
    typeEyebrow: $('#type-eyebrow'),
    typeStats: $('#type-stats'),
    states: $('#input-states'),
    alphabet: $('#input-alphabet'),
    start: $('#input-start'),
    accept: $('#input-accept'),
    hintEpsilon: $('#hint-epsilon'),
    transitionEmpty: $('#transition-empty'),
    transitionWrap: $('#transition-wrap'),
    transitionTable: $('#transition-table'),
    tableStatus: $('#table-status'),
    definitionStatus: $('#definition-status'),
    test: $('#input-test'),
    actionTest: $('#action-test'),
    actionConvert: $('#action-convert'),
    actionMinimize: $('#action-minimize'),
    actionSave: $('#action-save'),
    actionNew: $('#action-new'),
    actionExample: $('#action-example'),
    testResult: $('#test-result'),
    testResultChip: $('#test-result-chip'),
    testResultInput: $('#test-result-input'),
    testResultDetail: $('#test-result-detail'),
    testTrace: $('#test-trace'),
    generalError: $('#general-error'),
    libraryList: $('#library-list'),
    libraryEmpty: $('#library-empty'),
    libraryCount: $('#library-count'),
    signOut: $('#sign-out'),
    userEmail: $('#user-email'),
  };

  function setType(type, { resetTransitions = true } = {}) {
    if (!TYPES.includes(type)) return;
    const wasSameType = state.type === type;
    state.type = type;
    $$('[role="tab"]').forEach((tab) => {
      tab.setAttribute('aria-selected', tab.dataset.type === type ? 'true' : 'false');
    });
    els.hintEpsilon.hidden = type !== 'EPSILON_NFA';
    els.actionConvert.hidden = type === 'DFA';
    els.actionMinimize.hidden = type !== 'DFA';
    if (resetTransitions && !wasSameType) state.transitions = {};
    renderTable();
    renderEyebrow();
  }

  function symbolsForCurrentType() {
    const base = [...state.alphabet];
    if (state.type === 'EPSILON_NFA') base.push(EPSILON);
    return base;
  }

  function renderEyebrow() {
    els.typeEyebrow.textContent = TYPE_NAMES[state.type];
    const symbols = symbolsForCurrentType();
    const sCount = state.states.length;
    const aCount = symbols.length;
    els.typeStats.textContent = `${sCount} state${sCount === 1 ? '' : 's'}, ${aCount} symbol${aCount === 1 ? '' : 's'}`;
  }

  function readDefinitionFromForm() {
    state.name = els.name.value.trim();
    state.states = parseList(els.states.value);
    state.alphabet = parseList(els.alphabet.value);
    state.startState = els.start.value.trim();
    state.acceptStates = parseList(els.accept.value);
    els.nameDisplay.textContent = state.name || 'Untitled automaton';
  }

  function writeDefinitionToForm() {
    els.name.value = state.name;
    els.states.value = state.states.join(', ');
    els.alphabet.value = state.alphabet.join(', ');
    els.start.value = state.startState;
    els.accept.value = state.acceptStates.join(', ');
    els.nameDisplay.textContent = state.name || 'Untitled automaton';
  }

  function readTableFromInputs() {
    const rows = $$('tr[data-row-state]', els.transitionTable);
    const transitions = {};
    for (const row of rows) {
      const fromState = row.dataset.rowState;
      const inputs = $$('input[data-symbol]', row);
      const symMap = {};
      for (const input of inputs) {
        const symbol = input.dataset.symbol;
        const raw = input.value.trim();
        if (!raw) continue;
        symMap[symbol] = state.type === 'DFA' ? raw : parseTargets(raw);
      }
      if (Object.keys(symMap).length > 0) transitions[fromState] = symMap;
    }
    state.transitions = transitions;
  }

  function renderTable() {
    const symbols = symbolsForCurrentType();
    if (state.states.length === 0 || state.alphabet.length === 0) {
      els.transitionEmpty.hidden = false;
      els.transitionWrap.hidden = true;
      els.tableStatus.textContent = state.states.length === 0 ? 'No states yet' : 'No alphabet yet';
      renderEyebrow();
      return;
    }
    els.transitionEmpty.hidden = true;
    els.transitionWrap.hidden = false;

    const thead = $('thead', els.transitionTable);
    const headRow = document.createElement('tr');
    const corner = document.createElement('th');
    corner.textContent = 'δ';
    corner.style.fontFamily = 'var(--font-mono)';
    corner.style.fontSize = '0.8125rem';
    corner.style.fontWeight = '500';
    corner.style.color = 'var(--color-ink-muted)';
    corner.style.textTransform = 'none';
    corner.style.letterSpacing = '0';
    headRow.appendChild(corner);
    for (const symbol of symbols) {
      const th = document.createElement('th');
      th.textContent = symbol;
      th.style.fontFamily = 'var(--font-mono)';
      th.style.textTransform = 'none';
      th.style.letterSpacing = '0';
      th.style.fontSize = '0.8125rem';
      th.style.color = 'var(--color-ink)';
      th.style.fontWeight = '500';
      headRow.appendChild(th);
    }
    thead.innerHTML = '';
    thead.appendChild(headRow);

    const tbody = $('tbody', els.transitionTable);
    tbody.innerHTML = '';
    for (const fromState of state.states) {
      const row = document.createElement('tr');
      row.dataset.rowState = fromState;
      const labelCell = document.createElement('td');
      labelCell.className = 'matrix__row-head';
      const isStart = fromState === state.startState;
      const isAccept = state.acceptStates.includes(fromState);
      const marks = [];
      if (isStart) marks.push('<span class="pill pill--start">start</span>');
      if (isAccept) marks.push('<span class="pill pill--accept">accept</span>');
      labelCell.innerHTML = `<span style="display:inline-flex; align-items:center; gap:8px">${escapeHtml(fromState)}${marks.length ? ' ' + marks.join(' ') : ''}</span>`;
      row.appendChild(labelCell);

      for (const symbol of symbols) {
        const td = document.createElement('td');
        const input = document.createElement('input');
        input.className = 'matrix__cell-input';
        input.dataset.symbol = symbol;
        input.placeholder = state.type === 'DFA' ? '∅' : symbol === EPSILON ? 'q1, q2' : '∅';
        const existing = state.transitions[fromState]?.[symbol];
        if (Array.isArray(existing)) input.value = existing.join(', ');
        else if (existing) input.value = existing;
        td.appendChild(input);
        row.appendChild(td);
      }
      tbody.appendChild(row);
    }

    els.tableStatus.textContent = `${state.states.length}×${symbols.length} cells`;
    renderEyebrow();
  }

  function buildAutomaton() {
    readDefinitionFromForm();
    readTableFromInputs();
    const def = {
      states: state.states,
      alphabet: state.alphabet,
      startState: state.startState,
      acceptStates: state.acceptStates,
      transitions: state.transitions,
    };
    if (state.type === 'DFA') return new DFA(def);
    return new NFA(def);
  }

  function showError(message) {
    els.generalError.textContent = `error: ${message}`;
    els.generalError.style.display = 'block';
  }
  function clearError() {
    els.generalError.style.display = 'none';
    els.generalError.textContent = '';
  }

  function renderTestResult({ accepted, input, detail, trace }) {
    els.testResult.hidden = false;
    els.testResultInput.textContent = input === '' ? 'ε  (empty string)' : `"${input}"`;
    els.testResultChip.className = accepted
      ? 'pill pill--accept-result'
      : 'pill pill--reject-result';
    els.testResultChip.textContent = accepted ? 'accepted' : 'rejected';
    els.testResultDetail.textContent = detail ?? '';
    if (trace?.steps && trace.steps.length > 1) {
      els.testTrace.hidden = false;
      els.testTrace.innerHTML = trace.steps
        .map((s, i) =>
          i === 0
            ? `<span class="state">${escapeHtml(s.state)}</span>`
            : `<span class="arrow">—${escapeHtml(s.symbol)}→</span><span class="state">${escapeHtml(s.state)}</span>`
        )
        .join('');
    } else {
      els.testTrace.hidden = true;
      els.testTrace.innerHTML = '';
    }
  }

  function runTest() {
    clearError();
    try {
      const automaton = buildAutomaton();
      const input = els.test.value;
      if (state.type === 'DFA' && automaton instanceof DFA) {
        const t = automaton.trace(input);
        renderTestResult({
          accepted: t.accepted,
          input,
          detail: t.accepted
            ? `Halted in ${t.finalState} ∈ F`
            : t.reason
              ? t.reason
              : `Halted outside F`,
          trace: { steps: t.steps },
        });
      } else {
        const accepted = automaton.accepts(input);
        renderTestResult({
          accepted,
          input,
          detail: accepted
            ? 'At least one computation path accepts.'
            : 'No computation path accepts.',
        });
      }
    } catch (err) {
      if (err instanceof ValidationError || err instanceof EvaluationError) {
        showError(err.message);
      } else {
        showError(err?.message ?? String(err));
      }
    }
  }

  function convertToDfa() {
    clearError();
    try {
      const nfa = buildAutomaton();
      if (state.type === 'DFA') return;
      const dfa = nfaToDfa(nfa);
      loadFromDefinition({ ...dfa.toJSON(), name: `${state.name || 'NFA'} → DFA` }, 'DFA');
      flashStatus('subset construction complete');
    } catch (err) {
      showError(err?.message ?? 'Conversion failed');
    }
  }

  function minimize() {
    clearError();
    try {
      const dfa = buildAutomaton();
      if (!(dfa instanceof DFA)) return;
      const min = minimizeDfa(dfa);
      loadFromDefinition({ ...min.toJSON(), name: `${state.name || 'DFA'} (minimal)` }, 'DFA');
      flashStatus(`minimized to ${min.states.size} state${min.states.size === 1 ? '' : 's'}`);
    } catch (err) {
      showError(err?.message ?? 'Minimization failed');
    }
  }

  let flashTimer = null;
  function flashStatus(message) {
    els.definitionStatus.textContent = message;
    els.definitionStatus.style.color = 'var(--color-accent)';
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      els.definitionStatus.textContent = '';
      els.definitionStatus.style.color = '';
    }, 2400);
  }

  function loadFromDefinition(def, type) {
    const resolvedType =
      type ?? (def.type === 'DFA' ? 'DFA' : def.type === 'ε-NFA' ? 'EPSILON_NFA' : 'NFA');
    setType(resolvedType, { resetTransitions: false });
    state.name = def.name ?? '';
    state.states = def.states ?? [];
    state.alphabet = (def.alphabet ?? []).filter((s) => s !== EPSILON);
    state.startState = def.startState ?? '';
    state.acceptStates = def.acceptStates ?? [];
    state.transitions = def.transitions ?? {};
    state.activeId = def.id ?? null;
    writeDefinitionToForm();
    renderTable();
  }

  function newAutomaton() {
    loadFromDefinition(
      {
        name: '',
        states: [],
        alphabet: [],
        startState: '',
        acceptStates: [],
        transitions: {},
      },
      state.type
    );
    els.test.value = '';
    els.testResult.hidden = true;
    clearError();
  }

  function loadExample() {
    const example = EXAMPLES[state.type];
    loadFromDefinition(example, state.type);
  }

  async function refreshLibrary() {
    const items = await storage.list(user.id);
    els.libraryCount.textContent = String(items.length);
    if (items.length === 0) {
      els.libraryEmpty.hidden = false;
      els.libraryList.innerHTML = '';
      return;
    }
    els.libraryEmpty.hidden = true;
    els.libraryList.innerHTML = items
      .map((item) => {
        const date = new Date(item.updatedAt);
        const stamp = `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
        return `
          <div class="library__item" data-item="${item.id}">
            <div style="min-width: 0; flex: 1">
              <button class="library__title" data-action="load">${escapeHtml(item.name)}</button>
              <div class="library__meta">
                ${escapeHtml(item.definition.type ?? 'DFA')} · ${item.definition.states?.length ?? 0}q · ${stamp}
              </div>
            </div>
            <button class="library__remove" data-action="delete" aria-label="Delete">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        `;
      })
      .join('');
    renderIcons(els.libraryList);

    $$('[data-item]', els.libraryList).forEach((node) => {
      const id = node.dataset.item;
      $('[data-action="load"]', node)?.addEventListener('click', async () => {
        const item = await storage.get(user.id, id);
        if (item) loadFromDefinition({ ...item.definition, id: item.id, name: item.name });
      });
      $('[data-action="delete"]', node)?.addEventListener('click', async () => {
        await storage.remove(user.id, id);
        await refreshLibrary();
      });
    });
  }

  async function saveCurrent() {
    clearError();
    try {
      const automaton = buildAutomaton();
      if (!state.name) {
        showError('name the automaton before saving');
        return;
      }
      const definition = automaton.toJSON();
      const saved = await storage.save(user.id, {
        id: state.activeId,
        name: state.name,
        definition,
      });
      state.activeId = saved.id;
      flashStatus('saved');
      await refreshLibrary();
    } catch (err) {
      showError(err?.message ?? 'Save failed');
    }
  }

  // ----------- wire events -----------
  $$('[role="tab"]').forEach((tab) => {
    tab.addEventListener('click', () => setType(tab.dataset.type));
  });

  ['name', 'states', 'alphabet', 'start', 'accept'].forEach((field) => {
    els[field].addEventListener('input', () => {
      readDefinitionFromForm();
      renderTable();
    });
  });

  els.actionTest.addEventListener('click', runTest);
  els.test.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runTest();
  });
  els.actionConvert.addEventListener('click', convertToDfa);
  els.actionMinimize.addEventListener('click', minimize);
  els.actionSave.addEventListener('click', saveCurrent);
  els.actionNew.addEventListener('click', newAutomaton);
  els.actionExample.addEventListener('click', loadExample);
  els.signOut.addEventListener('click', () => onSignOut?.());

  if (user?.primaryEmailAddress?.emailAddress) {
    els.userEmail.textContent = user.primaryEmailAddress.emailAddress;
    els.userEmail.hidden = false;
  }

  // Initial load
  loadExample();
  refreshLibrary();
  renderIcons();

  return { refreshLibrary };
}
