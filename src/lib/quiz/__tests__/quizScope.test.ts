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
import type { QuizThemeId } from "@/lib/quiz/segmentPolicy";

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

  // @req REQ-103
  it("writes nothing for the default track, so the bare page is the way out", () => {
    expect(quizScopeSearchParams({ kind: "mixed" }).toString()).toBe("");
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

describe("composeLadder — theme spread", () => {
  const flatBands = new Map(
    Array.from({ length: 40 }, (_, i) => [`PPL_${i}`, "moyen" as const])
  );

  /**
   * One question per subject, `themes` laid out in blocks rather than
   * interleaved.
   *
   * The pool arrives shuffled in production, so a test whose themes alternate
   * proves nothing: the existing subject-freshness rule alone would spread them
   * evenly and the assertion would pass with no quota implemented. Blocks are
   * the shape that fails without one.
   */
  function themedPool(themes: QuizThemeId[]) {
    const perTheme = Math.ceil(40 / themes.length);
    return Array.from({ length: 40 }, (_, i) => ({
      id: `q-${i}`,
      entityId: `PPL_${i}`,
      theme: themes[Math.floor(i / perTheme)] ?? themes[themes.length - 1],
    }));
  }

  /**
   * The complaint this whole change answers: eight rounds that all felt like
   * the same question. Drawing uniformly from twelve templates leaves a theme
   * appearing three or four times by chance, and the reader reads that as
   * repetition whatever the subjects were.
   */
  // @req REQ-121
  it("serves no more than two rounds of one theme", () => {
    const session = composeLadder(
      themedPool(["noms", "croyances", "migrations", "langues"]),
      flatBands
    );

    const perTheme = new Map<string, number>();
    for (const entry of session) {
      perTheme.set(entry.theme, (perTheme.get(entry.theme) ?? 0) + 1);
    }

    expect(session).toHaveLength(8);
    expect(Math.max(...perTheme.values())).toBeLessThanOrEqual(2);
    expect(perTheme.size).toBeGreaterThanOrEqual(4);
  });

  /**
   * The quota is a preference, not a wall. A track holding one theme has to
   * pay eight rounds of it — returning three would be a worse answer than an
   * honest repetition, which is the rule the band and subject fallbacks
   * already follow.
   */
  // @req REQ-121
  it("fills the session anyway when the track holds only one theme", () => {
    const session = composeLadder(themedPool(["noms"]), flatBands);

    expect(session).toHaveLength(8);
    expect(new Set(session.map((entry) => entry.theme))).toEqual(
      new Set(["noms"])
    );
  });

  // @req REQ-121
  it("keeps the band ladder above the theme quota", () => {
    // A theme already at quota must not promote a candidate out of its band:
    // the ascending difficulty is what makes a session a track rather than a
    // pile.
    const bandsByRung = new Map([
      ["PPL_EASY", "facile" as const],
      ["PPL_HARD_A", "difficile" as const],
      ["PPL_HARD_B", "difficile" as const],
    ]);
    const session = composeLadder(
      [
        { id: "q-hard-a", entityId: "PPL_HARD_A", theme: "noms" as const },
        { id: "q-hard-b", entityId: "PPL_HARD_B", theme: "noms" as const },
        { id: "q-easy", entityId: "PPL_EASY", theme: "croyances" as const },
      ],
      bandsByRung,
      ["facile", "difficile"]
    );

    expect(session.map((entry) => entry.id)).toEqual(["q-easy", "q-hard-a"]);
  });

  // @req REQ-121
  it("still works on candidates carrying no theme at all", () => {
    const session = composeLadder(
      Array.from({ length: 40 }, (_, i) => ({
        id: `q-${i}`,
        entityId: `PPL_${i}`,
      })),
      flatBands
    );

    expect(session).toHaveLength(8);
  });
});
