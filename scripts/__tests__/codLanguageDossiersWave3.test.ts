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
  familyId: string;
  peoples: Array<{ name: string; peopleId: string }>;
  content: {
    vehicularRole: string;
    vitalityStatus: { status: string; scale: string; asOf: number };
    sources: Array<{ url: string | null; tier: string }>;
  };
  _translation?: { deferred?: { en?: string } };
};

type Reconciliation = {
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

type Tracker = {
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
  hav: {
    glottocode: "havu1238",
    nameFr: "Havu (kihavu)",
    nameEn: "Havu",
    alternateNames: ["Haavu", "Kihavu"],
    vitality: "Vigorous",
    people: { name: "Havu", peopleId: "PPL_HAVU" },
  },
  hke: {
    glottocode: "hund1239",
    nameFr: "Hunde (kihunde)",
    nameEn: "Hunde",
    alternateNames: ["Kihunde", "Kobi", "Rukobi"],
    vitality: "Vigorous",
    people: { name: "Hunde", peopleId: "PPL_HUNDE" },
  },
  nnb: {
    glottocode: "nand1264",
    nameFr: "Nande (kinande)",
    nameEn: "Nande",
    alternateNames: ["Kinande", "Kinandi", "Orundande"],
    vitality: "Developing",
    people: { name: "Nande", peopleId: "PPL_NANDE" },
  },
} as const;

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    readFileSync(resolve(projectRoot, relativePath), "utf8")
  ) as T;
}

function readDossier(id: keyof typeof expected): LanguageDossier | null {
  const file = resolve(projectRoot, `dataset/source/afrik/langues/${id}.json`);
  return existsSync(file)
    ? (JSON.parse(readFileSync(file, "utf8")) as LanguageDossier)
    : null;
}

describe("DRC evidence-prioritized language dossier wave 3", () => {
  // @req REQ-136
  it.each(Object.keys(expected) as Array<keyof typeof expected>)(
    "creates the conservative %s language dossier",
    (id) => {
      const record = expected[id];
      expect(readDossier(id)).toMatchObject({
        id,
        isoCode639_3: id,
        glottocode: record.glottocode,
        nameFr: record.nameFr,
        nameEn: record.nameEn,
        alternateNames: record.alternateNames,
        spellingAliases: [],
        familyId: "FLG_BANTU",
        peoples: [record.people],
        content: {
          vehicularRole: "non_vehicular",
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
    "cites the exact Glottolog record for %s",
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
  it("regenerates ten exact dossiers without changing the any-signal count", () => {
    const reconciliation = readJson<Reconciliation>(
      "docs/editorial/country-enrichment/COD-languages.json"
    );

    expect(reconciliation.summary).toMatchObject({
      localLanguageDossiers: 34,
      referenceEntriesWithExactDossier: 10,
      referenceEntriesWithAnyLocalSignal: 37,
    });
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
  it("tracks the third wave without clearing the French or surface blockers", () => {
    const tracker = readJson<Tracker>(
      "docs/editorial/country-enrichment/COD.json"
    );
    const workstream = tracker.workstreams.find(
      (entry) => entry.id === "COD-LANGUAGES"
    );
    const findings = workstream?.findings.join(" ") ?? "";
    const remaining = workstream?.remaining.join(" ") ?? "";

    expect(workstream?.status).toBe(
      "third_language_dossier_wave_created_surface_approval_and_french_taxonomy_pending"
    );
    expect(findings).toContain("Havu (hav), Hunde (hke), and Nande (nnb)");
    expect(findings).toContain(
      "ten exact local dossiers while the any-local-signal count remains 37"
    );
    expect(remaining).toContain("215 Glottolog entries");
    expect(remaining).toContain("missing French language dossier");
    expect(remaining).toContain("country surface proposal");
  });
});
