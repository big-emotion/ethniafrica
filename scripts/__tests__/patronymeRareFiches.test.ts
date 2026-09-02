import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  PATRONYME_NAME_SYSTEMS,
  parsePatronymeFile,
} from "../../src/lib/afrik/parsers/patronymeParser";

const FICHES = {
  PAT_FFUMBE: "totemic_clan",
  PAT_LUGAVE: "totemic_clan",
  PAT_NGONGE: "totemic_clan",
  PAT_NJAZA: "totemic_clan",
  PAT_KEBREAB_PATRONYMIC: "non_hereditary_patronymic",
  PAT_WOLDE_MARIAM_PATRONYMIC: "non_hereditary_patronymic",
  PAT_GHEBREMICHAEL_PATRONYMIC: "non_hereditary_patronymic",
  PAT_HAILE_PATRONYMIC: "non_hereditary_patronymic",
  PAT_MAGHRAWA: "nisba",
  PAT_BANU_IFRAN: "nisba",
  PAT_ABIKAN_PRAISE: "praise_name",
  PAT_MNTUNGWA_PRAISE: "praise_name",
} as const;

function readFiche(id: keyof typeof FICHES) {
  return JSON.parse(
    readFileSync(
      resolve(process.cwd(), "dataset/source/afrik/patronymes", `${id}.json`),
      "utf8"
    )
  );
}

describe("ETNI-1682 rare patronyme fiches", () => {
  // @req REQ-133
  // @req REQ-134
  it("publishes the twelve selected dossiers with their canonical systems", () => {
    expect(PATRONYME_NAME_SYSTEMS).toEqual([
      "clan_name",
      "non_hereditary_patronymic",
      "nisba",
      "praise_name",
      "totemic_clan",
    ]);

    for (const [id, nameSystem] of Object.entries(FICHES)) {
      const parsed = parsePatronymeFile(readFiche(id as keyof typeof FICHES));

      expect(parsed.errors, id).toBeUndefined();
      expect(parsed.data, id).toMatchObject({ id, nameSystem });
    }
  });

  // @req REQ-133
  // @req REQ-134
  it("uses direct non-Wikipedia sources and avoids unsafe person claims", () => {
    for (const id of Object.keys(FICHES) as Array<keyof typeof FICHES>) {
      const fiche = readFiche(id);

      // The unsafe claim this guards against is an unsourced office or a
      // living person, not a filled field. Asserting emptiness froze the
      // selection pass's state and would have made any later research fail
      // the build for having found something.
      if (fiche.casteOrSocialFunction !== null) {
        expect(fiche.casteOrSocialFunction.sourceRefs, id).not.toHaveLength(0);
      }
      for (const bearer of fiche.bearers) {
        expect(bearer.status, `${id}: bearer status`).toBe("deceased");
        expect(bearer.sourceRefs, `${id}: bearer sources`).not.toHaveLength(0);
      }
      expect(fiche.sources.length, id).toBeGreaterThan(0);
      expect(fiche.sources, id).toSatisfy(
        (sources: Array<{ tier?: string; url?: string }>) =>
          sources.every(
            (source) =>
              ["official", "referenced", "unverified"].includes(
                source.tier ?? ""
              ) &&
              /^https:\/\//.test(source.url ?? "") &&
              !/wikipedia\.org/i.test(source.url ?? "")
          )
      );
    }
  });

  // @req REQ-134
  it("keeps Baganda totemic evidence separate from Rwanda and Burundi", () => {
    for (const id of [
      "PAT_FFUMBE",
      "PAT_LUGAVE",
      "PAT_NGONGE",
      "PAT_NJAZA",
    ] as const) {
      const fiche = readFiche(id);

      expect(fiche.peoples).toEqual([
        expect.objectContaining({ peopleId: "PPL_GANDA" }),
      ]);
      expect(fiche.countries).toEqual([
        expect.objectContaining({ countryId: "UGA" }),
      ]);
      expect(JSON.stringify(fiche)).not.toMatch(/PPL_(RWANDA|BURUNDI)/);
    }
  });

  // @req REQ-134
  it("documents Ethiopian and Eritrean terms as non-hereditary father names", () => {
    for (const id of [
      "PAT_KEBREAB_PATRONYMIC",
      "PAT_WOLDE_MARIAM_PATRONYMIC",
      "PAT_GHEBREMICHAEL_PATRONYMIC",
      "PAT_HAILE_PATRONYMIC",
    ] as const) {
      const fiche = readFiche(id);
      const dossierText = JSON.stringify(fiche).toLowerCase();

      expect(fiche.transmissionMode, id).toBe("non_hereditary");
      expect(fiche.designatedSocialUnit, id).toBe("individual");
      expect(dossierText, id).toContain("nom personnel du père");
      expect(dossierText, id).toContain("nom de famille héréditaire");
    }
  });
});
