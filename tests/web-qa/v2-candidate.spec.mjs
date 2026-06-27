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
      await expect(page.getByRole("link", { name: "Repositories" }).first()).toBeVisible();
      await expect(page.getByRole("heading", { name: "Current focus" })).toBeVisible();
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
      await expect(page.locator("#repo-canvas")).toBeVisible();
      await expect(page.locator("#repo-list article").first()).toBeVisible();
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
    await page.getByRole("button", { name: "50" }).click();
    await expect(page.locator("#repo-list-note")).toContainText("Showing 50 of");
    await expect(page.locator("#repo-list article")).toHaveCount(50);

    await page.locator("#repo-list button").first().click();
    await expect(page.locator("#repo-inspector h2")).toBeVisible();
    await expect(page.locator("#s26-note")).toContainText("provisional");
    await expectNoForbiddenVisibleCopy(page);
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
