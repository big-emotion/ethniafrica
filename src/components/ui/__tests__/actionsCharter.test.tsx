import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The actions charter's source-level contract
 * (docs/design/actions-charter.md).
 *
 * The charter exists because twenty spellings of one promise grew, one
 * component at a time, with nothing to notice. These assertions are what
 * notices. They read the source rather than render, for the same reason
 * charterPrimitives.test.tsx does: the offences are things a component
 * *writes*, and a rendered tree cannot show a rule that no test route
 * happens to mount.
 */

const COMPONENTS_DIR = join(process.cwd(), "src/components");
const SKIPPED_DIRS = new Set(["__tests__", "known-failing"]);

function componentFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIPPED_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".tsx") && !entry.name.includes(".stories."))
        out.push(full);
    }
  };
  walk(COMPONENTS_DIR);
  return out;
}

const FILES = componentFiles();
const rel = (file: string) => relative(process.cwd(), file);

/**
 * An arrow is an affordance when it closes a control, and content when more
 * content follows it. `ImposedNameList` sets « endonym → imposed name » and
 * the sort pickers offer « A → Z »; neither promises a click.
 *
 * The three spellings are the ones the audit actually found: the arrow alone
 * on its line, an aria-hidden span opening onto it, and a label with the
 * arrow glued to its end.
 */
const ARROW = /^\s*→\s*$|aria-hidden="true"[^>]*>\s*→|\S\s*→\s*$/;
const CLOSES_CONTROL = /<\/(?:a|Link|button|Button)>/;
const OPENS_ELEMENT = /<[A-Za-z]/;

function hasArrowAffordance(source: string): boolean {
  const lines = source.split("\n");
  return lines.some((line, index) => {
    if (!ARROW.test(line)) return false;
    for (const after of lines.slice(index + 1, index + 12)) {
      if (CLOSES_CONTROL.test(after)) return true;
      if (OPENS_ELEMENT.test(after)) return false;
    }
    return false;
  });
}

describe("actions charter — source contract", () => {
  /**
   * §2. The arrow is ActionLink's and nobody else's. It used to be spelled
   * eight ways, and each spelling carried its own hover behaviour.
   *
   * `AccessAxes` is the charter's own exception (§2): the axis card is
   * itself the link, so its verb cannot be a second one. It wears form A's
   * dress inside a span, and draws the arrow itself.
   */
  // @req REQ-091
  it("draws the action arrow only in ActionLink", () => {
    const CARD_IS_THE_LINK = ["src/components/home/AccessAxes.tsx"];

    const offenders = FILES.filter(
      (file) =>
        !file.endsWith("ActionLink.tsx") &&
        hasArrowAffordance(readFileSync(file, "utf8"))
    )
      .map(rel)
      .filter((file) => !CARD_IS_THE_LINK.includes(file));

    expect(offenders).toEqual([]);
  });

  /**
   * The detector has to be live, not merely green: a gate that matches
   * nothing reports OK forever while checking nothing, and this repo has
   * shipped one of those before.
   *
   * The fixtures are the shapes the charter actually replaced, quoted from
   * the components as they stood before it — and the last one is the arrow
   * that must stay legal, because it sits between two names rather than at
   * the end of a link.
   */
  // @req REQ-091
  it("tells an affordance from a glyph that happens to be an arrow", () => {
    const spanWithLeadingSpace = `
        <Link className="home-purpose-cta" href={href}>
          {label}
          <span aria-hidden="true"> →</span>
        </Link>`;
    const arrowOnItsOwnLine = `
        <a href={href}>
          Lire la fiche
          <span aria-hidden="true">
            →
          </span>
        </a>`;
    const arrowGluedToTheLabel = `
        <a href={href} style={LINK_STYLE}>
          Lire la fiche complète →
        </a>`;
    const relationGlyph = `
        <span aria-hidden="true" className="text-afh-text-soft">
          →
        </span>
        <span className="font-afh">{item.imposedName}</span>`;

    expect(hasArrowAffordance(spanWithLeadingSpace)).toBe(true);
    expect(hasArrowAffordance(arrowOnItsOwnLine)).toBe(true);
    expect(hasArrowAffordance(arrowGluedToTheLabel)).toBe(true);
    expect(hasArrowAffordance(relationGlyph)).toBe(false);
  });

  /**
   * §4. Nine files rebuilt the primary button rather than use the primitive,
   * seven of them to reach an accent the primitive could not give them.
   * `variant="accent"` is that reach, so the inline spelling has no excuse
   * left.
   */
  // @req REQ-091
  it("routes accent-filled controls through the button primitive", () => {
    // Line-scanned rather than matched across the whole file: a multi-line
    // regex over a JSX tag backtracks catastrophically on the larger
    // components. An accent background within a few lines of a <button> is
    // the whole signature.
    const offenders = FILES.filter((file) => {
      const lines = readFileSync(file, "utf8").split("\n");
      return lines.some((line, index) => {
        if (!/backgroundColor:\s*"var\(--accent\)"/.test(line)) return false;
        return lines
          .slice(Math.max(0, index - 6), index)
          .some((prior) => /<button\b/.test(prior));
      });
    }).map(rel);

    expect(offenders).toEqual([]);
  });

  /**
   * §6. A control takes a token, never a literal. The literals left in the
   * tree dress figures and cards rather than controls, and `50%` is a
   * decorative dot — so this is scoped to the pill, whose three spellings
   * (`100px`, `999px`, the token) were the clearest case of one shape
   * written three ways.
   */
  // @req REQ-091
  it("spells the pill radius as a token, never as 100px or 999px", () => {
    const untokenisedPill = /border-radius:\s*(?:100px|999px)/;

    const offenders = FILES.filter((file) =>
      untokenisedPill.test(readFileSync(file, "utf8"))
    ).map(rel);

    expect(offenders).toEqual([]);
  });

  /**
   * §6, the collapse. Two radii two pixels apart is a distinction no reader
   * can see; keeping both is how a control ends up dressed as a card. The
   * charter keeps `--afh-radius-base` available for internal surfaces, so
   * this is scoped to the Tailwind utility, which only ever dresses a
   * component.
   */
  // @req REQ-091
  it("gives controls and surfaces the one radius utility", () => {
    const offenders = FILES.filter((file) =>
      /\brounded-afh-base\b/.test(readFileSync(file, "utf8"))
    ).map(rel);

    expect(offenders).toEqual([]);
  });
});
