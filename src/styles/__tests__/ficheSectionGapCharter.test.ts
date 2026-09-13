import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const stylesheet = readFileSync(
  join(process.cwd(), "src/styles/fiche-parchment.css"),
  "utf8"
);

/**
 * The body of the first top-level rule for exactly this selector. Anchored to
 * the start of a line so `.afh-parchment` never matches `.afh-parchment-head`,
 * and so the indented copies inside a container query are not read as the
 * base rule.
 */
function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.[\]="^$*+?()|{}\\]/g, "\\$&");
  const match = stylesheet.match(
    new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`)
  );
  if (!match) throw new Error(`No top-level rule for ${selector}`);
  return match[1];
}

/**
 * One ground, one gap, one width (operator ruling, 2026-09-12).
 *
 * The chapters used to alternate between two grounds with a hairline under
 * each, and the gap between them was a margin on the second sibling — so
 * anything that was not a section (the amend band, the country's summary)
 * fell out of the rhythm and measured 0, 22 or 24px. The gap is now the flex
 * container's, which cannot skip a child.
 */
describe("REQ-152 fiche chapter rhythm", () => {
  // @req REQ-152
  test("the parchment separates its children with the section-gap token and nothing else", () => {
    const parchment = ruleBody(".afh-parchment");
    expect(parchment).toMatch(/display:\s*flex/);
    expect(parchment).toMatch(/gap:\s*var\(--afh-section-gap\)/);
    expect(stylesheet).not.toMatch(
      /margin-block-start:\s*var\(--afh-section-gap\)/
    );
  });

  // @req REQ-152
  test("every chapter sits on one rounded ground at one padding", () => {
    const section = ruleBody(".afh-parchment-section");
    expect(section).toMatch(/background:\s*var\(--afh-bg-warm\)/);
    expect(section).toMatch(/border-radius:\s*var\(--afh-radius-lg\)/);
    expect(section).toMatch(/padding:\s*24px 16px;/);
    expect(section).not.toMatch(/border-bottom/);
    expect(stylesheet).toMatch(
      /\.afh-parchment-section\s*\{[^}]*padding:\s*32px 24px;/
    );
    expect(stylesheet).not.toMatch(/\.afh-parchment-section:nth-of-type/);
  });

  // @req REQ-152
  test("the amend band takes the chapter's width instead of its own margins", () => {
    expect(ruleBody(".afh-amend-band")).not.toMatch(/margin/);
    expect(stylesheet).not.toMatch(/\.afh-amend-band\s*\{[^}]*margin-inline:/);
  });
});
