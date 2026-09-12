import { describe, expect, it } from "vitest";

import {
  allCountryRecords,
  allPeopleRecords,
  countryRecord,
  peopleRecord,
} from "@/components/fiche/__tests__/corpusRecords";
import {
  countryChronology,
  peopleChronology,
  type ChronologyStation,
} from "@/lib/fiche/chronology";
import { splitLeadSentence } from "@/lib/fiche/prose";
import {
  transformPeopleHistory,
  transformPeopleOrigins,
} from "@/lib/peopleDataTransformer";
import type { CountryDetail, PeopleDetail } from "@/types/afrik-frontend";
import type { Language } from "@/types/shared";

function peopleStations(people: PeopleDetail, language: Language = "fr") {
  return peopleChronology(
    transformPeopleOrigins(people.origins),
    transformPeopleHistory(people.historicalRole),
    language
  );
}

/** Everything a reader can reach in a station by opening it. */
function stationText(station: ChronologyStation): string {
  return [
    station.title,
    station.preview ?? "",
    ...station.passages.map((passage) => passage.text),
    ...(station.routes ?? []),
    ...(station.zones ?? []),
    ...(station.centres ?? []),
    ...(station.namesAtTheTime ?? []),
    ...(station.entities ?? []).flatMap((entity) => [
      entity.name,
      entity.role ?? "",
      ...(entity.centres ?? []),
    ]),
  ].join("\n");
}

describe("splitLeadSentence", () => {
  // @req REQ-153
  it("keeps the first sentence as the lead and the rest apart", () => {
    const { lead, rest } = splitLeadSentence(
      "Les Ovambo font partie du grand mouvement d'expansion bantou. Selon les traditions orales, ils viennent de Zambie."
    );
    expect(lead).toBe(
      "Les Ovambo font partie du grand mouvement d'expansion bantou."
    );
    expect(rest).toBe("Selon les traditions orales, ils viennent de Zambie.");
  });

  // An abbreviation a few characters in must not end the lead: the split waits
  // for twenty characters, the rule the culture tiles already followed.
  // @req REQ-153
  it("leaves a single sentence whole", () => {
    expect(splitLeadSentence("Chefferies Kavango, agriculture.")).toEqual({
      lead: "Chefferies Kavango, agriculture.",
      rest: null,
    });
  });
});

describe("peopleChronology", () => {
  /**
   * A people's history carries no date field, so a station's period is the
   * regime its rubric belongs to — never a year read out of prose. The order
   * is the model's: formation, polities, outside influences, conflicts,
   * diaspora.
   */
  // @req REQ-155
  it("gives Ovambo one station per rubric, each dated by its regime", () => {
    const stations = peopleStations(peopleRecord("PPL_OVAMBO"));
    expect(
      stations.map((station) => [station.regime, station.period, station.title])
    ).toEqual([
      ["polity", "Précolonial", "Formation et origines"],
      ["polity", "Précolonial", "Royaumes & chefferies"],
      ["colonial", "Colonial", "Influences extérieures"],
      ["colonial", "Colonial", "Conflits & alliances"],
      ["modern", "Contemporain", "Diaspora"],
    ]);
  });

  // @req REQ-155
  it("previews a station with its first sentence and keeps routes and zones", () => {
    const [origin] = peopleStations(peopleRecord("PPL_OVAMBO"));
    expect(origin.preview).toBe(
      "Les Ovambo font partie du grand mouvement d'expansion bantou."
    );
    expect(origin.routes).toHaveLength(3);
    expect(origin.zones).toHaveLength(3);
    expect(stationText(origin)).toContain("entre le XIVe et le XVIIe siècle");
  });

  // Relations with neighbours read as society rather than chronology, and the
  // culture chapter carries them beside the country's own "Relations" tile.
  // @req REQ-155
  it("leaves relations with neighbours to the culture chapter", () => {
    const text = peopleStations(peopleRecord("PPL_OVAMBO"))
      .map(stationText)
      .join("\n");
    expect(text).not.toContain("Relations historiques avec les Herero au sud");
  });

  // @req REQ-155
  it("produces no station for a rubric the record leaves empty", () => {
    expect(
      peopleChronology(
        { migrationRoutes: [], historicalSettlementZones: [] },
        {},
        "fr"
      )
    ).toEqual([]);
    expect(
      peopleChronology(
        { migrationRoutes: [], historicalSettlementZones: [] },
        { diaspora: "Communautés au Brésil." },
        "en"
      ).map((station) => [station.regime, station.period, station.title])
    ).toEqual([["modern", "Contemporary", "Diaspora"]]);
  });
});

describe("countryChronology", () => {
  // @req REQ-148
  it("groups entries sharing a period and a regime, and dates the rest as declared", () => {
    const { stations } = countryChronology(countryRecord("NAM"), "fr");
    expect(
      stations.map((station) => [station.regime, station.period, station.title])
    ).toEqual([
      ["polity", "Préhistorique - présent", "Peuples khoïsan"],
      ["polity", "Précolonial - présent", "3 entités politiques"],
      ["colonial", "1884 - 1915", "Colonie allemande du Sud-Ouest africain"],
      [
        "colonial",
        "1915 - 1990",
        "Colonie sud-africaine (Afrique du Sud-Ouest)",
      ],
      ["modern", "Depuis 1990", "République de Namibie"],
    ]);
    expect(stations[1].entities?.map((entity) => entity.name)).toEqual([
      "Chefferies Ovambo",
      "Chefferies Herero",
      "Chefferies Kavango",
    ]);
  });

  /**
   * "Le nom et son histoire" merged into the chronology: each station carries
   * what the territory was called across its span, read from the dated former
   * names and, for the present, the common name.
   */
  // @req REQ-154
  it("gives each colonial and modern station the name the territory carried", () => {
    const { stations } = countryChronology(countryRecord("NAM"), "fr");
    expect(stations[2].namesAtTheTime).toEqual(["Deutsch-Südwestafrika"]);
    expect(stations[3].namesAtTheTime).toEqual(["Afrique du Sud-Ouest"]);
    expect(stations[4].namesAtTheTime).toEqual(["Namibie"]);
  });

  // @req REQ-154
  it("attaches each historical account to the station of its regime", () => {
    const country = countryRecord("NAM");
    const { stations } = countryChronology(country, "fr");
    const facts = country.historicalFacts!;
    expect(stationText(stations[0])).toContain(facts.ancientPeriods!);
    expect(stationText(stations[2])).toContain(facts.colonization!);
    expect(stationText(stations[3])).toContain(facts.independenceStruggle!);
    expect(stationText(stations[4])).toContain(facts.postIndependence!);
  });

  // @req REQ-154
  it("opens on the etymology and never repeats its preview", () => {
    const { etymology } = countryChronology(countryRecord("NAM"), "fr");
    expect(etymology?.preview).toBe(
      'Le nom "Namibie" vient du désert du Namib, qui borde la côte atlantique du pays.'
    );
    expect(etymology?.passages).not.toContain(etymology?.preview);
    expect(etymology?.passages.join(" ")).toContain(
      "proposé par les nationalistes namibiens"
    );
  });

  // Thirteen countries already type a modern entry; a second, synthesised one
  // would state the same state twice.
  // @req REQ-148
  it("adds no modern station where the record already types one", () => {
    const { stations, etymology } = countryChronology(
      countryRecord("BDI"),
      "fr"
    );
    const modern = stations.filter((station) => station.regime === "modern");
    expect(modern.map((station) => station.title)).toEqual([
      "République du Burundi",
    ]);
    expect(modern[0].namesAtTheTime).toContain("Burundi");
    // Its range touches the colonial and the modern spans without overlapping
    // either, so it stays reachable under the etymology instead.
    expect(etymology?.otherNames).toContain("Royaume du Burundi (1962-1966)");
  });

  // COD and ETH type no colonial entry. A colonial name must not be pinned on
  // a precolonial kingdom just because the years overlap.
  // @req REQ-148
  it("keeps a colonial name off a kingdom when the record has no colonial station", () => {
    const country = countryRecord("COD");
    const { stations, etymology } = countryChronology(country, "fr");
    for (const station of stations.filter((s) => s.regime === "polity")) {
      expect(station.namesAtTheTime ?? []).toEqual([]);
    }
    expect(etymology?.otherNames).toContain("Congo belge (1908-1960)");
    expect(stations.map(stationText).join("\n")).toContain(
      country.historicalFacts!.independenceStruggle!
    );
  });

  // COM types its present state, "Union des Comores", as a polity. The entry is
  // the state all the same: a second station built under the same name would
  // print the country twice. The contemporary accounts and the name ride that
  // entry, and its declared regime stays as the record types it.
  // @req REQ-148
  it("anchors the present on an entry named for the state rather than duplicating it", () => {
    const country = countryRecord("COM");
    const { stations } = countryChronology(country, "fr");
    const state = stations.filter(
      (station) => station.title === "Union des Comores"
    );
    expect(state).toHaveLength(1);
    expect(state[0].namesAtTheTime).toContain(country.nameCommonFr);
    if (country.historicalFacts?.postIndependence) {
      expect(stationText(state[0])).toContain(
        country.historicalFacts.postIndependence.trim()
      );
    }
  });

  // @req REQ-148
  it("speaks English where the record is read in English", () => {
    const { stations, etymology } = countryChronology(
      countryRecord("NAM"),
      "en"
    );
    expect(stations[1].title).toBe("3 political entities");
    expect(stations[4].period).toBe("Since 1990");
    expect(etymology).toBeDefined();
  });
});

describe("chronology corpus sweep", () => {
  const HISTORICAL_FACTS = [
    "ancientPeriods",
    "middleAges",
    "precolonial",
    "colonization",
    "independenceStruggle",
    "postIndependence",
  ] as const;
  const NAME_PROSE = [
    "antiquity",
    "middleAges",
    "precolonial",
    "colonization",
    "contemporary",
  ] as const;

  function reachable(country: CountryDetail) {
    const { stations, etymology } = countryChronology(country, "fr");
    return {
      stations,
      etymology,
      text: [
        ...stations.map(stationText),
        etymology?.preview ?? "",
        ...(etymology?.passages ?? []),
        ...(etymology?.otherNames ?? []),
      ].join("\n"),
    };
  }

  // @req REQ-148
  it("places every political entry of every country exactly once", () => {
    for (const country of allCountryRecords()) {
      const { stations } = reachable(country);
      expect(stations.length, country.id).toBeGreaterThan(0);
      const placed = stations.flatMap((station) =>
        station.entities
          ? station.entities.map((entity) => entity.name)
          : [station.title]
      );
      for (const entry of country.kingdoms ?? []) {
        const name = entry.name.replace(/^\[|\]$/g, "");
        expect(
          placed.filter((title) => title === name),
          `${country.id} ${name}`
        ).toHaveLength(1);
      }
      for (const station of stations) {
        expect(station.title.trim(), country.id).not.toBe("");
        expect(station.period.trim(), country.id).not.toBe("");
      }
    }
  });

  // @req REQ-154
  it("keeps every former name, account and name era of every country reachable", () => {
    for (const country of allCountryRecords()) {
      const { text } = reachable(country);
      const names = country.historicalNames;
      for (const former of names?.formerNames ?? []) {
        const bare = former.replace(/\s*\([^()]*\d[^()]*\)\s*$/u, "").trim();
        expect(
          text.includes(former) || text.includes(bare),
          `${country.id} ${former}`
        ).toBe(true);
      }
      for (const key of NAME_PROSE) {
        const value = names?.[key]?.trim();
        if (value) expect(text, `${country.id} ${key}`).toContain(value);
      }
      for (const key of HISTORICAL_FACTS) {
        const value = country.historicalFacts?.[key]?.trim();
        if (value) expect(text, `${country.id} ${key}`).toContain(value);
      }
    }
  });

  // @req REQ-155
  it("dates every people station by a regime and keeps every rubric reachable", () => {
    const regimes = ["Précolonial", "Colonial", "Contemporain"];
    for (const people of allPeopleRecords()) {
      const stations = peopleStations(people);
      const text = stations.map(stationText).join("\n");
      const origins = people.origins ?? {};
      const history = people.historicalRole ?? {};
      for (const station of stations) {
        expect(regimes, people.id).toContain(station.period);
        expect(station.title.trim(), people.id).not.toBe("");
      }
      for (const value of [
        origins.ancientOrigins,
        origins.formationPeriod,
        origins.unificationsOrDivisions,
        origins.externalInfluences,
        origins.majorHistoricalEvents,
        history.kingdomsOrChiefdoms,
        history.conflictsOrAlliances,
        history.diaspora,
        ...(origins.migrationRoutes ?? []),
        ...(origins.historicalSettlementZones ?? []),
      ]) {
        if (value?.trim()) expect(text, people.id).toContain(value.trim());
      }
    }
  });
});
