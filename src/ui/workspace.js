import {
  DFA,
  NFA,
  nfaToDfa,
  minimizeDfa,
  EPSILON,
  ValidationError,
  EvaluationError,
} from '../engine/index.js';
import { renderAutomatonDiagram } from './diagram.js';
import { renderIcons } from './icons.js';
import { analyzeAutomaton, formatSet, plural } from './inspector.js';
import { parseList, parseTargets, EXAMPLES } from './parse.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const TYPES = ['DFA', 'NFA', 'EPSILON_NFA'];
const TYPE_NAMES = {
  DFA: 'Deterministic finite automaton',
  NFA: 'Non-deterministic finite automaton',
  EPSILON_NFA: 'Non-deterministic finite automaton with ε-transitions',
};
const MAX_BATCH_CASES = 40;

const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

const inputLabel = (input) => (input === '' ? 'ε' : input);
const formatSetHtml = (values) => escapeHtml(formatSet(values));
const batchText = (inputs = []) => inputs.map(inputLabel).join('\n');

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
    origin: null,
    provenance: null,
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
    diagram: $('#automaton-diagram'),
    diagramStatus: $('#diagram-status'),
    definitionStatus: $('#definition-status'),
    test: $('#input-test'),
    actionTest: $('#action-test'),
    actionConvert: $('#action-convert'),
    actionMinimize: $('#action-minimize'),
    actionSave: $('#action-save'),
    actionNew: $('#action-new'),
    actionExample: $('#action-example'),
    provenancePanel: $('#provenance-panel'),
    provenanceTitle: $('#provenance-title'),
    provenanceMeta: $('#provenance-meta'),
    provenanceDetail: $('#provenance-detail'),
    provenanceList: $('#provenance-list'),
    testResult: $('#test-result'),
    testResultChip: $('#test-result-chip'),
    testResultInput: $('#test-result-input'),
    testResultDetail: $('#test-result-detail'),
    testTrace: $('#test-trace'),
    batch: $('#input-batch'),
    actionBatch: $('#action-batch'),
    batchResults: $('#batch-results'),
    batchStatus: $('#batch-status'),
    generalError: $('#general-error'),
    inspectorSummary: $('#inspector-summary'),
    inspectorStats: $('#inspector-stats'),
    inspectorList: $('#inspector-list'),
    libraryList: $('#library-list'),
    libraryEmpty: $('#library-empty'),
    libraryCount: $('#library-count'),
    signOut: $('#sign-out'),
    userEmail: $('#user-email'),
    onboarding: $('#empty-onboarding'),
    onboardingExample: $('#onboarding-example'),
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

  function pruneTransitionsForCurrentShape() {
    const states = new Set(state.states);
    const symbols = new Set(symbolsForCurrentType());
    const next = {};
    for (const fromState of state.states) {
      const row = state.transitions[fromState];
      if (!row) continue;
      const kept = {};
      for (const symbol of Object.keys(row)) {
        if (states.has(fromState) && symbols.has(symbol)) kept[symbol] = row[symbol];
      }
      if (Object.keys(kept).length > 0) next[fromState] = kept;
    }
    state.transitions = next;
  }

  function clearProvenance() {
    state.origin = null;
    state.provenance = null;
    renderProvenance();
  }

  function renderProvenance() {
    if (!els.provenancePanel) return;
    if (!state.origin || !state.provenance) {
      els.provenancePanel.hidden = true;
      els.provenanceList.innerHTML = '';
      return;
    }

    const entries = Object.entries(state.origin);
    els.provenancePanel.hidden = false;
    els.provenanceTitle.textContent = state.provenance.title;
    els.provenanceMeta.textContent = plural(entries.length, 'state');
    els.provenanceDetail.textContent = state.provenance.detail;
    els.provenanceList.innerHTML = entries
      .map(
        ([label, members]) => `
          <li>
            <code>${escapeHtml(label)}</code>
            <span>${formatSetHtml(members)}</span>
          </li>
        `
      )
      .join('');
  }

  function renderDiagram() {
    if (!els.diagram) return;
    const result = renderAutomatonDiagram(els.diagram, {
      states: state.states,
      alphabet: state.alphabet,
      startState: state.startState,
      acceptStates: state.acceptStates,
      transitions: state.transitions,
    });
    els.diagramStatus.textContent =
      result.stateCount === 0
        ? 'No graph yet'
        : `${plural(result.stateCount, 'state')}, ${plural(result.edgeCount, 'edge')}`;
  }

  function renderInspector() {
    if (!els.inspectorSummary) return;
    const report = analyzeAutomaton({ ...state, symbols: symbolsForCurrentType() });
    const summaryTone = report.problemCount > 0 ? 'problem' : report.warnCount > 0 ? 'warn' : 'ok';
    els.inspectorSummary.className = `inspector__summary inspector__summary--${summaryTone}`;
    els.inspectorSummary.textContent =
      summaryTone === 'problem'
        ? plural(report.problemCount, 'issue')
        : summaryTone === 'warn'
          ? plural(report.warnCount, 'warning')
          : 'Ready';

    const filledLabel = report.possibleCells
      ? `${report.filledCells}/${report.possibleCells}`
      : `${report.filledCells}`;
    els.inspectorStats.innerHTML = `
      <span><strong>${report.stateCount}</strong> Q</span>
      <span><strong>${report.symbolCount}</strong> Σ</span>
      <span><strong>${filledLabel}</strong> δ</span>
    `;
    els.inspectorList.innerHTML = report.entries
      .map(
        (entry) => `
          <li class="inspector__item inspector__item--${entry.severity}">
            <span class="inspector__mark">${entry.severity === 'ok' ? '✓' : entry.severity === 'note' ? '·' : '!'}</span>
            <span>${escapeHtml(entry.text)}</span>
          </li>
        `
      )
      .join('');
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

  function renderOnboarding() {
    if (!els.onboarding) return;
    const isEmpty = state.states.length === 0 && state.alphabet.length === 0;
    els.onboarding.hidden = !isEmpty;
  }

  function renderTable() {
    renderOnboarding();
    const symbols = symbolsForCurrentType();
    if (state.states.length === 0 || state.alphabet.length === 0) {
      els.transitionEmpty.hidden = false;
      els.transitionWrap.hidden = true;
      els.tableStatus.textContent = state.states.length === 0 ? 'No states yet' : 'No alphabet yet';
      renderEyebrow();
      renderInspector();
      renderDiagram();
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
        input.placeholder = '—';
        input.setAttribute('aria-label', `δ(${fromState}, ${symbol})`);
        input.title =
          state.type === 'DFA'
            ? `Next state from ${fromState} on ${symbol}`
            : `Target states from ${fromState} on ${symbol}, comma-separated`;
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
    renderInspector();
    renderDiagram();
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

  function friendlyError(message) {
    const text = String(message);
    if (text.includes('alphabet must not') && text.includes('ε')) {
      return 'Σ: do not include ε in the alphabet. Switch to ε-NFA when you need ε-transitions.';
    }
    if (text.startsWith('startState')) {
      return 'q₀: choose exactly one start state that already appears in Q.';
    }
    if (text.startsWith('accept state')) {
      return 'F: every accept state must already appear in Q.';
    }
    if (text.startsWith('transition target')) {
      return 'δ: every transition target must be a declared state in Q.';
    }
    if (text.includes('is not in the alphabet')) {
      return `input: ${text}. Check Σ or edit the test string.`;
    }
    if (text.startsWith('transitions must')) {
      return 'δ: add states and symbols first, then fill the transition table.';
    }
    return text;
  }

  function showError(message) {
    els.generalError.textContent = `error: ${friendlyError(message)}`;
    els.generalError.style.display = 'block';
  }
  function clearError() {
    els.generalError.style.display = 'none';
    els.generalError.textContent = '';
  }

  function clearDecisionOutputs({ clearInputs = false } = {}) {
    els.testResult.hidden = true;
    els.testTrace.hidden = true;
    els.testTrace.innerHTML = '';
    els.batchResults.hidden = true;
    els.batchResults.innerHTML = '';
    els.batchStatus.textContent = '';
    if (clearInputs) {
      els.test.value = '';
      els.batch.value = '';
    }
  }

  function dfaTraceDetail(trace) {
    if (trace.accepted) return `Halted in ${trace.finalState} ∈ F`;
    if (trace.reason) return trace.reason;
    return trace.finalState ? `Halted in ${trace.finalState} ∉ F` : 'Halted outside F';
  }

  function nfaTraceDetail(trace) {
    if (trace.reason) return trace.reason;
    return trace.accepted
      ? `Frontier ${formatSet(trace.finalStates)} intersects F`
      : `Frontier ${formatSet(trace.finalStates)} misses F`;
  }

  function renderTraceMarkup(trace) {
    if (!trace?.steps?.length) return '';
    const usesFrontier = Array.isArray(trace.steps[0].states);
    if (usesFrontier) {
      return trace.steps
        .map((step, i) => {
          const stateMarkup = `<span class="state state--set">${formatSetHtml(step.states)}</span>`;
          if (i === 0) return `<span class="trace__caption">ε*</span>${stateMarkup}`;
          const title = `move: ${formatSet(step.moveStates)}; ε-closure: ${formatSet(step.states)}`;
          return `<span class="arrow" title="${escapeHtml(title)}">—${escapeHtml(step.symbol)}→</span>${stateMarkup}`;
        })
        .join('');
    }

    return trace.steps
      .map((step, i) =>
        i === 0
          ? `<span class="state">${escapeHtml(step.state)}</span>`
          : `<span class="arrow">—${escapeHtml(step.symbol)}→</span><span class="state">${escapeHtml(step.state)}</span>`
      )
      .join('');
  }

  function renderTestResult({ accepted, input, detail, trace }) {
    els.testResult.hidden = false;
    els.testResultInput.textContent = input === '' ? 'ε  (empty string)' : `"${input}"`;
    els.testResultChip.className = accepted
      ? 'pill pill--accept-result'
      : 'pill pill--reject-result';
    els.testResultChip.textContent = accepted ? 'accepted' : 'rejected';
    els.testResultDetail.textContent = detail ?? '';
    if (trace?.steps && trace.steps.length > 0) {
      els.testTrace.hidden = false;
      els.testTrace.innerHTML = renderTraceMarkup(trace);
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
          detail: dfaTraceDetail(t),
          trace: { steps: t.steps },
        });
      } else {
        const t = automaton.trace(input);
        renderTestResult({
          accepted: t.accepted,
          input,
          detail: nfaTraceDetail(t),
          trace: t,
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

  function batchInputs() {
    return els.batch.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => (line === EPSILON ? '' : line));
  }

  function decideWithTrace(automaton, input) {
    if (state.type === 'DFA' && automaton instanceof DFA) {
      const trace = automaton.trace(input);
      return {
        input,
        accepted: trace.accepted,
        detail: dfaTraceDetail(trace),
      };
    }
    const trace = automaton.trace(input);
    return {
      input,
      accepted: trace.accepted,
      detail: nfaTraceDetail(trace),
    };
  }

  function renderBatchResults(results) {
    els.batchResults.hidden = results.length === 0;
    els.batchStatus.textContent = results.length ? plural(results.length, 'case') : '';
    els.batchResults.innerHTML = results.length
      ? `
        <table class="batch__table">
          <thead>
            <tr>
              <th>input</th>
              <th>verdict</th>
              <th>detail</th>
            </tr>
          </thead>
          <tbody>
            ${results
              .map(
                (result) => `
                  <tr>
                    <td><code>${escapeHtml(inputLabel(result.input))}</code></td>
                    <td>
                      <span class="pill ${result.accepted ? 'pill--accept-result' : 'pill--reject-result'}">
                        ${result.accepted ? 'accepted' : 'rejected'}
                      </span>
                    </td>
                    <td>${escapeHtml(result.detail)}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      `
      : '';
  }

  function runBatch() {
    clearError();
    try {
      const inputs = batchInputs();
      if (inputs.length === 0) {
        renderBatchResults([]);
        els.batchStatus.textContent = 'No strings';
        return;
      }
      if (inputs.length > MAX_BATCH_CASES) {
        showError(`batch is limited to ${MAX_BATCH_CASES} strings`);
        return;
      }
      const automaton = buildAutomaton();
      renderBatchResults(inputs.map((input) => decideWithTrace(automaton, input)));
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
      loadFromDefinition(
        {
          ...dfa.toJSON(),
          name: `${state.name || 'NFA'} → DFA`,
          origin: dfa.origin,
          provenance: {
            title: 'Subset construction',
            detail: 'Each DFA state is the ε-closure subset of source NFA states it represents.',
          },
        },
        'DFA'
      );
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
      loadFromDefinition(
        {
          ...min.toJSON(),
          name: `${state.name || 'DFA'} (minimal)`,
          origin: min.origin,
          provenance: {
            title: 'Minimization classes',
            detail:
              'Each minimized state is an equivalence class after unreachable states are removed.',
          },
        },
        'DFA'
      );
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
    state.origin = def.origin ?? null;
    state.provenance =
      def.provenance ??
      (def.origin
        ? {
            title: 'State origin',
            detail: 'Generated states are shown with the source states they represent.',
          }
        : null);
    els.batch.value = batchText(def.tests ?? []);
    writeDefinitionToForm();
    renderTable();
    renderProvenance();
    clearDecisionOutputs();
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
    clearDecisionOutputs({ clearInputs: true });
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
            <button class="library__remove" data-action="delete" aria-label="Delete ${escapeHtml(item.name)}">
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
      if (state.origin && state.provenance) {
        definition.origin = state.origin;
        definition.provenance = state.provenance;
      }
      const tests = batchInputs();
      if (tests.length > 0) definition.tests = tests;
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
    tab.addEventListener('click', () => {
      setType(tab.dataset.type);
      clearProvenance();
      clearDecisionOutputs();
      renderInspector();
    });
  });

  function debounce(fn, delay) {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      return fn;
    }
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  const handleFormInput = debounce(() => {
    readDefinitionFromForm();
    pruneTransitionsForCurrentShape();
    clearProvenance();
    clearDecisionOutputs();
    renderTable();
  }, 200);

  ['name', 'states', 'alphabet', 'start', 'accept'].forEach((field) => {
    els[field].addEventListener('input', handleFormInput);
  });

  const handleTableInput = debounce(() => {
    readTableFromInputs();
    clearProvenance();
    clearDecisionOutputs();
    renderInspector();
    renderDiagram();
  }, 200);

  els.transitionTable.addEventListener('input', (event) => {
    if (!event.target.matches('input[data-symbol]')) return;
    handleTableInput();
  });

  els.actionTest.addEventListener('click', runTest);
  els.test.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runTest();
  });
  els.actionBatch.addEventListener('click', runBatch);
  els.batch.addEventListener('input', () => {
    els.batchStatus.textContent = '';
  });
  els.actionConvert.addEventListener('click', convertToDfa);
  els.actionMinimize.addEventListener('click', minimize);
  els.actionSave.addEventListener('click', saveCurrent);
  els.actionNew.addEventListener('click', newAutomaton);
  els.actionExample.addEventListener('click', loadExample);
  els.onboardingExample?.addEventListener('click', loadExample);
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
