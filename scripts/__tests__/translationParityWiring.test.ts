import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const packageJson = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8")
) as { scripts: Record<string, string> };
const workflow = readFileSync(
  resolve(root, ".github/workflows/ci.yml"),
  "utf8"
);
const lintStaged = readFileSync(
  resolve(root, "lint-staged.config.mjs"),
  "utf8"
);
const agents = readFileSync(resolve(root, "AGENTS.md"), "utf8");
const claude = readFileSync(resolve(root, "CLAUDE.md"), "utf8");
const translatorSkill = readFileSync(
  resolve(root, ".claude/skills/afrik-translator/SKILL.md"),
  "utf8"
);

describe("translation parity gate wiring (REQ-145)", () => {
  // @req REQ-145
  it("publishes one package command for local and CI use", () => {
    expect(packageJson.scripts["check:translation-parity"]).toBe(
      "tsx scripts/ci/checkTranslationParity.ts"
    );
  });

  // @req REQ-145
  it("blocks CI on the pull request diff against the effective base", () => {
    expect(workflow).toContain(
      'npm run check:translation-parity -- --base "origin/$REQ_BASE"'
    );
  });

  // @req REQ-145
  it("blocks a commit when staged corpus or dictionary files break parity", () => {
    expect(lintStaged).toContain(
      "tsx scripts/ci/checkTranslationParity.ts --staged"
    );
  });

  // @req REQ-145
  it("documents the live gate and French-safe rollout instead of a pending English default", () => {
    for (const instructions of [agents, claude]) {
      expect(instructions).toContain("SITE_LOCALE_MODE");
      expect(instructions).toContain("fr-only");
      expect(instructions).toContain("_translation.deferred.en");
      expect(instructions).not.toContain("Both enforcing surfaces are pending");
      expect(instructions).not.toContain(
        "both land with ETNI-1829 / ETNI-1831"
      );
    }
  });

  // @req REQ-145
  it("keeps the translator skill aligned with full-record sidecars", () => {
    expect(translatorSkill).toContain("full record");
    expect(translatorSkill).not.toContain("**partial overlay**");
  });

  // @req REQ-145
  it("provides the runbook named by the translation command", () => {
    const runbook = readFileSync(
      resolve(root, "docs/runbooks/corpus-translation.md"),
      "utf8"
    );
    expect(runbook).toContain("npm run check:translation-parity");
    expect(runbook).toContain("--staged");
    expect(runbook).toContain("--all");
    expect(runbook).toContain("_translation.deferred.en");
  });
});
