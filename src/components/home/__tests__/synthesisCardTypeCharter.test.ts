import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The country synthesis card against typography charter §4.
 *
 * The card sets its own type inside a `<style>` block, so no rendering test
 * can see the sizes: happy-dom resolves neither the cascade nor the token.
 * Reading the declaration back is the only place this contract can live.
 *
 * The failure it exists to prevent already shipped once. The card's prose was
 * left at `caption` (13 px) while the exit link moved to the shared
 * `ActionLink`, which carries `small` (16 px) — so the card's action read
 * larger than the country it was describing, and the chapô read as a footnote.
 */

const CARD_SOURCE = readFileSync(
  resolve(process.cwd(), "src/components/home/CountrySynthesisCard.tsx"),
  "utf8"
);

function declaredFontSize(selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = CARD_SOURCE.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  const size = block?.[1].match(/font-size:\s*([^;]+);/);
  return size ? size[1].trim() : null;
}

describe("country synthesis card type (typography charter §4)", () => {
  // The support level of a card. `ActionLink` sets the exit at `small`; the
  // prose it exits from cannot sit a rung below it.
  // @req REQ-113
  it("sets the chapô at the small role", () => {
    expect(declaredFontSize(".home-syn-summary")).toBe("var(--afh-text-small)");
  });

  // Peoples and languages are the card's substance, not its chrome — they
  // belong to the same rung as the chapô. The label above them is the
  // metadata level, which is what keeps the card at charter §4's three levels.
  // @req REQ-113
  it("sets the fact values at the small role", () => {
    expect(declaredFontSize(".home-syn-fact dd")).toBe("var(--afh-text-small)");
  });

  // @req REQ-113
  it("keeps the fact labels one rung under their values", () => {
    expect(declaredFontSize(".home-syn-fact dt")).toBe(
      "var(--afh-text-caption)"
    );
  });

  // `eyebrow` is charter §4's kicker rung, and « PAYS » above the title is the
  // one kicker this card has.
  // @req REQ-113
  it("keeps the entity kicker at the eyebrow role", () => {
    expect(declaredFontSize(".home-syn-kind")).toBe("var(--afh-text-eyebrow)");
  });
});
