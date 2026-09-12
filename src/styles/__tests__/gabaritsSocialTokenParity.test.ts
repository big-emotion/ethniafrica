import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The social render engine draws with the same palette the site renders with,
 * and it reads that palette from its own copy under
 * `docs/design/gabarits-social/tokens/`.
 *
 * The copy exists because the engine is Python and cannot import a stylesheet
 * the way a component does. It was kept in step by hand, across two
 * repositories, and the only thing standing between the two was somebody
 * remembering. Both files are now versioned together, so the check is possible
 * at all — and the failure it prevents is specific: a colour corrected on the
 * site and not in the copy makes every card rendered afterwards disagree with
 * the page it advertises, with nothing red anywhere.
 *
 * Tokens present on one side only are allowed. The engine carries a handful the
 * site has no use for, and the site carries surfaces the engine never draws.
 * What is forbidden is one name with two values.
 */

const REPO = join(import.meta.dirname, "../../..");

type Tokens = Map<string, string>;

/** Declarations at the start of a line — nested shorthand is not a token. */
function declarations(path: string): Tokens {
  const tokens: Tokens = new Map();
  for (const line of readFileSync(join(REPO, path), "utf8").split("\n")) {
    const match = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/i);
    // First definition wins: a token redefined under a theme block carries the
    // dark value, and comparing that against the light one would fail for a
    // reason that is not drift.
    if (match && !tokens.has(match[1])) tokens.set(match[1], match[2].trim());
  }
  return tokens;
}

function shared(engine: Tokens, site: Tokens): string[] {
  return [...engine.keys()].filter((name) => site.has(name)).sort();
}

/**
 * A font stack the site opens with the Next font-loader's own variable, and the
 * engine cannot.
 *
 * `--afh-font-display` reads `var(--font-fraunces), "Fraunces", Georgia, serif`
 * on the site: the loader publishes a hashed family name at build time and the
 * literal is the fallback. Python rasterises from the `.ttf` files it ships, so
 * the loader variable would resolve to nothing and the engine would silently
 * drop to Georgia.
 *
 * Dropping those leading entries before comparing keeps the real assertion —
 * that both sides name the same families in the same order — instead of
 * exempting font tokens wholesale, which would also hide a genuine swap.
 */
function withoutLoaderFamilies(value: string): string {
  return value
    .split(",")
    .map((family) => family.trim())
    .filter((family) => !/^var\(--font-[a-z0-9-]+\)$/i.test(family))
    .join(", ");
}

function divergences(engine: Tokens, site: Tokens): string[] {
  return shared(engine, site)
    .filter(
      (name) =>
        withoutLoaderFamilies(engine.get(name)!) !==
        withoutLoaderFamilies(site.get(name)!)
    )
    .map(
      (name) => `${name}: moteur ${engine.get(name)} ≠ site ${site.get(name)}`
    );
}

describe("gabarits-social tokens against the design system", () => {
  // @req REQ-032
  it("gives every shared colour the same value on both sides", () => {
    const engine = declarations(
      "docs/design/gabarits-social/tokens/colors.css"
    );
    const site = declarations("src/styles/tokens/color.css");
    const names = shared(engine, site);

    // A floor, not a count — see the type assertion below.
    expect(names.length).toBeGreaterThan(100);
    expect(divergences(engine, site)).toEqual([]);
  });

  // @req REQ-032
  it("gives every shared type value the same definition on both sides", () => {
    const engine = declarations(
      "docs/design/gabarits-social/tokens/typography.css"
    );
    const site = declarations("src/styles/tokens/type.css");
    const names = shared(engine, site);

    // A floor, not a count. It fails a parser that has stopped matching; it
    // does not fail the day somebody adds or retires a token.
    expect(names.length).toBeGreaterThan(30);
    expect(divergences(engine, site)).toEqual([]);
  });

  // @req REQ-032
  it("reads the two faces the engine actually rasterises", () => {
    // Not a parity assertion: a guard that the parser above is reading
    // something. A regex that matched nothing would make both tests above pass
    // on two empty maps, which is the shape of green this project has been
    // burned by before.
    const engine = declarations(
      "docs/design/gabarits-social/tokens/typography.css"
    );

    expect(engine.get("--afh-font-social")).toMatch(/Anton/);
    expect(engine.get("--afh-font-body")).toMatch(/Nunito Sans/);
  });
});
