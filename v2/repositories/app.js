const DATA_URL = "./data/repos.snapshot.json";
const EXCLUDED_PATTERN = /\b(grok|grokedex|grokédex|xai|x\.ai)\b/i;
const finePointer = window.matchMedia("(pointer: fine)");

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
  activity: document.querySelector("#activity-bars"),
  hint: document.querySelector("#graph-hint"),
  filterSummary: document.querySelector("#filter-summary"),
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
    const local = hashValue(`${repo.name}:${repo.created_at}`);
    const angle = rank * 2.399963 + local * 0.7;
    const spread = repo.cluster === "s26-airp" ? 0.29 : 0.14;
    const radius = Math.sqrt((rank + 0.5) / count) * spread;
    const x = anchor.x + Math.cos(angle) * radius;
    const y = anchor.y + Math.sin(angle) * radius * 0.76;
    return {
      repo,
      cluster,
      anchorX: x,
      anchorY: y,
      x,
      y,
      radius: 2.4 + (repo.stargazers_count > 0 ? 0.7 : 0),
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
  els.hint.textContent = state.selected
    ? state.selected.repo.name
    : count
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

function nodeColor(node) {
  return themeColor(`--node-${node.cluster % 7}`) || themeColor("--ink");
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
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, rect.width, rect.height);

  const visible = state.nodes.filter((node) => node.visible);
  ctx.save();
  ctx.lineWidth = 0.6;
  for (let i = 0; i < visible.length; i += 1) {
    const a = visible[i];
    for (let j = i + 1; j < visible.length; j += 1) {
      const b = visible[j];
      if (a.repo.cluster !== b.repo.cluster) continue;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance > 0.1) continue;
      const aa = worldToScreen(a);
      const bb = worldToScreen(b);
      ctx.globalAlpha = Math.max(0.03, 0.12 - distance * 0.65);
      ctx.strokeStyle = line;
      ctx.beginPath();
      ctx.moveTo(aa.x, aa.y);
      ctx.lineTo(bb.x, bb.y);
      ctx.stroke();
    }
  }
  ctx.restore();

  for (const node of visible) {
    const screen = worldToScreen(node);
    const isSelected = state.selected === node;
    const isHovered = state.hovered === node;
    const dim = state.selected && !isSelected && node.repo.cluster !== state.selected.repo.cluster;
    ctx.globalAlpha = dim ? 0.22 : 0.84;
    ctx.fillStyle = nodeColor(node);
    ctx.beginPath();
    ctx.arc(
      screen.x,
      screen.y,
      node.radius * (isSelected || isHovered ? 1.28 : 0.92),
      0,
      Math.PI * 2,
    );
    ctx.fill();

    if (isSelected || isHovered) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, node.radius * 2.8, 0, Math.PI * 2);
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
    button.textContent = `${cluster.label} (${cluster.count})`;
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
  for (const week of weeks) {
    const bar = document.createElement("span");
    bar.className = "activity-bar";
    bar.style.height = `${4 + (week.count / max) * 68}px`;
    bar.title = `${week.count} repositories updated near ${week.end.toLocaleDateString()}`;
    els.activity.append(bar);
  }
}

function renderList() {
  const visible = state.nodes
    .filter((node) => node.visible)
    .map((node) => node.repo)
    .sort((a, b) => new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at))
    .slice(0, 24);
  els.list.innerHTML = "";
  for (const repo of visible) {
    const row = document.createElement("article");
    row.className = "repo-row";
    const label = `${repo.cluster_label || "Repository"}${isS26Repo(repo) ? " - provisional" : ""}`;
    row.innerHTML = `
      <button type="button">${escapeHtml(repo.name)}</button>
      <p>${escapeHtml(repo.description || "No public description provided.")}</p>
      <small>${escapeHtml(label)}</small>
    `;
    row.querySelector("button").addEventListener("click", () => {
      const node = state.nodes.find((item) => item.repo.id === repo.id);
      selectNode(node, true);
      document
        .querySelector("#repositories")
        .scrollIntoView({ behavior: "smooth", block: "start" });
    });
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

function bindEvents() {
  document.addEventListener("paper-theme-change", requestDraw);
  els.search.addEventListener("input", () => {
    state.query = els.search.value.trim();
    state.selected = null;
    renderPassiveInspector();
    updateVisibility();
  });
  els.reset.addEventListener("click", resetView);
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
  state.repos = cleanRepos(data.repos || []);
  state.clusters = buildClusters(state.repos);
  state.nodes = makeNodes(state.repos, state.clusters);
  renderClusters();
  renderActivity();
  renderList();
  renderInspector(null);
  bindEvents();
  resizeCanvas();
  updateVisibility();
}

init().catch((error) => {
  console.error(error);
  els.hint.textContent = "Repository data could not be loaded.";
});
