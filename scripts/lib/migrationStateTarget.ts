/**
 * Which database `check:migration-state` reads.
 *
 * The gate could only ever reach recette, because it read
 * `NEXT_PUBLIC_SUPABASE_URL` and nothing else. Production's schema state was
 * therefore recorded by hand in `docs/runbooks/migration-state.md` and went
 * stale the way a hand-kept ledger does: at the 4.1.0 release it still said
 * production stood at `049` while thirty-two migrations had landed on recette,
 * including the ones that create `afrik_patronymes`, `persons` and every
 * unified-search RPC. Nothing could measure the claim, so nothing contradicted
 * it.
 *
 * It is measurable. Migration `042` added `applied_migrations()`, a
 * SECURITY DEFINER function granted to `service_role`, which PostgREST exposes
 * — so the ledger of any project is one authenticated POST away. The only
 * thing missing was somewhere to say *which* project.
 *
 * Production has **no default**, for the reason `afrikSyncTarget.ts` gives at
 * length: a default is how you reach the wrong database by forgetting to set
 * something, and on this repository that has already happened once.
 */

export type MigrationStateEnvironment = "recette" | "production";

export interface MigrationStateCredentials {
  environment: MigrationStateEnvironment;
  supabaseUrl: string;
  serviceRoleKey: string;
}

export interface MigrationStateTargetInput {
  /** The `--target=` value. Absent means recette, which is the CI default. */
  environment?: string;
  recetteUrl?: string;
  recetteKey?: string;
  productionUrl?: string;
  productionKey?: string;
}

/**
 * Resolve the credentials for the requested environment, or throw saying
 * exactly which variable is missing. Never falls back to the other
 * environment's credentials: reporting recette's ledger under production's
 * name is the failure this whole module exists to prevent.
 */
export function resolveMigrationStateTarget(
  input: MigrationStateTargetInput
): MigrationStateCredentials {
  const environment = (input.environment ?? "recette").trim();

  if (environment !== "recette" && environment !== "production") {
    throw new Error(
      `Unknown --target "${environment}". Expected "recette" or "production".`
    );
  }

  if (environment === "production") {
    if (!input.productionUrl || !input.productionKey) {
      throw new Error(
        "--target=production needs PRODUCTION_SUPABASE_URL and " +
          "PRODUCTION_SUPABASE_SERVICE_ROLE_KEY. Refusing to fall back to the " +
          "recette credentials and report one database under the other's name."
      );
    }
    return {
      environment,
      supabaseUrl: input.productionUrl,
      serviceRoleKey: input.productionKey,
    };
  }

  if (!input.recetteUrl || !input.recetteKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. " +
        "Refusing to report a database this run never reached."
    );
  }

  return {
    environment,
    supabaseUrl: input.recetteUrl,
    serviceRoleKey: input.recetteKey,
  };
}
