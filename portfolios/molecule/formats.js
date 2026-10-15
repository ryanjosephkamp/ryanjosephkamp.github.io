// The readers: PDB, mmCIF, SDF and MOL, and XYZ, each into one flat model. They run in the
// browser on a file the visitor opens (the text never leaves the device) and on the shelf's
// own files; tools/verify.mjs reads every shelf file through them.
//
// A model is {
//   format, title,
//   atoms:  [{ el, p: [x, y, z], name?, res?, seq?, chain?, het?, charge? }],
//   bonds:  [[i, j, order]],
//   traces: [[{ i, ss, rung? }]]   one list per unbroken stretch of chain: the alpha carbons
//                           of a protein ("h" helix, "s" strand, "c" coil) or the C4' atoms
//                           of a nucleic acid ("n"), where rung is the atom of the base that
//                           faces its partner (N1 of a purine, N3 of a pyrimidine),
//   waters, chains, residues
// }

import { BY_SYMBOL, bondsByDistance, distance } from "./chem.js";

export const MAX_ATOMS = 20000;
const WATER = new Set(["HOH", "WAT", "DOD", "H2O"]);

class ReadError extends Error {}
const fail = (message) => {
  throw new ReadError(message);
};

// "FE" or "fe" or "Fe1+" to "Fe"; deuterium counts as hydrogen. Unknown symbols come back "".
function element(raw) {
  const s = String(raw ?? "").replace(/[^A-Za-z]/g, "");
  if (!s) return "";
  const el = s[0].toUpperCase() + s.slice(1).toLowerCase();
  if (el === "D") return "H";
  return BY_SYMBOL.has(el.toLowerCase()) ? el : BY_SYMBOL.has(el[0].toLowerCase()) ? el[0] : "";
}

// ---- What kind of file is this? -----------------------------------------------------------

export function sniff(text, filename = "") {
  const ext = (filename.match(/\.([a-z0-9]+)$/i)?.[1] ?? "").toLowerCase();
  if (["pdb", "ent", "pdb1"].includes(ext)) return "PDB";
  if (["cif", "mmcif"].includes(ext)) return "mmCIF";
  if (["sdf", "sd", "mol"].includes(ext)) return ext === "mol" ? "MOL" : "SDF";
  if (ext === "xyz") return "XYZ";
  const lines = text.split(/\r?\n/, 12);
  if (/^data_/m.test(text.slice(0, 2000))) return "mmCIF";
  if (/V[23]000\s*$/.test(lines[3] ?? "")) return "SDF";
  if (/^(HEADER|ATOM  |HETATM|CRYST1|TITLE |REMARK|COMPND)/m.test(text.slice(0, 20000))) return "PDB";
  if (/^\s*\d+\s*$/.test(lines[0] ?? "")) return "XYZ";
  return "";
}

export function parse(text, filename = "") {
  if (!text || !text.trim()) fail("That file is empty.");
  const format = sniff(text, filename);
  const model =
    format === "PDB" ? pdb(text)
    : format === "mmCIF" ? cif(text)
    : format === "SDF" || format === "MOL" ? mol(text)
    : format === "XYZ" ? xyz(text)
    : fail("This board reads PDB, mmCIF, SDF, MOL and XYZ files, and that does not look like one of them."); // prettier-ignore
  model.format = format;
  if (!model.atoms.length) fail("No atoms were found in that file.");
  if (model.atoms.length > MAX_ATOMS)
    fail(`That structure has ${model.atoms.length.toLocaleString("en")} atoms. This board draws up to ${MAX_ATOMS.toLocaleString("en")}; Splashery's own viewer takes larger ones.`); // prettier-ignore
  for (const a of model.atoms) if (!a.p.every(Number.isFinite)) fail("An atom in that file has no position.");
  return model;
}

// ---- Chains: bonds, traces and counts for the two macromolecule formats ---------------------

// rows: atoms in file order with { el, p, name, res, seq, chain, het, serial }.
// ss: Map of "chain:seq" to "h" or "s". pairs: bonds the file lists itself, as index pairs.
function chainModel(rows, ss, pairs, title, waters) {
  const atoms = rows.map(({ el, p, name, res, seq, chain, het }) => ({ el, p, name, res, seq, chain, het }));
  const seen = new Set();
  const bonds = [];
  const add = (i, j, order = 1) => {
    const k = i < j ? `${i},${j}` : `${j},${i}`;
    if (i === j || seen.has(k)) return;
    seen.add(k);
    bonds.push([Math.min(i, j), Math.max(i, j), order]);
  };
  for (const [i, j] of bondsByDistance(atoms)) add(i, j);
  for (const [i, j] of pairs) add(i, j);

  // One point per residue: the alpha carbon, or C4' in a nucleic acid. A modified residue
  // written as a hetero group (a methylated base in a transfer RNA) still carries the chain.
  const traces = [];
  let run = [];
  let last = null;
  const residues = new Set();
  const chains = new Set();
  const inChain = new Set();
  // The ring nitrogens of each residue, to find which atom of a base faces its partner.
  const ringN = new Map();
  rows.forEach((a, i) => {
    if (a.name !== "N1" && a.name !== "N3" && a.name !== "N9") return;
    const k = `${a.chain}:${a.seq}:${a.res}`;
    if (!ringN.has(k)) ringN.set(k, {});
    ringN.get(k)[a.name] = i;
  });
  const close = () => {
    if (run.length > 1) {
      traces.push(run);
      for (const pt of run) inChain.add(`${rows[pt.i].chain}:${rows[pt.i].seq}:${rows[pt.i].res}`);
    }
    run = [];
  };
  rows.forEach((a, i) => {
    residues.add(`${a.chain}:${a.seq}:${a.res}`);
    chains.add(a.chain);
    const nucleic = a.name === "C4'" || a.name === "C4*";
    if (!nucleic && !(a.name === "CA" && a.el === "C")) return;
    const point = { i, ss: nucleic ? "n" : (ss.get(`${a.chain}:${a.seq}`) ?? "c") };
    if (nucleic) {
      const n = ringN.get(`${a.chain}:${a.seq}:${a.res}`) ?? {};
      const rung = n.N9 !== undefined ? n.N1 : n.N3;
      if (rung !== undefined) point.rung = rung;
    }
    if (last && (last.chain !== a.chain || last.nucleic !== nucleic || distance(last.p, a.p) > (nucleic ? 7.8 : 4.4))) close();
    run.push(point);
    last = { chain: a.chain, nucleic, p: a.p };
  });
  close();
  atoms.forEach((a) => {
    if (a.het && inChain.has(`${a.chain}:${a.seq}:${a.res}`)) a.het = false;
  });
  return { title, atoms, bonds, traces, waters, chains: chains.size, residues: residues.size };
}

// ---- PDB ----------------------------------------------------------------------------------------

function pdb(text) {
  const rows = [];
  const ss = new Map();
  const serials = new Map();
  const conect = [];
  let title = "";
  let waters = 0;
  let alt = null;
  for (const l of text.split(/\r?\n/)) {
    const rec = l.slice(0, 6);
    if (rec === "TITLE ") title += (title ? " " : "") + l.slice(10, 80).trim();
    else if (rec === "HELIX ") {
      for (let r = parseInt(l.slice(21, 25), 10); r <= parseInt(l.slice(33, 37), 10); r++) ss.set(`${l[19]}:${r}`, "h");
    } else if (rec === "SHEET ") {
      for (let r = parseInt(l.slice(22, 26), 10); r <= parseInt(l.slice(33, 37), 10); r++) ss.set(`${l[21]}:${r}`, "s");
    } else if (rec === "ENDMDL") break; // the first model is the one drawn
    else if (rec === "CONECT") conect.push(l);
    else if (rec === "ATOM  " || rec === "HETATM") {
      const res = l.slice(17, 20).trim();
      if (WATER.has(res)) {
        waters++;
        continue;
      }
      // Where an atom has alternate positions, the first one named is kept.
      if (l[16] && l[16] !== " ") {
        alt ??= l[16];
        if (l[16] !== alt) continue;
      }
      const name = l.slice(12, 16).trim();
      const p = [parseFloat(l.slice(30, 38)), parseFloat(l.slice(38, 46)), parseFloat(l.slice(46, 54))];
      const el = element(l.slice(76, 78)) || element(name.replace(/^\d+/, "").slice(0, rec === "HETATM" && l[12] !== " " ? 2 : 1));
      if (!el) continue;
      serials.set(parseInt(l.slice(6, 11), 10), rows.length);
      rows.push({ el, p, name, res, seq: parseInt(l.slice(22, 26), 10), chain: l[21]?.trim() || "A", het: rec === "HETATM" });
    }
  }
  // The file's own bond list, kept where it touches a hetero group (a ligand, a metal).
  const pairs = [];
  for (const l of conect) {
    const from = serials.get(parseInt(l.slice(6, 11), 10));
    for (let c = 11; c < 31; c += 5) {
      const to = serials.get(parseInt(l.slice(c, c + 5), 10));
      if (from !== undefined && to !== undefined && (rows[from].het || rows[to].het)) pairs.push([from, to]);
    }
  }
  return chainModel(rows, ss, pairs, title, waters);
}

// ---- mmCIF ----------------------------------------------------------------------------------------

// Every category in the file as { tags, rows }, whether it was written as a loop or as
// single items. Values keep their text; "." and "?" stay as they are.
export function cifTables(text) {
  const tokens = [];
  const n = text.length;
  let i = 0;
  let lineStart = true;
  while (i < n) {
    const ch = text[i];
    if (ch === "\n") {
      lineStart = true;
      i++;
    } else if (ch === " " || ch === "\t" || ch === "\r") i++;
    else if (ch === "#") {
      while (i < n && text[i] !== "\n") i++;
    } else if (ch === ";" && lineStart) {
      const end = text.indexOf("\n;", i);
      const stop = end < 0 ? n : end;
      tokens.push({ v: text.slice(i + 1, stop).trim(), q: true });
      i = stop + 2;
      lineStart = false;
    } else if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < n && !(text[j] === ch && (j + 1 >= n || /\s/.test(text[j + 1])))) j++;
      tokens.push({ v: text.slice(i + 1, j), q: true });
      i = j + 1;
      lineStart = false;
    } else {
      let j = i;
      while (j < n && !/\s/.test(text[j])) j++;
      tokens.push({ v: text.slice(i, j), q: false });
      i = j;
      lineStart = false;
    }
  }
  const tables = new Map();
  const table = (cat) => {
    if (!tables.has(cat)) tables.set(cat, { tags: [], rows: [] });
    return tables.get(cat);
  };
  const isTag = (t) => t && !t.q && t.v[0] === "_";
  const isWord = (t) => t && !t.q && (/^loop_$/i.test(t.v) || /^data_/i.test(t.v));
  for (let k = 0; k < tokens.length; ) {
    const t = tokens[k];
    if (isTag(t)) {
      const [cat, tag] = t.v.split(".");
      const tb = table(cat);
      tb.tags.push(tag);
      (tb.rows[0] ??= []).push(tokens[k + 1]?.v ?? "?");
      k += 2;
    } else if (!t.q && /^loop_$/i.test(t.v)) {
      k++;
      const tags = [];
      let cat = "";
      while (isTag(tokens[k])) {
        const [c, tag] = tokens[k].v.split(".");
        cat = c;
        tags.push(tag);
        k++;
      }
      const tb = table(cat);
      tb.tags = tags;
      while (k < tokens.length && !isTag(tokens[k]) && !isWord(tokens[k])) {
        tb.rows.push(tokens.slice(k, k + tags.length).map((x) => x.v));
        k += tags.length;
      }
    } else k++;
  }
  return tables;
}

const column = (tb, ...names) => {
  for (const name of names) {
    const c = tb.tags.indexOf(name);
    if (c >= 0) return (row) => row[c];
  }
  return () => undefined;
};

function cif(text) {
  const tables = cifTables(text);
  const site = tables.get("_atom_site");
  if (!site) return componentCif(tables);
  const col = (...names) => column(site, ...names);
  const [group, sym, name, altId, comp] = [col("group_PDB"), col("type_symbol"), col("label_atom_id"), col("label_alt_id"), col("label_comp_id")]; // prettier-ignore
  const [chain, seq, model] = [col("auth_asym_id", "label_asym_id"), col("auth_seq_id", "label_seq_id"), col("pdbx_PDB_model_num")]; // prettier-ignore
  const [x, y, z] = [col("Cartn_x"), col("Cartn_y"), col("Cartn_z")];
  const rows = [];
  let waters = 0;
  let alt = null;
  let first = null;
  for (const r of site.rows) {
    first ??= model(r);
    if (model(r) !== first) break;
    const res = comp(r);
    if (WATER.has(res)) {
      waters++;
      continue;
    }
    const a = altId(r);
    if (a && a !== "." && a !== "?") {
      alt ??= a;
      if (a !== alt) continue;
    }
    const el = element(sym(r)) || element(String(name(r)).slice(0, 1));
    if (!el) continue;
    rows.push({ el, p: [+x(r), +y(r), +z(r)], name: String(name(r)).replace(/"/g, ""), res, seq: parseInt(seq(r), 10), chain: chain(r) || "A", het: group(r) === "HETATM" }); // prettier-ignore
  }
  const ss = new Map();
  const mark = (tb, kind, only) => {
    if (!tb) return;
    const [type, ch, from, to] = [column(tb, "conf_type_id"), column(tb, "beg_auth_asym_id", "beg_label_asym_id"), column(tb, "beg_auth_seq_id", "beg_label_seq_id"), column(tb, "end_auth_seq_id", "end_label_seq_id")]; // prettier-ignore
    for (const r of tb.rows) {
      if (only && !only.test(type(r) ?? "")) continue;
      for (let s = parseInt(from(r), 10); s <= parseInt(to(r), 10); s++) ss.set(`${ch(r)}:${s}`, kind);
    }
  };
  mark(tables.get("_struct_conf"), "h", /^HELX/i);
  mark(tables.get("_struct_sheet_range"), "s");
  const title = tables.get("_struct")?.rows[0]?.[tables.get("_struct").tags.indexOf("title")] ?? "";
  return chainModel(rows, ss, [], title, waters);
}

// A chemical component's own file: its atoms at their ideal positions, and its bonds.
function componentCif(tables) {
  const at = tables.get("_chem_comp_atom");
  if (!at) fail("That mmCIF file lists no atoms.");
  const col = (...names) => column(at, ...names);
  const [id, sym, charge] = [col("atom_id"), col("type_symbol"), col("charge")];
  const ideal = ["pdbx_model_Cartn_x_ideal", "pdbx_model_Cartn_y_ideal", "pdbx_model_Cartn_z_ideal"].map((t) => col(t));
  const seen = ["model_Cartn_x", "model_Cartn_y", "model_Cartn_z"].map((t) => col(t));
  const useIdeal = at.rows.every((r) => ideal.every((f) => Number.isFinite(parseFloat(f(r)))));
  const index = new Map();
  const atoms = at.rows.map((r, i) => {
    index.set(id(r), i);
    return { el: element(sym(r)), p: (useIdeal ? ideal : seen).map((f) => parseFloat(f(r))), name: id(r), charge: parseInt(charge(r), 10) || 0 }; // prettier-ignore
  });
  const bt = tables.get("_chem_comp_bond");
  const bonds = [];
  if (bt) {
    const [a, b, order] = [column(bt, "atom_id_1"), column(bt, "atom_id_2"), column(bt, "value_order")];
    const ORDER = { SING: 1, DOUB: 2, TRIP: 3 };
    for (const r of bt.rows) if (index.has(a(r)) && index.has(b(r))) bonds.push([index.get(a(r)), index.get(b(r)), ORDER[String(order(r)).toUpperCase()] ?? 1]); // prettier-ignore
  }
  const cc = tables.get("_chem_comp");
  const title = cc?.rows[0]?.[cc.tags.indexOf("name")] ?? "";
  return { title, atoms, bonds, traces: [], waters: 0, chains: 0, residues: 0 };
}

// ---- SDF and MOL -------------------------------------------------------------------------------

function mol(text) {
  const lines = text.split(/\r?\n/);
  const counts = lines[3] ?? "";
  const title = (lines[0] ?? "").trim();
  const atoms = [];
  const bonds = [];
  if (/V3000/.test(counts)) {
    let block = "";
    for (const l of lines) {
      if (l.startsWith("$$$$")) break;
      const t = l.replace(/^M\s+V30\s+/, "");
      if (t === l) continue;
      if (/^BEGIN (\w+)/.test(t)) block = t.split(/\s+/)[1];
      else if (/^END/.test(t)) block = "";
      else if (block === "ATOM") {
        const f = t.split(/\s+/);
        const chg = f.find((s) => /^CHG=/.test(s));
        atoms.push({ el: element(f[1]), p: [+f[2], +f[3], +f[4]], charge: chg ? parseInt(chg.slice(4), 10) : 0 });
      } else if (block === "BOND") {
        const f = t.split(/\s+/);
        bonds.push([+f[2] - 1, +f[3] - 1, +f[1]]);
      }
    }
  } else {
    const na = parseInt(counts.slice(0, 3), 10);
    const nb = parseInt(counts.slice(3, 6), 10);
    if (!Number.isFinite(na)) fail("That file's counts line could not be read.");
    const OLD = { 1: 3, 2: 2, 3: 1, 5: -1, 6: -2, 7: -3 }; // the atom block's own charge codes
    for (let i = 0; i < na; i++) {
      const l = lines[4 + i] ?? "";
      atoms.push({ el: element(l.slice(31, 34)), p: [parseFloat(l.slice(0, 10)), parseFloat(l.slice(10, 20)), parseFloat(l.slice(20, 30))], charge: OLD[parseInt(l.slice(36, 39), 10)] ?? 0 }); // prettier-ignore
    }
    for (let i = 0; i < nb; i++) {
      const l = lines[4 + na + i] ?? "";
      bonds.push([parseInt(l.slice(0, 3), 10) - 1, parseInt(l.slice(3, 6), 10) - 1, parseInt(l.slice(6, 9), 10)]);
    }
    for (let i = 4 + na + nb; i < lines.length && !lines[i].startsWith("M  END") && !lines[i].startsWith("$$$$"); i++) {
      if (!lines[i].startsWith("M  CHG")) continue;
      const f = lines[i].trim().split(/\s+/).slice(3).map(Number);
      // A charge line overrides the atom block for every atom it names.
      for (let k = 0; k + 1 < f.length; k += 2) if (atoms[f[k] - 1]) atoms[f[k] - 1].charge = f[k + 1];
    }
  }
  if (atoms.some((a) => !a.el)) fail("That file names an element this board does not know.");
  const ok = bonds.filter(([a, b]) => atoms[a] && atoms[b] && a !== b);
  return { title, atoms, bonds: ok, traces: [], waters: 0, chains: 0, residues: 0 };
}

// ---- XYZ ----------------------------------------------------------------------------------------

function xyz(text) {
  const lines = text.split(/\r?\n/);
  const n = parseInt(lines[0], 10);
  if (!Number.isFinite(n) || n < 1) fail("An XYZ file starts with its number of atoms.");
  const atoms = [];
  for (let i = 0; i < n; i++) {
    const f = (lines[2 + i] ?? "").trim().split(/\s+/);
    // An element symbol, or its atomic number.
    const el = /^\d+$/.test(f[0]) ? [...BY_SYMBOL.values()].find((e) => e.z === +f[0])?.symbol : element(f[0]);
    if (!el || f.length < 4) fail(`Line ${3 + i} of that XYZ file is not an atom.`);
    atoms.push({ el, p: [+f[1], +f[2], +f[3]] });
  }
  return { title: (lines[1] ?? "").trim(), atoms, bonds: bondsByDistance(atoms), traces: [], waters: 0, chains: 0, residues: 0 };
}
