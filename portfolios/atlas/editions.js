// The editions that let a visitor turn their one color, and the color math the page and its
// contrast check (tools/check-contrast.mjs) share. Each edition's other colors are in
// styles.css ("Editions").
//
// The dial turns only the hue, in OKLCH: lightness and chroma stay where the edition sets
// them, and the chroma is low enough that every hue fits inside sRGB at that lightness, so no
// position is clipped and every one keeps the edition's contrast.

export const DEFAULT_EDITION = 'field-color';

export const DIALS = {
  // White line on black, its marks in one color.
  'field-color': { l: 0.76, c: 0.115, hue: 175 },
  // Black ink on laid paper, its marks in one color.
  'one-color': { l: 0.47, c: 0.076, hue: 25 },
};

const D2R = Math.PI / 180;

// OKLCH to linear sRGB (Björn Ottosson's OKLab matrices).
export function linearOf(l, c, hue) {
  const a = c * Math.cos(hue * D2R);
  const b = c * Math.sin(hue * D2R);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

export const inGamut = (rgb) => rgb.every((v) => v >= -1e-6 && v <= 1 + 1e-6);

const encode = (v) => {
  const x = Math.min(1, Math.max(0, v));
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
};

// A dial position as #rrggbb.
export function hexOf(l, c, hue) {
  return `#${linearOf(l, c, hue)
    .map((v) => Math.round(encode(v) * 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

// The most chroma a hue can carry at a lightness and stay inside sRGB.
export function maxChroma(l, hue) {
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(linearOf(l, mid, hue))) lo = mid;
    else hi = mid;
  }
  return lo;
}

// A rough name for a hue, for the dial's spoken value.
export function hueName(hue) {
  const h = ((hue % 360) + 360) % 360;
  const names = [
    [15, 'pink'],
    [45, 'red'],
    [70, 'orange'],
    [95, 'amber'],
    [115, 'yellow'],
    [135, 'yellow-green'],
    [165, 'green'],
    [190, 'sea green'],
    [215, 'cyan'],
    [245, 'sky blue'],
    [275, 'blue'],
    [305, 'violet'],
    [335, 'purple'],
    [360, 'pink'],
  ];
  return names.find(([top]) => h < top)[1];
}
