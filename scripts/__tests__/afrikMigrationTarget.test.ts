import { describe, expect, it } from "vitest";

import {
  AFRIK_PRODUCTION_SUPABASE_URL,
  validateAfrikMigrationTarget,
} from "../lib/afrikMigrationTarget";

const STAGING_URL = "https://ethniafrica-staging.supabase.co";

describe("validateAfrikMigrationTarget", () => {
  it.each([undefined, ""])(
    "rejects a missing target identity (%s)",
    (target) => {
      expect(() =>
        validateAfrikMigrationTarget({
          target,
          activeSupabaseUrl: STAGING_URL,
          expectedStagingSupabaseUrl: STAGING_URL,
        })
      ).toThrow("Migration target identity is required");
    }
  );

  // @req REQ-032
  it.each(["prod", "development", " staging ", " production "])(
    "rejects the unsupported target %s",
    (target) => {
      expect(() =>
        validateAfrikMigrationTarget({
          target,
          activeSupabaseUrl: STAGING_URL,
          expectedStagingSupabaseUrl: STAGING_URL,
        })
      ).toThrow('Migration target must be exactly "staging" or "production"');
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
        validateAfrikMigrationTarget({
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
      validateAfrikMigrationTarget({
        target: "staging",
        activeSupabaseUrl,
        expectedStagingSupabaseUrl: STAGING_URL,
      })
    ).toThrow("Active Supabase URL must be an HTTP(S) origin");
  });

  it("rejects an active URL that does not match the configured staging URL", () => {
    expect(() =>
      validateAfrikMigrationTarget({
        target: "staging",
        activeSupabaseUrl: "https://ethniafrica-production.supabase.co",
        expectedStagingSupabaseUrl: STAGING_URL,
      })
    ).toThrow("Active Supabase URL does not match the configured staging URL");
  });

  it("accepts staging when the normalized URL origins match", () => {
    expect(
      validateAfrikMigrationTarget({
        target: "staging",
        activeSupabaseUrl: "https://ETHNIAFRICA-STAGING.supabase.co:443/",
        expectedStagingSupabaseUrl: STAGING_URL,
      })
    ).toEqual({
      target: "staging",
      supabaseUrl: STAGING_URL,
    });
  });

  // @req REQ-032
  it("rejects production when the active URL is not the locked project", () => {
    expect(() =>
      validateAfrikMigrationTarget({
        target: "production",
        activeSupabaseUrl: "https://another-project.supabase.co",
        expectedStagingSupabaseUrl: STAGING_URL,
      })
    ).toThrow(
      "Active Supabase URL does not match the locked production project"
    );
  });

  // @req REQ-032
  it("accepts only the locked production project", () => {
    expect(
      validateAfrikMigrationTarget({
        target: "production",
        activeSupabaseUrl: AFRIK_PRODUCTION_SUPABASE_URL,
      })
    ).toEqual({
      target: "production",
      supabaseUrl: AFRIK_PRODUCTION_SUPABASE_URL,
    });
  });
});
