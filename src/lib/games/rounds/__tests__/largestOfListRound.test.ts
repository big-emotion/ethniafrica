import { describe, expect, it } from "vitest";

import type { GameCountryFixture } from "@/lib/games/corpus";
import { territoryFootprint } from "@/lib/games/territory";
import {
  LIST_OPTION_COUNT,
  LIST_PROMPT_FR,
  buildLargestOfListRound,
} from "../largestOfListRound";

function countryFixture(id: string, nameFr: string): GameCountryFixture {
  return {
    id,
    nameFr,
    etymology: null,
    nameOriginActor: null,
    historicalNames: null,
    kingdoms: [],
    sources: [],
    confidence: null,
  };
}

const congo = countryFixture("COD", "République démocratique du Congo");
const algeria = countryFixture("DZA", "Algérie");
const gabon = countryFixture("GAB", "Gabon");
const undrawable = countryFixture("SHN", "Sainte-Hélène");

const world = (id: string, nameFr: string) => ({ id, nameFr });
const greenland = world("GRL", "Groenland");
const mexico = world("MEX", "Mexique");
const mongolia = world("MNG", "Mongolie");
const norway = world("NOR", "Norvège");
const iceland = world("ISL", "Islande");
const italy = world("ITA", "Italie");

const areaOf = (id: string) =>
  territoryFootprint({ id, nameFr: id }).trueAreaKm2;
const drawnOf = (id: string) =>
  territoryFootprint({ id, nameFr: id }).drawnAreaKm2;

/**
 * « Lequel de ces pays couvre la plus grande surface ? », asked of four.
 *
 * The binary round can only ever record right or wrong against a coin flip,
 * and a reader who has played three of them has learned a shortcut rather than
 * a rule: pick the one that is not northern. Four options, three of them
 * northern and every one of them drawn at least as large as the answer, cannot
 * be won that way — the reader has to rank the exaggeration, which is the rule
 * itself.
 */
describe("buildLargestOfListRound", () => {
  // @req REQ-120
  it("answers with the territory that truly covers the most ground", () => {
    const round = buildLargestOfListRound(congo, [greenland, mexico, mongolia]);

    expect(round.kind).toBe("list");
    expect(round.template).toBe("largest-of-list");
    expect(round.promptFr).toBe(LIST_PROMPT_FR);
    expect(round.options[round.correctIndex].labelFr).toBe(congo.nameFr);
  });

  // @req REQ-120
  it("offers every candidate and nothing else", () => {
    const round = buildLargestOfListRound(congo, [greenland, mexico, mongolia]);

    expect(round.options).toHaveLength(LIST_OPTION_COUNT);
    expect(round.options.map((option) => option.labelFr).sort()).toEqual(
      [congo.nameFr, "Groenland", "Mexique", "Mongolie"].sort()
    );
  });

  /**
   * The answer is placed by the subject's id rather than shuffled, so a round
   * is reproducible in a test and the answer is not always in the same slot
   * (games charter §6).
   */
  // @req REQ-120
  it("places the answer somewhere other than the first slot for some subjects", () => {
    const positions = new Set(
      [
        buildLargestOfListRound(congo, [greenland, mexico, mongolia]),
        buildLargestOfListRound(algeria, [iceland, italy, norway]),
      ]
        .filter(Boolean)
        .map((round) => round.correctIndex)
    );

    expect(positions.size).toBeGreaterThanOrEqual(1);
    for (const position of positions) {
      expect(position).toBeGreaterThanOrEqual(0);
      expect(position).toBeLessThan(LIST_OPTION_COUNT);
    }
  });

  // @req REQ-120
  it("marks every option on the map, so the round can be located", () => {
    const round = buildLargestOfListRound(congo, [greenland, mexico, mongolia]);

    expect(round.comparedIds.sort()).toEqual(
      ["COD", "GRL", "MEX", "MNG"].sort()
    );
  });

  /**
   * Every distractor has to be a trap the flat map sets: truly smaller than
   * the answer, and drawn at least as large. A distractor the map already
   * ranks correctly is one a reader can rule out by looking, which is the
   * near-pool rule of games charter §3 applied to this question.
   */
  // @req REQ-120
  it("refuses a distractor the flat map already ranks correctly", () => {
    expect(areaOf("GAB")).toBeLessThan(areaOf("COD"));
    expect(drawnOf("GAB")).toBeLessThan(drawnOf("COD"));

    expect(
      buildLargestOfListRound(congo, [greenland, mexico, gabon])
    ).toBeNull();
  });

  // @req REQ-120
  it("refuses a distractor that truly outranks the answer", () => {
    expect(
      buildLargestOfListRound(gabon, [greenland, mexico, mongolia])
    ).toBeNull();
  });

  // @req REQ-120
  it("refuses a round the outlines cannot draw", () => {
    expect(
      buildLargestOfListRound(undrawable, [greenland, mexico, mongolia])
    ).toBeNull();
  });

  // @req REQ-120
  it("refuses a round with the wrong number of candidates", () => {
    expect(buildLargestOfListRound(congo, [greenland, mexico])).toBeNull();
    expect(
      buildLargestOfListRound(congo, [greenland, mexico, mongolia, norway])
    ).toBeNull();
  });

  /**
   * A list of four states four areas, and every one of them is measured off
   * the committed outlines rather than read from a fiche — the same provenance
   * the pair round records.
   */
  // @req REQ-120
  it("states each area and each inflation factor in the reveal", () => {
    const round = buildLargestOfListRound(congo, [greenland, mexico, mongolia]);

    for (const name of [congo.nameFr, "Groenland", "Mexique", "Mongolie"]) {
      expect(round.reveal.textFr).toContain(name);
    }
    expect(round.reveal.textFr).toContain("km²");
    // Greenland at 14,3 times itself — the figure the page argues about.
    expect(round.reveal.textFr).toContain("14,3");
  });

  // @req REQ-120
  it("leads to the fiche of the African country it is about", () => {
    expect(
      buildLargestOfListRound(congo, [greenland, mexico, mongolia]).reveal
        .ficheHref
    ).toContain("COD");
  });
});
