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

function country(id: string, nameFr: string): GameCountryFixture {
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

const mercator = () => getGameBySlug("mercator");

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

    const envelope = await getGameRoundsHandler(mercator(), 0);

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

    const envelope = await getGameRoundsHandler(mercator(), 0);

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

    const envelope = await getGameRoundsHandler(mercator(), 0);

    expect(envelope.data.rounds).toEqual([]);
  });

  // The game depends on this flag to say so on screen instead of rendering a
  // blank end state when the corpus cannot fill a session.
  // @req REQ-120
  it("reports the corpus as limited when it yields fewer rounds than asked", async () => {
    loadGameCorpus.mockResolvedValue(emptyCorpus);

    const envelope = await getGameRoundsHandler(mercator(), 0);

    expect(envelope.data.corpusLimited).toBe(true);
  });

  // @req REQ-120
  it("never returns more rounds than the game asks for", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      countries: MERCATOR_COUNTRIES,
    });

    const game = mercator();
    const envelope = await getGameRoundsHandler(game, 0);

    expect(envelope.data.rounds.length).toBeLessThanOrEqual(
      game.roundsPerSession
    );
  });

  // @req REQ-120
  it("carries the licence and attribution every v2 response must state", async () => {
    loadGameCorpus.mockResolvedValue(emptyCorpus);

    const envelope = await getGameRoundsHandler(mercator(), 0);

    expect(envelope.meta.license).toBe("CC-BY-SA-4.0");
    expect(envelope.meta.attribution).toBeTruthy();
  });
});

/**
 * Scoping went with the peoples games (charter §1). « La taille qu'on vous a
 * cachée » plays over the whole continent's outlines, so there is no country
 * or family to narrow it to and nothing left to offer the reader.
 */
describe("the session spans the corpus, because it has nothing to narrow to", () => {
  beforeEach(() => {
    loadGameCorpus.mockReset();
    loadGameCorpus.mockResolvedValue(emptyCorpus);
  });

  // @req REQ-120
  it("asks the service for the countries slice and nothing else", async () => {
    await getGameRoundsHandler(mercator(), 0);

    expect(loadGameCorpus).toHaveBeenCalledWith("countries");
  });
});

/**
 * A session opens on subjects a reader is likely to have met and works
 * outwards. Magnitude — here a country's drawn area — stands in for that
 * familiarity; see the band's own doc comment for why it is a proxy.
 */
describe("a session is ordered by ascending difficulty band", () => {
  beforeEach(() => {
    loadGameCorpus.mockReset();
  });

  // @req REQ-120
  it("never serves a harder round before an easier one", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      // Deliberately listed smallest-first: corpus order must not survive.
      countries: [
        country("TUN", "Tunisie"),
        country("SEN", "Sénégal"),
        country("BWA", "Botswana"),
        country("KEN", "Kenya"),
        country("TCD", "Tchad"),
        country("DZA", "Algérie"),
      ],
    });

    const envelope = await getGameRoundsHandler(mercator(), 0);

    const bands = envelope.data.rounds.map((round) => round.difficultyBand);
    expect(bands.length).toBeGreaterThan(0);
    expect([...bands].sort((a, b) => a - b)).toEqual(bands);
  });

  // A pair is as hard as its least familiar member, so every round has to
  // land inside the declared scale rather than inheriting one country's rank.
  // @req REQ-120
  it("bands every round inside the declared scale", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      countries: MERCATOR_COUNTRIES,
    });

    const envelope = await getGameRoundsHandler(mercator(), 0);

    expect(envelope.data.rounds.length).toBeGreaterThan(0);
    for (const round of envelope.data.rounds) {
      expect(round.difficultyBand).toBeGreaterThanOrEqual(1);
      expect(round.difficultyBand).toBeLessThanOrEqual(3);
    }
  });
});
