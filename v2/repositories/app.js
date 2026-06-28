const DATA_URL = "./data/repos.snapshot.json";
const GITHUB_REPOS_API = "https://api.github.com/users/ryanjosephkamp/repos";
const EXCLUDED_PATTERN = /\b(grok|grokedex|grokédex|xai|x\.ai)\b/i;
const DEFAULT_LIST_LIMIT = 25;
const LIST_LIMITS = [25, 50, 100, "all"];
const SORT_OPTIONS = [
  { id: "updated", label: "updated" },
  { id: "name", label: "name" },
  { id: "cluster", label: "cluster" },
];
const finePointer = window.matchMedia("(pointer: fine)");
const MAX_PASSIVE_LINKS = 180;
const MAX_FOCUS_LINKS = 18;
const SEMANTIC_STOPWORDS = new Set([
  "and",
  "are",
  "for",
  "from",
  "github",
  "implementation",
  "into",
  "not",
  "project",
  "public",
  "repo",
  "repository",
  "software",
  "that",
  "the",
  "this",
  "with",
]);

const state = {
  repos: [],
  clusters: [],
  nodes: [],
  selected: null,
  hovered: null,
  query: "",
  cluster: "all",
  scale: 1,
  panX: 0,
  panY: 0,
  dragging: false,
  pointerStart: null,
  lastPointer: null,
  moved: false,
  listLimit: DEFAULT_LIST_LIMIT,
  listSort: "updated",
  frame: 0,
};

const els = {
  canvas: document.querySelector("#repo-canvas"),
  wrap: document.querySelector("#canvas-wrap"),
  search: document.querySelector("#repo-search"),
  reset: document.querySelector("#reset-view"),
  inspector: document.querySelector("#repo-inspector"),
  clusters: document.querySelector("#cluster-row"),
  list: document.querySelector("#repo-list"),
  listNote: document.querySelector("#repo-list-note"),
  listSortControls: document.querySelector("#repo-sort-controls"),
  listLimitControls: document.querySelector("#list-limit-controls"),
  activity: document.querySelector("#activity-bars"),
  activityDetail: document.querySelector("#activity-detail"),
  hint: document.querySelector("#graph-hint"),
  filterSummary: document.querySelector("#filter-summary"),
  refresh: document.querySelector("#refresh-repos"),
  refreshStatus: document.querySelector("#refresh-status"),
};

const ctx = els.canvas.getContext("2d", { alpha: false });

function normalizeCluster(repo) {
  const name = repo.name.toLowerCase();
  if (name === "brrrdle" || name === "brrrdle-dev") {
    return { id: "games", label: "Games", color: "#555555" };
  }
  return {
    id: repo.cluster || "other",
    label: repo.cluster_label || "Other",
    color: repo.cluster_color || "#555555",
  };
}

function fallbackCluster(repo) {
  const text = [
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

function mergePublicRepo(repo, previous) {
  const normalized = {
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    html_url: repo.html_url,
    description: repo.description || "",
    homepage: repo.homepage || "",
    topics: Array.isArray(repo.topics) ? repo.topics : [],
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

function cleanRepos(repos) {
  return repos
    .filter((repo) => {
      const visibleFields = [
        repo.name,
        repo.full_name,
        repo.description,
        repo.html_url,
        repo.homepage,
        repo.language,
        repo.cluster_label,
        ...(repo.topics || []),
        ...(repo.tags || []),
      ];
      return !EXCLUDED_PATTERN.test(visibleFields.filter(Boolean).join(" "));
    })
    .map((repo) => {
      const cluster = normalizeCluster(repo);
      return {
        ...repo,
        cluster: cluster.id,
        cluster_label: cluster.label,
        cluster_color: cluster.color,
      };
    });
}

function applyRepositoryData(repos) {
  const selectedId = state.selected?.repo?.id;
  state.repos = cleanRepos(repos);
  state.clusters = buildClusters(state.repos);
  state.nodes = makeNodes(state.repos, state.clusters);
  if (state.cluster !== "all" && !state.clusters.some((cluster) => cluster.id === state.cluster)) {
    state.cluster = "all";
  }
  state.selected = state.nodes.find((node) => node.repo.id === selectedId) || null;
  state.hovered = null;
  renderClusters();
  renderActivity();
  renderSortControls();
  renderListControls();
  renderInspector(state.selected?.repo || null);
  resizeCanvas();
  updateVisibility();
}

function buildClusters(repos) {
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

function hashValue(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash / 4294967295;
}

function tokenize(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !/^\d+$/.test(token) && !SEMANTIC_STOPWORDS.has(token));
}

function repoSemanticTokens(repo) {
  const values = [
    repo.name,
    repo.description,
    repo.language,
    ...(repo.topics || []),
    ...(repo.tags || []),
  ];
  return new Set(values.flatMap(tokenize).slice(0, 28));
}

function repoTermSet(values) {
  return new Set(
    (values || []).flatMap(tokenize).filter((token) => token && !SEMANTIC_STOPWORDS.has(token)),
  );
}

function sharedCount(first, second, limit = 6) {
  let count = 0;
  for (const value of first) {
    if (second.has(value)) {
      count += 1;
      if (count >= limit) break;
    }
  }
  return count;
}

function primaryAffinityKey(repo, tokens) {
  const topics = repoTermSet(repo.topics || []);
  const tags = repoTermSet(repo.tags || []);
  const language =
    repo.language && repo.language !== "Unspecified" ? tokenize(repo.language)[0] : "";
  return (
    [...topics][0] ||
    [...tags][0] ||
    language ||
    [...tokens][0] ||
    String(repo.name || "repository").toLowerCase()
  );
}

function semanticAffinity(first, second) {
  if (!first || !second || first === second) return 0;
  let score = 0;
  if (first.repo.cluster === second.repo.cluster) score += 1.25;
  if (
    first.repo.language &&
    second.repo.language &&
    first.repo.language !== "Unspecified" &&
    first.repo.language === second.repo.language
  ) {
    score += 0.55;
  }
  if (first.affinityKey === second.affinityKey) score += 0.5;
  score += Math.min(1.2, sharedCount(first.topicSet, second.topicSet, 4) * 0.45);
  score += Math.min(0.8, sharedCount(first.tagSet, second.tagSet, 4) * 0.25);
  score += Math.min(1.25, sharedCount(first.semanticTokens, second.semanticTokens, 6) * 0.22);
  return score;
}

function isRelatedNode(node, focusedNode) {
  if (!focusedNode) return false;
  return (
    node.repo.cluster === focusedNode.repo.cluster || semanticAffinity(node, focusedNode) >= 1.65
  );
}

function focusLinkCandidates(focusedNode, visible) {
  return visible
    .filter((node) => node !== focusedNode)
    .map((node) => {
      const distance = Math.hypot(node.x - focusedNode.x, node.y - focusedNode.y);
      const affinity = semanticAffinity(focusedNode, node);
      const sameCluster = node.repo.cluster === focusedNode.repo.cluster;
      const distanceWeight = Math.max(0, 1 - distance / 0.46);
      return {
        node,
        distance,
        affinity,
        sameCluster,
        score: affinity * 1.15 + distanceWeight + (sameCluster ? 0.35 : 0),
      };
    })
    .filter(({ affinity, distance, sameCluster }) => {
      if (!sameCluster && affinity < 1.65) return false;
      if (sameCluster && affinity < 1.45 && distance > 0.28) return false;
      if (distance > 0.46 && affinity < 2.35) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score || a.distance - b.distance)
    .slice(0, MAX_FOCUS_LINKS);
}

function clusterAnchor(cluster, index) {
  const known = {
    "s26-airp": { x: -0.04, y: -0.08 },
    "ai-ml": { x: 0.36, y: -0.16 },
    games: { x: -0.42, y: 0.18 },
    "data-tooling": { x: 0.24, y: 0.3 },
    "web-portfolio": { x: -0.35, y: 0.34 },
    "research-software": { x: 0.44, y: 0.32 },
    docs: { x: -0.34, y: -0.3 },
  };
  if (known[cluster.id]) return known[cluster.id];
  const angle = index * 2.399963;
  return {
    x: Math.cos(angle) * 0.36,
    y: Math.sin(angle) * 0.28,
  };
}

function makeNodes(repos, clusters) {
  const clusterIndex = new Map(clusters.map((cluster, index) => [cluster.id, index]));
  const clusterCounts = new Map();
  for (const repo of repos) {
    clusterCounts.set(repo.cluster, (clusterCounts.get(repo.cluster) || 0) + 1);
  }
  const clusterSeen = new Map();
  return repos.map((repo) => {
    const cluster = clusterIndex.get(repo.cluster) ?? 0;
    const anchor = clusterAnchor(clusters[cluster] || { id: "other" }, cluster);
    const count = clusterCounts.get(repo.cluster) || 1;
    const rank = clusterSeen.get(repo.cluster) || 0;
    clusterSeen.set(repo.cluster, rank + 1);
    const semanticTokens = repoSemanticTokens(repo);
    const topicSet = repoTermSet(repo.topics || []);
    const tagSet = repoTermSet(repo.tags || []);
    const affinityKey = primaryAffinityKey(repo, semanticTokens);
    const local = hashValue(`${repo.name}:${repo.created_at}`);
    const depth = hashValue(`${repo.id}:${repo.name}:depth`);
    const keyAngle = hashValue(`${repo.cluster}:${affinityKey}`) * Math.PI * 2;
    const rankAngle = rank * 2.399963 + local * 0.35;
    const angle = rankAngle * 0.72 + keyAngle * 0.28;
    const spread = repo.cluster === "s26-airp" ? 0.31 : 0.16;
    const radius =
      Math.sqrt((rank + 0.5) / count) *
      spread *
      (0.9 + hashValue(`${repo.cluster}:${affinityKey}:radius`) * 0.18);
    const x = anchor.x + Math.cos(angle) * radius;
    const y = anchor.y + Math.sin(angle) * radius * 0.76;
    return {
      repo,
      cluster,
      anchorX: x,
      anchorY: y,
      x,
      y,
      radius: 2.05 + depth * 1.05 + (repo.stargazers_count > 0 ? 0.65 : 0),
      depth,
      semanticTokens,
      topicSet,
      tagSet,
      affinityKey,
      visible: true,
    };
  });
}

function resizeCanvas() {
  const rect = els.wrap.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  els.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  els.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  els.canvas.style.width = `${rect.width}px`;
  els.canvas.style.height = `${rect.height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  requestDraw();
}

function matchesQuery(repo) {
  const haystack = [
    repo.name,
    repo.description,
    repo.language,
    repo.cluster_label,
    ...(repo.topics || []),
    ...(repo.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(state.query.toLowerCase());
}

function updateVisibility() {
  for (const node of state.nodes) {
    node.visible =
      (state.cluster === "all" || node.repo.cluster === state.cluster) &&
      (!state.query || matchesQuery(node.repo));
  }
  if (state.selected && !state.selected.visible) {
    state.selected = null;
    renderPassiveInspector();
  }
  if (state.hovered && !state.hovered.visible) {
    state.hovered = null;
  }
  renderList();
  updateFilterSummary();
  updateHint();
  requestDraw();
}

function getActiveCluster() {
  return state.clusters.find((cluster) => cluster.id === state.cluster) || null;
}

function updateFilterSummary() {
  if (!els.filterSummary) return;
  const count = state.nodes.filter((node) => node.visible).length;
  const cluster = getActiveCluster();
  const noun = count === 1 ? "repository" : "repositories";
  const clusterPart = cluster ? ` in ${cluster.label}` : "";
  const queryPart = state.query ? ` matching "${state.query}"` : "";
  els.filterSummary.textContent = `Showing ${count} public ${noun}${clusterPart}${queryPart}.`;
}

function updateHint() {
  const count = state.nodes.filter((node) => node.visible).length;
  if (state.selected) {
    els.hint.textContent = state.selected.repo.name;
    return;
  }
  if (state.hovered) {
    els.hint.textContent = `${state.hovered.repo.name} - ${state.hovered.repo.cluster_label || "Repository"}`;
    return;
  }
  els.hint.textContent = count
    ? `${count} repositories visible. Select one to view details.`
    : "No repositories match the current search.";
}

function worldToScreen(node) {
  const rect = els.wrap.getBoundingClientRect();
  const base = Math.min(rect.width, rect.height) * 0.68 * state.scale;
  return {
    x: rect.width / 2 + state.panX + node.x * base,
    y: rect.height / 2 + state.panY + node.y * base,
  };
}

function screenToWorld(point) {
  const rect = els.wrap.getBoundingClientRect();
  const base = Math.min(rect.width, rect.height) * 0.68 * state.scale;
  return {
    x: (point.x - rect.width / 2 - state.panX) / base,
    y: (point.y - rect.height / 2 - state.panY) / base,
  };
}

function themeColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function colorWithAlpha(color, alpha) {
  const hex = color?.trim().match(/^#([0-9a-f]{6})$/i);
  if (!hex) return color || themeColor("--ink");
  const value = hex[1];
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function nodeColor(node) {
  return node.repo.cluster_color || themeColor(`--node-${node.cluster % 7}`) || themeColor("--ink");
}

function requestDraw() {
  if (state.frame) return;
  state.frame = requestAnimationFrame(() => {
    state.frame = 0;
    draw();
  });
}

function draw() {
  const rect = els.wrap.getBoundingClientRect();
  const paper = themeColor("--paper");
  const ink = themeColor("--ink");
  const line = themeColor("--line");
  const lineStrong = themeColor("--line-strong");
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, rect.width, rect.height);

  const visible = state.nodes.filter((node) => node.visible);
  ctx.save();
  ctx.lineCap = "round";
  let passiveLinks = 0;
  linkLoop: for (let i = 0; i < visible.length; i += 1) {
    const a = visible[i];
    for (let j = i + 1; j < visible.length; j += 1) {
      const b = visible[j];
      if (passiveLinks >= MAX_PASSIVE_LINKS) break linkLoop;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const affinity = semanticAffinity(a, b);
      const sameCluster = a.repo.cluster === b.repo.cluster;
      if (!sameCluster && affinity < 2.05) continue;
      if (distance > 0.34 && affinity < 2.4) continue;
      if (distance > (sameCluster ? 0.2 : 0.16) && affinity < 1.45) continue;
      const aa = worldToScreen(a);
      const bb = worldToScreen(b);
      const strength = Math.min(1, Math.max(0, (affinity - 0.8) / 2.4));
      const distanceWeight = Math.max(0, 1 - distance / 0.34);
      ctx.globalAlpha = Math.min(0.105, 0.028 + strength * 0.04 + distanceWeight * 0.035);
      ctx.strokeStyle = strength > 0.72 ? lineStrong : line;
      ctx.lineWidth = 0.35 + strength * 0.22;
      ctx.beginPath();
      ctx.moveTo(aa.x, aa.y);
      ctx.lineTo(bb.x, bb.y);
      ctx.stroke();
      passiveLinks += 1;
    }
  }
  ctx.restore();

  const focusedNode = state.selected || state.hovered;
  if (focusedNode) {
    const focusedScreen = worldToScreen(focusedNode);
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = colorWithAlpha(nodeColor(focusedNode), 1);
    for (const candidate of focusLinkCandidates(focusedNode, visible)) {
      const screen = worldToScreen(candidate.node);
      const strength = Math.min(1, Math.max(0.12, candidate.affinity / 3.4));
      const distanceWeight = Math.max(0, 1 - candidate.distance / 0.46);
      ctx.globalAlpha = Math.min(0.42, 0.12 + strength * 0.12 + distanceWeight * 0.13);
      ctx.lineWidth = 0.48 + strength * 0.45;
      ctx.beginPath();
      ctx.moveTo(focusedScreen.x, focusedScreen.y);
      ctx.lineTo(screen.x, screen.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  const nodesForDraw = [...visible].sort((a, b) => a.depth - b.depth);
  for (const node of nodesForDraw) {
    const screen = worldToScreen(node);
    const isSelected = state.selected === node;
    const isHovered = state.hovered === node;
    const related = isRelatedNode(node, focusedNode);
    const dim = state.selected && !isSelected && !related;
    const depthAlpha = 0.52 + node.depth * 0.28;
    const nodeAlpha = Math.min(0.96, isSelected || isHovered ? 0.96 : depthAlpha);
    const radiusScale = isSelected ? 1.48 : isHovered ? 1.34 : focusedNode && related ? 1.04 : 0.92;
    ctx.globalAlpha = dim ? 0.28 : 1;
    ctx.fillStyle = colorWithAlpha(nodeColor(node), nodeAlpha);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, node.radius * radiusScale, 0, Math.PI * 2);
    ctx.fill();

    if (isSelected || isHovered) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = colorWithAlpha(nodeColor(node), 0.82);
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, node.radius * 2.38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, node.radius * 3.05, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const shouldLabel = state.selected || state.hovered || (state.query && visible.length <= 10);
  if (shouldLabel) {
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = ink;
    ctx.font = "12px ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    const labels = state.selected
      ? [state.selected]
      : state.hovered
        ? [state.hovered]
        : visible.slice(0, 10);
    for (const node of labels) {
      if (!node.visible) continue;
      const screen = worldToScreen(node);
      ctx.strokeStyle = paper;
      ctx.lineWidth = 3;
      ctx.strokeText(node.repo.name, screen.x + 9, screen.y - 8);
      ctx.fillStyle = ink;
      ctx.fillText(node.repo.name, screen.x + 9, screen.y - 8);
    }
  }
  ctx.globalAlpha = 1;
}

function pickNode(point) {
  let picked = null;
  let best = Infinity;
  for (const node of state.nodes) {
    if (!node.visible) continue;
    const screen = worldToScreen(node);
    const distance = Math.hypot(point.x - screen.x, point.y - screen.y);
    if (distance < Math.max(12, node.radius * 4) && distance < best) {
      best = distance;
      picked = node;
    }
  }
  return picked;
}

function selectNode(node, focus = false) {
  state.selected = node;
  renderInspector(node?.repo || null);
  updateHint();
  requestDraw();
  if (node && focus) {
    els.inspector.focus({ preventScroll: false });
  }
}

function isS26Repo(repo) {
  return (
    repo.cluster === "s26-airp" ||
    /S26 AIRP/i.test([repo.cluster_label, repo.description].filter(Boolean).join(" "))
  );
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function renderInspector(repo) {
  if (!repo) {
    els.inspector.innerHTML = `
      <h2>Select a repository</h2>
      <p>Choose a repository to see its public description, language, update date, tags, and links.</p>
    `;
    return;
  }
  const date = repo.pushed_at || repo.updated_at || repo.created_at;
  const pushed = date
    ? new Date(date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Unknown";
  const description = repo.description || "No public description provided.";
  const tags = [
    ...new Set([repo.language, ...(repo.topics || []), ...(repo.tags || [])].filter(Boolean)),
  ].slice(0, 6);
  const repoUrl = safeUrl(repo.html_url);
  const homepageUrl = safeUrl(repo.homepage);
  const s26 = isS26Repo(repo)
    ? `<p class="small-note">S26 AIRP repository: AI-assisted research software prototype. Scientific and domain-specific content is provisional and not presented as validated scientific claims.</p>`
    : "";
  els.inspector.innerHTML = `
    <h2>${escapeHtml(repo.name)}</h2>
    <p>${escapeHtml(description)}</p>
    ${s26}
    <dl>
      <div><dt>Cluster</dt><dd>${escapeHtml(repo.cluster_label || "Repository")}</dd></div>
      <div><dt>Language</dt><dd>${escapeHtml(repo.language || "Unspecified")}</dd></div>
      <div><dt>Updated</dt><dd>${pushed}</dd></div>
      <div><dt>Tags</dt><dd>${tags.length ? tags.map(escapeHtml).join(", ") : "None listed"}</dd></div>
    </dl>
    <div class="repo-actions">
      ${repoUrl ? `<a href="${repoUrl}" target="_blank" rel="noreferrer">Open repository</a>` : ""}
      ${homepageUrl ? `<a href="${homepageUrl}" target="_blank" rel="noreferrer">Open project</a>` : ""}
    </div>
  `;
}

function renderClusterInspector(clusterId) {
  const cluster = state.clusters.find((item) => item.id === clusterId);
  if (!cluster) {
    renderInspector(null);
    return;
  }

  const repos = state.repos.filter((repo) => repo.cluster === clusterId);
  const languages = [...new Set(repos.map((repo) => repo.language).filter(Boolean))].slice(0, 5);
  const recent = repos
    .map((repo) => repo.pushed_at || repo.updated_at || repo.created_at)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0];
  const recentLabel = recent
    ? new Date(recent).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Unknown";
  const s26 =
    cluster.id === "s26-airp"
      ? `<p class="small-note">S26 AIRP cluster: AI-assisted research software prototypes. Scientific and domain-specific content is provisional and not presented as validated scientific claims.</p>`
      : "";

  els.inspector.innerHTML = `
    <h2>${escapeHtml(cluster.label)}</h2>
    <p>${repos.length} public repositories in this cluster.</p>
    ${s26}
    <dl>
      <div><dt>Repositories</dt><dd>${repos.length}</dd></div>
      <div><dt>Languages</dt><dd>${languages.length ? languages.map(escapeHtml).join(", ") : "Unspecified"}</dd></div>
      <div><dt>Recent update</dt><dd>${recentLabel}</dd></div>
    </dl>
  `;
}

function renderPassiveInspector() {
  if (state.cluster === "all") {
    renderInspector(null);
    return;
  }
  renderClusterInspector(state.cluster);
}

function renderClusters() {
  els.clusters.innerHTML = "";
  const all = document.createElement("button");
  all.className = "cluster-chip";
  all.type = "button";
  all.textContent = `All (${state.repos.length})`;
  all.setAttribute("aria-pressed", String(state.cluster === "all"));
  all.addEventListener("click", () => {
    state.cluster = "all";
    state.selected = null;
    renderInspector(null);
    renderClusters();
    updateVisibility();
  });
  els.clusters.append(all);
  for (const cluster of state.clusters) {
    const button = document.createElement("button");
    button.className = "cluster-chip";
    button.type = "button";
    button.style.setProperty("--cluster-color", cluster.color);
    const swatch = document.createElement("span");
    swatch.className = "cluster-swatch";
    swatch.setAttribute("aria-hidden", "true");
    button.append(swatch, document.createTextNode(`${cluster.label} (${cluster.count})`));
    button.setAttribute("aria-pressed", String(state.cluster === cluster.id));
    button.addEventListener("click", () => {
      state.cluster = state.cluster === cluster.id ? "all" : cluster.id;
      state.selected = null;
      if (state.cluster === "all") {
        renderInspector(null);
      } else {
        renderClusterInspector(state.cluster);
      }
      renderClusters();
      updateVisibility();
    });
    els.clusters.append(button);
  }
}

function formatDate(value) {
  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function repoDate(repo) {
  const date = new Date(repo.pushed_at || repo.updated_at || repo.created_at);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRepoDate(repo) {
  const date = repoDate(repo);
  return date ? formatDate(date) : "Unknown";
}

function sortRepositories(repos) {
  const sorted = [...repos];
  if (state.listSort === "name") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }
  if (state.listSort === "cluster") {
    sorted.sort(
      (a, b) =>
        (a.cluster_label || "").localeCompare(b.cluster_label || "") ||
        a.name.localeCompare(b.name),
    );
    return sorted;
  }
  sorted.sort((a, b) => {
    const dateA = repoDate(a)?.getTime() || 0;
    const dateB = repoDate(b)?.getTime() || 0;
    return dateB - dateA || a.name.localeCompare(b.name);
  });
  return sorted;
}

function renderActivity() {
  const now = new Date();
  const weeks = Array.from({ length: 12 }, (_, index) => {
    const end = new Date(now);
    end.setDate(now.getDate() - (11 - index) * 7);
    return { end, count: 0 };
  });
  for (const repo of state.repos) {
    const date = new Date(repo.pushed_at || repo.updated_at || repo.created_at);
    if (Number.isNaN(date.getTime())) continue;
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24 * 7));
    const index = 11 - diff;
    if (index >= 0 && index < weeks.length) {
      weeks[index].count += 1;
    }
  }
  const max = Math.max(1, ...weeks.map((week) => week.count));
  els.activity.innerHTML = "";
  const describeWeek = (week) => {
    const start = new Date(week.end);
    start.setDate(week.end.getDate() - 6);
    const noun = week.count === 1 ? "repository" : "repositories";
    return `${week.count} public ${noun} updated from ${formatDate(start)} to ${formatDate(week.end)}.`;
  };
  const updateDetail = (week) => {
    if (els.activityDetail) els.activityDetail.textContent = describeWeek(week);
  };
  for (const week of weeks) {
    const bar = document.createElement("button");
    bar.type = "button";
    bar.className = "activity-bar";
    bar.style.height = `${4 + (week.count / max) * 68}px`;
    bar.title = describeWeek(week);
    bar.setAttribute("aria-label", describeWeek(week));
    bar.addEventListener("focus", () => updateDetail(week));
    bar.addEventListener("mouseenter", () => updateDetail(week));
    bar.addEventListener("click", () => updateDetail(week));
    els.activity.append(bar);
  }
  updateDetail(weeks.at(-1));
}

function renderListControls() {
  if (!els.listLimitControls) return;
  els.listLimitControls.innerHTML = "";
  for (const limit of LIST_LIMITS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "limit-button";
    button.textContent = limit === "all" ? "all" : String(limit);
    button.setAttribute("aria-pressed", String(state.listLimit === limit));
    button.addEventListener("click", () => {
      state.listLimit = limit;
      renderListControls();
      renderList();
    });
    els.listLimitControls.append(button);
  }
}

function renderSortControls() {
  if (!els.listSortControls) return;
  els.listSortControls.innerHTML = "";
  for (const option of SORT_OPTIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sort-button";
    button.textContent = option.label;
    button.setAttribute("aria-pressed", String(state.listSort === option.id));
    button.addEventListener("click", () => {
      state.listSort = option.id;
      renderSortControls();
      renderList();
    });
    els.listSortControls.append(button);
  }
}

function renderList() {
  const filtered = sortRepositories(
    state.nodes.filter((node) => node.visible).map((node) => node.repo),
  );
  const limit = state.listLimit === "all" ? filtered.length : state.listLimit;
  const visible = filtered.slice(0, limit);
  els.list.innerHTML = "";
  if (els.listNote) {
    els.listNote.textContent =
      visible.length === filtered.length
        ? `Showing all ${filtered.length} matching repositories.`
        : `Showing ${visible.length} of ${filtered.length} matching repositories.`;
  }
  for (const repo of visible) {
    const row = document.createElement("article");
    row.className = "repo-row";
    const label = `${repo.cluster_label || "Repository"}${isS26Repo(repo) ? " - provisional" : ""}`;
    const repoUrl = safeUrl(repo.html_url);
    const date = repoDate(repo);
    const updated = formatRepoDate(repo);
    row.innerHTML = `
      ${
        repoUrl
          ? `<a class="repo-name" href="${repoUrl}" target="_blank" rel="noreferrer">${escapeHtml(repo.name)}</a>`
          : `<span class="repo-name">${escapeHtml(repo.name)}</span>`
      }
      <p>${escapeHtml(repo.description || "No public description provided.")}</p>
      <small>${escapeHtml(label)}</small>
      <time class="repo-updated" ${date ? `datetime="${date.toISOString()}"` : ""}>${escapeHtml(updated)}</time>
    `;
    els.list.append(row);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function onPointerPoint(event) {
  const rect = els.canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function resetView() {
  state.query = "";
  state.cluster = "all";
  state.scale = 1;
  state.panX = 0;
  state.panY = 0;
  state.selected = null;
  state.hovered = null;
  els.search.value = "";
  for (const node of state.nodes) {
    node.x = node.anchorX;
    node.y = node.anchorY;
  }
  renderInspector(null);
  renderClusters();
  updateVisibility();
}

async function fetchGithubRepos() {
  const repos = [];
  for (let page = 1; ; page += 1) {
    const response = await fetch(
      `${GITHUB_REPOS_API}?sort=updated&direction=desc&per_page=100&page=${page}`,
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (!response.ok) {
      throw new Error(`GitHub public API returned ${response.status}`);
    }
    const batch = await response.json();
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return repos;
}

async function refreshFromGithub() {
  if (!els.refresh) return;
  const previousById = new Map(state.repos.map((repo) => [repo.id, repo]));
  els.refresh.disabled = true;
  if (els.refreshStatus) els.refreshStatus.textContent = "Refreshing public metadata...";
  try {
    const repos = await fetchGithubRepos();
    const merged = repos
      .map((repo) => mergePublicRepo(repo, previousById.get(repo.id)))
      .sort(
        (a, b) => new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at),
      );
    applyRepositoryData(merged);
    if (els.refreshStatus) {
      els.refreshStatus.textContent = `Loaded ${state.repos.length} public repositories from GitHub.`;
    }
  } catch (error) {
    if (els.refreshStatus) {
      els.refreshStatus.textContent = "GitHub refresh unavailable; keeping the static snapshot.";
    }
    console.warn(error);
  } finally {
    els.refresh.disabled = false;
  }
}

function bindEvents() {
  document.addEventListener("paper-theme-change", requestDraw);
  els.search.addEventListener("input", () => {
    state.query = els.search.value.trim();
    state.selected = null;
    renderPassiveInspector();
    updateVisibility();
  });
  els.reset.addEventListener("click", resetView);
  els.refresh?.addEventListener("click", refreshFromGithub);
  els.canvas.addEventListener("pointerdown", (event) => {
    els.canvas.setPointerCapture(event.pointerId);
    const point = onPointerPoint(event);
    state.dragging = true;
    state.pointerStart = point;
    state.lastPointer = point;
    state.moved = false;
    els.canvas.classList.add("is-dragging");
  });
  els.canvas.addEventListener("pointermove", (event) => {
    const point = onPointerPoint(event);
    const hover = pickNode(point);
    if (hover !== state.hovered) {
      state.hovered = hover;
      updateHint();
      requestDraw();
    }
    if (
      !state.dragging ||
      !state.lastPointer ||
      !finePointer.matches ||
      event.pointerType === "touch"
    )
      return;
    const dx = point.x - state.lastPointer.x;
    const dy = point.y - state.lastPointer.y;
    if (Math.hypot(point.x - state.pointerStart.x, point.y - state.pointerStart.y) > 3) {
      state.moved = true;
    }
    state.panX += dx;
    state.panY += dy;
    state.lastPointer = point;
    requestDraw();
  });
  els.canvas.addEventListener("pointerup", (event) => {
    const point = onPointerPoint(event);
    const node = pickNode(point);
    els.canvas.releasePointerCapture(event.pointerId);
    els.canvas.classList.remove("is-dragging");
    if (!state.moved) {
      selectNode(node || null);
    }
    state.dragging = false;
    state.pointerStart = null;
    state.lastPointer = null;
    state.moved = false;
  });
  els.canvas.addEventListener("pointercancel", () => {
    state.dragging = false;
    state.pointerStart = null;
    state.lastPointer = null;
    state.moved = false;
    els.canvas.classList.remove("is-dragging");
  });
  els.canvas.addEventListener(
    "wheel",
    (event) => {
      if (!finePointer.matches) return;
      event.preventDefault();
      const point = onPointerPoint(event);
      const before = screenToWorld(point);
      const factor = event.deltaY < 0 ? 1.08 : 0.92;
      state.scale = Math.min(2.4, Math.max(0.55, state.scale * factor));
      const after = worldToScreen(before);
      state.panX += point.x - after.x;
      state.panY += point.y - after.y;
      requestDraw();
    },
    { passive: false },
  );
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== els.search) {
      event.preventDefault();
      els.search.focus();
    }
    if (event.key === "Escape") {
      resetView();
    }
  });
}

async function init() {
  const response = await fetch(DATA_URL);
  const data = await response.json();
  applyRepositoryData(data.repos || []);
  bindEvents();
}

init().catch((error) => {
  console.error(error);
  els.hint.textContent = "Repository data could not be loaded.";
});
