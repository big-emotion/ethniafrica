import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// next/navigation — notFound() throws so we can detect the calm-404 path
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

// next-mdx-remote/rsc — render the source verbatim so we can assert on it
vi.mock("next-mdx-remote/rsc", () => ({
  MDXRemote: ({ source }: { source: string }) => (
    <div data-testid="mdx-remote">{source}</div>
  ),
}));

vi.mock("remark-gfm", () => ({ default: () => undefined }));

// PageLayout — pass children through, expose title so we can assert
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title?: string;
  }) => (
    <div data-testid="page-layout" data-title={title}>
      {children}
    </div>
  ),
}));

// Doctrine fetcher — controlled per-test
const mockFetch = vi.fn();
vi.mock("@/lib/doctrine/fetchDoctrineEntry", () => ({
  fetchDoctrineEntry: (...args: unknown[]) => mockFetch(...args),
}));

// ---------------------------------------------------------------------------
// Import the page AFTER mocks are in place
// ---------------------------------------------------------------------------
import DoctrineSlugPage from "../page";
import { notFound } from "next/navigation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function renderPage(slug: string, lang = "fr") {
  // Page is an async server component — await it
  const ui = await DoctrineSlugPage({
    params: Promise.resolve({ lang, slug }),
  });
  return render(ui as React.ReactElement);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("/[lang]/doctrine/[slug] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the MDX source returned by Supabase for a known slug", async () => {
    mockFetch.mockResolvedValueOnce({
      id: "uuid-1",
      slug: "classifications-contestees",
      title: "Classifications contestées",
      mdxSource: "# Classifications contestées\n\nDébat actif.",
      version: 1,
      publishedAt: "2026-05-14T00:00:00Z",
    });

    const { getByTestId } = await renderPage("classifications-contestees");

    expect(mockFetch).toHaveBeenCalledWith("classifications-contestees");
    expect(getByTestId("mdx-remote").textContent).toContain(
      "Classifications contestées"
    );
  });

  // @req REQ-025
  it("renders the exact pinned doctrine version and its French label", async () => {
    mockFetch.mockResolvedValueOnce({
      id: "uuid-42",
      slug: "classifications-contestees",
      title: "Classifications contestées",
      mdxSource: "# Version archivée 42",
      version: 42,
      publishedAt: "2025-02-03T00:00:00Z",
    });

    const { getByTestId } = await renderPage("classifications-contestees@v42");

    expect(mockFetch).toHaveBeenCalledWith("classifications-contestees", 42);
    expect(getByTestId("mdx-remote").textContent).toBe("# Version archivée 42");
    expect(getByTestId("version-label").textContent).toMatch(
      /v42\s*·\s*publiée le\s+3\s+février\s+2025/
    );
  });

  it("renders the version label in the French format", async () => {
    mockFetch.mockResolvedValueOnce({
      id: "uuid-2",
      slug: "heritage-colonial",
      title: "Héritage colonial",
      mdxSource: "# Héritage colonial",
      version: 1,
      publishedAt: "2026-05-14T12:00:00Z",
    });

    const { container } = await renderPage("heritage-colonial");

    // Format: "v1 · publiée le 14 mai 2026" (or equivalent fr-FR rendering)
    const text = container.textContent ?? "";
    expect(text).toMatch(/v1\s*·\s*publiée le\s+\d{1,2}\s+\S+\s+\d{4}/);
  });

  it("includes a changelog link to the git commit (MVP, static)", async () => {
    mockFetch.mockResolvedValueOnce({
      id: "uuid-3",
      slug: "endonymes-vs-exonymes",
      title: "Endonymes vs exonymes",
      mdxSource: "# Endonymes",
      version: 1,
      publishedAt: "2026-05-14T00:00:00Z",
    });

    const { container } = await renderPage("endonymes-vs-exonymes");

    const link = container.querySelector('a[data-testid="changelog-link"]');
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toMatch(/github\.com/);
  });

  it("calls notFound() for an unknown slug (calm 404)", async () => {
    mockFetch.mockResolvedValueOnce(null);

    await expect(renderPage("does-not-exist")).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(notFound).toHaveBeenCalled();
  });

  // @req REQ-025
  it("calls notFound() for an unknown pinned slug and version combination", async () => {
    mockFetch.mockResolvedValueOnce(null);

    await expect(renderPage("classifications-contestees@v999")).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(mockFetch).toHaveBeenCalledWith("classifications-contestees", 999);
    expect(notFound).toHaveBeenCalled();
  });

  // @req REQ-025
  it.each([
    "classifications-contestees@v0",
    "classifications-contestees@vabc",
    "classifications-contestees@latest",
  ])("calls notFound() without querying for invalid slug %s", async (slug) => {
    await expect(renderPage(slug)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockFetch).not.toHaveBeenCalled();
    expect(notFound).toHaveBeenCalled();
  });
});
