import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GameCorpus } from "@/lib/games/corpus";
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

  // The two short-corpus games depend on this flag to say so on screen
  // instead of rendering a blank end state.
  // @req REQ-120
  it("reports the corpus as limited when it yields fewer rounds than asked", async () => {
    loadGameCorpus.mockResolvedValue(emptyCorpus);
    const game = getGameBySlug("liens");

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

    await getGameRoundsHandler(getGameBySlug("royaumes"), 0);

    expect(loadGameCorpus).toHaveBeenCalledWith("countries");
  });
});
