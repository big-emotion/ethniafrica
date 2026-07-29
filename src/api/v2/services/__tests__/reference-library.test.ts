import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { error: mocks.loggerError },
}));

import {
  createReference,
  getAuthenticatedReferenceUser,
  linkReferenceToAssertion,
  searchReferences,
  storeReferenceWorkingAsset,
} from "../reference-library";

type Result = { data: unknown; error: { message: string } | null };
type Query = Record<string, ReturnType<typeof vi.fn>>;

function queryResult(result: Result): Query {
  const query: Query = {} as Query;
  for (const method of ["select", "eq", "or", "order", "limit", "insert"]) {
    query[method] = vi.fn(() => query);
  }
  query.maybeSingle = vi.fn(() => Promise.resolve(result));
  query.single = vi.fn(() => Promise.resolve(result));
  query.then = vi.fn((resolve) => Promise.resolve(result).then(resolve));
  return query;
}

const reference = {
  source_key: "un-desd-population-2025",
  title: "World Population Prospects 2025",
  author: "United Nations DESA",
  year: 2025,
  source_kind: "intergovernmental",
  evidence_tier: 1,
  identifiers: { isbn: "978-92-1-358999-1" },
  publisher: "United Nations",
  url: null,
};

describe("reference library service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-093
  it("authenticates a contributor from their JWT with the admin client", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: "owner-123" } },
      error: null,
    });
    mocks.createAdminClient.mockReturnValue({ auth: { getUser } });

    await expect(getAuthenticatedReferenceUser("jwt")).resolves.toEqual({
      id: "owner-123",
    });
    expect(getUser).toHaveBeenCalledWith("jwt");
  });

  // @req REQ-093
  it("returns null when the JWT cannot be authenticated", async () => {
    const error = { message: "JWT expired" };
    mocks.createAdminClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error,
        }),
      },
    });

    await expect(getAuthenticatedReferenceUser("expired")).resolves.toBeNull();
    expect(mocks.loggerError).toHaveBeenCalledWith(
      "Failed to authenticate reference contributor",
      error
    );
  });

  // @req REQ-093
  it("searches source titles, authors, identifiers, and publishers with a limit", async () => {
    const query = queryResult({ data: [reference], error: null });
    const from = vi.fn(() => query);
    mocks.createAdminClient.mockReturnValue({ from });

    const result = await searchReferences("Population", 12);

    expect(from).toHaveBeenCalledWith("sources");
    expect(query.or).toHaveBeenCalledWith(
      expect.stringContaining("title.ilike.%Population%")
    );
    expect(query.or).toHaveBeenCalledWith(
      expect.stringContaining("author.ilike.%Population%")
    );
    expect(query.or).toHaveBeenCalledWith(
      expect.stringContaining("publisher.ilike.%Population%")
    );
    expect(query.or).toHaveBeenCalledWith(
      expect.stringContaining("identifiers")
    );
    expect(query.limit).toHaveBeenCalledWith(12);
    expect(result).toEqual([reference]);
  });

  // @req REQ-093
  it("creates an offline reference when no duplicate exists", async () => {
    const byKey = queryResult({ data: null, error: null });
    const byBibliography = queryResult({ data: null, error: null });
    const inserted = queryResult({
      data: { id: "source-123", ...reference },
      error: null,
    });
    const from = vi
      .fn()
      .mockReturnValueOnce(byKey)
      .mockReturnValueOnce(byBibliography)
      .mockReturnValueOnce(inserted);
    mocks.createAdminClient.mockReturnValue({ from });

    const result = await createReference({
      sourceKey: "un-desd-population-2025",
      title: "World Population Prospects 2025",
      authors: ["United Nations DESA"],
      publicationYear: 2025,
      sourceKind: "intergovernmental",
      evidenceTier: 1,
      identifiers: { isbn: "978-92-1-358999-1" },
      publisher: "United Nations",
      url: null,
    });

    expect(inserted.insert).toHaveBeenCalledWith(reference);
    expect(result).toEqual({
      source: { id: "source-123", ...reference },
      created: true,
    });
  });

  // @req REQ-093
  it("returns the source with the same source key instead of creating a duplicate", async () => {
    const existing = { id: "source-existing", ...reference };
    const byKey = queryResult({ data: existing, error: null });
    const from = vi.fn(() => byKey);
    mocks.createAdminClient.mockReturnValue({ from });

    await expect(
      createReference({
        sourceKey: reference.source_key,
        title: reference.title,
        authors: [reference.author],
        publicationYear: reference.year,
        sourceKind: "intergovernmental",
        evidenceTier: 1,
        identifiers: reference.identifiers,
        publisher: reference.publisher,
        url: null,
      })
    ).resolves.toEqual({ source: existing, created: false });
    expect(from).toHaveBeenCalledTimes(1);
  });

  // @req REQ-093
  it("links an existing source to an assertion with its exact locator", async () => {
    const query = queryResult({
      data: {
        id: "link-123",
        assertion_id: "assertion-123",
        source_id: "source-123",
        locator_type: "page",
        locator_value: "p. 48",
        review_status: "verified",
      },
      error: null,
    });
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => query) });

    await expect(
      linkReferenceToAssertion("assertion-123", "source-123", {
        locatorType: "page",
        locatorValue: "p. 48",
      })
    ).resolves.toMatchObject({ locator_value: "p. 48" });
    expect(query.insert).toHaveBeenCalledWith({
      assertion_id: "assertion-123",
      source_id: "source-123",
      locator_type: "page",
      locator_value: "p. 48",
      review_status: "verified",
    });
  });

  // @req REQ-093
  it("stores an uploaded working copy privately and never returns its object path", async () => {
    const upload = vi.fn().mockResolvedValue({ data: {}, error: null });
    const storageFrom = vi.fn(() => ({ upload }));
    const query = queryResult({
      data: {
        id: "asset-123",
        source_id: "source-123",
        owner_id: "owner-123",
        asset_kind: "scan",
        object_path: "owner-123/uuid-report.pdf",
        filename: "report.pdf",
        content_type: "application/pdf",
        byte_size: 42,
        rights_status: "private",
        created_at: "2026-07-29T12:00:00.000Z",
      },
      error: null,
    });
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => query),
      storage: { from: storageFrom },
    });
    vi.spyOn(crypto, "randomUUID").mockReturnValue("uuid");

    const result = await storeReferenceWorkingAsset("owner-123", {
      sourceId: "source-123",
      assetKind: "scan",
      filename: "report.pdf",
      contentType: "application/pdf",
      byteSize: 42,
      content: new Uint8Array([1, 2, 3]),
    });

    expect(storageFrom).toHaveBeenCalledWith("source-working-assets");
    expect(upload).toHaveBeenCalledWith(
      "owner-123/uuid-report.pdf",
      expect.any(Uint8Array),
      { contentType: "application/pdf", upsert: false }
    );
    expect(result).toEqual({
      id: "asset-123",
      sourceId: "source-123",
      assetKind: "scan",
      filename: "report.pdf",
      contentType: "application/pdf",
      byteSize: 42,
      rightsStatus: "private",
      createdAt: "2026-07-29T12:00:00.000Z",
    });
    expect(result).not.toHaveProperty("objectPath");
  });
});
