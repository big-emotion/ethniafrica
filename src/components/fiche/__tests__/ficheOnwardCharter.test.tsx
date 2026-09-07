import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FicheOnward } from "@/components/fiche/FicheOnward";
import { ONWARD_MAX_LINKS, type OnwardLink } from "@/lib/fiche/onwardLinks";
import { ficheCopy } from "@/lib/i18n/copy/fiche";
import type { FicheEntityType } from "@/types/fiche";

/**
 * The charter contract for the way out of a fiche.
 *
 * Three rules, each with the failure it prevents:
 *
 * **One accent, the page's.** Painting each row in its target entity's colour
 * is the tempting move. The atlas charter §2 already records three different
 * entity-to-hue mappings live at once — the home's positional walk, the facet
 * scale, the fiche scale — so a fourth inside one scroll teaches a code no
 * reader can learn. The kind is a word.
 *
 * **The block declares its own alignment.** mobile-text.css centres the body
 * below 768px. Every row here is a shrink-to-fit inline-flex link, so left
 * unset five rows start at five different x with their arrows scattered, and
 * the reader has no column to scan. Brand charter §8.1 — one alignment per
 * block. This is the same failure `.afh-prose-list` was fixed for.
 *
 * **Five links, never more.** Past five the block stops reading as an
 * invitation and becomes a second listing — and the listings are exactly what
 * these fiches out-read ten to one.
 */

vi.mock("@/lib/analytics/trackEvent", () => ({ trackEvent: vi.fn() }));

const componentSource = readFileSync(
  resolve(process.cwd(), "src/components/fiche/FicheOnward.tsx"),
  "utf8"
);

const parchmentCss = readFileSync(
  resolve(process.cwd(), "src/styles/fiche-parchment.css"),
  "utf8"
);

function onwardRule(selector: string): string {
  const match = parchmentCss.match(
    new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`, "g")
  );
  return match?.join("\n") ?? "";
}

const everyKind: OnwardLink[] = [
  { kind: "language-family", name: "Nigéro-congolais", href: "/fr/f/1" },
  { kind: "language", name: "Yoruba", href: "/fr/l/1" },
  { kind: "country", name: "Nigeria", href: "/fr/c/1" },
  { kind: "people", name: "Éwé", href: "/fr/p/1" },
  { kind: "name", name: "Kanté", href: "/fr/n/1" },
  { kind: "country", name: "Bénin", href: "/fr/c/2" },
];

describe("the Poursuivre block — charter contract", () => {
  // @req REQ-091
  it("names no accent, so it reads under whichever fiche it closes", () => {
    expect(componentSource).not.toMatch(/afh-accent-/);
    expect(componentSource).not.toMatch(/--afh-cat-/);
  });

  // @req REQ-091
  it("carries no colour of its own for a reader to mistake for a code", () => {
    expect(onwardRule(".afh-onward")).not.toMatch(/color|background/);
    expect(onwardRule(".afh-onward-kind")).not.toMatch(/color|background/);
  });

  // @req REQ-091
  it("declares its alignment rather than inheriting the phone's centring", () => {
    expect(onwardRule(".afh-onward")).toMatch(/text-align:\s*start/);
  });

  // @req REQ-091
  it("gives every row the departing arrow of an action link", () => {
    render(<FicheOnward from="people" links={everyKind} language="fr" />);

    const arrows = screen.getAllByTestId("action-link-arrow");
    expect(arrows).toHaveLength(ONWARD_MAX_LINKS);
  });

  // @req REQ-091
  it("stops at five links, whatever the corpus relates", () => {
    render(<FicheOnward from="people" links={everyKind} language="fr" />);

    expect(screen.getAllByRole("link")).toHaveLength(ONWARD_MAX_LINKS);
  });

  // @req REQ-091
  it("has a word for every kind of fiche a reader can be sent to", () => {
    const kinds: FicheEntityType[] = [
      "people",
      "country",
      "language-family",
      "language",
      "name",
    ];

    for (const kind of kinds) {
      const { unmount } = render(
        <FicheOnward
          from="country"
          links={[{ kind, name: "Cible", href: `/fr/${kind}` }]}
          language="fr"
        />
      );

      expect(
        screen.getByText(ficheCopy.fr.onward.kind[kind])
      ).toBeInTheDocument();
      unmount();
    }
  });
});
