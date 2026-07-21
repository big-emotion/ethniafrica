import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AfrikBreadcrumbs } from "../AfrikBreadcrumbs";

describe("AfrikBreadcrumbs — AFRIK hierarchy navigation context", () => {
  it("renders breadcrumbs for family › people path", () => {
    const items = [
      { label: "Familles", href: "/fr/familles" },
      { label: "Niger-Congo", href: "/fr/familles/FLG_NIGER_CONGO" },
      { label: "Yoruba" },
    ];
    render(<AfrikBreadcrumbs items={items} />);
    const familyLink = screen.getByRole("link", { name: "Familles" });
    expect(familyLink.getAttribute("href")).toBe("/fr/familles");
    const familyDetailLink = screen.getByRole("link", { name: "Niger-Congo" });
    expect(familyDetailLink.getAttribute("href")).toBe(
      "/fr/familles/FLG_NIGER_CONGO"
    );
    expect(screen.getByText("Yoruba")).toBeTruthy();
  });

  it("renders breadcrumbs for people › country path", () => {
    const items = [
      { label: "Peuples", href: "/fr/peuples" },
      { label: "Yoruba", href: "/fr/peuples/PPL_YORUBA" },
      { label: "Nigeria" },
    ];
    render(<AfrikBreadcrumbs items={items} />);
    const peopleLink = screen.getByRole("link", { name: "Yoruba" });
    expect(peopleLink.getAttribute("href")).toBe("/fr/peuples/PPL_YORUBA");
    expect(screen.getByText("Nigeria")).toBeTruthy();
  });

  it("renders plain breadcrumbs without hrefs as non-links", () => {
    const items = [
      { label: "Familles", href: "/fr/familles" },
      { label: "Yoruba" },
    ];
    render(<AfrikBreadcrumbs items={items} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(screen.getByText("Yoruba")).toBeTruthy();
  });
});
