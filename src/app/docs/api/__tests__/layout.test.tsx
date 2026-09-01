import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ApiDocsLayout from "@/app/docs/api/layout";

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    language,
  }: {
    children: React.ReactNode;
    language: string;
  }) => (
    <div data-testid="page-layout" data-language={language}>
      <header data-testid="site-header" />
      <main>{children}</main>
      <footer data-testid="site-footer" />
    </div>
  ),
}));

describe("the API documentation layout", () => {
  // @req REQ-099
  it("renders the global header and footer around the developer portal", () => {
    render(
      <ApiDocsLayout>
        <div data-testid="docs-content">Documentation</div>
      </ApiDocsLayout>
    );

    const layout = screen.getByTestId("page-layout");
    const header = screen.getByTestId("site-header");
    const content = screen.getByTestId("docs-content");
    const footer = screen.getByTestId("site-footer");

    expect(layout).toHaveAttribute("data-language", "fr");
    expect(
      header.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      content.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
