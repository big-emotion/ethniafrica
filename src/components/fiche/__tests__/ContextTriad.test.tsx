import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContextTriad } from "../ContextTriad";
import { sectionIdForPanel } from "../panelRegistry";
import type { FichePanelContext } from "../panelRegistry";
import { NIGER_CONGO, NIGERIA, YORUBA } from "./ficheContextFixtures";

const RECORD_ANCHOR = `#${sectionIdForPanel("record")}`;

function itemsOf(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll("[data-context-triad-item]")
  ) as HTMLElement[];
}

function renderTriad(context: FichePanelContext) {
  return render(<ContextTriad context={context} />);
}

describe("ContextTriad — people variant (direct chips)", () => {
  const context: FichePanelContext = { entityType: "people", payload: YORUBA };

  // @req REQ-091
  it("renders exactly one family chip resolving to the family fiche", () => {
    const { container } = renderTriad(context);
    const familyItems = itemsOf(container).filter(
      (el) => el.dataset.contextTriadKind === "family"
    );

    expect(familyItems).toHaveLength(1);
    expect(familyItems[0].dataset.contextTriadVariant).toBe("chip");
    const link = familyItems[0].querySelector("a");
    expect(link).toHaveAttribute("href", "/fr/familles/FLG_NIGER_CONGO");
  });

  // @req REQ-091
  it("marks the current people as the non-link entity node", () => {
    const { container } = renderTriad(context);
    const entityItems = itemsOf(container).filter(
      (el) => el.dataset.contextTriadKind === "entity"
    );

    expect(entityItems).toHaveLength(1);
    expect(entityItems[0].dataset.contextTriadVariant).toBe("current");
    expect(entityItems[0].querySelector("a")).toBeNull();
    expect(entityItems[0].textContent).toContain("Yoruba");
    expect(
      entityItems[0].querySelector('[aria-current="location"]')
    ).not.toBeNull();
  });

  // @req REQ-091
  it("renders one direct chip per current country, in payload order", () => {
    const { container } = renderTriad(context);
    const countryItems = itemsOf(container).filter(
      (el) => el.dataset.contextTriadKind === "country"
    );

    expect(countryItems).toHaveLength(2);
    expect(countryItems[0].querySelector("a")).toHaveAttribute(
      "href",
      "/fr/pays/NGA"
    );
    expect(countryItems[1].querySelector("a")).toHaveAttribute(
      "href",
      "/fr/pays/BEN"
    );
  });

  // @req REQ-091 FR98
  it("never shows a family chip when the family is unresolved — absent, not guessed", () => {
    const { container } = renderTriad({
      entityType: "people",
      payload: { ...YORUBA, languageFamilyId: undefined as never },
    });

    expect(
      itemsOf(container).some((el) => el.dataset.contextTriadKind === "family")
    ).toBe(false);
  });

  // @req REQ-091 FR98
  it("omits the country group entirely when the payload lists no country", () => {
    const { container } = renderTriad({
      entityType: "people",
      payload: { ...YORUBA, currentCountries: [] },
    });

    expect(
      itemsOf(container).some((el) => el.dataset.contextTriadKind === "country")
    ).toBe(false);
  });
});

describe("ContextTriad — country variant (counter anchoring to a panel)", () => {
  const context: FichePanelContext = {
    entityType: "country",
    payload: NIGERIA,
  };

  // @req REQ-091
  it("marks the current country as the non-link entity node", () => {
    const { container } = renderTriad(context);
    const entityItems = itemsOf(container).filter(
      (el) => el.dataset.contextTriadKind === "entity"
    );

    expect(entityItems).toHaveLength(1);
    expect(entityItems[0].dataset.contextTriadVariant).toBe("current");
    expect(entityItems[0].textContent).toContain("Nigéria");
  });

  // @req REQ-091
  it("renders a peoples counter anchoring to the record chapter, never named chips", () => {
    const { container } = renderTriad(context);
    const peopleItems = itemsOf(container).filter(
      (el) => el.dataset.contextTriadKind === "people"
    );

    expect(peopleItems).toHaveLength(1);
    expect(peopleItems[0].dataset.contextTriadVariant).toBe("counter");
    const link = peopleItems[0].querySelector("a");
    expect(link).toHaveAttribute("href", RECORD_ANCHOR);
    expect(link?.textContent).toContain(String(NIGERIA.majorPeoples?.length));
  });

  // @req REQ-091 FR98
  it("never guesses a family node for a country — a country has no single family", () => {
    const { container } = renderTriad(context);
    expect(
      itemsOf(container).some((el) => el.dataset.contextTriadKind === "family")
    ).toBe(false);
  });

  // @req REQ-091 FR98
  it("omits the peoples counter when the payload lists no major people", () => {
    const { container } = renderTriad({
      entityType: "country",
      payload: { ...NIGERIA, majorPeoples: [] },
    });

    expect(
      itemsOf(container).some((el) => el.dataset.contextTriadKind === "people")
    ).toBe(false);
  });
});

describe("ContextTriad — language-family variant (counter anchoring to a panel)", () => {
  const context: FichePanelContext = {
    entityType: "language-family",
    payload: NIGER_CONGO,
  };

  // @req REQ-091
  it("marks the current family as the non-link entity node", () => {
    const { container } = renderTriad(context);
    const entityItems = itemsOf(container).filter(
      (el) => el.dataset.contextTriadKind === "entity"
    );

    expect(entityItems).toHaveLength(1);
    expect(entityItems[0].dataset.contextTriadVariant).toBe("current");
    expect(entityItems[0].textContent).toContain("Niger-Congo");
  });

  // @req REQ-091
  it("renders a peoples counter anchoring to the record chapter, never named chips", () => {
    const { container } = renderTriad(context);
    const peopleItems = itemsOf(container).filter(
      (el) => el.dataset.contextTriadKind === "people"
    );

    expect(peopleItems).toHaveLength(1);
    expect(peopleItems[0].dataset.contextTriadVariant).toBe("counter");
    const link = peopleItems[0].querySelector("a");
    expect(link).toHaveAttribute("href", RECORD_ANCHOR);
    expect(link?.textContent).toContain(
      String(NIGER_CONGO.associatedPeoples?.length)
    );
  });

  // @req REQ-091 FR98
  it("omits the peoples counter when the payload lists no associated people", () => {
    const { container } = renderTriad({
      entityType: "language-family",
      payload: { ...NIGER_CONGO, associatedPeoples: [] },
    });

    expect(
      itemsOf(container).some((el) => el.dataset.contextTriadKind === "people")
    ).toBe(false);
  });
});

describe("ContextTriad — accessibility (R5)", () => {
  const context: FichePanelContext = { entityType: "people", payload: YORUBA };

  // @req REQ-091
  it("gives every interactive chip a 44px hit area", () => {
    const { container } = renderTriad(context);
    const links = Array.from(container.querySelectorAll("a"));

    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => {
      expect(link.className).toContain("min-h-[var(--afh-tree-node-min-h)]");
    });
  });

  // @req REQ-091
  it("floats via sticky positioning, never fixed — participates in flow so it cannot overlap content", () => {
    const { container } = renderTriad(context);
    const root = container.firstElementChild as HTMLElement;

    expect(root.className).toMatch(/(^|\s)sticky(\s|$)/);
    expect(root.className).not.toMatch(/(^|\s)fixed(\s|$)/);
    expect(root.className).toMatch(/(^|\s)top-0(\s|$)/);
  });

  // @req REQ-091
  it("never traps focus — plain nav links in natural tab order, no dialog role, no tabIndex=-1", () => {
    const { container } = renderTriad(context);
    const root = container.firstElementChild as HTMLElement;

    expect(root.getAttribute("role")).not.toBe("dialog");
    expect(root.getAttribute("role")).not.toBe("alertdialog");

    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>("a, button")
    );
    focusable.forEach((el) => {
      expect(el.getAttribute("tabindex")).not.toBe("-1");
    });
  });
});
