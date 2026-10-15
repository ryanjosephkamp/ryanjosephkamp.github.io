// Toy Box: Ryan Kamp. No dependencies. The hero is this page's own small splat
// renderer (flat Gaussian discs, sorted back to front); it is not Splashery's engine.
import {
  TOYS, PAINTS, PAINT_NAMES, STROKE_MAX, CUT, splatAlpha, covariance, q8, d8,
  yawToByte, byteToYaw, pitchToByte, byteToPitch, encodeScene, decodeScene,
} from './scene.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const fmt = (n) => n.toLocaleString('en-US');

/* ------------------------------------------------------------------ sound */

const sound = (() => {
  let ac = null, master = null, on = false, noiseBuf = null, wind = null;
  function ensure() {
    if (ac) return;
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = 0.3;
    master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function tone(freq, { type = 'sine', dur = 0.3, vol = 0.5, to = 0, at = 0 } = {}) {
    const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function noise({ dur = 0.2, vol = 0.4, freq = 1200, to = 0, q = 1, type = 'bandpass', at = 0 } = {}) {
    const t = ac.currentTime + at, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf;
    s.loop = true;
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  }
  const SCALE = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];
  const voices = {
    // The name is a xylophone: one bar for each letter.
    bar: (i) => { const f = SCALE[i % 8]; tone(f, { dur: 0.55, vol: 0.5 }); tone(f * 4, { dur: 0.1, vol: 0.14 }); },
    crunch: () => { noise({ dur: 0.13, vol: 0.5, freq: 2600, to: 700, q: 0.7 }); tone(170, { dur: 0.12, vol: 0.3, to: 90, type: 'triangle' }); },
    bell: () => [1, 2.76, 5.4].forEach((m, k) => tone(440 * m, { dur: 0.9 / (k + 1), vol: 0.34 / (k + 1) })),
    gong: () => [1, 1.5, 2.02, 2.74].forEach((m, k) => tone(98 * m, { dur: 1.5 / (k * 0.5 + 1), vol: 0.42 / (k + 1) })),
    shutter: () => { noise({ dur: 0.04, vol: 0.5, freq: 3000, q: 0.5 }); noise({ dur: 0.05, vol: 0.4, freq: 1800, q: 0.5, at: 0.08 }); },
    boing: () => tone(330, { dur: 0.32, vol: 0.45, to: 120, type: 'triangle' }),
    squelch: () => noise({ dur: 0.13, vol: 0.5, freq: 400 + Math.random() * 300, to: 1900, q: 7, type: 'lowpass' }),
    clatter: () => { for (let k = 0; k < 18; k++) tone(900 + Math.random() * 2300, { dur: 0.07, vol: 0.16, at: 0.3 + Math.random() * 0.9, type: 'triangle' }); },
    zip: () => { tone(200, { dur: 0.42, vol: 0.32, to: 900, type: 'triangle' }); tone(1046.5, { dur: 0.3, vol: 0.3, at: 0.42 }); },
    tick: () => tone(1500, { dur: 0.02, vol: 0.1, type: 'square' }),
    pop: () => tone(680, { dur: 0.09, vol: 0.4, to: 1150 }),
  };
  function blow(active) {
    if (!ac) return;
    if (active && on && !wind) {
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noiseBuf;
      s.loop = true;
      f.type = 'bandpass';
      f.frequency.value = 650;
      f.Q.value = 0.6;
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.55, ac.currentTime + 0.15);
      s.connect(f).connect(g).connect(master);
      s.start();
      wind = { s, g };
    } else if (!active && wind) {
      const w = wind;
      wind = null;
      w.g.gain.cancelScheduledValues(ac.currentTime);
      w.g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.08);
      w.s.stop(ac.currentTime + 0.6);
    }
  }
  return {
    get on() { return on; },
    set(v) {
      if (!v) blow(false);
      on = v;
      if (v) { ensure(); ac.resume(); }
    },
    play(name, arg) { if (on && voices[name]) voices[name](arg); },
    blow,
  };
})();

/* ------------------------------------------------------------------- toys */

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const C = {
  pink: [1, 0.24, 0.55], yellow: [1, 0.86, 0.1], white: [1, 0.99, 0.96], orange: [1, 0.42, 0.12],
  violet: [0.42, 0.17, 1], ink: [0.11, 0.06, 0.21], sky: [0.59, 0.94, 1], dough: [0.95, 0.66, 0.32],
};
const LETTERS = 'RYANKAMP';
const LETTER_COLORS = [C.yellow, C.pink, C.white, C.orange, C.white, C.orange, C.pink, C.yellow];
const LETTER_CSS = ['#ffd60a', '#ff3d8b', '#fffdf5', '#ff6a1f', '#fffdf5', '#ff6a1f', '#ff3d8b', '#ffd60a'];

const TOY_INFO = {
  name: { label: 'The name', voice: 'bar', sway: true, pitch: 0.1, made: 'two rows of rounded letters, sampled from the page’s own typeface' },
  donut: { label: 'Donut', voice: 'crunch', pitch: 0.75, made: 'a torus with frosting and sprinkles' },
  knot: { label: 'Knot', voice: 'bell', pitch: 0.25, made: 'a trefoil knot in candy stripes' },
  planet: { label: 'Tiny planet', voice: 'gong', pitch: 0.3, made: 'a sphere with seas, land, ice caps and clouds' },
  photo: { label: 'Your picture', voice: 'shutter', sway: true, pitch: 0.05, made: 'your picture, one splat for each pixel of a small copy' },
};

// Each builder fills toy space (roughly -1.5..1.5 wide) with n flat splats:
// a middle, a normal, a color and a size. Everything is seeded.
function makeToy(n) {
  return {
    n, home: new Float32Array(n * 3), nrm: new Float32Array(n * 3), base: new Float32Array(n * 3),
    size: new Float32Array(n), tag: new Uint8Array(n), census: null,
  };
}
function put(T, i, x, y, z, nx, ny, nz, col, k, size, tag = 0) {
  const j = i * 3;
  T.home[j] = x; T.home[j + 1] = y; T.home[j + 2] = z;
  T.nrm[j] = nx; T.nrm[j + 1] = ny; T.nrm[j + 2] = nz;
  T.base[j] = col[0] * k; T.base[j + 1] = col[1] * k; T.base[j + 2] = col[2] * k;
  T.size[i] = size;
  T.tag[i] = tag;
}

// Where the splats go. White noise leaves clumps and holes that read as grain, so
// every builder places its splats with a low-discrepancy sequence instead: R2
// (Roberts) on surfaces and a Fibonacci lattice on the sphere. The random numbers
// that remain only vary a splat's size and shade.
const R2 = [0.7548776662466927, 0.5698402909980532];
const frac = (v) => v - Math.floor(v);
const TAU = Math.PI * 2;

function buildName(n) {
  const rand = rng(1999);
  const W = 680, H = 430, px = 200;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.font = `700 ${px}px Fredoka, "Arial Rounded MT Bold", "Helvetica Neue", Arial, sans-serif`;
  let li = 0;
  ['RYAN', 'KAMP'].forEach((row, r) => {
    const ws = [...row].map((ch) => ctx.measureText(ch).width);
    const gap = px * 0.03;
    let x = (W - ws.reduce((a, b) => a + b, 0) - gap * 3) / 2;
    [...row].forEach((ch, i) => {
      ctx.fillStyle = `rgb(${(li + 1) * 28},0,0)`;
      ctx.fillText(ch, x, r === 0 ? 196 : 392);
      x += ws[i] + gap;
      li++;
    });
  });
  const data = ctx.getImageData(0, 0, W, H).data;
  const alpha = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : data[(y * W + x) * 4 + 3]);
  const edges = [];
  let x0 = W, x1 = 0, y0 = H, y1 = 0, ink = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (alpha(x, y) < 128) continue;
      ink++;
      if (alpha(x - 1, y) < 128 || alpha(x + 1, y) < 128 || alpha(x, y - 1) < 128 || alpha(x, y + 1) < 128) edges.push(y * W + x);
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const T = makeToy(n);
  if (!edges.length) return T;
  const S = Math.max((x1 - x0) / 2.7, (y1 - y0) / 1.52), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const depth = 0.13, bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const letterAt = (p) => Math.max(0, Math.min(7, Math.round(data[p * 4] / 28) - 1));
  T.census = new Array(8).fill(0);
  // The letters' rims have several times the area of a face, so they take the biggest
  // share, and each part's splats are sized to its own spacing (three spacings to the
  // cut-off, one to a sigma), which is what closes a surface.
  const nSide = Math.round(n * 0.45), nFront = Math.round(n * 0.4);
  const faceArea = ink / (S * S), rimArea = (edges.length / S) * 2 * depth;
  const sFront = 3 * Math.sqrt(faceArea / nFront), sBack = 3 * Math.sqrt(faceArea / (n - nSide - nFront)), sSide = 3 * Math.sqrt(rimArea / nSide);
  const reach = Math.max(0.02, depth - sSide * 0.35);
  let i = 0;
  // The rim: every outline pixel gets its share, spread evenly through the depth.
  for (let k = 0; i < nSide; k++, i++) {
    const p = edges[Math.floor(frac(0.5 + k * R2[0]) * edges.length)], pxl = p % W, pyl = (p / W) | 0;
    const gx = alpha(pxl + 1, pyl) - alpha(pxl - 1, pyl), gy = alpha(pxl, pyl + 1) - alpha(pxl, pyl - 1), len = Math.hypot(gx, gy) || 1;
    const letter = letterAt(p);
    T.census[letter]++;
    put(T, i, (pxl + rand() - mx) / S, -(pyl + rand() - my) / S, (frac(0.5 + k * R2[1]) * 2 - 1) * reach, -gx / len, gy / len, 0,
      LETTER_COLORS[letter], 0.74 * (0.98 + 0.035 * rand()), sSide * (0.85 + 0.3 * rand()), letter);
  }
  // The two faces: points spread over the letters' box, kept where they land on ink.
  for (let k = 0; i < n && k < n * 40; k++) {
    const fx = x0 + frac(0.5 + k * R2[0]) * bw, fy = y0 + frac(0.5 + k * R2[1]) * bh;
    const p = Math.floor(fy) * W + Math.floor(fx);
    if (data[p * 4 + 3] < 128) continue;
    const letter = letterAt(p), front = i < nSide + nFront, shade = 0.98 + 0.035 * rand();
    T.census[letter]++;
    if (front) put(T, i, (fx - mx) / S, -(fy - my) / S, depth, (rand() - 0.5) * 0.06, (rand() - 0.5) * 0.06, 1, LETTER_COLORS[letter], shade, sFront * (0.85 + 0.3 * rand()), letter);
    else put(T, i, (fx - mx) / S, -(fy - my) / S, -depth, 0, 0, -1, LETTER_COLORS[letter], 0.55 * shade, sBack * (0.85 + 0.3 * rand()), letter);
    i++;
  }
  T.n = i;
  return T;
}

function buildDonut(n) {
  const rand = rng(8), T = makeToy(n), R = 0.8, r = 0.37, s0 = 0.062 * Math.sqrt(16000 / n);
  const sprinkles = [C.yellow, C.white, C.violet, C.sky, C.orange];
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  for (let i = 0; i < n; i++) {
    // A torus has less skin on the inside of the ring than the outside, so the angle
    // around the tube is not uniform: its share up to v is (R v + r sin v) / (2 pi R),
    // solved for v here by Newton's method.
    const u = frac(0.5 + i * R2[0]) * TAU, q = frac(0.5 + i * R2[1]) * TAU * R;
    let v = q / R;
    for (let it = 0; it < 5; it++) v -= (R * v + r * Math.sin(v) - q) / (R + r * Math.cos(v));
    const frosted = Math.sin(v) > -0.12 + 0.2 * Math.sin(5 * u) + 0.1 * Math.sin(9 * u + 1);
    const rr = r + (frosted ? 0.035 : 0);
    const cu = Math.cos(u), su = Math.sin(u), cvv = Math.cos(v), sv = Math.sin(v);
    let col = frosted ? C.pink : C.dough;
    if (frosted) {
      const a = (u / TAU) * 26, b = (v / TAU) * 9, h = hash(Math.floor(a), Math.floor(b));
      const fa = a - Math.floor(a) - 0.5, fb = b - Math.floor(b) - 0.5, t = h * 3.14;
      const ea = (fa * Math.cos(t) + fb * Math.sin(t)) / 0.4, eb = (-fa * Math.sin(t) + fb * Math.cos(t)) / 0.13;
      if (h < 0.5 && ea * ea + eb * eb < 1) col = sprinkles[Math.floor(h * 97) % 5];
    }
    put(T, i, (R + rr * cvv) * cu, rr * sv, (R + rr * cvv) * su, cvv * cu, sv, cvv * su, col, 0.975 + 0.04 * rand(), s0 * (0.8 + 0.5 * rand()));
  }
  return T;
}

function buildKnot(n) {
  const rand = rng(3), T = makeToy(n), k = 0.33, rho = 0.17, s0 = 0.06 * Math.sqrt(16000 / n);
  const stripes = [C.pink, C.white, C.yellow, C.white];
  for (let i = 0; i < n; i++) {
    const t = frac(0.5 + i * R2[0]) * TAU, a = frac(0.5 + i * R2[1]) * TAU;
    const px = (Math.sin(t) + 2 * Math.sin(2 * t)) * k, py = (Math.cos(t) - 2 * Math.cos(2 * t)) * k, pz = -Math.sin(3 * t) * k;
    let tx = Math.cos(t) + 4 * Math.cos(2 * t), ty = -Math.sin(t) + 4 * Math.sin(2 * t), tz = -3 * Math.cos(3 * t);
    const tl = Math.hypot(tx, ty, tz); tx /= tl; ty /= tl; tz /= tl;
    let nx = ty, ny = -tx; // cross(T, z)
    const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
    const bx = -tz * ny, by = tz * nx, bz = tx * ny - ty * nx;
    const ca = Math.cos(a), sa = Math.sin(a);
    const ox = nx * ca + bx * sa, oy = ny * ca + by * sa, oz = bz * sa;
    const stripe = stripes[Math.floor(((t * 8 + a) / TAU) * 2) % 4];
    put(T, i, px + ox * rho, py + oy * rho, pz + oz * rho, ox, oy, oz, stripe, 0.975 + 0.04 * rand(), s0 * (0.8 + 0.5 * rand()));
  }
  return T;
}

function buildPlanet(n) {
  const rand = rng(5), T = makeToy(n), s0 = 0.066 * Math.sqrt(16000 / n);
  const nGround = Math.round(n * 0.96);
  // The ground: a Fibonacci lattice wound around the spin axis.
  for (let i = 0; i < nGround; i++) {
    const y = 1 - (2 * (i + 0.5)) / nGround, ph = i * 2.399963229728653, q = Math.sqrt(1 - y * y);
    const x = q * Math.cos(ph), z = q * Math.sin(ph);
    const f = Math.sin(2.7 * x + 1.3) * Math.sin(3.1 * y + 0.5) + Math.sin(3.3 * z + 2) * Math.sin(2.2 * x - 1) + 0.5 * Math.sin(6.1 * y + 3 * x) * Math.sin(5.3 * z);
    let col = f > 0.28 ? (f > 0.75 ? C.orange : C.yellow) : C.violet;
    if (Math.abs(y) > 0.82 + 0.05 * Math.sin(7 * Math.atan2(z, x))) col = C.white;
    put(T, i, x * 0.92, y * 0.92, z * 0.92, x, y, z, col, 0.975 + 0.04 * rand(), s0 * (0.8 + 0.5 * rand()));
  }
  // The clouds: a second, thinner layer, kept where the weather says so, with splats
  // sized to the room each one has so that a cloud reads as a puff, not as dots.
  const nCloud = n - nGround, spots = [];
  let tried = 0;
  for (; spots.length < nCloud * 3 && tried < n * 60; tried++) {
    const y = 1 - 2 * frac(0.5 + tried * R2[0]), ph = frac(0.5 + tried * R2[1]) * TAU, q = Math.sqrt(1 - y * y);
    const x = q * Math.cos(ph), z = q * Math.sin(ph);
    if (Math.sin(4 * x + 2 * y) * Math.sin(3 * z - y * 2 + 1) > 0.55) spots.push(x, y, z);
  }
  const clouds = spots.length / 3, sCloud = 2.6 * Math.sqrt((4 * Math.PI * 1.02 * 1.02 * clouds) / tried / Math.max(1, clouds));
  for (let c = 0; c < clouds; c++) {
    const x = spots[c * 3], y = spots[c * 3 + 1], z = spots[c * 3 + 2];
    put(T, nGround + c, x * 1.02, y * 1.02, z * 1.02, x, y, z, C.white, 0.975 + 0.04 * rand(), sCloud);
  }
  T.n = nGround + clouds;
  return T;
}

function buildPhoto(n, bitmap) {
  const aspect = bitmap.width / bitmap.height;
  const w = Math.max(2, Math.round(Math.sqrt(n * aspect))), h = Math.max(2, Math.floor(n / w));
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data, T = makeToy(w * h), rand = rng(11);
  const step = Math.min(2.8 / w, 1.7 / h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4, col = [data[k] / 255, data[k + 1] / 255, data[k + 2] / 255];
      const lum = 0.3 * col[0] + 0.6 * col[1] + 0.1 * col[2];
      put(T, y * w + x, (x - (w - 1) / 2) * step, -(y - (h - 1) / 2) * step, (lum - 0.5) * 0.2, (rand() - 0.5) * 0.2, (rand() - 0.5) * 0.2, 1, col, 1, step * 2.1);
    }
  }
  return T;
}

/* ----------------------------------------------------------------- the box */

function toybox() {
  const stage = $('#stage'), canvas = $('#toy');
  if (!stage || !canvas) return;
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true });
  if (!gl) { document.documentElement.classList.add('no-gl'); return; }

  // How many splats. A tier is picked for the device; Fewer and More step it by hand,
  // and a tier nobody picked steps down by itself when frames run slow. The choice
  // stays in this browser and is never part of a link, so a link cannot weigh down
  // the phone that opens it.
  const TIERS = [12000, 24000, 48000, 96000, 192000];
  const small = Math.min(innerWidth, innerHeight) < 700 || (navigator.hardwareConcurrency || 4) <= 4;
  const weak = (navigator.deviceMemory || 8) <= 2 || (navigator.hardwareConcurrency || 4) <= 2;
  let tier = weak ? 1 : small ? 2 : 3, auto = true;
  try {
    const kept = localStorage.getItem('toybox:detail');
    if (kept !== null && TIERS[Number(kept)]) { tier = Number(kept); auto = false; }
  } catch { /* storage is off: stay automatic */ }
  let N = TIERS[tier];
  const DIST = 4.4, K = 46, DAMP = 5.5, GRAV = 7, PAINT_R = 0.12;
  const LIGHT = [0.35, 0.7, 0.62];

  const vs = `#version 300 es
layout(location=0) in vec2 corner;
layout(location=1) in vec3 iPos;
layout(location=2) in vec3 iNrm;
layout(location=3) in vec3 iCol;
layout(location=4) in float iSize;
uniform vec2 uScale;
uniform float uDist;
out vec2 vUv;
out vec3 vCol;
void main() {
  vec3 toCam = normalize(vec3(0.0, 0.0, uDist) - iPos);
  vec3 nn = dot(iNrm, toCam) < 0.0 ? -iNrm : iNrm;
  vec3 n = normalize(mix(nn, toCam, 0.5));
  vec3 a = abs(n.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 t1 = normalize(cross(a, n));
  vec3 t2 = cross(n, t1);
  vec3 p = iPos + (t1 * corner.x + t2 * corner.y) * iSize;
  float z = max(uDist - p.z, 0.3);
  gl_Position = vec4(p.x * uScale.x, p.y * uScale.y, 0.0, z);
  float l = clamp(dot(iNrm, normalize(vec3(${LIGHT.join(',')}))), 0.0, 1.0);
  vCol = iCol * (0.74 + 0.3 * l);
  vUv = corner;
}`;
  const fs = `#version 300 es
precision mediump float;
in vec2 vUv;
in vec3 vCol;
out vec4 o;
void main() {
  float r2 = dot(vUv, vUv);
  if (r2 > 1.0) discard;
  float a = 0.94 * exp(-${(0.5 * CUT * CUT).toFixed(2)} * r2);
  o = vec4(min(vCol, vec3(1.0)) * a, a);
}`;
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const uScale = gl.getUniformLocation(prog, 'uScale');
  gl.uniform1f(gl.getUniformLocation(prog, 'uDist'), DIST);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const inst = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, inst);
  [[1, 3, 0], [2, 3, 12], [3, 3, 24], [4, 1, 36]].forEach(([loc, size, offset]) => {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 40, offset);
    gl.vertexAttribDivisor(loc, 1);
  });
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  // Per-splat state, with room for the tier in use (it grows when a tier asks for more).
  let cap = 0, buf, col, off, vel, wp, rnd, order, painted;
  const counts = new Uint32Array(2049);
  function reserve(n) {
    if (n <= cap) return;
    cap = n;
    buf = new Float32Array(cap * 10);
    col = new Float32Array(cap * 3); off = new Float32Array(cap * 3); vel = new Float32Array(cap * 3);
    wp = new Float32Array(cap * 3); rnd = new Float32Array(cap); order = new Uint32Array(cap);
    painted = new Uint8Array(cap);
    const r0 = rng(42);
    for (let i = 0; i < cap; i++) rnd[i] = r0();
    gl.bindBuffer(gl.ARRAY_BUFFER, inst);
    gl.bufferData(gl.ARRAY_BUFFER, buf.byteLength, gl.DYNAMIC_DRAW);
  }

  const S = {
    toy: 0, T: null, tool: 'spin', paint: 0, drop: false, dropT0: 0, strokes: [],
    yaw: 0, pitch: 0.1, vyaw: 0, vpitch: 0, idleAt: 0, tickAt: 0,
    pokes: [], blowing: false, bx: 0, by: 0, gustUntil: 0,
    halfW: 2, halfH: 1.2, w: 1, h: 1, solid: false, photo: null, calm: false,
  };
  const status = $('#status'), hint = $('#hint'), contents = $('#contents');
  const say = (text) => { if (status) status.textContent = text; };
  const HINTS = {
    spin: 'Drag to spin it. Tap a spot to poke it.',
    poke: 'Tap or drag across it: every touch rings out and settles.',
    paint: 'Pick a color and drag across the toy.',
    blow: 'Press and hold next to it to blow.',
  };

  function census() {
    const T = S.T, info = TOY_INFO[TOYS[S.toy]];
    let nPaint = 0;
    for (let i = 0; i < T.n; i++) nPaint += painted[i];
    let html = `<b class="contents__n">${fmt(T.n)}</b> splats: ${info.made}.`;
    if (T.census) {
      html += ' <span class="contents__letters">' + T.census.map((c, i) => `<span><i style="--c:${LETTER_CSS[i]}">${LETTERS[i]}</i>${fmt(c)}</span>`).join('') + '</span>';
    }
    if (nPaint) html += ` <span class="contents__paint">${fmt(nPaint)} painted.</span>`;
    contents.innerHTML = html;
  }

  function applyStroke(s) {
    const T = S.T, x = d8(s.x), y = d8(s.y), z = d8(s.z), p = PAINTS[s.c], r2 = PAINT_R * PAINT_R;
    let hit = 0;
    for (let i = 0; i < T.n; i++) {
      const j = i * 3, dx = T.home[j] - x, dy = T.home[j + 1] - y, dz = T.home[j + 2] - z;
      if (dx * dx + dy * dy + dz * dz > r2) continue;
      const k = 0.86 + 0.14 * rnd[i];
      col[j] = (p[0] / 255) * k; col[j + 1] = (p[1] / 255) * k; col[j + 2] = (p[2] / 255) * k;
      painted[i] = 1;
      hit++;
    }
    return hit;
  }
  function repaint() {
    col.set(S.T.base.subarray(0, S.T.n * 3));
    painted.fill(0);
    S.strokes.forEach(applyStroke);
  }

  function setToy(index, { scatter = !reduce.matches, keepPaint = false, keepView = false } = {}) {
    const id = TOYS[index];
    if (id === 'photo' && !S.photo) return false;
    S.toy = index;
    reserve(N);
    S.T = id === 'name' ? buildName(N) : id === 'donut' ? buildDonut(N) : id === 'knot' ? buildKnot(N) : id === 'planet' ? buildPlanet(N) : buildPhoto(N, S.photo);
    if (!keepPaint) S.strokes = [];
    repaint();
    off.fill(0);
    vel.fill(0);
    S.calm = false;
    if (scatter) {
      for (let i = 0; i < S.T.n * 3; i++) { off[i] = (rnd[(i * 7) % cap] - 0.5) * 5; vel[i] = (rnd[(i * 13) % cap] - 0.5) * 4; }
    }
    S.pokes.length = 0;
    if (keepView) {
      S.dropT0 = now();
    } else {
      S.drop = false;
      $('#drop').setAttribute('aria-pressed', 'false');
      S.yaw = 0;
      S.pitch = TOY_INFO[id].pitch;
      S.vyaw = S.vpitch = 0;
    }
    $$('[data-toy]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.toy === id)));
    census();
    return true;
  }

  const fewer = $('#fewer'), more = $('#more');
  function setTier(next, byVisitor) {
    next = Math.max(0, Math.min(TIERS.length - 1, next));
    if (next === tier) return;
    tier = next;
    N = TIERS[tier];
    if (byVisitor) {
      auto = false;
      try { localStorage.setItem('toybox:detail', String(tier)); } catch { /* fine */ }
    }
    setToy(S.toy, { scatter: false, keepPaint: true, keepView: true });
    pace.frames = 0;
    pace.slow = 0;
    fewer.disabled = tier === 0;
    more.disabled = tier === TIERS.length - 1;
    say(byVisitor ? `Built from ${fmt(S.T.n)} splats now.` : `Down to ${fmt(S.T.n)} splats, to keep it moving smoothly.`);
    kick();
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    S.w = stage.clientWidth;
    S.h = stage.clientHeight;
    canvas.width = Math.max(2, Math.round(S.w * dpr));
    canvas.height = Math.max(2, Math.round(S.h * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    const aspect = S.w / S.h;
    S.halfH = Math.max(1.22, 1.6 / aspect);
    S.halfW = S.halfH * aspect;
    gl.uniform2f(uScale, DIST / S.halfW, DIST / S.halfH);
  }

  const M = new Float32Array(9);
  function matrix() {
    const cy = Math.cos(S.yaw), sy = Math.sin(S.yaw), cx = Math.cos(S.pitch), sx = Math.sin(S.pitch);
    M[0] = cy; M[1] = 0; M[2] = sy;
    M[3] = sx * sy; M[4] = cx; M[5] = -sx * cy;
    M[6] = -cx * sy; M[7] = sx; M[8] = cx * cy;
  }

  function step(dt, t) {
    const T = S.T, n = T.n, home = T.home, nrm = T.nrm;
    // The view: coast after a flick, then turn gently when left alone.
    if (!drag.spinning) {
      S.yaw += S.vyaw * dt;
      S.pitch = Math.max(-1.3, Math.min(1.3, S.pitch + S.vpitch * dt));
      const f = Math.exp(-2.2 * dt);
      S.vyaw *= f;
      S.vpitch *= f;
      if (!reduce.matches && t - S.idleAt > 2.6) {
        const info = TOY_INFO[TOYS[S.toy]], ease = 1 - Math.exp(-1.6 * dt);
        if (info.sway) {
          S.yaw = Math.atan2(Math.sin(S.yaw), Math.cos(S.yaw));
          S.yaw += (0.55 * Math.sin((t - S.idleAt - 2.6) * 0.7) - S.yaw) * ease;
        } else {
          S.vyaw += (0.45 - S.vyaw) * ease * 2;
        }
        S.pitch += (info.pitch - S.pitch) * ease;
      }
    }
    if (Math.abs(S.vyaw) > 0.5 && t - S.idleAt < 2.6 && Math.abs(S.yaw - S.tickAt) > 0.26) { S.tickAt = S.yaw; sound.play('tick'); }
    matrix();

    const floor = -(S.halfH - 0.34), blowing = S.blowing || t < S.gustUntil;
    const pokes = S.pokes;
    for (const p of pokes) { p.r0 = p.r1; p.r1 = (t - p.t0) * 3.4; }
    counts.fill(0);
    // At rest (every splat home and still, nothing pushing) there is only turning to do.
    const resting = S.calm && !pokes.length && !S.drop && !blowing;
    if (!resting) S.calm = false;
    let energy = 0;
    for (let i = 0; resting && i < n; i++) {
      const j = i * 3, hx = home[j], hy = home[j + 1], hz = home[j + 2];
      const pz = M[6] * hx + M[7] * hy + M[8] * hz;
      wp[j] = M[0] * hx + M[2] * hz; wp[j + 1] = M[3] * hx + M[4] * hy + M[5] * hz; wp[j + 2] = pz;
      const key = Math.max(0, Math.min(2047, ((pz + 4) * 256) | 0));
      order[i] = key;
      counts[key + 1]++;
    }
    for (let i = 0; !resting && i < n; i++) {
      const j = i * 3, hx = home[j], hy = home[j + 1], hz = home[j + 2];
      const wx = M[0] * hx + M[2] * hz, wy = M[3] * hx + M[4] * hy + M[5] * hz, wz = M[6] * hx + M[7] * hy + M[8] * hz;
      let ox = off[j], oy = off[j + 1], oz = off[j + 2], vx = vel[j], vy = vel[j + 1], vz = vel[j + 2];
      for (let k = 0; k < pokes.length; k++) {
        const p = pokes[k], dx = hx - p.x, dy = hy - p.y, dz = hz - p.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < p.r0 || d >= p.r1) continue;
        const a = 2.4 * Math.exp(-1.3 * d), inv = 1 / (d + 0.08);
        const lx = dx * inv + nrm[j] * 0.7, ly = dy * inv + nrm[j + 1] * 0.7, lz = dz * inv + nrm[j + 2] * 0.7;
        vx += (M[0] * lx + M[2] * lz) * a;
        vy += (M[3] * lx + M[4] * ly + M[5] * lz) * a;
        vz += (M[6] * lx + M[7] * ly + M[8] * lz) * a;
      }
      let ax, ay, az;
      if (S.drop && t - S.dropT0 > rnd[i] * 0.7) {
        ax = -0.5 * vx; ay = -GRAV; az = -0.5 * vz;
      } else {
        ax = -K * ox - DAMP * vx; ay = -K * oy - DAMP * vy; az = -K * oz - DAMP * vz;
      }
      if (blowing) {
        const dx = wx + ox - S.bx, dy = wy + oy - S.by, fall = 30 * Math.exp(-(dx * dx + dy * dy) / 0.6);
        const tw = Math.sin(t * 11 + rnd[i] * 40) * 0.5;
        ax += (dx * 2.4 + tw) * fall; ay += (dy * 2.4 + tw * 0.6) * fall; az -= 1.5 * fall;
      }
      vx += ax * dt; vy += ay * dt; vz += az * dt;
      ox += vx * dt; oy += vy * dt; oz += vz * dt;
      if (S.drop) {
        const fl = floor + 0.14 * rnd[i] * rnd[i] - wy;
        if (oy < fl) { oy = fl; vy = Math.abs(vy) * 0.42 * rnd[i]; vx = vx * 0.7 + (rnd[(i * 3) % cap] - 0.5) * 0.5; vz *= 0.7; if (vy < 0.25) { vy = 0; vx *= 0.6; } }
      }
      off[j] = ox; off[j + 1] = oy; off[j + 2] = oz; vel[j] = vx; vel[j + 1] = vy; vel[j + 2] = vz;
      energy += ox * ox + oy * oy + oz * oz + vx * vx + vy * vy + vz * vz;
      const pz = wz + oz;
      wp[j] = wx + ox; wp[j + 1] = wy + oy; wp[j + 2] = pz;
      const key = Math.max(0, Math.min(2047, ((pz + 4) * 256) | 0));
      order[i] = key;
      counts[key + 1]++;
    }
    for (let k = pokes.length - 1; k >= 0; k--) if (t - pokes[k].t0 > 1.4) pokes.splice(k, 1);
    if (!resting && !pokes.length && !S.drop && !blowing && energy < n * 1e-8) {
      S.calm = true;
      off.fill(0);
      vel.fill(0);
    }

    // Back to front: a counting sort on depth, then pack the instance buffer.
    for (let k = 1; k <= 2048; k++) counts[k] += counts[k - 1];
    const size = T.size;
    for (let i = 0; i < n; i++) {
      const slot = counts[order[i]]++, j = i * 3, o = slot * 10;
      const nx = nrm[j], ny = nrm[j + 1], nz = nrm[j + 2];
      buf[o] = wp[j]; buf[o + 1] = wp[j + 1]; buf[o + 2] = wp[j + 2];
      buf[o + 3] = M[0] * nx + M[2] * nz; buf[o + 4] = M[3] * nx + M[4] * ny + M[5] * nz; buf[o + 5] = M[6] * nx + M[7] * ny + M[8] * nz;
      buf[o + 6] = col[j]; buf[o + 7] = col[j + 1]; buf[o + 8] = col[j + 2];
      buf[o + 9] = size[i];
    }
  }

  function draw() {
    if (S.solid) gl.clearColor(0, 0.72, 0.74, 1); else gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, inst);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf, 0, S.T.n * 10);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, S.T.n);
  }

  let last = 0, visible = true, raf = 0;
  // One clock for everything. `skew` lets a check step time by hand (advance, below)
  // where a browser will not run animation frames, such as a hidden tab.
  let skew = 0;
  const now = () => performance.now() / 1000 + skew;
  // The time a frame takes, averaged. A tier nobody picked gives way when it settles
  // above 38 ms (under about 26 frames a second; a phone saving power draws 30). Gaps
  // of a quarter second or more are a tab that was away, and do not count.
  const pace = { frames: 0, slow: 0 };
  function frame() {
    raf = 0;
    const t = now(), gap = t - last, dt = Math.min(0.033, Math.max(0.001, gap));
    last = t;
    step(dt, t);
    draw();
    if (auto && tier > 0 && gap < 0.25) {
      pace.frames++;
      if (pace.frames > 40) pace.slow += (gap - pace.slow) * 0.04;
      if (pace.frames > 150 && pace.slow > 0.038) setTier(tier - 1, false);
    }
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) { last = now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }).observe(stage);
  document.addEventListener('visibilitychange', kick);
  new ResizeObserver(() => { resize(); kick(); }).observe(stage);

  /* ---- pointer */

  // The splat nearest the camera within a few pixels of a point on the stage.
  function pick(px, py, radius = 18) {
    const n = S.T.n, sx = DIST / S.halfW, sy = DIST / S.halfH;
    let best = -1, bestZ = -1e9;
    for (let i = 0; i < n; i++) {
      const j = i * 3, z = DIST - wp[j + 2];
      const x = ((wp[j] * sx) / z * 0.5 + 0.5) * S.w, y = (0.5 - (wp[j + 1] * sy) / z * 0.5) * S.h;
      const dx = x - px, dy = y - py;
      if (dx * dx + dy * dy < radius * radius && wp[j + 2] > bestZ) { bestZ = wp[j + 2]; best = i; }
    }
    return best;
  }
  const toWorld = (px, py) => [((px / S.w) * 2 - 1) * S.halfW, (1 - (py / S.h) * 2) * S.halfH];

  function pokeAt(i) {
    const j = i * 3, T = S.T;
    if (S.pokes.length > 5) S.pokes.shift();
    S.pokes.push({ x: T.home[j], y: T.home[j + 1], z: T.home[j + 2], t0: now(), r0: 0, r1: 0 });
    sound.play(TOY_INFO[TOYS[S.toy]].voice, T.tag[i]);
  }
  function paintAt(i) {
    const j = i * 3, T = S.T;
    const s = { x: q8(T.home[j]), y: q8(T.home[j + 1]), z: q8(T.home[j + 2]), c: S.paint };
    const lastS = S.strokes[S.strokes.length - 1];
    if (lastS && lastS.c === s.c && Math.abs(lastS.x - s.x) + Math.abs(lastS.y - s.y) + Math.abs(lastS.z - s.z) < 5) return;
    S.strokes.push(s);
    if (S.strokes.length > STROKE_MAX) { S.strokes.shift(); repaint(); } else applyStroke(s);
    // A little splash: the painted splats jump.
    const x = d8(s.x), y = d8(s.y), z = d8(s.z);
    for (let k = 0; k < T.n; k++) {
      const m = k * 3, dx = T.home[m] - x, dy = T.home[m + 1] - y, dz = T.home[m + 2] - z;
      if (dx * dx + dy * dy + dz * dz < PAINT_R * PAINT_R) { vel[m] += (rnd[k] - 0.5) * 1.6; vel[m + 1] += rnd[(k * 5) % cap] * 1.4; vel[m + 2] += 0.8; }
    }
    S.calm = false;
    sound.play('squelch');
    census();
  }
  function useTool(px, py, { tap = false } = {}) {
    if (S.tool === 'blow') return;
    const i = pick(px, py, S.tool === 'paint' ? 22 : 18);
    if (i < 0) return;
    if (S.tool === 'paint') paintAt(i);
    else if (S.tool === 'poke' || tap) pokeAt(i);
  }

  const drag = { id: null, spinning: false, x: 0, y: 0, moved: 0, lastPoke: 0, lx: 0, ly: 0, lt: 0 };
  const local = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    canvas.setPointerCapture(e.pointerId);
    const [x, y] = local(e);
    Object.assign(drag, { id: e.pointerId, x, y, moved: 0, lx: x, ly: y, lt: now(), spinning: S.tool === 'spin' });
    S.idleAt = now();
    if (S.tool === 'blow') { [S.bx, S.by] = toWorld(x, y); S.blowing = true; sound.blow(true); } else if (S.tool !== 'spin') useTool(x, y);
    stage.classList.add('is-touched');
    kick();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (drag.id !== e.pointerId) return;
    const [x, y] = local(e), dx = x - drag.lx, dy = y - drag.ly, t = now(), dt = Math.max(0.008, t - drag.lt);
    drag.moved += Math.abs(dx) + Math.abs(dy);
    S.idleAt = t;
    if (S.tool === 'spin') {
      S.yaw += dx * 0.009;
      S.pitch = Math.max(-1.3, Math.min(1.3, S.pitch + dy * 0.009));
      S.vyaw = (dx * 0.009) / dt * 0.6 + S.vyaw * 0.4;
      S.vpitch = (dy * 0.009) / dt * 0.6 + S.vpitch * 0.4;
      if (Math.abs(S.yaw - S.tickAt) > 0.26) { S.tickAt = S.yaw; sound.play('tick'); }
    } else if (S.tool === 'blow') {
      [S.bx, S.by] = toWorld(x, y);
    } else if (S.tool === 'paint' || t - drag.lastPoke > 0.11) {
      drag.lastPoke = t;
      useTool(x, y);
    }
    drag.lx = x; drag.ly = y; drag.lt = t;
  });
  const release = (e) => {
    if (drag.id !== e.pointerId) return;
    if (S.tool === 'spin' && drag.moved < 7) { S.vyaw = S.vpitch = 0; useTool(drag.x, drag.y, { tap: true }); }
    if (now() - drag.lt > 0.12) S.vyaw = S.vpitch = 0;
    drag.id = null;
    drag.spinning = false;
    S.blowing = false;
    sound.blow(false);
    S.idleAt = now();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  /* ---- tools, shelf, keyboard */

  function setTool(tool) {
    S.tool = tool;
    $$('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
    $('#swatches').hidden = tool !== 'paint';
    stage.dataset.tool = tool;
    hint.textContent = HINTS[tool];
    sound.play('pop');
  }
  function toggleDrop(force) {
    S.drop = force ?? !S.drop;
    S.dropT0 = now();
    $('#drop').setAttribute('aria-pressed', String(S.drop));
    sound.play(S.drop ? 'clatter' : 'zip');
    say(S.drop ? 'Dropped. Press Drop again to put it back together.' : 'Back together.');
    kick();
  }
  function randomSpot() {
    for (let tries = 0; tries < 40; tries++) {
      const i = (Math.random() * S.T.n) | 0, j = i * 3, z = DIST - wp[j + 2];
      const px = ((wp[j] * DIST) / S.halfW / z * 0.5 + 0.5) * S.w, py = (0.5 - (wp[j + 1] * DIST) / S.halfH / z * 0.5) * S.h;
      const hit = pick(px, py, 6);
      if (hit >= 0) return [hit, px, py];
    }
    return [0, S.w / 2, S.h / 2];
  }
  function act() {
    const [i, px, py] = randomSpot();
    if (S.tool === 'paint') paintAt(i);
    else if (S.tool === 'blow') { [S.bx, S.by] = toWorld(px, py); S.gustUntil = now() + 0.5; sound.blow(true); setTimeout(() => { if (!S.blowing) sound.blow(false); }, 500); } else pokeAt(i);
    S.idleAt = now();
  }

  $$('[data-tool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
  $('#drop').addEventListener('click', () => toggleDrop());
  fewer.addEventListener('click', () => { setTier(tier - 1, true); sound.play('pop'); });
  more.addEventListener('click', () => { setTier(tier + 1, true); sound.play('pop'); });
  $$('[data-toy]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.toy === 'photo') { $('#photo-file').click(); return; }
    setToy(TOYS.indexOf(b.dataset.toy));
    sound.play('pop');
    say(`${TOY_INFO[b.dataset.toy].label}.`);
  }));
  $('#photo-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      S.photo = await createImageBitmap(file);
      setToy(TOYS.indexOf('photo'));
      sound.play('shutter');
      say('Your picture, rebuilt from splats. It has not left your browser.');
    } catch {
      say('That file would not open as a picture.');
    }
    e.target.value = '';
  });
  $$('#swatches button:not(.chip)').forEach((b, i) => {
    b.style.setProperty('--c', `rgb(${PAINTS[i].join(',')})`);
    b.setAttribute('aria-label', `Paint ${PAINT_NAMES[i]}`);
    b.addEventListener('click', () => {
      S.paint = i;
      $$('#swatches button:not(.chip)').forEach((o, k) => o.setAttribute('aria-pressed', String(k === i)));
      sound.play('pop');
    });
  });
  $('#clear').addEventListener('click', () => { S.strokes = []; repaint(); census(); say('Paint cleared.'); });

  stage.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tools = { 1: 'spin', 2: 'poke', 3: 'paint', 5: 'blow' };
    let used = true;
    if (e.key === 'ArrowLeft') S.vyaw = -2.4;
    else if (e.key === 'ArrowRight') S.vyaw = 2.4;
    else if (e.key === 'ArrowUp') S.vpitch = -1.6;
    else if (e.key === 'ArrowDown') S.vpitch = 1.6;
    else if (e.key === 'Enter' || e.key === ' ') act();
    else if (tools[e.key]) setTool(tools[e.key]);
    else if (e.key === '4') toggleDrop();
    else used = false;
    if (used) { e.preventDefault(); S.idleAt = now(); stage.classList.add('is-touched'); kick(); }
  });

  const soundBtn = $('#sound');
  soundBtn.addEventListener('click', () => {
    sound.set(!sound.on);
    soundBtn.setAttribute('aria-pressed', String(sound.on));
    soundBtn.querySelector('span').textContent = sound.on ? 'on' : 'off';
    sound.play('bar', 0);
    setTimeout(() => sound.play('bar', 2), 110);
    setTimeout(() => sound.play('bar', 4), 220);
  });

  /* ---- share */

  const sceneNow = () => ({
    toy: TOYS[S.toy] === 'photo' ? 0 : S.toy, drop: S.drop,
    yawByte: yawToByte(S.yaw), pitchByte: pitchToByte(S.pitch), strokes: S.strokes,
  });
  const download = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  $('#share-link').addEventListener('click', async () => {
    const hash = `#s=${encodeScene(sceneNow())}`;
    history.replaceState(null, '', hash);
    const note = TOYS[S.toy] === 'photo' ? ' Your picture stays in your browser, so the link opens the name with your paint.' : '';
    try {
      await navigator.clipboard.writeText(location.href);
      say(`Link copied: ${hash.length} characters hold the whole scene.${note}`);
    } catch {
      say(`The scene is in the address bar now (${hash.length} characters). Copy it from there.${note}`);
    }
    sound.play('pop');
  });
  $('#share-png').addEventListener('click', () => {
    draw();
    canvas.toBlob((blob) => { if (blob) download(blob, 'ryan-kamp-toy.png'); say('Saved a PNG with a see-through background.'); });
  });
  const videoBtn = $('#share-video');
  if (!canvas.captureStream || !window.MediaRecorder) {
    videoBtn.disabled = true;
    videoBtn.title = 'This browser cannot record a canvas.';
  }
  videoBtn.addEventListener('click', () => {
    const chunks = [], rec = new MediaRecorder(canvas.captureStream(30));
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => { S.solid = false; videoBtn.disabled = false; download(new Blob(chunks, { type: rec.mimeType || 'video/webm' }), 'ryan-kamp-toy.webm'); say('Saved four seconds of video.'); };
    S.solid = true;
    videoBtn.disabled = true;
    S.vyaw = 1.6;
    S.idleAt = now() + 4;
    say('Recording four seconds…');
    rec.start();
    kick();
    setTimeout(() => rec.stop(), 4000);
  });

  /* ---- start */

  resize();
  const shared = location.hash.startsWith('#s=') ? decodeScene(location.hash.slice(3)) : null;
  const start = () => {
    if (shared) {
      setToy(TOYS[shared.toy] === 'photo' ? 0 : shared.toy);
      S.strokes = shared.strokes;
      repaint();
      census();
      S.yaw = byteToYaw(shared.yawByte);
      S.pitch = byteToPitch(shared.pitchByte);
      S.idleAt = now() + 6;
      if (shared.drop) { S.drop = true; S.dropT0 = now() + 0.9; $('#drop').setAttribute('aria-pressed', 'true'); }
      say('Opened a shared scene.');
    } else {
      setToy(0);
    }
    setTool('spin');
    fewer.disabled = tier === 0;
    more.disabled = tier === TIERS.length - 1;
    $('#detail').hidden = false;
    stage.classList.add('is-live');
    kick();
  };
  const font = document.fonts?.load ? document.fonts.load('700 200px Fredoka') : Promise.resolve();
  Promise.race([font, new Promise((r) => setTimeout(r, 1500))]).then(start, start);

  // For checks: the state, a clock to step by hand, and a stopwatch. `bench` reads a
  // pixel back after every frame so the time includes the drawing, not only the sums.
  window.__toybox = {
    S, pick, TIERS,
    get wp() { return wp; },
    get tier() { return tier; },
    setTier: (i, byVisitor = false) => setTier(i, byVisitor),
    advance(seconds) {
      for (let k = 0; k < seconds * 60; k++) { skew += 1 / 60; last = now(); step(1 / 60, last); }
      draw();
    },
    // One real frame after a gap of this many seconds, as if the device were that slow.
    frame(gap) { skew += gap; frame(); },
    bench(frames = 60) {
      const px = new Uint8Array(4), t0 = performance.now();
      for (let k = 0; k < frames; k++) {
        skew += 1 / 60;
        last = now();
        step(1 / 60, last);
        draw();
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      }
      return (performance.now() - t0) / frames;
    },
  };
}

/* -------------------------------------------------------------- the rest */

function oneSplat() {
  const cv = $('#one');
  if (!cv) return;
  const ctx = cv.getContext('2d'), SZ = 240, out = $('#one-cov');
  const inputs = ['#one-w', '#one-h', '#one-t'].map((s) => $(s));
  cv.width = cv.height = SZ;
  function draw() {
    const a = inputs[0].value / 100, b = inputs[1].value / 100, th = (inputs[2].value * Math.PI) / 180;
    const c = Math.cos(th), s = Math.sin(th), img = ctx.createImageData(SZ, SZ);
    for (let y = 0; y < SZ; y++) {
      for (let x = 0; x < SZ; x++) {
        const px = ((x + 0.5) / SZ) * 2 - 1, py = 1 - ((y + 0.5) / SZ) * 2;
        const u = (c * px + s * py) / a, v = (-s * px + c * py) / b, k = (y * SZ + x) * 4;
        img.data[k] = 255; img.data[k + 1] = 61; img.data[k + 2] = 139;
        img.data[k + 3] = splatAlpha(u * u + v * v) * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const [xx, xy, yy] = covariance(a, b, th);
    out.textContent = `Σ = [ ${xx.toFixed(3)}  ${xy.toFixed(3)} ;  ${xy.toFixed(3)}  ${yy.toFixed(3)} ]`;
  }
  inputs.forEach((i) => i.addEventListener('input', draw));
  draw();
}

function embed() {
  const btn = $('#embed-load'), frame = $('#embed-frame');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = 'https://ryanjosephkamp.github.io/splashery/embed/?toy=cactus&autoplay=breeze';
    f.title = 'Splashery toy: a captured cactus';
    f.loading = 'lazy';
    frame.replaceChildren(f);
    frame.classList.add('is-loaded');
  });
}

// aqrobat's card: one corner of a QR code, drawn with letters and symbols. It is a
// picture of the idea, not a code anyone can scan.
function qrArt() {
  const el = $('#qr');
  if (!el) return;
  const COLS = 19, ROWS = 7, sets = ['aqrobat', '\u2605\u2665\u25cf\u25c6', 'SPLAT'];
  const rand = rng(77), cells = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      // The finder pattern (a ring around a block), then a gap, then scattered modules.
      const ring = x < 7 && (x === 0 || x === 6 || y === 0 || y === 6), block = x > 1 && x < 5 && y > 1 && y < 5;
      const on = x < 7 ? ring || block : x > 7 && rand() < 0.5;
      const cell = document.createElement('i');
      if (on) { cell.className = 'on'; cells.push(cell); }
      el.append(cell);
    }
  }
  let turn = 0;
  const write = () => { const set = sets[turn++ % sets.length]; cells.forEach((cell, i) => { cell.textContent = set[i % set.length]; }); };
  write();
  if (!reduce.matches) setInterval(() => { if (!document.hidden) write(); }, 2400);
}

function arsMagna() {
  const el = $('#ars');
  if (!el || reduce.matches) return;
  setInterval(() => { if (!document.hidden) el.classList.toggle('is-b'); }, 2600);
}

toybox();
oneSplat();
embed();
qrArt();
arsMagna();
