import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ContributePage, { generateMetadata } from "../page";
import { getNavModules } from "@/lib/hubs/moduleRegistry";
import { modulesNamedIn } from "@/test/axisModuleVocabulary";

vi.mock("next/navigation", () => ({
  useParams: () => ({ lang: "fr" }),
}));

const { locale } = vi.hoisted(() => ({ locale: { current: "fr" } }));

vi.mock("@/hooks/use-language", () => ({
  useLanguage: () => ({ language: locale.current, setLanguage: vi.fn() }),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-layout">{children}</div>
  ),
}));

vi.mock("@/components/ContributionForm", () => ({
  ContributionForm: () => <form data-testid="contribution-form" />,
}));

vi.mock("next/script", () => ({
  __esModule: true,
  default: () => null,
}));

/** The corpus classes a reader can browse: an atlas module backed by a table. */
const corpusClassCount = getNavModules("atlas").filter(
  (module) => module.dataSource
).length;

describe("the contribute page", () => {
  beforeEach(() => {
    locale.current = "fr";
  });
  // The page described the corpus, and the API over it, as three entities —
  // peoples, language families, countries — while the atlas had six. The rule
  // asserted here is not a list, which is the thing that went stale; it is
  // that naming *some* of the classes is what a page must not do. Either it
  // enumerates the corpus completely or it points at the surface that does.
  // @req REQ-045
  it("names every corpus class or none, never a subset", () => {
    render(<ContributePage />);

    const named = modulesNamedIn(
      "atlas",
      screen.getByTestId("page-layout").textContent ?? ""
    );

    expect(
      named.length === 0 || named.length === corpusClassCount
    ).toBeTruthy();
  });

  // What replaces the enumeration: the two surfaces that keep one derived —
  // À propos for the corpus, /docs/api for the endpoints.
  // @req REQ-045
  it("sends the reader to the surfaces that enumerate, instead of enumerating", () => {
    render(<ContributePage />);

    expect(screen.getByRole("link", { name: /à propos/i })).toHaveAttribute(
      "href",
      "/fr/about"
    );
    expect(
      screen.getByRole("link", { name: /documentation api/i })
    ).toHaveAttribute("href", "/docs/api");
  });

  // @req REQ-141
  it("renders the contribution choices and routes in English", () => {
    locale.current = "en";
    render(<ContributePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Contribute" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /About/ })).toHaveAttribute(
      "href",
      "/en/about"
    );
    expect(screen.getByText("Download the data")).toBeInTheDocument();
    expect(
      screen.queryByText("Télécharger les données")
    ).not.toBeInTheDocument();
  });

  // @req REQ-141
  it("localises the English metadata", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ lang: "en" }),
    });

    expect(metadata.title).toBe("Contribute");
  });
});
