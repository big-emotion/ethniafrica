// @req REQ-133
import { describe, expect, it } from "vitest";

import {
  detectClanNameCandidates,
  normalizeClanName,
} from "../lib/clanNameDetection";
import type { LoadedPeopleFiche } from "../lib/clanNameTypes";

function makeFiche(
  content: Record<string, unknown>,
  id = "PPL_MANDE",
  languageFamilyId = "FLG_MANDE"
): LoadedPeopleFiche {
  return { id, languageFamilyId, content };
}

describe("detectClanNameCandidates", () => {
  // @req REQ-133
  it("extracts high-recall candidates from prose carrying a naming cue", () => {
    const passage =
      "Les clans Keïta, Traoré et Konaté structurent historiquement la communauté.";

    const candidates = detectClanNameCandidates(
      makeFiche({ organization: { clanOrganization: passage } })
    );

    expect(candidates.map(({ name }) => name)).toEqual([
      "Keïta",
      "Traoré",
      "Konaté",
    ]);
    expect(candidates[0]).toMatchObject({
      normalizedName: "keita",
      sourceFicheId: "PPL_MANDE",
      linguisticFamilyId: "FLG_MANDE",
      sourcePath: "content.organization.clanOrganization",
      verbatimPassage: passage,
      sourceCandidates: [],
      inheritedTier: null,
      sourceKind: null,
      tierResolution: "review_required",
      reviewFlags: [],
      reviewStatus: "unreviewed",
    });
  });

  // @req REQ-133
  it("supports English family-name prose and keeps multiword display names", () => {
    const passage =
      "The family names da Silva, Espírito Santo and Vera Cruz are documented.";

    const candidates = detectClanNameCandidates(
      makeFiche({ identity: { familyNames: passage } })
    );

    expect(candidates.map(({ name }) => name)).toEqual([
      "da Silva",
      "Espírito Santo",
      "Vera Cruz",
    ]);
  });

  // @req REQ-133
  it("normalizes case and accents while preserving the first display spelling", () => {
    const passage =
      "Le clan Keïta, aussi écrit KEITA, appartient au même lignage Keita.";

    const candidates = detectClanNameCandidates(
      makeFiche({ organization: { clanOrganization: passage } })
    );

    expect(normalizeClanName(" Keïta ")).toBe("keita");
    expect(normalizeClanName("KEITA")).toBe("keita");
    expect(
      candidates.filter(({ normalizedName }) => normalizedName === "keita")
    ).toHaveLength(1);
    expect(
      candidates.find(({ normalizedName }) => normalizedName === "keita")
    ).toMatchObject({ name: "Keïta", verbatimPassage: passage });
  });

  // @req REQ-133
  it("preserves one occurrence per fiche and deterministic JSON source path", () => {
    const firstFiche = makeFiche({
      history: {
        sections: [{ text: "The lineage Keita remains documented." }],
      },
      organization: { clanOrganization: "Le clan Keïta est attesté." },
    });
    const secondFiche = makeFiche(
      { organization: { clanOrganization: "Le patronyme Keita est cité." } },
      "PPL_DIASPORA",
      "FLG_CREOLE"
    );

    const candidates = [
      ...detectClanNameCandidates(firstFiche),
      ...detectClanNameCandidates(secondFiche),
    ].filter(({ normalizedName }) => normalizedName === "keita");

    expect(candidates).toHaveLength(3);
    expect(
      candidates.map(
        ({ sourceFicheId, linguisticFamilyId, sourcePath }) =>
          `${sourceFicheId}|${linguisticFamilyId}|${sourcePath}`
      )
    ).toEqual([
      "PPL_MANDE|FLG_MANDE|content.history.sections[0].text",
      "PPL_MANDE|FLG_MANDE|content.organization.clanOrganization",
      "PPL_DIASPORA|FLG_CREOLE|content.organization.clanOrganization",
    ]);
    expect(new Set(candidates.map(({ candidateId }) => candidateId)).size).toBe(
      3
    );
  });

  // @req REQ-133
  it("ignores unanchored prose even when it contains name-shaped words", () => {
    const candidates = detectClanNameCandidates(
      makeFiche({
        history: "Keïta, Traoré and Konaté remain historically significant.",
        count: 3,
        labels: ["Barry", "Diallo"],
      })
    );

    expect(candidates).toEqual([]);
  });

  // @req REQ-133
  it("does not harvest bibliographic or demographic metadata", () => {
    const candidates = detectClanNameCandidates(
      makeFiche({
        sources: [
          {
            title: "The Clan Names of Barry and Diallo",
            url: "https://example.org/source",
          },
        ],
        demography: {
          source: "Family names Keïta and Traoré survey, 2025",
        },
      })
    );

    expect(candidates).toEqual([]);
  });

  // @req REQ-133
  it("does not turn every capitalized word in clan-related history into a name", () => {
    const passage =
      "L'Empire de Segou unifia les clans bamana sous l'autorite des dynasties Coulibaly puis Diarra.";

    expect(detectClanNameCandidates(makeFiche({ history: passage }))).toEqual(
      []
    );
  });

  // @req REQ-133
  it("prefers an explicit parenthesized name list over surrounding peoples", () => {
    const passage =
      "Clans structures autour de grandes familles patronymiques partagees avec les Bambara et les Malinke (Ouattara/Wattara, Coulibaly, Traore, Diarra, Doumbia, Fofana, Kone, Keita, Kouyate, Bamba, Camara, etc.).";

    const names = detectClanNameCandidates(
      makeFiche({ organization: { clanOrganization: passage } })
    ).map(({ name }) => name);

    expect(names).toEqual([
      "Ouattara",
      "Wattara",
      "Coulibaly",
      "Traore",
      "Diarra",
      "Doumbia",
      "Fofana",
      "Kone",
      "Keita",
      "Kouyate",
      "Bamba",
      "Camara",
    ]);
  });

  // @req REQ-133
  it("extracts colon-delimited list heads without parenthetical qualifiers", () => {
    const passage =
      "Parmi les principaux clans : Lingani (Tangare, pouvoir mystique), Pagou, Gassuogou et Garango.";

    const names = detectClanNameCandidates(
      makeFiche({ organization: { clanOrganization: passage } })
    ).map(({ name }) => name);

    expect(names).toEqual(["Lingani", "Pagou", "Gassuogou", "Garango"]);
  });

  // @req REQ-133
  it("does not start a list at a later slash after descriptive prose", () => {
    const passage =
      "Adoption de clans totemiques matrilineaires empruntes aux peuples Dxeriku/Hambukushu voisins.";

    expect(
      detectClanNameCandidates(
        makeFiche({ organization: { clanOrganization: passage } })
      )
    ).toEqual([]);
  });
});
