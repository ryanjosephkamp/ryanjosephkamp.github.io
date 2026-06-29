import { expect, test } from "@playwright/test";

const blockedProviderTerm = "x." + "ai";

function repoFixture(overrides = {}) {
  const name = overrides.name || "fixture-repository";
  const id = overrides.id || 9000;
  return {
    id,
    name,
    full_name: overrides.full_name || `ryanjosephkamp/${name}`,
    html_url: overrides.html_url || `https://github.com/ryanjosephkamp/${name}`,
    description: overrides.description ?? "Fixture public repository.",
    homepage: overrides.homepage || "",
    topics: overrides.topics || [],
    language: overrides.language ?? "JavaScript",
    created_at: overrides.created_at || "2025-01-01T00:00:00Z",
    updated_at: overrides.updated_at || "2026-06-18T12:00:00Z",
    pushed_at: overrides.pushed_at || overrides.updated_at || "2026-06-18T12:00:00Z",
    fork: Boolean(overrides.fork),
    archived: Boolean(overrides.archived),
    disabled: Boolean(overrides.disabled),
    stargazers_count: overrides.stargazers_count || 0,
    forks_count: overrides.forks_count || 0,
    watchers_count: overrides.watchers_count || 0,
    open_issues_count: overrides.open_issues_count || 0,
    default_branch: overrides.default_branch || "main",
    size: overrides.size || 128,
    ...(overrides.cluster
      ? {
          cluster: overrides.cluster,
          cluster_label: overrides.cluster_label,
          cluster_color: overrides.cluster_color,
          secondary_clusters: overrides.secondary_clusters || [],
          tags: overrides.tags || [overrides.language].filter(Boolean),
        }
      : {}),
  };
}

function snapshotFixture(repos) {
  return {
    generated_at: "2026-06-29T00:00:00.000Z",
    owner: "ryanjosephkamp",
    source: {
      endpoint: "fixture",
      authentication: "none",
      pages_fetched: 1,
      repo_count_raw: repos.length,
      repo_count_included: repos.length,
      repo_count_filtered_out: 0,
      filtered_out: [],
    },
    clusters: [],
    repos,
  };
}

async function fulfillJson(route, body, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function installRepositoryRoutes(page, { snapshotRepos, refreshRepos, failRefresh = false }) {
  const apiRequests = [];
  await page.route("**/repositories/data/repos.snapshot.json", (route) =>
    fulfillJson(route, snapshotFixture(snapshotRepos)),
  );
  await page.route("https://api.github.com/users/ryanjosephkamp/repos**", (route) => {
    apiRequests.push(route.request().url());
    if (failRefresh) {
      return fulfillJson(route, { message: "fixture failure" }, 503);
    }
    return fulfillJson(route, refreshRepos);
  });
  return apiRequests;
}

async function expectNoPageOverflow(page) {
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.viewport + 1);
}

const baseSnapshotRepos = [
  repoFixture({
    id: 1001,
    name: "the-s26-seed-prototype",
    description: "S26 AIRP fixture prototype.",
    language: "Python",
    topics: ["s26-airp"],
    cluster: "s26-airp",
    cluster_label: "S26 AIRP",
    cluster_color: "#12b886",
    tags: ["Python", "s26-airp"],
    updated_at: "2026-06-24T12:00:00Z",
  }),
  repoFixture({
    id: 1002,
    name: "legacy-data-lab",
    description: "Original data tooling description.",
    language: "JavaScript",
    topics: ["data"],
    cluster: "data-tooling",
    cluster_label: "Data and Tooling",
    cluster_color: "#4dabf7",
    tags: ["JavaScript", "data"],
    updated_at: "2026-06-17T12:00:00Z",
  }),
  repoFixture({
    id: 1003,
    name: "disappearing-private-probe",
    description: "Fixture that models a public repo omitted by later API responses.",
    language: "Ruby",
    topics: ["removed"],
    cluster: "research-software",
    cluster_label: "Research Software",
    cluster_color: "#18c3d7",
    tags: ["Ruby", "removed"],
    updated_at: "2026-06-10T12:00:00Z",
  }),
];

const refreshedApiRepos = [
  repoFixture({
    id: 1001,
    name: "the-s26-seed-prototype",
    description: "S26 AIRP fixture prototype refreshed from public metadata.",
    language: "Python",
    topics: ["s26-airp"],
    updated_at: "2026-06-26T12:00:00Z",
  }),
  repoFixture({
    id: 1002,
    name: "renamed-data-lab",
    description: "Updated command-line data automation toolkit.",
    language: "TypeScript",
    topics: ["data", "cli", "automation"],
    homepage: "https://example.com/renamed-data-lab",
    updated_at: "2026-06-27T12:00:00Z",
  }),
  repoFixture({
    id: 1004,
    name: "agent-benchmark-lab",
    description: "AI evaluation benchmark tooling fixture.",
    language: "Python",
    topics: ["ai", "benchmarking", "evaluation"],
    updated_at: "2026-06-28T12:00:00Z",
  }),
  repoFixture({
    id: 1005,
    name: "quiet-stone",
    description: "",
    language: null,
    topics: [],
    updated_at: "2026-06-25T12:00:00Z",
  }),
  repoFixture({
    id: 1006,
    name: "blocked-provider-probe",
    description: `Fixture containing ${blockedProviderTerm} provider text that must be filtered.`,
    language: "Markdown",
    topics: [],
    updated_at: "2026-06-29T12:00:00Z",
  }),
];

test.describe("V2 repository lifecycle refresh QA", () => {
  test("mocked public refresh applies add, rename, metadata, removal, fallback, and guardrail changes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const apiRequests = await installRepositoryRoutes(page, {
      snapshotRepos: baseSnapshotRepos,
      refreshRepos: refreshedApiRepos,
    });

    await page.goto("/repositories/");
    await expect(page.locator("#repo-list")).toContainText("legacy-data-lab");
    await expect(page.locator("#repo-list")).toContainText("disappearing-private-probe");
    await expect(page.locator("#repo-list")).not.toContainText("agent-benchmark-lab");
    await expect(page.locator("#filter-summary")).toHaveText("Showing 3 public repositories.");

    await page.getByRole("button", { name: "Refresh from GitHub" }).click();
    await expect(page.locator("#refresh-status")).toHaveText(
      "Loaded 4 public repositories from GitHub.",
    );
    expect(apiRequests).toHaveLength(1);

    const repoList = page.locator("#repo-list");
    await expect(repoList).toContainText("the-s26-seed-prototype");
    await expect(repoList).toContainText("renamed-data-lab");
    await expect(repoList).toContainText("Updated command-line data automation toolkit.");
    await expect(repoList).toContainText("agent-benchmark-lab");
    await expect(repoList).toContainText("quiet-stone");
    await expect(repoList).not.toContainText("legacy-data-lab");
    await expect(repoList).not.toContainText("disappearing-private-probe");
    await expect(repoList).not.toContainText("blocked-provider-probe");
    await expect(page.locator("body")).not.toContainText(blockedProviderTerm);

    await expect(page.getByRole("button", { name: "All (4)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "S26 AIRP (1)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Data and Tooling (1)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "AI and ML (1)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Other / Review (1)" })).toBeVisible();

    await page.locator("#repo-search").fill("benchmark");
    await expect(page.locator("#filter-summary")).toContainText('matching "benchmark"');
    await expect(repoList).toContainText("agent-benchmark-lab");
    await page.locator("#repo-search").fill("");

    await page.getByRole("button", { name: "Other / Review (1)" }).click();
    await expect(page.locator("#filter-summary")).toContainText("in Other / Review");
    await expect(repoList).toContainText("quiet-stone");
    await expect(repoList).not.toContainText("agent-benchmark-lab");
    await page.getByRole("button", { name: "All (4)" }).click();

    const renamedLink = page.locator("#repo-list .repo-row a.repo-name", {
      hasText: "renamed-data-lab",
    });
    await expect(renamedLink).toHaveAttribute(
      "href",
      "https://github.com/ryanjosephkamp/renamed-data-lab",
    );
    await expect(renamedLink).toHaveAttribute("target", "_blank");

    await expect(page.locator("#graph-mode").getByRole("button", { name: "2D" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.locator("#graph-mode").getByRole("button", { name: "3D" }).click();
    await expect(page.locator("#repo-canvas")).toHaveAttribute("data-graph-mode", "3d");
    await expect(page.locator("#repo-list-note")).toContainText("Showing all 4 matching");
    await expectNoPageOverflow(page);
    await page.screenshot({
      path: ".ai/design/v2-tooling-qa/screenshots/v2-repository-lifecycle-refresh.png",
      fullPage: true,
    });
  });

  test("mocked public refresh failure preserves the loaded snapshot", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const apiRequests = await installRepositoryRoutes(page, {
      snapshotRepos: baseSnapshotRepos,
      refreshRepos: [],
      failRefresh: true,
    });

    await page.goto("/repositories/");
    await expect(page.locator("#filter-summary")).toHaveText("Showing 3 public repositories.");
    await page.getByRole("button", { name: "Refresh from GitHub" }).click();

    await expect(page.locator("#refresh-status")).toHaveText(
      "GitHub refresh unavailable; keeping the static snapshot.",
    );
    expect(apiRequests).toHaveLength(1);
    await expect(page.locator("#repo-list")).toContainText("legacy-data-lab");
    await expect(page.locator("#repo-list")).toContainText("disappearing-private-probe");
    await expect(page.locator("#repo-list")).not.toContainText("agent-benchmark-lab");
    await expect(page.locator("#filter-summary")).toHaveText("Showing 3 public repositories.");
    await expectNoPageOverflow(page);
    await page.screenshot({
      path: ".ai/design/v2-tooling-qa/screenshots/v2-repository-lifecycle-refresh-failure.png",
      fullPage: true,
    });
  });
});
