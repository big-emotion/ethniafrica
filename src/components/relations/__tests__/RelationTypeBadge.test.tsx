import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { RelationTypeBadge } from "../RelationTypeBadge";

describe("RelationTypeBadge", () => {
  // @req REQ-097
  it.each([
    ["linguistic", "Linguistique"],
    ["migratory", "Migratoire"],
    ["commercial", "Commerciale"],
    ["religious", "Religieuse"],
  ] as const)("labels the %s relation type as %s", (type, label) => {
    render(<RelationTypeBadge type={type} />);
    expect(screen.getByText(label, { exact: false })).toBeInTheDocument();
  });

  // @req REQ-097
  it("exposes the raw relation type as a data attribute", () => {
    const { container } = render(<RelationTypeBadge type="commercial" />);
    expect(
      container.querySelector('[data-relation-type="commercial"]')
    ).not.toBeNull();
  });

  // @req REQ-097
  it("never conveys the type by color alone: an icon is always rendered", () => {
    const { container } = render(<RelationTypeBadge type="religious" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  // @req REQ-097
  it("marks derived relations with a dérivé suffix and the derived data attribute", () => {
    const { container } = render(
      <RelationTypeBadge type="linguistic" derived />
    );
    expect(screen.getByText(/dérivé/i)).toBeInTheDocument();
    expect(container.querySelector('[data-derived="true"]')).not.toBeNull();
  });

  // @req REQ-097
  it("defaults to non-derived when the derived prop is omitted", () => {
    const { container } = render(<RelationTypeBadge type="migratory" />);
    expect(container.querySelector('[data-derived="false"]')).not.toBeNull();
  });

  // @req REQ-097
  it("renders a larger card size on request", () => {
    const { container } = render(
      <RelationTypeBadge type="commercial" size="card" />
    );
    expect(
      container.querySelector('[data-relation-type="commercial"]')
    ).toHaveClass("text-sm");
  });
});
