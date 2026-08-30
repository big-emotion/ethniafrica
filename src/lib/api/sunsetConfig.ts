/**
 * Which /api/v2 endpoints are scheduled for retirement.
 *
 * Empty by design: v2 is the only published major and nothing in it is
 * deprecated. The map exists so that retiring an endpoint is a config edit
 * rather than a code change, and so the header contract can be tested before
 * there is anything to deprecate.
 */

export interface SunsetNotice {
  /**
   * When the endpoint stops answering, as ISO-8601 — the format a human edits
   * and a diff reads. `applyVersioningHeaders` converts it to the HTTP-date
   * RFC 8594 requires on the wire.
   */
  sunset: string;
  /** Absolute URL of the page explaining what to call instead. */
  migrationUrl: string;
}

/**
 * Keyed on the pathname the endpoint is served under, without a trailing
 * slash — `/api/v2/peoples`, never `/api/v2/peoples/`. A key covers the
 * segments below it too, so deprecating a collection deprecates its fiches.
 *
 * An entry must be added at least six months before its `sunset` date: that
 * notice period is the promise `/docs/api/versioning` makes to integrators,
 * and it is only kept here.
 */
// @req REQ-035
export const SUNSET_ENDPOINTS: Map<string, SunsetNotice> = new Map();
