/**
 * Language service - business logic for the public language detail endpoint.
 */

import {
  getAfrikLanguageById,
  getAfrikSpeakingPeoples,
} from "@/lib/supabase/queries/afrik/languages";
import { getSourcesMap } from "@/lib/supabase/queries/afrik/module-zero-batch";
import { toSourceTier, type SourceTier } from "@/types/sources";

// @req REQ-136
export interface LanguageDetail {
  id: string;
  name: string;
  nameProvenance: "sourced" | "derived";
  /**
   * The identifiers and name forms the strict model declares at the root of
   * a language fiche. They were absent from this aggregate, which is why the
   * fiche printed "Donnée manquante" on chapters the corpus leaves empty
   * while staying silent about an ISO code, a Glottocode and an English name
   * filled on all 24 fiches. The aggregate was thin; the corpus was not.
   */
  isoCode639_3: string;
  glottocode: string | null;
  nameEn: string | null;
  alternateNames: string[];
  spellingAliases: string[];
  dialects: string[];
  family: {
    id: string;
    name: string;
  };
  speakingPeoples: Array<{
    id: string;
    name: string;
  }>;
  vehicularRole: string | null;
  vitalityStatus: {
    status: string;
    scale: string;
    asOf: number;
  } | null;
  sources: Array<{
    id: string;
    title: string;
    url: string | null;
    tier: SourceTier;
    notes?: string | null;
  }>;
}

/** Keeps a JSONB array that should hold strings from leaking other types. */
function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function getVitalityStatus(value: unknown): LanguageDetail["vitalityStatus"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const status = (value as Record<string, unknown>).status;
  const scale = (value as Record<string, unknown>).scale;
  const asOf = (value as Record<string, unknown>).asOf;

  if (
    typeof status !== "string" ||
    typeof scale !== "string" ||
    typeof asOf !== "number"
  ) {
    return null;
  }

  return { status, scale, asOf };
}

/**
 * Get a public language aggregate. Unknown ids return null before any
 * dependent relation or source lookup is attempted.
 */
// @req REQ-136
export async function getLanguageById(
  id: string
): Promise<LanguageDetail | null> {
  const language = await getAfrikLanguageById(id);

  if (!language) return null;

  const [speakingPeoples, sourcesMap] = await Promise.all([
    getAfrikSpeakingPeoples(id),
    getSourcesMap([id]),
  ]);
  const content = language.content;

  return {
    id: language.id,
    name: language.name,
    nameProvenance:
      content.nameProvenance === "sourced" ? "sourced" : "derived",
    // The row's primary key is the ISO 639-3 code — the loader keys on it.
    isoCode639_3: language.id,
    glottocode:
      typeof content.glottocode === "string" ? content.glottocode : null,
    nameEn: typeof content.nameEn === "string" ? content.nameEn : null,
    alternateNames: stringList(content.alternateNames),
    spellingAliases: language.spellingAliases,
    dialects: stringList(content.dialects),
    family: language.family,
    speakingPeoples,
    vehicularRole:
      typeof content.vehicularRole === "string" ? content.vehicularRole : null,
    vitalityStatus: getVitalityStatus(content.vitalityStatus),
    sources: (sourcesMap.get(id) ?? []).map((source) => ({
      ...source,
      tier: toSourceTier(source.tier),
    })),
  };
}
