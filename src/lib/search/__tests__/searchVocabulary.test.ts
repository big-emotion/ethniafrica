import { describe, expect, it } from "vitest";

import {
  getSearchLabel,
  getSearchPlaceholder,
  getSearchResultGroups,
  SEARCH_LABEL,
  SEARCH_PLACEHOLDER,
  SEARCH_RESULT_GROUPS,
} from "../searchVocabulary";

describe("localized search vocabulary", () => {
  // @req REQ-140
  it("keeps the existing French constants as the French vocabulary", () => {
    expect(getSearchLabel("fr")).toBe(SEARCH_LABEL);
    expect(getSearchPlaceholder("fr")).toBe(SEARCH_PLACEHOLDER);
    expect(getSearchResultGroups("fr")).toBe(SEARCH_RESULT_GROUPS);
  });

  // @req REQ-140
  it("returns English field copy and result group headings", () => {
    expect(getSearchLabel("en")).toBe(
      "Search for a people, language, country, language family or surname"
    );
    expect(getSearchPlaceholder("en")).toBe(
      "E.g. Bafut, Fulfulde, Namibia, Keita"
    );
    expect(getSearchResultGroups("en")).toEqual([
      { type: "people", heading: "Peoples" },
      { type: "language", heading: "Languages" },
      { type: "country", heading: "Countries" },
      { type: "languageFamily", heading: "Language families" },
      { type: "patronyme", heading: "Surnames" },
    ]);
  });
});
