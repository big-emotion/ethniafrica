/**
 * Tests for ClassificationBadge (ETNI-178).
 *
 * The component surfaces the editorial `classification_status` enum on people
 * and language-family fiches. It MUST:
 *   - render the FR label for each enum value,
 *   - return null (no DOM output) when the status is nullish,
 *   - wrap the badge in a Next.js Link to /fr/doctrine#<status>,
 *   - expose the tooltip text (via title attribute, since we render outside a
 *     TooltipProvider in tests).
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClassificationBadge } from "@/components/ui/classification-badge";
import { classificationLabels } from "@/lib/translations";

// Mock next/link so the component can be rendered without a Next runtime.
// happy-dom + React Testing Library is enough; we just need a real <a>.
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("ClassificationBadge", () => {
  it.each([
    ["consensual" as const, classificationLabels.consensual.label],
    ["contested" as const, classificationLabels.contested.label],
    ["colonial-legacy" as const, classificationLabels["colonial-legacy"].label],
    ["reconstructive" as const, classificationLabels.reconstructive.label],
  ])("renders the FR label for status=%s", (status, expectedLabel) => {
    render(<ClassificationBadge status={status} />);
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  it("returns null when status is null", () => {
    const { container } = render(<ClassificationBadge status={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("returns null when status is undefined", () => {
    const { container } = render(<ClassificationBadge status={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ["consensual" as const],
    ["contested" as const],
    ["colonial-legacy" as const],
    ["reconstructive" as const],
  ])("links to /fr/doctrine#%s", (status) => {
    render(<ClassificationBadge status={status} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `/fr/doctrine#${status}`);
  });

  it("exposes the tooltip text via title attribute", () => {
    render(<ClassificationBadge status="contested" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "title",
      classificationLabels.contested.tooltip
    );
  });

  it("exposes the colonial-legacy tooltip", () => {
    render(<ClassificationBadge status="colonial-legacy" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "title",
      classificationLabels["colonial-legacy"].tooltip
    );
  });
});
