/** @req REQ-133 */
export const SOURCE_KEY = "source-keita-study";

/** @req REQ-133 */
export function validPatronymeFiche(overrides: Record<string, unknown> = {}) {
  return {
    _meta: {
      format: "AFRIK JSON v2",
      entity: "patronyme",
      directives: "Follow the AFRIK patronyme fiche contract.",
    },
    id: "PAT_KEITA",
    nameMain: "Keita",
    nameSystem: "clan_name",
    spellings: [
      {
        spelling: "Keïta",
        attestations: [
          {
            countryId: "MLI",
            sourceRefs: [SOURCE_KEY],
          },
        ],
      },
    ],
    transmissionMode: "patrilineal",
    designatedSocialUnit: "clan",
    origin: {
      oralTraditions: [
        {
          claim: "Une tradition orale transcrite rattache le nom à une lignée.",
          claimStatus: "claimed",
          griot: "Informateur cité dans la transcription",
          transcription: "Transcription publiée, section 2",
          sourceRefs: [SOURCE_KEY],
        },
      ],
      writtenChronicles: [],
      linguisticReconstructions: [],
    },
    peoples: [
      {
        peopleId: "PPL_MALINKE",
        status: "attested",
        sourceRefs: [SOURCE_KEY],
      },
    ],
    countries: [
      {
        countryId: "MLI",
        status: "attested",
        sourceRefs: [SOURCE_KEY],
      },
    ],
    alliances: [
      {
        targetPatronymeId: "PAT_KONDE",
        allianceType: "sanankuya",
        sourceRefs: [SOURCE_KEY],
      },
    ],
    casteOrSocialFunction: null,
    bearers: [
      {
        status: "deceased",
        personId: "PER_MODIBO_KEITA",
        sourceRefs: [SOURCE_KEY],
      },
    ],
    homonyms: [
      {
        label: "Keita, chaîne distincte",
        entityType: "other",
        entityId: null,
        distinction: "Cette chaîne ne désigne pas le patronyme documenté ici.",
        sourceRefs: [SOURCE_KEY],
      },
    ],
    sources: [
      {
        sourceKey: SOURCE_KEY,
        title: "Étude onomastique de référence",
        url: "https://example.org/keita-study",
        tier: "referenced",
        source_kind: "academic",
        notes: "Référence bibliographique vérifiable.",
      },
    ],
    gaps: [
      {
        fieldPath: "origin.linguisticReconstructions",
        reason: "Aucune reconstruction linguistique n'a été trouvée.",
      },
    ],
    ...overrides,
  };
}
