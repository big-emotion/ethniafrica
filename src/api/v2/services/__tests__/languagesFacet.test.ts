/**
 * Test-first: what the language facet of the atlas hub reads (REQ-136, REQ-139).
 *
 * The languages index fetches the whole corpus on every render — 748 rows with
 * an embedded family join — and filters and pages it in memory, with
 * `perPage: 1000` sitting exactly on PostgREST's max-rows ceiling, where the
 * 749th language would be dropped without an error. This pushes the narrowing
 * down to the database and gives the axis the same trio the other facets have.
 *
 * The country filter has no join table to read: nothing links a language to a
 * country. It is derived through the peoples that speak it, cached hourly —
 * the rule `getCountryIdsByLanguageFamily` already states for a family, which
 * sits one level above a language in the same hierarchy.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { unstableCacheMock } = vi.hoisted(() => ({
  unstableCacheMock: vi.fn(
    (callback: (...args: unknown[]) => unknown) => callback
  ),
}));
vi.mock("next/cache", () => ({ unstable_cache: unstableCacheMock }));

const { loggerMock } = vi.hoisted(() => ({
  loggerMock: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/lib/api/logger", () => ({ logger: loggerMock }));

const fromMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

import {
  getLanguagePresence,
  getLanguagesFacetChoices,
  getLanguagesFacetCountryIndex,
  getLanguagesFacetPage,
  LANGUAGES_FACET_PAGE_SIZES,
  LANGUAGES_FACET_PER_PAGE,
} from "../languagesFacet";

type Call = [string, unknown[]];

/** A chainable PostgREST double that records what the service asked for. */
function buildChain(result: unknown, calls: Call[]) {
  const query: Record<string, unknown> = {};
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, args]);
      return query;
    };

  for (const method of ["select", "order", "textSearch", "ilike", "eq", "in"]) {
    query[method] = vi.fn(record(method));
  }
  query.range = vi.fn((...args: unknown[]) => {
    calls.push(["range", args]);
    return Promise.resolve(result);
  });
  // The real builder is thenable, so a chain ending on `.eq()` resolves
  // without a terminal call.
  query.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return query;
}

/** The corpus as three tables: languages, who speaks them, where those live. */
function mockCorpus(options: {
  peopleLanguages?: Array<{ people_id: string; language_id: string }>;
  peopleCountries?: Array<{ people_id: string; country_id: string }>;
  languages?: Array<Record<string, unknown>>;
  count?: number;
  calls?: Call[];
}) {
  const calls = options.calls ?? [];
  fromMock.mockImplementation((table: string) => {
    if (table === "afrik_people_languages") {
      return buildChain(
        { data: options.peopleLanguages ?? [], error: null },
        calls
      );
    }
    if (table === "afrik_people_countries") {
      return buildChain(
        { data: options.peopleCountries ?? [], error: null },
        calls
      );
    }
    return buildChain(
      {
        data: options.languages ?? [],
        error: null,
        count: options.count ?? (options.languages ?? []).length,
      },
      calls
    );
  });
  return calls;
}

const languageRow = (id: string, name_: string, familyId = "FLG_MANDE") => ({
  id,
  name: name_,
  family_id: familyId,
  family: { id: familyId, name_fr: "Mandé" },
});

beforeEach(() => {
  fromMock.mockReset();
  loggerMock.error.mockReset();
});

describe("language presence — a footprint derived through the peoples", () => {
  // @req REQ-117
  it("reaches a country through the peoples that speak the language", async () => {
    mockCorpus({
      peopleLanguages: [{ people_id: "PPL_BAMANA", language_id: "bam" }],
      peopleCountries: [{ people_id: "PPL_BAMANA", country_id: "MLI" }],
      languages: [languageRow("bam", "Bambara")],
    });

    const presence = await getLanguagePresence();

    expect(presence).toContainEqual({
      id: "bam",
      countryIds: ["MLI"],
      peopleIds: ["PPL_BAMANA"],
    });
  });

  /**
   * The corpus speaking, not a gap to paper over — the rule
   * `getLanguageFamilyPresence` states for Afro-asiatique. A language the
   * derivation places nowhere belongs in the reading list with an empty
   * footprint rather than being dropped to make the map look complete.
   */
  // @req REQ-117
  it("keeps a language no people is recorded as speaking", async () => {
    mockCorpus({
      peopleLanguages: [],
      peopleCountries: [],
      languages: [languageRow("xxx", "Langue orpheline")],
    });

    const presence = await getLanguagePresence();

    expect(presence).toContainEqual({
      id: "xxx",
      countryIds: [],
      peopleIds: [],
    });
  });

  /**
   * The single most expensive failure in this axis, and no unit of the page
   * can see it: migration 054 creates `afrik_people_languages` empty, and it
   * only fills when the corpus loader re-runs. Empty, nothing throws — every
   * language simply gets no footprint, and the facet looks like a corpus with
   * no geography.
   */
  // @req REQ-136
  it("reports an empty relation table rather than reading it as a corpus", async () => {
    mockCorpus({
      peopleLanguages: [],
      peopleCountries: [{ people_id: "PPL_BAMANA", country_id: "MLI" }],
      languages: [languageRow("bam", "Bambara")],
    });

    await getLanguagePresence();

    expect(loggerMock.error).toHaveBeenCalled();
  });
});

describe("language facet — the page size is an allowlist, not a number", () => {
  /**
   * The size becomes a `.range()` on a database query, so an arbitrary value
   * from the address bar would let an anonymous request pull the corpus in one
   * page. The default has to be the first entry, because that is what
   * `resolvePageSize` falls back on for a size the facet does not offer.
   */
  // @req REQ-139
  it("offers its default first and stays under the row ceiling", () => {
    expect(LANGUAGES_FACET_PAGE_SIZES[0]).toBe(LANGUAGES_FACET_PER_PAGE);
    expect(Math.max(...LANGUAGES_FACET_PAGE_SIZES)).toBeLessThan(1000);
  });
});

describe("language facet — one page, narrowed at the database", () => {
  // @req REQ-139
  it("pushes the letter and the family down to the query", async () => {
    const calls = mockCorpus({ languages: [languageRow("bam", "Bambara")] });

    await getLanguagesFacetPage(1, {
      familyId: "FLG_MANDE",
      countryId: null,
      peopleId: null,
      letter: "B",
    });

    expect(calls).toContainEqual(["ilike", ["name", "B%"]]);
    expect(calls).toContainEqual(["eq", ["family_id", "FLG_MANDE"]]);
  });

  // @req REQ-139
  it("resolves the country to language ids before the list query", async () => {
    const calls = mockCorpus({
      peopleLanguages: [{ people_id: "PPL_BAMANA", language_id: "bam" }],
      peopleCountries: [{ people_id: "PPL_BAMANA", country_id: "MLI" }],
      languages: [languageRow("bam", "Bambara")],
    });

    await getLanguagesFacetPage(1, {
      familyId: null,
      countryId: "MLI",
      peopleId: null,
      letter: null,
    });

    expect(calls).toContainEqual(["in", ["id", ["bam"]]]);
  });

  // @req REQ-139
  it("returns nothing for a country no language reaches", async () => {
    mockCorpus({
      peopleLanguages: [{ people_id: "PPL_BAMANA", language_id: "bam" }],
      peopleCountries: [{ people_id: "PPL_BAMANA", country_id: "MLI" }],
      languages: [languageRow("bam", "Bambara")],
      count: 748,
    });

    const page = await getLanguagesFacetPage(1, {
      familyId: null,
      countryId: "ZWE",
      peopleId: null,
      letter: null,
    });

    expect(page.languages).toEqual([]);
    expect(page.total).toBe(0);
  });
});

describe("language facet — what the reader may narrow to", () => {
  // @req REQ-139
  it("offers only the countries the derivation actually produced", async () => {
    mockCorpus({
      peopleLanguages: [{ people_id: "PPL_BAMANA", language_id: "bam" }],
      peopleCountries: [{ people_id: "PPL_BAMANA", country_id: "MLI" }],
      languages: [languageRow("bam", "Bambara")],
    });

    const choices = await getLanguagesFacetChoices();

    expect(choices.countries.map((option) => option.id)).toEqual(["MLI"]);
    expect(choices.families).toEqual([{ id: "FLG_MANDE", label: "Mandé" }]);
  });
});

describe("language facet — what the shared globe reads", () => {
  // @req REQ-117
  it("publishes the whole selection, never the page being read", async () => {
    mockCorpus({
      peopleLanguages: [{ people_id: "PPL_BAMANA", language_id: "bam" }],
      peopleCountries: [{ people_id: "PPL_BAMANA", country_id: "MLI" }],
      languages: [languageRow("bam", "Bambara")],
    });

    const index = await getLanguagesFacetCountryIndex({
      familyId: null,
      countryId: null,
      peopleId: null,
      letter: null,
    });

    expect(index).toEqual([
      { id: "bam", name: "Bambara", countryIds: ["MLI"] },
    ]);
  });
});
