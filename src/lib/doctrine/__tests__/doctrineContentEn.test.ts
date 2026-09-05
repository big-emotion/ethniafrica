import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CLASSIFICATION_DEFINITIONS_EN,
  DOCTRINE_ENTRIES_EN,
  DOCTRINE_PAGE_EN,
} from "@/lib/doctrine/doctrineContent.en";
import { CLASSIFICATION_LABELS } from "@/lib/glossaire/vocabularies";
import { frenchResidue, glossaryBreaches } from "@/test/englishBankParity";

/**
 * The French MDX rows are a database seed, not a module, so their key set
 * and shape are read from the migration that plants them. A slug added to
 * the seed without an English row fails here rather than serving a French
 * page under /en.
 */
const SEED = readFileSync(
  resolve(
    __dirname,
    "../../../../supabase/migrations/018_editorial_doctrine_seed.sql"
  ),
  "utf8"
);

const FRENCH_ROWS = [
  ...SEED.matchAll(/\(\s*'([a-z-]+)',\s*'[^']*',\s*\$mdx\$([\s\S]*?)\$mdx\$/g),
].map((match) => ({ slug: match[1], mdx: match[2] }));

/** Headings and bullets: the skeleton a translation may not add to or drop. */
function skeleton(mdx: string): string[] {
  return mdx
    .split("\n")
    .map((line) => line.match(/^(#+|-)\s/)?.[1] ?? null)
    .filter((marker): marker is string => marker !== null);
}

describe("the English classification definitions", () => {
  // @req REQ-145
  it("defines every classification status the badge can carry, and no other", () => {
    expect(Object.keys(CLASSIFICATION_DEFINITIONS_EN).sort()).toEqual(
      Object.keys(CLASSIFICATION_LABELS.fr).sort()
    );
  });

  // @req REQ-145
  it("writes each definition in English, naming the status it defines", () => {
    for (const [status, definition] of Object.entries(
      CLASSIFICATION_DEFINITIONS_EN
    )) {
      const label =
        CLASSIFICATION_LABELS.en[
          status as keyof typeof CLASSIFICATION_LABELS.en
        ].label;
      expect(definition.description.split(/\s+/).length).toBeGreaterThan(20);
      expect(definition.description.toLowerCase()).toContain(
        label.toLowerCase().replace(/ /g, "-")
      );
      expect(frenchResidue(definition.description)).toBeNull();
      expect(glossaryBreaches(definition.description)).toEqual([]);
      expect(definition.provenance).toBe("machine");
    }
  });

  // @req REQ-145
  it("carries the page's own heading and standfirst", () => {
    expect(frenchResidue(DOCTRINE_PAGE_EN.heading)).toBeNull();
    expect(frenchResidue(DOCTRINE_PAGE_EN.intro)).toBeNull();
    expect(glossaryBreaches(DOCTRINE_PAGE_EN.intro)).toEqual([]);
    expect(DOCTRINE_PAGE_EN.provenance).toBe("machine");
  });
});

describe("the English doctrine entries", () => {
  // @req REQ-145
  it("answers every seeded French row by slug, and no other", () => {
    expect(FRENCH_ROWS.length).toBe(4);
    expect(Object.keys(DOCTRINE_ENTRIES_EN).sort()).toEqual(
      FRENCH_ROWS.map((row) => row.slug).sort()
    );
  });

  /**
   * A translation keeps the document's skeleton: the same headings in the
   * same order, the same number of policy bullets. A dropped bullet is a
   * dropped commitment, and a reader of one locale would be promised less
   * than a reader of the other.
   */
  // @req REQ-145
  it("keeps every heading and every bullet of the French row", () => {
    for (const row of FRENCH_ROWS) {
      const entry = DOCTRINE_ENTRIES_EN[row.slug];
      expect(skeleton(row.mdx).length, row.slug).toBeGreaterThan(3);
      expect(skeleton(entry.mdxSource), row.slug).toEqual(skeleton(row.mdx));
      expect(entry.mdxSource).not.toBe(row.mdx);
    }
  });

  // @req REQ-145
  it("translates the title and the body, under the glossary's rulings", () => {
    for (const [slug, entry] of Object.entries(DOCTRINE_ENTRIES_EN)) {
      expect(entry.title.trim(), slug).not.toBe("");
      expect(frenchResidue(entry.title), slug).toBeNull();
      expect(frenchResidue(entry.mdxSource), slug).toBeNull();
      expect(glossaryBreaches(entry.mdxSource), slug).toEqual([]);
      expect(entry.mdxSource).toContain(`# ${entry.title}`);
      expect(entry.provenance).toBe("machine");
    }
  });

  // @req REQ-143
  it("keeps the institutions the sensitive-topics row cites verbatim", () => {
    for (const institution of ["UN", "UNFPA", "IWGIA", "UNESCO"]) {
      expect(DOCTRINE_ENTRIES_EN["topics-sensibles"].mdxSource).toContain(
        institution
      );
    }
  });
});
