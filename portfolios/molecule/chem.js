// The chemistry this page draws with: elements, their colors and sizes, the
// two measurements, spelling in element symbols, cubic unit cells and the
// hydrogen wavefunction. Pure functions, shared by main.js and
// tools/verify.mjs (which checks every one of them a second way).

// prettier-ignore
export const ELEMENTS = [
  ["H","Hydrogen"],["He","Helium"],["Li","Lithium"],["Be","Beryllium"],["B","Boron"],["C","Carbon"],
  ["N","Nitrogen"],["O","Oxygen"],["F","Fluorine"],["Ne","Neon"],["Na","Sodium"],["Mg","Magnesium"],
  ["Al","Aluminum"],["Si","Silicon"],["P","Phosphorus"],["S","Sulfur"],["Cl","Chlorine"],["Ar","Argon"],
  ["K","Potassium"],["Ca","Calcium"],["Sc","Scandium"],["Ti","Titanium"],["V","Vanadium"],["Cr","Chromium"],
  ["Mn","Manganese"],["Fe","Iron"],["Co","Cobalt"],["Ni","Nickel"],["Cu","Copper"],["Zn","Zinc"],
  ["Ga","Gallium"],["Ge","Germanium"],["As","Arsenic"],["Se","Selenium"],["Br","Bromine"],["Kr","Krypton"],
  ["Rb","Rubidium"],["Sr","Strontium"],["Y","Yttrium"],["Zr","Zirconium"],["Nb","Niobium"],["Mo","Molybdenum"],
  ["Tc","Technetium"],["Ru","Ruthenium"],["Rh","Rhodium"],["Pd","Palladium"],["Ag","Silver"],["Cd","Cadmium"],
  ["In","Indium"],["Sn","Tin"],["Sb","Antimony"],["Te","Tellurium"],["I","Iodine"],["Xe","Xenon"],
  ["Cs","Cesium"],["Ba","Barium"],["La","Lanthanum"],["Ce","Cerium"],["Pr","Praseodymium"],["Nd","Neodymium"],
  ["Pm","Promethium"],["Sm","Samarium"],["Eu","Europium"],["Gd","Gadolinium"],["Tb","Terbium"],["Dy","Dysprosium"],
  ["Ho","Holmium"],["Er","Erbium"],["Tm","Thulium"],["Yb","Ytterbium"],["Lu","Lutetium"],["Hf","Hafnium"],
  ["Ta","Tantalum"],["W","Tungsten"],["Re","Rhenium"],["Os","Osmium"],["Ir","Iridium"],["Pt","Platinum"],
  ["Au","Gold"],["Hg","Mercury"],["Tl","Thallium"],["Pb","Lead"],["Bi","Bismuth"],["Po","Polonium"],
  ["At","Astatine"],["Rn","Radon"],["Fr","Francium"],["Ra","Radium"],["Ac","Actinium"],["Th","Thorium"],
  ["Pa","Protactinium"],["U","Uranium"],["Np","Neptunium"],["Pu","Plutonium"],["Am","Americium"],["Cm","Curium"],
  ["Bk","Berkelium"],["Cf","Californium"],["Es","Einsteinium"],["Fm","Fermium"],["Md","Mendelevium"],["No","Nobelium"],
  ["Lr","Lawrencium"],["Rf","Rutherfordium"],["Db","Dubnium"],["Sg","Seaborgium"],["Bh","Bohrium"],["Hs","Hassium"],
  ["Mt","Meitnerium"],["Ds","Darmstadtium"],["Rg","Roentgenium"],["Cn","Copernicium"],["Nh","Nihonium"],["Fl","Flerovium"],
  ["Mc","Moscovium"],["Lv","Livermorium"],["Ts","Tennessine"],["Og","Oganesson"],
];

// symbol in lower case -> { z, symbol, name }
export const BY_SYMBOL = new Map(
  ELEMENTS.map(([symbol, name], i) => [symbol.toLowerCase(), { z: i + 1, symbol, name }]),
);

// The familiar CPK (Jmol) colors, by atomic number.
// prettier-ignore
const JMOL = ("FFFFFF D9FFFF CC80FF C2FF00 FFB5B5 909090 3050F8 FF0D0D 90E050 B3E3F5 AB5CF2 8AFF00 BFA6A6 F0C8A0 " +
  "FF8000 FFFF30 1FF01F 80D1E3 8F40D4 3DFF00 E6E6E6 BFC2C7 A6A6AB 8A99C7 9C7AC7 E06633 F090A0 50D050 C88033 " +
  "7D80B0 C28F8F 668F8F BD80E3 FFA100 A62929 5CB8D1 702EB0 00FF00 94FFFF 94E0E0 73C2C9 54B5B5 3B9E9E 248F8F " +
  "0A7D8C 006985 C0C0C0 FFD98F A67573 668080 9E63B5 D47A00 940094 429EB0 57178F 00C900 70D4FF FFFFC7 D9FFC7 " +
  "C7FFC7 A3FFC7 8FFFC7 61FFC7 45FFC7 30FFC7 1FFFC7 00FF9C 00E675 00D452 00BF38 00AB24 4DC2FF 4DA6FF 2194D6 " +
  "267DAB 266696 175487 D0D0E0 FFD123 B8B8D0 A6544D 575961 9E4FB5 AB5C00 754F45 428296 420066 007D00 70ABFA " +
  "00BAFF 00A1FF 008FFF 0080FF 006BFF 545CF2 785CE3 8A4FE3 A136D4 B31FD4 B31FBA B30DA6 BD0D87 C70066 CC0059 " +
  "D1004F D90045 E00038 E6002E EB0026").split(" ");

export function cpk(symbol) {
  const el = BY_SYMBOL.get(String(symbol).toLowerCase());
  const hex = (el && JMOL[el.z - 1]) || "D8D4C8";
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

// A color as chalk: lifted toward white so the darkest elements still read on slate.
export function chalk(symbol, lift = 0.22) {
  const [r, g, b] = cpk(symbol);
  const m = (v) => Math.round(v + (245 - v) * lift);
  return [m(r), m(g), m(b)];
}

// van der Waals radii in ångströms: Bondi (1964), and Mantina et al. (2009) for the
// main-group elements Bondi left out, the same two tables Splashery's molecule viewer uses.
// An element in neither (iron, cobalt) is drawn at 2.0 Å.
// prettier-ignore
export const VDW = {
  H: 1.2, He: 1.4, C: 1.7, N: 1.55, O: 1.52, F: 1.47, Ne: 1.54, Si: 2.1, P: 1.8, S: 1.8, Cl: 1.75, Ar: 1.88,
  As: 1.85, Se: 1.9, Br: 1.85, Kr: 2.02, Te: 2.06, I: 1.98, Xe: 2.16, Li: 1.82, Na: 2.27, Mg: 1.73, K: 2.75,
  Ni: 1.63, Cu: 1.4, Zn: 1.39, Ga: 1.87, Pd: 1.63, Ag: 1.72, Cd: 1.58, In: 1.93, Sn: 2.17, Pt: 1.72, Au: 1.66,
  Hg: 1.55, Tl: 1.96, Pb: 2.02, U: 1.86, Be: 1.53, B: 1.92, Al: 1.84, Ca: 2.31, Ge: 2.11, Rb: 3.03, Sr: 2.49,
  Sb: 2.06, Cs: 3.43, Ba: 2.68, Bi: 2.07,
};
export const DEFAULT_VDW = 2.0;
export const vdw = (el) => VDW[el] ?? DEFAULT_VDW;

// Covalent radii (after Cordero et al. 2008), used only to find bonds by distance in files
// that list none.
// prettier-ignore
export const COVALENT = {
  H: 0.31, B: 0.84, C: 0.76, N: 0.71, O: 0.66, F: 0.57, Si: 1.11, P: 1.07, S: 1.05, Cl: 1.02, Se: 1.2,
  Br: 1.2, I: 1.39,
};
// Metals take no bonds by distance: a file's own bond list is the only word on them.
export const METALS = new Set("Li Na K Rb Cs Be Mg Ca Sr Ba Al Sc Ti V Cr Mn Fe Co Ni Cu Zn Mo Ag Cd Pt Au Hg Pb".split(" "));

// Standard atomic weights, abridged.
// prettier-ignore
export const WEIGHT = {
  H: 1.008, Li: 6.94, B: 10.81, C: 12.011, N: 14.007, O: 15.999, F: 18.998, Na: 22.99, Mg: 24.305, Al: 26.982,
  Si: 28.085, P: 30.974, S: 32.06, Cl: 35.45, K: 39.098, Ca: 40.078, Mn: 54.938, Fe: 55.845, Co: 58.933,
  Ni: 58.693, Cu: 63.546, Zn: 65.38, Se: 78.971, Br: 79.904, I: 126.904, Pt: 195.084,
};

// Bonds by distance: two atoms closer than their covalent radii plus 0.4 Å. (At 0.45 the two
// phosphorus atoms either side of a bridging oxygen in ATP count as bonded; tools/verify.mjs
// holds this rule to the bond lists of every shelf file.) A grid of cells keeps it quick
// for a protein. Returns [i, j, 1] with i < j.
export function bondsByDistance(atoms) {
  const cell = 2.7;
  const grid = new Map();
  const key = (p) => `${Math.floor(p[0] / cell)},${Math.floor(p[1] / cell)},${Math.floor(p[2] / cell)}`;
  atoms.forEach((a, i) => {
    const k = key(a.p);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  });
  const bonds = [];
  atoms.forEach((a, i) => {
    const ra = COVALENT[a.el];
    if (ra === undefined || METALS.has(a.el)) return;
    const [cx, cy, cz] = a.p.map((v) => Math.floor(v / cell));
    for (let x = cx - 1; x <= cx + 1; x++)
      for (let y = cy - 1; y <= cy + 1; y++)
        for (let z = cz - 1; z <= cz + 1; z++)
          for (const j of grid.get(`${x},${y},${z}`) ?? []) {
            if (j <= i) continue;
            const b = atoms[j];
            const rb = COVALENT[b.el];
            if (rb === undefined || METALS.has(b.el) || (a.el === "H" && b.el === "H")) continue;
            const d = distance(a.p, b.p);
            if (d > 0.4 && d < ra + rb + 0.4) bonds.push([i, j, 1]);
          }
  });
  return bonds;
}

// ---- Measuring ------------------------------------------------------------------------

export const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// The angle at b, between a and c, in degrees.
export function angle(a, b, c) {
  const u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
  const d = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v));
  return (Math.acos(Math.max(-1, Math.min(1, d))) * 180) / Math.PI;
}

// The formula in Hill order (carbon, hydrogen, then the rest by symbol) and the molar mass.
export function formula(elements) {
  const n = {};
  for (const e of elements) n[e] = (n[e] || 0) + 1;
  const order = Object.keys(n).sort((a, b) => {
    const rank = (s) => (s === "C" ? 0 : s === "H" && n.C ? 1 : 2);
    return rank(a) - rank(b) || (a < b ? -1 : 1);
  });
  const mass = order.reduce((m, e) => m + (WEIGHT[e] ?? NaN) * n[e], 0);
  return { parts: order.map((e) => [e, n[e]]), mass };
}

// ---- Spelling in element symbols --------------------------------------------------------

// Every way to write a word as a run of element symbols. Each way is a list of symbols.
export function spellings(word) {
  const w = String(word).toLowerCase().replace(/[^a-z]/g, "");
  const memo = new Map();
  const from = (i) => {
    if (i === w.length) return [[]];
    if (memo.has(i)) return memo.get(i);
    const out = [];
    for (const len of [1, 2]) {
      const el = i + len <= w.length && BY_SYMBOL.get(w.slice(i, i + len));
      if (el) for (const rest of from(i + len)) out.push([el.symbol, ...rest]);
    }
    memo.set(i, out);
    return out;
  };
  return w ? from(0) : [];
}

// How far a word gets before no symbol fits: the longest prefix that can be spelled.
export function stuckAt(word) {
  const w = String(word).toLowerCase().replace(/[^a-z]/g, "");
  const ok = new Array(w.length + 1).fill(false);
  ok[0] = true;
  let far = 0;
  for (let i = 0; i < w.length; i++) {
    if (!ok[i]) continue;
    for (const len of [1, 2]) {
      if (i + len <= w.length && BY_SYMBOL.has(w.slice(i, i + len))) {
        ok[i + len] = true;
        far = Math.max(far, i + len);
      }
    }
  }
  return far;
}

// ---- Cubic unit cells --------------------------------------------------------------------

// Lattice constants in ångströms, as Splashery's unit cells use them
// (src/lattice/cells.js, which cites the Crystallography Open Database entries).
export const CRYSTALS = {
  diamond: { name: "Diamond", element: "C", a: 3.56679, source: "COD 9008564", kind: "diamond", neighbors: 4 },
  copper: { name: "Copper", element: "Cu", a: 3.61496, source: "COD 9008468", kind: "fcc", neighbors: 12 },
  iron: { name: "Iron (α)", element: "Fe", a: 2.8665, source: "COD 9008536", kind: "bcc", neighbors: 8 },
};

const FCC = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]]; // prettier-ignore
const BASIS = {
  fcc: FCC,
  bcc: [[0, 0, 0], [0.5, 0.5, 0.5]], // prettier-ignore
  diamond: [...FCC, ...FCC.map(([x, y, z]) => [x + 0.25, y + 0.25, z + 0.25])],
};

// The nearest-neighbor distance of each kind of cell, from its lattice constant.
export const nearest = (c) =>
  c.kind === "diamond" ? (c.a * Math.sqrt(3)) / 4 : c.kind === "fcc" ? c.a / Math.SQRT2 : (c.a * Math.sqrt(3)) / 2;

// Every atom in or on one conventional cell (corners, faces and inside), centered on the
// origin, in ångströms, with the bonds between nearest neighbors.
export function unitCell(key) {
  const c = CRYSTALS[key];
  const seen = new Set();
  const atoms = [];
  for (const [x, y, z] of BASIS[c.kind]) {
    for (let i = 0; i <= 1; i++)
      for (let j = 0; j <= 1; j++)
        for (let k = 0; k <= 1; k++) {
          const f = [x + i, y + j, z + k];
          if (f.some((v) => v > 1 + 1e-9)) continue;
          const id = f.map((v) => v.toFixed(3)).join(",");
          if (seen.has(id)) continue;
          seen.add(id);
          atoms.push({ el: c.element, p: f.map((v) => (v - 0.5) * c.a), frac: f });
        }
  }
  const d = nearest(c);
  const bonds = [];
  for (let i = 0; i < atoms.length; i++)
    for (let j = i + 1; j < atoms.length; j++)
      if (Math.abs(distance(atoms[i].p, atoms[j].p) - d) < 0.01) bonds.push([i, j, 1]);
  const h = c.a / 2;
  const corner = (n) => [n & 1 ? h : -h, n & 2 ? h : -h, n & 4 ? h : -h];
  const edges = [];
  for (let n = 0; n < 8; n++) for (const bit of [1, 2, 4]) if (!(n & bit)) edges.push([corner(n), corner(n | bit)]);
  return { ...c, atoms, bonds, edges, d };
}

// ---- Hydrogen ----------------------------------------------------------------------------

const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));

// Associated Laguerre polynomial L_k^alpha(x), by its three-term recurrence.
function laguerre(k, alpha, x) {
  let prev = 1;
  if (k === 0) return prev;
  let cur = 1 + alpha - x;
  for (let i = 1; i < k; i++) {
    const next = ((2 * i + 1 + alpha - x) * cur - (i + alpha) * prev) / (i + 1);
    prev = cur;
    cur = next;
  }
  return cur;
}

// The radial wavefunction R_nl(r), r in Bohr radii.
export function radial(n, l, r) {
  const rho = (2 * r) / n;
  const norm = Math.sqrt(((2 / n) ** 3 * fact(n - l - 1)) / (2 * n * fact(n + l)));
  return norm * Math.exp(-rho / 2) * rho ** l * laguerre(n - l - 1, 2 * l + 1, rho);
}

// Real spherical harmonics for l = 0..3 at the unit vector (x, y, z), normalized.
const PI = Math.PI;
// prettier-ignore
const Y = {
  "0,0": () => 0.5 * Math.sqrt(1 / PI),
  "1,0": (x, y, z) => Math.sqrt(3 / (4 * PI)) * z,
  "1,1": (x) => Math.sqrt(3 / (4 * PI)) * x,
  "1,-1": (x, y) => Math.sqrt(3 / (4 * PI)) * y,
  "2,0": (x, y, z) => 0.25 * Math.sqrt(5 / PI) * (3 * z * z - 1),
  "2,1": (x, y, z) => 0.5 * Math.sqrt(15 / PI) * x * z,
  "2,-1": (x, y, z) => 0.5 * Math.sqrt(15 / PI) * y * z,
  "2,2": (x, y) => 0.25 * Math.sqrt(15 / PI) * (x * x - y * y),
  "2,-2": (x, y) => 0.5 * Math.sqrt(15 / PI) * x * y,
  "3,0": (x, y, z) => 0.25 * Math.sqrt(7 / PI) * (5 * z * z * z - 3 * z),
  "3,1": (x, y, z) => 0.25 * Math.sqrt(21 / (2 * PI)) * x * (5 * z * z - 1),
  "3,-1": (x, y, z) => 0.25 * Math.sqrt(21 / (2 * PI)) * y * (5 * z * z - 1),
  "3,2": (x, y, z) => 0.25 * Math.sqrt(105 / PI) * (x * x - y * y) * z,
  "3,-2": (x, y, z) => 0.5 * Math.sqrt(105 / PI) * x * y * z,
  "3,3": (x, y) => 0.25 * Math.sqrt(35 / (2 * PI)) * x * (x * x - 3 * y * y),
  "3,-3": (x, y) => 0.25 * Math.sqrt(35 / (2 * PI)) * y * (3 * x * x - y * y),
};
export const harmonic = (l, m, x, y, z) => Y[`${l},${m}`](x, y, z);

// psi(n, l, m) at a point, in Bohr radii.
export function psi(n, l, m, p) {
  const r = Math.hypot(p[0], p[1], p[2]) || 1e-12;
  return radial(n, l, r) * harmonic(l, m, p[0] / r, p[1] / r, p[2] / r);
}

// A small seeded generator, so a given orbital is the same cloud on every visit.
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

// Points drawn from |psi|^2: the radius from the radial distribution r^2 R^2 (by its
// cumulative sum), the direction by rejection against |Y|^2. Each point carries the sign
// of psi there. Returns { points: Float32Array [x, y, z, sign, ...], extent }.
export function sampleOrbital(n, l, m, count, seed = 1) {
  const rand = mulberry(seed * 7919 + n * 100 + l * 10 + (m + 3));
  const rmax = 4 * n * n + 12;
  const steps = 2400;
  const cdf = new Float64Array(steps + 1);
  for (let i = 1; i <= steps; i++) {
    const r = ((i - 0.5) / steps) * rmax;
    cdf[i] = cdf[i - 1] + r * r * radial(n, l, r) ** 2;
  }
  const total = cdf[steps];
  let ymax = 0;
  const dir = () => {
    const z = 2 * rand() - 1;
    const t = 2 * PI * rand();
    const s = Math.sqrt(1 - z * z);
    return [s * Math.cos(t), s * Math.sin(t), z];
  };
  for (let i = 0; i < 4000; i++) ymax = Math.max(ymax, harmonic(l, m, ...dir()) ** 2);
  ymax *= 1.05;
  const points = new Float32Array(count * 4);
  let extent = 0;
  for (let k = 0; k < count; k++) {
    const u = rand() * total;
    let lo = 0;
    let hi = steps;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) lo = mid;
      else hi = mid;
    }
    const r = ((lo + rand()) / steps) * rmax;
    let d;
    let y;
    do {
      d = dir();
      y = harmonic(l, m, ...d);
    } while (rand() * ymax > y * y);
    points[k * 4] = d[0] * r;
    points[k * 4 + 1] = d[1] * r;
    points[k * 4 + 2] = d[2] * r;
    points[k * 4 + 3] = Math.sign(radial(n, l, r) * y) || 1;
    extent = Math.max(extent, r);
  }
  return { points, extent, total: (total * rmax) / steps };
}

// ---- Poses ---------------------------------------------------------------------------------

// The principal axes of a set of points: the rows of a rotation that lays the longest
// spread along x, the next along y and the thinnest along z (toward the room), so a flat
// molecule lies flat on the board. Jacobi rotations on the 3 x 3 covariance.
export function flatPose(points) {
  const n = points.length || 1;
  const c = [0, 1, 2].map((k) => points.reduce((s, p) => s + p[k], 0) / n);
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; // prettier-ignore
  for (const p of points)
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) A[i][j] += ((p[i] - c[i]) * (p[j] - c[j])) / n;
  const V = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; // prettier-ignore
  for (let sweep = 0; sweep < 24; sweep++) {
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]]) { // prettier-ignore
      if (Math.abs(A[p][q]) < 1e-12) continue;
      const th = 0.5 * Math.atan2(2 * A[p][q], A[q][q] - A[p][p]);
      const [co, si] = [Math.cos(th), Math.sin(th)];
      for (let k = 0; k < 3; k++) {
        const [akp, akq] = [A[k][p], A[k][q]];
        A[k][p] = co * akp - si * akq;
        A[k][q] = si * akp + co * akq;
      }
      for (let k = 0; k < 3; k++) {
        const [apk, aqk] = [A[p][k], A[q][k]];
        A[p][k] = co * apk - si * aqk;
        A[q][k] = si * apk + co * aqk;
      }
      for (let k = 0; k < 3; k++) {
        const [vkp, vkq] = [V[k][p], V[k][q]];
        V[k][p] = co * vkp - si * vkq;
        V[k][q] = si * vkp + co * vkq;
      }
    }
  }
  const order = [0, 1, 2].sort((i, j) => A[j][j] - A[i][i]);
  const x = order.map(() => 0).map((_, k) => V[k][order[0]]);
  const y = [0, 1, 2].map((k) => V[k][order[1]]);
  const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
  return { rot: [...x, ...y, ...z], spread: order.map((i) => Math.sqrt(Math.max(0, A[i][i]))) };
}

// Rotation matrices (row-major, 9 numbers) to unit quaternions and back, and the arc between two.
export function quatFromRot(m) {
  const t = m[0] + m[4] + m[8];
  let q;
  if (t > 0) {
    const s = Math.sqrt(t + 1) * 2;
    q = [(m[7] - m[5]) / s, (m[2] - m[6]) / s, (m[3] - m[1]) / s, s / 4];
  } else if (m[0] > m[4] && m[0] > m[8]) {
    const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2;
    q = [s / 4, (m[1] + m[3]) / s, (m[2] + m[6]) / s, (m[7] - m[5]) / s];
  } else if (m[4] > m[8]) {
    const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2;
    q = [(m[1] + m[3]) / s, s / 4, (m[5] + m[7]) / s, (m[2] - m[6]) / s];
  } else {
    const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2;
    q = [(m[2] + m[6]) / s, (m[5] + m[7]) / s, s / 4, (m[3] - m[1]) / s];
  }
  return q;
}
export function rotFromQuat([x, y, z, w]) {
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
  ]; // prettier-ignore
}
export function slerp(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const s = d < 0 ? -1 : 1;
  d = Math.min(1, Math.abs(d));
  const th = Math.acos(d);
  const [ka, kb] = th < 1e-5 ? [1 - t, t] : [Math.sin((1 - t) * th) / Math.sin(th), Math.sin(t * th) / Math.sin(th)];
  const q = a.map((v, i) => ka * v + kb * s * b[i]);
  const n = Math.hypot(...q) || 1;
  return q.map((v) => v / n);
}

// ---- The skeletal formula ---------------------------------------------------------------------

const SUB = "₀₁₂₃₄₅₆₇₈₉";
export const sub = (n) => String(n).replace(/\d/g, (d) => SUB[d]);

// How a chemist writes each atom of a small molecule. A carbon is a corner with nothing
// written; any other element is its symbol with its hydrogens beside it; a hydrogen is
// folded into the atom it sits on. A molecule of three heavy atoms or fewer is written out
// in full, carbons and all. For each atom: { show, text, h, q, heavy, lone }.
export function skeleton(atoms, bonds) {
  const near = atoms.map(() => []);
  for (const [i, j] of bonds) (near[i].push(j), near[j].push(i));
  const full = atoms.filter((a) => a.el !== "H").length <= 3;
  // Charges are written only where the file accounts for all of them. The dictionary leaves
  // a metal's own charge blank (heme's iron, cisplatin's platinum) while charging the atoms
  // around it, and half of that story would mislead.
  const charged = !atoms.some((a) => METALS.has(a.el));
  return atoms.map((a, i) => {
    const heavy = near[i].filter((j) => atoms[j].el !== "H");
    const h = near[i].length - heavy.length;
    if (a.el === "H") {
      // Written only when it sits on no heavier atom: H–H, or a hydrogen on its own.
      const show = heavy.length === 0;
      return { show, text: show ? "H" : "", h: 0, q: "", heavy: near[i] };
    }
    const c = charged ? a.charge || 0 : 0;
    const q = c ? (Math.abs(c) > 1 ? Math.abs(c) : "") + (c > 0 ? "+" : "−") : "";
    const hs = h ? "H" + (h > 1 ? sub(h) : "") : "";
    if (!heavy.length) {
      const first = ["C", "N", "P", "Si", "B"].includes(a.el);
      return { show: true, text: a.el, lone: first ? a.el + hs : hs + a.el, h, q, heavy };
    }
    return { show: true, text: a.el !== "C" || c !== 0 || full ? a.el : "", h, q, heavy };
  });
}
