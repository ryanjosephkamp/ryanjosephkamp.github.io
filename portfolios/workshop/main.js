// Ryan Kamp — the workshop. No dependencies. The toy kit is in kit.js, and the
// harness that walks the loop graphs is in harness.js.
import { OBJECTS, objectById, crowdingOf, revLetter, TAU, BUDGET, BAR } from './kit.js';
import { chainOf, roleOf, startRun, arrive, follow, causeOf, makeWorld, taskLabel, plan, draft, judge, settle } from './harness.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise((res) => { setTimeout(res, reduce.matches ? 0 : ms); });
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const past = (s) => cap(s.replace(/^approve\b/, 'approved').replace(/^reject\b/, 'rejected')); // an answer, once given
const FONT = "'National Park', ui-rounded, system-ui, sans-serif";
const PAPER = [244, 240, 230];
const INK = [42, 41, 39];
const RED = '#c5281c';
const LIGHT = [-0.47, 0.6, 0.65]; // over the left shoulder, as at a drafting table
const GRAPHS = ['review-gate', 'grind-loop', 'metric-sandwich', 'spec-then-loop', 'ralph-loop'];

// ---------- the drawing: every splat is one pencil ellipse ----------
function makeBoard(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 1, H = 1, dpr = 1, S = 100;
  let yaw = 0.55, pitch = 0.66;
  let splats = [];
  let guide = 0;
  let grow = { t0: 0, ms: 0 };
  let marks = [];
  let poke = null;
  let list = [];
  let down = null;
  let lastInput = -1e9, lastFrame = 0, dirty = true, visible = true;
  let onMarks = () => {};

  function resize() {
    const b = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(b.width));
    H = Math.max(1, Math.round(b.height));
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    S = Math.min(W / 3.25, H / 2.7);
    dirty = true;
  }

  function draw(now) {
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const rt = [cyw, 0, syw], up = [syw * sp, cp, -cyw * sp], fw = [-syw * cp, sp, cyw * cp];
    const cx = W / 2, cy = H * 0.5;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Construction lines, in non-photo blue: center lines, and the toy's axis circle if it has one.
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(64,150,180,0.7)';
    ctx.setLineDash([14, 4, 2, 4]);
    ctx.beginPath();
    ctx.moveTo(cx - S * 1.6, cy); ctx.lineTo(cx + S * 1.6, cy);
    ctx.moveTo(cx, cy - S * 1.3); ctx.lineTo(cx, cy + S * 1.3);
    ctx.stroke();
    if (guide) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, guide * S, Math.max(guide * S * sp, 0.5), 0, 0, TAU);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const frac = grow.ms ? Math.min((now - grow.t0) / grow.ms, 1) : 1;
    const tp = poke ? (now - poke.t0) / 1000 : 0;
    if (poke && tp > 2.6) poke = null;
    list = [];
    for (const s of splats) {
      if (s.order > frac) continue;
      const f = dot(s.n, fw);
      if (f < -0.05 && !s.open) continue; // facing away: hidden by the near side, unless the shape is open
      let p = s.p;
      if (poke) {
        const d2 = (p[0] - poke.p[0]) ** 2 + (p[1] - poke.p[1]) ** 2 + (p[2] - poke.p[2]) ** 2;
        const a = 0.09 * Math.sin(13 * Math.sqrt(d2) - 10 * tp) * Math.exp(-2 * tp - 0.9 * d2);
        p = [p[0] + s.n[0] * a, p[1] + s.n[1] * a, p[2] + s.n[2] * a];
      }
      list.push({ s, x: cx + dot(p, rt) * S, y: cy - dot(p, up) * S, z: dot(p, fw), lam: f < 0 ? 0.1 : Math.max(0, dot(s.n, rt) * LIGHT[0] + dot(s.n, up) * LIGHT[1] + f * LIGHT[2]) });
    }
    list.sort((a, b) => a.z - b.z);

    for (const it of list) {
      const { s } = it;
      // Project the Gaussian's covariance onto the sheet; its eigenvectors are the ellipse.
      let A = 0, B = 0, C = 0;
      for (const a of s.ax) {
        const ax = dot(a, rt) * S, ay = -dot(a, up) * S;
        A += ax * ax; B += ax * ay; C += ay * ay;
      }
      const tr = (A + C) / 2;
      const dd = Math.sqrt(Math.max(tr * tr - (A * C - B * B), 0));
      const r1 = Math.sqrt(tr + dd), r2 = Math.sqrt(Math.max(tr - dd, 0.09));
      const ang = Math.abs(B) < 1e-9 ? (A >= C ? 0 : Math.PI / 2) : Math.atan2(tr + dd - A, B);
      ctx.beginPath();
      ctx.ellipse(it.x, it.y, r1, r2, ang, 0, TAU);
      if (s.solid) {
        ctx.fillStyle = `rgba(${INK},0.92)`;
        ctx.fill();
        continue;
      }
      const t = (1 - it.lam) * 0.26 + s.tone;
      ctx.fillStyle = `rgb(${PAPER.map((c, i) => Math.round(c + (INK[i] - c) * t))})`;
      ctx.fill();
      ctx.lineWidth = 0.7 + 0.6 * s.k;
      ctx.strokeStyle = `rgba(${INK},${0.42 + 0.45 * s.k})`;
      ctx.stroke();
    }

    // Red-pencil notes ride on the surface.
    ctx.font = `700 14px ${FONT}`;
    marks.forEach((m, i) => {
      m.x = cx + dot(m.p, rt) * S;
      m.y = cy - dot(m.p, up) * S;
      m.front = dot(m.n, fw) > 0;
      ctx.globalAlpha = m.front ? 1 : 0.22;
      ctx.strokeStyle = RED;
      ctx.fillStyle = RED;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, 18, 14, -0.35, 0.3, TAU + 0.9);
      ctx.stroke();
      ctx.fillText(String(i + 1), m.x + 17, m.y - 13);
      ctx.globalAlpha = 1;
    });
    dirty = frac < 1 || !!poke;
  }

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const now = performance.now(); // the same clock the loop's timers use
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    if (!reduce.matches && !down && now - lastInput > 2600) { yaw += dt * 0.16; dirty = true; }
    if (dirty) draw(now);
  }

  function note(s) {
    if (marks.length >= 6) marks.shift();
    marks.push({ p: s.p.slice(), n: s.n.slice() });
    if (!reduce.matches) poke = { p: s.p.slice(), t0: performance.now() };
    dirty = true;
    onMarks();
  }
  function tap(x, y) {
    const hit = marks.findIndex((m) => m.front && Math.hypot(m.x - x, m.y - y) < 22);
    if (hit >= 0) { marks.splice(hit, 1); dirty = true; onMarks(); return; }
    let best = null;
    for (const it of list) {
      if (it.s.solid || Math.hypot(it.x - x, it.y - y) > 24) continue;
      if (!best || it.z > best.z) best = it;
    }
    if (best) note(best.s);
  }

  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), moved: false };
    try { canvas.setPointerCapture(e.pointerId); } catch { /* fine */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!down) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) down.moved = true;
    yaw += (e.clientX - down.lx) * 0.009;
    if (e.pointerType === 'mouse') pitch = Math.min(1.4, Math.max(0.12, pitch + (e.clientY - down.ly) * 0.006));
    down.lx = e.clientX; down.ly = e.clientY;
    lastInput = performance.now();
    dirty = true;
  });
  const up = (e) => {
    if (!down) return;
    const wasTap = e.type === 'pointerup' && !down.moved && performance.now() - down.t < 700;
    down = null;
    lastInput = performance.now();
    if (wasTap) { const b = canvas.getBoundingClientRect(); tap(e.clientX - b.left, e.clientY - b.top); }
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [-0.16, 0], ArrowRight: [0.16, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] }[e.key];
    if (k) {
      yaw += k[0];
      pitch = Math.min(1.4, Math.max(0.12, pitch + k[1]));
    } else if (e.key === 'Enter' || e.key === ' ') {
      // A note at the point of the drawing nearest the reader.
      const free = list.filter((it) => !it.s.solid && !marks.some((m) => Math.hypot(m.x - it.x, m.y - it.y) < 30));
      if (free.length) note(free[free.length - 1].s);
    } else return;
    e.preventDefault();
    lastInput = performance.now();
    dirty = true;
  });

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; dirty = true; }).observe(canvas);
  document.fonts?.ready.then(() => { dirty = true; });
  resize();
  requestAnimationFrame(frame);

  return {
    set(next, ms, circle = 0) { splats = next; guide = circle; grow = { t0: performance.now(), ms: reduce.matches ? 0 : ms }; dirty = true; },
    count: () => marks.length,
    takeNotes() { const out = marks.map((m) => m.p); marks = []; dirty = true; onMarks(); return out; },
    onMarks(fn) { onMarks = fn; },
  };
}

// ---------- the loop graph, drawn from a grooph document ----------
function makeGraph(svg) {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (name, attrs = {}, text) => {
    const e = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const CY = 100, NH = 42, VW = 400;
  let token = null, nodes = {}, start = { x: 0, y: CY };
  const place = (p) => { token.setAttribute('cx', p.x); token.setAttribute('cy', p.y); };

  function draw(doc) {
    const order = chainOf(doc).map((id) => doc.nodes.find((n) => n.id === id));
    const back = new Set(doc.loops.flatMap((l) => l.back));
    const fixed = (n) => (n.kind === 'stop' ? 22 : n.kind === 'human-gate' ? 78 : 0);
    const gap = 20;
    const flex = order.filter((n) => !fixed(n)).length;
    const room = VW - 16 - gap * (order.length - 1) - order.reduce((a, n) => a + fixed(n), 0);
    const w = Math.min(96, room / Math.max(flex, 1));
    let x = (VW - (order.reduce((a, n) => a + (fixed(n) || w), 0) + gap * (order.length - 1))) / 2;
    const box = {};
    for (const n of order) { const bw = fixed(n) || w; box[n.id] = { x, w: bw, cx: x + bw / 2, n }; x += bw + gap; }

    svg.replaceChildren();
    nodes = {};
    const edgesG = el('g'), nodesG = el('g');
    const above = [], below = [];
    for (const e of doc.edges) {
      if (!back.has(e.id)) {
        const a = box[e.from], b = box[e.to];
        edgesG.append(el('path', { class: 'edge', id: `edge-${e.id}`, d: `M${a.x + a.w} ${CY} H${b.x - 2}`, 'marker-end': 'url(#ah)' }));
      } else (box[e.from].n.kind === 'human-gate' ? below : above).push(e);
    }
    // Back edges arc over the row; a person's "no" arcs under it, in red.
    const landings = {};
    above.sort((p, q) => (box[p.from].cx - box[p.to].cx) - (box[q.from].cx - box[q.to].cx));
    above.forEach((e, level) => {
      const a = box[e.from], b = box[e.to];
      const k = (landings[e.to] = (landings[e.to] || 0) + 1) - 1;
      const xe = b.cx - 18 * k + 9 * (above.filter((o) => o.to === e.to).length - 1); // shorter arcs land nearer, so none cross
      const top = (bx) => CY - (bx.n.kind === 'human-gate' ? 27 : NH / 2);
      const peak = CY - NH / 2 - 26 - 22 * level;
      const c = (peak - 0.25 * top(a)) / 0.75;
      edgesG.append(el('path', { class: 'edge back', id: `edge-${e.id}`, d: `M${a.cx} ${top(a)} C${a.cx} ${c}, ${xe} ${c}, ${xe} ${top(b) - 2}`, 'marker-end': 'url(#ah)' }));
      edgesG.append(el('text', { class: 'elabel', x: (a.cx + xe) / 2, y: peak - 5, 'text-anchor': 'middle' }, e.label || e.when));
    });
    below.forEach((e) => {
      const a = box[e.from], b = box[e.to];
      const peak = CY + NH / 2 + 44;
      const c = (peak - 0.25 * (CY + 27)) / 0.75;
      edgesG.append(el('path', { class: 'edge edge--red', id: `edge-${e.id}`, d: `M${a.cx} ${CY + 27} C${a.cx} ${c}, ${b.cx} ${c}, ${b.cx} ${CY + NH / 2 + 2}`, 'marker-end': 'url(#ah-red)' }));
      edgesG.append(el('text', { class: 'elabel elabel--red', x: (a.cx + b.cx) / 2, y: peak + 14, 'text-anchor': 'middle' }, a.n.options?.[1] || 'no'));
    });
    for (const { x: bx, w: bw, cx, n } of Object.values(box)) {
      const g = el('g', { class: `node node--${n.kind}`, id: `node-${n.id}` });
      if (n.kind === 'stop') {
        g.append(el('circle', { cx, cy: CY, r: 9 }), el('circle', { cx, cy: CY, r: 5 }));
        edgesG.append(el('text', { class: 'elabel', x: cx, y: CY + 26, 'text-anchor': 'middle' }, n.name));
      } else if (n.kind === 'human-gate') {
        g.append(el('path', { d: `M${cx} ${CY - 27} ${bx + bw} ${CY} ${cx} ${CY + 27} ${bx} ${CY}z` }), el('text', { x: cx, y: CY + 4.5 }, 'You'));
        edgesG.append(el('text', { class: 'elabel elabel--red', x: cx, y: CY - 33, 'text-anchor': 'middle' }, n.name));
      } else if (n.kind === 'check') {
        // A check is a gauge, not an agent: clipped corners.
        const t = CY - NH / 2, b = CY + NH / 2, r = bx + bw, c = 9;
        g.append(el('path', { d: `M${bx + c} ${t}H${r - c}L${r} ${t + c}V${b - c}L${r - c} ${b}H${bx + c}L${bx} ${b - c}V${t + c}z` }), el('text', { x: cx, y: CY + 4.5, class: n.name.length > 9 ? 'small' : '' }, n.name));
      } else {
        g.append(el('rect', { x: bx, y: CY - NH / 2, width: bw, height: NH, rx: 4 }), el('text', { x: cx, y: CY + 4.5 }, n.name));
      }
      nodes[n.id] = g;
      nodesG.append(g);
    }
    start = { x: box[order[0].id].x - 7, y: CY };
    edgesG.append(el('path', { class: 'edge', d: `M${start.x - 9} ${CY} H${start.x + 4}` }));
    token = el('circle', { class: 'token', r: 6, cx: start.x, cy: CY });
    svg.append(edgesG, nodesG, token);

    const words = order.map((n) => (n.kind === 'human-gate' ? `a person at ${n.name}` : n.name)).join(', then ');
    const backs = [...above, ...below].map((e) => `${box[e.from].n.kind === 'human-gate' ? 'A person’s no' : `A fail at ${box[e.from].n.name}`} goes back to ${box[e.to].n.name}.`).join(' ');
    $('#graph-desc').textContent = `A loop graph: ${words}. ${backs}`;
  }

  return {
    draw,
    home() { place(start); },
    at(id) { Object.entries(nodes).forEach(([k, g]) => g.classList.toggle('is-on', k === id)); },
    travel(edgeId, ms) {
      const path = svg.querySelector(`#edge-${CSS.escape(edgeId)}`);
      const len = path.getTotalLength();
      if (reduce.matches) { place(path.getPointAtLength(len)); return Promise.resolve(); }
      const t0 = performance.now();
      const step = () => {
        const k = Math.min(Math.max((performance.now() - t0) / ms, 0), 1);
        if (path.isConnected) place(path.getPointAtLength(len * k * k * (3 - 2 * k)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      // The clock is a timer, so a hidden tab cannot stall the loop.
      return new Promise((res) => { setTimeout(res, ms); });
    },
  };
}

// ---------- the loop itself ----------
function workshop(docs) {
  const board = makeBoard($('#sheet-canvas'));
  const graph = makeGraph($('#loop-graph'));
  const logEl = $('#log'), statusEl = $('#status'), gate = $('#gate'), stamp = $('#stamp');
  const noBtn = $('#answer-no'), yesBtn = $('#answer-yes'), nextBtn = $('#next-run');
  const label = (btn, text) => { btn.querySelector('span').textContent = text; };
  const params = new URLSearchParams(location.search);

  let obj = objectById(params.get('toy'));
  let graphId = GRAPHS.includes(params.get('graph')) ? params.get('graph') : GRAPHS[0];
  let doc = docs[graphId];
  let world = makeWorld(obj);
  let run = null;
  let ticket = 0;
  let asking = null; // the gate a person is being asked at, and how to answer it

  let drafted = false; // has the builder drawn anything in this run yet?
  const letter = () => revLetter(Math.max(world.rev, 0));
  const tag = () => `${letter()}·${world.round}`;
  const mark = () => (drafted ? letter() : '·');
  const gates = () => doc.nodes.filter((n) => n.kind === 'human-gate');
  const today = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

  function log(tagText, who, text, cls = '') {
    const li = document.createElement('li');
    li.className = cls;
    li.innerHTML = '<b></b><i></i><span></span>';
    li.children[0].textContent = tagText;
    li.children[1].textContent = who;
    li.children[2].textContent = text;
    logEl.append(li);
    while (logEl.children.length > 90) logEl.firstChild.remove();
    logEl.scrollTop = logEl.scrollHeight;
  }

  function bom({ parts, areas, counts }, planned = false) {
    $('#bom').replaceChildren(...parts.map((p, i) => {
      const tr = document.createElement('tr');
      [p.name, p.kit, areas[i].toFixed(2), counts[i]].forEach((v) => { const td = document.createElement('td'); td.textContent = v; tr.append(td); });
      return tr;
    }));
    const sum = counts.reduce((a, b) => a + b, 0);
    $('#bom-label').textContent = planned ? 'Total, as planned' : 'Total';
    $('#bom-total').textContent = `${sum} of ${BUDGET}`;
    $('#bom-total').classList.toggle('is-short', sum !== BUDGET);
  }

  // The stops the document names, with the two this sheet can count kept live.
  function brakes() {
    const items = [];
    for (const loop of doc.loops) {
      for (const s of loop.stops) {
        const passes = run ? run.passes[loop.id] : 0;
        const fired = run?.over?.kind === 'halted' && run.over.stop === s;
        if (s.kind === 'bar-passed') items.push(['the bar is met', '']);
        else if (s.kind === 'max-iterations') items.push([`rounds ${Math.min(passes, s.n)} of ${s.n}`, fired ? 'is-fired' : '']);
        else if (s.kind === 'budget' && s.measure === 'dispatches') items.push([`dispatches ${run ? run.dispatches : 0} of ${s.limit}`, fired ? 'is-fired' : '']);
        else if (s.kind === 'budget') items.push([`${s.limit} ${s.measure}, not timed here`, 'is-idle']);
        else if (s.kind === 'diminishing-returns') items.push([`no progress for ${plural(s.rounds, 'round')}, not judged here`, 'is-idle']);
        else items.push([s.kind, 'is-idle']);
      }
    }
    for (const g of gates()) items.push([`a person, at ${g.name}`, `is-person${asking?.node === g ? ' is-fired' : ''}`]);
    $('#brakes').replaceChildren(...items.map(([text, cls]) => { const li = document.createElement('li'); li.textContent = text; li.className = cls; return li; }));
  }

  function showStamp(title, line, ink = false) {
    $('#stamp-title').textContent = title;
    $('#stamp-line').textContent = line;
    stamp.classList.toggle('stamp--ink', ink);
    stamp.classList.remove('is-on');
    void stamp.offsetWidth; // let the stamp come down again
    stamp.classList.add('is-on');
  }

  function controls() {
    const notes = board.count();
    const withNotes = notes ? `, ${plural(notes, 'note')}` : '';
    const over = run?.over;
    noBtn.hidden = yesBtn.hidden = !!over || !gates().length;
    nextBtn.hidden = !noBtn.hidden;
    noBtn.disabled = yesBtn.disabled = !asking;
    nextBtn.disabled = !over;
    gate.classList.toggle('is-waiting', !!asking || !!over);
    if (asking) {
      const [yes, no] = asking.node.options;
      label(yesBtn, cap(yes));
      label(noBtn, cap(no) + (asking.loops ? withNotes : ''));
    }
    const what = taskLabel(world) + withNotes;
    if (!over) label(nextBtn, 'No person in this graph');
    else if (over.kind === 'done') label(nextBtn, `Next task: ${what}`);
    else if (over.kind === 'halted') label(nextBtn, `New run: ${what}`);
    else label(nextBtn, `Restate the task: ${what}`);
  }

  function ask(node) {
    return new Promise((res) => {
      asking = { node, loops: doc.edges.some((e) => e.from === node.id && e.when === 'fail'), answer: (v) => { asking = null; res(v); } };
      brakes();
      controls();
    });
  }

  async function go() {
    const my = ++ticket;
    asking = null;
    run = startRun(doc);
    drafted = false;
    stamp.classList.remove('is-on');
    graph.home();
    $('#tb-approved').textContent = gates().length ? 'not yet' : 'nobody: this graph has no gate';
    $('#tb-approved').className = 'is-blank';
    controls();
    for (;;) {
      const node = arrive(run);
      graph.at(node.id);
      brakes();
      if (run.over) break;
      const role = roleOf(node);
      let verdict = '';
      if (role === 'plan') {
        statusEl.textContent = `${node.name} is writing the answer key.`;
        const p = plan(world);
        bom(p, true);
        log('·', node.name.toLowerCase(), p.text);
        await sleep(700);
      } else if (role === 'build') {
        const cause = causeOf(run);
        const text = draft(world, cause, cause === 'fail' ? [] : board.takeNotes());
        drafted = true;
        statusEl.textContent = `${node.name} is drafting revision ${letter()}${world.round > 1 ? `, round ${world.round}` : ''}.`;
        board.set(world.result.splats, 750, obj.guide || 0);
        bom(world.result);
        log(tag(), node.name.toLowerCase(), text);
        $('#tb-rev').textContent = letter();
        $('#tb-checked').textContent = 'in progress';
        await sleep(800);
      } else if (role === 'gate') {
        statusEl.textContent = `${node.name}. ${node.prompt}`;
        verdict = await ask(node);
        if (my !== ticket) return;
        const notes = board.count();
        if (verdict === 'pass') {
          log(mark(), 'you', `${past(node.options[0])}.`, 'is-you');
          showStamp(/spec/i.test(node.name) ? 'Spec approved' : 'Approved', world.rev < 0 || /spec/i.test(node.name) ? today() : `REV ${letter()} · ${today()}`);
          $('#tb-approved').textContent = `a visitor, ${today()}`;
          $('#tb-approved').className = 'is-signed';
        } else {
          const said = !asking && doc.edges.some((e) => e.from === node.id && e.when === 'fail') ? (notes ? `: more here, at ${plural(notes, 'note')}` : ': try another seed') : '';
          log(mark(), 'you', `${past(node.options[1])}${said}.`, 'is-you');
          stamp.classList.remove('is-on');
        }
        controls();
      } else {
        statusEl.textContent = { judge: `${node.name} is measuring it.`, tests: `${node.name}: measuring it.`, count: `${node.name}: counting.`, 'plan-check': `${node.name} Reading the parts list.` }[role];
        await sleep(380);
        if (my !== ticket) return;
        const j = judge(world, role);
        verdict = j.pass ? 'pass' : 'fail';
        log(tag(), node.name.toLowerCase(), j.text, role === 'plan-check' ? '' : j.pass ? 'is-pass' : 'is-fail');
        if (j.m) $('#tb-checked').textContent = j.m.total !== BUDGET ? `${j.m.total} of ${BUDGET} splats` : `${j.m.spread.toFixed(2)}×, bar ${j.m.spread <= BAR ? 'met' : 'not met'}`;
      }
      if (my !== ticket) return;
      const { edge, fired } = follow(run, verdict);
      brakes();
      if (fired || !edge) break;
      await graph.travel(edge.id, edge.when === 'fail' ? 480 : 300);
      if (my !== ticket) return;
    }

    const over = run.over;
    if (over.kind === 'done') {
      settle(world);
      const asked = gates().length > 0;
      if (!asked) showStamp('Done', `REV ${letter()} · NO PERSON ASKED`, true);
      log(letter(), 'graph', asked ? 'Reached Done.' : 'Reached Done. Nobody was asked.');
      statusEl.textContent = `Revision ${letter()} reached the graph’s stop.${asked ? '' : ' This graph asks no person.'}`;
    } else if (over.kind === 'halted') {
      const why = over.stop.kind === 'max-iterations' ? plural(over.stop.n, 'round') : `${over.stop.limit} ${over.stop.measure}`;
      showStamp('Halted', `AFTER ${why.toUpperCase()}`, true);
      log(letter(), 'graph', `Halted after ${why}: the cap the graph names. The run reports to a person.`, 'is-fail');
      statusEl.textContent = `Halted after ${why}. That is the graph’s own brake, and it reports to a person.`;
    } else {
      log('·', 'graph', 'No edge leaves this gate on a no. The run ends so the task can be restated.');
      statusEl.textContent = 'The run ended at the gate, so the task can be restated.';
    }
    brakes();
    controls();
  }

  function describe() {
    const row = document.querySelector(`#graphs-table [data-graph="${graphId}"]`);
    const name = doc.name.replace(/^Workshop: /, '');
    $('#graph-file').textContent = `graphs/${graphId}.grooph.json`;
    $('#graph-file').href = `graphs/${graphId}.grooph.json`;
    $('#graph-from').textContent = `grooph’s ${doc.lineage.pattern} template`;
    $('#graph-open').href = row?.querySelector('[data-open]')?.href || 'https://ryanjosephkamp.github.io/grooph/';
    $('#tb-graph').textContent = `${cap(name)}, from ${doc.lineage.from}`;
    document.querySelectorAll('#graphs-table tbody tr').forEach((tr) => tr.classList.toggle('is-running', tr === row));
    $('#tb-title').textContent = `${obj.label}, from splats`;
    $('#dim-shape').textContent = obj.parts[0].shape.kit;
    $('#mistake').textContent = `${obj.wrong.says} by ${obj.wrong.formula}: about ${crowdingOf(obj).toFixed(2)} here.`;
    const q = new URLSearchParams();
    if (obj !== OBJECTS[0]) q.set('toy', obj.id);
    if (graphId !== GRAPHS[0]) q.set('graph', graphId);
    history.replaceState(null, '', `${location.pathname}${q.toString() ? `?${q}` : ''}${location.hash}`);
    document.dispatchEvent(new CustomEvent('workshop:toy', { detail: obj }));
  }

  // Links on the other sheets that name a toy or a graph put it on sheet 1 without a reload.
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href^="?"]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const q = new URLSearchParams(a.getAttribute('href').split('#')[0]);
    for (const [name, value] of q) {
      const radio = document.querySelector(`.picker input[name="${name}"][value="${CSS.escape(value)}"]`);
      if (radio && !radio.checked) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    e.preventDefault();
    $('#top').scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth' });
  });

  yesBtn.addEventListener('click', () => asking?.answer('pass'));
  noBtn.addEventListener('click', () => asking?.answer('fail'));
  nextBtn.addEventListener('click', () => { if (run?.over) go(); });
  board.onMarks(() => controls());

  $('#pick-toy').addEventListener('change', (e) => {
    obj = objectById(e.target.value);
    world = makeWorld(obj);
    board.takeNotes();
    logEl.replaceChildren();
    describe();
    go();
  });
  $('#pick-graph').addEventListener('change', (e) => {
    graphId = e.target.value;
    doc = docs[graphId];
    graph.draw(doc);
    describe();
    log('·', 'sheet', `Graph changed to ${doc.name.replace(/^Workshop: /, '')}.`);
    go();
  });

  document.querySelector(`#pick-toy input[value="${obj.id}"]`).checked = true;
  document.querySelector(`#pick-graph input[value="${graphId}"]`).checked = true;
  logEl.replaceChildren();
  graph.draw(doc);
  describe();
  go();
}

// ---------- small things on the other sheets ----------
function dimension() {
  const el = $('#dim-w');
  const set = () => { el.textContent = `${document.documentElement.clientWidth} px wide`; };
  set();
  addEventListener('resize', set);
}

function embed() {
  const frame = $('#embed-frame');
  let toy = 'donut', label = 'Donut', live = null;
  const src = () => `https://ryanjosephkamp.github.io/splashery/embed/?toy=${toy}&theme=light&autoplay=pokes`;
  document.addEventListener('workshop:toy', (e) => {
    toy = e.detail.toy;
    label = e.detail.label;
    const slot = $('#embed-toy'); // gone once the player has replaced the button
    if (slot) slot.textContent = label === 'Saturn' ? label : label.toLowerCase();
    if (live && live.src !== src()) { live.src = src(); live.title = `Splashery toy: ${label}`; }
  });
  $('#load-embed').addEventListener('click', () => {
    live = document.createElement('iframe');
    live.src = src();
    live.title = `Splashery toy: ${label}`;
    live.loading = 'lazy';
    frame.replaceChildren(live);
  });
}

function ripple() {
  const row = $('#fx-row');
  const N = 19;
  const els = [];
  for (let i = 0; i < N; i += 1) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    e.setAttribute('cx', 16 + i * 16);
    e.setAttribute('rx', 9);
    row.append(e);
    els.push(e);
  }
  const pose = (t) => els.forEach((e, i) => {
    const w = Math.sin(i * 0.62 - t * 3.2) * Math.exp(-(((i - 9) / 7) ** 2));
    e.setAttribute('cy', 62 - w * 22);
    e.setAttribute('ry', 13 + w * 5);
    e.setAttribute('transform', `rotate(${w * 24} ${16 + i * 16} ${62 - w * 22})`);
  });
  pose(0.4);
  if (reduce.matches) return;
  let on = false;
  const tick = () => { if (!on) return; pose(performance.now() / 1000); requestAnimationFrame(tick); };
  new IntersectionObserver(([en]) => { const was = on; on = en.isIntersecting; if (on && !was) requestAnimationFrame(tick); }).observe(row);
}

function stops() {
  const btn = $('#erase-stop');
  btn.addEventListener('click', () => {
    const erased = $('#lane-graph').classList.toggle('is-erased');
    btn.setAttribute('aria-pressed', String(erased));
    btn.textContent = erased ? 'Put the stops back' : 'Erase the stops';
  });
}

// reword_nerd: change a stage's response and the stages after it go stale; tap a stale one to reapply.
function stages() {
  const buttons = [...document.querySelectorAll('#stages button')];
  const caption = $('#stages-caption');
  const stale = buttons.map(() => false);
  const names = buttons.map((b) => b.querySelector('b').textContent);
  const paint = () => buttons.forEach((b, i) => { b.classList.toggle('is-stale', stale[i]); b.querySelector('i').textContent = stale[i] ? 'stale' : 'current'; });
  buttons.forEach((b, i) => b.addEventListener('click', () => {
    if (stale[i]) {
      stale[i] = false;
      caption.textContent = `${names[i]} reapplied: its prompt is built again from the responses before it.`;
    } else {
      for (let j = i + 1; j < stale.length; j += 1) stale[j] = true;
      const after = names.slice(i + 1);
      caption.textContent = after.length
        ? `${names[i]}’s response changed. ${after.length > 1 ? `${after.slice(0, -1).join(', ')} and ${after[after.length - 1]} are` : `${after[0]} is`} marked stale, as edited prompts would be, until reapplied. Tap a stale stage to reapply it.`
        : `${names[i]} is the last stage: nothing downstream to mark.`;
    }
    paint();
  }));
}

// Link Meteor: the anchor text and the URL of a link, in separate fields.
function meteor() {
  const text = $('#lm-text'), url = $('#lm-url'), count = $('#lm-count');
  const links = () => [...document.querySelectorAll('main a[href^="http"], footer a[href^="http"]')];
  let at = -1;
  const show = (a) => {
    text.textContent = a.textContent.trim().replace(/\s+/g, ' ');
    url.textContent = a.href;
    const all = links();
    at = all.indexOf(a);
    count.textContent = `Link ${at + 1} of ${all.length} on these sheets.`;
  };
  const from = (e) => { const a = e.target.closest?.('a[href^="http"]'); if (a && a.closest('main, footer')) show(a); };
  document.addEventListener('pointerover', from);
  document.addEventListener('focusin', from);
  $('#lm-next').addEventListener('click', () => { const all = links(); show(all[(at + 1) % all.length]); });
}

async function boot() {
  dimension();
  embed();
  ripple();
  stops();
  stages();
  meteor();
  const docs = Object.fromEntries(await Promise.all(GRAPHS.map(async (id) => [id, await (await fetch(`graphs/${id}.grooph.json`)).json()])));
  workshop(docs);
}
boot();
