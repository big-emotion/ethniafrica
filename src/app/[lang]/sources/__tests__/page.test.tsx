import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/pages/AboutPageShell", () => ({
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid="about-page-shell">{children}</div>
  ),
}));

vi.mock("@/components/pages/SourcesPageContent", () => ({
  default: () => <div data-testid="sources-page-content" />,
}));

import SourcesPage from "../page";

describe("SourcesPage server boundary (REQ-091)", () => {
  // @req REQ-091
  it("delegates to the shared client shell and renders the bibliography", () => {
    render(<SourcesPage />);

    expect(screen.getByTestId("about-page-shell")).toBeInTheDocument();
    expect(screen.getByTestId("sources-page-content")).toBeInTheDocument();
  });
});
