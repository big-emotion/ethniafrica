import { describe, it, expect } from "vitest";
import {
  QUIZ_AUDIENCES,
  QUIZ_TEMPLATE_IDS,
  DIFFICULTY_RUNGES,
  TEMPLATE_FIELD_PATHS,
  TEMPLATE_AVAILABILITY,
  CHILDREN_FIELD_PATH_ALLOWLIST,
  isAllowedForSegment,
} from "../segmentPolicy";

/**
 * Segment × template × field-path × difficulty policy (FR68, FR69).
 * Values pinned against the Epic 10 module spec, Story 10.4 acceptance
 * criteria (_bmad-output/planning-artifacts/module-specs/epic-10-smart-quiz.md).
 */
describe("segmentPolicy", () => {
  describe("DIFFICULTY_RUNGES", () => {
    // @req REQ-097 FR68
    it("defines the per-audience rung range (initial proposal)", () => {
      expect(DIFFICULTY_RUNGES).toEqual({
        children: { min: 1, max: 2 },
        teens: { min: 1, max: 3 },
        adults: { min: 2, max: 4 },
        university: { min: 3, max: 5 },
        professionals: { min: 3, max: 5 },
      });
    });

    // @req REQ-097 FR68
    it("has one entry per declared audience segment", () => {
      expect(Object.keys(DIFFICULTY_RUNGES).sort()).toEqual(
        [...QUIZ_AUDIENCES].sort()
      );
    });
  });

  describe("CHILDREN_FIELD_PATH_ALLOWLIST", () => {
    // @req REQ-097 FR69
    it("matches the initial proposal exactly", () => {
      expect(CHILDREN_FIELD_PATH_ALLOWLIST).toEqual([
        "content.appellations.selfAppellation",
        "content.appellations.mainName",
        "languageFamilyId",
        "content.languages.mainLanguage",
        "currentCountries",
        "content.culture.symbols",
        "content.culture.artsAndMusic",
      ]);
    });
  });

  describe("isAllowedForSegment", () => {
    // @req REQ-097 FR69
    it.each(CHILDREN_FIELD_PATH_ALLOWLIST)(
      "allows allowlisted path %s for children",
      (fieldPath) => {
        expect(isAllowedForSegment(fieldPath, "children")).toBe(true);
      }
    );

    // @req REQ-097 FR69
    it.each([
      "content.origins.majorHistoricalEvents",
      "content.historicalRole.conflictsOrAlliances",
      "content.appellations.whyProblematic",
      "content.appellations.originOfExonyms",
      "content.culture.spiritualities",
    ])("excludes non-allowlisted path %s for children", (fieldPath) => {
      expect(isAllowedForSegment(fieldPath, "children")).toBe(false);
    });

    // @req REQ-097 FR69
    it("defaults to deny for any unknown field path for children", () => {
      expect(
        isAllowedForSegment("content.some.unknown.futureField", "children")
      ).toBe(false);
    });

    // @req REQ-097 FR69
    it.each(["teens", "adults", "university", "professionals"] as const)(
      "does not restrict field paths for the %s segment",
      (audience) => {
        expect(
          isAllowedForSegment("content.origins.majorHistoricalEvents", audience)
        ).toBe(true);
        expect(
          isAllowedForSegment("content.culture.spiritualities", audience)
        ).toBe(true);
      }
    );
  });

  describe("TEMPLATE_AVAILABILITY", () => {
    // @req REQ-097 FR69
    it("restricts the children segment to templates whose field path is allowlisted", () => {
      const childrenTemplates = QUIZ_TEMPLATE_IDS.filter((templateId) =>
        isAllowedForSegment(TEMPLATE_FIELD_PATHS[templateId], "children")
      );
      expect(TEMPLATE_AVAILABILITY.children).toEqual(childrenTemplates);
      expect(TEMPLATE_AVAILABILITY.children).toEqual(["T1", "T2", "T4"]);
    });

    // @req REQ-097 FR68
    it.each(["teens", "adults", "university", "professionals"] as const)(
      "makes every template available to the %s segment",
      (audience) => {
        expect(TEMPLATE_AVAILABILITY[audience]).toEqual(QUIZ_TEMPLATE_IDS);
      }
    );

    // @req REQ-097 FR68
    it("has one entry per declared audience segment", () => {
      expect(Object.keys(TEMPLATE_AVAILABILITY).sort()).toEqual(
        [...QUIZ_AUDIENCES].sort()
      );
    });
  });
});
