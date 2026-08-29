import { beforeEach, describe, expect, it, vi } from "vitest";

import { AFRICA_ADMIN0 } from "@/lib/atlas/assets/africaAdmin0";
import type { GameCorpus, GameCountryFixture } from "@/lib/games/corpus";
import { mercatorMisleads } from "@/lib/games/rounds/mercatorRound";
import { isEstimateRound, isOptionRound } from "@/lib/games/gameKinds";
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
    const pairRounds = envelope.data.rounds.filter(isOptionRound);

    expect(pairRounds.length).toBeGreaterThan(0);
    for (const round of pairRounds) {
      const [a, b] = round.options;
      expect(mercatorMisleads(byName(a.labelFr), byName(b.labelFr))).toBe(true);
    }
  });

  // Padding a short session with honest pairs would quietly undo the filter
  // above. The session is topped up with estimate rounds instead, which are
  // measured off the committed outlines and misrepresent nothing.
  // @req REQ-120
  it("shortens the pair rounds rather than padding them with honest pairs", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      countries: [country("SEN", "Sénégal"), country("TUN", "Tunisie")],
    });

    const envelope = await getGameRoundsHandler(mercator(), 0);

    expect(envelope.data.rounds.filter(isOptionRound)).toHaveLength(1);
  });
});

describe("getGameRoundsHandler", () => {
  beforeEach(() => {
    loadGameCorpus.mockReset();
  });

  /**
   * The estimate rounds read the committed outlines rather than the corpus,
   * so an empty database costs the session its country pairs and nothing
   * else. The page used to go blank here; the claim it makes is about
   * geometry and should not depend on Supabase answering.
   */
  // @req REQ-120
  it("still serves the asset-backed rounds when the corpus is empty", async () => {
    loadGameCorpus.mockResolvedValue(emptyCorpus);

    const envelope = await getGameRoundsHandler(mercator(), 0);

    expect(envelope.data.rounds.filter(isOptionRound)).toEqual([]);
    expect(envelope.data.rounds.filter(isEstimateRound).length).toBeGreaterThan(
      0
    );
  });

  // The game depends on this flag to say so on screen instead of quietly
  // serving a short session.
  // @req REQ-120
  it("reports the corpus as limited when it yields fewer rounds than asked", async () => {
    loadGameCorpus.mockResolvedValue(emptyCorpus);

    const envelope = await getGameRoundsHandler(mercator(), 0);

    expect(envelope.data.rounds.length).toBeLessThan(
      mercator().roundsPerSession
    );
    expect(envelope.data.corpusLimited).toBe(true);
  });

  /**
   * The handler used to cut the pool to one session here, which meant the
   * page's constant seed served every visitor the same rounds for good. The
   * pool travels whole and `takeSession` cuts it on the client, so a replay
   * can advance to the next window.
   */
  // @req REQ-120
  it("returns the whole pool, not one session's worth", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      countries: Object.entries(AFRICA_ADMIN0).map(([id, shape]) =>
        country(id, shape.nameFr)
      ),
    });

    const game = mercator();
    const envelope = await getGameRoundsHandler(game, 0);

    expect(envelope.data.rounds.length).toBeGreaterThan(game.roundsPerSession);
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

/**
 * Eight taps on the same control is a worse session than a mixed one, and the
 * two round kinds ask different things of the reader: one is a judgement
 * between two names, the other a judgement about a magnitude. The assembly
 * has to satisfy both this and the ascending bands above, which is why the
 * alternation happens inside a band rather than across the whole session.
 */
describe("a session mixes the two gestures", () => {
  beforeEach(() => {
    loadGameCorpus.mockReset();
  });

  // @req REQ-120
  it("serves both a pair round and an estimate round", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      countries: MERCATOR_COUNTRIES,
    });

    const envelope = await getGameRoundsHandler(mercator(), 0);

    expect(envelope.data.rounds.filter(isOptionRound).length).toBeGreaterThan(
      0
    );
    expect(envelope.data.rounds.filter(isEstimateRound).length).toBeGreaterThan(
      0
    );
  });

  /**
   * Against the real continent rather than the six-country fixture: the
   * shortfall this fixes is a property of the whole corpus. Measured before
   * the estimate rounds existed, the page served seven of its eight rounds
   * and always the same seven, because only sixteen African pairs mislead at
   * all and the greedy pairing reaches twelve of them.
   */
  // @req REQ-120
  it("fills the session now that the outlines top it up", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      countries: Object.entries(AFRICA_ADMIN0).map(([id, shape]) =>
        country(id, shape.nameFr)
      ),
    });

    const game = mercator();
    const envelope = await getGameRoundsHandler(game, 0);

    expect(envelope.data.rounds.length).toBeGreaterThanOrEqual(
      game.roundsPerSession
    );
    expect(envelope.data.corpusLimited).toBe(false);
  });
});
