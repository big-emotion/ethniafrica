import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { verifyTurnstileToken } from "@/lib/api/turnstile";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

describe("verifyTurnstileToken", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "test-secret");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // @req REQ-012
  it("returns verified when Cloudflare accepts the token", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    await expect(verifyTurnstileToken("valid-token")).resolves.toBe("verified");
  });

  // @req REQ-012
  it("returns rejected when Cloudflare rejects the token", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false }), { status: 200 })
    );

    await expect(verifyTurnstileToken("invalid-token")).resolves.toBe(
      "rejected"
    );
  });

  // @req REQ-012
  it("returns unavailable without contacting Cloudflare when the secret is missing", async () => {
    vi.stubEnv("CLOUDFLARE_TURNSTILE_SECRET_KEY", "");

    await expect(verifyTurnstileToken("token")).resolves.toBe("unavailable");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // @req REQ-012
  it("returns unavailable when the verification request fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network failure"));

    await expect(verifyTurnstileToken("token")).resolves.toBe("unavailable");
  });

  // @req REQ-012
  it("returns unavailable when Cloudflare responds with a server error", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("service unavailable", { status: 503 })
    );

    await expect(verifyTurnstileToken("token")).resolves.toBe("unavailable");
  });

  // @req REQ-012
  it("returns unavailable when Cloudflare returns a malformed response", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ unexpected: true }), { status: 200 })
    );

    await expect(verifyTurnstileToken("token")).resolves.toBe("unavailable");
  });

  // @req REQ-012
  it("forwards the client IP in form-encoded verification data", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    await verifyTurnstileToken("submitted-token", "203.0.113.9");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      TURNSTILE_VERIFY_URL,
      expect.objectContaining({
        method: "POST",
        body: expect.any(URLSearchParams),
      })
    );

    const requestBody = fetchMock.mock.calls[0]?.[1]?.body;
    expect(requestBody).toBeInstanceOf(URLSearchParams);
    expect(requestBody?.toString()).toBe(
      "secret=test-secret&response=submitted-token&remoteip=203.0.113.9"
    );
  });

  // @req REQ-012
  it("limits the Cloudflare request to five seconds", async () => {
    const timeoutSignal = new AbortController().signal;
    const timeoutSpy = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(timeoutSignal);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    await verifyTurnstileToken("token");

    expect(timeoutSpy).toHaveBeenCalledWith(5_000);
    expect(fetchMock).toHaveBeenCalledWith(
      TURNSTILE_VERIFY_URL,
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });
});
