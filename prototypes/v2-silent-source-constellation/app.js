const DATA_URL = "./data/repos.snapshot.json";
const EXCLUDED_PATTERN = /\b(grok|grokedex|grokédex|xai|x\.ai)\b/i;
const THEME_KEY = "silent-source-theme";
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

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
  lastPointer: null,
  lastFrame: 0,
  motion: !prefersReducedMotion.matches,
};

const els = {
  site: document.querySelector(".site"),
  canvas: document.querySelector("#repo-canvas"),
  wrap: document.querySelector("#canvas-wrap"),
  search: document.querySelector("#repo-search"),
  reset: document.querySelector("#reset-view"),
  inspector: document.querySelector("#repo-inspector"),
  clusters: document.querySelector("#cluster-row"),
  list: document.querySelector("#repo-list"),
  activity: document.querySelector("#activity-bars"),
  hint: document.querySelector("#graph-hint"),
  themeInputs: [...document.querySelectorAll("input[name='theme']")],
};

const ctx = els.canvas.getContext("2d", { alpha: true });

function normalizeCluster(repo) {
  const name = repo.name.toLowerCase();
  if (name === "brrrdle" || name === "brrrdle-dev") {
    return { id: "games", label: "Games", color: "#d9a15f" };
  }
  return {
    id: repo.cluster || "other",
    label: repo.cluster_label || "Other",
    color: repo.cluster_color || "#8d98a7",
  };
}

function cleanRepos(repos) {
  return repos
    .filter((repo) => !EXCLUDED_PATTERN.test([repo.name, repo.description, repo.html_url].join(" ")))
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

function makeNodes(repos, clusters) {
  const clusterIndex = new Map(clusters.map((cluster, index) => [cluster.id, index]));
  const total = Math.max(clusters.length, 1);
  const anchors = new Map();
  clusters.forEach((cluster, index) => {
    const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
    const spread = 0.34 + (index % 3) * 0.045;
    anchors.set(cluster.id, {
      x: Math.cos(angle) * spread,
      y: Math.sin(angle) * spread * 0.78,
    });
  });

  return repos.map((repo, index) => {
    const cluster = clusterIndex.get(repo.cluster) ?? 0;
    const anchor = anchors.get(repo.cluster) || { x: 0, y: 0 };
    const local = hashValue(`${repo.name}:${repo.created_at}`);
    const angle = local * Math.PI * 2 + index * 0.19;
    const radius = 0.035 + ((index % 9) / 9) * 0.11 + hashValue(repo.name) * 0.06;
    const x = anchor.x + Math.cos(angle) * radius;
    const y = anchor.y + Math.sin(angle) * radius * 0.8;
    return {
      repo,
      cluster,
      anchorX: x,
      anchorY: y,
      x,
      y,
      vx: 0,
      vy: 0,
      phase: hashValue(repo.full_name || repo.name) * Math.PI * 2,
      radius: 2.3 + (repo.stargazers_count > 0 ? 1.2 : 0) + Math.min(1.5, (repo.forks_count || 0) * 0.12),
      visible: true,
    };
  });
}

function setTheme(choice) {
  const resolved = choice === "system" ? (systemDark.matches ? "dark" : "light") : choice;
  els.site.dataset.themeChoice = choice;
  els.site.dataset.resolvedTheme = resolved;
  localStorage.setItem(THEME_KEY, choice);
  for (const input of els.themeInputs) {
    input.checked = input.value === choice;
  }
}

function resizeCanvas() {
  const rect = els.wrap.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  els.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  els.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  els.canvas.style.width = `${rect.width}px`;
  els.canvas.style.height = `${rect.height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  renderList();
  updateHint();
}

function updateHint() {
  const count = state.nodes.filter((node) => node.visible).length;
  els.hint.textContent = state.selected
    ? state.selected.repo.name
    : count
      ? `${count} visible stars. Select one to inspect.`
      : "No repositories match the current search.";
}

function worldToScreen(node) {
  const rect = els.wrap.getBoundingClientRect();
  const base = Math.min(rect.width, rect.height) * 0.82 * state.scale;
  return {
    x: rect.width / 2 + state.panX + node.x * base,
    y: rect.height / 2 + state.panY + node.y * base,
  };
}

function screenToWorld(point) {
  const rect = els.wrap.getBoundingClientRect();
  const base = Math.min(rect.width, rect.height) * 0.82 * state.scale;
  return {
    x: (point.x - rect.width / 2 - state.panX) / base,
    y: (point.y - rect.height / 2 - state.panY) / base,
  };
}

function themeColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function draw(now = 0) {
  const rect = els.wrap.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  const ink = themeColor("--ink");
  const line = themeColor("--line-strong");
  const muted = themeColor("--muted");
  const accent = themeColor("--accent");
  const elapsed = Math.min(0.035, Math.max(0.001, (now - state.lastFrame) / 1000 || 0.016));
  state.lastFrame = now;

  const visible = state.nodes.filter((node) => node.visible);
  if (state.motion && !state.dragging) {
    for (const node of visible) {
      const drift = 0.00045;
      const t = now * 0.00018 + node.phase;
      node.vx += Math.cos(t * 1.7) * drift;
      node.vy += Math.sin(t * 1.3) * drift;
    }
  }

  for (const node of visible) {
    const dx = node.anchorX - node.x;
    const dy = node.anchorY - node.y;
    node.vx += dx * 0.018;
    node.vy += dy * 0.018;
    node.vx *= 0.88;
    node.vy *= 0.88;
    node.x += node.vx * elapsed * 60;
    node.y += node.vy * elapsed * 60;
  }

  ctx.save();
  ctx.lineWidth = 0.65;
  for (let i = 0; i < visible.length; i += 1) {
    const a = visible[i];
    for (let j = i + 1; j < visible.length; j += 1) {
      const b = visible[j];
      if (a.repo.cluster !== b.repo.cluster) continue;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance > 0.115) continue;
      const aa = worldToScreen(a);
      const bb = worldToScreen(b);
      ctx.globalAlpha = Math.max(0.02, 0.11 - distance * 0.55);
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
    ctx.globalAlpha = dim ? 0.28 : 0.92;
    ctx.fillStyle = node.repo.cluster_color || accent;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, node.radius * (isSelected ? 1.75 : isHovered ? 1.35 : 1), 0, Math.PI * 2);
    ctx.fill();
    if (isSelected || isHovered) {
      ctx.globalAlpha = 0.42;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, node.radius * 4.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.96;
      ctx.fillStyle = ink;
      ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      ctx.fillText(node.repo.name, screen.x + 12, screen.y - 12);
    }
  }

  if (!state.selected && !state.query && state.scale >= 0.92) {
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = muted;
    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    for (const cluster of state.clusters) {
      const nodes = visible.filter((node) => node.repo.cluster === cluster.id);
      if (!nodes.length) continue;
      const x = nodes.reduce((sum, node) => sum + worldToScreen(node).x, 0) / nodes.length;
      const y = nodes.reduce((sum, node) => sum + worldToScreen(node).y, 0) / nodes.length;
      ctx.fillText(`${cluster.label} (${cluster.count})`, x + 10, y);
    }
  }

  ctx.globalAlpha = 1;
  requestAnimationFrame(draw);
}

function pickNode(point) {
  let picked = null;
  let best = Infinity;
  for (const node of state.nodes) {
    if (!node.visible) continue;
    const screen = worldToScreen(node);
    const distance = Math.hypot(point.x - screen.x, point.y - screen.y);
    if (distance < Math.max(13, node.radius * 4) && distance < best) {
      best = distance;
      picked = node;
    }
  }
  return picked;
}

function selectNode(node, focus = false) {
  state.selected = node;
  if (!node) {
    renderInspector(null);
    updateHint();
    return;
  }
  renderInspector(node.repo);
  updateHint();
  if (focus) {
    els.inspector.focus({ preventScroll: false });
  }
}

function renderInspector(repo) {
  if (!repo) {
    els.inspector.innerHTML = `
      <p class="quiet-mark">Inspector</p>
      <h3>Select a repository</h3>
      <p>Repository details appear here on focus. This carries forward the useful V1 inspector pattern with a quieter presentation.</p>
    `;
    return;
  }
  const date = repo.pushed_at || repo.updated_at || repo.created_at;
  const pushed = date ? new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Unknown";
  const description = repo.description || "No public description provided.";
  const tags = [...new Set([repo.language, ...(repo.topics || []), ...(repo.tags || [])].filter(Boolean))].slice(0, 6);
  const s26 = repo.cluster === "s26-airp"
    ? `<p class="micro-note">S26 AIRP repository: AI-assisted research software prototype. Scientific and domain-specific content is provisional and not presented as validated scientific claims.</p>`
    : "";
  els.inspector.innerHTML = `
    <p class="quiet-mark">${repo.cluster_label || "Repository"}</p>
    <h3>${escapeHtml(repo.name)}</h3>
    <p>${escapeHtml(description)}</p>
    ${s26}
    <dl>
      <div><dt>Language</dt><dd>${escapeHtml(repo.language || "Unspecified")}</dd></div>
      <div><dt>Updated</dt><dd>${pushed}</dd></div>
      <div><dt>Tags</dt><dd>${tags.length ? tags.map(escapeHtml).join(", ") : "None listed"}</dd></div>
    </dl>
    <div class="repo-actions">
      <a href="${repo.html_url}" target="_blank" rel="noreferrer">Open repository</a>
      ${repo.homepage ? `<a href="${repo.homepage}" target="_blank" rel="noreferrer">Open project</a>` : ""}
    </div>
  `;
}

function renderClusters() {
  els.clusters.innerHTML = "";
  const all = document.createElement("button");
  all.className = "cluster-chip";
  all.type = "button";
  all.textContent = `all ${state.repos.length}`;
  all.setAttribute("aria-pressed", String(state.cluster === "all"));
  all.addEventListener("click", () => {
    state.cluster = "all";
    renderClusters();
    updateVisibility();
  });
  els.clusters.append(all);
  for (const cluster of state.clusters) {
    const button = document.createElement("button");
    button.className = "cluster-chip";
    button.type = "button";
    button.style.setProperty("--cluster-color", cluster.color);
    button.textContent = `${cluster.label} ${cluster.count}`;
    button.setAttribute("aria-pressed", String(state.cluster === cluster.id));
    button.addEventListener("click", () => {
      state.cluster = state.cluster === cluster.id ? "all" : cluster.id;
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
    bar.style.height = `${8 + (week.count / max) * 88}px`;
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
    row.innerHTML = `
      <button type="button">${escapeHtml(repo.name)}</button>
      <p>${escapeHtml(repo.description || "No public description provided.")}</p>
      <small>${escapeHtml(repo.cluster_label || "Repository")}</small>
    `;
    row.querySelector("button").addEventListener("click", () => {
      const node = state.nodes.find((item) => item.repo.id === repo.id);
      selectNode(node, true);
      document.querySelector("#constellation").scrollIntoView({ behavior: "smooth", block: "start" });
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

function bindEvents() {
  els.themeInputs.forEach((input) => input.addEventListener("change", () => setTheme(input.value)));
  systemDark.addEventListener("change", () => {
    if (els.site.dataset.themeChoice === "system") {
      setTheme("system");
    }
  });
  prefersReducedMotion.addEventListener("change", () => {
    state.motion = !prefersReducedMotion.matches;
  });
  els.search.addEventListener("input", () => {
    state.query = els.search.value.trim();
    state.selected = null;
    renderInspector(null);
    updateVisibility();
  });
  els.reset.addEventListener("click", () => {
    state.query = "";
    state.cluster = "all";
    state.scale = 1;
    state.panX = 0;
    state.panY = 0;
    els.search.value = "";
    for (const node of state.nodes) {
      node.x = node.anchorX;
      node.y = node.anchorY;
      node.vx = 0;
      node.vy = 0;
    }
    selectNode(null);
    renderClusters();
    updateVisibility();
  });
  els.canvas.addEventListener("pointerdown", (event) => {
    els.canvas.setPointerCapture(event.pointerId);
    const point = onPointerPoint(event);
    const node = pickNode(point);
    state.dragging = true;
    state.lastPointer = point;
    els.canvas.classList.add("is-dragging");
    if (node) {
      selectNode(node);
    }
  });
  els.canvas.addEventListener("pointermove", (event) => {
    const point = onPointerPoint(event);
    state.hovered = pickNode(point);
    if (!state.dragging || !state.lastPointer) return;
    const dx = point.x - state.lastPointer.x;
    const dy = point.y - state.lastPointer.y;
    state.panX += dx;
    state.panY += dy;
    state.lastPointer = point;
  });
  els.canvas.addEventListener("pointerup", (event) => {
    els.canvas.releasePointerCapture(event.pointerId);
    state.dragging = false;
    state.lastPointer = null;
    els.canvas.classList.remove("is-dragging");
  });
  els.canvas.addEventListener("pointercancel", () => {
    state.dragging = false;
    state.lastPointer = null;
    els.canvas.classList.remove("is-dragging");
  });
  els.canvas.addEventListener("click", (event) => {
    const node = pickNode(onPointerPoint(event));
    if (node) {
      selectNode(node);
    } else {
      selectNode(null);
    }
  });
  els.canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const before = screenToWorld(onPointerPoint(event));
    const factor = event.deltaY < 0 ? 1.08 : 0.92;
    state.scale = Math.min(2.2, Math.max(0.56, state.scale * factor));
    const after = worldToScreen({ ...before, x: before.x, y: before.y });
    const point = onPointerPoint(event);
    state.panX += point.x - after.x;
    state.panY += point.y - after.y;
  }, { passive: false });
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== els.search) {
      event.preventDefault();
      els.search.focus();
    }
    if (event.key === "Escape") {
      els.reset.click();
    }
  });
}

async function init() {
  const storedTheme = localStorage.getItem(THEME_KEY) || "system";
  setTheme(storedTheme);
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
  requestAnimationFrame(draw);
}

init().catch((error) => {
  console.error(error);
  els.hint.textContent = "Repository data could not be loaded.";
});
