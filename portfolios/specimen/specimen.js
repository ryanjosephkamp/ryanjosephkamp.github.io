// SPECIMEN — the math, with no DOM in it, so verify.mjs can run the same code in Node.
//
// A specimen is a list of 3D Gaussians ("splats"): a center m, a covariance S, a weight w,
// how much of each of four stains it takes up (k), and two numbers that say when and how
// strongly it takes part in a spike. buildTree() pairs them up, level by level, into coarser
// splats that keep the same mass, center and covariance.

export const DEPTH = 15; // 2^15 = 32,768 splats at full focus
export const WAVE_MS = 16; // length of the stored spike waveform, in milliseconds
export const T_SOMA = 4; // the soma fires this long after the first input arrives

/* ---------- small helpers ---------- */

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => mul(a, 1 / (len(a) || 1));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function onSphere(r) {
  const z = 2 * r() - 1;
  const t = 2 * Math.PI * r();
  const s = Math.sqrt(1 - z * z);
  return [s * Math.cos(t), s * Math.sin(t), z];
}
function inBall(r) {
  return mul(onSphere(r), Math.cbrt(r()));
}
function perpTo(d, r) {
  return unit(cross(d, onSphere(r)));
}

// Covariance as six numbers: xx, yy, zz, xy, xz, yz.
export const ball = (s) => [s * s, s * s, s * s, 0, 0, 0];
// Long along d, thin across it: across² I + (along² − across²) d dᵀ.
export function needle(d, along, across) {
  const k = along * along - across * across;
  const c = across * across;
  return [c + k * d[0] * d[0], c + k * d[1] * d[1], c + k * d[2] * d[2], k * d[0] * d[1], k * d[0] * d[2], k * d[1] * d[2]];
}

// A splat takes up four stains in fixed shares. A stain set says what each one absorbs.
export const BODY = [1, 0, 0, 0]; // cytoplasm, dendrites, the axon under its sheath
export const DEEP = [0, 1, 0, 0]; // nucleus, Nissl bodies, boutons
export const SHEATH = [0, 0, 1, 0]; // myelin
export const FINE = [0, 0, 0, 1]; // spines, bare axon at the nodes, terminal twigs

// Stains are stored as absorbance, −ln(transmitted color): light passes through, and is lost.
export const stain = (r, g, b) => [-Math.log(r), -Math.log(g), -Math.log(b)];
export const SPIKE = stain(1.0, 0.2, 0.3); // a membrane that is firing
export const STAINS = {
  nissl: [stain(0.36, 0.18, 0.58), stain(0.19, 0.1, 0.42), stain(0.2, 0.54, 0.66), stain(0.4, 0.2, 0.6)],
  golgi: [stain(0.2, 0.13, 0.07), stain(0.12, 0.08, 0.05), stain(0.46, 0.33, 0.16), stain(0.2, 0.13, 0.07)],
  he: [stain(0.93, 0.46, 0.66), stain(0.3, 0.2, 0.56), stain(0.97, 0.74, 0.84), stain(0.9, 0.4, 0.62)],
};

/* ---------- the neuron recipe ---------- */

// A neurite that wanders and forks, as a list of short straight segments.
function grow(r, segs, tips, p, dir, length, radius, depth, s) {
  const steps = Math.max(3, Math.round(length / 0.04));
  const h = length / steps;
  for (let k = 0; k < steps; k += 1) {
    dir = unit(add(dir, mul(onSphere(r), 0.2)));
    const q = add(p, mul(dir, h));
    segs.push({ a: p, b: q, r: radius * (1 - (0.3 * k) / steps), s0: s, s1: s + h });
    p = q;
    s += h;
  }
  if (depth === 0) {
    tips.push({ p, s, dir });
    return;
  }
  const side = perpTo(dir, r);
  for (const sign of [1, -1]) {
    const tilt = 0.34 + 0.42 * r();
    const d = unit(add(mul(dir, Math.cos(tilt)), mul(side, sign * Math.sin(tilt))));
    grow(r, segs, tips, p, d, length * (0.66 + 0.16 * r()), radius * 0.7, depth - 1, s);
  }
}

/**
 * Exactly n splats along a set of segments, each a needle along its segment. A segment draws
 * splats in proportion to its length times its radius, so trunks are denser than twigs. With
 * `shell`, the splats sit on the tube's surface and leave it hollow.
 */
function alongTube(r, segs, n, emit, shell = false) {
  const lens = segs.map((g) => len(sub(g.b, g.a)));
  const pull = segs.map((g, j) => lens[j] * g.r);
  const total = pull.reduce((a, b) => a + b, 0);
  let j = 0;
  let before = 0;
  for (let i = 0; i < n; i += 1) {
    const u = ((i + r()) * total) / n;
    while (j < segs.length - 1 && before + pull[j] < u) {
      before += pull[j];
      j += 1;
    }
    const g = segs[j];
    const f = Math.min(1, Math.max(0, (u - before) / pull[j]));
    const d = unit(sub(g.b, g.a));
    const gap = (lens[j] * total) / (n * pull[j]); // distance between neighbors on this segment
    const across = g.r * (shell ? 0.2 : 0.5);
    const p = add(mix(g.a, g.b, f), mul(perpTo(d, r), shell ? g.r : g.r * 0.7 * Math.sqrt(r())));
    emit(p, needle(d, Math.max(gap * 0.8, across * 1.4), across), g.s0 + (g.s1 - g.s0) * f, g);
  }
}

/**
 * A multipolar neuron, drawn the way a textbook lays one out: dendrites on the left, the
 * soma, then a myelinated axon running right to its terminals. Returns 2^depth leaves and
 * the named parts a label can point at. Every count below is its share of 32,768.
 */
export function neuron(seed = 1952, depth = DEPTH) {
  const N = 2 ** depth;
  const r = rng(seed);
  const leaves = [];
  const put = (m, S, k, delay, gain, w = 1) => leaves.push({ m, S, w, k, delay, gain });
  const share = (n, per = 1) => Math.max(per, Math.round((n * N) / 32768 / per) * per);
  const n = {
    soma: share(2600),
    nissl: share(400, 10),
    nucleus: share(440),
    nucleolus: share(56),
    spines: share(4200, 6),
    core: share(2000),
    myelin: share(7500, 5),
    schwann: share(300, 5),
    twigs: share(2000),
    boutons: share(2272, 16),
  };
  n.shafts = N - Object.values(n).reduce((a, b) => a + b, 0); // the dendrites take the rest

  // Soma: a membrane and the cytoplasm inside it, light enough to see through.
  const somaR = [0.17, 0.15, 0.14];
  for (let i = 0; i < n.soma; i += 1) {
    const q = i % 5 < 2 ? mul(onSphere(r), 0.94 + 0.06 * r()) : inBall(r);
    put([q[0] * somaR[0], q[1] * somaR[1], q[2] * somaR[2]], ball(0.02), BODY, T_SOMA, 1, 0.34);
  }
  // Nissl bodies: small dark clumps in the cytoplasm, outside the nucleus.
  for (let c = 0; c < n.nissl / 10; c += 1) {
    let q = inBall(r);
    while (len(q) < 0.5) q = inBall(r);
    const at = [q[0] * somaR[0] * 0.88, q[1] * somaR[1] * 0.88, q[2] * somaR[2] * 0.88];
    for (let i = 0; i < 10; i += 1) put(add(at, mul(inBall(r), 0.016)), ball(0.006), DEEP, T_SOMA, 1, 0.5);
  }
  // The nucleus, pale with a dark rim, and its nucleolus.
  const nuc = [-0.02, 0.01, 0];
  for (let i = 0; i < n.nucleus; i += 1) {
    const q = i % 3 ? mul(onSphere(r), 0.92 + 0.08 * r()) : inBall(r);
    put(add(nuc, mul(q, 0.066)), ball(0.008), DEEP, T_SOMA, 1, 0.5);
  }
  for (let i = 0; i < n.nucleolus; i += 1) put(add(add(nuc, [0.012, -0.008, 0.01]), mul(inBall(r), 0.016)), ball(0.006), DEEP, T_SOMA, 1, 1.3);

  // Dendrites: six trunks fanned away from the axon, forking four or five times.
  const marks = {};
  const dSegs = [];
  const dTips = [];
  for (const [deg, forks] of [[60, 4], [104, 5], [148, 5], [194, 5], [238, 5], [292, 4]]) {
    const t = (deg * Math.PI) / 180;
    const d = unit([Math.cos(t), Math.sin(t), (r() - 0.5) * 0.9]);
    const first = dSegs.length;
    grow(r, dSegs, dTips, mul(d, 0.13), d, 0.33 + 0.08 * r(), 0.03, forks, 0.13);
    if (deg === 194) marks.dendrite = dSegs[first + 6].b; // on the trunk that runs along the long axis
  }
  const reach = Math.max(...dTips.map((t) => t.s));
  // Inputs start at the far tips at time 0 and reach the soma together at T_SOMA.
  const arrives = (s) => T_SOMA * (1 - s / reach) - 1e-3;
  alongTube(r, dSegs, n.shafts, (p, S, s) => put(p, S, BODY, arrives(s), 0.42));
  // Spines: a short stalk and a head, on the thinner branches. Six splats each.
  const thin = dSegs.filter((g) => g.r < 0.017);
  for (let i = 0; i < n.spines / 6; i += 1) {
    const g = thin[Math.floor(r() * thin.length)];
    const f = r();
    const d = unit(sub(g.b, g.a));
    const out = perpTo(d, r);
    const base = add(mix(g.a, g.b, f), mul(out, g.r));
    const long = 0.016 + 0.018 * r();
    const when = arrives(g.s0 + (g.s1 - g.s0) * f);
    for (const along of [0.3, 0.7]) put(add(base, mul(out, long * along)), needle(out, long * 0.28, 0.0024), FINE, when, 0.42, 0.7);
    for (let k = 0; k < 4; k += 1) put(add(add(base, mul(out, long)), mul(inBall(r), 0.005)), ball(0.0042), FINE, when, 0.42, 0.7);
  }

  // The axon: a hillock, then five myelinated internodes with a node of Ranvier after each.
  const INTERNODES = 5;
  const HOP = 1.5; // ms from one node to the next: the spike jumps the sheath, then pauses
  const core = [];
  const sheaths = [];
  let p = [0.14, 0, 0];
  let dir = [1, 0, 0];
  let time = T_SOMA;
  const run = (length, r0, r1, t1, sheath, bare) => {
    const steps = Math.round(length / 0.02);
    for (let k = 0; k < steps; k += 1) {
      dir = unit(add(dir, [0, (r() - 0.5) * 0.07 - p[1] * 0.03, (r() - 0.5) * 0.07 - p[2] * 0.03]));
      const q = add(p, mul(dir, length / steps));
      const g = { a: p, b: q, r: r0 + ((r1 - r0) * k) / steps, s0: time + ((t1 - time) * k) / steps, s1: time + ((t1 - time) * (k + 1)) / steps, bare };
      core.push(g);
      if (sheath) sheath.push({ ...g, r: 0.056 * Math.sin((Math.PI * (k + 0.5)) / steps) ** 0.4 });
      p = q;
    }
    time = t1;
  };
  run(0.1, 0.07, 0.03, T_SOMA + 0.2, null, false);
  marks.hillock = p;
  run(0.1, 0.03, 0.019, T_SOMA + 0.4, null, false);
  const axonStarts = time;
  for (let k = 0; k < INTERNODES; k += 1) {
    const sheath = [];
    run(0.4, 0.018, 0.018, time + 0.25, sheath, false); // under the sheath: fast
    sheaths.push(sheath);
    if (k === 1) marks.myelin = sheath[sheath.length >> 1].a;
    if (k === 2) marks.node = add(p, mul(dir, 0.024));
    run(0.048, 0.02, 0.02, time + HOP - 0.25, null, true); // at the node: regenerate
  }
  const axonEnds = time;
  alongTube(r, core, n.core, (q, S, s, g) => put(q, S, g.bare ? FINE : BODY, s, 1));
  for (const sheath of sheaths) {
    alongTube(r, sheath, n.myelin / INTERNODES, (q, S, s) => put(q, S, SHEATH, s, 0.9, 0.8), true);
    // The nucleus of the cell that wraps this stretch, on the outside of its sheath.
    const mid = sheath[sheath.length >> 1];
    const at = add(mid.a, mul(perpTo(unit(sub(mid.b, mid.a)), r), mid.r + 0.012));
    for (let i = 0; i < n.schwann / INTERNODES; i += 1) {
      const q = inBall(r);
      put(add(at, [q[0] * 0.034, q[1] * 0.014, q[2] * 0.014]), ball(0.006), DEEP, mid.s0, 0.3, 0.7);
    }
  }

  // Terminal arbor, and a bouton on each of its tips.
  const tSegs = [];
  const tTips = [];
  grow(r, tSegs, tTips, p, dir, 0.24, 0.015, 4, 0);
  const SPEED = 0.45; // arbor length covered per ms
  const after = (s) => axonEnds + 1e-3 + s / SPEED;
  alongTube(r, tSegs, n.twigs, (q, S, s) => put(q, S, FINE, after(s), 1));
  marks.terminals = tSegs[4].b; // on the arbor's trunk, so the label stays put as the cell turns
  for (let i = 0; i < n.boutons; i += 1) {
    const tip = tTips[i % tTips.length];
    const q = i % 3 ? mul(onSphere(r), 0.9 + 0.1 * r()) : inBall(r);
    put(add(tip.p, mul(q, 0.03)), ball(0.006), DEEP, after(tip.s), 1, 0.8);
  }

  // What a label can point at: a place, and how to pick out its splats (by when they fire
  // and which stains they take).
  const parts = [
    { id: 'dendrites', at: marks.dendrite, range: [-1, T_SOMA - 5e-4], mask: [1, 0, 0, 1] },
    { id: 'soma', at: [0, 0, 0], range: [T_SOMA - 1e-4, T_SOMA + 1e-4], mask: [1, 1, 0, 0] },
    { id: 'hillock', at: marks.hillock, range: [T_SOMA + 1e-3, axonStarts], mask: [1, 0, 0, 0] },
    { id: 'myelin', at: marks.myelin, range: [axonStarts, axonEnds], mask: [0, 1, 1, 0] },
    { id: 'node', at: marks.node, range: [axonStarts, axonEnds], mask: [0, 0, 0, 1] },
    { id: 'terminals', at: marks.terminals, range: [axonEnds + 5e-4, 1e6], mask: [1, 1, 0, 1] },
  ];

  if (leaves.length !== N) throw new Error(`the recipe made ${leaves.length} splats, not ${N}`);
  const fit = normalize(leaves);
  return { leaves: fit.leaves, parts: parts.map((part) => ({ ...part, at: fit.place(part.at) })) };
}

// Weights that sum to 1, center of mass at the origin, longest half-extent 1.
export function normalize(leaves) {
  let mass = 0;
  const c = [0, 0, 0];
  for (const l of leaves) {
    mass += l.w;
    for (let k = 0; k < 3; k += 1) c[k] += l.w * l.m[k];
  }
  for (let k = 0; k < 3; k += 1) c[k] /= mass;
  let far = 0;
  for (const l of leaves) for (let k = 0; k < 3; k += 1) far = Math.max(far, Math.abs(l.m[k] - c[k]));
  const s = 1 / far;
  const place = (q) => mul(sub(q, c), s);
  return { place, leaves: leaves.map((l) => ({ ...l, w: l.w / mass, m: place(l.m), S: l.S.map((v) => v * s * s) })) };
}

/* ---------- the tree ---------- */

/**
 * Moment matching: the one Gaussian with the same mass, center and covariance as the pair.
 *   w = wa + wb,  m = (wa·ma + wb·mb) / w,
 *   S = (wa·(Sa + da·daᵀ) + wb·(Sb + db·dbᵀ)) / w,  with da = ma − m.
 */
export function merge(A, B) {
  const w = A.w + B.w;
  const fa = A.w / w;
  const fb = B.w / w;
  const m = [fa * A.m[0] + fb * B.m[0], fa * A.m[1] + fb * B.m[1], fa * A.m[2] + fb * B.m[2]];
  const da = sub(A.m, m);
  const db = sub(B.m, m);
  const outer = (d) => [d[0] * d[0], d[1] * d[1], d[2] * d[2], d[0] * d[1], d[0] * d[2], d[1] * d[2]];
  const oa = outer(da);
  const ob = outer(db);
  return {
    w,
    m,
    S: A.S.map((_, k) => fa * (A.S[k] + oa[k]) + fb * (B.S[k] + ob[k])),
    k: A.k.map((_, i) => fa * A.k[i] + fb * B.k[i]),
    delay: fa * A.delay + fb * B.delay,
    gain: fa * A.gain + fb * B.gain,
  };
}

/**
 * Pair the leaves into a complete binary tree. nodes[1] is the whole specimen as one splat;
 * nodes[i] has children nodes[2i] and nodes[2i+1]; level L is nodes[2^L .. 2^(L+1) − 1].
 * Each split is at the median along the axis the leaves are most spread on.
 */
export function buildTree(leaves) {
  const depth = Math.log2(leaves.length);
  if (!Number.isInteger(depth)) throw new Error('a specimen needs a power-of-two number of splats');
  const nodes = new Array(2 * leaves.length);
  const order = Int32Array.from(leaves, (_, i) => i);
  const coords = [0, 1, 2].map((k) => Float64Array.from(leaves, (l) => l.m[k]));
  const build = (i, lo, hi) => {
    if (hi - lo === 1) {
      nodes[i] = leaves[order[lo]];
      return;
    }
    let along = coords[0];
    let widest = -1;
    for (const x of coords) {
      let s = 0;
      let s2 = 0;
      for (let j = lo; j < hi; j += 1) {
        const v = x[order[j]];
        s += v;
        s2 += v * v;
      }
      const spread = s2 - (s * s) / (hi - lo);
      if (spread > widest) {
        widest = spread;
        along = x;
      }
    }
    order.subarray(lo, hi).sort((a, b) => along[a] - along[b]);
    const mid = (lo + hi) >> 1;
    build(2 * i, lo, mid);
    build(2 * i + 1, mid, hi);
    nodes[i] = merge(nodes[2 * i], nodes[2 * i + 1]);
  };
  build(1, 0, leaves.length);
  return { depth, nodes };
}

// Mass, center and covariance of a set of splats taken together.
export function moments(splats) {
  let w = 0;
  const m = [0, 0, 0];
  for (const s of splats) {
    w += s.w;
    for (let k = 0; k < 3; k += 1) m[k] += s.w * s.m[k];
  }
  for (let k = 0; k < 3; k += 1) m[k] /= w;
  const S = [0, 0, 0, 0, 0, 0];
  for (const s of splats) {
    const d = sub(s.m, m);
    const o = [d[0] * d[0], d[1] * d[1], d[2] * d[2], d[0] * d[1], d[0] * d[2], d[1] * d[2]];
    for (let k = 0; k < 6; k += 1) S[k] += (s.w * (s.S[k] + o[k])) / w;
  }
  return { w, m, S };
}

export const level = (tree, L) => tree.nodes.slice(1 << L, 2 << L);

// One row of 32 floats per node: itself, then its parent (holding half the parent's weight,
// so that two children resting on their parent add up to exactly the parent).
export function pack(tree) {
  const n = tree.nodes.length - 1;
  const out = new Float32Array(n * 32);
  const write = (o, s, w) => {
    out.set(s.m, o);
    out[o + 3] = w;
    out[o + 4] = s.S[0];
    out[o + 5] = s.S[1];
    out[o + 6] = s.S[2];
    out[o + 7] = s.delay;
    out[o + 8] = s.S[3];
    out[o + 9] = s.S[4];
    out[o + 10] = s.S[5];
    out[o + 11] = s.gain;
    out.set(s.k, o + 12);
  };
  for (let i = 1; i <= n; i += 1) {
    const s = tree.nodes[i];
    const up = i === 1 ? s : tree.nodes[i >> 1];
    write((i - 1) * 32, s, s.w);
    write((i - 1) * 32 + 16, up, i === 1 ? s.w : up.w / 2);
  }
  return out;
}

/**
 * Everything a stage needs to draw a specimen, and nothing it does not: the packed rows, the
 * moments of every level, the room the specimen takes up, and when its last splat fires.
 */
export function prepare(leaves) {
  const tree = buildTree(leaves);
  let lo = Infinity;
  let hi = -Infinity;
  let around = 0;
  let last = 0;
  for (const s of leaves) {
    const pad = 2 * Math.sqrt(Math.max(s.S[0], s.S[1], s.S[2]));
    lo = Math.min(lo, s.m[0] - pad);
    hi = Math.max(hi, s.m[0] + pad);
    around = Math.max(around, Math.hypot(s.m[1], s.m[2]) + pad);
    last = Math.max(last, s.delay);
  }
  return {
    depth: tree.depth,
    rows: pack(tree),
    stats: Array.from({ length: tree.depth + 1 }, (_, L) => moments(level(tree, L))),
    center: [(lo + hi) / 2, 0, 0], // the middle of its length
    half: [(hi - lo) / 2, around], // half its length, and its reach around the long axis
    last,
  };
}

/* ---------- Hodgkin & Huxley, 1952 ---------- */

/**
 * The squid giant axon model, integrated with forward Euler at dt = 0.01 ms. A brief current
 * pulse at t = 0 from rest; returns the membrane potential (mV) every 0.1 ms.
 */
export function hodgkinHuxley({ ms = WAVE_MS, current = 20, pulse = 1, dt = 0.01 } = {}) {
  const gNa = 120, gK = 36, gL = 0.3, ENa = 50, EK = -77, EL = -54.387, C = 1;
  const ratio = (x, y) => (Math.abs(x) < 1e-7 ? y : x / (1 - Math.exp(-x / y)));
  const an = (v) => 0.01 * ratio(v + 55, 10);
  const bn = (v) => 0.125 * Math.exp(-(v + 65) / 80);
  const am = (v) => 0.1 * ratio(v + 40, 10);
  const bm = (v) => 4 * Math.exp(-(v + 65) / 18);
  const ah = (v) => 0.07 * Math.exp(-(v + 65) / 20);
  const bh = (v) => 1 / (1 + Math.exp(-(v + 35) / 10));
  let v = -65;
  let n = an(v) / (an(v) + bn(v));
  let m = am(v) / (am(v) + bm(v));
  let h = ah(v) / (ah(v) + bh(v));
  const rest = v;
  const trace = [];
  const every = Math.round(0.1 / dt);
  const steps = Math.round(ms / dt);
  for (let i = 0; i <= steps; i += 1) {
    if (i % every === 0) trace.push(v);
    const I = i * dt < pulse ? current : 0;
    const dv = (I - gNa * m ** 3 * h * (v - ENa) - gK * n ** 4 * (v - EK) - gL * (v - EL)) / C;
    n += dt * (an(v) * (1 - n) - bn(v) * n);
    m += dt * (am(v) * (1 - m) - bm(v) * m);
    h += dt * (ah(v) * (1 - h) - bh(v) * h);
    v += dt * dv;
  }
  return { trace, rest, peak: Math.max(...trace), trough: Math.min(...trace), step: 0.1 };
}

/**
 * All or none: the weakest one-millisecond pulse that still fires this membrane, found by
 * bisection to 0.01 µA/cm². "Fires" means the potential crosses 0 mV.
 */
export function threshold() {
  let lo = 0;
  let hi = 20;
  while (hi - lo > 0.01) {
    const mid = (lo + hi) / 2;
    if (hodgkinHuxley({ current: mid }).peak > 0) hi = mid;
    else lo = mid;
  }
  return hi;
}
