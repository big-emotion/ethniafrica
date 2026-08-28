import { describe, expect, it } from "vitest";

import {
  buildRelationSearchHref,
  readRelation,
  relationSearchParams,
} from "../relationSearch";

describe("buildRelationSearchHref", () => {
  // @req REQ-002
  it("points a family chip at a family-scoped search", () => {
    expect(
      buildRelationSearchHref("fr", { kind: "family", id: "FLG_KROU" })
    ).toBe("/fr/recherche?family=FLG_KROU");
  });

  // @req REQ-002
  it("points a country chip at a country-scoped search", () => {
    expect(buildRelationSearchHref("fr", { kind: "country", id: "CIV" })).toBe(
      "/fr/recherche?country=CIV"
    );
  });

  // @req REQ-002
  it("keeps the free-text query when one is already active", () => {
    expect(
      buildRelationSearchHref("fr", { kind: "family", id: "FLG_KROU" }, "Bété")
    ).toBe("/fr/recherche?q=B%C3%A9t%C3%A9&family=FLG_KROU");
  });
});

describe("readRelation", () => {
  // @req REQ-002
  it("reads a family relation from the URL", () => {
    expect(readRelation(new URLSearchParams("family=FLG_KROU"))).toEqual({
      kind: "family",
      id: "FLG_KROU",
    });
  });

  // @req REQ-002
  it("reads a country relation from the URL", () => {
    expect(readRelation(new URLSearchParams("country=CIV"))).toEqual({
      kind: "country",
      id: "CIV",
    });
  });

  // @req REQ-002
  it("returns nothing when no relation param is present", () => {
    expect(readRelation(new URLSearchParams("q=Bété"))).toBeNull();
  });

  // @req REQ-002
  it("keeps a single relation active when both params are present", () => {
    expect(
      readRelation(new URLSearchParams("family=FLG_KROU&country=CIV"))
    ).toEqual({ kind: "family", id: "FLG_KROU" });
  });
});

describe("relationSearchParams", () => {
  // @req REQ-002
  it("maps a family relation onto the API parameter the route reads", () => {
    expect(relationSearchParams({ kind: "family", id: "FLG_KROU" })).toEqual({
      familyId: "FLG_KROU",
    });
  });

  // @req REQ-002
  it("maps a country relation onto the API parameter the route reads", () => {
    expect(relationSearchParams({ kind: "country", id: "CIV" })).toEqual({
      countryId: "CIV",
    });
  });

  // @req REQ-002
  it("maps no relation onto no parameter", () => {
    expect(relationSearchParams(null)).toEqual({});
  });
});
