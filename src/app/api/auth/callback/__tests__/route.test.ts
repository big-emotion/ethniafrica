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

  // WHATWG URL parsing reads a backslash after the scheme-relative slash as a
  // second slash, so `/\evil.example` is `//evil.example` to every browser —
  // a check on the literal `//` prefix let it through.
  // @req REQ-042
  it.each([
    ["a backslash-smuggled host", "/\\evil.example"],
    ["a protocol-relative host", "//evil.example"],
    ["an absolute URL", "https://evil.example"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a tab-smuggled protocol-relative host", "/\t/evil.example"],
    // Dot segments collapse to an empty first segment: the resolved pathname
    // is `//evil.example`, protocol-relative again once joined to the origin.
    ["a dot-segment protocol-relative host", "/.//evil.example"],
  ])("refuses %s and lands on the console", async (_label, destination) => {
    const response = await callbackFor(
      `?code=abc&redirect=${encodeURIComponent(destination)}`
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/fr/admin"
    );
  });

  // The form the finding reported: `%5C` sent raw in the query decodes to a
  // backslash before the destination is read.
  // @req REQ-042
  it("refuses a raw, unencoded backslash-smuggled host", async () => {
    const response = await callbackFor("?code=abc&redirect=/%5Cevil.example");

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/fr/admin"
    );
  });

  // @req REQ-042
  it("keeps a same-site path with its query", async () => {
    const response = await callbackFor(
      `?code=abc&redirect=${encodeURIComponent("/fr/admin/x?y=1")}`
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/fr/admin/x?y=1"
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
