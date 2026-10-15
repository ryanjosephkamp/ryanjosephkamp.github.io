// The plate and its sand. The model is the one Splashery's Chladni plate
// uses (splashery: src/packs/studio.js and src/packs/chladni-sand.js):
//
//   w(x, y) = cos(nπx)·cos(mπy) + s·cos(mπx)·cos(nπy),   s = +1 or −1
//
// w is how far the plate swings at (x, y); the still lines are w = 0, and a
// figure's pitch follows n² + m². Every grain moves on every frame: it hops
// more where the plate swings more and slides toward the still lines. When
// several modes ring at once a grain feels E = Σ a² w², each mode weighted
// by its strength squared.
//
// No DOM in this file: tools/check-figures.mjs runs it in Node.

export const KMAX = 4; // the largest n or m
export const BASE_HZ = 65.406; // the pitch of n² + m² = 1 (the C two octaves below middle C)
const PI = Math.PI;
const TAB = 2048;

const COS = [];
const SIN = [];
for (let k = 0; k <= KMAX; k++) {
  const c = new Float32Array(TAB + 1);
  const s = new Float32Array(TAB + 1);
  for (let i = 0; i <= TAB; i++) {
    c[i] = Math.cos((k * PI * i) / TAB);
    s[i] = Math.sin((k * PI * i) / TAB);
  }
  COS.push(c);
  SIN.push(s);
}

// Every figure the plate can make with n and m up to KMAX, lowest pitch
// first. (0, 0) never moves the sand, n = m with a minus is no swing at all,
// and (m, n) is (n, m) again, so n ≤ m covers them all.
export function catalog() {
  const list = [];
  for (let n = 0; n <= KMAX; n++)
    for (let m = n; m <= KMAX; m++) {
      if (n === 0 && m === 0) continue;
      list.push({ n, m, s: 1 });
      if (n !== m) list.push({ n, m, s: -1 });
    }
  list.sort((a, b) => a.n * a.n + a.m * a.m - (b.n * b.n + b.m * b.m) || a.n - b.n || b.s - a.s);
  return list.map((f, i) => {
    const k = f.n * f.n + f.m * f.m;
    return { ...f, k, hz: BASE_HZ * k, index: i, number: i + 1 };
  });
}

// The swing at (x, y) and its slope.
export function swing(f, x, y) {
  const { n, m, s } = f;
  const w = Math.cos(n * PI * x) * Math.cos(m * PI * y) + s * Math.cos(m * PI * x) * Math.cos(n * PI * y);
  const gx = -n * PI * Math.sin(n * PI * x) * Math.cos(m * PI * y) - s * m * PI * Math.sin(m * PI * x) * Math.cos(n * PI * y);
  const gy = -m * PI * Math.cos(n * PI * x) * Math.sin(m * PI * y) - s * n * PI * Math.cos(m * PI * x) * Math.sin(n * PI * y);
  return { w, gx, gy };
}

// How far (x, y) is from the figure's nearest still line, to first order.
export function toLine(f, x, y) {
  const { w, gx, gy } = swing(f, x, y);
  return Math.abs(w) / Math.max(1e-6, Math.hypot(gx, gy));
}

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MOVES_PER_SECOND = 60;
const LO = 0.012;
const HI = 0.988;

export class Sand {
  constructor(n, rand = Math.random) {
    this.n = n;
    this.X = new Float32Array(n);
    this.Y = new Float32Array(n);
    this.hop = new Float32Array(n);
    this.rand = rand;
    this.scatter();
  }

  scatter() {
    for (let i = 0; i < this.n; i++) {
      this.X[i] = 0.015 + 0.97 * this.rand();
      this.Y[i] = 0.015 + 0.97 * this.rand();
    }
    this.hop.fill(0);
  }

  // One frame: dt seconds of ringing by the modes in `drive`
  // ([{ n, m, s, a }], a the mode's strength 0..1). Returns whether the
  // sand moved. Silence leaves it where it lies.
  step(dt, drive) {
    const rand = this.rand;
    const modes = drive.filter((d) => d.a > 1e-3);
    let A = 0;
    for (const d of modes) A += d.a * d.a;
    if (A <= 1e-5) {
      this.hop.fill(0);
      return false;
    }
    const subs = MOVES_PER_SECOND * Math.min(0.1, dt) * Math.min(1, Math.sqrt(A) * 1.25);
    const reach = 0.02 * subs;
    const jump = 0.012 * Math.sqrt(subs);
    const k = modes.length;
    const { X, Y, hop } = this;
    for (let i = 0; i < this.n; i++) {
      let x = X[i];
      let y = Y[i];
      const ix = Math.round(x * TAB);
      const iy = Math.round(y * TAB);
      let E = 0;
      let Gx = 0;
      let Gy = 0;
      let H = 0;
      for (let j = 0; j < k; j++) {
        const { n, m, s, a } = modes[j];
        const cnx = COS[n][ix];
        const cmx = COS[m][ix];
        const cny = COS[n][iy];
        const cmy = COS[m][iy];
        const w = cnx * cmy + s * cmx * cny;
        const gx = -n * PI * SIN[n][ix] * cmy - s * m * PI * SIN[m][ix] * cny;
        const gy = -m * PI * cnx * SIN[m][iy] - s * n * PI * cmx * SIN[n][iy];
        const q = (a * a) / A;
        E += q * w * w;
        Gx += q * w * gx;
        Gy += q * w * gy;
        H += q * (gx * gx + gy * gy);
      }
      // Slide toward the still lines, a short way at most...
      let dx = (-0.045 * subs * Gx) / (H + 1e-3);
      let dy = (-0.045 * subs * Gy) / (H + 1e-3);
      const len = Math.hypot(dx, dy);
      if (len > reach) {
        dx *= reach / len;
        dy *= reach / len;
      }
      // ...and hop about, more where the plate swings more.
      const r = jump * (Math.min(2, Math.sqrt(E)) ** 1.5 + 0.1) * (0.3 + rand());
      const th = rand() * PI * 2;
      x += dx + r * Math.cos(th);
      y += dy + r * Math.sin(th);
      X[i] = x < LO ? LO : x > HI ? HI : x;
      Y[i] = y < LO ? LO : y > HI ? HI : y;
      hop[i] = Math.min(1, Math.sqrt(E) / 1.4) * Math.min(1, Math.sqrt(A));
    }
    return true;
  }

  // The share of the sand within 0.02 of one of the figure's still lines.
  share(f, sample = 800) {
    const stride = Math.max(1, Math.floor(this.n / sample));
    let near = 0;
    let count = 0;
    for (let i = 0; i < this.n; i += stride) {
      if (toLine(f, this.X[i], this.Y[i]) < 0.02) near++;
      count++;
    }
    return near / Math.max(1, count);
  }
}

// A figure drawn at rest: grains placed on its still lines by rejection,
// the same every time for the same figure.
export function restingFigure(f, count) {
  const rand = mulberry(977 * (f.n * 31 + f.m * 7 + (f.s > 0 ? 3 : 5)));
  const pts = new Float32Array(count * 2);
  let got = 0;
  for (let tries = 0; got < count && tries < count * 400; tries++) {
    const x = 0.02 + 0.96 * rand();
    const y = 0.02 + 0.96 * rand();
    const d = toLine(f, x, y) / 0.011;
    if (rand() < Math.exp(-d * d)) {
      pts[got * 2] = x;
      pts[got * 2 + 1] = y;
      got++;
    }
  }
  return pts.subarray(0, got * 2);
}
