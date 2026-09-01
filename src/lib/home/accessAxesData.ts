import { getHubModules, type HubModule } from "@/lib/hubs/moduleAvailability";
import { ACCESS_MODES, type AccessMode } from "@/lib/hubs/moduleRegistry";

/** Resolve the three access-axis module lists together on the server. */
// @req REQ-132
export async function getModulesByAxis(): Promise<
  Record<AccessMode, HubModule[]>
> {
  const entries = await Promise.all(
    ACCESS_MODES.map(async (mode) => [mode, await getHubModules(mode)] as const)
  );

  return Object.fromEntries(entries) as Record<AccessMode, HubModule[]>;
}
