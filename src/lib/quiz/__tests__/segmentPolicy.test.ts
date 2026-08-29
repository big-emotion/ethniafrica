import { describe, it, expect } from "vitest";
import {
  isInversionTemplate,
  QUIZ_TEMPLATE_IDS,
  TEMPLATE_FIELD_PATHS,
} from "../segmentPolicy";

/**
 * What each template asks about, pinned against the Epic 10 module spec's
 * template table.
 *
 * The audience half of this policy — the rung ranges (FR68) and the children
 * field-path allowlist (FR69) — is retired along with the audience axis. The
 * property the allowlist was written to protect is asserted directly over
 * `TEMPLATE_FIELD_PATHS` in `colonizationChildrenExclusion.test.tsx`, which is
 * where it really lives.
 */
describe("segmentPolicy", () => {
  // @req REQ-097 FR69
  it("declares one target field path per template", () => {
    expect(Object.keys(TEMPLATE_FIELD_PATHS).sort()).toEqual(
      [...QUIZ_TEMPLATE_IDS].sort()
    );
  });

  // @req REQ-097 FR69
  it("pins each template to the fiche field it reads", () => {
    expect(TEMPLATE_FIELD_PATHS).toEqual({
      T1: "languageFamilyId",
      T2: "content.appellations.selfAppellation",
      T3: "content.demography.distributionByCountry",
      T4: "content.languages.mainLanguage",
      T5: "content.languages.isoCodes",
      T6: "content.culture.majorRites",
      T7: "content.culture.spiritualities",
      T8: "content.culture.symbols",
      T9: "content.historicalRole.kingdomsOrChiefdoms",
      T10: "content.organization.traditionalPoliticalSystem",
      T11: "content.origins.migrationRoutes",
      T12: "content.appellations.whyProblematic",
      T13: "etymology",
      T14: "nameOriginActor",
      T15: "content.historicalNames.colonization",
      T16: "content.kingdoms",
      T17: "content.historicalFacts.precolonial",
      T18: "content.culture.dominantReligions",
    });
  });

  /**
   * The distinction downstream reads off: an inversion round shows a stimulus,
   * draws its distractors from peoples rather than field values, and is stale
   * when the fragment it quotes changes rather than when its answer does.
   */
  // @req REQ-121
  it("separates the templates whose answer is the subject from the rest", () => {
    expect(QUIZ_TEMPLATE_IDS.filter(isInversionTemplate)).toEqual([
      "T6",
      "T7",
      "T8",
      "T9",
      "T10",
      "T11",
      "T13",
      "T14",
      "T15",
      "T17",
      "T18",
    ]);
    expect(isInversionTemplate("T1")).toBe(false);
    // T12 names its subject in the stem, so it is not an inversion however
    // much its subject matter resembles T2's. Nor is T16: its answer is a
    // kingdom's name, an atom like the five original templates ask for.
    expect(isInversionTemplate("T12")).toBe(false);
    expect(isInversionTemplate("T16")).toBe(false);
  });

  // @req REQ-121
  it("gives every template a field path, so none can be asserted at a path nothing reads", () => {
    for (const templateId of QUIZ_TEMPLATE_IDS) {
      expect(TEMPLATE_FIELD_PATHS[templateId]).toMatch(/^[\w.]+$/);
    }
  });
});
