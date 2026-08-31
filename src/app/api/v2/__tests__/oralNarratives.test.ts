import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/oralNarratives", () => ({
  listOralNarrativesHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => new Response(JSON.stringify(data), init)),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import { listOralNarrativesHandler } from "@/api/v2/handlers/oralNarratives";
import { GET, OPTIONS } from "../oral-narratives/route";

describe("GET /api/v2/oral-narratives", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-095
  it("validates entity filters and delegates public reads to the handler", async () => {
    vi.mocked(listOralNarrativesHandler).mockResolvedValue({
      data: [],
      meta: {
        license: "CC-BY-SA-4.0",
        attribution: "EthniAfrica — ethniafrica.com",
      },
      errors: [],
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/v2/oral-narratives?entityType=people&entityId=PPL_TEST"
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(listOralNarrativesHandler).toHaveBeenCalledWith({
      entityType: "people",
      entityId: "PPL_TEST",
      page: 1,
      perPage: 20,
    });
  });

  // @req REQ-095
  it("rejects incomplete public filters before reaching the handler", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/v2/oral-narratives?entityType=people"
      )
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(listOralNarrativesHandler).not.toHaveBeenCalled();
  });

  // @req REQ-095
  it("returns a CORS preflight response", () => {
    expect(OPTIONS().status).toBe(204);
  });
});
