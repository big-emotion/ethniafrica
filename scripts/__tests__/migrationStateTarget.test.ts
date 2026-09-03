import { describe, expect, it } from "vitest";

import { resolveMigrationStateTarget } from "../lib/migrationStateTarget";

const RECETTE = {
  recetteUrl: "https://shmrjtnfbqzceovroqjj.supabase.co",
  recetteKey: "recette-service-role",
};
const PRODUCTION = {
  productionUrl: "https://jajggbeimfudpzcxytbb.supabase.co",
  productionKey: "production-service-role",
};

describe("resolveMigrationStateTarget", () => {
  // @req REQ-110
  it("defaults to recette, which is what CI reads", () => {
    expect(resolveMigrationStateTarget({ ...RECETTE, ...PRODUCTION })).toEqual({
      environment: "recette",
      supabaseUrl: RECETTE.recetteUrl,
      serviceRoleKey: RECETTE.recetteKey,
    });
  });

  // @req REQ-110
  it("reads production when asked for it", () => {
    expect(
      resolveMigrationStateTarget({
        environment: "production",
        ...RECETTE,
        ...PRODUCTION,
      })
    ).toEqual({
      environment: "production",
      supabaseUrl: PRODUCTION.productionUrl,
      serviceRoleKey: PRODUCTION.productionKey,
    });
  });

  /**
   * The failure that matters: falling back would report recette's ledger under
   * production's name, which is precisely the mistake the hand-kept runbook
   * made for thirty-two migrations.
   */
  // @req REQ-110
  it("refuses to answer for production using the recette credentials", () => {
    expect(() =>
      resolveMigrationStateTarget({ environment: "production", ...RECETTE })
    ).toThrow(/PRODUCTION_SUPABASE_URL/);
  });

  // @req REQ-110
  it("refuses to answer for recette with no credentials at all", () => {
    expect(() => resolveMigrationStateTarget({ ...PRODUCTION })).toThrow(
      /never reached/
    );
  });

  // @req REQ-110
  it("rejects an environment it does not know rather than guessing", () => {
    expect(() =>
      resolveMigrationStateTarget({ environment: "staging", ...RECETTE })
    ).toThrow(/Unknown --target "staging"/);
  });
});
