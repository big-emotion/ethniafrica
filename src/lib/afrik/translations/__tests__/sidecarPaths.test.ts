import { afterEach, describe, expect, it } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";
import * as prettier from "prettier";

import {
  listTranslationSidecars,
  readTranslationSidecar,
  sidecarPathFor,
  sourcePathFor,
  writeTranslationSidecar,
} from "../sidecarPaths";

const temporaryDirectories: string[] = [];

function createFixtureRoot(): string {
  const directory = mkdtempSync(join(tmpdir(), "translation-sidecars-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

const BLOCK = {
  kind: "machine" as const,
  translatedAt: "2026-09-05T10:00:00.000Z",
  model: "claude-sonnet-4-5",
  sourceHash: "b".repeat(64),
  fieldHashes: {},
  reviewRequired: [],
};

describe("sidecar location (REQ-146)", () => {
  // @req REQ-146
  it("mirrors the source's relative path under the locale tree, and back", () => {
    const sidecar = sidecarPathFor("peuples/FLG_BANTU/PPL_ZULU.json", "en");
    expect(sidecar).toBe(
      "dataset/translations/en/peuples/FLG_BANTU/PPL_ZULU.json"
    );
    expect(sourcePathFor(sidecar)).toEqual({
      lang: "en",
      sourceRelativePath: "peuples/FLG_BANTU/PPL_ZULU.json",
    });
  });

  // @req REQ-146
  it("refuses a path that is not under the translations tree", () => {
    expect(() => sourcePathFor("dataset/source/afrik/pays/GHA.json")).toThrow(
      /dataset\/translations/
    );
  });

  // @req REQ-146
  it("lists a locale's sidecars recursively and skips the curator's worksheets", () => {
    const root = createFixtureRoot();
    const en = join(root, "en");
    mkdirSync(join(en, "peuples", "FLG_BANTU"), { recursive: true });
    mkdirSync(join(en, "patronymes"), { recursive: true });
    mkdirSync(join(root, "fr", "pays"), { recursive: true });
    writeFileSync(join(en, "peuples", "FLG_BANTU", "PPL_ZULU.json"), "{}");
    writeFileSync(join(en, "patronymes", "PAT_KEITA.json"), "{}");
    writeFileSync(join(en, "patronymes", "_manifest.json"), "{}");
    writeFileSync(join(en, "patronymes", "notes.txt"), "");
    writeFileSync(join(root, "fr", "pays", "GHA.json"), "{}");

    expect(listTranslationSidecars(root, "en")).toEqual([
      "patronymes/PAT_KEITA.json",
      "peuples/FLG_BANTU/PPL_ZULU.json",
    ]);
  });

  // @req REQ-146
  it("returns an empty list when the locale tree does not exist yet", () => {
    expect(listTranslationSidecars(createFixtureRoot(), "en")).toEqual([]);
  });

  // @req REQ-146
  it("writes a prettier-formatted sidecar with a trailing newline and reads it back", async () => {
    const root = createFixtureRoot();
    const file = join(root, "en", "pays", "GHA.json");
    const sidecar = {
      id: "GHA",
      nameFr: "Ghana",
      summary: "A short summary.",
      content: {
        historicalNames: { formerNames: ["Gold Coast", "Côte-de-l'Or"] },
      },
      _translation: BLOCK,
    };

    await writeTranslationSidecar(file, sidecar);

    const text = readFileSync(file, "utf-8");
    expect(text.endsWith("\n")).toBe(true);
    expect(await prettier.check(text, { parser: "json" })).toBe(true);
    expect(readTranslationSidecar(file)).toEqual(sidecar);
  });

  // @req REQ-142
  it("refuses to read a sidecar whose block declares no kind, naming the file", () => {
    const root = createFixtureRoot();
    const file = join(root, "en", "pays", "GHA.json");
    mkdirSync(join(root, "en", "pays"), { recursive: true });
    const { kind: _kind, ...undeclared } = BLOCK;
    writeFileSync(
      file,
      JSON.stringify({ id: "GHA", _translation: undeclared })
    );

    expect(() => readTranslationSidecar(file)).toThrow(/GHA\.json.*kind/);
  });
});
