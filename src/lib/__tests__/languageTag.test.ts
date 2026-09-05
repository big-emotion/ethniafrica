import { describe, expect, it } from "vitest";

import {
  bcp47LanguageTag,
  displayCountryName,
  formatDate,
  formatNumber,
  localeTag,
} from "@/lib/languageTag";

describe("bcp47LanguageTag", () => {
  // @req REQ-115
  it("shortens a code whose language has a two-letter form", () => {
    expect(bcp47LanguageTag("yor")).toBe("yo");
    expect(bcp47LanguageTag("kon")).toBe("kg");
    expect(bcp47LanguageTag("ful")).toBe("ff");
    expect(bcp47LanguageTag("hau")).toBe("ha");
    expect(bcp47LanguageTag("ibo")).toBe("ig");
  });

  // @req REQ-115
  it("leaves a code with no two-letter form unchanged", () => {
    expect(bcp47LanguageTag("bfa")).toBe("bfa");
    expect(bcp47LanguageTag("zgh")).toBe("zgh");
    expect(bcp47LanguageTag("tmh")).toBe("tmh");
    expect(bcp47LanguageTag("nso")).toBe("nso");
  });

  // @req REQ-115
  it("emits nothing for absent or invalid tags", () => {
    expect(bcp47LanguageTag(undefined)).toBeUndefined();
    expect(bcp47LanguageTag(null)).toBeUndefined();
    expect(bcp47LanguageTag("")).toBeUndefined();
    expect(bcp47LanguageTag("   ")).toBeUndefined();
    expect(bcp47LanguageTag("pas une étiquette")).toBeUndefined();
  });

  // @req REQ-115
  it("tolerates surrounding whitespace", () => {
    expect(bcp47LanguageTag("  yor  ")).toBe("yo");
  });
});

describe("locale formatters (REQ-140)", () => {
  // @req REQ-140
  it("maps each locale to its regional tag", () => {
    expect(localeTag("en")).toBe("en-GB");
    expect(localeTag("fr")).toBe("fr-FR");
  });

  // @req REQ-140
  it("formats numbers in the reader's locale", () => {
    expect(formatNumber("fr", 1234567)).toBe("1 234 567");
    expect(formatNumber("en", 1234567)).toBe("1,234,567");
    const oneDecimal = { minimumFractionDigits: 1, maximumFractionDigits: 1 };
    expect(formatNumber("fr", 2.5, oneDecimal)).toBe("2,5");
    expect(formatNumber("en", 2.5, oneDecimal)).toBe("2.5");
  });

  // @req REQ-140
  it("formats long dates in the reader's locale", () => {
    const date = new Date(2025, 8, 21);
    expect(formatDate("fr", date)).toBe("21 septembre 2025");
    expect(formatDate("en", date)).toBe("21 September 2025");
  });

  // @req REQ-140
  it("passes explicit date options through", () => {
    const date = new Date(Date.UTC(2026, 3, 10));
    const options = {
      day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
    } as const;
    expect(formatDate("fr", date, options)).toBe("10 avril 2026");
    expect(formatDate("en", date, options)).toBe("10 April 2026");
  });

  // @req REQ-140
  it("names countries in the reader's locale", () => {
    expect(displayCountryName("fr", "ZA")).toBe("Afrique du Sud");
    expect(displayCountryName("en", "ZA")).toBe("South Africa");
    expect(displayCountryName("fr", "SD")).toBe("Soudan");
    expect(displayCountryName("en", "SD")).toBe("Sudan");
    expect(displayCountryName("en", "BF")).toBe("Burkina Faso");
  });

  // @req REQ-140
  it("answers nothing for an invalid region code", () => {
    expect(displayCountryName("en", "not a code")).toBeUndefined();
    expect(displayCountryName("fr", "")).toBeUndefined();
  });
});
