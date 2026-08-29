import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AfrikBreadcrumbs } from "../AfrikBreadcrumbs";
import { getLocalizedRoute } from "@/lib/routing";

describe("AfrikBreadcrumbs", () => {
  const items = [
    { label: "Familles", href: getLocalizedRoute("fr", "families") },
    {
      label: "FLG_BANTU",
      href: `${getLocalizedRoute("fr", "families")}?family=FLG_BANTU`,
    },
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
    expect(famillesLink.getAttribute("href")).toBe(
      getLocalizedRoute("fr", "families")
    );
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

  /**
   * The gutter is the mount's, not the trail's.
   *
   * Carrying its own horizontal padding meant the trail could only ever align
   * with a mount that had none: everywhere it sat inside a padded container —
   * the shell, the profile page — the two stacked and the crumbs started right
   * of the title they belong to. A trail that adds nothing lands wherever its
   * mount lands.
   */
  // @req REQ-091
  it("adds no horizontal gutter of its own", () => {
    render(<AfrikBreadcrumbs items={items} />);

    const trail = screen.getByRole("navigation", { name: /fil d'ariane/i });
    expect(trail.className).not.toMatch(/(^|\s|:)(px|pl|pr)-/);
  });
});
