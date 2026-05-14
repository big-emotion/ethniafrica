/**
 * ETNI-21 — Tiny ESLint plugin wrapper that exposes Africa History
 * design-system lint rules under the `afh/` namespace.
 *
 * Currently published rules:
 *   - `afh/afh-error-misuse` — UX-DR49 rule 3
 */

"use strict";

const afhErrorMisuse = require("../rules/afh-error-misuse.js");

module.exports = {
  rules: {
    "afh-error-misuse": afhErrorMisuse,
  },
};
