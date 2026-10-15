// Atlas: the plate (one zoom across twenty-nine powers of ten), the sky over
// Cincinnati, and Mount St. Helens in contour lines. The astronomy is
// Splashery's own module (assets/astro.js); the measures are in scale.js. The
// outlines from Washington inward (assets/ground.js, assets/small.js) are made
// by tools/trace.py and arrive after the first paint.

import { STARS, LINES, HELENS, COAST } from './assets/data.js';
import * as A from './assets/astro.js';
import { LY, AU, Z_MIN, Z_MAX, scaleBar, lightTime, fmtLen, ramp, band } from './scale.js';
import { surface, swing, dot, unit } from './earth.js';
import { DIALS, DEFAULT_EDITION, hexOf, hueName } from './editions.js';

const SERIF = '"IM Fell English", "Iowan Old Style", Georgia, serif';
const TAU = Math.PI * 2;
const D2R = Math.PI / 180;
const still = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// The colors come from the page's CSS, so the atlas can be printed more than one way
// (styles.css, "Editions"). Every draw takes them from its own canvas first: `white` is the
// line color and `gold` the accent, whatever they are in the edition on show.
let INK = '#0c0c0b';
let WELL = '#050505';
let LINE = '#e2dfd8';
let GOLD = '#51c9ad';
let white = (a) => `rgba(226,223,216,${a})`;
let gold = (a) => `rgba(81,201,173,${a})`;
const inks = new Map();
function rgbOf(hex) {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
}
function ink(canvas) {
  let t = inks.get(canvas);
  if (!t) {
    const cs = getComputedStyle(canvas);
    const v = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
    const line = rgbOf(v('--line', '#e2dfd8'));
    const accent = rgbOf(v('--gold', '#51c9ad'));
    t = { INK: v('--ink', '#0c0c0b'), WELL: v('--well', '#050505'), LINE: `rgb(${line})`, GOLD: `rgb(${accent})`, white: (a) => `rgba(${line},${a})`, gold: (a) => `rgba(${accent},${a})` };
    inks.set(canvas, t);
  }
  ({ INK, WELL, LINE, GOLD, white, gold } = t);
}

// A canvas ready to draw on, or null while it has no size (a hidden pane, a zero-width
// window): the draw then waits for the resize that gives it one.
function fit(canvas) {
  const r = canvas.getBoundingClientRect();
  if (r.width < 8 || r.height < 8) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(r.width * dpr));
  const h = Math.max(1, Math.round(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, r.width, r.height);
  return { g, w: r.width, h: r.height };
}

// Text with a halo of the ground color, so line work never runs through it. While a round
// plate is being drawn (`rim` is set), a label that would cross the rim slides back inside.
// `ts` scales every size to the canvas. A `soft` label gives way: it is left out when it
// would sit on one already placed (`placed` holds their boxes), and the call returns false.
let rim = null;
let ts = 1;
let placed = null;
function label(g, text, x, y, { size = 14.5, color = LINE, align = 'left', italic = true, soft = false } = {}) {
  const px = size * ts;
  g.font = `${italic ? 'italic ' : ''}${px}px ${SERIF}`;
  const w = g.measureText(text).width;
  if (rim) {
    const half = Math.sqrt(Math.max(0, rim.R * rim.R - (y - rim.cy) ** 2)) - 6;
    const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    const min = rim.cx - half;
    const fit = Math.min(Math.max(left, min), Math.max(min, rim.cx + half - w));
    x += fit - left;
  }
  if (placed) {
    const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    const box = [left - 3, y - px * 0.62, left + w + 3, y + px * 0.62];
    if (soft && placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) return false;
    placed.push(box);
  }
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = Math.max(3.5, px * 0.3);
  g.strokeStyle = INK;
  g.strokeText(text, x, y);
  g.fillStyle = color;
  g.fillText(text, x, y);
  return true;
}

// Runs of points (x, y, x, y, ... in whole units) as one stroke: k is pixels per unit.
function strokeRunsOf(g, lines, k, cx, cy) {
  g.beginPath();
  for (const run of lines) {
    g.moveTo(cx + run[0] * k, cy - run[1] * k);
    for (let i = 2; i < run.length; i += 2) g.lineTo(cx + run[i] * k, cy - run[i + 1] * k);
  }
  g.stroke();
}

// A measure in the accent color: a line between two points (meters from the center) with a
// tick at each end, and its words beside the middle, on the side away from the center.
function measureLine(g, m, ppm, cx, cy, text, a) {
  const x1 = cx + m[0] * ppm;
  const y1 = cy - m[1] * ppm;
  const x2 = cx + m[2] * ppm;
  const y2 = cy - m[3] * ppm;
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 40) return;
  const nx = -(y2 - y1) / len;
  const ny = (x2 - x1) / len;
  g.strokeStyle = gold(a);
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  for (const [x, y] of [[x1, y1], [x2, y2]]) {
    g.moveTo(x - nx * 6, y - ny * 6);
    g.lineTo(x + nx * 6, y + ny * 6);
  }
  g.stroke();
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const side = (mx - cx) * nx + (my - cy) * ny >= 0 ? 1 : -1;
  label(g, text, mx + nx * side * 15 * ts, my + ny * side * 15 * ts, { size: 15.5, color: gold(a), align: 'center' });
}

// ---- The frame every plate shares: the J2000 ecliptic, seen from its north -------------------

const OBLIQUITY = 23.43928 * D2R;
const toEcliptic = (v) => [
  v[0],
  Math.cos(OBLIQUITY) * v[1] + Math.sin(OBLIQUITY) * v[2],
  -Math.sin(OBLIQUITY) * v[1] + Math.cos(OBLIQUITY) * v[2],
];

const NOW = Date.now();
const JD = A.julianDay(NOW);

// Stars with a cataloged distance, in light-years from the Sun.
const starUnit = STARS.ra.map((ra, i) => A.fromRaDec(ra, STARS.dec[i]));
const near = [];
for (let i = 0; i < starUnit.length; i++) {
  const ly = STARS.ly[i];
  if (!ly) continue;
  const e = toEcliptic(starUnit[i]);
  near.push({ x: e[0] * ly, y: e[1] * ly, ly, mag: STARS.mag[i], name: STARS.name[i] });
}

// The Milky Way as a diagram: stipple on four spiral arms and a bulge, in the galaxy's own plane,
// turned into this frame. The Sun is 26,700 light-years from the center.
const GALAXY = (() => {
  // Equatorial (J2000) to galactic; its transpose goes back.
  const G = [
    [-0.0548755604, -0.8734370902, -0.4838350155],
    [0.4941094279, -0.44482963, 0.7469822445],
    [-0.867666149, -0.1980763734, 0.4559837762],
  ];
  const back = (v) => [0, 1, 2].map((i) => G[0][i] * v[0] + G[1][i] * v[1] + G[2][i] * v[2]);
  let seed = 1801;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 1.15;
  const R = 50000;
  const SUN = 26700;
  const place = (gx, gy) => {
    const e = toEcliptic(back([SUN + gx, gy, 0]));
    return [e[0], e[1]];
  };
  const pts = [];
  for (let i = 0; i < 3400; i++) {
    const t = rnd() ** 0.7;
    const r = 0.07 + 0.93 * t;
    const arm = Math.floor(rnd() * 4);
    const a = arm * (TAU / 4) + Math.log(r / 0.07) / 0.222 + gauss() * (0.1 + 0.16 * (1 - t));
    const rr = r * (1 + gauss() * 0.035) * R;
    pts.push([...place(rr * Math.cos(a), rr * Math.sin(a)), 0.5 + rnd() * 0.8]);
  }
  for (let i = 0; i < 700; i++) {
    const r = Math.abs(gauss()) * 0.07 * R;
    const a = rnd() * TAU;
    pts.push([...place(r * Math.cos(a) * 1.5, r * Math.sin(a)), 0.5 + rnd() * 0.9]);
  }
  const rim = [];
  for (let k = 0; k <= 180; k++) rim.push(place(R * Math.cos((k / 180) * TAU), R * Math.sin((k / 180) * TAU)));
  return { pts, rim, center: place(0, 0) };
})();

// The planets today, and each orbit as the path of one full period.
const PERIOD = { mercury: 87.969, venus: 224.701, emb: 365.256, mars: 686.98, jupiter: 4332.59, saturn: 10759.22, uranus: 30685.4, neptune: 60189 };
const NAMES = { mercury: 'Mercury', venus: 'Venus', emb: 'Earth', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune' };
const EARTH = A.heliocentric('emb', JD);
const PLANETS = Object.keys(PERIOD).map((id) => {
  const path = [];
  for (let k = 0; k <= 160; k++) {
    const p = A.heliocentric(id, JD + (k / 160) * PERIOD[id]);
    path.push([p[0] - EARTH[0], p[1] - EARTH[1]]);
  }
  return { id, name: NAMES[id], path, at: path[0], inner: id === 'mercury' || id === 'venus' || id === 'emb' || id === 'mars' };
});
const SUN = [-EARTH[0], -EARTH[1]]; // AU, from the Earth

// The Moon from the Earth's center, in km, for the coming month.
const moonAt = (jd) => {
  const m = A.moonEcliptic(jd);
  const d = 6378.14 / Math.sin(m.parallax * D2R);
  return [d * Math.cos(m.lat * D2R) * Math.cos(m.lon * D2R), d * Math.cos(m.lat * D2R) * Math.sin(m.lon * D2R)];
};
const MOON = [];
for (let k = 0; k <= 120; k++) MOON.push(moonAt(JD + (k / 120) * 27.6));

// The Earth as it is turned at this minute. Two views of it: from the north of the ecliptic
// (the frame of every larger plate), and from straight above the garden in Washington, north
// up (the frame of every smaller one). The plate swings from one to the other as it closes in.
const GARDEN = { lat: 38.888321, lon: -77.025649 };
const placeAt = surface(A, JD);
const gardenUp = placeAt(GARDEN.lat, GARDEN.lon);
const pole = placeAt(90, 0);
const VIEW_ECLIPTIC = { axis: [0, -Math.sin(OBLIQUITY), Math.cos(OBLIQUITY)], up: [0, Math.cos(OBLIQUITY), Math.sin(OBLIQUITY)] };
const VIEW_GARDEN = { axis: gardenUp, up: unit(pole.map((p, i) => p - dot(pole, gardenUp) * gardenUp[i])) };
const runs = (lines) => lines.map((run) => {
  const out = [];
  for (let i = 0; i < run.length; i += 2) out.push(placeAt(run[i + 1], run[i]));
  return out;
});
const WORLD = runs(COAST.world);
const REGION = runs(COAST.region);
const GRATICULE = (() => {
  const lines = [];
  for (let lat = -60; lat <= 60; lat += 30) {
    const run = [];
    for (let lon = -180; lon <= 180; lon += 4) run.push(lon, lat);
    lines.push(run);
  }
  for (let lon = -180; lon < 180; lon += 30) {
    const run = [];
    for (let lat = -88; lat <= 88; lat += 4) run.push(lon, lat);
    lines.push(run);
  }
  return runs(lines);
})();

// ---- Plate I ---------------------------------------------------------------------------------

const plate = document.getElementById('plate');
const zoomIn = document.getElementById('zoom');
const stopItems = [...document.querySelectorAll('#stops li')];
const STOPS = stopItems.map((li) => ({ li, z: Number(li.dataset.z), d: Number(li.dataset.d), name: li.querySelector('b').textContent, layer: li.dataset.layer || '' }));

// The outlines from Washington inward: two files of line work, fetched after the first paint.
// Until one arrives, its stops keep the plain ring of their width.
let GROUND = null;
let SMALL = null;
import('./assets/ground.js').then((m) => {
  GROUND = m.GROUND;
  drawPlate();
}, () => {});
import('./assets/small.js').then((m) => {
  SMALL = m.SMALL;
  drawPlate();
}, () => {});
let z = 13.1;
let tween = 0;

// "10^n m", set as one piece so the rim moves it as one.
function pow(g, n, x, y, alpha) {
  const e = String(n).replace('-', '−');
  g.font = `italic ${13.5 * ts}px ${SERIF}`;
  const w = g.measureText('10').width;
  const wm = g.measureText('m').width;
  g.font = `italic ${10 * ts}px ${SERIF}`;
  const we = g.measureText(e).width;
  const keep = rim;
  if (rim) {
    const total = w + we + wm + 6;
    const half = Math.sqrt(Math.max(0, rim.R * rim.R - (y - rim.cy) ** 2)) - 6;
    x = Math.min(Math.max(x, rim.cx - half), Math.max(rim.cx - half, rim.cx + half - total));
    rim = null;
  }
  label(g, '10', x, y, { size: 13.5, color: white(alpha) });
  label(g, e, x + w + 1, y - 5.5 * ts, { size: 10, color: white(alpha) });
  label(g, 'm', x + w + we + 5, y, { size: 13.5, color: white(alpha) });
  rim = keep;
}

function drawPlate() {
  const f = fit(plate);
  if (!f) return;
  const { g, w, h } = f;
  ink(plate);
  const cx = w / 2;
  const cy = h / 2;
  const edge = Math.min(w, h) / 2 - 1;
  const R = edge - Math.max(14, edge * 0.06);
  ts = clamp(0.8 + R / 1000, 0.92, 1.12);
  placed = [];
  const ppm = (2 * R) / 10 ** z; // pixels per meter
  const X = (m) => cx + m * ppm;
  const Y = (m) => cy - m * ppm;

  // The graduated rim: ecliptic longitude, a tick every 2 degrees.
  g.fillStyle = WELL;
  g.beginPath();
  g.arc(cx, cy, edge, 0, TAU);
  g.fill();
  g.strokeStyle = white(0.85);
  g.lineWidth = 1;
  for (const r of [edge - 0.5, R]) {
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.stroke();
  }
  g.lineWidth = 0.7;
  g.beginPath();
  for (let d = 0; d < 360; d += 2) {
    const len = d % 30 === 0 ? edge - R - 2 : d % 10 === 0 ? (edge - R) * 0.6 : (edge - R) * 0.32;
    const c = Math.cos(d * D2R);
    const s = -Math.sin(d * D2R);
    g.moveTo(cx + c * R, cy + s * R);
    g.lineTo(cx + c * (R + len), cy + s * (R + len));
  }
  g.stroke();

  g.save();
  g.beginPath();
  g.arc(cx, cy, R - 0.5, 0, TAU);
  g.clip();
  rim = { cx, cy, R };

  // A dashed ring at every power of ten, labeled.
  for (let n = Math.ceil(z) - 3; n <= Math.ceil(z); n++) {
    const r = (10 ** n * ppm) / 2;
    const a = ramp(0.03, 0.16, r / R) * (1 - ramp(0.9, 1.02, r / R));
    if (a <= 0.01) continue;
    g.strokeStyle = white(0.34 * a);
    g.lineWidth = 0.7;
    g.setLineDash([1, 4]);
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.stroke();
    g.setLineDash([]);
    pow(g, n, cx + r * Math.cos(-1.1) + 5, cy + r * Math.sin(-1.1), 0.62 * a);
  }

  // The Milky Way.
  const ga = ramp(19.7, 20.5, z);
  if (ga > 0.01) {
    const k = LY * ppm;
    g.fillStyle = white(0.7 * ga);
    for (const p of GALAXY.pts) g.fillRect(cx + p[0] * k, cy - p[1] * k, p[2], p[2]);
    g.strokeStyle = gold(0.8 * ga);
    g.lineWidth = 0.9;
    g.beginPath();
    GALAXY.rim.forEach((p, i) => (i ? g.lineTo(cx + p[0] * k, cy - p[1] * k) : g.moveTo(cx + p[0] * k, cy - p[1] * k)));
    g.stroke();
    label(g, 'the galactic center', cx + GALAXY.center[0] * k + 8, cy - GALAXY.center[1] * k, { color: white(0.8 * ga) });
    label(g, 'the Sun', cx + 8, cy - 9, { color: gold(ga) });
  }

  // The stars, each at its cataloged distance.
  const sa = band(z, 16.4, 17.4, 20.2, 20.9);
  if (sa > 0.01) {
    const k = LY * ppm;
    const names = [];
    g.fillStyle = white(0.92 * sa);
    for (const s of near) {
      const px = s.x * k;
      const py = -s.y * k;
      if (px * px + py * py > R * R) continue;
      const r = clamp(2.6 - 0.42 * s.mag, 0.45, 3.2) * (z > 19 ? 0.75 : 1);
      g.beginPath();
      g.arc(cx + px, cy + py, r, 0, TAU);
      g.fill();
      if (s.name && z < 18.7) names.push(s);
    }
    names.sort((a, b) => a.ly - b.ly);
    for (const s of names.slice(0, 14)) {
      label(g, `${s.name}, ${s.ly < 20 ? s.ly.toFixed(1) : Math.round(s.ly)} ly`, cx + s.x * k + 6, cy - s.y * k - 8, { size: 13.5, color: white(0.86 * sa), soft: true });
    }
  }
  for (const [ly, text] of [
    [1600, '1,600 light-years'],
    [65, '65 light-years'],
    [0.5, 'one light-year across'],
  ]) {
    const r = ly * LY * ppm;
    const a = ramp(0.05, 0.2, r / R) * (1 - ramp(1.0, 1.3, r / R));
    if (a <= 0.01) continue;
    g.strokeStyle = gold(0.85 * a);
    g.lineWidth = 0.9;
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.stroke();
    label(g, text, cx + r * Math.cos(0.75) + 6, cy + r * Math.sin(0.75) + 4, { color: gold(a) });
  }

  // The Sun and the planets.
  const pa = band(z, 9.4, 10.4, 14.4, 15.4);
  if (pa > 0.01) {
    const k = AU * ppm;
    for (const p of PLANETS) {
      const size = Math.hypot(p.path[40][0] - SUN[0], p.path[40][1] - SUN[1]) * k;
      const a = pa * ramp(5, 16, size);
      if (a <= 0.01) continue;
      g.strokeStyle = white(0.6 * a);
      g.lineWidth = 0.8;
      g.beginPath();
      p.path.forEach((q, i) => (i ? g.lineTo(cx + q[0] * k, cy - q[1] * k) : g.moveTo(cx + q[0] * k, cy - q[1] * k)));
      g.stroke();
      if (p.id === 'emb') continue;
      const px = cx + p.at[0] * k;
      const py = cy - p.at[1] * k;
      g.fillStyle = INK;
      g.strokeStyle = gold(a);
      g.lineWidth = 1.2;
      g.beginPath();
      g.arc(px, py, 3.2, 0, TAU);
      g.fill();
      g.stroke();
      if (size > 26) label(g, p.name, px + 8, py - 7, { size: 15.5, color: white(0.95 * a) });
    }
  }
  const su = band(z, 9.4, 10.6, 16.6, 17.4);
  if (su > 0.01) {
    const px = X(SUN[0] * AU);
    const py = Y(SUN[1] * AU);
    g.strokeStyle = gold(su);
    g.fillStyle = gold(su);
    g.lineWidth = 0.9;
    g.beginPath();
    g.arc(px, py, 3.4, 0, TAU);
    g.fill();
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const r1 = 6;
      const r2 = i % 2 ? 9 : 13;
      g.moveTo(px + Math.cos(a) * r1, py + Math.sin(a) * r1);
      g.lineTo(px + Math.cos(a) * r2, py + Math.sin(a) * r2);
    }
    g.stroke();
    if (z < 15.6 && Math.hypot(px - cx, py - cy) > 24) label(g, 'the Sun', px + 16, py + 10, { color: gold(su) });
  }

  // The Moon's path for a month, and the Moon now.
  const ma = band(z, 7.7, 8.3, 9.9, 10.6);
  if (ma > 0.01) {
    const k = 1000 * ppm;
    g.strokeStyle = white(0.6 * ma);
    g.lineWidth = 0.8;
    g.beginPath();
    MOON.forEach((q, i) => (i ? g.lineTo(cx + q[0] * k, cy - q[1] * k) : g.moveTo(cx + q[0] * k, cy - q[1] * k)));
    g.stroke();
    const mx = cx + MOON[0][0] * k;
    const my = cy - MOON[0][1] * k;
    g.fillStyle = INK;
    g.strokeStyle = gold(ma);
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(mx, my, Math.max(3, 1737.4 * k), 0, TAU);
    g.fill();
    g.stroke();
    label(g, 'the Moon', mx + 9, my - 7, { color: white(0.95 * ma) });
  }

  // The Earth: its true size, its coasts where they are turned at this minute, and the half
  // turned from the Sun hatched as night. Closing in, the view swings to look straight down
  // on the garden, north up, and the coast of the Mid-Atlantic takes over.
  const er = 6371000 * ppm;
  const ea = (1 - ramp(9.6, 10.6, z)) * ramp(4.5, 5.1, z);
  if (ea > 0.01) {
    const t = 1 - ramp(6.3, 7.25, z);
    const view = swing(VIEW_ECLIPTIC, VIEW_GARDEN, t);
    const r = Math.max(er, 2.2);
    const strokeRuns = (lines) => {
      g.beginPath();
      for (const run of lines) {
        let pen = false;
        for (const v of run) {
          if (dot(v, view.axis) <= 0) {
            pen = false;
            continue;
          }
          const px = cx + dot(v, view.right) * er;
          const py = cy - dot(v, view.up) * er;
          if (pen) g.lineTo(px, py);
          else g.moveTo(px, py);
          pen = true;
        }
      }
      g.stroke();
    };
    const night = ea * (1 - ramp(0, 0.3, t));
    if (night > 0.01) {
      const toSun = Math.atan2(-SUN[1], SUN[0]); // on the canvas, y runs down
      g.save();
      g.beginPath();
      g.arc(cx, cy, r, toSun + Math.PI / 2, toSun - Math.PI / 2);
      g.closePath();
      g.clip();
      g.strokeStyle = white(0.32 * night);
      g.lineWidth = 0.6;
      g.beginPath();
      for (let k = -r * 2; k < r * 2; k += 5) {
        g.moveTo(cx + k - r, cy + r);
        g.lineTo(cx + k + r, cy - r);
      }
      g.stroke();
      g.restore();
    }
    const detail = ea * ramp(14, 60, er);
    if (detail > 0.01) {
      g.lineWidth = 0.6;
      g.strokeStyle = white(0.2 * detail * ramp(5.9, 6.6, z));
      strokeRuns(GRATICULE);
      g.lineWidth = 0.9;
      g.strokeStyle = white(0.9 * detail * ramp(5.9, 6.5, z));
      if (z > 5.9) strokeRuns(WORLD);
      g.strokeStyle = white(0.9 * ea * (1 - ramp(6.2, 6.7, z)));
      if (z < 6.7) strokeRuns(REGION);
      // The garden's place on the globe.
      const gx = cx + dot(gardenUp, view.right) * er;
      const gy = cy - dot(gardenUp, view.up) * er;
      if (z > 6.3) {
        g.fillStyle = gold(detail);
        g.beginPath();
        g.arc(gx, gy, 2.6, 0, TAU);
        g.fill();
        label(g, 'Washington', gx + 7, gy - 7, { color: gold(detail) });
      }
    }
    g.strokeStyle = gold(ea);
    g.lineWidth = 1.1;
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.stroke();
    if (z > 7.9) label(g, 'the Earth', cx + Math.max(r * 0.72, 6) + 4, cy + Math.max(r * 0.72, 6) + 8, { color: white(0.95 * ea) });
  }

  // From Washington inward: the true outline of each thing, at its true size.
  const shown = new Set();
  const layer = (id, alpha, draw) => {
    if (alpha <= 0.01) return;
    shown.add(id);
    draw(alpha);
  };
  if (GROUND) {
    const { city, mall, garden, facts } = GROUND;
    layer('city', band(z, 3.6, 4.0, 4.95, 5.45), (a) => {
      const k = city.unit * ppm;
      g.setLineDash([]);
      g.lineWidth = 0.6;
      g.strokeStyle = white(0.24 * a);
      strokeRunsOf(g, city.lines.roads, k, cx, cy);
      g.lineWidth = 0.9;
      g.strokeStyle = white(0.85 * a);
      strokeRunsOf(g, city.lines.water, k, cx, cy);
      g.lineWidth = 1.4;
      g.strokeStyle = gold(a);
      strokeRunsOf(g, city.lines.boundary, k, cx, cy);
      if (z < 4.9) label(g, `Washington, D.C.: its sides are ${fmtLen(facts.districtSideKm[0] * 1000)}`, cx + 6400 * ppm, cy - 7600 * ppm, { size: 15.5, color: gold(a), align: 'center' });
    });
    layer('mall', band(z, 2.45, 2.85, 3.95, 4.35), (a) => {
      const k = mall.unit * ppm;
      g.lineWidth = 0.6;
      g.strokeStyle = white(0.3 * a);
      strokeRunsOf(g, mall.lines.roads, k, cx, cy);
      g.setLineDash([2, 3]);
      g.strokeStyle = white(0.45 * a);
      strokeRunsOf(g, mall.lines.park, k, cx, cy);
      g.setLineDash([]);
      g.lineWidth = 0.75;
      g.strokeStyle = white(0.72 * a);
      strokeRunsOf(g, mall.lines.buildings, k, cx, cy);
      g.lineWidth = 1.05;
      g.strokeStyle = white(0.95 * a);
      strokeRunsOf(g, mall.lines.water, k, cx, cy);
      if (z > 3.05) {
        for (const [x, y, text] of mall.labels) label(g, text, cx + x * ppm + 6, cy - y * ppm + 13 * ts, { size: 13.5, color: white(0.92 * a), soft: true });
        g.setLineDash([5, 4]);
        measureLine(g, mall.measure, ppm, cx, cy, fmtLen(facts.capitolToLincolnKm * 1000), a);
        g.setLineDash([]);
      }
    });
    layer('garden', band(z, 0.15, 0.6, 2.5, 2.85), (a) => {
      const k = garden.unit * ppm;
      const L = garden.lines;
      g.lineWidth = 0.6;
      g.strokeStyle = white(0.3 * a);
      strokeRunsOf(g, L.roads, k, cx, cy);
      g.strokeStyle = white(0.4 * a);
      strokeRunsOf(g, L.paths, k, cx, cy);
      g.strokeStyle = white(0.6 * a);
      strokeRunsOf(g, L.beds, k, cx, cy);
      g.setLineDash([2, 2]);
      strokeRunsOf(g, L.edges, k, cx, cy);
      g.setLineDash([]);
      g.lineWidth = 0.9;
      g.strokeStyle = white(0.9 * a);
      strokeRunsOf(g, L.water, k, cx, cy);
      g.lineWidth = 1.1;
      g.strokeStyle = white(0.95 * a);
      strokeRunsOf(g, L.buildings, k, cx, cy);
      // A tree is a mark of where it stands, not of how wide it has grown.
      g.fillStyle = white(0.75 * a);
      const mark = clamp(0.5 * ppm, 1.1, 3.2);
      for (let i = 0; i < garden.trees.length; i += 2) {
        g.beginPath();
        g.arc(cx + garden.trees[i] * k, cy - garden.trees[i + 1] * k, mark, 0, TAU);
        g.fill();
      }
      g.lineWidth = 1.4;
      g.strokeStyle = gold(a);
      strokeRunsOf(g, L.haupt, k, cx, cy);
      if (z > 1.6) {
        label(g, `the Enid A. Haupt Garden, ${fmtLen(facts.hauptSpanM[0])} long`, cx - 5 * ppm, cy + 60 * ppm, { size: 15.5, color: gold(a), align: 'center' });
        for (const [x, y, text] of garden.labels) label(g, text, cx + x * ppm, cy - y * ppm, { size: 13.5, color: white(0.92 * a), align: 'center', soft: true });
      }
    });
  }
  if (SMALL) {
    const { bed, leaf, cells, chloroplast, ribosome, facts } = SMALL;
    layer('bed', band(z, -0.95, -0.55, 0.95, 1.35), (a) => {
      const k = bed.unit * ppm;
      g.setLineDash([3, 3]);
      g.lineWidth = 0.7;
      g.strokeStyle = white(0.4 * a);
      strokeRunsOf(g, bed.lines.extent, k, cx, cy);
      g.setLineDash([]);
      g.strokeStyle = white(0.62 * a);
      strokeRunsOf(g, bed.lines.fine, k, cx, cy);
      g.lineWidth = 1.2;
      g.strokeStyle = white(0.97 * a);
      strokeRunsOf(g, bed.lines.bold, k, cx, cy);
      if (z > -0.3) measureLine(g, bed.measure, ppm, cx, cy, `the garden bed, ${fmtLen(facts.bed.longSideM)} long`, a);
    });
    layer('leaf', band(z, -2.35, -1.95, -0.45, -0.05), (a) => {
      const k = leaf.unit * ppm;
      g.lineWidth = 0.7;
      g.strokeStyle = white(0.6 * a);
      strokeRunsOf(g, leaf.lines.veins, k, cx, cy);
      g.lineWidth = 1.2;
      g.strokeStyle = white(0.97 * a);
      strokeRunsOf(g, leaf.lines.edge, k, cx, cy);
      if (z > -1.4) measureLine(g, leaf.measure, ppm, cx, cy, `one leaf, ${fmtLen(facts.leaf.bladeSpanM)} across`, a);
    });
    layer('cells', band(z, -5.05, -4.65, -3.35, -2.9), (a) => {
      const k = cells.unit * ppm;
      g.lineWidth = 0.75;
      g.strokeStyle = white(0.5 * a);
      strokeRunsOf(g, cells.lines.walls, k, cx, cy);
      g.lineWidth = 0.9;
      g.strokeStyle = white(0.95 * a);
      strokeRunsOf(g, cells.lines.plastids, k, cx, cy);
      label(g, `each small ring is a chloroplast, about ${fmtLen(facts.cells.plastidMedianM)} across`, cx, cy - R * 0.8, { size: 15.5, color: gold(a), align: 'center' });
    });
    layer('chloroplast', band(z, -6.65, -6.25, -5.05, -4.65), (a) => {
      const k = chloroplast.unit * ppm;
      g.lineWidth = 0.75;
      g.strokeStyle = white(0.7 * a);
      strokeRunsOf(g, chloroplast.lines.lamellae, k, cx, cy);
      g.lineWidth = 1.2;
      g.strokeStyle = white(0.97 * a);
      strokeRunsOf(g, chloroplast.lines.envelope, k, cx, cy);
      if (z > -5.9) measureLine(g, chloroplast.measure, ppm, cx, cy, `a chloroplast, ${fmtLen(facts.chloroplast.lengthM)} long`, a);
    });
    layer('ribosome', band(z, -7.95, -7.9, -6.9, -6.5), (a) => {
      const k = ribosome.unit * ppm;
      g.lineJoin = 'round';
      g.lineWidth = 0.6;
      g.strokeStyle = white(0.42 * a);
      strokeRunsOf(g, ribosome.lines.rna, k, cx, cy);
      g.lineWidth = 0.8;
      g.strokeStyle = gold(0.75 * a);
      strokeRunsOf(g, ribosome.lines.protein, k, cx, cy);
      g.lineWidth = 1.3;
      g.strokeStyle = white(0.97 * a);
      strokeRunsOf(g, ribosome.lines.outline, k, cx, cy);
      measureLine(g, ribosome.measure, ppm, cx, cy, `a ribosome, ${fmtLen(facts.ribosome.acrossM[0])} across`, a);
    });
  }

  // A stop with no outline on show keeps a ring as wide as it is, and its name: the Chesapeake
  // Bay always, and the rest until their line work has arrived.
  for (const s of STOPS) {
    if (s.d >= 1.2742e7) continue;
    if (s.layer && (s.layer === 'city' || s.layer === 'mall' || s.layer === 'garden' ? GROUND : SMALL)) continue;
    const r = (s.d * ppm) / 2;
    const a = ramp(0.04, 0.16, r / R) * (1 - ramp(1.0, 1.25, r / R));
    if (a <= 0.01) continue;
    g.strokeStyle = gold(0.9 * a);
    g.lineWidth = 1;
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.stroke();
    label(g, `${s.name.replace(/^(The|A|One) /, (m) => m.toLowerCase())}, ${fmtLen(s.d)}`, cx, cy - r - 12 < cy - R + 18 ? cy - r + 16 : cy - r - 12, { size: 15.5, color: gold(a), align: 'center' });
  }
  if (z < 7 && !shown.has('leaf') && !shown.has('ribosome')) {
    g.strokeStyle = gold(0.9);
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(cx - 5, cy);
    g.lineTo(cx + 5, cy);
    g.moveTo(cx, cy - 5);
    g.lineTo(cx, cy + 5);
    g.stroke();
  }

  // The scale bar.
  const bar = scaleBar(z);
  const bw = bar.frac * 2 * R;
  const by = cy + R * 0.8;
  g.strokeStyle = LINE;
  g.lineWidth = 1.1;
  g.beginPath();
  g.moveTo(cx - bw / 2, by - 5);
  g.lineTo(cx - bw / 2, by);
  g.lineTo(cx + bw / 2, by);
  g.lineTo(cx + bw / 2, by - 5);
  g.moveTo(cx, by - 3);
  g.lineTo(cx, by);
  g.stroke();
  label(g, bar.label, cx, by - 15 * ts, { size: 17, align: 'center' });
  rim = null;
  placed = null;
  g.restore();
}

function readout() {
  let best = STOPS[0];
  for (const s of STOPS) if (Math.abs(z - s.z) < Math.abs(z - best.z)) best = s;
  for (const s of STOPS) s.li.classList.toggle('on', s === best);
  [...document.querySelectorAll('#ticks i')].forEach((t, i) => t.classList.toggle('on', STOPS[i] === best));
  const size = 10 ** z;
  document.getElementById('stop-name').textContent = best.name;
  document.getElementById('plate-size').textContent = `The plate is about ${fmtLen(size)} across.`;
  document.getElementById('plate-light').textContent = `Light crosses it in ${lightTime(size).text}.`;
  document.getElementById('plate-source').textContent = best.li.dataset.source || '';
  zoomIn.value = String(Math.round((Z_MAX - z) * 100));
  zoomIn.setAttribute('aria-valuetext', `${best.name}; the plate is about ${fmtLen(size)} across`);
}

function setZ(v, { from } = {}) {
  z = clamp(v, Z_MIN, Z_MAX);
  drawPlate();
  readout();
  if (from === 'range') return;
}

function glide(target) {
  cancelAnimationFrame(tween);
  target = clamp(target, Z_MIN, Z_MAX);
  if (still.matches) return setZ(target);
  const from = z;
  const ms = clamp(Math.abs(target - from) * 420, 500, 2600);
  const t0 = performance.now();
  const step = (t) => {
    const u = clamp((t - t0) / ms, 0, 1);
    const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
    setZ(from + (target - from) * e);
    if (u < 1) tween = requestAnimationFrame(step);
  };
  tween = requestAnimationFrame(step);
}

// The next stop out (dir +1) or in (dir -1) from where the plate is.
function nextStop(dir) {
  const sorted = [...STOPS].sort((a, b) => a.z - b.z);
  const s = dir > 0 ? sorted.find((q) => q.z > z + 0.02) : [...sorted].reverse().find((q) => q.z < z - 0.02);
  if (s) glide(s.z);
}

{
  const ticks = document.getElementById('ticks');
  for (const s of STOPS) {
    const t = document.createElement('i');
    t.style.left = `${((Z_MAX - s.z) / (Z_MAX - Z_MIN)) * 100}%`;
    ticks.append(t);
    // Each stop in the list becomes a button that takes the plate there.
    const b = s.li.querySelector('b');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = b.textContent;
    b.textContent = '';
    b.append(btn);
    s.li.addEventListener('click', () => {
      glide(s.z);
      if (plate.getBoundingClientRect().top < 0 || plate.getBoundingClientRect().bottom > innerHeight) {
        plate.scrollIntoView({ behavior: still.matches ? 'auto' : 'smooth', block: 'center' });
      }
    });
  }
  zoomIn.addEventListener('input', () => {
    cancelAnimationFrame(tween);
    setZ(Z_MAX - Number(zoomIn.value) / 100, { from: 'range' });
  });
  document.getElementById('out').addEventListener('click', () => nextStop(1));
  document.getElementById('in').addEventListener('click', () => nextStop(-1));
  // The wheel zooms the plate where the page has room to scroll beside it. Where the plate
  // fills the column, the wheel scrolls the page until the plate is clicked (as a Splashery
  // embed does); Ctrl or Command with the wheel always zooms.
  const stacked = matchMedia('(max-width: 980px)');
  const hint = document.getElementById('plate-hint');
  let armed = false;
  let hintTimer = 0;
  plate.addEventListener('focus', () => (armed = true));
  plate.addEventListener('blur', () => (armed = false));
  plate.addEventListener('pointerleave', () => {
    if (document.activeElement !== plate) armed = false;
  });
  plate.addEventListener(
    'wheel',
    (e) => {
      if (stacked.matches && !armed && !e.ctrlKey && !e.metaKey) {
        hint.hidden = false;
        clearTimeout(hintTimer);
        hintTimer = setTimeout(() => (hint.hidden = true), 2600);
        return;
      }
      e.preventDefault();
      cancelAnimationFrame(tween);
      setZ(z + clamp(e.deltaY, -120, 120) * 0.0022);
    },
    { passive: false },
  );
  // A mouse drags up and down. A finger drags sideways (up and down scrolls the page), and
  // two fingers pinch.
  const fingers = new Map();
  let drag = null;
  let pinch = null;
  const spread = () => {
    const [a, b] = [...fingers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  };
  plate.addEventListener('pointerdown', (e) => {
    armed = true;
    hint.hidden = true;
    cancelAnimationFrame(tween);
    try {
      plate.setPointerCapture(e.pointerId);
    } catch {
      // A pointer that is already gone cannot be captured.
    }
    if (e.pointerType === 'touch') {
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size === 2) {
        pinch = { d: spread(), z };
        drag = null;
      } else drag = { x: e.clientX, z, touch: true };
    } else drag = { y: e.clientY, z };
  });
  plate.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' && fingers.has(e.pointerId)) {
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && fingers.size === 2) return setZ(pinch.z - Math.log10(spread() / pinch.d));
    }
    if (!drag) return;
    if (drag.touch) setZ(drag.z - (e.clientX - drag.x) * 0.02);
    else setZ(drag.z + (e.clientY - drag.y) * 0.02);
  });
  const lift = (e) => {
    fingers.delete(e.pointerId);
    pinch = null;
    drag = null;
    if (fingers.size === 1) drag = { x: [...fingers.values()][0].x, z, touch: true };
  };
  plate.addEventListener('pointerup', lift);
  plate.addEventListener('pointercancel', lift);
  plate.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowUp' || k === 'ArrowLeft' || k === '-') setZ(z + 0.1);
    else if (k === 'ArrowDown' || k === 'ArrowRight' || k === '+' || k === '=') setZ(z - 0.1);
    else if (k === 'PageUp') nextStop(1);
    else if (k === 'PageDown') nextStop(-1);
    else if (k === 'Home') glide(Z_MAX);
    else if (k === 'End') glide(Z_MIN);
    else return;
    e.preventDefault();
  });
}

if (matchMedia('(pointer: coarse)').matches) {
  document.getElementById('how').textContent = 'Pinch the plate, drag a finger across it, slide the rule, or step with the arrows.';
}

// The real toy, in a frame, only when asked for.
document.getElementById('load-real').addEventListener('click', (e) => {
  const frame = document.createElement('iframe');
  frame.src = 'https://ryanjosephkamp.github.io/splashery/embed/?toy=powers-of-ten&theme=dark';
  frame.title = 'Splashery: Powers of ten';
  frame.className = 'real-frame';
  frame.allow = 'fullscreen';
  e.currentTarget.replaceWith(frame);
});

// ---- Fig. 1: the sky over Cincinnati ---------------------------------------------------------

const LAT = 39.1;
const LON = -84.51;
const skyCanvas = document.getElementById('sky');
const hours = document.getElementById('hours');
const when = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', dateStyle: 'long', timeStyle: 'short' });
const BODY_NAMES = { mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn' };

function drawSky() {
  const ms = NOW + Number(hours.value) * 60000;
  const f = fit(skyCanvas);
  if (!f) return;
  const { g, w, h } = f;
  ink(skyCanvas);
  ts = clamp(0.8 + w / 1800, 0.92, 1.1);
  placed = [];
  const cx = w / 2;
  const cy = h / 2;
  const edge = Math.min(w, h) / 2 - 1;
  const R = edge - 22;
  const s = A.sky(ms, LAT, LON);
  // Zenith at the center, horizon at the rim; north up and east to the left, as when looking up.
  const spot = (enu) => {
    const alt = Math.asin(clamp(enu[2], -1, 1));
    const az = Math.atan2(enu[0], enu[1]);
    const r = ((Math.PI / 2 - alt) / (Math.PI / 2)) * R;
    return [cx - r * Math.sin(az), cy - r * Math.cos(az)];
  };
  g.fillStyle = WELL;
  g.beginPath();
  g.arc(cx, cy, edge, 0, TAU);
  g.fill();
  g.strokeStyle = white(0.85);
  g.lineWidth = 1;
  for (const r of [edge - 0.5, R]) {
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.stroke();
  }
  g.lineWidth = 0.7;
  g.beginPath();
  for (let d = 0; d < 360; d += 5) {
    const len = d % 45 === 0 ? 0 : d % 15 === 0 ? 9 : 5;
    g.moveTo(cx - Math.sin(d * D2R) * R, cy - Math.cos(d * D2R) * R);
    g.lineTo(cx - Math.sin(d * D2R) * (R + len), cy - Math.cos(d * D2R) * (R + len));
  }
  g.stroke();
  [
    ['N', 0],
    ['E', 90],
    ['S', 180],
    ['W', 270],
  ].forEach(([t, d]) => label(g, t, cx - Math.sin(d * D2R) * (R + 10), cy - Math.cos(d * D2R) * (R + 11), { size: 15, align: 'center', italic: false, color: GOLD }));
  // Altitude circles at 30 and 60 degrees.
  g.strokeStyle = white(0.16);
  g.setLineDash([1, 4]);
  for (const f of [1 / 3, 2 / 3]) {
    g.beginPath();
    g.arc(cx, cy, R * f, 0, TAU);
    g.stroke();
  }
  g.setLineDash([]);

  const pos = starUnit.map((v) => A.mulMV(s.matrix, v));
  g.strokeStyle = white(0.38);
  g.lineWidth = 0.7;
  g.beginPath();
  for (const c of LINES) {
    for (let i = 0; i + 1 < c.at.length; i += 2) {
      const a = pos[c.at[i]];
      const b = pos[c.at[i + 1]];
      if (!a || !b || a[2] <= 0 || b[2] <= 0) continue;
      const p = spot(a);
      const q = spot(b);
      g.moveTo(p[0], p[1]);
      g.lineTo(q[0], q[1]);
    }
  }
  g.stroke();
  g.fillStyle = LINE;
  const named = [];
  for (let i = 0; i < pos.length; i++) {
    if (pos[i][2] <= 0) continue;
    const p = spot(pos[i]);
    const mag = STARS.mag[i];
    g.beginPath();
    g.arc(p[0], p[1], clamp(2.9 - 0.52 * mag, 0.5, 3.6) * (w < 420 ? 0.8 : 1), 0, TAU);
    g.fill();
    if (STARS.name[i] && mag <= 1.6) named.push([STARS.name[i], p]);
  }
  // (The names are placed after the planets, and give way to them.)

  const up = [];
  for (const id of Object.keys(BODY_NAMES)) {
    const b = s.bodies[id];
    if (b.alt <= 0) continue;
    const p = spot(b.enu);
    g.fillStyle = GOLD;
    g.beginPath();
    g.arc(p[0], p[1], 3.4, 0, TAU);
    g.fill();
    label(g, BODY_NAMES[id], p[0] + 8, p[1] + 9, { size: 15, color: GOLD });
    up.push(BODY_NAMES[id]);
  }
  const moon = s.bodies.moon;
  if (moon.alt > 0) {
    const p = spot(moon.enu);
    g.fillStyle = INK;
    g.strokeStyle = GOLD;
    g.lineWidth = 1.3;
    g.beginPath();
    g.arc(p[0], p[1], 6, 0, TAU);
    g.fill();
    g.stroke();
    label(g, 'Moon', p[0] + 11, p[1] + 10, { size: 15, color: GOLD });
    up.push(`the Moon, ${Math.round(moon.illum * 100)}% lit`);
  }
  const sun = s.bodies.sun;
  if (sun.alt > 0) {
    const p = spot(sun.enu);
    g.strokeStyle = GOLD;
    g.fillStyle = GOLD;
    g.beginPath();
    g.arc(p[0], p[1], 5, 0, TAU);
    g.fill();
    g.beginPath();
    g.arc(p[0], p[1], 9, 0, TAU);
    g.stroke();
    label(g, 'Sun', p[0] + 14, p[1] + 10, { size: 15, color: GOLD });
  }
  for (const [name, p] of named) label(g, name, p[0] + 6, p[1] - 7, { size: 13.5, color: white(0.86), soft: true });
  placed = null;
  const light = sun.alt > 0 ? 'The Sun is up, so the stars are there but out of sight.' : sun.alt > -18 ? 'Twilight.' : 'Full night.';
  document.getElementById('sky-read').textContent =
    `Cincinnati, ${when.format(ms)}. ${light} ${up.length ? `Above the horizon: ${up.join(', ')}.` : 'No planet is above the horizon.'}`;
}

{
  hours.addEventListener('input', drawSky);
  document.getElementById('now').addEventListener('click', () => {
    hours.value = '0';
    drawSky();
  });
  let drag = null;
  skyCanvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, v: Number(hours.value) };
    skyCanvas.setPointerCapture(e.pointerId);
  });
  skyCanvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    hours.value = String(clamp(Math.round((drag.v + (e.clientX - drag.x) * 2.4) / 10) * 10, -720, 720));
    drawSky();
  });
  skyCanvas.addEventListener('pointerup', () => (drag = null));
  skyCanvas.addEventListener('pointercancel', () => (drag = null));
}

// ---- Fig. 2: Mount St. Helens in contour lines -----------------------------------------------

const helensCanvas = document.getElementById('helens');
const N = HELENS.n;
const grids = {};
for (const key of ['before', 'after']) {
  const bin = atob(HELENS[key].b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  grids[key] = { h: new Uint16Array(u8.buffer), top: HELENS[key].top, lines: null };
}

// Marching squares: the segments of one contour level (heights in decimeters), in grid units.
function contour(h, level, out) {
  const cross = (a, b) => (level - a) / (b - a);
  for (let j = 0; j < N - 1; j++) {
    for (let i = 0; i < N - 1; i++) {
      const a = h[j * N + i];
      const b = h[j * N + i + 1];
      const c = h[(j + 1) * N + i + 1];
      const d = h[(j + 1) * N + i];
      const code = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
      if (code === 0 || code === 15) continue;
      const top = [i + cross(a, b), j];
      const right = [i + 1, j + cross(b, c)];
      const bottom = [i + cross(d, c), j + 1];
      const left = [i, j + cross(a, d)];
      const seg = (p, q) => out.push(p[0], p[1], q[0], q[1]);
      switch (code) {
        case 1: case 14: seg(left, bottom); break; // prettier-ignore
        case 2: case 13: seg(bottom, right); break; // prettier-ignore
        case 3: case 12: seg(left, right); break; // prettier-ignore
        case 4: case 11: seg(top, right); break; // prettier-ignore
        case 6: case 9: seg(top, bottom); break; // prettier-ignore
        case 7: case 8: seg(left, top); break; // prettier-ignore
        case 5: seg(left, top); seg(bottom, right); break; // prettier-ignore
        case 10: seg(left, bottom); seg(top, right); break; // prettier-ignore
      }
    }
  }
}

function linesOf(grid) {
  if (grid.lines) return grid.lines;
  const fine = [];
  const bold = [];
  for (let m = 800; m <= 2900; m += 100) contour(grid.h, m * 10, m % 500 === 0 ? bold : fine);
  let peak = 0;
  for (let i = 1; i < grid.h.length; i++) if (grid.h[i] > grid.h[peak]) peak = i;
  grid.lines = { fine, bold, peak: [peak % N, Math.floor(peak / N)] };
  return grid.lines;
}

let helensNow = 'before';
let helensMix = 1;
let helensFrom = 'before';
function drawHelens() {
  const f = fit(helensCanvas);
  if (!f) return;
  const { g, w, h } = f;
  ink(helensCanvas);
  ts = clamp(0.8 + w / 1800, 0.92, 1.1);
  const pad = 14;
  const k = (Math.min(w, h) - pad * 2) / (N - 1);
  const stroke = (segs, width, alpha) => {
    g.strokeStyle = white(alpha);
    g.lineWidth = width;
    g.beginPath();
    for (let i = 0; i < segs.length; i += 4) {
      g.moveTo(pad + segs[i] * k, pad + segs[i + 1] * k);
      g.lineTo(pad + segs[i + 2] * k, pad + segs[i + 3] * k);
    }
    g.stroke();
  };
  const layer = (key, a) => {
    if (a <= 0.01) return;
    const L = linesOf(grids[key]);
    stroke(L.fine, 0.6, 0.55 * a);
    stroke(L.bold, 1.15, 0.95 * a);
    const px = pad + L.peak[0] * k;
    const py = pad + L.peak[1] * k;
    g.strokeStyle = gold(a);
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(px - 6, py);
    g.lineTo(px + 6, py);
    g.moveTo(px, py - 6);
    g.lineTo(px, py + 6);
    g.stroke();
    label(g, `${grids[key].top.toLocaleString('en-US')} m`, px + 11, py - 10, { size: 15.5, color: gold(a) });
  };
  if (helensFrom !== helensNow) layer(helensFrom, 1 - helensMix);
  layer(helensNow, helensMix);
  // North, and a bar of two kilometers.
  const bar = ((2000 / HELENS.span) * (N - 1)) * k;
  g.strokeStyle = LINE;
  g.lineWidth = 1.1;
  g.beginPath();
  g.moveTo(pad + 10, h - pad - 16);
  g.lineTo(pad + 10, h - pad - 10);
  g.lineTo(pad + 10 + bar, h - pad - 10);
  g.lineTo(pad + 10 + bar, h - pad - 16);
  g.stroke();
  label(g, '2 km', pad + 10 + bar / 2, h - pad - 26, { size: 15, align: 'center' });
  g.beginPath();
  g.moveTo(w - pad - 16, pad + 40);
  g.lineTo(w - pad - 16, pad + 14);
  g.lineTo(w - pad - 21, pad + 22);
  g.moveTo(w - pad - 16, pad + 14);
  g.lineTo(w - pad - 11, pad + 22);
  g.stroke();
  label(g, 'N', w - pad - 16, pad + 52, { size: 15, align: 'center', italic: false });
}

function showHelens(key) {
  if (key === helensNow) return;
  helensFrom = helensNow;
  helensNow = key;
  document.getElementById('before').setAttribute('aria-pressed', String(key === 'before'));
  document.getElementById('after').setAttribute('aria-pressed', String(key === 'after'));
  document.getElementById('helens-read').textContent =
    key === 'before'
      ? `Highest point in the grid: ${grids.before.top.toLocaleString('en-US')} m.`
      : `Highest point in the grid: ${grids.after.top.toLocaleString('en-US')} m, ${grids.before.top - grids.after.top} m lower.`;
  if (still.matches) {
    helensMix = 1;
    return drawHelens();
  }
  const t0 = performance.now();
  const step = (t) => {
    helensMix = clamp((t - t0) / 700, 0, 1);
    drawHelens();
    if (helensMix < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
document.getElementById('before').addEventListener('click', () => showHelens('before'));
document.getElementById('after').addEventListener('click', () => showHelens('after'));

// ---- Plate V: the ticks of a logarithmic rule ------------------------------------------------

{
  const host = document.getElementById('log-ticks');
  const NS = 'http://www.w3.org/2000/svg';
  for (let d = 0; d < 6; d++) {
    for (let m = 1; m <= 9; m++) {
      const x = 20 + ((d + Math.log10(m)) / 6) * 280;
      const t = document.createElementNS(NS, 'line');
      t.setAttribute('x1', x);
      t.setAttribute('x2', x);
      t.setAttribute('y1', m === 1 ? 78 : m === 5 ? 84 : 89);
      t.setAttribute('y2', 96);
      host.append(t);
    }
  }
  const end = document.createElementNS(NS, 'line');
  end.setAttribute('x1', 300);
  end.setAttribute('x2', 300);
  end.setAttribute('y1', 78);
  end.setAttribute('y2', 96);
  host.append(end);
}

// ---- Draw, and draw again when a canvas changes size, the type arrives or the edition changes --

function drawAll() {
  drawPlate();
  drawSky();
  drawHelens();
}

// The editions: the same plates printed another way, and for those with one color, a dial
// that turns its hue (editions.js). Both choices are kept for the next visit, under atlas: keys.
{
  const root = document.documentElement;
  const press = document.getElementById('press');
  const buttons = [...press.querySelectorAll('.press-list button')];
  const dial = document.getElementById('dial');
  const hue = document.getElementById('hue');
  const reset = document.getElementById('hue-reset');
  const note = document.getElementById('dial-note');
  const turning = note.textContent.trim().replace(/\s+/g, ' ');
  const store = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch {
        // Private windows may refuse storage: the choice then lasts for the visit.
      }
    },
  };
  const keptHue = (name) => {
    const kept = store.get(`atlas:hue:${name}`);
    const h = Number(kept);
    return kept !== null && Number.isFinite(h) && h >= 0 && h < 360 ? h : DIALS[name].hue;
  };
  const track = (d) => `linear-gradient(90deg, ${Array.from({ length: 13 }, (_, i) => hexOf(d.l, d.c, i * 30)).join(', ')})`;
  let edition = DEFAULT_EDITION;
  const paint = () => {
    const d = DIALS[edition];
    if (d) root.style.setProperty('--gold', hexOf(d.l, d.c, Number(hue.value)));
    else root.style.removeProperty('--gold');
    for (const b of buttons) {
      const dd = DIALS[b.dataset.scheme];
      if (dd) b.querySelector('.swatch').style.setProperty('--swatch', hexOf(dd.l, dd.c, b.dataset.scheme === edition ? Number(hue.value) : keptHue(b.dataset.scheme)));
    }
    const on = buttons.find((b) => b.dataset.scheme === edition);
    const swatch = document.getElementById('press-swatch');
    swatch.className = `swatch s-${edition}`;
    swatch.style.cssText = on.querySelector('.swatch').style.cssText;
    document.getElementById('edition-name').textContent = on.dataset.name;
    const name = d ? hueName(Number(hue.value)) : 'fixed';
    document.getElementById('hue-name').textContent = name;
    hue.setAttribute('aria-valuetext', d ? `${name}, ${hue.value} degrees` : 'fixed');
    inks.clear();
    document.querySelector('meta[name="theme-color"]').content = getComputedStyle(root).getPropertyValue('--ink').trim();
    drawAll();
  };
  const show = (name) => {
    edition = name;
    if (name === DEFAULT_EDITION) delete root.dataset.scheme;
    else root.dataset.scheme = name;
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.scheme === name));
    const d = DIALS[name];
    hue.disabled = !d;
    reset.disabled = !d;
    dial.classList.toggle('off', !d);
    note.textContent = d ? turning : "This edition's colors are fixed. Field, in color and Black and one color can be turned.";
    if (d) {
      hue.value = String(Math.round(keptHue(name)));
      hue.style.setProperty('--track', track(d));
    } else hue.style.removeProperty('--track');
    paint();
  };
  for (const b of buttons) {
    b.addEventListener('click', () => {
      show(b.dataset.scheme);
      store.set('atlas:scheme', b.dataset.scheme);
    });
  }
  hue.addEventListener('input', () => {
    store.set(`atlas:hue:${edition}`, hue.value);
    paint();
  });
  reset.addEventListener('click', () => {
    store.set(`atlas:hue:${edition}`, null);
    hue.value = String(DIALS[edition].hue);
    paint();
  });
  // The panel closes on Escape, or on a click anywhere else.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && press.open) {
      press.open = false;
      press.querySelector('summary').focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (press.open && !press.contains(e.target)) press.open = false;
  });
  press.hidden = false;
  const kept = root.dataset.scheme;
  show(buttons.some((b) => b.dataset.scheme === kept) ? kept : DEFAULT_EDITION);
}

readout();
drawAll();
document.fonts?.ready.then(drawAll);
{
  let frame = 0;
  const again = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(drawAll);
  };
  if ('ResizeObserver' in window) {
    const watch = new ResizeObserver(again);
    for (const c of [plate, skyCanvas, helensCanvas]) watch.observe(c);
  }
  addEventListener('resize', again);
}
