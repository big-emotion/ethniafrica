import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  AUDIENCE_CONSUMERS,
  AUDIENCE_PRODUCER,
  AUDIENCE_REPORT_DIR,
  checkAudienceSkillContract,
} from "../lib/audienceSkillContract";

const projectRoot = resolve(import.meta.dirname, "../..");
const [firstConsumer] = AUDIENCE_CONSUMERS;

describe("audience skill contract", () => {
  // @req REQ-032
  it("reports no issue on the repository's own skills", () => {
    expect(checkAudienceSkillContract(projectRoot)).toEqual([]);
  });

  // @req REQ-032
  it("guards all three skills of the chain, producer included", () => {
    // The producer spent a day in the private workspace, and the contract could
    // then only guard the consumer half. Both halves are here again, so the
    // assertion is that nothing in the chain is checked on trust.
    expect(AUDIENCE_PRODUCER).toBe("ethniafrica-audience-audit");
    expect(AUDIENCE_CONSUMERS).toEqual([
      "ethniafrica-content-strategist",
      "ethniafrica-experience-optimizer",
    ]);
  });

  // @req REQ-032
  it("flags a producer that no longer writes to the report directory", () => {
    // The failure this catches: a producer edited until it stops writing the
    // dated report leaves both consumers reading a directory nobody fills, and
    // they degrade to guessing without erroring.
    const issues = checkAudienceSkillContract(projectRoot, {
      [AUDIENCE_PRODUCER]: `---\nname: ${AUDIENCE_PRODUCER}\n---\nMeasures things and keeps them to itself.`,
    });

    expect(issues).toContainEqual({
      skill: AUDIENCE_PRODUCER,
      detail: `does not write the audit report to ${AUDIENCE_REPORT_DIR}/`,
    });
  });

  // @req REQ-032
  it("flags a producer whose SKILL.md has gone missing", () => {
    const issues = checkAudienceSkillContract(resolve(projectRoot, "docs"));

    expect(issues).toContainEqual({
      skill: AUDIENCE_PRODUCER,
      detail: "SKILL.md is missing",
    });
  });

  // @req REQ-032
  it("flags a consumer that no longer points at the report directory", () => {
    const issues = checkAudienceSkillContract(projectRoot, {
      [firstConsumer]: `---\nname: ${firstConsumer}\n---\nNo handoff here.`,
    });

    expect(issues).toContainEqual({
      skill: firstConsumer,
      detail: `does not read the audit report from ${AUDIENCE_REPORT_DIR}/`,
    });
  });

  // @req REQ-032
  it("flags a consumer that no longer names the producer", () => {
    const issues = checkAudienceSkillContract(projectRoot, {
      [firstConsumer]: `---\nname: ${firstConsumer}\n---\nReads ${AUDIENCE_REPORT_DIR}/ and nothing else.`,
    });

    expect(issues).toContainEqual({
      skill: firstConsumer,
      detail: `does not name its producer skill ${AUDIENCE_PRODUCER}`,
    });
  });

  // @req REQ-032
  it("flags a consumer whose frontmatter name drifts from its directory", () => {
    const issues = checkAudienceSkillContract(projectRoot, {
      [firstConsumer]: `---\nname: renamed-by-accident\n---\nReads ${AUDIENCE_REPORT_DIR}/ written by ${AUDIENCE_PRODUCER}`,
    });

    expect(issues).toContainEqual({
      skill: firstConsumer,
      detail: `frontmatter name is "renamed-by-accident", expected ${JSON.stringify(firstConsumer)}`,
    });
  });

  // @req REQ-032
  it("flags a consumer whose SKILL.md has gone missing", () => {
    const issues = checkAudienceSkillContract(resolve(projectRoot, "docs"));

    expect(issues).toContainEqual({
      skill: firstConsumer,
      detail: "SKILL.md is missing",
    });
  });
});
