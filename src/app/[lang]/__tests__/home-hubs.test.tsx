import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ lang: "fr" }),
}));

vi.mock("@/hooks/use-language", () => ({
  useLanguage: () => ({ language: "fr", setLanguage: vi.fn() }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/lib/afrikLoader", () => ({
  getStats: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-layout">{children}</div>
  ),
}));

vi.mock("@/components/search/SearchModalV2", () => ({
  SearchModalV2: () => null,
}));

import Home from "../page";

describe("home page — access-mode hubs", () => {
  // @req REQ-091
  it("renders the Explorer and Comprendre hubs but not Jouer", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "Explorer" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Comprendre" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Jouer" })
    ).not.toBeInTheDocument();
  });

  // @req REQ-091
  it("renders each surface link with its localized route", () => {
    render(<Home />);

    expect(screen.getByRole("link", { name: "Pays" })).toHaveAttribute(
      "href",
      "/fr/pays"
    );
    expect(screen.getByRole("link", { name: "Peuples" })).toHaveAttribute(
      "href",
      "/fr/peuples"
    );
    expect(screen.getByRole("link", { name: "Doctrine" })).toHaveAttribute(
      "href",
      "/fr/doctrine"
    );
    expect(screen.getByRole("link", { name: "À propos" })).toHaveAttribute(
      "href",
      "/fr/about"
    );
  });
});
