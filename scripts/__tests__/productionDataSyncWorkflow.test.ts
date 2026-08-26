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
  // @req REQ-032
  it("runs only for a successful Vercel Production deployment", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain("deployment_status:");
    expect(workflow).not.toMatch(/^\s+(push|pull_request):/m);
    expect(workflow).toContain(
      "github.event.deployment_status.state == 'success'"
    );
    expect(workflow).toContain(
      "github.event.deployment.environment == 'Production'"
    );
    expect(workflow).toContain(
      "github.event.deployment.creator.login == 'vercel[bot]'"
    );
  });

  // @req REQ-032
  it("binds the sync to the deployed main commit", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain("ref: ${{ github.event.deployment.sha }}");
    expect(workflow).toContain("fetch-depth: 0");
    expect(workflow).toContain("git merge-base --is-ancestor");
    expect(workflow).not.toContain("SUPABASE_PRODUCTION_SECRET_KEY");
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
});
