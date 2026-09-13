// Two locales, one budget each way.
//
// The root URL is measured through the middleware's redirect, so its budget
// is the configured default locale's home under REQ-140. It stays in the
// list because it is the address a reader types; the locale it lands on is
// controlled by `SITE_LOCALE_MODE`, and this file does not repeat that choice.
//
// French is measured in full: every route family, every fiche type, the
// tighter comparator budgets. English is measured on a
// representative subset at the end of the list — the home, the three fiches,
// one facet, the quiz, the migrations atlas, the doctrine index, the
// comparator picker and the glossary. Bundles are locale-independent, so a
// full twin would double a ~16 min nightly job to measure budgets that cannot
// differ; what can differ is the a11y category (labels, `lang`, hreflang), and
// the axe gate audits the English surface in full for that
// (scripts/a11yRoutes.ts). The subset sits last because `collect` aborts the
// whole run on the first URL that fails to load, and an unserved English
// address must not cost the French measurements after it.
// The workflow opts its test server into `bilingual-fr-default`; production
// stays fail-closed to `fr-only` until an explicit launch configuration.
//
// This file cannot import the slug table (CommonJS, loaded by the lhci CLI),
// so every English address below is spelled out and
// scripts/__tests__/qualityGateRoutes.test.ts checks each one against the
// helper that composes it.
//
// This is the nightly matrix. The pull-request gate is `.lighthouserc.gate.js`,
// which borrows this file's collection settings and audits four routes.

// An assembled country, people or family fiche — the routes that open on the
// WebGL globe — in either locale. A sub-page such as `/liens` is not one.
const FICHE_PATTERN =
  "http://localhost:3000/(?:fr/atlas/(?:pays|peuples|familles)|en/atlas/(?:countries|peoples|families))/[^/]+";

module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:3000/",
        "http://localhost:3000/fr",
        // /fr/atlas/appellations and /fr/dossiers/migrations (further down this list) both returned
        // HTTP 500 in CI and were excluded, because lhci's `collect` step
        // aborts the whole run on the first URL that fails to load — which
        // left every route after them unmeasured, not just themselves.
        //
        // Migration 039 restored the `sources_title_key` UNIQUE constraint
        // that `onConflict: "title"` upserts depend on. Without it every
        // upsertSource in nameRecordJsonLoader and migrationJsonLoader
        // aborted its fiche, so `name_records` and `migration_events` stayed
        // empty — which is what these two routes read. 039 was applied on
        // 2026-08-25, so the cause is gone and both are measured again.
        //
        // If either still fails, the honest response is to fix the route, not
        // to re-exclude it: an unmeasured route is a budget nobody enforces.
        "http://localhost:3000/fr/atlas/appellations",
        // Epic 10, Story 10.11 (ETNI-500 · FR71, NFR18–NFR23) — the quiz
        // journey joins the reference routes so its mobile Performance ≥ 85
        // budget is enforced continuously via the base ".*" assertMatrix
        // entry below, not just checked once at ship time.
        "http://localhost:3000/fr/jeux/quiz",
        // One representative route per charter route-family rolled out in
        // 16.4–16.9 (ETNI-807 · FR110), in addition to the fiche routes
        // below. Dropping one leaves that family's mobile budget unmeasured.
        // The three Explorer facets. They were one route-family when they
        // were three directories, and one sample stood for all of them; they
        // are not one any more. They share a layout that mounts a WebGL globe
        // and holds it across a switch, so a budget measured on `peuples`
        // alone says nothing about what the other two cost. The hub above
        // them was measured here too until ETNI-1555 deleted it — and since
        // `collect` aborts on the first URL that fails to load, that one dead
        // address left every route below it unmeasured.
        "http://localhost:3000/fr/atlas/peuples",
        "http://localhost:3000/fr/atlas/familles",
        "http://localhost:3000/fr/atlas/pays",
        "http://localhost:3000/fr/atlas/recherche",
        "http://localhost:3000/fr/mentions-legales",
        "http://localhost:3000/fr/admin/connexion",
        // The next three are one representative assembled fiche per AFRIK
        // entity type (FR102) — country, people, language family. Each entity
        // type resolves a different chapter sequence (panelRegistry.tsx), so
        // dropping one leaves that sequence's mobile budget unmeasured.
        "http://localhost:3000/fr/atlas/pays/SEN",
        "http://localhost:3000/fr/atlas/peuples/PPL_WOLOF",
        // ETNI-463 (7.11) AC1 — also the large-family sample (FLG_BANTU:
        // 6 languages, 174 associated peoples, the largest currently-seeded).
        "http://localhost:3000/fr/atlas/familles/FLG_BANTU",
        // Epic 11, Story 11.11 (FR75, NFR1) — the links page with the lazy
        // (ssr:false) ego-network graph must not regress mobile performance.
        "http://localhost:3000/fr/atlas/peuples/PPL_WOLOF/liens",
        // ETNI-488 (9.11) AC1 — comparator picker + one seeded comparison
        // route (illustrative staging IDs, same FLG_ATLANTIQUE family as the
        // /fr/atlas/peuples/PPL_WOLOF fiche above). Tighter CWV budgets for both
        // are scoped in assert.assertMatrix below.
        "http://localhost:3000/fr/comparer",
        "http://localhost:3000/fr/comparer/peuples/PPL_WOLOF/PPL_SERER",
        // The dossiers axis, measured through the two surfaces the freeze
        // leaves standing.
        //
        // The colonization timeline (ETNI-536) and the migrations atlas
        // (ETNI-522/1104) were listed here and are withdrawn: their routes
        // answer 404, and `collect` aborts the whole run on the first URL that
        // fails to load, so leaving them would cost every budget in this file
        // rather than just their own. They come back with the readings, and
        // whatever budget the atlas then needs comes back with its URL: an
        // assertMatrix entry matching no collected URL asserts nothing.
        "http://localhost:3000/fr/dossiers/anecdotes",
        // ETNI-1622 — every doctrine detail page 500'd on a built server
        // ("A React Element from an older version of React was rendered",
        // from next-mdx-remote's React resolution racing Next's own
        // react-server bundling) while its unit test — which mocks
        // next-mdx-remote entirely — stayed green. No CI job requested a
        // built-server URL for this route family, so nothing caught it.
        // This is that missing gate: the index plus one representative
        // detail page, since `collect` aborts the whole run on the first
        // URL that fails to load.
        "http://localhost:3000/fr/doctrine",
        "http://localhost:3000/fr/doctrine/classifications-contestees",
        // The glossary is the one page the footer's "Le projet" rubric leads
        // to that nothing measured: it joins the list so the English subset
        // below is a subset of the French measurement, not a superset.
        "http://localhost:3000/fr/glossaire",
        // The English subset (see the header). Same identifiers as the French
        // routes above, so a difference between the two measurements is the
        // locale and nothing else.
        "http://localhost:3000/en",
        "http://localhost:3000/en/atlas/countries/SEN",
        "http://localhost:3000/en/atlas/peoples/PPL_WOLOF",
        "http://localhost:3000/en/atlas/families/FLG_BANTU",
        "http://localhost:3000/en/atlas/peoples",
        "http://localhost:3000/en/games/quiz",
        "http://localhost:3000/en/dossiers/anecdotes",
        "http://localhost:3000/en/doctrine",
        "http://localhost:3000/en/compare",
        "http://localhost:3000/en/glossary",
      ],
      numberOfRuns: 3,
      // Audit returning-user performance with essential-only consent. The
      // live axe run still exercises the consent banner for new visitors.
      puppeteerScript: "./scripts/lighthouse-setup.cjs",
      puppeteerLaunchOptions: {
        args: ["--no-sandbox"],
      },
      settings: {
        // Mobile emulation with 4G throttling
        formFactor: "mobile",
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          uploadThroughputKbps: 750,
          cpuSlowdownMultiplier: 4,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
        },
        throttlingMethod: "simulate",
        screenEmulation: {
          mobile: true,
          width: 360,
          height: 640,
          deviceScaleFactor: 2.625,
          disabled: false,
        },
        emulatedUserAgent:
          "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
      },
    },
    assert: {
      // LHCI's `assertMatrix` and a top-level `assertions` block are mutually
      // exclusive, and a URL no entry matches is asserted against nothing. So
      // the first entry is a catch-all, and every entry after it is scoped by
      // a pattern that says which routes it holds.
      //
      // The budgets below were re-based on nightly run 34708996478 (v4.8.0,
      // 2026-09-12), the first one read assertion by assertion since the list
      // grew past the 2026-08-11 green. Where a route could not meet the old
      // number, the number it does meet is written here as a ceiling that may
      // only tighten: a budget 45 assertions red every night is not a budget,
      // it is how a real regression goes unread.
      assertMatrix: [
        {
          matchingUrlPattern: ".*",
          assertions: {
            "categories:accessibility": ["error", { minScore: 1 }],
            "categories:best-practices": ["error", { minScore: 0.95 }],
          },
        },
        // Every route that does not open on an assembled fiche. The lowest
        // three-run median measured was 0.75 (the English home); two points
        // under it absorb runner noise without licensing a slide. The cost
        // these routes share is the common chunk, not their own code, so the
        // floor moves up when that chunk shrinks — not route by route.
        {
          matchingUrlPattern: `^(?!${FICHE_PATTERN}$).*$`,
          assertions: {
            "categories:performance": ["error", { minScore: 0.73 }],
            "largest-contentful-paint": ["error", { maxNumericValue: 5500 }],
            "total-blocking-time": ["error", { maxNumericValue: 300 }],
          },
        },
        // The three assembled fiches, both locales. Their opening animation
        // is a WebGL globe, and a GitHub runner has no GPU: Chromium falls
        // back to software rasterisation on the CPU, which Lighthouse then
        // multiplies by the 4x CPU throttle. The 2.5-3.5 s of blocking time is
        // that rasteriser, not script a reader's phone would run — so it is
        // held as a ratchet rather than against the 300 ms a GPU-less lab
        // cannot reach. Measured medians: TBT 2 470-3 472 ms, LCP 5 808-6 049
        // ms, performance 0.45-0.47. Lower both ceilings when the globe's
        // first frame gets cheaper; never raise them to absorb a regression.
        {
          matchingUrlPattern: `^${FICHE_PATTERN}$`,
          assertions: {
            "categories:performance": ["warn", { minScore: 0.85 }],
            "largest-contentful-paint": ["error", { maxNumericValue: 6500 }],
            "total-blocking-time": ["error", { maxNumericValue: 3600 }],
          },
        },
        // ETNI-488 (9.11) AC1 — comparator routes also hold CLS and INP
        // (max-potential-fid as the lab proxy). Their LCP budget was 2.5 s,
        // a field target no simulated-4G lab run of these routes has met
        // (measured 4.4-4.9 s); it now sits with the site-wide 5.5 s so the
        // assertion reports a regression instead of a standing failure. Both
        // locales' slugs, or the English comparator would go unscoped.
        {
          matchingUrlPattern:
            "^http://localhost:3000/(fr/comparer|en/compare)(/.*)?$",
          assertions: {
            "largest-contentful-paint": ["error", { maxNumericValue: 5500 }],
            "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
            "max-potential-fid": ["error", { maxNumericValue: 200 }],
          },
        },
      ],
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
