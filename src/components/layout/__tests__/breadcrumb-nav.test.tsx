import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AfrikBreadcrumbs } from "../AfrikBreadcrumbs";
import {
  getFamilyRoute,
  getLocalizedRoute,
  getPeopleRoute,
} from "@/lib/routing";

describe("AfrikBreadcrumbs — AFRIK hierarchy navigation context", () => {
  it("renders breadcrumbs for family › people path", () => {
    const items = [
      { label: "Familles", href: getLocalizedRoute("fr", "families") },
      { label: "Niger-Congo", href: getFamilyRoute("fr", "FLG_NIGER_CONGO") },
      { label: "Yoruba" },
    ];
    render(<AfrikBreadcrumbs items={items} />);
    const familyLink = screen.getByRole("link", { name: "Familles" });
    expect(familyLink.getAttribute("href")).toBe(
      getLocalizedRoute("fr", "families")
    );
    const familyDetailLink = screen.getByRole("link", { name: "Niger-Congo" });
    expect(familyDetailLink.getAttribute("href")).toBe(
      getFamilyRoute("fr", "FLG_NIGER_CONGO")
    );
    expect(screen.getByText("Yoruba")).toBeTruthy();
  });

  it("renders breadcrumbs for people › country path", () => {
    const items = [
      { label: "Peuples", href: getLocalizedRoute("fr", "peoples") },
      { label: "Yoruba", href: getPeopleRoute("fr", "PPL_YORUBA") },
      { label: "Nigeria" },
    ];
    render(<AfrikBreadcrumbs items={items} />);
    const peopleLink = screen.getByRole("link", { name: "Yoruba" });
    expect(peopleLink.getAttribute("href")).toBe(
      getPeopleRoute("fr", "PPL_YORUBA")
    );
    expect(screen.getByText("Nigeria")).toBeTruthy();
  });

  it("renders plain breadcrumbs without hrefs as non-links", () => {
    const items = [
      { label: "Familles", href: getLocalizedRoute("fr", "families") },
      { label: "Yoruba" },
    ];
    render(<AfrikBreadcrumbs items={items} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(screen.getByText("Yoruba")).toBeTruthy();
  });
});
