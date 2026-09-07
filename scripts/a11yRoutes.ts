import type { Language } from "@/types/shared";
import {
  COMPARE_ENTITY_SEGMENTS,
  getCountryRoute,
  getFamilyRoute,
  getLocalizedRoute,
  getNommerChapterRoute,
  getPeopleLinksRoute,
  getPeopleRoute,
  getStaticPageRoute,
  PUBLISHED_LOCALES,
} from "@/lib/routing";
import { isModulePublished } from "@/lib/hubs/moduleOffer";

/**
 * The live Next.js routes the axe gate audits, in one importable module.
 *
 * It sits beside `a11y-test.ts` rather than inside it because that file calls
 * `runA11yTests()` at load and exits the process — importing it from a test
 * would run the whole audit. `qualityGateRoutes.test.ts` used to work around
 * that by reading the file as text and grepping it for route strings, which
 * only holds while the routes are spelled out. They are composed now, so the
 * list moves here and both readers get the same array.
 *
 * Composed from the slug table, never spelled out: a gate that audits an
 * address the site stopped serving reports a clean run against a 404, and Lot
 * 3 moved every module route named below.
 *
 * One list per published locale, the same nineteen addresses in each. axe is
 * the one browser gate that reads copy — labels, `lang` attributes, the
 * hreflang links — so the English surface is audited in full rather than
 * sampled the way Lighthouse samples it (bundles do not change with the
 * locale; labels do). Nineteen routes on four lanes is the wall clock of the
 * one required check; the second locale doubles it.
 *
 * The three fiche routes are one representative assembled fiche per AFRIK
 * entity type (FR102). All three are needed because the panel-kind ×
 * entity-type matrix (panelRegistry.tsx) gives each type a different chapter
 * sequence, so a panel regression can miss two of them entirely. Canonical
 * AFRIK identifiers only — never display-name slugs.
 *
 * The five routes above them are one representative route per charter
 * route-family rolled out in 16.4–16.9 (ETNI-807 · FR110). The sign-in page
 * stands in for the moderation surface: the admin console itself redirects
 * unauthenticated visitors on mount, so auditing it unauthenticated would
 * measure the redirect, not the admin/moderation charter chrome. It is the
 * one admin address served in both locales, and the segment after `admin`
 * has no slug-table entry, so it is written out.
 *
 * The comparator journey (Epic 9, ETNI-485 · FR44) contributes its picker
 * shell and one seeded comparison, reusing FLG ids already known good above
 * so the route does not depend on unverified seed ids. The entity segment is
 * the locale's own: written in the other locale's word it would be an
 * address the middleware redirects, and the audit would measure the hop.
 *
 * The links page (Epic 11, Story 11.11 · AR20) mounts the EgoNetworkGraph
 * lazily (next/dynamic ssr:false); this gate keeps the graph's keyboard/ARIA
 * contract at zero serious/critical.
 *
 * The migrations route (Epic 12, Story 12.10 · ETNI-523 · FR84) audits the
 * server-rendered baseline: both the "Carte" and "Récit" tab panels are
 * `forceMount`-ed, so one load covers the Récit text equivalent plus the
 * inactive Carte panel's static markup. Interactive states need real DOM
 * interaction and live in e2e/migrations-atlas-a11y.spec.ts.
 *
 * The quiz route (Epic 10, Story 10.11 · ETNI-500 · FR71) audits the
 * server-rendered segment picker, for the same reason and with the same
 * division of labour with e2e/quiz-journey-a11y.spec.ts.
 *
 * The doctrine routes (ETNI-1622) are this gate's only coverage of an MDX
 * render through next-mdx-remote/rsc: every detail page 500'd on a built
 * server while its unit test (which mocks next-mdx-remote entirely) stayed
 * green, and this axe run is the one CI job that both builds+starts a real
 * server and fails on a >= 400 status before trusting the audit. The index
 * and one representative slug are both listed, since the index alone had
 * stayed healthy the whole time the slug route was down.
 */
const liveRoutesFor = (locale: Language): string[] => [
  `/${locale}`,
  getLocalizedRoute(locale, "names"),
  getLocalizedRoute(locale, "peoples"),
  getLocalizedRoute(locale, "search"),
  getStaticPageRoute(locale, "legalNotice"),
  `${getStaticPageRoute(locale, "admin")}/connexion`,
  getFamilyRoute(locale, "FLG_BANTU"),
  getPeopleRoute(locale, "PPL_WOLOF"),
  getCountryRoute(locale, "SEN"),
  getLocalizedRoute(locale, "compare"),
  `${getLocalizedRoute(locale, "compare")}/${COMPARE_ENTITY_SEGMENTS[locale].families}/FLG_BANTU/FLG_MANDE`,
  getPeopleLinksRoute(locale, "PPL_WOLOF"),
  ...(isModulePublished("frise")
    ? [getLocalizedRoute(locale, "migrations")]
    : []),
  getLocalizedRoute(locale, "quiz"),
  ...(isModulePublished("regards-colonisation")
    ? [getLocalizedRoute(locale, "colonization")]
    : []),
  ...(isModulePublished("nommer")
    ? [
        getLocalizedRoute(locale, "nommer"),
        // One chapter, not five: they share a renderer, so auditing the fifth
        // would audit the same tree four more times. `la-langue` is the one
        // carrying a table and a set of name pairs, which is where the
        // accessibility work is.
        getNommerChapterRoute(locale, "la-langue"),
      ]
    : []),
  // The one reading the freeze leaves standing, so withdrawing the dossiers
  // does not withdraw the axis from this gate as well. The hub is deliberately
  // not here: `qualityGateRoutes.test.ts` keeps every axis landing page out of
  // both browser gates, and that rule does not bend for a freeze.
  getLocalizedRoute(locale, "anecdotes"),
  getLocalizedRoute(locale, "doctrine"),
  `${getLocalizedRoute(locale, "doctrine")}/classifications-contestees`,
];

// @req REQ-141
export const LIVE_ROUTES = PUBLISHED_LOCALES.flatMap(liveRoutesFor);
