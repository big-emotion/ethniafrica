import { getAdmin0Name } from "@/lib/atlas/overlays";
import type { OnwardGroup, OnwardTarget } from "@/lib/fiche/onwardLinks";
import type { Language } from "@/types/shared";

/**
 * What each of the five fiches can send its reader to.
 *
 * One function per entity type, each taking data the route has already
 * awaited. They are pure so the quotas and the ordering can be read — and
 * tested — without a database, and so a route stays three lines.
 *
 * The quotas are the whole editorial decision here. `buildOnwardLinks` offers
 * one of every kind before a second of any, so a group's `max` says how deep
 * that kind may go once every other kind has had its turn: a country's three
 * peoples matter more than its third linguistic family, and a family fiche
 * owes its reader peoples more than it owes them a third language.
 */

/**
 * Countries, named.
 *
 * The corpus stores presence as bare ISO codes — `currentCountries`,
 * `distributionByCountry[].country` — and no fiche carries the names beside
 * them. The admin-0 asset the globe already draws from is the atlas's own
 * answer to that, and it is a synchronous lookup, so this costs no query.
 *
 * A code it cannot name is dropped rather than printed. A row reading "CPV" is
 * the corpus's filing, not a place, and the reader-facing register in
 * `buildOnwardLinks` cannot catch it: an ISO code is not a `PPL_`/`FLG_`/`PAT_`
 * identifier, so it would sail through as an ordinary word.
 */
// @req REQ-091
export function countryTargets(
  codes: readonly string[],
  language: Language
): OnwardTarget[] {
  const seen = new Set<string>();
  const targets: OnwardTarget[] = [];

  for (const code of codes) {
    if (seen.has(code)) continue;
    seen.add(code);

    const name = getAdmin0Name(code, language);
    if (name) targets.push({ id: code, name });
  }

  return targets;
}

/** A corpus row that names itself `nameMain`, which most of them do. */
function fromNameMain(
  rows: readonly { id: string; nameMain: string }[]
): OnwardTarget[] {
  return rows.map((row) => ({ id: row.id, name: row.nameMain }));
}

export interface PeopleOnwardInput {
  /** Resolved by the route: a people carries its family's id, never its name. */
  family: OnwardTarget | null;
  languages: readonly OnwardTarget[];
  countryCodes: readonly string[];
  sameFamilyPeoples: readonly { id: string; nameMain: string }[];
  borneNames: readonly { id: string; nameMain: string }[];
  language: Language;
}

// @req REQ-091
export function peopleOnwardGroups(input: PeopleOnwardInput): OnwardGroup[] {
  return [
    {
      kind: "language-family",
      max: 1,
      targets: input.family ? [input.family] : [],
    },
    { kind: "language", max: 2, targets: input.languages },
    {
      kind: "country",
      max: 2,
      targets: countryTargets(input.countryCodes, input.language),
    },
    {
      kind: "people",
      max: 2,
      targets: fromNameMain(input.sameFamilyPeoples),
    },
    { kind: "name", max: 2, targets: fromNameMain(input.borneNames) },
  ];
}

export interface PatronymeOnwardInput {
  bearerPeoples: readonly { id: string; nameMain: string }[];
  countries: readonly OnwardTarget[];
  /** Names filed under the same onomastic system, the fiche's own excluded. */
  sameSystemNames: readonly { id: string; nameMain: string }[];
  language: Language;
}

// @req REQ-091
export function patronymeOnwardGroups(
  input: PatronymeOnwardInput
): OnwardGroup[] {
  return [
    { kind: "people", max: 2, targets: fromNameMain(input.bearerPeoples) },
    { kind: "country", max: 2, targets: input.countries },
    { kind: "name", max: 2, targets: fromNameMain(input.sameSystemNames) },
  ];
}

export interface CountryOnwardInput {
  /**
   * The peoples the fiche declares, with the share it gives each.
   *
   * `id` is nullable because the corpus's own field is: 49 of 275 demographic
   * entries name a people the country fiche cannot link to. Those are dropped
   * — an unlinkable row here would be a label with nowhere to go.
   */
  peoples: readonly { id: string | null; name: string; share?: number }[];
  families: readonly OnwardTarget[];
  language: Language;
}

// @req REQ-091
export function countryOnwardGroups(input: CountryOnwardInput): OnwardGroup[] {
  /**
   * Ordered by declared share, largest first — which is the order the fiche's
   * own demographic table already reads in, so the block agrees with the
   * chapter above it.
   *
   * It is a proxy, and worth naming as one: the pays route loads no confidence
   * score, so "best documented" is read here as "carries an identifier and a
   * declared share", which is what separates a sourced entry from a bare name
   * in this corpus.
   */
  const linkable = input.peoples
    .filter(
      (people): people is { id: string; name: string; share?: number } =>
        typeof people.id === "string" && people.id.length > 0
    )
    .slice()
    .sort((a, b) => (b.share ?? 0) - (a.share ?? 0));

  return [
    {
      kind: "people",
      max: 3,
      targets: linkable.map((people) => ({ id: people.id, name: people.name })),
    },
    { kind: "language-family", max: 2, targets: input.families },
  ];
}

export interface FamilyOnwardInput {
  languages: readonly OnwardTarget[];
  peoples: readonly { id: string; nameMain: string }[];
  language: Language;
}

// @req REQ-091
export function familyOnwardGroups(input: FamilyOnwardInput): OnwardGroup[] {
  return [
    { kind: "language", max: 2, targets: input.languages },
    { kind: "people", max: 3, targets: fromNameMain(input.peoples) },
  ];
}

export interface LanguageOnwardInput {
  family: OnwardTarget | null;
  speakingPeoples: readonly OnwardTarget[];
  language: Language;
}

// @req REQ-091
export function languageOnwardGroups(
  input: LanguageOnwardInput
): OnwardGroup[] {
  return [
    {
      kind: "language-family",
      max: 1,
      /**
       * `getAfrikLanguageById` falls back to the family id when its join
       * misses, so a family can arrive named `FLG_KROU`. That is a raw
       * identifier, and `buildOnwardLinks` drops it — the row disappears
       * rather than telling the reader how the corpus files its families.
       */
      targets: input.family ? [input.family] : [],
    },
    { kind: "people", max: 4, targets: input.speakingPeoples },
  ];
}
