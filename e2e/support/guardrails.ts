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
// Two conditions, and the second is what stops the exception swallowing the
// rule. The element must be inline-level — a `block` or `flex` control has a
// box of its own choosing and owes the full target — *and* its parent must
// hold text the element does not, which is what "in a sentence" means. A nav
// list fails that second test: an `<li>` whose whole content is one link is a
// control in a list, not a word in a paragraph, and it is not exempt. That is
// why the footer, the breadcrumb trail and the source list were all fixed at
// source rather than excused here.
//
// Inline-level rather than exactly `inline`, because a footnote callout is a
// `<button>`: `[1]` measures 19×12px because it is a superscript inside a
// sentence, and it is the very case the exception is written for.
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
          // A sentence around the control is what makes it inline *text*; a
          // run of links with nothing else in the block is a control strip
          // that merely happens to be laid out inline, and it is not exempt.
          //
          // The comparison is made against the containing *block*, not the
          // immediate parent: a footnote callout is wrapped in a `<sup>` that
          // holds nothing but the callout, so asking the parent would say
          // "alone in its element" about a marker sitting mid-paragraph.
          constrainedByLineHeight: (() => {
            if (!getComputedStyle(element).display.startsWith("inline")) {
              return false;
            }
            let block = element.parentElement;
            while (
              block &&
              getComputedStyle(block).display.startsWith("inline")
            ) {
              block = block.parentElement;
            }
            return (
              (block?.textContent ?? "").trim() !==
              (element.textContent ?? "").trim()
            );
          })(),
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
