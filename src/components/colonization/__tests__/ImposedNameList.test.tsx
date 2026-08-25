import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ImposedNameList } from "../ImposedNameList";
import { mapImposedNames } from "../imposedNames";
import {
  SONINKE_WITHOUT_IMPOSED_NAME,
  YORUBA_WITH_IMPOSED_NAME,
} from "./imposedNamesFixtures";

describe("ImposedNameList", () => {
  // @req REQ-104
  it("shows the endonym first, with a lang attribute matching its language of origin", () => {
    const items = mapImposedNames([YORUBA_WITH_IMPOSED_NAME]);
    render(<ImposedNameList items={items} />);

    const endonym = screen.getByText("Ọmọ Yorùbá");
    expect(endonym).toHaveAttribute("lang", "yo");

    const imposed = screen.getByText("Nago");
    // endonym-first: the endonym node precedes the imposed name node in the DOM.
    expect(
      endonym.compareDocumentPosition(imposed) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  // @req REQ-104
  it("marks the imposed name with the colonial token and the « nom imposé » label", () => {
    const items = mapImposedNames([YORUBA_WITH_IMPOSED_NAME]);
    const { container } = render(<ImposedNameList items={items} />);

    const label = screen.getByText("nom imposé");
    expect(label).toBeInTheDocument();

    const badge = label.closest("div");
    const style = badge?.getAttribute("style") ?? "";
    expect(style).toContain("--afh-color-colonial");

    expect(container.querySelector('[lang="yo"]')).toBeInTheDocument();
  });

  // @req REQ-104
  it("shows the why-problematic explanation", () => {
    const items = mapImposedNames([YORUBA_WITH_IMPOSED_NAME]);
    render(<ImposedNameList items={items} />);

    expect(
      screen.getByText(/effaçant l'auto-désignation Yorùbá/)
    ).toBeInTheDocument();
  });

  // @req REQ-104
  it("renders a ConfidenceChip for the entry", () => {
    const items = mapImposedNames([YORUBA_WITH_IMPOSED_NAME]);
    render(<ImposedNameList items={items} />);

    expect(screen.getByText(/78 % · 1 sources/)).toBeInTheDocument();
  });

  // @req REQ-104
  it("links to the Epic 8 Names Atlas record for the people", () => {
    const items = mapImposedNames([YORUBA_WITH_IMPOSED_NAME]);
    render(<ImposedNameList items={items} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", expect.stringContaining("PPL_YORUBA"));
  });

  // @req REQ-104
  it("is absent for a people with no Epic 8 imposed-name record", () => {
    const items = mapImposedNames([
      YORUBA_WITH_IMPOSED_NAME,
      SONINKE_WITHOUT_IMPOSED_NAME,
    ]);
    render(<ImposedNameList items={items} />);

    expect(screen.queryByText("Sooninkoore")).not.toBeInTheDocument();
  });

  // @req REQ-104
  it("renders nothing (no empty shell) when there are no imposed-name records", () => {
    const { container } = render(<ImposedNameList items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
