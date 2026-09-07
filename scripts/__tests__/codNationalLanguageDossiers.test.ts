import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

interface LanguageDossier {
  id: string;
  isoCode639_3: string;
  glottocode: string;
  nameFr: string;
  nameEn: string;
  alternateNames: string[];
  spellingAliases: string[];
  familyId: string;
  peoples: Array<{ name: string; peopleId: string }>;
  content: {
    vehicularRole: string | null;
    dialects: string[];
    vitalityStatus: {
      status: string;
      scale: string;
      asOf: number;
    } | null;
    sources: Array<{
      title: string;
      url: string | null;
      tier: string;
      notes: string;
    }>;
  };
  _translation?: {
    deferred?: { en?: string };
  };
}

interface LanguageReconciliation {
  summary: {
    localLanguageDossiers: number;
    referenceEntriesWithExactDossier: number;
    referenceEntriesWithAnyLocalSignal: number;
  };
  localLanguageDossiers: Array<{
    id: string;
    matchStatus: string;
    matchedReferenceGlottocodes: string[];
  }>;
}

interface CountryTracker {
  workstreams: Array<{
    id: string;
    status: string;
    findings: string[];
    remaining: string[];
    surfaceProposal?: Array<{
      iso639P3Code: string;
      dossierStatus: string;
      dossierId?: string;
    }>;
  }>;
}

const projectRoot = process.cwd();
const dossierIds = ["ktu", "swc", "lua"] as const;
const expected = {
  ktu: {
    glottocode: "kitu1246",
    nameFr: "Kituba de la République démocratique du Congo",
    nameEn: "Kituba (Democratic Republic of Congo)",
    sourceUrl: "https://glottolog.org/resource/languoid/id/kitu1246",
  },
  swc: {
    glottocode: "cong1236",
    nameFr: "Swahili du Congo",
    nameEn: "Congo Swahili",
    sourceUrl: "https://glottolog.org/resource/languoid/id/cong1236",
  },
  lua: {
    glottocode: "luba1249",
    nameFr: "Tshiluba",
    nameEn: "Luba-Lulua",
    sourceUrl: "https://glottolog.org/resource/languoid/id/luba1249",
  },
} as const;

function dossierPath(id: string): string {
  return resolve(projectRoot, `dataset/source/afrik/langues/${id}.json`);
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    readFileSync(resolve(projectRoot, relativePath), "utf8")
  ) as T;
}

function readDossier(id: string): LanguageDossier | null {
  const path = dossierPath(id);
  return existsSync(path)
    ? (JSON.parse(readFileSync(path, "utf8")) as LanguageDossier)
    : null;
}

describe("DRC national-language dossier wave", () => {
  // @req REQ-136
  it.each(dossierIds)("creates a strict %s language dossier", (id) => {
    const dossier = readDossier(id);

    expect(dossier).not.toBeNull();
    expect(dossier).toMatchObject({
      id,
      isoCode639_3: id,
      glottocode: expected[id].glottocode,
      nameFr: expected[id].nameFr,
      nameEn: expected[id].nameEn,
      familyId: "FLG_BANTU",
      content: {
        vehicularRole: "regional_lingua_franca",
        vitalityStatus: {
          status: "Wider communication",
          scale: "EGIDS (Ethnologue)",
          asOf: 2025,
        },
      },
    });
  });

  // @req REQ-136
  it.each(dossierIds)("cites the exact Glottolog record for %s", (id) => {
    const dossier = readDossier(id);

    expect(dossier?.content.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: expected[id].sourceUrl,
          tier: "official",
        }),
      ])
    );
  });

  // @req REQ-136
  it("links Tshiluba only to the reviewed people-code signals", () => {
    expect(readDossier("lua")?.peoples).toEqual([
      { name: "Luba", peopleId: "PPL_LUBA" },
      { name: "Luba-Kasaï", peopleId: "PPL_LUBA_KASAI" },
      { name: "Lulua", peopleId: "PPL_LULUA" },
    ]);
    expect(readDossier("ktu")?.peoples).toEqual([]);
    expect(readDossier("swc")?.peoples).toEqual([]);
  });

  // @req REQ-145
  it.each(dossierIds)(
    "defers the English counterpart for %s explicitly",
    (id) => {
      expect(readDossier(id)?._translation?.deferred?.en).toBe(
        "English translation is deferred until the French DRC country enrichment pass is stable."
      );
    }
  );

  // @req REQ-032
  it("regenerates the DRC reconciliation from the three new exact dossiers", () => {
    const reconciliation = readJson<LanguageReconciliation>(
      "docs/editorial/country-enrichment/COD-languages.json"
    );

    expect(reconciliation.summary.localLanguageDossiers).toBeGreaterThanOrEqual(
      28
    );
    expect(
      reconciliation.summary.referenceEntriesWithExactDossier
    ).toBeGreaterThanOrEqual(4);
    expect(
      reconciliation.summary.referenceEntriesWithAnyLocalSignal
    ).toBeGreaterThanOrEqual(37);
    for (const id of dossierIds) {
      expect(
        reconciliation.localLanguageDossiers.find((entry) => entry.id === id)
      ).toMatchObject({
        matchStatus: "exact_reference",
        matchedReferenceGlottocodes: [expected[id].glottocode],
      });
    }
  });

  // @req REQ-032
  it("updates the country tracker without claiming that the language surface is approved", () => {
    const tracker = readJson<CountryTracker>(
      "docs/editorial/country-enrichment/COD.json"
    );
    const workstream = tracker.workstreams.find(
      (entry) => entry.id === "COD-LANGUAGES"
    );

    expect(workstream?.status).toContain("surface_approval");
    expect(workstream?.status).toContain("french");
    expect(workstream?.remaining.join(" ")).not.toContain(
      "Create missing French, Kituba (ktu), Congo Swahili (swc), and Tshiluba (lua)"
    );
    expect(workstream?.remaining.join(" ")).toContain(
      "Create the missing French language dossier"
    );
    expect(workstream?.findings.join(" ")).toContain(
      "45 unique ISO 639-3 codes: 34 match a CD reference entry and 11 do not"
    );
    expect(workstream?.findings.join(" ")).not.toContain(
      "The unmatched codes are bfl, bqk, gba, gbp, iyx, kon, liy, lli, swa, teg, tet, and tyi"
    );
    for (const id of dossierIds) {
      expect(
        workstream?.surfaceProposal?.find((entry) => entry.iso639P3Code === id)
      ).toMatchObject({ dossierStatus: "existing", dossierId: id });
    }
  });
});
