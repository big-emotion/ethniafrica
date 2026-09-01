/**
 * Loads the strict language fiches from `dataset/source/afrik/langues` into
 * the same record shape as the CSV and people-derived language sources.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

import type {
  LanguageRecord,
  LanguageSource,
} from "@/lib/afrik/loaders/languageCsvLoader";

const LANGUAGE_FICHES_PATH = join(
  process.cwd(),
  "dataset/source/afrik/langues"
);

interface LanguageFiche {
  id: string;
  isoCode639_3: string;
  glottocode?: string | null;
  nameFr: string;
  nameEn?: string;
  alternateNames?: string[];
  spellingAliases?: string[];
  familyId?: string;
  peoples?: Array<{ name: string; peopleId?: string }>;
  content?: {
    vehicularRole?: string | null;
    dialects?: string[];
    vitalityStatus?: {
      status: string;
      scale: string;
      asOf: number;
    } | null;
    sources?: LanguageSource[];
  };
}

function toLanguageRecord(fiche: LanguageFiche): LanguageRecord {
  return {
    id: fiche.isoCode639_3,
    name: fiche.nameFr,
    nameFr: fiche.nameFr,
    familyId: fiche.familyId,
    nameProvenance: "sourced",
    glottocode: fiche.glottocode,
    spellingAliases: fiche.spellingAliases ?? [],
    nameEn: fiche.nameEn,
    alternateNames: fiche.alternateNames ?? [],
    peoples: fiche.peoples ?? [],
    vehicularRole: fiche.content?.vehicularRole,
    dialects: fiche.content?.dialects ?? [],
    vitalityStatus: fiche.content?.vitalityStatus,
    sources: fiche.content?.sources ?? [],
  };
}

/** Every language fiche, sorted by filename for deterministic migrations. */
// @req REQ-136
export function loadLanguageFiches(
  fichesPath: string = LANGUAGE_FICHES_PATH
): LanguageRecord[] {
  return readdirSync(fichesPath)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const fiche = JSON.parse(
        readFileSync(join(fichesPath, file), "utf-8")
      ) as LanguageFiche;
      return toLanguageRecord(fiche);
    });
}
