import {
  transformKingdoms,
  type KingdomCard,
} from "@/lib/countryDataTransformer";
import { countryCopy } from "@/lib/i18n/copy/country";
import { ficheCopy } from "@/lib/i18n/copy/fiche";
import { peopleCopy } from "@/lib/i18n/copy/people";
import type {
  PeopleHistoryData,
  PeopleOriginData,
} from "@/lib/peopleDataTransformer";
import type { CountryDetail } from "@/types/afrik-frontend";
import type { Language } from "@/types/shared";

import { sameSentence, sentencesOf, splitLeadSentence } from "./prose";

/**
 * One history timeline for both records (operator ruling, 2026-09-12).
 *
 * The adapters here turn a record into stations; `FicheChronologyChapter`
 * draws them. They stay pure so the whole corpus can be swept without
 * rendering: every political entry placed once, every former name, account
 * and name era still reachable by opening a tile.
 */

export type ChronologyRegime = "polity" | "colonial" | "modern";

interface ChronologyPassage {
  /** The corpus field the text comes from, so a note call can find it. */
  field?: string;
  /** A term above the passage, when a station gathers several rubrics. */
  label?: string;
  text: string;
}

interface ChronologyEntity {
  name: string;
  role?: string;
  centres?: string[];
}

export interface ChronologyStation {
  key: string;
  regime: ChronologyRegime;
  /** The declared period, or the regime's own word where none is declared. */
  period: string;
  title: string;
  preview?: string;
  passages: ChronologyPassage[];
  /** Entries sharing one period and one regime, gathered on one station. */
  entities?: ChronologyEntity[];
  centres?: string[];
  routes?: string[];
  zones?: string[];
  /** What the territory was called across this station's span. */
  namesAtTheTime?: string[];
}

export interface ChronologyEtymology {
  preview: string;
  passages: string[];
  /** Former names no station's span can carry, kept reachable here. */
  otherNames: string[];
}

function present(value: string | undefined | null): value is string {
  return Boolean(value?.trim());
}

function previewOf(passages: ChronologyPassage[]): string | undefined {
  return passages[0] ? splitLeadSentence(passages[0].text).lead : undefined;
}

// ── People ─────────────────────────────────────────────────────────────

/**
 * A people's history carries no date field, so a station's period is the
 * regime its rubric belongs to — never a century read out of prose. Relations
 * with neighbours are left to the culture chapter, beside the country's own
 * "Relations" tile.
 */
// @req REQ-155
export function peopleChronology(
  origin: PeopleOriginData,
  history: PeopleHistoryData,
  language: Language
): ChronologyStation[] {
  const copy = peopleCopy[language];
  const regimeWord = ficheCopy[language].chronology.regime;
  const stations: ChronologyStation[] = [];

  const add = (
    key: string,
    regime: ChronologyRegime,
    title: string,
    candidates: ChronologyPassage[],
    lists: { routes?: string[]; zones?: string[] } = {}
  ) => {
    const passages = candidates
      .filter((passage) => present(passage.text))
      .map((passage) => ({ ...passage, text: passage.text.trim() }));
    const routes = lists.routes?.filter(present);
    const zones = lists.zones?.filter(present);
    if (!passages.length && !routes?.length && !zones?.length) return;
    stations.push({
      key,
      regime,
      period: regimeWord[regime],
      title,
      preview: previewOf(passages) ?? routes?.[0] ?? zones?.[0],
      passages,
      ...(routes?.length ? { routes } : {}),
      ...(zones?.length ? { zones } : {}),
    });
  };

  add(
    "formation",
    "polity",
    copy.chapterDetails.historyOriginStation,
    [
      { field: "ancientOrigins", text: origin.ancientOrigins ?? "" },
      {
        field: "formationPeriod",
        label: copy.originFields.formationPeriod,
        text: origin.formationPeriod ?? "",
      },
    ],
    {
      routes: origin.migrationRoutes,
      zones: origin.historicalSettlementZones,
    }
  );
  add("polities", "polity", copy.historyFields.kingdoms, [
    { field: "kingdomsOrChiefdoms", text: history.kingdomsOrChiefdoms ?? "" },
    {
      field: "unificationsOrDivisions",
      label: copy.originFields.unifications,
      text: origin.unificationsOrDivisions ?? "",
    },
  ]);
  add("influences", "colonial", copy.originFields.externalInfluences, [
    { field: "externalInfluences", text: origin.externalInfluences ?? "" },
  ]);
  add("conflicts", "colonial", copy.historyFields.conflicts, [
    { field: "conflictsOrAlliances", text: history.conflictsOrAlliances ?? "" },
    {
      field: "majorHistoricalEvents",
      label: copy.originFields.majorEvents,
      text: origin.majorHistoricalEvents ?? "",
    },
  ]);
  add("diaspora", "modern", copy.historyFields.diaspora, [
    { field: "diaspora", text: history.diaspora ?? "" },
  ]);

  return stations;
}

// ── Countries ──────────────────────────────────────────────────────────

type Span = [number, number];

const OPEN_END = 9999;

function spanOf(card: KingdomCard): Span | undefined {
  const range = card.timeRange;
  if (!range) return undefined;
  return [
    range.startYear,
    range.ongoing ? OPEN_END : (range.endYear ?? OPEN_END),
  ];
}

/** "République de Namibie (Republic of Namibia, …)" → "République de Namibie". */
function officialNameOf(country: CountryDetail): string {
  return (country.nameOfficial ?? country.nameFr ?? country.nameCommonFr ?? "")
    .replace(/\s*\([^()]*\)\s*$/u, "")
    .trim();
}

/**
 * The etymology, with the name's author folded in sentence by sentence: the
 * two fields often restate each other, and the reader is owed each sentence
 * once.
 */
function etymologyOf(
  country: CountryDetail,
  otherNames: string[]
): ChronologyEtymology | undefined {
  const etymology = country.etymology?.trim();
  const actor = country.nameOriginActor?.trim();
  const source = etymology || actor;
  if (!source && !otherNames.length) return undefined;

  const { lead, rest } = splitLeadSentence(source ?? "");
  const passages: string[] = [];
  if (rest) passages.push(rest);
  if (etymology && actor) {
    const said = sentencesOf(etymology);
    const unsaid = sentencesOf(actor).filter(
      (sentence) => !said.some((known) => sameSentence(known, sentence))
    );
    if (unsaid.length) passages.push(unsaid.join(" "));
  }
  return { preview: lead, passages, otherNames };
}

/**
 * A country's political entries, its accounts and its name history on one
 * timeline. "Le nom et son histoire" used to be a second timeline of its own;
 * each station now carries the name the territory bore across its span.
 */
// @req REQ-148 REQ-154
export function countryChronology(
  country: CountryDetail,
  language: Language
): { stations: ChronologyStation[]; etymology?: ChronologyEtymology } {
  const copy = ficheCopy[language].chronology;
  const periods = countryCopy[language].generated.historicalPeriods;
  const eras = countryCopy[language].generated.eras;
  const stations: ChronologyStation[] = [];
  const spans = new Map<ChronologyStation, Span>();

  // Entries sharing a period and a regime become one station, at the place
  // the first of them held: three chiefdoms "Précolonial - présent" read as
  // one moment with three names, not as three identical rows.
  const groups = new Map<string, KingdomCard[]>();
  for (const card of transformKingdoms(country.kingdoms, language).cards) {
    const key = `${card.entryType ?? "polity"}|${card.period?.trim() ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), card]);
  }
  for (const [key, members] of groups) {
    const regime = (members[0].entryType ?? "polity") as ChronologyRegime;
    const period = members[0].period?.trim() || copy.regime[regime];
    if (members.length === 1) {
      const [card] = members;
      const passages = present(card.historicalRole)
        ? [{ text: card.historicalRole.trim() }]
        : [];
      const station: ChronologyStation = {
        key,
        regime,
        period,
        title: card.name,
        preview: previewOf(passages),
        passages,
        ...(card.centers?.length ? { centres: card.centers } : {}),
      };
      stations.push(station);
      const span = spanOf(card);
      if (span) spans.set(station, span);
    } else {
      stations.push({
        key,
        regime,
        period,
        title: copy.groupedEntities(members.length),
        preview: members.map((member) => member.name).join(" · "),
        passages: [],
        entities: members.map((member) => ({
          name: member.name,
          ...(present(member.historicalRole)
            ? { role: member.historicalRole.trim() }
            : {}),
          ...(member.centers?.length ? { centres: member.centers } : {}),
        })),
      });
    }
  }

  const names = country.historicalNames;
  const facts = country.historicalFacts;

  // Thirteen countries already type a modern entry. Only the others get one
  // built from the contemporary name era — unless an entry already carries the
  // state's official name under another type (COM files "Union des Comores" as
  // a polity). That entry is the state, and a second station of the same name
  // would print the country twice; its declared regime stays as typed.
  const officialName = officialNameOf(country);
  let modern =
    [...stations].reverse().find((s) => s.regime === "modern") ??
    stations.find((s) => !s.entities && s.title === officialName);
  if (
    !modern &&
    (present(names?.contemporary) || present(facts?.postIndependence))
  ) {
    const year = Number(names?.contemporary?.match(/\b(\d{4})\b/)?.[1]);
    modern = {
      key: "modern",
      regime: "modern",
      period: year ? copy.since(year) : copy.regime.modern,
      title: officialNameOf(country),
      passages: [],
    };
    stations.push(modern);
    if (year) spans.set(modern, [year, OPEN_END]);
  }

  // A former name rides the colonial or modern station its dates overlap most.
  // Never a precolonial one: COD types no colonial entry, and "Congo belge"
  // would otherwise be pinned on a kingdom whose dates happen to run late.
  const otherNames: string[] = [];
  for (const former of names?.formerNames ?? []) {
    const match = former.match(/^(.*\S)\s*\(([^()]*\d[^()]*)\)\s*$/u);
    const years = match?.[2].match(/\d{3,4}/g)?.map(Number) ?? [];
    let best: ChronologyStation | undefined;
    let bestOverlap = 0;
    if (match && years.length) {
      const [start, end = start] = years;
      for (const station of stations) {
        const span = spans.get(station);
        if (station.regime === "polity" || !span) continue;
        const overlap = Math.min(end, span[1]) - Math.max(start, span[0]);
        if (overlap > bestOverlap) {
          best = station;
          bestOverlap = overlap;
        }
      }
    }
    if (best && match) {
      best.namesAtTheTime = [...(best.namesAtTheTime ?? []), match[1].trim()];
    } else {
      otherNames.push(former.trim());
    }
  }
  if (modern && present(country.nameCommonFr)) {
    modern.namesAtTheTime = [
      ...(modern.namesAtTheTime ?? []),
      country.nameCommonFr.trim(),
    ];
  }

  // The accounts and the name eras join the station of their regime rather
  // than standing as rows of their own that restate the entities.
  const first = (regime: ChronologyRegime) =>
    stations.find((station) => station.regime === regime);
  const last = (regime: ChronologyRegime) =>
    [...stations].reverse().find((station) => station.regime === regime);
  const early = first("polity") ?? stations[0];
  const colonial = first("colonial") ?? modern ?? stations.at(-1);
  const struggle = last("colonial") ?? modern ?? stations.at(-1);
  const late = modern ?? stations.at(-1);

  const orphans: string[] = [];
  const attach = (
    station: ChronologyStation | undefined,
    label: string,
    text: string | undefined
  ) => {
    if (!present(text)) return;
    if (!station) {
      orphans.push(text.trim());
      return;
    }
    station.passages.push({ label, text: text.trim() });
  };
  const territory = (era: string) => `${copy.territoryName} · ${era}`;

  attach(early, periods.ancientPeriods, facts?.ancientPeriods);
  attach(early, periods.middleAges, facts?.middleAges);
  attach(early, periods.precolonial, facts?.precolonial);
  attach(colonial, periods.colonization, facts?.colonization);
  attach(struggle, periods.independenceStruggle, facts?.independenceStruggle);
  attach(late, periods.postIndependence, facts?.postIndependence);
  attach(early, territory(periods.ancientPeriods), names?.antiquity);
  attach(early, territory(eras.middleAges), names?.middleAges);
  attach(early, territory(eras.precolonial), names?.precolonial);
  attach(colonial, territory(eras.colonization), names?.colonization);
  attach(late, territory(eras.contemporary), names?.contemporary);

  for (const station of stations) {
    station.preview ??= previewOf(station.passages);
  }

  const etymology = etymologyOf(country, otherNames);
  if (etymology && orphans.length) etymology.passages.push(...orphans);

  return { stations, ...(etymology ? { etymology } : {}) };
}
