import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  AUDIENCE_CONSUMERS,
  AUDIENCE_PRODUCER,
  AUDIENCE_REPORT_DIR,
  checkAudienceSkillContract,
} from "../lib/audienceSkillContract";

const projectRoot = resolve(import.meta.dirname, "../..");

describe("audience skill contract", () => {
  // @req REQ-032
  it("reports no issue on the repository's own skills", () => {
    expect(checkAudienceSkillContract(projectRoot)).toEqual([]);
  });

  // @req REQ-032
  it("names the producer that moved out, and the consumer that stayed", () => {
    // The producer is a name here, not a directory: it moved to the private
    // production workspace on 2026-09-10 and this repository can no longer read
    // its SKILL.md. The report it writes still lands in this repository, which
    // is why the handoff is still worth guarding from this side.
    expect(AUDIENCE_PRODUCER).toBe("audience-audit");
    expect(AUDIENCE_CONSUMERS).toEqual(["ethniafrica-experience-optimizer"]);
  });

  // @req REQ-032
  it("does not look for the relocated producer on disk", () => {
    // The regression this guards: reinstating the producer in the loop makes the
    // contract fail on a repository that is correct, and the obvious fix would
    // be to copy the skill back into a public repository.
    const issues = checkAudienceSkillContract(projectRoot);

    expect(issues.map((issue) => issue.skill)).not.toContain(AUDIENCE_PRODUCER);
  });

  // @req REQ-032
  it("flags a consumer that no longer points at the report directory", () => {
    const issues = checkAudienceSkillContract(projectRoot, {
      [AUDIENCE_CONSUMERS[0]]:
        "---\nname: ethniafrica-experience-optimizer\n---\nNo handoff here.",
    });

    expect(issues).toContainEqual({
      skill: AUDIENCE_CONSUMERS[0],
      detail: `does not read the audit report from ${AUDIENCE_REPORT_DIR}/`,
    });
  });

  // @req REQ-032
  it("flags a consumer that no longer names the producer", () => {
    const issues = checkAudienceSkillContract(projectRoot, {
      [AUDIENCE_CONSUMERS[0]]: `---\nname: ethniafrica-experience-optimizer\n---\nReads ${AUDIENCE_REPORT_DIR}/ and nothing else.`,
    });

    expect(issues).toContainEqual({
      skill: AUDIENCE_CONSUMERS[0],
      detail: `does not name its producer skill ${AUDIENCE_PRODUCER}`,
    });
  });

  // @req REQ-032
  it("flags a consumer whose frontmatter name drifts from its directory", () => {
    const issues = checkAudienceSkillContract(projectRoot, {
      [AUDIENCE_CONSUMERS[0]]: `---\nname: renamed-by-accident\n---\nReads ${AUDIENCE_REPORT_DIR}/ written by ${AUDIENCE_PRODUCER}`,
    });

    expect(issues).toContainEqual({
      skill: AUDIENCE_CONSUMERS[0],
      detail:
        'frontmatter name is "renamed-by-accident", expected "ethniafrica-experience-optimizer"',
    });
  });

  // @req REQ-032
  it("flags a consumer whose SKILL.md has gone missing", () => {
    const issues = checkAudienceSkillContract(resolve(projectRoot, "docs"));

    expect(issues).toContainEqual({
      skill: AUDIENCE_CONSUMERS[0],
      detail: "SKILL.md is missing",
    });
  });
});
