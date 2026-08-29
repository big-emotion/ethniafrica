/**
 * Country provenance loader — the prerequisite for asking a question about a
 * country at all.
 *
 * `migrateAfrikToDatabase` writes `afrik_countries` and stops there: five
 * columns, no assertion, no confidence score. FR66 refuses a question whose
 * field path has no assertion behind it and `isQuizEligible` fails closed on a
 * missing score, so before this loader ran, every country template rejected
 * every one of its 54 candidates on `no_assertion`. The templates were never
 * the blocker; the fabric under them was missing.
 *
 * **Source attribution is at fiche level, as it is for peoples.** A country
 * fiche lists its sources once, for the fiche. Attaching the whole set to each
 * claim says what the corpus says — that this claim rests on this fiche's
 * documented sources — where matching a claim to one particular source would
 * manufacture a precision the corpus does not have.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

import { TEMPLATE_FIELD_PATHS } from "@/lib/quiz/segmentPolicy";
import {
  selectVerbatimFragment,
  subjectNameTokens,
} from "@/lib/quiz/proseFragment";
import {
  emptyProvenanceReport,
  writeFicheProvenance,
  type AdminClient,
  type AssertionTarget,
  type ProvenanceReport,
} from "@/lib/afrik/loaders/provenanceWriter";

const COUNTRIES_ROOT = join(process.cwd(), "dataset/source/afrik/pays");

export interface CountryFiche {
  id: string;
  nameFr?: string;
  nameOfficial?: string;
  etymology?: string | null;
  nameOriginActor?: string | null;
  content?: {
    historicalNames?: { colonization?: string | null };
    historicalFacts?: { precolonial?: string | null };
    culture?: { dominantReligions?: string | null };
    kingdoms?: Array<{ name?: string }>;
    sources?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

/** The prose rubrics a country inversion round quotes, and the template reading each. */
const INVERSION_RUBRICS: ReadonlyArray<{
  templateId: "T13" | "T14" | "T15" | "T17" | "T18";
  read: (fiche: CountryFiche) => string | null | undefined;
}> = [
  { templateId: "T13", read: (f) => f.etymology },
  { templateId: "T14", read: (f) => f.nameOriginActor },
  { templateId: "T15", read: (f) => f.content?.historicalNames?.colonization },
  { templateId: "T17", read: (f) => f.content?.historicalFacts?.precolonial },
  { templateId: "T18", read: (f) => f.content?.culture?.dominantReligions },
];

/**
 * The claims a country fiche makes, among the field paths its templates read.
 *
 * The statement of an inversion target is the *selected fragment*, not the
 * whole rubric: a question only ever shows the sentences that do not name the
 * country, and an assertion records the claim that gets made rather than the
 * paragraph it came from.
 *
 * A country names itself in its own etymology far more often than a people does
 * in its rites — « Le nom "Comores" vient de l'arabe… » — so this drops more
 * than its people counterpart, and that is the rule working rather than
 * failing.
 */
// @req REQ-121
export function countryAssertionTargets(
  country: CountryFiche
): AssertionTarget[] {
  const targets: AssertionTarget[] = [];
  const tokens = subjectNameTokens({
    subjectName: { autonym: country.nameFr ?? "" },
    selfAppellation: country.nameOfficial ?? "",
    exonyms: [],
  });

  for (const rubric of INVERSION_RUBRICS) {
    const fragment = selectVerbatimFragment(rubric.read(country), tokens);
    if (fragment) {
      targets.push({
        fieldPath: TEMPLATE_FIELD_PATHS[rubric.templateId],
        statement: fragment,
      });
    }
  }

  // T16 answers with a kingdom's name, so its claim is that name — the one
  // country target whose statement is an atom rather than a quotation.
  const kingdom = (country.content?.kingdoms ?? [])
    .map((entry) => nonEmpty(entry?.name))
    .find(Boolean);
  if (kingdom) {
    targets.push({ fieldPath: TEMPLATE_FIELD_PATHS.T16, statement: kingdom });
  }

  return targets;
}

/** Every `dataset/source/afrik/pays/<ISO3>.json` fiche, in corpus order. */
// @req REQ-121
export function loadAllCountryFiles(
  root: string = COUNTRIES_ROOT
): CountryFiche[] {
  return readdirSync(root)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map(
      (file) =>
        JSON.parse(readFileSync(join(root, file), "utf8")) as CountryFiche
    )
    .filter((fiche) => Boolean(fiche.id));
}

// @req REQ-121
export async function loadCountryProvenance(
  supabase: AdminClient,
  countries: CountryFiche[]
): Promise<ProvenanceReport> {
  const report = emptyProvenanceReport();

  for (const country of countries) {
    await writeFicheProvenance(
      supabase,
      {
        entityType: "country",
        entityId: country.id,
        snapshot: country,
        rawSources: country.content?.sources,
        targets: countryAssertionTargets(country),
      },
      report
    );
  }

  return report;
}
