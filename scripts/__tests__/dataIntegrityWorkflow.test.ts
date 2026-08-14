import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { validateActionPins } from "../checkGithubActionPins";

const workflowPath = resolve(
  process.cwd(),
  ".github/workflows/data-integrity.yml"
);

function readWorkflow(): string {
  return readFileSync(workflowPath, "utf8");
}

function getValidatorSteps(workflow: string): string[] {
  return (
    workflow
      .match(/ {6}- name: [^\n]+\n(?:(?! {6}- name:)[\s\S])*/g)
      ?.filter((step) => step.includes("scripts/validateAfrikData.ts")) ?? []
  );
}

describe("data integrity workflow", () => {
  // @req REQ-032
  it("runs for pull requests to integration branches and on the nightly schedule", () => {
    const workflow = readWorkflow();

    expect(workflow).toMatch(/pull_request:\n {4}branches: \[main, recette\]/);
    expect(workflow).toMatch(/schedule:\n {4}- cron: "0 2 \* \* \*"/);
  });

  // @req REQ-052
  it("runs the FR52-inclusive validator for non-scheduled and scheduled events", () => {
    const validatorSteps = getValidatorSteps(readWorkflow());

    expect(validatorSteps).toHaveLength(2);
    expect(validatorSteps[0]).toContain("FR52");
    expect(validatorSteps[0]).toContain("if: github.event_name != 'schedule'");
    expect(validatorSteps[0]).toContain('CHECK_SOURCE_URLS: "false"');
    expect(validatorSteps[1]).toContain("FR52");
    expect(validatorSteps[1]).toContain("if: github.event_name == 'schedule'");
    expect(validatorSteps[1]).toContain('CHECK_SOURCE_URLS: "true"');
  });

  // @req REQ-032
  it("blocks on validator failures without turning soft warnings into a separate gate", () => {
    const validatorSteps = getValidatorSteps(readWorkflow());

    for (const step of validatorSteps) {
      expect(step).toContain("run: npx tsx scripts/validateAfrikData.ts");
      expect(step).not.toContain("continue-on-error");
      expect(step).not.toMatch(
        /run:.*scripts\/validateAfrikData\.ts.*(?:\|\||;).*(?:true|exit 0)/
      );
    }
  });

  // @req REQ-032
  it("pins every third-party action to a full commit SHA", () => {
    expect(validateActionPins(readWorkflow(), workflowPath)).toEqual([]);
  });

  // @req REQ-080 (ETNI-494)
  it("runs the quiz bank integrity check job only on the nightly schedule", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain("quiz-bank-integrity:");
    const jobBody = workflow.slice(workflow.indexOf("quiz-bank-integrity:"));
    expect(jobBody).toContain("if: github.event_name == 'schedule'");
    expect(jobBody).toContain(
      "run: npx tsx scripts/generateQuizQuestions.ts --check"
    );
    expect(jobBody).toContain(
      "NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}"
    );
    expect(jobBody).toContain(
      "SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
    );
    expect(jobBody).not.toContain("continue-on-error");
  });
});
