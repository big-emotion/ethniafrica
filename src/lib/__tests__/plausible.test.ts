import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PLAUSIBLE_SCRIPT_PATH, buildPlausibleSrc } from "@/lib/plausible";

describe("buildPlausibleSrc", () => {
  const originalDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const originalCustomDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN;

  beforeEach(() => {
    // Reset env vars before each test
    delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    delete process.env.NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN;
  });

  afterEach(() => {
    // Restore original env vars
    if (originalDomain !== undefined) {
      process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = originalDomain;
    } else {
      delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    }
    if (originalCustomDomain !== undefined) {
      process.env.NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN = originalCustomDomain;
    } else {
      delete process.env.NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN;
    }
  });

  // @req REQ-046
  it("returns empty string when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is not set", () => {
    expect(buildPlausibleSrc()).toBe("");
  });

  // @req REQ-046
  it("returns the default plausible.io script URL when domain is configured", () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "example.com";
    expect(buildPlausibleSrc()).toBe(
      `https://plausible.io${PLAUSIBLE_SCRIPT_PATH}`
    );
  });

  // @req REQ-046
  it("uses NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN as base URL when set", () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "example.com";
    process.env.NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN =
      "https://stats.example.com";
    expect(buildPlausibleSrc()).toBe(
      `https://stats.example.com${PLAUSIBLE_SCRIPT_PATH}`
    );
  });

  // @req REQ-046
  it("returns empty string when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is an empty string", () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "";
    expect(buildPlausibleSrc()).toBe("");
  });

  // @req REQ-046
  it("strips trailing slash from NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN", () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "example.com";
    process.env.NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN =
      "https://stats.example.com/";
    expect(buildPlausibleSrc()).toBe(
      `https://stats.example.com${PLAUSIBLE_SCRIPT_PATH}`
    );
  });

  /**
   * The variant is the whole measurement, not a detail. The base `script.js`
   * records pageviews and nothing else, which is what production ran until
   * 2026-09-07 — every outbound click to a cited source, every file opened and
   * every tagged control was invisible.
   */
  // @req REQ-046
  it("loads the variant that records outbound clicks, downloads and tagged events", () => {
    expect(PLAUSIBLE_SCRIPT_PATH).toContain("outbound-links");
    expect(PLAUSIBLE_SCRIPT_PATH).toContain("file-downloads");
    expect(PLAUSIBLE_SCRIPT_PATH).toContain("tagged-events");
  });
});
