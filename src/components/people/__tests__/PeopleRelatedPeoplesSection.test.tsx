import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PeopleRelatedPeoplesSection } from "../PeopleRelatedPeoplesSection";
import type { PeopleRelatedData } from "@/lib/peopleDataTransformer";
import { getPeopleLinksRoute, getPeopleRoute } from "@/lib/routing";

const EMPTY_DATA: PeopleRelatedData = {
  ethnicities: [],
};

describe("PeopleRelatedPeoplesSection — relations preview (Epic 11, FR72/FR75)", () => {
  // @req REQ-145
  it("renders its organisation labels in English", () => {
    render(
      <PeopleRelatedPeoplesSection
        language="en"
        data={{ ethnicities: ["Oyo"], roleOfLineages: "Texte du corpus" }}
        associatedGroups={[{ label: "Oyo" }]}
      />
    );
    expect(screen.getByText("Associated groups")).toBeVisible();
    expect(screen.getByText("Role of lineages")).toBeVisible();
    expect(screen.getByText("Texte du corpus")).toBeVisible();
  });

  // @req REQ-097 FR72
  it("renders up to 3 relation rows with a link to the full links page", () => {
    render(
      <PeopleRelatedPeoplesSection
        language="fr"
        data={EMPTY_DATA}
        associatedGroups={[]}
        peopleId="PPL_YORUBA"
        relationsPreview={[
          {
            id: "REL_1",
            type: "migratory",
            derived: false,
            neighborName: "Fon",
          },
          {
            id: "REL_2",
            type: "commercial",
            derived: false,
            neighborName: "Ashanti",
          },
          {
            id: "REL_3",
            type: "religious",
            derived: false,
            neighborName: "Ewe",
          },
          {
            id: "derived_PPL_BAMILEKE",
            type: "linguistic",
            derived: true,
            neighborName: "Bamiléké",
          },
        ]}
      />
    );

    expect(screen.getByText("Fon")).toBeInTheDocument();
    expect(screen.getByText("Ashanti")).toBeInTheDocument();
    expect(screen.getByText("Ewe")).toBeInTheDocument();
    expect(screen.queryByText("Bamiléké")).not.toBeInTheDocument();

    const link = screen.getByRole("link", { name: /voir tous les liens/i });
    expect(link).toHaveAttribute(
      "href",
      getPeopleLinksRoute("fr", "PPL_YORUBA")
    );
  });

  // @req REQ-097 FR75
  it("renders no relations block and no dead link when there are zero relations", () => {
    render(
      <PeopleRelatedPeoplesSection
        language="fr"
        data={EMPTY_DATA}
        associatedGroups={[]}
        peopleId="PPL_YORUBA"
        relationsPreview={[]}
      />
    );

    expect(
      screen.queryByRole("link", { name: /voir tous les liens/i })
    ).not.toBeInTheDocument();
  });

  // @req REQ-097 FR75
  it("still renders the existing ethnicities block unchanged when there are no relations", () => {
    render(
      <PeopleRelatedPeoplesSection
        language="fr"
        data={{ ethnicities: ["Oyo"] }}
        associatedGroups={[{ label: "Oyo" }]}
        peopleId="PPL_YORUBA"
        relationsPreview={[]}
      />
    );

    expect(screen.getByText("Oyo")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /voir tous les liens/i })
    ).not.toBeInTheDocument();
  });

  // @req REQ-097 FR75
  it("returns null when there is no content at all, relations included", () => {
    const { container } = render(
      <PeopleRelatedPeoplesSection
        language="fr"
        data={EMPTY_DATA}
        associatedGroups={[]}
        relationsPreview={[]}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  // Both are declared by the strict model and filled on 786 of 789 fiches; the
  // transform mapped three of OrganizationSection's five fields, so neither
  // ever reached the page.
  // @req REQ-097
  it("renders the role of lineages and the religious authority", () => {
    render(
      <PeopleRelatedPeoplesSection
        language="fr"
        data={{
          ethnicities: [],
          roleOfLineages: "Rôle central des lignages dans la vie sociale.",
          religiousAuthority: "Alaafin d'Oyo, Ooni d'Ife.",
        }}
        associatedGroups={[]}
        peopleId="PPL_YORUBA"
        relationsPreview={[]}
      />
    );

    expect(screen.getByText("Rôle des lignages")).toBeInTheDocument();
    expect(screen.getByText(/vie sociale/)).toBeInTheDocument();
    expect(screen.getByText("Autorité religieuse")).toBeInTheDocument();
    expect(screen.getByText(/Alaafin/)).toBeInTheDocument();
  });
});

describe("PeopleRelatedPeoplesSection — associated groups that name a fiche", () => {
  const GLOSSED_RESOLVED =
    "Karanga — sous-groupe dominant du centre-sud du Zimbabwe";
  const GLOSSED_UNRESOLVED = "Rozvi — confédération dissoute au XIXe siècle";

  // @req REQ-150
  it("links a group the corpus holds a fiche for to that fiche", () => {
    render(
      <PeopleRelatedPeoplesSection
        language="fr"
        data={{ ethnicities: [GLOSSED_RESOLVED] }}
        associatedGroups={[
          { label: GLOSSED_RESOLVED, peopleId: "PPL_KARANGA" },
        ]}
        peopleId="PPL_SHONA"
      />
    );

    const chip = screen.getByRole("link", { name: GLOSSED_RESOLVED });
    expect(chip).toHaveAttribute("href", getPeopleRoute("fr", "PPL_KARANGA"));
  });

  // @req REQ-150
  it("leaves a group no fiche carries as plain text", () => {
    render(
      <PeopleRelatedPeoplesSection
        language="fr"
        data={{ ethnicities: [GLOSSED_UNRESOLVED] }}
        associatedGroups={[{ label: GLOSSED_UNRESOLVED }]}
        peopleId="PPL_SHONA"
      />
    );

    expect(screen.getByText(GLOSSED_UNRESOLVED)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // The leading-name split is a matching device inside the resolver; the
  // reader is owed the corpus entry whole, linked or not.
  // @req REQ-150
  it("prints the whole corpus entry, gloss included, whether or not it links", () => {
    render(
      <PeopleRelatedPeoplesSection
        language="fr"
        data={{ ethnicities: [GLOSSED_RESOLVED, GLOSSED_UNRESOLVED] }}
        associatedGroups={[
          { label: GLOSSED_RESOLVED, peopleId: "PPL_KARANGA" },
          { label: GLOSSED_UNRESOLVED },
        ]}
        peopleId="PPL_SHONA"
      />
    );

    expect(screen.getByText(GLOSSED_RESOLVED)).toBeInTheDocument();
    expect(screen.getByText(GLOSSED_UNRESOLVED)).toBeInTheDocument();
  });

  // @req REQ-150
  it("renders no groups block at all for a fiche that declares none", () => {
    const { container } = render(
      <PeopleRelatedPeoplesSection
        language="fr"
        data={{ ethnicities: [], politicalSystem: "Monarchie sous Oba" }}
        associatedGroups={[]}
        peopleId="PPL_SHONA"
      />
    );

    expect(screen.getByText("Monarchie sous Oba")).toBeInTheDocument();
    expect(screen.queryByText("Groupes associés")).not.toBeInTheDocument();
    expect(container.querySelectorAll("[data-ethnicity-card]")).toHaveLength(0);
  });
});
