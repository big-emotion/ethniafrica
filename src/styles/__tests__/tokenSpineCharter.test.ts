import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * Brand charter §4 — one token spine.
 *
 * Two colour layers live in this repo: the `--afh-*` hex tokens the atlas
 * charter is written in, and the shadcn HSL triplets the `ui/` primitives
 * inherit. They are not interchangeable, and for a release they collided on
 * two names.
 *
 * `--accent` was the sharp one. `.afh-accent-ocre` sets it to the hex
 * `#c9821f`; the shadcn block held `42 88% 58%`. Every Tailwind `*-accent`
 * utility compiles to `hsl(var(--accent))`, so inside any accent-scoped
 * subtree — which is every fiche, facet and hub — that expression resolved to
 * `rgba(0, 0, 0, 0)`. Measured in the browser, not inferred. On
 * `dropdown-menu` it was the focus and open state painting transparent.
 *
 * `--foreground` was the quiet one: `25 25% 15%` is `#30251d` while
 * `--afh-text` is `#2c2018`, and both painted `h1` elements in production.
 */
const ROOT = join(__dirname, "..", "..");
const INDEX_CSS = readFileSync(join(ROOT, "index.css"), "utf8");
const COLOR_CSS = readFileSync(
  join(ROOT, "styles", "tokens", "color.css"),
  "utf8"
);
const TAILWIND = readFileSync(join(ROOT, "..", "tailwind.config.ts"), "utf8");

/** A declaration of `name` at the start of a line, whatever the indentation. */
function declares(css: string, name: string): boolean {
  return new RegExp(`^\\s*${name.replace(/-/g, "\\-")}\\s*:`, "m").test(css);
}

describe("token spine charter (§4)", () => {
  // @req REQ-115
  it("leaves the bare accent name to the atlas layer alone", () => {
    // The shadcn layer may not declare it: whoever declares it decides what
    // kind of value it is, and two kinds is what produced a transparent
    // focus ring.
    expect(declares(INDEX_CSS, "--accent")).toBe(false);
    expect(declares(INDEX_CSS, "--accent-foreground")).toBe(false);

    // And the atlas layer still owns it, as a hex.
    expect(COLOR_CSS).toMatch(/--accent:\s*var\(--afh-cat-/);
  });

  // @req REQ-115
  it("gives the shadcn accent its own namespaced name", () => {
    expect(declares(INDEX_CSS, "--ui-accent")).toBe(true);
    expect(TAILWIND).toContain("hsl(var(--ui-accent))");
    expect(TAILWIND).not.toContain("hsl(var(--accent))");
  });

  // @req REQ-115
  it("paints one ink, not two", () => {
    // 24 29.4% 13.3% is #2c2018 — the same value as --afh-text. Rounded to
    // whole percentages it lands on #2b1f18, one unit off on every channel,
    // which would leave two inks that merely look alike.
    expect(INDEX_CSS).toMatch(/--foreground:\s*24 29\.4% 13\.3%/);
    expect(COLOR_CSS).toMatch(/--afh-color-text:\s*#2c2018/);
    expect(INDEX_CSS).not.toMatch(/--foreground:\s*25 25% 15%/);
  });
});
