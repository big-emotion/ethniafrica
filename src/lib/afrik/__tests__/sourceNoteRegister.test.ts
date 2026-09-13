import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, it } from "vitest";

const root = join(process.cwd(), "dataset/source/afrik");
const classes = ["famille_linguistique", "peuples", "pays", "patronymes"];
const pipelineNote =
  /(?:^|[^\p{L}])tier(?:ed|ée|é)?(?:$|[^\p{L}])|\[tier \d+\]|file de candidats|catalogue de domaines officiels|No URL and no recognisable citation shape|No domain ruling covers|Resolved from the (?:prior|URL-less)\b/iu;

function jsonFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return jsonFiles(path);
    return entry.name.endsWith(".json") ? [path] : [];
  });
}

function sourceMetadata(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(sourceMetadata);
  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  const own = Array.isArray(record.sources)
    ? record.sources.flatMap((source) =>
        source && typeof source === "object"
          ? [
              String((source as Record<string, unknown>).notes ?? ""),
              String((source as Record<string, unknown>).title ?? ""),
            ]
          : []
      )
    : [];
  return [
    ...own,
    ...Object.entries(record)
      .filter(([key]) => key !== "sources")
      .flatMap(([, nested]) => sourceMetadata(nested)),
  ];
}

// @req REQ-092
it("keeps pipeline bookkeeping out of published source notes and titles", () => {
  const leaks: string[] = [];

  for (const corpusClass of classes) {
    for (const path of jsonFiles(join(root, corpusClass))) {
      const record = JSON.parse(readFileSync(path, "utf8"));
      for (const note of sourceMetadata(record)) {
        if (pipelineNote.test(note)) leaks.push(record.id);
      }
    }
  }

  expect(leaks).toEqual([]);
});

// @req REQ-143
it("uses reader-facing names and the modern regime for the affected records", () => {
  const read = (path: string) =>
    JSON.parse(readFileSync(join(root, path), "utf8"));
  const bidyogo = read("peuples/FLG_ATLANTIQUE/PPL_BIDYOGO.json");
  const jiye = read("peuples/FLG_NILOTIQUE/PPL_JIE_SUD.json");
  const comoros = read("pays/COM.json");

  expect(bidyogo.content.appellations.whyProblematic).not.toMatch(
    /\b(?:PPL|FLG)_[A-Z_]+\b/
  );
  expect(jiye.content.appellations.originOfExonyms).not.toMatch(
    /\b(?:PPL|FLG)_[A-Z_]+\b/
  );
  expect(
    comoros.content.kingdoms.find(
      (entry: { name: string }) => entry.name === "Union des Comores"
    )?.entryType
  ).toBe("modern");
});
