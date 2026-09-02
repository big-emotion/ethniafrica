import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetCountryById, mockGetCountryAtlasIndex, mockFicheCanonical } =
  vi.hoisted(() => ({
    mockGetCountryById: vi.fn(),
    mockGetCountryAtlasIndex: vi.fn(),
    mockFicheCanonical: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/api/v2/services/countryService", () => ({
  getCountryById: (...args: unknown[]) => mockGetCountryById(...args),
  getCountryAtlasIndex: () => mockGetCountryAtlasIndex(),
}));

vi.mock("@/lib/seo/ficheCanonical", () => ({
  ficheCanonical: (...args: unknown[]) => mockFicheCanonical(...args),
}));

/**
 * The status code of an unknown fiche.
 *
 * `loading.tsx` makes each fiche segment a Suspense boundary, which is what
 * took the country fiche's TTFB from 537ms to 29ms. The cost is that App Router
 * flushes the shell — and a `200` — before the page body runs, so the body's
 * own `notFound()` could no longer change the status: an unknown country
 * answered `200` with an error page, and search engines indexed it as real.
 * Measured against production the day of the OVH cutover: the VPS answered 200
 * on `/fr/atlas/pays/ZZZ` where Vercel answered 404.
 *
 * The check therefore lives in `generateMetadata`, which runs before the flush.
 * These tests pin that, because moving it back into the body would restore the
 * soft 404 silently — the page still renders, it just lies about its status.
 */
describe("country fiche not-found status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFicheCanonical.mockReturnValue({ title: "x" });
  });

  // @req REQ-019
  it("raises notFound from generateMetadata when the country does not exist", async () => {
    mockGetCountryById.mockResolvedValue(null);
    const { generateMetadata } = await import("../[slug]/page");

    await expect(
      generateMetadata({
        params: Promise.resolve({ lang: "fr", slug: "ZZZ-unknown" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  // @req REQ-019
  it("returns canonical metadata when the country exists", async () => {
    mockGetCountryById.mockResolvedValue({
      id: "SEN-known",
      nameFr: "Sénégal",
    });
    const { generateMetadata } = await import("../[slug]/page");

    await expect(
      generateMetadata({
        params: Promise.resolve({ lang: "fr", slug: "SEN-known" }),
      })
    ).resolves.toEqual({ title: "x" });
  });

  // A corpus read that fails is not an answer, and answering it as "absent"
  // costs more than a wrong status here. `generateMetadata` settles after the
  // Suspense shell — and its `200` — has been flushed, so Next cannot turn the
  // rejection into a 404; it drops the metadata instead and the document loses
  // every title it had, the root layout's included. That is the serious
  // `document-title` violation the axe gate reported on this route.
  // @req REQ-019
  it("still resolves metadata when the corpus read fails", async () => {
    mockGetCountryById.mockRejectedValue(
      Object.assign(new Error("This operation was aborted"), {
        name: "AbortError",
      })
    );
    const { generateMetadata } = await import("../[slug]/page");

    await expect(
      generateMetadata({
        params: Promise.resolve({ lang: "fr", slug: "SEN" }),
      })
    ).resolves.toEqual({ title: "x" });
  });

  // A pinned URL reads a revision snapshot rather than the live entity, so the
  // live lookup must not decide its fate — pinning a version of a fiche that
  // was later withdrawn is a supported archive URL, not a 404.
  // @req REQ-019
  it("does not raise notFound for a pinned slug even when the live entity is gone", async () => {
    mockGetCountryById.mockResolvedValue(null);
    const { generateMetadata } = await import("../[slug]/page");

    await expect(
      generateMetadata({
        params: Promise.resolve({ lang: "fr", slug: "GONE-pinned@v2" }),
      })
    ).resolves.toEqual({ title: "x" });
  });
});
