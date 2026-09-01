import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { loadLanguageFiches } from "../languageFicheLoader";

const temporaryDirectories: string[] = [];

function createFixtureDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "language-fiches-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("loadLanguageFiches", () => {
  // @req REQ-136
  it("preserves a fiche's identity, enriched content, aliases, and every source tier", () => {
    const directory = createFixtureDirectory();
    writeFileSync(
      join(directory, "yor.json"),
      JSON.stringify({
        id: "yor",
        isoCode639_3: "yor",
        glottocode: "yoru1245",
        nameFr: "Yoruba",
        nameEn: "Yoruba",
        alternateNames: ["Yariba", "Aku"],
        spellingAliases: ["Yorouba"],
        familyId: "FLG_BENOUECONGO",
        peoples: [{ name: "Yoruba", peopleId: "PPL_YORUBA" }],
        content: {
          vehicularRole: "regional_lingua_franca",
          dialects: ["Oyo", "Ijebu"],
          vitalityStatus: {
            status: "Institutional",
            scale: "EGIDS (Ethnologue)",
            asOf: 2026,
          },
          sources: [
            {
              title: "ISO 639-3",
              url: "https://iso639-3.sil.org/code/yor",
              tier: "official",
            },
            {
              title: "Academic reference",
              url: "https://example.org/reference",
              tier: "referenced",
              notes: "Primary source.",
            },
            {
              title: "Pending verification",
              url: null,
              tier: "unverified",
            },
          ],
        },
      })
    );
    writeFileSync(join(directory, "README.txt"), "ignored");

    expect(loadLanguageFiches(directory)).toEqual([
      {
        id: "yor",
        name: "Yoruba",
        nameFr: "Yoruba",
        familyId: "FLG_BENOUECONGO",
        nameProvenance: "sourced",
        glottocode: "yoru1245",
        spellingAliases: ["Yorouba"],
        nameEn: "Yoruba",
        alternateNames: ["Yariba", "Aku"],
        peoples: [{ name: "Yoruba", peopleId: "PPL_YORUBA" }],
        vehicularRole: "regional_lingua_franca",
        dialects: ["Oyo", "Ijebu"],
        vitalityStatus: {
          status: "Institutional",
          scale: "EGIDS (Ethnologue)",
          asOf: 2026,
        },
        sources: [
          {
            title: "ISO 639-3",
            url: "https://iso639-3.sil.org/code/yor",
            tier: "official",
          },
          {
            title: "Academic reference",
            url: "https://example.org/reference",
            tier: "referenced",
            notes: "Primary source.",
          },
          {
            title: "Pending verification",
            url: null,
            tier: "unverified",
          },
        ],
      },
    ]);
  });
});
