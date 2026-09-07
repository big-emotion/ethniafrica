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

export const AUDIENCE_PRODUCER = "ethniafrica-audience-audit";

export const AUDIENCE_CONSUMERS = [
  "ethniafrica-experience-optimizer",
  "ethniafrica-content-strategist",
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

/**
 * A dated report filename, not merely the directory: a skill that mentions
 * `docs/audience` in passing has not committed to producing anything.
 */
const DATED_REPORT = new RegExp(
  `${AUDIENCE_REPORT_DIR}/audit-(?:YYYY-MM-DD|\\d{4}-\\d{2}-\\d{2})\\.md`
);

export function checkAudienceSkillContract(
  projectRoot: string,
  overrides: SkillMarkdownOverrides = {}
): SkillContractIssue[] {
  const issues: SkillContractIssue[] = [];

  for (const skill of [AUDIENCE_PRODUCER, ...AUDIENCE_CONSUMERS]) {
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

    if (skill === AUDIENCE_PRODUCER) {
      if (!DATED_REPORT.test(markdown)) {
        issues.push({
          skill,
          detail: `does not write a dated report into ${AUDIENCE_REPORT_DIR}/`,
        });
      }
      continue;
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
