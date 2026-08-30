import { NextResponse } from "next/server";

// PATCH is here for the moderator transition on /v2/flags/{id} (ETNI-72).
// This only advertises the verb in the preflight; a route still answers no
// method it does not export.
const ALLOWED_METHODS = "GET,POST,PATCH,OPTIONS";
const ALLOWED_HEADERS = "Content-Type,Authorization";

/**
 * The single origin allowed to call the API cross-origin, or null when the
 * deployment declares none. Read per call rather than at module scope so the
 * value a platform injects at runtime is not frozen into the build.
 */
const configuredOrigin = (): string | null => {
  const declared =
    process.env.CORS_ALLOWED_ORIGIN ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const origin = declared.trim();
  return origin.length > 0 ? origin : null;
};

// @req REQ-084
export const applyCorsHeaders = (response: Response) => {
  const origin = configuredOrigin();

  response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  // Set even when no origin is echoed: a shared cache must never hand one
  // origin's CORS decision to another. Appended rather than assigned so a
  // Vary already on the response (Accept-Encoding, say) survives.
  const vary = response.headers.get("Vary");
  if (!vary) {
    response.headers.set("Vary", "Origin");
  } else if (!vary.split(",").some((token) => token.trim() === "Origin")) {
    response.headers.set("Vary", `${vary}, Origin`);
  }

  // With no origin configured the response carries no Access-Control-Allow-
  // Origin at all. The former "*" fallback was worse than useless: paired with
  // Allow-Credentials every browser rejects it outright, so credentialed calls
  // broke anyway — while a misconfigured deployment silently advertised
  // POST /api/contributions as open to the whole web. Failing closed leaves
  // same-origin traffic (the frontend) untouched, since CORS never applies to
  // it, and makes the missing variable visible as a blocked cross-origin call.
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return response;
};

// @req REQ-084
export const jsonWithCors = <T>(data: T, init?: ResponseInit) => {
  const response = NextResponse.json(data, init);
  return applyCorsHeaders(response);
};

// @req REQ-084
export const corsOptionsResponse = () =>
  applyCorsHeaders(new Response(null, { status: 204 }));
