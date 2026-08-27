import { createServerClient } from "../../server";
import { logger } from "@/lib/api/logger";

export interface LanguageFamilyLabel {
  id: string;
  nameFr: string;
}

/**
 * The twenty-four families as nothing but an id and a name.
 *
 * getAllAfrikLanguageFamilies selects `*`, which drags the editorial
 * `content` JSONB along — tens of KB for a large family, twenty-four of
 * them crossed and thrown away. A surface that only needs to *name* the
 * families, like the home's hero, has no business paying that.
 *
 * Degrades to an empty list rather than throwing: a hero is not worth a
 * 500, and the caller keeps the globe.
 */
// @req REQ-115
export async function getLanguageFamilyLabels(): Promise<
  LanguageFamilyLabel[]
> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("afrik_language_families")
    .select("id, name_fr")
    .order("name_fr");

  if (error) {
    logger.error("Error fetching AFRIK language family labels", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id as string,
    nameFr: row.name_fr as string,
  }));
}
