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

    expect(container.querySelector('[lang="yor"]')).not.toBeNull();
  });
});
