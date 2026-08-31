import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PeopleNamingBlock } from "@/components/people/PeopleNamingBlock";

const yoruba = {
  nameMain: "Yoruba",
  selfAppellation: "Yoruba (Yoruba eniyan)",
  exonyms: [
    "Nago (terme colonial francophone, connotation reductrice)",
    "Aku (diaspora historique en Sierra Leone)",
  ],
  whyProblematic: "Nago peut etre percu comme reducteur.",
  isoCode: "yor",
};

describe("PeopleNamingBlock (REQ-115)", () => {
  // @req REQ-115
  it("puts the name borne and the names imposed face to face", () => {
    render(<PeopleNamingBlock {...yoruba} />);

    expect(screen.getByText("Auto-appellation")).toBeInTheDocument();
    expect(screen.getByText("Exonymes")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  // 316 of the corpus's 789 fiches carry no whyProblematic. Rendering the
  // heading unconditionally would promise an explanation on 40 % of the
  // corpus and then give none.
  // @req REQ-115
  it("omits the explanation entirely rather than promising one it does not have", () => {
    render(<PeopleNamingBlock {...yoruba} whyProblematic={null} />);

    expect(
      screen.queryByText(/Pourquoi ces noms posent problème/)
    ).not.toBeInTheDocument();
  });

  // @req REQ-115
  it("gives the explanation its lead-in when the fiche carries one", () => {
    render(<PeopleNamingBlock {...yoruba} />);

    expect(
      screen.getByText(/Pourquoi ces noms posent problème/)
    ).toBeInTheDocument();
    expect(screen.getByText(/reducteur/)).toBeInTheDocument();
  });

  // 4 fiches declare no exonym at all. An empty red block would read as "no
  // colonial name is recorded", which is a claim, not an absence.
  // @req REQ-115
  it("hides the exonym block when the fiche records none", () => {
    render(<PeopleNamingBlock {...yoruba} exonyms={[]} />);

    expect(screen.queryByText("Exonymes")).not.toBeInTheDocument();
    expect(screen.getByText("Auto-appellation")).toBeInTheDocument();
  });

  // The autonym must reach the page through AutonymExonymHeading, which is
  // what carries its lang attribute — afh/no-bare-people-name is an ESLint
  // error across components/people/** for exactly this reason.
  // @req REQ-115
  it("tags the autonym with the language it is written in", () => {
    const { container } = render(<PeopleNamingBlock {...yoruba} />);

    expect(container.querySelector('[lang="yo"]')).not.toBeNull();
  });

  // 786 of 789 fiches answer where the exonyms came from, and 789 of 789 say
  // what the name is today. Neither reached the page before: the fields were
  // declared by the strict model, filled by the corpus, and read only by the
  // games engine.
  // @req REQ-115
  it("says where the exonyms came from, and what the name is today", () => {
    render(
      <PeopleNamingBlock
        {...yoruba}
        originOfExonyms="Terme employé par les voisins haoussa."
        contemporaryUsage="Le nom est aujourd'hui revendiqué."
      />
    );

    expect(screen.getByText(/D'où viennent ces noms/)).toBeInTheDocument();
    expect(screen.getByText(/voisins haoussa/)).toBeInTheDocument();
    expect(screen.getByText(/L'usage aujourd'hui/)).toBeInTheDocument();
    expect(screen.getByText(/revendiqué/)).toBeInTheDocument();
  });

  // The parchment is one continuous document — "no cards, no shadows", as
  // fiche-parchment.css puts it, and as the country fiche renders it. This
  // block used to paint two filled boxes with inline backgroundColor, which
  // is both a card and a colour a stylesheet never sees.
  // @req REQ-115
  it("states the two names without boxing either of them", () => {
    const { container } = render(<PeopleNamingBlock {...yoruba} />);

    const painted = Array.from(
      container.querySelectorAll<HTMLElement>("[style]")
    ).filter((node) => node.style.backgroundColor !== "");

    expect(painted).toEqual([]);
  });

  // The name borne and the names imposed are two fields of the same rubric,
  // so they share the block's layout rather than each inventing one. The
  // roles are what the stylesheet keys the accent and colonial inks off.
  // @req REQ-115
  it("marks which field is borne and which is imposed", () => {
    const { container } = render(<PeopleNamingBlock {...yoruba} />);

    expect(container.querySelector('[data-role="borne"]')).not.toBeNull();
    expect(container.querySelector('[data-role="imposed"]')).not.toBeNull();
  });

  // @req REQ-115
  it("announces neither lead-in when the fiche fills neither field", () => {
    render(<PeopleNamingBlock {...yoruba} />);

    expect(
      screen.queryByText(/D'où viennent ces noms/)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/L'usage aujourd'hui/)).not.toBeInTheDocument();
  });
});
