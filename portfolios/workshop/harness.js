// A toy harness for grooph graph documents (graphs/*.grooph.json). grooph
// itself never runs a graph; a harness does. This one walks a document node
// by node, follows its edges, counts rounds and dispatches, and halts at the
// stops it names, the way grooph's docs/graph-ir.md describes a lead doing it.
// The agents it "dispatches" are the scripted builder and critic below.
// Pure functions with no DOM, so tools/verify.mjs can walk every path.
import { build, measure, share, BAR, BUDGET } from './kit.js';

const nodeOf = (doc, id) => doc.nodes.find((n) => n.id === id);
const backEdges = (doc) => new Set(doc.loops.flatMap((l) => l.back));

// Where a run starts: the node no forward edge leads into.
export function entryOf(doc) {
  const back = backEdges(doc);
  const entered = new Set(doc.edges.filter((e) => !back.has(e.id)).map((e) => e.to));
  return doc.nodes.find((n) => !entered.has(n.id)).id;
}

// The nodes in the order the forward edges visit them, for drawing.
export function chainOf(doc) {
  const back = backEdges(doc);
  const order = [entryOf(doc)];
  for (let i = 0; i < order.length; i += 1) {
    for (const e of doc.edges) if (e.from === order[i] && !back.has(e.id) && !order.includes(e.to)) order.push(e.to);
  }
  return order;
}

// What a node does on this sheet, read from the document's own fields.
export function roleOf(node) {
  if (node.kind === 'stop') return 'stop';
  if (node.kind === 'human-gate') return 'gate';
  if (node.kind === 'check') {
    if (/^grep\b/.test(node.check.run)) return 'plan-check'; // counts the unchecked items on a list
    return node.check.kind === 'tests' ? 'tests' : 'count'; // the full measure, or only the cheap part
  }
  if (node.role === 'planner') return 'plan';
  return node.role === 'critic' ? 'judge' : 'build';
}

export function startRun(doc) {
  return { doc, at: entryOf(doc), via: null, passes: Object.fromEntries(doc.loops.map((l) => [l.id, 0])), dispatches: 0, over: null };
}

// Arrive at the current node. Agents and checks are dispatches; a stop ends the run.
export function arrive(run) {
  const node = nodeOf(run.doc, run.at);
  if (node.kind === 'agent' || node.kind === 'check') run.dispatches += 1;
  if (node.kind === 'stop') run.over = { kind: 'done', at: node.id };
  return node;
}

// Leave the current node with a verdict: '' for a node that only hands on,
// 'pass' or 'fail' for a critic, a check or a person. A back edge ends a pass
// of its loop, and the loop's stops are looked at, in document order, before
// the edge is taken.
export function follow(run, verdict) {
  const { doc } = run;
  const edge = doc.edges.find((e) => e.from === run.at && (e.when === undefined || e.when === verdict));
  if (!edge) {
    run.over = { kind: 'ended', at: run.at }; // no edge for that answer: the run ends
    return { edge: null, fired: null };
  }
  const loop = doc.loops.find((l) => l.back.includes(edge.id));
  if (loop) {
    run.passes[loop.id] += 1;
    for (const stop of loop.stops) {
      const fired = (stop.kind === 'max-iterations' && run.passes[loop.id] >= stop.n)
        || (stop.kind === 'budget' && stop.measure === 'dispatches' && run.dispatches >= stop.limit);
      if (fired) {
        run.over = { kind: 'halted', stop, loop: loop.id, at: run.at };
        return { edge, fired: stop };
      }
    }
  }
  run.via = edge;
  run.at = edge.to;
  return { edge, fired: null };
}

// Why the builder has been reached: a new task, a failed check, or a person's feedback.
export function causeOf(run) {
  const e = run.via;
  if (!e || e.when !== 'fail') return 'start';
  const from = nodeOf(run.doc, e.from);
  if (from.kind === 'human-gate') return 'feedback';
  return roleOf(from) === 'plan-check' ? 'start' : 'fail';
}

// ---------- the world the graphs run in: one toy, drawn part by part ----------
export function makeWorld(obj) {
  return { obj, done: 0, seed: 1, lumps: [], rev: -1, round: 0, task: null, open: false, wrong: false, floor: false, result: null };
}

const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const list = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

// The next task: the next part on the parts list, or, when the list is done, a redraw.
export function nextTask(w) {
  return w.done < w.obj.parts.length ? { kind: 'part', index: w.done, name: w.obj.parts[w.done].name } : { kind: 'redraw' };
}
export function taskLabel(w) {
  const t = nextTask(w);
  if (t.kind === 'redraw') return 'redraw it from a new seed';
  return t.index === 0 ? `draw the ${t.name}` : `add the ${t.name}`;
}

// The planner: write the answer key for the next task.
export function plan(w) {
  const t = nextTask(w);
  const parts = w.obj.parts.slice(0, w.done + (t.kind === 'part' ? 1 : 0));
  const counts = share(BUDGET, parts.map((p) => p.shape.area));
  return {
    parts: parts.map((p) => ({ name: p.name, kit: p.shape.kit })), areas: parts.map((p) => p.shape.area), counts,
    text: `ACCEPTANCE.md: ${BUDGET} splats in all (${list(parts.map((p, i) => `${p.name} ${counts[i]}`))}); no region more than ${BAR}× as dense as another.`,
  };
}

// The builder. Its first draft of the first part spreads splats evenly in the
// shape's parameters, and its first draft of the second rounds every share
// down: two real mistakes, staged so there is something for a check to catch.
export function draft(w, cause, notes = []) {
  let text;
  if (cause === 'fail') {
    w.round += 1;
    text = w.wrong ? w.obj.wrong.fix : w.floor ? 'Shares dealt again: the spare splat goes to the largest remainder.' : 'Drawn again.';
    w.wrong = false;
    w.floor = false;
  } else {
    w.rev += 1;
    w.round = 1;
    w.wrong = false;
    w.floor = false;
    const lumps = notes.length ? ` Raised a lump under ${plural(notes.length, 'note')}.` : '';
    if (cause === 'start') {
      w.task = nextTask(w);
      w.open = true;
      if (w.task.kind === 'redraw') {
        if (!notes.length) w.seed += 1;
        text = notes.length ? lumps.trim() : `Redrawn from seed ${w.seed}.`;
      } else if (w.task.index === 0) {
        w.wrong = true;
        text = `${BUDGET} splats on ${w.obj.parts[0].as}, ${w.obj.wrong.did}.${lumps}`;
      } else {
        w.floor = w.task.index === 1;
        text = `Added the ${w.task.name}${w.floor ? '. Each share of the budget rounded down.' : ', with its share of the budget.'}${lumps}`;
      }
    } else {
      if (!notes.length) w.seed += 1;
      text = notes.length ? lumps.trim() : `Redrawn from seed ${w.seed}.`;
    }
    w.lumps.push(...notes);
  }
  w.result = build(w.obj, { parts: w.done + (w.open && w.task.kind === 'part' ? 1 : 0), wrong: w.wrong, floor: w.floor, seed: w.seed, lumps: w.lumps });
  return text;
}

// The critic, the tests and the cheap check, each a view of the same measure.
// A plan check ticks the finished part off the list and asks whether any are left.
export function judge(w, role) {
  if (role === 'plan-check') {
    settle(w);
    const left = w.obj.parts.length - w.done;
    return { pass: left === 0, text: left ? `${plural(left, 'part')} still unchecked on the list: next item.` : 'Nothing left unchecked on the list.' };
  }
  const m = measure(w.result);
  const counted = m.total === BUDGET;
  if (role === 'count') return { pass: counted, m, text: `${m.total} of ${BUDGET} splats.${counted ? '' : ` ${plural(BUDGET - m.total, 'splat')} short.`}` };
  if (!counted) return { pass: false, m, text: `${m.total} of ${BUDGET} splats: ${plural(BUDGET - m.total, 'splat')} short. Not met.` };
  const pass = m.spread <= BAR;
  return { pass, m, text: `${m.total} splats. Densest region ${m.spread.toFixed(2)}× the sparsest; the bar is ${BAR}. ${pass ? 'Met.' : 'Not met.'}` };
}

// A task that reached a success stop is ticked off the parts list.
export function settle(w) {
  if (w.open && w.task.kind === 'part') w.done += 1;
  w.open = false;
}
