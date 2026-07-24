import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FamilyPeoplesSection } from "../../family/FamilyPeoplesSection";
import type { PeopleReference } from "@/types/afrik";

describe("FamilyPeoplesSection — navigation links to people fiches", () => {
  const peoples: PeopleReference[] = [
    { name: "Yoruba", peopleId: "PPL_YORUBA" },
    { name: "Igbo", peopleId: "PPL_IGBO" },
    { name: "Sans ID" },
  ];

  it("renders a link to the people fiche for each entry with peopleId", () => {
    render(<FamilyPeoplesSection peoples={peoples} lang="fr" />);
    const link = screen.getByRole("link", { name: /Yoruba/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/fr/peuples/PPL_YORUBA");
  });

  it("renders all peoples including those without ID", () => {
    render(<FamilyPeoplesSection peoples={peoples} lang="fr" />);
    expect(screen.getByText("Yoruba")).toBeTruthy();
    expect(screen.getByText("Igbo")).toBeTruthy();
    expect(screen.getByText("Sans ID")).toBeTruthy();
  });

  it("does not render a link for entries without peopleId", () => {
    render(<FamilyPeoplesSection peoples={peoples} lang="fr" />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).not.toContain("/fr/peuples/undefined");
    expect(hrefs).toHaveLength(2);
  });

  it("returns null when peoples list is empty", () => {
    const { container } = render(
      <FamilyPeoplesSection peoples={[]} lang="fr" />
    );
    expect(container.firstChild).toBeNull();
  });
});
