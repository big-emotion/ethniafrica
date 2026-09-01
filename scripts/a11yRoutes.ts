import {
  getCountryRoute,
  getFamilyRoute,
  getLocalizedRoute,
  getPeopleLinksRoute,
  getPeopleRoute,
} from "@/lib/routing";

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
 * The three fiche routes are one representative assembled fiche per AFRIK
 * entity type (FR102). All three are needed because the panel-kind ×
 * entity-type matrix (panelRegistry.tsx) gives each type a different chapter
 * sequence, so a panel regression can miss two of them entirely. Canonical
 * AFRIK identifiers only — never display-name slugs.
 *
 * The five routes above them are one representative route per charter
 * route-family rolled out in 16.4–16.9 (ETNI-807 · FR110). `/fr/admin/connexion`
 * stands in for the moderation surface: `/fr/admin` itself redirects
 * unauthenticated visitors on mount, so auditing it unauthenticated would
 * measure the redirect, not the admin/moderation charter chrome.
 *
 * The comparator journey (Epic 9, ETNI-485 · FR44) contributes its picker
 * shell and one seeded comparison, reusing FLG ids already known good above
 * so the route does not depend on unverified seed ids.
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
// @req REQ-091
export const LIVE_ROUTES = [
  "/fr",
  getLocalizedRoute("fr", "names"),
  getLocalizedRoute("fr", "peoples"),
  getLocalizedRoute("fr", "search"),
  "/fr/mentions-legales",
  "/fr/admin/connexion",
  getFamilyRoute("fr", "FLG_BANTU"),
  getPeopleRoute("fr", "PPL_WOLOF"),
  getCountryRoute("fr", "SEN"),
  getLocalizedRoute("fr", "compare"),
  `${getLocalizedRoute("fr", "compare")}/familles/FLG_BANTU/FLG_MANDE`,
  getPeopleLinksRoute("fr", "PPL_WOLOF"),
  getLocalizedRoute("fr", "migrations"),
  getLocalizedRoute("fr", "quiz"),
  getLocalizedRoute("fr", "colonization"),
  getLocalizedRoute("fr", "doctrine"),
  `${getLocalizedRoute("fr", "doctrine")}/classifications-contestees`,
];
