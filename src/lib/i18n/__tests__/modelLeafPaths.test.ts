import { describe, expect, it } from "vitest";

import { modelLeafPaths, recordLeaves } from "../modelLeafPaths";

describe("modelLeafPaths", () => {
  // @req REQ-143
  it("emits dotted paths for nested primitives and treats null as a leaf", () => {
    const model = { id: "X", content: { summary: "<résumé>", debate: null } };
    expect(modelLeafPaths(model, [])).toEqual([
      "id",
      "content.summary",
      "content.debate",
    ]);
  });

  // @req REQ-143
  it("collapses an array of primitives, an empty array and the union of object elements to `[]`", () => {
    const model = {
      exonyms: ["<Exonyme 1>", "<Exonyme 2>"],
      migrationRoutes: [],
      sources: [
        { title: "t", url: "u" },
        { title: "t", notes: "n" },
      ],
    };
    expect(modelLeafPaths(model, [])).toEqual([
      "exonyms[]",
      "migrationRoutes[]",
      "sources[].title",
      "sources[].url",
      "sources[].notes",
    ]);
  });

  // @req REQ-143
  it("emits one `<path>.*` leaf for a subtree whose keys are data, not schema", () => {
    const model = {
      _meta: { format: "AFRIK JSON v2", directives: ["a", "b"] },
      distribution: { total: 0, byCountry: { ISO1: 0, ISO2: 0 } },
    };
    expect(modelLeafPaths(model, ["_meta", "distribution.byCountry"])).toEqual([
      "_meta.*",
      "distribution.total",
      "distribution.byCountry.*",
    ]);
  });
});

describe("recordLeaves", () => {
  // @req REQ-143
  it("pairs every concrete leaf with the model path it instantiates and skips empty containers", () => {
    const record = {
      id: "PPL_X",
      content: {
        exonyms: ["A (gloss)", "B"],
        sources: [{ title: "T", url: null }],
        empty: [],
      },
    };
    expect(recordLeaves(record)).toEqual([
      { segments: ["id"], modelPath: "id", value: "PPL_X" },
      {
        segments: ["content", "exonyms", 0],
        modelPath: "content.exonyms[]",
        value: "A (gloss)",
      },
      {
        segments: ["content", "exonyms", 1],
        modelPath: "content.exonyms[]",
        value: "B",
      },
      {
        segments: ["content", "sources", 0, "title"],
        modelPath: "content.sources[].title",
        value: "T",
      },
      {
        segments: ["content", "sources", 0, "url"],
        modelPath: "content.sources[].url",
        value: null,
      },
    ]);
  });
});
