import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/reference-library", () => ({
  handleReferenceSearch: vi.fn(),
  handleReferenceCreate: vi.fn(),
  handleAssertionReferenceCreate: vi.fn(),
  handleReferenceWorkingAssetCreate: vi.fn(),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { error: vi.fn() },
}));

import {
  handleAssertionReferenceCreate,
  handleReferenceCreate,
  handleReferenceSearch,
  handleReferenceWorkingAssetCreate,
} from "@/api/v2/handlers/reference-library";
import { logger } from "@/lib/api/logger";
import { GET, OPTIONS, POST } from "@/app/api/v2/reference-library/route";
import {
  OPTIONS as assertionOptions,
  POST as assertionPost,
} from "@/app/api/v2/reference-library/assertions/route";
import {
  OPTIONS as assetOptions,
  POST as assetPost,
} from "@/app/api/v2/reference-library/assets/route";

const sourceId = "22222222-2222-2222-2222-222222222222";
const assertionId = "33333333-3333-3333-3333-333333333333";

const envelope = (data: unknown) => ({
  data,
  meta: {
    license: "CC-BY-SA-4.0",
    attribution: "Africa History — africahistory.org",
  },
  errors: [],
});

function authenticatedHeaders() {
  return { authorization: "bEaReR access-token" };
}

describe("reference library API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-093
  it("authenticates searches, preserves raw query values, and disables caching", async () => {
    vi.mocked(handleReferenceSearch).mockResolvedValue({
      status: 200,
      body: envelope([]),
    } as never);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/v2/reference-library?q=population&limit=007",
        { headers: authenticatedHeaders() }
      )
    );

    expect(handleReferenceSearch).toHaveBeenCalledWith(
      { q: "population", limit: "007" },
      { accessToken: "access-token" }
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("access-control-allow-origin")).toBeTruthy();
  });

  // @req REQ-093
  it("passes a missing JWT to the search handler", async () => {
    vi.mocked(handleReferenceSearch).mockResolvedValue({
      status: 401,
      body: envelope(null),
    } as never);

    const response = await GET(
      new NextRequest("http://localhost/api/v2/reference-library?q=population")
    );

    expect(handleReferenceSearch).toHaveBeenCalledWith(
      { q: "population", limit: undefined },
      { accessToken: null }
    );
    expect(response.status).toBe(401);
  });

  // @req REQ-093
  it("returns a validation response for invalid JSON without calling the create handler", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/v2/reference-library", {
        method: "POST",
        body: "{",
        headers: { "content-type": "application/json" },
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      data: null,
      errors: [{ code: "VALIDATION_ERROR" }],
    });
    expect(handleReferenceCreate).not.toHaveBeenCalled();
  });

  // @req REQ-093
  it("creates a reference with the bearer JWT and handler status", async () => {
    const input = { source_key: "un-wpp-2025", title: "World Population" };
    vi.mocked(handleReferenceCreate).mockResolvedValue({
      status: 201,
      body: envelope({ created: true }),
    } as never);

    const response = await POST(
      new NextRequest("http://localhost/api/v2/reference-library", {
        method: "POST",
        body: JSON.stringify(input),
        headers: {
          ...authenticatedHeaders(),
          "content-type": "application/json",
        },
      })
    );

    expect(handleReferenceCreate).toHaveBeenCalledWith(input, {
      accessToken: "access-token",
    });
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  // @req REQ-093
  it("links an assertion reference through its dedicated endpoint", async () => {
    const input = {
      assertion_id: assertionId,
      source_id: sourceId,
      locator_type: "page",
      locator_value: "p. 48",
    };
    vi.mocked(handleAssertionReferenceCreate).mockResolvedValue({
      status: 201,
      body: envelope({ id: "44444444-4444-4444-4444-444444444444" }),
    } as never);

    const response = await assertionPost(
      new NextRequest("http://localhost/api/v2/reference-library/assertions", {
        method: "POST",
        body: JSON.stringify(input),
        headers: {
          ...authenticatedHeaders(),
          "content-type": "application/json",
        },
      })
    );

    expect(handleAssertionReferenceCreate).toHaveBeenCalledWith(input, {
      accessToken: "access-token",
    });
    expect(response.status).toBe(201);
  });

  // @req REQ-093
  it("delegates an absent asset file to handler validation", async () => {
    const formData = new FormData();
    formData.set("sourceId", sourceId);
    formData.set("assetKind", "scan");
    vi.mocked(handleReferenceWorkingAssetCreate).mockResolvedValue({
      status: 400,
      body: envelope(null),
    } as never);

    const response = await assetPost(
      new NextRequest("http://localhost/api/v2/reference-library/assets", {
        method: "POST",
        body: formData,
        headers: authenticatedHeaders(),
      })
    );

    expect(handleReferenceWorkingAssetCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        source_id: sourceId,
        asset_kind: "scan",
        content: null,
      }),
      { accessToken: "access-token" }
    );
    expect(response.status).toBe(400);
  });

  // @req REQ-093
  it("accepts a multipart asset but never exposes binary data or object paths", async () => {
    const formData = new FormData();
    formData.set("sourceId", sourceId);
    formData.set("assetKind", "scan");
    formData.set(
      "file",
      new File(["private source scan"], "report.pdf", {
        type: "application/pdf",
      })
    );
    vi.mocked(handleReferenceWorkingAssetCreate).mockResolvedValue({
      status: 201,
      body: envelope({
        id: "55555555-5555-5555-5555-555555555555",
        filename: "report.pdf",
        object_path: "owner/private/report.pdf",
        content: "private source scan",
      }),
    } as never);

    const response = await assetPost(
      new NextRequest("http://localhost/api/v2/reference-library/assets", {
        method: "POST",
        body: formData,
        headers: authenticatedHeaders(),
      })
    );

    expect(handleReferenceWorkingAssetCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        source_id: sourceId,
        asset_kind: "scan",
        filename: "report.pdf",
        content_type: "application/pdf",
      }),
      { accessToken: "access-token" }
    );
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const responseJson = JSON.stringify(await response.json());
    expect(responseJson).not.toContain("object_path");
    expect(responseJson).not.toContain("private source scan");
  });

  // @req REQ-093
  it("logs unexpected errors and returns a CORS-safe internal error", async () => {
    const error = new Error("boom");
    vi.mocked(handleAssertionReferenceCreate).mockRejectedValue(error);

    const response = await assertionPost(
      new NextRequest("http://localhost/api/v2/reference-library/assertions", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      })
    );

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("access-control-allow-origin")).toBeTruthy();
    expect(logger.error).toHaveBeenCalledWith(
      "Error in POST /api/v2/reference-library/assertions",
      error
    );
  });

  // @req REQ-093
  it.each([
    ["references", OPTIONS],
    ["assertions", assertionOptions],
    ["assets", assetOptions],
  ])("returns a 204 CORS preflight for %s", (_name, options) => {
    const response = options();

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "GET,POST,PATCH,OPTIONS"
    );
  });
});
