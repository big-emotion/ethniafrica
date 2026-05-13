module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/fr/pays/senegal',
        'http://localhost:3000/fr/peuples/wolof',
      ],
      numberOfRuns: 3,
      settings: {
        // Mobile emulation with 4G throttling
        formFactor: 'mobile',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          uploadThroughputKbps: 750,
          cpuSlowdownMultiplier: 4,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
        },
        throttlingMethod: 'simulate',
        screenEmulation: {
          mobile: true,
          width: 360,
          height: 640,
          deviceScaleFactor: 2.625,
          disabled: false,
        },
        emulatedUserAgent:
          'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
