import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AboutPageShell from "../AboutPageShell";

const mocks = vi.hoisted(() => ({
  language: "fr",
  routeLanguage: "fr",
  setLanguage: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ lang: mocks.routeLanguage }),
}));

vi.mock("@/hooks/use-language", () => ({
  useLanguage: () => ({
    language: mocks.language,
    setLanguage: mocks.setLanguage,
  }),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    language,
    hideHeader,
  }: {
    children: ReactNode;
    language: string;
    hideHeader?: boolean;
  }) => (
    <div
      data-testid="about-page-layout"
      data-language={language}
      data-hide-header={String(hideHeader)}
    >
      {children}
    </div>
  ),
}));

vi.mock("../AboutPageContent", () => ({
  default: () => <div data-testid="legacy-about-page-content" />,
}));

describe("AboutPageShell (REQ-091)", () => {
  beforeEach(() => {
    mocks.language = "fr";
    mocks.routeLanguage = "fr";
    mocks.setLanguage.mockReset();
  });

  // @req REQ-091
  it("keeps the About layout bandless around server-rendered content", () => {
    render(
      <AboutPageShell>
        <div data-testid="server-rendered-about-content" />
      </AboutPageShell>
    );

    expect(screen.getByTestId("about-page-layout")).toHaveAttribute(
      "data-hide-header",
      "true"
    );
    expect(screen.getByTestId("about-page-layout")).toHaveAttribute(
      "data-language",
      "fr"
    );
    expect(screen.getByTestId("server-rendered-about-content")).toBeVisible();
    expect(screen.queryByTestId("legacy-about-page-content")).toBeNull();
  });

  // @req REQ-091
  it("synchronizes the French URL language through the client hook", () => {
    mocks.language = "stale";

    render(
      <AboutPageShell>
        <div />
      </AboutPageShell>
    );

    expect(mocks.setLanguage).toHaveBeenCalledOnce();
    expect(mocks.setLanguage).toHaveBeenCalledWith("fr");
  });
});
