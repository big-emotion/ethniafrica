import { logger } from "@/lib/api/logger";
import { createServerClient } from "@/lib/supabase/server";
import type { ProvenancedValue } from "./derivedFicheFact";
import type { AfrikLanguageDetail } from "./languages";

export interface LanguageDerivedFacts {
  dialects: ProvenancedValue<string[]>;
  vehicularRole: ProvenancedValue<string[]>;
}

interface PeopleLanguageContent {
  isoCodes?: unknown;
  dialects?: unknown;
  vehicularRole?: unknown;
}

interface PeopleRow {
  id: string;
  content: { languages?: PeopleLanguageContent } | null;
}

const PAGE_SIZE = 500;
const MAX_JOIN_PAGES = 40;

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      )
    : [];
}

async function speakingPeopleIds(
  supabase: ReturnType<typeof createServerClient>,
  languageId: string
): Promise<string[]> {
  const ids = new Set<string>();

  for (let page = 0; page < MAX_JOIN_PAGES; page++) {
    const start = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("afrik_people_languages")
      .select("people_id")
      .eq("language_id", languageId)
      .order("people_id")
      .range(start, start + PAGE_SIZE - 1);

    if (error) {
      logger.error(
        `Error fetching people links for language ${languageId}`,
        error
      );
      throw error;
    }

    const rows = data ?? [];
    for (const row of rows) ids.add(row.people_id);
    if (rows.length < PAGE_SIZE) return [...ids];
  }

  throw new Error(
    `People links for language ${languageId} exceed ${MAX_JOIN_PAGES} pages`
  );
}

async function speakingPeoples(
  supabase: ReturnType<typeof createServerClient>,
  languageId: string
): Promise<PeopleRow[]> {
  const ids = await speakingPeopleIds(supabase, languageId);
  const rows: PeopleRow[] = [];

  for (let start = 0; start < ids.length; start += PAGE_SIZE) {
    const batch = ids.slice(start, start + PAGE_SIZE);
    const { data, error } = await supabase
      .from("afrik_peoples")
      .select("id, content")
      .in("id", batch)
      .range(0, batch.length - 1);

    if (error) {
      logger.error(`Error fetching peoples for language ${languageId}`, error);
      throw error;
    }
    rows.push(...((data ?? []) as PeopleRow[]));
  }

  return rows.sort((a, b) => a.id.localeCompare(b.id));
}

/** A language declaration wins; otherwise use only peoples that declare its ISO code. */
// @req REQ-119
export async function getLanguageDerivedFacts(
  language: Pick<AfrikLanguageDetail, "id" | "content">
): Promise<LanguageDerivedFacts> {
  const declaredDialects = strings(language.content.dialects);
  const declaredRole =
    typeof language.content.vehicularRole === "string" &&
    language.content.vehicularRole.trim()
      ? [language.content.vehicularRole]
      : [];

  if (declaredDialects.length > 0 && declaredRole.length > 0) {
    return {
      dialects: { value: declaredDialects, provenance: "declared" },
      vehicularRole: { value: declaredRole, provenance: "declared" },
    };
  }

  const peoples = await speakingPeoples(createServerClient(), language.id);
  const dialects = new Set<string>();
  const dialectSources = new Set<string>();
  const roles = new Set<string>();
  const roleSources = new Set<string>();

  for (const people of peoples) {
    const content = people.content?.languages;
    if (!strings(content?.isoCodes).includes(language.id)) continue;

    if (declaredDialects.length === 0) {
      const values = strings(content?.dialects);
      if (values.length > 0) dialectSources.add(people.id);
      for (const value of values) dialects.add(value);
    }

    if (declaredRole.length === 0) {
      const value = content?.vehicularRole;
      if (typeof value === "string" && value.trim()) {
        roles.add(value);
        roleSources.add(people.id);
      }
    }
  }

  return {
    dialects:
      declaredDialects.length > 0
        ? { value: declaredDialects, provenance: "declared" }
        : dialects.size > 0
          ? {
              value: [...dialects],
              provenance: "derived",
              from: [...dialectSources],
            }
          : { value: [], provenance: "missing" },
    vehicularRole:
      declaredRole.length > 0
        ? { value: declaredRole, provenance: "declared" }
        : roles.size > 0
          ? { value: [...roles], provenance: "derived", from: [...roleSources] }
          : { value: [], provenance: "missing" },
  };
}
