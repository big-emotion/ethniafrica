/**
 * Tests for NameTypeBadge (ETNI-472 / Epic 8 Story 8.8).
 *
 * The badge MUST:
 *   - pair the FR label with an icon for all four name types (never color alone),
 *   - use the four French labels from the spec verbatim,
 *   - switch to the "nom imposé" label + colonial tokens when `imposed` is true,
 *   - never use `--afh-error` for the imposed variant.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NameTypeBadge } from "@/components/names/NameTypeBadge";
import type { NameRecordType } from "@/types/names";

const TYPE_LABELS: Record<NameRecordType, string> = {
  endonym: "endonyme",
  exonym: "exonyme",
  historical_spelling: "graphie historique",
  surname: "patronyme",
};

describe("NameTypeBadge", () => {
  // @req REQ-056
  it.each(Object.entries(TYPE_LABELS))(
    "renders the French label for nameType=%s",
    (nameType, label) => {
      render(<NameTypeBadge nameType={nameType as NameRecordType} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  );

  // @req REQ-056
  it.each(Object.keys(TYPE_LABELS))(
    "always pairs the label with an icon for nameType=%s (never color alone)",
    (nameType) => {
      const { container } = render(
        <NameTypeBadge nameType={nameType as NameRecordType} />
      );
      expect(container.querySelector("svg")).not.toBeNull();
    }
  );

  // @req REQ-056
  it("renders the 'nom imposé' label when imposed is true", () => {
    render(<NameTypeBadge nameType="exonym" imposed />);
    expect(screen.getByText("nom imposé")).toBeInTheDocument();
  });

  // @req REQ-056
  it("uses the colonial tokens (never --afh-error) for the imposed variant", () => {
    render(<NameTypeBadge nameType="exonym" imposed />);
    const badge = screen.getByText("nom imposé").closest("div");
    const style = badge?.getAttribute("style") ?? "";
    expect(style).toContain("--afh-color-colonial");
    expect(style).not.toContain("--afh-error");
    expect(style).not.toContain("--afh-color-error");
  });

  // @req REQ-056
  it("does not render the imposed label when imposed is false", () => {
    render(<NameTypeBadge nameType="exonym" imposed={false} />);
    expect(screen.queryByText("nom imposé")).toBeNull();
    expect(screen.getByText("exonyme")).toBeInTheDocument();
  });
});
