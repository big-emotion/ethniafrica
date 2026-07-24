import { describe, expect, it } from "vitest";

import { validateStagingTarget } from "../lib/afrikMigrationTarget";

const STAGING_URL = "https://ethniafrica-staging.supabase.co";

describe("validateStagingTarget", () => {
  it.each([undefined, ""])(
    "rejects a missing target identity (%s)",
    (target) => {
      expect(() =>
        validateStagingTarget({
          target,
          activeSupabaseUrl: STAGING_URL,
          expectedStagingSupabaseUrl: STAGING_URL,
        })
      ).toThrow("Migration target identity is required");
    }
  );

  it.each(["production", "prod", "development", " staging "])(
    "rejects the non-staging target %s",
    (target) => {
      expect(() =>
        validateStagingTarget({
          target,
          activeSupabaseUrl: STAGING_URL,
          expectedStagingSupabaseUrl: STAGING_URL,
        })
      ).toThrow('Migration target must be exactly "staging"');
    }
  );

  it.each([
    ["active Supabase URL", undefined, STAGING_URL],
    ["active Supabase URL", "not-a-url", STAGING_URL],
    ["configured staging Supabase URL", STAGING_URL, undefined],
    ["configured staging Supabase URL", STAGING_URL, "not-a-url"],
  ])(
    "rejects an invalid %s",
    (_label, activeSupabaseUrl, expectedStagingSupabaseUrl) => {
      expect(() =>
        validateStagingTarget({
          target: "staging",
          activeSupabaseUrl,
          expectedStagingSupabaseUrl,
        })
      ).toThrow();
    }
  );

  it.each([
    "ftp://ethniafrica-staging.supabase.co",
    "https://user:password@ethniafrica-staging.supabase.co",
    "https://ethniafrica-staging.supabase.co/rest/v1",
    "https://ethniafrica-staging.supabase.co?target=staging",
    "https://ethniafrica-staging.supabase.co#staging",
  ])("rejects the ambiguous active Supabase URL %s", (activeSupabaseUrl) => {
    expect(() =>
      validateStagingTarget({
        target: "staging",
        activeSupabaseUrl,
        expectedStagingSupabaseUrl: STAGING_URL,
      })
    ).toThrow("Active Supabase URL must be an HTTP(S) origin");
  });

  it("rejects an active URL that does not match the configured staging URL", () => {
    expect(() =>
      validateStagingTarget({
        target: "staging",
        activeSupabaseUrl: "https://ethniafrica-production.supabase.co",
        expectedStagingSupabaseUrl: STAGING_URL,
      })
    ).toThrow("Active Supabase URL does not match the configured staging URL");
  });

  it("accepts staging when the normalized URL origins match", () => {
    expect(
      validateStagingTarget({
        target: "staging",
        activeSupabaseUrl: "https://ETHNIAFRICA-STAGING.supabase.co:443/",
        expectedStagingSupabaseUrl: STAGING_URL,
      })
    ).toEqual({
      target: "staging",
      supabaseUrl: STAGING_URL,
    });
  });
});
