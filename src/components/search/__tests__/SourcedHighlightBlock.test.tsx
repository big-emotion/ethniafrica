import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SourcedHighlightBlock } from "../SourcedHighlightBlock";
import type { DidYouKnowFact } from "@/lib/home/didYouKnowFacts";
import type { SearchResult } from "@/types/afrik-frontend";

const zuluResult: SearchResult = {
  type: "people",
  id: "PPL_ZULU",
  name: "Zoulou",
};

const facts: DidYouKnowFact[] = [
  {
    id: "bantou",
    headline:
      "« Bantou » n'est pas un peuple : c'est une catégorie forgée par un philologue en 1862.",
    body: ["…"],
    entities: [
      { kind: "family", id: "FLG_BANTU", label: "Langues bantoues" },
      { kind: "people", id: "PPL_ZULU", label: "Zoulou" },
    ],
    tier: "referenced",
  },
];

describe("SourcedHighlightBlock", () => {
  // @req REQ-124
  it("shows the one fact matching the pivot with its source tier", () => {
    render(<SourcedHighlightBlock result={zuluResult} facts={facts} />);

    expect(screen.getByTestId("sourced-highlight-block")).toHaveTextContent(
      /philologue en 1862/
    );
    expect(screen.getByTestId("sourced-highlight-tier")).toHaveTextContent(
      "Source référencée"
    );
  });

  // @req REQ-124
  it("renders nothing when the bank has no fact about this pivot", () => {
    const { container } = render(
      <SourcedHighlightBlock
        result={{ type: "people", id: "PPL_UNKNOWN", name: "Inconnu" }}
        facts={facts}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
