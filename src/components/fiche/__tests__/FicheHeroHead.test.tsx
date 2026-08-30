import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FicheHeroHead } from "@/components/fiche/FicheHeroHead";
import { ACCENT_CLASS_BY_ENTITY } from "@/components/fiche/FicheSequence";
import type { FicheEntityType } from "@/types/fiche";

/**
 * The scope has to travel with the head.
 *
 * The head used to be the first child of `FicheSequence`, and that is what put
 * it inside the fiche's accent scope: one class on the sequence root rebinds
 * `--accent` for everything below it. It reads that binding — the predicate
 * that finishes a fiche title is set in `--accent-ink`, and
 * `AutonymExonymHeading` inks the autonym from the same variable. Lifted into
 * the shell's plate it is no longer under the sequence, and unbound `--accent`
 * resolves to the bare HSL triplet index.css declares under the same name:
 * a title painted in an invalid colour, on a page that still renders.
 *
 * Which is why this is asserted rather than left to the eye. Nothing about the
 * markup looks wrong when the scope is missing.
 */
const ENTITY_TYPES = Object.keys(ACCENT_CLASS_BY_ENTITY) as FicheEntityType[];

describe("the fiche head on its way into the plate (REQ-115)", () => {
  for (const entityType of ENTITY_TYPES) {
    // @req REQ-115
    it(`carries the ${entityType} accent scope with the head`, () => {
      render(
        <FicheHeroHead entityType={entityType}>
          <h1>Bénin</h1>
        </FicheHeroHead>
      );

      const scope = screen.getByTestId("fiche-hero-head");
      expect(scope).toHaveClass(ACCENT_CLASS_BY_ENTITY[entityType]);
      expect(scope).toContainElement(screen.getByRole("heading", { level: 1 }));
    });
  }

  /**
   * Charter §2: the accent reaches a component through the scope class and the
   * tokens it rebinds, never through a colour written here.
   */
  // @req REQ-115
  it("paints nothing itself", () => {
    const { container } = render(
      <FicheHeroHead entityType="people">
        <h1>Yoruba</h1>
      </FicheHeroHead>
    );

    const html = container.innerHTML;
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(html).not.toMatch(/rgba?\(|hsl\(/);
  });
});
