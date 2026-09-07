import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SourceVerifyBadge } from "@/components/ui/source-verify-badge";

describe("SourceVerifyBadge bilingual copy", () => {
  // @req REQ-140
  // @req REQ-145
  it("renders its label and default reason in English", () => {
    render(<SourceVerifyBadge language="en" />);

    expect(screen.getByRole("status")).toHaveTextContent("source to verify");
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("unreachable for at least 7 consecutive days")
    );
  });
});
