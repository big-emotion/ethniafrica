import { beforeEach, describe, expect, it, vi } from "vitest";

import { AFRICA_ADMIN0 } from "@/lib/atlas/assets/africaAdmin0";
import type { GameCorpus, GameCountryFixture } from "@/lib/games/corpus";
import { mercatorMisleads } from "@/lib/games/rounds/mercatorRound";
import {
  MINIMUM_INFLATION_RATIO,
  mercatorInflationOf,
} from "@/lib/games/rounds/inflationRound";
import {
  isEstimateRound,
  isOptionRound,
  type BinaryRound,
  type GameRound,
  type RoundTemplate,
} from "@/lib/games/gameKinds";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import {
  NON_AFRICAN_SILHOUETTES,
  type ComparedTerritory,
} from "@/lib/games/territory";

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

/**
 * A comparison round may now hold a silhouette from outside the corpus, so
 * resolving an option's label has to look in both pools — the way the handler
 * itself does when it builds the pair.
 */
const byName = (nameFr: string): ComparedTerritory =>
  [...MERCATOR_COUNTRIES, ...NON_AFRICAN_SILHOUETTES].find(
    (entry) => entry.nameFr === nameFr
  );

const mercator = () => getGameBySlug("mercator");

/**
 * `kind` is the control a round is answered with and `template` is the
 * question it asks; two of the three templates share the same two buttons, so
 * a suite that filtered on `kind` was reading « the comparison rounds » and
 * getting every binary round the game builds.
 */
const withTemplate = (
  rounds: GameRound[],
  template: RoundTemplate
): BinaryRound[] =>
  rounds.filter(isOptionRound).filter((round) => round.template === template);

const comparisons = (rounds: GameRound[]): BinaryRound[] =>
  withTemplate(rounds, "larger-area");

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
  it("builds every comparison round from a pair the projection misrepresents", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      countries: MERCATOR_COUNTRIES,
    });

    const envelope = await getGameRoundsHandler(mercator(), 0);
    const pairRounds = comparisons(envelope.data.rounds);

    expect(pairRounds.length).toBeGreaterThan(0);
    for (const round of pairRounds) {
      const [a, b] = round.options;
      expect(mercatorMisleads(byName(a.labelFr), byName(b.labelFr))).toBe(true);
    }
  });

  // Padding a short session with honest pairs would quietly undo the filter
  // above. The session is topped up with the other two questions instead,
  // which are measured off the committed outlines and misrepresent nothing.
  // @req REQ-120
  it("shortens the comparison rounds rather than padding them with honest pairs", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      countries: [country("SEN", "Sénégal"), country("TUN", "Tunisie")],
    });

    const envelope = await getGameRoundsHandler(mercator(), 0);

    expect(comparisons(envelope.data.rounds)).toHaveLength(1);
  });
});

/**
 * Proposal B of the round-bank widening: the comparison this page exists to
 * make was not in the game that argues it. Greenland is 2,15 M km² and only
 * two African countries outrank it, so an inversion of rank against the
 * continent is rare — and it lived in a second committed asset the round
 * could not reach.
 */
describe("a comparison may reach outside the continent", () => {
  beforeEach(() => {
    loadGameCorpus.mockReset();
  });

  // @req REQ-120
  it("sets a borrowed silhouette against the African country that outranks it", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      countries: [country("COD", "République démocratique du Congo")],
    });

    const envelope = await getGameRoundsHandler(mercator(), 0);
    const labels = comparisons(envelope.data.rounds).flatMap((round) =>
      round.options.map((option) => option.labelFr)
    );
    const borrowed = NON_AFRICAN_SILHOUETTES.map(
      (silhouette) => silhouette.nameFr
    );

    expect(labels).toContain("République démocratique du Congo");
    expect(labels.some((label) => borrowed.includes(label))).toBe(true);
  });

  /**
   * Western Europe against India is a round on an atlas of African peoples
   * that mentions no African anything. An empty corpus is exactly when it
   * would be served, the six silhouettes being the only pool left standing.
   */
  // @req REQ-120
  it("never sets two borrowed silhouettes against each other", async () => {
    loadGameCorpus.mockResolvedValue(emptyCorpus);

    const envelope = await getGameRoundsHandler(mercator(), 0);

    expect(comparisons(envelope.data.rounds)).toEqual([]);
  });

  /**
   * A silhouette has no fiche, so the reveal of a mixed pair leads to the
   * African half — never to `/pays/GRL`, which is a 404 behind an id that
   * looks like an ISO code because, for Greenland, it is one.
   */
  // @req REQ-120
  it("leads a mixed pair to the fiche of its African half", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      countries: [country("COD", "République démocratique du Congo")],
    });

    const envelope = await getGameRoundsHandler(mercator(), 0);

    for (const round of comparisons(envelope.data.rounds)) {
      expect(round.reveal.ficheHref).toContain("COD");
    }
  });
});

/**
 * Proposal A: the page asserted the mechanism in every reveal for a year and
 * never asked it. `mercatorMisleads` only accepts an inverted ranking, which
 * needs two near-identical areas, and the minimum ratio then throws those
 * out — twelve reachable pairs against a session of eight. Asking about the
 * factor instead of the ground lifts the ceiling to hundreds.
 */
describe("the game also asks which country the projection enlarges more", () => {
  beforeEach(() => {
    loadGameCorpus.mockReset();
  });

  // @req REQ-120
  it("pairs countries the projection treats differently enough to reason about", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      countries: MERCATOR_COUNTRIES,
    });

    const envelope = await getGameRoundsHandler(mercator(), 0);
    const rounds = withTemplate(envelope.data.rounds, "greater-inflation");

    expect(rounds.length).toBeGreaterThan(0);
    for (const round of rounds) {
      const [a, b] = round.options.map((option) =>
        mercatorInflationOf(byName(option.labelFr))
      );
      expect(Math.max(a, b) / Math.min(a, b)).toBeGreaterThanOrEqual(
        MINIMUM_INFLATION_RATIO
      );
    }
  });

  /**
   * Greenland against Kenya is 14,3 against 1,0 — an answer readable off the
   * shape of the option, which is the eyesight the charter's kill test
   * refuses. This question stays inside the continent.
   */
  // @req REQ-120
  it("never borrows a silhouette from outside the continent", async () => {
    loadGameCorpus.mockResolvedValue(emptyCorpus);

    const envelope = await getGameRoundsHandler(mercator(), 0);

    expect(withTemplate(envelope.data.rounds, "greater-inflation")).toEqual([]);
  });

  /**
   * The reason the bank was widened this way rather than by curating more
   * countries: the ceiling was the filter, not the corpus.
   */
  // @req REQ-120
  it("carries the whole continent far past what the comparison alone could", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      countries: Object.entries(AFRICA_ADMIN0).map(([id, shape]) =>
        country(id, shape.nameFr)
      ),
    });

    const envelope = await getGameRoundsHandler(mercator(), 0);
    const rounds = envelope.data.rounds;

    expect(
      withTemplate(rounds, "greater-inflation").length
    ).toBeGreaterThanOrEqual(withTemplate(rounds, "larger-area").length);
  });
});

/**
 * A reader who meets the same question eight times has met one game, whatever
 * the bank holds behind it. The three lists are wildly uneven — hundreds of
 * inflation pairs, a dozen comparisons, exactly six estimates — so the
 * alternation has to be round-robin rather than proportional.
 */
describe("a session opens on more than one question", () => {
  beforeEach(() => {
    loadGameCorpus.mockReset();
  });

  /**
   * Six windows of eight, drawn fresh on every request. The number is worth
   * pinning: the pool was eighteen when a reader wrote in to say the game had
   * eight questions and only those, and a regression here would put it back
   * without failing anything else.
   */
  // @req REQ-120
  it("holds several sessions' worth of rounds", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      countries: Object.entries(AFRICA_ADMIN0).map(([id, shape]) =>
        country(id, shape.nameFr)
      ),
    });

    const game = mercator();
    const envelope = await getGameRoundsHandler(game, 0);

    expect(envelope.data.rounds.length).toBeGreaterThanOrEqual(
      game.roundsPerSession * 4
    );
  });

  // @req REQ-120
  it("serves all three questions inside the first session", async () => {
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      countries: Object.entries(AFRICA_ADMIN0).map(([id, shape]) =>
        country(id, shape.nameFr)
      ),
    });

    const game = mercator();
    const envelope = await getGameRoundsHandler(game, 0);
    const session = envelope.data.rounds.slice(0, game.roundsPerSession);

    expect(new Set(session.map((round) => round.template))).toEqual(
      new Set(["larger-area", "greater-inflation", "fits-in-africa"])
    );
  });
});

/**
 * The seed rotates the pool before pairing, so two requests do not hand back
 * the same session. Until the page stopped deriving it from its own slug this
 * was reachable in principle and constant in practice — see the page.
 */
describe("the seed decides which pairs form", () => {
  beforeEach(() => {
    loadGameCorpus.mockReset();
    loadGameCorpus.mockResolvedValue({
      ...emptyCorpus,
      countries: Object.entries(AFRICA_ADMIN0).map(([id, shape]) =>
        country(id, shape.nameFr)
      ),
    });
  });

  // @req REQ-120
  it("serves a different session for a different seed", async () => {
    const game = mercator();
    const opening = async (seed: number) =>
      (await getGameRoundsHandler(game, seed)).data.rounds
        .slice(0, game.roundsPerSession)
        .map((round) => `${round.template}:${round.subjectId}`)
        .join("|");

    expect(await opening(0)).not.toBe(await opening(17));
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
