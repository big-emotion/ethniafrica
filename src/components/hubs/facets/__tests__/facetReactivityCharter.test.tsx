import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  FacetCountryIndexProvider,
  PublishFacetCountryIndex,
  type FacetCountryIndex,
  type FacetCountryNarrowing,
} from "@/components/hubs/facets/FacetCountryIndex";
import { FacetGlobeIsland } from "@/components/hubs/facets/FacetGlobeIsland";
import { FacetHubShell } from "@/components/hubs/facets/FacetHubShell";
import { DIRECTORY_ACCENT_CLASS } from "@/components/views/DirectoryHero";
import { getFacet, getFacetRoute } from "@/lib/hubs/facets";
import { getPeopleRoute } from "@/lib/routing";

/**
 * The loop between the map and the list.
 *
 * Everything before this PR ran one way: the facet page published what it was
 * showing and the globe read it. That makes the map a viewer. The owner's
 * decision is that the map is a *second channel of selection* — reactive to the
 * reading, and able to change it — which is two claims a build can check, and
 * which nothing about a globe that renders correctly would catch.
 *
 * The third claim is the fold: on a phone the list is the page, and the map is
 * offered rather than scrolled past.
 */

/**
 * The stand-in exercises the `targetFacts` seam the way AtlasGlobe does —
 * calling it for a chosen target — so the panel's contents are asserted
 * through the same path the real globe uses. It also records
 * `readingCountryId`, which is the only way to see the URL reaching the map.
 */
let lastReadingCountryId: string | null | undefined;

vi.mock("@/components/atlas/AtlasGlobe", () => ({
  AtlasGlobe: ({
    targetFacts,
    readingCountryId,
  }: {
    targetFacts?: (target: { countryId: string; nameFr: string }) => {
      title: string;
      description?: string;
      body?: React.ReactNode;
    };
    readingCountryId?: string | null;
  }) => {
    lastReadingCountryId = readingCountryId;
    const facts = targetFacts?.({ countryId: "BEN", nameFr: "Bénin" });
    return (
      <div data-testid="atlas-globe">
        <span data-testid="facts-title">{facts?.title}</span>
        {facts?.body}
      </div>
    );
  },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// A hand-driven observer: the globe's mount is what the fold controls, and a
// real one never intersects in a headless DOM.
let triggerIntersection: (() => void) | null = null;

class StubIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    triggerIntersection = () =>
      callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver
      );
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}

const PEOPLES_IN_BENIN: FacetCountryIndex = {
  BEN: [
    { id: "PPL_FON", label: "Fon", href: getPeopleRoute("fr", "PPL_FON") },
    {
      id: "PPL_BARIBA",
      label: "Bariba",
      href: getPeopleRoute("fr", "PPL_BARIBA"),
    },
  ],
};

/** Composed the way a facet page composes it, so the fixture cannot outlive a move. */
const NARROW_TO_BENIN_HREF = `${getFacetRoute("fr", "peoples")}?pays=BEN`;

const NARROW_TO_BENIN: FacetCountryNarrowing = {
  BEN: NARROW_TO_BENIN_HREF,
};

/** The island as a facet mounts it, with one reading already published. */
function renderIsland({
  index = PEOPLES_IN_BENIN,
  narrowing,
  focused = null,
}: {
  index?: FacetCountryIndex;
  narrowing?: FacetCountryNarrowing;
  focused?: string | null;
} = {}) {
  return render(
    <FacetCountryIndexProvider>
      <PublishFacetCountryIndex
        index={index}
        narrowing={narrowing}
        focused={focused as never}
      />
      <FacetGlobeIsland
        peopleCountsByCountry={{ BEN: 12, GHA: 40 }}
        missingMessage="rien à dessiner"
      />
    </FacetCountryIndexProvider>
  );
}

/**
 * Mount the island *and* the globe inside it.
 *
 * Two things have to settle before the panel exists: the intersection that
 * lifts the visibility gate, and the `next/dynamic` import of the globe itself.
 * Asserting between them finds an empty stage, which reads as a missing panel
 * rather than as a globe that has not arrived yet.
 */
async function mountIslandGlobe(
  options: Parameters<typeof renderIsland>[0] = {}
) {
  renderIsland(options);
  await act(async () => {
    triggerIntersection?.();
  });
  return screen.findByTestId("atlas-globe");
}

beforeEach(() => {
  triggerIntersection = null;
  lastReadingCountryId = undefined;
  vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("map → list — the map is a second channel of selection", () => {
  /**
   * The one that makes the map more than a viewer. Without it a reader who
   * finds Benin on the globe has no way to make the list agree with it, and
   * has to go back to the filter bar and find Benin a second time.
   */
  // @req REQ-117
  it("offers the address of the reading narrowed to the chosen country", async () => {
    await mountIslandGlobe({ narrowing: NARROW_TO_BENIN });

    const narrow = screen.getByTestId("facet-panel-narrow");
    expect(narrow).toHaveAttribute("href", NARROW_TO_BENIN_HREF);
  });

  /**
   * An anchor, not a button. The narrowed reading is a place, so it has an
   * address a reader can send — the same rule that made the facet switch three
   * anchors and the letter rail twenty-seven.
   */
  // @req REQ-117
  it("narrows by navigating, so the narrowed reading has an address", async () => {
    await mountIslandGlobe({ narrowing: NARROW_TO_BENIN });

    expect(screen.getByTestId("facet-panel-narrow").tagName).toBe("A");
  });

  /**
   * Ghana opens with eighty-six peoples. A control that takes them all into
   * the list is no use printed under eighty-six names, so it precedes them.
   */
  // @req REQ-117
  it("offers the narrowing before the rows it answers for", async () => {
    await mountIslandGlobe({ narrowing: NARROW_TO_BENIN });

    const narrow = screen.getByTestId("facet-panel-narrow");
    const rows = screen.getByTestId("facet-panel-rows");
    expect(
      narrow.compareDocumentPosition(rows) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  /**
   * The link says "ce pays" because French wants an article before most
   * country names and the corpus stores no gender to pick one from. On screen
   * the panel's own title resolves it; heard out of context it would not, so
   * the name travels with the link.
   */
  // @req REQ-117
  it("carries the country name to a reader who hears the link alone", async () => {
    await mountIslandGlobe({ narrowing: NARROW_TO_BENIN });

    expect(screen.getByTestId("facet-panel-narrow")).toHaveTextContent("Bénin");
  });

  /**
   * The countries facet takes no country filter — a country there is something
   * to open, not something to narrow to. Publishing no narrowing has to be a
   * facet saying "not offered", never a facet forgetting.
   */
  // @req REQ-117
  it("offers no narrowing on a facet that published none", async () => {
    await mountIslandGlobe();

    expect(screen.getByTestId("facet-panel-rows")).toBeInTheDocument();
    expect(screen.queryByTestId("facet-panel-narrow")).toBeNull();
  });

  /**
   * A link to where the reader already is reads as a broken control. The panel
   * states the fact instead.
   */
  // @req REQ-117
  it("states the narrowing rather than offering it again, once applied", async () => {
    await mountIslandGlobe({ narrowing: NARROW_TO_BENIN, focused: "BEN" });

    expect(screen.queryByTestId("facet-panel-narrow")).toBeNull();
    expect(screen.getByTestId("facet-panel-narrowed")).toBeInTheDocument();
  });

  /**
   * Narrowing to a country the selection does not reach would hand the reader
   * an empty list from a control that looked like a way in.
   */
  // @req REQ-117
  it("says a country is undocumented rather than offering a way into nothing", async () => {
    await mountIslandGlobe({ index: {}, narrowing: NARROW_TO_BENIN });

    expect(screen.getByTestId("facet-panel-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("facet-panel-narrow")).toBeNull();
  });
});

describe("list → map — the map answers to the address", () => {
  /**
   * A hub filtered to `?pays=BEN` shows Benin in its list; a map still showing
   * the whole continent beside it is a second, contradictory answer to the same
   * question.
   */
  // @req REQ-116
  it("hands the globe the country the reading is narrowed to", async () => {
    await mountIslandGlobe({ narrowing: NARROW_TO_BENIN, focused: "BEN" });

    expect(lastReadingCountryId).toBe("BEN");
  });

  // @req REQ-116
  it("names no country to the globe when the reading names none", async () => {
    await mountIslandGlobe();

    expect(lastReadingCountryId).toBeNull();
  });
});

describe("the fold — on a phone the list is the page", () => {
  // @req REQ-116
  it("starts folded, and says what the control will do", () => {
    renderIsland();

    const control = screen.getByTestId("facet-globe-fold");
    expect(control).toHaveAttribute("aria-expanded", "false");
    expect(control).toHaveTextContent("Afficher la carte");
    expect(screen.getByTestId("facet-globe-island")).toHaveAttribute(
      "data-globe-folded",
      "true"
    );
  });

  // @req REQ-116
  it("unfolds the map, and offers to fold it back", () => {
    renderIsland();

    fireEvent.click(screen.getByTestId("facet-globe-fold"));

    const control = screen.getByTestId("facet-globe-fold");
    expect(control).toHaveAttribute("aria-expanded", "true");
    expect(control).toHaveTextContent("Masquer la carte");
    expect(screen.getByTestId("facet-globe-island")).toHaveAttribute(
      "data-globe-folded",
      "false"
    );
  });

  /** The control names the region it governs, so a screen reader can follow it. */
  // @req REQ-116
  it("points the control at the stage it folds", () => {
    renderIsland();

    expect(screen.getByTestId("facet-globe-fold")).toHaveAttribute(
      "aria-controls",
      screen.getByTestId("facet-globe-island").id
    );
  });

  /**
   * The fold is expressed in Tailwind variants, and Tailwind's scanner reads
   * source text without evaluating it: a class built by interpolation compiles
   * to no rule at all, so the map would simply never fold and nothing else
   * would go wrong. These are the two literals that must survive.
   */
  // @req REQ-116
  it("folds through width variants Tailwind can actually see", () => {
    renderIsland();

    expect(screen.getByTestId("facet-globe-fold").className).toContain(
      "min-[760px]:hidden"
    );
    expect(screen.getByTestId("facet-globe-island").className).toContain(
      "max-[759px]:data-[globe-folded=true]:hidden"
    );
  });
});

// The address is composed, not typed: the shell decides the facet by comparing
// the path to the slug table, so a literal here would keep passing after a move
// that broke the page.
vi.mock("next/navigation", async () => {
  const { getFacetRoute: route } = await import("@/lib/hubs/facets");
  return { usePathname: () => route("fr", "peoples") };
});

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-layout">{children}</div>
  ),
}));

describe("the accent — one hue per facet, and the map inside it", () => {
  /**
   * The accent is scoped by a class on a wrapper, so a globe mounted outside
   * that wrapper would take the default ocre on all three facets and nobody
   * would see a bug — just three maps that happen to look alike.
   */
  // @req REQ-116
  it("mounts the shared map inside the facet's accent scope", () => {
    render(
      <FacetHubShell peopleCountsByCountry={{ BEN: 12 }}>
        <p>la liste</p>
      </FacetHubShell>
    );

    const scope = screen.getByTestId("facet-hub");
    expect(scope).toHaveClass(
      DIRECTORY_ACCENT_CLASS[getFacet("peoples").entityType]
    );
    expect(scope).toContainElement(screen.getByTestId("facet-globe-island"));
  });

  /** The shell decides the facet from the address, so this is that address. */
  // @req REQ-116
  it("reads the facet from the route it was mounted on", () => {
    render(
      <FacetHubShell peopleCountsByCountry={undefined}>
        <p>la liste</p>
      </FacetHubShell>
    );

    expect(screen.getByTestId("facet-hub")).toHaveAttribute(
      "data-facet",
      "peoples"
    );
  });
});
