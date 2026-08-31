import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/keys", () => ({
  handleKeyCreate: vi.fn(),
  handleKeyList: vi.fn(),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { error: vi.fn() },
}));

import { handleKeyCreate, handleKeyList } from "@/api/v2/handlers/keys";
import { logger } from "@/lib/api/logger";
import { GET, OPTIONS, POST } from "@/app/api/v2/keys/route";

const envelopeMeta = {
  license: "CC-BY-SA-4.0",
  attribution: "EthniAfrica — ethniafrica.com",
};

describe("GET/POST /api/v2/keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-056
  it("passes the caller's bearer token to the list handler", async () => {
    vi.mocked(handleKeyList).mockResolvedValue({
      status: 200,
      body: { data: [], meta: envelopeMeta, errors: [] },
    });

    const response = await GET(
      new NextRequest("http://localhost/api/v2/keys", {
        headers: { Authorization: "Bearer session-jwt" },
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(handleKeyList).toHaveBeenCalledWith({
      accessToken: "session-jwt",
    });
  });

  // @req REQ-056
  it("returns 500 and logs when the list handler throws", async () => {
    vi.mocked(handleKeyList).mockRejectedValue(new Error("boom"));

    const response = await GET(new NextRequest("http://localhost/api/v2/keys"));

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });

  // @req REQ-056
  it("maps malformed JSON to a validation error without calling the create handler", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/v2/keys", {
        method: "POST",
        body: "{",
        headers: {
          "content-type": "application/json",
          Authorization: "Bearer session-jwt",
        },
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      errors: [{ code: "VALIDATION_ERROR" }],
    });
    expect(handleKeyCreate).not.toHaveBeenCalled();
  });

  // @req REQ-056
  it("forwards the parsed body and bearer token to the create handler", async () => {
    vi.mocked(handleKeyCreate).mockResolvedValue({
      status: 201,
      body: {
        data: {
          id: "key-1",
          label: "Local dev",
          tier: "public",
          active: true,
          key_prefix: "usr_raw12345",
          created_at: "2026-08-01T00:00:00.000Z",
          last_used_at: null,
          expires_at: null,
          revoked_at: null,
          key: "usr_raw",
        },
        meta: envelopeMeta,
        errors: [],
      },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/v2/keys", {
        method: "POST",
        body: JSON.stringify({ label: "Local dev" }),
        headers: {
          "content-type": "application/json",
          Authorization: "Bearer session-jwt",
        },
      })
    );

    expect(response.status).toBe(201);
    expect(handleKeyCreate).toHaveBeenCalledWith(
      { accessToken: "session-jwt" },
      { label: "Local dev" }
    );
  });

  // @req REQ-056
  it("returns 500 and logs when the create handler throws", async () => {
    vi.mocked(handleKeyCreate).mockRejectedValue(new Error("boom"));

    const response = await POST(
      new NextRequest("http://localhost/api/v2/keys", {
        method: "POST",
        body: JSON.stringify({ label: "Local dev" }),
        headers: { "content-type": "application/json" },
      })
    );

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });

  // @req REQ-056
  it("answers OPTIONS with a CORS preflight response", () => {
    const response = OPTIONS();
    expect(response.status).toBe(204);
  });
});
