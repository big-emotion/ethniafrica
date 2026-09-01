import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/keys", () => ({
  handleKeyRevoke: vi.fn(),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { error: vi.fn() },
}));

import { handleKeyRevoke } from "@/api/v2/handlers/keys";
import { logger } from "@/lib/api/logger";
import { DELETE, OPTIONS } from "@/app/api/v2/keys/[id]/route";

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

const envelopeMeta = {
  license: "CC-BY-SA-4.0",
  attribution: "EthniAfrica — ethniafrica.com",
};

describe("DELETE /api/v2/keys/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-056
  it("forwards the bearer token and key id to the revoke handler", async () => {
    vi.mocked(handleKeyRevoke).mockResolvedValue({
      status: 200,
      body: { data: null, meta: envelopeMeta, errors: [] },
    });

    const response = await DELETE(
      new NextRequest("http://localhost/api/v2/keys/key-1", {
        method: "DELETE",
        headers: { Authorization: "Bearer session-jwt" },
      }),
      paramsFor("key-1")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(handleKeyRevoke).toHaveBeenCalledWith(
      { accessToken: "session-jwt" },
      "key-1"
    );
  });

  // @req REQ-056
  it("returns 404 when the handler reports the key is not the caller's", async () => {
    vi.mocked(handleKeyRevoke).mockResolvedValue({
      status: 404,
      body: {
        data: null,
        meta: envelopeMeta,
        errors: [{ code: "NOT_FOUND", message: "API key not found" }],
      },
    });

    const response = await DELETE(
      new NextRequest("http://localhost/api/v2/keys/someone-elses-key", {
        method: "DELETE",
        headers: { Authorization: "Bearer session-jwt" },
      }),
      paramsFor("someone-elses-key")
    );

    expect(response.status).toBe(404);
  });

  // @req REQ-056
  it("returns 500 and logs when the handler throws", async () => {
    vi.mocked(handleKeyRevoke).mockRejectedValue(new Error("boom"));

    const response = await DELETE(
      new NextRequest("http://localhost/api/v2/keys/key-1", {
        method: "DELETE",
      }),
      paramsFor("key-1")
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
