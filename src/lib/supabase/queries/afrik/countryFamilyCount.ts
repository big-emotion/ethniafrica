import { createServerClient } from "@/lib/supabase/server";
import { getAfrikPeopleIdsInCountry } from "./peoples";

/** Count the distinct families of every resident people, not only major ones. */
// @req REQ-151
export async function getCountryFamilyCount(
  countryId: string
): Promise<number | null> {
  const peopleIds = await getAfrikPeopleIdsInCountry(countryId);
  if (peopleIds.length === 0) return null;

  const { data, error } = await createServerClient()
    .from("afrik_peoples")
    .select("language_family_id")
    .in("id", peopleIds);
  if (error) throw error;

  const families = new Set(
    (data ?? []).map((row) => row.language_family_id).filter(Boolean)
  );
  return families.size || null;
}
