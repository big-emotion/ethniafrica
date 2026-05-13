import { describe, it, expect } from "vitest";
import {
  createApiResponse,
  createApiError,
  API_LICENSE,
  API_ATTRIBUTION,
} from "../response";

describe("createApiResponse", () => {
  it("returns the canonical Module #0 envelope shape", () => {
    const envelope = createApiResponse({ id: "PPL_SHONA" });

    expect(envelope).toEqual({
      data: { id: "PPL_SHONA" },
      meta: {
        license: API_LICENSE,
        attribution: API_ATTRIBUTION,
      },
      errors: [],
    });
  });

  it("embeds pagination meta when provided", () => {
    const envelope = createApiResponse([1, 2, 3], {
      pagination: { total: 3, page: 1, perPage: 20, totalPages: 1 },
    });

    expect(envelope.meta.pagination).toEqual({
      total: 3,
      page: 1,
      perPage: 20,
      totalPages: 1,
    });
    expect(envelope.errors).toEqual([]);
  });

  it("propagates confidence and pinnedUrl onto meta", () => {
    const envelope = createApiResponse(
      { id: "PPL_SHONA" },
      { confidence: 73, pinnedUrl: "https://example.org/peuples/shona@v4" }
    );

    expect(envelope.meta.confidence).toBe(73);
    expect(envelope.meta.pinned_url).toBe(
      "https://example.org/peuples/shona@v4"
    );
  });
});

describe("createApiError", () => {
  it("wraps a single error into the envelope errors array", () => {
    const envelope = createApiError({
      code: "NOT_FOUND",
      message: "Resource not found",
    });

    expect(envelope.data).toBeNull();
    expect(envelope.errors).toEqual([
      { code: "NOT_FOUND", message: "Resource not found" },
    ]);
    expect(envelope.meta.license).toBe(API_LICENSE);
    expect(envelope.meta.attribution).toBe(API_ATTRIBUTION);
  });

  it("supports multiple errors", () => {
    const envelope = createApiError([
      { code: "VALIDATION", message: "Invalid", field: "id" },
      { code: "VALIDATION", message: "Invalid", field: "type" },
    ]);

    expect(envelope.errors).toHaveLength(2);
  });
});
