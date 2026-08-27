import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GameCorpus, GameCountryFixture } from "@/lib/games/corpus";
import { mercatorMisleads } from "@/lib/games/rounds/mercatorRound";
import { getGameBySlug } from "@/lib/games/gameRegistry";

const { loadGameCorpus } = vi.hoisted(() => ({
  loadGameCorpus: vi.fn(),
}));

vi.mock("@/api/v2/services/gamesService", () => ({
  loadGameCorpus,
  GameCorpusUnavailableError: class extends Error {},
}));

const { getGameRoundsHandler } = await import("@/api/v2/handlers/games");

const emptyCorpus: GameCorpus = {
  peoples: [],
  countries: [],
  families: [],
  relations: [],
  migrations: [],
};

function people(overrides: Partial<GameCorpus["peoples"][number]>) {
  return {
    id: "PPL_TEST",
    nameMain: "Test",
    name: { autonym: "Test", exonym: "Test" },
    selfAppellation: "Autonyme",
    exonyms: ["Exonyme"],
    originOfExonyms: "Le terme vient du swahili.",
    currentCountries: ["KEN"],
    totalPopulation: 1_000_000,
    distributionByCountry: [{ country: "KEN", population: 1_000_000 }],
    languageFamilyId: "FLG_BANTU",
    languageFamilyNameFr: "Bantou",
    ...overrides,
  };
}

function country(id: string, nameFr: string): GameCountryFixture {
  return {
    id,
    nameFr,
    etymology: null,
    nameOriginActor: null,
    historicalNames: null,
    kingdoms: [],
  };
}

/**
 * Six real ISO codes, because mercatorMisleads reads the committed admin-0
 * outlines: a made-up country has no geometry and could never mislead.
 */
const MERCATOR_COUNTRIES = [
  country("DZA", "Algérie"),
  country("TCD", "Tchad"),
  country("SEN", "Sénégal"),
  country("TUN", "Tunisie"),
  country("KEN", "Kenya"),
  country("BWA", "Botswana"),
];

const byName = (nameFr: string): GameCountryFixture =>
  MERCATOR_COUNTRIES.find((entry) => entry.nameFr === nameFr);

describe("mercator only asks where the flat map lies", () => {
  beforeEach(() => {
    loadGameCorpus.mockReset();
  });

  // The whole point of this game is that Mercator inflates the north. A
  // northern country really being the larger one is an honest comparison
  // that teaches nothing, and `pairs()` used to serve those by walking the
  // corpus two at a time. mercatorMisleads shipped exported and tested and
  // was never called.
  // @req REQ-120
  it("builds every round from a pair the projection misrepresents", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      countries: MERCATOR_COUNTRIES,
    });

    const envelope = await getGameRoundsHandler(getGameBySlug("mercator"), 0);

    expect(envelope.data.rounds.length).toBeGreaterThan(0);
    for (const round of envelope.data.rounds) {
      const [a, b] = (round as { options: { labelFr: string }[] }).options;
      expect(mercatorMisleads(byName(a.labelFr), byName(b.labelFr))).toBe(true);
    }
  });

  // Padding a short session with honest pairs would quietly undo the filter
  // above; the corpus-limited flag already exists to say so on screen.
  // @req REQ-120
  it("shortens the session rather than padding it with honest pairs", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      countries: [country("SEN", "Sénégal"), country("TUN", "Tunisie")],
    });

    const envelope = await getGameRoundsHandler(getGameBySlug("mercator"), 0);

    expect(envelope.data.rounds).toHaveLength(1);
    expect(envelope.data.corpusLimited).toBe(true);
  });
});

describe("getGameRoundsHandler", () => {
  beforeEach(() => {
    loadGameCorpus.mockReset();
  });

  // @req REQ-120
  it("returns an empty round list rather than throwing when the corpus is empty", async () => {
    loadGameCorpus.mockResolvedValue(emptyCorpus);
    const game = getGameBySlug("appellations");

    const envelope = await getGameRoundsHandler(game, 0);

    expect(envelope.data.rounds).toEqual([]);
  });

  // A game depends on this flag to say so on screen instead of rendering a
  // blank end state when the corpus cannot fill a session.
  // @req REQ-120
  it("reports the corpus as limited when it yields fewer rounds than asked", async () => {
    loadGameCorpus.mockResolvedValue(emptyCorpus);
    const game = getGameBySlug("pays-davant");

    const envelope = await getGameRoundsHandler(game, 0);

    expect(envelope.data.corpusLimited).toBe(true);
  });

  // @req REQ-120
  it("drops a subject the corpus cannot answer honestly instead of padding it", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      // Only the first can carry a round: the others lack the verbatim reveal
      // or the exonym the game contrasts against.
      peoples: [
        people({ id: "PPL_OK" }),
        people({ id: "PPL_NO_ORIGIN", originOfExonyms: null }),
        people({ id: "PPL_NO_EXONYM", exonyms: [] }),
      ],
    });
    const game = getGameBySlug("appellations");

    const envelope = await getGameRoundsHandler(game, 0);

    expect(envelope.data.rounds).toHaveLength(1);
    expect(envelope.data.rounds[0].subjectId).toBe("PPL_OK");
  });

  // @req REQ-120
  it("never returns more rounds than the game asks for", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      peoples: Array.from({ length: 40 }, (_, index) =>
        people({ id: `PPL_${index}` })
      ),
    });
    const game = getGameBySlug("appellations");

    const envelope = await getGameRoundsHandler(game, 0);

    expect(envelope.data.rounds).toHaveLength(game.roundsPerSession);
    expect(envelope.data.corpusLimited).toBe(false);
  });

  // @req REQ-120
  it("carries the licence and attribution every v2 response must state", async () => {
    loadGameCorpus.mockResolvedValue(emptyCorpus);
    const game = getGameBySlug("appellations");

    const envelope = await getGameRoundsHandler(game, 0);

    expect(envelope.meta.license).toBe("CC-BY-SA-4.0");
    expect(envelope.meta.attribution).toBeTruthy();
  });

  // @req REQ-120
  it("loads only the corpus slice the game declares", async () => {
    loadGameCorpus.mockResolvedValue(emptyCorpus);

    await getGameRoundsHandler(getGameBySlug("pays-davant"), 0);

    expect(loadGameCorpus).toHaveBeenCalledWith("countries", undefined);
  });
});

/**
 * Scoping (charter §10 step 5). Two axes over 54 countries and 24 families
 * turn three games into hundreds of distinct sessions without one extra
 * mechanic — and inside a country run, every distractor is plausible by
 * construction.
 */
describe("a session can be narrowed to a country or a family", () => {
  beforeEach(() => {
    loadGameCorpus.mockReset();
    loadGameCorpus.mockResolvedValue(emptyCorpus);
  });

  // @req REQ-120
  it("carries a country scope down to the corpus query", async () => {
    await getGameRoundsHandler(getGameBySlug("appellations"), 0, {
      countryId: "GHA",
    });

    expect(loadGameCorpus).toHaveBeenCalledWith("peoples", {
      countryId: "GHA",
    });
  });

  // @req REQ-120
  it("carries a family scope down to the corpus query", async () => {
    await getGameRoundsHandler(getGameBySlug("appellations"), 0, {
      familyId: "FLG_NIGER_CONGO",
    });

    expect(loadGameCorpus).toHaveBeenCalledWith("peoples", {
      familyId: "FLG_NIGER_CONGO",
    });
  });

  // @req REQ-120
  it("reports no scope when none was asked for", async () => {
    const envelope = await getGameRoundsHandler(
      getGameBySlug("appellations"),
      0
    );

    expect(envelope.data.scope).toBeNull();
    expect(loadGameCorpus).toHaveBeenCalledWith("peoples", undefined);
  });

  // A country game has neither a family nor a single country to be narrowed
  // to: offering the filter would name something the game cannot apply.
  // @req REQ-120
  it("refuses a scope on a game that plays over countries", async () => {
    const envelope = await getGameRoundsHandler(getGameBySlug("mercator"), 0, {
      familyId: "FLG_NIGER_CONGO",
    });

    expect(loadGameCorpus).toHaveBeenCalledWith("countries", undefined);
    expect(envelope.data.scope).toBeNull();
    expect(envelope.data.scopeChoices).toBeNull();
  });

  // @req REQ-120
  it("offers the whole country and family vocabulary even inside a scope", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      families: [{ id: "FLG_A", nameFr: "Famille A" }],
      countries: [country("GHA", "Ghana"), country("KEN", "Kenya")],
    });

    const envelope = await getGameRoundsHandler(
      getGameBySlug("appellations"),
      0,
      { familyId: "FLG_A" }
    );

    expect(envelope.data.scopeChoices.families).toEqual([
      { id: "FLG_A", labelFr: "Famille A" },
    ]);
    expect(envelope.data.scopeChoices.countries).toHaveLength(2);
  });
});

/**
 * A session opens on subjects a reader is likely to have met and works
 * outwards. Magnitude — a people's population, a country's drawn area —
 * stands in for that familiarity; see the band's own doc comment for why it
 * is a proxy and not a ranking of peoples.
 */
describe("a session is ordered by ascending difficulty band", () => {
  beforeEach(() => {
    loadGameCorpus.mockReset();
  });

  const POOL_SIZE = 20;

  /** Population descends with the index, so a people's expected band is a function of its position. */
  const GRADED_PEOPLES = Array.from({ length: POOL_SIZE }, (_, index) =>
    people({
      id: `PPL_${String(index).padStart(2, "0")}`,
      totalPopulation: (POOL_SIZE - index) * 1_000_000,
      selfAppellation: `Autonyme ${index}`,
      exonyms: [`Exonyme ${index}`],
    })
  );

  // @req REQ-120
  it("never serves a harder round before an easier one", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      peoples: GRADED_PEOPLES,
    });

    const envelope = await getGameRoundsHandler(
      getGameBySlug("appellations"),
      0
    );

    const bands = envelope.data.rounds.map((round) => round.difficultyBand);
    expect(bands).toHaveLength(8);
    expect([...bands].sort((a, b) => a - b)).toEqual(bands);
  });

  // @req REQ-120
  it("draws the opening rounds from the pool's top population decile", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      peoples: GRADED_PEOPLES,
    });

    const envelope = await getGameRoundsHandler(
      getGameBySlug("appellations"),
      0
    );

    expect(envelope.data.rounds[0].difficultyBand).toBe(1);
    expect(envelope.data.rounds[1].difficultyBand).toBe(1);
    // The two most populous of the twenty, and no one else.
    expect(envelope.data.rounds.slice(0, 2).map((r) => r.subjectId)).toEqual([
      "PPL_00",
      "PPL_01",
    ]);
  });

  // @req REQ-120
  it("puts a people whose population the corpus omits in the hardest band", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      peoples: [
        people({
          id: "PPL_UNKNOWN",
          totalPopulation: null,
          selfAppellation: "Autonyme inconnu",
          exonyms: ["Exonyme inconnu"],
        }),
        ...GRADED_PEOPLES,
      ],
    });

    const envelope = await getGameRoundsHandler(
      getGameBySlug("appellations"),
      0
    );

    // An unrecorded figure must not read as a small one, and must never be
    // promoted to the opening rounds by arriving first in the corpus.
    expect(envelope.data.rounds[0].subjectId).not.toBe("PPL_UNKNOWN");
  });

  // @req REQ-120
  it("bands a country round by the area its outline actually covers", async () => {
    const formerlyNamed = (id: string, nameFr: string): GameCountryFixture => ({
      ...country(id, nameFr),
      etymology: `Le nom de ${nameFr} vient d'une racine ancienne.`,
      historicalNames: { precolonial: `Ancien nom de ${nameFr}` },
    });

    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      // Deliberately listed smallest-first: corpus order must not survive.
      countries: [
        formerlyNamed("TUN", "Tunisie"),
        formerlyNamed("SEN", "Sénégal"),
        formerlyNamed("BWA", "Botswana"),
        formerlyNamed("KEN", "Kenya"),
        formerlyNamed("TCD", "Tchad"),
        formerlyNamed("DZA", "Algérie"),
      ],
    });

    const envelope = await getGameRoundsHandler(
      getGameBySlug("pays-davant"),
      0
    );

    const bands = envelope.data.rounds.map((round) => round.difficultyBand);
    expect([...bands].sort((a, b) => a - b)).toEqual(bands);
    // Algeria covers more ground than any of the other five.
    expect(envelope.data.rounds[0].subjectId).toBe("DZA");
  });
});
