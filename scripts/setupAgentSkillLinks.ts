#!/usr/bin/env npx tsx

/**
 * Points the Codex entry point at the canonical skill.
 *
 * `.agents/` is gitignored as a runtime mirror, so a clone never carries it and
 * this has to be run once per checkout — the same class of local git state as
 * `git remote set-head origin recette`. Idempotent, and it refuses to delete a
 * real directory standing where the link belongs.
 */

import { resolve } from "node:path";

import {
  CANONICAL_SKILLS_DIR,
  MIRROR_SKILLS_DIR,
  linkMirrorSkill,
} from "./lib/skillParity";

const DEFAULT_SKILLS = ["afrik-curator"];

function main(): void {
  const projectRoot = resolve(import.meta.dirname, "..");
  const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  const skills = requested.length > 0 ? requested : DEFAULT_SKILLS;

  let blocked = 0;
  for (const skill of skills) {
    const result = linkMirrorSkill(projectRoot, skill);
    if (result.action === "blocked") {
      blocked += 1;
      console.error(`✗ ${skill}: ${result.detail}`);
      continue;
    }
    console.log(
      `✓ ${skill}: ${MIRROR_SKILLS_DIR}/${skill} ${result.action === "already-linked" ? "already points" : "now points"} at ${CANONICAL_SKILLS_DIR}/${skill}`
    );
  }

  process.exit(blocked > 0 ? 1 : 0);
}

main();
