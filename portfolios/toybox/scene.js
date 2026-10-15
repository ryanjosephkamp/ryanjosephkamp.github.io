// Toy Box: the parts that have a right answer. Pure functions, shared by the page
// (main.js) and by the checks (tools/verify.mjs).

export const TOYS = ['name', 'donut', 'knot', 'planet', 'photo'];

// Paint colors, 3 bits in a link.
export const PAINTS = [
  [255, 61, 139], [255, 214, 10], [255, 253, 245], [255, 106, 31],
  [106, 44, 255], [27, 16, 54], [150, 240, 255], [232, 28, 46],
];
export const PAINT_NAMES = ['pink', 'yellow', 'white', 'orange', 'violet', 'ink', 'sky', 'red'];

export const STROKE_MAX = 180; // paint dabs a link carries
export const RANGE = 1.6; // toy space runs from -RANGE to RANGE on each axis
export const CUT = 3; // a splat is switched off this many sigmas from its middle

// One splat's opacity. r2 is the squared distance from its middle, in units of
// the cut-off radius, so the quad it is drawn on runs from -1 to 1.
export function splatAlpha(r2) {
  return r2 > 1 ? 0 : Math.exp(-0.5 * CUT * CUT * r2);
}

// The share of a whole (uncut) Gaussian's paint that lands inside the cut-off.
export const INK_KEPT = 1 - Math.exp(-0.5 * CUT * CUT);

// Covariance of one flat splat: half-widths a and b (cut-off radii), turned by th.
export function covariance(a, b, th) {
  const c = Math.cos(th), s = Math.sin(th);
  const sa = (a / CUT) ** 2, sb = (b / CUT) ** 2;
  return [c * c * sa + s * s * sb, c * s * (sa - sb), s * s * sa + c * c * sb];
}

export const q8 = (v) => Math.max(0, Math.min(255, Math.round(((v + RANGE) / (2 * RANGE)) * 255)));
export const d8 = (b) => (b / 255) * 2 * RANGE - RANGE;

const TAU = Math.PI * 2;
export const yawToByte = (yaw) => Math.round((((yaw % TAU) + TAU) % TAU) / TAU * 256) & 255;
export const byteToYaw = (b) => (b / 256) * TAU;
export const pitchToByte = (p) => Math.max(0, Math.min(255, Math.round((p / Math.PI + 0.5) * 255)));
export const byteToPitch = (b) => (b / 255 - 0.5) * Math.PI;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64_OF = Object.fromEntries([...B64].map((ch, i) => [ch, i]));

export function toBase64Url(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    out += B64[a >> 2] + B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (i + 1 < bytes.length) out += B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (i + 2 < bytes.length) out += B64[c & 63];
  }
  return out;
}

export function fromBase64Url(text) {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null;
  const bytes = new Uint8Array(Math.floor((text.length * 3) / 4));
  let n = 0;
  for (let i = 0; i < text.length; i += 4) {
    const a = B64_OF[text[i]], b = B64_OF[text[i + 1]], c = B64_OF[text[i + 2]], d = B64_OF[text[i + 3]];
    bytes[n++] = (a << 2) | (b >> 4);
    if (c !== undefined) bytes[n++] = ((b & 15) << 4) | (c >> 2);
    if (d !== undefined) bytes[n++] = ((c & 3) << 6) | d;
  }
  return bytes;
}

// A scene is: which toy, whether it has been dropped, how it is turned, and the
// paint. Four header bytes, then four bytes for each dab (x, y, z, color).
export function encodeScene({ toy, drop, yawByte, pitchByte, strokes }) {
  const kept = strokes.slice(-STROKE_MAX);
  const bytes = new Uint8Array(4 + kept.length * 4);
  bytes[0] = 1;
  bytes[1] = (toy & 7) | (drop ? 8 : 0);
  bytes[2] = yawByte & 255;
  bytes[3] = pitchByte & 255;
  kept.forEach((s, i) => bytes.set([s.x, s.y, s.z, s.c & 7], 4 + i * 4));
  return toBase64Url(bytes);
}

export function decodeScene(text) {
  const bytes = fromBase64Url(text);
  if (!bytes || bytes.length < 4 || bytes[0] !== 1 || (bytes.length - 4) % 4) return null;
  const toy = bytes[1] & 7;
  if (toy >= TOYS.length || bytes[1] >> 4) return null;
  const strokes = [];
  for (let i = 4; i < bytes.length; i += 4) {
    if (bytes[i + 3] > 7) return null;
    strokes.push({ x: bytes[i], y: bytes[i + 1], z: bytes[i + 2], c: bytes[i + 3] });
  }
  if (strokes.length > STROKE_MAX) return null;
  return { toy, drop: Boolean(bytes[1] & 8), yawByte: bytes[2], pitchByte: bytes[3], strokes };
}
