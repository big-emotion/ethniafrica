import { adminCopy } from "@/lib/i18n/copy/admin";
import { classificationCopy } from "@/lib/i18n/copy/classification";
import { atlasCopy } from "@/lib/i18n/copy/atlas";
import { anecdotesCopy } from "@/lib/i18n/copy/anecdotes";
import { colonizationCopy } from "@/lib/i18n/copy/colonization";
import { chromeCopy } from "@/lib/i18n/copy/chrome";
import { commonCopy } from "@/lib/i18n/copy/common";
import { consentCopy } from "@/lib/i18n/copy/consent";
import { compareCopy } from "@/lib/i18n/copy/compare";
import { contactCopy } from "@/lib/i18n/copy/contact";
import { contributeCopy } from "@/lib/i18n/copy/contribute";
import { countryCopy } from "@/lib/i18n/copy/country";
import { facetsCopy } from "@/lib/i18n/copy/facets";
import { fieldProvenanceCopy } from "@/lib/i18n/copy/fieldProvenance";
import { familyCopy } from "@/lib/i18n/copy/family";
import { ficheCopy } from "@/lib/i18n/copy/fiche";
import { footerCopy } from "@/lib/i18n/copy/footer";
import { gamesCopy } from "@/lib/i18n/copy/games";
import { hubsCopy } from "@/lib/i18n/copy/hubs";
import { languagesCopy } from "@/lib/i18n/copy/languages";
import { languageFicheCopy } from "@/lib/i18n/copy/languageFiche";
import { migrationsCopy } from "@/lib/i18n/copy/migrations";
import { namesCopy } from "@/lib/i18n/copy/names";
import { patronymesCopy } from "@/lib/i18n/copy/patronymes";
import { peopleCopy } from "@/lib/i18n/copy/people";
import { publicFlagsCopy } from "@/lib/i18n/copy/publicFlags";
import { quizCopy } from "@/lib/i18n/copy/quiz";
import { reportsCopy } from "@/lib/i18n/copy/reports";
import { serverCopy } from "@/lib/i18n/copy/server";
import { sourceTransparencyCopy } from "@/lib/i18n/copy/sourceTransparency";
import { sitemapPageCopy } from "@/lib/i18n/copy/sitemapPage";
import { systemCopy } from "@/lib/i18n/copy/system";
import { trailCopy } from "@/lib/i18n/copy/trail";

/**
 * Every per-surface dictionary, under the key the façade publishes it as.
 *
 * One list, read by the parity suite (`copyParity.test.ts`) and by nothing
 * else: a surface that lands its dictionary without registering it here
 * escapes the gate, so a wave migrating a directory appends one line. The
 * façade in `src/lib/translations.ts` imports the modules directly rather
 * than through this list, so a client island that needs one surface can
 * import that one file without pulling the rest into its bundle.
 */
// @req REQ-145
export const COPY_MODULES = {
  admin: adminCopy,
  server: serverCopy,
  anecdotes: anecdotesCopy,
  atlas: atlasCopy,
  common: commonCopy,
  chrome: chromeCopy,
  consent: consentCopy,
  compare: compareCopy,
  contact: contactCopy,
  contribute: contributeCopy,
  countryFiche: countryCopy,
  facets: facetsCopy,
  footer: footerCopy,
  games: gamesCopy,
  sitemapPage: sitemapPageCopy,
  publicFlags: publicFlagsCopy,
  classification: classificationCopy,
  names: namesCopy,
  languages: languagesCopy,
  patronymes: patronymesCopy,
  migrations: migrationsCopy,
  colonization: colonizationCopy,
  quiz: quizCopy,
  reports: reportsCopy,
  sourceTransparency: sourceTransparencyCopy,
  fieldProvenance: fieldProvenanceCopy,
  family: familyCopy,
  fiche: ficheCopy,
  languageFiche: languageFicheCopy,
  peopleFiche: peopleCopy,
  hubs: hubsCopy,
  trail: trailCopy,
  system: systemCopy,
} as const;
