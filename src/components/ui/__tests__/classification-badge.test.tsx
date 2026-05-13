/**
 * Tests for ClassificationBadge (ETNI-178 + ETNI-26 enhancement).
 *
 * The component surfaces the editorial `classification_status` enum on people
 * and language-family fiches. It MUST:
 *   - render the FR label for each enum value,
 *   - return null (no DOM output) when the status is nullish OR when the
 *     status is `consensual` (the default state — no badge needed),
 *   - wrap the badge in a Next.js Link to /fr/doctrine#<status>,
 *   - expose the tooltip text (via title attribute),
 *   - pair each label with an icon (monochrome-safe — color is never the sole signal),
 *   - never use red color tokens (warm hue only: earth / terracotta / gold).
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

// Statuses that produce a visible badge (consensual returns null — see ETNI-26).
const VISIBLE_STATUSES = [
  "contested",
  "colonial-legacy",
  "reconstructive",
] as const;

describe("ClassificationBadge", () => {
  it.each(VISIBLE_STATUSES.map((s) => [s, classificationLabels[s].label]))(
    "renders the FR label for status=%s",
    (status, expectedLabel) => {
      render(<ClassificationBadge status={status} />);
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    }
  );

  it("returns null when status is null", () => {
    const { container } = render(<ClassificationBadge status={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("returns null when status is undefined", () => {
    const { container } = render(<ClassificationBadge status={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("returns null when status is consensual (default — no badge needed)", () => {
    const { container } = render(<ClassificationBadge status="consensual" />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each(VISIBLE_STATUSES.map((s) => [s]))(
    "links to /fr/doctrine#%s",
    (status) => {
      render(<ClassificationBadge status={status} />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", `/fr/doctrine#${status}`);
    }
  );

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

  it.each(VISIBLE_STATUSES.map((s) => [s]))(
    "pairs the label with an icon (monochrome-safe) for status=%s",
    (status) => {
      render(<ClassificationBadge status={status} />);
      // The icon carries a deterministic testid the consumer can rely on.
      expect(screen.getByTestId("classification-icon")).toBeInTheDocument();
    }
  );

  it.each(VISIBLE_STATUSES.map((s) => [s]))(
    "never applies a red color token for status=%s",
    (status) => {
      render(<ClassificationBadge status={status} />);
      const link = screen.getByRole("link");
      const inner = link.querySelector("[data-classification-status]");
      // Inline style and class strings must not reference red tokens.
      const inline = (inner as HTMLElement)?.getAttribute("style") ?? "";
      const cls = (inner as HTMLElement)?.getAttribute("class") ?? "";
      const haystack = `${inline} ${cls}`.toLowerCase();
      expect(haystack).not.toMatch(/colonial[^-]/); // avoid --country-colonial (red)
      expect(haystack).not.toMatch(/\bred\b/);
      expect(haystack).not.toMatch(/#9b3030/);
      expect(haystack).not.toMatch(/#a03f1a/); // the old hard-coded red-ish brown
      // Foreground for the contested status used to be a brown-gold (#7A5807);
      // we keep it warm but check that no "destructive" or "danger" hint slipped in.
      expect(haystack).not.toMatch(/destructive|danger/);
    }
  );

  it("accepts an optional doctrineSlug prop without breaking the link", () => {
    // The prop is informational — it does NOT change the link target (the
    // badge always points to the canonical doctrine anchor for its status).
    // The doctrineSlug is exposed via a data attribute so callers / tests can
    // verify pairing with an adjacent DoctrineLinkCard.
    render(
      <ClassificationBadge
        status="contested"
        doctrineSlug="classification-status"
      />
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/fr/doctrine#contested");
    expect(link).toHaveAttribute("data-doctrine-slug", "classification-status");
  });

  it("is backwards-compatible with the original single-prop call signature", () => {
    // Existing call sites use <ClassificationBadge status={x} /> only.
    render(<ClassificationBadge status="contested" />);
    expect(screen.getByRole("link")).toBeInTheDocument();
  });
});
