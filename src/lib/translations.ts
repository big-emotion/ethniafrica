import { classificationCopy } from "@/lib/i18n/copy/classification";
import { colonizationCopy } from "@/lib/i18n/copy/colonization";
import { commonCopy } from "@/lib/i18n/copy/common";
import { fieldProvenanceCopy } from "@/lib/i18n/copy/fieldProvenance";
import { footerCopy } from "@/lib/i18n/copy/footer";
import { hubsCopy } from "@/lib/i18n/copy/hubs";
import { languagesCopy } from "@/lib/i18n/copy/languages";
import { migrationsCopy } from "@/lib/i18n/copy/migrations";
import { namesCopy } from "@/lib/i18n/copy/names";
import { patronymesCopy } from "@/lib/i18n/copy/patronymes";
import { publicFlagsCopy } from "@/lib/i18n/copy/publicFlags";
import { quizCopy } from "@/lib/i18n/copy/quiz";
import { sitemapPageCopy } from "@/lib/i18n/copy/sitemapPage";
import { trailCopy } from "@/lib/i18n/copy/trail";
import type { Language } from "@/types/shared";

/**
 * The site dictionary, composed from the per-surface modules under
 * `src/lib/i18n/copy/`.
 *
 * A façade rather than the dictionary itself: forty-odd importers read
 * `getTranslation(lang).<surface>` and every one of them would move if the
 * shape changed, so the shape stays and the strings live one file per
 * surface. A client island that is budgeted — the quiz — imports its own
 * module instead, and this file is what keeps that split from costing the
 * server side anything. Each locale is composed separately so a module
 * wired to the wrong locale is the parity suite's to catch
 * (`copyParity.test.ts`), not the compiler's to miss.
 */
const en = {
  ...commonCopy.en,
  footer: footerCopy.en,
  sitemapPage: sitemapPageCopy.en,
  publicFlags: publicFlagsCopy.en,
  classification: classificationCopy.en,
  names: namesCopy.en,
  languages: languagesCopy.en,
  patronymes: patronymesCopy.en,
  migrations: migrationsCopy.en,
  colonization: colonizationCopy.en,
  quiz: quizCopy.en,
  fieldProvenance: fieldProvenanceCopy.en,
  hubs: hubsCopy.en,
  trail: trailCopy.en,
};

/**
 * The shape both locales share. Not exported: consumers take it from
 * `getTranslation`, and the parity is enforced here by the `fr` declaration.
 */
type UiDictionary = typeof en;

const fr: UiDictionary = {
  ...commonCopy.fr,
  footer: footerCopy.fr,
  sitemapPage: sitemapPageCopy.fr,
  publicFlags: publicFlagsCopy.fr,
  classification: classificationCopy.fr,
  names: namesCopy.fr,
  languages: languagesCopy.fr,
  patronymes: patronymesCopy.fr,
  migrations: migrationsCopy.fr,
  colonization: colonizationCopy.fr,
  quiz: quizCopy.fr,
  fieldProvenance: fieldProvenanceCopy.fr,
  hubs: hubsCopy.fr,
  trail: trailCopy.fr,
};

/**
 * Typed `Record<Language, …>` on purpose: with `noImplicitAny: false`, an
 * untyped literal let `translations["en"]` compile and return `undefined`,
 * which is how the header would have thrown on `/en` under a green build.
 */
// @req REQ-014
export const translations: Record<Language, UiDictionary> = { en, fr };

// @req REQ-014
export const getTranslation = (lang: Language): UiDictionary =>
  translations[lang];

/**
 * Localized labels and tooltips for the `classification_status` enum.
 * Used by the ClassificationBadge component (ETNI-178).
 */
// @req REQ-023
export const classificationLabels = translations.fr.classification;
