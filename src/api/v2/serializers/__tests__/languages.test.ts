import { describe, expect, it } from "vitest";

import { serializeLanguage } from "@/api/v2/serializers/languages";

describe("serializeLanguage", () => {
  // @req REQ-136
  it("serializes a sourced language and sorts speaking peoples by name", () => {
    const aggregate = {
      id: "yor",
      name: "Yoruba",
      nameProvenance: "sourced" as const,
      isoCode639_3: "yor",
      glottocode: null,
      nameEn: null,
      alternateNames: [],
      spellingAliases: [],
      dialects: [],
      family: { id: "FLG_BENOUECONGO", name: "Bénoué-Congo" },
      speakingPeoples: [
        { id: "PPL_YORUBA", name: "Yoruba" },
        { id: "PPL_ANAGO", name: "Anago" },
      ],
      vehicularRole: "Langue véhiculaire régionale",
      vitalityStatus: {
        status: "safe",
        scale: "EGIDS",
        asOf: 2025,
      },
      sources: [
        {
          id: "SRC_GLOTTOLOG_YORUBA",
          title: "Glottolog 5.3 — Yoruba",
          url: "https://glottolog.org/resource/languoid/id/yoru1245",
          tier: "official" as const,
          notes: "Direct linguistic reference.",
        },
      ],
    };

    expect(serializeLanguage(aggregate)).toEqual({
      id: "yor",
      name: "Yoruba",
      nameProvenance: "sourced",
      isoCode639_3: "yor",
      glottocode: null,
      nameEn: null,
      alternateNames: [],
      spellingAliases: [],
      dialects: [],
      family: { id: "FLG_BENOUECONGO", name: "Bénoué-Congo" },
      speakingPeoples: [
        { id: "PPL_ANAGO", name: "Anago" },
        { id: "PPL_YORUBA", name: "Yoruba" },
      ],
      vehicularRole: "Langue véhiculaire régionale",
      vitalityStatus: {
        status: "safe",
        scale: "EGIDS",
        asOf: 2025,
      },
      sources: [
        {
          id: "SRC_GLOTTOLOG_YORUBA",
          title: "Glottolog 5.3 — Yoruba",
          url: "https://glottolog.org/resource/languoid/id/yoru1245",
          tier: "official",
          notes: "Direct linguistic reference.",
        },
      ],
    });
    expect(aggregate.speakingPeoples.map(({ id }) => id)).toEqual([
      "PPL_YORUBA",
      "PPL_ANAGO",
    ]);
  });

  // @req REQ-136
  it("keeps a derived name explicit and serializes nullable language facts", () => {
    expect(
      serializeLanguage({
        id: "ibb",
        name: "Ibibio",
        nameProvenance: "derived",
        isoCode639_3: "ibb",
        glottocode: null,
        nameEn: null,
        alternateNames: [],
        spellingAliases: [],
        dialects: [],
        family: { id: "FLG_BENOUECONGO", name: "Bénoué-Congo" },
        speakingPeoples: [],
        vehicularRole: null,
        vitalityStatus: null,
        sources: [],
      })
    ).toEqual({
      id: "ibb",
      name: "Ibibio",
      nameProvenance: "derived",
      isoCode639_3: "ibb",
      glottocode: null,
      nameEn: null,
      alternateNames: [],
      spellingAliases: [],
      dialects: [],
      family: { id: "FLG_BENOUECONGO", name: "Bénoué-Congo" },
      speakingPeoples: [],
      vehicularRole: null,
      vitalityStatus: null,
      sources: [],
    });
  });

  // @req REQ-136
  it("preserves official, referenced and unverified source tiers", () => {
    const language = serializeLanguage({
      id: "wol",
      name: "Wolof",
      nameProvenance: "sourced",
      isoCode639_3: "wol",
      glottocode: null,
      nameEn: null,
      alternateNames: [],
      spellingAliases: [],
      dialects: [],
      family: { id: "FLG_ATLANTIQUE", name: "Atlantique" },
      speakingPeoples: [],
      vehicularRole: null,
      vitalityStatus: null,
      sources: [
        {
          id: "SRC_OFFICIAL",
          title: "Official source",
          url: "https://example.org/official",
          tier: "official",
          notes: null,
        },
        {
          id: "SRC_REFERENCED",
          title: "Referenced source",
          url: "https://example.org/referenced",
          tier: "referenced",
          notes: "Cross-checked primary source.",
        },
        {
          id: "SRC_UNVERIFIED",
          title: "Unverified source",
          url: null,
          tier: "unverified",
        },
      ],
    });

    expect(language.sources).toEqual([
      {
        id: "SRC_OFFICIAL",
        title: "Official source",
        url: "https://example.org/official",
        tier: "official",
        notes: null,
      },
      {
        id: "SRC_REFERENCED",
        title: "Referenced source",
        url: "https://example.org/referenced",
        tier: "referenced",
        notes: "Cross-checked primary source.",
      },
      {
        id: "SRC_UNVERIFIED",
        title: "Unverified source",
        url: null,
        tier: "unverified",
      },
    ]);
  });

  // @req REQ-136
  it("does not copy licence or attribution metadata into public data", () => {
    const aggregate = {
      id: "hau",
      name: "Haoussa",
      nameProvenance: "sourced" as const,
      isoCode639_3: "hau",
      glottocode: null,
      nameEn: null,
      alternateNames: [],
      spellingAliases: [],
      dialects: [],
      family: { id: "FLG_TCHADIQUE", name: "Tchadique" },
      speakingPeoples: [],
      vehicularRole: null,
      vitalityStatus: null,
      sources: [],
      licence: "CC BY 4.0",
      attribution: "EthniAfrica",
    };

    expect(serializeLanguage(aggregate)).not.toMatchObject({
      licence: expect.anything(),
      attribution: expect.anything(),
    });
  });
});
