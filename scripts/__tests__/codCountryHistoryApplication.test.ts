import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

interface CountryHistorySource {
  title: string;
  url: string | null;
  tier: string;
}

interface CountryFiche {
  content: {
    historicalNames: {
      formerNames: string[];
      antiquity: string | null;
      middleAges: string | null;
      precolonial: string | null;
      colonization: string | null;
      contemporary: string | null;
    };
    kingdoms: Array<{
      name: string;
      entryType: string;
      politicalCenters: string[];
    }>;
    historicalFacts: {
      ancientPeriods: string | null;
      middleAges: string | null;
      precolonial: string | null;
      colonization: string | null;
      independenceStruggle: string | null;
      postIndependence: string | null;
    };
    sources: CountryHistorySource[];
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

interface HistoryReview {
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
const historyReview = JSON.parse(
  readFileSync(
    resolve(
      process.cwd(),
      "docs/editorial/country-enrichment/COD-history.json"
    ),
    "utf8"
  )
) as HistoryReview;

describe("DRC country history application", () => {
  // @req REQ-148
  it("publishes the reviewed first-wave political formations without mixing state periods into the polity list", () => {
    expect(country.content.kingdoms.map((entry) => entry.name)).toEqual([
      "Royaume Kongo",
      "État luba",
      "État lunda",
      "Royaume kuba",
      "État yeke ou garanganze sous Msiri",
      "Chefferies chokwe",
      "Royaumes zande",
    ]);
    expect(
      country.content.kingdoms.every((entry) => entry.entryType === "polity")
    ).toBe(true);
    expect(country.content.kingdoms.map((entry) => entry.name)).not.toEqual(
      expect.arrayContaining([
        "Chefferies Mongo",
        "Royaumes Mangbetu",
        "État indépendant du Congo",
        "Congo belge",
        "République démocratique du Congo",
      ])
    );
  });

  // @req REQ-148
  it("keeps transborder and plural formations explicit", () => {
    const kongo = country.content.kingdoms.find(
      (entry) => entry.name === "Royaume Kongo"
    );
    const chokwe = country.content.kingdoms.find(
      (entry) => entry.name === "Chefferies chokwe"
    );
    const zande = country.content.kingdoms.find(
      (entry) => entry.name === "Royaumes zande"
    );

    expect(kongo?.politicalCenters).toContain(
      "Mbanza Kongo (dans l'Angola actuel)"
    );
    expect(chokwe).toBeDefined();
    expect(zande).toBeDefined();
  });

  // @req REQ-148
  it("opens the deep-past account with the regional Upemba sequence and its scope caveat", () => {
    expect(country.content.historicalFacts.ancientPeriods).toContain(
      "dépression de l'Upemba"
    );
    expect(country.content.historicalFacts.ancientPeriods).toContain(
      "séquence régionale"
    );
    expect(country.content.historicalNames.middleAges).not.toContain(
      "Moyen Âge"
    );
  });

  // @req REQ-149
  it("periodizes the independent state's attested names", () => {
    expect(country.content.historicalNames.formerNames).toEqual([
      "État indépendant du Congo (1885-1908)",
      "Congo belge (1908-1960)",
      "République du Congo (Léopoldville) (30 juin 1960-31 juillet 1964)",
      "République du Zaïre (27 octobre 1971-16 mai 1997)",
    ]);
    expect(country.content.historicalNames.contemporary).toContain(
      "Depuis le 17 mai 1997"
    );
  });

  // @req REQ-032
  it("retains resolvable accepted sources for the applied historical claims", () => {
    const urls = new Set(country.content.sources.map((source) => source.url));

    expect(urls).toContain("https://whc.unesco.org/fr/listesindicatives/963/");
    expect(urls).toContain(
      "https://www.africamuseum.be/en/discover/history_articles/the_yeke_and_the_congo_free_state"
    );
    expect(urls).toContain("https://digitallibrary.un.org/record/878251");
    expect(
      country.content.sources.every(
        (source) =>
          source.url !== null &&
          ["official", "referenced", "unverified"].includes(source.tier)
      )
    ).toBe(true);
  });

  // @req REQ-148
  it("records source JSON application without claiming database synchronization or exhaustive coverage", () => {
    const historyWorkstream = tracker.workstreams.find(
      (workstream) => workstream.id === "COD-HISTORY"
    );

    expect(historyReview).toMatchObject({
      status: "approved_and_applied_to_source_json",
      application: {
        sourceJsonAppliedAt: "2026-09-07",
        databaseSync: "not_performed",
      },
    });
    expect(historyWorkstream?.status).toBe(
      "source_json_first_wave_applied_additional_research_pending"
    );
    expect(historyWorkstream?.findings).toContain(
      "The reviewed first-wave history was applied to the country source JSON on 2026-09-07 without claiming exhaustive national coverage or database synchronization."
    );
    expect(historyWorkstream?.remaining).not.toContain(
      "Approve or amend the taxonomy, geographic-fit decisions, and first-wave entries in COD-history.json before modifying production country data."
    );
  });
});
