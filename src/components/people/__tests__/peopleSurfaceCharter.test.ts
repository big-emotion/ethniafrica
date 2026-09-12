import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * What the people record's surface owes, asserted against its sources
 * rather than against a rendered page.
 *
 * The rendered page cannot answer these: happy-dom loads no stylesheet, so a
 * computed `font-family` or `background` there is empty string, and a test
 * reading it passes while asserting nothing. Every rule below is therefore a
 * sweep over the files that would break it, in the shape
 * `mobileTextCentring.test.ts` already uses for the site-wide alignment rule.
 */
const COMPONENTS = join(__dirname, "..");
const SRC = join(__dirname, "..", "..", "..");

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === "__tests__") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && !/\.stories\./.test(entry)) yield full;
  }
}

function peopleSources(): { file: string; text: string }[] {
  return [...walk(COMPONENTS)].map((file) => ({
    file: file.slice(SRC.length + 1),
    text: readFileSync(file, "utf8"),
  }));
}

/**
 * The atlas charter gives each surface one accent. The people record's is the
 * ocre, and the page posts it once so a component never has to know which
 * hue it is.
 *
 * The failure this prevents was live: the distribution bars wore
 * `--country-terracotta`, read straight from a component, so the people
 * record had no accent of its own and silently borrowed the country
 * surface's. Nothing disagreed, because nothing had said what the accent was.
 *
 * Only the hue-bearing tokens are swept. `people-tokens.css` says in its own
 * comment that this surface reuses the country sheet's **neutrals**, and that
 * is a decision rather than a leak: an ink, a border and a radius carry no
 * surface identity, and renaming forty of them would move no pixel and teach
 * no reader anything. An accent does carry identity, which is the whole
 * reason the charter scopes one per surface.
 */
const FOREIGN_ACCENT_TOKEN =
  /var\(\s*--country-(?:terracotta|gold|green|earth|colonial|amber|azure|sage|clay|demo-[a-z0-9]+)(?:-bg|-ink)?\s*\)/g;

/** A colour written out, in any of the three shapes a component reaches for. */
const COLOUR_LITERAL =
  /(?:background|color|border-color)\s*:\s*["'`]?\s*(?:#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\()/g;

describe("people surface charter", () => {
  // @req REQ-155
  it("wears no other surface's accent", () => {
    const offenders = peopleSources()
      .map(({ file, text }) => ({
        file,
        hits: [...text.matchAll(FOREIGN_ACCENT_TOKEN)].map((m) => m[0]),
      }))
      .filter(({ hits }) => hits.length > 0);

    expect(offenders).toEqual([]);
  });

  // @req REQ-155
  it("writes no colour out by hand", () => {
    const offenders = peopleSources()
      .map(({ file, text }) => ({
        file,
        hits: [...text.matchAll(COLOUR_LITERAL)].map((m) => m[0]),
      }))
      .filter(({ hits }) => hits.length > 0);

    expect(offenders).toEqual([]);
  });

  /**
   * `demography.source` is a research note, not a citation. On the Abahutu
   * record it runs several lines and names Wikipedia twice, which the source
   * policy does not accept as a source at all. It reached the reader verbatim
   * at the foot of the distribution chapter.
   *
   * The reader is owed the provenance the atlas can stand behind, which the
   * sources chapter already carries.
   */
  // @req REQ-155
  it("never prints the demography research note to the reader", () => {
    const offenders = peopleSources()
      .filter(({ text }) => /\$\{[^}]*\bdata\.source\b[^}]*\}/.test(text))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  /**
   * Two formatters ran on one page: the summary panel counted through
   * `Intl.NumberFormat` and the rows through a hand-rolled abbreviator that
   * took no language and hardcoded Latin suffixes. French readers were shown
   * `12.2M`, with a decimal point, beside a correctly spaced `10 500 000`.
   */
  // @req REQ-155
  it("formats a population against a locale, never against a hardcoded suffix", () => {
    const transformer = readFileSync(
      join(SRC, "lib", "peopleDataTransformer.ts"),
      "utf8"
    );
    const signature = transformer.match(
      /function formatPeoplePopulation\s*\(([^)]*)\)/
    );

    expect(signature).not.toBeNull();
    expect(signature![1]).toMatch(/language/);
  });

  /**
   * The record opens on the name the people give themselves, with the
   * imposed name beneath it. The head passed `nameMain` as the autonym and
   * threaded no exonym at all, so the pairing the surface is built around
   * could not appear on the very heading that introduces it.
   */
  // @req REQ-155
  it("threads both names through the record's own heading", () => {
    const head = readFileSync(join(COMPONENTS, "PeopleFicheHead.tsx"), "utf8");
    const heading = head.slice(head.indexOf("<AutonymExonymHeading"));

    expect(heading).toMatch(/autonym=/);
    expect(heading).toMatch(/exonym=/);
  });
});
