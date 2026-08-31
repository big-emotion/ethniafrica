/**
 * What the game's corpus read is allowed to touch (REQ-120).
 *
 * The scoping tests that stood here went with the peoples games: a scope had
 * to reach the query rather than filter the page afterwards, because
 * `loadPeoples` read the first 150 peoples of ~890. No game reads peoples any
 * more, so what is left to hold is the narrower promise — a game pays for the
 * slice it declares and for nothing else.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const { loadGameCorpus } = await import("../gamesService");

interface FakeResult {
  data: unknown;
  error: unknown;
}

function orderedQuery(result: FakeResult) {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => Promise.resolve(result)),
  };
  return query;
}

/** `confidence_scores` is read through the shared module-zero batch helper. */
function confidenceQuery(result: FakeResult) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => Promise.resolve(result)),
  };
  return query;
}

const EMPTY = { data: [], error: null };

function wireTables(overrides: Record<string, unknown> = {}) {
  const tables: Record<string, unknown> = {
    afrik_countries: orderedQuery(EMPTY),
    confidence_scores: confidenceQuery(EMPTY),
    ...overrides,
  };
  fromMock.mockImplementation((table: string) => tables[table]);
  return tables;
}

beforeEach(() => {
  fromMock.mockReset();
});

describe("loadGameCorpus", () => {
  // @req REQ-120
  it("reads the countries the game declares", async () => {
    wireTables({
      afrik_countries: orderedQuery({
        data: [
          {
            id: "GHA",
            name_fr: "Ghana",
            etymology: null,
            name_origin_actor: null,
            content: null,
          },
        ],
        error: null,
      }),
    });

    const corpus = await loadGameCorpus("countries");

    expect(corpus.countries).toHaveLength(1);
    expect(corpus.countries[0].nameFr).toBe("Ghana");
  });

  // A slice no game declares is a Supabase read nothing can reach, and the
  // peoples pool was the widest of them — it carried the whole JSONB payload.
  // @req REQ-120
  it("never touches the peoples tables the retired games read", async () => {
    wireTables();

    await loadGameCorpus("countries");

    expect(fromMock).not.toHaveBeenCalledWith("afrik_peoples");
    expect(fromMock).not.toHaveBeenCalledWith("afrik_people_countries");
    expect(fromMock).not.toHaveBeenCalledWith("afrik_language_families");
  });

  // @req REQ-120
  it("hands back empty slices for everything no game asks for", async () => {
    wireTables();

    const corpus = await loadGameCorpus("countries");

    expect(corpus.peoples).toEqual([]);
    expect(corpus.families).toEqual([]);
    expect(corpus.relations).toEqual([]);
    expect(corpus.migrations).toEqual([]);
  });
});
