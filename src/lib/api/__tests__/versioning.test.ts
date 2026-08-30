import { describe, it, expect } from "vitest";

import { SUNSET_ENDPOINTS, type SunsetNotice } from "../sunsetConfig";
import {
  applyVersioningHeaders,
  resolveSunsetNotice,
  API_MAJOR_VERSION,
} from "../versioning";

const versionHeaders = (response: Response) => ({
  version: response.headers.get("X-API-Version"),
  stable: response.headers.get("X-API-Stable"),
});

const deprecationHeaders = (response: Response) => ({
  deprecation: response.headers.get("Deprecation"),
  sunset: response.headers.get("Sunset"),
  link: response.headers.get("Link"),
});

/** A sunset map standing in for a future deprecation, so the empty shipped one stays empty. */
const withSunset = (path: string): Map<string, SunsetNotice> =>
  new Map([
    [
      path,
      {
        sunset: "2027-03-01T00:00:00.000Z",
        migrationUrl: "https://africahistory.org/docs/api/versioning",
      },
    ],
  ]);

describe("version headers on /api/v2", () => {
  // @req REQ-035
  it("states the major version and its stability on a success response", () => {
    const response = applyVersioningHeaders(
      Response.json({ data: [] }),
      "/api/v2/peoples"
    );
    expect(versionHeaders(response)).toEqual({ version: "2", stable: "true" });
  });

  // @req REQ-035
  it("states them on a server error too, so a failing integration still learns its version", () => {
    const response = applyVersioningHeaders(
      Response.json({ error: "Internal server error" }, { status: 500 }),
      "/api/v2/peoples"
    );
    expect(response.status).toBe(500);
    expect(versionHeaders(response)).toEqual({ version: "2", stable: "true" });
  });

  // @req REQ-035
  it("states them on the 401 an unauthenticated caller receives", () => {
    const response = applyVersioningHeaders(
      Response.json({ error: "missing_api_key" }, { status: 401 }),
      "/api/v2/countries"
    );
    expect(versionHeaders(response)).toEqual({ version: "2", stable: "true" });
  });

  // @req REQ-035
  it("carries no deprecation headers while the endpoint is live", () => {
    const response = applyVersioningHeaders(
      Response.json({ data: [] }),
      "/api/v2/peoples"
    );
    expect(deprecationHeaders(response)).toEqual({
      deprecation: null,
      sunset: null,
      link: null,
    });
  });
});

describe("paths that are not the public API", () => {
  // @req REQ-035
  it.each([
    "/api/contributions",
    "/api/admin/revalidate",
    "/api/download",
    "/fr/explorer/pays",
  ])("leaves %s untouched, so it never claims to be v2", (pathname) => {
    const response = applyVersioningHeaders(Response.json({}), pathname);
    expect(versionHeaders(response)).toEqual({ version: null, stable: null });
  });

  // @req REQ-035
  it("does not treat a path merely starting with the same characters as v2", () => {
    const response = applyVersioningHeaders(Response.json({}), "/api/v20/x");
    expect(versionHeaders(response).version).toBeNull();
  });
});

describe("a sunset endpoint, per RFC 8594", () => {
  // @req REQ-035
  it("announces the deprecation, the date and where to migrate", () => {
    const response = applyVersioningHeaders(
      Response.json({ data: [] }),
      "/api/v2/legacy",
      withSunset("/api/v2/legacy")
    );
    expect(deprecationHeaders(response)).toEqual({
      deprecation: "true",
      // RFC 8594 §3 requires an HTTP-date, not the ISO-8601 the config stores.
      sunset: "Mon, 01 Mar 2027 00:00:00 GMT",
      link: '<https://africahistory.org/docs/api/versioning>; rel="sunset"',
    });
  });

  // @req REQ-035
  it("still states the version alongside the deprecation", () => {
    const response = applyVersioningHeaders(
      Response.json({ data: [] }),
      "/api/v2/legacy",
      withSunset("/api/v2/legacy")
    );
    expect(versionHeaders(response)).toEqual({ version: "2", stable: "true" });
  });

  // @req REQ-035
  it("deprecates the fiches below a deprecated collection", () => {
    const response = applyVersioningHeaders(
      Response.json({ data: {} }),
      "/api/v2/legacy/PPL_SHONA",
      withSunset("/api/v2/legacy")
    );
    expect(deprecationHeaders(response).deprecation).toBe("true");
  });

  // @req REQ-035
  it("does not deprecate a sibling that merely shares the opening characters", () => {
    const response = applyVersioningHeaders(
      Response.json({ data: [] }),
      "/api/v2/legacy-peoples",
      withSunset("/api/v2/legacy")
    );
    expect(deprecationHeaders(response).deprecation).toBeNull();
  });

  // @req REQ-035
  it("keeps a Link the response already carried rather than replacing it", () => {
    const response = applyVersioningHeaders(
      Response.json(
        { data: [] },
        { headers: { Link: '<https://a.example>; rel="next"' } }
      ),
      "/api/v2/legacy",
      withSunset("/api/v2/legacy")
    );
    expect(response.headers.get("Link")).toContain('rel="next"');
    expect(response.headers.get("Link")).toContain('rel="sunset"');
  });
});

describe("resolveSunsetNotice", () => {
  // @req REQ-035
  it("finds nothing for a live endpoint", () => {
    expect(
      resolveSunsetNotice("/api/v2/peoples", withSunset("/api/v2/legacy"))
    ).toBeNull();
  });

  // @req REQ-035
  it("finds nothing at all while no endpoint is deprecated", () => {
    expect(resolveSunsetNotice("/api/v2/peoples")).toBeNull();
  });
});

describe("the shipped sunset configuration", () => {
  // @req REQ-035
  it("declares no deprecated endpoint yet", () => {
    expect(SUNSET_ENDPOINTS.size).toBe(0);
  });

  // The map is empty today, so these two assert nothing yet — they exist to
  // catch the first real entry, where a typo would ship a header no client can
  // parse and a migration link that leads nowhere.
  // @req REQ-035
  it("keys every entry on an /api/v2 path and dates it parseably", () => {
    for (const [path, notice] of SUNSET_ENDPOINTS) {
      expect(path.startsWith("/api/v2")).toBe(true);
      expect(Number.isNaN(Date.parse(notice.sunset))).toBe(false);
    }
  });

  // @req REQ-035
  it("points every entry at an absolute migration URL", () => {
    for (const [, notice] of SUNSET_ENDPOINTS) {
      expect(notice.migrationUrl).toMatch(/^https:\/\//);
    }
  });
});

describe("the announced version", () => {
  // @req REQ-035
  it("matches the path segment the API is served under", () => {
    expect(API_MAJOR_VERSION).toBe("2");
  });
});
