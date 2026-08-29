import { describe, expect, it } from "vitest";
import {
  bandSubjectsByPopulation,
  composeLadder,
  parseQuizScope,
  QUIZ_SESSION_SIZE,
  quizScopeKey,
  quizScopeSearchParams,
  sessionBandPlan,
  SESSION_BAND_PLAN,
} from "@/lib/quiz/quizScope";

describe("parseQuizScope", () => {
  // @req REQ-103
  it("reads a country track off the pays parameter", () => {
    expect(parseQuizScope({ pays: "GHA" })).toEqual({
      kind: "country",
      entityId: "GHA",
    });
  });

  // @req REQ-103
  it("reads a family track off the famille parameter", () => {
    expect(parseQuizScope({ famille: "FLG_NIGER_CONGO" })).toEqual({
      kind: "family",
      entityId: "FLG_NIGER_CONGO",
    });
  });

  // @req REQ-103
  it("treats a blank parameter as no filter, not as an empty id", () => {
    // `?pays=` is what a GET form submits when the select is on « Tous les
    // pays ». Read as a country id it would compose an empty session under a
    // filter nobody set.
    expect(parseQuizScope({ pays: "  " })).toEqual({ kind: "mixed" });
  });

  // @req REQ-103
  it("prefers the country when both axes are given", () => {
    expect(parseQuizScope({ pays: "GHA", famille: "FLG_NIGER_CONGO" })).toEqual(
      { kind: "country", entityId: "GHA" }
    );
  });

  // @req REQ-103
  it("distinguishes the random track from the default mixed one", () => {
    expect(parseQuizScope({ mode: "aleatoire" })).toEqual({ kind: "random" });
    expect(parseQuizScope({})).toEqual({ kind: "mixed" });
  });
});

describe("quizScopeSearchParams", () => {
  // @req REQ-103
  it("round-trips a track through the query string", () => {
    const scope = { kind: "family" as const, entityId: "FLG_KHOISAN" };
    const params = quizScopeSearchParams(scope);
    expect(parseQuizScope(Object.fromEntries(params.entries()))).toEqual(scope);
  });

  /**
   * It used to write nothing, on the reasoning that the bare page was the way
   * out. But the way out is `exitHref`, a path the page hands down; what this
   * feeds is the replay link and the session request, and there an empty query
   * names no track — so replaying the whole-corpus run landed on the picker.
   */
  // @req REQ-103
  it("names the whole-corpus track, so replaying it opens a session", () => {
    const params = quizScopeSearchParams({ kind: "mixed" });
    expect(params.toString()).toBe("mode=mixte");
    expect(parseQuizScope(Object.fromEntries(params.entries()))).toEqual({
      kind: "mixed",
    });
  });
});

describe("quizScopeKey", () => {
  // @req REQ-103
  it("names a track uniquely across kinds", () => {
    expect(quizScopeKey({ kind: "country", entityId: "GHA" })).toBe(
      "country:GHA"
    );
    expect(quizScopeKey({ kind: "random" })).toBe("random");
  });
});

describe("sessionBandPlan", () => {
  // @req REQ-103
  it("is two easy, four middling and two hard for a session of eight", () => {
    expect(sessionBandPlan(QUIZ_SESSION_SIZE)).toEqual([...SESSION_BAND_PLAN]);
  });

  // @req REQ-103
  it("keeps a hard round in a shorter session", () => {
    // Slicing the eight-slot plan gave a five-round session no hard round at
    // all — a ladder with its top step missing.
    expect(sessionBandPlan(5)).toEqual([
      "facile",
      "moyen",
      "moyen",
      "moyen",
      "difficile",
    ]);
  });
});

describe("bandSubjectsByPopulation", () => {
  const pool = Array.from({ length: 20 }, (_, index) => ({
    id: `PPL_${index}`,
    totalPopulation: (20 - index) * 100_000,
  }));

  // @req REQ-103
  it("puts the most populous subject of the pool in the easy band", () => {
    expect(bandSubjectsByPopulation(pool).get("PPL_0")).toBe("facile");
  });

  // @req REQ-103
  it("puts the least populous in the hard band", () => {
    expect(bandSubjectsByPopulation(pool).get("PPL_19")).toBe("difficile");
  });

  // @req REQ-103
  it("bands relative to the pool, so the same people moves with its scope", () => {
    // 300 000 is a household name inside a small country and an obscurity
    // inside a large one, and a session is played inside one scope at a time.
    const small = [
      { id: "PPL_X", totalPopulation: 300_000 },
      { id: "PPL_Y", totalPopulation: 20_000 },
    ];
    const large = [
      { id: "PPL_BIG", totalPopulation: 40_000_000 },
      { id: "PPL_X", totalPopulation: 300_000 },
    ];

    expect(bandSubjectsByPopulation(small).get("PPL_X")).toBe("facile");
    expect(bandSubjectsByPopulation(large).get("PPL_X")).toBe("difficile");
  });

  // @req REQ-103
  it("sorts a fiche with no population last", () => {
    const bands = bandSubjectsByPopulation([
      { id: "PPL_KNOWN", totalPopulation: 1_000_000 },
      { id: "PPL_UNKNOWN", totalPopulation: null },
    ]);
    expect(bands.get("PPL_UNKNOWN")).toBe("difficile");
  });
});

describe("composeLadder", () => {
  const bands = new Map([
    ["PPL_BIG", "facile" as const],
    ["PPL_MID", "moyen" as const],
    ["PPL_SMALL", "difficile" as const],
  ]);

  function candidate(id: string, entityId: string) {
    return { id, entityId };
  }

  // @req REQ-103
  it("climbs from the easy band to the hard one", () => {
    const session = composeLadder(
      [
        candidate("q-small", "PPL_SMALL"),
        candidate("q-mid", "PPL_MID"),
        candidate("q-big", "PPL_BIG"),
      ],
      bands,
      ["facile", "moyen", "difficile"]
    );

    expect(session.map((entry) => entry.id)).toEqual([
      "q-big",
      "q-mid",
      "q-small",
    ]);
  });

  // @req REQ-103
  it("prefers an unused subject within the band being filled", () => {
    const twoEasy = new Map([
      ["PPL_BIG", "facile" as const],
      ["PPL_ALSO_BIG", "facile" as const],
    ]);
    const session = composeLadder(
      [
        candidate("q-big-1", "PPL_BIG"),
        candidate("q-big-2", "PPL_BIG"),
        candidate("q-other", "PPL_ALSO_BIG"),
      ],
      twoEasy,
      ["facile", "facile"]
    );

    expect(session.map((entry) => entry.entityId)).toEqual([
      "PPL_BIG",
      "PPL_ALSO_BIG",
    ]);
  });

  // @req REQ-103
  it("holds the band rather than jumping to a fresher subject of another one", () => {
    // Freshness ranks below the band on purpose: in a narrow track it buys no
    // extra subject — the same three peoples are played either way — and it
    // costs the ascending order that is the whole point of the ladder.
    const session = composeLadder(
      [
        candidate("q-big-1", "PPL_BIG"),
        candidate("q-big-2", "PPL_BIG"),
        candidate("q-mid", "PPL_MID"),
      ],
      bands,
      ["facile", "facile", "moyen"]
    );

    expect(session.map((entry) => entry.entityId)).toEqual([
      "PPL_BIG",
      "PPL_BIG",
      "PPL_MID",
    ]);
  });

  // @req REQ-103
  it("repeats a subject rather than returning a short session", () => {
    // Djibouti holds three peoples. Eight rounds over three subjects is what
    // the corpus has; five rounds would be a worse answer than a repetition.
    const session = composeLadder(
      [candidate("q-1", "PPL_BIG"), candidate("q-2", "PPL_BIG")],
      bands,
      ["facile", "moyen"]
    );

    expect(session).toHaveLength(2);
  });

  // @req REQ-103
  it("returns what it has when the track cannot fill the plan", () => {
    const session = composeLadder([candidate("q-1", "PPL_BIG")], bands, [
      "facile",
      "moyen",
      "difficile",
    ]);

    expect(session).toHaveLength(1);
  });

  // @req REQ-103
  it("never serves the same question twice in one session", () => {
    const session = composeLadder(
      [
        candidate("q-1", "PPL_BIG"),
        candidate("q-2", "PPL_MID"),
        candidate("q-3", "PPL_SMALL"),
      ],
      bands
    );

    expect(new Set(session.map((entry) => entry.id)).size).toBe(session.length);
  });
});
