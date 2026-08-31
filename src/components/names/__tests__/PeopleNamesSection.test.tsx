/**
 * Tests for PeopleNamesSection (ETNI-473 / Epic 8 Story 8.9).
 *
 * The section MUST:
 *   - render endonym records first (AutonymExonymHeading semantics for the
 *     people name, then a NameOriginCard per endonym record),
 *   - render imposed exonyms with their badge, full context and a
 *     DoctrineLinkCard,
 *   - close with NameSpellingHistory,
 *   - omit itself entirely (no shell, no anchor) when there are zero
 *     published name records (UX-DR31).
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PeopleNamesSection } from "@/components/names/PeopleNamesSection";
import type { PeopleNamesData } from "@/lib/peopleDataTransformer";

const populatedData: PeopleNamesData = {
  autonym: "Jieng",
  endonyms: [
    {
      record: {
        nameText: "Jieng",
        nameType: "endonym",
        languageOfOrigin: "din",
        meaning: "peuple",
        periodLabel: null,
        imposedBy: null,
        impositionPeriod: null,
        whyProblematic: null,
        contemporaryUsage: null,
      },
      confidenceScore: 90,
      sourceCount: 1,
      lastHumanAuditAt: "2025-01-01",
    },
  ],
  exonyms: [
    {
      record: {
        nameText: "Dinka",
        nameType: "exonym",
        languageOfOrigin: null,
        meaning: null,
        periodLabel: null,
        imposedBy: "administration coloniale britannique",
        impositionPeriod: "1898-1956",
        whyProblematic: "efface l'auto-appellation Jieng",
        contemporaryUsage: "toujours utilisé internationalement",
      },
      confidenceScore: null,
      sourceCount: 0,
      lastHumanAuditAt: null,
    },
  ],
  spellingHistory: [
    {
      nameText: "Denka",
      periodLabel: "1850-1900",
      confidenceScore: 60,
      sourceCount: 0,
      lastHumanAuditAt: "2025-02-01",
    },
  ],
};

describe("PeopleNamesSection", () => {
  // @req REQ-054 REQ-056
  it("renders the section at anchor id=noms", () => {
    const { container } = render(<PeopleNamesSection data={populatedData} />);
    expect(container.querySelector("#noms")).not.toBeNull();
  });

  // @req REQ-054
  it("renders the people's autonym via AutonymExonymHeading semantics", () => {
    const { container } = render(<PeopleNamesSection data={populatedData} />);
    expect(container.querySelector(".AutonymExonymHeading")).toHaveTextContent(
      "Jieng"
    );
  });

  // @req REQ-054 REQ-056
  it("renders endonym records before exonym records, closing with the spelling history", () => {
    const { container } = render(<PeopleNamesSection data={populatedData} />);
    const html = container.innerHTML;
    const endonymIndex = html.indexOf("peuple");
    const exonymIndex = html.indexOf("Dinka");
    const historyIndex = html.indexOf("Denka");
    expect(endonymIndex).toBeGreaterThan(-1);
    expect(exonymIndex).toBeGreaterThan(endonymIndex);
    expect(historyIndex).toBeGreaterThan(exonymIndex);
  });

  // @req REQ-056
  it("renders the badge and full imposition context for an imposed exonym", () => {
    render(<PeopleNamesSection data={populatedData} />);
    expect(screen.getByText("nom imposé")).toBeInTheDocument();
    expect(
      screen.getByText(/administration coloniale britannique/)
    ).toBeInTheDocument();
    expect(screen.getByText(/1898-1956/)).toBeInTheDocument();
    expect(
      screen.getByText(/efface l'auto-appellation Jieng/)
    ).toBeInTheDocument();
  });

  // @req REQ-056
  it("renders a DoctrineLinkCard for an imposed exonym", () => {
    render(<PeopleNamesSection data={populatedData} />);
    expect(
      screen.getByRole("link", { name: /lire la doctrine/i })
    ).toBeInTheDocument();
  });

  // @req REQ-056
  it("closes the section with NameSpellingHistory as a semantic ol", () => {
    const { container } = render(<PeopleNamesSection data={populatedData} />);
    const ol = container.querySelector("ol");
    expect(ol).not.toBeNull();
    expect(ol).toHaveTextContent("Denka");
  });

  // @req REQ-054 (UX-DR31)
  it("omits itself entirely when data is null", () => {
    const { container } = render(<PeopleNamesSection data={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  // @req REQ-054 (UX-DR31)
  it("omits itself entirely when there are no endonyms, exonyms or spelling history", () => {
    const empty: PeopleNamesData = {
      autonym: null,
      endonyms: [],
      exonyms: [],
      spellingHistory: [],
    };
    const { container } = render(<PeopleNamesSection data={empty} />);
    expect(container).toBeEmptyDOMElement();
  });
});
