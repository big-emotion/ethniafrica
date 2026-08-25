import AxeBuilder from "@axe-core/playwright";
import type { Page, Locator } from "@playwright/test";
import { test, expect } from "./support/fixtures";

// ETNI-500 (10.11) AC1 — axe-core zero serious/critical across the quiz
// session states that the static /fr/quiz audit cannot reach (picker is
// covered by scripts/a11y-test.ts; the segment-picked question/reveal and
// score states only exist client-side, per session, per FR67/FR68/FR71).
// Runs on the mobile-430 project (source-of-truth viewport per
// playwright.config.ts) with no continue-on-error in e2e.yml, so a
// violation here fails the required CI check.
const QUIZ_URL = "/fr/quiz";
const QUESTIONS_PER_SESSION = 8;

async function expectNoSeriousOrCriticalViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical"
  );

  expect(
    blocking,
    blocking
      .map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s)) — ${v.helpUrl}`
      )
      .join("\n")
  ).toEqual([]);
}

async function pickFirstLaunchableSegment(page: Page) {
  const segmentButtons = page.getByRole("listitem");
  const count = await segmentButtons.count();
  for (let i = 0; i < count; i++) {
    const button = segmentButtons.nth(i);
    if (await button.isEnabled()) {
      await button.click();
      return;
    }
  }
  throw new Error(
    "No launchable quiz segment found — the seeded test data has no active questions in any rung."
  );
}

async function answerCurrentQuestion(page: Page) {
  await expect(page.getByRole("radiogroup")).toBeVisible();
  await page.getByRole("radio").first().click();
  await page.getByRole("button", { name: "Valider" }).click();
}

async function advanceFromReveal(page: Page) {
  const reveal = page.getByTestId("quiz-answer-reveal");
  await expect(reveal).toBeVisible();
  await reveal
    .getByRole("button", { name: /Question suivante|Voir le score/ })
    .click();
}

async function playFullQuizSession(page: Page) {
  for (let i = 0; i < QUESTIONS_PER_SESSION; i++) {
    await answerCurrentQuestion(page);
    await advanceFromReveal(page);
  }
  await expect(page.getByTestId("quiz-score-screen")).toBeVisible();
}

// @req REQ-103 FR71
test.describe("@nfr-a11y quiz session — axe-core", () => {
  // @req REQ-103 FR71
  test("has zero serious/critical violations on the segment picker", async ({
    page,
  }) => {
    await page.goto(QUIZ_URL);
    await page.waitForLoadState("networkidle");

    await expectNoSeriousOrCriticalViolations(page);
  });

  // @req REQ-103 FR67 FR68 FR71
  test("has zero serious/critical violations mid-session (question + reveal)", async ({
    page,
  }) => {
    await page.goto(QUIZ_URL);
    await page.waitForLoadState("networkidle");
    await pickFirstLaunchableSegment(page);

    await expect(page.getByRole("radiogroup")).toBeVisible();
    await expectNoSeriousOrCriticalViolations(page);

    await page.getByRole("radio").first().click();
    await page.getByRole("button", { name: "Valider" }).click();
    await expect(page.getByTestId("quiz-answer-reveal")).toBeVisible();
    await expectNoSeriousOrCriticalViolations(page);
  });

  // @req REQ-103 FR68 FR71
  test("has zero serious/critical violations on the score screen", async ({
    page,
  }) => {
    await page.goto(QUIZ_URL);
    await page.waitForLoadState("networkidle");
    await pickFirstLaunchableSegment(page);
    await playFullQuizSession(page);

    await expectNoSeriousOrCriticalViolations(page);
  });
});

// ETNI-500 (10.11) AC1 — keyboard-only pass over the full session, asserting
// forward Tab reachability (focus order) at every step and, by always being
// able to progress to the next control through to the score screen, the
// absence of a keyboard trap. Segment selection is itself keyboard-driven
// (Tab + Enter), unlike the mouse-click setup in the migrations-atlas
// keyboard spec, per this ticket's explicit AC wording.
async function tabUntilFocused(
  page: Page,
  locator: Locator,
  maxTabs: number
): Promise<boolean> {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press("Tab");
    const focused = await locator
      .evaluate((el) => el === document.activeElement)
      .catch(() => false);
    if (focused) return true;
  }
  return false;
}

// @req REQ-103 FR67 FR68 FR71
test.describe("@nfr-a11y quiz session — keyboard-only journey", () => {
  // @req REQ-103 FR67 FR68 FR71
  test("segment → 8 questions → score is reachable and operable by keyboard alone, with no trap", async ({
    page,
  }) => {
    await page.goto(QUIZ_URL);
    await page.waitForLoadState("networkidle");

    const segmentButtons = page.getByRole("listitem");
    const segmentCount = await segmentButtons.count();
    let launchableSegment: Locator | null = null;
    for (let i = 0; i < segmentCount; i++) {
      const button = segmentButtons.nth(i);
      if (await button.isEnabled()) {
        launchableSegment = button;
        break;
      }
    }
    expect(
      launchableSegment,
      "No launchable quiz segment found — the seeded test data has no active questions in any rung."
    ).not.toBeNull();

    const reachedSegment = await tabUntilFocused(
      page,
      launchableSegment as Locator,
      40
    );
    expect(
      reachedSegment,
      "the launchable segment button never receives focus via Tab"
    ).toBe(true);
    await page.keyboard.press("Enter");

    for (let i = 0; i < QUESTIONS_PER_SESSION; i++) {
      await expect(page.getByRole("radiogroup")).toBeVisible();

      const firstRadio = page.getByRole("radio").first();
      const reachedRadio = await tabUntilFocused(page, firstRadio, 10);
      expect(
        reachedRadio,
        `question ${i + 1}: first radio option never receives focus via Tab`
      ).toBe(true);
      await page.keyboard.press("Space");
      await expect(firstRadio).toHaveAttribute("aria-checked", "true");

      const validateButton = page.getByRole("button", { name: "Valider" });
      const reachedValidate = await tabUntilFocused(page, validateButton, 5);
      expect(
        reachedValidate,
        `question ${i + 1}: Valider button never receives focus via Tab`
      ).toBe(true);
      await page.keyboard.press("Enter");

      const reveal = page.getByTestId("quiz-answer-reveal");
      await expect(reveal).toBeVisible();

      const nextButton = reveal.getByRole("button", {
        name: /Question suivante|Voir le score/,
      });
      const reachedNext = await tabUntilFocused(page, nextButton, 10);
      expect(
        reachedNext,
        `question ${i + 1}: next/score button never receives focus via Tab`
      ).toBe(true);
      await page.keyboard.press("Enter");
    }

    await expect(page.getByTestId("quiz-score-screen")).toBeVisible();

    const playAgainButton = page.getByRole("button", { name: "Rejouer" });
    const reachedPlayAgain = await tabUntilFocused(page, playAgainButton, 10);
    expect(
      reachedPlayAgain,
      "Rejouer button never receives focus via Tab"
    ).toBe(true);
  });
});
