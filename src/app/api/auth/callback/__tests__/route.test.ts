import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/lib/supabase/auth-server", () => ({
  createServerSupabaseClient: vi.fn(() =>
    Promise.resolve({
      auth: { exchangeCodeForSession: mocks.exchangeCodeForSession },
    })
  ),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { error: mocks.loggerError },
}));

import { GET } from "../route";

function callbackFor(query: string) {
  return GET(
    new NextRequest(`http://localhost:3000/api/auth/callback${query}`)
  );
}

describe("GET /api/auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
  });

  // @req REQ-042
  it("lands a signed-in moderator on the destination they asked for", async () => {
    const response = await callbackFor("?code=abc&redirect=%2Ffr%2Fadmin");

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/fr/admin"
    );
  });

  // @req REQ-042
  it("falls back to the console when no destination is given", async () => {
    const response = await callbackFor("?code=abc");

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/fr/admin"
    );
  });

  // @req REQ-042
  it("refuses to forward a freshly-signed-in visitor to another origin", async () => {
    const response = await callbackFor(
      "?code=abc&redirect=https%3A%2F%2Fevil.example%2Fsteal"
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/fr/admin"
    );
  });

  // @req REQ-042
  it("refuses a protocol-relative destination, which also leaves the site", async () => {
    const response = await callbackFor("?code=abc&redirect=%2F%2Fevil.example");

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/fr/admin"
    );
  });

  // @req REQ-042
  it("sends someone back to sign in when the link carries no code", async () => {
    const response = await callbackFor("?redirect=%2Ffr%2Fadmin");

    expect(response.headers.get("location")).toContain("/fr/admin/connexion");
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  // @req REQ-042
  it("sends someone back to sign in when the code is spent", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      error: { message: "invalid flow state" },
    });

    const response = await callbackFor("?code=stale");

    expect(response.headers.get("location")).toContain("/fr/admin/connexion");
  });
});
