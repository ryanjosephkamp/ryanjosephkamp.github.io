// The light box: reads a scan off its contact sheet and hangs the live pictures.
// The math is in volume.js; this file is the DOM.

import { SCANS, embedUrl, CUT_LABELS, presets, sheetSize, sheetToVolume, cutShape, cut, mip, solids, blocks, cutaway, shade, viewShape, histogram, runningCount, windowCounts, lookup, shadowSet, viewAngle, rebuild } from './volume.js'; // prettier-ignore

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, root = document) => root.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmt = (n) => n.toLocaleString('en-US');

// ---- Colors: what a density prints as ------------------------------------------------------

const FILM = [7, 14, 22];
const LIGHT = [234, 245, 255];
const gray = (t) => FILM.map((f, i) => f + (LIGHT[i] - f) * t ** 0.9);
// Splashery's "Bone and tissue" transfer function.
const STOPS = ['#6e2a1e', '#b5553f', '#d99a76', '#eedcbc', '#fff8ea'].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))); // prettier-ignore
const warm = (t) => {
  if (t <= 0) return FILM;
  const x = Math.min(t, 1) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(x));
  return STOPS[i].map((c, j) => c + (STOPS[i + 1][j] - c) * (x - i));
};
const BACK = 0xff000000 | (FILM[2] << 16) | (FILM[1] << 8) | FILM[0];

// ---- State ---------------------------------------------------------------------------------

const state = {
  pos: [0, 0, 0], // the voxel where the three cuts cross: x, y, z
  lo: 0,
  hi: 255,
  warm: false,
  mode: 'cutaway', // what the fourth picture is: 'cutaway' or 'mip'
  base: 0.6, // where the fourth picture rests; it sways about this until someone turns it
  theta: 0.6,
  touched: false, // a visitor has moved a cut
  turned: 0, // when a visitor last turned the fourth picture
};

// Each scan, read once: its voxels and what the pictures need from them.
const loaded = {};
async function load(id) {
  if (loaded[id]) return loaded[id];
  const s = SCANS[id];
  let img = $('#sheet-data');
  if (id !== 'walnut') {
    img = new Image();
    img.src = s.sheet;
  }
  if (!img.complete || !img.naturalWidth) await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const vol = sheetToVolume(s, g.getImageData(0, 0, c.width, c.height).data, c.width, 4);
  const hist = histogram(vol);
  return (loaded[id] = { s, vol, hist, upTo: runningCount(hist, s.air), grid: blocks(s, vol), solid: null, presets: presets(s) });
}

function start(first) {
  const viewer = $('#viewer');
  let cur = first; // the scan on the box
  let lut = new Uint32Array(256);
  let tones = new Uint8Array(768);
  const dirty = { cuts: true, view: true, window: true, ct: true };
  let pending = false;
  let onScreen = true;
  let ctOnScreen = false;
  let cost = 0; // how long the last cutaway took, in milliseconds

  // -- The four pictures --
  const panes = [...viewer.querySelectorAll('.pane')].map((el) => {
    const canvas = $('canvas', el);
    return { name: el.dataset.cut, el, view: $('.view', el), canvas, g: canvas.getContext('2d'), readout: $('[data-readout]', el) };
  });
  const size = (p, w, h) => {
    p.canvas.width = w;
    p.canvas.height = h;
    p.image = p.g.createImageData(w, h);
    p.out = new Uint32Array(p.image.data.buffer);
    p.raw = new Uint8Array(w * h);
    p.el.style.setProperty('--a', (w / h).toFixed(4));
  };
  const view = panes.find((p) => p.name === 'view');
  function sizeView() {
    const { W, H } = viewShape(cur.s);
    size(view, W, state.mode === 'mip' ? cur.s.nz : H);
    view.hit = new Int32Array(W * H);
    dirty.view = true;
  }
  const print = (p) => {
    for (let i = 0; i < p.raw.length; i++) p.out[i] = lut[p.raw[i]];
    p.g.putImageData(p.image, 0, 0);
  };
  const len = (k) => `${(k * cur.s.mm).toFixed(cur.s.digits)} mm`;

  function draw() {
    pending = false;
    const s = cur.s;
    if (dirty.window) {
      const ramp = state.warm ? warm : gray;
      lut = new Uint32Array(lookup(state.lo, state.hi, ramp).buffer);
      for (let i = 0; i < 256; i++) tones.set(ramp(i / 255), i * 3);
      drawWindow();
      dirty.ct = true;
      dirty.view = true;
    }
    if (dirty.cuts) {
      if (state.mode === 'cutaway') dirty.view = true;
      for (const p of panes) {
        if (p === view) continue;
        const c = p.shape;
        const k = state.pos[c.along];
        cut(s, cur.vol, p.name, k, p.raw);
        p.view.style.setProperty('--x', (state.pos[c.across] + 0.5) / c.w);
        p.view.style.setProperty('--y', (state.pos[c.down] + 0.5) / c.h);
        p.readout.textContent = `${k + 1}/${c.n} · ${len(k)}`;
      }
      const [x, y, z] = state.pos;
      const v = cur.vol[x + s.nx * (y + s.ny * z)];
      const what = s.parts[v <= s.air ? 0 : v < s.dense ? 1 : 2];
      $('#burn-pos').textContent = `x ${len(x)} · y ${len(y)} · z ${len(z)} · density ${v} · ${what}`;
      const ring = $('#ring');
      ring.style.setProperty('--c', z % s.cols);
      ring.style.setProperty('--r', Math.floor(z / s.cols));
      dirty.ct = true;
    }
    if (dirty.cuts || dirty.window) for (const p of panes) if (p !== view) print(p);
    if (dirty.view) {
      if (state.mode === 'mip') {
        cur.solid = cur.solid || solids(s, cur.vol);
        mip(s, cur.solid, state.theta, view.raw);
        print(view);
      } else {
        const t0 = performance.now();
        cutaway(s, cur.vol, cur.grid, state.theta, state.pos, Math.max(state.lo, 8), view.hit);
        shade(s, cur.vol, state.theta, view.hit, state.lo, state.hi, tones, lut, BACK, view.out);
        view.g.putImageData(view.image, 0, 0);
        cost = performance.now() - t0;
      }
      const deg = Math.round(((((state.theta * 180) / Math.PI) % 360) + 360) % 360);
      view.readout.textContent = `turned ${deg}°`;
    }
    if (dirty.ct && ctOnScreen) drawCT();
    dirty.cuts = dirty.view = dirty.window = false;
  }
  const ask = (what) => {
    if (what) dirty[what] = true;
    if (!pending) {
      pending = true;
      requestAnimationFrame(draw);
    }
  };

  // -- Putting a scan on the box --
  const sheetImg = $('#sheet img');
  function use(scan) {
    cur = scan;
    const s = cur.s;
    for (const p of panes) {
      if (p === view) continue;
      p.shape = cutShape(s, p.name);
      size(p, p.shape.w, p.shape.h);
    }
    sizeView();
    state.pos = [...s.start];
    state.lo = cur.presets.full.lo;
    state.hi = cur.presets.full.hi;
    state.touched = false;
    state.base = state.theta = s.turn;
    $('#burn-title').textContent = s.title;
    for (const b of viewer.querySelectorAll('[data-scan]')) b.setAttribute('aria-pressed', String(b.dataset.scan === s.id));
    const bar = $('.scale', viewer);
    bar.style.width = `${(100 * s.bar[0]) / (s.nx * s.mm)}%`;
    bar.lastChild.textContent = s.bar[1];
    for (const c of viewer.querySelectorAll('[data-credit]')) c.hidden = c.dataset.credit !== s.id;
    // The contact sheet in the Splashery section follows.
    const { width, height, rows } = sheetSize(s);
    if (!sheetImg.src.endsWith(s.sheet)) {
      sheetImg.width = width;
      sheetImg.height = height;
      sheetImg.src = s.sheet;
    }
    const frame = $('#sheet .sheet-frame');
    frame.style.setProperty('--cols', s.cols);
    frame.style.setProperty('--rows', rows);
    frame.style.setProperty('--cell', `${s.nx} / ${s.ny}`);
    $('#sheet-count').textContent = `The whole exam · ${s.nz} slices · ${s.cols} to a row`;
    showReal(s);
    sizeCT();
    dirty.cuts = dirty.window = dirty.view = dirty.ct = true;
    ask();
  }

  // -- Moving the cuts --
  const moveTo = (p, e) => {
    const r = p.view.getBoundingClientRect();
    const c = p.shape;
    state.pos[c.across] = clamp(Math.floor(((e.clientX - r.left) / r.width) * c.w), 0, c.w - 1);
    state.pos[c.down] = clamp(Math.floor(((e.clientY - r.top) / r.height) * c.h), 0, c.h - 1);
    state.touched = true;
    ask('cuts');
  };
  const turnTo = (theta) => {
    state.base = state.theta = theta;
    state.turned = performance.now();
    ask('view');
  };
  for (const p of panes) {
    if (p === view) {
      let from = null;
      p.view.addEventListener('pointerdown', (e) => {
        from = { x: e.clientX, theta: state.theta };
        p.view.setPointerCapture(e.pointerId);
      });
      p.view.addEventListener('pointermove', (e) => {
        if (from) turnTo(from.theta + ((e.clientX - from.x) / p.view.clientWidth) * Math.PI);
      });
      const end = () => (from = null);
      p.view.addEventListener('pointerup', end);
      p.view.addEventListener('pointercancel', end);
      p.view.addEventListener('keydown', (e) => {
        const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
        if (!step) return;
        e.preventDefault();
        turnTo(state.theta + (step * Math.PI) / 36);
      });
      continue;
    }
    // A mouse cuts wherever it hovers. A finger cuts where it taps, or follows a sideways
    // drag; an up-and-down swipe is left to scroll the page.
    let down = null;
    p.view.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY, moved: e.pointerType === 'mouse' };
      if (down.moved) {
        p.view.setPointerCapture(e.pointerId);
        moveTo(p, e);
      }
    });
    p.view.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') return moveTo(p, e);
      if (!down) return;
      if (!down.moved && Math.abs(e.clientX - down.x) > Math.abs(e.clientY - down.y) + 3) down.moved = true;
      if (down.moved) moveTo(p, e);
    });
    p.view.addEventListener('pointerup', (e) => {
      if (down && !down.moved) moveTo(p, e); // a tap
      down = null;
    });
    p.view.addEventListener('pointercancel', () => (down = null));
    p.view.addEventListener('keydown', (e) => {
      const c = p.shape;
      const step = {
        ArrowLeft: [c.across, -1],
        ArrowRight: [c.across, 1],
        ArrowUp: [c.down, -1],
        ArrowDown: [c.down, 1],
        PageUp: [c.along, -1],
        PageDown: [c.along, 1],
      }[e.key];
      if (!step) return;
      e.preventDefault();
      const n = [cur.s.nx, cur.s.ny, cur.s.nz][step[0]];
      state.pos[step[0]] = clamp(state.pos[step[0]] + step[1] * (e.shiftKey ? 10 : 1), 0, n - 1);
      state.touched = true;
      ask('cuts');
    });
  }

  // -- The fourth picture: a cutaway, or the maximum-intensity picture --
  const modes = [...viewer.querySelectorAll('[data-mode]')];
  for (const b of modes)
    b.addEventListener('click', () => {
      state.mode = b.dataset.mode;
      for (const m of modes) m.setAttribute('aria-pressed', String(m === b));
      sizeView();
      ask();
    });

  // -- Choosing a scan --
  for (const b of viewer.querySelectorAll('[data-scan]'))
    b.addEventListener('click', async () => {
      if (b.dataset.scan === cur.s.id) return;
      $('#burn-pos').textContent = 'Reading the scan…';
      try {
        use(await load(b.dataset.scan));
      } catch (err) {
        $('#burn-pos').textContent = 'That scan did not load. The other is still on the box.';
        console.warn(err);
      }
    });

  // -- The window: a histogram, a step wedge, and the band you drag --
  const histCanvas = $('#hist');
  const hg = histCanvas.getContext('2d');
  const band = $('#band');
  const level = $('#level');
  const width = $('#width');
  function drawWindow() {
    const { hist, s } = cur;
    const W = histCanvas.width;
    const H = histCanvas.height;
    hg.clearRect(0, 0, W, H);
    const bars = H - 14;
    const peak = Math.sqrt(Math.max(...hist.subarray(1)));
    for (let v = 0; v < 256; v++) {
      const c = lut[v];
      hg.fillStyle = `rgb(${c & 255} ${(c >> 8) & 255} ${(c >> 16) & 255})`; // the step wedge
      hg.fillRect(v * 2, H - 10, 2, 10);
      if (!hist[v] || v === 0) continue;
      const h = Math.max(1, (Math.sqrt(hist[v]) / peak) * bars);
      hg.fillStyle = v > state.lo && v < state.hi ? '#d6e9f7' : '#4d6a82';
      hg.fillRect(v * 2, bars - h, 2, h);
    }
    band.style.setProperty('--lo', state.lo / 255);
    band.style.setProperty('--hi', state.hi / 255);
    const w = state.hi - state.lo;
    const l = Math.round((state.lo + state.hi) / 2);
    level.value = l;
    width.value = w;
    $('#level-out').textContent = l;
    $('#width-out').textContent = w;
    const n = windowCounts(cur.upTo, state.lo, state.hi);
    const pct = (k) => `${((100 * k) / n.total).toFixed(1)}%`;
    $('#count').textContent = `W ${w} · L ${l} · of the ${s.noun}'s ${fmt(n.total)} voxels, ${pct(n.black)} print black, ${pct(n.gray)} gray, ${pct(n.white)} white`;
    for (const b of viewer.querySelectorAll('[data-preset]')) {
      const p = cur.presets[b.dataset.preset];
      b.setAttribute('aria-pressed', String(p.lo === state.lo && p.hi === state.hi));
    }
  }
  const setWindow = (lo, hi) => {
    lo = clamp(Math.round(lo), 0, 254);
    hi = clamp(Math.round(hi), lo + 1, 255);
    state.lo = lo;
    state.hi = hi;
    ask('window');
  };
  const fromSliders = () => {
    const w = Number(width.value);
    const lo = clamp(Number(level.value) - w / 2, 0, 255 - w);
    setWindow(lo, lo + w);
  };
  level.addEventListener('input', fromSliders);
  width.addEventListener('input', fromSliders);
  let grab = null;
  band.addEventListener('pointerdown', (e) => {
    const which = e.target.classList.contains('grip-lo') ? 'lo' : e.target.classList.contains('grip-hi') ? 'hi' : 'both';
    grab = { which, x: e.clientX, lo: state.lo, hi: state.hi };
    band.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  band.addEventListener('pointermove', (e) => {
    if (!grab) return;
    const d = ((e.clientX - grab.x) / histCanvas.clientWidth) * 255;
    if (grab.which === 'lo') setWindow(Math.min(grab.lo + d, grab.hi - 1), grab.hi);
    else if (grab.which === 'hi') setWindow(grab.lo, Math.max(grab.hi + d, grab.lo + 1));
    else {
      const w = grab.hi - grab.lo;
      const lo = clamp(grab.lo + d, 0, 255 - w);
      setWindow(lo, lo + w);
    }
  });
  const drop = () => (grab = null);
  band.addEventListener('pointerup', drop);
  band.addEventListener('pointercancel', drop);
  for (const b of viewer.querySelectorAll('[data-preset]'))
    b.addEventListener('click', () => setWindow(cur.presets[b.dataset.preset].lo, cur.presets[b.dataset.preset].hi));
  $('#colors').addEventListener('click', (e) => {
    state.warm = !state.warm;
    e.currentTarget.setAttribute('aria-pressed', String(state.warm));
    ask('window');
  });

  // -- The contact sheet: choose a slice to hang it --
  const frame = $('#sheet .sheet-frame');
  frame.addEventListener('click', (e) => {
    const s = cur.s;
    const r = frame.getBoundingClientRect();
    const col = clamp(Math.floor(((e.clientX - r.left) / r.width) * s.cols), 0, s.cols - 1);
    const row = Math.floor(((e.clientY - r.top) / r.height) * sheetSize(s).rows);
    const z = row * s.cols + col;
    if (z < 0 || z >= s.nz) return;
    state.pos[2] = z;
    state.touched = true;
    ask('cuts');
    viewer.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  });

  // -- How a CT sees: the slice rebuilt from its shadows --
  const views = $('#views');
  const shadowCanvas = $('#ct-shadows');
  const sg = shadowCanvas.getContext('2d');
  const pictureCanvas = $('#ct-picture');
  const pg = pictureCanvas.getContext('2d');
  let played = false;
  let set = null; // the shadows of one slice, kept until the slice or the scan changes
  let setKey = '';
  let setMax = 1;
  function sizeCT() {
    pictureCanvas.width = cur.s.nx;
    pictureCanvas.height = cur.s.ny;
    setKey = '';
  }
  function drawCT() {
    dirty.ct = false;
    const { nx, ny, id } = cur.s;
    const n = Number(views.value);
    $('#views-out').textContent = n;
    const key = `${id}:${state.pos[2]}`;
    if (setKey !== key) {
      setKey = key;
      set = shadowSet(cut(cur.s, cur.vol, 'top', state.pos[2]), nx, ny);
      setMax = 1;
      for (const v of set.raw) if (v > setMax) setMax = v;
      shadowCanvas.width = set.bins;
    }
    const picture = rebuild(set, nx, ny, n);
    const img = pg.createImageData(nx, ny);
    const out = new Uint32Array(img.data.buffer);
    for (let i = 0; i < picture.length; i++) out[i] = lut[clamp(Math.round(picture[i]), 0, 255)];
    pg.putImageData(img, 0, 0);
    const H = shadowCanvas.height;
    const simg = sg.createImageData(set.bins, H);
    const sout = new Uint32Array(simg.data.buffer);
    for (let y = 0; y < H; y++) {
      const row = viewAngle(Math.floor((y * n) / H), n) * set.bins;
      for (let b = 0; b < set.bins; b++) {
        const [r, g, bl] = gray(set.raw[row + b] / setMax);
        sout[y * set.bins + b] = 0xff000000 | (bl << 16) | (g << 8) | r;
      }
    }
    sg.putImageData(simg, 0, 0);
  }
  views.addEventListener('input', () => {
    played = true;
    ask('ct');
  });
  new IntersectionObserver(
    ([e]) => {
      ctOnScreen = e.isIntersecting;
      if (!ctOnScreen) return;
      ask('ct');
      if (played || reduce) {
        if (!played) views.value = 180;
        played = true;
        return;
      }
      played = true;
      const t0 = performance.now();
      const step = (t) => {
        if (document.activeElement === views) return;
        const f = clamp((t - t0) / 7000, 0, 1);
        views.value = Math.max(1, Math.round(180 * f * f));
        ask('ct');
        if (f < 1 && ctOnScreen) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    { threshold: 0.4 },
  ).observe($('#ct'));

  // -- Idle motion: the cut drifts through the scan until someone takes it, and the fourth
  //    picture sways. A slow device sways at a lower rate.
  new IntersectionObserver(([e]) => (onScreen = e.isIntersecting)).observe(viewer);
  if (!reduce) {
    let phase = 0;
    let last = performance.now();
    let frame = 0;
    const idle = (t) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      const every = cost > 40 ? 4 : cost > 20 ? 2 : 1;
      if (onScreen && !document.hidden && frame++ % every === 0) {
        if (!state.touched) {
          const s = cur.s;
          state.pos[2] = Math.round(s.start[2] + s.nz * 0.3 * Math.sin(t / 2600));
          ask('cuts');
        }
        if (t - state.turned > 4000 || !state.turned) {
          phase += dt * every * 0.5;
          state.theta = state.base + 0.34 * Math.sin(phase);
          ask('view');
        } else phase = 0;
      }
      requestAnimationFrame(idle);
    };
    requestAnimationFrame(idle);
  }

  viewer.classList.add('live');
  use(first);
}

// ---- The anatomy atlas, as four films: click the top one to peel it --------------------------

const layers = [...document.querySelectorAll('#layers li')];
layers.forEach((li, i) => {
  li.style.setProperty('--i', i);
  $('button', li).addEventListener('click', () => {
    const front = layers.findIndex((l) => !l.classList.contains('peeled'));
    if (front < 0) return;
    // After the organs, a click brings every layer back.
    if (front === layers.length - 1) layers.forEach((l) => l.classList.remove('peeled'));
    else layers[front].classList.add('peeled');
  });
});

// "The real thing": the scan on the box, in Splashery's own embed player, loaded from Splashery's
// site only when asked for. It follows the scan: its heading, its words, and the toy if it is open.
let realScan = SCANS.walnut;
function showReal(s) {
  realScan = s;
  $('#real-h').textContent = s.real.heading;
  $('#real-text').textContent = s.real.text;
  const frame = $('#real iframe');
  if (frame && frame.dataset.scan !== s.id) loadReal();
}
function loadReal() {
  const frame = document.createElement('iframe');
  frame.src = embedUrl(realScan.real);
  frame.title = realScan.real.title;
  frame.allow = 'fullscreen';
  frame.dataset.scan = realScan.id;
  $('#real').replaceChildren(frame);
}
$('#real-load')?.addEventListener('click', loadReal);

// Without the scan the page falls back to what it is without scripts: the contact sheet.
load('walnut').then(start, (err) => {
  document.documentElement.classList.remove('js');
  console.warn('The walnut did not load; the contact sheet stays up.', err);
});
