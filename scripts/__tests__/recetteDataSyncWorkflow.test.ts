import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const workflowPath = resolve(
  process.cwd(),
  ".github/workflows/recette-data-sync.yml"
);

function readWorkflow(): string {
  return readFileSync(workflowPath, "utf-8");
}

describe("recette AFRIK data sync workflow", () => {
  // Once a load stops failing over its editorial tail, `if: failure()` would
  // stop uploading the very report that names the tail — the run goes green and
  // the 88 unparseable segments and 51 untiered sources become unreadable. The
  // report is the only place they are written down.
  // @req REQ-032
  it("uploads the loader report on a green run too, not only on failure", () => {
    const workflow = readWorkflow();
    const uploadStep = workflow.slice(
      workflow.indexOf("- name: Upload the loader")
    );

    expect(uploadStep).toContain("if: always()");
    expect(uploadStep).not.toContain("if: failure()");
    expect(uploadStep).toContain("migration_errors_*.json");
    expect(uploadStep).toContain("if-no-files-found: ignore");
  });

  // The defect this workflow exists to close: of the repository's workflows, the
  // only two calls to the corpus loader both targeted production. Merging a fiche
  // into `recette` therefore changed nothing in the recette database, and the
  // symptom reached the contributor as "I merged my fiche and I see nothing".
  // @req REQ-032
  it("loads the corpus on a merge into recette, and on demand", () => {
    const workflow = readWorkflow();

    expect(workflow).toMatch(/^\s*push:/m);
    expect(workflow).toContain("branches: [recette]");
    expect(workflow).toMatch(/^\s*workflow_dispatch:/m);
    expect(workflow).toContain('- "dataset/source/afrik/**"');
  });

  // A merge landing while a previous load is still upserting would have two runs
  // writing the same rows in an order neither controls.
  // @req REQ-032
  it("serializes concurrent loads instead of cancelling them", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain("group: recette-afrik-data-sync");
    expect(workflow).toContain("cancel-in-progress: false");
  });

  // The mirror of production-data-sync's rule: recette's credentials here, and
  // never production's. A load pointed at the wrong project is the exact defect
  // that made every production deploy write into recette.
  // @req REQ-032
  it("reads the recette project and never names the production secrets", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain("secrets.NEXT_PUBLIC_SUPABASE_URL");
    expect(workflow).toContain("secrets.SUPABASE_SERVICE_ROLE_KEY");
    expect(workflow).not.toContain("PRODUCTION_SUPABASE_URL");
    expect(workflow).not.toContain("PRODUCTION_SUPABASE_SERVICE_ROLE_KEY");
    expect(workflow).toContain("--target=recette");
    expect(workflow).not.toContain("--target=production");
  });

  // Skipping quietly is what let the corpus go stale unnoticed in the first
  // place. This trigger only ever fires on a branch push, where secrets are
  // always readable, so an absent credential is a misconfiguration, not a fork.
  // @req REQ-032
  it("fails when either recette credential is absent", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain(
      "${NEXT_PUBLIC_SUPABASE_URL:?NEXT_PUBLIC_SUPABASE_URL is not set"
    );
    expect(workflow).toContain(
      "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is not set"
    );
  });

  // `--conditions=react-server` is load-bearing: the loader reaches
  // src/lib/supabase/admin.ts, which imports `server-only`, and that package
  // throws under any other condition before a single fiche is read.
  // @req REQ-032
  it("validates, previews, then applies under the react-server condition", () => {
    const workflow = readWorkflow();
    const validateIndex = workflow.indexOf("scripts/validateAfrikData.ts");
    const previewIndex = workflow.indexOf(
      "scripts/migrateAfrikToDatabase.ts --target=recette\n"
    );
    const applyIndex = workflow.indexOf(
      "scripts/migrateAfrikToDatabase.ts --target=recette --apply"
    );

    expect(validateIndex).toBeGreaterThan(-1);
    expect(previewIndex).toBeGreaterThan(validateIndex);
    expect(applyIndex).toBeGreaterThan(previewIndex);
    expect(workflow).toContain("--conditions=react-server");
  });

  // Node 20 lacks the native WebSocket the Supabase client reaches for.
  // @req REQ-032
  it("uses a Node.js runtime with native WebSocket support", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('node-version: "22"');
  });

  // Loading fiches writes no question — a bank left to a hand-run command
  // drifts behind the corpus that feeds it, and recette's had 377 active
  // questions whose entities the corpus no longer declared. The sweep needs
  // the corpus it questions, so it runs after the apply.
  // @req REQ-032
  it("generates the quiz question bank once the corpus has landed", () => {
    const workflow = readWorkflow();
    const applyIndex = workflow.indexOf(
      "scripts/migrateAfrikToDatabase.ts --target=recette --apply"
    );
    const sweepIndex = workflow.indexOf("scripts/generateQuizQuestions.ts");

    expect(sweepIndex).toBeGreaterThan(applyIndex);
    expect(workflow).toContain(
      "npx tsx --conditions=react-server scripts/generateQuizQuestions.ts"
    );

    // Never `--rebuild` on a merge. It revokes every healthy question in the
    // bank, which is a human's decision after reading a preview.
    expect(workflow).not.toContain("generateQuizQuestions.ts --rebuild");
  });
});
