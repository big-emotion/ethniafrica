/**
 * Reading the AFRIK corpus off disk.
 *
 * The fiches in git are the editorial source of truth, so every country-
 * enrichment tool reads them directly: no credentials, and no dependence on a
 * database having been loaded.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

export function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function jsonFilesRecursively(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return jsonFilesRecursively(entryPath);
    return entry.isFile() && entry.name.endsWith(".json") ? [entryPath] : [];
  });
}

/** People fiches, excluding the V1 archive the loaders no longer read. */
export function readPeopleFiches<T>(datasetRoot: string): T[] {
  return jsonFilesRecursively(join(datasetRoot, "peuples"))
    .filter(
      (filePath) =>
        basename(filePath).startsWith("PPL_") && !filePath.includes("/V1/")
    )
    .map((filePath) => readJson<T>(filePath));
}

export function readPatronymFiches<T>(datasetRoot: string): T[] {
  return jsonFilesRecursively(join(datasetRoot, "patronymes"))
    .filter((filePath) => basename(filePath).startsWith("PAT_"))
    .map((filePath) => readJson<T>(filePath));
}

export function readLanguageDossierIds(datasetRoot: string): Set<string> {
  return new Set(
    jsonFilesRecursively(join(datasetRoot, "langues"))
      .map((filePath) => readJson<{ id?: unknown }>(filePath).id)
      .filter((id): id is string => typeof id === "string")
  );
}
