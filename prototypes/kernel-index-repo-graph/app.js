const DATA_URL = "./data/repos.snapshot.json";
const API_ROOT = "https://api.github.com/users/ryanjosephkamp/repos";
const BLOCKED_PROVIDER_TERMS = ["gr" + "okedex", "gr" + "ok", "x." + "ai", "x" + "ai"];
const RECENT_TABLE_LIMIT = 25;

const clusterDefinitions = [
  { id: "s26-airp", label: "S26 AIRP", color: "#12b886" },
  { id: "ai-ml", label: "AI and ML", color: "#7c5cff" },
  { id: "research-software", label: "Research Software", color: "#18c3d7" },
  { id: "computational-biology", label: "Computational Biology", color: "#c084fc" },
  { id: "data-tooling", label: "Data and Tooling", color: "#4dabf7" },
  { id: "web-portfolio", label: "Web and Portfolio", color: "#ffd43b" },
  { id: "interactive", label: "Interactive Experiments", color: "#ff8787" },
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
const visibleCount = document.querySelector("#visible-count");
const clusterCount = document.querySelector("#cluster-count");
const repoCount = document.querySelector("#repo-count");
const snapshotTime = document.querySelector("#snapshot-time");
const refreshButton = document.querySelector("#refresh-button");
const refreshStatus = document.querySelector("#refresh-status");
const toggleListButton = document.querySelector("#toggle-list-button");
const showAllButton = document.querySelector("#show-all-button");
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

  const scores = clusterDefinitions.map((cluster) => {
    let score = 0;
    if (cluster.id === "s26-airp" && (text.includes("s26 airp") || repo.name.startsWith("the-"))) score += 5;
    if (cluster.id === "web-portfolio" && /blog|github\.io|website|portfolio/.test(text)) score += 4;
    for (const keyword of clusterRules[cluster.id] || []) {
      if (text.includes(keyword)) score += 1;
    }
    return { ...cluster, score };
  }).sort((a, b) => b.score - a.score);

  const winner = scores[0].score > 0 ? scores[0] : clusterDefinitions.at(-1);
  return {
    cluster: winner.id,
    cluster_label: winner.label,
    cluster_color: winner.color,
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
  return { ...normalized, ...classifyRepo(normalized) };
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

function layoutNodes(visibleRepos) {
  const width = svg.clientWidth || 900;
  const height = svg.clientHeight || 560;
  const compact = width < 620;
  const density = Number(densityInput.value);
  const centerX = width / 2;
  const centerY = height / 2;
  const clusterRadius = Math.min(width, height) * (compact ? 0.22 : 0.33) * density;
  const grouped = groupByCluster(visibleRepos);
  const clusterNodes = [];
  const repoNodes = [];
  const edgeList = [];
  const repoMargin = compact ? 22 : 30;
  const clusterMargin = compact ? 54 : 72;

  grouped.forEach((cluster, index) => {
    const angle = grouped.length === 1 ? -Math.PI / 2 : (Math.PI * 2 * index) / grouped.length - Math.PI / 2;
    const defaultX = centerX + Math.cos(angle) * clusterRadius;
    const defaultY = centerY + Math.sin(angle) * clusterRadius * 0.78;
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
      r: Math.max(22, Math.min(42, 20 + cluster.repos.length * 0.45)),
      cluster: cluster.id,
    };
    clusterNodes.push(clusterNode);

    const maxRepoRadius = Math.min(width, height) * (compact ? 0.2 : 0.26);
    const repoRadius = Math.max(compact ? 46 : 78, Math.min(maxRepoRadius, 70 + cluster.repos.length * 1.8)) * density;
    const ringCount = cluster.repos.length > 54 ? 3 : cluster.repos.length > 26 ? 2 : 1;
    const ringScales = ringCount === 3 ? [0.56, 0.82, 1.08] : ringCount === 2 ? [0.72, 1.06] : [1];

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

  const hubs = new Map(clusterNodes.map((node) => [node.cluster, node]));
  for (const repoNode of repoNodes) {
    for (const secondary of repoNode.repo.secondary_clusters || []) {
      const hub = hubs.get(secondary);
      if (hub) edgeList.push({ source: repoNode, target: hub, type: "secondary" });
    }
  }

  return { nodes: [...clusterNodes, ...repoNodes], edges: edgeList };
}

function renderGraph() {
  const visibleRepos = getVisibleRepos();
  const compactViewport = (svg.clientWidth || 900) < 620;
  const focusedView = activeCluster !== "all" || query.trim().length > 0;
  const showRepoLabels = visibleRepos.length <= (compactViewport ? 12 : 18) || (focusedView && visibleRepos.length <= 48);
  const showSecondaryEdges = focusedView || visibleRepos.length <= 42;
  const selectedName = selectedRepo?.name;
  emptyGraph.hidden = visibleRepos.length > 0;
  svg.innerHTML = "";

  const { nodes, edges } = layoutNodes(visibleRepos);
  const edgeGroup = createSvgElement("g", { class: "edges" });
  const nodeGroup = createSvgElement("g", { class: "nodes" });
  svg.append(edgeGroup, nodeGroup);

  for (const edge of edges) {
    const selectedNeighborhood = selectedName
      && (edge.source.repo?.name === selectedName || edge.target.repo?.name === selectedName);
    if (edge.type === "secondary" && !showSecondaryEdges && !selectedNeighborhood) continue;
    edgeGroup.append(createSvgElement("line", {
      class: `edge ${edge.type} ${selectedNeighborhood ? "selected-neighborhood" : ""}`,
      x1: edge.source.x,
      y1: edge.source.y,
      x2: edge.target.x,
      y2: edge.target.y,
    }));
  }

  for (const node of nodes) {
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
    group.addEventListener("click", () => {
      if (node.type === "repo") selectRepo(node.repo);
      if (node.type === "cluster") {
        activeCluster = node.cluster;
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
  }
}

function scheduleGraphRender() {
  if (graphRenderRequest) return;
  graphRenderRequest = window.requestAnimationFrame(() => {
    graphRenderRequest = null;
    renderGraph();
  });
}

function startDrag(event, node, group) {
  event.preventDefault();
  group.setPointerCapture(event.pointerId);
  const start = { x: event.clientX, y: event.clientY, nodeX: node.x, nodeY: node.y };
  const layout = layoutNodes(getVisibleRepos());
  const related = [];

  if (node.type === "cluster") {
    for (const relatedNode of layout.nodes) {
      if (relatedNode.type === "repo" && relatedNode.cluster === node.cluster) {
        related.push({ id: relatedNode.id, x: relatedNode.x, y: relatedNode.y, influence: 0.56 });
      }
    }
  }

  if (node.type === "repo") {
    for (const relatedNode of layout.nodes) {
      if (relatedNode.type === "cluster" && relatedNode.cluster === node.cluster) {
        related.push({ id: relatedNode.id, x: relatedNode.x, y: relatedNode.y, influence: 0.1 });
      }
      if (relatedNode.type === "cluster" && (node.repo.secondary_clusters || []).includes(relatedNode.cluster)) {
        related.push({ id: relatedNode.id, x: relatedNode.x, y: relatedNode.y, influence: 0.06 });
      }
    }
  }

  dragTarget = { node, group, start, related };
  group.classList.add("dragging");

  window.addEventListener("pointermove", dragMove);
  window.addEventListener("pointerup", endDrag, { once: true });
  window.addEventListener("pointercancel", endDrag, { once: true });
}

function dragMove(event) {
  if (!dragTarget) return;
  const { node, start, related } = dragTarget;
  const dx = event.clientX - start.x;
  const dy = event.clientY - start.y;
  const width = svg.clientWidth || 900;
  const height = svg.clientHeight || 560;
  const margin = node.type === "cluster" ? 64 : 24;

  nodePositions.set(node.id, {
    x: clamp(start.nodeX + dx, margin, width - margin),
    y: clamp(start.nodeY + dy, margin, height - margin),
  });

  for (const item of related) {
    const relatedMargin = item.id.startsWith("cluster:") ? 64 : 24;
    nodePositions.set(item.id, {
      x: clamp(item.x + dx * item.influence, relatedMargin, width - relatedMargin),
      y: clamp(item.y + dy * item.influence, relatedMargin, height - relatedMargin),
    });
  }

  scheduleGraphRender();
}

function endDrag() {
  if (!dragTarget) return;
  dragTarget.group.classList.remove("dragging");
  dragTarget = null;
  window.removeEventListener("pointermove", dragMove);
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
  repos = snapshot.repos || [];
  selectedRepo = null;
  render();
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
  nodePositions = new Map();
  render();
}

searchInput.addEventListener("input", (event) => {
  query = event.target.value;
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

resetButton.addEventListener("click", () => {
  activeCluster = "all";
  query = "";
  selectedRepo = null;
  nodePositions = new Map();
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
    activeCluster = "all";
    query = "";
    searchInput.value = "";
    render();
  }
  if (event.key === "Enter" && selectedRepo && document.activeElement === document.body) {
    window.open(selectedRepo.html_url, "_blank", "noreferrer");
  }
});

window.addEventListener("resize", () => renderGraph());

loadSnapshot().catch((error) => {
  refreshStatus.textContent = `Snapshot load failed: ${error.message}`;
  console.error(error);
});
