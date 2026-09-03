import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const workflowPath = resolve(
  process.cwd(),
  ".github/workflows/seed-moderation-allowlist.yml"
);

function readWorkflow(): string {
  return readFileSync(workflowPath, "utf-8");
}

describe("moderation allowlist seeding workflow", () => {
  // The allowlist is a bootstrap problem: nobody can open /fr/admin until an
  // address is on it, and there is no screen for adding one because adding one
  // needs the console. The only way in was to hold the production service-role
  // key locally, so production's allowlist was still empty on 1 September 2026 —
  // reader reports were arriving where no one could read them.
  // @req REQ-032
  it("is a deliberate manual act, never triggered by a push", () => {
    const workflow = readWorkflow();

    expect(workflow).toMatch(/^\s*workflow_dispatch:/m);
    expect(workflow).not.toMatch(/^\s+(push|pull_request|schedule):/m);
    expect(workflow).not.toMatch(/^\s*workflow_run:/m);
  });

  // Both Supabase projects label their environment "production", so the target
  // has to be named explicitly by whoever runs this. Defaulting to recette keeps
  // an unconsidered dispatch off the live register.
  // @req REQ-032
  it("takes the address, a note, and which project to write to", () => {
    const workflow = readWorkflow();

    expect(workflow).toMatch(/^\s{4}inputs:/m);
    expect(workflow).toMatch(/^\s{6}email:/m);
    expect(workflow).toMatch(/^\s{6}note:/m);
    expect(workflow).toMatch(/^\s{6}target:/m);
    expect(workflow).toContain("type: choice");
    expect(workflow).toContain("- recette");
    expect(workflow).toContain("- production");
    expect(workflow).toContain("default: recette");
  });

  // Granting moderation on production is a privilege change on a live register.
  // Binding the job to a GitHub environment is what lets that environment's
  // protection rules require a reviewer before the key is ever readable.
  // @req REQ-032
  it("runs inside the environment it was asked to write to", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain("environment: ${{ inputs.target }}");
  });

  // The pairing this workflow exists to get right: production's credentials for
  // production, recette's for recette. Writing an allowlist row into the wrong
  // project grants moderation on a site nobody meant to touch.
  // @req REQ-032
  it("selects each project's own credentials from the target", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain("secrets.PRODUCTION_SUPABASE_URL");
    expect(workflow).toContain("secrets.PRODUCTION_SUPABASE_SERVICE_ROLE_KEY");
    expect(workflow).toContain("secrets.NEXT_PUBLIC_SUPABASE_URL");
    expect(workflow).toContain("secrets.SUPABASE_SERVICE_ROLE_KEY");
    expect(workflow).toContain("inputs.target == 'production'");
  });

  // A missing credential must stop the run. Reporting success while writing
  // nothing reproduces the very silence being fixed.
  // @req REQ-032
  it("fails when the chosen project's credentials are absent", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain("${NEXT_PUBLIC_SUPABASE_URL:?");
    expect(workflow).toContain("${SUPABASE_SERVICE_ROLE_KEY:?");
  });

  // @req REQ-032
  it("runs the existing seeding script rather than reimplementing the write", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain("scripts/seedAdminAllowlist.ts");
  });
});
