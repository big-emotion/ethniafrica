import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), relativePath), "utf8")
  ) as T;
}

interface PeopleFiche {
  content: {
    languages: { isoCodes: string[] };
    sources: Array<{
      title: string;
      url: string | null;
      tier: string;
    }>;
  };
}

interface LanguageReconciliation {
  summary: {
    reviewedPeopleIsoCodesMatchedToReference: number;
    reviewedPeopleIsoCodesUnmatchedToReference: number;
  };
  reviewedPeopleIsoCodes: Array<{
    iso639P3Code: string;
    matchedReferenceEntries: Array<{
      glottocode: string;
      name: string;
    }>;
  }>;
}

interface PeopleLedger {
  entries: Array<{
    id: string;
    review: { notes: string | null };
  }>;
}

interface CountryTracker {
  workstreams: Array<{
    id: string;
    findings: string[];
    remaining: string[];
  }>;
}

const tetela = readJson<PeopleFiche>(
  "dataset/source/afrik/peuples/FLG_NIGERCONGO/PPL_TETELA.json"
);
const reconciliation = readJson<LanguageReconciliation>(
  "docs/editorial/country-enrichment/COD-languages.json"
);
const peopleLedger = readJson<PeopleLedger>(
  "docs/editorial/country-enrichment/COD-peoples.json"
);
const tracker = readJson<CountryTracker>(
  "docs/editorial/country-enrichment/COD.json"
);

describe("DRC Tetela language identifier", () => {
  // @req REQ-032
  it("uses the Tetela ISO 639-3 code instead of the unrelated Tetum code", () => {
    expect(tetela.content.languages.isoCodes).toEqual(["tll"]);
  });

  // @req REQ-032
  it("cites the exact Glottolog Tetela record", () => {
    expect(tetela.content.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Glottolog 5.3 — Tetela (tete1250)",
          url: "https://glottolog.org/resource/languoid/id/tete1250",
          tier: "official",
        }),
      ])
    );
  });

  // @req REQ-032
  it("reconciles tll against the pinned DRC language inventory", () => {
    const code = reconciliation.reviewedPeopleIsoCodes.find(
      (entry) => entry.iso639P3Code === "tll"
    );

    expect(code?.matchedReferenceEntries).toEqual([
      expect.objectContaining({
        glottocode: "tete1250",
        name: "Tetela",
      }),
    ]);
    expect(
      reconciliation.reviewedPeopleIsoCodes.some(
        (entry) => entry.iso639P3Code === "tet"
      )
    ).toBe(false);
    expect(reconciliation.summary).toMatchObject({
      reviewedPeopleIsoCodesMatchedToReference: 34,
      reviewedPeopleIsoCodesUnmatchedToReference: 11,
    });
  });

  // @req REQ-032
  it("records the applied correction without leaving a stale action item", () => {
    const tetelaReview = peopleLedger.entries.find(
      (entry) => entry.id === "PPL_TETELA"
    )?.review;
    const languageWorkstream = tracker.workstreams.find(
      (workstream) => workstream.id === "COD-LANGUAGES"
    );

    expect(tetelaReview?.notes).toContain(
      "The language identifier was corrected to tll"
    );
    expect(tetelaReview?.notes).not.toContain(
      "Replace the code before publication."
    );
    expect(languageWorkstream?.remaining.join(" ")).not.toContain(
      "replace Tetela tet with tll"
    );
    expect(languageWorkstream?.findings.join(" ")).toContain(
      "corrected from tet to tll"
    );
  });
});
