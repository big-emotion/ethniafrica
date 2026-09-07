import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// The instruction files are the human-facing half of REQ-145: an agent reads
// them before CI can say anything. The ticket that rewrote them noted that an
// unenforced textual rule decays unnoticed, so this suite holds the five files
// to the bilingual contract the way a gate holds code.
const REPO_ROOT = path.resolve(__dirname, "../..");

const INSTRUCTION_FILES = [
  "CLAUDE.md",
  "AGENTS.md",
  "README.md",
  ".claude/skills/ethniafrica-ticket/SKILL.md",
  ".claude/skills/ethniafrica-audit/SKILL.md",
] as const;

// The retired French-only instruction in each of the forms it was found in.
// Deliberately narrower than /french-only/i: a sentence saying the site is no
// longer French-only must stay legal.
const RETIRED_SINGLE_LOCALE_ORDER =
  /do not reintroduce `en`|only ever resolves to `fr`|single-locale invariants|French-only single-locale/i;

const readInstruction = (relativePath: string): string =>
  fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");

const strictModelCount = (): number =>
  fs
    .readdirSync(path.join(REPO_ROOT, "public"))
    .filter((name) => /^modele-.*\.json$/.test(name)).length;

describe("agent instruction files carry the bilingual contract (REQ-145)", () => {
  describe.each(INSTRUCTION_FILES)("%s", (relativePath) => {
    // @req REQ-145
    it("no longer instructs an agent to keep the site French-only", () => {
      expect(readInstruction(relativePath)).not.toMatch(
        RETIRED_SINGLE_LOCALE_ORDER
      );
    });
  });

  describe.each(["CLAUDE.md", "AGENTS.md"])("%s", (relativePath) => {
    // @req REQ-145
    it("points at the parity gate and the translator skill instead of restating them", () => {
      const instruction = readInstruction(relativePath);

      expect(instruction).toContain("check:translation-parity");
      expect(instruction).toContain("afrik-translator");
    });
  });

  // @req REQ-145
  it("AGENTS.md defers to CLAUDE.md rather than duplicating it", () => {
    expect(readInstruction("AGENTS.md")).toContain("CLAUDE.md");
  });

  // The sentence listed nine models while sixteen were on disk; the count is
  // now read from the directory so the prose cannot lag it again.
  // @req REQ-145
  it("CLAUDE.md quotes the number of strict models actually on disk", () => {
    const sentence = readInstruction("CLAUDE.md").match(
      /(\d+) strict models in `public\/modele-\*\.json`/
    );

    expect(sentence).not.toBeNull();
    expect(Number(sentence[1])).toBe(strictModelCount());
  });
});
