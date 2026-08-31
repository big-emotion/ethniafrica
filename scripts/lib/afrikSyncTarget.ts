/**
 * Which database the AFRIK corpus is written to.
 *
 * This replaces `afrikMigrationTarget.ts`, which conflated the two
 * environments in three separate ways and, as a result, made every production
 * deploy write the corpus into recette:
 *
 * 1. Its targets were named `staging` and `production`, while the rest of the
 *    repository — and the Vercel environments — say `recette` and `production`.
 *    Two names for one environment is half of how they got confused.
 * 2. Its `AFRIK_PRODUCTION_SUPABASE_URL` constant held the **recette** project
 *    ref, because a Supabase project has exactly one environment and Supabase
 *    labels it "production" regardless of the application it serves.
 * 3. Because that constant was checked in rather than configured, the guard
 *    `--target=production` *enforced* writing to recette: it threw unless the
 *    active URL equalled the recette ref.
 *
 * So the module that existed to prevent writing to the wrong database was the
 * thing guaranteeing it. The distinction is now explicit:
 *
 * | Environment  | Supabase project        | Where its URL comes from            |
 * | ------------ | ----------------------- | ----------------------------------- |
 * | `recette`    | `shmrjtnfbqzceovroqjj`  | known, checked in below             |
 * | `production` | not in this repository  | `AFRIK_PRODUCTION_SUPABASE_URL` env |
 *
 * Production has **no default**. A default is a way to write to the wrong
 * database by forgetting to set something, which is exactly what happened.
 */

/** The two application environments. Not "staging" — that name is retired. */
export type AfrikSyncEnvironment = "recette" | "production";

/**
 * The Supabase project backing the **recette** application. Checked in because
 * it is not a secret and because pinning it is what stops a mistyped
 * `NEXT_PUBLIC_SUPABASE_URL` from quietly loading the corpus somewhere else.
 */
export const AFRIK_RECETTE_SUPABASE_URL =
  "https://shmrjtnfbqzceovroqjj.supabase.co";

export interface AfrikSyncTargetInput {
  /** The `--target=` value. */
  environment?: string;
  /** `NEXT_PUBLIC_SUPABASE_URL` as the process actually sees it. */
  activeSupabaseUrl?: string;
  /** `AFRIK_PRODUCTION_SUPABASE_URL`. Required to resolve production. */
  productionSupabaseUrl?: string;
}

export interface ResolvedAfrikSyncTarget {
  environment: AfrikSyncEnvironment;
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
    throw new Error(
      `${label} must be an HTTP(S) origin with no path or credentials — got ${value}`
    );
  }

  return url.origin;
}

export function resolveAfrikSyncTarget(
  input: AfrikSyncTargetInput
): ResolvedAfrikSyncTarget {
  if (!input.environment?.trim()) {
    throw new Error(
      "Target environment is required — pass --target=recette or --target=production"
    );
  }

  if (input.environment === "staging") {
    throw new Error(
      'Target "staging" is retired. The environment it named is called "recette": pass --target=recette.'
    );
  }

  if (input.environment !== "recette" && input.environment !== "production") {
    throw new Error(
      `Target environment must be exactly "recette" or "production" — got "${input.environment}"`
    );
  }

  const activeSupabaseUrl = parseSupabaseOrigin(
    "Active Supabase URL",
    input.activeSupabaseUrl
  );

  if (input.environment === "recette") {
    if (activeSupabaseUrl !== AFRIK_RECETTE_SUPABASE_URL) {
      throw new Error(
        `Refusing to sync: --target=recette, but NEXT_PUBLIC_SUPABASE_URL is ${activeSupabaseUrl}, not the recette project (${AFRIK_RECETTE_SUPABASE_URL}).`
      );
    }
    return { environment: "recette", supabaseUrl: activeSupabaseUrl };
  }

  const productionSupabaseUrl = parseSupabaseOrigin(
    "AFRIK_PRODUCTION_SUPABASE_URL",
    input.productionSupabaseUrl
  );

  // Configuring production as the recette project would reinstate the original
  // defect through the back door, so it is refused outright.
  if (productionSupabaseUrl === AFRIK_RECETTE_SUPABASE_URL) {
    throw new Error(
      `AFRIK_PRODUCTION_SUPABASE_URL cannot be the recette project (${AFRIK_RECETTE_SUPABASE_URL}). Set it to the Supabase project backing the production application.`
    );
  }

  if (activeSupabaseUrl !== productionSupabaseUrl) {
    // Naming the recette project explicitly, because pointing at it while
    // declaring production is the mistake this module exists to catch — and
    // the one the previous guard actively enforced.
    const because =
      activeSupabaseUrl === AFRIK_RECETTE_SUPABASE_URL
        ? " That is the recette project: a production sync must never write there."
        : "";
    throw new Error(
      `Refusing to sync: --target=production, but NEXT_PUBLIC_SUPABASE_URL is ${activeSupabaseUrl}, not the configured production project (${productionSupabaseUrl}).${because}`
    );
  }

  return { environment: "production", supabaseUrl: activeSupabaseUrl };
}
