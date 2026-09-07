import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { fieldHashes, sourceHash } from "@/lib/afrik/translations/hashing";
import { classifierFor } from "@/lib/afrik/translations/leafClassifier";
import {
  checkRecordPair,
  checkUiDictionaryParity,
  resolveParityMode,
  runTranslationParity,
  TRANSLATION_UI_DICTIONARIES,
} from "../checkTranslationParity";

const RELATIVE_PATH = "langues/lin.json";
const SOURCE = {
  id: "lin",
  nameFr: "Lingala",
  content: {
    vehicularRole: null,
    dialects: [],
    vitalityStatus: null,
    sources: [
      {
        title: "Glottolog",
        url: "https://glottolog.org/resource/languoid/id/ling1263",
        tier: "official",
        notes: "Description française.",
      },
    ],
  },
};

const classify = classifierFor("modele-langue.json");

function sidecarFor(source = SOURCE) {
  return {
    ...structuredClone(source),
    content: {
      ...structuredClone(source.content),
      sources: [
        {
          ...structuredClone(source.content.sources[0]),
          notes: "English description.",
        },
      ],
    },
    _translation: {
      kind: "human",
      translatedAt: "2026-09-07T10:00:00.000Z",
      sourceHash: sourceHash(source, classify),
      fieldHashes: fieldHashes(source, classify),
      reviewRequired: [],
    },
  };
}

describe("translation parity — corpus records (REQ-145)", () => {
  // @req REQ-145
  it("fails when a French record has no English counterpart and names a field", () => {
    const result = checkRecordPair({
      relativePath: RELATIVE_PATH,
      lang: "en",
      source: SOURCE,
      sidecar: null,
    });

    expect(result.findings).toEqual([
      expect.objectContaining({
        rule: "missing-translation",
        file: "dataset/source/afrik/langues/lin.json",
        field: "content.sources[0].notes",
      }),
    ]);
  });

  // @req REQ-145
  it("accepts and reports an explicit deferral with a non-empty reason", () => {
    const deferred = {
      ...structuredClone(SOURCE),
      _translation: {
        deferred: { en: "Awaiting review of the source terminology." },
      },
    };

    const result = checkRecordPair({
      relativePath: RELATIVE_PATH,
      lang: "en",
      source: deferred,
      sidecar: null,
    });

    expect(result.findings).toEqual([]);
    expect(result.notices).toEqual([
      expect.objectContaining({
        rule: "translation-deferred",
        reason: "Awaiting review of the source terminology.",
      }),
    ]);
  });

  // @req REQ-145
  it("refuses an empty deferral reason", () => {
    const deferred = {
      ...structuredClone(SOURCE),
      _translation: { deferred: { en: "  " } },
    };

    const result = checkRecordPair({
      relativePath: RELATIVE_PATH,
      lang: "en",
      source: deferred,
      sidecar: null,
    });

    expect(result.findings).toEqual([
      expect.objectContaining({
        rule: "invalid-deferral",
        field: "_translation.deferred.en",
      }),
    ]);
  });

  // @req REQ-145
  it("fails symmetrically when English has no French source and names a field", () => {
    const result = checkRecordPair({
      relativePath: RELATIVE_PATH,
      lang: "en",
      source: null,
      sidecar: sidecarFor(),
    });

    expect(result.findings).toEqual([
      expect.objectContaining({
        rule: "missing-source",
        file: "dataset/translations/en/langues/lin.json",
        field: "content.sources[0].notes",
      }),
    ]);
  });

  // @req REQ-145
  it("names fields missing on either side of an existing pair", () => {
    const missingEnglish = sidecarFor() as Record<string, unknown>;
    delete (
      (missingEnglish.content as typeof SOURCE.content).sources[0] as {
        notes?: string;
      }
    ).notes;

    const englishOnly = sidecarFor() as Record<string, unknown>;
    (englishOnly.content as Record<string, unknown>).englishOnly = "Extra";

    expect(
      checkRecordPair({
        relativePath: RELATIVE_PATH,
        lang: "en",
        source: SOURCE,
        sidecar: missingEnglish,
      }).findings
    ).toEqual([
      expect.objectContaining({
        rule: "field-missing-in-translation",
        field: "content.sources[0].notes",
      }),
    ]);
    expect(
      checkRecordPair({
        relativePath: RELATIVE_PATH,
        lang: "en",
        source: SOURCE,
        sidecar: englishOnly,
      }).findings
    ).toContainEqual(
      expect.objectContaining({
        rule: "field-missing-in-source",
        field: "content.englishOnly",
      })
    );
  });

  // @req REQ-145
  it("fails stale translations and names every changed source field", () => {
    const original = sidecarFor();
    const edited = structuredClone(SOURCE);
    edited.content.sources[0].notes = "Description française révisée.";

    const result = checkRecordPair({
      relativePath: RELATIVE_PATH,
      lang: "en",
      source: edited,
      sidecar: original,
    });

    expect(result.findings).toContainEqual(
      expect.objectContaining({
        rule: "translation-drift",
        field: "content.sources[0].notes",
      })
    );
  });

  // Dossier translations predate the full-record store and are deliberate
  // sparse overlays. Their own reader validates their keys; parity only asks
  // that the French and English files both exist.
  // @req REQ-145
  it("keeps the existing sparse dossier sidecar contract", () => {
    const result = checkRecordPair({
      relativePath: "dossiers/DOS_TEST.json",
      lang: "en",
      source: { id: "DOS_TEST", content: { title: "Titre", body: "Texte" } },
      sidecar: { content: { title: "Title" } },
    });

    expect(result.findings).toEqual([]);
  });
});

describe("translation parity — registered UI dictionaries (REQ-145)", () => {
  // @req REQ-145
  it("registers standalone locale dictionaries as well as the main copy modules", () => {
    expect(TRANSLATION_UI_DICTIONARIES).toContainEqual(
      expect.objectContaining({
        name: "ficheMetadata",
        file: "src/lib/i18n/copy/ficheMetadata.ts",
      })
    );
  });

  // @req REQ-145
  it("reports a key present in only one locale", () => {
    expect(
      checkUiDictionaryParity([
        {
          name: "example",
          file: "src/lib/i18n/copy/example.ts",
          dictionary: {
            fr: { title: "Titre", frenchOnly: "Seulement" },
            en: { title: "Title" },
          },
        },
      ])
    ).toEqual([
      expect.objectContaining({
        rule: "ui-dictionary-parity",
        file: "src/lib/i18n/copy/example.ts",
        field: "example.frenchOnly",
      }),
    ]);
  });
});

describe("translation parity — modes (REQ-145)", () => {
  // @req REQ-145
  it("blocks for staged/base diffs and surveys the full tree without a diff", () => {
    expect(resolveParityMode([])).toEqual({ kind: "survey" });
    expect(resolveParityMode(["--all"])).toEqual({ kind: "survey" });
    expect(
      resolveParityMode(["--staged", "dataset/source/afrik/langues/lin.json"])
    ).toEqual({
      kind: "staged",
    });
    expect(resolveParityMode(["--base", "origin/recette"])).toEqual({
      kind: "base",
      ref: "origin/recette",
    });
  });

  // @req REQ-145
  it("refuses a base flag without a ref", () => {
    expect(() => resolveParityMode(["--base"])).toThrow(/requires a git ref/);
  });
});

describe("translation parity — runner posture (REQ-145)", () => {
  const roots: string[] = [];

  afterEach(() => {
    roots.splice(0).forEach((root) => rmSync(root, { recursive: true }));
  });

  function fixtureRoot(source: Record<string, unknown>): string {
    const root = mkdtempSync(join(tmpdir(), "ethniafrica-parity-"));
    roots.push(root);
    const file = join(root, "dataset/source/afrik", RELATIVE_PATH);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(source));
    return root;
  }

  const dictionaries = [
    {
      name: "example",
      file: "src/lib/i18n/copy/example.ts",
      dictionary: { fr: { title: "Titre" }, en: { title: "Title" } },
    },
  ];

  // @req REQ-145
  it("blocks a changed pair but leaves the same full-tree backlog advisory", () => {
    const root = fixtureRoot(SOURCE);
    const changed = [`dataset/source/afrik/${RELATIVE_PATH}`];

    const blocking = runTranslationParity({
      repoRoot: root,
      mode: { kind: "base", ref: "origin/recette" },
      changedPaths: changed,
      uiDictionaries: dictionaries,
      includeGlossary: false,
    });
    const survey = runTranslationParity({
      repoRoot: root,
      mode: { kind: "survey" },
      uiDictionaries: dictionaries,
      includeGlossary: false,
    });

    expect(blocking).toMatchObject({
      blocking: true,
      exitCode: 1,
      recordsScanned: 1,
    });
    expect(survey).toMatchObject({
      blocking: false,
      exitCode: 0,
      recordsScanned: 1,
    });
    expect(survey.findings[0].rule).toBe("missing-translation");
  });

  // @req REQ-145
  it("lets a reasoned deferral pass through the blocking runner as a notice", () => {
    const root = fixtureRoot({
      ...SOURCE,
      _translation: { deferred: { en: "Awaiting terminology review." } },
    });

    const result = runTranslationParity({
      repoRoot: root,
      mode: { kind: "staged" },
      changedPaths: [`dataset/source/afrik/${RELATIVE_PATH}`],
      uiDictionaries: dictionaries,
      includeGlossary: false,
    });

    expect(result).toMatchObject({ exitCode: 0, blocking: true });
    expect(result.notices[0].reason).toBe("Awaiting terminology review.");
  });
});
