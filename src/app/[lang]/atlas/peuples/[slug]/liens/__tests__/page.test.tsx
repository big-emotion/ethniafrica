import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  useRouter: () => ({ push: mockPush }),
}));

const mockGetPeopleById = vi.fn();
const mockGetEgoNetwork = vi.fn();
const mockGetLanguageFamilyById = vi.fn();

vi.mock("@/api/v2/services/peopleService", () => ({
  getPeopleById: (...args: unknown[]) => mockGetPeopleById(...args),
}));

vi.mock("@/api/v2/services/relations", () => ({
  getEgoNetwork: (...args: unknown[]) => mockGetEgoNetwork(...args),
}));

vi.mock("@/api/v2/services/languageFamilyService", () => ({
  getLanguageFamilyById: (...args: unknown[]) =>
    mockGetLanguageFamilyById(...args),
}));

// The shell is stubbed but its props are recorded: the trail moved into
// `PageLayout`, so what this page is now answerable for is the label it hands
// the shell, not the crumbs it once assembled itself.
const pageLayoutProps = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => {
    pageLayoutProps.current = props;
    return <div data-testid="page-layout">{children}</div>;
  },
}));

// ---------------------------------------------------------------------------
// Import page AFTER mocks
// ---------------------------------------------------------------------------
import { notFound } from "next/navigation";
import PeopleLinksPage, { generateMetadata } from "../page";
import { RELATIONS } from "@/components/fiche/__tests__/ficheContextFixtures";
import { getPeopleLinksRoute, getPeopleRoute } from "@/lib/routing";

async function renderPage(slug: string, lang = "fr") {
  const ui = await PeopleLinksPage({
    params: Promise.resolve({ lang, slug }),
  });
  return render(ui as React.ReactElement);
}

async function callPage(slug: string, lang = "fr") {
  return PeopleLinksPage({ params: Promise.resolve({ lang, slug }) });
}

const YORUBA_ROW = {
  id: "PPL_YORUBA",
  nameMain: "Yoruba",
  languageFamilyId: "FLG_NIGER_CONGO",
  currentCountries: ["NGA", "BEN"],
  content: {},
};

describe("/[lang]/peuples/[slug]/liens page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPeopleById.mockResolvedValue(YORUBA_ROW);
    mockGetEgoNetwork.mockResolvedValue({ sourced: [], derived: [] });
    mockGetLanguageFamilyById.mockResolvedValue({
      id: "FLG_NIGER_CONGO",
      nameFr: "Niger-Congo",
      content: {},
    });
  });

  // @req REQ-097 FR72
  it("404s when the people does not exist", async () => {
    mockGetPeopleById.mockResolvedValue(null);
    await expect(callPage("PPL_UNKNOWN")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  /**
   * The page used to assemble its own crumbs. The trail is the shell's now, so
   * the one thing this route still knows that the shell cannot is how to name
   * `PPL_YORUBA` — and that is what it must hand over. The crumbs themselves
   * are asserted where they are derived, in `breadcrumbCharter`.
   */
  // @req REQ-097 FR72
  it("hands the shell the people's name, the one crumb it alone can name", async () => {
    await renderPage("PPL_YORUBA");

    expect(pageLayoutProps.current.trailLabel).toBe("Yoruba");
  });

  /**
   * The family was fetched for a crumb that no longer exists. Asserting the
   * query is gone is the only way this stays true: an unused `await` in a
   * server component costs a round trip per request and nothing renders
   * differently when it comes back.
   */
  // @req REQ-097 FR72
  it("no longer queries the family, the trail having stopped naming it", async () => {
    await renderPage("PPL_YORUBA");

    expect(mockGetLanguageFamilyById).not.toHaveBeenCalled();
    expect(pageLayoutProps.current.trailLabel).not.toBe("Niger-Congo");
  });

  // @req REQ-097 FR72
  it("server-renders RelationsList from the ego-network fixture payload", async () => {
    mockGetEgoNetwork.mockResolvedValue({ sourced: RELATIONS, derived: [] });

    await renderPage("PPL_YORUBA");

    expect(screen.getByText("Fon")).toBeInTheDocument();
    expect(mockGetEgoNetwork).toHaveBeenCalledWith("PPL_YORUBA");
  });

  // @req REQ-097 FR72
  it("renders a calm empty state when the corpus has no relations", async () => {
    await renderPage("PPL_YORUBA");
    expect(screen.getByText(/aucune relation documentée/i)).toBeInTheDocument();
  });

  // @req REQ-097 FR72
  it("builds French metadata for the people's links page", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ lang: "fr", slug: "PPL_YORUBA" }),
    });
    expect(metadata.title).toContain("Yoruba");
    expect(typeof metadata.description).toBe("string");
  });

  // @req REQ-097 FR72
  it("metadata 404s gracefully when the people does not exist", async () => {
    mockGetPeopleById.mockResolvedValue(null);
    const metadata = await generateMetadata({
      params: Promise.resolve({ lang: "fr", slug: "PPL_UNKNOWN" }),
    });
    expect(metadata.title).toBeTruthy();
  });

  // Epic 11, Story 11.11 (FR75, NFR1, UX-DR46, AR20): the graph is lazy
  // (next/dynamic ssr:false) and must never delay or reorder the SSR list.
  describe("ego-network graph integration (11.11)", () => {
    beforeEach(() => {
      mockGetEgoNetwork.mockResolvedValue({ sourced: RELATIONS, derived: [] });
    });

    // @req REQ-097 FR75 UX-DR46
    it("renders the complete relations list before the lazily-mounted graph, inside a reserved aspect-ratio container", async () => {
      await renderPage("PPL_YORUBA");

      const list = screen.getByText("Fon").closest("ul") as HTMLElement;
      const graphContainer = screen.getByTestId("ego-network-graph-container");

      expect(list).toBeInTheDocument();
      expect(graphContainer).toBeInTheDocument();
      // SSR-order: the list node comes before the graph's reserved container
      // in document order, regardless of whether the lazy graph has mounted.
      expect(
        list.compareDocumentPosition(graphContainer) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      // Reserved aspect-ratio prevents CLS once the lazy chunk mounts.
      expect(graphContainer).toHaveClass("aspect-square");

      expect(
        await screen.findByRole("application", {
          name: /Graphe de relations centré sur Yoruba/,
        })
      ).toBeInTheDocument();
    });

    // @req REQ-097 FR75 UX-DR48
    it("opens SourceChainSheet on edge activation and returns focus to the edge on close", async () => {
      await renderPage("PPL_YORUBA");
      const application = await screen.findByRole("application");

      fireEvent.keyDown(application, { key: "ArrowRight" });
      expect(screen.getByTestId("edge-0")).toHaveFocus();

      fireEvent.keyDown(application, { key: "Enter" });

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveTextContent(
        "Migration conjointe vers le golfe du Bénin."
      );

      fireEvent.click(screen.getByRole("button", { name: "Close" }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
      // Radix restores focus via a deferred (setTimeout 0) callback.
      await waitFor(() => {
        expect(screen.getByTestId("edge-0")).toHaveFocus();
      });
    });

    // @req REQ-097 FR75
    it("navigates to the neighbor's own links page on node activation", async () => {
      await renderPage("PPL_YORUBA");
      const application = await screen.findByRole("application");

      fireEvent.keyDown(application, { key: "ArrowRight" });
      fireEvent.keyDown(application, { key: "ArrowRight" });
      expect(screen.getByTestId("node-0")).toHaveFocus();

      fireEvent.keyDown(application, { key: "Enter" });

      expect(mockPush).toHaveBeenCalledWith(
        getPeopleLinksRoute("fr", "PPL_FON")
      );
    });
  });
});
