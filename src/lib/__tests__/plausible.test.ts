import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildPlausibleSrc } from "@/lib/plausible";

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

  it("returns empty string when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is not set", () => {
    expect(buildPlausibleSrc()).toBe("");
  });

  it("returns the default plausible.io script URL when domain is configured", () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "example.com";
    expect(buildPlausibleSrc()).toBe("https://plausible.io/js/script.js");
  });

  it("uses NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN as base URL when set", () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "example.com";
    process.env.NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN =
      "https://stats.example.com";
    expect(buildPlausibleSrc()).toBe("https://stats.example.com/js/script.js");
  });

  it("returns empty string when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is an empty string", () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "";
    expect(buildPlausibleSrc()).toBe("");
  });
});
