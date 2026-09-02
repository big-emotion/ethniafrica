import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SourceStandingBadge } from "@/components/sources/SourceStandingBadge";

describe("SourceStandingBadge", () => {
  // @req REQ-092
  it("names each tier in the corpus's own words", () => {
    render(<SourceStandingBadge standing="official" />);
    expect(screen.getByText("Officielle")).toBeInTheDocument();
  });

  /**
   * 335 sources carry no tier. Showing them as "Non vérifiée" would state a
   * judgement no editor made — the label exists precisely to keep the two
   * apart, and folding one onto the other is the failure this pins down.
   */
  // @req REQ-092
  it("says an unclassified source is awaiting review, never that it is unverified", () => {
    render(<SourceStandingBadge standing="needs_review" />);

    expect(screen.getByText("En attente d'examen")).toBeInTheDocument();
    expect(screen.queryByText("Non vérifiée")).not.toBeInTheDocument();
  });

  /**
   * actions-charter §6: radius 0 is the source apparatus — "the sharp corner
   * says this is a document, not an application". A tier mark is named in that
   * rule, so a pill here would make the apparatus read as a filter chip.
   */
  // @req REQ-092
  it("wears the square corner the source apparatus is owed", () => {
    render(<SourceStandingBadge standing="referenced" />);

    const badge = screen.getByText("Référencée");
    expect(badge.className).toContain("rounded-none");
    expect(badge.className).not.toContain("rounded-full");
  });

  // @req REQ-092
  it("carries the standing as data, so a reading can be asserted without reading French", () => {
    render(<SourceStandingBadge standing="unverified" />);

    expect(screen.getByText("Non vérifiée")).toHaveAttribute(
      "data-source-standing",
      "unverified"
    );
  });
});
