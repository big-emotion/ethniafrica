module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:3000/",
        "http://localhost:3000/fr",
        "http://localhost:3000/fr/pays/SEN",
        "http://localhost:3000/fr/peuples/PPL_WOLOF",
        "http://localhost:3000/fr/noms",
        // ETNI-463 (7.11) AC1 — large-family sample (FLG_BANTU: 6 languages,
        // 174 associated peoples, the largest currently-seeded family).
        "http://localhost:3000/fr/familles/FLG_BANTU",
      ],
      numberOfRuns: 3,
      // Audit returning-user performance with essential-only consent. The
      // live axe run still exercises the consent banner for new visitors.
      puppeteerScript: "./scripts/lighthouse-setup.cjs",
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
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
