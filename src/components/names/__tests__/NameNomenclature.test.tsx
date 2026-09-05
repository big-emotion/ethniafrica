import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NameNomenclature } from "@/components/names/NameNomenclature";
import type { NameForm } from "@/api/v2/schemas/names";
import { getPeopleRoute, getStaticPageRoute } from "@/lib/routing";
import { getTranslation } from "@/lib/translations";

const PANGWE: NameForm = {
  formKey: "pangwe",
  displayName: "Pangwe",
  spellings: ["Pangwe"],
  nameTypes: ["exonym"],
  bearerCount: 6,
  bearers: [
    { id: "PPL_BETI", name: "Béti" },
    { id: "PPL_FANG", name: "Fang" },
    { id: "PPL_MYENE", name: "Myene" },
  ],
  hasImposed: false,
  whyProblematic: "Désignation coloniale allemande.",
  languageOfOrigin: null,
};

function renderNomenclature(
  overrides: Partial<Parameters<typeof NameNomenclature>[0]> = {}
) {
  return render(
    <NameNomenclature
      language="fr"
      forms={[PANGWE]}
      total={3134}
      page={1}
      pageCount={66}
      perPage={48}
      imposedOnly={false}
      typeCounts={{ endonym: 715, exonym: 2742 }}
      imposedCount={4}
      {...overrides}
    />
  );
}

describe("NameNomenclature", () => {
  /**
   * The four chips are the page's own vocabulary, and « endonyme » and
   * « exonyme » — the two that carry its whole argument, 715 forms against
   * 2 742 — were glossed nowhere a reader passes through. A filter whose label
   * a reader cannot read is a filter they will not use.
   */
  // @req REQ-022
  it("glosses the kinds of name it filters by", () => {
    renderNomenclature();

    expect(
      screen.getByText(/Un endonyme est le nom qu'un peuple se donne/)
    ).toBeVisible();
  });

  /**
   * The defect this surface was rebuilt for: the peoples bearing a name were
   * rendered `sr-only`, so four entries for four different Songhay fiches
   * looked like the same row repeated, and the page read as a duplicate of
   * the peoples directory.
   */
  // @req REQ-054
  it("shows the peoples that bear a name, not only to screen readers", () => {
    renderNomenclature();

    expect(screen.getByRole("link", { name: "Béti" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Fang" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Myene" })).toBeVisible();
    expect(screen.getByText(/Porté par 6 peuples/)).toBeVisible();
  });

  // @req REQ-054
  it("states the range on screen, not just the corpus total", () => {
    renderNomenclature();

    expect(screen.getByText(/1–48 sur 3134 formes/)).toBeInTheDocument();
  });

  /**
   * `surname` matches no record in the corpus, so offering it as a filter
   * could only ever produce the empty state.
   */
  // @req REQ-054
  it("offers no chip for a type the corpus holds no record for", () => {
    renderNomenclature();

    expect(screen.getByRole("link", { name: /exonyme/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /patronyme/ })
    ).not.toBeInTheDocument();
  });

  // @req REQ-054
  it("hides the imposed filter when no record is an imposed name", () => {
    renderNomenclature({ imposedCount: 0 });

    expect(
      screen.queryByRole("link", { name: /noms imposés/ })
    ).not.toBeInTheDocument();
  });

  // @req REQ-054
  it("carries the active filter through the search form so a search keeps it", () => {
    const { container } = renderNomenclature({ nameType: "exonym" });

    const hidden = container.querySelector('input[name="nameType"]');
    expect(hidden).toHaveValue("exonym");
  });

  // @req REQ-054
  it("pages with plain links, so the surface works without JavaScript", () => {
    renderNomenclature({ page: 2 });

    expect(screen.getByRole("link", { name: /Précédent/ })).toHaveAttribute(
      "href",
      "?"
    );
    expect(screen.getByRole("link", { name: /Suivant/ })).toHaveAttribute(
      "href",
      "?page=3"
    );
  });

  // @req REQ-054
  it("surfaces why a name is problematic instead of showing it as a neutral synonym", () => {
    renderNomenclature();

    expect(
      screen.getByText(/Désignation coloniale allemande/)
    ).toBeInTheDocument();
  });

  // The two ways out of the nomenclature — a bearer's fiche, the contribution
  // form — were composed for French only, so an English reader crossed
  // locales on either click.
  // @req REQ-141
  it("composes its outbound links in the page's locale", () => {
    renderNomenclature({
      language: "en",
      forms: [],
      total: 0,
      query: "Pangwe",
    });
    const t = getTranslation("en").names;

    expect(
      screen.getByRole("link", { name: t.emptyState.reportMissing })
    ).toHaveAttribute(
      "href",
      `${getStaticPageRoute("en", "contribute")}?q=Pangwe`
    );
  });

  // @req REQ-141
  it("links each bearer to its fiche in the page's locale", () => {
    renderNomenclature({ language: "en" });

    expect(screen.getByRole("link", { name: "Fang" })).toHaveAttribute(
      "href",
      `${getPeopleRoute("en", "PPL_FANG")}#noms`
    );
  });
});
