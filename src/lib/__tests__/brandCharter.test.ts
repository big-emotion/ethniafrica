import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it, expect } from "vitest";

import { PRODUCT_NAME, CANONICAL_DOMAIN } from "@/lib/brand";
import { API_ATTRIBUTION } from "@/api/v2/utils/response";
import { getTranslation } from "@/lib/translations";

/**
 * Brand charter §1 — one name, from one file.
 *
 * The audit that produced the charter found five spellings of the product in
 * circulation. The costly one was the attribution string: a reader who cited a
 * fiche was handed a product and a domain that serve nothing, so the citation
 * named a site nobody could reach — on a project whose whole argument is
 * provenance.
 *
 * The retired name is assembled from fragments here rather than written out,
 * so this file does not trip its own scan.
 */
const RETIRED_NAME = ["Africa", "History"].join(" ");
const RETIRED_DOMAIN = ["africa", "history", ".org"].join("");

const SRC = join(__dirname, "..", "..");
const SELF = join(__dirname, "brandCharter.test.ts");
const SKIPPED_DIRS = new Set(["node_modules", ".next"]);

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIPPED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (entry.isFile() && full !== SELF) out.push(full);
  }
  return out;
}

function filesContaining(needle: string): string[] {
  return sourceFiles(SRC)
    .filter((file) => readFileSync(file, "utf8").includes(needle))
    .map((file) => relative(SRC, file));
}

describe("brand charter §1 — one name", () => {
  // @req REQ-019
  it("states the retired product name nowhere in src/", () => {
    expect(filesContaining(RETIRED_NAME)).toEqual([]);
  });

  // @req REQ-019
  it("states the retired domain nowhere in src/", () => {
    expect(filesContaining(RETIRED_DOMAIN)).toEqual([]);
  });

  // @req REQ-019
  it("composes the API attribution from the brand constants", () => {
    expect(API_ATTRIBUTION).toBe(`${PRODUCT_NAME} — ${CANONICAL_DOMAIN}`);
  });
});

describe("brand charter §2 — the footer states the licence", () => {
  // @req REQ-019
  it("names the corpus licence rather than reserving rights", () => {
    const { footer } = getTranslation("fr");

    expect(footer.copyright).toContain("CC BY-SA 4.0");
    expect(footer.copyright).not.toMatch(/tous droits réservés/i);
  });
});
