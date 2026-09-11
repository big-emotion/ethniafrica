import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { parseSkillName } from "./skillParity";

/**
 * Three skills split the audience loop: one measures, two act on the
 * measurement. The handoff between them is a dated Markdown report on disk,
 * not a conversation — a consumer invoked weeks later reads the same evidence
 * the producer wrote, and neither side depends on a context window that has
 * since been summarised away.
 *
 * That indirection is what this contract guards. A consumer edited until it no
 * longer opens the report still reads as a plausible skill and still runs; it
 * just silently reverts to guessing, which is the failure the whole
 * architecture exists to prevent.
 */
export const AUDIENCE_REPORT_DIR = "docs/audience";

/**
 * The producer, which this repository holds again.
 *
 * It left for the private workspace on 2026-09-10, on the rule that a public
 * repository carries no production skills, and came back on 2026-09-11 when that
 * rule was reversed: an engine and a chain nobody can read the history of are an
 * engine and a chain nobody can repair. What did *not* come back is the output —
 * renders, per-subject cards and sources stay in the library, addressed by
 * `ETHNIAFRICA_SOCIAL_OUTPUT`.
 *
 * So the contract can check the whole handoff again, producer included, rather
 * than half of it.
 */
export const AUDIENCE_PRODUCER = "ethniafrica-audience-audit";

/**
 * Both consumers are back in this repository too. `ethniafrica-content-strategist`
 * decides what ships; `ethniafrica-experience-optimizer` acts on the site's own
 * pages. Each must still open the dated report rather than guess — a consumer
 * edited until it no longer reads the report keeps running and silently reverts
 * to taste.
 */
export const AUDIENCE_CONSUMERS = [
  "ethniafrica-content-strategist",
  "ethniafrica-experience-optimizer",
] as const;

export interface SkillContractIssue {
  skill: string;
  detail: string;
}

/** Overrides let a test supply skill markdown without writing a broken skill to disk. */
export type SkillMarkdownOverrides = Record<string, string>;

function skillMarkdown(
  projectRoot: string,
  skill: string,
  overrides: SkillMarkdownOverrides
): string | null {
  if (skill in overrides) return overrides[skill];

  const path = join(projectRoot, ".claude/skills", skill, "SKILL.md");
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

export function checkAudienceSkillContract(
  projectRoot: string,
  overrides: SkillMarkdownOverrides = {}
): SkillContractIssue[] {
  const issues: SkillContractIssue[] = [];

  const producer = skillMarkdown(projectRoot, AUDIENCE_PRODUCER, overrides);
  if (producer === null) {
    issues.push({ skill: AUDIENCE_PRODUCER, detail: "SKILL.md is missing" });
  } else {
    const declaredName = parseSkillName(producer);
    if (declaredName !== AUDIENCE_PRODUCER) {
      issues.push({
        skill: AUDIENCE_PRODUCER,
        detail: `frontmatter name is ${JSON.stringify(declaredName)}, expected ${JSON.stringify(AUDIENCE_PRODUCER)}`,
      });
    }

    if (!producer.includes(`${AUDIENCE_REPORT_DIR}/`)) {
      issues.push({
        skill: AUDIENCE_PRODUCER,
        detail: `does not write the audit report to ${AUDIENCE_REPORT_DIR}/`,
      });
    }
  }

  for (const skill of AUDIENCE_CONSUMERS) {
    const markdown = skillMarkdown(projectRoot, skill, overrides);

    if (markdown === null) {
      issues.push({ skill, detail: "SKILL.md is missing" });
      continue;
    }

    const declaredName = parseSkillName(markdown);
    if (declaredName !== skill) {
      issues.push({
        skill,
        detail: `frontmatter name is ${JSON.stringify(declaredName)}, expected ${JSON.stringify(skill)}`,
      });
    }

    if (!markdown.includes(`${AUDIENCE_REPORT_DIR}/`)) {
      issues.push({
        skill,
        detail: `does not read the audit report from ${AUDIENCE_REPORT_DIR}/`,
      });
    }

    if (!markdown.includes(AUDIENCE_PRODUCER)) {
      issues.push({
        skill,
        detail: `does not name its producer skill ${AUDIENCE_PRODUCER}`,
      });
    }
  }

  return issues;
}
