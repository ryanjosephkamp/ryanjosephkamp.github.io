import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const prototypeUrl = "/prototypes/v2-silent-source-constellation/";
const screenshotDir = path.resolve(".ai/design/v2-tooling-qa/screenshots");
const reportDir = path.resolve(".ai/design/v2-tooling-qa/reports");
const excludedVisibleCopy = /\b(grok|grokedex|grokédex|xai|x\.ai)\b/i;
const knownAxeDebt = new Set(["color-contrast"]);

async function openPrototype(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(prototypeUrl);
  await expect(page.locator("#repo-canvas")).toBeVisible();
  await expect
    .poll(async () => page.locator("#cluster-row button").count(), {
      message: "cluster filters should render after repository data loads",
    })
    .toBeGreaterThan(0);
  await expect
    .poll(async () => page.locator("#repo-list .repo-row").count(), {
      message: "accessible repository list should render after repository data loads",
    })
    .toBeGreaterThan(0);
}

async function expectNoPageOverflow(page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      bodyOverflow: body.scrollWidth - body.clientWidth,
      documentOverflow: doc.scrollWidth - doc.clientWidth,
    };
  });
  expect(overflow.documentOverflow).toBeLessThanOrEqual(1);
  expect(overflow.bodyOverflow).toBeLessThanOrEqual(1);
}

async function saveScreenshot(page, name) {
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: path.join(screenshotDir, `${name}.png`),
  });
}

async function visibleBodyText(page) {
  return page.locator("body").innerText();
}

test.describe("V2 paper-minimal prototype QA", () => {
  test("renders on desktop and mobile without page overflow", async ({ page }) => {
    await openPrototype(page, { width: 1440, height: 1000 });
    await expect(page.getByRole("heading", { name: "Ryan Kamp", level: 1 })).toBeVisible();
    await expectNoPageOverflow(page);
    await saveScreenshot(page, "desktop-1440x1000");

    await openPrototype(page, { width: 390, height: 844 });
    await expectNoPageOverflow(page);
    await saveScreenshot(page, "mobile-390x844");
  });

  test("theme control, search, list selection, and guardrail copy behave", async ({ page }) => {
    await openPrototype(page, { width: 1440, height: 1000 });

    await page.getByRole("radio", { name: "dark" }).check();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.resolvedTheme))
      .toBe("dark");

    await page.getByRole("radio", { name: "light" }).check();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.resolvedTheme))
      .toBe("light");

    await page.getByLabel("Search").fill("brrrdle");
    await expect
      .poll(async () => page.locator("#repo-list .repo-row").count(), {
        message: "search should keep matching repositories in the text fallback",
      })
      .toBeGreaterThan(0);

    const firstRepository = page.locator("#repo-list .repo-row button").first();
    const repositoryName = await firstRepository.innerText();
    await firstRepository.click();
    await expect(page.locator("#repo-inspector h3")).toHaveText(repositoryName);
    await expect(page.locator("#repo-inspector")).toContainText("Cluster");

    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByLabel("Search")).toHaveValue("");
    await expect
      .poll(async () => page.locator("#repo-list .repo-row").count(), {
        message: "reset should restore the capped accessible repository list",
      })
      .toBeGreaterThan(10);

    await expect(visibleBodyText(page)).resolves.not.toMatch(excludedVisibleCopy);
  });

  test("reports axe findings and blocks unbaselined accessibility violations", async ({ page }) => {
    await openPrototype(page, { width: 1440, height: 1000 });
    const results = await new AxeBuilder({ page }).analyze();
    await mkdir(reportDir, { recursive: true });
    await writeFile(
      path.join(reportDir, "axe-v2-prototype.json"),
      JSON.stringify(results.violations, null, 2),
    );
    const blockingViolations = results.violations.filter(
      (violation) => !knownAxeDebt.has(violation.id),
    );
    expect(blockingViolations, JSON.stringify(blockingViolations, null, 2)).toEqual([]);
  });
});
