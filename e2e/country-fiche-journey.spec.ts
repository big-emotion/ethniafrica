import { test, expect } from "./support/fixtures";
import { getCountryRoute } from "@/lib/routing";

// Epic 19 LOT 8 — the reading journey the country fiche now supports:
// arrive on a fiche, operate the globe, and move to another country.
//
// Nigeria rather than the Comoros: COM is one of the six countries with no
// admin-0 outline, so its fiche renders the "contour non disponible"
// placeholder and never mounts a globe. A journey test anchored there would
// pass without any of this having shipped.
const COUNTRY_FICHE_URL = getCountryRoute("fr", "NGA");

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
  test("the picker lists the corpus and re-aims the globe at the chosen country", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(COUNTRY_FICHE_URL);

    await page.getByRole("button", { name: /^Choisir un pays/ }).click();

    const options = page.getByRole("option");
    await expect(options.first()).toBeVisible();

    // The list is drawn from the corpus, so a country whose outline the
    // admin-0 asset once lacked is offered like any other.
    await expect(page.getByRole("option", { name: /Comores/ })).toBeVisible();

    await page.getByRole("option", { name: /Kenya/ }).click();

    // The picker moved inside the globe, and that is what changed the contract
    // it is under: the camera belongs to AtlasGlobe, so choosing re-aims it and
    // opens the country's facts beside it. It no longer loads another fiche —
    // a control outside the globe could only ever have navigated, and this one
    // is not outside it. The address therefore stays put.
    await expect(page).toHaveURL(new RegExp(`${COUNTRY_FICHE_URL}$`));
    await expect(page.locator("[data-atlas-facts-panel]")).toContainText(
      "Kenya"
    );
  });

  // Comores was the example of a country the admin-0 asset had no rings for,
  // and it is not one any more: all 58 entries carry geometry, so no country
  // in the corpus reaches the placeholder. The branch itself still has a
  // guard — `AtlasGlobe.test.tsx` renders a null overlay and asserts the note
  // — so what is asserted here is the state that replaced it: the fiche draws
  // its country rather than apologising for it.
  // @req REQ-117
  test("a country whose outline the asset now carries draws it", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(getCountryRoute("fr", "COM"));

    await expect(page.locator("[data-atlas-stage]")).toBeVisible();
    await expect(page.getByText(/Contour non disponible/)).toHaveCount(0);
  });
});
