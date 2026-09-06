import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { logger } from "@/lib/api/logger";
import { classifierFor } from "@/lib/afrik/translations/leafClassifier";
import { fieldHashes, sourceHash } from "@/lib/afrik/translations/hashing";
import {
  loadAllTranslationSidecars,
  loadTranslationSidecars,
  MISSING_TRANSLATIONS_TABLE_HINT,
  type TranslationRow,
} from "../translationSidecarLoader";

const temporaryDirectories: string[] = [];

function createFixtureRoot(): string {
  const directory = mkdtempSync(join(tmpdir(), "translation-loader-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
  vi.clearAllMocks();
});

const SOURCE = {
  id: "PPL_ZULU",
  nameMain: "Zulu",
  languageFamilyId: "FLG_BANTU",
  currentCountries: ["ZAF"],
  content: { origins: { ancientOrigins: "Les Zoulous…" } },
};

function writeJson(file: string, value: unknown): void {
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, JSON.stringify(value));
}

function writeCorpus(root: string) {
  const corpus = join(root, "source", "afrik");
  const translations = join(root, "translations");
  writeJson(join(corpus, "peuples", "FLG_BANTU", "PPL_ZULU.json"), SOURCE);
  return { corpus, translations };
}

function sidecarFor(source: typeof SOURCE, translated: string) {
  const classify = classifierFor("modele-peuple.json");
  return {
    ...source,
    content: { origins: { ancientOrigins: translated } },
    _translation: {
      kind: "machine",
      translatedAt: "2026-09-05T10:00:00.000Z",
      model: "claude-sonnet-4-5",
      sourceHash: sourceHash(source, classify),
      fieldHashes: fieldHashes(source, classify),
      reviewRequired: [],
    },
  };
}

describe("loadAllTranslationSidecars (REQ-146)", () => {
  // @req REQ-146
  it("derives the entity type from the directory and the id from the file, and projects the block onto columns", () => {
    const root = createFixtureRoot();
    const { corpus, translations } = writeCorpus(root);
    writeJson(
      join(translations, "en", "peuples", "FLG_BANTU", "PPL_ZULU.json"),
      sidecarFor(SOURCE, "The Zulu…")
    );

    const batch = loadAllTranslationSidecars("en", translations, corpus);

    expect(batch.errors).toEqual([]);
    expect(batch.stale).toEqual([]);
    expect(batch.rows).toHaveLength(1);
    expect(batch.rows[0]).toMatchObject({
      entity_type: "people",
      entity_id: "PPL_ZULU",
      lang: "en",
      translation_kind: "machine",
      translated_at: "2026-09-05T10:00:00.000Z",
      model: "claude-sonnet-4-5",
      reviewed_by: null,
      review_required: [],
    });
    expect(batch.rows[0].content).not.toHaveProperty("_translation");
    expect(batch.rows[0].content).toMatchObject({
      content: { origins: { ancientOrigins: "The Zulu…" } },
    });
  });

  // @req REQ-146
  it("refuses a sidecar whose source fiche does not exist, in the report rather than by throwing", () => {
    const root = createFixtureRoot();
    const { corpus, translations } = writeCorpus(root);
    writeJson(
      join(translations, "en", "pays", "GHA.json"),
      sidecarFor(SOURCE, "x")
    );

    const batch = loadAllTranslationSidecars("en", translations, corpus);

    expect(batch.rows).toEqual([]);
    expect(batch.errors).toEqual([
      expect.stringMatching(/pays\/GHA\.json.*no source fiche/),
    ]);
  });

  // @req REQ-142
  it("refuses a sidecar with no declared translation kind and names the file", () => {
    const root = createFixtureRoot();
    const { corpus, translations } = writeCorpus(root);
    const undeclared = sidecarFor(SOURCE, "x") as Record<string, unknown>;
    const block = { ...(undeclared._translation as Record<string, unknown>) };
    delete block.kind;
    undeclared._translation = block;
    writeJson(
      join(translations, "en", "peuples", "FLG_BANTU", "PPL_ZULU.json"),
      undeclared
    );

    const batch = loadAllTranslationSidecars("en", translations, corpus);

    expect(batch.rows).toEqual([]);
    expect(batch.errors[0]).toMatch(/PPL_ZULU\.json.*kind/);
  });

  // @req REQ-146
  it("names a record whose source moved since it was translated", () => {
    const root = createFixtureRoot();
    const { corpus, translations } = writeCorpus(root);
    const earlier = {
      ...SOURCE,
      content: { origins: { ancientOrigins: "Version antérieure." } },
    };
    writeJson(
      join(translations, "en", "peuples", "FLG_BANTU", "PPL_ZULU.json"),
      sidecarFor(earlier, "Earlier version.")
    );

    const batch = loadAllTranslationSidecars("en", translations, corpus);

    expect(batch.rows).toHaveLength(1);
    expect(batch.stale).toEqual(["people/PPL_ZULU"]);
  });

  // @req REQ-146
  it("returns nothing when the locale tree does not exist", () => {
    const root = createFixtureRoot();
    const { corpus, translations } = writeCorpus(root);

    expect(loadAllTranslationSidecars("en", translations, corpus)).toEqual({
      rows: [],
      errors: [],
      stale: [],
    });
  });

  // Dossiers have their own file-served sparse-overlay reader and do not map
  // to rows in afrik_translations.
  // @req REQ-146
  it("leaves file-served dossier translations to their dedicated loader", () => {
    const root = createFixtureRoot();
    const { corpus, translations } = writeCorpus(root);
    writeJson(join(translations, "en", "dossiers", "DOS_KONGO.json"), {
      title: "The Kongo kingdom",
      _translation: { kind: "machine" },
    });

    expect(loadAllTranslationSidecars("en", translations, corpus)).toEqual({
      rows: [],
      errors: [],
      stale: [],
    });
  });
});

function row(entityId: string): TranslationRow {
  return {
    entity_type: "people",
    entity_id: entityId,
    lang: "en",
    content: {},
    translation_kind: "machine",
    translated_at: "2026-09-05T10:00:00.000Z",
    reviewed_by: null,
    model: null,
    source_hash: "a".repeat(64),
    field_hashes: {},
    review_required: [],
  };
}

function clientDouble(upsertResult: {
  error: { code?: string; message: string } | null;
}) {
  const upsert = vi.fn(async () => upsertResult);
  const from = vi.fn(() => ({ upsert }));
  return { client: { from } as never, upsert, from };
}

describe("loadTranslationSidecars (REQ-146)", () => {
  // @req REQ-146
  it("upserts on the primary key triple and reports what landed", async () => {
    const { client, upsert, from } = clientDouble({ error: null });

    const report = await loadTranslationSidecars(client, [
      row("PPL_A"),
      row("PPL_B"),
    ]);

    expect(from).toHaveBeenCalledWith("afrik_translations");
    expect(upsert).toHaveBeenCalledWith([row("PPL_A"), row("PPL_B")], {
      onConflict: "entity_type,entity_id,lang",
    });
    expect(report).toMatchObject({ total: 2, inserted: 2, errors: [] });
    expect(report.skipped).toBeNull();
  });

  // The recette sync fires on the same push as migrate-recette.yml and can
  // race it; a corpus load must not go red because one table is a minute late.
  // @req REQ-146
  it("skips with a warning naming the migration when the table is absent, without failing", async () => {
    const { client } = clientDouble({
      error: {
        code: "PGRST205",
        message:
          "Could not find the table 'public.afrik_translations' in the schema cache",
      },
    });

    const report = await loadTranslationSidecars(client, [row("PPL_A")]);

    expect(report.errors).toEqual([]);
    expect(report.inserted).toBe(0);
    expect(report.skipped).toBe(MISSING_TRANSLATIONS_TABLE_HINT);
    expect(report.skipped).toContain("085_afrik_translations.sql");
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  // @req REQ-146
  it("reports any other write failure as an error", async () => {
    const { client } = clientDouble({
      error: { code: "23514", message: "violates check constraint" },
    });

    const report = await loadTranslationSidecars(client, [row("PPL_A")]);

    expect(report.skipped).toBeNull();
    expect(report.errors).toEqual([
      expect.stringMatching(/violates check constraint/),
    ]);
  });

  // @req REQ-146
  it("touches the database not at all when there is nothing to load", async () => {
    const { client, from } = clientDouble({ error: null });

    const report = await loadTranslationSidecars(client, []);

    expect(from).not.toHaveBeenCalled();
    expect(report).toMatchObject({ total: 0, inserted: 0, skipped: null });
  });
});
