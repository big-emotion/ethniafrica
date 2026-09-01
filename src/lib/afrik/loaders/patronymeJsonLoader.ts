/**
 * Patronyme JSON loader — reads dataset/source/afrik/patronymes/*.json,
 * validates the complete reference graph, then projects each PAT_* dossier
 * into the patronyme dimension and its normalized lookup tables.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

import { logger } from "@/lib/api/logger";
import { normalizeToKey } from "@/lib/normalize";
import { parsePatronymeFile } from "@/lib/afrik/parsers/patronymeParser";
import type {
  PatronymeAlliance,
  PatronymeDossier,
  PatronymeSource,
} from "@/lib/afrik/parsers/patronymeTypes";
import { createAdminClient } from "@/lib/supabase/admin";

const AFRIK_ROOT = join(process.cwd(), "dataset/source/afrik");

type AdminClient = ReturnType<typeof createAdminClient>;

// @req REQ-133
// @req REQ-134
export interface PatronymeBatch {
  dossiers: PatronymeDossier[];
  errors: string[];
}

// @req REQ-133
// @req REQ-134
export interface PatronymeReferenceIds {
  peopleIds: Set<string>;
  countryIds: Set<string>;
  personIds: Set<string>;
  patronymeIds: Set<string>;
}

// @req REQ-133
// @req REQ-134
export interface PatronymeLoadReport {
  total: number;
  inserted: number;
  spellings: number;
  peopleLinks: number;
  countryLinks: number;
  bearerLinks: number;
  alliances: number;
  errors: string[];
}

interface PatronymeLoadOptions {
  dryRun?: boolean;
  references?: PatronymeReferenceIds;
}

function createReport(batch: PatronymeBatch): PatronymeLoadReport {
  return {
    total: batch.dossiers.length,
    inserted: 0,
    spellings: 0,
    peopleLinks: 0,
    countryLinks: 0,
    bearerLinks: 0,
    alliances: 0,
    errors: [...batch.errors],
  };
}

function isIllustrative(raw: unknown): boolean {
  return (
    typeof raw === "object" &&
    raw !== null &&
    (raw as { _meta?: { illustrative?: boolean } })._meta?.illustrative === true
  );
}

function errorMessage(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value.message;
  }
  return value instanceof Error ? value.message : "unknown Supabase error";
}

/**
 * Discover the canonical PAT_* corpus without hiding malformed dossiers.
 * Illustrative fixtures are skipped, while every other read/model/filename
 * failure is retained in the returned batch and blocks persistence.
 */
// @req REQ-133
// @req REQ-134
export function loadAllPatronymeDossiers(
  datasetRoot: string = AFRIK_ROOT
): PatronymeBatch {
  const directory = join(datasetRoot, "patronymes");
  let files: string[];
  try {
    files = readdirSync(directory)
      .filter((file) => /^PAT_[A-Z0-9_]+\.json$/.test(file))
      .sort();
  } catch {
    return { dossiers: [], errors: [] };
  }

  const dossiers: PatronymeDossier[] = [];
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const file of files) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(join(directory, file), "utf-8"));
    } catch (error) {
      const message = `${file}: invalid JSON — ${errorMessage(error)}`;
      logger.error(`Failed to read patronyme file ${file}`, error);
      errors.push(message);
      continue;
    }

    if (isIllustrative(raw)) continue;

    const parsed = parsePatronymeFile(raw);
    if (!parsed.success || !parsed.data) {
      const details = parsed.errors
        .map((issue) => `${issue.path || "<root>"}: ${issue.message}`)
        .join("; ");
      logger.error(`Failed to parse patronyme file ${file}`, undefined, {
        errors: parsed.errors,
      });
      errors.push(`${file}: invalid patronyme dossier — ${details}`);
      continue;
    }

    const expectedFile = `${parsed.data.id}.json`;
    if (file !== expectedFile) {
      errors.push(`${file}: filename must be ${expectedFile}`);
      continue;
    }
    if (seenIds.has(parsed.data.id)) {
      errors.push(`${file}: duplicate patronyme id ${parsed.data.id}`);
      continue;
    }

    seenIds.add(parsed.data.id);
    dossiers.push(parsed.data);
  }

  return { dossiers, errors };
}

async function readIds(
  supabase: AdminClient,
  table: "afrik_peoples" | "afrik_countries" | "persons" | "afrik_patronymes"
): Promise<Set<string>> {
  const { data, error } = await supabase.from(table).select("id");
  if (error)
    throw new Error(`Failed to read ${table} identifiers: ${error.message}`);

  return new Set(
    (Array.isArray(data) ? data : []).flatMap((row) =>
      row && typeof row.id === "string" ? [row.id] : []
    )
  );
}

async function resolveReferenceIds(
  supabase: AdminClient,
  references?: PatronymeReferenceIds
): Promise<PatronymeReferenceIds> {
  if (references) return references;

  const [peopleIds, countryIds, personIds, patronymeIds] = await Promise.all([
    readIds(supabase, "afrik_peoples"),
    readIds(supabase, "afrik_countries"),
    readIds(supabase, "persons"),
    readIds(supabase, "afrik_patronymes"),
  ]);
  return { peopleIds, countryIds, personIds, patronymeIds };
}

function requireReference(
  validIds: Set<string>,
  id: string,
  location: string,
  errors: string[]
): void {
  if (!validIds.has(id)) errors.push(`${location}: ${id} does not exist`);
}

function validateHomonymReference(
  dossier: PatronymeDossier,
  index: number,
  references: PatronymeReferenceIds,
  validPatronymeIds: Set<string>,
  errors: string[]
): void {
  const entityId = dossier.homonyms[index].entityId;
  if (!entityId) return;

  const location = `${dossier.id}.homonyms[${index}].entityId`;
  if (entityId.startsWith("PPL_")) {
    requireReference(references.peopleIds, entityId, location, errors);
  } else if (entityId.startsWith("PER_")) {
    requireReference(references.personIds, entityId, location, errors);
  } else if (entityId.startsWith("PAT_")) {
    requireReference(validPatronymeIds, entityId, location, errors);
  } else if (/^[A-Z]{3}$/.test(entityId)) {
    requireReference(references.countryIds, entityId, location, errors);
  }
}

function preflightBatch(
  dossiers: PatronymeDossier[],
  references: PatronymeReferenceIds
): string[] {
  const errors: string[] = [];
  const sourcesByTitle = new Map<
    string,
    Pick<PatronymeSource, "tier" | "url" | "source_kind">
  >();
  const dossierIds = dossiers.map(({ id }) => id);
  const validPatronymeIds = new Set([
    ...references.patronymeIds,
    ...dossierIds,
  ]);

  if (new Set(dossierIds).size !== dossierIds.length) {
    errors.push("patronyme batch contains duplicate PAT_* identifiers");
  }

  for (const dossier of dossiers) {
    dossier.sources.forEach((source) => {
      const existing = sourcesByTitle.get(source.title);
      if (
        existing &&
        (existing.tier !== source.tier ||
          existing.url !== source.url ||
          existing.source_kind !== source.source_kind)
      ) {
        errors.push(
          `${dossier.id}.sources: conflicting source "${source.title}" tier, URL, or provenance`
        );
      } else if (!existing) {
        sourcesByTitle.set(source.title, {
          tier: source.tier,
          url: source.url,
          source_kind: source.source_kind,
        });
      }
    });
    dossier.peoples.forEach(({ peopleId }, index) =>
      requireReference(
        references.peopleIds,
        peopleId,
        `${dossier.id}.peoples[${index}].peopleId`,
        errors
      )
    );
    dossier.countries.forEach(({ countryId }, index) =>
      requireReference(
        references.countryIds,
        countryId,
        `${dossier.id}.countries[${index}].countryId`,
        errors
      )
    );
    dossier.spellings.forEach((spelling, spellingIndex) =>
      spelling.attestations.forEach(({ countryId }, attestationIndex) =>
        requireReference(
          references.countryIds,
          countryId,
          `${dossier.id}.spellings[${spellingIndex}].attestations[${attestationIndex}].countryId`,
          errors
        )
      )
    );
    dossier.bearers.forEach((bearer, index) => {
      if ("personId" in bearer && bearer.personId) {
        requireReference(
          references.personIds,
          bearer.personId,
          `${dossier.id}.bearers[${index}].personId`,
          errors
        );
      }
    });
    dossier.alliances.forEach(({ targetPatronymeId }, index) => {
      requireReference(
        validPatronymeIds,
        targetPatronymeId,
        `${dossier.id}.alliances[${index}].targetPatronymeId`,
        errors
      );
      if (targetPatronymeId === dossier.id) {
        errors.push(
          `${dossier.id}.alliances[${index}]: self-alliance is invalid`
        );
      }
    });
    dossier.homonyms.forEach((_homonym, index) =>
      validateHomonymReference(
        dossier,
        index,
        references,
        validPatronymeIds,
        errors
      )
    );
  }

  return errors;
}

function plannedProjectionCounts(
  dossiers: PatronymeDossier[]
): Pick<
  PatronymeLoadReport,
  "spellings" | "peopleLinks" | "countryLinks" | "bearerLinks" | "alliances"
> {
  const alliances = new Set<string>();
  let spellings = 0;
  let peopleLinks = 0;
  let countryLinks = 0;
  let bearerLinks = 0;

  for (const dossier of dossiers) {
    spellings += dossier.spellings.length;
    peopleLinks += new Set(dossier.peoples.map(({ peopleId }) => peopleId))
      .size;
    countryLinks += new Set(dossier.countries.map(({ countryId }) => countryId))
      .size;
    bearerLinks += new Set(
      dossier.bearers.flatMap((bearer) =>
        "personId" in bearer && bearer.personId ? [bearer.personId] : []
      )
    ).size;
    dossier.alliances.forEach(({ targetPatronymeId }) => {
      alliances.add([dossier.id, targetPatronymeId].sort().join(":"));
    });
  }

  return {
    spellings,
    peopleLinks,
    countryLinks,
    bearerLinks,
    alliances: alliances.size,
  };
}

async function upsertSource(
  supabase: AdminClient,
  source: PatronymeSource
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from("sources")
    .upsert(
      {
        title: source.title,
        url: source.url,
        tier: source.tier,
        source_kind: source.source_kind ?? null,
        notes: source.notes ?? null,
        added_at: new Date().toISOString(),
      },
      { onConflict: "title" }
    )
    .select("id")
    .single();
  if (error || !data) return { error: errorMessage(error) };
  return { id: data.id as string };
}

async function upsertRevision(
  supabase: AdminClient,
  dossier: PatronymeDossier
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase
    .from("fiche_revisions")
    .upsert(
      {
        entity_type: "patronyme",
        entity_id: dossier.id,
        version: 1,
        content_snapshot: dossier,
        published_at: new Date().toISOString(),
      },
      { onConflict: "entity_type,entity_id,version" }
    )
    .select("id")
    .single();
  if (error || !data) return { error: errorMessage(error) };
  return { id: data.id as string };
}

async function findOrCreateAssertion(
  supabase: AdminClient,
  dossierId: string,
  fieldPath: string,
  statement: string,
  sourceIds: string[],
  revisionId: string
): Promise<{ id: string } | { error: string }> {
  const { data: existing, error: selectError } = await supabase
    .from("assertions")
    .select("id")
    .eq("entity_type", "patronyme")
    .eq("entity_id", dossierId)
    .eq("field_path", fieldPath)
    .maybeSingle();
  if (selectError) return { error: errorMessage(selectError) };

  if (existing) {
    const { error } = await supabase
      .from("assertions")
      .update({ statement, source_ids: sourceIds })
      .eq("id", existing.id);
    if (error) return { error: errorMessage(error) };
    return { id: existing.id as string };
  }

  const { data, error } = await supabase
    .from("assertions")
    .insert({
      entity_type: "patronyme",
      entity_id: dossierId,
      field_path: fieldPath,
      statement,
      source_ids: sourceIds,
      fiche_revision_id: revisionId,
    })
    .select("id")
    .single();
  if (error || !data) return { error: errorMessage(error) };
  return { id: data.id as string };
}

async function upsertSpelling(
  supabase: AdminClient,
  dossier: PatronymeDossier,
  spellingIndex: number,
  sourceIdsByKey: Map<string, string>,
  revisionId: string
): Promise<string | null> {
  const spelling = dossier.spellings[spellingIndex];
  const sourceRefs = Array.from(
    new Set(spelling.attestations.flatMap(({ sourceRefs }) => sourceRefs))
  );
  const sourceIds = sourceRefs.flatMap((key) => {
    const id = sourceIdsByKey.get(key);
    return id ? [id] : [];
  });
  if (sourceIds.length !== sourceRefs.length) {
    return `${dossier.id}/${spelling.spelling}: one or more source references were not persisted`;
  }

  const fieldPath = `spellings.${spellingIndex}.${normalizeToKey(spelling.spelling)}`;
  const assertion = await findOrCreateAssertion(
    supabase,
    dossier.id,
    fieldPath,
    spelling.spelling,
    sourceIds,
    revisionId
  );
  if ("error" in assertion) {
    return `${dossier.id}/${spelling.spelling}: assertion — ${assertion.error}`;
  }

  const { error } = await supabase.from("name_records").upsert(
    {
      entity_type: "patronyme",
      entity_id: dossier.id,
      name_text: spelling.spelling,
      name_type: "surname",
      assertion_id: assertion.id,
      sort_rank: spellingIndex,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "entity_type,entity_id,name_text,name_type" }
  );
  return error
    ? `${dossier.id}/${spelling.spelling}: name_records — ${error.message}`
    : null;
}

async function upsertJoin(
  supabase: AdminClient,
  table:
    | "afrik_patronyme_peoples"
    | "afrik_patronyme_countries"
    | "afrik_patronyme_persons",
  row: Record<string, string>,
  onConflict: string
): Promise<string | null> {
  try {
    const { error } = await supabase.from(table).upsert(row, { onConflict });
    return error ? error.message : null;
  } catch (error) {
    return errorMessage(error);
  }
}

interface AllianceProjection {
  dossier: PatronymeDossier;
  alliance: PatronymeAlliance;
  nameIdA: string;
  nameIdB: string;
}

function allianceProjections(
  dossiers: PatronymeDossier[]
): AllianceProjection[] {
  const projections = new Map<string, AllianceProjection>();
  for (const dossier of dossiers) {
    for (const alliance of dossier.alliances) {
      const [nameIdA, nameIdB] = [
        dossier.id,
        alliance.targetPatronymeId,
      ].sort();
      const key = `${nameIdA}:${nameIdB}`;
      if (!projections.has(key)) {
        projections.set(key, { dossier, alliance, nameIdA, nameIdB });
      }
    }
  }
  return Array.from(projections.values());
}

async function upsertAlliance(
  supabase: AdminClient,
  projection: AllianceProjection,
  sourceIdsByDossier: Map<string, Map<string, string>>
): Promise<string | null> {
  const sourceRef = projection.alliance.sourceRefs[0];
  const sourceId = sourceIdsByDossier
    .get(projection.dossier.id)
    ?.get(sourceRef);
  const source = projection.dossier.sources.find(
    ({ sourceKey }) => sourceKey === sourceRef
  );
  if (!sourceId || !source) {
    return `${projection.nameIdA} ↔ ${projection.nameIdB}: alliance source was not persisted`;
  }

  const id = `ALL_${projection.nameIdA.slice(4)}_${projection.nameIdB.slice(4)}`;
  try {
    const { error } = await supabase.from("afrik_patronyme_alliances").upsert(
      {
        id,
        // Migration 061 deliberately keeps one coarse SQL enum. The precise
        // regional term remains preserved in the canonical dossier content.
        alliance_type: "joking_kinship",
        name_id_a: projection.nameIdA,
        name_id_b: projection.nameIdB,
        source_id: sourceId,
        tier: source.tier,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "name_id_a,name_id_b" }
    );
    return error
      ? `${projection.nameIdA} ↔ ${projection.nameIdB}: ${error.message}`
      : null;
  } catch (error) {
    return `${projection.nameIdA} ↔ ${projection.nameIdB}: ${errorMessage(error)}`;
  }
}

/**
 * Validate and optionally persist a complete patronyme batch. No patronyme
 * write occurs until every PAT/PPL/PER/ISO3 reference in every dossier has
 * passed preflight. Parent rows are then written before any projection.
 */
// @req REQ-133
// @req REQ-134
export async function loadPatronymes(
  supabase: AdminClient,
  batch: PatronymeBatch = loadAllPatronymeDossiers(),
  options: PatronymeLoadOptions = {}
): Promise<PatronymeLoadReport> {
  const report = createReport(batch);
  if (report.errors.length > 0) return report;

  let references: PatronymeReferenceIds;
  try {
    references = await resolveReferenceIds(supabase, options.references);
  } catch (error) {
    report.errors.push(errorMessage(error));
    return report;
  }

  report.errors.push(...preflightBatch(batch.dossiers, references));
  if (report.errors.length > 0) return report;

  const planned = plannedProjectionCounts(batch.dossiers);
  if (options.dryRun) {
    Object.assign(report, planned);
    return report;
  }

  for (const dossier of batch.dossiers) {
    try {
      const { error } = await supabase.from("afrik_patronymes").upsert(
        {
          id: dossier.id,
          name_system: dossier.nameSystem,
          caste_or_social_function:
            dossier.casteOrSocialFunction?.value ?? null,
          content: dossier,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      if (error) report.errors.push(`${dossier.id}: ${error.message}`);
      else report.inserted += 1;
    } catch (error) {
      report.errors.push(`${dossier.id}: ${errorMessage(error)}`);
    }
  }
  if (report.inserted !== report.total) return report;

  const sourceIdsByDossier = new Map<string, Map<string, string>>();
  const revisionIds = new Map<string, string>();
  for (const dossier of batch.dossiers) {
    const sourceIds = new Map<string, string>();
    sourceIdsByDossier.set(dossier.id, sourceIds);
    for (const source of dossier.sources) {
      const result = await upsertSource(supabase, source);
      if ("error" in result) {
        report.errors.push(
          `${dossier.id}: source "${source.title}" — ${result.error}`
        );
      } else {
        sourceIds.set(source.sourceKey, result.id);
      }
    }

    const revision = await upsertRevision(supabase, dossier);
    if ("error" in revision) {
      report.errors.push(`${dossier.id}: fiche revision — ${revision.error}`);
    } else {
      revisionIds.set(dossier.id, revision.id);
    }
  }

  for (const dossier of batch.dossiers) {
    const sourceIds = sourceIdsByDossier.get(dossier.id) ?? new Map();
    const revisionId = revisionIds.get(dossier.id);
    if (revisionId) {
      for (let index = 0; index < dossier.spellings.length; index += 1) {
        const error = await upsertSpelling(
          supabase,
          dossier,
          index,
          sourceIds,
          revisionId
        );
        if (error) report.errors.push(error);
        else report.spellings += 1;
      }
    }

    for (const peopleId of new Set(
      dossier.peoples.map((link) => link.peopleId)
    )) {
      const error = await upsertJoin(
        supabase,
        "afrik_patronyme_peoples",
        { patronyme_id: dossier.id, people_id: peopleId },
        "patronyme_id,people_id"
      );
      if (error) report.errors.push(`${dossier.id} ↔ ${peopleId}: ${error}`);
      else report.peopleLinks += 1;
    }

    for (const countryId of new Set(
      dossier.countries.map((link) => link.countryId)
    )) {
      const error = await upsertJoin(
        supabase,
        "afrik_patronyme_countries",
        { patronyme_id: dossier.id, country_id: countryId },
        "patronyme_id,country_id"
      );
      if (error) report.errors.push(`${dossier.id} ↔ ${countryId}: ${error}`);
      else report.countryLinks += 1;
    }

    const personIds = new Set(
      dossier.bearers.flatMap((bearer) =>
        "personId" in bearer && bearer.personId ? [bearer.personId] : []
      )
    );
    for (const personId of personIds) {
      const error = await upsertJoin(
        supabase,
        "afrik_patronyme_persons",
        { patronyme_id: dossier.id, person_id: personId },
        "patronyme_id,person_id"
      );
      if (error) report.errors.push(`${dossier.id} ↔ ${personId}: ${error}`);
      else report.bearerLinks += 1;
    }
  }

  for (const projection of allianceProjections(batch.dossiers)) {
    const error = await upsertAlliance(
      supabase,
      projection,
      sourceIdsByDossier
    );
    if (error) report.errors.push(error);
    else report.alliances += 1;
  }

  return report;
}
