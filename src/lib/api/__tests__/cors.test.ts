import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { applyCorsHeaders, corsOptionsResponse, jsonWithCors } from "../cors";

const ORIGIN_VARIABLES = [
  "CORS_ALLOWED_ORIGIN",
  "NEXT_PUBLIC_SITE_URL",
] as const;

const savedEnvironment = new Map<string, string | undefined>();

beforeEach(() => {
  for (const name of ORIGIN_VARIABLES) {
    savedEnvironment.set(name, process.env[name]);
    delete process.env[name];
  }
});

afterEach(() => {
  for (const [name, value] of savedEnvironment) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  savedEnvironment.clear();
});

const corsHeaders = (response: Response) => ({
  origin: response.headers.get("Access-Control-Allow-Origin"),
  credentials: response.headers.get("Access-Control-Allow-Credentials"),
  vary: response.headers.get("Vary"),
});

describe("applyCorsHeaders — no allowed origin configured", () => {
  // @req REQ-084
  it("does not advertise the API to every origin with a wildcard", () => {
    const { origin } = corsHeaders(applyCorsHeaders(new Response(null)));
    expect(origin).not.toBe("*");
    expect(origin).toBeNull();
  });

  // @req REQ-084
  it("withholds Access-Control-Allow-Credentials, which no browser honours without a concrete origin", () => {
    expect(
      corsHeaders(applyCorsHeaders(new Response(null))).credentials
    ).toBeNull();
  });

  // @req REQ-084
  it("still announces the methods and headers the API accepts", () => {
    const response = applyCorsHeaders(new Response(null));
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET,POST,PATCH,OPTIONS"
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Content-Type,Authorization"
    );
  });
});

describe("applyCorsHeaders — an allowed origin is configured", () => {
  // @req REQ-084
  it("echoes the configured origin and only then allows credentials", () => {
    process.env.CORS_ALLOWED_ORIGIN = "https://ethniafrica.org";
    expect(corsHeaders(applyCorsHeaders(new Response(null)))).toMatchObject({
      origin: "https://ethniafrica.org",
      credentials: "true",
    });
  });

  // @req REQ-084
  it("falls back to the site URL when no dedicated CORS origin is set", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://ethniafrica.org";
    expect(corsHeaders(applyCorsHeaders(new Response(null))).origin).toBe(
      "https://ethniafrica.org"
    );
  });

  // @req REQ-084
  it("prefers CORS_ALLOWED_ORIGIN over the site URL when both are set", () => {
    process.env.CORS_ALLOWED_ORIGIN = "https://admin.ethniafrica.org";
    process.env.NEXT_PUBLIC_SITE_URL = "https://ethniafrica.org";
    expect(corsHeaders(applyCorsHeaders(new Response(null))).origin).toBe(
      "https://admin.ethniafrica.org"
    );
  });

  // @req REQ-084
  it("treats an empty variable as unset rather than as an empty origin", () => {
    process.env.CORS_ALLOWED_ORIGIN = "   ";
    expect(corsHeaders(applyCorsHeaders(new Response(null))).origin).toBeNull();
  });

  // @req REQ-084
  it("reads the environment on every call, so a deploy-time value is never frozen at import", () => {
    process.env.CORS_ALLOWED_ORIGIN = "https://first.example";
    expect(corsHeaders(applyCorsHeaders(new Response(null))).origin).toBe(
      "https://first.example"
    );
    process.env.CORS_ALLOWED_ORIGIN = "https://second.example";
    expect(corsHeaders(applyCorsHeaders(new Response(null))).origin).toBe(
      "https://second.example"
    );
  });
});

describe("Vary: Origin", () => {
  // @req REQ-084
  it("is present with no origin configured, so a cache cannot reuse one origin's response", () => {
    expect(corsHeaders(applyCorsHeaders(new Response(null))).vary).toBe(
      "Origin"
    );
  });

  // @req REQ-084
  it("is present with an origin configured", () => {
    process.env.CORS_ALLOWED_ORIGIN = "https://ethniafrica.org";
    expect(corsHeaders(applyCorsHeaders(new Response(null))).vary).toBe(
      "Origin"
    );
  });

  // @req REQ-084
  it("keeps a Vary the response already carried", () => {
    const response = new Response(null, {
      headers: { Vary: "Accept-Encoding" },
    });
    expect(corsHeaders(applyCorsHeaders(response)).vary).toBe(
      "Accept-Encoding, Origin"
    );
  });

  // @req REQ-084
  it("does not list Origin twice when the response already varied on it", () => {
    const response = new Response(null, { headers: { Vary: "Origin" } });
    expect(corsHeaders(applyCorsHeaders(response)).vary).toBe("Origin");
  });
});

describe("the helpers that wrap applyCorsHeaders", () => {
  // @req REQ-084
  it("gives jsonWithCors the same guarantees as a bare response", () => {
    const response = jsonWithCors({ ok: true });
    expect(corsHeaders(response)).toEqual({
      origin: null,
      credentials: null,
      vary: "Origin",
    });
  });

  // @req REQ-084
  it("gives the preflight response the same guarantees", () => {
    process.env.CORS_ALLOWED_ORIGIN = "https://ethniafrica.org";
    const response = corsOptionsResponse();
    expect(response.status).toBe(204);
    expect(corsHeaders(response)).toEqual({
      origin: "https://ethniafrica.org",
      credentials: "true",
      vary: "Origin",
    });
  });
});
