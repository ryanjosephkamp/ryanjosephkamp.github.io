const DATA_URL = "./data/repos.snapshot.json";
const API_ROOT = "https://api.github.com/users/ryanjosephkamp/repos";
const BLOCKED_PROVIDER_TERMS = ["gr" + "okedex", "gr" + "ok", "x." + "ai", "x" + "ai"];
const RECENT_TABLE_LIMIT = 25;
const MOBILE_BREAKPOINT = 620;
const MIN_GRAPH_SCALE = 0.72;
const MAX_GRAPH_SCALE = 2.4;
const FRAME_MS = 16.67;
const MAX_SIMULATION_STEP = 2.2;
const PRIMARY_CLUSTER_OVERRIDES = new Map([
  ["brrrdle", "games"],
  ["brrrdle-dev", "games"],
]);
const CLUSTER_OVERVIEW_ANCHORS = new Map([
  ["s26-airp", { x: 0.51, y: 0.33 }],
  ["ai-ml", { x: 0.85, y: 0.43 }],
  ["research-software", { x: 0.82, y: 0.71 }],
  ["computational-biology", { x: 0.73, y: 0.17 }],
  ["data-tooling", { x: 0.56, y: 0.82 }],
  ["web-portfolio", { x: 0.27, y: 0.8 }],
  ["games", { x: 0.13, y: 0.6 }],
  ["interactive", { x: 0.18, y: 0.35 }],
  ["writing-docs", { x: 0.31, y: 0.16 }],
  ["other", { x: 0.5, y: 0.12 }],
]);

const clusterDefinitions = [
  { id: "s26-airp", label: "S26 AIRP", color: "#12b886" },
  { id: "ai-ml", label: "AI and ML", color: "#7c5cff" },
  { id: "research-software", label: "Research Software", color: "#18c3d7" },
  { id: "computational-biology", label: "Computational Biology", color: "#c084fc" },
  { id: "data-tooling", label: "Data and Tooling", color: "#4dabf7" },
  { id: "web-portfolio", label: "Web and Portfolio", color: "#ffd43b" },
  { id: "games", label: "Games", color: "#ff8787" },
  { id: "interactive", label: "Interactive Experiments", color: "#ffae6d" },
  { id: "writing-docs", label: "Writing and Docs", color: "#f783ac" },
  { id: "other", label: "Other / Review", color: "#adb5bd" },
];

const clusterRules = {
  "s26-airp": ["s26 airp", "streamlit", "prototype portfolio"],
  "ai-ml": ["ai", "agent", "attention", "diffusion", "ebm", "egnn", "llm", "machine learning", "ml", "model", "neural", "transformer"],
  "research-software": ["analysis", "benchmark", "experiment", "pipeline", "reproducible", "research", "simulation", "solver", "tool", "visualization"],
  "computational-biology": ["affinity", "antibiotic", "bio", "cell", "chem", "ferment", "gene", "klk5", "md", "molecular", "molecule", "protein", "sequence", "spink7", "structure"],
  "data-tooling": ["api", "automation", "catalog", "cli", "data", "dataset", "dictionary", "parser", "qr", "tooling", "voxel"],
  "web-portfolio": ["blog", "github.io", "portfolio", "site", "streamlit", "vercel", "web", "website"],
  games: ["brrrdle", "game", "hurdle", "wordle"],
  interactive: ["app", "brrrdle", "canvas", "game", "interactive", "pac", "simulator"],
  "writing-docs": ["article", "cv", "docs", "latex", "notes", "paper", "readme", "tex", "writing"],
};

const svg = document.querySelector("#repo-graph");
const tableBody = document.querySelector("#repo-table");
const filters = document.querySelector("#cluster-filters");
const searchInput = document.querySelector("#search-input");
const densityInput = document.querySelector("#density-input");
const inspector = document.querySelector("#repo-inspector");
const listPanel = document.querySelector("#repository-list-panel");
const listSummary = document.querySelector("#list-summary");
const tableWrap = document.querySelector("#repository-table-wrap");
const graphModeSummary = document.querySelector("#graph-mode-summary");
const visibleCount = document.querySelector("#visible-count");
const clusterCount = document.querySelector("#cluster-count");
const repoCount = document.querySelector("#repo-count");
const snapshotTime = document.querySelector("#snapshot-time");
const refreshButton = document.querySelector("#refresh-button");
const refreshStatus = document.querySelector("#refresh-status");
const toggleListButton = document.querySelector("#toggle-list-button");
const showAllButton = document.querySelector("#show-all-button");
const clusterViewButton = document.querySelector("#cluster-view-button");
const allNodesButton = document.querySelector("#all-nodes-button");
const resetButton = document.querySelector("#reset-button");
const clearSelectionButton = document.querySelector("#clear-selection");
const emptyGraph = document.querySelector("#graph-empty");

let snapshot = null;
let repos = [];
let selectedRepo = null;
let activeCluster = "all";
let query = "";
let nodePositions = new Map();
let dragTarget = null;
let listExpanded = false;
let showAllRows = false;
let graphRenderRequest = null;
let motionPaintRequest = null;
let transformPaintRequest = null;
let graphViewportElement = null;
let graphNodeElements = new Map();
let graphEdgeElements = [];
let graphMode = "clusters";
let graphTransform = { scale: 1, x: 0, y: 0 };
let graphPointers = new Map();
let graphGesture = null;
let physicsNodes = new Map();
let physicsEdges = [];
let physicsFrame = null;
let lastPhysicsTick = 0;
let physicsSignature = "";
let suppressNodeClickUntil = 0;

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatRelative(value) {
  if (!value) return "Unknown";
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.max(0, Math.floor(diff / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  return `${Math.floor(months / 12)} yr ago`;
}

function shortDescription(repo) {
  return repo.description || "No public repository description provided.";
}

function safeText(parts) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function classifyRepo(repo) {
  const text = safeText([
    repo.name,
    repo.full_name,
    repo.description,
    repo.homepage,
    repo.language,
    ...(repo.topics || []),
  ]);

  const tags = [];
  if (repo.fork) tags.push("fork");
  if (repo.archived) tags.push("archived");
  if (repo.homepage) tags.push(repo.homepage.includes("streamlit.app") ? "interactive app" : "homepage");
  if (repo.language) tags.push(repo.language);

  const scores = clusterDefinitions.map((cluster) => {
    let score = 0;
    if (cluster.id === "s26-airp" && (text.includes("s26 airp") || repo.name.startsWith("the-"))) score += 5;
    if (cluster.id === "web-portfolio" && /blog|github\.io|website|portfolio/.test(text)) score += 4;
    for (const keyword of clusterRules[cluster.id] || []) {
      if (text.includes(keyword)) score += 1;
    }
    return { ...cluster, score };
  }).sort((a, b) => b.score - a.score);

  const overrideId = PRIMARY_CLUSTER_OVERRIDES.get(repo.name);
  const overrideCluster = overrideId ? clusterFor(overrideId) : null;
  const winner = overrideCluster || (scores[0].score > 0 ? scores[0] : clusterDefinitions.at(-1));
  const secondary = scores
    .filter((item) => item.score > 0 && item.id !== winner.id)
    .slice(0, 3)
    .map((item) => item.id);

  return {
    cluster: winner.id,
    cluster_label: winner.label,
    cluster_color: winner.color,
    secondary_clusters: secondary,
    tags: Array.from(new Set(tags)),
  };
}

function normalizeRepo(repo) {
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
    stargazers_count: repo.stargazers_count || 0,
    forks_count: repo.forks_count || 0,
    open_issues_count: repo.open_issues_count || 0,
    default_branch: repo.default_branch || "",
    size: repo.size || 0,
  };
  const classification = classifyRepo(normalized);
  return {
    ...normalized,
    ...classification,
    tags: Array.from(new Set([...(repo.tags || []), ...(classification.tags || [])])),
  };
}

function shouldExclude(repo) {
  const text = safeText([
    repo.name,
    repo.full_name,
    repo.description,
    repo.homepage,
    ...(repo.topics || []),
  ]);

  return BLOCKED_PROVIDER_TERMS.some((term) => text.includes(term));
}

function getVisibleRepos() {
  const search = query.trim().toLowerCase();
  return repos.filter((repo) => {
    const clusterMatch = activeCluster === "all" || repo.cluster === activeCluster;
    const searchMatch = !search || safeText([
      repo.name,
      repo.full_name,
      repo.description,
      repo.language,
      repo.cluster_label,
      repo.homepage,
      ...(repo.topics || []),
    ]).includes(search);
    return clusterMatch && searchMatch;
  });
}

function getVisibleReposSorted() {
  return [...getVisibleRepos()].sort((a, b) => {
    const aTime = new Date(a.pushed_at || a.updated_at || a.created_at || 0).getTime();
    const bTime = new Date(b.pushed_at || b.updated_at || b.created_at || 0).getTime();
    return bTime - aTime;
  });
}

function clusterFor(id) {
  return clusterDefinitions.find((cluster) => cluster.id === id) || clusterDefinitions.at(-1);
}

function groupByCluster(items) {
  return clusterDefinitions.map((cluster) => ({
    ...cluster,
    repos: items.filter((repo) => repo.cluster === cluster.id),
  })).filter((cluster) => cluster.repos.length > 0);
}

function isCompactViewport() {
  return (svg.clientWidth || window.innerWidth || 900) < MOBILE_BREAKPOINT;
}

function defaultGraphMode() {
  return isCompactViewport() ? "clusters" : "all";
}

function isClusterOverview(visibleRepos = getVisibleRepos()) {
  return graphMode === "clusters"
    && activeCluster === "all"
    && query.trim() === ""
    && visibleRepos.length > 0;
}

function updateMeta() {
  const visible = getVisibleRepos();
  const activeClusters = groupByCluster(visible);
  visibleCount.textContent = `${visible.length} visible`;
  clusterCount.textContent = `${activeClusters.length} clusters`;
  repoCount.textContent = `${repos.length}`;
  snapshotTime.textContent = snapshot?.generated_at ? formatDate(snapshot.generated_at) : "Unknown";
}

function renderFilters() {
  const counts = new Map(clusterDefinitions.map((cluster) => [
    cluster.id,
    repos.filter((repo) => repo.cluster === cluster.id).length,
  ]));
  filters.innerHTML = "";

  const allButton = makeFilterButton("all", "All", repos.length);
  filters.append(allButton);

  for (const cluster of clusterDefinitions) {
    const count = counts.get(cluster.id) || 0;
    if (count === 0) continue;
    filters.append(makeFilterButton(cluster.id, cluster.label, count));
  }
}

function makeFilterButton(id, label, count) {
  const button = document.createElement("button");
  button.className = "filter-button";
  button.type = "button";
  button.setAttribute("aria-pressed", String(activeCluster === id));
  button.innerHTML = `${label} <span class="count">${count}</span>`;
  button.addEventListener("click", () => {
    activeCluster = id;
    if (id !== "all") graphMode = "all";
    render();
  });
  return button;
}

function createSvgElement(name, attrs = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, value);
  }
  return element;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function resetGraphTransform() {
  graphTransform = { scale: 1, x: 0, y: 0 };
}

function normalizedGraphTransform(next = graphTransform) {
  const width = svg.clientWidth || 900;
  const height = svg.clientHeight || 560;
  const scale = clamp(next.scale, MIN_GRAPH_SCALE, MAX_GRAPH_SCALE);

  if (scale < 1) {
    return {
      scale,
      x: (width * (1 - scale)) / 2,
      y: (height * (1 - scale)) / 2,
    };
  }

  const minX = width - width * scale - 24;
  const minY = height - height * scale - 24;
  return {
    scale,
    x: clamp(next.x, minX, 24),
    y: clamp(next.y, minY, 24),
  };
}

function graphTransformAttribute() {
  graphTransform = normalizedGraphTransform(graphTransform);
  return `translate(${graphTransform.x} ${graphTransform.y}) scale(${graphTransform.scale})`;
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function graphInteractionActive() {
  return Boolean(dragTarget || graphGesture || graphPointers.size > 0);
}

function resetGraphMotion() {
  physicsNodes = new Map();
  physicsEdges = [];
  physicsSignature = "";
  lastPhysicsTick = 0;
  scheduleMotionPaint();
}

function boundedVector(vector, limit) {
  const magnitude = Math.hypot(vector.x, vector.y);
  if (magnitude <= limit || magnitude === 0) return vector;
  const scale = limit / magnitude;
  return { x: vector.x * scale, y: vector.y * scale };
}

function nodeMargin(node) {
  return node.type === "cluster" ? (isCompactViewport() ? 52 : 68) : (isCompactViewport() ? 18 : 24);
}

function clampNodePoint(node, point) {
  const width = svg.clientWidth || 900;
  const height = svg.clientHeight || 560;
  const margin = nodeMargin(node);
  return {
    x: clamp(point.x, margin, width - margin),
    y: clamp(point.y, margin, height - margin),
  };
}

function ambientOffsetForNode(node, timestamp) {
  if (prefersReducedMotion()) return { x: 0, y: 0 };

  const seed = node.seed ?? hashString(node.id);
  const compact = isCompactViewport();
  const focused = activeCluster !== "all" || query.trim().length > 0;
  const allNodeDense = graphMode === "all" && activeCluster === "all" && !query.trim();
  const interactionDamp = graphInteractionActive() ? 0.35 : 1;
  const modeDamp = allNodeDense ? 0.48 : focused ? 0.72 : 1;
  const baseAmplitude = node.type === "cluster"
    ? compact ? 9.2 : 10.5
    : compact ? 3.8 : 5.2;
  const amplitude = baseAmplitude * modeDamp * interactionDamp;
  const phase = (seed % 6283) / 1000;
  const drift = timestamp * (0.00135 + (seed % 7) * 0.000055);

  return {
    x: Math.sin(drift + phase) * amplitude
      + Math.sin(drift * 0.43 + phase * 1.7) * amplitude * 0.38,
    y: Math.cos(drift * 0.86 + phase * 1.23) * amplitude * 0.8
      + Math.sin(drift * 0.31 + phase * 0.9) * amplitude * 0.28,
  };
}

function graphWorldPointFromEvent(event) {
  const point = graphPointFromEvent(event);
  const scale = graphTransform.scale || 1;
  return {
    x: (point.x - graphTransform.x) / scale,
    y: (point.y - graphTransform.y) / scale,
  };
}

function buildPhysicsSignature(nodes) {
  const width = Math.round(svg.clientWidth || 900);
  const height = Math.round(svg.clientHeight || 560);
  return [
    width,
    height,
    graphMode,
    activeCluster,
    query.trim().toLowerCase(),
    densityInput.value,
    nodes.map((node) => node.id).join(","),
  ].join("|");
}

function syncPhysicsLayout(nodes, edges) {
  const nextSignature = buildPhysicsSignature(nodes);
  const reset = nextSignature !== physicsSignature;
  const nextNodes = new Map();

  for (const node of nodes) {
    const existing = physicsNodes.get(node.id);
    const seed = hashString(node.id);
    const anchorX = node.x;
    const anchorY = node.y;

    if (existing && !reset) {
      const anchorShiftX = anchorX - existing.anchorX;
      const anchorShiftY = anchorY - existing.anchorY;
      nextNodes.set(node.id, {
        ...existing,
        ...node,
        seed,
        anchorX,
        anchorY,
        x: clampNodePoint(node, { x: existing.x + anchorShiftX, y: existing.y + anchorShiftY }).x,
        y: clampNodePoint(node, { x: existing.x + anchorShiftX, y: existing.y + anchorShiftY }).y,
        vx: existing.vx,
        vy: existing.vy,
        dragging: existing.dragging,
      });
    } else {
      nextNodes.set(node.id, {
        ...node,
        seed,
        anchorX,
        anchorY,
        x: anchorX,
        y: anchorY,
        vx: 0,
        vy: 0,
        dragging: false,
      });
    }
  }

  physicsNodes = nextNodes;
  physicsEdges = edges.map((edge) => ({
    sourceId: edge.source.id,
    targetId: edge.target.id,
    type: edge.type,
    weight: edge.weight || 1,
    restLength: Math.max(
      edge.type === "primary" ? 56 : 92,
      Math.hypot(edge.target.x - edge.source.x, edge.target.y - edge.source.y),
    ),
  }));
  physicsSignature = nextSignature;
  startAmbientMotionLoop();
}

function renderNodesFromPhysics(nodes) {
  return nodes.map((node) => {
    const physicsNode = physicsNodes.get(node.id);
    return physicsNode ? { ...node, x: physicsNode.x, y: physicsNode.y } : node;
  });
}

function addSpringForce(source, target, restLength, strength, delta) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.max(0.001, Math.hypot(dx, dy));
  const force = (distance - restLength) * strength * delta;
  const fx = (dx / distance) * force;
  const fy = (dy / distance) * force;

  if (!source.dragging) {
    source.vx += fx;
    source.vy += fy;
  }
  if (!target.dragging) {
    target.vx -= fx;
    target.vy -= fy;
  }
}

function applyClusterSeparation(nodes, delta) {
  const collidable = nodes.filter((node) => node.type === "cluster");
  if (activeCluster !== "all" || query.trim()) {
    collidable.push(...nodes.filter((node) => node.type === "repo").slice(0, 36));
  }

  for (let first = 0; first < collidable.length; first += 1) {
    for (let second = first + 1; second < collidable.length; second += 1) {
      const a = collidable[first];
      const b = collidable[second];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const desired = a.r + b.r + (a.type === "cluster" || b.type === "cluster" ? 18 : 8);
      if (distance >= desired) continue;

      const force = ((desired - distance) / desired) * 0.52 * delta;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      if (!a.dragging) {
        a.vx -= fx;
        a.vy -= fy;
      }
      if (!b.dragging) {
        b.vx += fx;
        b.vy += fy;
      }
    }
  }
}

function stepGraphPhysics(timestamp) {
  physicsFrame = null;
  const delta = Math.min(MAX_SIMULATION_STEP, Math.max(0.45, (timestamp - (lastPhysicsTick || timestamp)) / FRAME_MS || 1));
  lastPhysicsTick = timestamp;

  if (!physicsNodes.size || document.visibilityState === "hidden") {
    startAmbientMotionLoop();
    return;
  }

  const reducedMotion = prefersReducedMotion();
  const nodes = [...physicsNodes.values()];

  if (reducedMotion) {
    for (const node of nodes) {
      node.vx = 0;
      node.vy = 0;
      node.x += (node.anchorX - node.x) * 0.35;
      node.y += (node.anchorY - node.y) * 0.35;
    }
    paintGraphMotion();
    startAmbientMotionLoop();
    return;
  }

  for (const node of nodes) {
    if (node.dragging) continue;
    const ambient = ambientOffsetForNode(node, timestamp);
    const targetX = node.anchorX + ambient.x;
    const targetY = node.anchorY + ambient.y;
    const anchorSpring = node.type === "cluster" ? 0.043 : 0.036;
    node.vx += (targetX - node.x) * anchorSpring * delta;
    node.vy += (targetY - node.y) * anchorSpring * delta;
  }

  const compactAllNodes = isCompactViewport() && graphMode === "all" && activeCluster === "all" && !query.trim();
  for (const edge of physicsEdges) {
    if (compactAllNodes && edge.type === "secondary") continue;
    const source = physicsNodes.get(edge.sourceId);
    const target = physicsNodes.get(edge.targetId);
    if (!source || !target) continue;
    const strength = edge.type === "primary" ? 0.0038 : 0.0013;
    addSpringForce(source, target, edge.restLength, strength, delta);
  }

  applyClusterSeparation(nodes, delta);

  const damping = Math.pow(graphInteractionActive() ? 0.82 : 0.9, delta);
  for (const node of nodes) {
    if (node.dragging) continue;
    node.vx = clamp(node.vx * damping, -18, 18);
    node.vy = clamp(node.vy * damping, -18, 18);

    const next = clampNodePoint(node, {
      x: node.x + node.vx * delta,
      y: node.y + node.vy * delta,
    });
    if (next.x !== node.x + node.vx * delta) node.vx *= -0.18;
    if (next.y !== node.y + node.vy * delta) node.vy *= -0.18;
    node.x = next.x;
    node.y = next.y;
  }

  paintGraphMotion();
  startAmbientMotionLoop();
}

function startAmbientMotionLoop() {
  if (physicsFrame) return;
  physicsFrame = window.requestAnimationFrame(stepGraphPhysics);
}

function graphPointFromEvent(event) {
  const rect = svg.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function distanceBetweenPoints(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpointBetweenPoints(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function returnToDefaultGraphView() {
  if (query.trim()) return false;
  stopMomentum();
  activeCluster = "all";
  selectedRepo = null;
  graphMode = defaultGraphMode();
  nodePositions = new Map();
  resetGraphMotion();
  resetGraphTransform();
  render();
  return true;
}

function buildAggregateClusterEdges(clusterNodes, grouped, limit = 14) {
  const hubs = new Map(clusterNodes.map((node) => [node.cluster, node]));
  const edgeWeights = new Map();

  for (const cluster of grouped) {
    for (const repo of cluster.repos) {
      for (const secondary of repo.secondary_clusters || []) {
        if (secondary === cluster.id || !hubs.has(secondary)) continue;
        const key = [cluster.id, secondary].sort().join("::");
        edgeWeights.set(key, (edgeWeights.get(key) || 0) + 1);
      }
    }
  }

  return [...edgeWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, weight]) => {
      const [sourceId, targetId] = key.split("::");
      return {
        source: hubs.get(sourceId),
        target: hubs.get(targetId),
        type: "secondary",
        weight,
      };
    });
}

function buildRepositoryAffinityEdges(repoNodes, limit) {
  const edges = [];
  const seen = new Set();
  const groups = new Map();

  function addToGroup(key, node) {
    if (!key || key === "Unspecified") return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(node);
  }

  for (const node of repoNodes) {
    addToGroup(`language:${node.repo.language}`, node);
    for (const tag of node.repo.tags || []) addToGroup(`tag:${tag}`, node);
    if (node.repo.homepage) addToGroup("has-homepage", node);
  }

  for (const nodes of [...groups.values()].sort((a, b) => b.length - a.length)) {
    if (nodes.length < 2) continue;
    const sorted = [...nodes].sort((a, b) => {
      const aTime = new Date(a.repo.pushed_at || a.repo.updated_at || 0).getTime();
      const bTime = new Date(b.repo.pushed_at || b.repo.updated_at || 0).getTime();
      return bTime - aTime;
    });

    for (let index = 0; index < sorted.length - 1; index += 1) {
      const source = sorted[index];
      const target = sorted[index + 1];
      if (source.cluster === target.cluster && nodes.length > 6) continue;
      const key = [source.id, target.id].sort().join("::");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ source, target, type: "secondary", weight: 1 });
      if (edges.length >= limit) return edges;
    }
  }

  return edges;
}

function clusterOverviewPosition(cluster, index, total, width, height, margin) {
  const anchor = CLUSTER_OVERVIEW_ANCHORS.get(cluster.id);
  if (anchor) {
    return {
      x: clamp(width * anchor.x, margin, width - margin),
      y: clamp(height * anchor.y, margin, height - margin),
    };
  }

  const seed = hashString(cluster.id);
  const xBand = 0.18 + ((seed % 53) / 53) * 0.64;
  const yBand = 0.2 + (((seed >> 5) % 47) / 47) * 0.58;
  const stagger = total > 1 ? (index / (total - 1) - 0.5) * 0.16 : 0;

  return {
    x: clamp(width * (xBand + stagger), margin, width - margin),
    y: clamp(height * yBand, margin, height - margin),
  };
}

function relaxClusterNodes(nodes, width, height, margin) {
  if (nodes.length < 2) return;
  const isCompact = width < MOBILE_BREAKPOINT;
  const minDistance = Math.max(isCompact ? 92 : 86, Math.min(width, height) * (isCompact ? 0.23 : 0.21));

  for (let pass = 0; pass < 14; pass += 1) {
    for (let first = 0; first < nodes.length; first += 1) {
      for (let second = first + 1; second < nodes.length; second += 1) {
        const a = nodes[first];
        const b = nodes[second];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.max(0.001, Math.hypot(dx, dy));
        if (distance >= minDistance) continue;

        const push = ((minDistance - distance) / distance) * 0.46;
        const x = dx * push;
        const y = dy * push;
        a.x = clamp(a.x - x, margin, width - margin);
        a.y = clamp(a.y - y, margin, height - margin);
        b.x = clamp(b.x + x, margin, width - margin);
        b.y = clamp(b.y + y, margin, height - margin);
      }
    }
  }
}

function layoutNodes(visibleRepos, options = {}) {
  const width = svg.clientWidth || 900;
  const height = svg.clientHeight || 560;
  const compact = width < MOBILE_BREAKPOINT;
  const clusterOverview = Boolean(options.clusterOverview);
  const density = Number(densityInput.value);
  const centerX = width / 2;
  const centerY = height / 2;
  const clusterRadius = Math.min(width, height) * (clusterOverview ? 0.34 : compact ? 0.26 : 0.33) * density;
  const grouped = groupByCluster(visibleRepos);
  const clusterNodes = [];
  const repoNodes = [];
  const edgeList = [];
  const repoMargin = compact ? 20 : 30;
  const clusterMargin = compact ? 48 : 72;

  grouped.forEach((cluster, index) => {
    const angle = grouped.length === 1 ? -Math.PI / 2 : (Math.PI * 2 * index) / grouped.length - Math.PI / 2;
    const organicPosition = clusterOverview
      ? clusterOverviewPosition(cluster, index, grouped.length, width, height, clusterMargin)
      : null;
    const defaultX = organicPosition?.x ?? centerX + Math.cos(angle) * clusterRadius;
    const defaultY = organicPosition?.y ?? centerY + Math.sin(angle) * clusterRadius * 0.78;
    const key = `cluster:${cluster.id}`;
    const saved = nodePositions.get(key);
    const clusterNode = {
      id: key,
      type: "cluster",
      label: cluster.label,
      count: cluster.repos.length,
      color: cluster.color,
      x: saved?.x ?? clamp(defaultX, clusterMargin, width - clusterMargin),
      y: saved?.y ?? clamp(defaultY, clusterMargin, height - clusterMargin),
      r: clusterOverview
        ? Math.max(25, Math.min(46, 22 + cluster.repos.length * 0.34))
        : Math.max(22, Math.min(42, 20 + cluster.repos.length * 0.45)),
      cluster: cluster.id,
    };
    clusterNodes.push(clusterNode);

    if (clusterOverview) return;

    const maxRepoRadius = Math.min(width, height) * (compact ? 0.32 : 0.26);
    const repoRadius = Math.max(compact ? 74 : 78, Math.min(maxRepoRadius, 82 + cluster.repos.length * 1.55)) * density;
    const ringCount = cluster.repos.length > 54 ? 3 : cluster.repos.length > 26 ? 2 : 1;
    const ringScales = ringCount === 3 ? [0.7, 1.02, 1.34] : ringCount === 2 ? [0.82, 1.22] : [1.04];

    cluster.repos.forEach((repo, repoIndex) => {
      const ringIndex = repoIndex % ringCount;
      const ringSlot = Math.floor(repoIndex / ringCount);
      const slotsInRing = Math.ceil(cluster.repos.length / ringCount);
      const repoAngle = (Math.PI * 2 * ringSlot) / slotsInRing - Math.PI / 3 + ringIndex * 0.12;
      const ringRadius = repoRadius * ringScales[ringIndex];
      const jitter = ((repo.name.length % 7) - 3) * 5;
      const repoKey = `repo:${repo.name}`;
      const repoSaved = nodePositions.get(repoKey);
      const repoNode = {
        id: repoKey,
        type: "repo",
        repo,
        label: repo.name,
        color: repo.cluster_color || cluster.color,
        x: repoSaved?.x ?? clamp(clusterNode.x + Math.cos(repoAngle) * (ringRadius + jitter), repoMargin, width - repoMargin),
        y: repoSaved?.y ?? clamp(clusterNode.y + Math.sin(repoAngle) * (ringRadius * 0.72 + jitter), repoMargin, height - repoMargin),
        r: selectedRepo?.name === repo.name ? 10 : 6.5,
        cluster: cluster.id,
      };
      repoNodes.push(repoNode);
      edgeList.push({ source: clusterNode, target: repoNode, type: "primary" });
    });
  });

  if (clusterOverview) {
    relaxClusterNodes(clusterNodes, width, height, clusterMargin);
    edgeList.push(...buildAggregateClusterEdges(clusterNodes, grouped, compact ? 5 : 8));
    return { nodes: clusterNodes, edges: edgeList };
  }

  edgeList.push(...buildRepositoryAffinityEdges(repoNodes, compact ? 16 : 42));
  return { nodes: [...clusterNodes, ...repoNodes], edges: edgeList };
}

function renderGraph() {
  const visibleRepos = getVisibleRepos();
  const compactViewport = isCompactViewport();
  const clusterOverview = isClusterOverview(visibleRepos);
  const focusedView = activeCluster !== "all" || query.trim().length > 0;
  const showRepoLabels = visibleRepos.length <= (compactViewport ? 10 : 18) || (focusedView && visibleRepos.length <= (compactViewport ? 24 : 48));
  const showSecondaryEdges = clusterOverview || focusedView || graphMode === "all" || visibleRepos.length <= 42 || !compactViewport;
  const selectedName = selectedRepo?.name;
  emptyGraph.hidden = visibleRepos.length > 0;
  svg.innerHTML = "";
  graphViewportElement = null;
  graphNodeElements = new Map();
  graphEdgeElements = [];
  svg.dataset.graphMode = clusterOverview ? "clusters" : graphMode;
  svg.dataset.compact = String(compactViewport);

  clusterViewButton.setAttribute("aria-pressed", String(clusterOverview));
  allNodesButton.setAttribute("aria-pressed", String(!clusterOverview));
  graphModeSummary.textContent = clusterOverview
    ? "Cluster overview: choose a center to expand repositories."
    : focusedView
      ? compactViewport && !query.trim()
        ? "Focused center: tap empty graph space to return; pinch to zoom."
        : "Focused view: repositories are expanded for the current search or cluster."
      : "All-node view: every visible repository is shown in the graph.";

  const { nodes, edges } = layoutNodes(visibleRepos, { clusterOverview });
  syncPhysicsLayout(nodes, edges);
  const renderNodes = renderNodesFromPhysics(nodes);
  const renderNodeById = new Map(renderNodes.map((node) => [node.id, node]));
  const viewportGroup = createSvgElement("g", {
    class: "graph-viewport",
    transform: graphTransformAttribute(),
  });
  graphViewportElement = viewportGroup;
  const edgeGroup = createSvgElement("g", { class: "edges" });
  const nodeGroup = createSvgElement("g", { class: "nodes" });
  viewportGroup.append(edgeGroup, nodeGroup);
  svg.append(viewportGroup);

  for (const edge of edges) {
    const source = renderNodeById.get(edge.source.id) || edge.source;
    const target = renderNodeById.get(edge.target.id) || edge.target;
    const selectedNeighborhood = selectedName
      && (edge.source.repo?.name === selectedName || edge.target.repo?.name === selectedName);
    if (edge.type === "secondary" && !showSecondaryEdges && !selectedNeighborhood) continue;
    const line = createSvgElement("line", {
      class: `edge ${edge.type} ${selectedNeighborhood ? "selected-neighborhood" : ""}`,
      x1: source.x,
      y1: source.y,
      x2: target.x,
      y2: target.y,
    });
    edgeGroup.append(line);
    graphEdgeElements.push({
      element: line,
      sourceId: edge.source.id,
      targetId: edge.target.id,
      type: edge.type,
    });
  }

  for (const node of renderNodes) {
    const group = createSvgElement("g", {
      class: `node ${node.type} ${selectedRepo?.name === node.repo?.name ? "selected" : ""}`,
      transform: `translate(${node.x} ${node.y})`,
      tabindex: "0",
      role: "button",
      "aria-label": node.type === "repo" ? `Inspect ${node.repo.name}` : `${node.label} cluster`,
    });
    group.style.color = node.color;

    group.append(createSvgElement("circle", {
      r: node.r,
      fill: node.type === "cluster" ? "rgba(10, 15, 21, 0.92)" : node.color,
    }));

    const shouldShowClusterLabel = node.type === "cluster" && !(compactViewport && visibleRepos.length > 35);
    const shouldShowRepoLabel = node.type === "repo" && (showRepoLabels || selectedRepo?.name === node.repo?.name);

    if (shouldShowClusterLabel || shouldShowRepoLabel) {
      const compactClusterLabel = compactViewport && node.type === "cluster";
      const clusterLabelOffsetY = node.type === "cluster" && node.y > (svg.clientHeight || 560) * 0.62
        ? -node.r - 12
        : node.r + 18;
      const label = createSvgElement("text", {
        x: node.type === "cluster" ? 0 : 10,
        y: compactClusterLabel ? node.r + 17 : node.type === "cluster" ? clusterLabelOffsetY : 4,
        "text-anchor": node.type === "cluster" ? "middle" : "start",
      });
      label.textContent = node.type === "cluster" ? `${node.label} (${node.count})` : node.label;
      group.append(label);
    }

    group.addEventListener("pointerdown", (event) => startDrag(event, node, group));
    group.addEventListener("click", (event) => {
      if (performance.now() < suppressNodeClickUntil) {
        event.preventDefault();
        return;
      }
      if (node.type === "repo") selectRepo(node.repo);
      if (node.type === "cluster") {
        activeCluster = node.cluster;
        graphMode = "all";
        render();
      }
    });
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && node.type === "repo") {
        selectRepo(node.repo);
        window.open(node.repo.html_url, "_blank", "noreferrer");
      }
    });

    nodeGroup.append(group);
    graphNodeElements.set(node.id, group);
  }
}

function scheduleGraphRender() {
  if (graphRenderRequest) return;
  if (motionPaintRequest) {
    window.cancelAnimationFrame(motionPaintRequest);
    motionPaintRequest = null;
  }
  if (transformPaintRequest) {
    window.cancelAnimationFrame(transformPaintRequest);
    transformPaintRequest = null;
  }
  graphRenderRequest = window.requestAnimationFrame(() => {
    graphRenderRequest = null;
    renderGraph();
  });
}

function paintGraphMotion() {
  if (!graphNodeElements.size) return;

  for (const [id, element] of graphNodeElements) {
    const node = physicsNodes.get(id);
    if (node) element.setAttribute("transform", `translate(${node.x} ${node.y})`);
  }

  const skipSecondaryDuringDenseTouch = isCompactViewport()
    && graphMode === "all"
    && graphInteractionActive();

  for (const edgeRef of graphEdgeElements) {
    if (skipSecondaryDuringDenseTouch && edgeRef.type === "secondary") continue;
    const source = physicsNodes.get(edgeRef.sourceId);
    const target = physicsNodes.get(edgeRef.targetId);
    if (!source || !target) continue;
    edgeRef.element.setAttribute("x1", source.x);
    edgeRef.element.setAttribute("y1", source.y);
    edgeRef.element.setAttribute("x2", target.x);
    edgeRef.element.setAttribute("y2", target.y);
  }
}

function scheduleMotionPaint() {
  if (motionPaintRequest || graphRenderRequest) return;
  motionPaintRequest = window.requestAnimationFrame(() => {
    motionPaintRequest = null;
    paintGraphMotion();
  });
}

function paintGraphTransform() {
  if (!graphViewportElement) return;
  graphViewportElement.setAttribute("transform", graphTransformAttribute());
}

function scheduleTransformPaint() {
  if (transformPaintRequest || graphRenderRequest) return;
  transformPaintRequest = window.requestAnimationFrame(() => {
    transformPaintRequest = null;
    paintGraphTransform();
  });
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function stopMomentum() {
  if (!dragTarget) return;
  const node = physicsNodes.get(dragTarget.nodeId);
  if (node) node.dragging = false;
  dragTarget.group?.classList.remove("dragging");
  svg.classList.remove("is-dragging");
  dragTarget = null;
  window.removeEventListener("pointermove", dragMove);
}

function startDrag(event, node, group) {
  event.preventDefault();
  event.stopPropagation();
  stopMomentum();
  clearGraphGesture();
  try {
    group.setPointerCapture(event.pointerId);
  } catch {
    // Synthetic QA events do not always create an active pointer capture target.
  }
  const physicsNode = physicsNodes.get(node.id);
  if (!physicsNode) return;
  const point = graphWorldPointFromEvent(event);
  physicsNode.dragging = true;
  physicsNode.vx = 0;
  physicsNode.vy = 0;

  dragTarget = {
    nodeId: node.id,
    nodeType: node.type,
    group,
    pointerOffset: {
      x: physicsNode.x - point.x,
      y: physicsNode.y - point.y,
    },
    lastPoint: point,
    lastPosition: { x: physicsNode.x, y: physicsNode.y },
    lastTime: performance.now(),
    velocity: { x: 0, y: 0 },
    moved: false,
  };
  group.classList.add("dragging");
  svg.classList.add("is-dragging");

  window.addEventListener("pointermove", dragMove);
  window.addEventListener("pointerup", endDrag, { once: true });
  window.addEventListener("pointercancel", endDrag, { once: true });
}

function dragMove(event) {
  if (!dragTarget) return;
  event.preventDefault();
  const node = physicsNodes.get(dragTarget.nodeId);
  if (!node) return;
  const now = performance.now();
  const elapsed = Math.max(8, now - dragTarget.lastTime);
  const point = graphWorldPointFromEvent(event);
  const next = clampNodePoint(node, {
    x: point.x + dragTarget.pointerOffset.x,
    y: point.y + dragTarget.pointerOffset.y,
  });
  const movement = Math.hypot(next.x - dragTarget.lastPosition.x, next.y - dragTarget.lastPosition.y);

  if (movement > 0.5) {
    dragTarget.moved = true;
    suppressNodeClickUntil = now + 320;
  }

  node.vx = clamp(((next.x - dragTarget.lastPosition.x) / elapsed) * FRAME_MS, -16, 16);
  node.vy = clamp(((next.y - dragTarget.lastPosition.y) / elapsed) * FRAME_MS, -16, 16);
  node.x = next.x;
  node.y = next.y;
  dragTarget.velocity = { x: node.vx, y: node.vy };
  dragTarget.lastPoint = point;
  dragTarget.lastPosition = next;
  dragTarget.lastTime = now;
  scheduleMotionPaint();
}

function endDrag() {
  if (!dragTarget) return;
  const node = physicsNodes.get(dragTarget.nodeId);
  if (node) {
    node.dragging = false;
    node.vx = clamp(dragTarget.velocity.x, -14, 14);
    node.vy = clamp(dragTarget.velocity.y, -14, 14);
  }
  if (dragTarget.moved) suppressNodeClickUntil = performance.now() + 360;
  dragTarget.group.classList.remove("dragging");
  svg.classList.remove("is-dragging");
  dragTarget = null;
  window.removeEventListener("pointermove", dragMove);
  startAmbientMotionLoop();
}

function clearGraphGesture() {
  graphPointers = new Map();
  graphGesture = null;
  window.removeEventListener("pointermove", graphPointerMove);
  window.removeEventListener("pointerup", graphPointerEnd);
  window.removeEventListener("pointercancel", graphPointerEnd);
}

function startPinchGesture() {
  const points = [...graphPointers.values()];
  if (points.length < 2) return;
  const [first, second] = points;
  graphGesture = {
    mode: "pinch",
    initialDistance: Math.max(1, distanceBetweenPoints(first, second)),
    initialMidpoint: midpointBetweenPoints(first, second),
    startTransform: { ...graphTransform },
    moved: false,
  };
  stopMomentum();
}

function graphPointerDown(event) {
  if (event.target.closest(".node")) return;

  const point = graphPointFromEvent(event);
  graphPointers.set(event.pointerId, point);
  try {
    svg.setPointerCapture(event.pointerId);
  } catch {
    // Some synthetic browser checks do not create an active capture target.
  }

  if (graphPointers.size >= 2) {
    startPinchGesture();
  } else {
    graphGesture = {
      mode: "tap",
      pointerId: event.pointerId,
      start: point,
      last: point,
      startTransform: { ...graphTransform },
      moved: false,
    };
  }

  window.addEventListener("pointermove", graphPointerMove);
  window.addEventListener("pointerup", graphPointerEnd);
  window.addEventListener("pointercancel", graphPointerEnd);
}

function graphPointerMove(event) {
  if (!graphPointers.has(event.pointerId) || !graphGesture) return;
  const point = graphPointFromEvent(event);
  graphPointers.set(event.pointerId, point);

  if (graphPointers.size >= 2) {
    if (graphGesture.mode !== "pinch") startPinchGesture();
    const [first, second] = [...graphPointers.values()];
    const midpoint = midpointBetweenPoints(first, second);
    const distance = distanceBetweenPoints(first, second);
    const nextScale = clamp(
      graphGesture.startTransform.scale * (distance / graphGesture.initialDistance),
      MIN_GRAPH_SCALE,
      MAX_GRAPH_SCALE,
    );
    const worldX = (graphGesture.initialMidpoint.x - graphGesture.startTransform.x) / graphGesture.startTransform.scale;
    const worldY = (graphGesture.initialMidpoint.y - graphGesture.startTransform.y) / graphGesture.startTransform.scale;
    graphTransform = normalizedGraphTransform({
      scale: nextScale,
      x: midpoint.x - worldX * nextScale,
      y: midpoint.y - worldY * nextScale,
    });
    graphGesture.moved = true;
    scheduleTransformPaint();
    return;
  }

  if (graphGesture.mode === "tap") {
    const dx = point.x - graphGesture.start.x;
    const dy = point.y - graphGesture.start.y;
    if (Math.hypot(dx, dy) > 6 && graphTransform.scale > 1.02) {
      graphGesture.mode = "pan";
      graphGesture.moved = true;
    }
  }

  if (graphGesture.mode === "pan") {
    const dx = point.x - graphGesture.start.x;
    const dy = point.y - graphGesture.start.y;
    graphTransform = normalizedGraphTransform({
      scale: graphGesture.startTransform.scale,
      x: graphGesture.startTransform.x + dx,
      y: graphGesture.startTransform.y + dy,
    });
    scheduleTransformPaint();
  }
}

function graphPointerEnd(event) {
  const endedPoint = graphPointers.get(event.pointerId);
  graphPointers.delete(event.pointerId);

  if (graphGesture?.mode === "pinch" && graphPointers.size === 1) {
    const [remaining] = [...graphPointers.values()];
    graphGesture = {
      mode: graphTransform.scale > 1.02 ? "pan" : "tap",
      pointerId: [...graphPointers.keys()][0],
      start: remaining,
      last: remaining,
      startTransform: { ...graphTransform },
      moved: true,
    };
    return;
  }

  if (graphPointers.size > 0) return;

  const wasTap = graphGesture?.mode === "tap"
    && !graphGesture.moved
    && endedPoint
    && distanceBetweenPoints(endedPoint, graphGesture.start) < 8;

  clearGraphGesture();

  if (wasTap && activeCluster !== "all") {
    returnToDefaultGraphView();
  }
}

function graphBackgroundClick(event) {
  if (event.target.closest(".node")) return;
  if (activeCluster !== "all") returnToDefaultGraphView();
}

function renderTable() {
  const visible = getVisibleReposSorted();
  const shown = showAllRows ? visible : visible.slice(0, RECENT_TABLE_LIMIT);
  const shownCount = Math.min(shown.length, visible.length);
  const tableMode = listExpanded
    ? showAllRows ? `Showing all ${visible.length} matching repositories.` : `Showing the ${shownCount} most recently updated of ${visible.length} matching repositories.`
    : `Table collapsed. Open it for the ${Math.min(RECENT_TABLE_LIMIT, visible.length)} most recently updated matching repositories.`;

  listPanel.classList.toggle("is-collapsed", !listExpanded);
  tableWrap.hidden = !listExpanded;
  listSummary.textContent = tableMode;
  toggleListButton.setAttribute("aria-expanded", String(listExpanded));
  toggleListButton.textContent = listExpanded ? "Collapse table" : `Show recent ${Math.min(RECENT_TABLE_LIMIT, visible.length)}`;
  showAllButton.hidden = !listExpanded || visible.length <= RECENT_TABLE_LIMIT;
  showAllButton.textContent = showAllRows ? `Show recent ${RECENT_TABLE_LIMIT}` : `Show all ${visible.length}`;

  const rows = shown.map((repo) => {
    const homepage = repo.homepage
      ? `<a class="table-link" href="${repo.homepage}" target="_blank" rel="noreferrer">Demo</a>`
      : "";
    return `
      <tr>
        <td data-label="Repository">
          <strong>${repo.name}</strong>
          <span>${shortDescription(repo)}</span>
        </td>
        <td data-label="Cluster">${repo.cluster_label}</td>
        <td data-label="Language">${repo.language}</td>
        <td data-label="Updated">${formatRelative(repo.pushed_at || repo.updated_at)}</td>
        <td data-label="Links">
          <a class="table-link" href="${repo.html_url}" target="_blank" rel="noreferrer">GitHub</a>
          ${homepage}
        </td>
      </tr>
    `;
  }).join("");

  tableBody.innerHTML = rows || `<tr><td colspan="5">No repositories match the current filters.</td></tr>`;
}

function renderInspector() {
  if (!selectedRepo) {
    inspector.innerHTML = `<p class="empty-state">Select a repository node to inspect public metadata.</p>`;
    return;
  }

  const repo = selectedRepo;
  const topicTags = [
    repo.cluster_label,
    repo.language,
    ...(repo.topics || []),
    ...(repo.tags || []),
  ].filter(Boolean).slice(0, 12);

  inspector.innerHTML = `
    <div class="repo-title-row">
      <span class="repo-color" style="color: ${repo.cluster_color}; background: ${repo.cluster_color};"></span>
      <div>
        <h3>${repo.name}</h3>
        <p>${repo.full_name}</p>
      </div>
    </div>
    <p>${shortDescription(repo)}</p>
    <div class="repo-meta-grid">
      <div><span>Cluster</span><span>${repo.cluster_label}</span></div>
      <div><span>Language</span><span>${repo.language}</span></div>
      <div><span>Updated</span><span>${formatRelative(repo.pushed_at || repo.updated_at)}</span></div>
      <div><span>Stars</span><span>${repo.stargazers_count}</span></div>
      <div><span>Forks</span><span>${repo.forks_count}</span></div>
      <div><span>Default branch</span><span>${repo.default_branch || "Unknown"}</span></div>
    </div>
    <div class="tag-list">
      ${topicTags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
    </div>
    <div class="action-list">
      <a href="${repo.html_url}" target="_blank" rel="noreferrer">Open on GitHub</a>
      ${repo.homepage ? `<a href="${repo.homepage}" target="_blank" rel="noreferrer">Open homepage or app</a>` : ""}
    </div>
    ${repo.cluster === "s26-airp" ? `
      <p class="s26-callout">
        S26 AIRP repository: AI-assisted research software prototype. Scientific and domain-specific
        content is provisional and not presented as validated scientific claims.
      </p>
    ` : ""}
  `;
}

function selectRepo(repo) {
  selectedRepo = repo;
  renderGraph();
  renderTable();
  renderInspector();
  inspector.focus({ preventScroll: true });
}

function render() {
  renderFilters();
  updateMeta();
  renderGraph();
  renderTable();
  renderInspector();
}

async function loadSnapshot() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`Could not load ${DATA_URL}`);
  snapshot = await response.json();
  repos = (snapshot.repos || []).map(normalizeRepo);
  selectedRepo = null;
  graphMode = defaultGraphMode();
  resetGraphMotion();
  render();
  startAmbientMotionLoop();
}

async function fetchPublicRepos() {
  const allRepos = [];
  let page = 1;

  while (true) {
    const response = await fetch(`${API_ROOT}?sort=updated&direction=desc&per_page=100&page=${page}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!response.ok) throw new Error(`GitHub public API returned ${response.status}`);
    const batch = await response.json();
    allRepos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }

  const included = allRepos.filter((repo) => !shouldExclude(repo)).map(normalizeRepo);
  snapshot = {
    generated_at: new Date().toISOString(),
    owner: "ryanjosephkamp",
    source: {
      endpoint: API_ROOT,
      authentication: "none",
      repo_count_raw: allRepos.length,
      repo_count_included: included.length,
    },
    repos: included,
  };
  repos = included;
  selectedRepo = null;
  graphMode = defaultGraphMode();
  nodePositions = new Map();
  resetGraphMotion();
  render();
  startAmbientMotionLoop();
}

searchInput.addEventListener("input", (event) => {
  query = event.target.value;
  if (query.trim()) {
    graphMode = "all";
    resetGraphTransform();
    resetGraphMotion();
  }
  render();
});

densityInput.addEventListener("input", () => {
  renderGraph();
});

refreshButton.addEventListener("click", async () => {
  refreshButton.disabled = true;
  refreshStatus.textContent = "Requesting public GitHub API without a token...";
  try {
    await fetchPublicRepos();
    refreshStatus.textContent = "Live public API refresh loaded for this browser session.";
  } catch (error) {
    refreshStatus.textContent = `Refresh failed gracefully. Static snapshot remains available. ${error.message}`;
  } finally {
    refreshButton.disabled = false;
  }
});

toggleListButton.addEventListener("click", () => {
  listExpanded = !listExpanded;
  if (!listExpanded) showAllRows = false;
  renderTable();
});

showAllButton.addEventListener("click", () => {
  showAllRows = !showAllRows;
  renderTable();
});

clusterViewButton.addEventListener("click", () => {
  stopMomentum();
  clearGraphGesture();
  graphMode = "clusters";
  activeCluster = "all";
  query = "";
  selectedRepo = null;
  nodePositions = new Map();
  resetGraphMotion();
  resetGraphTransform();
  searchInput.value = "";
  render();
});

allNodesButton.addEventListener("click", () => {
  stopMomentum();
  clearGraphGesture();
  graphMode = "all";
  resetGraphMotion();
  resetGraphTransform();
  render();
});

resetButton.addEventListener("click", () => {
  stopMomentum();
  clearGraphGesture();
  activeCluster = "all";
  query = "";
  selectedRepo = null;
  nodePositions = new Map();
  resetGraphMotion();
  resetGraphTransform();
  graphMode = defaultGraphMode();
  listExpanded = false;
  showAllRows = false;
  searchInput.value = "";
  densityInput.value = "1.12";
  render();
});

clearSelectionButton.addEventListener("click", () => {
  selectedRepo = null;
  render();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== searchInput) {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape") {
    stopMomentum();
    clearGraphGesture();
    activeCluster = "all";
    query = "";
    searchInput.value = "";
    selectedRepo = null;
    nodePositions = new Map();
    resetGraphMotion();
    resetGraphTransform();
    graphMode = defaultGraphMode();
    render();
  }
  if (event.key === "Enter" && selectedRepo && document.activeElement === document.body) {
    window.open(selectedRepo.html_url, "_blank", "noreferrer");
  }
});

svg.addEventListener("pointerdown", graphPointerDown);
svg.addEventListener("click", graphBackgroundClick);

window.addEventListener("resize", () => {
  graphTransform = normalizedGraphTransform(graphTransform);
  renderGraph();
});

loadSnapshot().catch((error) => {
  refreshStatus.textContent = `Snapshot load failed: ${error.message}`;
  console.error(error);
});
