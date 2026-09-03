import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * What a pull request into `recette` is allowed to cost.
 *
 * Measured on 2026-09-03 over 300 runs: the two workflows that dominated the
 * wall clock — Lighthouse at a 15.8 min median and Playwright at 8.2 min —
 * are not in either branch's required-check list, and had been red 32/32 and
 * 27/33 times respectively. They cost every PR ~20 minutes of waiting while
 * gating nothing, which is how a contributor ends up watching a page that
 * cannot turn green.
 *
 * The required checks are `gitleaks`, `build`, `validate`, `openapi-diff` and
 * `axe-core (Storybook)`. This suite keeps the schedule honest about that
 * split, so a heavy audit cannot drift back onto the pre-merge path without
 * someone deciding to put it there.
 */

function readWorkflow(name: string): string {
  return readFileSync(
    resolve(process.cwd(), ".github/workflows", name),
    "utf8"
  );
}

// Workflows that gate a merge and therefore stay on `pull_request`. Superseded
// runs of each must die when a new commit lands, or a branch pushed three times
// keeps three generations of the same audit competing for the runner pool.
const PRE_MERGE_GATES = [
  "ci.yml",
  "a11y.yml",
  "data-integrity.yml",
  "editorial-rules.yml",
  "openapi-diff.yml",
];

// Audits that inform rather than gate. They run against the integrated branch
// on a schedule, on the (rare) promotion PR into main, and on demand.
const POST_MERGE_AUDITS = ["lighthouse.yml", "e2e.yml"];

describe("CI latency budget", () => {
  describe.each(PRE_MERGE_GATES)("%s", (workflow) => {
    // @req REQ-032
    it("cancels superseded runs of the same branch", () => {
      const body = readWorkflow(workflow);

      expect(body).toMatch(/^concurrency:$/m);
      expect(body).toMatch(/cancel-in-progress: true/);
    });
  });

  describe.each(POST_MERGE_AUDITS)("%s", (workflow) => {
    // @req REQ-032
    it("does not run on pull requests into recette", () => {
      const triggers = readWorkflow(workflow).split(/^jobs:$/m)[0];

      expect(triggers).not.toMatch(/branches:.*recette/);
    });

    // @req REQ-032
    it("still guards the promotion into main, nightly and on demand", () => {
      const triggers = readWorkflow(workflow).split(/^jobs:$/m)[0];

      expect(triggers).toMatch(/pull_request:\n {4}branches: \[main\]/);
      expect(triggers).toMatch(/schedule:\n {4}- cron:/);
      expect(triggers).toMatch(/workflow_dispatch:/);
    });

    // A scheduled event always fires against the default branch, which is
    // `main`. Without an explicit ref the nightly audit would measure main and
    // report it as recette — the integration branch would go unmeasured while
    // the board showed a green nightly.
    // @req REQ-032
    it("checks out recette explicitly on the nightly run", () => {
      const body = readWorkflow(workflow);

      expect(body).toMatch(
        /ref: \$\{\{ github\.event_name == 'schedule' && 'recette' \|\| '' \}\}/
      );
    });
  });

  // Every change reaches main through a pull request, so a `push` trigger on
  // the same branches re-runs the identical audit a second time after merge and
  // gates nothing — the duplication ci.yml and data-integrity.yml already
  // removed for themselves.
  // @req REQ-032
  it("does not re-run the required a11y gate on push after merge", () => {
    const triggers = readWorkflow("a11y.yml").split(/^jobs:$/m)[0];

    expect(triggers).not.toMatch(/push:/);
  });

  // @req REQ-032
  it("does not re-run the editorial gate on push after merge", () => {
    const triggers = readWorkflow("editorial-rules.yml").split(/^jobs:$/m)[0];

    expect(triggers).not.toMatch(/push:/);
  });

  // The required gate rebuilt Next.js from cold on every run (42-58 s) while
  // ci.yml restored the same artefact in 11 s, and reinstalled the Chromium
  // build (54 s) each time. Both are the same inputs producing the same bytes.
  // @req REQ-032
  it("reuses the Next.js build and browser caches in the required a11y gate", () => {
    const body = readWorkflow("a11y.yml");

    expect(body).toContain("actions/cache");
    expect(body).toContain(".next/cache");
    expect(body).toContain("ms-playwright");
  });

  // The load never cancels a partial corpus write, so it is deliberately the
  // one workflow excluded from the cancel-superseded rule above.
  // @req REQ-032
  it("never cancels a partial corpus load", () => {
    expect(readWorkflow("recette-data-sync.yml")).toContain(
      "cancel-in-progress: false"
    );
  });
});
