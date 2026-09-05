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
  common: commonCopy,
  footer: footerCopy,
  sitemapPage: sitemapPageCopy,
  publicFlags: publicFlagsCopy,
  classification: classificationCopy,
  names: namesCopy,
  languages: languagesCopy,
  patronymes: patronymesCopy,
  migrations: migrationsCopy,
  colonization: colonizationCopy,
  quiz: quizCopy,
  fieldProvenance: fieldProvenanceCopy,
  hubs: hubsCopy,
  trail: trailCopy,
} as const;
