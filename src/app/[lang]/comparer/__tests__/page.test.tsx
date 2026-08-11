import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    sectionName,
  }: {
    children: React.ReactNode;
    sectionName?: string;
  }) => (
    <div data-testid="page-layout" data-section={sectionName}>
      {children}
    </div>
  ),
}));

import ComparerPickerPage from "../page";

async function renderPage(lang = "fr") {
  const ui = await ComparerPickerPage({ params: Promise.resolve({ lang }) });
  return render(ui as React.ReactElement);
}

describe("/[lang]/comparer picker shell (9.4, populated in 9.5)", () => {
  // @req REQ-091
  it("renders the Comparer heading", async () => {
    const { getByRole } = await renderPage();
    expect(getByRole("heading", { level: 1 }).textContent).toBe("Comparer");
  });

  // @req REQ-091
  it("renders inside the PageLayout with the Comparer section name", async () => {
    const { getByTestId } = await renderPage();
    expect(getByTestId("page-layout").getAttribute("data-section")).toBe(
      "Comparer"
    );
  });
});
