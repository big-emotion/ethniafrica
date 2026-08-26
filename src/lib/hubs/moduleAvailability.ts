import { unstable_cache } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";
import {
  getModulesForAccessMode,
  type AccessMode,
  type HubModuleDefinition,
  type ModuleDataSource,
} from "@/lib/hubs/moduleRegistry";

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
  def: Pick<HubModuleDefinition, "availability" | "dataSource">
): Promise<boolean> {
  if (def.availability === "unavailable") return false;
  // A static module renders from code, so a row count can only ever take
  // a working route away from the reader.
  if (def.availability === "static") return true;
  if (!def.dataSource) return false;
  return probeDataSource(def.dataSource);
}

// @req REQ-114
export async function getHubModules(mode: AccessMode): Promise<HubModule[]> {
  const definitions = getModulesForAccessMode(mode);
  return Promise.all(
    definitions.map(async (def) => ({
      ...def,
      available: await isModuleAvailable(def),
    }))
  );
}
