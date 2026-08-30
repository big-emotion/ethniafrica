import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { FicheSection } from "../FicheSection";
import { ACCENT_CLASS_BY_ENTITY, FicheSequence } from "../FicheSequence";
import type { FichePanelContext } from "../panelRegistry";
import { derivePanelSequence } from "@/lib/fichePanels";
import {
  NIGER_CONGO,
  NIGER_CONGO_BRANCHES,
  NIGERIA,
  RELATIONS,
  YORUBA,
  YORUBA_DISTRIBUTIONS,
  YORUBA_FRAGMENTATION,
  YORUBA_NAMES_DOSSIER,
} from "./ficheContextFixtures";

const RECORD = <p>Dossier AFRIK complet</p>;

const PEOPLE_CONTEXT: FichePanelContext = {
  entityType: "people",
  payload: YORUBA,
  namesDossier: YORUBA_NAMES_DOSSIER,
  distributions: YORUBA_DISTRIBUTIONS,
  fragmentation: YORUBA_FRAGMENTATION,
  relations: RELATIONS,
  hasOralNarratives: true,
};

const COUNTRY_CONTEXT: FichePanelContext = {
  entityType: "country",
  payload: NIGERIA,
  relations: RELATIONS,
};

const FAMILY_CONTEXT: FichePanelContext = {
  entityType: "language-family",
  payload: NIGER_CONGO,
  branches: NIGER_CONGO_BRANCHES,
  relations: RELATIONS,
};

/** ScalePanel reads the reduced-motion preference; VoicesPanel fetches narratives. */
function stubPanelRuntime() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) })
  );
}

function renderedAnchors(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("section[id]")).map(
    (section) => section.id
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FicheSequence — accent scope", () => {
  // @req REQ-091
  it.each([
    ["people", PEOPLE_CONTEXT, "afh-accent-ocre"],
    ["country", COUNTRY_CONTEXT, "afh-accent-teal"],
    ["language-family", FAMILY_CONTEXT, "afh-accent-perv"],
  ] as const)(
    "scopes the %s fiche to its own accent class",
    (entityType, context, expectedClass) => {
      stubPanelRuntime();
      const { container } = render(
        <FicheSequence context={context} record={RECORD} />
      );

      expect(ACCENT_CLASS_BY_ENTITY[entityType]).toBe(expectedClass);
      expect(
        (container.firstElementChild as HTMLElement).classList.contains(
          expectedClass
        )
      ).toBe(true);
    }
  );

  // @req REQ-091
  it("keeps the globe out of the measured column, so it can run edge to edge", () => {
    stubPanelRuntime();
    const { container } = render(
      <FicheSequence
        context={COUNTRY_CONTEXT}
        record={RECORD}
        globe={<div data-testid="globe-stage" />}
      />
    );

    const globe = screen.getByTestId("globe-stage");
    const measured = container.querySelector(".max-w-4xl");

    expect(measured).not.toBeNull();
    expect(measured!.contains(globe)).toBe(false);
  });

  // @req REQ-091
  it("keeps the reading inside a measured column", () => {
    stubPanelRuntime();
    const { container } = render(
      <FicheSequence
        context={COUNTRY_CONTEXT}
        record={RECORD}
        globe={<div data-testid="globe-stage" />}
      />
    );

    const measured = container.querySelector(".max-w-4xl");
    expect(measured).not.toBeNull();
    expect(measured!.querySelector("section")).not.toBeNull();
  });

  // @req REQ-091
  it("never scopes a fiche to terre, the reserved colonial-marker accent", () => {
    expect(Object.values(ACCENT_CLASS_BY_ENTITY)).not.toContain(
      "afh-accent-terre"
    );
  });

  // @req REQ-091
  it("uses accent classes that the token stylesheet actually defines", () => {
    const colorCss = readFileSync(
      join(process.cwd(), "src/styles/tokens/color.css"),
      "utf8"
    );

    for (const accentClass of Object.values(ACCENT_CLASS_BY_ENTITY)) {
      const rule = colorCss.match(
        new RegExp(`\\.${accentClass}\\s*\\{([\\s\\S]*?)\\}`)
      )?.[1];
      expect(rule, `${accentClass} is not defined in color.css`).toBeDefined();
      expect(rule).toMatch(/--accent:\s*var\(--afh-cat-[\w-]+\);/);
      expect(rule).toMatch(/--accent-tint:\s*var\(--afh-cat-[\w-]+-tint\);/);
    }
  });
});

describe("FicheSequence — panel order and anchors", () => {
  // The family was the last fiche still opening chapters above its parchment,
  // and both restated it — the scale figure is the languages count the head
  // chip prints, the tongue chapter the tree the parchment renders. Passing a
  // context carrying every side-load they read is the point: it is the guard
  // against a chapter creeping back in through the context rather than through
  // the gate table.
  // @req REQ-091
  it("reduces a family fiche to its dossier alone, side-loads notwithstanding", () => {
    stubPanelRuntime();
    const { container } = render(
      <FicheSequence context={FAMILY_CONTEXT} record={RECORD} />
    );

    expect(renderedAnchors(container)).toEqual(["fiche-record"]);
  });

  // @req REQ-091
  it("reduces a people fiche to its dossier alone", () => {
    stubPanelRuntime();
    const { container } = render(
      <FicheSequence context={PEOPLE_CONTEXT} record={RECORD} />
    );

    expect(renderedAnchors(container)).toEqual(["fiche-record"]);
  });

  // @req REQ-091
  it("keeps every rendered anchor a subsequence of derivePanelSequence", () => {
    stubPanelRuntime();
    const { container } = render(
      <FicheSequence context={FAMILY_CONTEXT} record={RECORD} />
    );

    const composed = derivePanelSequence("language-family", NIGER_CONGO).map(
      (kind) => `fiche-${kind}`
    );
    const rendered = renderedAnchors(container);

    expect(rendered).toEqual(composed.filter((id) => rendered.includes(id)));
    expect(rendered.length).toBeGreaterThan(0);
  });

  // @req REQ-091
  it("renders the record last, gating the legacy detail view", () => {
    stubPanelRuntime();
    const { container } = render(
      <FicheSequence context={COUNTRY_CONTEXT} record={RECORD} />
    );

    const anchors = renderedAnchors(container);
    expect(anchors[anchors.length - 1]).toBe("fiche-record");
    expect(screen.getByText("Lire le dossier complet")).toBeInTheDocument();
  });
});

describe("FicheSequence — the dossier as the page's body", () => {
  // @req REQ-091
  it("opens the dossier unfolded, with no reading gate", () => {
    stubPanelRuntime();
    render(
      <FicheSequence
        context={PEOPLE_CONTEXT}
        record={RECORD}
        recordPlacement="body"
      />
    );

    expect(screen.getByText("Dossier AFRIK complet")).toBeInTheDocument();
    expect(
      screen.queryByText("Lire le dossier complet")
    ).not.toBeInTheDocument();
  });

  // @req REQ-091
  it("renders the dossier once, never as body and chapter both", () => {
    stubPanelRuntime();
    const { container } = render(
      <FicheSequence
        context={PEOPLE_CONTEXT}
        record={RECORD}
        recordPlacement="body"
      />
    );

    expect(screen.getAllByText("Dossier AFRIK complet")).toHaveLength(1);
    expect(container.querySelectorAll("#fiche-record")).toHaveLength(1);
  });

  // @req REQ-091
  it("keeps the record anchor the globe's facts panel links to", () => {
    stubPanelRuntime();
    const { container } = render(
      <FicheSequence
        context={PEOPLE_CONTEXT}
        record={RECORD}
        recordPlacement="body"
      />
    );

    const record = container.querySelector("#fiche-record");
    expect(record).not.toBeNull();
    expect(record!.textContent).toContain("Dossier AFRIK complet");
  });

  // @req REQ-091
  it("stands the dossier beside the globe, outside any measured column", () => {
    stubPanelRuntime();
    const { container } = render(
      <FicheSequence
        context={PEOPLE_CONTEXT}
        record={RECORD}
        recordPlacement="body"
        globe={<div data-testid="globe-stage" />}
      />
    );

    // A parchment carries its own reading measure; a column here would apply
    // a second, wider one on top of it.
    const root = container.firstElementChild;
    const record = container.querySelector("#fiche-record");
    expect(record?.parentElement).toBe(root);
    expect(container.querySelector(".max-w-4xl")).toBeNull();
  });

  // @req REQ-091
  it("drops the context triad a parchment already states for itself", () => {
    stubPanelRuntime();
    const { container } = render(
      <FicheSequence
        context={PEOPLE_CONTEXT}
        record={RECORD}
        recordPlacement="body"
      />
    );

    expect(container.querySelector("[data-context-triad]")).toBeNull();
  });

  // @req REQ-091
  it("leaves the reading gate standing for a fiche that did not ask for a body", () => {
    stubPanelRuntime();
    const { container } = render(
      <FicheSequence context={COUNTRY_CONTEXT} record={RECORD} />
    );

    expect(screen.getByText("Lire le dossier complet")).toBeInTheDocument();
    expect(container.querySelector("[data-context-triad]")).not.toBeNull();
  });
});

describe("FicheSequence — gating by construction (FR98)", () => {
  // Every entity's inventory is the record alone, so no context — however
  // richly side-loaded — can put a chapter above a parchment. The per-kind
  // "this pair resolves to null" contract, which used to be observed through
  // the family sequence, lives where it is still observable: on `resolvePanel`
  // itself (panelRegistry.test.tsx).
  // @req REQ-091
  it.each([
    ["people", PEOPLE_CONTEXT],
    ["country", COUNTRY_CONTEXT],
    ["language-family", FAMILY_CONTEXT],
  ] as const)(
    "emits no chapter anchor for a %s fiche",
    (_entityType, context) => {
      stubPanelRuntime();
      const { container } = render(
        <FicheSequence context={context} record={RECORD} />
      );

      expect(renderedAnchors(container)).toEqual(["fiche-record"]);
      for (const kind of [
        "identity",
        "scale",
        "territory",
        "tongue",
        "fragmentation",
        "links",
        "voices",
      ]) {
        expect(container.querySelector(`#fiche-${kind}`)).toBeNull();
      }
    }
  );

  // @req REQ-091
  it("renders nothing at all when the fiche has no dossier to show", () => {
    stubPanelRuntime();
    const { container } = render(
      <FicheSequence
        context={{ entityType: "language-family", payload: NIGER_CONGO }}
        record={null}
      />
    );

    expect(renderedAnchors(container)).toEqual([]);
    expect(screen.queryByText("02 · Échelle")).not.toBeInTheDocument();
  });

  // The country fiche is the first on the body placement: its dossier is the
  // page, so the sequence emits the record section and no measure wrapper
  // around it.
  // @req REQ-091
  it("puts a body-placed record outside the reading measure, ungated", () => {
    stubPanelRuntime();
    const { container } = render(
      <FicheSequence
        context={COUNTRY_CONTEXT}
        record={RECORD}
        recordPlacement="body"
      />
    );

    expect(renderedAnchors(container)).toEqual(["fiche-record"]);
    expect(container.querySelectorAll("details")).toHaveLength(0);
    expect(
      container.querySelector("#fiche-record")?.closest(".max-w-4xl")
    ).toBeNull();
  });
  // The rail scopes its chapter scan to this marker. Without it the rail
  // falls back to the whole document and would list a chapter rendered in a
  // modal or a preview — one it could not scroll to.
  // @req REQ-091
  it("marks its root as the fiche the reading rail reads", () => {
    stubPanelRuntime();
    const { container } = render(
      <FicheSequence
        context={COUNTRY_CONTEXT}
        record={RECORD}
        recordPlacement="body"
      />
    );

    expect(
      container.querySelector("[data-fiche-sequence]")
    ).toBeInTheDocument();
  });

  // One mount point for the three fiches: a route that forgot the rail would
  // ship a fiche a reader cannot navigate, and no route names it.
  // @req REQ-091
  it("mounts the reading rail between the globe and the parchment", () => {
    stubPanelRuntime();
    const { container } = render(
      <FicheSequence
        context={COUNTRY_CONTEXT}
        record={
          <>
            <FicheSection title="Étymologie du nom">nom</FicheSection>
            <FicheSection title="Peuples du pays">peuples</FicheSection>
          </>
        }
        recordPlacement="body"
        globe={<div data-testid="globe" />}
      />
    );

    const children = Array.from(
      container.querySelector("[data-fiche-sequence]")?.children ?? []
    );
    const positionOf = (match: (child: Element) => boolean) =>
      children.findIndex(match);

    expect(positionOf((child) => child.matches("[data-testid='globe']"))).toBe(
      0
    );
    expect(positionOf((child) => child.matches(".afh-chapter-bar"))).toBe(1);
    expect(positionOf((child) => child.id === "fiche-record")).toBe(2);
  });
});
