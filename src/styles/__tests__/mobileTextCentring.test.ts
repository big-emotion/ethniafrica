import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * On a phone the atlas centres its text.
 *
 * The decision is editorial, not technical: below the tablet breakpoint the
 * measure is narrow enough that a centred column reads as a deliberate
 * composition rather than as a ragged block pushed against the left edge.
 * It is a whole-site rule, so it is declared once on `body` and inherited,
 * never re-stated per surface.
 *
 * Inheritance is the fragile half of that: a single `text-align: left`
 * inside a phone-width media query silently exempts a surface, which is
 * exactly how the home band came to disagree with the rest of the site. The
 * sweep below is what keeps a re-introduction of that pattern visible.
 *
 * Two families of element keep their own alignment, because centring them
 * breaks a function rather than a look — see mobile-text.css for the why.
 */
const STYLESHEET_PATH = join(process.cwd(), "src/styles/mobile-text.css");
const INDEX_PATH = join(process.cwd(), "src/index.css");

const stylesheet = () => readFileSync(STYLESHEET_PATH, "utf8");

/** The tablet floor: mobile is everything below it (`md` in Tailwind). */
const MOBILE_CEILING_PX = 767;

const SWEPT_ROOTS = ["src/app", "src/components", "src/styles"];

const SWEPT_EXTENSIONS = [".css", ".ts", ".tsx"];

/**
 * The stylesheet that declares the rule is naturally full of the very
 * pattern this sweeps for — it is where the two documented exemptions live.
 */
const EXEMPT_FROM_SWEEP = ["src/styles/mobile-text.css"];

function* walk(root: string): Generator<string> {
  for (const entry of readdirSync(join(process.cwd(), root))) {
    const relative = `${root}/${entry}`;
    if (statSync(join(process.cwd(), relative)).isDirectory()) {
      if (entry === "__tests__" || entry === "node_modules") continue;
      yield* walk(relative);
      continue;
    }
    if (SWEPT_EXTENSIONS.some((extension) => entry.endsWith(extension))) {
      yield relative;
    }
  }
}

/**
 * Every `@media` block in `text` whose condition caps the viewport at or
 * below the tablet floor, returned with its body. Brace-counting rather
 * than a regex: a media block holds nested rules, and `[^}]*` stops at the
 * first inner rule's closing brace, which is how a sweep like this reports
 * green over a file it never actually read past line one.
 */
function mobileMediaBlocks(text: string): string[] {
  const blocks: string[] = [];
  const opener = /@media[^{]*\(\s*max-width:\s*(\d+(?:\.\d+)?)px\s*\)[^{]*\{/g;

  for (const match of text.matchAll(opener)) {
    if (Number(match[1]) > MOBILE_CEILING_PX) continue;

    let depth = 1;
    let cursor = match.index + match[0].length;
    const start = cursor;

    while (cursor < text.length && depth > 0) {
      if (text[cursor] === "{") depth += 1;
      else if (text[cursor] === "}") depth -= 1;
      cursor += 1;
    }

    blocks.push(text.slice(start, cursor - 1));
  }

  return blocks;
}

describe("the phone centres the atlas' text", () => {
  // @req REQ-091
  it("declares the rule once, on the document body", () => {
    const text = stylesheet();
    const [firstMobileBlock] = mobileMediaBlocks(text);

    expect(firstMobileBlock).toBeDefined();
    expect(firstMobileBlock).toMatch(/body\s*\{[^}]*text-align:\s*center/);
  });

  // A stylesheet nothing imports is a stylesheet nothing applies.
  // @req REQ-091
  it("ships the rule to every page through the root stylesheet", () => {
    expect(readFileSync(INDEX_PATH, "utf8")).toContain(
      "./styles/mobile-text.css"
    );
  });

  // A caret that jumps to the middle of a field as you type, and a column
  // header that no longer sits over its own values, are both broken rather
  // than merely differently aligned.
  // @req REQ-091
  it("leaves form fields and data tables on their own alignment", () => {
    const [firstMobileBlock] = mobileMediaBlocks(stylesheet());

    expect(firstMobileBlock).toMatch(
      /input[^{]*textarea[^{]*select[^{]*\{[^}]*text-align:\s*left/
    );
    expect(firstMobileBlock).toMatch(/table[^{]*\{[^}]*text-align:\s*left/);
  });

  // @req REQ-091
  it("is contradicted by no surface of the site", () => {
    const offenders: string[] = [];

    for (const root of SWEPT_ROOTS) {
      for (const file of walk(root)) {
        if (EXEMPT_FROM_SWEEP.includes(file)) continue;

        const contradicts = mobileMediaBlocks(
          readFileSync(join(process.cwd(), file), "utf8")
        ).some((block) => /text-align:\s*(left|start|justify)/.test(block));

        if (contradicts) offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });
});
