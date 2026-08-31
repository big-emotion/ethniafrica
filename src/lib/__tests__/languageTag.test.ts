import { describe, expect, it } from "vitest";

import { bcp47LanguageTag } from "@/lib/languageTag";

describe("bcp47LanguageTag", () => {
  // The exact codes axe-core rejects: a 639-3 form whose language also has a
  // 639-1 one. Yoruba is the mockup's own sample and the fiche that surfaced
  // this — `lang="yor"` was a serious valid-lang violation the closed reading
  // gate had been hiding from the audit.
  // @req REQ-115
  it("shortens a code whose language has a two-letter form", () => {
    expect(bcp47LanguageTag("yor")).toBe("yo");
    expect(bcp47LanguageTag("kon")).toBe("kg");
    expect(bcp47LanguageTag("ful")).toBe("ff");
    expect(bcp47LanguageTag("hau")).toBe("ha");
    expect(bcp47LanguageTag("ibo")).toBe("ig");
  });

  // Most of the corpus. Shortening is not available and not needed: axe
  // accepts these, and they are the most precise tag the language has.
  // @req REQ-115
  it("leaves a code with no two-letter form exactly as the corpus wrote it", () => {
    expect(bcp47LanguageTag("bfa")).toBe("bfa");
    expect(bcp47LanguageTag("zgh")).toBe("zgh");
    expect(bcp47LanguageTag("tmh")).toBe("tmh");
    expect(bcp47LanguageTag("nso")).toBe("nso");
  });

  // An absent lang inherits the page's, which is imprecise. An invalid one is
  // a violation, and can leave assistive technology guessing — so nothing is
  // emitted rather than something malformed.
  // @req REQ-115
  it("emits nothing rather than a tag a reader cannot resolve", () => {
    expect(bcp47LanguageTag(undefined)).toBeUndefined();
    expect(bcp47LanguageTag(null)).toBeUndefined();
    expect(bcp47LanguageTag("")).toBeUndefined();
    expect(bcp47LanguageTag("   ")).toBeUndefined();
    expect(bcp47LanguageTag("pas une étiquette")).toBeUndefined();
  });

  // @req REQ-115
  it("tolerates the whitespace a hand-edited fiche can carry", () => {
    expect(bcp47LanguageTag("  yor  ")).toBe("yo");
  });
});
