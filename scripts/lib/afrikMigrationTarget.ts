// KNOWN MISNAMED. This ref is the project backing the *recette* application, not production.
// The name comes from Supabase's own labelling: a project has exactly one environment and
// Supabase calls it "production", so the label describes the project, never the application
// environment it serves. The production application is served by a different project whose ref
// is not recorded in this repository.
//
// The name is kept because `--target=production` and
// .github/workflows/production-data-sync.yml both resolve through it, and repointing them is
// an environment decision, not a rename. See docs/runbooks/migration-state.md.
export const AFRIK_PRODUCTION_SUPABASE_URL =
  "https://shmrjtnfbqzceovroqjj.supabase.co";

export type AfrikMigrationTarget = "staging" | "production";

export interface AfrikMigrationTargetInput {
  target?: string;
  activeSupabaseUrl?: string;
  expectedStagingSupabaseUrl?: string;
}

export interface ValidatedAfrikMigrationTarget {
  target: AfrikMigrationTarget;
  supabaseUrl: string;
}

function parseSupabaseOrigin(label: string, value?: string): string {
  if (!value?.trim()) {
    throw new Error(`${label} is required`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }

  const hasSupportedProtocol =
    url.protocol === "https:" || url.protocol === "http:";
  const isOriginOnly =
    !url.username &&
    !url.password &&
    url.pathname === "/" &&
    !url.search &&
    !url.hash;

  if (!hasSupportedProtocol || !isOriginOnly) {
    throw new Error(`${label} must be an HTTP(S) origin`);
  }

  return url.origin;
}

export function validateAfrikMigrationTarget(
  input: AfrikMigrationTargetInput
): ValidatedAfrikMigrationTarget {
  if (!input.target) {
    throw new Error("Migration target identity is required");
  }

  if (input.target !== "staging" && input.target !== "production") {
    throw new Error(
      'Migration target must be exactly "staging" or "production"'
    );
  }

  const activeSupabaseUrl = parseSupabaseOrigin(
    "Active Supabase URL",
    input.activeSupabaseUrl
  );

  if (input.target === "production") {
    if (activeSupabaseUrl !== AFRIK_PRODUCTION_SUPABASE_URL) {
      throw new Error(
        "Active Supabase URL does not match the locked production project"
      );
    }

    return {
      target: "production",
      supabaseUrl: activeSupabaseUrl,
    };
  }

  const expectedStagingSupabaseUrl = parseSupabaseOrigin(
    "Configured staging Supabase URL",
    input.expectedStagingSupabaseUrl
  );

  if (activeSupabaseUrl !== expectedStagingSupabaseUrl) {
    throw new Error(
      "Active Supabase URL does not match the configured staging URL"
    );
  }

  return {
    target: "staging",
    supabaseUrl: activeSupabaseUrl,
  };
}
