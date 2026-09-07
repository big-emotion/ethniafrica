import type { Metadata } from "next";

import { logger } from "@/lib/api/logger";
import { getCountryCommonName } from "@/lib/countryNames";
import {
  loadCountryFiche,
  loadLanguageFamilyFiche,
  loadLanguageFiche,
  loadPatronymeFiche,
  loadPeopleFiche,
} from "@/lib/fiche/ficheExistence";
import { ficheCanonical, type FicheKind } from "@/lib/seo/ficheCanonical";
import { buildFicheHead, type FicheSubject } from "@/lib/seo/ficheMetadata";
import { parseVersionedSlug } from "@/lib/versioned-slug";
import type { Language } from "@/types/shared";

/**
 * The whole `<head>` of a fiche: the crawler half `ficheCanonical` already
 * answered, plus the half that names the fiche.
 *
 * This module is the only one that knows the five aggregate shapes. It reduces
 * each to a `FicheSubject` and hands that to the pure builder, so the templates
 * stay testable without a database and the mapping stays in one place rather
 * than duplicated across five route files.
 *
 * **A failure here must never propagate.** `ficheExistence` documents why at
 * length: the fiche routes declare a `loading.tsx`, so the shell and its `200`
 * are already on the wire by the time metadata settles. Next cannot turn a
 * rejection into a status — it drops the resolved metadata instead, and the
 * document ends up with no `<title>` at all, not even the root layout's. That
 * is a serious `document-title` violation, and it once failed the
 * accessibility gate on four routes for hours while the corpus was unreachable.
 * So an unreadable corpus costs the fiche its name, never its head.
 */

/** ISO 3166-1 alpha-3, which `getCountryCommonName` echoes when it cannot resolve one. */
const ISO_ALPHA_3 = /^[A-Z]{3}$/;

/**
 * Country names for a people's presence list.
 *
 * `getCountryCommonName` falls back to the string it was given, so passing the
 * ISO code as its own fallback makes an unresolvable code echo back — and a
 * title reading "Fon — peuple (BEN)" is exactly the raw-identifier leak the
 * reader-facing register exists to stop. Unresolved codes are dropped.
 */
function countryDisplayNames(
  lang: Language,
  isoCodes: readonly string[] | undefined
): string[] {
  return (isoCodes ?? [])
    .map((code) => getCountryCommonName(lang, code, code))
    .filter((name) => !ISO_ALPHA_3.test(name));
}

/**
 * A fiche reduced to what a head or a graph needs.
 *
 * Exported because `FicheJsonLd` describes the same entity to a machine that
 * the head describes to a search result, and two mappings of the five
 * aggregates could disagree about what a fiche is called. The loaders beneath
 * are request-cached, so the second caller costs no query.
 */
// @req REQ-091
export async function ficheSubjectFor(
  kind: FicheKind,
  lang: Language,
  id: string
): Promise<FicheSubject | null> {
  switch (kind) {
    case "people":
    case "peopleLinks": {
      const people = await loadPeopleFiche(id);
      if (!people) return null;
      return {
        name: people.nameMain,
        countryNames: countryDisplayNames(lang, people.currentCountries),
      };
    }
    case "country": {
      const country = await loadCountryFiche(id);
      if (!country) return null;
      return { name: country.nameFr, summary: country.summary };
    }
    case "family": {
      const family = await loadLanguageFamilyFiche(id);
      if (!family) return null;
      return { name: family.nameFr, peopleCount: family.peopleCount };
    }
    case "language": {
      const language = await loadLanguageFiche(id);
      if (!language) return null;
      return {
        name: language.name,
        familyName: language.family?.name,
        peopleNames: language.speakingPeoples?.map((people) => people.name),
      };
    }
    case "name": {
      const patronyme = await loadPatronymeFiche(id);
      if (!patronyme) return null;
      return {
        name: patronyme.nameMain,
        peopleNames: patronyme.associatedPeoples?.map(
          (people) => people.nameMain
        ),
        countryNames: patronyme.associatedCountries?.map(
          (country) => country.nameFr
        ),
      };
    }
  }
}

/**
 * A fiche's metadata, named after the fiche.
 *
 * Falls back to `ficheCanonical` alone — the head as it stood before REQ-091's
 * copy — whenever the corpus cannot say what the fiche is called.
 */
// @req REQ-091
export async function ficheHead(
  kind: FicheKind,
  language: Language,
  slug: string
): Promise<Metadata> {
  const parsed = parseVersionedSlug(decodeURIComponent(slug));
  if (!parsed) return ficheCanonical(kind, language, slug);

  try {
    const subject = await ficheSubjectFor(kind, language, parsed.slug);
    if (!subject) return ficheCanonical(kind, language, slug);
    return ficheCanonical(
      kind,
      language,
      slug,
      buildFicheHead(kind, language, subject)
    );
  } catch (error) {
    logger.error(`Fiche head could not be built for ${parsed.slug}`, error);
    return ficheCanonical(kind, language, slug);
  }
}
