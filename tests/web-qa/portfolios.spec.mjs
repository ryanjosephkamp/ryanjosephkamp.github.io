import { expect, test } from "@playwright/test";

const slugs = [
  "anagram-tiles",
  "one-splat",
  "specimen",
  "toybox",
  "workshop",
  "overprint",
  "molecule",
  "resonance",
  "slice",
  "atlas",
  "arcade",
];

async function expectNoPageOverflow(page) {
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.viewport + 1);
}

async function navOrder(page, where) {
  return page
    .locator(`${where} nav a`)
    .evaluateAll((links) => links.map((a) => a.textContent.trim()));
}

test.describe("portfolios", () => {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`gallery renders on ${viewport.name} without page overflow`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/portfolios/");
      await expect(page).toHaveTitle("Portfolios - Ryan Kamp");
      await expect(page.getByRole("heading", { name: "Portfolios", level: 1 })).toBeVisible();
      await expect(page.locator(".poster")).toHaveCount(slugs.length);
      await expect(page.locator("header .nav-portfolios")).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("heading", { name: "Take one home" })).toBeVisible();
      for (const slug of slugs) {
        await expect(page.locator(`.poster[data-slug="${slug}"] .poster__title a`)).toHaveAttribute(
          "href",
          `./${slug}/`,
        );
      }
      await expectNoPageOverflow(page);
    });
  }

  test("Portfolios sits between Home and Repositories on every page with the header", async ({
    page,
  }) => {
    for (const url of ["/", "/repositories/", "/portfolios/"]) {
      await page.goto(url);
      const header = await navOrder(page, "header");
      expect(header.slice(0, 3)).toEqual(["Home", "Portfolios", "Repositories"]);
      const footer = await navOrder(page, "footer");
      expect(footer).toContain("Portfolios");
    }
  });

  test("every portfolio opens", async ({ request }) => {
    for (const slug of slugs) {
      const response = await request.get(`/portfolios/${slug}/`);
      expect(response.status(), slug).toBe(200);
      expect(await response.text(), slug).toContain("Ryan Kamp");
    }
  });
});
