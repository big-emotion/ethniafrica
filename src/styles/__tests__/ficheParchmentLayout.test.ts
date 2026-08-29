import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The parchment's layout contract — the half of the template that is not
 * colour.
 *
 * fiche-parchment.css opens by stating what the surface is: "no cards, no
 * shadows. The fiche is one continuous document, and boxing each section
 * would make it read as a dashboard of unrelated widgets". The country fiche
 * obeys that; the people fiche's naming block did not, and shipped two filled,
 * bordered cards whose heights were tied to each other by a stretching grid —
 * one short autonym sat above 300px of empty fill because the exonym list
 * beside it was nine items long.
 *
 * Asserted against the stylesheet rather than a rendered box because the
 * defect is in the declarations themselves: happy-dom resolves no container
 * queries and computes no grid track heights, so a DOM assertion here would
 * pass on the broken layout too.
 */
const parchmentCss = readFileSync(
  resolve(process.cwd(), "src/styles/fiche-parchment.css"),
  "utf8"
);

/** The body of one rule, looked up by its exact selector. */
function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.[\]="^$*+?()|{}\\]/g, "\\$&");
  const match = parchmentCss.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`No rule for selector ${selector}`);
  return match[1];
}

describe("parchment layout — one continuous document", () => {
  // A grid's default `align-items: stretch` is what tied the autonym's height
  // to the exonym list's. The two fields state different amounts and must be
  // free to be different heights.
  // @req REQ-115
  it("lets each naming field take its own height", () => {
    expect(ruleBody(".afh-naming")).toMatch(/align-items:\s*start/);
  });

  // The parchment's own device for setting an aside apart is a rule in the
  // surface's ink — .afh-parchment-callout, "never a box". A naming field that
  // paints a ground is a card, which is the thing this surface does not do.
  // @req REQ-115
  it("sets the naming fields apart with a rule, not a filled card", () => {
    const field = ruleBody(".afh-naming-field");

    expect(field).toMatch(/border-left:/);
    expect(field).not.toMatch(/background/);
  });

  // The imposed names keep the colonial ink they had as a filled block: the
  // distinction between the name borne and the names imposed is the doctrine
  // of the section, and it survives the box being dropped.
  // @req REQ-115
  it("keeps the imposed names on the colonial ink", () => {
    expect(ruleBody('.afh-naming-field[data-role="imposed"]')).toMatch(
      /var\(--afh-color-colonial\)/
    );
  });

  // Charter §2: a component never names an accent, it reads var(--accent).
  // @req REQ-115
  it("takes the borne name's rule from the surface accent", () => {
    expect(ruleBody(".afh-naming-field")).toMatch(/var\(--accent\)/);
  });

  // The section's prose ran the full width of the parchment, which on a
  // desktop fiche is well past 120 characters a line. The callout beside it
  // already caps at 72ch; the running text had no cap at all, so the two read
  // as different documents.
  // @req REQ-115
  it("holds the running prose to a readable measure", () => {
    expect(ruleBody(".afh-parchment-section p")).toMatch(/max-width:\s*72ch/);
  });

  // The confidence chip opens the people fiche above its first section. It was
  // inset with its own Tailwind padding, 20px against the section's 40px, so
  // "voir les sources" sat visibly left of every heading below it.
  // @req REQ-115
  it("gives the confidence line the same gutter as the sections", () => {
    const confidence = ruleBody(".afh-parchment-confidence");
    const section = ruleBody(".afh-parchment-section");

    const gutter = (body: string) =>
      body
        .match(/padding:\s*([^;]+);/)?.[1]
        .trim()
        .split(/\s+/)
        .at(1);

    expect(gutter(confidence)).toBe(gutter(section));
  });
});
