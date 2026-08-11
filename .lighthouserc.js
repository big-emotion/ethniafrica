module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:3000/",
        "http://localhost:3000/fr",
        "http://localhost:3000/fr/noms",
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
      assertions: {
        "categories:performance": ["error", { minScore: 0.85 }],
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 5500 }],
        "total-blocking-time": ["error", { maxNumericValue: 300 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
