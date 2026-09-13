import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

interface CountrySource {
  title: string;
  url: string | null;
  tier: string;
}

interface CountryFiche {
  summary: string;
  etymology: string;
  nameOriginActor: string;
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
    conservativeNameOriginAppliedAt?: string;
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
  it("retains the two exact sources approved by the cleanup review", () => {
    expect(country.content.sources.map((source) => source.title)).toEqual(
      expect.arrayContaining([
        "UNFPA – World Population Dashboard — République démocratique du Congo",
        "UNSD M49 – Codes normalisés des pays et noms français",
      ])
    );
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

describe("DRC conservative name origin", () => {
  // @req REQ-032
  it("states the sourced river and kingdom relationship without inventing a lexical derivation", () => {
    expect(country.summary).toBe(
      "La République démocratique du Congo tire son nom du fleuve Congo, dont l'appellation Congo/Kongo est historiquement liée au royaume Kongo. Son territoire a connu plusieurs États précoloniaux, la domination léopoldienne puis belge, le nom de Zaïre entre 1971 et 1997, et une grande diversité de peuples et de langues."
    );
    expect(country.etymology).toBe(
      "La République démocratique du Congo tire son nom du fleuve Congo. Le nom Congo/Kongo du fleuve est historiquement lié au royaume Kongo. L'origine lexicale plus ancienne de Kongo demeure incertaine et ne peut être réduite à une signification unique."
    );
    expect(country.nameOriginActor).toBe(
      "Le nom de l'État a été repris de celui du fleuve Congo, lui-même historiquement associé au royaume Kongo. Les sources disponibles ne permettent pas d'attribuer avec certitude l'origine lexicale de Kongo à un acteur ou à une traduction unique."
    );
  });

  // @req REQ-032
  it("cites the exact toponymic and historical references", () => {
    expect(country.content.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Toponymic Factfile: Congo (Democratic Republic)",
          url: "https://assets.publishing.service.gov.uk/media/65a66847867cd8000d5ae933/Democratic_Republic_of_Congo_Toponymic_Factfile.pdf",
          tier: "official",
        }),
        expect.objectContaining({
          title: "Dictionary and Grammar of the Kongo Language",
          url: "https://tile.loc.gov/storage-services/service/gdc/gdclccn/44/01/76/16/44017616/44017616.pdf",
          tier: "referenced",
        }),
      ])
    );
  });

  // @req REQ-032
  it("records the name-origin application while database verification remains pending", () => {
    const identityWorkstream = tracker.workstreams.find(
      (workstream) => workstream.id === "COD-IDENTITY"
    );

    expect(identityWorkstream?.status).toBe(
      "source_json_identity_enriched_database_verification_pending"
    );
    expect(sourceReview.application).toMatchObject({
      conservativeNameOriginAppliedAt: "2026-09-07",
      databaseSync: "not_performed",
    });
  });
});
