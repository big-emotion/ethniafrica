import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

interface CountryFiche {
  _translation?: {
    deferred?: {
      en?: string;
    };
  };
  content: {
    culture: {
      culturalTraditions: string | null;
      dominantReligions: string | null;
      lifestyles: string | null;
      socialOrganization: string | null;
      regionalRelations: string | null;
    };
    sources: Array<{
      title: string;
      url: string | null;
      tier: string;
    }>;
  };
}

interface CountryTracker {
  workstreams: Array<{
    id: string;
    status: string;
    findings: string[];
    remaining: string[];
  }>;
}

interface CultureReview {
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
const cultureReview = JSON.parse(
  readFileSync(
    resolve(
      process.cwd(),
      "docs/editorial/country-enrichment/COD-culture-review.json"
    ),
    "utf8"
  )
) as CultureReview;

describe("DRC country culture application", () => {
  // @req REQ-145
  it("records why English translation waits for the French country pass to stabilise", () => {
    expect(country._translation?.deferred?.en).toBe(
      "The DRC country fiche is still undergoing country-by-country editorial enrichment; translate the complete record after the French source has stabilised."
    );
  });

  // @req REQ-032
  it("publishes only scoped cultural examples at country level", () => {
    expect(country.content.culture.culturalTraditions).toContain(
      "arts de cour luba et lunda"
    );
    expect(country.content.culture.culturalTraditions).toContain(
      "un exemple documenté de l'art de cour chokwe"
    );
    expect(country.content.culture.culturalTraditions).toContain(
      "pratique urbaine partagée avec la République du Congo"
    );
    expect(country.content.culture.culturalTraditions).toContain(
      "ne résument pas les traditions de toutes les communautés"
    );
    expect(country.content.culture.culturalTraditions).not.toContain(
      "architecture traditionnelle"
    );
  });

  // @req REQ-032
  it("describes religion as dated sample-survey context rather than a national census", () => {
    expect(country.content.culture.dominantReligions).toContain("2013-2014");
    expect(country.content.culture.dominantReligions).toContain(
      "femmes et hommes de 15 à 49 ans"
    );
    expect(country.content.culture.dominantReligions).toContain(
      "ne constitue pas un recensement religieux de toute la population"
    );
    expect(country.content.culture.dominantReligions).not.toContain(
      "catholique majoritaire"
    );
  });

  // @req REQ-032
  it("separates regional livelihood variation from national economic aggregates", () => {
    expect(country.content.culture.lifestyles).toContain(
      "varient fortement selon les régions"
    );
    expect(country.content.culture.lifestyles).toContain(
      "ne décrit pas à lui seul les moyens de subsistance"
    );
    expect(country.content.culture.lifestyles).not.toContain(
      "Vie principalement rurale"
    );
  });

  // @req REQ-032
  it("removes unsupported national claims that belong in typed or people-specific records", () => {
    expect(country.content.culture.socialOrganization).toBeNull();
    expect(country.content.culture.regionalRelations).toBeNull();
  });

  // @req REQ-032
  it("adds the accepted culture references without weakening source tiers", () => {
    const urls = new Set(country.content.sources.map((source) => source.url));

    expect(urls).toContain(
      "https://ich.unesco.org/en/RL/congolese-rumba-01711?RL=01711"
    );
    expect(urls).toContain("https://dhsprogram.com/pubs/pdf/FR300/FR300.pdf");
    expect(urls).toContain(
      "https://www.fao.org/giews/countrybrief/country.jsp?code=COD&lang=en"
    );
    expect(
      country.content.sources.every((source) =>
        ["official", "referenced", "unverified"].includes(source.tier)
      )
    ).toBe(true);
  });

  // @req REQ-032
  it("records source JSON application without claiming database synchronization or cultural completeness", () => {
    const cultureWorkstream = tracker.workstreams.find(
      (workstream) => workstream.id === "COD-CULTURE"
    );

    expect(cultureReview).toMatchObject({
      status: "approved_and_applied_to_source_json",
      application: {
        sourceJsonAppliedAt: "2026-09-07",
        databaseSync: "not_performed",
      },
    });
    expect(cultureWorkstream?.status).toBe(
      "source_json_scoped_replacements_applied_additional_research_pending"
    );
    expect(cultureWorkstream?.findings).toContain(
      "The reviewed scoped culture replacements were applied to the country source JSON on 2026-09-07 without claiming national cultural completeness or database synchronization."
    );
    expect(cultureWorkstream?.remaining).not.toContain(
      "Approve the proposed field actions in COD-culture-review.json."
    );
    expect(cultureWorkstream?.remaining).not.toContain(
      "Apply approved changes to the country source file only after explicit editorial approval."
    );
  });
});
