// The math behind the light box, with no DOM: the scans, their slices, the cutaway, the
// maximum-intensity picture, the window, and the back projection. main.js draws with these;
// verify.mjs checks them.

// The scans, as their contact sheets store them: nz slices of nx x ny voxels, `cols` to a row,
// `mm` to a voxel on every axis. Voxel z runs down the scan. Both are the samples in Splashery's
// volume viewer, and air, dense and top are what that viewer's own statistics give for each
// (Otsu's method on the scan's histogram; top is the 99.9th percentile).
export const SCANS = {
  walnut: {
    id: 'walnut',
    noun: 'walnut',
    title: 'WALNUT 1 · X-RAY CT',
    nx: 113,
    ny: 115,
    nz: 142,
    cols: 12,
    mm: 0.3,
    digits: 1,
    air: 77,
    dense: 168,
    top: 228,
    viewW: 132, // how wide the turning pictures are, in voxels
    sheet: 'assets/walnut-sheet.png',
    start: [56, 57, 70],
    turn: 0.6, // where the cutaway rests, so its carved corner faces the viewer
    bar: [10, '10 mm'],
    parts: ['air', 'soft part', 'shell'],
    // "The real thing": the same scan in Splashery's own embed player.
    real: {
      heading: 'The same walnut, in Splashery',
      text: "Everything above is this page's own drawing of the scan. This one is Splashery's: its walnut toy in the embed player, the same CT scan drawn as volume splats. It turns when idle and you can orbit it. In the playground you can cut it, or show only its dense shell.",
      title: "Splashery: a walnut's CT scan as volume splats",
      embed: 'embed/?toy=walnut-ct&labs=1&theme=dark&zoom=0.6',
    },
  },
  gar: {
    id: 'gar',
    noun: 'gar',
    title: 'GAR LARVA, 12.8 MM · MICRO-CT',
    nx: 118,
    ny: 192,
    nz: 126,
    cols: 14,
    mm: 0.01768,
    digits: 2,
    air: 70,
    dense: 144,
    top: 250,
    viewW: 216,
    sheet: 'assets/gar-sheet.png',
    start: [59, 100, 58],
    turn: 1.05,
    bar: [0.5, '0.5 mm'],
    parts: ['background', 'soft tissue', 'densest part'],
    real: {
      heading: "The young gar's head, in Splashery",
      text: "Everything above is this page's own drawing of the scan. This one is Splashery's: its volume viewer in the embed player, with the gar sample open, the same micro-CT drawn as volume splats in the viewer's own colors. It turns when idle and you can orbit it. In the playground the viewer adds window and level, a cut plane on each axis and a maximum-intensity picture.",
      title: "Splashery: a young gar's head, micro-CT, as volume splats",
      // A scene link: the volume viewer toy with the gar sample chosen.
      scene: { id: 'volume-viewer', options: { source: 'gar' }, camera: { yaw: 0.6, pitch: 0.25, roll: 0, distance: 5.2 } },
    },
  },
};

// Where a scan's "real thing" opens: Splashery's embed player, by a toy id or by a scene link
// (docs/SCENE-SCHEMA.md in the Splashery repository: "j." and the scene as base64url JSON).
export const SPLASHERY = 'https://ryanjosephkamp.github.io/splashery/';
export function embedUrl(real) {
  if (real.embed) return SPLASHERY + real.embed;
  const { id, options, camera } = real.scene;
  const off = (o) => ({ on: false, ...o });
  const scene = {
    app: 'splashery',
    version: 3,
    createdAt: '2026-10-14T12:00:00.000Z',
    seed: 1,
    toy: { kind: 'builtin', id, options },
    look: { background: 'page', theme: 'dark', accent: 'auto', splatScale: 1, exposure: 1 },
    effects: {
      poke: off({ strength: 0.6, wobble: 0.5 }),
      wind: off({ strength: 0.55, direction: 0 }),
      dissolve: off({ spread: 0.55, speed: 0.5 }),
      drop: off({ bounce: 0.45, scatter: 0.5 }),
      magnet: off({ strength: 0.7, radius: 0.45 }),
      twist: off({ amount: 0.5, wobble: 0.3, axis: 'y' }),
      slice: off({ position: 0, sweep: 0.35, axis: 'x' }),
      paint: off({ size: 0.5, splash: 0.5, color: '#e63b2e' }),
    },
    paint: { stamps: [] },
    camera,
    autoplay: { turntable: true, effect: 'none' },
  };
  const bytes = new TextEncoder().encode(JSON.stringify(scene));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${SPLASHERY}embed/?theme=dark#s=j.${b64}`;
}

// The three windows, named as Splashery's volume viewer names its presets.
export const presets = (s) => ({
  full: { label: 'Full range', lo: s.air, hi: 255 },
  soft: { label: 'Soft tissue', lo: s.air, hi: s.dense },
  bone: { label: 'Bone', lo: s.dense, hi: s.top },
});

export const sheetSize = (s) => {
  const rows = Math.ceil(s.nz / s.cols);
  return { width: s.cols * s.nx, height: rows * s.ny, rows };
};

// The contact sheet's pixels (one byte per pixel, or RGBA with step 4) to one volume.
export function sheetToVolume(s, pixels, sheetWidth, step = 1) {
  const { nx, ny, nz, cols } = s;
  const vol = new Uint8Array(nx * ny * nz);
  for (let z = 0; z < nz; z++) {
    const ox = (z % cols) * nx;
    const oy = Math.floor(z / cols) * ny;
    for (let y = 0; y < ny; y++) {
      const row = ((oy + y) * sheetWidth + ox) * step;
      const out = nx * (y + ny * z);
      for (let x = 0; x < nx; x++) vol[out + x] = pixels[row + x * step];
    }
  }
  return vol;
}

// The three cuts. Each is a picture w x h read out of the volume at index k along its axis.
//   top    looks down the scan: x across, y down the picture, k = z
//   front  x across, z down, k = y
//   side   y across, z down, k = x
const AXES = { top: [0, 1, 2], front: [0, 2, 1], side: [1, 2, 0] };
export const CUT_LABELS = { top: 'Top down', front: 'Front to back', side: 'Side to side' };
export function cutShape(s, name) {
  const n = [s.nx, s.ny, s.nz];
  const [across, down, along] = AXES[name];
  return { w: n[across], h: n[down], n: n[along], across, down, along };
}

export function cut(s, vol, name, k, out) {
  const c = cutShape(s, name);
  const stride = [1, s.nx, s.nx * s.ny];
  const sa = stride[c.across];
  const sd = stride[c.down];
  const base = k * stride[c.along];
  out = out || new Uint8Array(c.w * c.h);
  for (let j = 0; j < c.h; j++) {
    let p = base + j * sd;
    const o = j * c.w;
    for (let i = 0; i < c.w; i++, p += sa) out[o + i] = vol[p];
  }
  return out;
}

// ---- The maximum-intensity picture ----------------------------------------------------------

// The scan's own voxels (density 1 or more), listed once, slice by slice: where each one is
// and how dense. The picture that looks through the whole scan walks this list, not the air.
export function solids(s, vol) {
  const { nx, ny, nz } = s;
  let n = 0;
  for (let i = 0; i < vol.length; i++) if (vol[i]) n++;
  const x = new Uint8Array(n);
  const y = new Uint8Array(n);
  const v = new Uint8Array(n);
  const start = new Uint32Array(nz + 1);
  let k = 0;
  for (let z = 0, i = 0; z < nz; z++) {
    start[z] = k;
    for (let yy = 0; yy < ny; yy++)
      for (let xx = 0; xx < nx; xx++, i++)
        if (vol[i]) {
          x[k] = xx;
          y[k] = yy;
          v[k] = vol[i];
          k++;
        }
  }
  start[nz] = k;
  return { x, y, v, start };
}

// The densest voxel along every ray, seen from the side with the scan turned by theta about
// its upright axis. viewW x nz pixels. Each voxel lands on the one ray that passes within half
// a voxel of its center.
export function mip(s, solid, theta, out) {
  const { nx, ny, nz, viewW } = s;
  out = out || new Uint8Array(viewW * nz);
  out.fill(0);
  const c = Math.cos(theta);
  const sn = Math.sin(theta);
  const ux = new Float32Array(nx);
  const uy = new Float32Array(ny);
  for (let i = 0; i < nx; i++) ux[i] = (i - (nx - 1) / 2) * c + viewW / 2;
  for (let j = 0; j < ny; j++) uy[j] = (j - (ny - 1) / 2) * sn;
  const { x, y, v, start } = solid;
  for (let z = 0; z < nz; z++) {
    const row = z * viewW;
    for (let k = start[z], end = start[z + 1]; k < end; k++) {
      const u = Math.floor(ux[x[k]] + uy[y[k]]);
      if (u < 0 || u >= viewW) continue;
      if (v[k] > out[row + u]) out[row + u] = v[k];
    }
  }
  return out;
}

// ---- The cutaway -----------------------------------------------------------------------------

// The scan as a solid, seen from a little above, with one corner carved away: everything to
// the right of, in front of and above the point where the three cuts cross. The three faces
// the carving leaves are the three cuts themselves.

export const TILT = 0.38; // how far the picture looks down from above, in radians
export const BLOCK = 8;

export function viewShape(s) {
  const W = s.viewW;
  const H = Math.round(s.nz * Math.cos(TILT) + W * Math.sin(TILT));
  const T = Math.ceil(Math.hypot(s.nx, s.ny, s.nz) / 2) + 1; // rays run from -T to T
  return { W, H, T };
}

// The picture's own directions, in voxel axes: across it, down it, and into it.
export function camera(theta) {
  const c = Math.cos(theta);
  const sn = Math.sin(theta);
  const ce = Math.cos(TILT);
  const se = Math.sin(TILT);
  return { r: [c, sn, 0], d: [sn * se, -c * se, ce], f: [-sn * ce, c * ce, se] };
}

// The densest voxel in every block of 8 x 8 x 8, so a ray can step over empty blocks.
export function blocks(s, vol) {
  const { nx, ny, nz } = s;
  const gx = Math.ceil(nx / BLOCK);
  const gy = Math.ceil(ny / BLOCK);
  const gz = Math.ceil(nz / BLOCK);
  const max = new Uint8Array(gx * gy * gz);
  for (let z = 0, i = 0; z < nz; z++)
    for (let y = 0; y < ny; y++)
      for (let x = 0; x < nx; x++, i++) {
        const b = (x >> 3) + gx * ((y >> 3) + gy * (z >> 3));
        if (vol[i] > max[b]) max[b] = vol[i];
      }
  return { gx, gy, gz, max };
}

// What each ray meets first: hit[i] is -1 for nothing, the voxel's index for a surface, and
// -2 - index for a voxel on one of the three cut faces. A voxel is solid when its density is
// above iso; the carved corner is x > pos[0], y < pos[1], z < pos[2]. Rays are sampled one
// voxel apart, at whole steps from -T.
export function cutaway(s, vol, grid, theta, pos, iso, hit) {
  const { nx, ny, nz } = s;
  const { W, H, T } = viewShape(s);
  const { r, d, f } = camera(theta);
  hit = hit || new Int32Array(W * H);
  const cx = (nx - 1) / 2;
  const cy = (ny - 1) / 2;
  const cz = (nz - 1) / 2;
  const [px, py, pz] = pos;
  const [fx, fy, fz] = f;
  const { gx, gy, max } = grid;
  const lim = [nx, ny, nz];
  for (let w = 0; w < H; w++) {
    const b = w + 0.5 - H / 2;
    for (let u = 0; u < W; u++) {
      const a = u + 0.5 - W / 2;
      const ox = cx + a * r[0] + b * d[0];
      const oy = cy + a * r[1] + b * d[1];
      const oz = cz + a * r[2] + b * d[2];
      // Where the ray is inside the box of voxels.
      let t0 = -T;
      let t1 = T;
      const o = [ox, oy, oz];
      for (let k = 0; k < 3; k++) {
        if (Math.abs(f[k]) < 1e-9) {
          if (o[k] < -0.5 || o[k] >= lim[k] - 0.5) t1 = -Infinity;
          continue;
        }
        const ta = (-0.5 - o[k]) / f[k];
        const tb = (lim[k] - 0.5 - o[k]) / f[k];
        t0 = Math.max(t0, Math.min(ta, tb));
        t1 = Math.min(t1, Math.max(ta, tb));
      }
      let found = -1;
      if (t0 <= t1) {
        let n = Math.max(0, Math.ceil(t0 + T) - 1);
        const end = Math.min(2 * T, Math.floor(t1 + T) + 1);
        while (n <= end) {
          const t = n - T;
          const xf = ox + t * fx;
          const yf = oy + t * fy;
          const zf = oz + t * fz;
          const x = Math.floor(xf + 0.5);
          const y = Math.floor(yf + 0.5);
          const z = Math.floor(zf + 0.5);
          if (x < 0 || x >= nx || y < 0 || y >= ny || z < 0 || z >= nz || (x > px && y < py && z < pz)) {
            n++;
            continue;
          }
          if (max[(x >> 3) + gx * ((y >> 3) + gy * (z >> 3))] <= iso) {
            // Nothing solid in this block: step to the first sample past it.
            let far = Infinity;
            if (fx > 1e-9) far = Math.min(far, (((x >> 3) << 3) + 7.5 - xf) / fx);
            else if (fx < -1e-9) far = Math.min(far, (((x >> 3) << 3) - 0.5 - xf) / fx);
            if (fy > 1e-9) far = Math.min(far, (((y >> 3) << 3) + 7.5 - yf) / fy);
            else if (fy < -1e-9) far = Math.min(far, (((y >> 3) << 3) - 0.5 - yf) / fy);
            if (fz > 1e-9) far = Math.min(far, (((z >> 3) << 3) + 7.5 - zf) / fz);
            else if (fz < -1e-9) far = Math.min(far, (((z >> 3) << 3) - 0.5 - zf) / fz);
            n += Math.max(1, Math.ceil(far - 1e-6));
            continue;
          }
          const i = x + nx * (y + ny * z);
          if (vol[i] > iso) {
            // On a cut face if the sample before this one was in the carved corner.
            const x0 = Math.floor(xf - fx + 0.5);
            const y0 = Math.floor(yf - fy + 0.5);
            const z0 = Math.floor(zf - fz + 0.5);
            const carved = x0 < nx && y0 >= 0 && z0 >= 0 && x0 > px && y0 < py && z0 < pz;
            found = carved ? -2 - i : i;
            break;
          }
          n++;
        }
      }
      hit[w * W + u] = found;
    }
  }
  return hit;
}

// Paint what the rays met. Cut faces print flat, exactly as the cuts do (lut: one RGBA color
// per density). Surfaces are lit from the upper left: the slope of the density there is the
// surface's tilt, and its tone comes from the density just under it (tones: 256 RGB colors
// from the window's bottom to its top). The light is averaged over each pixel's neighbors, so
// a noisy surface reads as a surface.
let scratch = { n: 0 };
export function shade(s, vol, theta, hit, lo, hi, tones, lut, bg, out) {
  const { nx, ny, nz } = s;
  const { W, H, T } = viewShape(s);
  const { r, d, f } = camera(theta);
  const plane = nx * ny;
  if (scratch.n !== W * H) scratch = { n: W * H, lit: new Float32Array(W * H), tone: new Uint8Array(W * H), dim: new Float32Array(W * H) };
  const { lit, tone, dim } = scratch;
  let L = [0, 1, 2].map((k) => -(0.5 * r[k] + 0.6 * d[k] + 0.62 * f[k]));
  const ll = Math.hypot(...L);
  L = L.map((v) => v / ll);
  const cx = (nx - 1) / 2;
  const cy = (ny - 1) / 2;
  const cz = (nz - 1) / 2;
  const at = (x, y, z) =>
    vol[(x < 0 ? 0 : x >= nx ? nx - 1 : x) + nx * ((y < 0 ? 0 : y >= ny ? ny - 1 : y) + ny * (z < 0 ? 0 : z >= nz ? nz - 1 : z))];
  const span = hi - lo || 1;
  for (let i = 0; i < W * H; i++) {
    const h = hit[i];
    if (h < 0) {
      lit[i] = -1; // not a surface
      continue;
    }
    const z = Math.floor(h / plane);
    const rem = h - z * plane;
    const y = Math.floor(rem / nx);
    const x = rem - y * nx;
    // The slope of the density, over the 26 voxels around this one (a Sobel filter): it points
    // into the solid, so the surface faces the other way.
    let gx = 0;
    let gy = 0;
    let gz = 0;
    if (x > 0 && x < nx - 1 && y > 0 && y < ny - 1 && z > 0 && z < nz - 1) {
      // Away from the edges of the scan the 26 neighbors are plain offsets from this voxel.
      for (let c = -1; c <= 1; c++)
        for (let e = -1; e <= 1; e++) {
          const wgt = (2 - Math.abs(c)) * (2 - Math.abs(e));
          const a = h + c * nx + e * plane;
          const b = h + c + e * plane;
          const g = h + c + e * nx;
          gx += wgt * (vol[a + 1] - vol[a - 1]);
          gy += wgt * (vol[b + nx] - vol[b - nx]);
          gz += wgt * (vol[g + plane] - vol[g - plane]);
        }
    } else {
      for (let c = -1; c <= 1; c++)
        for (let e = -1; e <= 1; e++) {
          const wgt = (2 - Math.abs(c)) * (2 - Math.abs(e));
          gx += wgt * (at(x + 1, y + c, z + e) - at(x - 1, y + c, z + e));
          gy += wgt * (at(x + c, y + 1, z + e) - at(x + c, y - 1, z + e));
          gz += wgt * (at(x + c, y + e, z + 1) - at(x + c, y + e, z - 1));
        }
    }
    const len = Math.hypot(gx, gy, gz);
    // Where the density barely slopes there is no surface to tilt: light it evenly.
    const sure = Math.min(1, Math.max(0, (len - 60) / 500));
    const facing = len ? -(gx * L[0] + gy * L[1] + gz * L[2]) / len : 0;
    lit[i] = 0.5 + (((0.5 + 0.5 * facing) ** 1.7) - 0.5) * sure;
    let under = vol[h];
    for (const step of [1.5, 3]) {
      const v = at(Math.round(x + f[0] * step), Math.round(y + f[1] * step), Math.round(z + f[2] * step));
      if (v > under) under = v;
    }
    tone[i] = Math.round(255 * (0.58 + 0.42 * Math.min(1, Math.max(0, (under - lo) / span))));
    dim[i] = 1 - 0.3 * (((x - cx) * f[0] + (y - cy) * f[1] + (z - cz) * f[2] + T) / (2 * T));
  }
  for (let w = 0, i = 0; w < H; w++)
    for (let u = 0; u < W; u++, i++) {
      const h = hit[i];
      if (h === -1) {
        out[i] = bg;
        continue;
      }
      if (h < -1) {
        out[i] = lut[vol[-2 - h]];
        continue;
      }
      let sum = lit[i] * 2;
      let n = 2;
      for (let dw = -1; dw <= 1; dw++)
        for (let du = -1; du <= 1; du++) {
          const ww = w + dw;
          const uu = u + du;
          if ((!dw && !du) || ww < 0 || ww >= H || uu < 0 || uu >= W) continue;
          const v = lit[ww * W + uu];
          if (v < 0) continue;
          sum += v;
          n++;
        }
      const k = (0.14 + 0.86 * (sum / n)) * dim[i];
      const t = tone[i] * 3;
      out[i] = 0xff000000 | ((tones[t + 2] * k) << 16) | ((tones[t + 1] * k) << 8) | (tones[t] * k);
    }
  return out;
}

// ---- The window ---------------------------------------------------------------------------

export function histogram(vol) {
  const h = new Uint32Array(256);
  for (let i = 0; i < vol.length; i++) h[vol[i]]++;
  return h;
}

// upTo[v] = how many of the scan's own voxels (those denser than air) have a density of v or
// less.
export function runningCount(hist, air) {
  const upTo = new Uint32Array(256);
  let sum = 0;
  for (let v = air + 1; v < 256; v++) {
    sum += hist[v];
    upTo[v] = sum;
  }
  return upTo;
}

// What a window (lo, hi) does to those voxels: how many print black (at or below lo), how
// many print white (at or above hi), and how many keep a gray of their own.
export function windowCounts(upTo, lo, hi) {
  const total = upTo[255];
  const black = upTo[lo];
  const white = total - upTo[hi - 1];
  return { black, white, gray: total - black - white, total };
}

// 256 colors for a window: [r, g, b, 255] per density. ramp(t) gives a color for 0..1.
export function lookup(lo, hi, ramp) {
  const lut = new Uint8ClampedArray(1024);
  for (let v = 0; v < 256; v++) {
    const t = v <= lo ? 0 : v >= hi ? 1 : (v - lo) / (hi - lo);
    const [r, g, b] = ramp(t);
    lut[v * 4] = r;
    lut[v * 4 + 1] = g;
    lut[v * 4 + 2] = b;
    lut[v * 4 + 3] = 255;
  }
  return lut;
}

// ---- How a CT sees: shadows, then filtered back projection ---------------------------------

// How many detector bins a shadow of a w x h picture needs: its diagonal and a margin, odd.
export const binsFor = (w, h) => {
  const n = Math.ceil(Math.hypot(w, h)) + 3;
  return n % 2 ? n : n + 1;
};

// One X-ray shadow of a picture (w x h densities) from angle theta: the sum along every ray.
export function shadow(pic, w, h, theta, out) {
  const bins = out.length;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const mid = (bins - 1) / 2;
  for (let b = 0; b < bins; b++) {
    const r = b - mid;
    let sum = 0;
    for (let t = 0; t < bins; t++) {
      const d = t - mid;
      const x = Math.round(cx + r * c - d * s);
      const y = Math.round(cy + r * s + d * c);
      if (x >= 0 && x < w && y >= 0 && y < h) sum += pic[y * w + x];
    }
    out[b] = sum;
  }
  return out;
}

// The ramp filter (Ram-Lak), applied to one shadow.
export function rampFilter(p, out) {
  const bins = p.length;
  for (let i = 0; i < bins; i++) {
    let sum = p[i] / 4;
    for (let k = 1; i - k >= 0 || i + k < bins; k += 2) {
      const wgt = -1 / (Math.PI * Math.PI * k * k);
      if (i - k >= 0) sum += p[i - k] * wgt;
      if (i + k < bins) sum += p[i + k] * wgt;
    }
    out[i] = sum;
  }
  return out;
}

// Smear one filtered shadow back across the picture, adding to acc.
export function smear(acc, w, h, theta, q) {
  const bins = q.length;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const mid = (bins - 1) / 2;
  for (let y = 0; y < h; y++) {
    let r = -cx * c + (y - cy) * s + mid;
    const o = y * w;
    for (let x = 0; x < w; x++, r += c) {
      const i = Math.floor(r);
      if (i < 0 || i >= bins - 1) continue;
      const f = r - i;
      acc[o + x] += q[i] + (q[i + 1] - q[i]) * f;
    }
  }
}

// Every shadow of a picture, one for each whole degree of half a turn, raw and filtered.
// Computed once for a slice; rebuild() then only has to smear.
export const TURN = 180;
export function shadowSet(pic, w, h) {
  const bins = binsFor(w, h);
  const raw = new Float32Array(TURN * bins);
  const filtered = new Float32Array(TURN * bins);
  for (let a = 0; a < TURN; a++) {
    const p = raw.subarray(a * bins, (a + 1) * bins);
    shadow(pic, w, h, (a * Math.PI) / TURN, p);
    rampFilter(p, filtered.subarray(a * bins, (a + 1) * bins));
  }
  return { raw, filtered, bins };
}

// Which of the 180 shadows a rebuild from `views` evenly spaced views uses.
export const viewAngle = (i, views) => Math.floor((i * TURN) / views);

// The picture rebuilt from `views` evenly spaced shadows: densities of about 0..255.
export function rebuild(set, w, h, views) {
  const acc = new Float32Array(w * h);
  const { bins } = set;
  for (let i = 0; i < views; i++) {
    const a = viewAngle(i, views);
    smear(acc, w, h, (a * Math.PI) / TURN, set.filtered.subarray(a * bins, (a + 1) * bins));
  }
  const scale = Math.PI / views;
  for (let i = 0; i < acc.length; i++) acc[i] *= scale;
  return acc;
}
