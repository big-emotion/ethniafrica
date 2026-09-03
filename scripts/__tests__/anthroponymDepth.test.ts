import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { loadAllPatronymeDossiers } from "../../src/lib/afrik/loaders/patronymeJsonLoader";
import {
  DEPTH_STAGES,
  classifyDepth,
  peopleFamilyIndex,
  summariseAnthroponymDepth,
} from "../lib/anthroponymDepth";

const CORPUS = resolve(process.cwd(), "dataset/source/afrik");

const queueSource = { source_kind: "ai_generated" };
const realSource = { source_kind: "publication" };
const claim = { claim: "Dérivé du toponyme.", claimStatus: "claimed" };

function dossier(overrides = {}) {
  return {
    id: "PAT_TEST",
    transmissionMode: "patrilineal",
    sources: [realSource],
    origin: {
      oralTraditions: [],
      writtenChronicles: [claim],
      linguisticReconstructions: [],
    },
    peoples: [{ peopleId: "PPL_ONE" }],
    ...overrides,
  };
}

describe("classifyDepth", () => {
  // @req REQ-133
  it("reads a fiche whose only source is the candidate queue as queue-only", () => {
    expect(classifyDepth(dossier({ sources: [queueSource] }))).toBe(
      "queue-only"
    );
  });

  // @req REQ-133
  it("still reads a fiche as queue-only when it has no source at all", () => {
    expect(classifyDepth(dossier({ sources: [] }))).toBe("queue-only");
  });

  // @req REQ-133
  it("counts a queue source joined by a real one as sourced", () => {
    expect(
      classifyDepth(dossier({ sources: [queueSource, realSource] }))
    ).not.toBe("queue-only");
  });

  // @req REQ-133
  it("reads a sourced fiche with an empty origin as unsourced-origin", () => {
    const empty = {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [],
    };
    expect(classifyDepth(dossier({ origin: empty }))).toBe("unsourced-origin");
  });

  // @req REQ-133
  it("accepts an origin claim from any of the three chapters", () => {
    for (const chapter of [
      "oralTraditions",
      "writtenChronicles",
      "linguisticReconstructions",
    ]) {
      const origin = {
        oralTraditions: [],
        writtenChronicles: [],
        linguisticReconstructions: [],
        [chapter]: [claim],
      };
      expect(classifyDepth(dossier({ origin }))).toBe("documented");
    }
  });

  // @req REQ-133
  it("holds a fiche back when transmissionMode is still other", () => {
    expect(classifyDepth(dossier({ transmissionMode: "other" }))).toBe(
      "undeclared-transmission"
    );
  });

  // @req REQ-133
  it("reads a fiche meeting all three conditions as documented", () => {
    expect(classifyDepth(dossier())).toBe("documented");
  });

  // @req REQ-133
  it("ranks a missing source above a missing claim: a queue-only fiche with no origin reads as queue-only", () => {
    const empty = {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [],
    };
    expect(
      classifyDepth(dossier({ sources: [queueSource], origin: empty }))
    ).toBe("queue-only");
  });
});

describe("summariseAnthroponymDepth", () => {
  const families = new Map([
    ["PPL_ONE", "FLG_ALPHA"],
    ["PPL_TWO", "FLG_BETA"],
  ]);

  // @req REQ-133
  it("counts a fiche attested in two families once per family", () => {
    const summary = summariseAnthroponymDepth(
      [
        dossier({
          peoples: [{ peopleId: "PPL_ONE" }, { peopleId: "PPL_TWO" }],
        }),
      ],
      families
    );

    expect(summary.fiches).toBe(1);
    expect(summary.families.map((f) => f.familyId)).toEqual([
      "FLG_ALPHA",
      "FLG_BETA",
    ]);
    expect(summary.families.every((f) => f.fiches === 1)).toBe(true);
  });

  // @req REQ-133
  it("sets aside a fiche no people attaches to a family", () => {
    const summary = summariseAnthroponymDepth(
      [
        dossier({ peoples: [] }),
        dossier({ peoples: [{ peopleId: "PPL_GHOST" }] }),
      ],
      families
    );

    expect(summary.withoutFamily.fiches).toBe(2);
    expect(summary.families).toHaveLength(0);
  });

  // @req REQ-133
  it("orders families by how much depth work each one still owes", () => {
    const summary = summariseAnthroponymDepth(
      [
        dossier({ peoples: [{ peopleId: "PPL_ONE" }] }),
        dossier({
          peoples: [{ peopleId: "PPL_TWO" }],
          sources: [queueSource],
        }),
        dossier({
          peoples: [{ peopleId: "PPL_TWO" }],
          transmissionMode: "other",
        }),
      ],
      families
    );

    expect(summary.families.map((f) => [f.familyId, f.remaining])).toEqual([
      ["FLG_BETA", 2],
      ["FLG_ALPHA", 0],
    ]);
  });

  // @req REQ-133
  it("splits every fiche into exactly one stage", () => {
    const { dossiers } = loadAllPatronymeDossiers(CORPUS);
    const summary = summariseAnthroponymDepth(
      dossiers,
      peopleFamilyIndex(CORPUS)
    );

    const staged = DEPTH_STAGES.reduce(
      (sum, stage) => sum + summary.byStage[stage],
      0
    );

    expect(summary.fiches).toBeGreaterThan(0);
    expect(staged).toBe(summary.fiches);
    expect(summary.byStage.documented + summary.remaining).toBe(summary.fiches);
  });

  // @req REQ-133
  it("indexes the corpus peoples under the family directory that holds them", () => {
    const index = peopleFamilyIndex(CORPUS);

    expect(index.size).toBeGreaterThan(0);
    for (const familyId of index.values()) {
      expect(familyId).toMatch(/^FLG_/);
    }
  });
});
