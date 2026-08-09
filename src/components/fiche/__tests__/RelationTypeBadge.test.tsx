import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { RelationTypeBadge } from "../RelationTypeBadge";

describe("RelationTypeBadge", () => {
  // @req REQ-097
  it.each([
    ["migratory", "Migratoire"],
    ["commercial", "Commerciale"],
    ["religious", "Religieuse"],
  ] as const)("labels the %s relation type as %s", (type, label) => {
    render(<RelationTypeBadge type={type} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  // @req REQ-097
  it("exposes the raw relation type as a data attribute", () => {
    const { container } = render(<RelationTypeBadge type="commercial" />);
    expect(
      container.querySelector('[data-relation-type="commercial"]')
    ).not.toBeNull();
  });
});
