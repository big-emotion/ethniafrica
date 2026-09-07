import { describe, expect, it } from "vitest";

import type { CountryRow, PeopleRow } from "../lib/quizFicheAdapter";
import {
  localizeCountryRows,
  localizePeopleRows,
  type QuizTranslationRow,
} from "../lib/quizTranslationCorpus";

const people: PeopleRow = {
  id: "PPL_ASANTE",
  name_main: "Asante",
  language_family_id: "FLG_NIGERCONGO",
  content: {
    appellations: {
      mainName: "Asante",
      selfAppellation: "Asantefo",
      exonyms: ["Ashanti"],
      whyProblematic: "Le terme demande une lecture critique.",
    },
    languages: { mainLanguage: "Twi" },
    origins: { migrationRoutes: ["Depuis Bono-Manso vers Kumase"] },
  },
};

const country: CountryRow = {
  id: "GIN",
  name_fr: "Guinée",
  name_en: "Guinea",
  name_official: "République de Guinée",
  etymology: "Une étymologie française.",
  name_origin_actor: "Les navigateurs portugais ont donné ce nom.",
  content: {
    historicalNames: { colonization: "Guinée française" },
    kingdoms: [{ name: "Empire du Mali" }],
  },
};

function translation(
  entityType: "people" | "country",
  entityId: string,
  content: Record<string, unknown>,
  overrides: Partial<QuizTranslationRow> = {}
): QuizTranslationRow {
  return {
    entity_type: entityType,
    entity_id: entityId,
    lang: "en",
    content,
    translation_kind: "machine_reviewed",
    translated_at: "2026-09-07T00:00:00.000Z",
    reviewed_by: "editor",
    model: "test",
    source_hash: "a".repeat(64),
    field_hashes: {},
    review_required: [],
    ...overrides,
  };
}

describe("quiz translated corpus", () => {
  // @req REQ-145
  it("keeps only people with a complete, non-stale translation", () => {
    const rows = localizePeopleRows(
      [people, { ...people, id: "PPL_WITHOUT_TRANSLATION" }],
      [
        translation("people", people.id, {
          content: {
            origins: { migrationRoutes: ["From Bono-Manso to Kumase"] },
          },
        }),
      ],
      "en"
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].content?.origins?.migrationRoutes).toEqual([
      "From Bono-Manso to Kumase",
    ]);
  });

  // @req REQ-145
  it("excludes a translation whose source field has drifted", () => {
    const rows = localizePeopleRows(
      [people],
      [
        translation(
          "people",
          people.id,
          {
            content: {
              origins: { migrationRoutes: ["From Bono-Manso to Kumase"] },
            },
          },
          {
            field_hashes: {
              "content.origins.migrationRoutes[0]": "0".repeat(16),
            },
          }
        ),
      ],
      "en"
    );

    expect(rows).toEqual([]);
  });

  // @req REQ-145
  it("withholds review-required quiz fields from machine-only translations", () => {
    const [localizedPeople] = localizePeopleRows(
      [people],
      [
        translation(
          "people",
          people.id,
          {
            content: {
              appellations: {
                whyProblematic: "The term requires critical interpretation.",
              },
            },
          },
          { translation_kind: "machine", reviewed_by: null }
        ),
      ],
      "en"
    );
    const [localizedCountry] = localizeCountryRows(
      [country],
      [
        translation(
          "country",
          country.id,
          {
            etymology: "An English etymology.",
            content: { kingdoms: [{ name: "Mali Empire" }] },
          },
          { translation_kind: "machine", reviewed_by: null }
        ),
      ],
      "en"
    );

    expect(localizedPeople.content?.appellations?.whyProblematic).toBeNull();
    expect(localizedCountry.etymology).toBeNull();
    expect(localizedCountry.content?.kingdoms).toEqual([]);
  });

  // @req REQ-145
  it("uses the English country name and translated prose after review", () => {
    const [localized] = localizeCountryRows(
      [country],
      [
        translation("country", country.id, {
          etymology: "An English etymology.",
          nameOriginActor: "Portuguese navigators gave this name.",
          content: {
            historicalNames: { colonization: "French Guinea" },
            kingdoms: [{ name: "Mali Empire" }],
          },
        }),
      ],
      "en"
    );

    expect(localized.name_fr).toBe("Guinea");
    expect(localized.etymology).toBe("An English etymology.");
    expect(localized.content?.kingdoms).toEqual([{ name: "Mali Empire" }]);
  });

  // @req REQ-145
  it("preserves the authored rows by reference for French", () => {
    expect(localizePeopleRows([people], [], "fr")).toEqual([people]);
    expect(localizeCountryRows([country], [], "fr")).toEqual([country]);
  });
});
