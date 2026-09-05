import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const workflowPath = resolve(
  process.cwd(),
  ".github/workflows/production-data-sync.yml"
);

function readWorkflow(): string {
  return readFileSync(workflowPath, "utf-8");
}

describe("production AFRIK data sync workflow", () => {
  // Production left Vercel for the OVH VPS, so `vercel[bot]` never creates a
  // deployment for it again. This assertion used to pin the sync to that event; had it
  // not been updated with the trigger, the workflow would have gone quiet permanently
  // while every board stayed green and the production corpus froze.
  // @req REQ-032
  it("runs after a successful production deploy, or when a human asks", () => {
    const workflow = readWorkflow();

    expect(workflow).toMatch(/^\s*workflow_run:/m);
    expect(workflow).toContain('workflows: ["Deploy Production (OVH)"]');
    expect(workflow).toContain(
      "github.event.workflow_run.conclusion == 'success'"
    );

    // The corpus and the quiz bank can fall behind production without a deploy
    // to carry them there, and waiting for one is what left the bank empty.
    expect(workflow).toMatch(/^\s*workflow_dispatch:/m);
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'");

    // The retired Vercel trigger, and any trigger that would fire on a mere push.
    expect(workflow).not.toMatch(/^\s*deployment_status:/m);
    expect(workflow).not.toContain("creator.login");
    expect(workflow).not.toMatch(/^\s+(push|pull_request):/m);
  });

  // `types: [completed]` fires on failure and cancellation too, so the conclusion
  // check above is what keeps a failed deploy from loading the corpus for a version
  // that is not running.
  // @req REQ-032
  it("binds the sync to the deployed main commit", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain(
      "ref: ${{ github.event.workflow_run.head_sha || github.sha }}"
    );
    expect(workflow).toContain("fetch-depth: 0");
    expect(workflow).toContain("git merge-base --is-ancestor");
    expect(workflow).not.toContain("SUPABASE_PRODUCTION_SECRET_KEY");
  });

  // The ancestry guard exists to refuse a Release tag pointing at a commit that
  // never reached main. A dispatch has no such commit — `head_sha` is empty and
  // the guard would compare against nothing — so it is scoped to the deploy
  // chain rather than silently passing an empty string to `merge-base`.
  // @req REQ-032
  it("checks main ancestry only for the deploy chain", () => {
    const workflow = readWorkflow();
    const guardIndex = workflow.indexOf("git merge-base --is-ancestor");
    const scopeIndex = workflow.indexOf(
      "if: github.event_name == 'workflow_run'"
    );

    expect(scopeIndex).toBeGreaterThan(-1);
    expect(scopeIndex).toBeLessThan(guardIndex);
  });

  // Inverted. This used to assert the workflow contained the recette project ref,
  // which is precisely what made every production deploy write the corpus into
  // recette. The ref must now come from a production secret, and the recette ref
  // must not appear in this file at all.
  // @req REQ-032
  it("reads the production project from secrets and never names the recette project", () => {
    const workflow = readWorkflow();

    expect(workflow).not.toContain("shmrjtnfbqzceovroqjj.supabase.co");
    expect(workflow).toContain("secrets.PRODUCTION_SUPABASE_URL");
    expect(workflow).toContain("secrets.PRODUCTION_SUPABASE_SERVICE_ROLE_KEY");
  });

  // recette's credentials are what the rest of CI uses; reaching for them here
  // would send a production deploy back to the recette database.
  // @req REQ-032
  it("does not fall back to the recette credentials the rest of CI uses", () => {
    const workflow = readWorkflow();

    expect(workflow).not.toContain("secrets.NEXT_PUBLIC_SUPABASE_URL");
    expect(workflow).not.toContain("${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}");
  });

  // A missing production credential must stop the job, not let it pass while the
  // production corpus silently goes stale.
  // @req REQ-032
  it("fails when either production credential is absent", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain(
      "${NEXT_PUBLIC_SUPABASE_URL:?PRODUCTION_SUPABASE_URL is not set"
    );
    expect(workflow).toContain(
      "${SUPABASE_SERVICE_ROLE_KEY:?PRODUCTION_SUPABASE_SERVICE_ROLE_KEY is not set"
    );
  });

  // @req REQ-032
  it("uses a Node.js runtime with native WebSocket support", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('node-version: "22"');
    expect(workflow).not.toContain('node-version: "20"');
  });

  // @req REQ-032
  it("validates, previews, applies, verifies, then invalidates public caches", () => {
    const workflow = readWorkflow();
    const validateIndex = workflow.indexOf("scripts/validateAfrikData.ts");
    const previewIndex = workflow.indexOf(
      "scripts/migrateAfrikToDatabase.ts --target=production"
    );
    const applyIndex = workflow.indexOf(
      "scripts/migrateAfrikToDatabase.ts --target=production --apply"
    );
    const revalidateIndex = workflow.indexOf("/api/admin/revalidate");

    expect(validateIndex).toBeGreaterThan(-1);
    expect(previewIndex).toBeGreaterThan(validateIndex);
    expect(applyIndex).toBeGreaterThan(previewIndex);
    expect(revalidateIndex).toBeGreaterThan(applyIndex);
    expect(workflow).toContain("afrik-language-families");
    expect(workflow).toContain("afrik-peoples");
    expect(workflow).toContain("afrik-countries");
    expect(workflow).toContain("secrets.PRODUCTION_REVALIDATE_SECRET");
    expect(workflow).toContain("if: env.PRODUCTION_REVALIDATE_SECRET != ''");
  });

  // Loading fiches writes no question. Nothing here ran the sweep, so the
  // production bank stayed at zero rows through every release and the hub
  // offered the reader an inert "Bientôt" on a route that was deployed and
  // reachable.
  // @req REQ-032
  it("sweeps the quiz question bank on its own, never with --rebuild", () => {
    const workflow = readWorkflow();

    expect(workflow).toMatch(/^\s{2}quiz-bank:/m);

    // `--conditions=react-server` is load-bearing: the script reaches
    // `src/lib/supabase/admin.ts`, which imports `server-only`.
    expect(workflow).toContain(
      "npx tsx --conditions=react-server scripts/generateQuizQuestions.ts"
    );

    // `--rebuild` revokes every healthy question in the bank. That is a human's
    // decision after reading a preview, never a deploy's.
    expect(workflow).not.toContain("generateQuizQuestions.ts --rebuild");
  });

  // The apply step has never once run to completion on production, so a sweep
  // chained behind it would never run either. `needs: sync` is the shape of
  // that mistake and must not reappear.
  // @req REQ-032
  it("does not chain the quiz bank behind the corpus load", () => {
    const workflow = readWorkflow();
    const quizJobIndex = workflow.search(/^\s{2}quiz-bank:/m);

    expect(quizJobIndex).toBeGreaterThan(-1);
    expect(workflow.slice(quizJobIndex)).not.toContain("needs:");
  });

  // 20 minutes killed the apply on five consecutive deploys, each reported as a
  // bare `cancelled` under a green release. Recette runs the same loader over
  // the same corpus and needs 90.
  // @req REQ-032
  it("gives the corpus load the budget recette measured", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain("timeout-minutes: 90");
    expect(workflow).not.toContain("timeout-minutes: 20");
  });
});
