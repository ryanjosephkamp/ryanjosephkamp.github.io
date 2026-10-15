// Lane Night sky: where things are in the sky, for a time and a place. Pure math, no page or
// network (the toy and the tests both use it). Sources (docs/evidence/night-sky.json):
//
// - Sidereal time: the IAU 1982 expression for Greenwich mean sidereal time, as in Meeus,
//   "Astronomical Algorithms" (2nd ed., 1998), eq. 12.4.
// - Precession from J2000 to the date: Meeus eq. 21.2 (the IAU 1976 angles zeta, z and theta).
// - The planets, the Earth-Moon barycenter and so the Sun: E. M. Standish, "Keplerian Elements
//   for Approximate Positions of the Major Planets" (JPL Solar System Dynamics), Table 1
//   (1800 to 2050), with its method (Kepler's equation, the J2000 ecliptic, then equatorial).
// - The Moon: the low-precision lunar series of the Astronomical Almanac (section D), good to
//   about 0.3 degrees in longitude, then corrected for the observer's place on the Earth.
// - Planet brightness: the magnitude formulas in Meeus, chapter 41.
//
// Angles are in degrees unless named "rad". Times are JavaScript milliseconds (UTC).
// Directions are unit vectors. Equatorial: x toward the March equinox, z toward the north
// celestial pole. Horizontal (ENU): x east, y north, z up.

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
export const J2000 = 2451545.0;

export const wrap360 = (a) => ((a % 360) + 360) % 360;
const sin = (d) => Math.sin(d * D2R);
const cos = (d) => Math.cos(d * D2R);

export function julianDay(ms) {
  return ms / 86400000 + 2440587.5;
}

// Julian centuries from J2000.
export const centuries = (jd) => (jd - J2000) / 36525;

// Greenwich mean sidereal time in degrees (Meeus 12.4). UT1 is taken as UTC (under a second).
export function gmst(jd) {
  const T = centuries(jd);
  return wrap360(
    280.46061837 + 360.98564736629 * (jd - J2000) + 0.000387933 * T * T - (T * T * T) / 38710000,
  );
}

// How far the sidereal time moves in one solar day (degrees): the stars' shift at a fixed clock time.
export const SOLAR_DAY_LST = 0.98564736629;

// Local mean sidereal time in degrees, for an east longitude in degrees.
export const lst = (jd, lonEast) => wrap360(gmst(jd) + lonEast);

// ---- Vectors and matrices --------------------------------------------------------------------

export function fromRaDec(raDeg, decDeg) {
  const c = cos(decDeg);
  return [c * cos(raDeg), c * sin(raDeg), sin(decDeg)];
}

export function toRaDec(v) {
  const r = Math.hypot(v[0], v[1], v[2]);
  return { ra: wrap360(Math.atan2(v[1], v[0]) * R2D), dec: Math.asin(v[2] / r) * R2D };
}

export const mulMV = (m, v) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

export function mulMM(a, b) {
  const o = new Array(9);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      o[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return o;
}

const rotX = (d) => [1, 0, 0, 0, cos(d), -sin(d), 0, sin(d), cos(d)];
const rotZ = (d) => [cos(d), -sin(d), 0, sin(d), cos(d), 0, 0, 0, 1];
const rotY = (d) => [cos(d), 0, sin(d), 0, 1, 0, -sin(d), 0, cos(d)];

// J2000 equatorial to the mean equator and equinox of the date (Meeus 21.2/21.3).
export function precession(jd) {
  const T = centuries(jd);
  const s = 1 / 3600;
  const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) * s;
  const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) * s;
  const theta = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) * s;
  // R = Rz(z) Ry(-theta) Rz(zeta), acting on column vectors.
  return mulMM(rotZ(z), mulMM(rotY(-theta), rotZ(zeta)));
}

// Equatorial of the date to horizontal (ENU) for a latitude and local sidereal time.
export function horizonMatrix(latDeg, lstDeg) {
  const sl = sin(latDeg);
  const cl = cos(latDeg);
  const sL = sin(lstDeg);
  const cL = cos(lstDeg);
  // x1 = cos(dec) cos(H), y1 = -cos(dec) sin(H), z1 = sin(dec) (H the hour angle).
  // east = y1, north = cos(lat) z1 - sin(lat) x1, up = sin(lat) z1 + cos(lat) x1.
  return [
    -sL, cL, 0,
    -sl * cL, -sl * sL, cl,
    cl * cL, cl * sL, sl,
  ]; // prettier-ignore
}

export function altAzOf(enu) {
  const r = Math.hypot(enu[0], enu[1], enu[2]);
  return {
    alt: Math.asin(enu[2] / r) * R2D,
    az: wrap360(Math.atan2(enu[0], enu[1]) * R2D), // from north, through east
  };
}

// J2000 equatorial straight to horizontal for a time and place.
export function skyMatrix(jd, latDeg, lonEast) {
  return mulMM(horizonMatrix(latDeg, lst(jd, lonEast)), precession(jd));
}

// Altitude and azimuth of a J2000 position (a star) at a time and place.
export function starAltAz(raDeg, decDeg, ms, latDeg, lonEast) {
  const jd = julianDay(ms);
  return altAzOf(mulMV(skyMatrix(jd, latDeg, lonEast), fromRaDec(raDeg, decDeg)));
}

// ---- The planets (JPL Table 1) ----------------------------------------------------------------

// a (au), e, I, L, long. peri., long. node (degrees), each with its rate per century.
export const ELEMENTS = {
  mercury: [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593, 0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
  venus: [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255, 0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418],
  emb: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0, 0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0],
  mars: [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891, 0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
  jupiter: [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909, -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
  saturn: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448, -0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
  uranus: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503, -0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
  neptune: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574, 0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664],
}; // prettier-ignore

// The years Table 1 is made for; outside them the positions drift (the toy says so).
export const TABLE_YEARS = [1800, 2050];

const OBLIQUITY_J2000 = 23.43928;

// Heliocentric position (au) in the J2000 ecliptic (JPL's recipe, steps 1 to 5).
export function heliocentric(name, jd) {
  const el = ELEMENTS[name];
  const T = centuries(jd);
  const a = el[0] + el[6] * T;
  const e = el[1] + el[7] * T;
  const I = el[2] + el[8] * T;
  const L = el[3] + el[9] * T;
  const peri = el[4] + el[10] * T;
  const node = el[5] + el[11] * T;
  const w = peri - node;
  let M = wrap360(L - peri);
  if (M > 180) M -= 360;
  // Kepler's equation by Newton's method, in degrees as JPL writes it.
  const eStar = e * R2D;
  let E = M + eStar * sin(M);
  for (let k = 0; k < 12; k++) {
    const dM = M - (E - eStar * sin(E));
    const dE = dM / (1 - e * cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  const xp = a * (cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * sin(E);
  const cw = cos(w), sw = sin(w), cO = cos(node), sO = sin(node), cI = cos(I), sI = sin(I); // prettier-ignore
  return [
    (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    sw * sI * xp + cw * sI * yp,
  ];
}

const eclToEq = (v) => {
  const c = cos(OBLIQUITY_J2000);
  const s = sin(OBLIQUITY_J2000);
  return [v[0], c * v[1] - s * v[2], s * v[1] + c * v[2]];
};

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (v) => Math.hypot(v[0], v[1], v[2]);
const LIGHT_DAYS_PER_AU = 0.0057755183;

// A planet or the Sun seen from the Earth's center: J2000 equatorial direction, distances (au),
// phase angle (degrees) and magnitude. The Earth is taken at the Earth-Moon barycenter (at most
// about 4,700 km off), and the planet's light-time is allowed for.
export function planet(name, jd) {
  const earth = heliocentric("emb", jd);
  if (name === "sun") {
    const g = [-earth[0], -earth[1], -earth[2]];
    return { name, eq: eclToEq(g), delta: len(g), r: 0, phase: 0, mag: -26.74 };
  }
  let p = heliocentric(name, jd);
  let g = sub(p, earth);
  const tau = len(g) * LIGHT_DAYS_PER_AU;
  p = heliocentric(name, jd - tau);
  g = sub(p, earth);
  const r = len(p);
  const delta = len(g);
  const R = len(earth);
  const cosI = (r * r + delta * delta - R * R) / (2 * r * delta);
  const i = Math.acos(Math.max(-1, Math.min(1, cosI))) * R2D;
  return { name, eq: eclToEq(g), delta, r, phase: i, mag: planetMag(name, r, delta, i) };
}

// Meeus chapter 41 (the Astronomical Almanac's older formulas). Saturn's rings are left out.
export function planetMag(name, r, delta, i) {
  const k = 5 * Math.log10(r * delta);
  switch (name) {
    case "mercury":
      return -0.42 + k + 0.038 * i - 0.000273 * i * i + 0.000002 * i * i * i;
    case "venus":
      return -4.4 + k + 0.0009 * i + 0.000239 * i * i - 0.00000065 * i * i * i;
    case "mars":
      return -1.52 + k + 0.016 * i;
    case "jupiter":
      return -9.4 + k + 0.005 * i;
    case "saturn":
      return -8.88 + k;
    case "uranus":
      return -7.19 + k;
    case "neptune":
      return -6.87 + k;
    default:
      return 0;
  }
}

// ---- The Moon (the Astronomical Almanac's low-precision series) -------------------------------

// Geocentric ecliptic longitude and latitude of the date (degrees) and horizontal parallax.
export function moonEcliptic(jd) {
  const T = centuries(jd);
  const lon =
    218.32 +
    481267.881 * T +
    6.29 * sin(135.0 + 477198.87 * T) -
    1.27 * sin(259.3 - 413335.36 * T) +
    0.66 * sin(235.7 + 890534.22 * T) +
    0.21 * sin(269.9 + 954397.74 * T) -
    0.19 * sin(357.5 + 35999.05 * T) -
    0.11 * sin(186.5 + 966404.03 * T);
  const lat =
    5.13 * sin(93.3 + 483202.02 * T) +
    0.28 * sin(228.2 + 960400.89 * T) -
    0.28 * sin(318.3 + 6003.15 * T) -
    0.17 * sin(217.6 - 407332.21 * T);
  const par =
    0.9508 +
    0.0518 * cos(135.0 + 477198.87 * T) +
    0.0095 * cos(259.3 - 413335.36 * T) +
    0.0078 * cos(235.7 + 890534.22 * T) +
    0.0028 * cos(269.9 + 954397.74 * T);
  return { lon: wrap360(lon), lat, parallax: par };
}

// The Moon's direction in the equator of the date, seen from the Earth's center, and its
// distance in Earth radii.
export function moonGeocentric(jd) {
  const { lon, lat, parallax } = moonEcliptic(jd);
  const eps = 23.439291 - 0.0130042 * centuries(jd);
  const v = [cos(lat) * cos(lon), cos(lat) * sin(lon), sin(lat)];
  const eq = [v[0], cos(eps) * v[1] - sin(eps) * v[2], sin(eps) * v[1] + cos(eps) * v[2]];
  return { eq, dist: 1 / sin(parallax) };
}

// ---- Everything at once ------------------------------------------------------------------------

export const PLANETS = ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune"];

// The Sun, the Moon and the planets for a time and place: horizontal (ENU) directions, altitude
// and azimuth, and the Moon's phase. `matrix` takes J2000 equatorial to horizontal (the stars).
// `lstOverride` (degrees) turns the sky to another sidereal time than the moment's own: the
// toy's "same time each day" speeds hold the clock while the days go by.
export function sky(ms, latDeg, lonEast, lstOverride = null) {
  const jd = julianDay(ms);
  const P = precession(jd);
  const lstDeg = Number.isFinite(lstOverride) ? wrap360(lstOverride) : lst(jd, lonEast);
  const H = horizonMatrix(latDeg, lstDeg);
  const matrix = mulMM(H, P);
  const bodies = {};
  for (const name of ["sun", ...PLANETS]) {
    const b = planet(name, jd);
    const enu = mulMV(matrix, b.eq);
    const n = len(enu);
    const dir = [enu[0] / n, enu[1] / n, enu[2] / n];
    bodies[name] = { ...b, ...toRaDec(mulMV(P, b.eq)), enu: dir, ...altAzOf(dir) };
  }
  // The Moon, from the observer's place (its parallax is up to a degree).
  const m = moonGeocentric(jd);
  const lat = latDeg;
  const obs = [cos(lat) * cos(lstDeg), cos(lat) * sin(lstDeg), sin(lat)]; // Earth radii
  const topo = sub(
    m.eq.map((x) => x * m.dist),
    obs,
  );
  const enu = mulMV(H, topo);
  const n = len(enu);
  const moonDir = [enu[0] / n, enu[1] / n, enu[2] / n];
  // Its phase: the angle Sun-Moon-Earth from the elongation (the Sun is far enough away).
  const sunDir = bodies.sun.enu;
  const elong = Math.acos(Math.max(-1, Math.min(1, dot(moonDir, sunDir)))) * R2D;
  const sunAu = bodies.sun.delta;
  const moonAu = (n * 6378.14) / 149597870.7;
  const phaseAngle = Math.atan2(sunAu * sin(elong), moonAu - sunAu * cos(elong)) * R2D;
  const illum = (1 + cos(phaseAngle)) / 2;
  // Waxing while the Moon is east of the Sun (its longitude ahead of the Sun's).
  const sunLon = toEclipticLon(planet("sun", jd).eq);
  const waxing = wrap360(moonEcliptic(jd).lon - sunLon) < 180;
  bodies.moon = {
    name: "moon",
    enu: moonDir,
    ...altAzOf(moonDir),
    ...toRaDec(topo),
    distKm: n * 6378.14,
    phase: phaseAngle,
    illum,
    waxing,
    elong,
    mag: -12.73 + 0.026 * Math.abs(phaseAngle) + 4e-9 * phaseAngle ** 4,
  };
  return { jd, lst: lstDeg, matrix, bodies };
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function toEclipticLon(eq) {
  const c = cos(OBLIQUITY_J2000);
  const s = sin(OBLIQUITY_J2000);
  const y = c * eq[1] + s * eq[2];
  return wrap360(Math.atan2(y, eq[0]) * R2D);
}

// The phase's name from the illuminated fraction and whether it is waxing.
export function phaseName(illum, waxing) {
  if (illum < 0.03) return "New Moon";
  if (illum > 0.97) return "Full Moon";
  if (Math.abs(illum - 0.5) < 0.04) return waxing ? "First quarter" : "Last quarter";
  if (illum < 0.5) return waxing ? "Waxing crescent" : "Waning crescent";
  return waxing ? "Waxing gibbous" : "Waning gibbous";
}

// ---- Star colors -------------------------------------------------------------------------------

// Effective temperature (K) from the B-V color index: Ballesteros (2012), EPL 97, 34008.
export function bvToKelvin(bv) {
  return 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
}

// sRGB (0..1) of a black body at that temperature, normalized to its brightest channel: a fit to
// the CIE 1931 colors of the Planckian locus (Tanner Helland's approximation), gently desaturated
// toward white the way stars look to the eye.
export function kelvinToRgb(k) {
  const t = k / 100;
  let r, g, b;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  const c = [r, g, b].map((v) => Math.max(0, Math.min(255, v)) / 255);
  const m = Math.max(...c);
  return c.map((v) => 0.35 + 0.65 * (v / m));
}
