// Molecule: the chalk stages (a molecule, a unit cell, an orbital), the stockroom, the
// isomers and the element speller. The chemistry is in chem.js and the file readers in
// formats.js; tools/verify.mjs checks both.

import * as chem from "./chem.js";
import { parse } from "./formats.js";
import { SHELF, ENTRIES, FIRST } from "./data.js";

const TAU = Math.PI * 2;
const still = matchMedia("(prefers-reduced-motion: reduce)");
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const YELLOW = "#ffe45c";
const CHALK = "#efece2";
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const tone = (c, k) => c.map((v) => (k >= 0 ? v + (255 - v) * k : v * (1 + k)));
const elementName = (el) => chem.BY_SYMBOL.get(el.toLowerCase())?.name.toLowerCase() ?? el;

// The slate's tooth: a fixed grain knocked out of everything drawn, so chalk stays
// chalk while the molecule moves under it.
let grain;
function grainPattern(ctx) {
  if (!grain) {
    grain = document.createElement("canvas");
    grain.width = grain.height = 256;
    const g = grain.getContext("2d");
    const img = g.createImageData(256, 256);
    const rand = chem.mulberry(11);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rand();
      img.data[i + 3] = v > 0.55 ? (v - 0.55) * 330 : 0;
    }
    g.putImageData(img, 0, 0);
  }
  return ctx.createPattern(grain, "repeat");
}

// One shaded chalk ball per element and per depth, drawn once and stamped for every atom:
// a protein is a few thousand stamps a frame.
const LEVELS = 6;
const stamps = new Map();
function stamp(el, level) {
  const key = el + level;
  let c = stamps.get(key);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = c.height = 96;
  const g = c.getContext("2d");
  const depth = 0.62 + 0.38 * (level / (LEVELS - 1));
  const col = tone(chem.chalk(el), (depth - 1) * 0.55);
  const r = 45;
  const grad = g.createRadialGradient(48 - r * 0.36, 48 - r * 0.42, r * 0.05, 48, 48, r);
  grad.addColorStop(0, rgb(tone(col, 0.5)));
  grad.addColorStop(0.55, rgb(col));
  grad.addColorStop(1, rgb(tone(col, -0.5)));
  g.fillStyle = grad;
  g.beginPath();
  g.arc(48, 48, r, 0, TAU);
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = `rgba(245,243,232,${0.35 + 0.35 * depth})`;
  g.stroke();
  stamps.set(key, c);
  return c;
}

// The chalks of a chain: helix, strand, coil, and the backbone of a nucleic acid.
const SS = { h: [[255, 122, 138], 1.15], s: [[255, 228, 92], 1.0], c: [[239, 236, 226], 0.34], n: [[126, 178, 255], 0.8], r: [[239, 236, 226], 0.3] }; // "r": a base's rung

// ---- A stage: one canvas, one thing to hold --------------------------------------------

class Stage {
  constructor(canvas, { onMeasure, spin = true } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onMeasure = onMeasure || (() => {});
    this.rot = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    this.turn(-0.5, 0.35);
    this.scene = { atoms: [], bonds: [], extent: 1 };
    this.ball = 0.28; // how much of its van der Waals radius an atom is drawn with
    this.ballTo = 0.28;
    this.short = 0; // 0: every atom; 1: the shorthand (a cartoon, or a skeletal formula)
    this.shortTo = 0;
    this.picks = [];
    this.cursor = -1;
    this.hover = -1; // the atom under a mouse, before any tap
    this.over = false;
    this.vel = [0, 0];
    this.spin = spin && !still.matches;
    this.pose = null;
    this.visible = false;
    this.raf = 0;
    this.bind();
    // Size it now, not at the first painted frame: a tap can arrive before one.
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
    new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      this.kick();
    }).observe(canvas);
    document.fonts?.ready.then(() => this.kick());
  }

  // Turn about the screen's vertical axis by ax and its horizontal axis by ay (radians).
  turn(ax, ay) {
    const [cx, sx, cy, sy] = [Math.cos(ax), Math.sin(ax), Math.cos(ay), Math.sin(ay)];
    const m = [cx, 0, sx, sx * sy, cy, -cx * sy, -sx * cy, sy, cx * cy];
    const r = this.rot;
    const o = new Array(9);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) o[i * 3 + j] = m[i * 3] * r[j] + m[i * 3 + 1] * r[3 + j] + m[i * 3 + 2] * r[6 + j];
    this.rot = o;
  }

  // Swing to a pose over a moment (at once, under reduced motion).
  poseTo(rot, seconds = 0.7) {
    this.spin = false;
    this.vel = [0, 0];
    if (still.matches) {
      this.rot = rot.slice();
      this.draw();
      return;
    }
    this.pose = { from: chem.quatFromRot(this.rot), to: chem.quatFromRot(rot), t: 0, seconds };
    this.kick();
  }

  setScene(scene, keepView = false) {
    this.scene = scene;
    this.picks = [];
    this.cursor = -1;
    this.hover = -1;
    this.pose = null;
    if (!keepView) this.vel = [0, 0];
    this.report();
    this.draw();
    this.kick();
  }

  // "sticks", "fill", or "short" for the shorthand.
  setMode(mode) {
    this.shortTo = mode === "short" ? 1 : 0;
    this.ballTo = mode === "fill" ? 1 : 0.28;
    if (still.matches) [this.ball, this.short] = [this.ballTo, this.shortTo];
    this.picks = [];
    this.report();
    this.draw();
    this.kick();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.dpr = dpr;
    this.pattern = null;
    this.draw();
  }

  kick() {
    if (!this.raf && this.visible) this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  frame(t) {
    this.raf = 0;
    const dt = Math.min(0.05, (t - (this.last || t)) / 1000);
    this.last = t;
    let moving = false;
    if (this.pose) {
      const p = this.pose;
      p.t = Math.min(1, p.t + dt / p.seconds);
      this.rot = chem.rotFromQuat(chem.slerp(p.from, p.to, p.t * p.t * (3 - 2 * p.t)));
      if (p.t >= 1) this.pose = null;
      moving = true;
    }
    // The idle turn waits while a mouse is over the stage, so an atom holds still to be tapped.
    if (this.spin && !this.dragging && !this.over) (this.turn(dt * 0.35, 0), (moving = true));
    if (!this.dragging && Math.hypot(...this.vel) > 0.0004) {
      this.turn(this.vel[0], this.vel[1]);
      this.vel = this.vel.map((v) => v * 0.93);
      moving = true;
    }
    for (const k of ["ball", "short"]) {
      const to = this[k + "To"];
      if (Math.abs(this[k] - to) > 0.004) ((this[k] += (to - this[k]) * Math.min(1, dt * 9)), (moving = true));
      else this[k] = to;
    }
    this.draw();
    if (moving && this.visible) this.kick();
    else this.last = 0;
  }

  // How large an atom is drawn right now. In a cartoon the chain's atoms go and whatever
  // the chain holds (a heme, a biotin, a zinc) stays as balls and sticks.
  ballOf(a) {
    if (!this.short) return this.ball;
    return this.scene.kind === "chain" && a.het ? this.ball * (1 - this.short) + 0.28 * this.short : this.ball * (1 - this.short);
  }

  // Which atoms can be picked: every one, or only what the shorthand still shows.
  pickable(i) {
    const s = this.scene;
    if (!this.shortTo) return true;
    if (s.kind === "chain") return s.atoms[i].het || s.traced.has(i);
    if (s.kind === "small") return s.sk[i].show;
    return true;
  }

  project() {
    const { atoms, extent } = this.scene;
    const r = this.rot;
    // Balls and sticks leave room to spare, so they are drawn a little closer.
    const room = atoms.length ? 1.3 - 0.3 * Math.min(1, this.ball) : 1;
    const s = ((Math.min(this.w, this.h) / 2 - 14) / extent) * room;
    this.scale = s;
    const cx = this.w / 2;
    const cy = this.h / 2;
    this.at = (p) => {
      const x = r[0] * p[0] + r[1] * p[1] + r[2] * p[2];
      const y = r[3] * p[0] + r[4] * p[1] + r[5] * p[2];
      const z = r[6] * p[0] + r[7] * p[1] + r[8] * p[2];
      const k = 1 + (z / extent) * 0.16;
      return [cx + x * s * k, cy - y * s * k, z, k];
    };
    this.proj = atoms.map((a) => this.at(a.p));
  }

  draw() {
    if (!this.w) return;
    const { ctx, scene } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = "source-over";
    this.project();
    const { at, proj, scale } = this;
    const near = (z) => Math.max(0, Math.min(1, (z / scene.extent + 1) / 2));
    const depth = (z) => 0.62 + 0.38 * near(z);
    this.depth = depth;
    ctx.lineCap = "round";

    // The cell's outline, behind everything.
    if (scene.edges) {
      ctx.setLineDash([7, 7]);
      ctx.lineWidth = 1.6;
      for (const [a, b] of scene.edges) {
        const [p, q] = [at(a), at(b)];
        ctx.strokeStyle = `rgba(239,236,226,${0.25 + 0.3 * depth((p[2] + q[2]) / 2)})`;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(q[0], q[1]);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // A cloud of dots (the orbital).
    if (scene.points) {
      const pts = scene.points;
      const size = Math.max(1.3, this.w / 330);
      // Dots share a fill by sign and by depth: twelve fills a frame, not one per dot.
      const fills = Array.from({ length: 2 * LEVELS }, () => []);
      for (let i = 0; i < pts.length; i += 4) {
        if (scene.cut && pts[i + 2] > 0) continue;
        const p = at([pts[i], pts[i + 1], pts[i + 2]]);
        fills[(pts[i + 3] > 0 ? 0 : LEVELS) + Math.round(near(p[2]) * (LEVELS - 1))].push(p[0], p[1]);
      }
      fills.forEach((xy, n) => {
        const a = 0.28 + 0.7 * ((n % LEVELS) / (LEVELS - 1));
        ctx.fillStyle = n < LEVELS ? `rgba(126,178,255,${a})` : `rgba(255,150,178,${a})`;
        for (let i = 0; i < xy.length; i += 2) ctx.fillRect(xy[i], xy[i + 1], size, size);
      });
      ctx.fillStyle = CHALK;
      const o = at([0, 0, 0]);
      ctx.beginPath();
      ctx.arc(o[0], o[1], 2.5, 0, TAU);
      ctx.fill();
    }

    // Everything solid, back to front.
    const items = [];
    const balls = scene.atoms.map((a) => this.ballOf(a));
    scene.atoms.forEach((a, i) => {
      if (balls[i] > 0.02) items.push({ z: proj[i][2], atom: i });
    });
    for (const [i, j, order] of scene.bonds) {
      const b = Math.min(balls[i], balls[j]);
      if (b <= 0.02 || b >= 0.8) continue;
      const m = at(scene.atoms[i].p.map((v, k) => (v + scene.atoms[j].p[k]) / 2));
      items.push({ z: (proj[i][2] + m[2]) / 2, from: proj[i], to: m, el: scene.atoms[i].el, order });
      items.push({ z: (proj[j][2] + m[2]) / 2, from: proj[j], to: m, el: scene.atoms[j].el, order });
    }
    if (this.short > 0.02 && scene.kind === "chain") {
      for (const rb of scene.ribbons)
        for (let i = 0; i < rb.length - 1; i++) {
          const [p, q] = [at(rb[i].p), at(rb[i + 1].p)];
          items.push({ z: (p[2] + q[2]) / 2, from: p, to: q, ss: rb[i].ss });
        }
      for (const [a, b] of scene.rungs) {
        const [p, q] = [at(a), at(b)];
        items.push({ z: (p[2] + q[2]) / 2, from: p, to: q, ss: "r" });
      }
    }
    items.sort((a, b) => a.z - b.z);
    for (const it of items) {
      if (it.atom !== undefined) {
        const a = scene.atoms[it.atom];
        const [x, y, z, k] = proj[it.atom];
        const size = Math.max(2, a.r * balls[it.atom] * scale * k) * (96 / 45);
        ctx.drawImage(stamp(a.el, Math.round(near(z) * (LEVELS - 1))), x - size / 2, y - size / 2, size, size);
      } else if (it.ss) {
        const [c, wide] = SS[it.ss];
        ctx.strokeStyle = rgb(tone(c, (depth(it.z) - 1) * 0.6), this.short);
        ctx.lineWidth = Math.max(2, wide * scale * 1.5);
        ctx.beginPath();
        ctx.moveTo(it.from[0], it.from[1]);
        ctx.lineTo(it.to[0], it.to[1]);
        ctx.stroke();
      } else {
        const wdt = Math.max(1.5, 0.2 * scale);
        const dx = it.to[0] - it.from[0];
        const dy = it.to[1] - it.from[1];
        const len = Math.hypot(dx, dy) || 1;
        const off = it.order === 2 ? wdt * 0.75 : 0;
        ctx.strokeStyle = rgb(tone(chem.chalk(it.el), (depth(it.z) - 1) * 0.55));
        ctx.lineWidth = it.order === 2 ? wdt * 0.7 : wdt;
        for (const side of off ? [-1, 1] : [0]) {
          const ox = (-dy / len) * off * side;
          const oy = (dx / len) * off * side;
          ctx.beginPath();
          ctx.moveTo(it.from[0] + ox, it.from[1] + oy);
          ctx.lineTo(it.to[0] + ox, it.to[1] + oy);
          ctx.stroke();
        }
      }
    }
    if (this.short > 0.02 && scene.kind === "small") this.drawSkeleton(this.short);

    // The grain of the slate, knocked out of the chalk.
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = this.pattern || (this.pattern = grainPattern(ctx));
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = "source-over";

    this.drawRuler();
    this.drawMeasure();
  }

  // The skeletal formula: a line for every bond between heavier atoms, a symbol for every
  // atom that is not carbon, its hydrogens written beside it on the side away from its bonds.
  drawSkeleton(alpha) {
    const { ctx, scene, proj, scale, depth } = this;
    const sk = scene.sk;
    const fs = Math.max(13, Math.min(30, scale * 0.62));
    const gap = (i) => (sk[i].text ? fs * 0.56 : 0);
    ctx.lineWidth = Math.max(1.8, fs * 0.11);
    for (const [i, j, order] of scene.bonds) {
      if (!sk[i].show || !sk[j].show) continue;
      const [a, b] = [proj[i], proj[j]];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const [g0, g1] = [gap(i), gap(j)];
      if (len - g0 - g1 < 2) continue;
      const [ux, uy] = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
      const [x0, y0, x1, y1] = [a[0] + ux * g0, a[1] + uy * g0, b[0] - ux * g1, b[1] - uy * g1];
      ctx.strokeStyle = `rgba(239,236,226,${alpha * (0.4 + 0.6 * depth((a[2] + b[2]) / 2))})`;
      const off = fs * 0.24;
      for (const k of order === 3 ? [-1, 0, 1] : order === 2 ? [-0.5, 0.5] : [0]) {
        ctx.beginPath();
        ctx.moveTo(x0 - uy * off * k, y0 + ux * off * k);
        ctx.lineTo(x1 - uy * off * k, y1 + ux * off * k);
        ctx.stroke();
      }
    }
    ctx.textBaseline = "middle";
    const big = `700 ${fs}px "Shantell Sans", sans-serif`;
    const small = `700 ${fs * 0.66}px "Shantell Sans", sans-serif`;
    sk.forEach((s, i) => {
      if (!s.show || !s.text) return;
      const [x, y, z] = proj[i];
      ctx.fillStyle = rgb(chem.chalk(scene.atoms[i].el, 0.3), alpha * (0.55 + 0.45 * depth(z)));
      ctx.font = big;
      if (s.lone) {
        ctx.textAlign = "center";
        ctx.fillText(s.lone, x, y);
        if (s.q) {
          const w = ctx.measureText(s.lone).width / 2;
          ctx.font = small;
          ctx.textAlign = "left";
          ctx.fillText(s.q, x + w + 1, y - fs * 0.34);
        }
        return;
      }
      // Hydrogens go on the side with no bonds: to the left when the bonds leave to the right.
      let lean = 0;
      for (const j of s.heavy) lean += proj[j][0] - x;
      const left = lean > 2;
      ctx.textAlign = "center";
      ctx.fillText(s.text, x, y);
      const half = ctx.measureText(s.text).width / 2;
      const wH = s.h ? ctx.measureText("H").width : 0;
      ctx.font = small;
      const wN = s.h > 1 ? ctx.measureText(String(s.h)).width : 0;
      let right = x + half + 1;
      if (s.h) {
        const hx = left ? x - half - 1 - wN - wH : right;
        ctx.font = big;
        ctx.textAlign = "left";
        ctx.fillText("H", hx, y);
        if (s.h > 1) {
          ctx.font = small;
          ctx.fillText(String(s.h), hx + wH, y + fs * 0.3);
        }
        if (!left) right += wH + wN;
      }
      if (s.q) {
        ctx.font = small;
        ctx.textAlign = "left";
        ctx.fillText(s.q, right + 1, y - fs * 0.34);
      }
    });
    ctx.textBaseline = "alphabetic";
  }

  // A chalk ruler in the corner: a round length that is 40 pixels or more at this zoom.
  drawRuler() {
    const { ctx, scale, scene } = this;
    const len = [1, 2, 5, 10, 20, 50].find((v) => v * scale >= 40) ?? 50;
    const px = len * scale;
    const x = 14;
    const y = this.h - 16;
    ctx.strokeStyle = ctx.fillStyle = "rgba(239,236,226,0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x, y + 5);
    ctx.moveTo(x, y);
    ctx.lineTo(x + px, y);
    ctx.moveTo(x + px, y - 5);
    ctx.lineTo(x + px, y + 5);
    ctx.stroke();
    ctx.font = '600 14px "Shantell Sans", sans-serif';
    ctx.textAlign = "left";
    ctx.fillText(`${len} ${scene.unit || "Å"}`, x + px + 8, y + 5);
  }

  write(text, x, y, color = YELLOW, size = Math.max(17, this.w / 26)) {
    const { ctx } = this;
    ctx.font = `700 ${size}px "Shantell Sans", sans-serif`;
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#1c2526";
    const tw = ctx.measureText(text).width / 2 + 6;
    const tx = Math.max(tw, Math.min(this.w - tw, x));
    const ty = Math.max(size, Math.min(this.h - 8, y));
    ctx.strokeText(text, tx, ty);
    ctx.fillStyle = color;
    ctx.fillText(text, tx, ty);
  }

  drawMeasure() {
    const { ctx, proj, picks } = this;
    const radius = (i) => this.scene.atoms[i].r * this.ballOf(this.scene.atoms[i]) * this.scale * proj[i][3];
    const ring = (i, color, dash) => {
      const [x, y] = proj[i];
      ctx.setLineDash(dash || []);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(9, radius(i) + 5), 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    for (const i of new Set([this.cursor, this.hover])) {
      if (i < 0 || !proj[i] || picks.includes(i)) continue;
      ring(i, CHALK, [4, 5]);
      this.write(this.tag(i), proj[i][0], proj[i][1] - Math.max(9, radius(i) + 5) - 9, CHALK, 15);
    }
    if (!picks.length) return;
    ctx.strokeStyle = YELLOW;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([9, 7]);
    ctx.beginPath();
    picks.forEach((i, n) => ctx[n ? "lineTo" : "moveTo"](proj[i][0], proj[i][1]));
    ctx.stroke();
    ctx.setLineDash([]);
    picks.forEach((i) => ring(i, YELLOW));
    const P = (i) => this.scene.atoms[i].p;
    let text = "";
    let where;
    if (picks.length === 2) {
      text = `${chem.distance(P(picks[0]), P(picks[1])).toFixed(2)} Å`;
      where = [(proj[picks[0]][0] + proj[picks[1]][0]) / 2, (proj[picks[0]][1] + proj[picks[1]][1]) / 2 - 12];
    } else if (picks.length === 3) {
      text = `${chem.angle(P(picks[0]), P(picks[1]), P(picks[2])).toFixed(1)}°`;
      const m = proj[picks[1]];
      const a0 = Math.atan2(proj[picks[0]][1] - m[1], proj[picks[0]][0] - m[0]);
      let d = Math.atan2(proj[picks[2]][1] - m[1], proj[picks[2]][0] - m[0]) - a0;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      ctx.strokeStyle = YELLOW;
      ctx.beginPath();
      ctx.arc(m[0], m[1], 26, a0, a0 + d, d < 0);
      ctx.stroke();
      const mid = a0 + d / 2;
      where = [m[0] + Math.cos(mid) * 52, m[1] + Math.sin(mid) * 52 + 6];
    }
    if (text) this.write(text, where[0], where[1]);
  }

  // What to call an atom beside the pointer: its residue and name, or its element.
  tag(i) {
    return this.scene.labels?.[i] ?? elementName(this.scene.atoms[i].el);
  }

  name(i) {
    return this.scene.labels?.[i] ?? `${elementName(this.scene.atoms[i].el)} ${i + 1}`;
  }

  report() {
    const p = this.picks;
    const P = (i) => this.scene.atoms[i].p;
    let text = "";
    if (p.length === 1) text = `Picked ${this.name(p[0])}. Pick another atom for the distance.`;
    if (p.length === 2) text = `${this.name(p[0])} to ${this.name(p[1])}: ${chem.distance(P(p[0]), P(p[1])).toFixed(3)} Å. A third atom gives the angle.`; // prettier-ignore
    if (p.length === 3) text = `The angle at ${this.name(p[1])}, between ${this.name(p[0])} and ${this.name(p[2])}: ${chem.angle(P(p[0]), P(p[1]), P(p[2])).toFixed(1)}°.`; // prettier-ignore
    this.onMeasure(text, p);
  }

  pick(i) {
    if (i < 0) return;
    if (this.picks.length >= 3) this.picks = [];
    if (this.picks.includes(i)) this.picks = this.picks.filter((x) => x !== i);
    else this.picks.push(i);
    this.report();
    this.kick();
    this.draw();
  }

  erase() {
    this.picks = [];
    this.report();
    this.draw();
  }

  // The atom under a point: the nearest one in front whose drawn disc (or a finger's
  // width around it) covers the point.
  hit(x, y) {
    let best = -1;
    let bestZ = -Infinity;
    if (!this.proj) return best;
    this.proj.forEach(([px, py, z, k], i) => {
      if (!this.pickable(i)) return;
      const a = this.scene.atoms[i];
      const r = Math.max(14, a.r * this.ballOf(a) * this.scale * k + 4);
      if (Math.hypot(px - x, py - y) <= r && z > bestZ) [best, bestZ] = [i, z];
    });
    return best;
  }

  bind() {
    const c = this.canvas;
    let start = null;
    c.addEventListener("pointerdown", (e) => {
      if (this.scene.points && e.pointerType === "touch" && !e.isPrimary) return;
      // Capture keeps a drag alive past the canvas edge; a pointer that cannot be captured still turns it.
      try {
        c.setPointerCapture(e.pointerId);
      } catch {}
      start = { x: e.clientX, y: e.clientY, moved: 0, lx: e.clientX, ly: e.clientY };
      this.dragging = true;
      this.spin = false;
      this.pose = null;
      this.hover = -1;
      this.vel = [0, 0];
      c.classList.add("holding");
    });
    c.addEventListener("pointerenter", (e) => (this.over = e.pointerType === "mouse"));
    c.addEventListener("pointerleave", () => {
      this.over = false;
      this.hover = -1;
      c.classList.remove("on-atom");
      this.draw();
      this.kick();
    });
    c.addEventListener("pointermove", (e) => {
      if (!start) {
        // A mouse over an atom: ring it and name it, so a tap is never a guess.
        if (e.pointerType !== "mouse" || !this.scene.atoms.length) return;
        const r = c.getBoundingClientRect();
        const h = this.hit(e.clientX - r.left, e.clientY - r.top);
        if (h !== this.hover) {
          this.hover = h;
          c.classList.toggle("on-atom", h >= 0);
          this.draw();
        }
        return;
      }
      const dx = e.clientX - start.lx;
      const dy = e.clientY - start.ly;
      start.lx = e.clientX;
      start.ly = e.clientY;
      start.moved += Math.abs(dx) + Math.abs(dy);
      if (start.moved < 5) return;
      this.turn(dx * 0.011, dy * 0.011);
      this.vel = still.matches ? [0, 0] : [dx * 0.011, dy * 0.011];
      this.draw();
    });
    const end = (e) => {
      if (!start) return;
      const tap = start.moved < 5;
      start = null;
      this.dragging = false;
      c.classList.remove("holding");
      if (tap && e.type === "pointerup" && this.scene.atoms.length) {
        const r = c.getBoundingClientRect();
        this.pick(this.hit(e.clientX - r.left, e.clientY - r.top));
      }
      this.kick();
    };
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", end);
    c.addEventListener("keydown", (e) => {
      const step = 0.16;
      const n = this.scene.atoms.length;
      const move = (d) => {
        if (!n) return;
        let i = this.cursor;
        for (let k = 0; k < n; k++) {
          i = (i + d + n) % n;
          if (this.pickable(i)) break;
        }
        this.cursor = i;
      };
      const keys = {
        ArrowLeft: () => this.turn(-step, 0),
        ArrowRight: () => this.turn(step, 0),
        ArrowUp: () => this.turn(0, -step),
        ArrowDown: () => this.turn(0, step),
        "]": () => move(1),
        "[": () => move(-1),
        Enter: () => this.pick(this.cursor),
        " ": () => this.pick(this.cursor),
        Escape: () => this.erase(),
      };
      if (!keys[e.key]) return;
      e.preventDefault();
      this.spin = false;
      this.pose = null;
      keys[e.key]();
      this.draw();
    });
    c.addEventListener("blur", () => {
      this.cursor = -1;
      this.draw();
    });
  }
}

// ---- From a file's model to something a stage can hold ------------------------------------

// A smooth chain through one point a residue (Catmull-Rom), eight steps each.
function ribbon(points) {
  const out = [];
  const at = (i) => points[Math.max(0, Math.min(points.length - 1, i))];
  for (let i = 0; i < points.length - 1; i++) {
    const [a, b, c, d] = [at(i - 1), at(i), at(i + 1), at(i + 2)].map((q) => q.p);
    const ss = points[i].ss === points[i + 1].ss ? points[i].ss : points[i].ss === "n" ? "n" : "c";
    for (let s = 0; s < 8; s++) {
      const t = s / 8;
      const p = [0, 1, 2].map(
        (k) => 0.5 * (2 * b[k] + (c[k] - a[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t * t + (3 * b[k] - 3 * c[k] + d[k] - a[k]) * t ** 3),
      );
      out.push({ p, ss });
    }
  }
  out.push({ p: points[points.length - 1].p, ss: "c" });
  return out;
}

function sceneFrom(model) {
  // Centered on the mean position of its atoms.
  const n = model.atoms.length;
  const c = [0, 1, 2].map((k) => model.atoms.reduce((s, a) => s + a.p[k], 0) / n);
  const atoms = model.atoms.map((a) => ({ el: a.el, p: a.p.map((v, k) => v - c[k]), r: chem.vdw(a.el), het: !!a.het, charge: a.charge || 0 }));
  const extent = Math.max(...atoms.map((a) => Math.hypot(...a.p) + a.r));
  const kind = model.traces.length ? "chain" : "small";
  const many = model.chains > 1;
  const named = model.atoms.some((a) => a.name);
  const labels = named ? model.atoms.map((a) => (a.res ? `${many ? a.chain + " " : ""}${a.res} ${a.seq} ${a.name}` : a.name)) : undefined;
  const scene = { atoms, bonds: model.bonds, extent, kind, labels };
  const heavy = atoms.filter((a) => a.el !== "H");
  scene.flat = chem.flatPose((heavy.length > 2 ? heavy : atoms).map((a) => a.p)).rot;
  if (kind === "chain") {
    scene.ribbons = model.traces.map((t) => ribbon(t.map((pt) => ({ p: atoms[pt.i].p, ss: pt.ss }))));
    scene.traced = new Set(model.traces.flat().map((pt) => pt.i));
    // A rung for every base of a nucleic acid: from the backbone to the atom that faces its partner.
    scene.rungs = model.traces.flat().filter((pt) => pt.rung !== undefined).map((pt) => [atoms[pt.i].p, atoms[pt.rung].p]); // prettier-ignore
  } else scene.sk = chem.skeleton(atoms, model.bonds);
  return scene;
}

function tile(symbol) {
  const el = chem.BY_SYMBOL.get(symbol.toLowerCase());
  const s = document.createElement("span");
  s.className = "el";
  s.style.setProperty("--c", rgb(chem.cpk(symbol)));
  s.innerHTML = `<small>${el.z}</small>${el.symbol}<i>${el.name.toLowerCase()}</i>`;
  return s;
}

// ---- The hero: a molecule you can hold, and the stockroom behind it ---------------------------

const heroCanvas = $("#hero-stage");
if (heroCanvas) {
  const readout = $("#hero-readout");
  const meta = $("#hero-meta");
  const shortBtn = $('[data-mode="short"]');
  const extra = $("#hero-extra");
  const index = new Map();
  for (const g of SHELF) for (const it of g.items) index.set(it.id, { ...it, file: `assets/molecules/${it.id}.sdf`, note: `PDB chemical component ${it.id}, ${it.coords ?? "ideal"} coordinates` }); // prettier-ignore
  for (const e of ENTRIES) index.set(e.id, { ...e, file: `assets/molecules/${e.id}.pdb`, note: `PDB entry ${e.id}` });
  const models = new Map([[FIRST.id, parse(FIRST.text, "first.sdf")]]);
  let now = { name: "Caffeine", kind: "small" };
  let mode = "sticks"; // how it is drawn now
  let chosen = "sticks"; // the last drawing the visitor asked for
  let busy = 0;

  const idle = () =>
    mode !== "short"
      ? `${now.name}. Nothing measured yet.`
      : now.kind === "chain"
        ? `${now.name} as a cartoon: ${now.chalks}. Tap along the chain to measure between residues.`
        : `${now.name} as a chemist writes it: a carbon at every corner, and the hydrogens on carbon left unwritten.`;
  const hero = new Stage(heroCanvas, { onMeasure: (text) => (readout.textContent = text || idle()) });
  const say = (text) => (readout.textContent = text);

  const setMode = (next) => {
    mode = next;
    hero.setMode(next);
    // The shorthand of a small molecule is flat on the board, the way it is written.
    if (next === "short" && now.kind === "small") hero.poseTo(hero.scene.flat);
    $$("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.mode === next));
  };

  // Put a model on the board. about: { id?, name, note }.
  const show = (model, about) => {
    const scene = sceneFrom(model);
    now = { ...about, kind: scene.kind };
    if (scene.kind === "chain") {
      const has = new Set(model.traces.flat().map((pt) => pt.ss));
      const said = [has.has("h") && "helices in pink chalk", has.has("s") && "strands in yellow", has.has("n") && "the backbone in blue with a rung for every base"].filter(Boolean);
      now.chalks = said.length ? said.join(", ") : "one line along the chain";
    }
    const firstTime = !hero.scene.atoms.length;
    hero.setScene(scene, true);
    if (!firstTime) {
      // Laid along its length, then tipped a little so it reads as a solid thing.
      hero.spin = false;
      hero.rot = scene.flat.slice();
      if (!(mode === "short" && scene.kind === "small")) hero.turn(-0.45, 0.3);
    }
    shortBtn.textContent = scene.kind === "chain" ? "Cartoon" : "Skeletal formula";
    shortBtn.title = scene.kind === "chain" ? "A cartoon follows the chain: one point for every residue." : "A cartoon follows a chain of residues, and a small molecule has none. Its shorthand is the skeletal formula."; // prettier-ignore
    // A large chain opens as its cartoon, unless the visitor asked for something else:
    // a few thousand atoms say less than one line through them.
    setMode(scene.kind === "chain" && model.atoms.length > 700 && chosen === "sticks" ? "short" : chosen);

    const parts = [];
    const f = chem.formula(model.atoms.map((a) => a.el));
    if (model.atoms.length <= 400) parts.push(f.parts.map(([e, n]) => e + (n > 1 ? chem.sub(n) : "")).join(""));
    parts.push(`${model.atoms.length.toLocaleString("en")} atom${model.atoms.length === 1 ? "" : "s"}`);
    if (scene.kind === "chain") {
      parts.push(`${scene.traced.size.toLocaleString("en")} residues`, `${model.chains} chain${model.chains === 1 ? "" : "s"}`);
      if (!f.parts.some(([e]) => e === "H")) parts.push("no hydrogens in the file");
    } else if (Number.isFinite(f.mass)) parts.push(`${f.mass.toFixed(2)} g/mol`);
    if (model.waters) parts.push(`${model.waters} water${model.waters === 1 ? "" : "s"} not drawn`);
    parts.push(about.note);
    const ways = about.spell !== false && about.name.replace(/[^a-z]/gi, "").length <= 22 ? chem.spellings(about.name) : [];
    if (ways.length) parts.push(`in elements: ${ways[0].join(" ")}${ways.length > 1 ? ` (one of ${ways.length.toLocaleString("en")} ways)` : ""}`);
    meta.textContent = parts.join(" · ");
    heroCanvas.setAttribute("aria-label", `${about.name}, drawn in chalk. Arrow keys turn it. Square brackets move between atoms, Enter picks one, Escape erases the measurement.`); // prettier-ignore

    // The tray: the four regulars, and whatever else is on the board beside them.
    const regular = $$("[data-mol]").some((b) => b.dataset.mol === about.id);
    $$("[data-mol]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.mol === about.id));
    extra.hidden = regular;
    extra.textContent = about.name;
    say(idle());
  };

  const getText = async (url) => {
    const r = await fetch(url);
    if (!r.ok) throw Object.assign(new Error(String(r.status)), { status: r.status });
    return r.text();
  };

  // From the shelf, by its id. Resolves true when it is on the board.
  const take = async (id) => {
    const item = index.get(id);
    const turn = ++busy;
    try {
      if (!models.has(id)) {
        say(`Fetching ${item.name} from the shelf…`);
        models.set(id, parse(await getText(item.file), item.file));
      }
      if (turn !== busy) return false;
      show(models.get(id), { id, name: item.name, note: item.note });
      return true;
    } catch {
      if (turn === busy) say(`${item.name} could not be fetched from the shelf. ${now.name} stays on the board.`);
      return false;
    }
  };

  const tidy = (s, n = 90) => {
    const t = String(s).replace(/\s+/g, " ").trim();
    const cased = t === t.toUpperCase() ? t[0] + t.slice(1).toLowerCase() : t;
    return cased.length > n ? cased.slice(0, n - 1).trimEnd() + "…" : cased;
  };

  // By its Protein Data Bank code: four characters for an entry, up to three (or five) for a
  // chemical component. Like the Splashery viewer further down, it asks another site only
  // when the visitor asks for it.
  const fetchCode = async (raw) => {
    const code = raw.trim().toUpperCase();
    if (!/^[A-Z0-9]{1,5}$/.test(code)) throw new Error("A code is one to five letters and digits: 1MBN for an entry, ATP for a chemical component.");
    if (index.has(code)) {
      if (await take(code)) return;
      throw new Error(`${code} could not be fetched from the shelf.`);
    }
    const entry = /^\d[A-Z0-9]{3}$/.test(code);
    const turn = ++busy;
    let text;
    let file;
    try {
      if (entry) {
        file = `${code}.pdb`;
        text = await getText(`https://files.rcsb.org/download/${code}.pdb`).catch((e) => {
          if (e.status !== 404) throw e;
          file = `${code}.cif`; // the largest entries are filed only as mmCIF
          return getText(`https://files.rcsb.org/download/${code}.cif`);
        });
      } else {
        file = `${code}.cif`;
        text = await getText(`https://files.rcsb.org/ligands/download/${code}.cif`);
      }
    } catch (e) {
      throw new Error(e.status === 404 ? `The Protein Data Bank has no ${entry ? "entry" : "chemical component"} filed under ${code}.` : "The Protein Data Bank could not be reached just now.");
    }
    const model = parse(text, file);
    if (turn !== busy) return;
    const title = model.title ? tidy(model.title) : "";
    show(model, entry ? { id: code, name: code, note: `PDB entry ${code}${title ? `, “${title}”` : ""}`, spell: false } : { id: code, name: title || code, note: `PDB chemical component ${code}, ideal coordinates` }); // prettier-ignore
  };

  // A file from the visitor's own device. It is read here and goes nowhere.
  const openFile = async (file) => {
    if (file.size > 30e6) throw new Error("That file is over 30 MB, more than this board can draw.");
    const model = parse(await file.text(), file.name);
    ++busy;
    const name = tidy(file.name.replace(/\.[a-z0-9]+$/i, ""), 40);
    show(model, { name, note: `your ${model.format} file${model.title ? `, “${tidy(model.title, 70)}”` : ""}, read on this device`, spell: false });
  };

  $$("[data-mol]").forEach((b) => b.addEventListener("click", () => take(b.dataset.mol)));
  $$("[data-mode]").forEach((b) => b.addEventListener("click", () => setMode((chosen = b.dataset.mode))));
  $("#hero-erase").addEventListener("click", () => hero.erase());
  show(models.get(FIRST.id), { id: FIRST.id, name: "Caffeine", note: index.get(FIRST.id).note });

  // Drop a file anywhere on the first board.
  const board = $("#top");
  const hasFile = (e) => [...(e.dataTransfer?.types ?? [])].includes("Files");
  board.addEventListener("dragover", (e) => {
    if (!hasFile(e)) return;
    e.preventDefault();
    board.classList.add("dropping");
  });
  board.addEventListener("dragleave", (e) => {
    if (!board.contains(e.relatedTarget)) board.classList.remove("dropping");
  });
  board.addEventListener("drop", (e) => {
    if (!hasFile(e)) return;
    e.preventDefault();
    board.classList.remove("dropping");
    const file = e.dataTransfer.files[0];
    if (file) openFile(file).catch((err) => say(`${err.message} ${now.name} stays on the board.`));
  });

  // ---- The stockroom ------------------------------------------------------------------------
  const room = $("#stockroom");
  if (room && room.showModal) {
    const list = $("#stock-list");
    const find = $("#stock-find");
    const status = $("#own-status");
    const count = SHELF.reduce((s, g) => s + g.items.length, 0) + ENTRIES.length;
    // words: what the search box matches, the formula with plain digits among them.
    const card = (id, name, small, words = "") => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "card";
      b.dataset.take = id;
      b.dataset.words = `${name} ${id} ${small} ${words}`.toLowerCase();
      b.append(name);
      const s = document.createElement("small");
      s.textContent = small;
      b.append(s);
      return b;
    };
    const section = (title, cards) => {
      const sec = document.createElement("section");
      const h = document.createElement("h3");
      h.textContent = title;
      const row = document.createElement("div");
      row.className = "cards";
      row.append(...cards);
      sec.append(h, row);
      list.append(sec);
    };
    const hill = (f) => f.replace(/(\d+)/g, (d) => chem.sub(d)).replace(/\s+/g, "");
    for (const g of SHELF) section(g.group, g.items.map((it) => card(it.id, it.name, hill(it.formula), it.formula.replace(/\s+/g, "")))); // prettier-ignore
    section("Proteins and nucleic acids", ENTRIES.map((e) => card(e.id, e.name, `${e.id} · ${e.atoms.toLocaleString("en")} atoms`))); // prettier-ignore
    $$("[data-stock-count]").forEach((el) => (el.textContent = `about ${Math.round(count / 10) * 10}`));
    $$("[data-open-stockroom]").forEach((b) => (b.hidden = false));

    const open = (focus) => {
      status.textContent = "";
      room.showModal();
      (focus || find).focus();
    };
    $$("[data-open-stockroom]").forEach((b) => b.addEventListener("click", () => open(b.dataset.openStockroom === "own" ? $("#own-code") : null))); // prettier-ignore
    extra.addEventListener("click", () => open());
    room.addEventListener("click", (e) => {
      if (e.target === room) room.close(); // a tap on the dark around it
    });
    find.addEventListener("input", () => {
      const q = find.value.trim().toLowerCase();
      for (const sec of $$("section", list)) {
        let any = false;
        for (const b of $$(".card", sec)) {
          b.hidden = !!q && !b.dataset.words.includes(q);
          any ||= !b.hidden;
        }
        sec.hidden = !any;
      }
      $("#stock-none").hidden = $$("section", list).some((s) => !s.hidden);
    });
    const toBoard = () => {
      room.close();
      heroCanvas.scrollIntoView({ block: "center", behavior: still.matches ? "auto" : "smooth" });
    };
    list.addEventListener("click", (e) => {
      const b = e.target.closest("[data-take]");
      if (!b) return;
      toBoard();
      take(b.dataset.take);
    });
    const attempt = async (job, working) => {
      status.textContent = working;
      try {
        await job();
        toBoard();
      } catch (err) {
        status.textContent = err.message;
      }
    };
    $("#own-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const code = $("#own-code").value;
      attempt(() => fetchCode(code), `Asking the Protein Data Bank for ${code.trim().toUpperCase()}…`);
    });
    $("#own-file").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) attempt(() => openFile(file), `Reading ${file.name}…`);
      e.target.value = "";
    });
  }
}

// ---- A unit cell ----------------------------------------------------------------------------

const cellCanvas = $("#cell-stage");
if (cellCanvas) {
  const readout = $("#cell-readout");
  const meta = $("#cell-meta");
  let key = "diamond";
  let touching = false;
  const RULE = { diamond: "a√3 ⁄ 4", fcc: "a ⁄ √2", bcc: "a√3 ⁄ 2" };
  const idle = () => `${chem.CRYSTALS[key].name}: a = ${chem.CRYSTALS[key].a} Å.`;
  const stage = new Stage(cellCanvas, { spin: false, onMeasure: (t) => (readout.textContent = t || idle()) });
  const show = () => {
    const c = chem.unitCell(key);
    // Touching spheres: each atom's radius is half the nearest-neighbor distance.
    const atoms = c.atoms.map((a) => ({ el: a.el, p: a.p, r: c.d / 2 }));
    stage.setScene({ atoms, bonds: c.bonds, edges: c.edges, extent: (c.a * Math.sqrt(3)) / 2 + c.d / 2 }, true);
    stage.ballTo = touching ? 1 : 0.36;
    if (still.matches) stage.ball = stage.ballTo;
    meta.textContent = `One conventional cell of ${c.name.toLowerCase()}, with the lattice constant Splashery uses (${c.source}). Tap two bonded atoms: the distance should come to ${RULE[c.kind]} = ${c.d.toFixed(3)} Å. Each atom has ${c.neighbors} nearest neighbors.`;
    $$("[data-crystal]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.crystal === key));
    stage.kick();
  };
  stage.ball = 0.36;
  $$("[data-crystal]").forEach((b) => b.addEventListener("click", () => ((key = b.dataset.crystal), show())));
  $("[data-cellmode]").addEventListener("click", (e) => {
    touching = !touching;
    e.currentTarget.setAttribute("aria-pressed", touching);
    show();
  });
  show();
}

// ---- A hydrogen orbital ---------------------------------------------------------------------

const orbCanvas = $("#orbital-stage");
if (orbCanvas) {
  const readout = $("#orbital-readout");
  const stage = new Stage(orbCanvas, { spin: true });
  let q = [3, 2, 0];
  let cut = false;
  const count = innerWidth < 600 ? 5000 : 9000;
  const show = (label) => {
    const cloud = chem.sampleOrbital(...q, count, 1);
    // Chemistry's axes (z along the orbital's axis) to the board's (z up, y toward the room).
    for (let i = 0; i < cloud.points.length; i += 4) {
      const [y, z] = [cloud.points[i + 1], cloud.points[i + 2]];
      cloud.points[i + 1] = z;
      cloud.points[i + 2] = -y;
    }
    // Fit to the radius that holds 98% of the dots.
    const radii = [];
    for (let i = 0; i < cloud.points.length; i += 4) radii.push(Math.hypot(cloud.points[i], cloud.points[i + 1], cloud.points[i + 2]));
    radii.sort((a, b) => a - b);
    stage.setScene({ atoms: [], bonds: [], points: cloud.points, cut, unit: "a₀", extent: radii[Math.floor(radii.length * 0.98)] }, true);
    if (label) readout.textContent = `${label}: n = ${q[0]}, l = ${q[1]}, m = ${q[2]}. ${q[0] - q[1] - 1} radial node${q[0] - q[1] - 1 === 1 ? "" : "s"}, ${count.toLocaleString("en")} dots.`; // prettier-ignore
  };
  $$("[data-orb]").forEach((b) =>
    b.addEventListener("click", () => {
      q = b.dataset.orb.split(",").map(Number);
      $$("[data-orb]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      show(b.textContent.trim());
    }),
  );
  $("[data-cut]").addEventListener("click", (e) => {
    cut = !cut;
    e.currentTarget.setAttribute("aria-pressed", cut);
    stage.scene.cut = cut;
    // Face the cut: the half toward the room is taken away, so look straight at what is left.
    stage.spin = false;
    stage.rot = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    stage.turn(cut ? -0.25 : -0.5, cut ? 0.15 : 0.35);
    stage.draw();
  });
  show("3d z²");
}

// ---- Isomers: the same eight letters, rearranged ----------------------------------------------

const isomer = $("#isomer");
if (isomer) {
  const row = $(".letters", isomer);
  const FORMS = ["RYAN KAMP", "MAY PRANK", "PARK MANY", "RAMP YANK", "ARMY KNAP"];
  let n = 0;
  $("#isomer-next").addEventListener("click", () => {
    n = (n + 1) % FORMS.length;
    const tiles = $$("span:not(.gap)", row);
    const gap = $(".gap", row);
    const before = new Map([...tiles, gap].map((t) => [t, t.getBoundingClientRect().left]));
    const pool = [...tiles];
    for (const ch of FORMS[n]) {
      if (ch === " ") row.append(gap);
      else row.append(pool.splice(pool.findIndex((t) => t.textContent === ch), 1)[0]); // prettier-ignore
    }
    if (still.matches) return;
    for (const [t, x] of before) {
      const dx = x - t.getBoundingClientRect().left;
      if (dx) t.animate([{ transform: `translate(${dx}px, ${dx > 0 ? -14 : 14}px)` }, { transform: "none" }], { duration: 520, easing: "cubic-bezier(.3,1.3,.5,1)" }); // prettier-ignore
    }
  });
}

// ---- Written in elements ------------------------------------------------------------------------

const spellIn = $("#spell-in");
if (spellIn) {
  const out = $("#spell-out");
  const write = () => {
    const word = spellIn.value.toLowerCase().replace(/[^a-z]/g, "");
    out.textContent = "";
    if (!word) return;
    const ways = chem.spellings(word);
    const p = (cls, text) => {
      const el = document.createElement("p");
      el.className = cls;
      el.textContent = text;
      out.append(el);
      return el;
    };
    if (!ways.length) {
      const far = chem.stuckAt(word);
      const el = p("stuck big", "");
      el.append(word.slice(0, far).toUpperCase());
      const b = document.createElement("b");
      b.textContent = word.slice(far).toUpperCase();
      el.append(b);
      p("meta", `No way. It stops at “${word[far].toUpperCase()}”: no symbol is ${word[far].toUpperCase()}${word[far + 1] ? ` or ${word[far].toUpperCase()}${word[far + 1]}` : ""} there.`);
      return;
    }
    for (const way of ways.slice(0, 4)) {
      const row = p("tiles way", "");
      way.forEach((s) => row.append(tile(s)));
    }
    p("meta", ways.length === 1 ? "One way." : `${ways.length.toLocaleString("en")} ways${ways.length > 4 ? "; the first four are drawn" : ""}.`);
  };
  spellIn.addEventListener("input", write);
  write();
}

// ---- The real viewer, when asked for ---------------------------------------------------------------

const realLoad = $("#real-load");
if (realLoad) {
  realLoad.addEventListener("click", (e) => {
    e.preventDefault();
    const frame = document.createElement("iframe");
    frame.src = realLoad.href;
    frame.title = "Splashery's molecule viewer";
    frame.loading = "lazy";
    const wait = document.createElement("p");
    wait.className = "real-wait";
    wait.textContent = "Fetching the viewer from Splashery…";
    realLoad.replaceWith(wait, frame);
  });
}
