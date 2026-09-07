import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type {
  TranslationProvider,
  TranslationRequest,
} from "@/lib/afrik/translations/provider";
import { classifierFor } from "@/lib/afrik/translations/leafClassifier";
import { sourceHash } from "@/lib/afrik/translations/hashing";
import {
  buildPrompt,
  buildSkeleton,
  listBatchRecords,
  resolveRecordPath,
  translateRecord,
  type TranslateOptions,
} from "../lib/translateRecord";

const temporaryDirectories: string[] = [];

function createRoot(): string {
  const directory = mkdtempSync(join(tmpdir(), "translate-record-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

const ASANTE = {
  id: "PPL_ASANTE",
  nameMain: "Asante",
  languageFamilyId: "FLG_NIGERCONGO",
  currentCountries: ["GHA"],
  classificationStatus: "colonial-legacy",
  content: {
    appellations: {
      mainName: "Asante",
      selfAppellation: "Asante / Asantefo",
      exonyms: ["Ashanti (variante orthographique anglaise)"],
      originOfExonyms: "Le terme Ashanti est une variante anglophone.",
      whyProblematic: null,
    },
    origins: {
      ancientOrigins: "Les Asante font partie du groupe Akan.",
      migrationRoutes: ["Depuis Bono-Manso vers Kumase"],
    },
    sources: [
      { title: "Un titre", url: "https://x", tier: "official", notes: "Note." },
    ],
  },
};

const LINGALA = {
  id: "lin",
  isoCode639_3: "lin",
  nameFr: "Lingala",
  nameEn: "Kinshasa Lingala",
  familyId: "FLG_BANTU",
  content: {
    sources: [
      {
        title: "Glottolog",
        url: "https://g",
        tier: "official",
        notes: "Nom Glottolog.",
      },
    ],
  },
};

function writeJson(file: string, value: unknown): void {
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

function corpus(root: string) {
  const corpusRoot = join(root, "source", "afrik");
  writeJson(
    join(corpusRoot, "peuples", "FLG_NIGERCONGO", "PPL_ASANTE.json"),
    ASANTE
  );
  writeJson(join(corpusRoot, "langues", "lin.json"), LINGALA);
  writeJson(join(corpusRoot, "patronymes", "_manifest.json"), { entries: [] });
  writeJson(join(corpusRoot, "noms", "PPL_DOGON.json"), {
    id: "PPL_DOGON",
    entityType: "people",
    names: [],
  });
  writeJson(join(corpusRoot, "systemes_onomastiques", "ONS_TEMPLATE.json"), {
    _meta: { illustrative: true },
    id: "ONS_TEMPLATE",
  });
  return { corpusRoot, translationsRoot: join(root, "translations") };
}

/** Answers every leaf it is asked for, through `render`, and counts calls. */
function fakeProvider(render: (path: string, text: string) => string) {
  const requests: TranslationRequest[] = [];
  const provider: TranslationProvider = {
    async translate(input) {
      requests.push(input);
      const { leaves } = JSON.parse(input.userPrompt) as {
        leaves: Array<{ path: string; text: string }>;
      };
      const translations = Object.fromEntries(
        leaves.map((leaf) => [leaf.path, render(leaf.path, leaf.text)])
      );
      return {
        ok: true,
        output: { translations },
        model: "claude-sonnet-5",
        costUsd: 0.01,
      };
    },
  };
  return { provider, requests };
}

const english = (_path: string, text: string) =>
  text.startsWith("Ashanti (")
    ? "Ashanti (English spelling variant)"
    : `EN: ${text}`;

function options(
  roots: { corpusRoot: string; translationsRoot: string },
  overrides: Partial<TranslateOptions> = {}
): TranslateOptions {
  return {
    lang: "en",
    corpusRoot: roots.corpusRoot,
    translationsRoot: roots.translationsRoot,
    model: "sonnet",
    maxBudgetUsd: 0.5,
    force: false,
    drift: false,
    dryRun: false,
    now: () => new Date("2026-09-05T10:00:00.000Z"),
    ...overrides,
  };
}

describe("translateRecord — resolution (REQ-146)", () => {
  // @req REQ-146
  it("resolves an identifier to its corpus path by prefix, peoples through their family folder", () => {
    const { corpusRoot } = corpus(createRoot());

    expect(resolveRecordPath("PPL_ASANTE", corpusRoot)).toBe(
      "peuples/FLG_NIGERCONGO/PPL_ASANTE.json"
    );
    expect(resolveRecordPath("lin", corpusRoot)).toBe("langues/lin.json");
    expect(resolveRecordPath("noms/PPL_DOGON", corpusRoot)).toBe(
      "noms/PPL_DOGON.json"
    );
    expect(() => resolveRecordPath("PPL_NOBODY", corpusRoot)).toThrow(
      /PPL_NOBODY/
    );
  });

  // @req REQ-146
  it("lists a batch recursively and leaves worksheets and illustrative fixtures out", () => {
    const { corpusRoot } = corpus(createRoot());

    expect(listBatchRecords(corpusRoot, corpusRoot)).toEqual([
      "langues/lin.json",
      "noms/PPL_DOGON.json",
      "peuples/FLG_NIGERCONGO/PPL_ASANTE.json",
    ]);
    expect(listBatchRecords(corpusRoot, join(corpusRoot, "langues"))).toEqual([
      "langues/lin.json",
    ]);
  });

  // @req REQ-146
  it("refuses record paths and batch roots outside the corpus", () => {
    const root = createRoot();
    const { corpusRoot } = corpus(root);
    writeJson(join(root, "outside.json"), LINGALA);

    expect(() => resolveRecordPath("../../outside", corpusRoot)).toThrow(
      /outside the corpus/
    );
    expect(() => listBatchRecords(corpusRoot, root)).toThrow(
      /outside the corpus/
    );
  });
});

describe("translateRecord — skeleton and prompt (REQ-143, REQ-146)", () => {
  const classify = classifierFor("modele-peuple.json");

  // @req REQ-143
  it("carries invariants verbatim and lists only the leaves that translate, with their class", () => {
    const skeleton = buildSkeleton(ASANTE, classify);

    expect(skeleton.invariants.map((leaf) => leaf.path)).toContain(
      "content.appellations.selfAppellation"
    );
    expect(skeleton.leaves.map((leaf) => [leaf.path, leaf.class])).toEqual([
      ["content.appellations.exonyms[0]", "glossed_invariant"],
      ["content.appellations.originOfExonyms", "review_required"],
      ["content.origins.ancientOrigins", "translatable"],
      ["content.origins.migrationRoutes[0]", "translatable"],
      ["content.sources[0].notes", "translatable"],
    ]);
    expect(skeleton.reviewRequired).toEqual([
      "content.appellations.originOfExonyms",
    ]);
  });

  // @req REQ-146
  it("builds a prompt that names the register, the glossary rulings and the output contract", () => {
    const prompt = buildPrompt({
      recordId: "PPL_ASANTE",
      entityType: "people",
      skeleton: buildSkeleton(ASANTE, classify),
      registerBlock: null,
    });

    expect(prompt.systemPrompt).toMatch(/British spelling/);
    expect(prompt.systemPrompt).toMatch(/never "tribe"/i);
    expect(prompt.systemPrompt).toMatch(
      /famille linguistique.*language family/
    );
    expect(prompt.jsonSchema).toMatchObject({
      type: "object",
      required: ["translations"],
    });
    const user = JSON.parse(prompt.userPrompt) as { leaves: unknown[] };
    expect(user.leaves).toHaveLength(5);
  });
});

describe("translateRecord — one record (REQ-146)", () => {
  // @req REQ-146
  it("writes a machine sidecar with provenance, hashes and the class-3 paths, invariants byte-equal", async () => {
    const roots = corpus(createRoot());
    const { provider } = fakeProvider(english);

    const outcome = await translateRecord(
      "peuples/FLG_NIGERCONGO/PPL_ASANTE.json",
      options(roots),
      provider
    );

    expect(outcome.status).toBe("translated");
    const sidecar = JSON.parse(
      readFileSync(
        join(
          roots.translationsRoot,
          "en",
          "peuples",
          "FLG_NIGERCONGO",
          "PPL_ASANTE.json"
        ),
        "utf8"
      )
    );
    expect(Object.keys(sidecar)).toEqual([
      ...Object.keys(ASANTE),
      "_translation",
    ]);
    expect(sidecar.nameMain).toBe("Asante");
    expect(sidecar.content.appellations.selfAppellation).toBe(
      "Asante / Asantefo"
    );
    expect(sidecar.content.appellations.whyProblematic).toBeNull();
    expect(sidecar.content.appellations.exonyms).toEqual([
      "Ashanti (English spelling variant)",
    ]);
    expect(sidecar.content.origins.ancientOrigins).toBe(
      "EN: Les Asante font partie du groupe Akan."
    );
    expect(sidecar.content.sources[0].title).toBe("Un titre");
    expect(sidecar._translation).toMatchObject({
      kind: "machine",
      translatedAt: "2026-09-05T10:00:00.000Z",
      model: "claude-sonnet-5",
      sourceHash: sourceHash(ASANTE, classifierFor("modele-peuple.json")),
      reviewRequired: ["content.appellations.originOfExonyms"],
    });
    expect(Object.keys(sidecar._translation.fieldHashes)).toContain(
      "content.origins.ancientOrigins"
    );
  });

  // @req REQ-146
  it("skips an up-to-date sidecar without calling the provider, unless forced", async () => {
    const roots = corpus(createRoot());
    const { provider, requests } = fakeProvider(english);
    const path = "peuples/FLG_NIGERCONGO/PPL_ASANTE.json";

    await translateRecord(path, options(roots), provider);
    const again = await translateRecord(path, options(roots), provider);
    expect(again.status).toBe("skipped");
    expect(requests).toHaveLength(1);

    const forced = await translateRecord(
      path,
      options(roots, { force: true }),
      provider
    );
    expect(forced.status).toBe("translated");
    expect(requests).toHaveLength(2);
  });

  // @req REQ-146
  it("in drift mode names the changed field and re-translates only that one (AC2)", async () => {
    const roots = corpus(createRoot());
    const { provider, requests } = fakeProvider(english);
    const path = "peuples/FLG_NIGERCONGO/PPL_ASANTE.json";
    await translateRecord(path, options(roots), provider);

    const edited = structuredClone(ASANTE);
    edited.content.origins.ancientOrigins = "Texte révisé.";
    writeJson(join(roots.corpusRoot, path), edited);

    const outcome = await translateRecord(
      path,
      options(roots, { drift: true }),
      provider
    );

    expect(outcome).toMatchObject({
      status: "translated",
      driftedPaths: ["content.origins.ancientOrigins"],
    });
    const asked = JSON.parse(requests[1].userPrompt) as {
      leaves: Array<{ path: string }>;
    };
    expect(asked.leaves.map((leaf) => leaf.path)).toEqual([
      "content.origins.ancientOrigins",
    ]);
    const sidecar = JSON.parse(
      readFileSync(join(roots.translationsRoot, "en", path), "utf8")
    );
    expect(sidecar.content.origins.ancientOrigins).toBe("EN: Texte révisé.");
    expect(sidecar.content.origins.migrationRoutes[0]).toBe(
      "EN: Depuis Bono-Manso vers Kumase"
    );
  });

  // @req REQ-146
  it("in dry-run mode prints the skeleton and the prompt and writes nothing", async () => {
    const roots = corpus(createRoot());
    const { provider, requests } = fakeProvider(english);

    const outcome = await translateRecord(
      "langues/lin.json",
      options(roots, { dryRun: true }),
      provider
    );

    expect(outcome.status).toBe("dry-run");
    expect(requests).toHaveLength(0);
    expect(() =>
      readFileSync(join(roots.translationsRoot, "en", "langues", "lin.json"))
    ).toThrow();
    if (outcome.status === "dry-run") {
      expect(outcome.skeleton.leaves.map((leaf) => leaf.path)).toEqual([
        "content.sources[0].notes",
      ]);
      expect(outcome.prompt.userPrompt).toContain("Nom Glottolog.");
    }
  });

  // @req REQ-143
  it("refuses an answer that alters an invariant, retries once with the reasons, then fails loudly", async () => {
    const roots = corpus(createRoot());
    let calls = 0;
    const provider: TranslationProvider = {
      async translate(input) {
        calls += 1;
        const { leaves } = JSON.parse(input.userPrompt) as {
          leaves: Array<{ path: string; text: string }>;
        };
        const translations = Object.fromEntries(
          leaves.map((leaf) => [
            leaf.path,
            leaf.path === "content.appellations.exonyms[0]"
              ? "Ashantee (English spelling variant)"
              : `EN: ${leaf.text}`,
          ])
        );
        return {
          ok: true,
          output: { translations },
          model: "m",
          costUsd: 0.01,
        };
      },
    };

    const outcome = await translateRecord(
      "peuples/FLG_NIGERCONGO/PPL_ASANTE.json",
      options(roots),
      provider
    );

    expect(calls).toBe(2);
    expect(outcome).toMatchObject({
      status: "failed",
      reason: expect.stringMatching(/exonyms\[0\]/),
    });
    expect(() =>
      readFileSync(
        join(
          roots.translationsRoot,
          "en",
          "peuples",
          "FLG_NIGERCONGO",
          "PPL_ASANTE.json"
        )
      )
    ).toThrow();
  });

  // @req REQ-144
  it("refuses a forbidden glossary rendering in the translated prose", async () => {
    const roots = corpus(createRoot());
    const { provider } = fakeProvider((path, text) =>
      path === "content.origins.ancientOrigins"
        ? "The Asante are an Akan tribe."
        : english(path, text)
    );

    const outcome = await translateRecord(
      "peuples/FLG_NIGERCONGO/PPL_ASANTE.json",
      options(roots),
      provider
    );

    expect(outcome).toMatchObject({
      status: "failed",
      reason: expect.stringMatching(/tribe/),
    });
  });

  // @req REQ-146
  it("reports a provider failure with its reason and writes nothing", async () => {
    const roots = corpus(createRoot());
    const provider: TranslationProvider = {
      async translate() {
        return {
          ok: false,
          error: "error_max_budget_usd",
          terminalReason: "budget_exhausted",
        };
      },
    };

    const outcome = await translateRecord(
      "langues/lin.json",
      options(roots),
      provider
    );

    expect(outcome).toMatchObject({
      status: "failed",
      reason: expect.stringMatching(/budget_exhausted/),
    });
  });
});
