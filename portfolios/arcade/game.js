// The cabinet's rules, with nothing of the page in them: a stroke font, a wall
// built from the name, and a game that advances in fixed steps from a seed.
// The same input always gives the same game, so check.mjs can replay the
// house's runs and compare their scores with the ones the page prints.

// ---------------------------------------------------------------- the font
// Every glyph is a few polylines on a grid 4 wide and 6 tall ("xy xy ...",
// polylines split by "|"). A vector monitor has no other kind of letter.
export const GLYPHS = {
  A: "06 02 20 42 46|04 44",
  B: "06 00 30 41 42 33 03|33 44 45 36 06",
  C: "40 00 06 46",
  D: "06 00 20 42 44 26 06",
  E: "40 00 06 46|03 33",
  F: "40 00 06|03 33",
  G: "40 00 06 46 43 23",
  H: "00 06|40 46|03 43",
  I: "00 40|20 26|06 46",
  J: "40 45 36 16 05",
  K: "00 06|40 03 46",
  L: "00 06 46",
  M: "06 00 23 40 46",
  N: "06 00 46 40",
  O: "00 40 46 06 00",
  P: "06 00 40 43 03",
  Q: "00 40 44 26 06 00|24 46",
  R: "06 00 40 43 03|23 46",
  S: "40 00 03 43 46 06",
  T: "00 40|20 26",
  U: "00 06 46 40",
  V: "00 26 40",
  W: "00 06 23 46 40",
  X: "00 46|40 06",
  Y: "00 23 40|23 26",
  Z: "00 40 06 46",
  0: "00 40 46 06 00|40 06",
  1: "11 20 26|06 46",
  2: "00 40 43 03 06 46",
  3: "00 40 46 06|03 43",
  4: "00 03 43|40 46",
  5: "40 00 03 43 46 06",
  6: "40 00 06 46 43 03",
  7: "00 40 46",
  8: "00 40 46 06 00|03 43",
  9: "43 03 00 40 46 06",
  "-": "03 43",
  "/": "06 40",
  ".": "25 26",
  ":": "21 22|24 25",
  "!": "20 24|25 26",
  ">": "01 43 05",
  "+": "13 33|22 24",
  "?": "01 00 40 42 23 24|25 26",
};

export function glyphSegments(ch) {
  const g = GLYPHS[ch];
  if (!g) return [];
  const out = [];
  for (const line of g.split("|")) {
    const pts = line.split(" ").map((p) => [Number(p[0]), Number(p[1])]);
    for (let i = 1; i < pts.length; i++) out.push([pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]]);
  }
  return out;
}

// Segments for a line of text: each cell is cw by ch, with gap between cells.
export function textSegments(text, x, y, cw, ch, gap) {
  const out = [];
  [...text.toUpperCase()].forEach((c, i) => {
    const ox = x + i * (cw + gap);
    for (const [x1, y1, x2, y2] of glyphSegments(c))
      out.push([ox + (x1 / 4) * cw, y + (y1 / 6) * ch, ox + (x2 / 4) * cw, y + (y2 / 6) * ch, i]);
  });
  return out;
}

// ---------------------------------------------------------------- the field
export const W = 100;
export const H = 120;
export const DT = 1 / 120;
export const PADDLE_Y = 108;
export const HW = 9; // half the paddle
export const BALL_R = 1.3;
const S = 80; // the ball's speed when nothing pulls on it
const G = 44; // the pull, when the gravity rule is on
const VG = 97; // the paddle's upward kick under gravity: just enough to reach the top
const AUTO_SPEED = 96; // how fast the house can move its paddle

export const ROWS = ["RYAN", "KAMP"];
export const CELL = { w: 16, h: 22, gap: 6, top: 14, lead: 30 };

// Three rules, each a switch: eight rule sets, numbered by their bits.
export const RULES = [
  { key: "wrap", bit: 1, name: "Walls", off: "Bounce", on: "Wrap", code: ["B", "W"] },
  { key: "gravity", bit: 2, name: "Gravity", off: "Off", on: "On", code: ["0", "G"] },
  { key: "catch", bit: 4, name: "Shards", off: "Fall away", on: "Catch them", code: ["F", "C"] },
];
export const ruleCode = (bits) => RULES.map((r) => r.code[bits & r.bit ? 1 : 0]).join("");

// The house's score on each rule set: the cabinet playing itself from
// HOUSE_SEED. check.mjs replays all eight and fails if a number here is wrong.
export const HOUSE_SEED = 1979;
export const HOUSE = [1015, 1555, 1925, 1640, 1165, 1755, 2125, 1865];

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function wall() {
  const out = [];
  const x0 = (W - (4 * CELL.w + 3 * CELL.gap)) / 2;
  ROWS.forEach((word, r) => {
    for (const [ax, ay, bx, by, i] of textSegments(word, x0, CELL.top + r * CELL.lead, CELL.w, CELL.h, CELL.gap))
      out.push({ ax, ay, bx, by, alive: true, letter: r * 4 + i });
  });
  return out;
}

export function createGame(bits, seed) {
  const strokes = wall();
  return {
    bits,
    seed,
    rand: rng(seed),
    step: 0,
    score: 0,
    balls: 3,
    combo: 1,
    caught: 0,
    state: "ready", // ready, play, over, clear
    hold: 0,
    quiet: 0, // steps since a stroke last broke
    mixed: false, // a rule changed during the run
    paddle: { x: W / 2 },
    ball: { x: W / 2, y: PADDLE_Y - BALL_R - 0.7, vx: 0, vy: 0, held: true },
    strokes,
    left: strokes.length,
    shards: [],
    events: [],
  };
}

export function setRules(g, bits) {
  if (bits === g.bits) return;
  g.bits = bits;
  if (g.state === "play") g.mixed = true;
}

function shot(g, u) {
  const b = g.ball;
  if (g.bits & 2) {
    b.vx = clamp(u, -0.8, 0.8) * 60;
    b.vy = -VG;
  } else {
    const c = clamp(u, -0.75, 0.75);
    b.vx = S * c;
    b.vy = -S * Math.sqrt(1 - c * c);
  }
}

function stepShards(g) {
  const live = g.state === "play" || g.state === "ready";
  for (let i = g.shards.length - 1; i >= 0; i--) {
    const s = g.shards[i];
    s.vy += 90 * DT;
    s.x += s.vx * DT;
    s.y += s.vy * DT;
    s.ang += s.spin * DT;
    if (g.bits & 1) {
      if (s.x < 0) s.x += W;
      else if (s.x >= W) s.x -= W;
    }
    if (live && g.bits & 4 && s.vy > 0 && s.y >= PADDLE_Y && s.y <= PADDLE_Y + 3 && Math.abs(s.x - g.paddle.x) <= HW + 2) {
      g.score += 25;
      g.caught++;
      g.events.push({ type: "catch", x: s.x, y: s.y });
      g.shards.splice(i, 1);
    } else if (s.y > H + 12) g.shards.splice(i, 1);
  }
}

// One step of 1/120 s. input: { target, speed, launch }.
export function step(g, input) {
  if (g.state === "over" || g.state === "clear") return stepShards(g);
  g.step++;
  const p = g.paddle;
  const b = g.ball;
  if (input.target != null) {
    const max = (input.speed == null ? 1e9 : input.speed) * DT;
    p.x += clamp(clamp(input.target, HW, W - HW) - p.x, -max, max);
  }
  if (b.held) {
    b.x = p.x;
    b.y = PADDLE_Y - BALL_R - 0.7;
    g.hold++;
    if (input.launch) {
      b.held = false;
      g.state = "play";
      shot(g, (g.rand() * 2 - 1) * 0.45);
      g.events.push({ type: "launch", x: b.x, y: b.y });
    }
    return stepShards(g);
  }

  g.quiet++;
  const wrap = g.bits & 1;
  const grav = g.bits & 2;
  if (grav) b.vy += G * DT;
  b.x += b.vx * DT;
  b.y += b.vy * DT;

  if (wrap) {
    if (b.x < 0) b.x += W;
    else if (b.x >= W) b.x -= W;
  } else if (b.x < BALL_R && b.vx < 0) {
    b.x = BALL_R;
    b.vx = -b.vx;
    g.events.push({ type: "wall", x: b.x, y: b.y });
  } else if (b.x > W - BALL_R && b.vx > 0) {
    b.x = W - BALL_R;
    b.vx = -b.vx;
    g.events.push({ type: "wall", x: b.x, y: b.y });
  }
  if (b.y < BALL_R && b.vy < 0) {
    b.y = BALL_R;
    b.vy = -b.vy;
    g.events.push({ type: "wall", x: b.x, y: b.y });
  }

  if (b.vy > 0 && b.y + BALL_R >= PADDLE_Y && b.y + BALL_R <= PADDLE_Y + 3 && Math.abs(b.x - p.x) <= HW + BALL_R) {
    b.y = PADDLE_Y - BALL_R;
    shot(g, ((b.x - p.x) / (HW + BALL_R)) * 0.8);
    g.combo = 1;
    g.events.push({ type: "paddle", x: b.x, y: b.y });
  }

  // The nearest stroke the ball is touching, if any: it breaks, and the ball
  // leaves along its mirror path.
  let best = null;
  let bd = BALL_R * BALL_R;
  let bx = 0;
  let by = 0;
  for (const s of g.strokes) {
    if (!s.alive) continue;
    const ex = s.bx - s.ax;
    const ey = s.by - s.ay;
    const t = clamp(((b.x - s.ax) * ex + (b.y - s.ay) * ey) / (ex * ex + ey * ey), 0, 1);
    const dx = b.x - (s.ax + ex * t);
    const dy = b.y - (s.ay + ey * t);
    const d2 = dx * dx + dy * dy;
    if (d2 < bd) {
      bd = d2;
      best = s;
      bx = dx;
      by = dy;
    }
  }
  if (best) {
    const d = Math.sqrt(bd) || 1e-6;
    const nx = bx / d;
    const ny = by / d;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= 2 * vn * nx;
      b.vy -= 2 * vn * ny;
    }
    best.alive = false;
    g.left--;
    g.quiet = 0;
    g.score += 10 * g.combo;
    g.events.push({ type: "hit", x: b.x, y: b.y, combo: g.combo });
    g.combo = Math.min(g.combo + 1, 8);
    g.shards.push({
      x: (best.ax + best.bx) / 2,
      y: (best.ay + best.by) / 2,
      hx: (best.bx - best.ax) / 2,
      hy: (best.by - best.ay) / 2,
      vx: b.vx * 0.12 + (g.rand() - 0.5) * 24,
      vy: -8 - g.rand() * 22,
      spin: (g.rand() - 0.5) * 9,
      ang: 0,
      letter: best.letter,
    });
    if (g.left === 0) {
      g.state = "clear";
      g.bonus = g.balls * 100 + Math.max(0, 100 - Math.floor(g.step * DT)) * 5;
      g.score += g.bonus;
      g.events.push({ type: "clear", x: b.x, y: b.y });
      return stepShards(g);
    }
  }

  if (!grav) {
    // Nothing pulls: the speed is fixed, and a ball may not go flat.
    if (Math.abs(b.vy) < 0.2 * S) b.vy = (b.vy < 0 ? -1 : 1) * 0.2 * S;
    const k = S / Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    b.vx *= k;
    b.vy *= k;
  }

  if (b.y > H + 3) {
    g.balls--;
    g.combo = 1;
    g.events.push({ type: "lost", x: b.x, y: H });
    if (g.balls <= 0) g.state = "over";
    else {
      b.held = true;
      g.hold = 0;
      b.vx = b.vy = 0;
    }
  }
  stepShards(g);
}

// The house's hands. It serves after a short wait, goes where the ball will
// come down, and tilts each return toward the lowest stroke still standing.
export function autopilot(g) {
  const b = g.ball;
  if (b.held) return { target: W / 2, speed: AUTO_SPEED, launch: g.hold > 70 };
  let aim = null;
  let low = -1;
  for (const s of g.strokes) {
    if (!s.alive) continue;
    const my = (s.ay + s.by) / 2;
    if (my > low) {
      low = my;
      aim = s;
    }
  }
  let px = b.x;
  if (b.vy > 0) {
    px = b.x + (b.vx * (PADDLE_Y - BALL_R - b.y)) / b.vy;
    if (g.bits & 1) px = ((px % W) + W) % W;
    else {
      const span = W - 2 * BALL_R;
      let q = (((px - BALL_R) % (2 * span)) + 2 * span) % (2 * span);
      if (q > span) q = 2 * span - q;
      px = q + BALL_R;
    }
  }
  let u = 0;
  if (aim) {
    const dx = (aim.ax + aim.bx) / 2 - px;
    if (g.bits & 2) {
      // The time the kick takes to climb to that stroke, then the sideways speed to match.
      const rise = Math.min(PADDLE_Y - low, 100);
      u = dx / (((VG - Math.sqrt(VG * VG - 2 * G * rise)) / G) * 60);
    } else {
      const dy = low - PADDLE_Y;
      u = dx / Math.sqrt(dx * dx + dy * dy);
    }
  }
  // A slow drift in the aim, so no return ever settles into a path that repeats.
  u += ((g.step % 1531) / 1531 - 0.5) * 0.3;
  // Fifteen seconds without a break: stop aiming and sweep the whole range instead.
  if (g.quiet > 1800) u = ((g.step % 2311) / 2311) * 1.4 - 0.7;
  return { target: px - (clamp(u, -0.7, 0.7) / 0.8) * (HW + BALL_R), speed: AUTO_SPEED, launch: false };
}

// The whole of a house run, for the check and for the table.
export function houseRun(bits, seed = HOUSE_SEED, maxSeconds = 600) {
  const g = createGame(bits, seed);
  const max = maxSeconds / DT;
  while (g.state !== "over" && g.state !== "clear" && g.step < max) {
    step(g, autopilot(g));
    g.events.length = 0;
  }
  return g;
}
