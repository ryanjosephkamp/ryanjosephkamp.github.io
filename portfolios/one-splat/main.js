// One Splat. No dependencies.
//
// The hero fits a line of text with a hierarchy of 2D Gaussians (fit.js) and
// draws one level of it, or a blend of two, as additive light.

import { buildTree, checkTree, checkSplit, moments, node, eig, covariance } from './fit.js';

const NAME = 'RYAN KAMP';
const MAX_LEVEL = 14; // 16,384 splats
const REST = 10; // where the dial comes to rest: 1,024 splats
const DILATE = 0.3; // px² added to every drawn covariance, as 3D Gaussian splatting does
const GAIN = 1.5;
const BEAM = [1.0, 0.34, 0.11];
const PROBE = '#8fe6f0';
const FACE = '700 300px "B612", sans-serif';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const $ = (id) => document.getElementById(id);

// A small number as m × 10^e, in HTML.
function sci(x) {
  if (x === 0) return '0';
  const [mantissa, exponent] = x.toExponential(1).split('e');
  return `${mantissa} × 10<sup>${exponent.replace('-', '−').replace('+', '')}</sup>`;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- From text to points to a tree ---------- */

// Rasterize lines of text and return the centers of (a sample of) the inked
// pixels, shifted so the ink's bounding box starts at the origin.
function inkPoints(lines, maxPoints, font = FACE) {
  const size = parseFloat(font.match(/(\d+)px/)[1]);
  const canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.font = font;
  const widths = lines.map((line) => ctx.measureText(line).width);
  const pad = Math.ceil(size * 0.2);
  const leading = size * 0.94;
  canvas.width = Math.ceil(Math.max(...widths)) + pad * 2;
  canvas.height = Math.ceil(leading * lines.length + size * 0.3) + pad * 2;
  ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.font = font;
  ctx.fillStyle = '#fff';
  lines.forEach((line, i) => {
    ctx.fillText(line, (canvas.width - widths[i]) / 2, pad + size * 0.8 + i * leading);
  });

  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let ink = 0;
  let x0 = width;
  let x1 = 0;
  let y0 = height;
  let y1 = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 127) {
        ink += 1;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (!ink) return null;

  const keep = Math.min(1, maxPoints / ink);
  const rand = mulberry32(ink);
  const xs = [];
  const ys = [];
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 127 && (keep === 1 || rand() < keep)) {
        xs.push(x - x0 + 0.5);
        ys.push(y - y0 + 0.5);
      }
    }
  }
  return {
    xs: Float32Array.from(xs),
    ys: Float32Array.from(ys),
    width: x1 - x0 + 1,
    height: y1 - y0 + 1,
    per: ink / xs.length, // pixels of ink each point stands for
  };
}

function fitText(text, { stacked = false, maxPoints = 120000, maxLevel = MAX_LEVEL, font = FACE } = {}) {
  const words = text.split(/\s+/).filter(Boolean);
  const points = inkPoints(stacked && words.length > 1 ? words : [words.join(' ')], maxPoints, font);
  if (!points) return null;
  const cap = Math.min(maxLevel, Math.floor(Math.log2(points.xs.length / 4)));
  const tree = buildTree(points.xs, points.ys, Math.max(cap, 0));
  return { tree, xs: points.xs, ys: points.ys, width: points.width, height: points.height, per: points.per };
}

// One splat of the level being drawn: its own shape at blend 1, its parent's at 0.
function splatAt(fit, i, blend) {
  const { tree, per } = fit;
  const p = i > 1 ? i >> 1 : 1;
  const mix = (k) => tree[k][p] + (tree[k][i] - tree[k][p]) * blend;
  const half = i > 1 ? tree.n[p] / 2 : tree.n[1];
  return {
    mx: mix('mx'),
    my: mix('my'),
    a: mix('a'),
    b: mix('b'),
    c: mix('c'),
    mass: (half + (tree.n[i] - half) * blend) * per,
  };
}

/* ---------- Drawing: WebGL2, with a 2D canvas for small pieces and as a fallback ---------- */

const VERTEX = `#version 300 es
layout(location = 0) in vec2 corner;
layout(location = 1) in vec4 c0; // this splat: mean, a, b
layout(location = 2) in vec2 c1; //              c, mass
layout(location = 3) in vec4 p0; // its parent, the same way
layout(location = 4) in vec2 p1;
uniform float blend;
uniform vec3 view; // scale, then offset
uniform vec2 size;
uniform float dilate;
uniform float gain;
uniform vec3 color;
uniform float tint; // 0: every splat the same light. 1: colored by the angle of its long axis.
out vec2 q;
out vec3 light0;
void main() {
  vec2 mu = mix(p0.xy, c0.xy, blend) * view.x + view.yz;
  float s2 = view.x * view.x;
  float a = mix(p0.z, c0.z, blend) * s2 + dilate;
  float b = mix(p0.w, c0.w, blend) * s2;
  float c = mix(p1.x, c1.x, blend) * s2 + dilate;
  float mass = mix(p1.y, c1.y, blend) * s2;
  float mean = 0.5 * (a + c);
  float d = sqrt(0.25 * (a - c) * (a - c) + b * b);
  float l1 = mean + d;
  float l2 = max(mean - d, 1e-6);
  vec2 v1 = a >= c ? vec2(l1 - c, b) : vec2(b, l1 - a);
  float len = length(v1);
  v1 = len > 1e-12 ? v1 / len : vec2(1.0, 0.0);
  vec2 v2 = vec2(-v1.y, v1.x);
  vec2 at = mu + 3.0 * (sqrt(l1) * v1 * corner.x + sqrt(l2) * v2 * corner.y);
  gl_Position = vec4(at.x / size.x * 2.0 - 1.0, 1.0 - at.y / size.y * 2.0, 0.0, 1.0);
  q = corner * 3.0;
  float peak = gain * mass / (6.2831853 * sqrt(l1 * l2));
  // An axis has no direction, so the hue goes round once per half turn.
  vec3 wheel = 0.5 + 0.5 * cos(2.0 * atan(v1.y, v1.x) + vec3(0.0, 2.0944, 4.1888));
  float stretch = smoothstep(0.04, 0.45, (l1 - l2) / (l1 + l2));
  light0 = mix(color, 0.72 * mix(vec3(0.8), wheel, stretch), tint) * peak;
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 q;
in vec3 light0;
out vec4 light;
void main() {
  light = vec4(light0 * exp(-0.5 * dot(q, q)), 1.0);
}`;

function createBeam(canvas) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
  if (!gl) return null;
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (error) {
    console.warn('WebGL2 unavailable, drawing in 2D instead.', error);
    return null;
  }
  const uniform = (name) => gl.getUniformLocation(program, name);
  const u = { blend: uniform('blend'), view: uniform('view'), size: uniform('size'), dilate: uniform('dilate'), gain: uniform('gain'), color: uniform('color'), tint: uniform('tint') };

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const instances = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instances);
  for (let loc = 1; loc <= 4; loc += 1) {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribDivisor(loc, 1);
  }
  let first = [];

  return {
    // Every level of the tree, packed end to end: 12 floats per splat.
    load(fit) {
      const { tree, per } = fit;
      const data = new Float32Array((tree.size - 1) * 12);
      first = [];
      let o = 0;
      for (let level = 0; level <= tree.levels; level += 1) {
        first.push(o / 12);
        for (let i = 2 ** level; i < 2 ** (level + 1); i += 1) {
          const p = i > 1 ? i >> 1 : 1;
          data[o] = tree.mx[i];
          data[o + 1] = tree.my[i];
          data[o + 2] = tree.a[i];
          data[o + 3] = tree.b[i];
          data[o + 4] = tree.c[i];
          data[o + 5] = tree.n[i] * per;
          data[o + 6] = tree.mx[p];
          data[o + 7] = tree.my[p];
          data[o + 8] = tree.a[p];
          data[o + 9] = tree.b[p];
          data[o + 10] = tree.c[p];
          data[o + 11] = (i > 1 ? tree.n[p] / 2 : tree.n[1]) * per;
          o += 12;
        }
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, instances);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    },
    draw(fit, level, blend, view, tint) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(10 / 255, 10 / 255, 11 / 255, 1); // the page's own black
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, instances);
      const base = first[level] * 48;
      gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 48, base);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 48, base + 16);
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 48, base + 24);
      gl.vertexAttribPointer(4, 2, gl.FLOAT, false, 48, base + 40);
      gl.uniform1f(u.blend, blend);
      gl.uniform3f(u.view, view.scale, view.x, view.y);
      gl.uniform2f(u.size, canvas.width, canvas.height);
      gl.uniform1f(u.dilate, DILATE);
      gl.uniform1f(u.gain, GAIN);
      gl.uniform3fv(u.color, BEAM);
      gl.uniform1f(u.tint, tint ? 1 : 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 2 ** level);
    },
  };
}

// A soft dot whose alpha falls off as a Gaussian out to three sigma.
let dot = null;
function softDot() {
  if (dot) return dot;
  dot = document.createElement('canvas');
  dot.width = dot.height = 96;
  const ctx = dot.getContext('2d');
  const gradient = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
  const [r, g, b] = BEAM.map((v) => Math.round(v * 255));
  for (let i = 0; i <= 16; i += 1) {
    const sigma = (i / 16) * 3;
    gradient.addColorStop(i / 16, `rgba(${r},${g},${b},${Math.exp(-0.5 * sigma * sigma) - (i === 16 ? Math.exp(-4.5) : 0)})`);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 96, 96);
  return dot;
}

function drawSplat2D(ctx, splat, view) {
  const s2 = view.scale * view.scale;
  const { l1, l2, theta } = eig(splat.a * s2 + DILATE, splat.b * s2, splat.c * s2 + DILATE);
  const s1 = Math.sqrt(l1);
  const sm = Math.sqrt(l2);
  const peak = (GAIN * splat.mass * s2) / (2 * Math.PI * s1 * sm);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  ctx.setTransform(s1 * cos, s1 * sin, -sm * sin, sm * cos, splat.mx * view.scale + view.x, splat.my * view.scale + view.y);
  let left = peak;
  while (left > 0.004) {
    ctx.globalAlpha = Math.min(1, left);
    ctx.drawImage(softDot(), -3, -3, 6, 6);
    left -= 1;
  }
}

function drawLevel2D(ctx, fit, level, blend, view) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0a0a0b';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 2 ** level; i < 2 ** (level + 1); i += 1) drawSplat2D(ctx, splatAt(fit, i, blend), view);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
}

// Sizes a canvas to its box in device pixels. Returns the pixel ratio used.
function sizeCanvas(canvas) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(canvas.clientWidth * ratio));
  const h = Math.max(1, Math.round(canvas.clientHeight * ratio));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return ratio;
}

function frame(fit, canvas, fillX, fillY) {
  const scale = Math.min((canvas.width * fillX) / fit.width, (canvas.height * fillY) / fit.height);
  return { scale, x: (canvas.width - fit.width * scale) / 2, y: (canvas.height - fit.height * scale) / 2 };
}

// Splits a dial position into the level being drawn and how far its splats
// have moved from their parents.
function phase(t) {
  const level = Math.max(0, Math.ceil(t - 1e-6));
  return { level, blend: level === 0 ? 1 : clamp(t - (level - 1), 0, 1) };
}

function tween(from, to, ms, onStep, onDone) {
  if (reduceMotion.matches || ms <= 0) {
    onStep(to);
    onDone?.();
    return () => {};
  }
  let raf = 0;
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min((now - t0) / ms, 1);
    const eased = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
    onStep(from + (to - from) * eased);
    if (k < 1) raf = requestAnimationFrame(step);
    else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

// Makes a handle that is drawn on a canvas something a pointer can take hold
// of. The grip is an element laid over the handle, so a finger anywhere else
// on the picture still scrolls the page. drag() gets the pointer's place in
// the canvas's own pixels.
function hold(grip, canvas, { take, drag, drop }) {
  let held = false;
  grip.addEventListener('pointerdown', (e) => {
    held = true;
    grip.setPointerCapture(e.pointerId);
    e.preventDefault();
    take();
  });
  grip.addEventListener('pointermove', (e) => {
    if (!held) return;
    const box = canvas.getBoundingClientRect();
    const ratio = canvas.width / box.width;
    drag((e.clientX - box.left) * ratio, (e.clientY - box.top) * ratio);
  });
  const release = () => {
    if (!held) return;
    held = false;
    drop();
  };
  grip.addEventListener('pointerup', release);
  grip.addEventListener('pointercancel', release);
}

/* ---------- Hero: the name, the dial and the probe ---------- */

function hero(onFit) {
  const stage = $('stage');
  if (!stage) return;
  const canvas = $('beam');
  const overlay = $('probe');
  const dial = $('dial');
  const ticks = $('ticks');
  const input = $('fit-text');
  const out = {
    subject: $('subject'),
    count: $('count'),
    noun: $('count-noun'),
    splats: $('r-splats'),
    level: $('r-level'),
    id: $('r-id'),
    mu: $('r-mu'),
    a: $('r-a'),
    b: $('r-b'),
    b2: $('r-b2'),
    c: $('r-c'),
    sigma: $('r-sigma'),
    theta: $('r-theta'),
    n: $('r-n'),
    splits: $('l-splits'),
    worst: $('l-worst'),
    drawn: $('c-drawn'),
  };

  // ?flat draws the hero on a 2D canvas, the path taken where WebGL2 is missing.
  const beam = new URLSearchParams(location.search).has('flat') ? null : createBeam(canvas);
  const flat = beam ? null : canvas.getContext('2d');
  const octx = overlay.getContext('2d');
  let fit = null;
  let view = null;
  let t = 0;
  let probe = 1;
  let probeLevel = 0;
  let pointer = null;
  let stacked = false;
  let stop = () => {};
  let queued = false;
  let touched = false;
  let tinted = false;

  const top = () => (fit ? (beam ? fit.tree.levels : Math.min(fit.tree.levels, 11)) : 0);

  function refit(text) {
    const next = fitText(text, { stacked });
    fit = next || fitText(NAME, { stacked });
    out.subject.textContent = next && text !== NAME ? `\u201c${text}\u201d` : 'my name';
    beam?.load(fit);
    dial.max = top();
    t = Math.min(t, top());
    probe = 1;
    probeLevel = 0;
    const check = checkTree(fit.tree);
    out.splits.textContent = fmt(check.splits);
    out.worst.innerHTML = sci(check.worst);
    onFit?.(fit, check);
    ticks.textContent = '';
    for (let level = 0; level <= top(); level += 1) {
      const tick = document.createElement('span');
      const n = 2 ** level;
      tick.textContent = n >= 1024 ? `${n / 1024}k` : n;
      tick.dataset.level = level;
      tick.style.left = `${(level / top()) * 100}%`;
      ticks.append(tick);
    }
    layout();
  }

  function layout() {
    const ratio = sizeCanvas(canvas);
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    if (fit) view = { ...frame(fit, canvas, 0.9, stacked ? 0.8 : 0.62), ratio };
    request();
  }

  function request() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      draw();
    });
  }

  function pick(level, blend) {
    // The splat whose ellipse the pointer is deepest inside.
    const x = (pointer.x * view.ratio - view.x) / view.scale;
    const y = (pointer.y * view.ratio - view.y) / view.scale;
    const pad = DILATE / (view.scale * view.scale);
    let best = 2 ** level;
    let least = Infinity;
    for (let i = 2 ** level; i < 2 ** (level + 1); i += 1) {
      const s = splatAt(fit, i, blend);
      const a = s.a + pad;
      const c = s.c + pad;
      const dx = x - s.mx;
      const dy = y - s.my;
      const d = (c * dx * dx - 2 * s.b * dx * dy + a * dy * dy) / (a * c - s.b * s.b);
      if (d < least) {
        least = d;
        best = i;
      }
    }
    return best;
  }

  function draw() {
    if (!fit || !view) return;
    const { level, blend } = phase(t);
    if (beam) beam.draw(fit, level, blend, view, tinted);
    else drawLevel2D(flat, fit, level, blend, view);

    // The probe follows its splat's line of descent when the level changes.
    if (level > probeLevel) probe *= 2 ** (level - probeLevel);
    else if (level < probeLevel) probe = Math.max(1, Math.floor(probe / 2 ** (probeLevel - level)));
    probeLevel = level;
    if (pointer) probe = pick(level, blend);

    const s = splatAt(fit, probe, blend);
    const s2 = view.scale * view.scale;
    const e = eig(s.a * s2 + DILATE, s.b * s2, s.c * s2 + DILATE);
    const cx = s.mx * view.scale + view.x;
    const cy = s.my * view.scale + view.y;
    const r1 = Math.sqrt(e.l1);
    const r2 = Math.sqrt(e.l2);
    octx.clearRect(0, 0, overlay.width, overlay.height);
    octx.strokeStyle = PROBE;
    octx.fillStyle = PROBE;
    octx.lineWidth = 1.25 * view.ratio;
    octx.beginPath();
    octx.ellipse(cx, cy, r1, r2, e.theta, 0, Math.PI * 2);
    octx.stroke();
    octx.setLineDash([4 * view.ratio, 5 * view.ratio]);
    octx.beginPath();
    octx.ellipse(cx, cy, r1 * 2, r2 * 2, e.theta, 0, Math.PI * 2);
    octx.stroke();
    octx.setLineDash([]);
    octx.globalAlpha = 0.7;
    octx.beginPath();
    const cos = Math.cos(e.theta);
    const sin = Math.sin(e.theta);
    octx.moveTo(cx - cos * r1 * 2, cy - sin * r1 * 2);
    octx.lineTo(cx + cos * r1 * 2, cy + sin * r1 * 2);
    octx.moveTo(cx + sin * r2 * 2, cy - cos * r2 * 2);
    octx.lineTo(cx - sin * r2 * 2, cy + cos * r2 * 2);
    octx.stroke();
    octx.globalAlpha = 1;
    octx.beginPath();
    octx.arc(cx, cy, 2.5 * view.ratio, 0, Math.PI * 2);
    octx.fill();

    // The readout, in the fitted picture's own pixels.
    const count = 2 ** level;
    const raw = eig(s.a, s.b, s.c);
    out.count.textContent = fmt(count);
    out.noun.textContent = count === 1 ? 'Gaussian splat' : 'Gaussian splats';
    out.splats.textContent = `${fmt(count)} of ${fmt(2 ** top())}`;
    out.level.textContent = `${level} of ${top()}`;
    out.id.textContent = `${fmt(probe - count + 1)} of ${fmt(count)}`;
    out.mu.textContent = `(${s.mx.toFixed(1)}, ${s.my.toFixed(1)})`;
    out.a.textContent = s.a.toFixed(1);
    out.b.textContent = out.b2.textContent = s.b.toFixed(1).replace('-', '−');
    out.c.textContent = s.c.toFixed(1);
    out.sigma.textContent = `${Math.sqrt(raw.l1).toFixed(1)}, ${Math.sqrt(raw.l2).toFixed(1)}`;
    out.theta.textContent = `${(-raw.theta * 180 / Math.PI).toFixed(0).replace('-', '−')}°`;
    out.n.textContent = fmt(s.mass);
    if (out.drawn) out.drawn.textContent = `${fmt(count)} ${count === 1 ? 'splat' : 'splats'}`;
    dial.setAttribute('aria-valuetext', `${fmt(count)} splats`);
    [...ticks.children].forEach((tick) => tick.classList.toggle('is-on', Number(tick.dataset.level) === level));
  }

  function setLevel(next) {
    t = clamp(next, 0, top());
    dial.value = t;
    request();
  }

  function glide(to, ms = 420) {
    stop();
    stop = tween(t, clamp(to, 0, top()), ms, setLevel);
  }

  dial.addEventListener('input', () => {
    touched = true;
    stop();
    t = Number(dial.value);
    request();
  });
  dial.addEventListener('change', () => glide(Math.round(Number(dial.value)), 260));
  dial.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 2, PageDown: -2 }[e.key];
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? top() : step ? Math.round(t) + step : null;
    if (to === null) return;
    e.preventDefault();
    touched = true;
    glide(to, 320);
  });
  ticks.addEventListener('click', (e) => {
    const level = e.target.dataset?.level;
    if (level === undefined) return;
    touched = true;
    glide(Number(level), 500);
  });

  const tint = $('tint');
  if (!beam) tint.hidden = true;
  tint.addEventListener('click', () => {
    tinted = !tinted;
    tint.setAttribute('aria-pressed', tinted);
    request();
  });

  const aim = (e) => {
    const box = canvas.getBoundingClientRect();
    pointer = { x: e.clientX - box.left, y: e.clientY - box.top };
    request();
  };
  stage.addEventListener('pointermove', aim);
  stage.addEventListener('pointerdown', aim);
  stage.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') pointer = null;
  });

  let typing = 0;
  input.addEventListener('input', () => {
    touched = true;
    clearTimeout(typing);
    typing = setTimeout(() => {
      stop();
      refit(input.value.toUpperCase().trim() || NAME);
    }, 140);
  });
  input.addEventListener('blur', () => {
    if (!input.value.trim()) input.value = NAME;
  });

  new ResizeObserver(() => {
    const narrow = stage.clientWidth < 560;
    if (narrow !== stacked) {
      stacked = narrow;
      stage.classList.toggle('is-stacked', stacked);
      refit(input.value.toUpperCase().trim() || NAME);
    } else layout();
  }).observe(stage);

  stacked = stage.clientWidth < 560;
  stage.classList.toggle('is-stacked', stacked);
  refit(NAME);
  document.documentElement.classList.add('is-lit');

  // Rest the probe on the splat in the middle of the picture.
  const center = () => {
    if (pointer || touched) return;
    pointer = { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 };
    draw();
    pointer = null;
  };

  // Open on one splat, then let it divide until the name is there.
  const rest = Math.min(REST, top());
  if (reduceMotion.matches) {
    setLevel(rest);
    requestAnimationFrame(center);
  } else {
    setLevel(0);
    setTimeout(() => {
      if (!touched) stop = tween(0, rest, 4600, (v) => !touched && setLevel(v), center);
    }, 900);
  }
}

/* ---------- Definition: one splat you can reshape ---------- */

function anatomy() {
  const canvas = $('anatomy');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const sliders = { s1: $('a-s1'), s2: $('a-s2'), theta: $('a-theta') };
  const grips = { major: $('a-major'), minor: $('a-minor') };
  const out = { a: $('a-a'), b: $('a-b'), b2: $('a-b2'), c: $('a-c'), cos: $('a-cos'), sin: $('a-sin'), nsin: $('a-nsin'), cos2: $('a-cos2'), s1: $('a-s1v'), s2: $('a-s2v'), det: $('a-det'), o1: $('a-o1'), o2: $('a-o2'), o3: $('a-o3') };
  const state = { s1: 1.5, s2: 0.6, theta: 25 };
  let held = null;

  const read = () => {
    state.s1 = Number(sliders.s1.value);
    state.s2 = Number(sliders.s2.value);
    state.theta = Number(sliders.theta.value);
  };
  const write = () => {
    sliders.s1.value = state.s1;
    sliders.s2.value = state.s2;
    sliders.theta.value = state.theta;
  };
  const signed = (v, digits = 2) => v.toFixed(digits).replace('-', '−');

  // Units: the figure is eight units wide, y up, angles counter-clockwise.
  const geometry = () => {
    const ratio = sizeCanvas(canvas);
    const unit = Math.min(canvas.width, canvas.height) / 8;
    const rad = (state.theta * Math.PI) / 180;
    return { ratio, unit, rad, cx: canvas.width / 2, cy: canvas.height / 2, cos: Math.cos(rad), sin: Math.sin(rad) };
  };
  const handles = (g) => [
    { key: 'major', x: g.cx + g.cos * state.s1 * 2 * g.unit, y: g.cy - g.sin * state.s1 * 2 * g.unit },
    { key: 'minor', x: g.cx - g.sin * state.s2 * 2 * g.unit, y: g.cy - g.cos * state.s2 * 2 * g.unit },
  ];

  function draw() {
    const g = geometry();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // The splat: a unit Gaussian stretched by S and turned by R.
    ctx.globalCompositeOperation = 'lighter';
    ctx.setTransform(state.s1 * g.unit * g.cos, -state.s1 * g.unit * g.sin, -state.s2 * g.unit * g.sin, -state.s2 * g.unit * g.cos, g.cx, g.cy);
    ctx.globalAlpha = 0.95;
    ctx.drawImage(softDot(), -3, -3, 6, 6);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    ctx.strokeStyle = PROBE;
    ctx.fillStyle = PROBE;
    ctx.lineWidth = 1.25 * g.ratio;
    for (const k of [1, 2]) {
      ctx.setLineDash(k === 2 ? [4 * g.ratio, 5 * g.ratio] : []);
      ctx.beginPath();
      ctx.ellipse(g.cx, g.cy, state.s1 * g.unit * k, state.s2 * g.unit * k, -g.rad, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    const [major, minor] = handles(g);
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(2 * g.cx - major.x, 2 * g.cy - major.y);
    ctx.lineTo(major.x, major.y);
    ctx.moveTo(2 * g.cx - minor.x, 2 * g.cy - minor.y);
    ctx.lineTo(minor.x, minor.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const css = canvas.clientWidth / canvas.width;
    for (const h of [major, minor]) {
      ctx.beginPath();
      ctx.arc(h.x, h.y, (held === h.key ? 9 : 7) * g.ratio, 0, Math.PI * 2);
      ctx.fillStyle = '#0b0b0c';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(h.x, h.y, 2.5 * g.ratio, 0, Math.PI * 2);
      ctx.fillStyle = PROBE;
      ctx.fill();
      grips[h.key].style.translate = `${h.x * css}px ${h.y * css}px`;
    }
    ctx.beginPath();
    ctx.arc(g.cx, g.cy, 2.5 * g.ratio, 0, Math.PI * 2);
    ctx.fill();

    const { a, b, c } = covariance(state.s1, state.s2, g.rad);
    out.a.textContent = a.toFixed(2);
    out.b.textContent = out.b2.textContent = signed(b);
    out.c.textContent = c.toFixed(2);
    out.cos.textContent = out.cos2.textContent = signed(g.cos);
    out.sin.textContent = signed(g.sin);
    out.nsin.textContent = signed(-g.sin);
    out.s1.textContent = state.s1.toFixed(2);
    out.s2.textContent = state.s2.toFixed(2);
    out.det.textContent = (a * c - b * b).toFixed(3);
    out.o1.textContent = state.s1.toFixed(2);
    out.o2.textContent = state.s2.toFixed(2);
    out.o3.textContent = `${signed(state.theta, 0)}°`;
  }

  Object.values(sliders).forEach((slider) => slider.addEventListener('input', () => {
    read();
    draw();
  }));

  Object.entries(grips).forEach(([key, grip]) => hold(grip, canvas, {
    take() {
      held = key;
      draw();
    },
    drag(x, y) {
      const g = geometry();
      const dx = x - g.cx;
      const dy = g.cy - y;
      const length = clamp(Math.hypot(dx, dy) / (2 * g.unit), key === 'major' ? 0.2 : 0.1, 2);
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI - (key === 'minor' ? 90 : 0);
      // An axis has no direction: fold the angle into (−90°, 90°].
      angle = ((((angle + 90) % 180) + 180) % 180) - 90;
      state[key === 'major' ? 's1' : 's2'] = Math.round(length * 100) / 100;
      state.theta = Math.round(angle);
      write();
      draw();
    },
    drop() {
      held = null;
      draw();
    },
  }));

  write();
  new ResizeObserver(draw).observe(canvas);
  draw();
}

/* ---------- Lemma: one split of the picture, with a cut you can move ---------- */

// A pixel color, packed the way a little-endian ImageData reads it.
const packed = (r, g, b) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;

function lemma() {
  const canvas = $('split');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const dial = $('s-pick');
  const grips = { a: $('s-a'), b: $('s-b') };
  const out = {
    id: $('s-id'),
    sample: $('s-sample'),
    halves: $('s-n2'),
    mean2: $('s-mu2'),
    within: $('s-in'),
    between: $('s-btw'),
    sum: $('s-sum'),
    whole: $('s-n'),
    mean: $('s-mu'),
    own: $('s-own'),
    error: $('s-err'),
  };
  const FIRST = packed(255, 106, 58); // one half in the beam's own light
  const SECOND = packed(128, 53, 29); // the other, the same light turned down
  const REST = packed(38, 38, 42); // the rest of the picture
  const MARGIN = 14;

  let fit = null;
  let i = 1; // the splat being divided
  let box = null; // how far its pixels reach
  let cut = null; // null: the tree's own cut. Otherwise two points on the line, in the picture's pixels.
  let worstAt = 1;
  let held = null;
  let shown = null; // where the last frame put the handles
  let image = null;
  let scratch = null;
  let map = null;
  let queued = false;

  const last = () => Math.max(1, fit.tree.size / 2 - 1); // the last splat that has two halves
  // The dial gives every level the same width, as the one in the hero does.
  const toDial = (n) => {
    const level = Math.floor(Math.log2(n));
    return level + (n - 2 ** level) / 2 ** level;
  };
  const fromDial = (v) => {
    const level = clamp(Math.floor(v), 0, Math.max(fit.tree.levels - 1, 0));
    return Math.min(2 ** level + Math.floor((v - level) * 2 ** level), 2 ** (level + 1) - 1);
  };
  const num = (v) => (Math.abs(v) < 0.05 ? 0 : v).toFixed(1).replace('-', '−');
  const matrix = (el, m) => {
    const cells = el.children;
    cells[0].textContent = num(m.a);
    cells[1].textContent = cells[2].textContent = num(m.b);
    cells[3].textContent = num(m.c);
  };

  function request() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      draw();
    });
  }

  function select(next, sync = true) {
    i = clamp(Math.round(next), 1, last());
    cut = null;
    const { tree, xs, ys } = fit;
    box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    for (let k = tree.lo[i]; k < tree.hi[i]; k += 1) {
      const x = xs[tree.idx[k]];
      const y = ys[tree.idx[k]];
      if (x < box.x0) box.x0 = x;
      if (x > box.x1) box.x1 = x;
      if (y < box.y0) box.y0 = y;
      if (y > box.y1) box.y1 = y;
    }
    if (sync) dial.value = toDial(i);
    dial.setAttribute('aria-valuetext', `splat ${fmt(i)} of ${fmt(last())}`);
    out.id.textContent = `${fmt(i)} of ${fmt(last())}`;
    request();
  }

  // The splat's pixels in two halves, list[s..m) and list[m..e), with the
  // Gaussian of each. Without a cut of the visitor's these are the tree's own
  // two children: the split the page has already checked. Null if the cut
  // would leave a half empty.
  function divide() {
    const { tree, xs, ys } = fit;
    if (2 * i + 1 >= tree.size) return null;
    const p = node(tree, i);
    const s = tree.lo[i];
    const e = tree.hi[i];
    if (!cut) {
      const l = 2 * i;
      const r = l + 1;
      // The tree cut across its long axis. Find where: between the last pixel of one half and the first of the other.
      const angle = eig(p.a, p.b, p.c).theta;
      const vx = Math.cos(angle);
      const vy = Math.sin(angle);
      let before = -Infinity;
      let after = Infinity;
      for (let k = s; k < e; k += 1) {
        const t = (xs[tree.idx[k]] - p.mx) * vx + (ys[tree.idx[k]] - p.my) * vy;
        if (k < tree.hi[l]) before = Math.max(before, t);
        else after = Math.min(after, t);
      }
      const offset = (before + after) / 2;
      return { p, l: node(tree, l), r: node(tree, r), list: tree.idx, s, m: tree.hi[l], e, x: p.mx + offset * vx, y: p.my + offset * vy, ux: -vy, uy: vx };
    }
    const length = Math.hypot(cut.bx - cut.ax, cut.by - cut.ay);
    if (length < 1e-6) return null;
    const ux = (cut.bx - cut.ax) / length;
    const uy = (cut.by - cut.ay) / length;
    let m = 0;
    let back = e - s;
    for (let k = s; k < e; k += 1) {
      const j = tree.idx[k];
      // Which side of the line the pixel's center is on.
      if ((xs[j] - cut.ax) * uy - (ys[j] - cut.ay) * ux < 0) {
        scratch[m] = j;
        m += 1;
      } else {
        back -= 1;
        scratch[back] = j;
      }
    }
    if (m === 0 || m === e - s) return null;
    return { p, l: moments(xs, ys, scratch, 0, m), r: moments(xs, ys, scratch, m, e - s), list: scratch, s: 0, m, e: e - s, x: cut.ax, y: cut.ay, ux, uy };
  }

  function draw() {
    if (!fit || !box) return;
    const ratio = sizeCanvas(canvas);
    const W = canvas.width;
    const H = canvas.height;
    if (!image || image.width !== W || image.height !== H) image = ctx.createImageData(W, H);
    const d = divide();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!d) {
      ctx.clearRect(0, 0, W, H);
      shown = null;
      return;
    }
    const check = checkSplit(d.p, d.l, d.r);
    const { tree, xs, ys } = fit;

    // Frame the splat's pixels and its ellipse at two standard deviations.
    const reachX = Math.max(2 * Math.sqrt(d.p.a), d.p.mx - box.x0 + 0.5, box.x1 + 0.5 - d.p.mx);
    const reachY = Math.max(2 * Math.sqrt(d.p.c), d.p.my - box.y0 + 0.5, box.y1 + 0.5 - d.p.my);
    const scale = Math.min((W * 0.45) / reachX, (H * 0.43) / reachY, H / 7);
    const view = { scale, x: W / 2 - d.p.mx * scale, y: H / 2 - d.p.my * scale };
    const X = (x) => x * scale + view.x;
    const Y = (y) => y * scale + view.y;

    // The pixels: one square each. Large ones get a hairline between them.
    const side = Math.max(1, Math.ceil(scale - 1e-3) - (scale >= 6 ? 1 : 0));
    const px = new Uint32Array(image.data.buffer);
    px.fill(0);
    const plot = (list, s, e, color) => {
      for (let k = s; k < e; k += 1) {
        const x0 = Math.round(X(xs[list[k]] - 0.5));
        const y0 = Math.round(Y(ys[list[k]] - 0.5));
        const xa = Math.max(0, x0);
        const xb = Math.min(W, x0 + side);
        const yb = Math.min(H, y0 + side);
        for (let y = Math.max(0, y0); y < yb; y += 1) {
          for (let x = xa; x < xb; x += 1) px[y * W + x] = color;
        }
      }
    };
    if (i > 1) plot(tree.idx, 0, tree.total, REST);
    plot(d.list, d.m, d.e, SECOND);
    plot(d.list, d.s, d.m, FIRST);
    ctx.putImageData(image, 0, 0);

    const s2 = scale * scale;
    const ring = (m, k) => {
      const e = eig(m.a * s2, m.b * s2, m.c * s2);
      ctx.beginPath();
      ctx.ellipse(X(m.mx), Y(m.my), Math.sqrt(e.l1) * k, Math.sqrt(e.l2) * k, e.theta, 0, Math.PI * 2);
      ctx.stroke();
    };
    const spot = (x, y, r) => {
      ctx.beginPath();
      ctx.arc(x, y, r * ratio, 0, Math.PI * 2);
    };
    const dashes = [4 * ratio, 5 * ratio];

    // The splat measured whole: a wide band at two standard deviations.
    ctx.strokeStyle = PROBE;
    ctx.fillStyle = PROBE;
    ctx.lineWidth = 7 * ratio;
    ctx.globalAlpha = 0.32;
    ring(d.p, 2);
    // The two halves, and the line between their centers.
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.25 * ratio;
    ctx.setLineDash(dashes);
    ring(d.l, 2);
    ring(d.r, 2);
    // What the halves give back when they are put together. It lies in the band.
    ctx.strokeStyle = '#fff';
    ring(check.sum, 2);
    ctx.setLineDash([]);
    ctx.strokeStyle = PROBE;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(X(d.l.mx), Y(d.l.my));
    ctx.lineTo(X(d.r.mx), Y(d.r.my));
    ctx.stroke();
    ctx.globalAlpha = 1;
    spot(X(d.l.mx), Y(d.l.my), 2.5);
    ctx.fill();
    spot(X(d.r.mx), Y(d.r.my), 2.5);
    ctx.fill();
    // The mean: the splat's own is a ring, and the one the halves give back is the dot in it.
    spot(X(d.p.mx), Y(d.p.my), 5.5);
    ctx.fillStyle = '#0b0b0c';
    ctx.fill();
    ctx.stroke();
    spot(X(check.sum.mx), Y(check.sum.my), 2.25);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Name the centers, to one side of the line that joins them.
    let nx = d.l.my - d.r.my;
    let ny = d.r.mx - d.l.mx;
    const apart = Math.hypot(nx, ny) || 1;
    nx /= apart;
    ny /= apart;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    const name = (m, sub, away) => {
      const x = X(m.mx) + nx * away * ratio;
      const y = Y(m.my) + ny * away * ratio;
      ctx.font = `italic ${17 * ratio}px "STIX Two Text", Georgia, serif`;
      const w = ctx.measureText('μ').width;
      ctx.lineWidth = 4 * ratio;
      ctx.strokeStyle = 'rgb(0 0 0 / 0.75)';
      ctx.fillStyle = PROBE;
      ctx.strokeText('μ', x, y);
      ctx.fillText('μ', x, y);
      if (!sub) return;
      ctx.font = `${11 * ratio}px "STIX Two Text", Georgia, serif`;
      ctx.strokeText(sub, x + w * 0.5 + 3 * ratio, y + 5 * ratio);
      ctx.fillText(sub, x + w * 0.5 + 3 * ratio, y + 5 * ratio);
    };
    name(d.l, '1', 16);
    name(d.r, '2', 16);
    name(d.p, '', -18);

    // The cut, and a handle toward each end of it.
    const cx = X(d.x);
    const cy = Y(d.y);
    const far = W + H;
    ctx.strokeStyle = PROBE;
    ctx.lineWidth = 1.25 * ratio;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(cx - d.ux * far, cy - d.uy * far);
    ctx.lineTo(cx + d.ux * far, cy + d.uy * far);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const m = MARGIN * ratio;
    const room = (dx, dy) => Math.max(0, Math.min(
      dx > 0 ? (W - m - cx) / dx : dx < 0 ? (m - cx) / dx : Infinity,
      dy > 0 ? (H - m - cy) / dy : dy < 0 ? (m - cy) / dy : Infinity,
    ));
    const reach = 0.36 * Math.min(W, H);
    const ends = cut
      ? { a: [X(cut.ax), Y(cut.ay)], b: [X(cut.bx), Y(cut.by)] }
      : {
          a: [cx - d.ux * Math.min(reach, room(-d.ux, -d.uy)), cy - d.uy * Math.min(reach, room(-d.ux, -d.uy))],
          b: [cx + d.ux * Math.min(reach, room(d.ux, d.uy)), cy + d.uy * Math.min(reach, room(d.ux, d.uy))],
        };
    const css = canvas.clientWidth / W;
    for (const key of ['a', 'b']) {
      const [x, y] = ends[key];
      spot(x, y, held === key ? 9 : 7);
      ctx.fillStyle = '#0b0b0c';
      ctx.fill();
      ctx.stroke();
      spot(x, y, 2.5);
      ctx.fillStyle = PROBE;
      ctx.fill();
      grips[key].style.translate = `${x * css}px ${y * css}px`;
    }
    shown = { view, ends, W, H, m };

    // Where in the picture this splat is, once it is too small to tell.
    if (i >= 4 && map) {
      const w = Math.min(W * 0.3, (H * 0.2 * map.width) / map.height);
      const h = (w * map.height) / map.width;
      const x0 = 12 * ratio;
      const y0 = 12 * ratio;
      const pad = 6 * ratio;
      ctx.fillStyle = 'rgb(10 10 11 / 0.86)';
      ctx.fillRect(x0 - pad, y0 - pad, w + 2 * pad, h + 2 * pad);
      ctx.strokeStyle = '#2b2b2e';
      ctx.lineWidth = ratio;
      ctx.strokeRect(x0 - pad, y0 - pad, w + 2 * pad, h + 2 * pad);
      ctx.drawImage(map, x0, y0, w, h);
      ctx.strokeStyle = PROBE;
      ctx.lineWidth = 1.25 * ratio;
      spot(x0 + (d.p.mx / fit.width) * w, y0 + (d.p.my / fit.height) * h, 4.5);
      ctx.stroke();
    }

    out.halves.textContent = `${fmt(d.l.n)} + ${fmt(d.r.n)}`;
    out.mean2.textContent = `(${check.sum.mx.toFixed(1)}, ${check.sum.my.toFixed(1)})`;
    matrix(out.within, check.within);
    matrix(out.between, check.between);
    matrix(out.sum, check.sum);
    out.whole.textContent = fmt(d.p.n);
    out.mean.textContent = `(${d.p.mx.toFixed(1)}, ${d.p.my.toFixed(1)})`;
    matrix(out.own, d.p);
    out.error.innerHTML = sci(check.residual);
  }

  // Move one end of the cut to a point on the canvas. The move is refused if
  // it would leave one half with no pixels at all.
  function move(key, x, y) {
    if (!shown) return;
    const { view, ends, W, H, m } = shown;
    const before = cut;
    const next = { a: ends.a, b: ends.b, [key]: [clamp(x, m, W - m), clamp(y, m, H - m)] };
    cut = {
      ax: (next.a[0] - view.x) / view.scale,
      ay: (next.a[1] - view.y) / view.scale,
      bx: (next.b[0] - view.x) / view.scale,
      by: (next.b[1] - view.y) / view.scale,
    };
    if (!divide()) cut = before;
    else draw();
  }

  Object.entries(grips).forEach(([key, grip]) => {
    hold(grip, canvas, {
      take() {
        held = key;
        grip.focus({ preventScroll: true });
        request();
      },
      drag: (x, y) => move(key, x, y),
      drop() {
        held = null;
        request();
      },
    });
    grip.addEventListener('keydown', (e) => {
      const step = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!step || !shown) return;
      e.preventDefault();
      const by = (e.shiftKey ? 1 : 8) * (canvas.width / canvas.clientWidth);
      move(key, shown.ends[key][0] + step[0] * by, shown.ends[key][1] + step[1] * by);
    });
  });

  dial.addEventListener('input', () => select(fromDial(Number(dial.value)), false));
  dial.addEventListener('keydown', (e) => {
    const to = {
      ArrowRight: i + 1,
      ArrowUp: i + 1,
      ArrowLeft: i - 1,
      ArrowDown: i - 1,
      PageUp: 2 * i <= last() ? 2 * i : i,
      PageDown: i >> 1,
      Home: 1,
      End: last(),
    }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    select(to);
  });
  $('s-reset').addEventListener('click', () => {
    cut = null;
    request();
  });
  $('s-worst').addEventListener('click', () => select(worstAt));

  new ResizeObserver(request).observe(canvas);
  document.fonts.load('italic 17px "STIX Two Text"', 'μ').then(request);

  return (next, check) => {
    fit = next;
    worstAt = check.at || 1;
    scratch = new Uint32Array(fit.tree.total);
    dial.max = Math.max(fit.tree.levels, 1);

    // The whole picture, small, to find the splat on.
    map = document.createElement('canvas');
    map.width = 480;
    map.height = Math.max(1, Math.round((480 * fit.height) / fit.width));
    const small = map.getContext('2d');
    const dots = small.createImageData(map.width, map.height);
    const px = new Uint32Array(dots.data.buffer);
    const k = map.width / fit.width;
    for (let j = 0; j < fit.xs.length; j += 1) {
      px[Math.min(map.height - 1, Math.floor(fit.ys[j] * k)) * map.width + Math.min(map.width - 1, Math.floor(fit.xs[j] * k))] = SECOND;
    }
    small.putImageData(dots, 0, 0);

    const { total } = fit.tree;
    out.sample.textContent = fit.per > 1
      ? `The fit works from a sample of the ink: ${fmt(total)} of its ${fmt(total * fit.per)} pixels.`
      : `The fit works from every pixel of the ink: ${fmt(total)} of them.`;
    select(1);
  };
}

/* ---------- Other work: each title resolves out of a few splats ---------- */

function titles() {
  const rows = [...document.querySelectorAll('[data-splat]')];
  if (!rows.length) return;
  const LOW = 4;
  const live = new Map();

  rows.forEach((row) => {
    const canvas = row.querySelector('canvas');
    const fit = fitText(row.dataset.splat.toUpperCase(), { maxPoints: 20000, maxLevel: 10, font: '700 150px "B612", sans-serif' });
    if (!canvas || !fit) return;
    const ctx = canvas.getContext('2d');
    const item = { fit, t: LOW, stop: () => {}, want: LOW };
    live.set(row, item);
    const paint = () => {
      sizeCanvas(canvas);
      const view = frame(fit, canvas, 1, 0.74);
      view.x = 0;
      const { level, blend } = phase(item.t);
      drawLevel2D(ctx, fit, level, blend, view);
    };
    item.paint = paint;
    item.go = (to) => {
      if (item.want === to) return;
      item.want = to;
      item.stop();
      item.stop = tween(item.t, to, to > item.t ? 900 : 500, (v) => {
        item.t = v;
        paint();
      });
    };
    row.classList.add('has-splat');
    new ResizeObserver(paint).observe(canvas);
    paint();
    row.addEventListener('pointerenter', () => item.go(fit.tree.levels));
    row.addEventListener('focusin', () => item.go(fit.tree.levels));
  });

  // A title sharpens while its row crosses the middle of the screen.
  const watch = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const item = live.get(entry.target);
      if (item) item.go(entry.isIntersecting ? item.fit.tree.levels : LOW);
    });
  }, { rootMargin: '-30% 0px -30% 0px' });
  live.forEach((_, row) => watch.observe(row));
}

document.fonts.load(FACE, NAME).then(() => document.fonts.ready).finally(() => {
  hero(lemma());
  anatomy();
  titles();
});
