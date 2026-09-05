import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { GLOSSARY_TERMS } from "@/lib/glossaire/terms";
import {
  GLOSSED_INVARIANT_PATHS,
  PARSER_ONLY_LEAVES,
  STRICT_MODEL_FILES,
  TRANSLATION_CLASSES,
  type StrictModelFile,
} from "@/lib/i18n/translationClasses";

import { INTERNAL_REGISTER_PATTERNS } from "../checkEditorialRules";

/**
 * The afrik-translator skill is prose under .claude/, which vitest excludes
 * and lint:req never scans. Without this file it would be a textual rule of
 * exactly the kind the bilingual programme warns about — one that drifts from
 * the class declaration, from the glossary and from the charter the day any
 * of them moves. So the skill's files are read here as a caller would read
 * them, and pinned to the code and the corpus they describe.
 */
const ROOT = join(__dirname, "../../..");
const SKILL_DIR = join(ROOT, ".claude/skills/afrik-translator");
const CORPUS = join(ROOT, "dataset/source/afrik");

function skillFile(name: string): string {
  return readFileSync(join(SKILL_DIR, name), "utf-8");
}

function corpusFile(relPath: string): string {
  return readFileSync(join(CORPUS, relPath), "utf-8");
}

/**
 * The class tables of field-classes.md, one per `### modele-*.json` heading,
 * read back as `{ leaf: class }` so they can be compared with the declaration
 * as a whole rather than sampled.
 */
function documentedClassTables(): Record<string, Record<string, string>> {
  const tables: Record<string, Record<string, string>> = {};
  let current: string | null = null;
  for (const line of skillFile("reference/field-classes.md").split("\n")) {
    const heading = line.match(/^### (modele-[a-z-]+\.json)/);
    if (heading) {
      current = heading[1];
      tables[current] = {};
      continue;
    }
    const row = line.match(/^\| `([^`]+)` +\| `([a-z_]+)` +\|/);
    if (row && current) tables[current][row[1]] = row[2];
  }
  return tables;
}

function declaredClassTable(model: StrictModelFile): Record<string, string> {
  const table: Record<string, string> = { ...TRANSLATION_CLASSES[model] };
  for (const leaf of PARSER_ONLY_LEAVES) {
    if (leaf.model === model) table[leaf.path] = leaf.class;
  }
  return table;
}

function charterSection(heading: RegExp, next: RegExp): string {
  const charter = readFileSync(
    join(ROOT, "docs/design/brand-charter.md"),
    "utf-8"
  );
  const start = charter.search(heading);
  const end = charter.slice(start + 1).search(next) + start + 1;
  return charter.slice(start, end);
}

describe("afrik-translator skill — shape", () => {
  // @req REQ-143
  it("exists, is allowlisted for git, and names its triggers", () => {
    const skill = skillFile("SKILL.md");
    expect(skill).toMatch(/^---\nname: afrik-translator\n/);
    for (const trigger of [
      "traduire la fiche",
      "translate",
      "classe de traduction",
      "glossaire bilingue",
    ]) {
      expect(skill, trigger).toContain(trigger);
    }
    for (const reference of [
      "field-classes.md",
      "review-rules.md",
      "register.md",
      "glossary.md",
    ]) {
      expect(existsSync(join(SKILL_DIR, "reference", reference))).toBe(true);
    }
    // .gitignore ignores .claude/skills/* and re-includes each skill by name;
    // a skill left off that list is versioned nowhere and vanishes on clone.
    expect(readFileSync(join(ROOT, ".gitignore"), "utf-8")).toContain(
      "!.claude/skills/afrik-translator/"
    );
  });

  // @req REQ-143
  it("states the two refusals: an autonym is never translated, class 3 never publishes at machine provenance", () => {
    const skill = skillFile("SKILL.md");
    expect(skill).toMatch(/autonym[^.]*never translated/i);
    expect(skill).toMatch(/review_required[^.]*machine/);
  });

  // @req REQ-143
  it("is cross-referenced from the curator skill", () => {
    expect(
      readFileSync(join(ROOT, ".claude/skills/afrik-curator/SKILL.md"), "utf-8")
    ).toContain("/afrik-translator");
  });
});

describe("afrik-translator skill — field classes agree with the declaration", () => {
  // @req REQ-143
  it("documents every strict model and the ONS record", () => {
    const tables = documentedClassTables();
    expect(Object.keys(tables).sort()).toEqual([...STRICT_MODEL_FILES].sort());
    expect(skillFile("reference/field-classes.md")).toContain("ONS_");
  });

  // @req REQ-143
  it("carries exactly the leaves and classes of TRANSLATION_CLASSES plus PARSER_ONLY_LEAVES", () => {
    const tables = documentedClassTables();
    for (const model of STRICT_MODEL_FILES) {
      expect(tables[model], model).toEqual(declaredClassTable(model));
    }
  });

  // @req REQ-143
  it("marks every glossed invariant so the name-and-gloss split is visible per leaf", () => {
    const doc = skillFile("reference/field-classes.md");
    for (const { model, path } of GLOSSED_INVARIANT_PATHS) {
      const row = new RegExp(
        `\\| \`${path.replace(/[[\]]/g, "\\$&")}\` +\\| \`invariant\` +\\| glossed`
      );
      expect(doc, `${model}:${path}`).toMatch(row);
    }
  });
});

/**
 * The `| French | English | Why |` rows of glossary.md, so the rulings the
 * skill quotes can be checked against the glossary instead of trusted.
 */
function documentedRulings(): Array<{ fr: string; en: string }> {
  return skillFile("reference/glossary.md")
    .split("\n")
    .map((line) => line.match(/^\| ([^|]+?) +\| ([^|]+?) +\| .+\|$/))
    .filter((row) => row && row[1] !== "French" && !row[1].startsWith("-"))
    .map((row) => ({ fr: row[1], en: row[2] }));
}

describe("afrik-translator skill — glossary", () => {
  // @req REQ-144
  it("points at the one glossary and the reader entries it is assembled from", () => {
    const doc = skillFile("reference/glossary.md");
    expect(doc).toContain("src/lib/glossaire/terms.ts");
    expect(doc).toContain("src/lib/glossaire/entries.ts");
    expect(existsSync(join(ROOT, "src/lib/glossaire/entries.ts"))).toBe(true);
  });

  // REQ-144 forbids a second glossary, so the rulings the skill carries must
  // be quotations of GLOSSARY_TERMS — a row the glossary does not hold, or
  // renders differently, is the competing list in embryo.
  // @req REQ-144
  it("quotes its rulings from GLOSSARY_TERMS, never from memory", () => {
    const rulings = documentedRulings();
    expect(rulings.length).toBeGreaterThanOrEqual(10);
    for (const { fr, en } of rulings) {
      const term = GLOSSARY_TERMS.find((entry) => entry.fr === fr);
      expect(term, fr).toBeDefined();
      expect(term.en, fr).toBe(en);
    }
    const people = GLOSSARY_TERMS.find((term) => term.key === "domain.peuple");
    for (const forbidden of people.forbiddenEn) {
      expect(skillFile("reference/glossary.md")).toContain(forbidden);
    }
  });
});

describe("afrik-translator skill — register", () => {
  // @req REQ-143
  it("carries both registers under one Voice heading of the brand charter", () => {
    const charter = readFileSync(
      join(ROOT, "docs/design/brand-charter.md"),
      "utf-8"
    );
    expect(charter.match(/^## .*Voice/gm)).toHaveLength(1);
    const voice = charterSection(/^## 3\. Voice/m, /^## 4\./m);
    expect(voice).toContain("vouvoiement");
    expect(voice).toContain("no contractions");
    expect(voice).toContain("British");
  });

  // @req REQ-143
  it("mirrors every class of INTERNAL_REGISTER_PATTERNS in English", () => {
    const register = skillFile("reference/register.md");
    for (const { label } of INTERNAL_REGISTER_PATTERNS) {
      expect(register, label).toContain(label);
    }
    for (const banned of ["research pass", "coverage plan", "inherited tier"]) {
      expect(register, banned).toContain(banned);
    }
  });
});

describe("afrik-translator skill — worked examples still hold in the corpus", () => {
  const examples: Array<[string, string, string]> = [
    [
      "PPL_ASANTE",
      "peuples/FLG_NIGERCONGO/PPL_ASANTE.json",
      "Les chercheurs anglophones utilisent les deux formes de facon interchangeable",
    ],
    [
      "PPL_KHOE_MACRO",
      "peuples/FLG_KHOE/PPL_KHOE_MACRO.json",
      "Hottentots (pejoratif, colonial)",
    ],
    [
      "PPL_TWA",
      "peuples/FLG_BANTU/PPL_TWA.json",
      "Le terme 'Pygmee' (Pygmy en anglais)",
    ],
    ["PPL_ITESO", "peuples/FLG_NILOTIQUE/PPL_ITESO.json", "signifie peuple nu"],
  ];

  // @req REQ-143
  it.each(examples)(
    "%s is quoted from the fiche, not from memory",
    (id, relPath, passage) => {
      // Prettier wraps the quoted passages at 80 columns; a wrap is not drift.
      const rules = skillFile("reference/review-rules.md").replace(/\s+/g, " ");
      expect(rules).toContain(id);
      expect(rules).toContain(passage);
      expect(corpusFile(relPath)).toContain(passage);
    }
  );
});
