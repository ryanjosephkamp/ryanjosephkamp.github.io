// The toy kit behind the drawing on sheet 1: a few of the shapes Splashery's
// own kit has (src/kit.js there), with the same areas, built into four toys.
// Pure functions with no DOM, so the tools in tools/ run the same code in Node.

export const TAU = Math.PI * 2;
export const BAR = 1.15; // the critic's bar: densest region over sparsest
export const BUDGET = 640;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function halton(i, base) {
  let f = 1;
  let x = 0;
  while (i > 0) {
    f /= base;
    x += f * (i % base);
    i = Math.floor(i / base);
  }
  return x;
}

// Share a splat budget between parts in proportion to their areas: whole
// splats only, largest remainder first, so the parts always sum to the budget.
export function share(budget, areas) {
  const total = areas.reduce((a, b) => a + b, 0);
  const exact = areas.map((a) => (budget * a) / total);
  const counts = exact.map(Math.floor);
  let left = budget - counts.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => [e - counts[i], i]).sort((p, q) => q[0] - p[0] || p[1] - q[1]);
  for (let k = 0; left > 0; k += 1, left -= 1) counts[order[k % order.length][1]] += 1;
  return counts;
}

// The same split with every share rounded down: the mistake that loses splats.
export function shareFloor(budget, areas) {
  const total = areas.reduce((a, b) => a + b, 0);
  return areas.map((a) => Math.floor((budget * a) / total));
}

// ---------- vectors ----------
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const mix = (a, b, ca, cb) => [a[0] * ca + b[0] * cb, a[1] * ca + b[1] * cb, a[2] * ca + b[2] * cb];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => scale(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));

// One surface splat: a Gaussian flattened onto the surface, given as its three
// scaled axes. Its covariance is the sum of their outer products.
function surfel(p, n, rad, rand, extra) {
  const t1 = unit(cross(Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], n));
  const t2 = cross(n, t1);
  const phi = rand() * Math.PI;
  const a = rad * (1.05 + 0.35 * rand());
  const b = rad * (0.7 + 0.25 * rand());
  return {
    p, n,
    ax: [scale(mix(t1, t2, Math.cos(phi), Math.sin(phi)), a), scale(mix(t1, t2, -Math.sin(phi), Math.cos(phi)), b), scale(n, rad * 0.08)],
    k: rand(),
    ...extra,
  };
}

// ---------- shapes ----------
// A shape knows its area, the two regions the critic compares on it, and how to
// place a point from two (or three) numbers in [0, 1). `wrong` asks for the
// classic mistake: spreading those numbers evenly in the shape's own
// parameters instead of evenly over its area.

// torus(R, r), ring radius and tube radius.
export function torus(R, r) {
  // Invert the area CDF around the tube, F(v) = (R v + r sin v) / (2 pi R).
  const invV = (q) => {
    let v = q * TAU;
    for (let k = 0; k < 8; k += 1) v -= (R * v + r * Math.sin(v) - q * TAU * R) / (R + r * Math.cos(v));
    return v;
  };
  const frame = (u, v, rho = r) => {
    const cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v);
    return { p: [(R + rho * cv) * cu, rho * sv, (R + rho * cv) * su], n: [cv * cu, sv, cv * su], tu: [-su, 0, cu], tv: [-sv * cu, cv, -sv * su] };
  };
  return {
    kit: `torus(${R}, ${r})`,
    area: TAU * TAU * R * r,
    regions: [
      { name: 'inside the hole', area: TAU * r * (Math.PI * R - 2 * r) }, // cos v < 0
      { name: 'outside', area: TAU * r * (Math.PI * R + 2 * r) },
    ],
    crowding: (Math.PI * R + 2 * r) / (Math.PI * R - 2 * r),
    at(a, b, wrong) {
      const v = wrong ? b * TAU : invV(b);
      const f = frame(a * TAU, v);
      return { p: f.p, n: f.n, g: Math.cos(v) < 0 ? 0 : 1 };
    },
    invV, frame,
  };
}

// A band of half-width w(u) centered on the top of a torus's tube, sitting just
// proud of it: the frosting. In Splashery's kit this is a param() surface.
export function band(R, r, mean) {
  const host = torus(R, r);
  const width = (u, phase) => mean + 0.2 * Math.sin(5 * u + phase) + 0.1 * Math.sin(8 * u + 1.7 * phase);
  return {
    kit: 'param(band)',
    // The cos v term cancels across the band, and the ripples in w(u) integrate to nothing.
    area: r * 2 * R * TAU * mean,
    emit(n, { rand, rad, shift }) {
      const phase = rand() * TAU;
      const out = [];
      for (let i = 1; out.length < n && i < n * 60; i += 1) {
        const u = ((halton(i, 2) + shift[0]) % 1) * TAU;
        const v = host.invV((halton(i, 3) + shift[1]) % 1);
        let dv = v - Math.PI / 2;
        if (dv > Math.PI) dv -= TAU;
        if (Math.abs(dv) >= width(u, phase)) continue;
        const f = host.frame(u, v);
        out.push(surfel(f.p, f.n, rad, rand));
      }
      return out;
    },
  };
}

// count small cylinders (with caps) scattered over the top of a torus: sprinkles.
export function cylinders(count, rad, len, R, r, spread) {
  const host = torus(R, r);
  return {
    kit: `${count} × cylinder(${rad}, ${len})`,
    area: count * (TAU * rad * len + TAU * rad * rad),
    emit(n, { rand }) {
      const out = [];
      for (let j = 0; j < count; j += 1) {
        const u = ((j + 0.5 + 0.7 * (rand() - 0.5)) / count) * TAU;
        const v = Math.PI / 2 + (rand() - 0.5) * spread;
        const psi = rand() * Math.PI;
        const c = Math.floor(n / count) + (j < n % count ? 1 : 0);
        const f = host.frame(u, v, r + rad);
        const along = mix(f.tu, f.tv, Math.cos(psi), Math.sin(psi));
        const across = mix(f.tu, f.tv, -Math.sin(psi), Math.cos(psi));
        for (let k = 0; k < c; k += 1) {
          const off = ((k + 0.5) / c - 0.5) * len;
          out.push({ p: add(f.p, scale(along, off)), n: f.n, ax: [scale(along, (len / (2 * c)) * 1.2), scale(across, rad * 1.15), scale(f.n, rad * 1.15)], k: rand() });
        }
      }
      return out;
    },
  };
}

// sphere(r).
export function sphere(r) {
  const cap = 1 - Math.SQRT1_2; // the share of a sphere beyond 45 degrees of latitude
  return {
    kit: `sphere(${r})`,
    area: 2 * TAU * r * r,
    regions: [
      { name: 'near the poles', area: 2 * TAU * r * r * cap },
      { name: 'around the equator', area: 2 * TAU * r * r * (1 - cap) },
    ],
    crowding: 1 + Math.SQRT2,
    at(a, b, wrong) {
      const sinLat = wrong ? Math.sin(Math.PI * (b - 0.5)) : 2 * b - 1;
      const cosLat = Math.sqrt(Math.max(0, 1 - sinLat * sinLat));
      const n = [cosLat * Math.cos(a * TAU), sinLat, cosLat * Math.sin(a * TAU)];
      return { p: scale(n, r), n, g: Math.abs(sinLat) > Math.SQRT1_2 ? 0 : 1 };
    },
  };
}

// disc(r1, r0), outer radius first; both faces count, as in Splashery's kit.
export function disc(r1, r0 = 0) {
  return {
    kit: `disc(${r1}, ${r0})`,
    area: TAU * (r1 * r1 - r0 * r0),
    at(a, b, wrong, c) {
      const rho = Math.sqrt(r0 * r0 + b * (r1 * r1 - r0 * r0));
      return { p: [rho * Math.sin(a * TAU), 0, rho * Math.cos(a * TAU)], n: [0, c < 0.5 ? 1 : -1, 0] };
    },
  };
}

// cone(r0, r1, h): a frustum from radius r0 at the bottom to r1 at the top, side only.
export function cone(r0, r1, h) {
  const slant = Math.hypot(h, r0 - r1);
  const ny = (r0 - r1) / slant, nr = h / slant;
  const side = (TAU / 2) * (r0 + r1) * slant;
  const rm = (r0 + r1) / 2;
  return {
    kit: `cone(${r0}, ${r1}, ${h})`,
    area: side,
    regions: [
      { name: 'near the tip', area: (side * (r0 + rm)) / (2 * (r0 + r1)) },
      { name: 'near the rim', area: (side * (rm + r1)) / (2 * (r0 + r1)) },
    ],
    crowding: (rm + r1) / (r0 + rm),
    at(a, b, wrong) {
      const t = wrong ? b : (Math.sqrt(r0 * r0 + b * (r1 * r1 - r0 * r0)) - r0) / (r1 - r0);
      const rr = r0 + (r1 - r0) * t;
      const sa = Math.sin(a * TAU), ca = Math.cos(a * TAU);
      return { p: [rr * sa, -h / 2 + h * t, rr * ca], n: unit([sa * nr, ny, ca * nr]), g: t < 0.5 ? 0 : 1 };
    },
  };
}

// tube(curve, radius) along the (2, 3) torus knot, the trefoil, with the curve
// Splashery's own torus-knot toy uses: r = 2 + cos 3a, wound twice around the axis.
export function trefoilTube(radius, size) {
  const M = 2400; // a multiple of 12, so the region boundaries fall on cell edges
  const at3 = (a) => { const rr = 2 + Math.cos(3 * a); return [size * rr * Math.cos(2 * a), -size * Math.sin(3 * a), -size * rr * Math.sin(2 * a)]; };
  const speed = (a) => size * Math.sqrt(9 + 4 * (2 + Math.cos(3 * a)) ** 2); // |c'(a)|, in closed form
  const tangent = (a) => {
    const rr = 2 + Math.cos(3 * a), dr = -3 * Math.sin(3 * a);
    return unit([dr * Math.cos(2 * a) - 2 * rr * Math.sin(2 * a), -3 * Math.cos(3 * a), -(dr * Math.sin(2 * a) + 2 * rr * Math.cos(2 * a))]);
  };
  // Arc length up to each cell edge, by Simpson's rule on the speed.
  const cum = new Float64Array(M + 1);
  let inner = 0;
  for (let i = 0; i < M; i += 1) {
    const a0 = (i / M) * TAU, a1 = ((i + 1) / M) * TAU;
    const d = ((a1 - a0) / 6) * (speed(a0) + 4 * speed((a0 + a1) / 2) + speed(a1));
    cum[i + 1] = cum[i] + d;
    if (Math.cos(3 * ((a0 + a1) / 2)) < 0) inner += d;
  }
  const length = cum[M];
  const paramAt = (s) => {
    let lo = 0, hi = M;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
    return ((lo + (s - cum[lo]) / (cum[lo + 1] - cum[lo])) / M) * TAU;
  };
  // The Frenet frame, and the curvature that says how unevenly the tube's skin stretches.
  const frame = (a) => {
    const h = 1e-4;
    const T = tangent(a), dT = scale(add(tangent(a + h), scale(tangent(a - h), -1)), 1 / (2 * h));
    const N = unit(dT);
    return { T, N, B: cross(T, N), kappa: Math.hypot(dT[0], dT[1], dT[2]) / speed(a) };
  };
  return {
    kit: `tube(trefoil, ${radius})`,
    area: TAU * radius * length, // exact: the curvature term integrates to nothing around the tube
    regions: [
      { name: 'tight inner turns', area: TAU * radius * inner },
      { name: 'wide outer turns', area: TAU * radius * (length - inner) },
    ],
    crowding: (length - inner) / inner,
    at(a, b, wrong) {
      const t = wrong ? a * TAU : paramAt(a * length);
      const f = frame(t);
      let phi = b * TAU;
      if (!wrong) for (let k = 0; k < 8; k += 1) phi -= (phi - radius * f.kappa * Math.sin(phi) - b * TAU) / (1 - radius * f.kappa * Math.cos(phi));
      const n = mix(f.N, f.B, Math.cos(phi), Math.sin(phi));
      return { p: add(at3(t), scale(n, radius)), n, g: Math.cos(3 * t) < 0 ? 0 : 1 };
    },
    frame, length,
  };
}

// ---------- the toys ----------
// Each is a toy on Splashery's shelf (`toy` is its id there), drawn here from
// shapes its kit has. `tone` is how hard the pencil presses; `solid` fills in;
// `open` means the inside of the shape can be seen, so its far wall is drawn too.
const DONUT_R = 1, DONUT_r = 0.42, FROST = 0.035;
export const OBJECTS = [
  {
    id: 'donut', label: 'Donut', toy: 'donut', guide: DONUT_R,
    parts: [
      { name: 'body', as: 'a torus', shape: torus(DONUT_R, DONUT_r) },
      { name: 'frosting', shape: band(DONUT_R, DONUT_r + FROST, 0.95), tone: 0.2 },
      { name: 'sprinkles', shape: cylinders(26, 0.04, 0.2, DONUT_R, DONUT_r + FROST, 1.1), solid: true },
    ],
    wrong: { did: 'placed uniformly in angle', fix: 'Re-placed by area: fewer inside the hole, more around the outside.', says: 'Uniform angles crowd the inside of the hole', formula: '(πR + 2r) / (πR − 2r)' },
  },
  {
    id: 'saturn', label: 'Saturn', toy: 'saturn', tilt: 0.36,
    parts: [
      { name: 'globe', as: 'a sphere', shape: sphere(0.62) },
      { name: 'B ring', shape: disc(1.21, 0.95), tone: 0.24 },
      { name: 'A ring', shape: disc(1.41, 1.26), tone: 0.1 },
    ],
    wrong: { did: 'placed uniformly in latitude and longitude', fix: 'Re-placed by area: fewer at the poles, more around the equator.', says: 'Uniform latitude crowds the poles', formula: '1 + √2, comparing the caps beyond 45° with the band between' },
  },
  {
    id: 'ice-cream', label: 'Ice cream', toy: 'ice-cream', size: 1.3, lift: -0.61,
    parts: [
      { name: 'cone', as: 'a cone', shape: cone(0, 0.46, 1.2), tone: 0.2, open: true }, // open at the top: its inside shows
      { name: 'scoop', shape: sphere(0.5), pos: [0, 0.84, 0] },
      { name: 'cherry', shape: sphere(0.12), pos: [0, 1.42, 0], solid: true },
    ],
    wrong: { did: 'placed uniformly along its height', fix: 'Re-placed by area: fewer at the tip, more toward the rim.', says: 'Uniform height crowds the tip', formula: '3, for a cone that comes to a point' },
  },
  {
    id: 'torus-knot', label: 'Torus knot', toy: 'torus-knot', guide: 0.8,
    parts: [{ name: 'tube', as: 'a tube along a trefoil', shape: trefoilTube(0.25, 0.4) }],
    wrong: { did: "placed uniformly in the curve's parameter", fix: 'Re-placed by arc length, and by area around the tube.', says: "Uniform steps in the curve's parameter crowd the tight inner turns", formula: 'the ratio of the two arc lengths, by quadrature' },
  },
];
export const objectById = (id) => OBJECTS.find((o) => o.id === id) || OBJECTS[0];
export const crowdingOf = (obj) => obj.parts[0].shape.crowding;

// The regions the critic compares: the first part's two, then one per later part.
export function regionsOf(obj, parts = obj.parts.length) {
  const first = obj.parts[0];
  return [
    ...first.shape.regions.map((g) => ({ name: `${first.name}, ${g.name}`, area: g.area })),
    ...obj.parts.slice(1, parts).map((p) => ({ name: p.name, area: p.shape.area })),
  ];
}

// Build the first `parts` parts of a toy. `wrong` places the first part by its
// parameters instead of its area; `floor` rounds every share of the budget down.
export function build(obj, { parts = obj.parts.length, wrong = false, floor = false, seed = 1, lumps = [], budget = BUDGET } = {}) {
  const rand = mulberry32(seed);
  const used = obj.parts.slice(0, parts);
  const areas = used.map((p) => p.shape.area);
  const counts = (floor ? shareFloor : share)(budget, areas);
  const tilt = obj.tilt || 0, size = obj.size || 1, lift = obj.lift || 0;
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const turn = (v) => [v[0] * ct - v[1] * st, v[0] * st + v[1] * ct, v[2]];
  const splats = [];
  used.forEach((part, pi) => {
    const n = counts[pi];
    const rad = Math.sqrt(areas[pi] / Math.max(n, 1) / Math.PI) * 1.3;
    const shift = [rand(), rand(), rand()];
    const made = part.shape.emit
      ? part.shape.emit(n, { rand, rad, shift })
      : Array.from({ length: n }, (_, i) => {
        const q = part.shape.at((halton(i + 1, 2) + shift[0]) % 1, (halton(i + 1, 3) + shift[1]) % 1, wrong && pi === 0, (halton(i + 1, 5) + shift[2]) % 1);
        return surfel(q.p, q.n, rad, rand, { g: q.g });
      });
    for (const s of made) {
      const p = turn(add(s.p, part.pos || [0, 0, 0]));
      s.p = [p[0] * size, p[1] * size + lift, p[2] * size];
      s.n = turn(s.n);
      s.ax = s.ax.map((a) => scale(turn(a), size));
      s.region = pi === 0 ? s.g || 0 : obj.parts[0].shape.regions.length + pi - 1;
      s.tone = part.tone || 0;
      s.solid = !!part.solid;
      s.open = !!part.open;
      splats.push(s);
    }
  });

  // Clay: a lump raised under each red-pencil note.
  for (const s of splats) {
    for (const l of lumps) {
      const d2 = (s.p[0] - l[0]) ** 2 + (s.p[1] - l[1]) ** 2 + (s.p[2] - l[2]) ** 2;
      const h = 0.17 * Math.exp(-d2 / 0.16);
      if (h > 0.002) s.p = add(s.p, scale(s.n, h));
    }
  }

  // Shuffle the drafting order so a revision fills in all over the sheet.
  splats.forEach((s) => { s.order = rand(); });
  return { obj, splats, counts, areas, budget, parts: used.map((p) => ({ name: p.name, kit: p.shape.kit })) };
}

// What the critic inspects: splats per unit area in each region, and the total.
export function measure({ obj, splats, counts }) {
  const regions = regionsOf(obj, counts.length).map((g) => ({ ...g, n: 0 }));
  for (const s of splats) regions[s.region].n += 1;
  const dens = regions.map((g) => g.n / g.area);
  return { regions, total: splats.length, spread: Math.max(...dens) / Math.max(Math.min(...dens), 1e-9) };
}

// Revision letters: A to Z, then AA, AB and on.
export function revLetter(i) {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}
