import { describe, expect, it } from "vitest";

import { isTranslationLocale } from "../translationLocale";

describe("isTranslationLocale", () => {
  // The route reads a request value and must refuse, not default, anything
  // the atlas does not publish — including the locales the middleware
  // redirects and a case variant a browser might send.
  // @req REQ-141
  it("accepts exactly the two published locales", () => {
    expect(isTranslationLocale("en")).toBe(true);
    expect(isTranslationLocale("fr")).toBe(true);
    for (const rejected of ["de", "es", "pt", "EN", "fr-FR", "", "en "]) {
      expect(isTranslationLocale(rejected), rejected).toBe(false);
    }
  });
});
