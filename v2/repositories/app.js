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
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const MAX_PASSIVE_LINKS = 180;
const MAX_FOCUS_LINKS = 18;
const MAX_TRACE_LINKS = 10;
const MAX_ECHO_NODES = 7;
const MAX_CURRENT_LINKS = 6;
const LINK_CURRENT_BEADS = 2;
const MAX_CLUSTER_FIELD_NODES = 9;
const MAX_GLINT_NEIGHBORS = 4;
const MAX_RESEARCH_LENS_NEIGHBORS = 4;
const MAX_AMBIENT_LINKS = 3;
const GRAPH_TRANSITION_MS = 380;
const LINK_TRACE_MS = 390;
const LINK_TRACE_STAGGER = 0.032;
const FOCUS_EFFECT_MS = 1450;
const FOCUS_EFFECT_STAGGER = 0.024;
const NEIGHBOR_ECHO_MS = 980;
const NEIGHBOR_ECHO_STAGGER = 0.045;
const LINK_CURRENT_MS = 1050;
const LINK_CURRENT_STAGGER = 0.048;
const CLUSTER_FIELD_MS = 920;
const NODE_GLINT_MS = 820;
const NODE_GLINT_STAGGER = 0.055;
const RESEARCH_LENS_MS = 1120;
const RESEARCH_LENS_STAGGER = 0.042;
const AMBIENT_CURRENT_MS = 1120;
const AMBIENT_CURRENT_STAGGER = 0.074;
const AMBIENT_CURRENT_MIN_DELAY = 3300;
const AMBIENT_CURRENT_MAX_DELAY = 5200;
const AMBIENT_IDLE_GRACE_MS = 900;
const ROTATION_SENSITIVITY = {
  yaw: 0.008,
  pitch: 0.0065,
};
const CAMERA3D_DEFAULT = {
  yaw: -0.35,
  pitch: 0.18,
  distance: 2.25,
  zoom: 1,
};
const VECTOR_FIELD_WEIGHTS = {
  name: 3,
  description: 1,
  language: 1.6,
  tags: 2.2,
  topics: 2.4,
  cluster: 1.2,
};
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
const RESEARCH_AXES = [
  {
    id: "agentic-ai-systems",
    terms: [
      "agentic",
      "agent",
      "agents",
      "autonomous",
      "automation",
      "workflow",
      "workflows",
      "orchestration",
      "planner",
      "planning",
      "assistant",
      "tool",
      "tools",
    ],
  },
  {
    id: "explainable-ai",
    terms: [
      "explainable",
      "explanation",
      "explanations",
      "interpretability",
      "interpretable",
      "transparency",
      "audit",
      "inspection",
      "trace",
      "traces",
      "rationale",
      "attribution",
    ],
  },
  {
    id: "generative-models-llms",
    terms: [
      "generative",
      "generation",
      "llm",
      "llms",
      "language",
      "model",
      "models",
      "transformer",
      "diffusion",
      "prompt",
      "prompts",
      "chat",
      "text",
    ],
  },
  {
    id: "benchmarking-evaluation",
    terms: [
      "benchmark",
      "benchmarks",
      "benchmarking",
      "evaluation",
      "evaluations",
      "eval",
      "metric",
      "metrics",
      "score",
      "scoring",
      "compare",
      "comparison",
      "test",
      "testing",
      "validation",
    ],
  },
  {
    id: "computational-biology",
    terms: [
      "biology",
      "bio",
      "bioinformatics",
      "protein",
      "proteins",
      "gene",
      "genes",
      "genomics",
      "sequence",
      "molecule",
      "molecular",
      "drug",
      "cell",
      "binding",
    ],
  },
  {
    id: "linguistics",
    terms: [
      "linguistics",
      "language",
      "languages",
      "syntax",
      "semantic",
      "semantics",
      "corpus",
      "text",
      "nlp",
      "token",
      "tokens",
      "grammar",
    ],
  },
  {
    id: "app-game-development",
    terms: [
      "app",
      "apps",
      "game",
      "games",
      "web",
      "ui",
      "interface",
      "frontend",
      "site",
      "browser",
      "canvas",
      "mobile",
      "portfolio",
      "brrrdle",
    ],
  },
];

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
  activePointers: new Map(),
  pinch: null,
  touchPinch: null,
  moved: false,
  listLimit: DEFAULT_LIST_LIMIT,
  listSort: "updated",
  graphMode: "2d",
  transition: null,
  linkTrace: null,
  focusEffect: null,
  neighborhoodEcho: null,
  linkCurrent: null,
  clusterField: null,
  nodeGlint: null,
  researchLens: null,
  ambientCurrent: null,
  ambientTimer: 0,
  searchFocused: false,
  camera3d: { ...CAMERA3D_DEFAULT },
  reducedMotion: reducedMotionQuery.matches,
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
  graphModeControls: document.querySelector("#graph-mode"),
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
  renderGraphModeControls();
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

function addWeightedTerms(weights, value, weight, prefix = "") {
  const values = Array.isArray(value) ? value : [value];
  for (const item of values) {
    for (const token of tokenize(item)) {
      const key = prefix ? `${prefix}:${token}` : token;
      weights.set(key, (weights.get(key) || 0) + weight);
    }
  }
}

function weightedRepoTerms(repo) {
  const weights = new Map();
  addWeightedTerms(weights, repo.name, VECTOR_FIELD_WEIGHTS.name);
  addWeightedTerms(weights, repo.description, VECTOR_FIELD_WEIGHTS.description);
  addWeightedTerms(weights, repo.language, VECTOR_FIELD_WEIGHTS.language, "language");
  addWeightedTerms(weights, repo.tags || [], VECTOR_FIELD_WEIGHTS.tags);
  addWeightedTerms(weights, repo.topics || [], VECTOR_FIELD_WEIGHTS.topics);
  addWeightedTerms(weights, repo.cluster_label, VECTOR_FIELD_WEIGHTS.cluster, "cluster");
  return weights;
}

function normalizeVector(weights) {
  const magnitude = Math.sqrt([...weights.values()].reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) return weights;
  for (const [key, value] of weights) {
    weights.set(key, value / magnitude);
  }
  return weights;
}

function buildVectorModel(repos) {
  const documents = repos.map((repo) => ({ repo, weights: weightedRepoTerms(repo) }));
  const documentFrequency = new Map();
  for (const document of documents) {
    for (const key of document.weights.keys()) {
      documentFrequency.set(key, (documentFrequency.get(key) || 0) + 1);
    }
  }

  const vectors = new Map();
  for (const document of documents) {
    const vector = new Map();
    for (const [key, value] of document.weights) {
      const idf = Math.log((1 + repos.length) / (1 + (documentFrequency.get(key) || 0))) + 1;
      vector.set(key, value * idf);
    }
    vectors.set(document.repo.id, normalizeVector(vector));
  }
  return vectors;
}

function researchAxisVectors() {
  return RESEARCH_AXES.map((axis, index) => {
    const weights = new Map();
    addWeightedTerms(weights, axis.terms, 1.7);
    addWeightedTerms(weights, axis.id, 1.1);
    return {
      ...axis,
      index,
      termSet: repoTermSet([axis.id, ...(axis.terms || [])]),
      vector: normalizeVector(weights),
    };
  });
}

function vectorDot(first, second) {
  if (!first || !second) return 0;
  const [small, large] = first.size <= second.size ? [first, second] : [second, first];
  let dot = 0;
  for (const [key, value] of small) {
    dot += value * (large.get(key) || 0);
  }
  return dot;
}

function vectorAxis(vector, salt) {
  if (!vector?.size) return 0;
  let sum = 0;
  let weight = 0;
  for (const [key, value] of vector) {
    const axis = hashValue(`${salt}:${key}`) * 2 - 1;
    sum += axis * value;
    weight += Math.abs(value);
  }
  return weight ? Math.max(-1, Math.min(1, sum / weight)) : 0;
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

function researchAxisProfile(vector, tokens, axes) {
  const entries = axes
    .map((axis) => {
      const lexicalOverlap = sharedCount(tokens, axis.termSet, 5);
      const score = clamp(vectorDot(vector, axis.vector) * 2.1 + lexicalOverlap * 0.075, 0, 1);
      return { axis, score };
    })
    .sort((a, b) => b.score - a.score || a.axis.index - b.axis.index);
  const scores = new Map(entries.map((entry) => [entry.axis.id, entry.score]));
  const top = entries[0] || null;
  return {
    scores,
    top,
    strength: top ? clamp((top.score - 0.045) / 0.32, 0, 1) : 0,
  };
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
  score += Math.min(1.05, vectorDot(first.vector, second.vector) * 1.25);
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
      const distance = graphDistance(node, focusedNode);
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

function clusterFieldCandidates(focusedNode, visible) {
  if (!focusedNode) return [];
  const nearestSameCluster = visible
    .filter((node) => node !== focusedNode && node.repo.cluster === focusedNode.repo.cluster)
    .map((node) => {
      const distance = graphDistance(node, focusedNode);
      const affinity = semanticAffinity(focusedNode, node);
      const distanceWeight = Math.max(0, 1 - distance / 0.42);
      return {
        node,
        distance,
        affinity,
        score: affinity * 1.1 + distanceWeight,
      };
    })
    .filter(({ distance, affinity }) => distance <= 0.4 || affinity >= 1.7)
    .sort((a, b) => b.score - a.score || a.distance - b.distance);

  return nearestSameCluster.slice(0, MAX_CLUSTER_FIELD_NODES);
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function graphDistance(first, second) {
  if (modeMix() > 0.55) {
    return Math.hypot(first.x3 - second.x3, first.y3 - second.y3, (first.z3 - second.z3) * 0.82);
  }
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function relaxNodes(nodes, dimensions = "2d") {
  const is3d = dimensions === "3d";
  const keys = is3d ? ["x3", "y3", "z3"] : ["x2", "y2"];
  const baseKeys = is3d ? ["baseX3", "baseY3", "baseZ3"] : ["baseX2", "baseY2"];
  const minDistance = is3d ? 0.034 : 0.027;
  const iterations = is3d ? 34 : 42;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const first = nodes[i];
        const second = nodes[j];
        const dx = second[keys[0]] - first[keys[0]];
        const dy = second[keys[1]] - first[keys[1]];
        const dz = is3d ? second[keys[2]] - first[keys[2]] : 0;
        const distance = Math.max(0.0001, Math.hypot(dx, dy, dz));
        if (distance >= minDistance) continue;
        const push = ((minDistance - distance) / distance) * 0.5;
        first[keys[0]] -= dx * push;
        second[keys[0]] += dx * push;
        first[keys[1]] -= dy * push;
        second[keys[1]] += dy * push;
        if (is3d) {
          first[keys[2]] -= dz * push;
          second[keys[2]] += dz * push;
        }
      }
    }

    for (const node of nodes) {
      node[keys[0]] += (node[baseKeys[0]] - node[keys[0]]) * 0.018;
      node[keys[1]] += (node[baseKeys[1]] - node[keys[1]]) * 0.018;
      node[keys[0]] = clamp(node[keys[0]], -0.62, 0.62);
      node[keys[1]] = clamp(node[keys[1]], -0.48, 0.48);
      if (is3d) {
        node[keys[2]] += (node[baseKeys[2]] - node[keys[2]]) * 0.018;
        node[keys[2]] = clamp(node[keys[2]], -0.38, 0.38);
      }
    }
  }
}

function makeNodes(repos, clusters) {
  const clusterIndex = new Map(clusters.map((cluster, index) => [cluster.id, index]));
  const vectors = buildVectorModel(repos);
  const researchAxes = researchAxisVectors();
  const clusterCounts = new Map();
  for (const repo of repos) {
    clusterCounts.set(repo.cluster, (clusterCounts.get(repo.cluster) || 0) + 1);
  }
  const clusterSeen = new Map();
  const nodes = repos.map((repo) => {
    const cluster = clusterIndex.get(repo.cluster) ?? 0;
    const anchor = clusterAnchor(clusters[cluster] || { id: "other" }, cluster);
    const count = clusterCounts.get(repo.cluster) || 1;
    const rank = clusterSeen.get(repo.cluster) || 0;
    clusterSeen.set(repo.cluster, rank + 1);
    const semanticTokens = repoSemanticTokens(repo);
    const topicSet = repoTermSet(repo.topics || []);
    const tagSet = repoTermSet(repo.tags || []);
    const affinityKey = primaryAffinityKey(repo, semanticTokens);
    const vector = vectors.get(repo.id) || new Map();
    const researchProfile = researchAxisProfile(vector, semanticTokens, researchAxes);
    const axisX = vectorAxis(vector, "x");
    const axisY = vectorAxis(vector, "y");
    const axisZ = vectorAxis(vector, "z");
    const local = hashValue(`${repo.name}:${repo.created_at}`);
    const depth = hashValue(`${repo.id}:${repo.name}:depth`);
    const keyAngle = hashValue(`${repo.cluster}:${affinityKey}`) * Math.PI * 2;
    const rankAngle = rank * 2.399963 + local * 0.35;
    const angle = rankAngle * 0.54 + keyAngle * 0.22 + Math.atan2(axisY, axisX) * 0.24;
    const spread = repo.cluster === "s26-airp" ? 0.33 : 0.17;
    const semanticSpread = 0.07 + Math.min(0.12, Math.hypot(axisX, axisY) * 0.16);
    const radius =
      Math.sqrt((rank + 0.5) / count) *
      spread *
      (0.9 + hashValue(`${repo.cluster}:${affinityKey}:radius`) * 0.18);
    const x = anchor.x + Math.cos(angle) * radius + axisX * semanticSpread;
    const y = anchor.y + Math.sin(angle) * radius * 0.76 + axisY * semanticSpread * 0.72;
    const z = axisZ * 0.3 + (depth - 0.5) * 0.12;
    return {
      repo,
      cluster,
      anchorX: x,
      anchorY: y,
      baseX2: x,
      baseY2: y,
      baseX3: x + axisX * 0.08,
      baseY3: y + axisY * 0.05,
      baseZ3: z,
      x,
      y,
      x2: x,
      y2: y,
      x3: x + axisX * 0.08,
      y3: y + axisY * 0.05,
      z3: z,
      radius: 2.05 + depth * 1.05 + (repo.stargazers_count > 0 ? 0.65 : 0),
      depth,
      vector,
      semanticTokens,
      topicSet,
      tagSet,
      affinityKey,
      researchProfile,
      visible: true,
    };
  });
  relaxNodes(nodes, "2d");
  relaxNodes(nodes, "3d");
  for (const node of nodes) {
    node.anchorX = node.x2;
    node.anchorY = node.y2;
    node.x = node.x2;
    node.y = node.y2;
  }
  return nodes;
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
  pauseAmbientCurrent();
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
  scheduleAmbientCurrent(AMBIENT_IDLE_GRACE_MS);
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
    ? state.graphMode === "3d"
      ? `${count} repositories visible. Drag to rotate, or select one to view details.`
      : `${count} repositories visible. Select one to view details.`
    : "No repositories match the current search.";
}

function easeOutQuart(value) {
  return 1 - Math.pow(1 - value, 4);
}

function modeMix() {
  if (!state.transition) return state.graphMode === "3d" ? 1 : 0;
  const elapsed = performance.now() - state.transition.startedAt;
  const raw = clamp(elapsed / state.transition.duration, 0, 1);
  const eased = easeOutQuart(raw);
  if (raw >= 1) {
    state.transition = null;
    return state.graphMode === "3d" ? 1 : 0;
  }
  return state.transition.to === "3d" ? eased : 1 - eased;
}

function resetCamera3d() {
  state.camera3d = { ...CAMERA3D_DEFAULT };
}

function renderGraphModeControls() {
  for (const button of els.graphModeControls?.querySelectorAll("[data-graph-mode]") || []) {
    button.setAttribute("aria-pressed", String(button.dataset.graphMode === state.graphMode));
  }
  els.canvas.dataset.graphMode = state.graphMode;
}

function setGraphMode(mode) {
  if (!["2d", "3d"].includes(mode) || mode === state.graphMode) return;
  pauseAmbientCurrent();
  const from = state.graphMode;
  state.graphMode = mode;
  if (state.reducedMotion) {
    state.transition = null;
  } else {
    state.transition = {
      from,
      to: mode,
      startedAt: performance.now(),
      duration: GRAPH_TRANSITION_MS,
    };
  }
  renderGraphModeControls();
  updateHint();
  startLinkTrace(state.selected || state.hovered);
  startResearchLens(state.selected);
  requestDraw();
  window.setTimeout(
    () => scheduleAmbientCurrent(AMBIENT_IDLE_GRACE_MS),
    state.reducedMotion ? 0 : GRAPH_TRANSITION_MS + 40,
  );
}

function worldPointToScreen(point) {
  const rect = els.wrap.getBoundingClientRect();
  const base = Math.min(rect.width, rect.height) * 0.68 * state.scale;
  return {
    x: rect.width / 2 + state.panX + point.x * base,
    y: rect.height / 2 + state.panY + point.y * base,
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

function project3dNode(node) {
  const rect = els.wrap.getBoundingClientRect();
  const { yaw, pitch, distance, zoom } = state.camera3d;
  const base = Math.min(rect.width, rect.height) * 0.66 * state.scale * zoom;
  const yawCos = Math.cos(yaw);
  const yawSin = Math.sin(yaw);
  const pitchCos = Math.cos(pitch);
  const pitchSin = Math.sin(pitch);
  const xYaw = node.x3 * yawCos - node.z3 * yawSin;
  const zYaw = node.x3 * yawSin + node.z3 * yawCos;
  const yPitch = node.y3 * pitchCos - zYaw * pitchSin;
  const zPitch = node.y3 * pitchSin + zYaw * pitchCos;
  const perspective = clamp(distance / Math.max(0.6, distance - zPitch), 0.72, 1.42);
  return {
    x: rect.width / 2 + state.panX + xYaw * base * perspective,
    y: rect.height / 2 + state.panY + yPitch * base * perspective,
    depth: clamp((zPitch + 0.5) / 1.1, 0, 1),
    scale: perspective * Math.sqrt(zoom),
  };
}

function nodeToScreen(node) {
  const twoD = worldPointToScreen(node);
  const threeD = project3dNode(node);
  const mix = modeMix();
  return {
    x: twoD.x + (threeD.x - twoD.x) * mix,
    y: twoD.y + (threeD.y - twoD.y) * mix,
    depth: 0.5 + (threeD.depth - 0.5) * mix,
    scale: 1 + (threeD.scale - 1) * mix,
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

function nodeDepthDusting(screen, mix = modeMix()) {
  if (mix <= 0.01) return { alpha: 1, radius: 1, ring: 1 };
  const depth = clamp(screen.depth, 0, 1);
  const far = 1 - depth;
  return {
    alpha: 1 - mix * far * 0.24,
    radius: 1 + mix * (depth - 0.5) * 0.22,
    ring: 1 + mix * (depth - 0.5) * 0.14,
  };
}

function lineDepthDusting(first, second, mix = modeMix()) {
  if (mix <= 0.01) return { alpha: 1, width: 1 };
  const averageDepth = clamp((first.depth + second.depth) / 2, 0, 1);
  const depthGap = Math.abs(first.depth - second.depth);
  const far = 1 - averageDepth;
  return {
    alpha: 1 - mix * Math.min(0.38, far * 0.34 + depthGap * 0.08),
    width: 1 + mix * (averageDepth - 0.5) * 0.12,
  };
}

function requestDraw() {
  if (state.frame) return;
  state.frame = requestAnimationFrame(() => {
    state.frame = 0;
    draw();
  });
}

function isPinching() {
  return Boolean(state.pinch || state.touchPinch || state.activePointers.size >= 2);
}

function clearAmbientTimer() {
  if (!state.ambientTimer) return;
  window.clearTimeout(state.ambientTimer);
  state.ambientTimer = 0;
}

function clearAmbientCurrent() {
  state.ambientCurrent = null;
}

function pauseAmbientCurrent() {
  clearAmbientTimer();
  clearAmbientCurrent();
}

function ambientDelay() {
  return (
    AMBIENT_CURRENT_MIN_DELAY +
    Math.random() * (AMBIENT_CURRENT_MAX_DELAY - AMBIENT_CURRENT_MIN_DELAY)
  );
}

function canRunAmbientCurrent() {
  return (
    !state.reducedMotion &&
    !document.hidden &&
    !state.selected &&
    !state.hovered &&
    !state.dragging &&
    !state.transition &&
    !state.searchFocused &&
    !isPinching()
  );
}

function scheduleAmbientCurrent(delay = ambientDelay()) {
  clearAmbientTimer();
  if (!canRunAmbientCurrent() || !state.nodes.some((node) => node.visible)) return;
  state.ambientTimer = window.setTimeout(() => {
    state.ambientTimer = 0;
    startAmbientCurrent();
  }, delay);
}

function ambientCandidatesForSeed(seed, visible) {
  return focusLinkCandidates(seed, visible).slice(0, MAX_AMBIENT_LINKS);
}

function startAmbientCurrent() {
  if (!canRunAmbientCurrent()) return;
  const visible = state.nodes.filter((node) => node.visible);
  if (visible.length < 2) return;

  const startIndex = Math.floor(Math.random() * visible.length);
  for (let offset = 0; offset < visible.length; offset += 1) {
    const seed = visible[(startIndex + offset) % visible.length];
    const candidates = ambientCandidatesForSeed(seed, visible);
    if (!candidates.length) continue;
    state.ambientCurrent = {
      nodeId: seed.repo.id,
      candidates: candidates.map((candidate) => ({
        nodeId: candidate.node.repo.id,
        score: candidate.score,
        affinity: candidate.affinity,
        distance: candidate.distance,
      })),
      startedAt: performance.now(),
      duration: AMBIENT_CURRENT_MS,
    };
    requestDraw();
    return;
  }

  scheduleAmbientCurrent(AMBIENT_CURRENT_MAX_DELAY);
}

function clearFocusEffect() {
  state.focusEffect = null;
}

function clearNeighborhoodEcho() {
  state.neighborhoodEcho = null;
}

function clearLinkCurrent() {
  state.linkCurrent = null;
}

function clearClusterField() {
  state.clusterField = null;
}

function clearNodeGlint() {
  state.nodeGlint = null;
}

function clearResearchLens() {
  state.researchLens = null;
}

function startFocusEffect(node, options = {}) {
  if (!node || state.reducedMotion || isPinching()) {
    if (!node) clearFocusEffect();
    return;
  }
  if (state.dragging && !options.allowWhileDragging) return;
  const nodeId = node.repo.id;
  const elapsed = state.focusEffect ? performance.now() - state.focusEffect.startedAt : Infinity;
  if (state.focusEffect?.nodeId === nodeId && elapsed < 160) return;
  state.focusEffect = {
    nodeId,
    startedAt: performance.now(),
    duration: FOCUS_EFFECT_MS,
  };
}

function currentFocusEffect(focusedNode) {
  if (!focusedNode || !state.focusEffect || state.reducedMotion) {
    if (!focusedNode) clearFocusEffect();
    return null;
  }
  if (state.dragging || isPinching() || state.focusEffect.nodeId !== focusedNode.repo.id) {
    clearFocusEffect();
    return null;
  }
  const elapsed = performance.now() - state.focusEffect.startedAt;
  const raw = clamp(elapsed / state.focusEffect.duration, 0, 1);
  if (raw >= 1) {
    clearFocusEffect();
    return null;
  }
  return {
    raw,
    progress: easeOutQuart(raw),
    fade: 1 - easeOutQuart(raw),
  };
}

function startLinkTrace(node, options = {}) {
  if (!node || state.reducedMotion || isPinching()) {
    if (!node) state.linkTrace = null;
    return;
  }
  if (state.dragging && !options.allowWhileDragging) return;
  const nodeId = node.repo.id;
  const elapsed = state.linkTrace ? performance.now() - state.linkTrace.startedAt : Infinity;
  if (state.linkTrace?.nodeId === nodeId && elapsed < 120) return;
  state.linkTrace = {
    nodeId,
    startedAt: performance.now(),
    duration: LINK_TRACE_MS,
  };
  startFocusEffect(node, options);
}

function startLinkCurrent(node, options = {}) {
  if (!node || state.reducedMotion || isPinching()) {
    if (!node) clearLinkCurrent();
    return;
  }
  if (state.dragging && !options.allowWhileDragging) return;
  const nodeId = node.repo.id;
  const elapsed = state.linkCurrent ? performance.now() - state.linkCurrent.startedAt : Infinity;
  if (state.linkCurrent?.nodeId === nodeId && elapsed < 180) return;
  state.linkCurrent = {
    nodeId,
    startedAt: performance.now(),
    duration: LINK_CURRENT_MS,
  };
}

function startNeighborhoodEcho(node, options = {}) {
  if (!node || state.reducedMotion || isPinching()) {
    if (!node) clearNeighborhoodEcho();
    return;
  }
  if (state.dragging && !options.allowWhileDragging) return;
  const nodeId = node.repo.id;
  const elapsed = state.neighborhoodEcho
    ? performance.now() - state.neighborhoodEcho.startedAt
    : Infinity;
  if (state.neighborhoodEcho?.nodeId === nodeId && elapsed < 180) return;
  state.neighborhoodEcho = {
    nodeId,
    startedAt: performance.now(),
    duration: NEIGHBOR_ECHO_MS,
  };
}

function startClusterField(node, options = {}) {
  if (!node || state.reducedMotion || isPinching()) {
    if (!node) clearClusterField();
    return;
  }
  if (state.dragging && !options.allowWhileDragging) return;
  const nodeId = node.repo.id;
  const elapsed = state.clusterField ? performance.now() - state.clusterField.startedAt : Infinity;
  if (state.clusterField?.nodeId === nodeId && elapsed < 220) return;
  state.clusterField = {
    nodeId,
    startedAt: performance.now(),
    duration: CLUSTER_FIELD_MS,
  };
}

function startNodeGlint(node, options = {}) {
  if (!node || state.reducedMotion || isPinching()) {
    if (!node) clearNodeGlint();
    return;
  }
  if (state.dragging && !options.allowWhileDragging) return;
  const nodeId = node.repo.id;
  const elapsed = state.nodeGlint ? performance.now() - state.nodeGlint.startedAt : Infinity;
  if (state.nodeGlint?.nodeId === nodeId && elapsed < 180) return;
  state.nodeGlint = {
    nodeId,
    startedAt: performance.now(),
    duration: NODE_GLINT_MS,
  };
}

function startResearchLens(node, options = {}) {
  if (!node || state.reducedMotion || isPinching()) {
    if (!node) clearResearchLens();
    return;
  }
  if (state.dragging && !options.allowWhileDragging) return;
  const nodeId = node.repo.id;
  const elapsed = state.researchLens ? performance.now() - state.researchLens.startedAt : Infinity;
  if (state.researchLens?.nodeId === nodeId && elapsed < 180) return;
  state.researchLens = {
    nodeId,
    startedAt: performance.now(),
    duration: RESEARCH_LENS_MS,
  };
}

function currentLinkCurrent(focusedNode) {
  if (!focusedNode || !state.linkCurrent || state.reducedMotion) {
    if (!focusedNode) clearLinkCurrent();
    return null;
  }
  if (state.dragging || isPinching() || state.linkCurrent.nodeId !== focusedNode.repo.id) {
    clearLinkCurrent();
    return null;
  }
  const elapsed = performance.now() - state.linkCurrent.startedAt;
  const raw = clamp(elapsed / state.linkCurrent.duration, 0, 1);
  if (raw >= 1) {
    clearLinkCurrent();
    return null;
  }
  return {
    raw,
    progress: easeOutQuart(raw),
  };
}

function currentLinkTrace(focusedNode) {
  if (!focusedNode || !state.linkTrace || state.reducedMotion) {
    if (!focusedNode) state.linkTrace = null;
    return null;
  }
  if (state.dragging || isPinching() || state.linkTrace.nodeId !== focusedNode.repo.id) {
    state.linkTrace = null;
    return null;
  }
  const elapsed = performance.now() - state.linkTrace.startedAt;
  const raw = clamp(elapsed / state.linkTrace.duration, 0, 1);
  if (raw >= 1) {
    state.linkTrace = null;
    return null;
  }
  return {
    raw,
    progress: easeOutQuart(raw),
  };
}

function currentNeighborhoodEcho(focusedNode) {
  if (!focusedNode || !state.neighborhoodEcho || state.reducedMotion) {
    if (!focusedNode) clearNeighborhoodEcho();
    return null;
  }
  if (state.dragging || isPinching() || state.neighborhoodEcho.nodeId !== focusedNode.repo.id) {
    clearNeighborhoodEcho();
    return null;
  }
  const elapsed = performance.now() - state.neighborhoodEcho.startedAt;
  const raw = clamp(elapsed / state.neighborhoodEcho.duration, 0, 1);
  if (raw >= 1) {
    clearNeighborhoodEcho();
    return null;
  }
  return {
    raw,
    progress: easeOutQuart(raw),
  };
}

function currentClusterField(focusedNode) {
  if (!focusedNode || !state.clusterField || state.reducedMotion) {
    if (!focusedNode) clearClusterField();
    return null;
  }
  if (state.dragging || isPinching() || state.clusterField.nodeId !== focusedNode.repo.id) {
    clearClusterField();
    return null;
  }
  const elapsed = performance.now() - state.clusterField.startedAt;
  const raw = clamp(elapsed / state.clusterField.duration, 0, 1);
  if (raw >= 1) {
    clearClusterField();
    return null;
  }
  return {
    raw,
    progress: easeOutQuart(raw),
    fade: 1 - easeOutQuart(Math.max(0, raw - 0.52) / 0.48),
  };
}

function currentNodeGlint(focusedNode) {
  if (!focusedNode || !state.nodeGlint || state.reducedMotion) {
    if (!focusedNode) clearNodeGlint();
    return null;
  }
  if (state.dragging || isPinching() || state.nodeGlint.nodeId !== focusedNode.repo.id) {
    clearNodeGlint();
    return null;
  }
  const elapsed = performance.now() - state.nodeGlint.startedAt;
  const raw = clamp(elapsed / state.nodeGlint.duration, 0, 1);
  if (raw >= 1) {
    clearNodeGlint();
    return null;
  }
  return {
    raw,
    progress: easeOutQuart(raw),
    fade: 1 - easeOutQuart(Math.max(0, raw - 0.58) / 0.42),
  };
}

function currentResearchLens(focusedNode) {
  if (!focusedNode || !state.researchLens || state.reducedMotion) {
    if (!focusedNode) clearResearchLens();
    return null;
  }
  if (state.dragging || isPinching() || state.researchLens.nodeId !== focusedNode.repo.id) {
    clearResearchLens();
    return null;
  }
  const elapsed = performance.now() - state.researchLens.startedAt;
  const raw = clamp(elapsed / state.researchLens.duration, 0, 1);
  if (raw >= 1) {
    clearResearchLens();
    return null;
  }
  return {
    raw,
    progress: easeOutQuart(raw),
    fade: 1 - easeOutQuart(Math.max(0, raw - 0.56) / 0.44),
  };
}

function currentAmbientCurrent(visible) {
  if (!state.ambientCurrent || !canRunAmbientCurrent()) {
    clearAmbientCurrent();
    return null;
  }
  const seed = visible.find((node) => node.repo.id === state.ambientCurrent.nodeId);
  if (!seed) {
    clearAmbientCurrent();
    scheduleAmbientCurrent(AMBIENT_IDLE_GRACE_MS);
    return null;
  }
  const byId = new Map(visible.map((node) => [node.repo.id, node]));
  const candidates = state.ambientCurrent.candidates
    .map((candidate) => ({
      ...candidate,
      node: byId.get(candidate.nodeId),
    }))
    .filter((candidate) => candidate.node);
  if (!candidates.length) {
    clearAmbientCurrent();
    scheduleAmbientCurrent(AMBIENT_IDLE_GRACE_MS);
    return null;
  }
  const elapsed = performance.now() - state.ambientCurrent.startedAt;
  const raw = clamp(elapsed / state.ambientCurrent.duration, 0, 1);
  if (raw >= 1) {
    clearAmbientCurrent();
    scheduleAmbientCurrent();
    return null;
  }
  return {
    raw,
    progress: easeOutQuart(raw),
    fade: 1 - easeOutQuart(Math.max(0, raw - 0.68) / 0.32),
    seed,
    candidates,
  };
}

function traceLineProgress(trace, index) {
  if (!trace) return 0;
  const delay = index * LINK_TRACE_STAGGER;
  return easeOutQuart(clamp((trace.raw - delay) / Math.max(0.1, 1 - delay), 0, 1));
}

function echoNodeProgress(echo, index) {
  if (!echo) return 0;
  const delay = index * NEIGHBOR_ECHO_STAGGER;
  return clamp((echo.raw - delay) / Math.max(0.1, 1 - delay), 0, 1);
}

function linkCurrentProgress(current, index) {
  if (!current) return 0;
  const delay = index * LINK_CURRENT_STAGGER;
  return clamp((current.raw - delay) / Math.max(0.1, 1 - delay), 0, 1);
}

function ambientCurrentProgress(current, index) {
  if (!current) return 0;
  const delay = index * AMBIENT_CURRENT_STAGGER;
  return clamp((current.raw - delay) / Math.max(0.1, 1 - delay), 0, 1);
}

function glintNodeProgress(glint, index) {
  if (!glint) return 0;
  const delay = index * NODE_GLINT_STAGGER;
  return clamp((glint.raw - delay) / Math.max(0.1, 1 - delay), 0, 1);
}

function researchLensNodeProgress(lens, index) {
  if (!lens) return 0;
  const delay = index * RESEARCH_LENS_STAGGER;
  return clamp((lens.raw - delay) / Math.max(0.1, 1 - delay), 0, 1);
}

function focusLineWindow(effect, index) {
  if (!effect) return null;
  const lead = clamp(effect.raw * 1.16 - index * FOCUS_EFFECT_STAGGER, 0, 1);
  const tail = clamp(lead - 0.16, 0, 1);
  if (lead <= 0 || tail >= 1) return null;
  return {
    tail,
    lead,
    alpha: Math.sin(lead * Math.PI) * effect.fade,
  };
}

function drawLineSegment(from, to, tail, lead) {
  const startX = from.x + (to.x - from.x) * tail;
  const startY = from.y + (to.y - from.y) * tail;
  const endX = from.x + (to.x - from.x) * lead;
  const endY = from.y + (to.y - from.y) * lead;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
}

function drawFocusPulse(node, screen, effect) {
  if (!effect) return;
  const color = nodeColor(node);
  const radius = node.radius * clamp(screen.scale, 0.78, 1.22);
  const pulse = Math.sin(effect.raw * Math.PI);
  const ringRadius = radius * (2.35 + pulse * 1.55);
  ctx.save();
  ctx.globalAlpha = Math.min(0.24, 0.08 + pulse * 0.14) * effect.fade;
  ctx.strokeStyle = colorWithAlpha(color, 1);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, ringRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function repoActivityGlint(repo) {
  const date = new Date(repo.pushed_at || repo.updated_at || repo.created_at || 0);
  if (Number.isNaN(date.getTime())) return 0;
  const ageDays = Math.max(0, (Date.now() - date.getTime()) / 86400000);
  return clamp(1 - ageDays / 240, 0, 1);
}

function drawNodeGlintArc(node, screen, progress, strength, selected = false) {
  if (progress <= 0 || progress >= 1) return;
  const color = nodeColor(node);
  const wave = Math.sin(progress * Math.PI);
  const radius = node.radius * clamp(screen.scale, 0.78, 1.22);
  const ring = radius * (selected ? 3.75 : 2.8);
  const sweep = Math.PI * (selected ? 0.56 : 0.42);
  const start = -Math.PI / 2 + easeOutQuart(progress) * Math.PI * 2.2;

  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = colorWithAlpha(color, 1);
  ctx.globalAlpha = Math.min(selected ? 0.34 : 0.2, (0.08 + strength * 0.13) * wave);
  ctx.lineWidth = selected ? 1.05 : 0.74;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, ring, start, start + sweep);
  ctx.stroke();

  const dotAngle = start + sweep;
  ctx.fillStyle = colorWithAlpha(color, 1);
  ctx.globalAlpha = Math.min(selected ? 0.3 : 0.16, (0.07 + strength * 0.11) * wave);
  ctx.beginPath();
  ctx.arc(
    screen.x + Math.cos(dotAngle) * ring,
    screen.y + Math.sin(dotAngle) * ring,
    selected ? 1.55 : 1.05,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}

function drawNodeGlints(focusedNode, focusedScreen, candidates, glint) {
  if (!glint) return;
  const selectedStrength = 0.82 + repoActivityGlint(focusedNode.repo) * 0.18;
  drawNodeGlintArc(focusedNode, focusedScreen, glint.progress, selectedStrength, true);

  for (const [index, candidate] of candidates.slice(0, MAX_GLINT_NEIGHBORS).entries()) {
    const local = glintNodeProgress(glint, index + 1);
    if (local <= 0 || local >= 1) continue;
    const node = candidate.node;
    const screen = nodeToScreen(node);
    const activity = repoActivityGlint(node.repo);
    const semantic = Math.min(1, Math.max(0.16, candidate.score / 4.8));
    const strength = (0.48 + semantic * 0.24 + activity * 0.14) * (1 - index * 0.08);
    drawNodeGlintArc(node, screen, local, strength, false);
  }
}

function researchAxisAngle(axis) {
  if (!axis) return -Math.PI / 2;
  const count = Math.max(1, RESEARCH_AXES.length);
  return -Math.PI / 2 + (axis.index / count) * Math.PI * 2 + (hashValue(axis.id) - 0.5) * 0.22;
}

function researchAxisScore(node, axisId) {
  return node?.researchProfile?.scores?.get(axisId) || 0;
}

function researchLensCandidates(focusedNode, candidates) {
  const top = focusedNode?.researchProfile?.top;
  if (!top) return [];
  return candidates
    .map((candidate) => {
      const nodeScore = researchAxisScore(candidate.node, top.axis.id);
      const sameAxis = candidate.node.researchProfile?.top?.axis?.id === top.axis.id;
      const semantic = Math.min(1, Math.max(0.14, candidate.score / 4.8));
      const alignment = nodeScore * 0.74 + semantic * 0.22 + (sameAxis ? 0.08 : 0);
      return { ...candidate, researchAlignment: alignment };
    })
    .filter((candidate) => candidate.researchAlignment >= 0.14)
    .sort(
      (a, b) =>
        b.researchAlignment - a.researchAlignment || b.score - a.score || a.distance - b.distance,
    )
    .slice(0, MAX_RESEARCH_LENS_NEIGHBORS);
}

function drawResearchLensTick(node, screen, angle, progress, strength, selected = false) {
  if (progress <= 0 || progress >= 1) return;
  const wave = Math.sin(progress * Math.PI);
  const color = nodeColor(node);
  const radius = node.radius * clamp(screen.scale, 0.78, 1.22);
  const ring = radius * (selected ? 5.35 : 3.65);
  const sweep = selected ? 0.68 : 0.4;
  const offset = selected ? easeOutQuart(progress) * 0.4 : easeOutQuart(progress) * 0.24;
  const alpha = Math.min(selected ? 0.34 : 0.22, (0.075 + strength * 0.16) * wave);
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = colorWithAlpha(color, 1);
  ctx.globalAlpha = alpha;
  ctx.lineWidth = selected ? 1.08 : 0.76;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, ring, angle - sweep / 2 + offset, angle + sweep / 2 + offset);
  ctx.stroke();

  if (selected) {
    ctx.globalAlpha = alpha * 0.46;
    ctx.lineWidth = 0.58;
    ctx.beginPath();
    ctx.arc(
      screen.x,
      screen.y,
      ring * 1.22,
      angle - sweep * 0.36 - offset * 0.2,
      angle + sweep * 0.36 - offset * 0.2,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawResearchLens(focusedNode, focusedScreen, candidates, lens) {
  const profile = focusedNode?.researchProfile;
  const top = profile?.top;
  if (!lens || !top || profile.strength <= 0.01) return;
  const baseAngle = researchAxisAngle(top.axis);
  const selectedProgress = researchLensNodeProgress(lens, 0);
  const selectedStrength = clamp(0.42 + profile.strength * 0.58, 0, 1);

  drawResearchLensTick(
    focusedNode,
    focusedScreen,
    baseAngle,
    selectedProgress,
    selectedStrength,
    true,
  );
  drawResearchLensTick(
    focusedNode,
    focusedScreen,
    baseAngle + Math.PI * 0.72,
    selectedProgress,
    selectedStrength * 0.78,
    true,
  );

  for (const [index, candidate] of researchLensCandidates(focusedNode, candidates).entries()) {
    const local = researchLensNodeProgress(lens, index + 1);
    if (local <= 0 || local >= 1) continue;
    const node = candidate.node;
    const screen = nodeToScreen(node);
    const angle = Math.atan2(screen.y - focusedScreen.y, screen.x - focusedScreen.x) + Math.PI;
    const strength = clamp(candidate.researchAlignment * 0.78, 0.14, 0.72) * (1 - index * 0.1);
    drawResearchLensTick(node, screen, angle, local, strength, false);
  }
}

function drawLinkCurrentBeads(focusedNode, focusedScreen, candidates, current) {
  if (!current) return;
  ctx.save();
  ctx.fillStyle = colorWithAlpha(nodeColor(focusedNode), 1);
  for (const [index, candidate] of candidates.slice(0, MAX_CURRENT_LINKS).entries()) {
    const local = linkCurrentProgress(current, index);
    if (local <= 0 || local >= 1) continue;
    const screen = nodeToScreen(candidate.node);
    const strength = Math.min(1, Math.max(0.2, candidate.score / 4.4));
    const wave = Math.sin(local * Math.PI);
    const head = easeOutQuart(local);
    for (let bead = 0; bead < LINK_CURRENT_BEADS; bead += 1) {
      const t = head - bead * 0.17;
      if (t <= 0 || t >= 1) continue;
      const x = focusedScreen.x + (screen.x - focusedScreen.x) * t;
      const y = focusedScreen.y + (screen.y - focusedScreen.y) * t;
      const beadFade = bead === 0 ? 1 : 0.54;
      const radius = (1.05 + strength * 0.75) * beadFade * clamp(screen.scale, 0.84, 1.18);
      ctx.globalAlpha = Math.min(0.34, 0.12 + strength * 0.15) * wave * beadFade;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawAmbientCurrent(current, depthMix) {
  if (!current) return;
  const seed = current.seed;
  const seedScreen = nodeToScreen(seed);
  const color = nodeColor(seed);
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = colorWithAlpha(color, 1);
  ctx.fillStyle = colorWithAlpha(color, 1);

  for (const [index, candidate] of current.candidates.slice(0, MAX_AMBIENT_LINKS).entries()) {
    const local = ambientCurrentProgress(current, index);
    if (local <= 0 || local >= 1) continue;
    const screen = nodeToScreen(candidate.node);
    const strength = Math.min(1, Math.max(0.18, candidate.score / 4.6));
    const wave = Math.sin(local * Math.PI) * current.fade;
    const depthLine = lineDepthDusting(seedScreen, screen, depthMix);
    const lead = easeOutQuart(local);
    const tail = clamp(lead - 0.2, 0, 1);

    ctx.globalAlpha = Math.min(0.2, 0.052 + strength * 0.085) * wave * depthLine.alpha;
    ctx.lineWidth = (0.54 + strength * 0.3) * depthLine.width;
    drawLineSegment(seedScreen, screen, tail, lead);

    const beadT = clamp(lead - 0.025, 0, 1);
    const x = seedScreen.x + (screen.x - seedScreen.x) * beadT;
    const y = seedScreen.y + (screen.y - seedScreen.y) * beadT;
    ctx.globalAlpha = Math.min(0.24, 0.068 + strength * 0.1) * wave * depthLine.alpha;
    ctx.beginPath();
    ctx.arc(x, y, (0.82 + strength * 0.52) * clamp(screen.scale, 0.84, 1.16), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.12 * Math.sin(current.raw * Math.PI) * current.fade;
  ctx.lineWidth = 0.68;
  ctx.beginPath();
  ctx.arc(
    seedScreen.x,
    seedScreen.y,
    seed.radius * 2.18 * clamp(seedScreen.scale, 0.82, 1.16),
    0,
    Math.PI * 2,
  );
  ctx.stroke();
  ctx.restore();
}

function drawNeighborhoodEchoes(candidates, echo) {
  if (!echo) return;
  ctx.save();
  ctx.lineCap = "round";
  for (const [index, candidate] of candidates.slice(0, MAX_ECHO_NODES).entries()) {
    const local = echoNodeProgress(echo, index);
    if (local <= 0 || local >= 1) continue;
    const node = candidate.node;
    const screen = nodeToScreen(node);
    const eased = easeOutQuart(local);
    const fade = 1 - easeOutQuart(local);
    const strength = Math.min(1, Math.max(0.18, candidate.score / 4.4));
    const radius = node.radius * clamp(screen.scale, 0.78, 1.22);
    const ringRadius = radius * (2.25 + eased * 4.8);
    ctx.globalAlpha = Math.min(0.32, 0.08 + strength * 0.13) * fade;
    ctx.strokeStyle = colorWithAlpha(nodeColor(node), 1);
    ctx.lineWidth = 0.9 + strength * 0.28;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function crossProduct(origin, first, second) {
  return (
    (first.x - origin.x) * (second.y - origin.y) - (first.y - origin.y) * (second.x - origin.x)
  );
}

function convexHull(points) {
  if (points.length <= 3) return points;
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const lower = [];
  for (const point of sorted) {
    while (
      lower.length >= 2 &&
      crossProduct(lower[lower.length - 2], lower[lower.length - 1], point) <= 0
    ) {
      lower.pop();
    }
    lower.push(point);
  }
  const upper = [];
  for (const point of sorted.slice().reverse()) {
    while (
      upper.length >= 2 &&
      crossProduct(upper[upper.length - 2], upper[upper.length - 1], point) <= 0
    ) {
      upper.pop();
    }
    upper.push(point);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function drawClosedPath(points) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();
}

function drawPartialClosedPath(points, progress) {
  if (points.length < 2) return;
  const segments = points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    return {
      from: point,
      to: next,
      length: Math.hypot(next.x - point.x, next.y - point.y),
    };
  });
  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
  let remaining = totalLength * clamp(progress, 0, 1);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const segment of segments) {
    if (remaining <= 0) break;
    if (remaining >= segment.length) {
      ctx.lineTo(segment.to.x, segment.to.y);
      remaining -= segment.length;
      continue;
    }
    const local = segment.length ? remaining / segment.length : 0;
    ctx.lineTo(
      segment.from.x + (segment.to.x - segment.from.x) * local,
      segment.from.y + (segment.to.y - segment.from.y) * local,
    );
    break;
  }
}

function drawClusterField(focusedNode, candidates, field) {
  if (!field || candidates.length < 3) return;
  const rawPoints = [focusedNode, ...candidates.map((candidate) => candidate.node)]
    .map((node) => nodeToScreen(node))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  const hull = convexHull(rawPoints);
  if (hull.length < 3) return;
  const centroid = hull.reduce(
    (sum, point) => ({
      x: sum.x + point.x / hull.length,
      y: sum.y + point.y / hull.length,
    }),
    { x: 0, y: 0 },
  );
  const padded = hull.map((point) => ({
    x: centroid.x + (point.x - centroid.x) * 1.1,
    y: centroid.y + (point.y - centroid.y) * 1.1,
  }));
  const reveal = easeOutQuart(clamp(field.raw * 1.14, 0, 1));
  const breath = Math.sin(field.raw * Math.PI);
  const color = nodeColor(focusedNode);

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (field.raw > 0.18) {
    ctx.fillStyle = colorWithAlpha(color, 1);
    ctx.globalAlpha = Math.min(0.032, 0.012 + breath * 0.02) * field.fade;
    drawClosedPath(padded);
    ctx.fill();
  }
  ctx.strokeStyle = colorWithAlpha(color, 1);
  ctx.globalAlpha = Math.min(0.18, 0.07 + breath * 0.08) * field.fade;
  ctx.lineWidth = 0.72;
  drawPartialClosedPath(padded, reveal);
  ctx.stroke();
  ctx.globalAlpha = Math.min(0.075, 0.025 + breath * 0.035) * field.fade;
  ctx.lineWidth = 0.46;
  drawClosedPath(padded);
  ctx.stroke();
  ctx.restore();
}

function draw() {
  const rect = els.wrap.getBoundingClientRect();
  const paper = themeColor("--paper");
  const ink = themeColor("--ink");
  const line = themeColor("--line");
  const lineStrong = themeColor("--line-strong");
  const depthMix = modeMix();
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
      const distance = graphDistance(a, b);
      const affinity = semanticAffinity(a, b);
      const sameCluster = a.repo.cluster === b.repo.cluster;
      if (!sameCluster && affinity < 2.05) continue;
      if (distance > 0.34 && affinity < 2.4) continue;
      if (distance > (sameCluster ? 0.2 : 0.16) && affinity < 1.45) continue;
      const aa = nodeToScreen(a);
      const bb = nodeToScreen(b);
      const strength = Math.min(1, Math.max(0, (affinity - 0.8) / 2.4));
      const distanceWeight = Math.max(0, 1 - distance / 0.34);
      const depthLine = lineDepthDusting(aa, bb, depthMix);
      ctx.globalAlpha =
        Math.min(0.105, 0.028 + strength * 0.04 + distanceWeight * 0.035) * depthLine.alpha;
      ctx.strokeStyle = strength > 0.72 ? lineStrong : line;
      ctx.lineWidth = (0.35 + strength * 0.22) * depthLine.width;
      ctx.beginPath();
      ctx.moveTo(aa.x, aa.y);
      ctx.lineTo(bb.x, bb.y);
      ctx.stroke();
      passiveLinks += 1;
    }
  }
  ctx.restore();

  const focusedNode = state.selected || state.hovered;
  if (focusedNode) clearAmbientCurrent();
  const ambientCurrent = focusedNode ? null : currentAmbientCurrent(visible);
  drawAmbientCurrent(ambientCurrent, depthMix);
  if (!focusedNode) clearNodeGlint();
  if (!focusedNode) clearResearchLens();
  const focusEffect = currentFocusEffect(focusedNode);
  let focusCandidates = [];
  let fieldCandidates = [];
  let neighborhoodEcho = null;
  let researchLens = null;
  if (focusedNode) {
    const focusedScreen = nodeToScreen(focusedNode);
    const trace = currentLinkTrace(focusedNode);
    const linkCurrent = currentLinkCurrent(focusedNode);
    const clusterField = currentClusterField(focusedNode);
    const nodeGlint = currentNodeGlint(focusedNode);
    researchLens = currentResearchLens(focusedNode);
    const candidates = focusLinkCandidates(focusedNode, visible);
    focusCandidates = candidates;
    fieldCandidates = clusterFieldCandidates(focusedNode, visible);
    neighborhoodEcho = currentNeighborhoodEcho(focusedNode);
    drawClusterField(focusedNode, fieldCandidates, clusterField);
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = colorWithAlpha(nodeColor(focusedNode), 1);
    for (const [index, candidate] of candidates.entries()) {
      const screen = nodeToScreen(candidate.node);
      const strength = Math.min(1, Math.max(0.12, candidate.affinity / 3.4));
      const distanceWeight = Math.max(0, 1 - candidate.distance / 0.46);
      const baseAlpha = Math.min(0.42, 0.12 + strength * 0.12 + distanceWeight * 0.13);
      const baseWidth = 0.48 + strength * 0.45;
      const depthLine = lineDepthDusting(focusedScreen, screen, depthMix);
      ctx.globalAlpha = (trace ? baseAlpha * 0.68 : baseAlpha) * depthLine.alpha;
      ctx.lineWidth = baseWidth * depthLine.width;
      ctx.beginPath();
      ctx.moveTo(focusedScreen.x, focusedScreen.y);
      ctx.lineTo(screen.x, screen.y);
      ctx.stroke();
      if (trace && index < MAX_TRACE_LINKS) {
        const progress = traceLineProgress(trace, index);
        if (progress > 0) {
          const endX = focusedScreen.x + (screen.x - focusedScreen.x) * progress;
          const endY = focusedScreen.y + (screen.y - focusedScreen.y) * progress;
          ctx.globalAlpha =
            Math.min(0.36, baseAlpha + 0.08) * (0.76 + trace.progress * 0.24) * depthLine.alpha;
          ctx.lineWidth = (baseWidth + 0.22) * depthLine.width;
          ctx.beginPath();
          ctx.moveTo(focusedScreen.x, focusedScreen.y);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      }
      const focusWindow = focusLineWindow(focusEffect, index);
      if (focusWindow?.alpha > 0.01) {
        ctx.globalAlpha = Math.min(0.2, baseAlpha + 0.06) * focusWindow.alpha * depthLine.alpha;
        ctx.lineWidth = (baseWidth + 0.15) * depthLine.width;
        drawLineSegment(focusedScreen, screen, focusWindow.tail, focusWindow.lead);
      }
    }
    ctx.restore();
    drawLinkCurrentBeads(focusedNode, focusedScreen, candidates, linkCurrent);
    drawNodeGlints(focusedNode, focusedScreen, candidates, nodeGlint);
  }

  const nodesForDraw = [...visible].sort((a, b) => {
    const projectedA = nodeToScreen(a);
    const projectedB = nodeToScreen(b);
    return projectedA.depth - projectedB.depth || a.depth - b.depth;
  });
  for (const node of nodesForDraw) {
    const screen = nodeToScreen(node);
    const isSelected = state.selected === node;
    const isHovered = state.hovered === node;
    const related = isRelatedNode(node, focusedNode);
    const dim = state.selected && !isSelected && !related;
    const depthAlpha = 0.52 + node.depth * 0.28;
    const depthLift = state.graphMode === "3d" ? 0.84 + screen.depth * 0.3 : 1;
    const dusting = nodeDepthDusting(screen, depthMix);
    const nodeAlpha = Math.min(
      0.96,
      (isSelected || isHovered ? 0.96 : depthAlpha) * depthLift * dusting.alpha,
    );
    const radiusScale =
      (isSelected ? 1.48 : isHovered ? 1.34 : focusedNode && related ? 1.04 : 0.92) *
      clamp(screen.scale, 0.78, 1.22) *
      dusting.radius;
    if ((isSelected || isHovered) && focusedNode === node) {
      drawFocusPulse(node, screen, focusEffect);
    }
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
      ctx.arc(screen.x, screen.y, node.radius * 2.38 * dusting.ring, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, node.radius * 3.05 * dusting.ring, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  drawNeighborhoodEchoes(focusCandidates, neighborhoodEcho);
  if (focusedNode) {
    drawResearchLens(focusedNode, nodeToScreen(focusedNode), focusCandidates, researchLens);
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
      const screen = nodeToScreen(node);
      ctx.strokeStyle = paper;
      ctx.lineWidth = 3;
      ctx.strokeText(node.repo.name, screen.x + 9, screen.y - 8);
      ctx.fillStyle = ink;
      ctx.fillText(node.repo.name, screen.x + 9, screen.y - 8);
    }
  }
  ctx.globalAlpha = 1;
  if (
    state.transition ||
    state.linkTrace ||
    state.focusEffect ||
    state.neighborhoodEcho ||
    state.linkCurrent ||
    state.clusterField ||
    state.nodeGlint ||
    state.researchLens ||
    state.ambientCurrent
  ) {
    requestDraw();
  }
}

function pickNode(point) {
  let picked = null;
  let best = Infinity;
  for (const node of state.nodes) {
    if (!node.visible) continue;
    const screen = nodeToScreen(node);
    const distance = Math.hypot(point.x - screen.x, point.y - screen.y);
    if (
      distance < Math.max(12, node.radius * 4 * clamp(screen.scale, 0.82, 1.24)) &&
      distance < best
    ) {
      best = distance;
      picked = node;
    }
  }
  return picked;
}

function selectNode(node, focus = false) {
  if (node) {
    pauseAmbientCurrent();
  } else {
    clearAmbientCurrent();
  }
  state.selected = node;
  renderInspector(node?.repo || null);
  updateHint();
  startLinkTrace(node, { allowWhileDragging: true });
  startNeighborhoodEcho(node, { allowWhileDragging: true });
  startLinkCurrent(node, { allowWhileDragging: true });
  startClusterField(node, { allowWhileDragging: true });
  startNodeGlint(node, { allowWhileDragging: true });
  startResearchLens(node, { allowWhileDragging: true });
  requestDraw();
  if (!node) scheduleAmbientCurrent(AMBIENT_IDLE_GRACE_MS);
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

function onTouchPoint(touch) {
  const rect = els.canvas.getBoundingClientRect();
  return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
}

function pointerDistance(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function pointerCenter(first, second) {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

function activePointerPair() {
  const pointers = [...state.activePointers.values()];
  return pointers.length >= 2 ? [pointers[0], pointers[1]] : null;
}

function makePinchGesture(first, second) {
  return {
    startDistance: Math.max(24, pointerDistance(first, second)),
    startScale: state.scale,
    startCameraDistance: state.camera3d.distance,
    startCameraZoom: state.camera3d.zoom,
  };
}

function startPinchGesture(pair = activePointerPair()) {
  if (!pair) return null;
  pauseAmbientCurrent();
  state.linkTrace = null;
  clearFocusEffect();
  clearNeighborhoodEcho();
  clearLinkCurrent();
  clearClusterField();
  clearNodeGlint();
  clearResearchLens();
  const [first, second] = pair;
  state.pinch = makePinchGesture(first, second);
  state.moved = true;
  return state.pinch;
}

function zoom2dAtPoint(center, nextScale) {
  const before = screenToWorld(center);
  state.scale = clamp(nextScale, 0.55, 2.4);
  const after = worldPointToScreen(before);
  state.panX += center.x - after.x;
  state.panY += center.y - after.y;
}

function zoom3dAtPoint(center, nextZoom) {
  const rect = els.wrap.getBoundingClientRect();
  const currentZoom = state.camera3d.zoom;
  const zoom = clamp(nextZoom, 0.48, 3.2);
  const factor = zoom / currentZoom;
  const centerOffsetX = center.x - rect.width / 2;
  const centerOffsetY = center.y - rect.height / 2;
  state.panX = centerOffsetX + (state.panX - centerOffsetX) * factor;
  state.panY = centerOffsetY + (state.panY - centerOffsetY) * factor;
  state.camera3d.zoom = zoom;
}

function applyPinchZoom(gesture, first, second) {
  const distance = Math.max(24, pointerDistance(first, second));
  const ratio = distance / gesture.startDistance;
  if (state.graphMode === "3d") {
    const visualZoom = Math.pow(ratio, 1.16);
    zoom3dAtPoint(pointerCenter(first, second), gesture.startCameraZoom * visualZoom);
    state.camera3d.distance = clamp(
      gesture.startCameraDistance / Math.pow(ratio, 0.12),
      1.45,
      3.45,
    );
  } else {
    zoom2dAtPoint(pointerCenter(first, second), gesture.startScale * ratio);
  }
  state.moved = true;
  requestDraw();
}

function updatePinchGesture() {
  const pair = activePointerPair();
  if (!pair) return false;
  if (!state.pinch) startPinchGesture();
  const [first, second] = pair;
  applyPinchZoom(state.pinch, first, second);
  return true;
}

function resetPointerState() {
  state.dragging = false;
  state.pointerStart = null;
  state.lastPointer = null;
  state.pinch = null;
  state.touchPinch = null;
  state.activePointers.clear();
  state.moved = false;
  els.canvas.classList.remove("is-dragging");
}

function capturePointer(event) {
  try {
    els.canvas.setPointerCapture(event.pointerId);
  } catch {
    // Synthetic pointer checks may not register as active pointers before dispatch.
  }
}

function releasePointer(event) {
  if (!els.canvas.hasPointerCapture?.(event.pointerId)) return;
  els.canvas.releasePointerCapture(event.pointerId);
}

function touchPair(event) {
  if (event.touches.length < 2) return null;
  return [onTouchPoint(event.touches[0]), onTouchPoint(event.touches[1])];
}

function startTouchPinch(event) {
  const pair = touchPair(event);
  if (!pair) return false;
  pauseAmbientCurrent();
  state.activePointers.clear();
  state.pinch = null;
  state.linkTrace = null;
  clearFocusEffect();
  clearNeighborhoodEcho();
  clearLinkCurrent();
  clearClusterField();
  clearNodeGlint();
  clearResearchLens();
  state.touchPinch = makePinchGesture(pair[0], pair[1]);
  state.dragging = false;
  state.pointerStart = null;
  state.lastPointer = null;
  state.moved = true;
  els.canvas.classList.add("is-dragging");
  return true;
}

function updateTouchPinch(event) {
  const pair = touchPair(event);
  if (!pair) return false;
  if (!state.touchPinch) startTouchPinch(event);
  applyPinchZoom(state.touchPinch, pair[0], pair[1]);
  return true;
}

function endTouchPinch(event) {
  if (event.touches.length >= 2) {
    startTouchPinch(event);
    return;
  }
  state.touchPinch = null;
  els.canvas.classList.remove("is-dragging");
  scheduleAmbientCurrent(AMBIENT_IDLE_GRACE_MS);
}

function resetView() {
  pauseAmbientCurrent();
  state.query = "";
  state.cluster = "all";
  state.graphMode = "2d";
  state.transition = null;
  state.linkTrace = null;
  clearFocusEffect();
  clearNeighborhoodEcho();
  clearLinkCurrent();
  clearClusterField();
  clearNodeGlint();
  clearResearchLens();
  resetCamera3d();
  state.scale = 1;
  state.panX = 0;
  state.panY = 0;
  state.selected = null;
  state.hovered = null;
  resetPointerState();
  els.search.value = "";
  for (const node of state.nodes) {
    node.x = node.x2;
    node.y = node.y2;
  }
  renderGraphModeControls();
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

function bindGraphHelpTooltips() {
  const items = Array.from(document.querySelectorAll(".graph-help"));
  const closeTooltip = (item) => {
    const trigger = item.querySelector(".graph-help-trigger");
    const tooltip = item.querySelector(".graph-tooltip");
    if (!trigger || !tooltip) return;
    window.clearTimeout(Number(tooltip.dataset.hideTimer || 0));
    tooltip.classList.remove("is-visible");
    trigger.setAttribute("aria-expanded", "false");
    tooltip.dataset.hideTimer = String(
      window.setTimeout(() => {
        if (!tooltip.classList.contains("is-visible")) tooltip.hidden = true;
      }, 130),
    );
  };
  const openTooltip = (item) => {
    const trigger = item.querySelector(".graph-help-trigger");
    const tooltip = item.querySelector(".graph-tooltip");
    if (!trigger || !tooltip) return;
    items.forEach((other) => {
      if (other !== item) closeTooltip(other);
    });
    window.clearTimeout(Number(tooltip.dataset.hideTimer || 0));
    tooltip.hidden = false;
    tooltip.classList.add("is-visible");
    trigger.setAttribute("aria-expanded", "true");
  };

  items.forEach((item) => {
    const trigger = item.querySelector(".graph-help-trigger");
    if (!trigger) return;
    item.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse" || event.pointerType === "pen") openTooltip(item);
    });
    item.addEventListener("pointerleave", () => closeTooltip(item));
    trigger.addEventListener("focus", () => openTooltip(item));
    trigger.addEventListener("blur", () => closeTooltip(item));
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openTooltip(item);
    });
    trigger.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      closeTooltip(item);
      trigger.blur();
    });
  });

  document.addEventListener("pointerdown", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(".graph-help")) return;
    items.forEach(closeTooltip);
  });
}

function bindEvents() {
  document.addEventListener("paper-theme-change", requestDraw);
  bindGraphHelpTooltips();
  const handleReducedMotionChange = (event) => {
    state.reducedMotion = event.matches;
    if (state.reducedMotion) {
      pauseAmbientCurrent();
      state.transition = null;
      state.linkTrace = null;
      clearFocusEffect();
      clearNeighborhoodEcho();
      clearLinkCurrent();
      clearClusterField();
      clearNodeGlint();
      clearResearchLens();
    } else {
      scheduleAmbientCurrent(AMBIENT_IDLE_GRACE_MS);
    }
    requestDraw();
  };
  if (typeof reducedMotionQuery.addEventListener === "function") {
    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
  } else if (typeof reducedMotionQuery.addListener === "function") {
    reducedMotionQuery.addListener(handleReducedMotionChange);
  }
  els.search.addEventListener("input", () => {
    pauseAmbientCurrent();
    state.query = els.search.value.trim();
    state.selected = null;
    renderPassiveInspector();
    updateVisibility();
  });
  els.search.addEventListener("focus", () => {
    state.searchFocused = true;
    pauseAmbientCurrent();
  });
  els.search.addEventListener("blur", () => {
    state.searchFocused = false;
    scheduleAmbientCurrent(AMBIENT_IDLE_GRACE_MS);
  });
  els.reset.addEventListener("click", resetView);
  els.refresh?.addEventListener("click", refreshFromGithub);
  els.graphModeControls?.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest("[data-graph-mode]");
    if (!button) return;
    setGraphMode(button.dataset.graphMode);
  });
  els.canvas.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length < 2) return;
      event.preventDefault();
      startTouchPinch(event);
    },
    { passive: false },
  );
  els.canvas.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length < 2 && !state.touchPinch) return;
      event.preventDefault();
      updateTouchPinch(event);
    },
    { passive: false },
  );
  els.canvas.addEventListener("touchend", endTouchPinch);
  els.canvas.addEventListener("touchcancel", endTouchPinch);
  els.canvas.addEventListener("pointerdown", (event) => {
    if (state.touchPinch) return;
    pauseAmbientCurrent();
    capturePointer(event);
    const point = onPointerPoint(event);
    state.activePointers.set(event.pointerId, point);
    state.dragging = true;
    state.pointerStart = point;
    state.lastPointer = point;
    state.moved = false;
    if (state.activePointers.size >= 2) {
      startPinchGesture();
    }
    els.canvas.classList.add("is-dragging");
  });
  els.canvas.addEventListener("pointermove", (event) => {
    if (state.touchPinch) return;
    const point = onPointerPoint(event);
    if (state.activePointers.has(event.pointerId)) {
      state.activePointers.set(event.pointerId, point);
    }
    if (state.activePointers.size >= 2 && updatePinchGesture()) {
      return;
    }
    const hover = pickNode(point);
    if (hover !== state.hovered) {
      state.hovered = hover;
      if (hover) {
        pauseAmbientCurrent();
      } else {
        scheduleAmbientCurrent(AMBIENT_IDLE_GRACE_MS);
      }
      if (!state.selected && !state.dragging) {
        startLinkTrace(hover);
        if (finePointer.matches) {
          startNeighborhoodEcho(hover);
          startLinkCurrent(hover);
        }
      }
      updateHint();
      requestDraw();
    }
    if (!state.dragging || !state.lastPointer) return;
    const dx = point.x - state.lastPointer.x;
    const dy = point.y - state.lastPointer.y;
    if (Math.hypot(point.x - state.pointerStart.x, point.y - state.pointerStart.y) > 3) {
      state.moved = true;
    }
    if (state.graphMode === "3d") {
      state.camera3d.yaw += dx * ROTATION_SENSITIVITY.yaw;
      state.camera3d.pitch = clamp(
        state.camera3d.pitch - dy * ROTATION_SENSITIVITY.pitch,
        -0.82,
        0.82,
      );
      state.lastPointer = point;
      requestDraw();
      return;
    }
    if (!finePointer.matches && event.pointerType !== "touch") return;
    state.panX += dx;
    state.panY += dy;
    state.lastPointer = point;
    requestDraw();
  });
  els.canvas.addEventListener("pointerup", (event) => {
    if (state.touchPinch) return;
    const point = onPointerPoint(event);
    const node = pickNode(point);
    const wasPinching = Boolean(state.pinch);
    releasePointer(event);
    state.activePointers.delete(event.pointerId);
    if (state.activePointers.size >= 2) {
      startPinchGesture();
      return;
    }
    if (state.activePointers.size === 1) {
      const [remaining] = state.activePointers.values();
      state.pointerStart = remaining;
      state.lastPointer = remaining;
      state.pinch = null;
      state.moved = true;
      return;
    }
    els.canvas.classList.remove("is-dragging");
    if (!state.moved && !wasPinching) {
      selectNode(node || null);
    }
    resetPointerState();
    scheduleAmbientCurrent(AMBIENT_IDLE_GRACE_MS);
  });
  els.canvas.addEventListener("pointercancel", (event) => {
    if (state.touchPinch) return;
    releasePointer(event);
    state.activePointers.delete(event.pointerId);
    if (state.activePointers.size) {
      const [remaining] = state.activePointers.values();
      state.pointerStart = remaining;
      state.lastPointer = remaining;
      state.pinch = null;
      state.moved = true;
      return;
    }
    resetPointerState();
    scheduleAmbientCurrent(AMBIENT_IDLE_GRACE_MS);
  });
  els.canvas.addEventListener("pointerleave", () => {
    if (state.dragging || isPinching()) return;
    if (!state.hovered) return;
    state.hovered = null;
    updateHint();
    requestDraw();
    scheduleAmbientCurrent(AMBIENT_IDLE_GRACE_MS);
  });
  els.canvas.addEventListener(
    "wheel",
    (event) => {
      if (!finePointer.matches) return;
      event.preventDefault();
      pauseAmbientCurrent();
      if (state.graphMode === "3d") {
        clearFocusEffect();
        clearNeighborhoodEcho();
        clearLinkCurrent();
        clearClusterField();
        clearNodeGlint();
        clearResearchLens();
        const point = onPointerPoint(event);
        const factor = event.deltaY < 0 ? 1.12 : 0.9;
        zoom3dAtPoint(point, state.camera3d.zoom * factor);
        requestDraw();
        scheduleAmbientCurrent(AMBIENT_IDLE_GRACE_MS);
        return;
      }
      clearFocusEffect();
      clearNeighborhoodEcho();
      clearLinkCurrent();
      clearClusterField();
      clearNodeGlint();
      clearResearchLens();
      const point = onPointerPoint(event);
      const before = screenToWorld(point);
      const factor = event.deltaY < 0 ? 1.08 : 0.92;
      state.scale = Math.min(2.4, Math.max(0.55, state.scale * factor));
      const after = worldPointToScreen(before);
      state.panX += point.x - after.x;
      state.panY += point.y - after.y;
      requestDraw();
      scheduleAmbientCurrent(AMBIENT_IDLE_GRACE_MS);
    },
    { passive: false },
  );
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pauseAmbientCurrent();
      return;
    }
    scheduleAmbientCurrent(AMBIENT_IDLE_GRACE_MS);
  });
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
