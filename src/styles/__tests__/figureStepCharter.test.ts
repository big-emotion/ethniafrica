import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The counted figure of a fiche's summary card carried its size as a pixel
 * literal, written twice: once for the measured state, once for the state
 * where the corpus fills nothing. Naming it is not a new need. It is one
 * device drawn by two records, and two surfaces holding one size through two
 * literals is exactly how the two drift apart.
 *
 * The step stays out of the `--afh-text-*` namespace on purpose. That
 * namespace is the nine-role text scale and `typeScaleCharter` holds it to
 * exactly nine roles, so a tenth entry there fails the build. It would also
 * be a category error: these tokens size a number, not a class of text.
 */
const STYLES = join(__dirname, "..");
const TYPE_CSS = readFileSync(join(STYLES, "tokens", "type.css"), "utf8");
const PARCHMENT_CSS = readFileSync(
  join(STYLES, "fiche-parchment.css"),
  "utf8"
);

const LEAD_TOKEN = "--afh-figure-lead";
const GAP_TOKEN = "--afh-figure-gap";

/** The declaration block of the rule whose selector starts a line. */
function ruleBody(css: string, selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  expect(start, `selector not found: ${selector}`).toBeGreaterThan(-1);
  const open = css.indexOf("{", start);
  return css.slice(open + 1, css.indexOf("}", open));
}

describe("figure step charter — the counted figure has a name", () => {
  // @req REQ-091
  it("declares a lead step and a gap step", () => {
    expect(TYPE_CSS).toMatch(new RegExp(`${LEAD_TOKEN}:\\s*[^;]+;`));
    expect(TYPE_CSS).toMatch(new RegExp(`${GAP_TOKEN}:\\s*[^;]+;`));
  });

  // @req REQ-091
  it("keeps both steps out of the nine-role text namespace", () => {
    for (const token of [LEAD_TOKEN, GAP_TOKEN]) {
      expect(token).not.toMatch(/^--afh-text-/);
    }
  });

  // An absence must not shout louder than a measurement.
  // @req REQ-091
  it("sizes the gap step below the lead step", () => {
    const lead = TYPE_CSS.match(new RegExp(`${LEAD_TOKEN}:\\s*([^;]+);`))?.[1];
    const gap = TYPE_CSS.match(new RegExp(`${GAP_TOKEN}:\\s*([^;]+);`))?.[1];
    const floor = (value: string) =>
      Number(value.match(/([\d.]+)rem/)?.[1] ?? NaN);
    expect(floor(gap)).toBeLessThan(floor(lead));
  });
});

describe("figure step charter — the summary card reads the token", () => {
  // @req REQ-091
  it("sizes the measured figure from the lead step", () => {
    expect(ruleBody(PARCHMENT_CSS, ".afh-stat-card-n")).toMatch(
      new RegExp(`font-size:\\s*var\\(${LEAD_TOKEN}\\);`)
    );
  });

  // @req REQ-091
  it("sizes the figure of an unfilled card from the gap step", () => {
    const selector =
      '.afh-stat-card[data-provenance="missing"] .afh-stat-card-n';
    expect(ruleBody(PARCHMENT_CSS, selector)).toMatch(
      new RegExp(`font-size:\\s*var\\(${GAP_TOKEN}\\);`)
    );
  });

  // @req REQ-091
  it("leaves no pixel literal sizing a figure on this surface", () => {
    for (const selector of [
      ".afh-stat-card-n",
      '.afh-stat-card[data-provenance="missing"] .afh-stat-card-n',
    ]) {
      expect(ruleBody(PARCHMENT_CSS, selector)).not.toMatch(
        /font-size:\s*[\d.]+px/
      );
    }
  });
});
