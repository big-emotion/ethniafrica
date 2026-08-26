import { test, expect } from "./support/fixtures";

// Epic 19 LOT 8 — the reading journey the country fiche now supports:
// arrive on a fiche, operate the globe, and move to another country.
//
// Nigeria rather than the Comoros: COM is one of the six countries with no
// admin-0 outline, so its fiche renders the "contour non disponible"
// placeholder and never mounts a globe. A journey test anchored there would
// pass without any of this having shipped.
const COUNTRY_FICHE_URL = "/fr/pays/NGA";

/** Above the panel breakpoint, where the toolbar and legend are shown. */
const DESKTOP = { width: 1200, height: 900 };

test.describe("@phase-1 country fiche — the globe is operable", () => {
  // @req REQ-117
  test("names the globe surface and puts it in the tab order", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(COUNTRY_FICHE_URL);

    const surface = page.locator("[data-atlas-surface]");
    await expect(surface).toHaveAttribute("aria-label", /globe/i);
    await expect(surface).toHaveAttribute("tabindex", "0");
  });

  // @req REQ-117
  test("offers the projection toggle and says what pressing it does", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(COUNTRY_FICHE_URL);

    const toggle = page.getByRole("button", {
      name: "Ce que la carte plate en fait",
    });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    await toggle.click();

    await expect(
      page.getByRole("button", { name: "Revenir au globe" })
    ).toHaveAttribute("aria-pressed", "true");
  });

  // @req REQ-117
  test("recentring returns the globe and the projection together", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(COUNTRY_FICHE_URL);

    await page
      .getByRole("button", { name: "Ce que la carte plate en fait" })
      .click();
    await page.getByRole("button", { name: "Recentrer" }).click();

    await expect(
      page.getByRole("button", { name: "Ce que la carte plate en fait" })
    ).toHaveAttribute("aria-pressed", "false");
  });
});

test.describe("@phase-1 country fiche — moving to another country", () => {
  // @req REQ-117
  test("the picker lists the corpus and navigates to the chosen fiche", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(COUNTRY_FICHE_URL);

    await page.getByRole("button", { name: /Changer de pays/ }).click();

    const options = page.getByRole("option");
    await expect(options.first()).toBeVisible();

    // The six countries without geometry still have a fiche, so they are
    // offered: the list is drawn from the corpus, not the admin-0 asset.
    await expect(page.getByRole("option", { name: /Comores/ })).toBeVisible();

    await page.getByRole("option", { name: /Kenya/ }).click();

    // The unversioned form: a bare slug renders directly, so choosing a
    // country costs no redirect.
    await expect(page).toHaveURL(/\/fr\/pays\/KEN$/);
  });

  // @req REQ-117
  test("a country with no outline says so instead of showing an empty globe", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/fr/pays/COM");

    await expect(page.getByText(/Contour non disponible/)).toBeVisible();
  });
});
