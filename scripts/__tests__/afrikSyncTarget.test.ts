import { describe, expect, it } from "vitest";

import {
  AFRIK_RECETTE_SUPABASE_URL,
  resolveAfrikSyncTarget,
} from "../lib/afrikSyncTarget";

const PRODUCTION_URL = "https://ethniafrica-production.supabase.co";

describe("resolveAfrikSyncTarget", () => {
  // @req REQ-032
  it.each([undefined, ""])(
    "rejects a missing environment (%s)",
    (environment) => {
      expect(() =>
        resolveAfrikSyncTarget({
          environment,
          activeSupabaseUrl: AFRIK_RECETTE_SUPABASE_URL,
        })
      ).toThrow(/environment is required/i);
    }
  );

  // The retired vocabulary. "staging" named the same environment the rest of
  // the repository calls recette, which is half of why the two databases were
  // confused in the first place.
  // @req REQ-032
  it('rejects the retired "staging" name and says what replaced it', () => {
    expect(() =>
      resolveAfrikSyncTarget({
        environment: "staging",
        activeSupabaseUrl: AFRIK_RECETTE_SUPABASE_URL,
      })
    ).toThrow(/recette/);
  });

  // @req REQ-032
  it("rejects an environment that is neither recette nor production", () => {
    expect(() =>
      resolveAfrikSyncTarget({
        environment: "prod",
        activeSupabaseUrl: AFRIK_RECETTE_SUPABASE_URL,
      })
    ).toThrow(/"recette" or "production"/);
  });

  describe("recette", () => {
    // @req REQ-032
    it("accepts the active URL when it is the recette project", () => {
      expect(
        resolveAfrikSyncTarget({
          environment: "recette",
          activeSupabaseUrl: AFRIK_RECETTE_SUPABASE_URL,
        })
      ).toEqual({
        environment: "recette",
        supabaseUrl: AFRIK_RECETTE_SUPABASE_URL,
      });
    });

    // @req REQ-032
    it("refuses an active URL that is not the recette project", () => {
      expect(() =>
        resolveAfrikSyncTarget({
          environment: "recette",
          activeSupabaseUrl: PRODUCTION_URL,
          productionSupabaseUrl: PRODUCTION_URL,
        })
      ).toThrow();
    });
  });

  describe("production", () => {
    // The production project ref is not in this repository, so it can only come
    // from configuration. A default would be a way to write to the wrong
    // database by forgetting something.
    // @req REQ-032
    it("refuses to resolve production with no configured production URL", () => {
      expect(() =>
        resolveAfrikSyncTarget({
          environment: "production",
          activeSupabaseUrl: PRODUCTION_URL,
        })
      ).toThrow(/AFRIK_PRODUCTION_SUPABASE_URL/);
    });

    // @req REQ-032
    it("accepts the active URL when it is the configured production project", () => {
      expect(
        resolveAfrikSyncTarget({
          environment: "production",
          activeSupabaseUrl: PRODUCTION_URL,
          productionSupabaseUrl: PRODUCTION_URL,
        })
      ).toEqual({ environment: "production", supabaseUrl: PRODUCTION_URL });
    });

    // This is the accident that actually happened: the workflow declared
    // production while pointing at the recette project, and the old guard
    // *enforced* that pairing because its "production" constant held the
    // recette ref. The error has to name both environments or the reader
    // cannot tell which half is wrong.
    // @req REQ-032
    it("names both environments when production is declared against the recette project", () => {
      expect(() =>
        resolveAfrikSyncTarget({
          environment: "production",
          activeSupabaseUrl: AFRIK_RECETTE_SUPABASE_URL,
          productionSupabaseUrl: PRODUCTION_URL,
        })
      ).toThrow(/recette/i);
    });

    // @req REQ-032
    it("refuses a production URL configured as the recette project", () => {
      expect(() =>
        resolveAfrikSyncTarget({
          environment: "production",
          activeSupabaseUrl: AFRIK_RECETTE_SUPABASE_URL,
          productionSupabaseUrl: AFRIK_RECETTE_SUPABASE_URL,
        })
      ).toThrow(/cannot be the recette project/i);
    });
  });

  describe("the active URL itself", () => {
    // @req REQ-032
    it.each([undefined, ""])(
      "rejects a missing active URL (%s)",
      (activeSupabaseUrl) => {
        expect(() =>
          resolveAfrikSyncTarget({ environment: "recette", activeSupabaseUrl })
        ).toThrow(/Active Supabase URL is required/i);
      }
    );

    // @req REQ-032
    it("rejects a value that is not a URL", () => {
      expect(() =>
        resolveAfrikSyncTarget({
          environment: "recette",
          activeSupabaseUrl: "not-a-url",
        })
      ).toThrow(/valid URL/i);
    });

    // A URL carrying a path or credentials is a sign of a pasted connection
    // string, which is not what this compares against.
    // @req REQ-032
    it("rejects a URL carrying anything beyond its origin", () => {
      expect(() =>
        resolveAfrikSyncTarget({
          environment: "recette",
          activeSupabaseUrl: `${AFRIK_RECETTE_SUPABASE_URL}/rest/v1`,
        })
      ).toThrow(/origin/i);
    });
  });
});
