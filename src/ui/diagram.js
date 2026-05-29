const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

function transitionTargets(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value) return [value];
  return [];
}

function addText(parent, text, attrs = {}) {
  const node = svg('text', attrs);
  node.textContent = text;
  parent.appendChild(node);
  return node;
}

function pointsForStates(states) {
  if (states.length === 1) return new Map([[states[0], { x: 300, y: 170 }]]);

  const center = { x: 300, y: 175 };
  const rx = states.length <= 3 ? 140 : 210;
  const ry = states.length <= 3 ? 90 : 115;
  const points = new Map();
  states.forEach((state, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / states.length;
    points.set(state, {
      x: center.x + rx * Math.cos(angle),
      y: center.y + ry * Math.sin(angle),
    });
  });
  return points;
}

function collectEdges(definition) {
  const edges = new Map();
  const declared = new Set(definition.states);

  for (const [from, row] of Object.entries(definition.transitions ?? {})) {
    if (!declared.has(from)) continue;
    for (const [symbol, value] of Object.entries(row ?? {})) {
      for (const target of transitionTargets(value)) {
        if (!declared.has(target)) continue;
        const key = `${from}\u0000${target}`;
        if (!edges.has(key)) edges.set(key, { from, target, labels: [] });
        edges.get(key).labels.push(symbol);
      }
    }
  }

  return [...edges.values()].map((edge) => ({
    ...edge,
    label: [...new Set(edge.labels)].join(', '),
  }));
}

function drawEdge(root, edge, points, definition) {
  const from = points.get(edge.from);
  const to = points.get(edge.target);
  if (!from || !to) return;

  const isEdgeActive =
    definition.highlightEdges &&
    (Array.isArray(definition.highlightEdges)
      ? definition.highlightEdges.some((e) => e.from === edge.from && e.target === edge.target)
      : definition.highlightEdges instanceof Set
        ? definition.highlightEdges.has(`${edge.from}\u0000${edge.target}`)
        : false);

  let edgeClass = 'diagram__edge';
  if (isEdgeActive) edgeClass += ' diagram__edge--active';

  if (edge.from === edge.target) {
    root.appendChild(
      svg('path', {
        d: `M ${from.x - 16} ${from.y - 19} C ${from.x - 64} ${from.y - 78}, ${from.x + 64} ${from.y - 78}, ${from.x + 16} ${from.y - 19}`,
        class: edgeClass,
        markerEnd: 'url(#diagram-arrow)',
      })
    );
    addText(root, edge.label, {
      x: from.x,
      y: from.y - 76,
      class: 'diagram__label',
      textAnchor: 'middle',
    });
    return;
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.max(Math.hypot(dx, dy), 1);
  const nodeRadius = 23;
  const start = {
    x: from.x + (dx / distance) * nodeRadius,
    y: from.y + (dy / distance) * nodeRadius,
  };
  const end = {
    x: to.x - (dx / distance) * nodeRadius,
    y: to.y - (dy / distance) * nodeRadius,
  };
  const curve = Math.min(32, distance * 0.16);
  const mid = {
    x: (start.x + end.x) / 2 - (dy / distance) * curve,
    y: (start.y + end.y) / 2 + (dx / distance) * curve,
  };

  root.appendChild(
    svg('path', {
      d: `M ${start.x} ${start.y} Q ${mid.x} ${mid.y}, ${end.x} ${end.y}`,
      class: edgeClass,
      markerEnd: 'url(#diagram-arrow)',
    })
  );
  addText(root, edge.label, {
    x: mid.x,
    y: mid.y - 5,
    class: 'diagram__label',
    textAnchor: 'middle',
  });
}

function drawNode(root, state, point, definition) {
  const isStart =
    definition.type === 'DFA' || !definition.startStates
      ? state === definition.startState
      : definition.startStates.includes(state);
  const isAccept = definition.acceptStates.includes(state);
  const group = svg('g', { class: 'diagram__node' });

  if (isStart) {
    group.appendChild(
      svg('path', {
        d: `M ${point.x - 66} ${point.y} L ${point.x - 29} ${point.y}`,
        class: 'diagram__start-edge',
        markerEnd: 'url(#diagram-arrow)',
      })
    );
  }

  const isActive =
    definition.highlightStates &&
    (Array.isArray(definition.highlightStates)
      ? definition.highlightStates.includes(state)
      : definition.highlightStates instanceof Set
        ? definition.highlightStates.has(state)
        : definition.highlightStates === state);

  let stateClass = isAccept ? 'diagram__state diagram__state--accept' : 'diagram__state';
  if (isActive) {
    stateClass += ' diagram__state--active';
  }

  group.appendChild(
    svg('circle', {
      cx: point.x,
      cy: point.y,
      r: 24,
      class: stateClass,
    })
  );
  if (isAccept) {
    group.appendChild(
      svg('circle', {
        cx: point.x,
        cy: point.y,
        r: 18,
        class: 'diagram__accept-ring',
      })
    );
  }
  addText(group, state, {
    x: point.x,
    y: point.y + 4,
    class: 'diagram__state-label',
    textAnchor: 'middle',
  });
  root.appendChild(group);
}

export function renderAutomatonDiagram(container, definition) {
  container.innerHTML = '';
  if (!definition.states.length) {
    const empty = document.createElement('p');
    empty.className = 'diagram__empty';
    empty.textContent = 'Add states to see the automaton graph.';
    container.appendChild(empty);
    return { stateCount: 0, edgeCount: 0 };
  }

  const root = svg('svg', {
    viewBox: '0 0 600 350',
    role: 'img',
    'aria-labelledby': 'diagram-title diagram-desc',
  });
  const title = svg('title', { id: 'diagram-title' });
  title.textContent = 'Automaton structure diagram';
  const desc = svg('desc', { id: 'diagram-desc' });
  desc.textContent =
    'States are circles, accept states use a double ring, and arrows show transitions.';
  root.append(title, desc);

  const defs = svg('defs');
  const marker = svg('marker', {
    id: 'diagram-arrow',
    markerWidth: '8',
    markerHeight: '8',
    refX: '7',
    refY: '4',
    orient: 'auto',
  });
  marker.appendChild(svg('path', { d: 'M 0 0 L 8 4 L 0 8 z', class: 'diagram__arrow' }));
  defs.appendChild(marker);
  root.appendChild(defs);

  const points = pointsForStates(definition.states);
  const edgeLayer = svg('g', { class: 'diagram__edges' });
  const nodeLayer = svg('g', { class: 'diagram__nodes' });
  const edges = collectEdges(definition);
  edges.forEach((edge) => drawEdge(edgeLayer, edge, points, definition));
  definition.states.forEach((state) => drawNode(nodeLayer, state, points.get(state), definition));

  root.append(edgeLayer, nodeLayer);
  container.appendChild(root);
  return { stateCount: definition.states.length, edgeCount: edges.length };
}
