import { describe, it, expect } from "vitest";

import { MODULE_DEFINITIONS } from "@/lib/hubs/moduleRegistry";
import { getLocalizedRoute } from "@/lib/routing";
import { getSiteTree } from "@/lib/siteTree";
import { getTranslation } from "@/lib/translations";

/**
 * DEC-038 — the name axis carries two words, and only one of them is public.
 *
 * The decision names them in one sentence: the reader-facing label is *Nom*,
 * "because that is the word a francophone types", and *patronyme* is the
 * internal identifier, chosen to keep the entity distinct from the two other
 * things this repository already calls "nom" — the ethnonym dossier and
 * ARCH-018's person.
 *
 * Nothing enforced the boundary, so the internal word reached four reader
 * surfaces while the trail, the footer and the URL said "Nom": one axis with
 * two names, depending on where the reader stood. A blanket sweep is the wrong
 * gate for it — "patronyme" is also the correct onomastic term for one of the
 * five naming systems the axis publishes, so a scan of `src/` would fail on
 * the copy that is right. This asserts on the objects the surfaces read from
 * instead, and the second block guards the opposite mistake: a later rename
 * that takes the naming system with it.
 *
 * The decision constrains the *word*, not its number, and the two are asserted
 * apart here on purpose. Navigation points at an index and says « Noms », in
 * the plural its four neighbours are already in; a fiche's eyebrow names the
 * one thing under it and stays singular. Asserting a single string for both
 * would make either surface's correct copy fail the gate.
 */

const NAME_AXIS_ROUTE = getLocalizedRoute("fr", "patronymes");

describe("DEC-038 — the reader meets the name axis as « Nom »", () => {
  /**
   * The decision constrains the word, not the article in front of it. The
   * menu entry grew to « Les noms d'Afrique » on 7 September 2026 for the
   * reason the number was settled above: it sits in a row of « Les pays
   * d'Afrique », « Les peuples d'Afrique », « Les langues d'Afrique », and a
   * bare « Noms » among them read as a form field rather than as the fifth
   * index. The phrase is not invented for the menu — it is already the title
   * of the page the entry opens (`facets.ts`).
   */
  // @req REQ-138
  it("names the atlas menu entry with the reader's word for it", () => {
    const entry = MODULE_DEFINITIONS.find(
      (module) => module.page === "patronymes"
    );

    expect(entry?.name).toBe("Les noms d'Afrique");
    expect(entry?.name).not.toMatch(/patronyme/i);
  });

  // @req REQ-138
  it("prints « Nom » above a name fiche", () => {
    expect(getTranslation("fr").patronymes.eyebrow).toBe("Nom");
  });

  // @req REQ-138
  it("counts noms on the index, not patronymes", () => {
    const { index } = getTranslation("fr").patronymes;

    expect(index.countSingular).toBe("nom");
    expect(index.countPlural).toBe("noms");
    expect(index.emptyState).not.toMatch(/patronyme/i);
  });

  // @req REQ-138
  it("labels the site plan entry « Noms »", () => {
    const link = getSiteTree("fr")
      .flatMap((section) => section.links)
      .find((candidate) => candidate.href === NAME_AXIS_ROUTE);

    expect(link).toBeDefined();
    expect(link?.label).toBe("Noms");
    expect(link?.note).not.toMatch(/patronyme/i);
  });
});

describe("DEC-038 — « patronyme » stays where it names a naming system", () => {
  // @req REQ-138
  it("keeps the non-hereditary patronymic among the five naming systems", () => {
    const { nameSystemLabels } = getTranslation("fr").patronymes;

    expect(nameSystemLabels.non_hereditary_patronymic).toBe(
      "Patronyme non héréditaire"
    );
  });

  // @req REQ-138
  it("keeps the index subtitle naming the systems it enumerates", () => {
    expect(getTranslation("fr").patronymes.index.pageSubtitle).toMatch(
      /patronymes non héréditaires/
    );
  });
});
