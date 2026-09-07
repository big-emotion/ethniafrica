import { PRODUCT_NAME } from "@/lib/brand";
import { violatesReaderRegister } from "@/lib/editorial/readerRegister";
import { ficheMetadataCopy } from "@/lib/i18n/copy/ficheMetadata";
import type { FicheKind } from "@/lib/seo/ficheCanonical";
import type { Language } from "@/types/shared";

/**
 * What a fiche says about itself in a search result and on a shared card.
 *
 * Measured on production 2026-09-07: every one of the 3 242 sitemap URLs served
 * the root layout's title, description and Open Graph card. `ficheCanonical`
 * answered the crawler head correctly — canonical, hreflang, robots — but never
 * named the fiche, and `localeHead`'s `copy` parameter had no caller. A search
 * engine therefore saw 3 242 pages with one title between them, and Google had
 * sent 12 visitors in the site's lifetime. LinkedIn, which sends 45% of the
 * traffic, rendered the same card for the Fon people and for the home page.
 *
 * Two rules shape every template, and both come from the corpus rather than
 * from SEO practice:
 *
 * **Nothing is invented.** The description is the fiche's own summary when it
 * has one. When it has none, the fallback states only facts the corpus holds —
 * a family, a country list, a count — and never prose describing a fiche the
 * atlas has not written. A fiche the corpus barely fills gets a short
 * description, which is the honest outcome, not a defect to pad.
 *
 * **Nothing leaks.** A title and a description are published verbatim, so they
 * fall under the reader-facing register: no `PPL_`/`FLG_`/`PAT_` identifier, no
 * repository path, none of the workshop's vocabulary. A subject field that
 * carries any of those is dropped rather than printed — see
 * `lib/editorial/readerRegister`.
 */

/** Google truncates a title near 60 characters and a description near 155. */
// @req REQ-091
export const FICHE_TITLE_MAX_LENGTH = 60;
// @req REQ-091
export const FICHE_DESCRIPTION_MAX_LENGTH = 155;

/** At most two names fit a title's parenthesis before it stops being read. */
const MAX_TITLE_CONTEXT_ITEMS = 2;
/** A description can carry a few more, but not a fiche's whole country list. */
const MAX_DESCRIPTION_LIST_ITEMS = 4;

/**
 * A fiche reduced to what a head needs, so this module never depends on the
 * five aggregate shapes — which differ in every field but the name.
 */
// @req REQ-091
export interface FicheSubject {
  name: string;
  /** The fiche's own chapeau, when the corpus wrote one. */
  summary?: string | null;
  familyName?: string | null;
  countryNames?: readonly string[];
  peopleNames?: readonly string[];
  peopleCount?: number | null;
}

// @req REQ-091
export interface FicheHead {
  title: string;
  description: string;
}

/** A field the reader may see, or nothing at all. */
function readable(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return violatesReaderRegister(trimmed) ? null : trimmed;
}

function readableList(
  values: readonly string[] | undefined,
  limit: number
): string[] {
  return (values ?? [])
    .map(readable)
    .filter((value): value is string => value !== null)
    .slice(0, limit);
}

/**
 * Cuts on a word boundary and marks the cut. A description truncated
 * mid-word reads as broken data rather than as an excerpt.
 */
function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const clipped = text.slice(0, limit - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${(lastSpace > limit / 2 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
}

/**
 * The product name is appended only while it still fits. A title that spends
 * its last characters on the brand and loses the country it was naming has
 * the priority backwards — the brand is the one thing a reader can already
 * see in the URL.
 */
function withProductName(descriptor: string): string {
  const full = `${descriptor} | ${PRODUCT_NAME}`;
  if (full.length <= FICHE_TITLE_MAX_LENGTH) return full;
  return truncate(descriptor, FICHE_TITLE_MAX_LENGTH);
}

function titleDescriptor(
  kind: FicheKind,
  lang: Language,
  name: string,
  subject: FicheSubject
): string {
  const copy = ficheMetadataCopy[lang];
  const separator = copy.listSeparator;
  const countries = readableList(subject.countryNames, MAX_TITLE_CONTEXT_ITEMS);
  const family = readable(subject.familyName);

  switch (kind) {
    case "people":
      return copy.title.people(
        name,
        countries.length > 0 ? countries.join(separator) : null
      );
    case "peopleLinks":
      return copy.title.peopleLinks(name);
    case "country":
      return copy.title.country(name);
    case "family":
      return copy.title.family(name);
    case "language":
      return copy.title.language(name, family);
    case "name":
      return copy.title.name(name);
  }
}

/**
 * The description the corpus can defend: its own summary, or the facts it
 * stores, and nothing else.
 */
function composedDescription(
  kind: FicheKind,
  lang: Language,
  name: string,
  subject: FicheSubject
): string {
  const copy = ficheMetadataCopy[lang];
  const separator = copy.listSeparator;
  const clauses: string[] = [];

  const family = readable(subject.familyName);
  if (family && kind !== "family") clauses.push(copy.clause.family(family));

  const countries = readableList(
    subject.countryNames,
    MAX_DESCRIPTION_LIST_ITEMS
  );
  if (countries.length > 0) {
    clauses.push(copy.clause.presence(countries.join(separator)));
  }

  const peoples = readableList(subject.peopleNames, MAX_DESCRIPTION_LIST_ITEMS);
  if (peoples.length > 0) {
    clauses.push(copy.clause.speakers(peoples.join(separator)));
  }

  if (typeof subject.peopleCount === "number" && subject.peopleCount > 0) {
    clauses.push(copy.clause.peopleCount(subject.peopleCount));
  }

  const head = [`${name} — ${copy.lead[kind]}`, ...clauses].join(", ");
  return `${head}. ${copy.trailer}`;
}

/**
 * The head of a fiche, from the fiche itself.
 *
 * Pure, and separated from the loading in `ficheHead` for one reason: this is
 * the part that has to be provable. The charter suite asserts against it that
 * no kind falls back to the site-wide title, that no corpus identifier reaches
 * a search result, and that a fiche filling nothing but its name still names
 * itself.
 */
// @req REQ-091
export function buildFicheHead(
  kind: FicheKind,
  lang: Language,
  subject: FicheSubject
): FicheHead {
  const copy = ficheMetadataCopy[lang];
  const name = readable(subject.name);

  // A fiche whose display name is itself a corpus identifier has no reader-
  // facing name to print. The kind still distinguishes it from the site head.
  if (!name) {
    const lead = copy.lead[kind];
    return {
      title: withProductName(lead),
      description: `${lead}. ${copy.trailer}`,
    };
  }

  const summary = readable(subject.summary);
  const description = summary ?? composedDescription(kind, lang, name, subject);

  return {
    title: withProductName(titleDescriptor(kind, lang, name, subject)),
    description: truncate(description, FICHE_DESCRIPTION_MAX_LENGTH),
  };
}
