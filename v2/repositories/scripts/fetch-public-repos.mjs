#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OWNER = "ryanjosephkamp";
const API_ROOT = `https://api.github.com/users/${OWNER}/repos`;
const BLOCKED_PROVIDER_TERMS = ["gr" + "okedex", "gr" + "ok", "x." + "ai", "x" + "ai"];

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function snapshotPath() {
  return path.resolve(scriptDir(), "../data/repos.snapshot.json");
}

async function readExistingSnapshot() {
  try {
    return JSON.parse(await readFile(snapshotPath(), "utf8"));
  } catch {
    return { repos: [] };
  }
}

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

function fallbackCluster(repo) {
  const text = textFor(repo);
  if (repo.name === "brrrdle" || repo.name === "brrrdle-dev") {
    return { cluster: "games", cluster_label: "Games", cluster_color: "#555555" };
  }
  if (text.includes("s26 airp") || repo.name?.startsWith("the-")) {
    return { cluster: "s26-airp", cluster_label: "S26 AIRP", cluster_color: "#12b886" };
  }
  if (/\b(ai|ml|model|neural|transformer|diffusion|llm)\b/.test(text)) {
    return { cluster: "ai-ml", cluster_label: "AI and ML", cluster_color: "#7c5cff" };
  }
  if (/blog|github\.io|portfolio|site|website|web/.test(text)) {
    return {
      cluster: "web-portfolio",
      cluster_label: "Web and Portfolio",
      cluster_color: "#ffd43b",
    };
  }
  if (/data|dataset|api|automation|parser|cli|tooling/.test(text)) {
    return { cluster: "data-tooling", cluster_label: "Data and Tooling", cluster_color: "#4dabf7" };
  }
  if (/research|experiment|simulation|analysis|pipeline|visualization/.test(text)) {
    return {
      cluster: "research-software",
      cluster_label: "Research Software",
      cluster_color: "#18c3d7",
    };
  }
  if (/docs|notes|paper|writing|latex|article|capstone/.test(text)) {
    return { cluster: "writing-docs", cluster_label: "Writing and Docs", cluster_color: "#f783ac" };
  }
  return { cluster: "other", cluster_label: "Other / Review", cluster_color: "#adb5bd" };
}

function shouldExclude(repo) {
  return BLOCKED_PROVIDER_TERMS.some((term) => textFor(repo).includes(term));
}

function normalize(repo, previous) {
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
  const cluster = previous
    ? {
        cluster: previous.cluster,
        cluster_label: previous.cluster_label,
        cluster_color: previous.cluster_color,
        secondary_clusters: previous.secondary_clusters || [],
      }
    : fallbackCluster(normalized);
  const tags = [...new Set([...(previous?.tags || []), normalized.language].filter(Boolean))];
  return { ...normalized, ...cluster, tags };
}

async function fetchPage(page) {
  const response = await fetch(
    `${API_ROOT}?sort=updated&direction=desc&per_page=100&page=${page}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "ryan-kamp-v2-public-repo-snapshot",
      },
    },
  );
  if (!response.ok) {
    throw new Error(`GitHub public API request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function fetchAllRepos() {
  const repos = [];
  for (let page = 1; ; page += 1) {
    const batch = await fetchPage(page);
    repos.push(...batch);
    if (batch.length < 100) {
      return { repos, pagesFetched: page };
    }
  }
}

function clusterSummary(repos) {
  const byId = new Map();
  for (const repo of repos) {
    if (!byId.has(repo.cluster)) {
      byId.set(repo.cluster, {
        id: repo.cluster,
        label: repo.cluster_label,
        color: repo.cluster_color,
        count: 0,
      });
    }
    byId.get(repo.cluster).count += 1;
  }
  return [...byId.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

const existing = await readExistingSnapshot();
const previousById = new Map((existing.repos || []).map((repo) => [repo.id, repo]));
const { repos, pagesFetched } = await fetchAllRepos();
const filteredOut = repos
  .filter(shouldExclude)
  .map((repo) => ({ name: repo.name, reason: "Excluded by provider guardrail." }));
const included = repos
  .filter((repo) => !shouldExclude(repo))
  .map((repo) => normalize(repo, previousById.get(repo.id)))
  .sort((a, b) => new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at));

const snapshot = {
  generated_at: new Date().toISOString(),
  owner: OWNER,
  source: {
    endpoint: API_ROOT,
    authentication: "none",
    pages_fetched: pagesFetched,
    repo_count_raw: repos.length,
    repo_count_included: included.length,
    repo_count_filtered_out: filteredOut.length,
    filtered_out: filteredOut,
  },
  clusters: clusterSummary(included),
  repos: included,
};

await mkdir(path.dirname(snapshotPath()), { recursive: true });
await writeFile(snapshotPath(), `${JSON.stringify(snapshot, null, 2)}\n`);

console.log(`Wrote ${included.length} public repositories to ${snapshotPath()}`);
if (filteredOut.length) {
  console.log(
    `Filtered ${filteredOut.length} repositories by guardrail: ${filteredOut.map((repo) => repo.name).join(", ")}`,
  );
}
