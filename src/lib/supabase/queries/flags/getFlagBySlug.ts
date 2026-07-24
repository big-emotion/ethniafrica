import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";
import type { FlagRow } from "@/types/module-zero";

export interface ContributorProfile {
  display_name: string | null;
  public: boolean | null;
}

export interface AssertionContext {
  field_path: string | null;
  statement: string | null;
}

export interface FlagPublicRecord {
  flag: FlagRow & { created_at: string };
  contributor: ContributorProfile | null;
  assertion: AssertionContext | null;
}

/**
 * Fetch a public flag row by its Crockford base32 public_slug.
 *
 * Returns null if the flag is not found or if a DB error occurs.
 * Joins contributor profile and assertion context in two subsequent
 * queries; errors in those secondary fetches are soft-logged and default
 * to null so the page can still render with "contributeur anonyme".
 */
export async function getFlagBySlug(
  slug: string
): Promise<FlagPublicRecord | null> {
  const supabase = createServerClient();

  const { data: flag, error } = await supabase
    .from("flags")
    .select("*")
    .eq("public_slug", slug)
    .maybeSingle();

  if (error) {
    logger.error("Error fetching flag by public_slug", { slug, error });
    return null;
  }
  if (!flag) return null;

  let contributor: ContributorProfile | null = null;
  if (flag.contributor_id) {
    const { data: profile, error: profileError } = await supabase
      .from("contributor_profiles")
      .select("display_name, public")
      .eq("id", flag.contributor_id)
      .maybeSingle();

    if (profileError) {
      logger.error("Error fetching contributor profile", {
        contributor_id: flag.contributor_id,
        error: profileError,
      });
    } else if (profile) {
      contributor = profile;
    }
  }

  let assertion: AssertionContext | null = null;
  if (flag.assertion_id) {
    const { data: assertionRow, error: assertionError } = await supabase
      .from("assertions")
      .select("field_path, statement")
      .eq("id", flag.assertion_id)
      .maybeSingle();

    if (assertionError) {
      logger.error("Error fetching assertion context", {
        assertion_id: flag.assertion_id,
        error: assertionError,
      });
    } else if (assertionRow) {
      assertion = assertionRow;
    }
  }

  return { flag, contributor, assertion };
}
