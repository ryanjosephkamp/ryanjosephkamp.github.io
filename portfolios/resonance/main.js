// Resonance: the plate, the bow, and the screens that read the page's sound.
// Sound starts only after a touch: the AudioContext is made in a handler.

import { catalog, Sand, restingFigure, BASE_HZ } from './plate.js';
import { Take } from './take.js';

const FIGS = catalog();
const $ = (s) => document.querySelector(s);
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
// The canvases' colors: the sand, a screen's flat fill and the accent. They
// are read from the stylesheet before anything is kept on screen, so they
// follow the plate a visitor picks; these are only where they start.
let SAND = 'rgba(25, 13, 8,';
let SCREEN = '#e9bda4';
let ACCENT = '#0b6170';

const saved = {
  get plate() {
    try {
      return localStorage.getItem('resonance:plate');
    } catch {
      return null;
    }
  },
  set plate(v) {
    try {
      localStorage.setItem('resonance:plate', v);
    } catch {}
  },
  get muted() {
    try {
      return localStorage.getItem('resonance:muted') === '1';
    } catch {
      return false;
    }
  },
  set muted(v) {
    try {
      localStorage.setItem('resonance:muted', v ? '1' : '0');
    } catch {}
  },
};

const state = {
  u: 11, // where the bow sits on the edge: figure index, continuous
  energy: 0, // how hard the plate rings, 0..1
  hold: 0, // seconds of full ringing still owed (a strike)
  bowing: false,
  bowSpeed: 0,
  keyHeld: false,
  stroke: 0, // the bow's slide along its length, px
  muted: saved.muted,
};

const near = (d) => 1 / (1 + (d / 0.28) ** 2); // a mode's answer to a bow d figures away
const figAt = (u) => FIGS[clamp(Math.round(u), 0, FIGS.length - 1)];
function hzAt(u) {
  const i = clamp(Math.floor(u), 0, FIGS.length - 1);
  const j = Math.min(FIGS.length - 1, i + 1);
  return FIGS[i].hz * (FIGS[j].hz / FIGS[i].hz) ** (u - i);
}
function drive() {
  const out = [];
  if (state.energy <= 0) return out;
  for (const f of FIGS) {
    const d = Math.abs(state.u - f.index);
    if (d < 1.6) out.push({ n: f.n, m: f.m, s: f.s, a: state.energy * near(d) });
  }
  return out;
}

// ---- Sound -------------------------------------------------------------------

const audio = {
  ctx: null,
  start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = (this.ctx = new AC());
    const bus = (this.bus = ctx.createGain());
    const comp = ctx.createDynamicsCompressor();
    const out = (this.out = ctx.createGain());
    out.gain.value = state.muted ? 0 : 0.9;
    const an = (this.an = ctx.createAnalyser()); // us-spelling: keep (the Web Audio API's own name)
    an.fftSize = 4096;
    an.smoothingTimeConstant = 0.55;
    bus.connect(comp);
    comp.connect(an); // the screens read the sound before the mute
    comp.connect(out);
    out.connect(ctx.destination);
    this.fd = new Float32Array(an.frequencyBinCount);
    this.td = new Float32Array(an.fftSize);

    // The bowed plate: two saws a hair apart, an octave above, rosin hiss.
    const g = (this.bowGain = ctx.createGain());
    g.gain.value = 0;
    const lp = (this.lp = ctx.createBiquadFilter());
    lp.type = 'lowpass';
    lp.Q.value = 0.9;
    lp.connect(g);
    g.connect(bus);
    this.oscs = [
      ['sawtooth', 1, 0, 0.5],
      ['sawtooth', 1, 7, 0.32],
      ['sine', 2, 0, 0.16],
    ].map(([type, mult, cents, gain]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.detune.value = cents;
      const og = ctx.createGain();
      og.gain.value = gain;
      o.connect(og);
      og.connect(lp);
      o.start();
      return { o, mult };
    });
    const len = ctx.sampleRate;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const bp = (this.bp = ctx.createBiquadFilter());
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    const ng = ctx.createGain();
    ng.gain.value = 0.07;
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(g);
    noise.start();
    return true;
  },
  bow(hz, level) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const { o, mult } of this.oscs) o.frequency.setTargetAtTime(hz * mult, t, 0.025);
    this.lp.frequency.setTargetAtTime(Math.min(9000, hz * 4.5 + 500), t, 0.03);
    this.bp.frequency.setTargetAtTime(Math.min(9000, hz * 3), t, 0.03);
    this.bowGain.gain.setTargetAtTime(level, t, 0.04);
  },
  // A struck bar: for Amordle's bars and grooph's loop.
  ping(hz, seconds = 0.7, gain = 0.3) {
    if (!this.start()) return;
    if (!playing) take.ping(performance.now(), hz, seconds, gain);
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    g.connect(this.bus);
    for (const [type, mult, amount] of [
      ['triangle', 1, 1],
      ['sine', 3.01, 0.25],
    ]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = hz * mult;
      const og = ctx.createGain();
      og.gain.value = amount;
      o.connect(og);
      og.connect(g);
      o.start(t);
      o.stop(t + seconds + 0.05);
    }
  },
  setMuted(m) {
    if (this.ctx) this.out.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.02);
  },
};

// ---- The take: what was last played, to play back ------------------------------
// take.js keeps it: the figure the bow sat on, how hard the plate rang and the
// bars struck, against the clock. Never the sound itself.

const take = new Take();
let playing = null; // the player of a take being played back
let playStart = 0;
// Only the visitor's own playing is kept. This is set when they bow, strike,
// tap a figure or sing, and cleared when the page plays something itself (a
// playback, the example), so the ring that follows is not taken for a note.
let armed = false;

function stopPlayback() {
  if (!playing) return;
  playing = null;
  showTake();
}

function playBack() {
  if (playing) return stopPlayback();
  if (take.empty || !audio.start()) return;
  if (mic.on) micStop(); // or the plate would hear itself
  clearTimeout(phraseTimer);
  armed = false;
  state.hold = 0;
  state.keyHeld = false;
  playing = take.player();
  playStart = performance.now();
  showTake();
}

const replayButtons = [...document.querySelectorAll('[data-replay]')];
const takeSays = [...document.querySelectorAll('[data-take-say]')];
let takeShown = '';
function showTake() {
  const seconds = (take.length / 1000).toFixed(1);
  const key = playing ? 'playing' : take.empty ? 'none' : seconds;
  if (key === takeShown) return;
  takeShown = key;
  for (const b of replayButtons) {
    b.hidden = false;
    b.disabled = take.empty && !playing;
    b.textContent = playing ? 'Stop' : 'Play it back';
  }
  const text = playing
    ? `Playing your last notes back: ${seconds} seconds.`
    : take.empty
      ? 'Nothing of yours yet. Bow the plate or sing to it, then play it back.'
      : `Your last notes: ${seconds} seconds.`;
  for (const el of takeSays) el.textContent = text;
}
for (const b of replayButtons) b.addEventListener('click', playBack);

// ---- The plate ---------------------------------------------------------------

const stage = $('#stage');
const cv = $('#sand');
const g2 = cv.getContext('2d');
const bowEl = $('#bow');
const hintEl = $('#hint');
const rail = $('#rail');
let sand = new Sand(9000);
let plateDirty = true;

for (const f of FIGS) {
  const tick = document.createElement('i');
  tick.style.top = `${(1 - (f.index + 0.5) / FIGS.length) * 100}%`;
  if (f.index === 0 || FIGS[f.index - 1].k !== f.k) tick.className = 'long';
  rail.append(tick);
}
const ticks = [...rail.children];

function fitPlate() {
  const css = stage.clientWidth;
  if (!css) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const px = Math.round(css * dpr);
  if (cv.width !== px) {
    cv.width = cv.height = px;
    const want = Math.round(clamp(css * css * 0.075, 6000, 20000));
    if (Math.abs(want - sand.n) > 1500) {
      sand = new Sand(want);
      strike(2.2);
    }
    plateDirty = true;
  }
}

function drawSand() {
  const W = cv.width;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const s = Math.max(1.15 * dpr, W / 430);
  const { X, Y, hop, n } = sand;
  g2.clearRect(0, 0, W, W);
  g2.fillStyle = `${SAND} 0.92)`;
  g2.beginPath();
  for (let i = 0; i < n; i++) if (hop[i] <= 0.3) g2.rect(X[i] * W - s / 2, Y[i] * W - s / 2, s, s);
  g2.fill();
  // Grains in the air: larger and fainter.
  const b = s * 1.7;
  g2.fillStyle = `${SAND} 0.42)`;
  g2.beginPath();
  for (let i = 0; i < n; i++) if (hop[i] > 0.3) g2.rect(X[i] * W - b / 2, Y[i] * W - b / 2, b, b);
  g2.fill();
  plateDirty = false;
}

// The whole settle at once: the reduced-motion path, and the first paint.
function settleNow() {
  const f = figAt(state.u);
  for (let i = 0; i < 200; i++) sand.step(1 / 60, [{ n: f.n, m: f.m, s: f.s, a: 1 }]);
  sand.hop.fill(0);
  plateDirty = true;
}

function strike(seconds = 1.2) {
  state.hold = Math.max(state.hold, seconds);
  if (reduce.matches) settleNow();
}

function setFigure(index, seconds) {
  state.u = clamp(index, 0, FIGS.length - 1);
  strike(seconds);
}

let phraseTimer = 0;
function ring(index, el) {
  clearTimeout(phraseTimer);
  armed = true;
  stopPlayback();
  audio.start();
  setFigure(index, 1.6);
  if (el) {
    el.classList.remove('is-ringing');
    void el.offsetWidth;
    el.classList.add('is-ringing');
  }
}

// Pointer: up and down the edge picks the note, any movement is the stroke.
let lastMove = null;
function bowFrom(e) {
  const r = stage.getBoundingClientRect();
  const frac = clamp((e.clientY - r.top - r.height * 0.04) / (r.height * 0.92));
  state.u = clamp((1 - frac) * FIGS.length - 0.5, 0, FIGS.length - 1);
  const now = performance.now();
  if (lastMove) {
    const dt = Math.max(8, now - lastMove.t) / 1000;
    const dx = e.clientX - lastMove.x;
    const dy = e.clientY - lastMove.y;
    const speed = Math.hypot(dx, dy * 0.6) / dt;
    state.bowSpeed = Math.max(state.bowSpeed, clamp(speed / 620));
    state.stroke = clamp(state.stroke + dx, -r.width * 0.16, r.width * 0.16);
  }
  lastMove = { x: e.clientX, y: e.clientY, t: now };
}
const played = () => stage.classList.add('is-played');
stage.addEventListener('pointerdown', (e) => {
  if (e.button > 0) return;
  played();
  stopPlayback();
  armed = true;
  audio.start();
  stage.setPointerCapture(e.pointerId);
  state.bowing = true;
  lastMove = null;
  bowFrom(e);
  strike(0.35);
});
stage.addEventListener('pointermove', (e) => {
  if (state.bowing) bowFrom(e);
});
for (const type of ['pointerup', 'pointercancel'])
  stage.addEventListener(type, () => {
    if (!state.bowing) return;
    audio.start();
    state.bowing = false;
    if (reduce.matches) settleNow();
  });

stage.addEventListener('keydown', (e) => {
  const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 4, PageDown: -4 }[e.key];
  if (step) {
    audio.start();
    setFigure(Math.round(state.u) + step, 0.9);
  } else if (e.key === 'Home' || e.key === 'End') {
    audio.start();
    setFigure(e.key === 'Home' ? 0 : FIGS.length - 1, 0.9);
  } else if (e.key === ' ' || e.key === 'Enter') {
    audio.start();
    state.keyHeld = true;
    strike(0.5);
  } else if (e.key === 's' || e.key === 'S') {
    scatter();
  } else return;
  played();
  stopPlayback();
  armed = true;
  e.preventDefault();
});
stage.addEventListener('keyup', (e) => {
  if (e.key === ' ' || e.key === 'Enter') state.keyHeld = false;
});
stage.addEventListener('blur', () => (state.keyHeld = false));

function scatter() {
  sand.scatter();
  plateDirty = true;
}
$('#scatter-btn').addEventListener('click', scatter);
$('#bow-btn').addEventListener('click', () => {
  stopPlayback();
  armed = true;
  audio.start();
  strike(1.8);
});
const soundBtn = $('#sound-btn');
function showMuted() {
  soundBtn.setAttribute('aria-pressed', String(!state.muted));
  soundBtn.textContent = state.muted ? 'Sound: off' : 'Sound: on';
}
soundBtn.addEventListener('click', () => {
  state.muted = !state.muted;
  saved.muted = state.muted;
  audio.setMuted(state.muted);
  showMuted();
});
showMuted();

// ---- Sung to: the note a visitor sings drives the plate -------------------------
// As Splashery's plate does it: the figure nearest the note rings (moved by
// octaves onto the plate), by a resonance curve half as strong 150 cents
// away, times how loud the voice is. The sound goes to the screens' meter
// and nowhere else: it is not played back, kept or sent.

const mic = { on: false, stream: null, src: null, hz: 0, loud: 0, clock: 0, answer: null };
const micBtn = $('#mic-btn');
const micSay = $('#mic-say');
const SING_WIDTH = 150;

function singAnswer(hz, current) {
  let best = null;
  for (const f of FIGS) {
    const cents = 1200 * Math.log2(hz / f.hz);
    const folded = ((((cents + 600) % 1200) + 1200) % 1200) - 600;
    const score = Math.abs(folded) + 0.02 * Math.abs(cents) - (f === current ? 1 : 0);
    if (!best || score < best.score) best = { index: f.index, folded, score };
  }
  const x = best.folded / SING_WIDTH;
  return { index: best.index, response: 1 / (1 + x * x) };
}

function micHeard() {
  const was = mic.answer?.index;
  mic.answer = mic.hz > 0 ? singAnswer(mic.hz, figAt(state.u)) : null;
  if (!mic.answer) {
    micSay.textContent = 'Listening. Sing a steady note, low or high.';
    return;
  }
  const f = FIGS[mic.answer.index];
  micSay.textContent = `You: ${Math.round(mic.hz)} Hz. The plate answers with figure ${f.number}.`;
  if (reduce.matches && was !== mic.answer.index) {
    state.u = mic.answer.index;
    settleNow();
  }
}

function micStop() {
  mic.stream?.getTracks().forEach((t) => t.stop());
  mic.src?.disconnect();
  mic.on = false;
  mic.stream = mic.src = mic.answer = null;
  micBtn.setAttribute('aria-pressed', 'false');
  micBtn.textContent = 'Sing to it';
  micSay.textContent = '';
}

async function micToggle() {
  if (mic.on) return micStop();
  played();
  stopPlayback();
  if (!navigator.mediaDevices?.getUserMedia || !audio.start()) {
    micSay.textContent = 'This browser cannot share a microphone with the page. The bow still works.';
    return;
  }
  try {
    mic.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
  } catch {
    micSay.textContent = 'No microphone was allowed, so the plate cannot hear you. The bow still works.';
    return;
  }
  mic.src = audio.ctx.createMediaStreamSource(mic.stream);
  mic.src.connect(audio.an); // measured, never played back
  mic.on = true;
  mic.hz = mic.loud = 0;
  micBtn.setAttribute('aria-pressed', 'true');
  micBtn.textContent = 'Stop listening';
  micSay.textContent = 'Listening. Sing a steady note, low or high.';
}
micBtn.hidden = false;
micBtn.addEventListener('click', micToggle);

// ---- Small plates: a figure at rest --------------------------------------------

const parseFig = (text) => {
  const [n, m, s] = text.split(',').map(Number);
  return FIGS.find((f) => f.n === n && f.m === m && f.s === s);
};
function drawRest(canvas, f) {
  const W = canvas.width;
  const g = canvas.getContext('2d');
  const pts = restingFigure(f, Math.round(W * 7.5));
  const s = Math.max(1.3, W / 105);
  g.clearRect(0, 0, W, W);
  g.fillStyle = `${SAND} 0.9)`;
  g.beginPath();
  for (let i = 0; i < pts.length; i += 2) g.rect(pts[i] * W - s / 2, pts[i + 1] * W - s / 2, s, s);
  g.fill();
}
for (const c of document.querySelectorAll('canvas[data-figure]')) drawRest(c, parseFig(c.dataset.figure));
for (const b of document.querySelectorAll('[data-ring]'))
  b.addEventListener('click', () => ring(parseFig(b.dataset.ring).index, b));

// The contact sheet: all 24.
const sheet = $('#sheet');
const sheetButtons = FIGS.map((f) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'thumb';
  b.setAttribute('aria-label', `Figure ${f.number}: n ${f.n}, m ${f.m}, ${f.s > 0 ? 'plus' : 'minus'}, ${Math.round(f.hz)} hertz`);
  const c = document.createElement('canvas');
  c.width = c.height = 132;
  const num = document.createElement('span');
  num.className = 'num';
  num.textContent = f.number;
  b.append(c, num);
  b.addEventListener('click', () => ring(f.index, b));
  sheet.append(b);
  drawRest(c, f);
  return b;
});

// Ars Magna: the same two waves, put together the other way.
const arsBtn = $('#ars-btn');
const arsThumb = $('#ars-thumb');
arsBtn.addEventListener('click', () => {
  const now = parseFig(arsThumb.dataset.ring);
  const next = FIGS.find((f) => f.n === now.n && f.m === now.m && f.s === -now.s);
  arsThumb.dataset.ring = $('#ars-canvas').dataset.figure = `${next.n},${next.m},${next.s}`;
  drawRest($('#ars-canvas'), next);
  $('#ars-stamp').textContent = `Fig. ${next.number} · ${Math.round(next.hz).toLocaleString('en-US')} Hz`;
  arsBtn.textContent = next.s > 0 ? 'Rearrange: + to −' : 'Rearrange: − to +';
  arsBtn.setAttribute('aria-pressed', String(next.s < 0));
  ring(next.index, arsThumb);
});

// Amordle: a bar for every word length, a semitone lower for each letter more.
const bars = $('#bars');
const barsSay = $('#bars-say');
const barHz = (len) => 440 * 2 ** ((96 - (len - 2) - 69) / 12);
let lastBar = null;
function hitBar(b) {
  const len = Number(b.dataset.len);
  audio.ping(barHz(len), 0.8, 0.32);
  barsSay.textContent = `${len} letters · ${Math.round(barHz(len)).toLocaleString('en-US')} Hz`;
  lastBar?.classList.remove('is-hit');
  b.classList.add('is-hit');
  lastBar = b;
}
for (let len = 2; len <= 35; len++) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.len = len;
  b.tabIndex = len === 2 ? 0 : -1;
  b.style.setProperty('--h', `${18 + (82 * (len - 2)) / 33}%`);
  b.setAttribute('aria-label', `${len} letters`);
  bars.append(b);
}
let barDrag = false;
bars.addEventListener('pointerdown', (e) => {
  barDrag = true;
  if (e.target.dataset.len) hitBar(e.target);
});
window.addEventListener('pointerup', () => (barDrag = false));
bars.addEventListener('pointermove', (e) => {
  if (!barDrag) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (el && el.parentNode === bars && el !== lastBar) hitBar(el);
});
bars.addEventListener('click', (e) => {
  if (e.detail === 0 && e.target.dataset.len) hitBar(e.target); // the keyboard's click
});
bars.addEventListener('keydown', (e) => {
  const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
  if (!step || !e.target.dataset.len) return;
  const next = step > 0 ? e.target.nextElementSibling : e.target.previousElementSibling;
  if (next) {
    e.target.tabIndex = -1;
    next.tabIndex = 0;
    next.focus();
    hitBar(next);
  }
  e.preventDefault();
});

// grooph: a loop that names its stop.
const loopNodes = Object.fromEntries([...document.querySelectorAll('[data-node]')].map((n) => [n.dataset.node, n]));
const loopSay = $('#loop-say');
const LOOP = [
  ['build', 'Pass 1: build.', 327.03],
  ['check', 'Pass 1: check. Not yet: go round again.', 436.04],
  ['build', 'Pass 2: build.', 327.03],
  ['check', 'Pass 2: check. It passes.', 436.04],
  ['decide', 'A person decides: ship it.', 523.25],
  ['stop', 'Stop. The loop named its stop, so it ends here.', 261.63],
];
let loopTimer = 0;
function runLoop(sound) {
  clearTimeout(loopTimer);
  const show = (i) => {
    for (const n of Object.values(loopNodes)) n.classList.remove('is-on');
    const [id, text, hz] = LOOP[i];
    loopNodes[id].classList.add('is-on');
    loopSay.textContent = text;
    if (sound) audio.ping(hz, i === LOOP.length - 1 ? 1.4 : 0.5, 0.3);
    if (i < LOOP.length - 1) loopTimer = setTimeout(show, 560, i + 1);
  };
  show(reduce.matches ? LOOP.length - 1 : 0);
}
$('#loop-btn').addEventListener('click', () => runLoop(true));

// The example: eight figures, the same every time, for the screens to read.
// It is the page's playing, so it never goes into the visitor's take.
function playPhrase() {
  audio.start();
  clearTimeout(phraseTimer);
  stopPlayback();
  const notes = [3, 5, 7, 11, 13, 11, 7, 11];
  armed = false;
  const next = (i) => {
    setFigure(notes[i], 0.3);
    if (i < notes.length - 1) phraseTimer = setTimeout(next, 470, i + 1);
  };
  next(0);
}
for (const b of document.querySelectorAll('[data-phrase]')) b.addEventListener('click', playPhrase);

// ---- The screens: measured from the page's own sound ---------------------------

const screens = {
  gram: $('#spectrogram'),
  spec: $('#spectrum'),
  scope: $('#scope'),
  land: $('#landscape'),
};
const seen = new Map();
const io = new IntersectionObserver((entries) => {
  for (const e of entries) seen.set(e.target, e.isIntersecting);
});
for (const c of [cv, ...Object.values(screens)]) {
  c.dataset.ratio = c.height / c.width;
  io.observe(c);
}
function fit(c) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(c.clientWidth * dpr);
  if (!w || c.width === w) return false;
  c.width = w;
  c.height = Math.round(w * Number(c.dataset.ratio));
  return true;
}

const F_LO = 55;
const F_HI = 7000;
const logPos = (hz) => clamp(Math.log(hz / F_LO) / Math.log(F_HI / F_LO));
// The loudest bin in each of nb bands, low to high, as 0..1.
function bandsOf(fd, rate, nb, out) {
  const bin = rate / 2 / fd.length;
  for (let b = 0; b < nb; b++) {
    const lo = F_LO * (F_HI / F_LO) ** (b / nb);
    const hi = F_LO * (F_HI / F_LO) ** ((b + 1) / nb);
    let i0 = Math.floor(lo / bin);
    const i1 = Math.max(i0 + 1, Math.ceil(hi / bin));
    let db = -200;
    for (; i0 < i1 && i0 < fd.length; i0++) if (fd[i0] > db) db = fd[i0];
    out[b] = clamp((db + 88) / 62);
  }
  return out;
}
// The pitch, by the difference function (as YIN does), on every fourth sample.
function pitchOf(td, rate) {
  const D = 4;
  const r = rate / D;
  const W = 420;
  const tMin = Math.floor(r / 2400);
  const tMax = Math.min(Math.floor(td.length / D) - W - 1, Math.ceil(r / 55));
  let run = 0;
  let best = 0;
  let bestV = 1;
  const d = new Float32Array(tMax + 1);
  for (let tau = 1; tau <= tMax; tau++) {
    let sum = 0;
    for (let i = 0; i < W; i++) {
      const x = td[i * D] - td[(i + tau) * D];
      sum += x * x;
    }
    run += sum;
    d[tau] = run > 0 ? (sum * tau) / run : 1;
  }
  for (let tau = Math.max(2, tMin); tau < tMax; tau++) {
    if (d[tau] < 0.12 && d[tau] <= d[tau + 1]) {
      best = tau;
      bestV = d[tau];
      break;
    }
    if (d[tau] < bestV) {
      bestV = d[tau];
      best = tau;
    }
  }
  if (!best || bestV > 0.3) return 0;
  const a = d[best - 1];
  const b = d[best];
  const c = d[best + 1];
  const shift = a + c - 2 * b ? (0.5 * (a - c)) / (a + c - 2 * b) : 0;
  return r / (best + shift);
}

const NB = 56;
const gramBands = new Float32Array(NB);
const gramBuf = document.createElement('canvas');
const specBands = new Float32Array(96);
const LAND_NB = 44;
const LAND_MAX = 64;
const landFrames = [];
let landDirty = true;
let landClock = 0;
let gramClock = 0;
let heard = { rms: 0, peak: 0, live: false };
const peakEl = $('#lab-peak');
const landCap = $('#land-cap');

function listen(dt) {
  if (!audio.ctx) return;
  const { an, fd, td } = audio;
  const rate = audio.ctx.sampleRate;
  an.getFloatFrequencyData(fd);
  an.getFloatTimeDomainData(td);
  let sq = 0;
  for (let i = 0; i < td.length; i += 2) sq += td[i] * td[i];
  const rms = Math.sqrt(sq / (td.length / 2));
  const live = rms > 0.004;
  // The loudest frequency, between its bins.
  let pi = 1;
  for (let i = 2; i < fd.length - 1; i++) if (fd[i] > fd[pi]) pi = i;
  const a = fd[pi - 1];
  const b = fd[pi];
  const c = fd[pi + 1];
  const off = a + c - 2 * b ? (0.5 * (a - c)) / (a + c - 2 * b) : 0;
  const peak = ((pi + off) * rate) / an.fftSize;
  heard = { rms, peak, live };

  if (mic.on) {
    mic.clock += dt;
    if (mic.clock >= 0.06) {
      mic.clock = 0;
      mic.loud = clamp((20 * Math.log10(Math.max(rms, 1e-6)) + 50) / 30);
      mic.hz = mic.loud > 0.05 ? pitchOf(td, rate) : 0;
      micHeard();
    }
  }

  landClock += dt;
  if (landClock >= 0.04) {
    landClock %= 0.04;
    if (live) {
      // One frame: bands, loudness, centroid, pitch.
      let num = 0;
      let den = 0;
      const top = Math.min(fd.length, Math.floor(10000 / (rate / an.fftSize)));
      for (let i = 1; i < top; i++) {
        const p = 10 ** (fd[i] / 10);
        num += p * i;
        den += p;
      }
      landFrames.push({
        bands: bandsOf(fd, rate, LAND_NB, new Float32Array(LAND_NB)),
        loud: clamp((20 * Math.log10(rms) + 50) / 44),
        centroid: den ? ((num / den) * rate) / an.fftSize : 0,
        f0: pitchOf(td, rate),
      });
      if (landFrames.length > LAND_MAX) landFrames.shift();
      landDirty = true;
    }
  }
}

function drawGram() {
  const c = screens.gram;
  const g = c.getContext('2d');
  if (fit(c)) g.clearRect(0, 0, c.width, c.height);
  // By the clock, not by the frame: a slow device crosses the screen in the
  // same six seconds, in wider steps.
  const now = performance.now();
  const since = Math.min(0.5, (now - gramClock) / 1000);
  if (!heard.live) {
    gramClock = now;
    return;
  }
  const every = reduce.matches ? 0.3 : 0.035;
  if (since < every) return;
  gramClock = now;
  const step = Math.max(2, Math.round((c.width * since) / 6));
  // Slide the picture left by way of a second canvas: a canvas drawn onto
  // itself does not keep what it had.
  if (gramBuf.width !== c.width || gramBuf.height !== c.height) {
    gramBuf.width = c.width;
    gramBuf.height = c.height;
  }
  const bg = gramBuf.getContext('2d');
  bg.clearRect(0, 0, c.width, c.height);
  bg.drawImage(c, 0, 0);
  g.clearRect(0, 0, c.width, c.height);
  g.drawImage(gramBuf, -step, 0);
  bandsOf(audio.fd, audio.ctx.sampleRate, NB, gramBands);
  const rowH = c.height / NB;
  const grain = Math.max(1.2, c.width / 520);
  g.fillStyle = `${SAND} 0.9)`;
  g.beginPath();
  for (let b = 0; b < NB; b++) {
    const v = gramBands[b] ** 2.2;
    const n = v * step * rowH * 0.34;
    const whole = Math.floor(n) + (Math.random() < n % 1 ? 1 : 0);
    for (let k = 0; k < whole; k++)
      g.rect(c.width - step + Math.random() * step, c.height - (b + Math.random()) * rowH, grain, grain);
  }
  g.fill();
}

function drawSpec() {
  const c = screens.spec;
  const g = c.getContext('2d');
  fit(c);
  const W = c.width;
  const H = c.height;
  g.clearRect(0, 0, W, H);
  const base = H * 0.9;
  g.fillStyle = `${SAND} 0.9)`;
  g.fillRect(W * 0.04, base, W * 0.92, Math.max(1, H * 0.008));
  if (!audio.ctx) return;
  bandsOf(audio.fd, audio.ctx.sampleRate, specBands.length, specBands);
  const bw = (W * 0.92) / specBands.length;
  for (let b = 0; b < specBands.length; b++) {
    const h = specBands[b] ** 1.6 * H * 0.78;
    if (h > 1) g.fillRect(W * 0.04 + b * bw, base - h, Math.max(1, bw * 0.7), h);
  }
  if (heard.live) {
    const x = W * 0.04 + logPos(heard.peak) * W * 0.92;
    g.fillStyle = ACCENT;
    g.fillRect(x - 1, H * 0.06, Math.max(2, W / 240), base - H * 0.06);
  }
}

function drawScope() {
  const c = screens.scope;
  const g = c.getContext('2d');
  fit(c);
  const W = c.width;
  const H = c.height;
  g.clearRect(0, 0, W, H);
  g.strokeStyle = `${SAND} 0.92)`;
  g.lineWidth = Math.max(1.5, W / 260);
  g.lineJoin = 'round';
  g.beginPath();
  const td = audio.td;
  if (!td || !heard.live) {
    g.moveTo(W * 0.04, H / 2);
    g.lineTo(W * 0.96, H / 2);
    g.stroke();
    return;
  }
  // Start on a rising crossing, so the trace stands still.
  let start = 0;
  for (let i = 1; i < td.length / 2; i++)
    if (td[i - 1] < 0 && td[i] >= 0) {
      start = i;
      break;
    }
  const span = 1100;
  const gain = Math.min(6, 0.42 / Math.max(0.02, heard.rms * 1.6));
  for (let i = 0; i < span; i += 2) {
    const x = W * 0.04 + (i / span) * W * 0.92;
    const y = H / 2 - clamp(td[start + i] * gain, -1, 1) * H * 0.42;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();
}

function drawLand() {
  const c = screens.land;
  const g = c.getContext('2d');
  if (!fit(c) && !landDirty) return;
  landDirty = false;
  const W = c.width;
  const H = c.height;
  const px = W / 640;
  g.clearRect(0, 0, W, H);
  g.lineJoin = 'round';
  for (let i = 0; i < LAND_MAX; i++) {
    const fr = landFrames[landFrames.length - LAND_MAX + i];
    const t = i / (LAND_MAX - 1); // 0 at the back, 1 in front
    const y0 = H * (0.2 + 0.72 * t ** 1.25);
    const half = W * (0.27 + 0.19 * t);
    const amp = H * (0.05 + 0.15 * t);
    const x = (b) => W / 2 - half + (2 * half * b) / (LAND_NB - 1);
    g.beginPath();
    g.moveTo(x(0), y0);
    if (fr) for (let b = 0; b < LAND_NB; b++) g.lineTo(x(b), y0 - fr.bands[b] ** 1.7 * amp);
    g.lineTo(x(LAND_NB - 1), y0);
    if (fr) {
      g.fillStyle = SCREEN;
      g.fill();
      g.strokeStyle = `${SAND} ${0.5 + 0.45 * t})`;
      g.lineWidth = (0.6 + 2.3 * fr.loud) * px * (0.6 + 0.4 * t);
      g.stroke();
      if (fr.f0 > F_LO) {
        const b = logPos(fr.f0) * (LAND_NB - 1);
        g.fillStyle = ACCENT;
        g.beginPath();
        g.arc(x(b), y0 - fr.bands[Math.round(b)] ** 1.7 * amp - 3 * px, (1.6 + 1.8 * t) * px, 0, 7);
        g.fill();
      }
      if (fr.centroid > F_LO) {
        g.fillStyle = `${SAND} 0.9)`;
        g.fillRect(x(logPos(fr.centroid) * (LAND_NB - 1)), y0 + 1.5 * px, 1.6 * px, (2 + 3 * t) * px);
      }
    } else {
      g.strokeStyle = `${SAND} 0.16)`;
      g.lineWidth = 0.8 * px;
      g.stroke();
    }
  }
}

// ---- The plate a visitor picks -------------------------------------------------
// The scheme is an attribute on <html>; the stylesheet does the rest. Here the
// canvases take their colors from it and are drawn again.

const PLATES = ['copper', 'brass', 'steel', 'titanium', 'bronze'];
const SAND_WORD = { bronze: 'pale' }; // every other plate carries black sand
const rootEl = document.documentElement;
// The plate a first-time visitor sees: the one index.html names on <html>.
const FIRST_PLATE = PLATES.includes(rootEl.dataset.plateFirst) ? rootEl.dataset.plateFirst : PLATES[0];
const picker = $('#plates');
const themeMeta = document.querySelector('meta[name="theme-color"]');

function readPlate() {
  const css = getComputedStyle(rootEl);
  const v = (name) => css.getPropertyValue(name).trim();
  SAND = `rgba(${v('--ink-rgb')},`;
  SCREEN = v('--screen-fill');
  ACCENT = v('--accent');
  if (themeMeta) themeMeta.content = v('--ground');
}

function setPlate(name, keep) {
  if (!PLATES.includes(name)) name = FIRST_PLATE;
  rootEl.dataset.plate = name;
  if (keep) saved.plate = name;
  readPlate();
  for (const input of picker.querySelectorAll('input')) {
    input.checked = input.value === name;
    input.parentNode.classList.toggle('is-on', input.checked);
  }
  for (const el of document.querySelectorAll('[data-plate-word]')) el.textContent = name;
  for (const el of document.querySelectorAll('[data-sand-word]')) el.textContent = SAND_WORD[name] || 'black';
  // Everything drawn in sand is drawn again in the new sand.
  for (const c of document.querySelectorAll('canvas[data-figure]')) drawRest(c, parseFig(c.dataset.figure));
  sheetButtons.forEach((b, i) => drawRest(b.firstChild, FIGS[i]));
  const gram = screens.gram;
  gram.getContext('2d').clearRect(0, 0, gram.width, gram.height);
  plateDirty = landDirty = true;
}
picker.addEventListener('change', (e) => setPlate(e.target.value, true));
picker.hidden = false;
setPlate(rootEl.dataset.plate, false);

// ---- One loop ------------------------------------------------------------------

const nameEl = document.documentElement;
const out = {
  no: $('#fig-no'),
  mode: $('#fig-mode'),
  hz: $('#fig-hz'),
  times: $('#fig-times'),
  share: $('#fig-share'),
};
let shown = { index: -1, share: -1, wdth: 0, ring: -1, text: '' };
let readClock = 1;
let labClock = 0;

function readout(dt) {
  readClock += dt;
  if (readClock < 0.12) return;
  readClock = 0;
  const f = figAt(state.u);
  if (f.index !== shown.index) {
    shown.index = f.index;
    out.no.textContent = f.number;
    out.mode.textContent = `n ${f.n} · m ${f.m} · ${f.s > 0 ? '+' : '−'}`;
    out.hz.textContent = `${Math.round(f.hz).toLocaleString('en-US')} Hz`;
    out.times.textContent = f.k === 1 ? 'the lowest' : `${f.k} × the lowest`;
    stage.setAttribute('aria-valuenow', f.number);
    stage.setAttribute(
      'aria-valuetext',
      `Figure ${f.number} of 24: n ${f.n}, m ${f.m}, ${f.s > 0 ? 'plus' : 'minus'}, ${Math.round(f.hz)} hertz`,
    );
    ticks.forEach((t, i) => t.classList.toggle('on', i === f.index));
    sheetButtons.forEach((b, i) => b.classList.toggle('is-current', i === f.index));
  }
  const share = Math.round(sand.share(f) * 100);
  if (share !== shown.share) out.share.textContent = shown.share = share;
  if (heard.live && audio.ctx) {
    const text = `${Math.round(heard.peak).toLocaleString('en-US')} Hz`;
    if (text !== shown.text) peakEl.textContent = shown.text = text;
  }
  if (landFrames.length && !landCap.dataset.live) {
    landCap.dataset.live = '1';
    landCap.textContent = 'What you played · newest in front · low notes left, high notes right';
  }
}

let last = performance.now();
function frame(now) {
  const real = (now - last) / 1000;
  const dt = clamp(real, 0.001, 0.05);
  last = now;
  fitPlate();

  // How hard the plate rings.
  let target = 0;
  if (state.hold > 0) {
    state.hold -= dt;
    target = 1;
  }
  if (state.keyHeld) target = Math.max(target, 0.9);
  if (state.bowing) target = Math.max(target, state.bowSpeed);
  if (mic.on && mic.answer) {
    state.u = mic.answer.index;
    target = Math.max(target, mic.answer.response * mic.loud);
    armed = true;
  }
  state.bowSpeed *= Math.exp(-dt / 0.14);

  // A take played back sets the bow and the ringing itself.
  let led = false;
  if (playing) {
    const step = playing.at(now - playStart);
    for (const b of step.pings) audio.ping(b.hz, b.seconds, b.gain);
    if (step.u !== null) {
      if (reduce.matches && Math.round(step.u) !== Math.round(state.u)) {
        state.u = step.u;
        settleNow();
      }
      state.u = step.u;
      state.energy = step.e;
      led = true;
    }
    target = 0;
    if (step.done) stopPlayback();
  }
  if (!led) {
    const tau = target > state.energy ? 0.04 : 0.5;
    state.energy += (target - state.energy) * (1 - Math.exp(-dt / tau));
    if (state.energy < 0.004 && target === 0) state.energy = 0;
  }
  // What the visitor plays goes into the take: not the first silent settle,
  // not the example, not a playback or the ring it leaves behind.
  if (audio.ctx && armed && !playing) take.frame(now, state.u, state.energy);

  // The bow finds the nearest note when it slows.
  if (!led && (!state.bowing || state.bowSpeed < 0.06)) {
    const r = Math.round(state.u);
    state.u += (r - state.u) * (1 - Math.exp(-dt / 0.09));
    if (Math.abs(r - state.u) < 0.002) state.u = r;
  }
  showTake();

  if (!reduce.matches && sand.step(dt, drive())) plateDirty = true;
  if (plateDirty && seen.get(cv) !== false) drawSand();

  const closest = near(Math.abs(state.u - Math.round(state.u)));
  // While the plate listens it keeps quiet, or it would hear itself.
  audio.bow(hzAt(state.u), mic.on ? 0 : state.energy ** 1.5 * 0.42 * (0.3 + 0.7 * closest));

  // The bow, the glow and the width of the name.
  const frac = 1 - (state.u + 0.5) / FIGS.length;
  bowEl.style.top = hintEl.style.top = `${4 + 92 * frac}%`;
  if (!state.bowing) {
    const sway = reduce.matches ? 0 : Math.sin(now / 95) * stage.clientWidth * 0.07 * state.energy;
    state.stroke += (sway - state.stroke) * 0.3;
  }
  bowEl.style.setProperty('--bx', `${state.stroke.toFixed(1)}px`);
  const ringNow = Math.round(state.energy * 20) / 20;
  if (ringNow !== shown.ring) nameEl.style.setProperty('--ring', (shown.ring = ringNow));
  const wdth = Math.round(125 - 63 * clamp(Math.log2(hzAt(state.u) / BASE_HZ) / 5));
  if (wdth !== shown.wdth) nameEl.style.setProperty('--wdth', (shown.wdth = wdth));

  // The screens.
  listen(dt);
  labClock += dt;
  if (seen.get(screens.gram)) drawGram();
  if (labClock > (reduce.matches ? 0.4 : 0.03)) {
    labClock = 0;
    if (seen.get(screens.spec)) drawSpec();
    if (seen.get(screens.scope)) drawScope();
  }
  if (seen.get(screens.land)) drawLand();
  readout(real);
  requestAnimationFrame(frame);
}

// First paint: the sand finds Splashery's figure, in silence.
fitPlate();
if (reduce.matches) settleNow();
else state.hold = 2.6;
drawSand();
requestAnimationFrame(frame);
window.addEventListener('resize', () => (landDirty = true));

// The loop runs once, silently, when it first scrolls into view.
const loopEl = $('#loop');
const loopSeen = new IntersectionObserver(
  (entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      loopSeen.disconnect();
      runLoop(false);
    }
  },
  { threshold: 0.6 },
);
loopSeen.observe(loopEl);

// The real plate, from Splashery: loaded only when asked, silent until tapped.
const realBtn = $('#real-btn');
realBtn.hidden = false;
realBtn.addEventListener('click', () => {
  const holder = $('#real-frame');
  const frame = document.createElement('iframe');
  frame.src = 'https://ryanjosephkamp.github.io/splashery/embed/?toy=chladni-plate&sound=on&turntable=off';
  frame.title = "Splashery's Chladni plate. Tap the plate to play its note.";
  frame.allow = 'autoplay';
  const status = $('#real-status');
  status.textContent = 'Loading the plate from Splashery. It can take a few seconds.';
  frame.addEventListener('load', () => (status.textContent = 'When the plate appears, tap it.'));
  holder.append(frame);
  holder.hidden = false;
  realBtn.hidden = true;
});
