/**
 * Language CSV loader — the 71 Glottolog-sourced languages declared in
 * `langue_par_famille.csv`, plus the languages a people fiche declares by
 * ISO 639-3 code that the CSV does not carry.
 *
 * Two provenances come out of this and stay distinguishable for the life of
 * the row: a CSV language carries its Glottolog source at the official tier
 * and an authoritative name; a language known only because a people declared
 * its code carries a derived name and no source at all. Collapsing the two
 * would let an unsourced guess pass for the corpus's own claim, which is the
 * one thing the Source Tier Policy forbids.
 */
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";
import { loadLanguageFiches } from "@/lib/afrik/loaders/languageFicheLoader";
import type { People } from "@/types/afrik";
import type { SourceTier } from "@/types/sources";

const CSV_PATH = join(
  process.cwd(),
  "dataset/source/afrik/famille_linguistique/langue_par_famille.csv"
);

interface LanguageCsvRow {
  id_langue: string;
  nom_langue: string;
  code_iso_639_3: string;
  id_famille: string;
  glottocode: string;
  source_title: string;
  source_url: string;
  source_doi?: string;
  source_tier: string;
  source_access_date?: string;
  source_notes?: string;
}

export interface LanguageSource {
  title: string;
  url: string | null;
  tier: SourceTier;
  notes?: string;
}

export type LanguageNameProvenance = "sourced" | "derived";

export interface LanguageRecord {
  id: string;
  name: string;
  nameFr?: string;
  familyId?: string;
  nameProvenance: LanguageNameProvenance;
  glottocode?: string | null;
  source?: LanguageSource;
  sources?: LanguageSource[];
  spellingAliases?: string[]; // Alternate spellings of the same name (DEC-034)
  nameEn?: string;
  alternateNames?: string[];
  peoples?: Array<{ name: string; peopleId?: string }>;
  vehicularRole?: string | null;
  dialects?: string[];
  vitalityStatus?: {
    status: string;
    scale: string;
    asOf: number;
  } | null;
}

/** The CSV's `source_tier=1` is the only value the corpus declares today; anything else is not the official tier the corpus asserts. */
function csvTier(value: string): "official" | null {
  return value === "1" ? "official" : null;
}

/** The 71 languages `langue_par_famille.csv` declares, each carrying its Glottolog source at the official tier. */
// @req REQ-136
export function loadLanguagesFromCsv(
  csvPath: string = CSV_PATH
): LanguageRecord[] {
  const rows: LanguageCsvRow[] = parse(readFileSync(csvPath, "utf-8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return rows.flatMap((row) => {
    const tier = csvTier(row.source_tier);
    if (!tier) return [];

    return [
      {
        id: row.code_iso_639_3,
        name: row.nom_langue,
        familyId: row.id_famille,
        nameProvenance: "sourced" as const,
        ...(row.glottocode ? { glottocode: row.glottocode } : {}),
        source: {
          title: `${row.source_title} - ${row.nom_langue}`,
          url: row.source_url,
          tier,
          ...(row.source_notes ? { notes: row.source_notes } : {}),
        },
      },
    ];
  });
}

/** Anything after one of these opens a gloss, not the language's name — "Ju|'hoan (Ju|'hoansi)" names the language once. */
const GLOSS_OPENERS = /[(;/,]/;

function readableName(mainLanguage: string | undefined): string | null {
  if (!mainLanguage) return null;
  const name = mainLanguage.split(GLOSS_OPENERS)[0].trim();
  return name.length > 0 ? name : null;
}

/**
 * The languages known only because a people fiche declares their ISO 639-3
 * code — every such code, minus the ones a sourced CSV row or language fiche
 * already carries. This only adds languages the sourced corpus does not name.
 */
// @req REQ-136
export function deriveLanguagesFromPeoples(
  peoples: People[],
  knownCodes: ReadonlySet<string>
): LanguageRecord[] {
  const derivedCodes = new Set<string>();
  for (const people of peoples) {
    for (const code of people.content?.languages?.isoCodes ?? []) {
      if (!knownCodes.has(code)) derivedCodes.add(code);
    }
  }

  return [...derivedCodes].sort().map((code) => {
    const declaring = peoples.find((people) =>
      (people.content?.languages?.isoCodes ?? []).includes(code)
    );

    return {
      id: code,
      name: readableName(declaring?.content?.languages?.mainLanguage) ?? code,
      familyId: declaring?.languageFamilyId,
      nameProvenance: "derived" as const,
    };
  });
}

/**
 * The union of the CSV, strict language fiches, and people-declared languages.
 * A fiche replaces an overlapping record because it is the richer source; the
 * ISO-keyed map keeps that precedence idempotent and duplicate-free.
 */
// @req REQ-136
export function loadAllLanguages(
  peoples: People[],
  csvPath: string = CSV_PATH,
  fichesPath?: string
): LanguageRecord[] {
  const csvLanguages = loadLanguagesFromCsv(csvPath);
  const ficheLanguages = loadLanguageFiches(fichesPath);
  const languagesById = new Map(
    csvLanguages.map((language) => [language.id, language])
  );

  for (const language of ficheLanguages) {
    languagesById.set(language.id, language);
  }

  const knownCodes = new Set(languagesById.keys());
  const derivedLanguages = deriveLanguagesFromPeoples(peoples, knownCodes);
  for (const language of derivedLanguages) {
    languagesById.set(language.id, language);
  }

  return [...languagesById.values()];
}
