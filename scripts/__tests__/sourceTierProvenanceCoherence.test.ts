import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const CORPUS_ROOT = resolve(process.cwd(), "dataset/source/afrik");

interface TieredSource {
  tier?: unknown;
  source_kind?: unknown;
  title?: unknown;
  url?: unknown;
}

function ficheFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return ficheFiles(path);
    return entry.name.endsWith(".json") ? [path] : [];
  });
}

/**
 * Sources sit at different depths depending on the fiche model, so the shape is
 * discovered rather than addressed: anything carrying a tier beside a title or
 * a URL is a source entry.
 */
function tieredSources(
  node: unknown,
  found: TieredSource[] = []
): TieredSource[] {
  if (!node || typeof node !== "object") return found;
  if (Array.isArray(node)) {
    for (const item of node) tieredSources(item, found);
    return found;
  }
  const record = node as TieredSource;
  if (record.tier && (record.title || record.url)) found.push(record);
  for (const value of Object.values(node)) tieredSources(value, found);
  return found;
}

describe("source tier and provenance stay orthogonal", () => {
  // @req REQ-133
  it("never tiers a community-published source as official", () => {
    const contradictions = ficheFiles(CORPUS_ROOT).flatMap((path) =>
      tieredSources(JSON.parse(readFileSync(path, "utf8")))
        .filter(
          (source) =>
            source.tier === "official" && source.source_kind === "community"
        )
        .map(
          (source) =>
            `${path.replace(`${CORPUS_ROOT}/`, "")} :: ${source.title}`
        )
    );

    expect(contradictions).toEqual([]);
  });
});
