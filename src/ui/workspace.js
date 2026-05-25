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

export function createWorkspace({ storage, user, onSignOut }) {
  const state = {
    type: 'DFA',
    name: '',
    states: [],
    alphabet: [],
    startState: '',
    acceptStates: [],
    /** transitions: Record<state, Record<symbol, string | string[]>>
     *  For DFA we keep strings, for NFA/ε-NFA we keep string[].
     */
    transitions: {},
    activeId: null,
  };

  // ----------- DOM cache -----------
  const els = {
    name: $('#input-name'),
    nameDisplay: $('#automaton-name-display'),
    states: $('#input-states'),
    alphabet: $('#input-alphabet'),
    start: $('#input-start'),
    accept: $('#input-accept'),
    hintEpsilon: $('#hint-epsilon'),
    transitionEmpty: $('#transition-empty'),
    transitionWrap: $('#transition-wrap'),
    transitionTable: $('#transition-table'),
    transitionHint: $('#transition-hint'),
    tableStatusText: $('#table-status-text'),
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
    els.hintEpsilon.classList.toggle('hidden', type !== 'EPSILON_NFA');
    els.actionConvert.classList.toggle('hidden', type === 'DFA');
    els.actionMinimize.classList.toggle('hidden', type !== 'DFA');
    if (resetTransitions && !wasSameType) {
      state.transitions = {};
    }
    renderTable();
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
      if (Object.keys(symMap).length > 0) {
        transitions[fromState] = symMap;
      }
    }
    state.transitions = transitions;
  }

  function symbolsForCurrentType() {
    const base = [...state.alphabet];
    if (state.type === 'EPSILON_NFA') base.push(EPSILON);
    return base;
  }

  function renderTable() {
    const symbols = symbolsForCurrentType();
    if (state.states.length === 0 || state.alphabet.length === 0) {
      els.transitionEmpty.classList.remove('hidden');
      els.transitionWrap.classList.add('hidden');
      els.tableStatusText.textContent =
        state.states.length === 0 ? 'No states yet' : 'No alphabet yet';
      return;
    }
    els.transitionEmpty.classList.add('hidden');
    els.transitionWrap.classList.remove('hidden');

    const thead = $('thead', els.transitionTable);
    const headRow = document.createElement('tr');
    headRow.innerHTML = `<th class="px-3 py-2 text-left font-medium" style="color: var(--color-ink-muted)">State \\ Symbol</th>`;
    for (const symbol of symbols) {
      const th = document.createElement('th');
      th.className = 'px-3 py-2 text-left font-mono text-xs font-medium';
      th.style.color = 'var(--color-ink-muted)';
      th.textContent = symbol;
      headRow.appendChild(th);
    }
    thead.innerHTML = '';
    thead.appendChild(headRow);

    const tbody = $('tbody', els.transitionTable);
    tbody.innerHTML = '';
    for (const fromState of state.states) {
      const row = document.createElement('tr');
      row.dataset.rowState = fromState;
      row.className = 'border-t';
      row.style.borderColor = 'var(--color-border)';
      const labelCell = document.createElement('td');
      labelCell.className = 'px-3 py-2 align-top font-mono text-sm font-medium';
      const isStart = fromState === state.startState;
      const isAccept = state.acceptStates.includes(fromState);
      labelCell.innerHTML = `
        <div class="flex items-center gap-1.5">
          <span>${escapeHtml(fromState)}</span>
          ${isStart ? '<span class="chip chip-accent text-[10px] !py-0.5">start</span>' : ''}
          ${isAccept ? '<span class="chip chip-success text-[10px] !py-0.5">accept</span>' : ''}
        </div>`;
      row.appendChild(labelCell);

      for (const symbol of symbols) {
        const td = document.createElement('td');
        td.className = 'px-2 py-1.5 align-top';
        const input = document.createElement('input');
        input.className = 'input input-mono text-xs !py-1.5 min-w-[80px]';
        input.dataset.symbol = symbol;
        input.placeholder = state.type === 'DFA' ? '—' : symbol === EPSILON ? 'q1, q2' : '—';
        const existing = state.transitions[fromState]?.[symbol];
        if (Array.isArray(existing)) input.value = existing.join(', ');
        else if (existing) input.value = existing;
        td.appendChild(input);
        row.appendChild(td);
      }
      tbody.appendChild(row);
    }

    els.tableStatusText.textContent = `${state.states.length} state${state.states.length === 1 ? '' : 's'} × ${symbols.length} symbol${symbols.length === 1 ? '' : 's'}`;
  }

  function escapeHtml(s) {
    return String(s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
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
    els.generalError.textContent = message;
    els.generalError.style.background = 'var(--color-danger-soft)';
    els.generalError.style.color = 'oklch(0.4 0.2 25)';
    els.generalError.style.border = '1px solid oklch(0.85 0.08 25)';
    els.generalError.classList.remove('hidden');
  }

  function clearError() {
    els.generalError.classList.add('hidden');
    els.generalError.textContent = '';
  }

  function renderTestResult({ accepted, input, detail, trace }) {
    els.testResult.classList.remove('hidden');
    els.testResultInput.textContent = input === '' ? 'ε (empty string)' : `"${input}"`;
    els.testResultChip.className = accepted ? 'chip chip-success' : 'chip chip-danger';
    els.testResultChip.innerHTML = accepted
      ? '<i data-lucide="check" style="font-size: 13px"></i>Accepted'
      : '<i data-lucide="x" style="font-size: 13px"></i>Rejected';
    els.testResultDetail.textContent = detail ?? '';
    if (trace?.steps) {
      els.testTrace.classList.remove('hidden');
      els.testTrace.innerHTML = trace.steps
        .map((s, i) =>
          i === 0
            ? `<span class="chip text-[11px]">${escapeHtml(s.state)}</span>`
            : `<span class="mx-1.5" style="color: var(--color-ink-subtle)">—${escapeHtml(s.symbol)}→</span><span class="chip text-[11px]">${escapeHtml(s.state)}</span>`
        )
        .join('');
    } else {
      els.testTrace.classList.add('hidden');
      els.testTrace.innerHTML = '';
    }
    renderIcons(els.testResult);
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
            ? `Ended in ${t.finalState}`
            : t.reason
              ? `Rejected: ${t.reason}`
              : `Ended in non-accepting state`,
          trace: { steps: t.steps },
        });
      } else {
        const accepted = automaton.accepts(input);
        renderTestResult({
          accepted,
          input,
          detail: accepted ? 'Some computation path accepts.' : 'No path accepts.',
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
      flashStatus('Converted to equivalent DFA');
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
      loadFromDefinition({ ...min.toJSON(), name: `${state.name || 'DFA'} (minimized)` }, 'DFA');
      flashStatus(`Minimized to ${min.states.size} state${min.states.size === 1 ? '' : 's'}`);
    } catch (err) {
      showError(err?.message ?? 'Minimization failed');
    }
  }

  function flashStatus(message) {
    els.definitionStatus.innerHTML = `<i data-lucide="check" style="font-size: 13px"></i><span>${escapeHtml(message)}</span>`;
    els.definitionStatus.classList.add('chip-success');
    els.definitionStatus.classList.remove('chip');
    renderIcons(els.definitionStatus);
    setTimeout(() => {
      els.definitionStatus.className = 'chip';
      els.definitionStatus.innerHTML =
        '<i data-lucide="circle-help" style="font-size: 13px"></i><span>Edit fields below</span>';
      renderIcons(els.definitionStatus);
    }, 2500);
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
    els.testResult.classList.add('hidden');
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
      els.libraryEmpty.classList.remove('hidden');
      els.libraryList.innerHTML = '';
      return;
    }
    els.libraryEmpty.classList.add('hidden');
    els.libraryList.innerHTML = items
      .map(
        (item) => `
        <div class="group flex items-center gap-2 rounded-[10px] px-3 py-2 transition-colors hover:bg-[color:var(--color-surface-2)]" data-item="${item.id}">
          <button class="flex-1 text-left" data-action="load">
            <span class="block text-sm font-medium truncate">${escapeHtml(item.name)}</span>
            <span class="block text-[11px]" style="color: var(--color-ink-subtle)">
              ${escapeHtml(item.definition.type ?? 'DFA')} · ${item.definition.states?.length ?? 0} states · ${new Date(item.updatedAt).toLocaleDateString()}
            </span>
          </button>
          <button class="icon-btn opacity-0 group-hover:opacity-100" data-action="delete" aria-label="Delete">
            <i data-lucide="trash-2" style="font-size: 14px"></i>
          </button>
        </div>`
      )
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
        showError('Name your automaton before saving.');
        return;
      }
      const definition = automaton.toJSON();
      const saved = await storage.save(user.id, {
        id: state.activeId,
        name: state.name,
        definition,
      });
      state.activeId = saved.id;
      flashStatus('Saved');
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
    els.userEmail.classList.remove('hidden');
  }

  // Initial state — load the DFA example so the UI isn't blank
  loadExample();
  refreshLibrary();
  renderIcons();

  return { refreshLibrary };
}
