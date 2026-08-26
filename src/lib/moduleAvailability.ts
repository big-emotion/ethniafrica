import { unstable_cache } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";
import { getLocalizedRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";
import {
  MODULE_DEFINITIONS,
  isModuleLive,
  type HomeModule,
  type ModuleDataSource,
} from "@/lib/accessModeHubs";

/**
 * REQ-106: a "data" module counts as live only once its backing table
 * returns at least one row. A failed or empty query both resolve to
 * `false` so an unreachable source degrades the card to unavailable
 * instead of throwing into the home page render.
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
      logger.error(`Module availability probe failed for ${dataSource}`, error);
      return false;
    }

    return (count ?? 0) > 0;
  } catch (error) {
    logger.error(`Module availability probe threw for ${dataSource}`, error);
    return false;
  }
}

// One cached probe per data source (DEC-018): an empty/unreachable table
// shouldn't turn into a per-request Supabase round trip for every home page
// view.
const probeDataSource = unstable_cache(
  (dataSource: ModuleDataSource) => hasAtLeastOneRow(dataSource),
  ["home-module-availability"],
  { revalidate: 60 }
);

function uniqueDataSources(): ModuleDataSource[] {
  return Array.from(
    new Set(
      MODULE_DEFINITIONS.filter((def) => def.dataSource).map(
        (def) => def.dataSource as ModuleDataSource
      )
    )
  );
}

// @req FR91 @req FR92 @req FR95 @req REQ-106
export async function getHomeModules(
  language: Language
): Promise<HomeModule[]> {
  const dataSources = uniqueDataSources();
  const probeResults = await Promise.all(
    dataSources.map(
      async (dataSource) =>
        [dataSource, await probeDataSource(dataSource)] as const
    )
  );
  const availabilityBySource = new Map(probeResults);

  return MODULE_DEFINITIONS.map((def) => {
    const dataAvailable = def.dataSource
      ? (availabilityBySource.get(def.dataSource) ?? false)
      : false;
    const live = isModuleLive(def, dataAvailable);

    return {
      id: def.id,
      title: def.title,
      category: def.category,
      accent: def.accent,
      illustration: def.illustration,
      state: live ? "live" : "soon",
      href: live && def.page ? getLocalizedRoute(language, def.page) : null,
    };
  });
}
