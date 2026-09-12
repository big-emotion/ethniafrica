import { describe, expect, it } from "vitest";

import {
  auditDemography,
  type CountryFiche,
  type PeopleFiche,
} from "../demographyAudit";

/**
 * Fixtures reproduce the four shapes the real corpus exhibits, in miniature:
 * a macro-group, a duplicate cluster whose widest fiche is not its richest,
 * a country that over-counts itself, and the two declarations disagreeing.
 */
function people(
  id: string,
  nameMain: string,
  overrides: Partial<PeopleFiche["content"]> & {
    totalPopulation?: number;
    source?: string;
    distribution?: Record<string, number>;
    prose?: string;
  } = {}
): PeopleFiche {
  const { totalPopulation, source, distribution, prose, ...content } =
    overrides;
  return {
    id,
    nameMain,
    languageFamilyId: "FLG_BANTU",
    content: {
      ethnicities: [],
      culture: { majorRites: prose ?? null },
      demography: {
        totalPopulation: totalPopulation ?? 1_000,
        referenceYear: 2025,
        source: source ?? "",
        distributionByCountry: Object.entries(distribution ?? {}).map(
          ([country, population]) => ({ country, population })
        ),
      },
      sources: [],
      ...content,
    },
  } as PeopleFiche;
}

function country(
  id: string,
  totalPopulation: number,
  peoples: { peopleId?: string; percentageInCountry: number }[] = []
): CountryFiche {
  return {
    id,
    content: { demographics: { totalPopulation, peoples } },
  } as CountryFiche;
}

describe("auditDemography", () => {
  // @req REQ-028
  it("flags a fiche whose name marks it as a macro-group", () => {
    const report = auditDemography(
      [
        people("PPL_MANDE_MACRO", "Peuples Mandé (macro-groupe)"),
        people("PPL_BAMBARA", "Bambara"),
      ],
      []
    );

    expect(report.macroGroups.map((entry) => entry.id)).toEqual([
      "PPL_MANDE_MACRO",
    ]);
  });

  // @req REQ-028
  it("treats PPL_BANTU as a macro-group even though its name looks like a people", () => {
    const report = auditDemography([people("PPL_BANTU", "Bantou")], []);

    expect(report.macroGroups.map((entry) => entry.id)).toEqual(["PPL_BANTU"]);
  });

  // @req REQ-028
  it("reports a fiche that names two other fiches in its own ethnicities list", () => {
    const report = auditDemography(
      [
        people("PPL_AKAN", "Akan", { ethnicities: ["Asante", "Fante"] }),
        people("PPL_ASANTE", "Asante"),
        people("PPL_FANTE", "Fante"),
      ],
      []
    );

    expect(report.containerFiches).toEqual([
      expect.objectContaining({
        id: "PPL_AKAN",
        contains: ["PPL_ASANTE", "PPL_FANTE"],
      }),
    ]);
  });

  // @req REQ-028
  it("does not call a fiche a container when it names a single other fiche", () => {
    const report = auditDemography(
      [
        people("PPL_TSONGA", "Tsonga", { ethnicities: ["Ronga"] }),
        people("PPL_RONGA", "Ronga"),
      ],
      []
    );

    expect(report.containerFiches).toEqual([]);
  });

  // @req REQ-028
  it("clusters fiches that differ only by a country qualifier", () => {
    const report = auditDemography(
      [
        people("PPL_LOMWE", "Lomwe", { distribution: { MOZ: 5, MWI: 5 } }),
        people("PPL_LOMWE_MOZ", "Lomwe (Mozambique)", {
          distribution: { MOZ: 4 },
        }),
        people("PPL_LOMWE_MALA", "Lomwe (Malawi)", {
          distribution: { MWI: 3 },
        }),
      ],
      []
    );

    expect(report.duplicateClusters).toHaveLength(1);
    expect(report.duplicateClusters[0].members.map((m) => m.id).sort()).toEqual(
      ["PPL_LOMWE", "PPL_LOMWE_MALA", "PPL_LOMWE_MOZ"]
    );
  });

  // @req REQ-028
  it("keeps two genuinely different peoples apart", () => {
    const report = auditDemography(
      [people("PPL_MENDE", "Mende"), people("PPL_TEMNE", "Temne")],
      []
    );

    expect(report.duplicateClusters).toEqual([]);
  });

  // @req REQ-028
  it("proposes the widest-scope fiche as principal and flags the lost prose", () => {
    const report = auditDemography(
      [
        people("PPL_LUBA", "Luba", {
          distribution: { COD: 13, AGO: 1 },
          prose: "short",
        }),
        people("PPL_LUBA_KATANGA", "Luba (Katanga)", {
          distribution: { COD: 5 },
          prose: "a considerably longer account of the Katanga branch",
        }),
      ],
      []
    );

    const [cluster] = report.duplicateClusters;
    expect(cluster.proposedPrincipal).toBe("PPL_LUBA");
    expect(cluster.richestText).toBe("PPL_LUBA_KATANGA");
    expect(cluster.textConflict).toBe(true);
  });

  // @req REQ-028
  it("measures how far a country over-counts itself", () => {
    const report = auditDemography(
      [
        people("PPL_SOTHO", "Sotho", { distribution: { LSO: 2_350_000 } }),
        people("PPL_SESOTHO_NATL", "Sesotho (National)", {
          distribution: { LSO: 2_200_000 },
        }),
      ],
      [country("LSO", 2_400_000)]
    );

    const lesotho = report.countryOvercount.find((c) => c.country === "LSO");
    expect(lesotho?.sumRaw).toBe(4_550_000);
    expect(lesotho?.ratioRaw).toBeCloseTo(1.9, 1);
  });

  // @req REQ-028
  it("re-measures the over-count with macro-groups and duplicates removed", () => {
    const report = auditDemography(
      [
        people("PPL_BANTU", "Bantou", { distribution: { LSO: 2_100_000 } }),
        people("PPL_SOTHO", "Sotho", { distribution: { LSO: 2_350_000 } }),
      ],
      [country("LSO", 2_400_000)]
    );

    const lesotho = report.countryOvercount.find((c) => c.country === "LSO");
    expect(lesotho?.sumAfterCuration).toBe(2_350_000);
    expect(lesotho?.usableAfterCuration).toBe(true);
  });

  // @req REQ-028
  it("derives the figure status when the source prose names exactly one", () => {
    const report = auditDemography(
      [
        people("PPL_A", "A", { source: "Recensement national 2022" }),
        people("PPL_B", "B", {
          source:
            "Recensement 2015, projection 2025 par croissance démographique",
        }),
        people("PPL_C", "C", { source: "Joshua Project 2025" }),
      ],
      []
    );

    const byId = Object.fromEntries(report.figureStatus.map((s) => [s.id, s]));
    expect(byId.PPL_A.signals).toEqual(["census"]);
    expect(byId.PPL_A.derivable).toBe(true);
    expect(byId.PPL_B.derivable).toBe(false);
    expect(byId.PPL_C.signals).toEqual([]);
    expect(byId.PPL_C.citesJoshuaProject).toBe(true);
  });

  // @req REQ-028
  it("marks a figure that counts speakers rather than people", () => {
    const report = auditDemography(
      [
        people("PPL_LINGALA", "Lingala (locuteurs)", {
          source: "Ethnologue 2024 : 40 millions de locuteurs",
        }),
        people("PPL_MOSSI", "Mossi", {
          source: "Recensement 2019 : 12,3 millions d'habitants",
        }),
      ],
      []
    );

    const byId = Object.fromEntries(report.figureStatus.map((s) => [s.id, s]));
    expect(byId.PPL_LINGALA.speakerCountOnly).toBe(true);
    expect(byId.PPL_MOSSI.speakerCountOnly).toBe(false);
  });

  // @req REQ-028
  it("reports where the country fiche and the people fiche disagree", () => {
    const report = auditDemography(
      [people("PPL_TOUBOU", "Toubou", { distribution: { LBY: 1_502_000 } })],
      [
        country("LBY", 7_500_000, [
          { peopleId: "PPL_TOUBOU", percentageInCountry: 1.4 },
        ]),
      ]
    );

    expect(report.crossCheck).toEqual([
      expect.objectContaining({
        country: "LBY",
        peopleId: "PPL_TOUBOU",
        status: "divergent",
      }),
    ]);
  });

  // @req REQ-028
  it("accepts the two declarations when they agree", () => {
    const report = auditDemography(
      [people("PPL_WOLOF", "Wolof", { distribution: { SEN: 5_800_000 } })],
      [
        country("SEN", 18_900_000, [
          { peopleId: "PPL_WOLOF", percentageInCountry: 31 },
        ]),
      ]
    );

    expect(report.crossCheck[0].status).toBe("consistent");
  });

  // @req REQ-028
  it("reports a country percentage that carries no link to a fiche", () => {
    const report = auditDemography(
      [],
      [country("CMR", 29_900_000, [{ percentageInCountry: 12 }])]
    );

    expect(report.crossCheck[0].status).toBe("no-peopleId");
  });

  // @req REQ-028
  it("reports an entry larger than its own fiche total", () => {
    const report = auditDemography(
      [
        people("PPL_NDAU_ZIM", "Ndau (Zimbabwe)", {
          totalPopulation: 800_000,
          distribution: { MOZ: 1_600_000 },
        }),
      ],
      [country("MOZ", 35_600_000)]
    );

    expect(report.impossibleEntries).toEqual([
      expect.objectContaining({
        id: "PPL_NDAU_ZIM",
        country: "MOZ",
        reason: "exceeds-own-total",
      }),
    ]);
  });

  // @req REQ-028
  it("reports an entry larger than the country it sits in", () => {
    const report = auditDemography(
      [
        people("PPL_CREOLE_MACRO", "Peuples Créoles (macro-groupe)", {
          totalPopulation: 4_000_000,
          distribution: { CPV: 570_000 },
        }),
      ],
      [country("CPV", 500_000)]
    );

    expect(report.impossibleEntries).toEqual([
      expect.objectContaining({
        id: "PPL_CREOLE_MACRO",
        country: "CPV",
        reason: "exceeds-country-population",
      }),
    ]);
  });
});
