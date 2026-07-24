/**
 * ETNI-21 — Tiny ESLint plugin wrapper that exposes Africa History
 * design-system lint rules under the `afh/` namespace.
 *
 * Currently published rules:
 *   - `afh/afh-error-misuse`       — UX-DR49 rule 3
 *   - `afh/no-bare-people-name`    — UX-DR49 rule 1 (decolonial posture)
 */

"use strict";

const afhErrorMisuse = require("../rules/afh-error-misuse.js");
const noBarePeopleName = require("../rules/no-bare-people-name.js");

module.exports = {
  rules: {
    "afh-error-misuse": afhErrorMisuse,
    "no-bare-people-name": noBarePeopleName,
  },
};
