import { describe, expect, it } from "vitest";

import { mapLanguageFamilyDetail } from "../afrikDetailMapper";
import type { LanguageFamily } from "@/types/afrik";

/**
 * Shaped like what `getLanguageFamilyById` returns: stable columns, Date
 * metadata, and every editorial section inside the `content` JSONB.
 */
const BANTU: LanguageFamily = {
  id: "FLG_BANTU",
  nameFr: "Bantou",
  nameEn: "Bantu",
  classificationStatus: "contested",
  associatedPeoples: [{ name: "Shona", peopleId: "PPL_SHONA" }],
  createdAt: new Date("2026-01-02T03:04:05.000Z"),
  updatedAt: new Date("2026-02-03T04:05:06.000Z"),
  content: {
    decolonialHeader: {
      historicalAppellations: ["Bantou"],
      whyProblematic: "Terme forgé par la linguistique coloniale.",
      selfAppellation: "Bantu",
    },
    generalInfo: {
      branches: ["Bantou étroit"],
      geographicArea: "Afrique centrale et australe",
      numberOfLanguages: 500,
      totalSpeakers: 350_000_000,
    },
    associatedPeoples: [{ name: "Shona", peopleId: "PPL_SHONA" }],
    linguisticCharacteristics: {
      typology: "Agglutinante",
      phonologicalFeatures: "Systèmes tonals",
      relationsWithNeighbors: "Contacts anciens",
      keyInnovations: "Classes nominales",
    },
    historyAndOrigins: {
      probableOrigin: "Frontière Nigéria-Cameroun",
      emergencePeriod: "-3000",
      diffusion: "Expansion bantoue",
      historicalBreaks: "Fragmentation en groupes régionaux",
      contactZones: "Grands Lacs",
      majorEvents: "Diffusion de la métallurgie",
    },
    distribution: {
      totalSpeakers: 350_000_000,
      distributionByCountry: { COD: 80_000_000, TZA: 60_000_000 },
    },
    sources: [{ title: "Glottolog 5.0", url: null, tier: "unverified" }],
  },
};

describe("mapLanguageFamilyDetail", () => {
  // @req REQ-091
  it("hoists every editorial section the parchment reads out of the content blob", () => {
    const detail = mapLanguageFamilyDetail(BANTU);

    expect(detail.decolonialHeader).toEqual(BANTU.content.decolonialHeader);
    expect(detail.generalInfo).toEqual(BANTU.content.generalInfo);
    expect(detail.linguisticCharacteristics).toEqual(
      BANTU.content.linguisticCharacteristics
    );
    expect(detail.historyAndOrigins).toEqual(BANTU.content.historyAndOrigins);
    expect(detail.distribution).toEqual(BANTU.content.distribution);
    expect(detail.sources).toEqual(BANTU.content.sources);
  });

  // @req REQ-091
  it("keeps the stable columns identifying the family", () => {
    const detail = mapLanguageFamilyDetail(BANTU);

    expect(detail.id).toBe("FLG_BANTU");
    expect(detail.nameFr).toBe("Bantou");
    expect(detail.nameEn).toBe("Bantu");
    expect(detail.classificationStatus).toBe("contested");
  });

  // @req REQ-091
  it("serializes the Date metadata the Supabase query hydrates", () => {
    const detail = mapLanguageFamilyDetail(BANTU);

    expect(detail.createdAt).toBe("2026-01-02T03:04:05.000Z");
    expect(detail.updatedAt).toBe("2026-02-03T04:05:06.000Z");
  });

  // @req REQ-091
  it("prefers the top-level associated peoples over the legacy content copy", () => {
    const detail = mapLanguageFamilyDetail({
      ...BANTU,
      associatedPeoples: [{ name: "Kongo", peopleId: "PPL_KONGO" }],
      content: {
        ...BANTU.content,
        associatedPeoples: [{ name: "Stale", peopleId: "PPL_STALE" }],
      },
    });

    expect(detail.associatedPeoples).toEqual([
      { name: "Kongo", peopleId: "PPL_KONGO" },
    ]);
  });

  // @req REQ-091
  it("falls back to the content copy for families the service did not enrich", () => {
    const { associatedPeoples: _column, ...withoutColumn } = BANTU;

    expect(mapLanguageFamilyDetail(withoutColumn).associatedPeoples).toEqual([
      { name: "Shona", peopleId: "PPL_SHONA" },
    ]);
  });

  // @req REQ-091
  it("survives a family whose content blob is empty", () => {
    const detail = mapLanguageFamilyDetail({
      id: "FLG_EMPTY",
      nameFr: "Famille sans dossier",
      content: {},
    });

    expect(detail.id).toBe("FLG_EMPTY");
    expect(detail.generalInfo).toBeUndefined();
    expect(detail.sources).toBeUndefined();
  });
});
