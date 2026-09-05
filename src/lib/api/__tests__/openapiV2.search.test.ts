import { describe, expect, it } from "vitest";
import { swaggerSpecV2 } from "@/lib/api/openapiV2";
import type { SearchHitKind } from "@/types/afrik";

interface SchemaObject {
  type?: string | string[];
  enum?: string[];
  minimum?: number;
  maximum?: number;
  required?: string[];
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  $ref?: string;
  description?: string;
}

interface OpenApiParameter {
  in?: string;
  name?: string;
  required?: boolean;
  schema?: SchemaObject;
  description?: string;
}

interface OpenApiOperation {
  description?: string;
  parameters?: OpenApiParameter[];
}

interface OpenApiSpec {
  components: { schemas: Record<string, SchemaObject> };
  paths: Record<string, { get?: OpenApiOperation }>;
}

const spec = swaggerSpecV2 as unknown as OpenApiSpec;
const schemas = spec.components.schemas;

/**
 * The spec's kind enum is checked against the union the merge actually emits,
 * not against a list retyped here: adding a member to `SearchHitKind` without
 * adding it below fails `typecheck`, and adding it below without adding it to
 * the spec fails this suite. An undocumented kind therefore cannot ship.
 */
const KINDS_THE_MERGE_EMITS: Record<SearchHitKind, true> = {
  people: true,
  country: true,
  languageFamily: true,
  person: true,
  patronyme: true,
  quiz: true,
};

/** The answer key, in every spelling the fiche and the RPC use for it. */
const ANSWER_FIELDS = [
  "options",
  "optionsFr",
  "options_fr",
  "correctOption",
  "correct_option",
  "explanation",
  "explanationFr",
  "explanation_fr",
];

function schemaName($ref: string): string {
  return $ref.replace("#/components/schemas/", "");
}

describe("OpenAPI v2 unified search contract", () => {
  // @req REQ-121
  it("documents the optional quiz lens as an exclusive search stream", () => {
    const operation = spec.paths["/api/v2/search"]?.get;
    const lens = operation?.parameters?.find(
      (parameter) => parameter.in === "query" && parameter.name === "lens"
    );

    expect(lens).toBeDefined();
    expect(lens?.required ?? false).toBe(false);
    expect(lens?.schema?.enum).toEqual(["quiz"]);
    expect(lens?.description).toMatch(/only quiz questions/i);
    expect(lens?.description).toMatch(/not queried/i);
    expect(lens?.description).toMatch(/main search stream/i);
  });

  // ETNI-1857: the locale is an additive optional parameter — no existing
  // caller changes, and an unknown value is refused rather than defaulted.
  // @req REQ-141
  it("documents the optional lang parameter as the two published locales", () => {
    const operation = spec.paths["/api/v2/search"]?.get;
    const lang = operation?.parameters?.find(
      (parameter) => parameter.in === "query" && parameter.name === "lang"
    );

    expect(lang).toBeDefined();
    expect(lang?.required ?? false).toBe(false);
    expect(lang?.schema?.enum).toEqual(["en", "fr"]);
    expect(lang?.description).toMatch(/English name/i);
    expect(lang?.description).toMatch(/French/i);
  });

  // @req REQ-141
  it("no longer describes the cross-kind tie-break as French-only", () => {
    const results = schemas.SearchResponseData.properties?.results;

    expect(results?.description).not.toMatch(/French collation/);
    expect(results?.description).toMatch(/locale/i);
  });

  // @req REQ-121
  it("explains both sides of the exclusive quiz-lens behavior", () => {
    const description = spec.paths["/api/v2/search"]?.get?.description;

    expect(description).toMatch(/without `lens`[^.]*not queried/i);
    expect(description).toMatch(/`lens=quiz`[^.]*only quiz questions/i);
  });

  // @req REQ-121
  it("defines mode-aware quiz, result, and total descriptions", () => {
    const data = schemas.SearchResponseData;
    const properties = data.properties ?? {};

    expect(properties.quizzes?.description).toMatch(
      /empty without `lens`.*populated only with `lens=quiz`/i
    );
    expect(properties.results?.description).toMatch(
      /without `lens`.*excludes quiz.*`lens=quiz`.*only quiz/i
    );
    expect(properties.quizzesTotal?.description).toMatch(
      /zero without `lens`.*matching.*`lens=quiz`/i
    );
    expect(properties.total?.description).toMatch(
      /without `lens`.*non-quiz.*`lens=quiz`.*quizzesTotal/i
    );
  });

  // @req REQ-002
  it("documents results as the canonical cross-kind ordered array", () => {
    const data = schemas.SearchResponseData;
    const results = data.properties?.results;

    expect(results?.type).toBe("array");
    expect(schemaName(results?.items?.$ref ?? "")).toBe("SearchHitV2");
    expect(data.required).toContain("results");
    expect(results?.description).toMatch(/normalizedScore/);
    expect(results?.description).toMatch(/ties broken/i);
  });

  // @req REQ-002
  it("enumerates every kind the merge can emit", () => {
    const kind = schemas.SearchHitV2?.properties?.kind;

    expect([...(kind?.enum ?? [])].sort()).toEqual(
      Object.keys(KINDS_THE_MERGE_EMITS).sort()
    );
  });

  // @req REQ-129
  it("bounds normalizedScore on [0, 1] wherever a hit carries it", () => {
    const carriers = [
      "SearchHitV2",
      "QuizSearchResultV2",
      "PersonSearchResultV2",
      "PatronymeSearchResultV2",
    ];

    for (const name of carriers) {
      const score = schemas[name]?.properties?.normalizedScore;

      expect(score, `${name}.normalizedScore`).toMatchObject({
        type: "number",
        minimum: 0,
        maximum: 1,
      });
      expect(schemas[name]?.required, name).toContain("normalizedScore");
    }
  });

  // @req REQ-121
  it("projects the quiz stem and never the answer", () => {
    const quiz = schemas.QuizSearchResultV2;
    const documented = Object.keys(quiz?.properties ?? {});

    expect(documented).toEqual(
      expect.arrayContaining([
        "id",
        "prompt",
        "entityType",
        "entityId",
        "subjectName",
        "normalizedScore",
        "snippet",
      ])
    );
    for (const answerField of ANSWER_FIELDS) {
      expect(documented, answerField).not.toContain(answerField);
    }
  });

  // @req REQ-126
  it("keeps the grouped compatibility arrays and their totals documented", () => {
    const data = schemas.SearchResponseData;
    const groupedItems: Record<string, string> = {
      peoples: "PeopleV2",
      countries: "CountryV2",
      families: "LanguageFamilyV2",
      persons: "PersonSearchResultV2",
      patronymes: "PatronymeSearchResultV2",
      quizzes: "QuizSearchResultV2",
    };

    for (const [group, itemSchema] of Object.entries(groupedItems)) {
      const array = data.properties?.[group];

      expect(array?.type, group).toBe("array");
      expect(schemaName(array?.items?.$ref ?? ""), group).toBe(itemSchema);
      expect(data.required, group).toContain(group);

      const totalKey = `${group}Total`;
      expect(data.properties?.[totalKey]?.type, totalKey).toBe("integer");
      expect(data.required, totalKey).toContain(totalKey);
    }

    expect(data.required).toContain("total");
  });
});
