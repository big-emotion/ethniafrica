import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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
  // @req REQ-091
  it("renders the people panels in composer order, each under its journey anchor", () => {
    stubPanelRuntime();
    const { container } = render(
      <FicheSequence context={PEOPLE_CONTEXT} record={RECORD} />
    );

    expect(renderedAnchors(container)).toEqual([
      "fiche-identity",
      "fiche-scale",
      "fiche-territory",
      "fiche-fragmentation",
      "fiche-links",
      "fiche-voices",
      "fiche-record",
    ]);
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

describe("FicheSequence — gating by construction (FR98)", () => {
  // @req REQ-091
  it("emits no anchor for a kind the composer includes but no panel supports", () => {
    stubPanelRuntime();
    const { container } = render(
      <FicheSequence context={COUNTRY_CONTEXT} record={RECORD} />
    );

    // The composer lists identity as mandatory for every entity, yet no
    // country identity panel exists — the anchor must be absent, not empty.
    expect(derivePanelSequence("country", NIGERIA)).toContain("identity");
    expect(container.querySelector("#fiche-identity")).toBeNull();
    expect(container.querySelector("#fiche-territory")).toBeNull();
  });

  // @req REQ-091
  it("emits no anchor for a supported kind whose data is absent", () => {
    stubPanelRuntime();
    const { container } = render(
      <FicheSequence
        context={{ entityType: "people", payload: YORUBA }}
        record={RECORD}
      />
    );

    expect(derivePanelSequence("people", YORUBA)).toContain("territory");
    expect(container.querySelector("#fiche-territory")).toBeNull();
    expect(container.querySelector("#fiche-links")).toBeNull();
    expect(container.querySelector("#fiche-identity")).toBeNull();
  });

  // @req REQ-091
  it("keeps only the chapters something can render when the corpus is bare", () => {
    stubPanelRuntime();
    const { container } = render(
      <FicheSequence
        context={{ entityType: "country", payload: NIGERIA }}
        record={null}
      />
    );

    // No relations, no record view: scale is the one chapter this country
    // payload can actually fill.
    expect(renderedAnchors(container)).toEqual(["fiche-scale"]);
    expect(screen.getByText("02 · Échelle")).toBeInTheDocument();
  });

  // @req REQ-091
  it("emits no scale anchor when the figure has no source to stand on", () => {
    stubPanelRuntime();
    // Same country, minus its source line. ScalePanel would render an empty
    // shell here; the registry asks it first (hasScaleContent), so the chapter
    // and its journey anchor disappear together. An anchor scrolling to
    // nothing is the failure this guards against.
    const { container } = render(
      <FicheSequence
        context={{
          entityType: "country",
          payload: { ...NIGERIA, sources: undefined },
        }}
        record={null}
      />
    );

    expect(renderedAnchors(container)).toEqual([]);
    expect(screen.queryByText("02 · Échelle")).not.toBeInTheDocument();
  });
});
