import { describe, expect, it } from "vitest";

import { buildCountryPatronymLedger } from "../lib/countryPatronymLedger";

describe("buildCountryPatronymLedger", () => {
  // @req REQ-133
  it("lists every direct country relation and keeps status separate from depth", () => {
    const ledger = buildCountryPatronymLedger({
      countryId: "COD",
      updatedAt: "2026-09-06",
      dossiers: [
        {
          id: "PAT_NONO",
          nameMain: "Nono",
          nameSystem: "clan_name",
          transmissionMode: "other",
          countries: [{ countryId: "COD", status: "supposed" }],
          peoples: [],
          origin: {
            oralTraditions: [],
            writtenChronicles: [],
            linguisticReconstructions: [],
          },
          sources: [
            {
              source_kind: "secondary",
              tier: "referenced",
              url: "https://example.com/nono",
            },
          ],
        },
        {
          id: "PAT_KABILA",
          nameMain: "Kabila",
          nameSystem: "clan_name",
          transmissionMode: "hereditary",
          countries: [{ countryId: "COD", status: "attested" }],
          peoples: [{ peopleId: "PPL_LUBA" }],
          origin: {
            oralTraditions: [],
            writtenChronicles: [],
            linguisticReconstructions: [],
          },
          sources: [
            { source_kind: "ai_generated", tier: "unverified", url: null },
          ],
        },
        {
          id: "PAT_OTHER",
          nameMain: "Other",
          nameSystem: "clan_name",
          transmissionMode: "hereditary",
          countries: [{ countryId: "AGO", status: "attested" }],
          peoples: [],
          origin: {
            oralTraditions: [],
            writtenChronicles: [],
            linguisticReconstructions: [],
          },
          sources: [],
        },
      ],
    });

    expect(ledger.summary).toEqual({
      directCountryFiches: 2,
      byCountryStatus: { attested: 1, supposed: 1 },
      byDepthStage: {
        "queue-only": 1,
        "unsourced-origin": 1,
        "undeclared-transmission": 0,
        documented: 0,
      },
      documentedPercent: 0,
    });
    expect(ledger.names.map((name) => name.id)).toEqual([
      "PAT_KABILA",
      "PAT_NONO",
    ]);
    expect(ledger.names[0]).toMatchObject({
      countryStatus: "attested",
      depthStage: "queue-only",
      peopleIds: ["PPL_LUBA"],
      nextAction: "replace_candidate_queue_with_accepted_source",
    });
    expect(ledger.names[1]).toMatchObject({
      countryStatus: "supposed",
      depthStage: "unsourced-origin",
      acceptedSourceCount: 1,
      sourcesWithUrlCount: 1,
      nextAction: "document_origin_claim",
    });
  });
});
