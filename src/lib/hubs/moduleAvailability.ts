import { unstable_cache } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";
import {
  getModulesForAccessMode,
  MODULE_DEFINITIONS,
  type AccessMode,
  type HubModuleDefinition,
  type ModuleDataSource,
} from "@/lib/hubs/moduleRegistry";
import {
  isModuleDeclaredReady,
  type ModuleAvailabilityMap,
} from "@/lib/hubs/moduleOffer";

/** What `isModuleAvailable` needs of a definition to answer. */
type AvailabilityInputs = Pick<
  HubModuleDefinition,
  "availability" | "dataSource" | "editorialReadiness"
>;

/** The view of migration 080: one row per data source, one boolean each. */
const CORPUS_PRESENCE_VIEW = "hub_module_corpus_presence";

interface CorpusPresenceRow {
  data_source: ModuleDataSource;
  has_rows: boolean;
}

/**
 * What the database said about each data source.
 *
 * A source the database did not answer for is *absent from the record*, and
 * that is the whole point: `undefined` means "we do not know", which is not
 * `false`. Conflating the two is the defect this file was rewritten for.
 */
type CorpusPresence = Partial<Record<ModuleDataSource, boolean>>;

/**
 * Every table some module waits on, deduplicated, in the registry's own
 * words — so the fallback below cannot probe a table nobody declared.
 */
const DECLARED_DATA_SOURCES: ModuleDataSource[] = [
  ...new Set(
    MODULE_DEFINITIONS.map((definition) => definition.dataSource).filter(
      (source): source is ModuleDataSource => Boolean(source)
    )
  ),
];

/**
 * The fast path: the whole map in one round trip, with no count anywhere.
 * Returns `null` — not an empty map — when the view could not be read, so the
 * caller can tell "nothing is loaded" from "nothing answered".
 */
async function readPresenceView(): Promise<CorpusPresence | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from(CORPUS_PRESENCE_VIEW)
    .select("data_source, has_rows");

  if (error) {
    logger.error("Hub module corpus presence view unreadable", error);
    return null;
  }

  const rows = (data ?? []) as CorpusPresenceRow[];
  return Object.fromEntries(
    rows.map((row) => [row.data_source, row.has_rows === true])
  );
}

/**
 * The fallback, for a database the view has not reached yet: production
 * applies its migrations by hand, so this code can land there first.
 *
 * `select("id").limit(1)` and never a count. The question is whether a first
 * row exists, and `count: "exact"` over `select("*")` asked PostgREST to walk
 * the whole relation to answer it — which is how a 790-row table came to blow
 * the three-second `anon` statement timeout and report itself empty.
 *
 * `undefined` on failure, for the same reason `readPresenceView` returns
 * `null`: an unanswered probe is not an empty table.
 */
async function probeDataSource(
  source: ModuleDataSource
): Promise<boolean | undefined> {
  const columns = createServerClient().from(source).select("id");
  // Mirrors `names.ts#listNames`, and the same filter in the view, so all
  // three judge the noms module on the records it actually renders.
  const query =
    source === "name_records"
      ? columns.eq("entity_type", "people").limit(1)
      : columns.limit(1);

  const { data, error } = await query;

  if (error) {
    logger.error(`Hub module availability probe failed for ${source}`, error);
    return undefined;
  }

  return (data ?? []).length > 0;
}

async function readCorpusPresence(): Promise<CorpusPresence> {
  try {
    const fromView = await readPresenceView();
    if (fromView) return fromView;

    const probed = await Promise.all(
      DECLARED_DATA_SOURCES.map(
        async (source) => [source, await probeDataSource(source)] as const
      )
    );
    return Object.fromEntries(
      probed.filter(([, present]) => present !== undefined)
    );
  } catch (error) {
    logger.error("Hub module corpus presence threw", error);
    return {};
  }
}

/**
 * One cached read per revalidation window (DEC-018). Caching a *failure* for
 * sixty seconds is deliberate and safe now that a failure resolves to
 * "offered": an optimistic answer held briefly costs a reader nothing, where
 * the pessimistic one it replaces took a built page off the site.
 */
const corpusPresence = unstable_cache(
  readCorpusPresence,
  ["hub-module-corpus-presence"],
  { revalidate: 60 }
);

export interface HubModule extends HubModuleDefinition {
  available: boolean;
}

/**
 * The two halves of availability, in the order the charter (§3) puts them,
 * against a presence map already read.
 */
function isModuleLive(
  definition: AvailabilityInputs,
  presence: CorpusPresence
): boolean {
  // Editorial readiness is settled first, and without a query: it is declared
  // in the registry, so no table can overturn it. This is the "not yet worth
  // the trip" half of the charter's §3 distinction; the corpus below is the
  // "has nothing at all" half. Both surface as the same inert Bientôt row,
  // deliberately — and the declared half must also survive an outage, or a
  // database hiccup would talk an unready module back into the menu.
  //
  // Shared with the client resolver (`isModuleOffered`) rather than restated,
  // so the header cannot answer this half differently from the hub.
  if (!isModuleDeclaredReady(definition)) return false;

  // Only a data module's liveness depends on the corpus. A static page renders
  // from code, and asking a row about it could only ever take a working route
  // away.
  if (definition.availability !== "data") return true;
  if (!definition.dataSource) return false;

  // Unknown is not empty. A source nothing answered for leaves the module
  // offered: an empty list is a cheaper disappointment than a door that is
  // not there, and the reader can see for themselves what the corpus holds.
  return presence[definition.dataSource] ?? true;
}

// @req REQ-106 @req REQ-114
export async function isModuleAvailable(
  definition: AvailabilityInputs
): Promise<boolean> {
  // A module its declaration already settles never pays for a round trip
  // whose answer nobody reads.
  const settledByDeclaration =
    !isModuleDeclaredReady(definition) || definition.availability !== "data";

  return isModuleLive(
    definition,
    settledByDeclaration ? {} : await corpusPresence()
  );
}

// @req REQ-114 @req REQ-106
export async function getHubModules(mode: AccessMode): Promise<HubModule[]> {
  // Every module the registry declares is listed, a module in preparation
  // included. Nothing is dropped here: a module that could vanish from the
  // hub is a module a reader cannot find, and neither the environment nor
  // an editorial judgement has any say in what exists — only in what is
  // offered.
  const presence = await corpusPresence();

  return getModulesForAccessMode(mode).map((definition) => ({
    ...definition,
    available: isModuleLive(definition, presence),
  }));
}

/**
 * Every module's availability, resolved once, for the surfaces that cannot
 * await it themselves.
 *
 * The header is the whole reason this exists. It is a client component, and so
 * is the `PageLayout` above it, so the resolved `HubModule[]` the hub and the
 * home read had no way to reach it — and it answered a narrower question
 * instead, offering modules those two surfaces were marking **Bientôt**.
 * Resolving the registry whole and handing the map down from the `[lang]`
 * layout keeps that threading to one place rather than to `PageLayout`'s
 * fifteen-odd callers.
 *
 * Cached whole rather than leaning on the presence read underneath it. The
 * difference matters because of where this is called: the `[lang]` layout runs
 * on every page under `/fr` and the shell waits on it, so the cost that counts
 * is per render, not per source.
 */
// @req REQ-106 @req REQ-114
export const getModuleAvailabilityMap = unstable_cache(
  async (): Promise<ModuleAvailabilityMap> => {
    const presence = await corpusPresence();

    return Object.fromEntries(
      MODULE_DEFINITIONS.map((definition) => [
        definition.id,
        isModuleLive(definition, presence),
      ])
    );
  },
  ["hub-module-availability-map"],
  { revalidate: 60 }
);
