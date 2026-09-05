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

/**
 * The country fiche's chapô styles itself in the component, so the measure it
 * carries is declared there rather than in the stylesheet.
 */
const countryBriefSource = readFileSync(
  resolve(process.cwd(), "src/components/fiche/CountrySynthesisBrief.tsx"),
  "utf8"
);

/**
 * The people fiche's body paragraphs are not `.afh-parchment-section p` — they
 * are ProseWithChip's own class, declared in the people surface's token file.
 * Same parchment, same chapter, a second stylesheet.
 */
const peopleTokensSource = readFileSync(
  resolve(process.cwd(), "src/styles/people-tokens.css"),
  "utf8"
);

/** The body of one rule, looked up by its exact selector. */
function ruleBodyIn(source: string, selector: string): string {
  const escaped = selector.replace(/[.[\]="^$*+?()|{}\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`No rule for selector ${selector}`);
  return match[1];
}

function ruleBody(selector: string): string {
  return ruleBodyIn(parchmentCss, selector);
}

describe("parchment layout — one continuous document", () => {
  // A patronyme is one corpus token, so `text-wrap` cannot help at 320px.
  // Without an emergency wrap, Randriamampionona widens the whole document.
  // @req REQ-147
  it("keeps a long name inside the fiche head on narrow screens", () => {
    expect(ruleBody(".afh-parchment-head h1")).toMatch(
      /overflow-wrap:\s*anywhere/
    );
  });

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

  // The imposed names keep the colonial tone they had as a filled block: the
  // distinction between the name borne and the names imposed is the doctrine
  // of the section, and it survives the box being dropped. Through the ink
  // alias, because the block no longer paints a pale tint that would have
  // carried the day tone into night with it.
  // @req REQ-115
  it("keeps the imposed names on the colonial ink", () => {
    expect(ruleBody('.afh-naming-field[data-role="imposed"]')).toMatch(
      /var\(--afh-colonial-ink\)/
    );
  });

  // Charter §2: a component never names an accent, it reads var(--accent).
  // @req REQ-115
  it("takes the borne name's rule from the surface accent", () => {
    expect(ruleBody(".afh-naming-field")).toMatch(/var\(--accent\)/);
  });

  // The prose was held to 72ch while the chapter around it ran the full
  // parchment, so a desktop fiche read as a narrow column against an empty
  // right half — every paragraph stopped mid-page, in the middle of nothing.
  // The chapter's figures, rankings and tables already take the whole width;
  // the prose takes it too, and the parchment is the only thing that decides
  // where a line ends.
  // @req REQ-115
  it("lets the running prose fill the parchment", () => {
    expect(ruleBody(".afh-parchment-section p")).not.toMatch(/max-width/);
  });

  // The callout is an aside inside that same chapter. Left capped while the
  // prose around it is not, it becomes the one paragraph on the page that
  // stops short — the mismatch the cap once fixed, inverted.
  // @req REQ-115
  it("lets the callout fill the parchment", () => {
    expect(ruleBody(".afh-parchment-callout")).not.toMatch(/max-width/);
  });

  // The country chapô is prose on the same parchment, and a reader has no way
  // of knowing it is styled in another file.
  // @req REQ-115
  it("lets the country chapô fill its block", () => {
    expect(ruleBodyIn(countryBriefSource, ".fiche-brief-summary")).not.toMatch(
      /max-width/
    );
  });

  // The people fiche escaped the fix its own parchment received: its chapters
  // render ProseWithChip, whose class lives in people-tokens.css and kept the
  // 65ch cap. So "Culture & spiritualité" broke off at three-fifths of the
  // parchment while the stat cards in the chapter above it ran to both edges —
  // the same defect as `.afh-parchment-section p`, one stylesheet over.
  // @req REQ-115
  it("lets the people fiche's prose fill the parchment", () => {
    expect(ruleBodyIn(peopleTokensSource, ".people-section-body")).not.toMatch(
      /max-width/
    );
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
