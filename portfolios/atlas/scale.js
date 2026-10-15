// The plate's measures: pure functions, shared by the page (atlas.js) and
// its exhaustive check (tools/verify.mjs).
//
// z is log10 of the plate's diameter in meters, as in Splashery's Powers of ten.

export const LY = 9.4607e15; // one light-year, meters (IAU)
export const AU = 1.495978707e11; // one astronomical unit, meters
export const C = 299792458; // the speed of light, meters per second
export const Z_MIN = -7.8;
export const Z_MAX = 21.4;

export const UNITS = [
  { m: LY, one: 'light-year', many: 'light-years' },
  { m: AU, one: 'AU', many: 'AU' },
  { m: 1e3, one: 'km', many: 'km' },
  { m: 1, one: 'm', many: 'm' },
  { m: 1e-2, one: 'cm', many: 'cm' },
  { m: 1e-3, one: 'mm', many: 'mm' },
  { m: 1e-6, one: 'µm', many: 'µm' },
  { m: 1e-9, one: 'nm', many: 'nm' },
];

// The largest unit that fits the plate at least three times.
export function unitFor(meters) {
  for (const u of UNITS) if (meters >= 3 * u.m) return u;
  return UNITS[UNITS.length - 1];
}

export const fmtNum = (x) => x.toLocaleString('en-US', { maximumFractionDigits: 2 });

// A value to n significant digits, with thousands separators.
export function sig(x, n = 2) {
  if (x === 0) return '0';
  const k = Math.floor(Math.log10(Math.abs(x)));
  const p = 10 ** (n - 1 - k);
  const v = Math.round(x * p) / p;
  return v.toLocaleString('en-US', { maximumFractionDigits: Math.max(0, n - 1 - k) });
}

// A length in the unit that suits it: "60 AU", "3.5 µm".
export function fmtLen(meters, n = 2) {
  const u = unitFor(meters * 3);
  const v = meters / u.m;
  const text = sig(v, n);
  return `${text} ${text === '1' ? u.one : u.many}`;
}

// The scale bar for zoom z: 1, 2 or 5 times a power of ten of the plate's
// unit, between 12% and 30% of the plate's width.
export function scaleBar(z) {
  const plate = 10 ** z;
  const unit = unitFor(plate);
  const want = (0.3 * plate) / unit.m;
  const k = Math.floor(Math.log10(want));
  const f = want / 10 ** k;
  const lead = f >= 5 ? 5 : f >= 2 ? 2 : 1;
  const value = k >= 0 ? lead * 10 ** k : lead / 10 ** -k;
  const meters = value * unit.m;
  return { value, unit, meters, frac: meters / plate, label: `${fmtNum(value)} ${value === 1 ? unit.one : unit.many}` };
}

const YEAR = 365.25 * 86400;
const SMALL = [
  [1, 's'],
  [1e-3, 'ms'],
  [1e-6, 'µs'],
  [1e-9, 'ns'],
  [1e-12, 'ps'],
  [1e-15, 'fs'],
  [1e-18, 'as'],
];
const WORDS = { s: 'seconds', ms: 'milliseconds', µs: 'microseconds', ns: 'nanoseconds', ps: 'picoseconds', fs: 'femtoseconds', as: 'attoseconds' };

// How long light takes to cross a length: { seconds, text }.
export function lightTime(meters) {
  const t = meters / C;
  let text;
  if (t >= 1.5 * YEAR) text = `${sig(t / YEAR, 2)} years`;
  else if (t >= 2 * 86400) text = `${sig(t / 86400, 2)} days`;
  else if (t >= 2 * 3600) {
    const min = Math.round(t / 60);
    text = `${Math.floor(min / 60)} h ${min % 60} min`;
  } else if (t >= 120) {
    const s = Math.round(t);
    text = `${Math.floor(s / 60)} min ${s % 60} s`;
  } else if (t >= 10) text = `${sig(t, 2)} seconds`;
  else {
    const [m, name] = SMALL.find(([m]) => t >= m) || SMALL[SMALL.length - 1];
    text = `${sig(t / m, 2)} ${WORDS[name]}`;
  }
  return { seconds: t, text };
}

// Smooth step from 0 at a to 1 at b.
export const ramp = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// A window: rises a to b, holds, falls c to d.
export const band = (x, a, b, c, d) => ramp(a, b, x) * (1 - ramp(c, d, x));
