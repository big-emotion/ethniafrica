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
  it("names a producer and two consumers", () => {
    expect(AUDIENCE_PRODUCER).toBe("ethniafrica-audience-audit");
    expect(AUDIENCE_CONSUMERS).toEqual([
      "ethniafrica-experience-optimizer",
      "ethniafrica-content-strategist",
    ]);
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
      [AUDIENCE_CONSUMERS[1]]: `---\nname: ethniafrica-content-strategist\n---\nReads ${AUDIENCE_REPORT_DIR}/ and nothing else.`,
    });

    expect(issues).toContainEqual({
      skill: AUDIENCE_CONSUMERS[1],
      detail: `does not name its producer skill ${AUDIENCE_PRODUCER}`,
    });
  });

  // @req REQ-032
  it("flags a skill whose frontmatter name drifts from its directory", () => {
    const issues = checkAudienceSkillContract(projectRoot, {
      [AUDIENCE_PRODUCER]: `---\nname: renamed-by-accident\n---\nWrites ${AUDIENCE_REPORT_DIR}/audit-2026-09-07.md`,
    });

    expect(issues).toContainEqual({
      skill: AUDIENCE_PRODUCER,
      detail:
        'frontmatter name is "renamed-by-accident", expected "ethniafrica-audience-audit"',
    });
  });

  // @req REQ-032
  it("flags a producer that no longer writes the report", () => {
    const issues = checkAudienceSkillContract(projectRoot, {
      [AUDIENCE_PRODUCER]:
        "---\nname: ethniafrica-audience-audit\n---\nJust talks about traffic.",
    });

    expect(issues).toContainEqual({
      skill: AUDIENCE_PRODUCER,
      detail: `does not write a dated report into ${AUDIENCE_REPORT_DIR}/`,
    });
  });
});
