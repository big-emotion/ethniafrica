import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AfrikBreadcrumbs } from "../AfrikBreadcrumbs";

describe("AfrikBreadcrumbs", () => {
  const items = [
    { label: "Familles", href: "/fr/familles" },
    { label: "FLG_BANTU", href: "/fr/familles?family=FLG_BANTU" },
    { label: "Kikongo", href: undefined },
    { label: "Bakongo", href: undefined },
  ];

  it("renders all breadcrumb items", () => {
    render(<AfrikBreadcrumbs items={items} />);
    expect(screen.getByText("Familles")).toBeDefined();
    expect(screen.getByText("FLG_BANTU")).toBeDefined();
    expect(screen.getByText("Kikongo")).toBeDefined();
    expect(screen.getByText("Bakongo")).toBeDefined();
  });

  it("renders links for items with href", () => {
    render(<AfrikBreadcrumbs items={items} />);
    const famillesLink = screen.getByRole("link", { name: "Familles" });
    expect(famillesLink.getAttribute("href")).toBe("/fr/familles");
  });

  it("renders plain text for items without href", () => {
    render(<AfrikBreadcrumbs items={items} />);
    const bakongo = screen.getByText("Bakongo");
    expect(bakongo.tagName.toLowerCase()).not.toBe("a");
  });

  it("renders separators between items", () => {
    const { container } = render(<AfrikBreadcrumbs items={items} />);
    const separators = container.querySelectorAll("[aria-hidden='true']");
    expect(separators.length).toBeGreaterThanOrEqual(items.length - 1);
  });

  it("has nav landmark with accessible label", () => {
    render(<AfrikBreadcrumbs items={items} />);
    expect(
      screen.getByRole("navigation", { name: /fil d'ariane/i })
    ).toBeDefined();
  });

  it("renders nothing when items array is empty", () => {
    const { container } = render(<AfrikBreadcrumbs items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
