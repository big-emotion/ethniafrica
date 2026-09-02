/**
 * One-off external-identifier alignment pass (DEC-033 / ETNI-1772).
 *
 * Walks the AFRIK people corpus and, for every fiche that does not already
 * carry a `content.externalIdentifiers` section, tries to resolve a
 * Wikidata QID, a Glottolog code and an ISO 639-3 code — writing only the
 * fields it can resolve *without guessing*. Anything short of an unambiguous
 * match is routed to a report for a human to review (DEC-033: "ambiguous
 * cases go to editorial review"), never fabricated.
 *
 * Matching design:
 *  - Wikidata: search on both `appellations.selfAppellation` and
 *    `appellations.mainName` (falling back to the top-level `nameMain`).
 *    A match is unambiguous only when exactly one distinct entity, across
 *    both searches, has a label or alias that case-insensitively *equals*
 *    the search term — a prefix/substring hit is not a match.
 *  - Glottolog: read from the matched entity's P1394 claim.
 *  - ISO 639-3: prefer the fiche's own `languages.isoCodes` when it holds
 *    exactly one code (already-sourced corpus data, unambiguous by
 *    construction, no network call needed); fall back to the matched
 *    entity's P220 claim otherwise.
 *
 * The registry access is behind `RegistryClient` so `resolveFicheIdentifiers`
 * and `alignExternalIdentifiers` are pure with respect to the network — unit
 * tests inject a fake client and make zero real HTTP calls. `httpRegistryClient`
 * below is the real implementation, wired only by the CLI entry point.
 *
 * Usage: npx tsx scripts/alignExternalIdentifiers.ts
 * This is a one-off editorial-adjacent script: run it locally against the
 * real corpus and review `scripts/output/external-identifier-alignment-report.json`
 * before committing any change it makes.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const DEFAULT_PEOPLE_ROOT = path.join(
  __dirname,
  "../dataset/source/afrik/peuples"
);
const DEFAULT_REPORT_PATH = path.join(
  __dirname,
  "output/external-identifier-alignment-report.json"
);

const WIKIDATA_QID_PATTERN = /^Q[1-9][0-9]*$/;
const GLOTTOCODE_PATTERN = /^[a-z]{4}[0-9]{4}$/;
const ISO_639_3_PATTERN = /^[a-z]{3}$/;

// ─── Registry client (injectable) ──────────────────────────────────────────

export interface WikidataSearchHit {
  id: string; // Wikidata QID, e.g. "Q34266"
  /**
   * The label or alias text the search API actually matched against — a
   * prefix hit surfaces the full label/alias here, not the search term, so
   * comparing this to the term is how an exact match is told apart from a
   * loose one.
   */
  matchText: string;
}

export interface WikidataClaims {
  glottocode?: string;
  iso639_3?: string;
}

export interface RegistryClient {
  searchWikidata(term: string): Promise<WikidataSearchHit[]>;
  getClaims(qid: string): Promise<WikidataClaims>;
}

// ─── Fiche shapes (loose — the strict model lives in src/types/afrik.ts) ───

interface RawAppellations {
  mainName?: unknown;
  selfAppellation?: unknown;
}

interface RawLanguages {
  isoCodes?: unknown;
}

interface RawPeopleContent {
  appellations?: RawAppellations;
  languages?: RawLanguages;
  externalIdentifiers?: unknown;
  [key: string]: unknown;
}

export interface RawPeopleFiche {
  id?: string;
  nameMain?: string;
  content?: RawPeopleContent;
  [key: string]: unknown;
}

export interface ResolvedIdentifiers {
  wikidataId?: string;
  glottocode?: string;
  iso639_3?: string;
}

export type AlignmentSkipReason =
  "no-match" | "ambiguous" | "already-aligned" | "error";

export interface AlignmentReportEntry {
  id: string;
  nameMain: string;
  reason: AlignmentSkipReason;
  detail?: string;
}

export type FicheAlignmentOutcome =
  | { status: "aligned"; identifiers: ResolvedIdentifiers }
  | { status: "skipped"; reason: AlignmentSkipReason; detail?: string };

// ─── Pure matching logic (no network — driven entirely by `client`) ───────

function extractSearchTerms(fiche: RawPeopleFiche): string[] {
  const appellations = fiche.content?.appellations;
  const selfAppellation =
    typeof appellations?.selfAppellation === "string"
      ? appellations.selfAppellation.trim()
      : "";
  const mainName =
    typeof appellations?.mainName === "string" && appellations.mainName.trim()
      ? appellations.mainName.trim()
      : typeof fiche.nameMain === "string"
        ? fiche.nameMain.trim()
        : "";

  return Array.from(new Set([selfAppellation, mainName].filter(Boolean)));
}

function extractSingleIsoCode(fiche: RawPeopleFiche): string | undefined {
  const isoCodes = fiche.content?.languages?.isoCodes;
  if (!Array.isArray(isoCodes)) return undefined;

  const codes = isoCodes.filter(
    (code): code is string => typeof code === "string"
  );
  if (codes.length !== 1) return undefined;

  return ISO_639_3_PATTERN.test(codes[0]) ? codes[0] : undefined;
}

/** Distinct entity ids whose label/alias exactly matched their search term. */
function collectExactMatches(
  hitsByTerm: Array<{ term: string; hits: WikidataSearchHit[] }>
): Set<string> {
  const matched = new Set<string>();
  for (const { term, hits } of hitsByTerm) {
    const lowerTerm = term.toLowerCase();
    for (const hit of hits) {
      if (hit.matchText.trim().toLowerCase() === lowerTerm) {
        matched.add(hit.id);
      }
    }
  }
  return matched;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Resolve as many external identifiers as can be established without
 * guessing, for a single fiche. Never partially trusts an ambiguous or
 * malformed result — a field is only ever present in `identifiers` when it
 * is safe to publish.
 */
export async function resolveFicheIdentifiers(
  fiche: RawPeopleFiche,
  client: RegistryClient
): Promise<FicheAlignmentOutcome> {
  if (fiche.content?.externalIdentifiers !== undefined) {
    return { status: "skipped", reason: "already-aligned" };
  }

  const identifiers: ResolvedIdentifiers = {};
  let wikidataReason: AlignmentSkipReason = "no-match";
  let wikidataDetail: string | undefined;
  let claims: WikidataClaims | undefined;

  const terms = extractSearchTerms(fiche);

  if (terms.length === 0) {
    wikidataDetail =
      "no usable appellations to search (selfAppellation and mainName both empty)";
  } else {
    try {
      const hitsByTerm = await Promise.all(
        terms.map(async (term) => ({
          term,
          hits: await client.searchWikidata(term),
        }))
      );
      const matchedIds = collectExactMatches(hitsByTerm);

      if (matchedIds.size === 1) {
        const [qid] = matchedIds;
        if (!WIKIDATA_QID_PATTERN.test(qid)) {
          wikidataReason = "error";
          wikidataDetail = `Wikidata returned a malformed QID: "${qid}"`;
        } else {
          try {
            claims = await client.getClaims(qid);
            identifiers.wikidataId = qid;
            if (
              claims.glottocode &&
              GLOTTOCODE_PATTERN.test(claims.glottocode)
            ) {
              identifiers.glottocode = claims.glottocode;
            }
          } catch (error) {
            wikidataReason = "error";
            wikidataDetail = describeError(error);
          }
        }
      } else if (matchedIds.size > 1) {
        wikidataReason = "ambiguous";
        wikidataDetail = `${matchedIds.size} distinct Wikidata entities matched an exact label/alias`;
      }
    } catch (error) {
      wikidataReason = "error";
      wikidataDetail = describeError(error);
    }
  }

  const isoFromCorpus = extractSingleIsoCode(fiche);
  if (isoFromCorpus) {
    identifiers.iso639_3 = isoFromCorpus;
  } else if (claims?.iso639_3 && ISO_639_3_PATTERN.test(claims.iso639_3)) {
    identifiers.iso639_3 = claims.iso639_3;
  }

  if (Object.keys(identifiers).length > 0) {
    return { status: "aligned", identifiers };
  }

  return {
    status: "skipped",
    reason: wikidataReason,
    ...(wikidataDetail ? { detail: wikidataDetail } : {}),
  };
}

// ─── Corpus walk + report ───────────────────────────────────────────────────

function walkPeopleFiles(root: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkPeopleFiles(fullPath));
    } else if (
      entry.isFile() &&
      entry.name.startsWith("PPL_") &&
      entry.name.endsWith(".json")
    ) {
      files.push(fullPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

export interface AlignExternalIdentifiersOptions {
  peopleRoot?: string;
  reportPath?: string;
  client?: RegistryClient;
}

export interface AlignExternalIdentifiersResult {
  fichesScanned: number;
  fichesAligned: number;
  report: AlignmentReportEntry[];
  reportPath: string;
}

/**
 * Walk the people corpus, align what can be resolved unambiguously, and
 * write a deterministic report of everything routed to editorial review.
 *
 * An already-aligned fiche is skipped (no network call) but still recorded
 * in the report with reason "already-aligned", so a run's report is always
 * a complete accounting of every fiche that was not (re-)written.
 */
export async function alignExternalIdentifiers(
  options: AlignExternalIdentifiersOptions = {}
): Promise<AlignExternalIdentifiersResult> {
  const peopleRoot = options.peopleRoot ?? DEFAULT_PEOPLE_ROOT;
  const reportPath = options.reportPath ?? DEFAULT_REPORT_PATH;
  const client = options.client ?? httpRegistryClient;

  const filePaths = walkPeopleFiles(peopleRoot);
  const report: AlignmentReportEntry[] = [];
  let fichesAligned = 0;

  for (const filePath of filePaths) {
    const fiche = JSON.parse(readFileSync(filePath, "utf8")) as RawPeopleFiche;
    const id = fiche.id ?? path.basename(filePath, ".json");
    const nameMain =
      fiche.nameMain ??
      (typeof fiche.content?.appellations?.mainName === "string"
        ? fiche.content.appellations.mainName
        : id);

    const outcome = await resolveFicheIdentifiers(fiche, client);

    if (outcome.status === "aligned") {
      const nextFiche = {
        ...fiche,
        content: { ...fiche.content, externalIdentifiers: outcome.identifiers },
      };
      writeFileSync(
        filePath,
        `${JSON.stringify(nextFiche, null, 2)}\n`,
        "utf8"
      );
      fichesAligned += 1;
    } else {
      report.push({
        id,
        nameMain,
        reason: outcome.reason,
        ...(outcome.detail ? { detail: outcome.detail } : {}),
      });
    }
  }

  report.sort((left, right) => left.id.localeCompare(right.id));

  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return {
    fichesScanned: filePaths.length,
    fichesAligned,
    report,
    reportPath,
  };
}

// ─── Real HTTP client (wired only by the CLI entry point below) ───────────

interface WbSearchEntitiesHit {
  id: string;
  label?: string;
  match?: { type: string; text?: string };
}

interface WbSearchEntitiesResponse {
  search?: WbSearchEntitiesHit[];
}

interface WbClaimSnak {
  mainsnak?: { datavalue?: { value?: unknown } };
}

interface WbGetClaimsResponse {
  claims?: Record<string, WbClaimSnak[]>;
}

function extractStringClaim(
  claims: WbClaimSnak[] | undefined
): string | undefined {
  const value = claims?.[0]?.mainsnak?.datavalue?.value;
  return typeof value === "string" ? value : undefined;
}

async function searchWikidataViaHttp(
  term: string
): Promise<WikidataSearchHit[]> {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
    term
  )}&language=fr&format=json&type=item`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Wikidata search failed for "${term}": HTTP ${response.status}`
    );
  }
  const body = (await response.json()) as WbSearchEntitiesResponse;
  return (body.search ?? []).map((hit) => ({
    id: hit.id,
    matchText: hit.match?.text ?? hit.label ?? "",
  }));
}

async function getClaimsViaHttp(qid: string): Promise<WikidataClaims> {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${encodeURIComponent(
    qid
  )}&format=json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Wikidata claims fetch failed for ${qid}: HTTP ${response.status}`
    );
  }
  const body = (await response.json()) as WbGetClaimsResponse;
  return {
    glottocode: extractStringClaim(body.claims?.P1394),
    iso639_3: extractStringClaim(body.claims?.P220),
  };
}

export const httpRegistryClient: RegistryClient = {
  searchWikidata: searchWikidataViaHttp,
  getClaims: getClaimsViaHttp,
};

// ─── CLI entry point ────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const result = await alignExternalIdentifiers();
  console.log(
    `External identifier alignment: ${result.fichesAligned}/${result.fichesScanned} fiches aligned, ` +
      `${result.report.length} routed to editorial review -> ${result.reportPath}`
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
