// One round in Amordle's rules, as its How to play page and its README state
// them, with nothing of the page in it (check.mjs tests it in Node):
//
//   OG  one puzzle, one answer, six guesses
//   GO  a chain of puzzles; every answer solved is laid on the next puzzle's
//       board as evidence, and each puzzle has fewer guesses (6, 5, 4, 3, then 2)
//
// Each guess letter is correct (in the word, in that spot), present (in the
// word, elsewhere) or absent. A guess with more copies of a letter than the
// answer has gets the extras marked absent. Every guess must be in the
// round's list. Hard Mode: correct letters stay put, present letters are used
// at least as many times as the evidence shows, absent letters stay out.

export const OG_GUESSES = 6;
export const GO_PUZZLES = 5;
export const budgetFor = (mode, index) => (mode === "go" ? Math.max(2, 6 - index) : OG_GUESSES);

export function score(answer, guess) {
  const marks = new Array(answer.length).fill("absent");
  const left = new Map();
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) marks[i] = "correct";
    else left.set(answer[i], (left.get(answer[i]) || 0) + 1);
  }
  for (let i = 0; i < guess.length; i++) {
    if (marks[i] === "correct") continue;
    const n = left.get(guess[i]) || 0;
    if (n > 0) {
      marks[i] = "present";
      left.set(guess[i], n - 1);
    }
  }
  return marks;
}

// What Hard Mode objects to in a guess, given the rows already on the board.
export function hardModeProblem(rows, guess) {
  const fixed = new Map();
  const atLeast = new Map();
  const out = new Set();
  for (const row of rows) {
    const here = new Map();
    row.marks.forEach((m, i) => {
      const c = row.guess[i];
      if (m === "correct") fixed.set(i, c);
      if (m === "absent") {
        if (!atLeast.has(c)) out.add(c);
      } else {
        here.set(c, (here.get(c) || 0) + 1);
        out.delete(c);
      }
    });
    for (const [c, n] of here) atLeast.set(c, Math.max(atLeast.get(c) || 0, n));
  }
  const up = (c) => c.toUpperCase();
  const say = (n) => ["zero", "one", "two", "three", "four", "five", "six"][n] || String(n);
  for (const [i, c] of fixed) if (guess[i] !== c) return `Keep ${up(c)} in position ${i + 1}.`;
  for (const [c, n] of atLeast) {
    if ([...guess].filter((x) => x === c).length < n) return `Use at least ${say(n)} ${up(c)}${n > 1 ? "s" : ""}.`;
  }
  for (const c of out) if (guess.includes(c) && !atLeast.has(c)) return `${up(c)} has already been ruled out.`;
  return null;
}

export function newRound({ length, mode, hard, answers }) {
  return { length, mode, hard, answers, index: 0, rows: [], status: "active" };
}

export const puzzleRows = (r) => r.rows.filter((row) => row.puzzle === r.index);
export const guessesUsed = (r) => puzzleRows(r).filter((row) => !row.seeded).length;

// Try a guess. Returns a reason when the round refuses it, or null.
export function submit(r, guess, list) {
  if (r.status !== "active") return "This round is not taking guesses.";
  if (guess.length !== r.length || !/^[a-z]+$/.test(guess)) return `Enter a ${r.length}-letter word.`;
  if (!list.has(guess)) return "That word is not in this round’s list.";
  if (r.hard) {
    const why = hardModeProblem(puzzleRows(r), guess);
    if (why) return why;
  }
  const answer = r.answers[r.index];
  r.rows.push({ puzzle: r.index, guess, marks: score(answer, guess), seeded: false });
  if (guess === answer) r.status = r.index === r.answers.length - 1 ? "won" : "holding";
  else if (guessesUsed(r) >= budgetFor(r.mode, r.index)) r.status = "lost";
  return null;
}

// GO: on to the next puzzle, with every answer so far already on its board.
export function advance(r) {
  if (r.status !== "holding") return;
  r.index++;
  const answer = r.answers[r.index];
  for (const prior of r.answers.slice(0, r.index)) r.rows.push({ puzzle: r.index, guess: prior, marks: score(answer, prior), seeded: true });
  r.status = "active";
}

// The keyboard's evidence: the best mark each letter has earned on this puzzle.
export function evidence(r) {
  const rank = { absent: 1, present: 2, correct: 3 };
  const best = {};
  for (const row of puzzleRows(r))
    row.marks.forEach((m, i) => {
      const c = row.guess[i];
      if (!best[c] || rank[m] > rank[best[c]]) best[c] = m;
    });
  return best;
}
