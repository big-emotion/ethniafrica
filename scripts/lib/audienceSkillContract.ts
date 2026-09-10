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
 * The producer's name, not a skill this repository holds.
 *
 * `audience-audit` moved to the private production workspace on 2026-09-10,
 * along with `content-strategist`, because a public repository carries no
 * production skills. The report it writes stays here — it is built from this
 * repository's own URL inventory — so the handoff still crosses this directory
 * and is still worth guarding.
 *
 * What this contract can no longer check: that the producer exists, is named
 * correctly, and actually writes a dated report. That half of the guarantee now
 * lives in the workspace. Saying so here is the point; a contract that quietly
 * checks less than its name suggests is worse than one that checks nothing.
 */
export const AUDIENCE_PRODUCER = "audience-audit";

/**
 * Consumers that live in this repository. `content-strategist` was the second
 * entry and moved out with the producer; `experience-optimizer` acts on the
 * site's own pages, so it stayed.
 */
export const AUDIENCE_CONSUMERS = ["ethniafrica-experience-optimizer"] as const;

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
