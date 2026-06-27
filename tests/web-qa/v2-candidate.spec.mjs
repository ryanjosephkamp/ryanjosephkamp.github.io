import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const forbiddenProviderPattern = /\b(grok|grokedex|grokédex|xai|x\.ai)\b/i;
const reportDir = path.resolve(".ai/design/v2-tooling-qa/reports");
const knownAxeDebt = new Set(["color-contrast"]);

async function expectNoPageOverflow(page) {
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.viewport + 1);
}

async function expectNoForbiddenVisibleCopy(page) {
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(forbiddenProviderPattern);
}

test.describe("V2 production candidate QA", () => {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`homepage renders on ${viewport.name} without page overflow`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/v2/");
      await expect(page.getByRole("heading", { name: "Ryan Kamp" })).toBeVisible();
      await expect(page.locator("header").getByRole("link", { name: "Focus" })).toHaveCount(0);
      await expect(page.locator("header").getByRole("link", { name: "CV" })).toBeVisible();
      await expect(page.locator("footer").getByRole("link", { name: "CV" })).toBeVisible();
      await expect(page.getByRole("link", { name: "UC" })).toHaveAttribute(
        "href",
        "https://www.uc.edu/",
      );
      await expect(page.getByRole("link", { name: "Dr. Yizong Cheng" })).toHaveAttribute(
        "href",
        "https://researchdirectory.uc.edu/p/chengy",
      );
      await expect(page.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
        "href",
        "https://www.linkedin.com/in/rjk1999",
      );
      await expect(page.getByRole("link", { name: "Hugging Face" })).toHaveAttribute(
        "href",
        "https://huggingface.co/ryanjosephkamp",
      );
      await expect(page.getByRole("link", { name: "Repositories" }).first()).toBeVisible();
      await expect(page.getByRole("heading", { name: "Current focus" })).toBeVisible();
      await expect(page.locator("#work")).toContainText("agentic AI systems");
      await expect(page.locator("#s26-note")).toHaveCount(0);
      await expectNoPageOverflow(page);
      await expectNoForbiddenVisibleCopy(page);
      await page.screenshot({
        path: `.ai/design/v2-tooling-qa/screenshots/v2-home-${viewport.name}-${viewport.width}x${viewport.height}.png`,
        fullPage: true,
      });
    });

    test(`repositories page renders on ${viewport.name} without page overflow`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/v2/repositories/");
      await expect(page.getByRole("heading", { name: "Public GitHub repositories" })).toBeVisible();
      await expect(page.locator("header").getByRole("link", { name: "Projects" })).toHaveCount(0);
      await expect(page.locator("header").getByRole("link", { name: "CV" })).toBeVisible();
      await expect(page.locator("footer").getByRole("link", { name: "CV" })).toBeVisible();
      await expect(page.locator("#refresh-status")).toHaveText("");
      await expect(page.getByText("Static snapshot loaded.")).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Repositories", exact: true })).toBeVisible();
      await expect(page.getByText("The graph is visual.")).toHaveCount(0);
      await expect(page.locator("#repo-canvas")).toBeVisible();
      await expect(page.locator("#repo-list article").first()).toBeVisible();
      await expect(page.locator("#repo-list .repo-updated").first()).toBeVisible();
      await expectNoPageOverflow(page);
      await expectNoForbiddenVisibleCopy(page);
      await page.screenshot({
        path: `.ai/design/v2-tooling-qa/screenshots/v2-repositories-${viewport.name}-${viewport.width}x${viewport.height}.png`,
        fullPage: true,
      });
    });
  }

  test("candidate theme, search, graph/list selection, and guardrail copy behave", async ({
    page,
  }) => {
    await page.goto("/v2/");
    await page.getByLabel("dark").check();
    await expect(page.locator("html")).toHaveAttribute("data-resolved-theme", "dark");

    await page.goto("/v2/repositories/");
    await expect(page.locator("html")).toHaveAttribute("data-resolved-theme", "dark");
    await page.getByLabel("light").check();
    await expect(page.locator("html")).toHaveAttribute("data-resolved-theme", "light");

    await page.locator("#repo-search").fill("res");
    await expect(page.locator("#filter-summary")).toContainText('matching "res"');
    await page.getByRole("button", { name: /S26 AIRP/ }).click();
    await expect(page.locator("#filter-summary")).toContainText("in S26 AIRP");
    await expect(page.locator("#repo-inspector")).toContainText("S26 AIRP");
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.locator("#filter-summary")).toHaveText(/^Showing \d+ public repositories\.$/);

    await page.locator("#activity-bars .activity-bar").first().focus();
    await expect(page.locator("#activity-detail")).toContainText(/public repositories? updated/);
    await page.locator("#repo-sort-controls").getByRole("button", { name: "name" }).click();
    await expect(
      page.locator("#repo-sort-controls").getByRole("button", { name: "name" }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.locator("#repo-sort-controls").getByRole("button", { name: "updated" }).click();
    await page.getByRole("button", { name: "50" }).click();
    await expect(page.locator("#repo-list-note")).toContainText("Showing 50 of");
    await expect(page.locator("#repo-list article")).toHaveCount(50);

    const repoLink = page.locator("#repo-list .repo-row a.repo-name").first();
    await expect(repoLink).toHaveAttribute("href", /^https:\/\/github\.com\/ryanjosephkamp\//);
    await expect(repoLink).toHaveAttribute("target", "_blank");
    await expect(page.locator("#s26-note")).toContainText("provisional");
    await expectNoForbiddenVisibleCopy(page);
  });

  test("repository list links and long names remain readable", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/v2/repositories/");
    await page.locator("#list-limit-controls").getByRole("button", { name: "all" }).click();
    await expect(page.locator("#repo-list")).toContainText(
      "facial-recognition-under-occlusion-project",
    );
    await expect(page.locator("#repo-list")).toContainText("perceptual-decision-making-capstone");
    await expect(page.locator("#repo-list")).not.toContainText(
      "UC_Graduate_Deep_Learning_Final_Project",
    );
    await expect(page.locator("#repo-list")).not.toContainText(
      "UC_Undergraduate_Research_Capstone",
    );
    const rowOverlap = await page.locator("#repo-list .repo-row").evaluateAll((rows) =>
      rows.some((row) => {
        const [name, description] = row.children;
        const nameRect = name.getBoundingClientRect();
        const descriptionRect = description.getBoundingClientRect();
        return nameRect.right > descriptionRect.left + 1 && nameRect.top === descriptionRect.top;
      }),
    );
    expect(rowOverlap).toBe(false);
  });

  test("candidate pages pass axe without unbaselined violations", async ({ page }) => {
    for (const path of ["/v2/", "/v2/repositories/"]) {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).analyze();
      await mkdir(reportDir, { recursive: true });
      await writeFile(
        `${reportDir}/axe-v2-candidate-${path.replaceAll("/", "-") || "home"}.json`,
        JSON.stringify(results.violations, null, 2),
      );
      const blockingViolations = results.violations.filter(
        (violation) => !knownAxeDebt.has(violation.id),
      );
      expect(blockingViolations, JSON.stringify(blockingViolations, null, 2)).toEqual([]);
    }
  });
});
