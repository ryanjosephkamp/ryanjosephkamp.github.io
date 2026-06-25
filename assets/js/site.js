const projectGrid = document.querySelector("#project-grid");
const projectStatus = document.querySelector("#project-status");
const filterButtons = Array.from(document.querySelectorAll(".filter-button"));

function projectLinkMarkup(project) {
  const links = [];

  if (project.github) {
    links.push(`<a href="${project.github}">GitHub</a>`);
  }

  if (project.demo) {
    links.push(`<a href="${project.demo}">Live site</a>`);
  }

  if (project.docs) {
    links.push(`<a href="${project.docs}">Docs</a>`);
  }

  if (project.article) {
    links.push(`<a href="${project.article}">Article</a>`);
  }

  return links.join("");
}

function renderProjects(projects, filter = "all") {
  if (!projectGrid) return;

  const visibleProjects = filter === "all"
    ? projects
    : projects.filter((project) => project.categories.includes(filter));

  projectGrid.innerHTML = visibleProjects.map((project) => `
    <article class="project-card" data-featured="${project.featured ? "true" : "false"}">
      <div class="project-meta">
        <span>${project.type}</span>
      </div>
      <h3><a href="${project.primaryUrl}">${project.title}</a></h3>
      <p>${project.summary}</p>
      <div class="project-tags" aria-label="${project.title} tags">
        ${project.tags.map((tag) => `<span>${tag}</span>`).join("")}
      </div>
      <div class="project-links">
        ${projectLinkMarkup(project)}
      </div>
    </article>
  `).join("");

  if (projectStatus) {
    projectStatus.textContent = `${visibleProjects.length} projects shown`;
  }
}

async function loadProjects() {
  if (!projectGrid) return;

  try {
    const response = await fetch("assets/data/projects.json");
    if (!response.ok) {
      throw new Error(`Project data request failed: ${response.status}`);
    }

    const projects = await response.json();
    renderProjects(projects);

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        filterButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        renderProjects(projects, button.dataset.filter);
      });
    });
  } catch (error) {
    projectGrid.innerHTML = `
      <article class="project-card">
        <h3>Selected projects</h3>
        <p>Project data could not be loaded in this browsing context. Visit GitHub for the current repository list.</p>
        <div class="project-links">
          <a href="https://github.com/ryanjosephkamp?tab=repositories">GitHub repositories</a>
        </div>
      </article>
    `;
    if (projectStatus) projectStatus.textContent = "Project data could not be loaded";
    console.warn(error);
  }
}

loadProjects();
