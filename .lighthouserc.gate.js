// The Lighthouse check a pull request into `recette` can be required to pass.
//
// The nightly matrix (`.lighthouserc.js`) measures 29 URLs three times in
// ~16 minutes, and its performance numbers move with the runner. A required
// check has to be short and has to fail only on something the pull request
// did, so this one asserts the two categories a GPU-less, throttled runner
// cannot distort — accessibility and best practices — as errors, on four
// routes that cover the home, both globe fiches and the search page. The
// performance metrics are still collected and printed as warnings, so a
// regression is visible on the pull request without making it unmergeable on
// runner noise; the nightly matrix is where performance blocks.
//
// One run per URL: accessibility and best-practices audits read the DOM and
// the console, not timings, so a median of three would buy nothing but time.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- the lhci CLI loads this file as CommonJS, like the config it borrows from
const nightly = require("./.lighthouserc.js").ci;

module.exports = {
  ci: {
    collect: {
      ...nightly.collect,
      url: [
        "http://localhost:3000/fr",
        "http://localhost:3000/fr/atlas/pays/SEN",
        "http://localhost:3000/fr/atlas/peuples/PPL_WOLOF",
        "http://localhost:3000/fr/atlas/recherche",
      ],
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:performance": ["warn", { minScore: 0.85 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 5500 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],
      },
    },
    upload: nightly.upload,
  },
};
