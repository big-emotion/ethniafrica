import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { ComparisonView } from "../ComparisonView";
import { CompareShareBar } from "../CompareShareBar";
import type { ComparisonPageData } from "@/types/compare";

// ---------------------------------------------------------------------------
// ComparisonView (component-level)
// ---------------------------------------------------------------------------

describe("ComparisonView", () => {
  const twoEntityData: ComparisonPageData = {
    type: "peuple",
    columns: [
      { id: "PPL_YORUBA", label: "Yoruba", type: "peuple" },
      { id: "PPL_ZULU", label: "Zulu", type: "peuple" },
    ],
    rows: [
      {
        key: "origins",
        values: {
          PPL_YORUBA: "Golfe du Bénin",
          PPL_ZULU: null,
        },
      },
    ],
  };

  // @req REQ-097
  it("renders the French comparison heading from entity labels", () => {
    const { getByRole } = render(<ComparisonView data={twoEntityData} />);
    expect(getByRole("heading", { level: 1 }).textContent).toBe(
      "Comparaison : Yoruba · Zulu"
    );
  });

  // @req REQ-098
  it("renders a documented value verbatim", () => {
    const { getByTestId } = render(<ComparisonView data={twoEntityData} />);
    expect(getByTestId("comparison-row-origins").textContent).toContain(
      "Golfe du Bénin"
    );
  });

  // @req REQ-098
  it("renders non renseigné for a missing cell instead of dropping it", () => {
    const { getByTestId } = render(<ComparisonView data={twoEntityData} />);
    expect(getByTestId("comparison-row-origins").textContent).toContain(
      "non renseigné"
    );
  });
});

// ---------------------------------------------------------------------------
// /[lang]/comparer/[entityType]/[...ids] page — not-found branches (9.4)
// ---------------------------------------------------------------------------

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const mockAssembleComparison = vi.fn();
vi.mock("@/api/v2/handlers/compare", () => ({
  assembleComparison: (...args: unknown[]) => mockAssembleComparison(...args),
}));

import ComparisonPage, {
  generateMetadata,
} from "@/app/[lang]/comparer/[entityType]/[...ids]/page";
import { notFound } from "next/navigation";

function callPage(entityType: string, ids: string[], lang = "fr") {
  return ComparisonPage({
    params: Promise.resolve({ lang, entityType, ids }),
  });
}

const validAssembleResult = {
  ok: true as const,
  entityType: "peoples" as const,
  entities: [
    {
      type: "peuple" as const,
      id: "PPL_YORUBA",
      label: "Yoruba",
      origins: "Golfe du Bénin",
    },
    {
      type: "peuple" as const,
      id: "PPL_ZULU",
      label: "Zulu",
      origins: null,
    },
  ],
};

describe("/[lang]/comparer/[entityType]/[...ids] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-091
  it("calls notFound() for an unknown entityType segment, without querying", async () => {
    await expect(
      callPage("langues", ["PPL_YORUBA", "PPL_ZULU"])
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockAssembleComparison).not.toHaveBeenCalled();
    expect(notFound).toHaveBeenCalled();
  });

  // @req REQ-091
  it("calls notFound() for fewer than 2 ids, without querying", async () => {
    await expect(callPage("peuples", ["PPL_YORUBA"])).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(mockAssembleComparison).not.toHaveBeenCalled();
  });

  // @req REQ-091
  it("calls notFound() for more than 3 ids, without querying", async () => {
    await expect(
      callPage("peuples", ["PPL_A", "PPL_B", "PPL_C", "PPL_D"])
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockAssembleComparison).not.toHaveBeenCalled();
  });

  // @req REQ-091
  it("calls notFound() for duplicate ids, without querying", async () => {
    await expect(
      callPage("peuples", ["PPL_YORUBA", "PPL_YORUBA"])
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockAssembleComparison).not.toHaveBeenCalled();
  });

  // @req REQ-091
  it("calls notFound() when an id does not resolve to a published entity", async () => {
    mockAssembleComparison.mockResolvedValueOnce({
      ok: false,
      code: "NOT_FOUND",
      message: "Entity not found: PPL_UNKNOWN",
    });

    await expect(
      callPage("peuples", ["PPL_YORUBA", "PPL_UNKNOWN"])
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  // @req REQ-097
  it("maps the French entityType segment to the API type and renders the comparison for valid params", async () => {
    mockAssembleComparison.mockResolvedValueOnce(validAssembleResult);

    const ui = await callPage("peuples", ["PPL_YORUBA", "PPL_ZULU"]);
    const { getByRole } = render(ui as React.ReactElement);

    expect(mockAssembleComparison).toHaveBeenCalledWith({
      entityType: "peoples",
      ids: ["PPL_YORUBA", "PPL_ZULU"],
    });
    expect(getByRole("heading", { level: 1 }).textContent).toBe(
      "Comparaison : Yoruba · Zulu"
    );
  });
});

describe("generateMetadata for /[lang]/comparer/[entityType]/[...ids]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-091
  it("carries a French title, noindex/follow robots and a self-canonical for a valid comparison", async () => {
    mockAssembleComparison.mockResolvedValueOnce(validAssembleResult);

    const metadata = await generateMetadata({
      params: Promise.resolve({
        lang: "fr",
        entityType: "peuples",
        ids: ["PPL_YORUBA", "PPL_ZULU"],
      }),
    });

    expect(metadata.title).toBe("Comparaison : Yoruba · Zulu");
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe(
      "/fr/comparer/peuples/PPL_YORUBA/PPL_ZULU"
    );
    expect(metadata.openGraph?.title).toBe("Comparaison : Yoruba · Zulu");
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  // @req REQ-091
  it("calls notFound() for an invalid comparison URL", async () => {
    await expect(
      generateMetadata({
        params: Promise.resolve({
          lang: "fr",
          entityType: "langues",
          ids: ["PPL_YORUBA", "PPL_ZULU"],
        }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

// ---------------------------------------------------------------------------
// CompareShareBar
// ---------------------------------------------------------------------------

const CANONICAL_URL =
  "https://ethniafrica.example/fr/comparer/peoples/PPL_YORUBA/PPL_ASHANTI";
const FRENCH_TITLE = "Comparaison : Yoruba · Ashanti";

describe("CompareShareBar", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // @req REQ-100
  it("calls navigator.share once with the canonical URL and French title when 'partager' is activated", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      share,
      clipboard: navigator.clipboard,
    });

    render(
      <CompareShareBar canonicalUrl={CANONICAL_URL} title={FRENCH_TITLE} />
    );

    await user.click(screen.getByRole("button", { name: /partager/i }));

    expect(share).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({
      url: CANONICAL_URL,
      title: FRENCH_TITLE,
    });
  });

  // @req REQ-100
  it("does not render a native share button when navigator.share is undefined", () => {
    vi.stubGlobal("navigator", { ...navigator, share: undefined });

    render(
      <CompareShareBar canonicalUrl={CANONICAL_URL} title={FRENCH_TITLE} />
    );

    expect(
      screen.queryByRole("button", { name: /partager/i })
    ).not.toBeInTheDocument();
  });

  // @req REQ-100
  it("writes the canonical URL to the clipboard and announces 'copié' via aria-live=polite when 'copier le lien' is activated", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      share: undefined,
      clipboard: { writeText },
    });

    render(
      <CompareShareBar canonicalUrl={CANONICAL_URL} title={FRENCH_TITLE} />
    );

    await user.click(screen.getByRole("button", { name: /copier le lien/i }));

    expect(writeText).toHaveBeenCalledWith(CANONICAL_URL);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    await waitFor(() => expect(status).toHaveTextContent("copié"));
  });

  // @req REQ-100
  it("shows a selectable read-only URL field with 'sélectionner manuellement' when clipboard write rejects", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", {
      ...navigator,
      share: undefined,
      clipboard: { writeText },
    });

    render(
      <CompareShareBar canonicalUrl={CANONICAL_URL} title={FRENCH_TITLE} />
    );

    await user.click(screen.getByRole("button", { name: /copier le lien/i }));

    const field = await screen.findByRole("textbox", {
      name: /sélectionner manuellement/i,
    });
    expect(field).toHaveAttribute("readonly");
    expect(field).toHaveValue(CANONICAL_URL);
  });

  // @req REQ-100
  it("renders text-labelled buttons (no icon-only)", () => {
    vi.stubGlobal("navigator", { ...navigator, share: vi.fn() });

    render(
      <CompareShareBar canonicalUrl={CANONICAL_URL} title={FRENCH_TITLE} />
    );

    for (const button of screen.getAllByRole("button")) {
      expect(button.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });
});
