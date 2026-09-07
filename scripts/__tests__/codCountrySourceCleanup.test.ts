import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

interface CountrySource {
  title: string;
  url: string | null;
  tier: string;
}

interface CountryFiche {
  content: {
    sources: CountrySource[];
  };
}

interface CountryTracker {
  workstreams: Array<{
    id: string;
    status: string;
    remaining: string[];
  }>;
}

interface SourceReview {
  status: string;
  application?: {
    sourceJsonAppliedAt?: string;
    databaseSync?: string;
  };
}

const country = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "dataset/source/afrik/pays/COD.json"),
    "utf8"
  )
) as CountryFiche;
const tracker = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "docs/editorial/country-enrichment/COD.json"),
    "utf8"
  )
) as CountryTracker;
const sourceReview = JSON.parse(
  readFileSync(
    resolve(
      process.cwd(),
      "docs/editorial/country-enrichment/COD-source-review.json"
    ),
    "utf8"
  )
) as SourceReview;

describe("DRC country source cleanup", () => {
  // @req REQ-032
  it("keeps only the two exact sources approved by the editorial review", () => {
    expect(country.content.sources).toHaveLength(2);
    expect(country.content.sources.map((source) => source.title)).toEqual([
      "UNFPA – World Population Dashboard — République démocratique du Congo",
      "UNSD M49 – Standard country or area codes for statistical use, noms français (nom d'usage) – [tier 1]",
    ]);
  });

  // @req REQ-032
  it("does not retain unresolved or untraceable country sources", () => {
    expect(
      country.content.sources.every(
        (source) => source.tier !== "needs_review" && source.url !== null
      )
    ).toBe(true);
  });

  // @req REQ-032
  it("records the source JSON application without claiming database publication", () => {
    const sourceWorkstream = tracker.workstreams.find(
      (workstream) => workstream.id === "COD-SOURCES"
    );

    expect(sourceWorkstream?.status).toBe(
      "source_json_cleanup_applied_field_level_enrichment_pending"
    );
    expect(sourceWorkstream?.remaining).not.toContain(
      "Apply the approved cleanup to dataset/source/afrik/pays/COD.json only after explicit editorial approval."
    );
    expect(sourceReview).toMatchObject({
      status: "approved_and_applied_to_source_json",
      application: {
        sourceJsonAppliedAt: "2026-09-07",
        databaseSync: "not_performed",
      },
    });
  });
});
