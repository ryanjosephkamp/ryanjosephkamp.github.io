// Ryan Kamp — portfolio. No dependencies.

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const GAP = 0.5; // width of a word space, in tile units
const LEADING = 1.1; // distance between stacked lines, in tile units

const letters = (phrase) => [...phrase.replace(/\s/g, '')];

// Indices (in letters-only numbering) after which a word space falls.
function breaksOf(phrase) {
  const set = new Set();
  let i = -1;
  for (const ch of phrase) {
    if (ch === ' ') set.add(i);
    else i += 1;
  }
  return set;
}

const factorial = (n) => (n <= 1 ? 1 : n * factorial(n - 1));

// How many distinct orderings a bag of letters has, and where one ordering
// falls among them alphabetically (1-based).
function orderings(counts, n) {
  return Object.values(counts).reduce((total, k) => total / factorial(k), factorial(n));
}
function rankOf(chars) {
  const counts = {};
  chars.forEach((c) => { counts[c] = (counts[c] || 0) + 1; });
  const alphabet = Object.keys(counts).sort();
  let rank = 1;
  let n = chars.length;
  for (const c of chars) {
    for (const k of alphabet) {
      if (k >= c) break;
      if (counts[k] > 0) {
        counts[k] -= 1;
        rank += orderings(counts, n - 1);
        counts[k] += 1;
      }
    }
    counts[c] -= 1;
    n -= 1;
  }
  return rank;
}

// The inverse: the ordering that sits at a given rank.
function unrank(rank, chars) {
  const counts = {};
  chars.forEach((c) => { counts[c] = (counts[c] || 0) + 1; });
  const alphabet = Object.keys(counts).sort();
  let r = rank - 1;
  let out = '';
  for (let n = chars.length; n > 0; n -= 1) {
    for (const k of alphabet) {
      if (!counts[k]) continue;
      counts[k] -= 1;
      const block = orderings(counts, n - 1);
      if (r < block) {
        out += k;
        break;
      }
      r -= block;
      counts[k] += 1;
    }
  }
  return out;
}

/**
 * A row of letter tiles that can be rearranged, by code or by hand,
 * into any of the phrases it knows. Every phrase must use the same letters.
 */
class TileRow {
  constructor(root, phrases, { maxUnit = 150, stackBelow = 0, onChange } = {}) {
    this.root = root;
    this.phrases = phrases;
    this.maxUnit = maxUnit;
    this.stackBelow = stackBelow; // narrower than this, each word gets its own line
    this.longest = Math.max(...phrases.flatMap((p) => p.split(' ').map((w) => w.length)));
    this.onChange = onChange;
    this.known = new Map(phrases.map((p) => [letters(p).join(''), p]));
    this.units = Math.max(...phrases.map((p) => letters(p).length + breaksOf(p).size * GAP));

    root.textContent = '';
    this.phrase = phrases[0];
    this.breaks = breaksOf(this.phrase);
    this.order = letters(this.phrase).map((ch) => this.makeTile(ch));
    this.cursor = 0; // how many tiles have been placed by typing

    this.measure();
    // Width only: stacking changes the row's own height.
    new ResizeObserver(() => { if (root.clientWidth !== this.width) this.measure(); }).observe(root);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  }

  makeTile(ch) {
    const el = document.createElement('span');
    el.className = 'tile';
    const face = document.createElement('span');
    face.className = 'tile__face';
    face.textContent = ch;
    face.dataset.n = ch.charCodeAt(0) - 64;
    el.append(face);
    this.root.append(el);
    const tile = { ch, el, face, x: 0, i: 0 };
    el.addEventListener('pointerdown', (e) => this.startDrag(e, tile));
    return tile;
  }

  measure() {
    const width = this.root.clientWidth;
    this.width = width;
    this.stacked = width < this.stackBelow;
    this.u = Math.min(width / (this.stacked ? this.longest : this.units), this.maxUnit);
    this.root.style.setProperty('--u', `${this.u.toFixed(2)}px`);
    this.root.classList.toggle('is-stacked', this.stacked);
    this.layout();
  }

  // Top-left corner of every slot, in tile units, centered on zero across.
  slots() {
    const n = this.order.length;
    const out = [];
    if (!this.stacked) {
      let x = 0;
      for (let i = 0; i < n; i += 1) {
        out.push({ x, y: 0 });
        x += 1;
        if (this.breaks.has(i)) x += GAP;
      }
      out.forEach((slot) => { slot.x -= x / 2; });
      this.rows = 1;
      return out;
    }
    let line = [];
    let row = 0;
    for (let i = 0; i < n; i += 1) {
      line.push(i);
      if (this.breaks.has(i) || i === n - 1) {
        line.forEach((_, j) => out.push({ x: j - line.length / 2, y: row * LEADING }));
        row += 1;
        line = [];
      }
    }
    this.rows = row;
    return out;
  }

  layout(skip) {
    if (!this.order) return;
    const slots = this.slots();
    this.root.style.setProperty('--rows', this.rows);
    this.order.forEach((tile, i) => {
      tile.i = i;
      tile.x = slots[i].x;
      tile.y = slots[i].y;
      if (tile !== skip) {
        tile.el.style.setProperty('--x', tile.x.toFixed(3));
        tile.el.style.setProperty('--y', tile.y.toFixed(3));
      }
    });
  }

  text() {
    return this.order.map((t, i) => t.ch + (this.breaks.has(i) && i < this.order.length - 1 ? ' ' : '')).join('');
  }

  setPhrase(phrase, { stagger = 38 } = {}) {
    this.clearTyped();
    const pool = [...this.order];
    const before = new Map(this.order.map((t) => [t, t.x]));
    // Give each target letter the nearest unused tile that carries it.
    const next = letters(phrase).map((ch, i) => {
      let best = -1;
      let dist = Infinity;
      pool.forEach((t, j) => {
        if (t && t.ch === ch && Math.abs(t.i - i) < dist) {
          dist = Math.abs(t.i - i);
          best = j;
        }
      });
      const tile = pool[best];
      pool[best] = null;
      return tile;
    });

    this.order = next;
    this.breaks = breaksOf(phrase);
    this.phrase = phrase;
    this.order.forEach((t, i) => { t.el.style.transitionDelay = `${i * stagger}ms`; });
    this.layout();
    this.order.forEach((t, i) => this.hop(t, t.x - before.get(t), i * stagger));
    this.emit(false);
  }

  // Tiles heading right arc over the row; tiles heading left duck under it.
  hop(tile, dx, delay) {
    if (reduceMotion.matches || Math.abs(dx) < 0.3) return;
    const over = dx > 0;
    const lift = Math.min(18 + Math.abs(dx) * 16, 70) * (over ? -1 : 1);
    tile.el.style.zIndex = over ? 3 : 1;
    tile.face.animate(
      [
        { transform: 'translateY(0) rotate(0deg)' },
        { transform: `translateY(${lift}%) rotate(${over ? 7 : -7}deg)`, offset: 0.42 },
        { transform: 'translateY(0) rotate(0deg)' },
      ],
      { duration: 750, delay, easing: 'cubic-bezier(0.3, 0.7, 0.3, 1)' },
    ).finished.then(() => { tile.el.style.zIndex = ''; }, () => {});
  }

  // A wave down the row, for a phrase found by hand.
  cheer() {
    this.root.classList.add('is-lit');
    setTimeout(() => this.root.classList.remove('is-lit'), 1100);
    if (reduceMotion.matches) return;
    this.order.forEach((tile, i) => {
      tile.face.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(-26%)', offset: 0.4 }, { transform: 'translateY(0)' }],
        { duration: 520, delay: i * 55, easing: 'cubic-bezier(0.3, 0.7, 0.3, 1)' },
      );
    });
  }

  dropIn() {
    if (reduceMotion.matches) return;
    this.order.forEach((tile, i) => {
      tile.face.animate(
        [
          { transform: 'translateY(-140%) rotate(-9deg)', opacity: 0 },
          { opacity: 1, offset: 0.5 },
          { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
        ],
        { duration: 800, delay: 120 + i * 60, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' },
      );
    });
  }

  // Typing places tiles left to right, the way a word game takes a guess.
  type(ch) {
    const from = this.order.findIndex((t, i) => i >= this.cursor && t.ch === ch);
    if (from < 0) return false;
    const before = new Map(this.order.map((t) => [t, t.x]));
    const [tile] = this.order.splice(from, 1);
    this.order.splice(this.cursor, 0, tile);
    this.cursor += 1;
    this.order.forEach((t) => { t.el.style.transitionDelay = '0ms'; });
    tile.el.classList.add('is-typed');
    this.layout();
    const dx = tile.x - before.get(tile);
    if (Math.abs(dx) >= 0.3) this.hop(tile, dx, 0);
    else if (!reduceMotion.matches) {
      tile.face.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(9%)' }, { transform: 'translateY(0)' }],
        { duration: 220, easing: 'ease-out' },
      );
    }
    if (this.cursor === this.order.length) {
      this.clearTyped();
      this.settle();
    } else {
      this.phrase = null;
      this.emit(true, true);
    }
    return true;
  }

  erase() {
    if (!this.cursor) return;
    this.cursor -= 1;
    this.order[this.cursor].el.classList.remove('is-typed');
    this.emit(true, true);
  }

  clearTyped() {
    this.cursor = 0;
    this.order.forEach((t) => t.el.classList.remove('is-typed'));
  }

  // After a rearrangement by hand: is this one of the phrases we know?
  settle() {
    const hit = this.known.get(this.order.map((t) => t.ch).join(''));
    this.phrase = hit ?? null;
    if (hit) {
      this.breaks = breaksOf(hit);
      this.layout();
    }
    this.emit(true);
  }

  startDrag(e, tile) {
    if (e.button) return;
    e.preventDefault();
    this.clearTyped();
    const { el } = tile;
    const start = { x: e.clientX, y: e.clientY };
    // Start from where the tile is drawn right now, which may be mid-flight.
    const box = this.root.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const origin = {
      x: (rect.left - box.left - box.width / 2) / this.u - 0.04,
      y: (rect.top - box.top) / this.u,
    };
    let moved = false;
    el.setPointerCapture(e.pointerId);
    el.classList.add('is-held');
    this.order.forEach((t) => { t.el.style.transitionDelay = '0ms'; });

    const move = (ev) => {
      const x = origin.x + (ev.clientX - start.x) / this.u;
      const y = origin.y + (ev.clientY - start.y) / this.u;
      if (Math.hypot(x - origin.x, y - origin.y) > 0.08) moved = true;
      el.style.setProperty('--x', x.toFixed(3));
      el.style.setProperty('--y', y.toFixed(3));
      const slots = this.slots();
      let to = 0;
      let best = Infinity;
      slots.forEach((slot, i) => {
        const d = Math.hypot(slot.x - x, slot.y - y);
        if (d < best) {
          best = d;
          to = i;
        }
      });
      const from = this.order.indexOf(tile);
      if (to !== from) {
        this.order.splice(from, 1);
        this.order.splice(to, 0, tile);
        this.layout(tile);
      }
    };
    const end = () => {
      el.classList.remove('is-held');
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', end);
      this.layout();
      if (moved) this.settle();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  emit(byHand, typing = false) {
    this.onChange?.({ phrase: this.phrase, text: this.text(), byHand, typing, placed: this.cursor });
  }
}

/* ---------- Hero: the name and its anagrams ---------- */

const NAME = 'RYAN KAMP';
const ENTRIES = {
  'RYAN KAMP': ['proper noun', 'Graduate student in computer science at the University of Cincinnati.'],
  'MAY PRANK': ['noun', 'The same eight letters, misbehaving.'],
  'PARK MANY': ['verb phrase', 'What a valet does on a good night.'],
  'RAMP YANK': ['noun', 'A skateboarding accident, shortly before it happens.'],
  'ARMY KNAP': ['verb phrase', 'To chip flint, in formation.'],
};

function hero() {
  const root = document.getElementById('name-tiles');
  if (!root) return;
  const word = document.getElementById('gloss-word');
  const pos = document.getElementById('gloss-pos');
  const def = document.getElementById('gloss-def');
  const count = document.getElementById('found-count');
  const pips = [...document.querySelectorAll('#pips i')];
  const button = document.getElementById('rearrange');
  const phrases = Object.keys(ENTRIES);
  const rankEl = document.getElementById('rank');
  const found = new Set([NAME]);
  try {
    JSON.parse(localStorage.getItem('portfolio:found') || '[]').forEach((p) => { if (p in ENTRIES) found.add(p); });
  } catch { /* storage unavailable: start fresh */ }
  let touched = false;

  // The shelf: this ordering between its neighbors in the alphabetical
  // list of every ordering. It spins like an odometer as the rank changes.
  const shelf = document.getElementById('shelf');
  const bag = letters(NAME);
  const total = rankOf([...bag].sort().reverse());
  const cells = Array.from({ length: 27 }, (_, i) => {
    const cell = document.createElement('span');
    if (i === 13) cell.className = 'is-here';
    shelf.append(cell);
    return cell;
  });
  const paintShelf = (rank) => {
    cells.forEach((cell, i) => {
      cell.textContent = unrank((((rank - 1 + i - 13) % total) + total) % total + 1, bag);
    });
  };

  // Count the rank readout up or down to its new value.
  let shown = 0;
  let ticking = 0;
  const showRank = (to) => {
    cancelAnimationFrame(ticking);
    const from = shown;
    const t0 = performance.now();
    const step = (now) => {
      const k = reduceMotion.matches ? 1 : Math.min((now - t0) / 650, 1);
      shown = Math.round(from + (to - from) * (1 - (1 - k) ** 4));
      rankEl.textContent = shown.toLocaleString('en-US');
      paintShelf(shown);
      if (k < 1) ticking = requestAnimationFrame(step);
    };
    ticking = requestAnimationFrame(step);
  };
  const paintFound = () => {
    pips.forEach((pip, i) => pip.classList.toggle('is-on', i < found.size));
    count.innerHTML = found.size === phrases.length
      ? 'All five. <a href="https://ars-magna.pages.dev/">Ars Magna</a> finds the rest.'
      : `${found.size} of ${phrases.length} found`;
  };

  const row = new TileRow(root, phrases, {
    maxUnit: 148,
    stackBelow: 560,
    onChange({ phrase, text, byHand, typing, placed }) {
      root.dataset.state = phrase === NAME ? 'name' : phrase ? 'anagram' : 'scramble';
      word.textContent = text;
      showRank(rankOf(letters(text)));
      if (typing) {
        pos.textContent = 'typing';
        def.textContent = `${placed} of ${row.order.length} tiles placed. Backspace takes one back.`;
        return;
      }
      if (phrase) {
        const isNew = !found.has(phrase);
        found.add(phrase);
        [pos.textContent, def.textContent] = ENTRIES[phrase];
        if (byHand && (isNew || phrase !== NAME)) row.cheer();
      } else {
        pos.textContent = 'no entry';
        def.textContent = 'Not English, as far as I know. Keep dragging.';
      }
      paintFound();
      try { localStorage.setItem('portfolio:found', JSON.stringify([...found])); } catch { /* fine */ }
    },
  });
  root.dataset.state = 'name';
  paintFound();
  showRank(rankOf(letters(NAME)));
  row.dropIn();

  const next = () => {
    const here = phrases.indexOf(row.phrase);
    const queue = [...phrases.slice(here + 1), ...phrases.slice(0, Math.max(here, 0))];
    row.setPhrase(queue.find((p) => !found.has(p)) ?? queue[0] ?? NAME);
  };
  button.addEventListener('click', () => { touched = true; next(); });
  root.addEventListener('pointerdown', () => { touched = true; }, { capture: true });

  // Type a guess straight onto the tiles while the hero is on screen.
  let onStage = true;
  new IntersectionObserver(([entry]) => { onStage = entry.isIntersecting; }, { threshold: 0.4 }).observe(root);
  addEventListener('keydown', (e) => {
    if (!onStage || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (/^[a-z]$/i.test(e.key)) {
      if (row.type(e.key.toUpperCase())) touched = true;
    } else if (e.key === 'Backspace' && row.cursor) {
      e.preventDefault();
      row.erase();
    }
  });

  // Show the trick once, then put the name back.
  if (!reduceMotion.matches) {
    setTimeout(() => { if (!touched) row.setPhrase('MAY PRANK'); }, 2100);
    setTimeout(() => { if (!touched) row.setPhrase(NAME); }, 5200);
  }
}

/* ---------- Ars Magna plate ---------- */

function arsMagna() {
  const root = document.getElementById('ars-tiles');
  if (!root) return;
  const label = document.getElementById('ars-label');
  const phrases = ['ARS MAGNA', 'ANAGRAMS'];
  const row = new TileRow(root, phrases, {
    maxUnit: 92,
    onChange({ phrase, text }) {
      root.dataset.state = phrase === phrases[1] ? 'anagram' : phrase ? 'name' : 'scramble';
      label.textContent = text;
    },
  });
  let held = false;
  let timer = 0;
  const flip = () => row.setPhrase(row.phrase === phrases[0] ? phrases[1] : phrases[0], { stagger: 30 });
  root.addEventListener('pointerdown', () => { held = true; clearInterval(timer); }, { capture: true });
  root.closest('.plate__art').addEventListener('click', (e) => {
    if (!e.target.closest('.tile')) flip();
  });
  new IntersectionObserver(([entry]) => {
    clearInterval(timer);
    if (entry.isIntersecting && !held && !reduceMotion.matches) timer = setInterval(flip, 4200);
  }, { threshold: 0.5 }).observe(root);
}

/* ---------- Splashery plate: a blob of soft splats you can poke ---------- */

function splats() {
  const canvas = document.getElementById('splat');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const colors = ['#d9f55a', '#ffffff', '#9fd0ff', '#4f6bff', '#ff8fb8'];
  const sprites = colors.map((color) => {
    const s = document.createElement('canvas');
    s.width = s.height = 64;
    const g = s.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, color);
    grad.addColorStop(0.35, `${color}aa`);
    grad.addColorStop(1, `${color}00`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return s;
  });

  const N = 820;
  const pts = Array.from({ length: N }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / N;
    const r = Math.sqrt(1 - y * y);
    const th = i * 2.399963;
    const x = Math.cos(th) * r;
    const z = Math.sin(th) * r;
    const bump = 1 + 0.16 * Math.sin(3.1 * x + 1) * Math.cos(3.7 * y) + 0.1 * Math.sin(5 * z + y * 2);
    const band = Math.sin(y * 4 + Math.sin(th * 3) * 0.6);
    const c = band > 0.55 ? 0 : band > 0.1 ? 1 : band > -0.4 ? 2 : band > -0.8 ? 3 : 4;
    return { x: x * bump, y: y * bump, z: z * bump, c, s: 0.05 + Math.random() * 0.07, ox: 0, oy: 0, vx: 0, vy: 0 };
  });

  let w = 0;
  let h = 0;
  let dpr = 1;
  const pointer = { x: -9999, y: -9999, on: false };
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  };

  const draw = (t) => {
    const R = Math.min(w, h) * 0.34;
    const cx = w / 2;
    const cy = h * 0.46;
    const a = t * 0.00032;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const tilt = 0.35;
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of pts) {
      const x1 = p.x * ca + p.z * sa;
      const z1 = -p.x * sa + p.z * ca;
      const y1 = p.y * ct - z1 * st;
      const z2 = p.y * st + z1 * ct;
      const depth = 1 / (1.9 - z2 * 0.55);
      const sx = cx + x1 * R * depth * 1.9;
      const sy = cy + y1 * R * depth * 1.9;
      // poke: splats near the pointer are pushed away, then spring home
      const dx = sx + p.ox - pointer.x;
      const dy = sy + p.oy - pointer.y;
      const d2 = dx * dx + dy * dy;
      if (pointer.on && d2 < 8100) {
        const d = Math.sqrt(d2) || 1;
        const f = (1 - d / 90) * 2.6;
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f;
      }
      p.vx += -p.ox * 0.035;
      p.vy += -p.oy * 0.035;
      p.vx *= 0.86;
      p.vy *= 0.86;
      p.ox += p.vx;
      p.oy += p.vy;
      const size = p.s * R * depth * 3.2;
      ctx.globalAlpha = 0.22 + 0.5 * Math.max(0, Math.min(1, (z2 + 1.1) / 2.2));
      ctx.drawImage(sprites[p.c], sx + p.ox - size / 2, sy + p.oy - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  };

  let raf = 0;
  let visible = false;
  const loop = (t) => {
    draw(t);
    if (visible && !reduceMotion.matches) raf = requestAnimationFrame(loop);
  };
  const box = canvas.parentElement;
  const aim = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.on = true;
  };
  box.addEventListener('pointermove', aim);
  box.addEventListener('pointerdown', aim);
  box.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') pointer.on = false; });
  box.addEventListener('pointerleave', () => { pointer.on = false; });
  new ResizeObserver(() => { resize(); draw(performance.now()); }).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    cancelAnimationFrame(raf);
    if (visible) raf = requestAnimationFrame(loop);
  }).observe(canvas);
  resize();
  draw(0);
}

/* ---------- Small things ---------- */

// "software / prompt / context / loop / graph engineering", one at a time.
function swapWords() {
  const el = document.querySelector('[data-swap]');
  if (!el || reduceMotion.matches) return;
  const line = el.parentElement;
  const words = el.dataset.swap.split('|');
  const spoken = document.createElement('span');
  spoken.className = 'sr-only';
  spoken.textContent = line.textContent;
  line.before(spoken);
  line.setAttribute('aria-hidden', 'true');
  let i = 0;
  el.textContent = words[0];
  el.classList.add('swap');
  setInterval(() => {
    i = (i + 1) % words.length;
    el.textContent = words[i];
    el.classList.remove('is-turning');
    void el.offsetWidth;
    el.classList.add('is-turning');
  }, 1900);
}

// The dock slides in once the hero has gone, and marks the section in view.
function dock() {
  const el = document.getElementById('dock');
  if (!el) return;
  new IntersectionObserver(([entry]) => {
    el.classList.toggle('is-on', !entry.isIntersecting);
    el.inert = entry.isIntersecting;
  }, { threshold: 0.12 }).observe(document.querySelector('.hero'));
  const links = new Map([...el.querySelectorAll('a[href^="#"]')].map((a) => [a.hash.slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a, id) => a.toggleAttribute('aria-current', false));
      links.get(entry.target.id)?.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['work', 'research', 'writing', 'contact'].forEach((id) => spy.observe(document.getElementById(id)));
}

// Marks art panels as in view, which starts their (already visible) content moving.
function watch() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.35 });
  document.querySelectorAll('.plate__art').forEach((el) => io.observe(el));
  if (reduceMotion.matches) document.querySelectorAll('animateMotion').forEach((el) => el.remove());
}

console.log('%c RYAN KAMP %c = MAY PRANK = PARK MANY. Type on the tiles to find the rest.', 'background:#2b45d4;color:#fff;font-weight:900;border-radius:4px', 'font-weight:600');

hero();
arsMagna();
splats();
swapWords();
dock();
watch();
