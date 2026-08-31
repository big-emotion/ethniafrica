import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * `src/styles/home-tokens.css` is a holding pen, not a scale — the charter
 * says so in §6 rule 3 and §7. This suite holds it to the two properties that
 * make it a legitimate exception rather than debt in a nicer wrapper.
 *
 * The failure it exists to prevent is silent: a component reading
 * `var(--home-text-typo)` that no one declares renders at the browser default,
 * which no unit test in happy-dom can see and no snapshot records.
 */

const HOME_TOKENS_PATH = resolve(process.cwd(), "src/styles/home-tokens.css");
const HOME_DIR = resolve(process.cwd(), "src/components/home");

function homeTokensCss(): string {
  return readFileSync(HOME_TOKENS_PATH, "utf8");
}

function homeComponentSources(): { file: string; source: string }[] {
  return readdirSync(HOME_DIR)
    .filter((name) => name.endsWith(".tsx") && !name.includes(".stories."))
    .map((name) => ({
      file: name,
      source: readFileSync(join(HOME_DIR, name), "utf8"),
    }));
}

function declaredTokens(css: string): Set<string> {
  return new Set(
    [...css.matchAll(/(--home-text-[a-z0-9-]+)\s*:/g)].map((m) => m[1])
  );
}

describe("home type tokens (typography charter §6 rule 3)", () => {
  // @req REQ-091
  it("declares every --home-text-* token a component reads", () => {
    const declared = declaredTokens(homeTokensCss());

    for (const { file, source } of homeComponentSources()) {
      const read = [...source.matchAll(/var\((--home-text-[a-z0-9-]+)\)/g)].map(
        (m) => m[1]
      );
      for (const token of read) {
        expect(declared, `${file} reads ${token}`).toContain(token);
      }
    }
  });

  // The point of the extraction: the sizes are countable and in one file.
  // A token declared here that nothing reads is dead weight the next reader
  // would have to prove dead before removing.
  // @req REQ-091
  it("has a reader for every token it declares", () => {
    const sources = homeComponentSources()
      .map(({ source }) => source)
      .join("\n");

    for (const token of declaredTokens(homeTokensCss())) {
      expect(sources, `${token} is declared but never read`).toContain(
        `var(${token})`
      );
    }
  });

  // The whole value of temps A is that no component keeps a literal. One left
  // behind and the ratchet has a hole in exactly the surface it was opened for.
  // @req REQ-091
  it("leaves no literal font size in any home component", () => {
    for (const { file, source } of homeComponentSources()) {
      const literals = [...source.matchAll(/font-size:\s*([^;]+);/g)]
        .map(([, value]) => value.trim())
        // `font-size: 0` on .access-axis-cta hides a text node; it is a layout
        // trick with no unit, not a size.
        .filter((value) => /\d*\.?\d+(px|rem|em|pt)\b/.test(value));

      expect(literals, `${file}`).toEqual([]);
      expect(source, `${file}`).not.toMatch(/text-\[\d[\d.]*(px|rem|em)\]/);
    }
  });

  // It must not quietly become a second scale. Every value here is one a
  // designer still has to rule on, so the file states them as literals — the
  // day one of them forwards to --afh-text-* it belongs in the scale, not here.
  // @req REQ-091
  it("names each token at a literal value, awaiting the design call", () => {
    const css = homeTokensCss();
    const declarations = [
      ...css.matchAll(/--home-text-[a-z0-9-]+:\s*([^;]+);/g),
    ].map(([, value]) => value.trim());

    expect(declarations.length).toBeGreaterThan(0);
    for (const value of declarations) {
      expect(value).not.toMatch(/var\(--afh-text-/);
    }
  });
});
