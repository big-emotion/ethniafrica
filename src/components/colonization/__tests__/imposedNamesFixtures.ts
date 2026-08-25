/**
 * Epic 8-shaped fixtures for the imposed-names section (ETNI-534).
 *
 * Shaped exactly like `PeopleNamesDossier` (`src/api/v2/schemas/names.ts`),
 * the return type of Epic 8's `getPeopleNamesDossier` — the read-only
 * surface this module consumes (FR88, FR90). Illustrative data, not sourced
 * AFRIK content: never migrated, never claimed as a real fiche.
 */

import type { PeopleNamesDossier } from "@/api/v2/schemas/names";

/** A people with both its endonym and a documented, sourced imposed exonym. */
// @req REQ-104
export const YORUBA_WITH_IMPOSED_NAME: PeopleNamesDossier = {
  peopleId: "PPL_YORUBA",
  autonym: "Ọmọ Yorùbá",
  names: [
    {
      id: "name-yoruba-endonym",
      nameText: "Ọmọ Yorùbá",
      nameType: "endonym",
      languageOfOrigin: "yo",
      meaning: "enfants du Yorùbá",
      periodLabel: null,
      imposition: null,
      assertionId: "assertion-yoruba-endonym",
      sources: [],
      confidence: null,
    },
    {
      id: "name-yoruba-exonym",
      nameText: "Nago",
      nameType: "exonym",
      languageOfOrigin: "pt",
      meaning: null,
      periodLabel: "XIXe siècle",
      imposition: {
        imposedBy: "administration coloniale portugaise",
        impositionPeriod: "XIXe siècle",
        whyProblematic:
          "Nom donné par les négriers portugais aux personnes déportées, effaçant l'auto-désignation Yorùbá.",
        contemporaryUsage: "Usage résiduel au Brésil (candomblé nagô).",
      },
      assertionId: "assertion-yoruba-exonym",
      sources: [
        {
          id: "src-yoruba-1",
          title: "Nagôs et Yoruba au Brésil",
          url: "https://example.org/nago-yoruba",
          year: 1998,
          tier: "2",
        },
      ],
      confidence: { score: 78, recomputedAt: "2026-01-15T00:00:00.000Z" },
    },
  ],
};

/** A people with an endonym but no Epic 8 imposed-name record at all. */
// @req REQ-104
export const SONINKE_WITHOUT_IMPOSED_NAME: PeopleNamesDossier = {
  peopleId: "PPL_SONINKE",
  autonym: "Sooninkoore",
  names: [
    {
      id: "name-soninke-endonym",
      nameText: "Sooninkoore",
      nameType: "endonym",
      languageOfOrigin: "snk",
      meaning: null,
      periodLabel: null,
      imposition: null,
      assertionId: "assertion-soninke-endonym",
      sources: [],
      confidence: null,
    },
  ],
};

/** A people with no Epic 8 record whatsoever (empty dossier). */
// @req REQ-104
export const EMPTY_DOSSIER: PeopleNamesDossier = {
  peopleId: "PPL_EMPTY",
  autonym: null,
  names: [],
};
