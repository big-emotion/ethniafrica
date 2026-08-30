import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * Brand charter §8.1 — alignment is a property of a block, not of a viewport.
 *
 * The phone keeps its composed-page default on headings: at ~40 characters a
 * centred title reads as composition rather than as a column that ran out of
 * room, and that argument is sound. It does not survive a paragraph. Measured
 * at 430px before this rule: 29 centred paragraphs on one people fiche, the
 * longest 21 lines, 12 on the home and 9 on the search page.
 *
 * It is also what made cards look broken with no rule disagreeing. Alignment
 * only shows on a box wider than its text, so inside one listing card the
 * full-width gloss centred while the shrink-to-fit heading and metadata stayed
 * at the left edge. Nothing declared three alignments; one declaration
 * produced three, which is worse — there was nothing to grep for.
 */
const CSS = readFileSync(join(__dirname, "..", "mobile-text.css"), "utf8");

/** The phone block — everything the max-width rule governs. */
function phoneBlock(): string {
  const start = CSS.indexOf("@media (max-width: 767px)");
  expect(start).toBeGreaterThan(-1);
  return CSS.slice(start);
}

describe("mobile text charter (§8.1)", () => {
  // @req REQ-115
  it("keeps the composed-page default on the body", () => {
    expect(phoneBlock()).toMatch(/body\s*\{\s*text-align:\s*center/);
  });

  // The selector list is asserted whole rather than element by element,
  // because the defect this rule fixed was a pair being split: `dt` travels
  // with `dd`, not with the headings. Leaving it behind put « Population » in
  // the middle of the search card and « 48 482 000 » under it at the left.
  // @req REQ-115
  it("never centres running prose, and keeps a definition pair on one edge", () => {
    const block = phoneBlock();
    const proseRule = block.match(
      /(^|\n)\s*p,\s*\n\s*blockquote,\s*\n\s*dt,\s*\n\s*dd\s*\{\s*text-align:\s*left/
    );

    expect(proseRule).not.toBeNull();
  });

  // @req REQ-115
  it("leaves an explicit centring choice alone", () => {
    // Only the body-level default is overridden. A block that asked for
    // centring in its own right made a decision, not an inheritance.
    expect(phoneBlock()).toMatch(
      /\.text-center p,[\s\S]{0,80}\{\s*text-align:\s*inherit/
    );
  });

  // @req REQ-115
  it("offers one named way back to centred prose", () => {
    expect(phoneBlock()).toMatch(
      /\.afh-phone-centred[\s\S]{0,120}\{\s*text-align:\s*center/
    );
  });
});
