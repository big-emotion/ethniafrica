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
  it("binds the sync to the deployed main commit and locked production project", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain("ref: ${{ github.event.deployment.sha }}");
    expect(workflow).toContain("fetch-depth: 0");
    expect(workflow).toContain("git merge-base --is-ancestor");
    expect(workflow).toContain("https://shmrjtnfbqzceovroqjj.supabase.co");
    expect(workflow).toContain("secrets.SUPABASE_SERVICE_ROLE_KEY");
    expect(workflow).not.toContain("SUPABASE_PRODUCTION_SECRET_KEY");
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
