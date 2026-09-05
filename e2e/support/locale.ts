// Relative rather than `@/`: playwright.config.ts imports this module, and
// knip loads that config at run time without the tsconfig path aliases — the
// same reason the config reaches `src/lib/consent` by a relative path.
import { DEFAULT_LOCALE, isLocale } from "../../src/lib/locale";
import type { Language } from "../../src/types/shared";

/**
 * The locale the suite drives, from `E2E_LOCALE`, defaulting to the site's.
 *
 * One constant rather than a literal in every spec, so the same suite runs
 * once per published locale (e2e.yml runs a matrix over both). A spec composes
 * its addresses from it through the routing helpers; a spec that reads UI copy
 * guards itself with `test.skip(LOCALE !== "fr", …)` until that copy is
 * translated, so the English leg exercises the route, CSP and axe specs and
 * is honest about what it does not.
 *
 * A value the site does not publish throws rather than falling back: a typo
 * in the matrix would otherwise run the default locale twice and report both
 * legs green.
 */
const resolveSuiteLocale = (): Language => {
  const requested = process.env.E2E_LOCALE;
  if (requested === undefined || requested === "") return DEFAULT_LOCALE;
  if (!isLocale(requested)) {
    throw new Error(
      `E2E_LOCALE=${requested} is not a published locale (${DEFAULT_LOCALE} is the default)`
    );
  }
  return requested;
};

// @req REQ-141
export const LOCALE = resolveSuiteLocale();
