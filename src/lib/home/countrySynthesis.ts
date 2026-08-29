import type { Country } from "@/types/afrik";
import type { CountryDetail } from "@/types/afrik-frontend";

/**
 * The country synthesis — a view, not a text.
 *
 * The syntheses published on the project's LinkedIn page ("Anciens noms et
 * appellations / Groupes ethniques principaux / Héritage culturel / Langues
 * et identité") read like editorial copy, and were nearly rebuilt as such.
 * They are not: every rubric maps onto a field the fiche already carries, so
 * the same shape can be computed for all 54 countries and no card ever goes
 * stale.
 *
 * This module holds that mapping in one place because two surfaces read it —
 * the home rail and the head of the country fiche. When the derivation lives
 * in each surface instead, the two drift, and a reader who follows a card to
 * its fiche finds a different country described.
 */

export interface CountrySynthesisPeople {
  name: string;
  peopleId?: string;
}

export interface CountrySynthesis {
  id: string;
  nameFr: string;
  /** Null rather than "" so a caller cannot print an empty paragraph. */
  summary: string | null;
  formerNames: string[];
  peoples: CountrySynthesisPeople[];
  kingdoms: string[];
  languages: string[];
}

// Caps are the card's, not the corpus's: the fiche below shows everything.
// A card that lists fourteen languages stops being scannable, which is the
// only thing a card is for.
const MAX_FORMER_NAMES = 3;
const MAX_PEOPLES = 6;
const MAX_KINGDOMS = 3;
const MAX_LANGUAGES = 5;

function trimmed(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 ? text : null;
}

/**
 * The languages a country speaks, from whichever field holds them.
 *
 * `culture.mainLanguages` is filled on 40 of the 54 fiches. The other
 * fourteen — RDC, Nigeria, Kenya, Afrique du Sud, Éthiopie, Ghana, Mali,
 * Sénégal, Madagascar, Tanzanie, Congo, Burundi, Rwanda, Comores — name
 * between four and fourteen languages each through their peoples instead.
 * Reading only the first field would leave a quarter of the atlas with an
 * empty language line while the answer sat one level down.
 */
function collectLanguages(country: Country): string[] {
  const seen: string[] = [];
  const push = (candidate: unknown) => {
    const name = trimmed(candidate);
    if (name && !seen.includes(name)) seen.push(name);
  };

  for (const language of country.content?.culture?.mainLanguages ?? []) {
    push(language?.name);
  }
  if (seen.length > 0) return seen.slice(0, MAX_LANGUAGES);

  for (const people of country.content?.majorPeoples ?? []) {
    for (const language of people?.languages ?? []) push(language);
  }
  return seen.slice(0, MAX_LANGUAGES);
}

// @req REQ-113
export function deriveCountrySynthesis(country: Country): CountrySynthesis {
  const content = country.content ?? {};

  const peoples: CountrySynthesisPeople[] = (content.majorPeoples ?? [])
    .map((people): CountrySynthesisPeople | null => {
      const name = trimmed(people?.name);
      if (!name) return null;
      return people?.peopleId ? { name, peopleId: people.peopleId } : { name };
    })
    .filter((entry): entry is CountrySynthesisPeople => entry !== null)
    .slice(0, MAX_PEOPLES);

  return {
    id: country.id,
    nameFr: country.nameFr,
    summary: trimmed(country.summary),
    formerNames: (content.historicalNames?.formerNames ?? [])
      .map(trimmed)
      .filter((name): name is string => name !== null)
      .slice(0, MAX_FORMER_NAMES),
    peoples,
    kingdoms: (content.kingdoms ?? [])
      .map((kingdom) => trimmed(kingdom?.name))
      .filter((name): name is string => name !== null)
      .slice(0, MAX_KINGDOMS),
    languages: collectLanguages(country),
  };
}

/**
 * Whether this synthesis is worth a card.
 *
 * The atlas charter asks a surface to say what the corpus does not hold
 * rather than dress an absence up. A synthesis with neither a chapeau nor a
 * single people has nothing to say about its country, so the rail skips it
 * instead of drawing a card whose every line reads "—".
 */
// @req REQ-113
export function hasRenderableSynthesis(synthesis: CountrySynthesis): boolean {
  return synthesis.summary !== null || synthesis.peoples.length > 0;
}

/**
 * The same synthesis, from the flattened shape the fiche route carries.
 *
 * `mapCountryDetail` lifts the JSONB sections to the top level for the fiche
 * components, so a CountryDetail and a Country describe one country in two
 * shapes. Re-nesting here rather than writing a second derivation is the
 * whole point of this module: the head of the fiche and the card on the home
 * must not be able to disagree about what a country is.
 */
// @req REQ-113
export function deriveCountrySynthesisFromDetail(
  detail: CountryDetail
): CountrySynthesis {
  return deriveCountrySynthesis({
    id: detail.id,
    // The common name, not the protocol one: "Burkina Faso" heads a brief,
    // "République fédérale du Nigeria" does not.
    nameFr: detail.nameCommonFr || detail.nameFr,
    summary: detail.summary,
    content: {
      historicalNames: detail.historicalNames,
      kingdoms: detail.kingdoms,
      majorPeoples: detail.majorPeoples,
      culture: detail.culture,
    },
  } as Country);
}
