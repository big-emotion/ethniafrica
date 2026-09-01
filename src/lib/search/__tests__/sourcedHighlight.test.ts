import { describe, expect, it } from "vitest";

import type { DidYouKnowFact } from "@/lib/home/didYouKnowFacts";
import { selectSourcedHighlight } from "@/lib/search/sourcedHighlight";

const zuluFact: DidYouKnowFact = {
  id: "bantou",
  headline: "« Bantou » n'est pas un peuple.",
  body: ["…"],
  entities: [
    { kind: "family", id: "FLG_BANTU", label: "Langues bantoues" },
    { kind: "people", id: "PPL_ZULU", label: "Zoulou" },
  ],
  tier: "referenced",
};

const beninFact: DidYouKnowFact = {
  id: "benin-dahomey",
  headline: "Le Bénin a pris un nom qui n'appartenait à aucun de ses peuples.",
  body: ["…"],
  entities: [{ kind: "country", id: "BEN", label: "Bénin" }],
  tier: "referenced",
};

const facts = [zuluFact, beninFact];

describe("selectSourcedHighlight", () => {
  // @req REQ-124
  it("picks the fact whose entities name the exact people the pivot answers with", () => {
    expect(
      selectSourcedHighlight({ type: "people", id: "PPL_ZULU" }, facts)
    ).toBe(zuluFact);
  });

  // @req REQ-124
  it("picks the fact whose entities name the exact country the pivot answers with", () => {
    expect(selectSourcedHighlight({ type: "country", id: "BEN" }, facts)).toBe(
      beninFact
    );
  });

  // @req REQ-124
  it("maps the pivot's languageFamily type onto the bank's family entity kind", () => {
    expect(
      selectSourcedHighlight({ type: "languageFamily", id: "FLG_BANTU" }, facts)
    ).toBe(zuluFact);
  });

  // @req REQ-124
  it("returns null when no fact names this exact entity", () => {
    expect(
      selectSourcedHighlight({ type: "people", id: "PPL_YORUBA" }, facts)
    ).toBeNull();
  });

  // @req REQ-124
  it("returns null for a pivot type the fact bank never carries, such as a person", () => {
    expect(
      selectSourcedHighlight({ type: "person", id: "PPL_ZULU" }, facts)
    ).toBeNull();
  });

  // @req REQ-124
  it("is deterministic: the first matching fact wins over a later match", () => {
    const secondZuluFact: DidYouKnowFact = {
      ...zuluFact,
      id: "second-zulu-fact",
    };
    expect(
      selectSourcedHighlight({ type: "people", id: "PPL_ZULU" }, [
        zuluFact,
        secondZuluFact,
      ])
    ).toBe(zuluFact);
  });
});
