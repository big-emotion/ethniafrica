import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/sources", () => ({
  listSourcesHandler: vi.fn(),
  getSourceHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), init);
    response.headers.set("Access-Control-Allow-Origin", "*");
    if (init?.headers) {
      const headers = init.headers as Record<string, string>;
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
      }
    }
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import {
  listSourcesHandler,
  getSourceHandler,
} from "@/api/v2/handlers/sources";
import type { ApiEnvelope } from "@/api/v2/utils/response";
import type { Source } from "@/api/v2/schemas/sources";
import { GET as listGet, OPTIONS as listOptions } from "../sources/route";
import { GET as itemGet } from "../sources/[id]/route";

function baseEnvelope<T>(data: T): ApiEnvelope<T> {
  return {
    data,
    meta: {
      license: "CC-BY-SA-4.0",
      attribution: "Africa History — africahistory.org",
    },
    errors: [],
  };
}

const sampleSource: Source = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "Sample",
  url: null,
  type: null,
  pinnedUrl: null,
  year: null,
  author: null,
  publisher: null,
  resolvable: null,
  lastVerifiedAt: null,
};

describe("GET /api/v2/sources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the Module #0 envelope and the AR18 Cache-Control header", async () => {
    vi.mocked(listSourcesHandler).mockResolvedValue({
      ...baseEnvelope<Source[]>([]),
      meta: {
        license: "CC-BY-SA-4.0",
        attribution: "Africa History — africahistory.org",
        pagination: { total: 0, page: 1, perPage: 20, totalPages: 1 },
      },
    });

    const request = new NextRequest("http://localhost/api/v2/sources");
    const response = await listGet(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "s-maxage=86400, immutable"
    );
    expect(body.meta.license).toBe("CC-BY-SA-4.0");
    expect(body.errors).toEqual([]);
    expect(listSourcesHandler).toHaveBeenCalledWith({ page: 1, perPage: 20 });
  });

  it("honours page / perPage query params", async () => {
    vi.mocked(listSourcesHandler).mockResolvedValue(baseEnvelope<Source[]>([]));
    const request = new NextRequest(
      "http://localhost/api/v2/sources?page=3&perPage=50"
    );
    await listGet(request);
    expect(listSourcesHandler).toHaveBeenCalledWith({ page: 3, perPage: 50 });
  });

  it("returns 400 with a VALIDATION error when params are invalid", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/sources?perPage=9999"
    );
    const response = await listGet(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(listSourcesHandler).not.toHaveBeenCalled();
  });

  it("returns 500 on handler errors", async () => {
    vi.mocked(listSourcesHandler).mockRejectedValue(new Error("db down"));
    const request = new NextRequest("http://localhost/api/v2/sources");
    const response = await listGet(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.errors[0].code).toBe("INTERNAL_ERROR");
  });

  it("OPTIONS returns 204", () => {
    const response = listOptions();
    expect(response.status).toBe(204);
  });
});

describe("GET /api/v2/sources/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with the envelope for an existing source", async () => {
    vi.mocked(getSourceHandler).mockResolvedValue(baseEnvelope(sampleSource));

    const request = new NextRequest(
      "http://localhost/api/v2/sources/11111111-1111-1111-1111-111111111111"
    );
    const response = await itemGet(request, {
      params: Promise.resolve({
        id: "11111111-1111-1111-1111-111111111111",
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe("11111111-1111-1111-1111-111111111111");
    expect(getSourceHandler).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111"
    );
  });

  it("returns 400 when the id is not a uuid", async () => {
    const request = new NextRequest("http://localhost/api/v2/sources/not-uuid");
    const response = await itemGet(request, {
      params: Promise.resolve({ id: "not-uuid" }),
    });
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(getSourceHandler).not.toHaveBeenCalled();
  });

  it("returns 404 when the source is missing", async () => {
    vi.mocked(getSourceHandler).mockResolvedValue(null);
    const request = new NextRequest(
      "http://localhost/api/v2/sources/11111111-1111-1111-1111-111111111111"
    );
    const response = await itemGet(request, {
      params: Promise.resolve({
        id: "11111111-1111-1111-1111-111111111111",
      }),
    });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.errors[0].code).toBe("NOT_FOUND");
  });
});
