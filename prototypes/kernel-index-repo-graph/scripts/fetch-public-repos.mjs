#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OWNER = "ryanjosephkamp";
const API_ROOT = `https://api.github.com/users/${OWNER}/repos`;
const BLOCKED_PROVIDER_TERMS = ["gr" + "okedex", "gr" + "ok", "x." + "ai", "x" + "ai"];

const CLUSTERS = [
  {
    id: "s26-airp",
    label: "S26 AIRP",
    color: "#12b886",
    keywords: ["s26 airp", "streamlit", "prototype portfolio"],
  },
  {
    id: "ai-ml",
    label: "AI and ML",
    color: "#7c5cff",
    keywords: [
      "ai",
      "agent",
      "attention",
      "diffusion",
      "ebm",
      "egnn",
      "llm",
      "machine learning",
      "ml",
      "model",
      "neural",
      "transformer",
    ],
  },
  {
    id: "research-software",
    label: "Research Software",
    color: "#18c3d7",
    keywords: [
      "analysis",
      "benchmark",
      "experiment",
      "pipeline",
      "reproducible",
      "research",
      "simulation",
      "solver",
      "tool",
      "visualization",
    ],
  },
  {
    id: "computational-biology",
    label: "Computational Biology",
    color: "#c084fc",
    keywords: [
      "affinity",
      "antibiotic",
      "bio",
      "cell",
      "chem",
      "ferment",
      "gene",
      "klk5",
      "md",
      "molecular",
      "molecule",
      "protein",
      "sequence",
      "spink7",
      "structure",
    ],
  },
  {
    id: "data-tooling",
    label: "Data and Tooling",
    color: "#4dabf7",
    keywords: [
      "api",
      "automation",
      "catalog",
      "cli",
      "data",
      "dataset",
      "dictionary",
      "parser",
      "qr",
      "tooling",
      "voxel",
    ],
  },
  {
    id: "web-portfolio",
    label: "Web and Portfolio",
    color: "#ffd43b",
    keywords: [
      "blog",
      "github.io",
      "portfolio",
      "site",
      "streamlit",
      "vercel",
      "web",
      "website",
    ],
  },
  {
    id: "interactive",
    label: "Interactive Experiments",
    color: "#ff8787",
    keywords: [
      "app",
      "brrrdle",
      "canvas",
      "game",
      "interactive",
      "pac",
      "simulator",
    ],
  },
  {
    id: "writing-docs",
    label: "Writing and Docs",
    color: "#f783ac",
    keywords: [
      "article",
      "cv",
      "docs",
      "latex",
      "notes",
      "paper",
      "readme",
      "tex",
      "writing",
    ],
  },
  {
    id: "other",
    label: "Other / Review",
    color: "#adb5bd",
    keywords: [],
  },
];

function textFor(repo) {
  return [
    repo.name,
    repo.full_name,
    repo.description,
    repo.homepage,
    repo.language,
    ...(repo.topics || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function classify(repo) {
  const text = textFor(repo);
  const tags = [];

  if (repo.fork) tags.push("fork");
  if (repo.archived) tags.push("archived");
  if (repo.homepage) tags.push(repo.homepage.includes("streamlit.app") ? "interactive app" : "homepage");
  if (repo.language) tags.push(repo.language);

  const scores = CLUSTERS.map((cluster) => {
    let score = 0;

    if (cluster.id === "s26-airp" && (text.includes("s26 airp") || repo.name.startsWith("the-"))) {
      score += 5;
    }

    if (cluster.id === "web-portfolio" && /blog|github\.io|website|portfolio/.test(text)) {
      score += 4;
    }

    for (const keyword of cluster.keywords) {
      if (keyword && text.includes(keyword)) score += 1;
    }

    return { cluster, score };
  }).sort((a, b) => b.score - a.score);

  const winner = scores[0].score > 0 ? scores[0].cluster : CLUSTERS.at(-1);
  const secondary = scores
    .filter((item) => item.score > 0 && item.cluster.id !== winner.id)
    .slice(0, 3)
    .map((item) => item.cluster.id);

  return {
    cluster: winner.id,
    cluster_label: winner.label,
    cluster_color: winner.color,
    secondary_clusters: secondary,
    tags: Array.from(new Set(tags)),
  };
}

function normalize(repo) {
  const normalized = {
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    html_url: repo.html_url,
    description: repo.description || "",
    homepage: repo.homepage || "",
    topics: repo.topics || [],
    language: repo.language || "Unspecified",
    created_at: repo.created_at,
    updated_at: repo.updated_at,
    pushed_at: repo.pushed_at,
    fork: Boolean(repo.fork),
    archived: Boolean(repo.archived),
    disabled: Boolean(repo.disabled),
    stargazers_count: repo.stargazers_count || 0,
    forks_count: repo.forks_count || 0,
    watchers_count: repo.watchers_count || 0,
    open_issues_count: repo.open_issues_count || 0,
    default_branch: repo.default_branch || "",
    size: repo.size || 0,
  };

  return { ...normalized, ...classify(normalized) };
}

async function fetchPage(page) {
  const url = `${API_ROOT}?sort=updated&direction=desc&per_page=100&page=${page}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ryan-kamp-public-repo-graph-prototype",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub public API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchAllRepos() {
  const repos = [];
  let page = 1;

  while (true) {
    const batch = await fetchPage(page);
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }

  return { repos, pageCount: page };
}

function shouldExclude(repo) {
  const text = [
    repo.name,
    repo.full_name,
    repo.description,
    repo.homepage,
    ...(repo.topics || []),
  ].filter(Boolean).join(" ").toLowerCase();

  return BLOCKED_PROVIDER_TERMS.some((term) => text.includes(term));
}

function clusterSummary(repos) {
  return CLUSTERS.map((cluster) => ({
    id: cluster.id,
    label: cluster.label,
    color: cluster.color,
    count: repos.filter((repo) => repo.cluster === cluster.id).length,
  }));
}

const { repos, pageCount } = await fetchAllRepos();
const filteredOut = repos.filter(shouldExclude).map((repo) => ({
  name: repo.name,
  reason: "Excluded by prototype provider guardrail.",
}));
const included = repos
  .filter((repo) => !shouldExclude(repo))
  .map(normalize)
  .sort((a, b) => new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at));

const snapshot = {
  generated_at: new Date().toISOString(),
  owner: OWNER,
  source: {
    endpoint: API_ROOT,
    authentication: "none",
    pages_fetched: pageCount,
    repo_count_raw: repos.length,
    repo_count_included: included.length,
    repo_count_filtered_out: filteredOut.length,
    filtered_out: filteredOut,
  },
  clusters: clusterSummary(included),
  repos: included,
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(__dirname, "../data/repos.snapshot.json");
await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(snapshot, null, 2)}\n`);

console.log(`Wrote ${included.length} public repositories to ${outPath}`);
if (filteredOut.length) {
  console.log(`Filtered ${filteredOut.length} repositories by guardrail: ${filteredOut.map((repo) => repo.name).join(", ")}`);
}
