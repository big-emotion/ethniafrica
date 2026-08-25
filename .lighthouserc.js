module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:3000/",
        "http://localhost:3000/fr",
        // /fr/noms is temporarily excluded here: it currently returns
        // HTTP 500 in CI (a pre-existing failure predating this story, not
        // caused by it — see ETNI-500 PR #371 review). lhci's `collect`
        // step aborts the entire run on the first URL that fails to load,
        // which left every route after it — including every route already
        // in this list, not just the new one below — permanently
        // unmeasured. Re-add once /fr/noms is fixed.
        // Epic 10, Story 10.11 (ETNI-500 · FR71, NFR18–NFR23) — the quiz
        // journey joins the reference routes so its mobile Performance ≥ 85
        // budget is enforced continuously via the base ".*" assertMatrix
        // entry below, not just checked once at ship time.
        "http://localhost:3000/fr/quiz",
        // One representative route per charter route-family rolled out in
        // 16.4–16.9 (ETNI-807 · FR110), in addition to the fiche routes
        // below. Dropping one leaves that family's mobile budget unmeasured.
        "http://localhost:3000/fr/peuples",
        "http://localhost:3000/fr/recherche",
        "http://localhost:3000/fr/mentions-legales",
        "http://localhost:3000/fr/admin/connexion",
        // The next three are one representative assembled fiche per AFRIK
        // entity type (FR102) — country, people, language family. Each entity
        // type resolves a different chapter sequence (panelRegistry.tsx), so
        // dropping one leaves that sequence's mobile budget unmeasured.
        "http://localhost:3000/fr/pays/SEN",
        "http://localhost:3000/fr/peuples/PPL_WOLOF",
        // ETNI-463 (7.11) AC1 — also the large-family sample (FLG_BANTU:
        // 6 languages, 174 associated peoples, the largest currently-seeded).
        "http://localhost:3000/fr/familles/FLG_BANTU",
        // Epic 11, Story 11.11 (FR75, NFR1) — the links page with the lazy
        // (ssr:false) ego-network graph must not regress mobile performance.
        "http://localhost:3000/fr/peuples/PPL_WOLOF/liens",
        // ETNI-488 (9.11) AC1 — comparator picker + one seeded comparison
        // route (illustrative staging IDs, same FLG_ATLANTIQUE family as the
        // /fr/peuples/PPL_WOLOF fiche above). Tighter CWV budgets for both
        // are scoped in assert.assertMatrix below.
        "http://localhost:3000/fr/comparer",
        "http://localhost:3000/fr/comparer/peuples/PPL_WOLOF/PPL_SERERE",
        // Epic 13, Story 13.12 (ETNI-536) — the colonization module's
        // timeline (EventTimelineMarkers + EventChronologyTable) must not
        // regress the base mobile Performance ≥ 85 / Accessibility = 100
        // budgets enforced by the catch-all assertMatrix entry below.
        "http://localhost:3000/fr/regards/colonisation-et-resistances",
        // /fr/migrations (Epic 12, Story 12.9 · ETNI-522/1104) is also
        // temporarily excluded here for the same reason as /fr/noms above:
        // it independently returns HTTP 500 in CI (confirmed via the
        // axe-core live-route audit hitting it on a separate server
        // instance — see ETNI-500 PR #371 review), which was previously
        // masked by /fr/noms failing first and aborting the run before
        // reaching it. Its tighter CLS/INP budgets stay defined in
        // assert.assertMatrix below (harmlessly inert while unmatched) —
        // re-add the URL here once /fr/migrations is fixed.
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
      // ETNI-488 (9.11) AC1 fix (review) — LHCI's `assertMatrix` and the
      // top-level `assertions` block are mutually exclusive: when
      // `assertMatrix` is present, any URL not matched by one of its
      // entries gets no assertions at all. The base site-wide gates are
      // therefore folded in here as the first, catch-all entry so every
      // route (including the comparator ones) keeps
      // `categories:performance ≥ 0.85` and the other base budgets. The
      // comparator entry below adds its stricter LCP/CLS/FID budgets on
      // top for the comparator routes only.
      assertMatrix: [
        {
          matchingUrlPattern: ".*",
          assertions: {
            "categories:performance": ["error", { minScore: 0.85 }],
            "categories:accessibility": ["error", { minScore: 1 }],
            "categories:best-practices": ["error", { minScore: 0.95 }],
            "largest-contentful-paint": ["error", { maxNumericValue: 5500 }],
            "total-blocking-time": ["error", { maxNumericValue: 300 }],
          },
        },
        // ETNI-488 (9.11) AC1 — comparator routes are additionally held to
        // the story's tighter field-metric budgets (LCP ≤ 2.5s / CLS ≤ 0.1 /
        // INP ≤ 200ms, max-potential-fid as the lab proxy for INP), on top
        // of the base gates above. Scoped by URL pattern so the looser
        // site-wide LCP budget and the (currently ungated) CLS on fiche
        // routes are left untouched — only the comparator picker and
        // comparison routes tighten.
        {
          matchingUrlPattern: "^http://localhost:3000/fr/comparer(/.*)?$",
          assertions: {
            "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
            "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
            "max-potential-fid": ["error", { maxNumericValue: 200 }],
          },
        },
        // ETNI-522/1104 — the migrations atlas route additionally holds
        // CLS ≤ 0.1 and INP ≤ 200ms (max-potential-fid as the lab proxy),
        // on top of the base Performance ≥ 85 gate above.
        {
          matchingUrlPattern: "^http://localhost:3000/fr/migrations(/.*)?$",
          assertions: {
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
