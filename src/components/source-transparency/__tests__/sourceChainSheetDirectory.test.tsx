import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SourceChainSheet from "@/components/source-transparency/SourceChainSheet";

/**
 * The panel a note callout opens, once the sources it lists have a page of
 * their own.
 *
 * This is where the two numbering schemes meet. The callout is numbered by
 * reading order; a source is numbered by its place in the fiche's
 * bibliography. Nowhere else on the page does a reader see both, so if the
 * panel does not carry the second number the footer's numbering indexes
 * nothing anyone can follow.
 */

const assertion = {
  statement: "Les rites d'initiation structurent les classes d'âge.",
  confidenceScore: 0,
  sourceCount: 2,
  lastHumanAuditAt: null,
};

function renderSheet(
  sources: Parameters<typeof SourceChainSheet>[0]["sources"]
) {
  return render(
    <SourceChainSheet
      open
      onOpenChange={vi.fn()}
      assertion={assertion}
      sources={sources}
      anchorId="chip-content-culture-majorrites"
    />
  );
}

describe("SourceChainSheet — the directory bridge", () => {
  // @req REQ-019
  it("shows each source's place in the fiche's bibliography", () => {
    renderSheet([
      {
        id: "s-1",
        title: "Ethnologue",
        tier: "official",
        bibliographyNumber: 4,
      },
    ]);

    expect(screen.getByTestId("source-number-s-1")).toHaveTextContent("4");
  });

  // @req REQ-019
  it("links a source to its own page rather than only to the work", () => {
    renderSheet([
      {
        id: "11111111-1111-1111-1111-111111111111",
        title: "Ethnologue",
        tier: "official",
        url: "https://ethnologue.com",
      },
    ]);

    expect(
      screen.getByRole("link", { name: /bibliographie/i })
    ).toHaveAttribute(
      "href",
      "/fr/sources/11111111-1111-1111-1111-111111111111"
    );
  });

  /**
   * The sheet used to fold anything it did not recognise onto "unverified",
   * which states a judgement no editor made. An untiered source now keeps its
   * own standing all the way to the panel.
   */
  // @req REQ-019
  it("says an untiered source awaits review, never that it is unverified", () => {
    renderSheet([
      { id: "s-2", title: "Une source non classée", tier: "needs_review" },
    ]);

    // Twice over: the group that closes the list, and the source's own badge.
    expect(screen.getByTestId("source-tier-s-2")).toHaveTextContent(
      "En attente d'examen"
    );
    expect(screen.getByTestId("tier-group-needs_review")).toBeInTheDocument();
    expect(screen.queryByText("Non vérifiée")).not.toBeInTheDocument();
  });

  // @req REQ-019
  it("still lists a source the fiche's bibliography has not numbered", () => {
    renderSheet([{ id: "s-3", title: "Une source citée", tier: "referenced" }]);

    expect(screen.getByTestId("source-item-s-3")).toBeInTheDocument();
    expect(screen.queryByTestId("source-number-s-3")).toBeNull();
  });
});
