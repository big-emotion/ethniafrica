import { unstable_cache } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";
import {
  getModulesForAccessMode,
  type AccessMode,
  type HubModuleDefinition,
  type ModuleDataSource,
} from "@/lib/hubs/moduleRegistry";

/** What `isModuleAvailable` needs of a definition to answer. */
type AvailabilityInputs = Pick<
  HubModuleDefinition,
  "availability" | "dataSource" | "editorialReadiness"
>;

/**
 * REQ-106/REQ-114: a "data" module counts as live only once its backing
 * table returns at least one row. A failed or empty query both resolve to
 * `false` so an unreachable source degrades the module to unavailable
 * instead of throwing into the hub render. Restored from the deleted
 * src/lib/moduleAvailability.ts (git show f5115339^).
 */
async function hasAtLeastOneRow(
  dataSource: ModuleDataSource
): Promise<boolean> {
  try {
    const supabase = createServerClient();
    let query = supabase
      .from(dataSource)
      .select("*", { count: "exact", head: true });

    // Mirror the entity_type filter applied by names.ts#listNames so this
    // probe reflects what the noms atlas actually renders.
    if (dataSource === "name_records") {
      query = query.eq("entity_type", "people");
    }

    const { count, error } = await query;

    if (error) {
      logger.error(
        `Hub module availability probe failed for ${dataSource}`,
        error
      );
      return false;
    }

    return (count ?? 0) > 0;
  } catch (error) {
    logger.error(
      `Hub module availability probe threw for ${dataSource}`,
      error
    );
    return false;
  }
}

// One cached probe per data source (DEC-018): an empty/unreachable table
// shouldn't turn into a per-request Supabase round trip for every hub view.
const probeDataSource = unstable_cache(
  (dataSource: ModuleDataSource) => hasAtLeastOneRow(dataSource),
  ["hub-module-availability"],
  { revalidate: 60 }
);

export interface HubModule extends HubModuleDefinition {
  available: boolean;
}

// @req REQ-106 @req REQ-114
export async function isModuleAvailable(
  def: AvailabilityInputs
): Promise<boolean> {
  // Editorial readiness is settled first, and without a query: it is
  // declared in the registry, so no table can overturn it, and a module we
  // have already decided is unready would only spend a round trip on an
  // answer nobody reads. This is the "not yet worth the trip" half of the
  // charter's §3 distinction; the probe below is the "has nothing at all"
  // half. Both surface as the same inert Bientôt row, deliberately.
  if (def.editorialReadiness === "draft") return false;

  // Only a data module's liveness depends on the corpus. A static page
  // renders from code, and asking a row count about it could only ever take
  // a working route away.
  if (def.availability !== "data") return true;
  if (!def.dataSource) return false;
  return probeDataSource(def.dataSource);
}

// @req REQ-114 @req REQ-106
export async function getHubModules(mode: AccessMode): Promise<HubModule[]> {
  // Every module the registry declares is listed, a module in preparation
  // included. Nothing is dropped here: a module that could vanish from the
  // hub is a module a reader cannot find, and neither the environment nor
  // an editorial judgement has any say in what exists — only in what is
  // offered.
  return Promise.all(
    getModulesForAccessMode(mode).map(async (def) => ({
      ...def,
      available: await isModuleAvailable(def),
    }))
  );
}
