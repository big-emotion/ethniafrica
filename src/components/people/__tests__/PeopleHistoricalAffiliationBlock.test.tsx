import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { PeopleHistoricalAffiliationBlock } from "../PeopleHistoricalAffiliationBlock";

describe("PeopleHistoricalAffiliationBlock", () => {
  afterEach(cleanup);

  // @req REQ-127
  it("prints the description and each source with the tier it carries", () => {
    render(
      <PeopleHistoricalAffiliationBlock
        data={{
          description:
            "Peuple afro-descendant formé par la traite transatlantique.",
          sources: [
            {
              title: "UNESCO — Mémoire du monde, route des esclaves",
              url: "https://www.unesco.org/en/memory-world",
              tier: "official",
            },
          ],
        }}
      />
    );

    expect(
      screen.getByText(
        /Peuple afro-descendant formé par la traite transatlantique/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("UNESCO — Mémoire du monde, route des esclaves")
    ).toBeInTheDocument();
    expect(screen.getByText("Officielle")).toBeInTheDocument();
  });

  // @req REQ-127
  it("renders nothing for a fiche with no historicalAffiliation section", () => {
    const { container } = render(
      <PeopleHistoricalAffiliationBlock data={undefined} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
