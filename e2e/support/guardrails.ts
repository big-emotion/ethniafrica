import { expect, type Page, type Locator } from "@playwright/test";

// Emotion-guardrail helpers per TEA Test Design R-10 / UX spec L142–150.
// Each helper is a negative assertion against the reading surface — the things
// the UX spec says must NEVER appear. These run on every reading-surface page
// in cross-cutting/emotion-guardrails.spec.ts.

// "No popup / cookie / signup wall on first paint."
// Pre-asserts the absence of common interrupter patterns on the reading surface.
export async function expectNoPopupsOrWalls(page: Page): Promise<void> {
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  await expect(page.locator("[data-cookie-banner]")).toHaveCount(0);
  await expect(page.locator("[data-newsletter-popup]")).toHaveCount(0);
  await expect(page.locator("[data-paywall]")).toHaveCount(0);
  await expect(page.locator("[data-signup-wall]")).toHaveCount(0);
}

// "No leaderboards / engagement counters / avatar pile-ups."
// UX spec L194: "no avatar pile-ups, no leaderboards, no engagement counters".
export async function expectNoLeaderboardsOrCounters(
  page: Page
): Promise<void> {
  await expect(page.locator("[data-leaderboard]")).toHaveCount(0);
  await expect(page.locator("[data-engagement-counter]")).toHaveCount(0);
  await expect(page.locator("[data-avatar-pile]")).toHaveCount(0);
}

// "No autoplay media."
// UX spec L94: "prefers-reduced-motion respected; no autoplay".
export async function expectNoAutoplayMedia(page: Page): Promise<void> {
  await expect(page.locator("video[autoplay]")).toHaveCount(0);
  await expect(page.locator("audio[autoplay]")).toHaveCount(0);
}

// "Tap targets ≥ 44 × 44 px."
// UX spec L62: minimum tap target on the reading surface.
// We sweep all interactive elements visible on the page and assert each meets
// the floor. Hidden elements are skipped (offscreen menus, drawers).
//
// Inline links in running text are exempt, which is WCAG 2.5.8's own
// "Inline" exception: "the target is in a sentence, or its size is otherwise
// constrained by the line-height of non-target text". A fiche naming twelve
// patronyms inside a paragraph offers twelve targets 23px tall because that
// is what a line of prose measures — padding them to 44px would set the
// sentence double-spaced, and the sweep counted 113 of them on the Comoros
// fiche alone, burying the handful of real offenders.
//
// The exception is read off the computed display rather than guessed from the
// tag: an author who writes `inline-flex`, `inline-block` or `block` on a link
// has given it a box of their own choosing, and that box owes the full target.
export async function expectTapTargetsAtLeast44px(
  page: Page,
  threshold = 44
): Promise<void> {
  const interactiveSelector =
    'a, button, [role="button"], [role="link"], input:not([type="hidden"]), select, textarea';
  const handles = await page.locator(interactiveSelector).all();
  const violations: Array<{ tag: string; w: number; h: number; text: string }> =
    [];
  for (const handle of handles) {
    if (!(await handle.isVisible())) continue;
    const box = await handle.boundingBox();
    if (!box) continue;
    if (box.width < threshold || box.height < threshold) {
      const { tag, constrainedByLineHeight } = await handle.evaluate((node) => {
        const element = node as HTMLElement;
        return {
          tag: element.tagName.toLowerCase(),
          // A sentence around the link is what makes it inline *text*; a run
          // of links with nothing else in the block is a control strip that
          // merely happens to be laid out inline, and it is not exempt.
          constrainedByLineHeight:
            getComputedStyle(element).display === "inline" &&
            (element.parentElement?.textContent ?? "").trim() !==
              (element.textContent ?? "").trim(),
        };
      });
      if (constrainedByLineHeight) continue;
      const text = (await handle.textContent())?.trim().slice(0, 40) ?? "";
      violations.push({
        tag,
        w: Math.round(box.width),
        h: Math.round(box.height),
        text,
      });
    }
  }
  expect(
    violations,
    `Found ${violations.length} interactive element(s) under ${threshold}px:\n` +
      violations
        .map((v) => `  - <${v.tag}> ${v.w}×${v.h}px "${v.text}"`)
        .join("\n")
  ).toEqual([]);
}

// "No red on classification-status indicators."
// UX spec L171/182: classification status is calm scholarly humility, not warning.
// We resolve the computed text color of [data-classification-status] and assert
// it is NOT a red hue.
export async function expectClassificationStatusNotRed(
  locator: Locator
): Promise<void> {
  const color = await locator.evaluate((el) => getComputedStyle(el).color);
  // Parse "rgb(r, g, b)" or "rgba(r, g, b, a)".
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  expect(match, `Could not parse color "${color}"`).not.toBeNull();
  const [, rStr, gStr, bStr] = match!;
  const r = Number(rStr);
  const g = Number(gStr);
  const b = Number(bStr);
  // "Red hue" = red dominant and saturated. Tolerant of muted earthen ochres
  // (the design palette) where r > g + 80 would be the alarmist boundary.
  const isAlarmistRed = r > 180 && r > g + 80 && r > b + 80;
  expect(
    isAlarmistRed,
    `Classification status color rgb(${r}, ${g}, ${b}) reads as alarmist red.`
  ).toBe(false);
}

// "95 % rule — pinned banner not visible on live URL."
// UX spec L64: pinned-version UX must not pollute default reading flow.
export async function expectNoPinnedBannerOnLive(page: Page): Promise<void> {
  await expect(page.locator("[data-pinned-banner]")).toHaveCount(0);
}
