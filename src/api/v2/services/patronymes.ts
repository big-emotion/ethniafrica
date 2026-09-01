/**
 * Patronyme dossier service (ETNI-1462, REQ-133 — DEC-038's fifth corpus
 * dimension). Batches its joins per AR17 (map pattern, one query per
 * relation set, no per-record queries):
 *   1) one `afrik_patronymes` query for the name row
 *   2) one `afrik_patronyme_peoples` + one `afrik_peoples` query for its
 *      associated peoples
 *   3) one `afrik_patronyme_countries` + one `afrik_countries` query for its
 *      associated countries
 *   4) one `afrik_patronyme_persons` + one `persons` query for its bearers
 *
 * Bearer projection is deliberately narrow (id, fullName, roleCategory) —
 * DEC-040 forbids a code path that takes a family name and returns an
 * ethnic origin for a named living person, so a bearer row never selects
 * `person_peoples`/`person_countries` or `content`.
 */

import { createServerClient } from "@/lib/supabase/server";
import type {
  PatronymeBearerSummary,
  PatronymeCountrySummary,
  PatronymeNameSystem,
  PatronymePeopleSummary,
} from "@/api/v2/schemas/patronymes";

export interface PatronymeAggregate {
  id: string;
  nameMain: string;
  nameSystem: PatronymeNameSystem;
  casteOrSocialFunction: string | null;
  content: Record<string, unknown>;
  associatedPeoples: PatronymePeopleSummary[];
  associatedCountries: PatronymeCountrySummary[];
  bearers: PatronymeBearerSummary[];
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function mapPeopleRowToSummary(
  row: Record<string, unknown>
): PatronymePeopleSummary {
  const content = (row.content as Record<string, unknown>) ?? {};
  const appellations = content.appellations as
    | Record<string, unknown>
    | undefined;
  const autonym =
    typeof appellations?.selfAppellation === "string"
      ? appellations.selfAppellation
      : null;

  return {
    id: row.id as string,
    nameMain: row.name_main as string,
    autonym,
    slug: row.id as string,
  };
}

async function getAssociatedPeoples(
  supabase: ReturnType<typeof createServerClient>,
  patronymeId: string
): Promise<PatronymePeopleSummary[]> {
  const { data: links, error: linksError } = await supabase
    .from("afrik_patronyme_peoples")
    .select("people_id")
    .eq("patronyme_id", patronymeId);

  if (linksError) {
    throw new Error(
      `Failed to load patronyme-peoples links: ${linksError.message}`
    );
  }

  const peopleIds = uniqueStrings(
    ((links ?? []) as Array<{ people_id: string }>).map((l) => l.people_id)
  );
  if (peopleIds.length === 0) return [];

  const { data: peopleRows, error: peopleError } = await supabase
    .from("afrik_peoples")
    .select("id, name_main, content")
    .in("id", peopleIds);

  if (peopleError) {
    throw new Error(`Failed to load peoples: ${peopleError.message}`);
  }

  return ((peopleRows ?? []) as Array<Record<string, unknown>>).map(
    mapPeopleRowToSummary
  );
}

async function getAssociatedCountries(
  supabase: ReturnType<typeof createServerClient>,
  patronymeId: string
): Promise<PatronymeCountrySummary[]> {
  const { data: links, error: linksError } = await supabase
    .from("afrik_patronyme_countries")
    .select("country_id")
    .eq("patronyme_id", patronymeId);

  if (linksError) {
    throw new Error(
      `Failed to load patronyme-countries links: ${linksError.message}`
    );
  }

  const countryIds = uniqueStrings(
    ((links ?? []) as Array<{ country_id: string }>).map((l) => l.country_id)
  );
  if (countryIds.length === 0) return [];

  const { data: countryRows, error: countryError } = await supabase
    .from("afrik_countries")
    .select("id, name_fr")
    .in("id", countryIds);

  if (countryError) {
    throw new Error(`Failed to load countries: ${countryError.message}`);
  }

  return ((countryRows ?? []) as Array<{ id: string; name_fr: string }>).map(
    (row) => ({ id: row.id, nameFr: row.name_fr })
  );
}

async function getBearers(
  supabase: ReturnType<typeof createServerClient>,
  patronymeId: string
): Promise<PatronymeBearerSummary[]> {
  const { data: links, error: linksError } = await supabase
    .from("afrik_patronyme_persons")
    .select("person_id")
    .eq("patronyme_id", patronymeId);

  if (linksError) {
    throw new Error(
      `Failed to load patronyme-persons links: ${linksError.message}`
    );
  }

  const personIds = uniqueStrings(
    ((links ?? []) as Array<{ person_id: string }>).map((l) => l.person_id)
  );
  if (personIds.length === 0) return [];

  // DEC-040: select only the fields a bearer entry is allowed to carry.
  // Never select person_peoples/person_countries/content here.
  const { data: personRows, error: personError } = await supabase
    .from("persons")
    .select("id, full_name, role_category")
    .in("id", personIds);

  if (personError) {
    throw new Error(`Failed to load persons: ${personError.message}`);
  }

  return (
    (personRows ?? []) as Array<{
      id: string;
      full_name: string;
      role_category: string;
    }>
  ).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    roleCategory: row.role_category,
  }));
}

// @req REQ-133
export async function getPatronymeById(
  id: string
): Promise<PatronymeAggregate | null> {
  const supabase = createServerClient();

  const { data: patronymeRow, error: patronymeError } = await supabase
    .from("afrik_patronymes")
    .select("id, name_system, caste_or_social_function, content")
    .eq("id", id)
    .maybeSingle();

  if (patronymeError) {
    throw new Error(
      `Failed to load patronyme ${id}: ${patronymeError.message}`
    );
  }
  if (!patronymeRow) return null;

  const row = patronymeRow as {
    id: string;
    name_system: PatronymeNameSystem;
    caste_or_social_function: string | null;
    content: Record<string, unknown> | null;
  };
  const content = row.content ?? {};

  const [associatedPeoples, associatedCountries, bearers] = await Promise.all([
    getAssociatedPeoples(supabase, id),
    getAssociatedCountries(supabase, id),
    getBearers(supabase, id),
  ]);

  return {
    id: row.id,
    nameMain: typeof content.nameMain === "string" ? content.nameMain : "",
    nameSystem: row.name_system,
    casteOrSocialFunction: row.caste_or_social_function,
    content,
    associatedPeoples,
    associatedCountries,
    bearers,
  };
}
