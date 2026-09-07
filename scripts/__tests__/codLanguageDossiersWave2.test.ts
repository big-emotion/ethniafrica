import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type LanguageDossier = {
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
    vehicularRole: string;
    dialects: string[];
    vitalityStatus: { status: string; scale: string; asOf: number };
    sources: Array<{ url: string | null; tier: string }>;
  };
  _translation?: { deferred?: { en?: string } };
};

type LanguageReconciliation = {
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
};

type CountryTracker = {
  workstreams: Array<{
    id: string;
    status: string;
    findings: string[];
    remaining: string[];
  }>;
};

const projectRoot = process.cwd();
const deferralReason =
  "English translation is deferred until the French DRC country enrichment pass is stable.";
const expected = {
  lub: {
    glottocode: "luba1250",
    nameFr: "Kiluba (luba-katanga)",
    nameEn: "Luba-Katanga",
    alternateNames: ["Kiluba", "Luba-Shaba"],
    familyId: "FLG_BANTU",
    role: "non_vehicular",
    vitality: "Threatened",
    peopleLinks: [
      { name: "Luba", peopleId: "PPL_LUBA" },
      { name: "Luba-Katanga", peopleId: "PPL_LUBA_KATANGA" },
    ],
  },
  tll: {
    glottocode: "tete1250",
    nameFr: "Otetela",
    nameEn: "Tetela",
    alternateNames: ["Kitetela", "Sungu"],
    familyId: "FLG_BANTU",
    role: "non_vehicular",
    vitality: "Vigorous",
    peopleLinks: [{ name: "Tetela", peopleId: "PPL_TETELA" }],
  },
  alz: {
    glottocode: "alur1250",
    nameFr: "Alur",
    nameEn: "Alur",
    alternateNames: ["Dho Alur", "Aloro"],
    familyId: "FLG_NILOTIQUE",
    role: "non_vehicular",
    vitality: "Developing",
    peopleLinks: [{ name: "Alur", peopleId: "PPL_ALUR" }],
  },
} as const;

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    readFileSync(resolve(projectRoot, relativePath), "utf8")
  ) as T;
}

function readDossier(id: keyof typeof expected): LanguageDossier | null {
  const path = resolve(projectRoot, `dataset/source/afrik/langues/${id}.json`);
  return existsSync(path)
    ? (JSON.parse(readFileSync(path, "utf8")) as LanguageDossier)
    : null;
}

describe("DRC evidence-prioritized language dossier wave 2", () => {
  // @req REQ-136
  it.each(Object.keys(expected) as Array<keyof typeof expected>)(
    "creates the exact %s dossier with conservative language metadata",
    (id) => {
      const dossier = readDossier(id);
      const record = expected[id];

      expect(dossier).not.toBeNull();
      expect(dossier).toMatchObject({
        id,
        isoCode639_3: id,
        glottocode: record.glottocode,
        nameFr: record.nameFr,
        nameEn: record.nameEn,
        alternateNames: record.alternateNames,
        spellingAliases: [],
        familyId: record.familyId,
        peoples: record.peopleLinks,
        content: {
          vehicularRole: record.role,
          dialects: [],
          vitalityStatus: {
            status: record.vitality,
            scale: "EGIDS (Ethnologue)",
            asOf: 2025,
          },
        },
      });
    }
  );

  // @req REQ-136
  it.each(Object.keys(expected) as Array<keyof typeof expected>)(
    "cites the exact official Glottolog record for %s",
    (id) => {
      expect(readDossier(id)?.content.sources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            url: `https://glottolog.org/resource/languoid/id/${expected[id].glottocode}`,
            tier: "official",
          }),
        ])
      );
    }
  );

  // @req REQ-145
  it.each(Object.keys(expected) as Array<keyof typeof expected>)(
    "records the temporary English translation deferral for %s",
    (id) => {
      expect(readDossier(id)?._translation?.deferred?.en).toBe(deferralReason);
    }
  );

  // @req REQ-032
  it("regenerates the DRC reconciliation without inflating the any-signal count", () => {
    const reconciliation = readJson<LanguageReconciliation>(
      "docs/editorial/country-enrichment/COD-languages.json"
    );

    expect(reconciliation.summary.localLanguageDossiers).toBeGreaterThanOrEqual(
      31
    );
    expect(
      reconciliation.summary.referenceEntriesWithExactDossier
    ).toBeGreaterThanOrEqual(7);
    expect(
      reconciliation.summary.referenceEntriesWithAnyLocalSignal
    ).toBeGreaterThanOrEqual(37);
    for (const [id, record] of Object.entries(expected)) {
      expect(
        reconciliation.localLanguageDossiers.find((entry) => entry.id === id)
      ).toMatchObject({
        matchStatus: "exact_reference",
        matchedReferenceGlottocodes: [record.glottocode],
      });
    }
  });

  // @req REQ-032
  it("tracks the second wave while preserving the French and surface blockers", () => {
    const tracker = readJson<CountryTracker>(
      "docs/editorial/country-enrichment/COD.json"
    );
    const workstream = tracker.workstreams.find(
      (entry) => entry.id === "COD-LANGUAGES"
    );
    const findings = workstream?.findings.join(" ") ?? "";
    const remaining = workstream?.remaining.join(" ") ?? "";

    expect(workstream?.status).toContain("surface_approval");
    expect(workstream?.status).toContain("french_taxonomy");
    expect(findings).toContain(
      "Luba-Katanga (lub), Tetela (tll), and Alur (alz)"
    );
    expect(findings).toContain(
      "seven exact local dossiers while the any-local-signal count remains 37"
    );
    expect(remaining).toContain("215 Glottolog entries");
    expect(remaining).toContain("missing French language dossier");
    expect(remaining).toContain("country surface proposal");
  });
});
