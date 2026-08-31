import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflowPath = resolve(process.cwd(), ".github/workflows/ci.yml");

function readWorkflow(): string {
  return readFileSync(workflowPath, "utf8");
}

/**
 * The `@req` gate blocks only because CI passes it a base to diff against. Which
 * base it picks is the whole behaviour: pointing it at `main` for a
 * `recette → main` promotion re-reads the entire integration backlog as new work
 * — 239 exports on the first such promotion — and blocks a release on nothing.
 */
describe("ci.yml — the base lint:req measures against", () => {
  // @req REQ-001
  it("measures a recette promotion against recette, not against its base branch", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain(
      "REQ_BASE: ${{ github.head_ref == 'recette' && 'recette' || github.base_ref }}"
    );
    expect(workflow).toContain('npm run lint:req -- --base "origin/$REQ_BASE"');
  });

  // @req REQ-001
  it("still passes a base, so the gate keeps blocking instead of only surveying", () => {
    const workflow = readWorkflow();
    const bareRun = /npm run lint:req(?!\s*--\s*--base)/.test(workflow);

    expect(bareRun).toBe(false);
  });
});
