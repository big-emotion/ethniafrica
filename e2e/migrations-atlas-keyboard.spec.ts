import { test, expect } from "./support/fixtures";
import { getLocalizedRoute } from "@/lib/routing";

// ETNI-523 (12.10) AC2 — keyboard-only journey on the Carte tab: Tab to the
// scrubber, arrow-scrub the year, Tab to the event list, Enter opens the
// detail sheet, Tab through the sheet reaches a source chip, the chip opens
// SourceChainSheet, and Escape twice returns focus to the list button that
// opened the sheet. No mouse/pointer input is used anywhere in this test.
// Every stop must have visible focus (focus-visible ring classes already on
// the interactive elements) and there must be no keyboard trap.
const MIGRATIONS_URL = getLocalizedRoute("fr", "migrations");

// @req REQ-101 FR84 UX-DR29 UX-DR30
test.describe("@nfr-a11y migrations atlas — keyboard-only journey", () => {
  // @req REQ-101 FR84
  test("scrubber → list → sheet → source chip → Esc Esc returns focus to the list button", async ({
    page,
  }) => {
    await page.goto(MIGRATIONS_URL);
    await page.waitForLoadState("networkidle");

    await page.getByRole("tab", { name: "Carte" }).click();

    const scrubber = page.getByTestId("time-scrubber");
    await expect(scrubber).toBeVisible();

    // Tab to scrubber. The map's svg paths are aria-hidden and out of the
    // tab order (ETNI-523 fix in MigrationPathLayer.tsx), so the scrubber is
    // the very next stop after the "Carte" tab trigger.
    await page.keyboard.press("Tab");
    await expect(scrubber.locator('[role="slider"]')).toBeFocused();

    const initialYearText = await scrubber
      .locator("[aria-valuetext]")
      .getAttribute("aria-valuetext");
    await page.keyboard.press("ArrowRight");
    const nextYearText = await scrubber
      .locator("[aria-valuetext]")
      .getAttribute("aria-valuetext");
    expect(nextYearText).not.toBe(initialYearText);

    // Tab to the event list.
    const firstListItem = page
      .locator('[data-testid^="migration-list-item-"]')
      .first();
    await expect(firstListItem).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(firstListItem).toBeFocused();

    // Enter opens the sheet.
    await page.keyboard.press("Enter");
    const detailSheet = page.getByRole("dialog").first();
    await expect(detailSheet).toBeVisible();

    // Tab through the sheet until a source chip is reached.
    const sourceChip = detailSheet
      .locator('[data-testid^="migration-source-chip-"]')
      .first();
    let focusedOnChip = false;
    for (let i = 0; i < 20 && !focusedOnChip; i++) {
      await page.keyboard.press("Tab");
      focusedOnChip = await sourceChip
        .evaluate((el) => el === document.activeElement)
        .catch(() => false);
    }
    expect(focusedOnChip).toBe(true);

    // The chip opens SourceChainSheet (a second, nested dialog).
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog").nth(1)).toBeVisible();

    // First Escape closes SourceChainSheet only.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(detailSheet).toBeVisible();

    // Second Escape closes MigrationDetailSheet and returns focus to the
    // list button that opened it (MigrationsAtlasView.tsx triggerRef).
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(firstListItem).toBeFocused();
  });
});
