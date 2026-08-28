import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PeopleRelatedPeoplesSection } from "../PeopleRelatedPeoplesSection";
import type { PeopleRelatedData } from "@/lib/peopleDataTransformer";
import { getPeopleLinksRoute } from "@/lib/routing";

const EMPTY_DATA: PeopleRelatedData = {
  ethnicities: [],
};

describe("PeopleRelatedPeoplesSection — relations preview (Epic 11, FR72/FR75)", () => {
  // @req REQ-097 FR72
  it("renders up to 3 relation rows with a link to the full links page", () => {
    render(
      <PeopleRelatedPeoplesSection
        data={EMPTY_DATA}
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
        data={EMPTY_DATA}
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
        data={{ ethnicities: ["Oyo"] }}
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
      <PeopleRelatedPeoplesSection data={EMPTY_DATA} relationsPreview={[]} />
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
        data={{
          ethnicities: [],
          roleOfLineages: "Rôle central des lignages dans la vie sociale.",
          religiousAuthority: "Alaafin d'Oyo, Ooni d'Ife.",
        }}
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
