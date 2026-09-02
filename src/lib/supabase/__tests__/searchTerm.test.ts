import { describe, expect, it } from "vitest";

import { escapeSearchTerm } from "@/lib/supabase/searchTerm";

/**
 * A PostgREST `.or()` filter is a comma-separated list of conditions whose
 * arguments are parenthesised. A reader searching a bibliography types exactly
 * the characters that syntax reserves — "Murdock, G.P. (1959)" carries a comma
 * and two parentheses — so the term is destroyed rather than escaped: there is
 * no escape sequence for a separator, and a filter that silently changes
 * meaning is worse than one that matches slightly more.
 */
describe("escapeSearchTerm", () => {
  // @req REQ-093
  it("drops the characters PostgREST reads as filter syntax", () => {
    const term = escapeSearchTerm("Murdock, G.P. (1959)");

    expect(term).not.toContain(",");
    expect(term).not.toContain("(");
    expect(term).not.toContain(")");
  });

  // @req REQ-093
  it("drops the percent sign so a term cannot widen its own ilike pattern", () => {
    expect(escapeSearchTerm("100% coverage")).not.toContain("%");
  });

  // @req REQ-093
  it("trims the whitespace the removals leave behind", () => {
    expect(escapeSearchTerm("  (Ethnologue)  ")).toBe("Ethnologue");
  });

  // @req REQ-093
  it("leaves an ordinary term untouched", () => {
    expect(escapeSearchTerm("Ethnologue 27th edition")).toBe(
      "Ethnologue 27th edition"
    );
  });
});
