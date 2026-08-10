import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import {
  resolvePanel,
  sectionIdForPanel,
  sideForPanelOrder,
  type FichePanelContext,
} from "../panelRegistry";
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

/** ScalePanel reads the reduced-motion preference on mount. */
function stubReducedMotion() {
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
}

function stubOralNarratives(narratives: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ data: narratives }) })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sideForPanelOrder", () => {
  // @req REQ-091
  it("places odd panel orders on the left", () => {
    expect(sideForPanelOrder(1)).toBe("left");
    expect(sideForPanelOrder(3)).toBe("left");
  });

  // @req REQ-091
  it("places even panel orders on the right", () => {
    expect(sideForPanelOrder(2)).toBe("right");
    expect(sideForPanelOrder(4)).toBe("right");
  });
});

describe("sectionIdForPanel", () => {
  // @req REQ-091
  it("namespaces every journey anchor under the fiche", () => {
    expect(sectionIdForPanel("record")).toBe("fiche-record");
    expect(sectionIdForPanel("territory")).toBe("fiche-territory");
  });
});

describe("resolvePanel — identity", () => {
  // @req REQ-091
  it("resolves the people identity panel from the names dossier", () => {
    render(<>{resolvePanel("identity", PEOPLE_CONTEXT, RECORD)}</>);
    expect(screen.getByText("Yorùbá ènìyàn")).toBeInTheDocument();
  });

  // @req REQ-091
  it("resolves to null for country and language-family, which have no identity panel yet", () => {
    expect(resolvePanel("identity", COUNTRY_CONTEXT, RECORD)).toBeNull();
    expect(resolvePanel("identity", FAMILY_CONTEXT, RECORD)).toBeNull();
  });

  // @req REQ-091
  it("resolves to null when the people carries no names dossier", () => {
    expect(
      resolvePanel(
        "identity",
        { entityType: "people", payload: YORUBA },
        RECORD
      )
    ).toBeNull();
  });
});

describe("resolvePanel — scale", () => {
  // @req REQ-091
  it.each([
    ["people", PEOPLE_CONTEXT],
    ["country", COUNTRY_CONTEXT],
    ["language-family", FAMILY_CONTEXT],
  ] as const)("resolves the scale panel for %s", (_entityType, context) => {
    stubReducedMotion();
    render(<>{resolvePanel("scale", context, RECORD)}</>);
    expect(screen.getByText("02 · Échelle")).toBeInTheDocument();
  });
});

describe("resolvePanel — territory", () => {
  // @req REQ-091
  it("resolves the people territory panel from the country distributions", () => {
    render(<>{resolvePanel("territory", PEOPLE_CONTEXT, RECORD)}</>);
    expect(
      screen.getByRole("heading", { level: 2, name: /présence/i })
    ).toBeInTheDocument();
    expect(screen.getByText("NGA")).toBeInTheDocument();
  });

  // @req REQ-091
  it("derives its canvas side from the PANEL_TABLE order rather than a literal", () => {
    const { container } = render(
      <>{resolvePanel("territory", PEOPLE_CONTEXT, RECORD)}</>
    );
    // Territory is order 3 → odd → canvas on the left → rendered first.
    expect(
      container
        .querySelector("[data-fiche-panel-canvas]")
        ?.classList.contains("order-1")
    ).toBe(true);
  });

  // @req REQ-091
  it("resolves to null for country and language-family, whose territory panels are unbuilt", () => {
    expect(resolvePanel("territory", COUNTRY_CONTEXT, RECORD)).toBeNull();
    expect(resolvePanel("territory", FAMILY_CONTEXT, RECORD)).toBeNull();
  });

  // @req REQ-091
  it("resolves to null when the people has no country distributions", () => {
    expect(
      resolvePanel(
        "territory",
        { entityType: "people", payload: YORUBA, distributions: [] },
        RECORD
      )
    ).toBeNull();
  });
});

describe("resolvePanel — tongue", () => {
  // @req REQ-091
  it("resolves the language-family tongue panel from its branches", () => {
    render(<>{resolvePanel("tongue", FAMILY_CONTEXT, RECORD)}</>);
    expect(
      screen.getByRole("heading", { level: 2, name: /ramifie/i })
    ).toBeInTheDocument();
  });

  // @req REQ-091
  it("resolves to null for people and country, which have no tongue panel yet", () => {
    expect(resolvePanel("tongue", PEOPLE_CONTEXT, RECORD)).toBeNull();
    expect(resolvePanel("tongue", COUNTRY_CONTEXT, RECORD)).toBeNull();
  });

  // @req REQ-091
  it("resolves to null when the family exposes no branches", () => {
    expect(
      resolvePanel(
        "tongue",
        { entityType: "language-family", payload: NIGER_CONGO, branches: [] },
        RECORD
      )
    ).toBeNull();
  });
});

describe("resolvePanel — fragmentation", () => {
  // @req REQ-091
  it("resolves the people fragmentation panel", () => {
    render(<>{resolvePanel("fragmentation", PEOPLE_CONTEXT, RECORD)}</>);
    expect(screen.getByText("05 · Fragmentation")).toBeInTheDocument();
    expect(screen.getByText("Nigéria")).toBeInTheDocument();
  });

  // @req REQ-091
  it("resolves to null for country and language-family", () => {
    expect(resolvePanel("fragmentation", COUNTRY_CONTEXT, RECORD)).toBeNull();
    expect(resolvePanel("fragmentation", FAMILY_CONTEXT, RECORD)).toBeNull();
  });

  // @req REQ-091
  it("resolves to null when the fragmentation payload is absent", () => {
    expect(
      resolvePanel(
        "fragmentation",
        { entityType: "people", payload: YORUBA },
        RECORD
      )
    ).toBeNull();
  });
});

describe("resolvePanel — links", () => {
  // @req REQ-097
  it.each([
    ["people", PEOPLE_CONTEXT],
    ["country", COUNTRY_CONTEXT],
    ["language-family", FAMILY_CONTEXT],
  ] as const)("resolves the links panel for %s", (_entityType, context) => {
    render(<>{resolvePanel("links", context, RECORD)}</>);
    expect(screen.getByText("06 · Liens")).toBeInTheDocument();
    expect(screen.getByText("Fon")).toBeInTheDocument();
  });

  // @req REQ-097
  it("derives its canvas side from the PANEL_TABLE order rather than a literal", () => {
    const { container } = render(
      <>{resolvePanel("links", PEOPLE_CONTEXT, RECORD)}</>
    );
    // Links is order 6 → even → canvas on the right → rendered second.
    expect(
      container
        .querySelector("[data-fiche-panel-canvas]")
        ?.classList.contains("order-2")
    ).toBe(true);
  });

  // @req REQ-097
  it("resolves to null when no sourced relation is available", () => {
    expect(
      resolvePanel("links", { entityType: "country", payload: NIGERIA }, RECORD)
    ).toBeNull();
  });
});

describe("resolvePanel — voices", () => {
  // @req REQ-095
  it("resolves the people voices panel", async () => {
    stubOralNarratives([
      {
        id: "11111111-1111-1111-1111-111111111111",
        narratorDisplayName: "M. N.",
        community: "Communauté test",
        languageCode: "yor",
        narrativeKind: "testimony",
        summary: "Un récit transmis au sein de la communauté.",
        variantOf: null,
      },
    ]);

    render(<>{resolvePanel("voices", PEOPLE_CONTEXT, RECORD)}</>);

    await waitFor(() =>
      expect(screen.getByText("07 · Voix")).toBeInTheDocument()
    );
  });

  // @req REQ-095
  it("resolves to null for country and language-family, which have no voices panel yet", () => {
    expect(resolvePanel("voices", COUNTRY_CONTEXT, RECORD)).toBeNull();
    expect(resolvePanel("voices", FAMILY_CONTEXT, RECORD)).toBeNull();
  });

  // @req REQ-095
  it("resolves to null for a people with no published narrative", () => {
    // VoicesPanel only learns it is empty once its client fetch resolves, by
    // which point the anchor is already in the markup. The route answers the
    // question server-side instead, so the chapter never appears at all.
    expect(
      resolvePanel(
        "voices",
        { ...PEOPLE_CONTEXT, hasOralNarratives: false },
        RECORD
      )
    ).toBeNull();
  });
});

describe("resolvePanel — record", () => {
  // @req REQ-091
  it.each([
    ["people", PEOPLE_CONTEXT],
    ["country", COUNTRY_CONTEXT],
    ["language-family", FAMILY_CONTEXT],
  ] as const)(
    "wraps the legacy detail view in the reading gate for %s",
    (_entityType, context) => {
      render(<>{resolvePanel("record", context, RECORD)}</>);
      expect(screen.getByText("Lire le dossier complet")).toBeInTheDocument();
      expect(screen.getByText("Dossier AFRIK complet")).toBeInTheDocument();
    }
  );

  // @req REQ-091
  it("resolves to null when the route supplies no detail view", () => {
    expect(resolvePanel("record", PEOPLE_CONTEXT, null)).toBeNull();
  });
});

describe("resolvePanel — source lines", () => {
  // @req REQ-091
  it("cites the fiche's own AFRIK dossier and links to the record anchor", () => {
    const { container } = render(
      <>{resolvePanel("links", PEOPLE_CONTEXT, RECORD)}</>
    );
    const citation = container.querySelector<HTMLAnchorElement>(
      `a[href="#${sectionIdForPanel("record")}"]`
    );
    expect(citation).not.toBeNull();
    expect(citation!.textContent).toMatch(/dossier AFRIK/i);
  });
});
