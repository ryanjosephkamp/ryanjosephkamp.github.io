// SPECIMEN — Ryan Kamp. No dependencies. The math is in specimen.js; this file draws it.

import { neuron, prepare, pack, merge, normalize, hodgkinHuxley, threshold, rng, ball, needle, stain, STAINS, SPIKE, BODY, SHEATH, WAVE_MS, T_SOMA } from './specimen.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const pixels = () => Math.min(window.devicePixelRatio || 1, 2);

/* ---------- the stage: splats drawn as stain on a lit slide ---------- */

// Each splat is one quad. The vertex shader slides it between its parent and itself (uT),
// turns its 3D covariance to face the screen (R S Rᵀ) and keeps the 2D part.
const VERT = `#version 300 es
precision highp float;
layout(location=0) in vec2 corner;
layout(location=1) in vec4 aMW; layout(location=2) in vec4 aSd; layout(location=3) in vec4 aSo; layout(location=4) in vec4 aInk;
layout(location=5) in vec4 pMW; layout(location=6) in vec4 pSd; layout(location=7) in vec4 pSo; layout(location=8) in vec4 pInk;
uniform mat3 uR; uniform vec3 uCenter; uniform vec2 uScale;
uniform float uT, uTime, uBlur, uDensity, uWaveMs, uHotAmt;
uniform vec3 uSpike; uniform vec3 uInk[4]; uniform vec2 uHot; uniform vec4 uHotMask;
uniform sampler2D uWave;
out vec2 vD; out vec3 vConic; out vec3 vAbs;
void main() {
  vec4 mw = mix(pMW, aMW, uT), sd = mix(pSd, aSd, uT), so = mix(pSo, aSo, uT), ink = mix(pInk, aInk, uT);
  mat3 S = mat3(sd.x, so.x, so.y, so.x, sd.y, so.z, so.y, so.z, sd.z);
  mat3 C = uR * S * transpose(uR);
  float a = C[0][0] + uBlur, b = C[0][1], c = C[1][1] + uBlur;
  float det = max(a * c - b * b, 1e-14);
  vec3 mu = uR * (mw.xyz - uCenter);
  vD = corner * 3.0 * sqrt(vec2(a, c));
  vConic = vec3(c, -b, a) / det;
  float act = 0.0;
  float tau = uTime - sd.w;
  if (uTime > -900.0 && tau > 0.0 && tau < uWaveMs) act = (textureLod(uWave, vec2(tau / uWaveMs, 0.5), 0.0).r * 1.25 - 0.25) * so.w;
  float hot = uHotAmt * step(uHot.x, sd.w) * step(sd.w, uHot.y) * clamp(dot(ink, uHotMask), 0.0, 1.0);
  vec3 base = uInk[0] * ink.x + uInk[1] * ink.y + uInk[2] * ink.z + uInk[3] * ink.w;
  vec3 dye = mix(base, uSpike, max(clamp(act * 1.4, 0.0, 1.0), hot));
  vAbs = dye * (mw.w / (6.2831853 * sqrt(det))) * uDensity * (1.0 + 1.6 * act + 0.7 * hot);
  gl_Position = vec4((mu.xy + vD) * uScale, 0.0, 1.0);
}`;

// Optical depth of one splat at this pixel. Depths add; the light that survives is exp(−sum).
const FRAG = `#version 300 es
precision highp float;
in vec2 vD; in vec3 vConic; in vec3 vAbs;
uniform float uDirect;
out vec4 o;
void main() {
  float p = -0.5 * (vConic.x * vD.x * vD.x + 2.0 * vConic.y * vD.x * vD.y + vConic.z * vD.y * vD.y);
  if (p < -4.5) discard;
  vec3 depth = vAbs * exp(p);
  o = uDirect > 0.5 ? vec4(exp(-depth), 1.0) : vec4(depth, 1.0);
}`;

const POST_VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
const POST_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uSum;
out vec4 o;
void main() {
  vec3 depth = texelFetch(uSum, ivec2(gl_FragCoord.xy), 0).rgb;
  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  o = vec4(exp(-depth) + grain / 255.0, 1.0);
}`;

function program(gl, vs, fs) {
  const p = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    gl.attachShader(p, s);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

/**
 * One WebGL2 context that can hold several specimens. The hero has a stage to itself; every
 * small figure on the page shares a second one, hidden, and copies its picture out of it,
 * so the page never opens more than two contexts.
 */
class Stage {
  constructor(canvas, exact) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
    if (!gl) throw new Error('WebGL2 is not available');
    Object.assign(this, { canvas, gl, exact });
    this.prog = program(gl, VERT, FRAG);
    this.post = program(gl, POST_VERT, POST_FRAG);
    this.u = {};
    for (const n of ['uR', 'uCenter', 'uScale', 'uT', 'uTime', 'uBlur', 'uDensity', 'uWaveMs', 'uSpike', 'uInk', 'uHot', 'uHotMask', 'uHotAmt', 'uWave', 'uDirect']) this.u[n] = gl.getUniformLocation(this.prog, n);
    this.uSum = gl.getUniformLocation(this.post, 'uSum');
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.bare = gl.createVertexArray();
    this.wave = gl.createTexture();
    this.setWave(() => 0);
    // Sum optical depth in a float buffer when the browser can; otherwise multiply in 8 bits.
    this.float = !!gl.getExtension('EXT_color_buffer_float');
    this.wide = this.float && !!gl.getExtension('EXT_float_blend');
    if (this.float) {
      this.sum = gl.createTexture();
      this.fbo = gl.createFramebuffer();
    }
  }

  // The pulse, as a strip of 256 samples the vertex shader reads by each splat's delay.
  setWave(wave) {
    const { gl } = this;
    const samples = Uint8Array.from({ length: 256 }, (_, i) => Math.round(clamp((wave((i / 255) * WAVE_MS) + 0.25) / 1.25) * 255));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.wave);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 256, 1, 0, gl.RED, gl.UNSIGNED_BYTE, samples);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  }

  // Put a specimen on the stage. `it` is what load() returned last time, to replace it.
  load(spec, it) {
    const { gl } = this;
    if (!it) {
      it = { vao: gl.createVertexArray(), rows: gl.createBuffer() };
      gl.bindVertexArray(it.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      for (let k = 1; k <= 8; k += 1) {
        gl.enableVertexAttribArray(k);
        gl.vertexAttribDivisor(k, 1);
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, it.rows);
    gl.bufferData(gl.ARRAY_BUFFER, spec.rows, gl.DYNAMIC_DRAW);
    return Object.assign(it, { depth: spec.depth, center: spec.center, half: spec.half });
  }

  room(w, h) {
    const { gl, canvas } = this;
    const W = this.exact ? w : Math.max(canvas.width, w);
    const H = this.exact ? h : Math.max(canvas.height, h);
    if (W === canvas.width && H === canvas.height && this.sized) return;
    this.sized = true;
    canvas.width = W;
    canvas.height = H;
    if (!this.float) return;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.sum);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.wide ? gl.RGBA32F : gl.RGBA16F, W, H, 0, gl.RGBA, this.wide ? gl.FLOAT : gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.sum, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) this.float = false;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /**
   * Draw one specimen into the bottom-left w × h device pixels. Returns the rotation and the
   * scale it used, so a caller can pin a label to a point on the specimen.
   */
  draw(it, view, w, h) {
    if (!w || !h) return null;
    this.room(w, h);
    const { gl, u } = this;
    const half = view.half || it.half;
    const center = view.center || it.center;
    const long = view.portrait ? h : w;
    const short = view.portrait ? w : h;
    const scale = Math.min((long * (view.fit ?? 0.92)) / (2 * half[0]), (short * (view.fit ?? 0.92)) / (2 * half[1]));

    // Screen from model: roll (on a phone the axon points down), tilt, then spin about the long axis.
    const cs = Math.cos(view.spin || 0), sn = Math.sin(view.spin || 0), ct = Math.cos(view.tilt || 0), st = Math.sin(view.tilt || 0);
    const ts = [ct, st * sn, st * cs, 0, cs, -sn, -st, ct * sn, ct * cs];
    const R = view.portrait ? [ts[3], ts[4], ts[5], -ts[0], -ts[1], -ts[2], ts[6], ts[7], ts[8]] : ts;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.float ? this.fbo : null);
    gl.viewport(0, 0, w, h);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, 0, w, h);
    gl.enable(gl.BLEND);
    if (this.float) {
      gl.clearColor(0, 0, 0, 1);
      gl.blendFunc(gl.ONE, gl.ONE);
    } else {
      gl.clearColor(1, 1, 1, 1);
      gl.blendFunc(gl.DST_COLOR, gl.ZERO);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.prog);
    gl.bindVertexArray(it.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.wave);
    gl.uniformMatrix3fv(u.uR, true, R);
    gl.uniform3fv(u.uCenter, center);
    gl.uniform2f(u.uScale, (2 * scale) / w, (2 * scale) / h);
    gl.uniform1f(u.uTime, view.time ?? -999);
    gl.uniform1f(u.uBlur, ((view.blur ?? 0.6) * (view.dpr || 1) / scale) ** 2);
    gl.uniform1f(u.uDensity, view.density ?? 1);
    gl.uniform1f(u.uWaveMs, WAVE_MS);
    gl.uniform3fv(u.uSpike, SPIKE);
    gl.uniform3fv(u.uInk, view.inks || INKS.nissl);
    gl.uniform2fv(u.uHot, view.hot ? view.hot.range : [0, 0]);
    gl.uniform4fv(u.uHotMask, view.hot ? view.hot.mask : [0, 0, 0, 0]);
    gl.uniform1f(u.uHotAmt, view.hot ? view.hot.amount : 0);
    gl.uniform1i(u.uWave, 0);
    gl.uniform1f(u.uDirect, this.float ? 0 : 1);

    // A whole-number level draws that level. In between, the next level's splats are part-way
    // out from the parents they are splitting from.
    const lv = clamp(view.level ?? it.depth, 0, it.depth);
    const L = Math.ceil(lv);
    gl.uniform1f(u.uT, L === 0 ? 1 : smooth(lv - (L - 1)));
    const first = (1 << L) - 1;
    gl.bindBuffer(gl.ARRAY_BUFFER, it.rows);
    for (let k = 0; k < 8; k += 1) gl.vertexAttribPointer(k + 1, 4, gl.FLOAT, false, 128, first * 128 + k * 16);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 1 << L);

    if (this.float) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.disable(gl.BLEND);
      gl.useProgram(this.post);
      gl.bindVertexArray(this.bare);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.sum);
      gl.uniform1i(this.uSum, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
    return { R, scale, center };
  }
}

const INKS = Object.fromEntries(Object.entries(STAINS).map(([name, four]) => [name, four.flat()]));

// Where a point on a specimen lands, in CSS pixels from the top-left of its canvas.
function pinned(shot, at, w, h, dpr) {
  const { R, scale, center } = shot;
  const d = [at[0] - center[0], at[1] - center[1], at[2] - center[2]];
  const x = R[0] * d[0] + R[1] * d[1] + R[2] * d[2];
  const y = R[3] * d[0] + R[4] * d[1] + R[5] * d[2];
  return [(w / 2 + x * scale) / dpr, (h / 2 - y * scale) / dpr];
}

// The one-sigma outline of a 2D Gaussian with covariance [[a, b], [b, c]], y pointing down.
function outline(el, cx, cy, a, b, c, scale) {
  const mid = (a + c) / 2;
  const off = Math.hypot((a - c) / 2, b);
  el.setAttribute('cx', cx);
  el.setAttribute('cy', cy);
  el.setAttribute('rx', Math.sqrt(mid + off) * scale);
  el.setAttribute('ry', Math.sqrt(Math.max(mid - off, 1e-9)) * scale);
  el.setAttribute('transform', `rotate(${(Math.atan2(2 * b, a - c) * 90) / Math.PI} ${cx} ${cy})`);
}

/* ---------- small specimens: one hidden stage, many plates ---------- */

let backstage;
const pulse = (ms) => Math.exp(-(((ms - 0.9) / 0.55) ** 2));

// A plate is a 2D canvas that shows one specimen, drawn on the shared stage and copied across.
class Plate {
  constructor(canvas, spec, view) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.it = backstage.load(spec);
    this.view = view;
  }

  load(spec) {
    backstage.load(spec, this.it);
  }

  paint() {
    const { canvas, ctx } = this;
    const dpr = pixels();
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return null;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    this.view.dpr = dpr;
    const shot = backstage.draw(this.it, this.view, w, h);
    ctx.drawImage(backstage.canvas, 0, backstage.canvas.height - h, w, h, 0, 0, w, h);
    return { ...shot, w, h, dpr };
  }
}

// A handful of splats kept in the order given, paired left to right with the same merge.
function stack(leaves, half) {
  const n = leaves.length;
  const nodes = new Array(2 * n);
  leaves.forEach((leaf, i) => {
    nodes[n + i] = leaf;
  });
  for (let i = n - 1; i >= 1; i -= 1) nodes[i] = merge(nodes[2 * i], nodes[2 * i + 1]);
  return { depth: Math.log2(n), rows: pack({ nodes }), center: [0, 0, 0], half, nodes };
}

const whenSeen = (el, fn, threshold = 0.35) => {
  new IntersectionObserver(([entry]) => fn(entry.isIntersecting), { threshold }).observe(el);
};

/* ---------- the hero: focus it, label it, stain it, fire it ---------- */

// The neuron is grown in a worker when the browser allows it, and here when it does not.
function grown() {
  return new Promise((resolve) => {
    const here = () => {
      const { leaves, parts } = neuron();
      resolve({ ...prepare(leaves), parts });
    };
    try {
      const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => {
        resolve(e.data);
        worker.terminate();
      };
      worker.onerror = () => {
        worker.terminate();
        here();
      };
    } catch (err) {
      here();
    }
  });
}

async function hero() {
  const root = $('#top');
  const slideEl = $('.slide');
  const canvas = $('#scope');
  const focus = $('#focus');
  let stage;
  try {
    stage = new Stage(canvas, true);
  } catch (err) {
    root.classList.add('no-gl');
    return;
  }

  const hh = hodgkinHuxley();
  const volts = (ms) => {
    if (ms <= 0) return hh.rest;
    const x = Math.min(ms / hh.step, hh.trace.length - 1);
    const i = Math.floor(x);
    return hh.trace[i] + (hh.trace[Math.min(i + 1, hh.trace.length - 1)] - hh.trace[i]) * (x - i);
  };
  stage.setWave((ms) => (volts(ms) - hh.rest) / (hh.peak - hh.rest));

  const spec = await grown();
  const cell = stage.load(spec);
  root.classList.add('is-live');

  const DEPTH = spec.depth;
  const END = spec.last + 9; // ms until the cell is quiet again
  const SLOW = 7; // model milliseconds shown per second
  const out = { count: $('#count'), lvl: $('#lvl'), mass: $('#mass'), center: $('#center'), spread: $('#spread') };
  const fmt = (v, d) => (Math.abs(v) < 5 * 10 ** -(d + 1) ? 0 : v).toFixed(d);
  const view = { density: 0.5, inks: INKS.nissl.slice() };

  let target = Number(focus.value);
  let shown = target;
  let shownL = -1;
  let firedAt = null;
  let intro = null;
  let lastUser = -1e9;
  let visible = true;
  let dirty = true;
  let then = performance.now();
  let dpr = pixels();
  let slow = 0;

  function readout() {
    const L = Math.ceil(clamp(shown, 0, DEPTH) - 1e-6);
    root.style.setProperty('--focus', (shown / DEPTH).toFixed(3));
    if (L === shownL) return;
    shownL = L;
    const n = 1 << L;
    out.count.textContent = `${n.toLocaleString('en-US')} ${n === 1 ? 'splat' : 'splats'}`;
    out.lvl.textContent = String(L);
    const s = spec.stats[L];
    out.mass.textContent = s.w.toFixed(9);
    out.center.textContent = `(${s.m.map((v) => fmt(v, 6)).join(', ')})`;
    out.spread.textContent = `(${s.S.slice(0, 3).map((v) => Math.sqrt(v).toFixed(6)).join(', ')})`;
    focus.setAttribute('aria-valuetext', out.count.textContent);
  }

  // The chart: membrane potential at the soma against time.
  const pen = $('#pen');
  const dot = $('#pen-dot');
  const X = (ms) => 44 + (ms / END) * 540;
  const Y = (mv) => 118 - ((mv + 90) / 150) * 108;
  function chart(until) {
    let d = '';
    for (let ms = 0; ms <= until; ms += 0.1) d += `${d ? 'L' : 'M'}${X(ms).toFixed(1)} ${Y(volts(ms - T_SOMA)).toFixed(1)}`;
    pen.setAttribute('d', d || `M${X(0)} ${Y(hh.rest)}`);
    dot.setAttribute('cx', X(Math.max(until, 0)));
    dot.setAttribute('cy', Y(volts(until - T_SOMA)));
  }
  $('#v-peak').textContent = `${hh.peak >= 0 ? '+' : '−'}${Math.abs(hh.peak).toFixed(0)} mV`;
  $('#v-rest').textContent = `−${Math.abs(hh.rest).toFixed(0)} mV`;
  chart(0);

  function fire() {
    firedAt = performance.now();
    root.classList.add('is-firing');
    dirty = true;
  }

  // Stains: the four inks glide from one set to the next.
  let dyeFrom = view.inks;
  let dyeTo = view.inks;
  let dyedAt = null;
  const stainName = $('#stain-name');
  $$('input[name="stain"]').forEach((input) => {
    input.addEventListener('change', () => {
      dyeFrom = view.inks.slice();
      dyeTo = INKS[input.value];
      dyedAt = performance.now();
      slideEl.dataset.stain = input.value;
      stainName.textContent = input.dataset.after;
      dirty = true;
    });
  });

  // Labels: each pin follows its place on the cell, and lights its part when pointed at.
  const pinsEl = $('#pins');
  const labels = $('#labels');
  const pins = $$('li', pinsEl).map((li) => ({ li, button: $('button', li), part: spec.parts.find((part) => part.id === li.dataset.part) }));
  let hovered = null;
  let chosen = null;
  let lit = null;
  let glow = 0;
  let labeled = matchMedia('(min-width: 62rem)').matches;
  const setLabels = (on) => {
    labeled = on;
    labels.setAttribute('aria-pressed', String(on));
    if (!on) {
      chosen = null;
      pins.forEach((pin) => pin.button.setAttribute('aria-pressed', 'false'));
    }
    dirty = true;
  };
  setLabels(labeled);
  labels.addEventListener('click', () => setLabels(!labeled));
  pins.forEach((pin) => {
    pin.button.addEventListener('pointerenter', () => {
      hovered = pin;
      dirty = true;
    });
    pin.button.addEventListener('pointerleave', () => {
      hovered = null;
      dirty = true;
    });
    pin.button.addEventListener('click', () => {
      chosen = chosen === pin ? null : pin;
      pins.forEach((other) => other.button.setAttribute('aria-pressed', String(other === chosen)));
      dirty = true;
    });
  });

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - then) / 1000);
    const gap = now - then;
    const lag = Math.min(1, gap / 1000); // easing follows the clock, so late frames still land
    then = now;
    if (!visible) return;

    if (intro !== null) {
      const t = clamp((now - intro) / 3600);
      target = DEPTH * smooth(t) ** 0.8;
      focus.value = target;
      if (t === 1) {
        intro = null;
        fire();
      }
    }
    if (Math.abs(target - shown) > 1e-3) {
      shown = reduceMotion.matches ? target : shown + (target - shown) * (1 - Math.exp(-lag * 12));
      dirty = true;
    } else if (shown !== target) {
      shown = target;
      dirty = true;
    }

    if (firedAt !== null) {
      let ms = ((now - firedAt) / 1000) * SLOW;
      if (reduceMotion.matches) ms = now - firedAt < 1400 ? T_SOMA + 1.1 : END + 1; // one still frame, then rest
      if (ms > END) {
        firedAt = null;
        view.time = -999;
        chart(END);
        root.classList.remove('is-firing');
      } else {
        view.time = ms;
        chart(reduceMotion.matches ? END : ms);
      }
      dirty = true;
    }

    if (dyedAt !== null) {
      const t = reduceMotion.matches ? 1 : clamp((now - dyedAt) / 600);
      view.inks = dyeFrom.map((v, i) => v + (dyeTo[i] - v) * smooth(t));
      if (t === 1) dyedAt = null;
      dirty = true;
    }

    const want = hovered || chosen;
    if (want) lit = want;
    const aim = want && labeled ? 1 : 0;
    if (Math.abs(aim - glow) > 0.01) {
      glow = reduceMotion.matches ? aim : glow + (aim - glow) * (1 - Math.exp(-lag * 10));
      dirty = true;
    }
    view.hot = lit && glow > 0.01 ? { range: lit.part.range, mask: lit.part.mask, amount: glow } : null;

    const idle = now - lastUser > 2600;
    if (!reduceMotion.matches && idle) {
      view.spin = (view.spin || 0) + dt * 0.16;
      view.tilt = (view.tilt || 0) * Math.exp(-dt * 0.8);
      dirty = true;
    }
    if (!dirty) return;
    dirty = false;

    // If frames are arriving late on a visible page, draw fewer pixels rather than fewer splats.
    if (document.visibilityState === 'visible' && gap < 200) {
      slow = gap > 30 ? slow + 1 : Math.max(0, slow - 1);
      if (slow > 24 && dpr > 1) {
        dpr = Math.max(1, dpr - 0.5);
        slow = 0;
      }
    }

    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    view.level = shown;
    view.dpr = dpr;
    view.portrait = canvas.clientHeight > canvas.clientWidth * 1.05;
    readout();
    const shot = stage.draw(cell, view, w, h);
    if (!shot) return;

    const showPins = labeled && shown > DEPTH - 2.5;
    pinsEl.classList.toggle('is-shown', showPins);
    pinsEl.classList.toggle('pins--tall', view.portrait);
    if (showPins) {
      for (const pin of pins) {
        const [x, y] = pinned(shot, pin.part.at, w, h, dpr);
        pin.li.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      }
    }
  }

  const userTook = () => {
    intro = null;
  };
  focus.addEventListener('input', () => {
    userTook();
    target = Number(focus.value);
    dirty = true;
  });
  focus.addEventListener('pointerdown', userTook);
  $('#fire').addEventListener('click', () => {
    userTook();
    fire();
  });

  // On the cell itself: a tap fires it, a drag turns it.
  let grab = null;
  canvas.addEventListener('pointerdown', (e) => {
    grab = { x: e.clientX, y: e.clientY, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!grab) return;
    const dx = e.clientX - grab.x;
    const dy = e.clientY - grab.y;
    if (!grab.moved && Math.hypot(dx, dy) < 6) return;
    grab.moved = true;
    grab.x = e.clientX;
    grab.y = e.clientY;
    lastUser = performance.now();
    if (view.portrait) view.spin = (view.spin || 0) + dx * 0.012;
    else {
      view.spin = (view.spin || 0) - dy * 0.012;
      view.tilt = clamp((view.tilt || 0) + dx * 0.006, -0.9, 0.9);
    }
    dirty = true;
  });
  canvas.addEventListener('pointerup', () => {
    if (grab && !grab.moved) {
      userTook();
      fire();
    }
    grab = null;
  });
  canvas.addEventListener('pointercancel', () => {
    grab = null;
  });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    then = performance.now();
    dirty = true;
  }).observe(canvas);
  new ResizeObserver(() => {
    dirty = true;
  }).observe(canvas);
  reduceMotion.addEventListener('change', () => {
    dirty = true;
  });

  focus.max = DEPTH;
  if (reduceMotion.matches) {
    target = DEPTH;
    shown = DEPTH;
    focus.value = DEPTH;
  } else {
    target = 0;
    shown = 0;
    focus.value = 0;
    intro = performance.now() + 300;
  }
  requestAnimationFrame(frame);
}

/* ---------- how to read the slide: four figures you can work ---------- */

// Fig. 1. One splat: three spreads, turned, and the shadow it casts.
function figSplat() {
  const fig = $('#fig-splat');
  const canvas = $('canvas', fig);
  const ring = $('.fig__ring', fig);
  const svg = $('svg', fig);
  const cells = $$('[data-cell]', fig);
  const sliders = $$('input', fig);
  const view = { half: [1.15, 1.15], fit: 1, density: 1.7, spin: 0.7, tilt: 0.45 };
  const spreads = () => sliders.map((s) => Number(s.value));
  const one = () => {
    const [a, b, c] = spreads();
    return stack([{ m: [0, 0, 0], S: [a * a, b * b, c * c, 0, 0, 0], w: 1, k: BODY, delay: 0, gain: 0 }], view.half);
  };
  const plate = new Plate(canvas, one(), view);
  let seen = false;
  let running = false;
  let then = 0;
  let held = 0;

  function paint() {
    const shot = plate.paint();
    if (!shot) return;
    const { R, scale, w, h, dpr } = shot;
    const s = spreads().map((v) => v * v);
    const a = R[0] * R[0] * s[0] + R[1] * R[1] * s[1] + R[2] * R[2] * s[2];
    const b = R[0] * R[3] * s[0] + R[1] * R[4] * s[1] + R[2] * R[5] * s[2];
    const c = R[3] * R[3] * s[0] + R[4] * R[4] * s[1] + R[5] * R[5] * s[2];
    svg.setAttribute('viewBox', `0 0 ${w / dpr} ${h / dpr}`);
    outline(ring, w / dpr / 2, h / dpr / 2, a, -b, c, scale / dpr);
    [a, b, b, c].forEach((v, i) => {
      cells[i].textContent = (Math.abs(v) < 0.0005 ? 0 : v).toFixed(3);
    });
  }
  function turn(now) {
    if (!seen || reduceMotion.matches) {
      running = false;
      return;
    }
    const dt = Math.min(0.05, (now - then) / 1000);
    then = now;
    if (now - held > 1800) {
      view.spin += dt * 0.5;
      view.tilt = 0.5 * Math.sin(now / 2600);
    }
    paint();
    requestAnimationFrame(turn);
  }
  const wake = () => {
    paint();
    if (running || reduceMotion.matches || !seen) return;
    running = true;
    then = performance.now();
    requestAnimationFrame(turn);
  };
  sliders.forEach((s) => s.addEventListener('input', () => {
    plate.load(one());
    paint();
  }));
  let grab = null;
  canvas.addEventListener('pointerdown', (e) => {
    grab = [e.clientX, e.clientY];
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!grab) return;
    view.spin -= (e.clientY - grab[1]) * 0.012;
    view.tilt = clamp(view.tilt + (e.clientX - grab[0]) * 0.012, -1.4, 1.4);
    grab = [e.clientX, e.clientY];
    held = performance.now();
    paint();
  });
  const drop = () => {
    grab = null;
  };
  canvas.addEventListener('pointerup', drop);
  canvas.addEventListener('pointercancel', drop);
  whenSeen(fig, (on) => {
    seen = on;
    if (on) wake();
  }, 0.2);
  new ResizeObserver(paint).observe(canvas);
}

// Fig. 2. Two splats and the one that replaces them. Drag either; weigh one against the other.
function figMerge() {
  const fig = $('#fig-merge');
  const canvas = $('canvas', fig);
  const svg = $('svg', fig);
  const rings = { a: $('.fig__a', fig), b: $('.fig__b', fig), m: $('.fig__ring', fig), x: $('.fig__cross', fig) };
  const share = $('[name="share"]', fig);
  const level = $('[name="level"]', fig);
  const says = $$('[data-say]', fig);
  const view = { half: [1.7, 1.06], fit: 1, density: 0.95, level: 1 };
  const A = { m: [-0.72, 0.16, 0], S: needle([0.86, 0.5, 0], 0.4, 0.15), w: 0.5, k: BODY, delay: 0, gain: 0 };
  const B = { m: [0.7, -0.2, 0], S: ball(0.23), w: 0.5, k: SHEATH, delay: 0, gain: 0 };
  let pair = stack([A, B], view.half);
  const plate = new Plate(canvas, pair, view);
  let frame = null;

  function paint() {
    A.w = Number(share.value);
    B.w = 1 - A.w;
    pair = stack([A, B], view.half);
    plate.load(pair);
    view.level = Number(level.value);
    const shot = plate.paint();
    if (!shot) return;
    const { scale, w, h, dpr } = shot;
    frame = { scale: scale / dpr, w: w / dpr, h: h / dpr };
    const at = (m) => [frame.w / 2 + m[0] * frame.scale, frame.h / 2 - m[1] * frame.scale];
    svg.setAttribute('viewBox', `0 0 ${frame.w} ${frame.h}`);
    const M = pair.nodes[1];
    for (const [el, s] of [[rings.a, A], [rings.b, B], [rings.m, M]]) outline(el, ...at(s.m), s.S[0], -s.S[3], s.S[1], frame.scale);
    const [mx, my] = at(M.m);
    rings.x.setAttribute('d', `M${mx - 7} ${my}h14M${mx} ${my - 7}v14`);
    says[0].textContent = `${A.w.toFixed(2)} + ${B.w.toFixed(2)} = ${(A.w + B.w).toFixed(2)}`;
    says[1].textContent = `(${M.m[0].toFixed(2)}, ${M.m[1].toFixed(2)})`;
    says[2].textContent = `${Math.sqrt(M.S[0]).toFixed(2)} by ${Math.sqrt(M.S[1]).toFixed(2)}`;
  }
  share.addEventListener('input', paint);
  level.addEventListener('input', paint);

  let held = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (!frame) return;
    const box = canvas.getBoundingClientRect();
    const x = (e.clientX - box.left - frame.w / 2) / frame.scale;
    const y = -(e.clientY - box.top - frame.h / 2) / frame.scale;
    const near = [A, B].map((s) => Math.hypot(s.m[0] - x, s.m[1] - y));
    held = near[0] < near[1] ? A : B;
    if (Math.min(...near) > 0.6) held = null;
    if (held) canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!held) return;
    const box = canvas.getBoundingClientRect();
    held.m[0] = clamp((e.clientX - box.left - frame.w / 2) / frame.scale, -1.4, 1.4);
    held.m[1] = clamp(-(e.clientY - box.top - frame.h / 2) / frame.scale, -0.8, 0.8);
    paint();
  });
  const drop = () => {
    held = null;
  };
  canvas.addEventListener('pointerup', drop);
  canvas.addEventListener('pointercancel', drop);
  whenSeen(fig, (on) => on && paint(), 0.1);
  new ResizeObserver(paint).observe(canvas);
}

// Fig. 3. Three dyes, drawn in an order you can shuffle: absorbed on the left, painted over
// one another on the right.
function figLight() {
  const fig = $('#fig-light');
  const [left, right] = $$('canvas', fig);
  const says = $('[data-say]', fig);
  const dyes = [
    { name: 'cyan', at: [-0.33, -0.22], rgb: [0, 174, 239], ink: stain(0.02, 0.7, 0.95) },
    { name: 'magenta', at: [0.33, -0.22], rgb: [236, 0, 140], ink: stain(0.92, 0.03, 0.55) },
    { name: 'yellow', at: [0, 0.34], rgb: [255, 222, 0], ink: stain(1, 0.87, 0.02) },
  ];
  const SIGMA = 0.3;
  const view = { half: [1.25, 1.0], fit: 1, density: 1.3, inks: [...dyes.flatMap((d) => d.ink), 0, 0, 0] };
  let order = [0, 1, 2];
  const spec = () => stack([
    ...order.map((i) => ({ m: [...dyes[i].at, 0], S: ball(SIGMA), w: 1 / 3, k: [0, 1, 2].map((c) => (c === i ? 1 : 0)).concat(0), delay: 0, gain: 0 })),
    { m: [0, 0, 0], S: ball(SIGMA), w: 1e-7, k: [0, 0, 0, 1], delay: 0, gain: 0 },
  ], view.half);
  const plate = new Plate(left, spec(), view);
  const ctx = right.getContext('2d');

  function paint() {
    plate.load(spec());
    const shot = plate.paint();
    if (!shot) return;
    const { w, h, scale } = shot;
    right.width = w;
    right.height = h;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    for (const i of order) {
      const d = dyes[i];
      const x = w / 2 + d.at[0] * scale;
      const y = h / 2 - d.at[1] * scale;
      const far = SIGMA * scale * 3;
      const g = ctx.createRadialGradient(x, y, 0, x, y, far);
      for (let s = 0; s <= 12; s += 1) g.addColorStop(s / 12, `rgba(${d.rgb.join(',')},${(0.94 * Math.exp(-0.5 * ((s / 12) * 3) ** 2)).toFixed(3)})`);
      ctx.fillStyle = g;
      ctx.fillRect(x - far, y - far, 2 * far, 2 * far);
    }
    says.textContent = `${order.map((i) => dyes[i].name).join(', then ')}.`;
  }
  $('button', fig).addEventListener('click', () => {
    const before = order.join();
    while (order.join() === before) order = order.map((v) => [Math.random(), v]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
    paint();
  });
  whenSeen(fig, (on) => on && paint(), 0.1);
  new ResizeObserver(paint).observe(left);
}

// Fig. 4. All or none: choose the size of the push and see what the membrane does with it.
function figSpike() {
  const fig = $('#fig-spike');
  const slider = $('input', fig);
  const pen = $('.fig__pen', fig);
  const ghosts = $('.fig__ghosts', fig);
  const mark = $('.fig__least', fig);
  const says = $$('[data-say]', fig);
  const X = (ms) => 40 + (ms / WAVE_MS) * 420;
  const Y = (mv) => 150 - ((mv + 90) / 150) * 138;
  const path = (trace) => trace.map((v, i) => `${i ? 'L' : 'M'}${X(i * 0.1).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
  const least = threshold();
  let d = '';
  for (let current = 1; current <= 20; current += 1) d += path(hodgkinHuxley({ current }).trace);
  ghosts.setAttribute('d', d);
  mark.style.left = `${(least / 20) * 100}%`;
  says[2].textContent = least.toFixed(1);
  const draw = () => {
    const current = Number(slider.value);
    const run = hodgkinHuxley({ current });
    pen.setAttribute('d', path(run.trace));
    const fired = run.peak > 0;
    fig.classList.toggle('is-fired', fired);
    says[0].textContent = current.toFixed(1);
    says[1].textContent = `${run.peak < 0 ? '−' : '+'}${Math.abs(run.peak).toFixed(0)} mV: ${fired ? 'a spike' : current === 0 ? 'nothing' : 'a shrug'}`;
    slider.setAttribute('aria-valuetext', `${current.toFixed(1)} microamps per square centimeter, ${fired ? 'a spike' : 'no spike'}`);
  };
  slider.addEventListener('input', draw);
  draw();
}

/* ---------- the cabinet: one small specimen per project ---------- */

// Each emblem is drawn with the 2D canvas, then sampled into splats. Blue strokes take the
// sheath stain. The second function says when each part lights up, 0 to 1.
const EMBLEMS = {
  reword: [(g) => {
    g.lineWidth = 7;
    g.strokeRect(46, 50, 150, 200);
    for (let i = 0; i < 6; i += 1) g.fillRect(66, 78 + i * 28, [110, 92, 104, 70, 108, 84][i], 8);
    g.fillRect(212, 146, 34, 8);
    g.beginPath();
    g.moveTo(242, 132);
    g.lineTo(266, 150);
    g.lineTo(242, 168);
    g.fill();
    g.strokeStyle = '#00f';
    g.fillStyle = '#00f';
    g.strokeRect(284, 50, 150, 200);
    for (let i = 0; i < 6; i += 1) g.fillRect(304, 78 + i * 28, [96, 110, 78, 108, 88, 100][i], 8);
  }, (x, y) => x * 0.8 + y * 0.2],
  resmon: [(g) => {
    g.lineWidth = 9;
    g.strokeStyle = '#00f';
    for (const r of [44, 84, 124]) {
      g.beginPath();
      g.arc(240, 150, r, 0, Math.PI * 2);
      g.stroke();
    }
    g.beginPath();
    g.arc(240, 150, 12, 0, Math.PI * 2);
    g.fill();
    g.fillRect(240, 146, 128, 9);
    for (const [x, y] of [[300, 96], [176, 188], [286, 220], [196, 70]]) {
      g.beginPath();
      g.arc(x, y, 11, 0, Math.PI * 2);
      g.fill();
    }
  }, (x, y) => Math.hypot(x - 0.5, (y - 0.5) * 0.625) * 2],
  meteor: [(g) => {
    g.lineWidth = 15;
    g.lineCap = 'round';
    const link = (x, y) => {
      g.beginPath();
      g.roundRect(x, y, 150, 74, 37);
      g.stroke();
    };
    g.translate(240, 150);
    g.rotate(-0.42);
    g.translate(-240, -150);
    link(196, 124);
    g.strokeStyle = '#00f';
    link(92, 124);
    g.lineWidth = 8;
    for (const [y, far] of [[112, 150], [150, 190], [188, 150]]) {
      g.beginPath();
      g.moveTo(70, y + 11);
      g.lineTo(70 - far * 0.5, y + 11);
      g.stroke();
    }
  }, (x, y) => x * 0.85 + (1 - y) * 0.15],
  openlist: [(g) => {
    g.font = 'italic 500 190px Newsreader, Georgia, serif';
    g.textAlign = 'center';
    g.fillText('Aa', 196, 205);
    g.fillStyle = '#00f';
    for (let i = 0; i < 6; i += 1) g.fillRect(338, 78 + i * 26, [110, 84, 122, 66, 98, 76][i], 9);
  }, (x, y) => x * 0.6 + y * 0.3],
  ars: [(g) => {
    g.font = '600 76px Newsreader, Georgia, serif';
    g.textAlign = 'center';
    g.fillText('ARS MAGNA', 240, 132);
    g.fillStyle = '#00f';
    g.font = 'italic 500 62px Newsreader, Georgia, serif';
    g.fillText('anagrams', 240, 218);
  }, (x, y) => (y < 0.5 ? x * 0.5 : 0.5 + (1 - x) * 0.5)],
  aqrobat: [(g) => {
    const cell = 18;
    const x0 = 240 - cell * 6.5;
    const y0 = 150 - cell * 6.5;
    const eye = (cx, cy) => {
      g.fillStyle = '#000';
      g.fillRect(x0 + cx * cell, y0 + cy * cell, cell * 5, cell * 5);
      g.clearRect(x0 + (cx + 1) * cell, y0 + (cy + 1) * cell, cell * 3, cell * 3);
      g.fillRect(x0 + (cx + 1.6) * cell, y0 + (cy + 1.6) * cell, cell * 1.8, cell * 1.8);
    };
    const r = rng(41);
    for (let j = 0; j < 13; j += 1) {
      for (let i = 0; i < 13; i += 1) {
        const corner = (i < 6 && j < 6) || (i > 6 && j < 6) || (i < 6 && j > 6);
        if (corner || r() < 0.52) continue;
        g.fillStyle = r() < 0.5 ? '#00f' : '#000';
        g.beginPath();
        g.arc(x0 + (i + 0.5) * cell, y0 + (j + 0.5) * cell, cell * 0.42, 0, Math.PI * 2);
        g.fill();
      }
    }
    eye(0, 0);
    eye(8, 0);
    eye(0, 8);
  }, (x, y) => (x + y) / 2],
  amordle: [(g) => {
    g.lineWidth = 7;
    g.font = '600 46px Newsreader, Georgia, serif';
    g.textAlign = 'center';
    [...'AMORDLE'].forEach((ch, i) => {
      const x = 15 + i * 65;
      g.strokeStyle = i < 3 ? '#00f' : '#000';
      g.strokeRect(x, 118, 56, 64);
      g.fillText(ch, x + 28, 167);
    });
  }, (x) => x],
};

// The grooph graph: builder, critic, the arc back, and the way out to a person. Its second
// function is a timetable: the loop is 0 to 4.8, the way out is 6 to 7.6.
const GROOPH = [(g) => {
  g.lineWidth = 8;
  g.font = '600 25px Newsreader, Georgia, serif';
  g.textAlign = 'center';
  [['Builder', 20], ['Critic', 180], ['You', 340]].forEach(([name, x], i) => {
    g.strokeStyle = i === 2 ? '#00f' : '#000';
    g.fillStyle = i === 2 ? '#00f' : '#000';
    g.beginPath();
    g.roundRect(x, 152, 120, 66, 14);
    g.stroke();
    g.fillText(name, x + 60, 194);
  });
  g.fillStyle = '#000';
  for (const x of [144, 304]) {
    g.fillRect(x, 181, 22, 8);
    g.beginPath();
    g.moveTo(x + 20, 172);
    g.lineTo(x + 34, 185);
    g.lineTo(x + 20, 198);
    g.fill();
  }
  g.strokeStyle = '#00f';
  g.fillStyle = '#00f';
  g.beginPath();
  g.moveTo(240, 146);
  g.bezierCurveTo(240, 44, 82, 44, 82, 128);
  g.stroke();
  g.beginPath();
  g.moveTo(66, 124);
  g.lineTo(98, 124);
  g.lineTo(82, 148);
  g.fill();
}, (x, y) => {
  if (y < 0.49) return 3.2 + clamp((0.5 - x) / 0.33) * 1.6;
  if (x < 0.296) return x / 0.296;
  if (x < 0.372) return 1 + ((x - 0.296) / 0.076) * 0.4;
  if (x < 0.628) return 1.4 + ((x - 0.372) / 0.256) * 1.2;
  if (x < 0.705) return 6 + ((x - 0.628) / 0.077) * 0.4;
  return 6.4 + ((x - 0.705) / 0.26) * 1.2;
}];

function emblem([draw, when], seed, count, stretch) {
  const W = 480, H = 300;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000';
  g.strokeStyle = '#000';
  draw(g);
  const px = g.getImageData(0, 0, W, H).data;
  const inked = [];
  for (let i = 0; i < W * H; i += 1) if (px[i * 4 + 3] > 110) inked.push(i);
  const r = rng(seed);
  const sigma = clamp(0.8 * Math.sqrt(inked.length / count), 1.1, 6) / 150;
  const leaves = [];
  for (let k = 0; k < count; k += 1) {
    const i = inked[Math.floor(r() * inked.length)];
    const x = (i % W) + r();
    const y = Math.floor(i / W) + r();
    leaves.push({
      m: [(x - W / 2) / 150, -(y - H / 2) / 150, (r() - 0.5) * 0.08],
      S: [sigma * sigma, sigma * sigma, sigma * sigma * 0.5, 0, 0, 0],
      w: 1,
      k: px[i * 4 + 2] > 128 ? SHEATH : BODY,
      delay: when(x / W, y / H) * stretch,
      gain: 1,
    });
  }
  return prepare(normalize(leaves).leaves);
}

function cabinet() {
  $$('[data-emblem]').forEach((canvas, n) => {
    const card = canvas.closest('.card');
    let plate = null;
    let run = null;
    const play = (from) => {
      if (!plate) return;
      const top = plate.it.depth;
      cancelAnimationFrame(run);
      if (reduceMotion.matches) {
        plate.view.level = top;
        plate.view.time = -999;
        plate.paint();
        return;
      }
      const t0 = performance.now();
      const step = (now) => {
        const t = (now - t0) / 1000;
        plate.view.level = from + (top - from) * smooth(clamp(t / 1.4));
        plate.view.time = (t - 0.5) * 6;
        plate.paint();
        if (t < 2.2) run = requestAnimationFrame(step);
        else {
          plate.view.time = -999;
          plate.paint();
        }
      };
      run = requestAnimationFrame(step);
    };
    // Each emblem is sampled the first time it is reached, not at page load.
    whenSeen(canvas, (on) => {
      if (!on || plate) return;
      plate = new Plate(canvas, emblem(EMBLEMS[canvas.dataset.emblem], 7 + n, 4096, 6), { fit: 0.84, density: 0.9 });
      play(0);
    }, 0.25);
    card.addEventListener('pointerenter', () => play(8));
    canvas.addEventListener('click', () => play(0));
    new ResizeObserver(() => plate && plate.paint()).observe(canvas);
  });
}

// grooph's graph runs its loop: around once because the bar was not met, then out to a person.
function groophRun() {
  const canvas = $('#grooph-run');
  const says = $('#grooph-says');
  // [from, to, what is happening], in the timetable's units; the pulse peaks 0.9 after a delay.
  const SCRIPT = [
    [0.2, 1.9, 'The builder builds.'],
    [1.9, 3.5, 'The critic checks the bar.'],
    [3.5, 5.9, 'Bar not met: go again.'],
    [0.5, 1.9, 'The builder builds again.'],
    [1.9, 3.5, 'The critic checks the bar.'],
    [6.4, 7.2, 'Bar passed.'],
    [7.2, 8.6, 'The loop stops here. A person decides.'],
    [8.6, 11.5, 'The loop stops here. A person decides.'],
  ];
  let plate = null;
  let seen = false;
  let running = false;
  let step = 0;
  let at = 0;
  let then = 0;
  let focus = 0;
  const tick = (now) => {
    if (!seen || reduceMotion.matches) {
      running = false;
      return;
    }
    const dt = Math.min(0.05, (now - then) / 1000);
    then = now;
    focus = Math.min(plate.it.depth, focus + dt * 9);
    at += dt * 1.5;
    if (at > SCRIPT[step][1]) {
      step = (step + 1) % SCRIPT.length;
      at = SCRIPT[step][0];
      says.textContent = SCRIPT[step][2];
    }
    plate.view.level = focus;
    plate.view.time = at;
    plate.paint();
    requestAnimationFrame(tick);
  };
  const still = () => {
    plate.view.level = plate.it.depth;
    plate.view.time = -999;
    plate.paint();
  };
  whenSeen(canvas, (on) => {
    seen = on;
    if (!on) return;
    if (!plate) plate = new Plate(canvas, emblem(GROOPH, 3, 8192, 1), { fit: 0.9, density: 0.9 });
    if (reduceMotion.matches) {
      still();
      return;
    }
    if (running) return;
    running = true;
    then = performance.now();
    at = SCRIPT[step][0];
    says.textContent = SCRIPT[step][2];
    requestAnimationFrame(tick);
  }, 0.25);
  new ResizeObserver(() => plate && !running && still()).observe(canvas);
}

/* ---------- the collection: real Splashery toys, loaded only when asked for ---------- */

function collection() {
  const bench = $('#bench');
  const note = $('#bench-note');
  const effects = $('#bench-fx');
  const picks = $$('[data-toy]');
  let toy = null;
  const show = () => {
    let frame = $('iframe', bench);
    if (!frame) {
      frame = document.createElement('iframe');
      frame.style.colorScheme = 'light';
      bench.append(frame);
      bench.classList.add('is-live');
      effects.hidden = false;
    }
    const effect = $('input:checked', effects).value;
    frame.title = `Splashery: ${toy.name}`;
    frame.src = `https://ryanjosephkamp.github.io/splashery/embed/?toy=${toy.id}&theme=light&bg=transparent${effect ? `&autoplay=${effect}` : ''}`;
  };
  picks.forEach((a) => {
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      toy = { id: a.dataset.toy, name: $('b', a).textContent };
      show();
      picks.forEach((p) => p.toggleAttribute('aria-current', p === a));
      note.textContent = `On the bench: ${toy.name}. ${a.dataset.note}`;
    });
  });
  effects.addEventListener('change', () => toy && show());
}

// Everything small shares one hidden stage. Without WebGL2 the plates are simply left out.
function plates() {
  try {
    backstage = new Stage(document.createElement('canvas'), false);
    backstage.setWave(pulse);
  } catch (err) {
    document.documentElement.classList.add('no-plates');
    return;
  }
  figSplat();
  figMerge();
  figLight();
  groophRun();
  cabinet();
}

hero();
collection();
figSpike();
const faces = ['italic 500 60px Newsreader', '600 60px Newsreader'];
(document.fonts ? Promise.all(faces.map((f) => document.fonts.load(f))) : Promise.resolve()).then(plates, plates);
