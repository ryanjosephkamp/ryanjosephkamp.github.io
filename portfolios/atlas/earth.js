// Where a place on the Earth is in space, shared by the page (atlas.js) and its
// check (tools/verify.mjs).

// For a Julian day, a function from latitude and east longitude (degrees) to the
// place's direction from the Earth's center, in J2000 equatorial coordinates.
// `A` is Splashery's astronomy module (assets/astro.js).
export function surface(A, jd) {
  const P = A.precession(jd); // J2000 to the equator of the date, row by row
  const turn = A.gmst(jd);
  return (lat, lon) => {
    const d = A.fromRaDec(turn + lon, lat);
    // The transpose takes the date's equator back to J2000.
    return [P[0] * d[0] + P[3] * d[1] + P[6] * d[2], P[1] * d[0] + P[4] * d[1] + P[7] * d[2], P[2] * d[0] + P[5] * d[1] + P[8] * d[2]];
  };
}

export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const unit = (v) => {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
};
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// A camera that swings from one view (axis toward the eye, up on the page) to another:
// t = 0 is the first, t = 1 the second. Returns { right, up, axis }, an orthonormal frame.
export function swing(from, to, t) {
  const axis = unit(mix(from.axis, to.axis, t));
  const lean = mix(from.up, to.up, t);
  const k = dot(lean, axis);
  const up = unit([lean[0] - k * axis[0], lean[1] - k * axis[1], lean[2] - k * axis[2]]);
  return { right: cross(up, axis), up, axis };
}
