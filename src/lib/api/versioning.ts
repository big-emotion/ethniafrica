/**
 * The headers that make /api/v2 self-describing: which major version answered,
 * whether it is stable, and — once an endpoint is scheduled for retirement —
 * when it goes away and where to go instead (RFC 8594).
 *
 * Deliberately free of Next.js: it takes a `Response` and a pathname, so the
 * contract can be tested without building a request, and applied wherever a
 * v2 response is produced.
 */

import { SUNSET_ENDPOINTS, type SunsetNotice } from "@/lib/api/sunsetConfig";

/** The major version this deployment serves, as it appears in the path. */
// @req REQ-035
export const API_MAJOR_VERSION = "2";

const API_V2_PREFIX = `/api/v${API_MAJOR_VERSION}`;

/**
 * True for the public API and nothing else. Segment-aware rather than a string
 * prefix, so `/api/v20/...` — or any future path that merely opens with the
 * same characters — is not handed v2's version claim.
 */
const isPublicApiPath = (pathname: string) =>
  pathname === API_V2_PREFIX || pathname.startsWith(`${API_V2_PREFIX}/`);

/**
 * The sunset notice governing a path, or null while it is live.
 *
 * Walks up whole segments rather than matching string prefixes, which is what
 * separates `/api/v2/legacy/PPL_SHONA` (below a deprecated collection, so
 * deprecated) from `/api/v2/legacy-peoples` (a different endpoint that happens
 * to start with the same letters, so not).
 */
// @req REQ-035
export function resolveSunsetNotice(
  pathname: string,
  sunsetEndpoints: Map<string, SunsetNotice> = SUNSET_ENDPOINTS
): SunsetNotice | null {
  let candidate = pathname.replace(/\/+$/, "");

  while (isPublicApiPath(candidate)) {
    const notice = sunsetEndpoints.get(candidate);
    if (notice) return notice;

    const parentBoundary = candidate.lastIndexOf("/");
    if (parentBoundary <= 0) break;
    candidate = candidate.slice(0, parentBoundary);
  }

  return null;
}

/**
 * Stamp the versioning contract onto a v2 response, in place.
 *
 * A non-v2 path is returned untouched: the response helpers are shared with
 * `/api/contributions` and `/api/admin/*`, which are not the public API and
 * must not advertise its version.
 */
// @req REQ-035
export function applyVersioningHeaders<ResponseType extends Response>(
  response: ResponseType,
  pathname: string,
  sunsetEndpoints: Map<string, SunsetNotice> = SUNSET_ENDPOINTS
): ResponseType {
  if (!isPublicApiPath(pathname)) return response;

  response.headers.set("X-API-Version", API_MAJOR_VERSION);
  response.headers.set("X-API-Stable", "true");

  const notice = resolveSunsetNotice(pathname, sunsetEndpoints);
  if (notice) {
    response.headers.set("Deprecation", "true");
    // RFC 8594 §3 defines Sunset as an HTTP-date; the config stores ISO-8601
    // because that is what a person editing the map should read.
    response.headers.set("Sunset", new Date(notice.sunset).toUTCString());
    // Appended, not set: Link is a list, and a paginated response already
    // carries rel="next".
    response.headers.append("Link", `<${notice.migrationUrl}>; rel="sunset"`);
  }

  return response;
}
