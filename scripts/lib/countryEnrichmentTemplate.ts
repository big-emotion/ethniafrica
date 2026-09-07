/**
 * The starting shape of a country tracker.
 *
 * Initialization opens the work and states what is unknown; it asserts nothing
 * about the country. Every reference denominator starts empty because sourcing
 * one — with its scope, its vintage and the caveat that limits comparison — is
 * editorial work, and a placeholder count would be read as a measurement.
 */

export interface CountryReferenceSlot {
  count: number | null;
  denominatorKind: string | null;
  scope: string | null;
  source: string | null;
  url: string | null;
  accessedAt: string | null;
  caveat: string;
}

export interface CountryWorkstream {
  id: string;
  priority: string;
  status: string;
  goal: string;
  findings: string[];
  remaining: string[];
}

export interface CountryTracker {
  schemaVersion: number;
  countryId: string;
  countryName: string | null;
  status: string;
  updatedAt: string;
  scorePolicy: string;
  databaseSync: { status: string; reason: string };
  references: Record<string, CountryReferenceSlot>;
  snapshot: unknown;
  artifacts: {
    peopleReconciliationLedger: {
      path: string;
      refreshCommand: string;
      reviewFieldsPreservedOnRefresh: boolean;
    };
  };
  workstreams: CountryWorkstream[];
  openQuestions: string[];
}

interface WorkstreamTemplate {
  key: string;
  priority: string;
  goal: string;
  remaining: string[];
}

/** The ten editorial areas a country pass covers, in dependency order. */
export const COUNTRY_WORKSTREAMS: WorkstreamTemplate[] = [
  {
    key: "IDENTITY",
    priority: "P0",
    goal: "Use one consistent reader-facing country name across source JSON, database and interface.",
    remaining: [
      "Confirm the common name, the official name and every alias against a primary source.",
      "Check that the database row and the interface label match the source fiche.",
      "Record any resolver or translation layer that substitutes its own label.",
    ],
  },
  {
    key: "PEOPLES",
    priority: "P0",
    goal: "Build a reconciled, individually navigable inventory of the peoples present in the country.",
    remaining: [
      "Generate the people reconciliation ledger and review every local country link.",
      "Classify each entry as individual people, subgroup, language label, macro-category, duplicate or rejected link.",
      "Choose and enumerate a reference inventory, and record its scope before quoting any coverage figure.",
      "Build an alias table for endonyms, exonyms, alternate spellings and parent-child group relations.",
    ],
  },
  {
    key: "LANGUAGES",
    priority: "P0",
    goal: "Expose the country's languages with stable ISO 639-3 and Glottocode links.",
    remaining: [
      "Pin a language reference inventory and record which scope it counts.",
      "Reconcile local ISO codes and aliases against that inventory.",
      "Distinguish official, national, vehicular, community, sign, historical and immigrant roles from a primary legal or scholarly source.",
      "Fill the country's mainLanguages only once those roles are separated.",
    ],
  },
  {
    key: "HISTORY",
    priority: "P1",
    goal: "Give the deep past its own track instead of starting the account at the best-known kingdoms.",
    remaining: [
      "Add an archaeological sequence with its sites, periods and sources.",
      "Attach an explicit source tier to every retained historical claim.",
    ],
  },
  {
    key: "HISTORICAL-NAMES",
    priority: "P1",
    goal: "Source and periodize every historical name of the territory.",
    remaining: [
      "Give each former name its period, the actor who used it and its source.",
      "Record why a colonial-era name is problematic rather than dropping it.",
    ],
  },
  {
    key: "POLITIES",
    priority: "P1",
    goal: "Distinguish precolonial polities, colonial administrations and modern states.",
    remaining: [
      "Audit the geographic fit and periodization of every declared political entity.",
      "Separate polities from colonial administrations and from modern state periods.",
      "Record as an open question any conflation the current model forces.",
    ],
  },
  {
    key: "PATRONYMS",
    priority: "P1",
    goal: "Report patronym breadth and documentation depth as two separate measurements.",
    remaining: [
      "Keep direct country attestations apart from country reach inferred through a people.",
      "Complete source, origin and transmission research on the fiches that are not documented.",
    ],
  },
  {
    key: "SOURCES",
    priority: "P0",
    goal: "Give every retained factual claim an explicit source tier.",
    remaining: [
      "Rule on each needs_review entry individually rather than flattening the set to one tier.",
      "Check that every online source URL still resolves.",
      "Where no source can be found, empty the field and write its gap in reader-facing prose.",
    ],
  },
  {
    key: "DATABASE-SYNC",
    priority: "P1",
    goal: "Know whether the database projection matches the source fiche.",
    remaining: [
      "Compare the database row against the source fiche and record the divergences.",
      "Leave the status at not_verified while the comparison cannot be run.",
    ],
  },
  {
    key: "DISCOVERABILITY",
    priority: "P1",
    goal: "Record which verified entities a reader cannot reach from the country surface.",
    remaining: [
      "List the verified peoples, languages and patronyms with no individually selectable path.",
      "Check the reader paths at mobile, then tablet, then desktop widths.",
      "Hand the visual and frontend answer to the design workflow; record the gap here rather than implementing it.",
    ],
  },
];

const REFERENCE_SLOT_CAVEATS: Record<string, string> = {
  peopleGroups:
    "An approximate headline count yields a raw upper bound only. An exact coverage figure requires record-level reconciliation against an enumerated inventory.",
  languages:
    "Record which scope the count uses: all catalogued entries, living indigenous languages, or all languages currently in use.",
  patronyms:
    "An editorial breadth quota, not a measurement of the country's onomastic stock.",
  population:
    "Record the reference year and whether the figure is a census, a projection or an estimate.",
};

function emptyReferenceSlot(caveat: string): CountryReferenceSlot {
  return {
    count: null,
    denominatorKind: null,
    scope: null,
    source: null,
    url: null,
    accessedAt: null,
    caveat,
  };
}

/** Questions no country pass can settle by inspecting the corpus alone. */
const OPEN_QUESTIONS = [
  "Which enumerated inventory should be the canonical record-linkage baseline for this country's peoples, and what is its scope?",
  "Which language scope should the reader-facing count use: all catalogued entries, living indigenous languages, or all languages currently in use?",
  "Which primary legal source establishes the official and national languages?",
  "Is the current database row stale relative to the source fiche?",
];

export function normalizeCountryId(raw: string): string | null {
  const countryId = raw.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(countryId) ? countryId : null;
}

export interface InitPlanInput {
  countryFicheExists: boolean;
  trackerExists: boolean;
  force: boolean;
}

export interface InitPlan {
  action: "create" | "overwrite" | "refuse";
  reason: string;
}

export function resolveInitPlan({
  countryFicheExists,
  trackerExists,
  force,
}: InitPlanInput): InitPlan {
  if (!countryFicheExists) {
    return {
      action: "refuse",
      reason: "the country has no source fiche under dataset/source/afrik/pays",
    };
  }
  if (!trackerExists) return { action: "create", reason: "no tracker yet" };
  if (!force) {
    return {
      action: "refuse",
      reason:
        "a tracker already exists; its workstreams and review decisions would be lost. Pass --force to overwrite it deliberately",
    };
  }
  return { action: "overwrite", reason: "--force was given" };
}

export interface CountryTrackerTemplateInput {
  countryId: string;
  countryName: string | null;
  updatedAt: string;
  snapshot: unknown;
}

export function buildCountryTrackerTemplate({
  countryId,
  countryName,
  updatedAt,
  snapshot,
}: CountryTrackerTemplateInput): CountryTracker {
  return {
    schemaVersion: 1,
    countryId,
    countryName,
    status: "not_started",
    updatedAt,
    scorePolicy: "vector_only_no_global_score",
    databaseSync: {
      status: "not_verified",
      reason:
        "Initialization does not query the database. Verify the row and record the result.",
    },
    references: Object.fromEntries(
      Object.entries(REFERENCE_SLOT_CAVEATS).map(([slot, caveat]) => [
        slot,
        emptyReferenceSlot(caveat),
      ])
    ),
    snapshot,
    artifacts: {
      peopleReconciliationLedger: {
        path: `docs/editorial/country-enrichment/${countryId}-peoples.json`,
        refreshCommand: `npx tsx scripts/afrik/updateCountryPeopleLedger.ts ${countryId} --write`,
        reviewFieldsPreservedOnRefresh: true,
      },
    },
    workstreams: COUNTRY_WORKSTREAMS.map((workstream) => ({
      id: `${countryId}-${workstream.key}`,
      priority: workstream.priority,
      status: "not_started",
      goal: workstream.goal,
      findings: [],
      remaining: [...workstream.remaining],
    })),
    openQuestions: [...OPEN_QUESTIONS],
  };
}
