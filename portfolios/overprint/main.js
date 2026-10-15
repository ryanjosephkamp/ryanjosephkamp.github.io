// Overprint: Ryan Kamp's portfolio as a two-ink print that is still moving.
// One cloud of Gaussian splats, re-formed by recipe. No dependencies.

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const TAU = Math.PI * 2;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// Paper and the two inks, as the shaders want them. Keep in step with styles.css.
const PAPER = [0.957, 0.941, 0.902];
const TEAL = [0.059, 0.498, 0.525];
const HOT = [1.0, 0.353, 0.212];

// A small seeded generator (mulberry32), so a recipe prints the same form every time.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Recipes ---------- */

// Every recipe returns n splats: a center, the stroke it is laid along, and
// which of the two inks it takes (0 teal, 1 orange). It also says how wide
// its splats are and how much ink each lays down, since that depends on how
// much ground it has to cover with the splats it was given.
const blank = (n) => ({ pos: new Float32Array(n * 3), tan: new Float32Array(n * 3), ink: new Float32Array(n), aspect: 1 });

// Where the splats go. Random numbers leave clumps and holes, and those read
// as grain, so positions come from low-discrepancy sequences instead: the
// golden ratio along a line, R2 over a plane, R3 through a volume. Any first
// part of such a sequence is as even as the whole of it, which is what lets a
// slow machine draw half the splats and still show the whole form. All that
// is left to the random numbers is a stroke's angle and a splat's depth.
const GOLD = 0.6180339887498949;
const R2 = [0.7548776662466927, 0.5698402909980532];
const R3 = [0.8191725133961645, 0.6710436067037893, 0.5497004779019703];
const frac = (v) => v - Math.floor(v);

// For a path that has to be worked out in order: a stride that visits every
// index once and drops each new one into the largest gap left so far.
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
function strideFor(n) {
  let stride = Math.max(1, Math.round(n * GOLD));
  while (gcd(stride, n) !== 1) stride += 1;
  return stride;
}

// Center the form and scale it to fit: a ball of radius 1, or, for a flat
// form, a half-width of 1. Strokes are cut to one length, unless the recipe
// has given each its own (`stroke` is then null).
function finish(out, stroke, flat = false) {
  const { pos, tan } = out;
  const n = out.ink.length;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 1) {
    const a = i % 3;
    if (pos[i] < lo[a]) lo[a] = pos[i];
    if (pos[i] > hi[a]) hi[a] = pos[i];
  }
  const mid = lo.map((v, a) => (v + hi[a]) / 2);
  let reach = 0;
  for (let i = 0; i < n; i += 1) {
    const x = pos[i * 3] - mid[0];
    const y = pos[i * 3 + 1] - mid[1];
    const z = pos[i * 3 + 2] - mid[2];
    reach = Math.max(reach, flat ? Math.abs(x) : Math.sqrt(x * x + y * y + z * z));
  }
  const k = 1 / (reach || 1);
  for (let i = 0; i < n; i += 1) {
    const len = Math.sqrt(tan[i * 3] ** 2 + tan[i * 3 + 1] ** 2 + tan[i * 3 + 2] ** 2) || 1;
    for (let a = 0; a < 3; a += 1) {
      pos[i * 3 + a] = (pos[i * 3 + a] - mid[a]) * k;
      tan[i * 3 + a] = stroke === null ? tan[i * 3 + a] * k : (tan[i * 3 + a] / len) * stroke;
    }
  }
  if (flat) out.aspect = (hi[0] - lo[0]) / Math.max(hi[1] - lo[1], 1e-6);
  return out;
}

// A word: draw it, then lay splats evenly over everything the ink reached.
// `slip` is how far off register the second plate lands; one big character
// wants less of it than a line of letters does.
function word(n, { text, slip = 1 }, rand) {
  const out = blank(n);
  const lines = String(text || '').toUpperCase().split('\n').filter((line) => line.trim());
  if (!lines.length) lines.push('?');
  const size = 220;
  const leading = size * 0.96;
  const font = `900 ${size}px Recursive, ui-sans-serif, system-ui, sans-serif`;
  const canvas = document.createElement('canvas');
  const pen = canvas.getContext('2d', { willReadFrequently: true });
  pen.font = font;
  const widest = Math.max(...lines.map((line) => pen.measureText(line).width), size * 0.5);
  canvas.width = Math.ceil(widest + size * 0.2);
  canvas.height = Math.ceil(lines.length * leading + size * 0.2);
  pen.font = font; // sizing a canvas clears its settings
  pen.textAlign = 'center';
  pen.textBaseline = 'middle';
  lines.forEach((line, i) => pen.fillText(line, canvas.width / 2, size * 0.1 + leading * (i + 0.5)));
  const w = canvas.width;
  const h = canvas.height;
  const { data } = pen.getImageData(0, 0, w, h);
  let inked = 0;
  let left = w;
  let right = 0;
  for (let p = 0; p < w * h; p += 1) {
    if (data[p * 4 + 3] > 127) {
      inked += 1;
      left = Math.min(left, p % w);
      right = Math.max(right, p % w);
    }
  }
  // How much ink is at a point, read between the pixels, so that an edge
  // comes out as fine as the splats and not as coarse as the drawing.
  const inkAt = (x, y) => {
    const x0 = clamp(Math.floor(x - 0.5), 0, w - 2);
    const y0 = clamp(Math.floor(y - 0.5), 0, h - 2);
    const fx = clamp(x - 0.5 - x0, 0, 1);
    const fy = clamp(y - 0.5 - y0, 0, 1);
    const p = (y0 * w + x0) * 4 + 3;
    return (data[p] * (1 - fx) + data[p + 4] * fx) * (1 - fy) + (data[p + w * 4] * (1 - fx) + data[p + w * 4 + 4] * fx) * fy;
  };
  // Each plate reads its own run of the R2 sequence and keeps the points that land on ink.
  const read = [0, 0];
  const next = (plate) => {
    for (let tries = 0; inked && tries < 5000; tries += 1) {
      read[plate] += 1;
      const x = frac(read[plate] * R2[0] + plate * 0.5) * w;
      const y = frac(read[plate] * R2[1] + plate * 0.5) * h;
      if (inkAt(x, y) > 127) return [x, y];
    }
    return [w / 2, h / 2];
  };
  for (let i = 0; i < n; i += 1) {
    const second = i % 7 === 0; // one splat in seven goes to the second plate, set off register
    const [x, y] = next(second ? 1 : 0);
    const hatch = 0.66 + (rand() - 0.5) * 0.5;
    out.pos[i * 3] = x + (second ? size * 0.055 * slip : 0);
    out.pos[i * 3 + 1] = -y - (second ? size * 0.045 * slip : 0);
    out.pos[i * 3 + 2] = (rand() - 0.5) * size * 0.14 + (second ? size * 0.12 * slip : 0);
    out.tan[i * 3] = Math.cos(hatch);
    out.tan[i * 3 + 1] = Math.sin(hatch);
    out.ink[i] = second ? 1 : 0;
  }
  // Splats are sized to the gap between them: the inked area, shared out among n.
  const gap = Math.sqrt(Math.max(inked, 1) / n) / Math.max((right - left) / 2, 1);
  out.width = gap * 0.5;
  out.gain = 0.2;
  return finish(out, gap * 2, true);
}

// The Lorenz system, integrated with fourth-order Runge-Kutta. Each splat is
// one step, laid along that step and a little longer than it, so the steps
// join into a line; the wing it is on picks its ink. The same stretch of time
// is drawn however many splats there are to draw it with.
function lorenz(n, { rho }) {
  const out = blank(n);
  const dt = 125 / n;
  const reach = dt * 1.2;
  const stride = strideFor(n);
  const B = 8 / 3;
  let x = 0.6;
  let y = 0.1;
  let z = 0.2;
  for (let step = 0; step < n; step += 1) {
    const ax = 10 * (y - x);
    const ay = x * (rho - z) - y;
    const az = x * y - B * z;
    let px = x + (ax * dt) / 2;
    let py = y + (ay * dt) / 2;
    let pz = z + (az * dt) / 2;
    const bx = 10 * (py - px);
    const by = px * (rho - pz) - py;
    const bz = px * py - B * pz;
    px = x + (bx * dt) / 2;
    py = y + (by * dt) / 2;
    pz = z + (bz * dt) / 2;
    const cx = 10 * (py - px);
    const cy = px * (rho - pz) - py;
    const cz = px * py - B * pz;
    px = x + cx * dt;
    py = y + cy * dt;
    pz = z + cz * dt;
    x += (dt / 6) * (ax + 2 * bx + 2 * cx + 10 * (py - px));
    y += (dt / 6) * (ay + 2 * by + 2 * cy + px * (rho - pz) - py);
    z += (dt / 6) * (az + 2 * bz + 2 * cz + px * py - B * pz);
    const i = ((step * stride) % n) * 3;
    out.pos[i] = x;
    out.pos[i + 1] = z;
    out.pos[i + 2] = -y;
    out.tan[i] = ax * reach;
    out.tan[i + 1] = az * reach;
    out.tan[i + 2] = -ay * reach;
    out.ink[i / 3] = x > 0 ? 1 : 0;
  }
  out.width = 0.0018;
  out.gain = 0.14; // one line alone prints light, and the wings build up from many
  return finish(out, null);
}

// A parametric surface drawn as threads: v is held at one of a few values
// while u runs around, so the strokes line up along the surface like
// hatching. Each thread is worked out at 512 points and read off in between.
// Along it the splats are a golden-ratio step apart, and each stroke is as
// long as the gap to its neighbor.
function threaded(n, threads, at, rand) {
  const out = blank(n);
  const steps = 512;
  const row = (steps + 1) * 3;
  const table = new Float32Array(threads * row);
  for (let thread = 0; thread < threads; thread += 1) {
    const v = (thread / threads) * TAU;
    for (let j = 0; j <= steps; j += 1) {
      const u = (j / steps) * TAU;
      const p = at(u, v);
      if (!p.every(Number.isFinite)) throw new Error(`not a number at u = ${u.toFixed(2)}, v = ${v.toFixed(2)}`);
      table.set(p, thread * row + j * 3);
    }
  }
  const starts = Array.from({ length: threads }, () => rand());
  const reach = (threads / n) * steps * 1.2;
  for (let i = 0; i < n; i += 1) {
    const thread = i % threads;
    const s = frac(Math.floor(i / threads) * GOLD + starts[thread]) * steps;
    const j = Math.min(Math.floor(s), steps - 1);
    const a = thread * row + j * 3;
    for (let k = 0; k < 3; k += 1) {
      const step = table[a + 3 + k] - table[a + k];
      out.pos[i * 3 + k] = table[a + k] + step * (s - j);
      out.tan[i * 3 + k] = step * reach;
    }
    out.ink[i] = thread % 4 === 0 ? 1 : 0;
  }
  out.width = 0.0018;
  out.gain = 0.3;
  return finish(out, null);
}

// Klein bottle, figure-eight immersion.
function klein(n, { threads }, rand) {
  return threaded(n, Math.round(threads), (u, v) => {
    const r = 2 + Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v);
    return [r * Math.cos(u), Math.sin(u / 2) * Math.sin(v) + Math.cos(u / 2) * Math.sin(2 * v), r * Math.sin(u)];
  }, rand);
}

// Whatever the visitor writes. u and v each run from 0 to 2π.
function yours(n, { x, y, z }, rand) {
  // The visitor's own typing, run in the visitor's own page; nothing is read from a URL.
  const fn = [x, y, z].map((src) => new Function('u', 'v', 'TAU', `with (Math) { return (${src}); }`));
  return threaded(n, 48, (u, v) => fn.map((f) => f(u, v, TAU)), rand);
}

// Gyroid: spread points evenly through a ball (R3), then walk each onto the
// surface with Newton steps along the gradient.
function gyroid(n, { cells }) {
  const out = blank(n);
  const half = cells * Math.PI;
  let i = 0;
  for (let k = 1; i < n && k < n * 40; k += 1) {
    let x = (frac(k * R3[0]) * 2 - 1) * half;
    let y = (frac(k * R3[1]) * 2 - 1) * half;
    let z = (frac(k * R3[2]) * 2 - 1) * half;
    if (x * x + y * y + z * z > half * half) continue;
    let f = 1;
    let gx = 0;
    let gy = 0;
    let gz = 0;
    // f = sin x cos y + sin y cos z + sin z cos x and its gradient, from one set of sines and cosines
    for (let step = 0; step < 6; step += 1) {
      const sx = Math.sin(x);
      const cx = Math.cos(x);
      const sy = Math.sin(y);
      const cy = Math.cos(y);
      const sz = Math.sin(z);
      const cz = Math.cos(z);
      f = sx * cy + sy * cz + sz * cx;
      gx = cx * cy - sz * sx;
      gy = cy * cz - sx * sy;
      gz = cz * cx - sy * sz;
      if (Math.abs(f) < 0.002) break;
      const s = f / (gx * gx + gy * gy + gz * gz + 1e-6);
      x -= gx * s;
      y -= gy * s;
      z -= gz * s;
    }
    if (x * x + y * y + z * z > half * half || Math.abs(f) >= 0.002) continue;
    // hatch across the vertical, along the surface
    const flat = gx * gx + gz * gz > 0.0025;
    out.pos[i * 3] = x;
    out.pos[i * 3 + 1] = y;
    out.pos[i * 3 + 2] = z;
    out.tan[i * 3] = flat ? -gz : 0;
    out.tan[i * 3 + 1] = flat ? 0 : gz;
    out.tan[i * 3 + 2] = flat ? gx : -gy;
    out.ink[i] = gx * x + gy * y + gz * z > 0 ? 0 : 1; // the two faces of the surface
    i += 1;
  }
  // A gyroid has about 0.49 of area to each unit of volume, which comes to
  // about 2.06 `half` once the ball is scaled to radius 1. Strokes are sized
  // to the gap that leaves between them, and kept thin: the surface is hatched, not filled.
  const gap = Math.sqrt((2.06 * half) / n);
  out.width = 0.0016;
  out.gain = 0.22;
  return finish(out, gap * 1.5);
}

// A loop graph: builder, critic, and the person who decides; one edge loops
// back. R2 deals the splats out: one coordinate picks the part of the graph,
// and where it falls within that part's share, with the other coordinate,
// places the splat on it.
function loop(n, _, rand) {
  const out = blank(n);
  const r = 0.36;
  for (let i = 0; i < n; i += 1) {
    const pick = frac((i + 1) * R2[0]);
    const along = frac((i + 1) * R2[1]);
    let x;
    let y;
    let tx;
    let ty;
    let ink = 0;
    if (pick < 0.5) { // the node where a person decides, printed solid
      const a = along * TAU;
      const d = r * Math.sqrt(pick / 0.5);
      x = 1.5 + Math.cos(a) * d;
      y = Math.sin(a) * d;
      tx = -Math.sin(a);
      ty = Math.cos(a);
      ink = 1;
    } else if (pick < 0.7) { // the builder and the critic, as rings
      const share = ((pick - 0.5) / 0.2) * 2;
      const a = along * TAU;
      const d = r * (1 + (frac(share) - 0.5) * 0.1);
      x = (share < 1 ? -1.5 : 0) + Math.cos(a) * d;
      y = Math.sin(a) * d;
      tx = -Math.sin(a);
      ty = Math.cos(a);
    } else if (pick < 0.8) { // builder to critic, critic to the person
      const share = ((pick - 0.7) / 0.1) * 2;
      x = (share < 1 ? -1.5 : 0) + r + 0.07 + (1.5 - 2 * r - 0.14) * along;
      y = (frac(share) - 0.5) * 0.03;
      tx = 1;
      ty = 0;
    } else { // from the critic, up and over, back to the builder
      const a = along * Math.PI;
      const lift = 1 + ((pick - 0.8) / 0.2 - 0.5) * 0.04;
      x = -0.75 + Math.cos(a) * 0.75 * lift;
      y = r + 0.1 + Math.sin(a) * 0.6 * lift;
      tx = -Math.sin(a) * 0.75;
      ty = Math.cos(a) * 0.6;
      ink = 1;
    }
    out.pos[i * 3] = x;
    out.pos[i * 3 + 1] = y;
    out.pos[i * 3 + 2] = (rand() - 0.5) * 0.08 + ink * 0.14;
    out.tan[i * 3] = tx;
    out.tan[i * 3 + 1] = ty;
    out.ink[i] = ink;
  }
  // sized to the solid node, the one part that is an area and not a line
  const gap = Math.sqrt((Math.PI * r * r) / (n * 0.5)) / (1.5 + r);
  out.width = gap * 0.5;
  out.gain = 0.16;
  return finish(out, gap * 2, true);
}

/* ---------- A QR code, for the aqrobat figure ---------- */

// Version 3 (29 by 29 modules), error correction M, byte mode. That holds 42
// bytes in a single block, so there is no interleaving to do.
const QR = { size: 29, data: 44, check: 26, align: 22 };

// Multiplication in GF(256), reduced by x^8 + x^4 + x^3 + x^2 + 1.
function gfMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

// The Reed-Solomon check words for `data`: the remainder after dividing by
// the polynomial whose roots are 1, 2, 4, ... (`degree` of them).
function checkWords(data, degree) {
  const gen = new Array(degree).fill(0);
  gen[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      gen[j] = gfMul(gen[j], root);
      if (j + 1 < degree) gen[j] ^= gen[j + 1];
    }
    root = gfMul(root, 2);
  }
  const rem = new Array(degree).fill(0);
  for (const word of data) {
    const factor = word ^ rem.shift();
    rem.push(0);
    gen.forEach((coef, i) => { rem[i] ^= gfMul(coef, factor); });
  }
  return rem;
}

// The code for `text`, as rows of modules: 1 is dark.
function qrMatrix(text) {
  const { size } = QR;
  const bytes = [...new TextEncoder().encode(text)];
  if (bytes.length > QR.data - 2) throw new Error(`this code holds ${QR.data - 2} bytes, and that is ${bytes.length}`);

  // the message: mode, length, the bytes, a terminator, then padding
  const bits = [];
  const put = (value, length) => {
    for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
  };
  put(4, 4);
  put(bytes.length, 8);
  bytes.forEach((b) => put(b, 8));
  put(0, Math.min(4, QR.data * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  for (let pad = 0xec; bits.length < QR.data * 8; pad ^= 0xec ^ 0x11) put(pad, 8);
  const words = [];
  for (let i = 0; i < bits.length; i += 8) words.push(bits.slice(i, i + 8).reduce((v, b) => (v << 1) | b, 0));
  const stream = [...words, ...checkWords(words, QR.check)];

  const dark = Array.from({ length: size }, () => new Array(size).fill(0));
  const fixed = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, on) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    dark[y][x] = on ? 1 : 0;
    fixed[y][x] = true;
  };
  // the timing rows, then the three finders with their light surround, then the alignment mark
  for (let i = 0; i < size; i += 1) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  [[3, 3], [size - 4, 3], [3, size - 4]].forEach(([cx, cy]) => {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const ring = Math.max(Math.abs(dx), Math.abs(dy));
        set(cx + dx, cy + dy, ring !== 2 && ring !== 4);
      }
    }
  });
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) set(QR.align + dx, QR.align + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  // The format: which mask was used, protected by a BCH code and written twice.
  // Level M is 00, so the five bits it carries are just the mask's number.
  const format = (mask) => {
    let rem = mask;
    for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const code = ((mask << 10) | rem) ^ 0x5412;
    const bit = (i) => ((code >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i += 1) set(8, i, bit(i));
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let i = 9; i < 15; i += 1) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i += 1) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i += 1) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  format(0); // to claim its modules before the message is laid in

  // the message zigzags up and down in columns two wide, from the bottom right
  let at = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // the timing column is passed over
    for (let step = 0; step < size; step += 1) {
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        const y = ((right + 1) & 2) === 0 ? size - 1 - step : step;
        if (!fixed[y][x] && at < stream.length * 8) {
          dark[y][x] = (stream[at >>> 3] >>> (7 - (at & 7))) & 1;
          at += 1;
        }
      }
    }
  }
  if (at !== stream.length * 8) throw new Error('the message did not fit the code');

  // Eight masks can be laid over the message. Each is tried and scored by
  // the standard's four penalties (long runs, solid blocks, finder
  // look-alikes, and an uneven share of dark), and the lowest score is kept.
  const masks = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const flip = (mask) => {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) if (!fixed[y][x] && masks[mask](x, y)) dark[y][x] ^= 1;
    }
  };
  const penalty = () => {
    let score = 0;
    const lines = [];
    for (let i = 0; i < size; i += 1) lines.push(dark[i].join(''), dark.map((row) => row[i]).join(''));
    for (const line of lines) {
      for (const run of line.match(/0{5,}|1{5,}/g) || []) score += run.length - 2;
      for (let i = 0; i + 11 <= size; i += 1) {
        const piece = line.slice(i, i + 11);
        if (piece === '10111010000' || piece === '00001011101') score += 40;
      }
    }
    let total = 0;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const m = dark[y][x];
        total += m;
        if (x + 1 < size && y + 1 < size && m === dark[y][x + 1] && m === dark[y + 1][x] && m === dark[y + 1][x + 1]) score += 3;
      }
    }
    return score + 10 * Math.floor(Math.abs((total * 100) / (size * size) - 50) / 5);
  };
  let best = 0;
  let least = Infinity;
  for (let mask = 0; mask < masks.length; mask += 1) {
    flip(mask);
    format(mask);
    const score = penalty();
    if (score < least) {
      least = score;
      best = mask;
    }
    flip(mask); // laying a mask on twice takes it off again
  }
  flip(best);
  format(best);
  return dark;
}

// A QR code: the modules of a real one, each dark module filled with splats.
// The hearts of the three finders and of the alignment mark are overprinted:
// they take both inks, which makes them the darkest thing in the figure.
//
// A reader needs dark modules that are evenly dark, with straight edges. So
// the splats are dealt out like cards, the same number to every dark module,
// and inside a module each lands in the largest gap the earlier ones left (the
// R2 sequence). Each is as wide as the gap to its neighbors, and they keep a
// little inside the module's edge: far enough that the ink ends about where
// the module does, near enough that two dark modules side by side print as one.
function qr(n, { text }, rand) {
  const out = blank(n);
  const grid = qrMatrix(text);
  const size = grid.length;
  const hearts = [[3, 3], [size - 4, 3], [3, size - 4]];
  const heart = (x, y) => (x === QR.align && y === QR.align) || hearts.some(([cx, cy]) => Math.max(Math.abs(x - cx), Math.abs(y - cy)) <= 1);
  const cells = []; // each dark module: x, y, where its own run of the sequence starts, and its ink
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) if (grid[y][x]) cells.push(x, y, rand(), rand(), heart(x, y) ? 0.5 : 0);
  }
  const dark = cells.length / 5;
  const sigma = 0.6 / Math.sqrt(n / dark); // a splat's radius, in modules
  const inset = sigma * 0.35;
  for (let i = 0; i < n; i += 1) {
    const c = (i % dark) * 5;
    const turn = Math.floor(i / dark) + 1;
    const hatch = 0.66 + (rand() - 0.5) * 0.5;
    out.pos[i * 3] = cells[c] + inset + frac(turn * R2[0] + cells[c + 2]) * (1 - 2 * inset);
    out.pos[i * 3 + 1] = -(cells[c + 1] + inset + frac(turn * R2[1] + cells[c + 3]) * (1 - 2 * inset));
    out.pos[i * 3 + 2] = (rand() - 0.5) * 0.4;
    out.tan[i * 3] = Math.cos(hatch);
    out.tan[i * 3 + 1] = Math.sin(hatch);
    out.ink[i] = cells[c + 4];
  }
  const module = 2 / size; // one module, once the code is two units wide
  out.width = sigma * module;
  out.gain = 0.85; // enough that a module prints flat, with no light specks for a reader to trip on
  return finish(out, sigma * module * 0.4, true);
}

// make: the recipe, which also sets its splats' width and ink. spin: turns
// freely; otherwise it faces the reader and sways by this many radians. fit:
// the share of its room a form takes, when it should not fill it. whole: this
// form has to be seen entire, so on a narrow screen it is never covered; the
// number is its half-extent with its margin, in half-widths (a QR code's
// quiet zone is four modules: 37 across where the code is 29).
const FORMS = {
  name: {
    label: 'name', make: word, seed: 3, sway: 0.16, params: { text: 'RYAN KAMP' },
    recipe: 'draw the word; lay splats evenly over the ink,\neach hatched near 38°;\none splat in seven goes to the second plate',
    controls: [{ key: 'text', type: 'text', label: 'word', max: 14 }],
    note: () => 'Type any word.',
  },
  lorenz: {
    label: 'lorenz', make: lorenz, seed: 5, spin: true, params: { rho: 28 },
    recipe: 'dx = 10 (y − x)\ndy = x (ρ − z) − y\ndz = x y − 8⁄3 z',
    controls: [{ key: 'rho', type: 'range', label: 'ρ', min: 16, max: 40, step: 0.1 }],
    // σ(σ + β + 3) / (σ − β − 1) with σ = 10, β = 8/3 is exactly 470/19
    note: ({ rho }) => (rho > 470 / 19
      ? `ρ = ${rho.toFixed(1)}. Past 470⁄19 ≈ 24.74 neither resting point is stable, and the path never settles.`
      : `ρ = ${rho.toFixed(1)}. Below 470⁄19 ≈ 24.74 both resting points are stable, and the path can spiral into one.`),
  },
  klein: {
    label: 'klein bottle', make: klein, seed: 8, spin: true, params: { threads: 48 },
    recipe: 'r = 2 + cos ½u sin v − sin ½u sin 2v\nx = r cos u,  z = r sin u\ny = sin ½u sin v + cos ½u sin 2v',
    controls: [{ key: 'threads', type: 'range', label: 'threads', min: 6, max: 96, step: 1 }],
    note: ({ threads }) => `${Math.round(threads)} threads laid along the surface. Every fourth is orange.`,
  },
  gyroid: {
    label: 'gyroid', make: gyroid, seed: 13, spin: true, params: { cells: 1.5 },
    recipe: 'sin x cos y + sin y cos z + sin z cos x = 0',
    controls: [{ key: 'cells', type: 'range', label: 'periods', min: 1, max: 3, step: 0.25 }],
    note: ({ cells }) => `A ball ${cells} periods across. The two inks are the two faces of the surface.`,
  },
  yours: {
    label: 'write your own', make: yours, seed: 21, spin: true,
    params: { x: 'cos(u) * (2 + cos(v))', y: 'sin(v) + sin(3 * u) / 2', z: 'sin(u) * (2 + cos(v))' },
    recipe: 'a surface: three expressions in u and v',
    controls: [
      { key: 'x', type: 'text', label: 'x', max: 90 },
      { key: 'y', type: 'text', label: 'y', max: 90 },
      { key: 'z', type: 'text', label: 'z', max: 90 },
    ],
    note: () => 'u and v each run from 0 to 2π. sin, cos, pow, abs, PI and the rest of Math all work.',
  },
  loop: { make: loop, seed: 55, sway: 0.24, params: {} },
  anagram: { make: word, seed: 89, sway: 0.16, params: { text: 'ANAGRAMS' } },
  qr: { make: qr, seed: 233, sway: 0, fit: 0.8, whole: 37 / 29, params: { text: 'https://ryanjosephkamp.github.io/aqrobat/' } },
  also: { make: word, seed: 144, sway: 0.2, fit: 0.86, params: { text: '&', slip: 0.35 } },
};
const SHELF = ['name', 'lorenz', 'klein', 'gyroid', 'yours'];

/* ---------- The press: WebGL2 ---------- */

// Pass one lays every splat onto two plates at once (red channel teal, green
// channel orange), adding as it goes. A splat is a Gaussian with a center, a
// long axis that follows its stroke through the turn and the perspective, and
// a short radius.
const SPLAT_VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec3 aPosA;
layout(location = 2) in vec3 aTanA;
layout(location = 3) in vec3 aPosB;
layout(location = 4) in vec3 aTanB;
layout(location = 5) in vec4 aMisc; // seed, ink before, ink after, size
uniform mat3 uTurn;
uniform float uMorph;
uniform float uTime;
uniform float uCalm;
uniform vec2 uView;    // canvas size, in device pixels
uniform vec2 uCenter;  // where the form sits, from the canvas center, y up
uniform float uScale;  // device pixels to one unit of the form
uniform float uWidth;  // a splat's short radius, in units
uniform float uSwell;  // above 1 when fewer splats are drawn than were made: each then covers more
uniform vec3 uPointer; // xy measured like uCenter; z is its reach
out vec2 vUv;
out float vInk;
out float vWeight;

const float CAM = 4.0;

vec2 project(vec3 p) {
  return p.xy * (CAM / (CAM - p.z)) * uScale;
}

void main() {
  float seed = aMisc.x;
  // splats leave in turn, so a change of form passes through the cloud
  float k = clamp(uMorph * 1.7 - seed * 0.7, 0.0, 1.0);
  k = k * k * (3.0 - 2.0 * k);
  vec3 p = mix(aPosA, aPosB, k);
  vec3 t = mix(aTanA, aTanB, k);
  float lively = 1.0 - uCalm;
  p += lively * sin(k * 3.14159265) * 0.32 * vec3(sin(seed * 41.0), cos(seed * 57.0), sin(seed * 91.0 + 1.0));
  p += lively * 0.0022 * vec3(sin(uTime * 0.9 + seed * 50.0), cos(uTime * 0.7 + seed * 80.0), sin(uTime * 0.8 + seed * 20.0));

  vec3 q = uTurn * p;
  vec2 c = project(q) + uCenter;
  vec2 major = (project(q + uTurn * t) + uCenter - c) * uSwell;
  float minor = max(uWidth * aMisc.w * uScale * uSwell * CAM / (CAM - q.z), 0.85);

  // the pointer parts the cloud
  vec2 away = c - uPointer.xy;
  float d = length(away);
  float reach = uPointer.z;
  c += (away / (d + 1.0)) * reach * 0.5 * exp(-(d * d) / (reach * reach * 0.45 + 1.0)) * (0.5 + fract(seed * 13.7));

  float len = length(major);
  vec2 dir = len > 0.001 ? major / len : vec2(1.0, 0.0);
  float along = sqrt(len * len + minor * minor);
  vec2 offset = (dir * aCorner.x * along + vec2(-dir.y, dir.x) * aCorner.y * minor) * 2.2;
  vUv = aCorner * 2.2;
  vInk = mix(aMisc.y, aMisc.z, k);
  vWeight = mix(0.55, 1.0, smoothstep(-1.2, 1.2, q.z));
  gl_Position = vec4((c + offset) / (uView * 0.5), 0.0, 1.0);
}`;

const SPLAT_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
in float vInk;
in float vWeight;
uniform float uGain;
out vec4 plate;
void main() {
  float a = max(exp(-0.5 * dot(vUv, vUv)) - 0.089, 0.0) * uGain * vWeight;
  plate = vec4(a * (1.0 - vInk), a * vInk, 0.0, 1.0);
}`;

// Pass two prints the plates onto the paper. Ink builds up and saturates,
// and where both inks land, one multiplies the other: an overprint.
const PRINT_VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const PRINT_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uPlates;
uniform vec2 uView;
uniform float uDpr;
uniform vec3 uPaper;
uniform vec3 uInkA;
uniform vec3 uInkB;
out vec4 color;

float grain(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 at = gl_FragCoord.xy;
  // the second plate never lands quite where the first did
  float a = texture(uPlates, at / uView).r;
  float b = texture(uPlates, (at + vec2(1.5, -1.1) * uDpr) / uView).g;
  vec2 cell = floor(at / uDpr);
  // ink never lies quite evenly, but the unevenness is slight
  float da = min((1.0 - exp(-a * 3.2)) * (0.95 + 0.07 * grain(cell)), 1.0);
  float db = min((1.0 - exp(-b * 3.2)) * (0.95 + 0.07 * grain(cell + 19.0)), 1.0);
  color = vec4(uPaper * mix(vec3(1.0), uInkA, da) * mix(vec3(1.0), uInkB, db), 1.0);
}`;

function program(gl, vertex, fragment) {
  const id = gl.createProgram();
  [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]].forEach(([type, src]) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    gl.attachShader(id, shader);
  });
  gl.linkProgram(id);
  if (!gl.getProgramParameter(id, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(id));
  const u = {};
  for (let i = 0; i < gl.getProgramParameter(id, gl.ACTIVE_UNIFORMS); i += 1) {
    const { name } = gl.getActiveUniform(id, i);
    u[name] = gl.getUniformLocation(id, name);
  }
  return { id, u };
}

class Cloud {
  constructor(canvas, count) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
    if (!gl) throw new Error('WebGL2 is not available');
    this.canvas = canvas;
    this.gl = gl;
    this.n = count;
    this.splats = program(gl, SPLAT_VERT, SPLAT_FRAG);
    this.press = program(gl, PRINT_VERT, PRINT_FRAG);

    // Where each splat is coming from and going to: center then stroke.
    this.from = new Float32Array(count * 6);
    this.to = new Float32Array(count * 6);
    this.misc = new Float32Array(count * 4);
    const rand = seeded(11);
    for (let i = 0; i < count; i += 1) {
      this.misc[i * 4] = rand();
      this.misc[i * 4 + 3] = 0.7 + rand() * 0.6;
    }
    this.morph = 1;
    this.seconds = 1;
    this.drawn = count; // how many of the splats are drawn; fewer on a machine that cannot keep up
    this.minDpr = 1.5; // a plain screen is drawn at one and a half times its size, which keeps hairlines fine
    this.maxDpr = 2;

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.fromBuf = this.perSplat([1, 2], 3, this.from);
    this.toBuf = this.perSplat([3, 4], 3, this.to);
    this.miscBuf = this.perSplat([5], 4, this.misc);
    gl.bindVertexArray(null);
    this.bare = gl.createVertexArray();

    this.plates = gl.createTexture();
    this.frame = gl.createFramebuffer();
    this.resize();
  }

  perSplat(locations, size, data) {
    const { gl } = this;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    locations.forEach((loc, j) => {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, locations.length * size * 4, j * size * 4);
      gl.vertexAttribDivisor(loc, 1);
    });
    return buffer;
  }

  resize() {
    const { gl, canvas } = this;
    this.dpr = clamp(devicePixelRatio || 1, this.minDpr, this.maxDpr);
    const w = Math.max(1, Math.round(canvas.clientWidth * this.dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * this.dpr));
    if (this.sized && canvas.width === w && canvas.height === h) return;
    this.sized = true;
    canvas.width = w;
    canvas.height = h;
    gl.bindTexture(gl.TEXTURE_2D, this.plates);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frame);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.plates, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // Re-form into `data`, each splat setting off from wherever it is now.
  show(data, seconds) {
    const { gl, n, from, to, misc } = this;
    const m = this.morph;
    if (m >= 1) {
      from.set(to);
      for (let i = 0; i < n; i += 1) misc[i * 4 + 1] = misc[i * 4 + 2];
    } else if (m > 0) {
      for (let i = 0; i < n; i += 1) {
        let k = clamp(m * 1.7 - misc[i * 4] * 0.7, 0, 1);
        k = k * k * (3 - 2 * k);
        for (let j = i * 6; j < i * 6 + 6; j += 1) from[j] += (to[j] - from[j]) * k;
        misc[i * 4 + 1] += (misc[i * 4 + 2] - misc[i * 4 + 1]) * k;
      }
    }
    for (let i = 0; i < n; i += 1) {
      for (let a = 0; a < 3; a += 1) {
        to[i * 6 + a] = data.pos[i * 3 + a];
        to[i * 6 + 3 + a] = data.tan[i * 3 + a];
      }
      misc[i * 4 + 2] = data.ink[i];
    }
    [[this.fromBuf, from], [this.toBuf, to], [this.miscBuf, misc]].forEach(([buffer, values]) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, values);
    });
    this.morph = 0;
    this.seconds = seconds;
  }

  draw({ time, dt, turn, center, scale, width, gain, pointer, calm }) {
    const { gl, canvas, dpr } = this;
    this.morph = calm ? 1 : Math.min(1, this.morph + dt / this.seconds);
    const w = canvas.width;
    const h = canvas.height;
    gl.viewport(0, 0, w, h);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frame);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    let p = this.splats;
    gl.useProgram(p.id);
    gl.uniformMatrix3fv(p.u.uTurn, false, turn);
    gl.uniform1f(p.u.uMorph, this.morph);
    gl.uniform1f(p.u.uTime, time);
    gl.uniform1f(p.u.uCalm, calm ? 1 : 0);
    gl.uniform2f(p.u.uView, w, h);
    gl.uniform2f(p.u.uCenter, center[0] * dpr, center[1] * dpr);
    gl.uniform1f(p.u.uScale, scale * dpr);
    gl.uniform1f(p.u.uWidth, width);
    gl.uniform1f(p.u.uSwell, Math.sqrt(this.n / this.drawn));
    gl.uniform3f(p.u.uPointer, pointer[0] * dpr, pointer[1] * dpr, pointer[2] * dpr);
    gl.uniform1f(p.u.uGain, gain);
    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.drawn);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.BLEND);
    p = this.press;
    gl.useProgram(p.id);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.plates);
    gl.uniform1i(p.u.uPlates, 0);
    gl.uniform2f(p.u.uView, w, h);
    gl.uniform1f(p.u.uDpr, dpr);
    gl.uniform3fv(p.u.uPaper, PAPER);
    gl.uniform3fv(p.u.uInkA, TEAL);
    gl.uniform3fv(p.u.uInkB, HOT);
    gl.bindVertexArray(this.bare);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

/* ---------- The page: which form, where, and who is turning it ---------- */

// Where the form sits for a section, in CSS pixels from the canvas center
// (y up), and the room it has.
function spot(at, w, h) {
  if (at === 'hero') return { cx: 0, cy: h * 0.11, room: [w * 0.9, h * 0.48] };
  if (at === 'center') return { cx: 0, cy: h * 0.2, room: [w * 0.84, h * 0.36] };
  if (w < 960) return { cx: 0, cy: h * 0.21, room: [w * 0.9, h * 0.46] };
  return { cx: (at === 'left' ? -1 : 1) * w * 0.24, cy: 0, room: [w * 0.46, h * 0.74] };
}

function start() {
  const canvas = document.getElementById('cloud');
  if (!canvas) return;
  // How many splats: 96,000, or 48,000 on a small screen or a modest machine,
  // or 24,000 on a weak one. A machine that still cannot keep up is given half
  // of those to draw, and then a quarter (see the loop).
  const cores = navigator.hardwareConcurrency || 8;
  const small = Math.min(innerWidth, innerHeight) < 700 || cores <= 4;
  const weak = (navigator.deviceMemory || 8) <= 2 || cores <= 2;
  const count = weak ? 24000 : small ? 48000 : 96000;
  let cloud;
  try {
    cloud = new Cloud(canvas, count);
  } catch (err) {
    console.info('Overprint: the cloud needs WebGL2, so the page is showing without it.', err.message);
    return;
  }
  document.documentElement.classList.add('gl');
  const counted = () => document.querySelectorAll('[data-count]').forEach((el) => { el.textContent = cloud.drawn.toLocaleString('en-US'); });
  counted();

  // On a narrow screen each word of a phrase takes its own line.
  const stacked = (text) => (canvas.clientWidth < 700 ? text.trim().split(/\s+/).join('\n') : text);
  const made = new Map();
  const build = (key, params) => {
    const form = FORMS[key];
    const settings = { ...form.params, ...params };
    if (typeof settings.text === 'string') settings.text = stacked(settings.text);
    const id = key + JSON.stringify(settings);
    if (!made.has(id)) {
      if (made.size > 14) made.delete(made.keys().next().value);
      made.set(id, form.make(count, settings, seeded(form.seed)));
    }
    return made.get(id);
  };

  let current = null; // { key, form, data }
  let section = 'hero';
  const hero = { key: 'name', params: Object.fromEntries(SHELF.map((key) => [key, { ...FORMS[key].params }])) };
  // Returns the error, if the recipe could not be made.
  const go = (key, params = {}, quick = false) => {
    let data;
    try {
      data = build(key, params);
    } catch (err) {
      return err;
    }
    current = { key, form: FORMS[key], data };
    cloud.show(data, quick ? 0.75 : 1.8);
    return null;
  };

  /* the recipe card */
  const card = document.getElementById('recipe');
  const chips = document.getElementById('chips');
  const recipeText = document.getElementById('recipe-text');
  const controls = document.getElementById('controls');
  const note = document.getElementById('recipe-note');
  const tell = (err) => {
    const form = FORMS[hero.key];
    note.classList.toggle('is-bad', Boolean(err));
    note.textContent = err ? `That did not parse: ${err.message}` : form.note(hero.params[hero.key]);
  };
  const reprint = (quick) => {
    if (section === 'hero') tell(go(hero.key, hero.params[hero.key], quick));
    else tell(null);
  };
  const choose = (key) => {
    hero.key = key;
    const form = FORMS[key];
    [...chips.children].forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.key === key)));
    recipeText.textContent = form.recipe;
    controls.textContent = '';
    form.controls.forEach((spec) => {
      const label = document.createElement('label');
      label.className = `field field--${spec.type}`;
      const name = document.createElement('span');
      name.textContent = spec.label;
      const input = document.createElement('input');
      input.type = spec.type;
      if (spec.type === 'range') {
        input.min = spec.min;
        input.max = spec.max;
        input.step = spec.step;
      } else {
        input.maxLength = spec.max;
        input.spellcheck = false;
        input.autocomplete = 'off';
        input.autocapitalize = 'off';
      }
      input.value = hero.params[key][spec.key];
      input.addEventListener('input', () => {
        hero.params[key][spec.key] = spec.type === 'range' ? Number(input.value) : input.value;
        reprint(true);
      });
      label.append(name, input);
      controls.append(label);
    });
    reprint(false);
  };
  SHELF.forEach((key) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dataset.key = key;
    chip.textContent = FORMS[key].label;
    chip.addEventListener('click', () => choose(key));
    chips.append(chip);
  });
  card.hidden = false;

  /* each section asks for its own form as it reaches the middle of the screen */
  let swap = 0;
  const enter = (el) => {
    clearInterval(swap);
    section = el.dataset.at;
    const key = el.dataset.form;
    if (key === 'hero') {
      reprint(false);
    } else if (key === 'anagram') {
      const words = ['ANAGRAMS', 'ARS MAGNA'];
      if (reduceMotion.matches) {
        go(key, { text: words.join('\n') }); // both at once, and nothing changes by itself
      } else {
        let i = 0;
        go(key, { text: words[0] });
        swap = setInterval(() => {
          i = 1 - i;
          go(key, { text: words[i] });
        }, 3600);
      }
    } else if (key === 'name') {
      go(key, { text: 'RYAN KAMP' });
    } else {
      go(key);
    }
  };
  const sections = [...document.querySelectorAll('[data-form]')];
  let active = null;

  // A form that has to be seen whole, on a narrow screen. It rides up the
  // screen inside its section's window, then holds just under the bar while
  // its text passes below. `half` is its half-extent with its margin, sized so
  // that all of it is on screen from the moment its section takes over (when
  // the section's top reaches the middle of the screen). `middle` and `end`
  // are where it holds and where its band ends, from the top of the screen.
  const bar = document.querySelector('.bar');
  const wholes = sections.filter((el) => FORMS[el.dataset.form] && FORMS[el.dataset.form].whole);
  const hold = (w) => {
    const under = bar ? bar.offsetHeight : 0;
    const half = Math.max(40, Math.min((w * 0.94) / 2, (innerHeight / 2 - under - 16) / 2));
    return { half, middle: under + 8 + half, end: under + 8 + 2 * half + 12 };
  };
  // The text of such a section never slides over the form: above the end of
  // the band it is cut away (see .is-under in styles.css).
  const uncover = (w) => {
    for (const el of wholes) {
      const panel = el.querySelector('.sec__text');
      if (!panel) continue;
      const cut = w < 960 ? Math.round(hold(w).end - panel.getBoundingClientRect().top) : 0;
      if (cut > 0 && panel.dataset.cut !== String(cut)) {
        panel.dataset.cut = String(cut);
        panel.style.setProperty('--cut', `${cut}px`);
      }
      panel.classList.toggle('is-under', cut > 0);
    }
  };
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.target !== active) {
        active = entry.target;
        enter(active);
      }
    });
  }, { rootMargin: '-50% 0px -50% 0px' });

  /* pointer: it parts the cloud, and a drag turns it */
  const pointer = { x: 0, y: 0, nx: 0, ny: 0, reach: 0, on: false };
  const drag = { on: false, x: 0, y: 0 };
  let yaw = 0;
  let pitch = 0;
  let coast = 0;
  addEventListener('pointermove', (e) => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    pointer.x = e.clientX - w / 2;
    pointer.y = h / 2 - e.clientY;
    pointer.nx = pointer.x / (w / 2);
    pointer.ny = pointer.y / (h / 2);
    pointer.on = true;
    if (drag.on) {
      coast = (e.clientX - drag.x) * 0.006;
      yaw += coast;
      pitch = clamp(pitch + (e.clientY - drag.y) * 0.005, -1.2, 1.2);
      drag.x = e.clientX;
      drag.y = e.clientY;
    }
  });
  addEventListener('pointerdown', (e) => {
    if (e.button || (e.target instanceof Element && e.target.closest('a, button, input, label, .card, .sec__text, .bar'))) return;
    drag.on = true;
    drag.x = e.clientX;
    drag.y = e.clientY;
    document.documentElement.classList.add('is-turning');
  });
  const release = (e) => {
    drag.on = false;
    document.documentElement.classList.remove('is-turning');
    if (e.pointerType !== 'mouse') pointer.on = false;
  };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  document.documentElement.addEventListener('pointerleave', () => { pointer.on = false; });

  /* the loop */
  const view = { cx: 0, cy: 0, scale: 1, width: 0.003, gain: 0.15, set: false };
  let last = 0;
  let slow = 0;
  const tick = (now) => {
    const t = now / 1000;
    const raw = last ? t - last : 0;
    const dt = clamp(raw, 0, 0.25); // long enough that a throttled tab still gets there
    last = t;
    const calm = reduceMotion.matches;

    // A machine that cannot keep up draws half the splats, then a quarter,
    // each a little larger so the ink comes to the same. After that it gets a
    // coarser print.
    slow = raw > 0.034 && raw < 0.5 ? slow + 1 : Math.max(0, slow - 1);
    if (slow > 50) {
      slow = 0;
      if (cloud.drawn > count / 4) {
        cloud.drawn = Math.round(cloud.drawn / 2);
        counted();
      } else {
        cloud.minDpr = 1;
        cloud.maxDpr = 1;
      }
    }
    cloud.resize();
    uncover(canvas.clientWidth);

    if (current) {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const { form, data } = current;
      let place = spot(section, w, h);
      let scale = Math.min(place.room[0] / 2, (place.room[1] / 2) * data.aspect, 600) * (form.fit || 1);
      let ease = calm || !view.set ? 1 : 1 - Math.exp(-dt * 3.4);
      if (form.whole && w < 960 && active) {
        const band = hold(w);
        scale = band.half / form.whole;
        place = { cx: 0, cy: h / 2 - (Math.max(0, active.getBoundingClientRect().top) + band.middle) };
        // once it has formed it keeps exact step with the scroll; while forming it only has to keep close
        if (cloud.morph >= 1) ease = 1;
        else if (!calm) ease = 1 - Math.exp(-dt * 12);
      }
      view.set = true;
      view.cx += (place.cx - view.cx) * ease;
      view.cy += (place.cy - view.cy) * ease;
      view.scale += (scale - view.scale) * ease;
      view.width += (data.width - view.width) * ease;
      view.gain += (data.gain - view.gain) * ease;

      const settle = calm ? 1 : 1 - Math.exp(-dt * 2.6);
      if (!drag.on) {
        if (form.spin) {
          if (!calm) yaw += dt * 0.22 + coast;
          coast *= 0.94;
          pitch += (0.3 + pointer.ny * 0.1 - pitch) * settle;
        } else {
          coast = 0;
          const face = Math.round(yaw / TAU) * TAU;
          const sway = calm ? 0 : form.sway * Math.sin(t * 0.42) + pointer.nx * 0.2;
          yaw += (face + sway - yaw) * settle;
          pitch += ((form.tilt || 0) - pointer.ny * 0.1 - pitch) * settle;
        }
      }
      pointer.reach += ((pointer.on ? 120 : 0) - pointer.reach) * (1 - Math.exp(-dt * 8));

      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      cloud.draw({
        time: t,
        dt,
        turn: [cy, sp * sy, -cp * sy, 0, cp, sp, sy, -sp * cy, cp * cy],
        center: [view.cx, view.cy],
        scale: view.scale,
        width: view.width,
        gain: view.gain,
        pointer: [pointer.x, pointer.y, pointer.reach],
        calm,
      });
    }
    requestAnimationFrame(tick);
  };

  // The name is set in Recursive, so wait for the face before drawing it.
  const ready = document.fonts && document.fonts.load ? document.fonts.load('900 150px Recursive') : Promise.resolve();
  Promise.race([ready, new Promise((done) => setTimeout(done, 1800))]).catch(() => {}).then(() => {
    choose('name');
    sections.forEach((el) => spy.observe(el));
    requestAnimationFrame(tick);
  });
}

console.log('%c OVERPRINT %c one cloud of splats, two inks. Try the "write your own" recipe.', 'background:#ff5a36;color:#17232b;font-weight:900', 'font-weight:600');

start();
