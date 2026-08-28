import { describe, it, expect } from "vitest";
import { QUIZ_TEMPLATE_IDS, TEMPLATE_FIELD_PATHS } from "../segmentPolicy";

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
    expect(Object.keys(TEMPLATE_FIELD_PATHS).sort()).toEqual([
      ...QUIZ_TEMPLATE_IDS,
    ]);
  });

  // @req REQ-097 FR69
  it("pins each template to the fiche field it reads", () => {
    expect(TEMPLATE_FIELD_PATHS).toEqual({
      T1: "languageFamilyId",
      T2: "content.appellations.selfAppellation",
      T3: "content.demography.distributionByCountry",
      T4: "content.languages.mainLanguage",
      T5: "content.languages.isoCodes",
    });
  });
});
