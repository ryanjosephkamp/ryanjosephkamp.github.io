// The page's side of the cabinet: drawing, input, and the small plates below.
// The rules themselves are in game.js and know nothing of the page.
import { OG_GUESSES, GO_PUZZLES, budgetFor, newRound, submit, advance, evidence, puzzleRows, guessesUsed } from "./amordle.js";
import { glyphSegments, textSegments, W, H, DT, PADDLE_Y, HW, BALL_R, RULES, HOUSE, HOUSE_SEED, ruleCode, createGame, setRules, step, autopilot } from "./game.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const MINT = "#7dffc6";
const DIM = "#2f6d56";
const HOT = "#ff4a3d";

// ------------------------------------------------------- stroke headings
function vecWord(word) {
  const n = [...word].length;
  const d = textSegments(word, 0, 0, 4, 6, 1.7).map(([a, b, c, e]) => `M${a} ${b}L${c} ${e}`).join("");
  return `<svg viewBox="-0.3 -0.3 ${(n * 4 + (n - 1) * 1.7 + 0.6).toFixed(2)} 6.6"><path d="${d}"/></svg>`;
}
for (const el of $$("[data-vec]")) {
  const text = el.textContent.trim();
  el.innerHTML = `<span class="sr-only">${text}</span><span class="vec" aria-hidden="true">${text.split(/\s+/).map(vecWord).join("")}</span>`;
}

// ------------------------------------------------------------- the cabinet
const monitor = $("#monitor");
const canvas = $("#screen");
const ctx = canvas.getContext("2d");
const msg = $("#msg");
const startBtn = $("#start");
const KEY = "arcade:best";

let bits = 0;
let view3d = false;
let viewT = 0;
let soundOn = false;
let mode = "attract"; // attract (the house plays), player, done
let g = createGame(bits, HOUSE_SEED);
let target = null;
let keyDir = 0;
let wantLaunch = false;
let games = 0;
let idle = 0;
let heroVisible = true;
let sparks = [];
let best = new Array(8).fill(0);
try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if (Array.isArray(saved) && saved.length === 8) best = saved.map((n) => Number(n) || 0);
} catch {}

let cw = 0;
let chh = 0;
let dpr = 1;
let unit = 1;
function resize() {
  const r = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  canvas.width = cw = Math.max(1, Math.round(r.width * dpr));
  canvas.height = chh = Math.max(1, Math.round(r.height * dpr));
  unit = cw / 108;
}
new ResizeObserver(resize).observe(canvas);
resize();

// The 2D/3D switch tips the board back; the rules never see it.
const D = 230;
const TILT = 0.95;
const camScale = () => 1 - 0.2 * viewT;
function proj(x, y, z) {
  const a = viewT * TILT;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const Y = y - H / 2;
  const s = (D / (D - Y * sa - z * ca)) * camScale();
  return [cw / 2 + (x - W / 2) * s * unit, chh / 2 + ((Y * ca - z * sa) * s - 3 * viewT) * unit, s];
}
function fieldX(clientX) {
  const r = canvas.getBoundingClientRect();
  const s = (D / (D - (PADDLE_Y - H / 2) * Math.sin(viewT * TILT))) * camScale();
  return W / 2 + (((clientX - r.left) / r.width) * cw - cw / 2) / (s * unit);
}

function seg(batch, x1, y1, z1, x2, y2, z2) {
  const a = proj(x1, y1, z1);
  const b = proj(x2, y2, z2);
  batch.push(a[0], a[1], b[0], b[1]);
}
function flush(batch, color, width, alpha = 1) {
  if (!batch.length) return;
  ctx.strokeStyle = color;
  ctx.beginPath();
  for (let i = 0; i < batch.length; i += 4) {
    ctx.moveTo(batch[i], batch[i + 1]);
    ctx.lineTo(batch[i + 2], batch[i + 3]);
  }
  ctx.globalAlpha = 0.16 * alpha;
  ctx.lineWidth = width * 5 * dpr;
  ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width * dpr;
  ctx.stroke();
  batch.length = 0;
}
// A stroke lying on the board, and (in 3D) the fin it stands up into.
function fin(batch, ax, ay, bx, by, hz) {
  seg(batch, ax, ay, 0, bx, by, 0);
  if (hz > 0.05) {
    seg(batch, ax, ay, hz, bx, by, hz);
    seg(batch, ax, ay, 0, ax, ay, hz);
    seg(batch, bx, by, 0, bx, by, hz);
  }
}

function draw() {
  // The phosphor's afterglow: last frame fades instead of vanishing.
  ctx.globalCompositeOperation = "destination-out";
  ctx.globalAlpha = 1;
  ctx.fillStyle = reduce.matches ? "#000" : "rgba(0,0,0,0.38)";
  ctx.fillRect(0, 0, cw, chh);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  const hz = 6 * viewT;
  const a = [];
  const d = [];
  const h = [];

  // The rails. With the wrap rule on, the side walls are not there.
  seg(a, 0, 0, 0, W, 0, 0);
  const side = g.bits & 1 ? d : a;
  seg(side, 0, 0, 0, 0, H, 0);
  seg(side, W, 0, 0, W, H, 0);
  if (hz > 0.05) {
    seg(a, 0, 0, hz, W, 0, hz);
    seg(a, 0, 0, 0, 0, 0, hz);
    seg(a, W, 0, 0, W, 0, hz);
  }
  seg(d, 0, H, 0, W, H, 0);
  flush(d, DIM, 1.1, 0.8);

  for (const s of g.strokes) if (s.alive) fin(a, s.ax, s.ay, s.bx, s.by, hz);
  // The paddle.
  const p = g.paddle.x;
  fin(a, p - HW, PADDLE_Y, p + HW, PADDLE_Y, hz * 0.5);
  fin(a, p - HW, PADDLE_Y + 2.2, p + HW, PADDLE_Y + 2.2, hz * 0.5);
  seg(a, p - HW, PADDLE_Y, 0, p - HW, PADDLE_Y + 2.2, 0);
  seg(a, p + HW, PADDLE_Y, 0, p + HW, PADDLE_Y + 2.2, 0);
  flush(a, MINT, 1.5);

  // Shards: broken strokes, tumbling. Hot when the catch rule makes them worth something.
  for (const s of g.shards) {
    const c = Math.cos(s.ang);
    const n = Math.sin(s.ang);
    const hx = s.hx * c - s.hy * n;
    const hy = s.hx * n + s.hy * c;
    seg(g.bits & 4 ? h : a, s.x - hx, s.y - hy, hz * 0.6, s.x + hx, s.y + hy, hz * 0.6);
  }
  flush(a, MINT, 1.1, 0.55);
  flush(h, HOT, 1.1, 0.8);

  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    seg(h, s.x, s.y, hz, s.x + s.vx * 0.05, s.y + s.vy * 0.05, hz);
    s.x += s.vx / 60;
    s.y += s.vy / 60;
    s.life -= 1 / 24;
    if (s.life <= 0) sparks.splice(i, 1);
  }
  flush(h, HOT, 1.2, 0.9);

  // The ball.
  const b = g.ball;
  if (g.state !== "over") {
    const c = proj(b.x, b.y, BALL_R * viewT);
    const r = BALL_R * c[2] * unit;
    ctx.strokeStyle = HOT;
    ctx.beginPath();
    ctx.arc(c[0], c[1], r, 0, Math.PI * 2);
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 7 * dpr;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.8 * dpr;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ---- sound: off until asked for
let ac = null;
function blip(f, dur = 0.05, type = "square", vol = 0.035) {
  if (!soundOn || mode !== "player") return;
  ac = ac || new (window.AudioContext || window.webkitAudioContext)();
  const o = ac.createOscillator();
  const v = ac.createGain();
  o.type = type;
  o.frequency.value = f;
  v.gain.setValueAtTime(vol, ac.currentTime);
  v.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  o.connect(v).connect(ac.destination);
  o.start();
  o.stop(ac.currentTime + dur);
}
function onEvent(e) {
  if (e.type === "hit") {
    blip(440 + e.combo * 80, 0.07);
    if (!reduce.matches) for (let i = 0; i < 5; i++) sparks.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 70, vy: (Math.random() - 0.5) * 70, life: 1 });
  } else if (e.type === "paddle") blip(196, 0.05, "triangle", 0.06);
  else if (e.type === "wall") blip(147, 0.03, "triangle", 0.04);
  else if (e.type === "catch") blip(988, 0.08);
  else if (e.type === "lost") blip(82, 0.35, "sawtooth", 0.05);
  else if (e.type === "clear") [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.14), i * 110));
}

// ---- the readouts
const pad = (n) => String(n).padStart(4, "0");
function hud() {
  $("#hud-score").textContent = pad(g.score);
  $("#hud-house").textContent = pad(HOUSE[bits]);
  $("#hud-balls").textContent = [0, 1, 2].map((i) => (i < g.balls ? "●" : "○")).join(" ");
}
function say(text, blink = false) {
  if (msg.dataset.t === text) return;
  msg.dataset.t = text;
  msg.innerHTML = text;
  msg.classList.toggle("blink", blink && !reduce.matches);
}
function message() {
  const code = ruleCode(bits);
  if (mode === "attract") say(`Press start\n<b>the house is playing ${code}</b>`, true);
  else if (mode === "player" && g.ball.held) say(g.state === "ready" ? "Click or press Space to serve" : `Ball lost\nserve again`, true);
  else if (mode === "player") say(g.mixed ? "" : "");
  else if (mode === "done") {
    const rank = g.mixed ? "mixed rules: unranked" : g.score > HOUSE[bits] ? "you beat the house" : `the house has ${HOUSE[bits]}`;
    say(g.state === "clear" ? `Name cleared: ${g.score}\n<b>${rank}</b>` : `Game over: ${g.score}\n<b>${g.left} strokes left, ${rank}</b>`);
  }
}
function table() {
  for (const tr of $$("#scores tbody tr")) {
    const b = Number(tr.dataset.bits);
    tr.classList.toggle("is-on", b === bits);
    const you = $(".you", tr);
    you.textContent = best[b] ? best[b] : "–";
    you.classList.toggle("beat", best[b] > HOUSE[b]);
  }
  for (const btn of $$("#rules .rule")) {
    const r = RULES.find((x) => x.bit === Number(btn.dataset.bit));
    const on = !!(bits & r.bit);
    btn.setAttribute("aria-checked", on);
    $("b", btn).textContent = on ? r.on : r.off;
  }
}

function attract() {
  mode = "attract";
  g = createGame(bits, HOUSE_SEED);
  idle = 0;
  startBtn.textContent = "Start";
}
function startGame() {
  mode = "player";
  games++;
  g = createGame(bits, (Date.now() ^ (games * 7919)) >>> 0);
  sparks = [];
  startBtn.textContent = "Restart";
}
function press() {
  if (mode !== "player") startGame();
  wantLaunch = true;
}
function finish() {
  mode = "done";
  idle = 0;
  if (!g.mixed && g.score > best[bits]) {
    best[bits] = g.score;
    try {
      localStorage.setItem(KEY, JSON.stringify(best));
    } catch {}
  }
  startBtn.textContent = "Play again";
  table();
}
function setBits(next) {
  if (next === bits) return;
  bits = next;
  if (mode === "player") setRules(g, bits);
  else attract();
  table();
}

function tick() {
  let input = { target: null };
  if (mode === "attract") {
    if (reduce.matches) return; // the house sits still when motion is not wanted
    input = autopilot(g);
  } else if (mode === "player") {
    input = { target: keyDir ? g.paddle.x + keyDir * 150 * DT : target, launch: wantLaunch };
    if (keyDir) target = null;
    wantLaunch = false;
  }
  step(g, input);
  for (const e of g.events) onEvent(e);
  g.events.length = 0;
  if (g.state === "over" || g.state === "clear") {
    if (mode === "player") finish();
    else if ((idle += DT) > (mode === "done" ? 12 : 3.5)) attract();
  }
}

let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (heroVisible) {
    const goal = view3d ? 1 : 0;
    viewT = reduce.matches || Math.abs(goal - viewT) < 0.002 ? goal : viewT + (goal - viewT) * Math.min(1, dt * 5);
    acc += dt;
    let n = 0;
    while (acc >= DT && n++ < 8) {
      tick();
      acc -= DT;
    }
    if (acc > DT) acc = 0;
    draw();
    hud();
    message();
  }
  requestAnimationFrame(frame);
}
new IntersectionObserver(([e]) => (heroVisible = e.isIntersecting)).observe(monitor);

monitor.addEventListener("pointermove", (e) => (target = fieldX(e.clientX)));
monitor.addEventListener("pointerdown", (e) => {
  target = fieldX(e.clientX);
  press();
});
startBtn.addEventListener("click", () => {
  startGame();
  monitor.focus({ preventScroll: true });
});
addEventListener("keydown", (e) => {
  if (!heroVisible || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  if (t instanceof Element && t.closest("input, textarea, select")) return;
  const k = e.key.toLowerCase();
  if (k === "arrowleft" || k === "a") keyDir = -1;
  else if (k === "arrowright" || k === "d") keyDir = 1;
  else if ((k === " " || k === "enter") && (t === document.body || t === monitor)) press();
  else return;
  if (t === document.body || t === monitor) e.preventDefault();
});
addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  if ((k === "arrowleft" || k === "a") && keyDir < 0) keyDir = 0;
  if ((k === "arrowright" || k === "d") && keyDir > 0) keyDir = 0;
});
for (const btn of $$("#rules .rule")) btn.addEventListener("click", () => setBits(bits ^ Number(btn.dataset.bit)));
for (const tr of $$("#scores tbody tr")) $("button", tr).addEventListener("click", () => setBits(Number(tr.dataset.bits)));
$("#view").addEventListener("click", (e) => {
  view3d = !view3d;
  monitor.classList.toggle("is-3d", view3d);
  e.currentTarget.setAttribute("aria-checked", view3d);
  $("b", e.currentTarget).textContent = view3d ? "3D" : "2D";
});
$("#sound").addEventListener("click", (e) => {
  soundOn = !soundOn;
  e.currentTarget.setAttribute("aria-checked", soundOn);
  $("b", e.currentTarget).textContent = soundOn ? "On" : "Off";
});
table();
requestAnimationFrame(frame);
// For checking the page from a console: the live game, and a way to run it without waiting on frames.
window.arcade = { get game() { return g; }, get mode() { return mode; }, tick, draw, press, setBits }; // prettier-ignore

// ---------------------------------------------------------- the shelf
const shelf = $("#shelf");
shelf.dataset.view = "2d";
for (const btn of $$(".seg button", shelf))
  btn.addEventListener("click", () => {
    shelf.dataset.view = btn.dataset.view;
    for (const b of $$(".seg button", shelf)) b.setAttribute("aria-pressed", b === btn);
  });

// ---------------------------------------------------------- grooph's loop
{
  const root = $("#loop");
  const tok = $("#loop-token");
  const read = $("#loop-read");
  const again = $("#loop-again");
  const accept = $("#loop-accept");
  const sw = $("#loop-nostop");
  const DUR = { build: 0.9, toCheck: 0.7, check: 0.9, back: 1.1, toYou: 0.7 };
  const P = [[180, 100], [180, 30], [60, 30], [60, 100]]; // prettier-ignore
  const curve = (u) => {
    const m = 1 - u;
    const k = [m * m * m, 3 * m * m * u, 3 * m * u * u, u * u * u];
    return [0, 1].map((i) => P[0][i] * k[0] + P[1][i] * k[1] + P[2][i] * k[2] + P[3][i] * k[3]);
  };
  let phase = "build";
  let t = 0;
  let lap = 1;
  let stop = true;
  let seen = false;
  let was = performance.now();
  const place = (x, y) => (tok.setAttribute("cx", x), tok.setAttribute("cy", y));
  function set(p) {
    phase = p;
    t = 0;
    again.disabled = !(p === "you" || p === "done");
    accept.disabled = p !== "you";
    again.textContent = p === "done" ? "Run it again" : "Send it back";
    const line = {
      build: `Lap ${lap}. The builder is building.`,
      check: !stop ? `Lap ${lap}. Bar not met, and no stop is named, so nothing ever ends this loop. grooph checks for exactly this before it compiles.` : lap < 3 ? `Lap ${lap}. The checker inspects the bar: not met. Again.` : `Lap ${lap}. The checker inspects the bar: passed.`,
      you: "The loop stops here, at a person. Accept the work, or send it back.",
      done: `Accepted on lap ${lap}. The loop ended where its graph said it would.`,
    }[p];
    if (line) read.textContent = line;
    if (p === "build") place(60, 120);
    if (p === "you" || p === "done") place(300, 120);
  }
  function run(now) {
    const dt = Math.min(0.05, (now - was) / 1000);
    was = now;
    if (seen && DUR[phase]) {
      t += dt;
      const u = Math.min(1, t / DUR[phase]);
      const e = u * u * (3 - 2 * u);
      if (phase === "toCheck") place(60 + 120 * e, 120);
      else if (phase === "check") place(180, 120);
      else if (phase === "back") place(...curve(e));
      else if (phase === "toYou") place(180 + 120 * e, 120);
      if (u >= 1) {
        if (phase === "build") set("toCheck");
        else if (phase === "toCheck") set("check");
        else if (phase === "check") set(!stop || lap < 3 ? "back" : "toYou");
        else if (phase === "back") (lap++, set("build"));
        else if (phase === "toYou") set("you");
      }
    }
    requestAnimationFrame(run);
  }
  again.addEventListener("click", () => ((lap = phase === "done" ? 1 : lap + 1), set("build")));
  accept.addEventListener("click", () => set("done"));
  sw.addEventListener("click", () => {
    stop = !stop;
    root.classList.toggle("no-stop", !stop);
    sw.setAttribute("aria-checked", stop);
    $("b", sw).textContent = stop ? "Named" : "Missing";
    lap = 1;
    set(reduce.matches && stop ? "you" : "build");
    if (reduce.matches && !stop) read.textContent = "No stop is named, so nothing would ever end this loop. grooph checks for exactly this before it compiles.";
  });
  new IntersectionObserver(([e]) => (seen = e.isIntersecting)).observe(root);
  if (reduce.matches) ((lap = 3), set("you"));
  else requestAnimationFrame(run);
}

// ---------------------------------------------------------- Amordle's round
{
  const plate = $("#amo");
  const range = $("#amo-range");
  const clock = $("#amo-clock");
  const pools = $("#amo-pools");
  const modeBtn = $("#amo-mode");
  const hardBtn = $("#amo-hard");
  const board = $("#amo-board");
  const read = $("#amo-read");
  const status = $("#amo-status");
  const suggest = $("#amo-suggest");
  const keys = $("#amo-keys");
  let go = false;
  let hard = false;
  let round = null;
  let draft = "";
  let lists = new Map(); // length -> { answers, all: Set, sorted }
  let reached = false;
  let seen = false;
  let deal = 0;
  const NUM = ["zero", "one", "two", "three", "four", "five", "six"];

  pools.innerHTML = "<i></i>".repeat(40);
  const cells = $$("i", pools);
  function poolView() {
    const c = Number(clock.value);
    $("#amo-clockn").textContent = c;
    const row = (go ? 2 : 0) + (hard ? 1 : 0);
    cells.forEach((el, i) => (el.className = (Math.floor(i / 10) === row ? "row " : "") + (i === row * 10 + c - 1 ? "on" : "")));
    $("#amo-pool").textContent = `Pool ${row * 10 + c} of 40: ${go ? "GO" : "OG"}, Hard Mode ${hard ? "on" : "off"}, clock ${c}. A rating earned here is only ever compared with ratings earned here.`;
  }

  async function words(n) {
    if (!lists.has(n))
      lists.set(
        n,
        fetch(`assets/words/${n}.txt`)
          .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
          .then((t) => {
            const [a, b = ""] = t.split("\n");
            const rest = b.split("|").pop(); // after the marker for the repository's spelling check
            const answers = a.split(" ").filter(Boolean);
            const sorted = [...answers, ...rest.split(" ").filter(Boolean)].sort();
            return { answers, all: new Set(sorted), sorted };
          }),
      );
    return lists.get(n);
  }

  function pick(answers, k) {
    const pool = [...answers];
    const out = [];
    while (out.length < k && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return out;
  }

  async function start() {
    const n = Number(range.value);
    const ticket = ++deal;
    draft = "";
    read.textContent = "Dealing a word…";
    let list;
    try {
      list = await words(n);
    } catch {
      read.textContent = "The word list did not load. Try New round.";
      lists.delete(n);
      return;
    }
    if (ticket !== deal) return;
    round = newRound({ length: n, mode: go ? "go" : "og", hard, answers: pick(list.answers, go ? GO_PUZZLES : 1) });
    round.list = list;
    read.textContent = "Type a word, then Enter.";
    render();
  }

  const markText = { correct: "in the word, in this spot", present: "in the word, elsewhere", absent: "not in the word" };
  function rowHTML(letters, marks, cls, label) {
    const tiles = [];
    for (let i = 0; i < round.length; i++) tiles.push(`<i class="${marks ? marks[i] : letters[i] ? "typed" : ""}">${letters[i] ? letters[i].toUpperCase() : ""}</i>`);
    return `<div class="amo__row ${cls}"${label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"'}>${tiles.join("")}</div>`;
  }
  function render() {
    if (!round) return;
    const n = round.length;
    const rows = puzzleRows(round);
    const budget = budgetFor(round.mode, round.index);
    const used = guessesUsed(round);
    const html = [];
    for (const row of rows) {
      const label = `${row.seeded ? "Evidence from an earlier answer," : "Guess"} ${row.guess.toUpperCase()}: ${row.marks.map((m, i) => `${row.guess[i].toUpperCase()} ${markText[m]}`).join(", ")}`;
      html.push(rowHTML(row.guess, row.marks, row.seeded ? "seeded" : "done", label));
    }
    if (round.status === "active") {
      html.push(rowHTML(draft, null, "now", `Your guess so far: ${draft.toUpperCase() || "empty"}, ${draft.length} of ${n} letters`));
      for (let i = used + 1; i < budget; i++) html.push(rowHTML("", null, "empty"));
    }
    board.style.setProperty("--n", n);
    board.innerHTML = html.join("");
    // Past twelve letters the tiles are too small to read: spell the guess out too.
    $("#amo-draft").textContent = round.status === "active" && n > 12 ? draft.toUpperCase().padEnd(n, "·") : "";
    const where = round.mode === "go" ? `GO · puzzle ${round.index + 1} of ${round.answers.length}` : "OG";
    const left = budget - used;
    status.textContent = `${where} · ${n} letters · ${round.status === "active" ? `${NUM[left] || left} guess${left === 1 ? "" : "es"} left` : round.status === "won" ? "solved" : round.status === "holding" ? "solved, next puzzle coming" : "out of guesses"}`;
    // the keyboard's evidence
    const ev = evidence(round);
    for (const k of $$("button[data-k]", keys)) {
      const m = ev[k.dataset.k];
      for (const c of ["correct", "present", "absent"]) k.classList.toggle(c, m === c);
    }
    // suggestions, for the lengths whose list is a slice
    suggest.innerHTML = "";
    if (round.status === "active" && n > 5 && draft.length >= 2) {
      const hits = [];
      for (const w of round.list.sorted) {
        if (w.startsWith(draft)) hits.push(w);
        if (hits.length === 6) break;
      }
      suggest.innerHTML = hits.map((w) => `<button type="button" data-w="${w}">${w.toUpperCase()}</button>`).join("");
    }
  }

  function finishLine() {
    const answer = round.answers[round.index].toUpperCase();
    const used = guessesUsed(round);
    if (round.status === "won") return round.mode === "go" ? `Chain complete: all ${NUM[round.answers.length]} puzzles, the last in ${NUM[used]} guess${used === 1 ? "" : "es"}. New round deals another.` : `Solved in ${NUM[used]} of ${NUM[OG_GUESSES]} guesses. New round deals another.`;
    if (round.status === "lost") return `Out of guesses. The word was ${answer}.${round.mode === "go" ? ` The chain ends at puzzle ${round.index + 1}.` : ""} New round deals another.`;
    return `Solved: ${answer}. It goes onto the next board as evidence.`;
  }
  function type(k) {
    if (!round || round.status !== "active") return;
    if (k === "enter") {
      const why = submit(round, draft, round.list.all);
      if (why) {
        read.textContent = why;
        board.classList.remove("nope");
        void board.offsetWidth;
        if (!reduce.matches) board.classList.add("nope");
        return;
      }
      draft = "";
      read.textContent = round.status === "active" ? "" : finishLine();
      if (round.status === "holding") {
        const r = round;
        setTimeout(() => {
          if (round !== r) return;
          advance(r);
          read.textContent = `Puzzle ${r.index + 1} of ${r.answers.length}: the answers so far are already on the board, scored against the new word. ${NUM[budgetFor(r.mode, r.index)].replace(/^./, (c) => c.toUpperCase())} guesses.`;
          render();
        }, 1600);
      }
    } else if (k === "delete") draft = draft.slice(0, -1);
    else if (/^[a-z]$/.test(k) && draft.length < round.length) draft += k;
    else return;
    render();
  }

  keys.innerHTML = ["qwertyuiop", "asdfghjkl", "+zxcvbnm-"]
    .map((row) => `<div>${[...row].map((c) => (c === "+" ? '<button type="button" data-k="enter" class="wide">Enter</button>' : c === "-" ? '<button type="button" data-k="delete" class="wide" aria-label="Delete">Del</button>' : `<button type="button" data-k="${c}">${c.toUpperCase()}</button>`)).join("")}</div>`)
    .join("");
  keys.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-k]");
    if (b) type(b.dataset.k);
  });
  suggest.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-w]");
    if (!b || !round) return;
    draft = b.dataset.w;
    render();
    board.focus({ preventScroll: true });
  });
  board.addEventListener("pointerdown", () => board.focus({ preventScroll: true }));
  // Typing goes to the round when the board (or a key) has focus, or when
  // nothing does and the round is on screen.
  addEventListener("keydown", (e) => {
    if (!round || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    const inside = t instanceof Element && plate.contains(t) && !t.closest("input");
    if (!inside && !(t === document.body && seen)) return;
    const k = e.key === "Backspace" ? "delete" : e.key === "Enter" ? "enter" : e.key.toLowerCase();
    if (k === "enter" && t !== board && t !== document.body) return; // Enter on a button presses the button
    if (k !== "enter" && k !== "delete" && !/^[a-z]$/.test(k)) return;
    e.preventDefault();
    type(k);
  });

  const flip = (btn, get, labels) =>
    btn.addEventListener("click", () => {
      const v = get();
      btn.setAttribute("aria-checked", v);
      $("b", btn).textContent = labels[v ? 1 : 0];
      poolView();
      start();
    });
  flip(modeBtn, () => (go = !go), ["OG", "GO"]);
  flip(hardBtn, () => (hard = !hard), ["Off", "On"]);
  range.addEventListener("input", () => {
    $("#amo-len").textContent = range.value;
    clearTimeout(range.wait);
    range.wait = setTimeout(start, 250);
  });
  clock.addEventListener("input", poolView);
  $("#amo-new").addEventListener("click", start);
  poolView();
  // The words load when the cabinet comes near, not with the page.
  new IntersectionObserver(
    ([e]) => {
      seen = e.intersectionRatio > 0.3;
      if (e.isIntersecting && !reached) {
        reached = true;
        start();
      }
    },
    { rootMargin: "300px 0px", threshold: [0, 0.3] },
  ).observe(plate);
  window.amordle = { get round() { return round; }, get draft() { return draft; }, type, start }; // prettier-ignore
}

// ---------------------------------------------------------- Ars Magna's letters
{
  const svg = $("#ars-svg");
  const letters = [..."ARSMAGNA"];
  const from = [0, 1, 2, 4, 5, 6, 7, 8]; // cells in ARS MAGNA (cell 3 is the space)
  const to = [0, 4, 7, 6, 2, 3, 1, 5]; // cells in ANAGRAMS
  const cwid = 8;
  const gap = 2.6;
  const x0 = [(100 - (9 * cwid + 8 * gap)) / 2, (100 - (8 * cwid + 7 * gap)) / 2];
  svg.innerHTML = letters
    .map((c) => `<g${c === "A" ? ' class="a"' : ""}><path d="${glyphSegments(c).map(([a, b, d, e]) => `M${a * 2} ${b * 2}L${d * 2} ${e * 2}`).join("")}"/></g>`)
    .join("");
  const gs = $$("g", svg);
  let flipped = false;
  const lay = () => gs.forEach((el, i) => (el.style.transform = `translate(${(x0[flipped ? 1 : 0] + (flipped ? to : from)[i] * (cwid + gap)).toFixed(2)}px, 7px)`));
  lay();
  $("#ars-go").addEventListener("click", () => {
    flipped = !flipped;
    lay();
    $("#ars-read").textContent = flipped ? "ANAGRAMS. The same eight letters, each used exactly once." : "ARS MAGNA. Latin for “the great art.”";
    svg.setAttribute("aria-label", flipped ? "The letters of ANAGRAMS, which rearrange into ARS MAGNA." : "The letters of ARS MAGNA, which rearrange into ANAGRAMS.");
  });
}
