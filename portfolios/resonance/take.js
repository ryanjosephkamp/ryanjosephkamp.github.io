// The take: what a visitor last played, kept so the page can play it back.
// It is not sound. It holds where the bow sat (the figure, as a number), how
// hard the plate rang, and which bars were struck, each against the clock.
// A pause of four seconds ends a take; the next note starts a new one.
//
// No DOM in this file: tools/check-take.mjs runs it in Node.

export const TAKE_GAP = 4000; // ms of silence that ends a take
export const TAKE_MAX = 30000; // ms a take holds
const QUIET = 0.03; // ringing softer than this is silence
const STEP = 30; // ms between kept frames

export class Take {
  constructor() {
    this.frames = []; // { t, u, e }
    this.pings = []; // { t, hz, seconds, gain }
    this.t0 = 0;
    this.last = -Infinity;
    this.closed = true;
  }

  get empty() {
    return !this.frames.length && !this.pings.length;
  }

  // How long the take runs, in ms.
  get length() {
    const f = this.frames[this.frames.length - 1];
    const p = this.pings[this.pings.length - 1];
    return Math.max(f ? f.t : 0, p ? p.t + p.seconds * 1000 : 0);
  }

  // Something is sounding at `now`: carry on, or begin again after a pause.
  open(now) {
    if (this.closed || now - this.last > TAKE_GAP) {
      this.frames = [];
      this.pings = [];
      this.t0 = now;
      this.closed = false;
    }
    this.last = now;
    return now - this.t0;
  }

  // One frame of the plate ringing: bow position u and strength e.
  frame(now, u, e) {
    if (e < QUIET) return;
    const t = this.open(now);
    if (t > TAKE_MAX) return;
    const prev = this.frames[this.frames.length - 1];
    if (prev && t - prev.t < STEP) return;
    this.frames.push({ t, u, e });
  }

  ping(now, hz, seconds, gain) {
    const t = this.open(now);
    if (t <= TAKE_MAX) this.pings.push({ t, hz, seconds, gain });
  }

  // Ends the take, so the next note starts a new one, and returns a player
  // for it. player.at(t) gives what to do t ms into the playback.
  player() {
    this.closed = true;
    const frames = this.frames.slice();
    const pings = this.pings.slice();
    const end = this.length;
    let i = 0;
    let pi = 0;
    let given = -1; // the last frame handed out
    return {
      end,
      at(t) {
        while (i < frames.length - 1 && frames[i + 1].t <= t) i++;
        const f = frames[i];
        const next = frames[i + 1];
        // A frame stands until the next one, or for a moment when the next
        // is far off (the plate fell silent there). A frame not yet handed
        // out is handed out once however late the page gets to it, so a
        // slow page still reaches every figure, the last one included.
        const stand = next ? Math.min(next.t - f.t, 250) : 90;
        const ringing = f && f.t <= t && (t - f.t <= stand || i !== given);
        if (ringing) given = i;
        const due = [];
        while (pi < pings.length && pings[pi].t <= t) due.push(pings[pi++]);
        return { u: ringing ? f.u : null, e: ringing ? f.e : 0, pings: due, done: t > end + 400 };
      },
    };
  }
}
