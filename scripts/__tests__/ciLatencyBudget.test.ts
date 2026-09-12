import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * What a pull request into `recette` is allowed to cost.
 *
 * Measured on 2026-09-03 over 300 runs: the two workflows that dominated the
 * wall clock — Lighthouse at a 15.8 min median and Playwright at 8.2 min —
 * were not required checks, and had been red 32/32 and 27/33 times. They cost
 * every PR ~20 minutes of waiting while gating nothing.
 *
 * On 2026-09-12 both came back onto the pre-merge path, deliberately and in a
 * different shape: each workflow now carries a short job that can be required
 * (four routes, one locale, one viewport) beside the heavy matrix, which stays
 * off pull requests into `recette`. This suite holds that split, so the heavy
 * half cannot drift back onto every pull request without someone deciding to
 * put it there, and so the short half keeps failing loudly when it cannot run.
 */

function readWorkflow(name: string): string {
  return readFileSync(
    resolve(process.cwd(), ".github/workflows", name),
    "utf8"
  );
}

function triggersOf(workflow: string): string {
  return readWorkflow(workflow).split(/^jobs:$/m)[0];
}

/** One job's block: from `  <id>:` to the next job or the end of the file. */
function jobBlock(workflow: string, id: string): string {
  const jobs = readWorkflow(workflow).split(/^jobs:$/m)[1] ?? "";
  const start = jobs.search(new RegExp(`^  ${id}:$`, "m"));
  if (start === -1) return "";
  const rest = jobs.slice(start + 1);
  const next = rest.search(/^ {2}[a-z][a-z0-9-]*:$/m);
  return next === -1 ? jobs.slice(start) : jobs.slice(start, start + 1 + next);
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
  "e2e.yml",
  "lighthouse.yml",
];

/**
 * Workflows split into a short, requirable job and a heavy matrix. `gate` is
 * the job id of the short half, `matrix` the heavy one, `minutes` the most the
 * short half may be allowed to run before GitHub kills it.
 */
const SPLIT_AUDITS = [
  { workflow: "e2e.yml", gate: "smoke", matrix: "e2e", minutes: 15 },
  {
    workflow: "lighthouse.yml",
    gate: "gate",
    matrix: "lighthouse",
    minutes: 15,
  },
];

describe("CI latency budget", () => {
  describe.each(PRE_MERGE_GATES)("%s", (workflow) => {
    // @req REQ-032
    it("cancels superseded runs of the same branch", () => {
      const body = readWorkflow(workflow);

      expect(body).toMatch(/^concurrency:$/m);
      expect(body).toMatch(/cancel-in-progress: true/);
    });
  });

  describe.each(SPLIT_AUDITS)(
    "$workflow",
    ({ workflow, gate, matrix, minutes }) => {
      // @req REQ-032
      it("runs on pull requests into both branches, nightly and on demand", () => {
        const triggers = triggersOf(workflow);

        expect(triggers).toMatch(
          /pull_request:\n {4}branches: \[main, recette\]/
        );
        expect(triggers).toMatch(/schedule:\n {4}- cron:/);
        expect(triggers).toMatch(/workflow_dispatch:/);
      });

      // The heavy matrix is the ~16 min / ~8 min cost measured above. It runs
      // on the promotion into main and off the pull-request path otherwise.
      // @req REQ-032
      it("keeps the heavy matrix off pull requests into recette", () => {
        expect(jobBlock(workflow, matrix)).toContain(
          "if: github.event_name != 'pull_request' || github.base_ref == 'main'"
        );
      });

      // @req REQ-032
      it("puts only the short job on every pull request, with a bounded run time", () => {
        const block = jobBlock(workflow, gate);

        expect(block).toContain("if: github.event_name == 'pull_request'");
        const timeout = Number(block.match(/timeout-minutes: (\d+)/)?.[1]);
        expect(timeout).toBeGreaterThan(0);
        expect(timeout).toBeLessThanOrEqual(minutes);
      });

      // A required check that concludes success without having run is a gate
      // that says "green" about nothing. Only a fork or a bot, which genuinely
      // cannot read secrets, may skip.
      // @req REQ-032
      it("fails the short job loudly when its secrets are missing", () => {
        const block = jobBlock(workflow, gate);

        expect(block).toMatch(/IS_FORK_PR/);
        expect(block).toMatch(/::error::[^\n]*\n\s+exit 1/);
      });

      // A scheduled event always fires against the default branch, which is
      // `main`. Without an explicit ref the nightly audit would measure main and
      // report it as recette — the integration branch would go unmeasured while
      // the board showed a green nightly.
      // @req REQ-032
      it("checks out recette explicitly on the nightly run", () => {
        expect(jobBlock(workflow, matrix)).toMatch(
          /ref: \$\{\{ github\.event_name == 'schedule' && 'recette' \|\| '' \}\}/
        );
      });
    }
  );

  // Every change reaches main through a pull request, so a `push` trigger on
  // the same branches re-runs the identical audit a second time after merge and
  // gates nothing — the duplication ci.yml and data-integrity.yml already
  // removed for themselves.
  // @req REQ-032
  it("does not re-run the required a11y gate on push after merge", () => {
    expect(triggersOf("a11y.yml")).not.toMatch(/push:/);
  });

  // @req REQ-032
  it("does not re-run the editorial gate on push after merge", () => {
    expect(triggersOf("editorial-rules.yml")).not.toMatch(/push:/);
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
