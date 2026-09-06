import { getDossierThemeHref } from "@/lib/dossiers/themes";
import { getLocalizedRoute, getNommerChapterRoute } from "@/lib/routing";
import { expect, test } from "@playwright/test";
import { LOCALE } from "./support/locale";

test.describe("Dossier themes @cross-viewport", () => {
  // @req REQ-140
  test("preserves English across the directory, theme and canonical dossier", async ({
    page,
  }) => {
    test.skip(LOCALE !== "en", "English copy assertion");
    await page.setViewportSize({ width: 430, height: 900 });
    await page.goto(getLocalizedRoute(LOCALE, "dossiersHub"));
    await expect(
      page.getByRole("heading", { name: "The dossiers", exact: true })
    ).toBeVisible();
    await page
      .getByRole("combobox", { name: "Choose a theme" })
      .selectOption("noms");
    await expect(page).toHaveURL(getDossierThemeHref("noms", LOCALE));
    const link = page
      .getByRole("region", { name: "Dossiers to read" })
      .getByRole("link", { name: "Who gave this name?" });
    await expect(link).toHaveAttribute(
      "href",
      getLocalizedRoute(LOCALE, "nommer")
    );
    await link.click();
    await expect(page).toHaveURL(getLocalizedRoute(LOCALE, "nommer"));
  });
  for (const width of [320, 375, 430, 768, 1199, 1200, 1440]) {
    // @req REQ-114
    test(`keeps discovery compact and readable at ${width}px`, async ({
      page,
    }) => {
      test.skip(LOCALE !== "fr", "French copy assertion");
      await page.setViewportSize({ width, height: 900 });
      await page.goto(getLocalizedRoute(LOCALE, "dossiersHub"));
      await expect(
        page.getByRole("heading", { name: "Les dossiers", exact: true })
      ).toBeVisible();
      const selector = page.getByRole("combobox", { name: "Choisir un thème" });
      const grid = page.getByTestId("dossier-theme-grid");
      if (width < 1200) {
        await expect(selector).toBeVisible();
        await expect(grid).toBeHidden();
        const inputBox = await page.getByRole("searchbox").boundingBox();
        const selectBox = await selector.boundingBox();
        expect(selectBox!.y).toBeGreaterThanOrEqual(
          inputBox!.y + inputBox!.height
        );
        expect(selectBox!.height).toBeGreaterThanOrEqual(44);
      } else {
        await expect(selector).toBeHidden();
        await expect(grid).toBeVisible();
        const columns = await grid.evaluate(
          (node) => getComputedStyle(node).gridTemplateColumns.split(" ").length
        );
        expect(columns).toBe(4);
        const rows = await grid
          .locator("a")
          .evaluateAll(
            (nodes) =>
              new Set(
                nodes.map((node) =>
                  Math.round(node.getBoundingClientRect().top)
                )
              ).size
          );
        expect(rows).toBeLessThanOrEqual(2);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      ).toBe(true);
      await page.getByRole("searchbox").fill("introuvable");
      await expect(page.getByRole("status")).toContainText("Aucun dossier");
    });
  }

  // @req REQ-114
  test("opens a theme from mobile navigation and follows its canonical dossier", async ({
    page,
  }) => {
    test.skip(LOCALE !== "fr", "French copy assertion");
    await page.setViewportSize({ width: 430, height: 900 });
    await page.goto(getLocalizedRoute(LOCALE, "dossiersHub"));
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    const tray = page.getByRole("dialog");
    await tray.getByRole("button", { name: /Les dossiers/ }).click();
    await tray.getByRole("combobox").selectOption("noms");
    await expect(page).toHaveURL(/\/dossiers\/themes\/noms$/);
    await expect(page.getByRole("dialog")).toBeHidden();
    await page
      .getByRole("region", { name: "Dossiers à lire" })
      .getByRole("link", { name: "Qui a donné ce nom ?" })
      .click();
    await expect(page).toHaveURL(/\/dossiers\/nommer$/);
    await expect(
      page.getByRole("heading", { name: "Qui a donné ce nom ?", exact: true })
    ).toBeVisible();
  });

  // @req REQ-114
  test("keeps existing chapter and anecdote deep links reachable", async ({
    page,
  }) => {
    test.skip(LOCALE !== "fr", "French copy assertion");
    for (const route of [
      getNommerChapterRoute(LOCALE, "la-personne"),
      `${getLocalizedRoute(LOCALE, "anecdotes")}?a=monrovia`,
    ]) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.locator("main")).toBeVisible();
      if (route.includes("?a="))
        await expect(page.locator("article#monrovia")).toBeVisible();
    }
    const missing = await page.goto(getDossierThemeHref("inconnu"));
    expect(missing?.status()).toBe(404);
  });
});
