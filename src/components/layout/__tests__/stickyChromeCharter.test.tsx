import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  HEADER_HEIGHT_PROPERTY,
  HEADER_RETRACTED_ATTRIBUTE,
} from "@/hooks/use-header-reveal";

/**
 * Two surfaces pin themselves to the top of the screen — the masthead and the
 * fiche's chapter rail — and they are written in files that know nothing
 * about each other. What holds them apart is a pair of custom properties, and
 * nothing in a component test can see whether they still agree: happy-dom
 * computes no layout, so a rail sitting squarely behind the masthead passes
 * every behavioural test there is.
 *
 * So this reads the rules back out of the stylesheets, the way
 * navigationCharter.test.tsx does and for the same reason. What it guards is
 * the contract, not the pixels: the masthead publishes a height and a travel,
 * the rail consumes both, and a chapter jumped to clears the pair of them.
 */
const HEADER_SOURCE = join(
  process.cwd(),
  "src/components/layout/SiteHeader.tsx"
);
const CHROME_SHEET = join(process.cwd(), "src/styles/site-chrome.css");
const RAIL_SHEET = join(process.cwd(), "src/styles/fiche-chapter-bar.css");

const read = (path: string) => readFileSync(path, "utf8");

/**
 * The declarations of the first rule whose selector matches, anchored at the
 * start of a line: nearly every selector in these sheets is introduced by a
 * comment, and anchoring on the previous rule's closing brace finds none of
 * them — returning an empty body that reads as "no such rule".
 */
function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`^\\s*${escaped}\\s*\\{([^{}]*)\\}`, "m"));

  expect(match, `no rule found for \`${selector}\``).not.toBeNull();
  return match![1];
}

/** A declaration's value, whitespace collapsed so a wrapped calc still reads. */
function declaration(body: string, property: string): string {
  const match = body.match(new RegExp(`${property}\\s*:([^;]*)`));

  expect(match, `\`${property}\` not declared`).not.toBeNull();
  return match![1].replace(/\s+/g, " ").trim();
}

describe("the masthead and the chapter rail share the top of the screen", () => {
  // @req REQ-114
  it("pins the masthead rather than letting it scroll away", () => {
    const body = ruleBody(read(HEADER_SOURCE), ".sh-header");

    expect(declaration(body, "position")).toBe("sticky");
    expect(declaration(body, "top")).toBe("0");
  });

  // @req REQ-114
  it("retracts the whole masthead, not the bar alone", () => {
    // Its height, so an open axis panel leaves with it instead of being left
    // hanging at the top of the screen.
    const body = ruleBody(
      read(HEADER_SOURCE),
      `:root[${HEADER_RETRACTED_ATTRIBUTE}="true"] .sh-header`
    );

    expect(declaration(body, "transform")).toBe("translateY(-100%)");
  });

  // @req REQ-114
  it("publishes a fallback height for a route that carries no masthead", () => {
    const body = ruleBody(read(CHROME_SHEET), ":root");

    expect(declaration(body, HEADER_HEIGHT_PROPERTY)).toMatch(/^\d+px$/);
    expect(declaration(body, "--afh-header-shift")).toBe("0px");
  });

  // @req REQ-114
  it("turns the masthead's retraction into a travel the rail can follow", () => {
    const body = ruleBody(
      read(CHROME_SHEET),
      `:root[${HEADER_RETRACTED_ATTRIBUTE}="true"]`
    );

    expect(declaration(body, "--afh-header-shift")).toBe(
      `calc(-1 * var(${HEADER_HEIGHT_PROPERTY}))`
    );
  });

  // @req REQ-091
  it("pins the chapter rail under the masthead and moves it with it", () => {
    const body = ruleBody(read(RAIL_SHEET), ".afh-chapter-bar");

    expect(declaration(body, "top")).toBe(
      `calc(var(${HEADER_HEIGHT_PROPERTY}) + var(--afh-header-shift))`
    );
  });

  // @req REQ-091
  it("carries the rail's travel in its pinned offset, never in a transform", () => {
    // A transform applies whether or not the rail is pinned. Carrying the
    // masthead's travel there lifted the rail a masthead's height above its
    // place in the flow for as long as the masthead was retracted — which, on
    // a fiche, is squarely over the foot of the globe band and its controls.
    // A sticky `top` bites only once the rail is actually pinned, which is
    // the only moment the travel was ever meant to describe.
    const body = ruleBody(read(RAIL_SHEET), ".afh-chapter-bar");

    expect(body).not.toMatch(/^\s*transform\s*:/m);
  });

  // @req REQ-091
  it("keeps the rail below the masthead in the stack, so the masthead covers it", () => {
    const rail = Number(
      declaration(ruleBody(read(RAIL_SHEET), ".afh-chapter-bar"), "z-index")
    );
    const masthead = Number(
      declaration(ruleBody(read(HEADER_SOURCE), ".sh-header"), "z-index")
    );

    expect(rail).toBeLessThan(masthead);
  });

  // @req REQ-091
  it("clears both bands when a chapter is scrolled to", () => {
    // Both, in every state: a jump up the document is itself an upward
    // scroll, so the masthead is on its way back in while the chapter is
    // still travelling. Reserving only what is on screen lands the chapter
    // underneath it.
    const body = ruleBody(read(RAIL_SHEET), "[data-fiche-section]");
    const offset = declaration(body, "scroll-margin-top");

    expect(offset).toContain(`var(${HEADER_HEIGHT_PROPERTY})`);
    expect(offset).toContain("var(--afh-chapter-bar-height)");
  });
});
