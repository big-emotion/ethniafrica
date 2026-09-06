#!/usr/bin/env npx tsx

/**
 * Fails when the two entry points of a skill stop being the same skill.
 *
 * The canonical copy must exist and every resource it references must be on
 * disk. The Codex mirror is compared only when present: `.agents/` is
 * gitignored, so its absence on a fresh clone or in CI is the expected state,
 * not a divergence. `--require-mirror` turns that absence into a failure, for a
 * local checkout that has run `npm run skills:link`.
 */

import { resolve } from "node:path";

import {
  CANONICAL_SKILLS_DIR,
  MIRROR_SKILLS_DIR,
  compareSkillManifests,
  readSkillManifest,
} from "../lib/skillParity";

const CHECKED_SKILLS = ["afrik-curator"];

function main(): void {
  const projectRoot = resolve(import.meta.dirname, "../..");
  const requireMirror = process.argv.includes("--require-mirror");
  let failures = 0;

  for (const skill of CHECKED_SKILLS) {
    const canonical = readSkillManifest(
      projectRoot,
      CANONICAL_SKILLS_DIR,
      skill
    );
    const mirror = readSkillManifest(projectRoot, MIRROR_SKILLS_DIR, skill);

    for (const issue of compareSkillManifests(canonical, mirror)) {
      failures += 1;
      console.error(`✗ ${skill}: ${issue.kind} — ${issue.detail}`);
    }
    for (const resource of canonical.missingResources) {
      failures += 1;
      console.error(
        `✗ ${skill}: SKILL.md references ${resource}, which does not exist`
      );
    }
    if (requireMirror && !mirror.exists) {
      failures += 1;
      console.error(
        `✗ ${skill}: no Codex entry point — run \`npm run skills:link\``
      );
    }
    if (failures === 0) {
      console.log(
        `✓ ${skill}: canonical at ${CANONICAL_SKILLS_DIR}, Codex entry point ${mirror.exists ? "in parity" : "not provisioned (run npm run skills:link)"}`
      );
    }
  }

  process.exit(failures > 0 ? 1 : 0);
}

main();
