/**
 * People provenance loader — writes the sources → fiche_revisions →
 * assertions fabric for the people corpus, then seeds confidence_scores
 * through `recompute_confidence`.
 *
 * The relation and migration loaders have done this since Epic 11; the people
 * path never did. `migrateAfrikToDatabase` writes `afrik_peoples.content` and
 * stops there, so 803 peoples carried a confidence score of exactly 0 and the
 * quiz rejected all 17 802 of its candidates on `no_assertion`. This closes
 * that gap for peoples.
 *
 * **Source attribution is at fiche level, deliberately.** A people fiche lists
 * its sources once, for the fiche; only `content.demography.source` names a
 * source per section, and it does so in prose ("Joshua Project (2025):
 * 14 000; recensement éthiopien 2007 (CSA): 11 500") that no reliable match
 * to a structured title exists for. Attaching the fiche's whole source set to
 * each field says what the corpus says — that this claim rests on this fiche's
 * documented sources. Fuzzy-matching prose to titles would manufacture a
 * precision the corpus does not have, which is the one thing the tier policy
 * forbids.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

import { proseOnly } from "@/lib/prose/ficheProse";
import {
  namedExonym,
  selectVerbatimFragment,
  subjectNameTokens,
} from "@/lib/quiz/proseFragment";
import {
  TEMPLATE_FIELD_PATHS,
  type QuizTemplateId,
} from "@/lib/quiz/segmentPolicy";
import {
  emptyProvenanceReport,
  writeFicheProvenance,
  type AdminClient,
  type AssertionTarget,
  type ProvenanceReport,
} from "@/lib/afrik/loaders/provenanceWriter";

const PEOPLES_ROOT = join(process.cwd(), "dataset/source/afrik/peuples");

export type { AdminClient };

export type PeopleProvenanceReport = ProvenanceReport;
export type PeopleAssertionTarget = AssertionTarget;

interface CountryShare {
  country?: string;
  countryNameFr?: string;
  percentage?: number;
  population?: number;
}

export interface PeopleFiche {
  id: string;
  nameMain?: string;
  content?: {
    appellations?: {
      mainName?: string;
      selfAppellation?: string;
      exonyms?: string[];
      whyProblematic?: string | null;
    };
    culture?: {
      majorRites?: string | null;
      spiritualities?: string | null;
      symbols?: string | null;
    };
    demography?: { distributionByCountry?: CountryShare[] };
    historicalRole?: { kingdomsOrChiefdoms?: string | null };
    languages?: { mainLanguage?: string; isoCodes?: string[] };
    organization?: { traditionalPoliticalSystem?: string | null };
    origins?: { migrationRoutes?: string[] | null };
    sources?: unknown;
    [key: string]: unknown;
  };
  languageFamilyId?: string;
  [key: string]: unknown;
}

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

/**
 * The country a people is principally present in — the same reduction
 * `resolveCurrentAnswer` performs for template T3, so a statement written here
 * and the staleness check that later reads it cannot disagree.
 */
function principalCountry(shares: CountryShare[] | undefined): string | null {
  if (!Array.isArray(shares) || shares.length === 0) return null;
  const largest = shares.reduce((widest, current) =>
    (current.population ?? current.percentage ?? 0) >
    (widest.population ?? widest.percentage ?? 0)
      ? current
      : widest
  );
  return nonEmpty(largest.countryNameFr) ?? nonEmpty(largest.country);
}

/**
 * The prose rubrics the inversion templates draw a stimulus from, paired with
 * the template that reads each one.
 *
 * The statement written here is the *selected fragment*, not the whole rubric:
 * an assertion records the claim a question will actually make, and the
 * question only ever shows the sentences that do not name their own subject.
 */
const INVERSION_RUBRICS: ReadonlyArray<{
  templateId: QuizTemplateId;
  read: (
    content: NonNullable<PeopleFiche["content"]>
  ) => string | string[] | null | undefined;
}> = [
  { templateId: "T6", read: (c) => proseOnly(c.culture?.majorRites) },
  { templateId: "T7", read: (c) => proseOnly(c.culture?.spiritualities) },
  { templateId: "T8", read: (c) => proseOnly(c.culture?.symbols) },
  {
    templateId: "T9",
    read: (c) => proseOnly(c.historicalRole?.kingdomsOrChiefdoms),
  },
  {
    templateId: "T10",
    read: (c) => proseOnly(c.organization?.traditionalPoliticalSystem),
  },
  { templateId: "T11", read: (c) => proseOnly(c.origins?.migrationRoutes) },
];

/**
 * The claims a fiche actually makes, among the field paths the quiz and the
 * games read.
 *
 * A field the fiche leaves empty yields no assertion. Writing one anyway would
 * record a claim nobody made and hand `recompute_confidence` a source count
 * the fiche has not earned.
 *
 * The paths come from `TEMPLATE_FIELD_PATHS` rather than being spelled again
 * here. They were duplicated as literals until the inversion templates
 * arrived, and a path written on this side that no template reads on the other
 * produces an assertion nothing ever uses — an invisible failure, since the
 * sweep would simply report `no_assertion` for a path that exists.
 */
// @req REQ-092
export function peopleAssertionTargets(
  people: PeopleFiche
): PeopleAssertionTarget[] {
  const content = people.content ?? {};
  const targets: PeopleAssertionTarget[] = [];

  const family = nonEmpty(people.languageFamilyId);
  if (family)
    targets.push({ fieldPath: TEMPLATE_FIELD_PATHS.T1, statement: family });

  const autonym = nonEmpty(content.appellations?.selfAppellation);
  if (autonym) {
    targets.push({ fieldPath: TEMPLATE_FIELD_PATHS.T2, statement: autonym });
  }

  const country = principalCountry(content.demography?.distributionByCountry);
  if (country) {
    targets.push({ fieldPath: TEMPLATE_FIELD_PATHS.T3, statement: country });
  }

  const language = nonEmpty(content.languages?.mainLanguage);
  if (language) {
    targets.push({ fieldPath: TEMPLATE_FIELD_PATHS.T4, statement: language });
  }

  const isoCode = nonEmpty(content.languages?.isoCodes?.[0]);
  if (isoCode) {
    targets.push({ fieldPath: TEMPLATE_FIELD_PATHS.T5, statement: isoCode });
  }

  const exonyms = content.appellations?.exonyms ?? [];
  const tokens = subjectNameTokens({
    subjectName: {
      autonym: content.appellations?.mainName ?? people.nameMain ?? "",
    },
    selfAppellation: content.appellations?.selfAppellation ?? "",
    exonyms,
  });

  for (const rubric of INVERSION_RUBRICS) {
    const fragment = selectVerbatimFragment(rubric.read(content), tokens);
    if (fragment) {
      targets.push({
        fieldPath: TEMPLATE_FIELD_PATHS[rubric.templateId],
        statement: fragment,
      });
    }
  }

  const contested = namedExonym(content.appellations?.whyProblematic, exonyms);
  if (contested) {
    targets.push({ fieldPath: TEMPLATE_FIELD_PATHS.T12, statement: contested });
  }

  return targets;
}

/**
 * Writes one people's provenance through the shared Module 0 writer.
 *
 * Everything below the claims — sources, revision, assertions, the confidence
 * reseed and the idempotence rules that make a re-run safe — lives in
 * `provenanceWriter` and is shared with countries. What stays here is the only
 * part that is about peoples: which claims a people fiche makes.
 */
async function writePeopleProvenance(
  supabase: AdminClient,
  people: PeopleFiche,
  report: PeopleProvenanceReport
): Promise<void> {
  await writeFicheProvenance(
    supabase,
    {
      entityType: "people",
      entityId: people.id,
      snapshot: people,
      rawSources: people.content?.sources,
      targets: peopleAssertionTargets(people),
    },
    report
  );
}

/** Every `dataset/source/afrik/peuples/<FLG_*>/PPL_*.json` fiche, in corpus order. */
// @req REQ-092
export function loadAllPeopleFiles(root: string = PEOPLES_ROOT): PeopleFiche[] {
  const peoples: PeopleFiche[] = [];
  for (const dir of readdirSync(root)) {
    const familyDir = join(root, dir);
    if (!statSync(familyDir).isDirectory()) continue;
    for (const file of readdirSync(familyDir)) {
      if (!file.endsWith(".json")) continue;
      const parsed = JSON.parse(
        readFileSync(join(familyDir, file), "utf-8")
      ) as PeopleFiche;
      if (parsed?.id) peoples.push(parsed);
    }
  }
  return peoples;
}

/**
 * Writes sources → fiche_revisions → assertions for every people fiche and
 * seeds confidence_scores.
 *
 * This raises confidence from zero; it does **not** make a fiche quiz-eligible
 * on its own. FR65 also requires `last_human_audit_at`, and the score is
 * capped at 0.80 without one — an audit is an editorial act and no loader may
 * forge it.
 */
// @req REQ-092
export async function loadPeopleProvenance(
  supabase: AdminClient,
  peoples: PeopleFiche[] = loadAllPeopleFiles()
): Promise<PeopleProvenanceReport> {
  const report = emptyProvenanceReport();

  for (const people of peoples) {
    await writePeopleProvenance(supabase, people, report);
  }

  return report;
}
