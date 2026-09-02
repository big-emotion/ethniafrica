/**
 * Test-first: the two reverse joins that put the name dimension on a people
 * fiche and on a country fiche (REQ-133, `docs/design/name-to-country-linking.md`).
 *
 * The country case is the one worth testing hard. Its two routes answer two
 * different questions — where a name is attested, and where the people who
 * bear it live — and the whole point of the design note is that neither is a
 * superset of the other. A test that only checked "some names come back" would
 * pass just as well against the merge the note forbids.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import {
  getCountryPatronymes,
  getPatronymesBorneByPeople,
} from "../patronymeFicheLinks";

/**
 * A PostgREST builder stub that resolves on `range()`.
 *
 * The joins are walked with an explicit range rather than selected in one
 * shot, so a stub that resolved on `eq()` — as the dossier suite's does —
 * would never be awaited by the code under test.
 */
/**
 * Reset in a block body, never as `beforeEach(() => fromMock.mockReset())`:
 * that arrow returns the mock, and vitest takes a function returned from a
 * hook to be its teardown. It then calls the mock with no arguments after
 * every test, which reaches the switch below with an undefined table.
 */
function resetTables() {
  fromMock.mockReset();
}

function rangedTable(rows: Array<Record<string, unknown>>) {
  const query: Record<string, unknown> = {};
  const chain = () => query;
  query.select = vi.fn(chain);
  query.eq = vi.fn(chain);
  query.in = vi.fn(chain);
  query.order = vi.fn(chain);
  query.range = vi.fn(() => Promise.resolve({ data: rows, error: null }));
  return query;
}

const NAME_ROWS = {
  PAT_KEITA: {
    id: "PAT_KEITA",
    name_main: "Keïta",
    name_system: "clan_name",
    content: {},
  },
  PAT_TRAORE: {
    id: "PAT_TRAORE",
    name_main: "Traoré",
    name_system: "clan_name",
    content: {},
  },
  PAT_HAILE: {
    id: "PAT_HAILE",
    name_main: "Haile",
    name_system: "non_hereditary_patronymic",
    content: {},
  },
};

interface CorpusFixture {
  patronymeCountries?: Array<{ patronyme_id: string; country_id: string }>;
  patronymePeoples?: Array<{ patronyme_id: string; people_id: string }>;
  peopleCountries?: Array<{ people_id: string; country_id: string }>;
  peoples?: Array<{ id: string; name_main: string; content: unknown }>;
  patronymes?: Array<Record<string, unknown>>;
}

function mockCorpus({
  patronymeCountries = [],
  patronymePeoples = [],
  peopleCountries = [],
  peoples = [],
  patronymes = Object.values(NAME_ROWS),
}: CorpusFixture = {}) {
  fromMock.mockImplementation((table: string) => {
    switch (table) {
      case "afrik_patronyme_countries":
        return rangedTable(patronymeCountries);
      case "afrik_patronyme_peoples":
        return rangedTable(patronymePeoples);
      case "afrik_people_countries":
        return rangedTable(peopleCountries);
      case "afrik_peoples":
        return rangedTable(peoples);
      case "afrik_patronymes":
        return rangedTable(patronymes);
      default:
        throw new Error(`Unexpected table: ${table}`);
    }
  });
}

describe("getPatronymesBorneByPeople", () => {
  beforeEach(resetTables);

  // @req REQ-133
  it("returns the names the corpus attaches to the people", async () => {
    mockCorpus({
      patronymePeoples: [
        { patronyme_id: "PAT_KEITA", people_id: "PPL_BAMANA" },
        { patronyme_id: "PAT_TRAORE", people_id: "PPL_BAMANA" },
      ],
      patronymes: [NAME_ROWS.PAT_KEITA, NAME_ROWS.PAT_TRAORE],
    });

    const borne = await getPatronymesBorneByPeople("PPL_BAMANA");

    expect(borne.map((name) => name.id)).toEqual(["PAT_KEITA", "PAT_TRAORE"]);
    expect(borne[0]).toEqual({
      id: "PAT_KEITA",
      nameMain: "Keïta",
      nameSystem: "clan_name",
    });
  });

  // @req REQ-133
  it("returns an empty list for a people the corpus attaches no name to", async () => {
    mockCorpus();

    // 13 peoples out of ~800 carry a name today, so this is the ordinary
    // state of the corpus and not an error the caller has to catch.
    await expect(getPatronymesBorneByPeople("PPL_SHONA")).resolves.toEqual([]);
  });
});

describe("getCountryPatronymes", () => {
  beforeEach(resetTables);

  // @req REQ-133
  it("keeps a name attested in the country out of the reach list", async () => {
    // Mali's real shape on recette: every name its peoples carry is also
    // directly attested there, so a reach list that did not subtract would
    // print the same nine names twice under two headings.
    mockCorpus({
      patronymeCountries: [{ patronyme_id: "PAT_KEITA", country_id: "MLI" }],
      peopleCountries: [{ people_id: "PPL_BAMANA", country_id: "MLI" }],
      patronymePeoples: [
        { patronyme_id: "PAT_KEITA", people_id: "PPL_BAMANA" },
      ],
      peoples: [{ id: "PPL_BAMANA", name_main: "Bamana", content: {} }],
      patronymes: [NAME_ROWS.PAT_KEITA],
    });

    const { attested, borneByPeoples } = await getCountryPatronymes("MLI");

    expect(attested.map((name) => name.id)).toEqual(["PAT_KEITA"]);
    expect(borneByPeoples).toEqual([]);
  });

  // @req REQ-133
  it("reaches a country its peoples live in that no source attests the name in", async () => {
    // The Maghreb case: the Zenata fiches declare only the countries their
    // sources attest, but the people spans the whole area.
    mockCorpus({
      patronymeCountries: [],
      peopleCountries: [{ people_id: "PPL_ZENATA", country_id: "MAR" }],
      patronymePeoples: [
        { patronyme_id: "PAT_TRAORE", people_id: "PPL_ZENATA" },
      ],
      peoples: [{ id: "PPL_ZENATA", name_main: "Zénètes", content: {} }],
      patronymes: [NAME_ROWS.PAT_TRAORE],
    });

    const { attested, borneByPeoples } = await getCountryPatronymes("MAR");

    expect(attested).toEqual([]);
    expect(borneByPeoples).toHaveLength(1);
    expect(borneByPeoples[0].id).toBe("PAT_TRAORE");
    // The bearing people is what makes the entry reach rather than
    // attestation, so it travels with it and the reader can check the claim.
    expect(borneByPeoples[0].viaPeoples).toEqual([
      { id: "PPL_ZENATA", nameMain: "Zénètes" },
    ]);
  });

  // @req REQ-133
  it("attests a name in a country no people route can reach", async () => {
    // Ethiopia: a non-hereditary patronymic designates no group, so the four
    // Habesha fiches carry no people at all. A country surface built only on
    // the people route makes that whole naming system invisible.
    mockCorpus({
      patronymeCountries: [{ patronyme_id: "PAT_HAILE", country_id: "ETH" }],
      peopleCountries: [],
      patronymePeoples: [],
      patronymes: [NAME_ROWS.PAT_HAILE],
    });

    const { attested, borneByPeoples } = await getCountryPatronymes("ETH");

    expect(attested.map((name) => name.id)).toEqual(["PAT_HAILE"]);
    expect(borneByPeoples).toEqual([]);
  });

  // @req REQ-133
  it("returns two empty lists for a country the corpus knows no name in", async () => {
    mockCorpus();

    await expect(getCountryPatronymes("COM")).resolves.toEqual({
      attested: [],
      borneByPeoples: [],
    });
  });
});
