import { test, expect } from "./support/fixtures";
import type { Locator, Page } from "@playwright/test";
import { getFamilyRoute } from "@/lib/routing";

// ETNI-1285 (REQ-117) — the contract anchor ARCH-015 names for the fiche
// globe: choosing a target flies the camera to it AND opens the facts panel
// WITHOUT the panel covering the subject.
//
// Sample route: the Bantu family fiche, the same large-family sample
// e2e/family-tree-a11y.spec.ts and the Lighthouse gate already rely on. A
// family footprint is the union of its member peoples' current countries, so
// this fiche carries many choosable targets — a country fiche would only ever
// carry one, which would let the geometry pass by accident.
const FICHE_GLOBE_URL = getFamilyRoute("fr", "FLG_BANTU");

// The panel is a bottom sheet below 760 px and a side panel at 760 px and
// above, so the three reference widths cover both anchorings. There is no
// @cross-viewport tag here: the widths are set per test (as in
// e2e/home-globe.spec.ts) because the 1200 px case has no Playwright project
// that also matches the 430 px one, and running the same body under four
// projects would only re-run each width under a contradicting viewport.
const BREAKPOINTS = [
  { width: 430, anchor: "bottom" },
  { width: 720, anchor: "bottom" },
  { width: 1200, anchor: "side" },
] as const;

const VIEWPORT_HEIGHT = 900;

/** Fly-to duration in the camera implementation; the settle wait may not end before it. */
const FLY_TO_DURATION_MS = 720;

/** Sub-pixel drift is the compositor, not the camera still travelling. */
const SETTLE_TOLERANCE_PX = 0.5;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Axis-aligned rectangle intersection: two boxes overlap only when they
 * overlap on both axes. Flush edges (`a.x === b.x + b.width`) read as clear —
 * a panel resting against the subject still leaves it fully visible.
 */
function rectanglesIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

/**
 * A null bounding box means the element has no layout box at all. For both
 * elements REQ-117 talks about that is a failure rather than a vacuous
 * non-overlap: a subject with no box is unreachable, and a panel with no box
 * never opened.
 */
async function laidOutBox(element: Locator, described: string): Promise<Rect> {
  const box = await element.boundingBox();
  if (!box) {
    throw new Error(
      `${described} has no bounding box — it is not laid out, so REQ-117 cannot be evaluated`
    );
  }
  return box;
}

function factsPanel(page: Page): Locator {
  return page.locator("[data-atlas-facts-panel]");
}

async function openFicheGlobe(page: Page, width: number): Promise<Locator> {
  await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
  await page.goto(FICHE_GLOBE_URL);

  const stage = page.locator("[data-atlas-stage]");
  await expect(stage).toBeVisible();
  return stage;
}

/**
 * Chooses a target and returns the mark the stage carries for it, plus the
 * country that was chosen so a later widening pass can ask for the same one.
 *
 * Two shapes, because the fiche globes ship both. A scene that pins a marker
 * per country is chosen by clicking one. A scene that offers the picker —
 * every fiche globe since the list replaced the unnamed 22px pastille — is
 * chosen from the list, and the stage then carries a single choice mark on the
 * subject. What comes back is the same thing either way: the element standing
 * for the subject, which is what the geometry below measures.
 */
async function chooseTarget(
  stage: Locator,
  countryId?: string
): Promise<{ subject: Locator; countryId: string }> {
  const picker = stage.getByRole("button", { name: /^Choisir un pays/ });

  if ((await picker.count()) === 0) {
    const marker = countryId
      ? stage.locator(`[data-atlas-target="${countryId}"]`)
      : stage.locator("[data-atlas-target]").first();

    await expect(marker).toBeVisible();
    await marker.click();
    await expect(marker).toHaveAttribute("data-atlas-target-chosen", "true");
    await expect(marker).toHaveAttribute("aria-pressed", "true");
    return {
      subject: marker,
      countryId: (await marker.getAttribute("data-atlas-target")) ?? "",
    };
  }

  await picker.click();
  const option = countryId
    ? stage.locator(`[role="option"][data-atlas-target="${countryId}"]`)
    : stage.locator("[role=option][data-atlas-target]").first();

  await expect(option).toBeVisible();
  const chosen = (await option.getAttribute("data-atlas-target")) ?? "";
  await option.click();

  const subject = stage.locator(`[data-atlas-choice="${chosen}"]`);
  await expect(subject).toBeVisible();
  await expect(subject).toHaveAttribute("data-atlas-choice-chosen", "true");
  return { subject, countryId: chosen };
}

/**
 * Waits for the fly-to to end by watching the subject itself: the camera has
 * settled once the marker has stopped moving *and* the flight has had its full
 * duration. The elapsed-time floor is what stops an easing plateau mid-flight
 * from being mistaken for the end of the animation.
 */
async function waitForCameraToSettle(marker: Locator): Promise<void> {
  const flightEndsAt = Date.now() + FLY_TO_DURATION_MS;
  let previous: Rect | null = null;

  await expect
    .poll(
      async () => {
        const current = await marker.boundingBox();
        const stable =
          previous !== null &&
          current !== null &&
          Math.abs(current.x - previous.x) < SETTLE_TOLERANCE_PX &&
          Math.abs(current.y - previous.y) < SETTLE_TOLERANCE_PX;
        previous = current;
        return stable && Date.now() >= flightEndsAt;
      },
      { message: "the chosen target's marker never came to rest" }
    )
    .toBe(true);
}

async function expectSubjectClearOfPanel(
  page: Page,
  marker: Locator,
  width: number
): Promise<void> {
  const panel = factsPanel(page);
  await expect(panel).toBeVisible();
  await waitForCameraToSettle(marker);

  const subjectBox = await laidOutBox(marker, "the chosen target's marker");
  const panelBox = await laidOutBox(panel, "the facts panel");

  expect(
    rectanglesIntersect(subjectBox, panelBox),
    `at ${width}px the subject ${JSON.stringify(subjectBox)} is covered by the facts panel ${JSON.stringify(panelBox)}`
  ).toBe(false);
}

/** The panel's rendered text, whitespace-normalised — its facts, as a reader gets them. */
async function factsText(page: Page): Promise<string> {
  const text = await factsPanel(page).innerText();
  return text.replace(/\s+/g, " ").trim();
}

test.describe("Fiche globe fly-to and facts panel (REQ-117)", () => {
  for (const { width } of BREAKPOINTS) {
    // @req REQ-117
    test(`flies to the chosen target and leaves it outside the facts panel at ${width}px`, async ({
      page,
    }) => {
      const stage = await openFicheGlobe(page, width);
      const { subject } = await chooseTarget(stage);

      await expectSubjectClearOfPanel(page, subject, width);
    });
  }

  for (const { width, anchor } of BREAKPOINTS) {
    // @req REQ-117
    test(`anchors the facts panel as a ${anchor} panel at ${width}px`, async ({
      page,
    }) => {
      const stage = await openFicheGlobe(page, width);
      await chooseTarget(stage);

      const panel = factsPanel(page);
      await expect(panel).toBeVisible();
      await expect(panel).toHaveAttribute("data-atlas-panel-anchor", anchor);
      await expect(panel.getByRole("button", { name: "Fermer" })).toBeVisible();
    });
  }

  // @req REQ-117
  test("presents the same facts whether anchored as a bottom sheet or as a side panel", async ({
    page,
  }) => {
    const bottomSheetStage = await openFicheGlobe(page, 430);
    const { countryId } = await chooseTarget(bottomSheetStage);
    expect(countryId).toBeTruthy();
    await expect(factsPanel(page)).toHaveAttribute(
      "data-atlas-panel-anchor",
      "bottom"
    );
    const bottomSheetFacts = await factsText(page);

    // Reload rather than resize: the panel is compared as each anchoring
    // renders it from scratch, which is how a reader arriving at either width
    // actually receives it.
    const sidePanelStage = await openFicheGlobe(page, 1200);
    await chooseTarget(sidePanelStage, countryId);
    await expect(factsPanel(page)).toHaveAttribute(
      "data-atlas-panel-anchor",
      "side"
    );
    const sidePanelFacts = await factsText(page);

    expect(sidePanelFacts).toBe(bottomSheetFacts);
  });

  for (const { width } of BREAKPOINTS) {
    // @req REQ-117
    test(`keeps the target reachable and the subject clear of the panel under reduced motion at ${width}px`, async ({
      page,
    }) => {
      // Reduced motion suppresses the flight, never the destination: a reader
      // who asks for no animation must still be able to choose a target and
      // read its facts beside it.
      await page.emulateMedia({ reducedMotion: "reduce" });

      const stage = await openFicheGlobe(page, width);
      const { subject } = await chooseTarget(stage);

      await expectSubjectClearOfPanel(page, subject, width);
    });
  }

  // @req REQ-117
  test("lets a target be reached and chosen from the keyboard alone", async ({
    page,
  }) => {
    const stage = await openFicheGlobe(page, 430);

    // The picker is the keyboard path on a fiche globe — the choice marks are
    // `aria-hidden` decoration, and a 7px dot was never the way in. Reaching
    // the trigger, opening the listbox and committing an option must all be
    // possible without a pointer.
    const picker = stage.getByRole("button", { name: /^Choisir un pays/ });
    await expect(picker).toBeVisible();

    // A trigger pulled out of the tab order would be focusable by script and
    // unreachable by a reader, so the tab order is asserted, not just focus.
    await expect(picker).not.toHaveAttribute("tabindex", "-1");
    await picker.focus();
    await expect(picker).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(picker).toHaveAttribute("aria-expanded", "true");

    // Opening the list moves focus into it, so the first option is already the
    // active element and Enter commits it.
    const option = stage.locator("[role=option][data-atlas-target]").first();
    await expect(option).toBeFocused();
    const countryId = (await option.getAttribute("data-atlas-target")) ?? "";
    await page.keyboard.press("Enter");

    const subject = stage.locator(`[data-atlas-choice="${countryId}"]`);
    await expect(subject).toHaveAttribute("data-atlas-choice-chosen", "true");

    await expectSubjectClearOfPanel(page, subject, 430);
  });
});
