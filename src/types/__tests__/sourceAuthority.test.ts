import { describe, expect, it } from "vitest";

import {
  AUTHORITATIVE_SOURCE_TIERS,
  SOURCE_TIERS,
  isAuthoritativeSourceTier,
} from "@/types/sources";

/**
 * Four surfaces decide something on the same line — a quiz answer, a name
 * fiche's indexing, its "being assembled" note and its sitemap entry — and
 * each used to spell the line out by hand. One of them as `!== "unverified"`,
 * which silently widens the moment a fourth tier is added.
 */
describe("source authority", () => {
  // @req REQ-092
  it("holds official and referenced citations as carrying authority of their own", () => {
    expect(isAuthoritativeSourceTier("official")).toBe(true);
    expect(isAuthoritativeSourceTier("referenced")).toBe(true);
  });

  // @req REQ-092
  it("holds an unverified citation, or an unreadable tier, as carrying none", () => {
    expect(isAuthoritativeSourceTier("unverified")).toBe(false);
    expect(isAuthoritativeSourceTier("certified")).toBe(false);
    expect(isAuthoritativeSourceTier(undefined)).toBe(false);
  });

  // @req REQ-092
  it("draws the line inside the tier vocabulary, in its order", () => {
    expect(AUTHORITATIVE_SOURCE_TIERS).toEqual(
      SOURCE_TIERS.filter((tier) => tier !== "unverified")
    );
  });
});
