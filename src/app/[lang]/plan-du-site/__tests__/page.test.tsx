import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SitemapPage, { generateMetadata } from "../page";
import { getStaticPageRoute } from "@/lib/routing";
import { getTranslation } from "@/lib/translations";

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    language,
  }: {
    children: React.ReactNode;
    language: string;
  }) => (
    <div data-testid="page-layout" data-language={language}>
      {children}
    </div>
  ),
}));

const routeParams = (lang: string) => Promise.resolve({ lang });

describe("the site plan", () => {
  // @req REQ-088
  it("names itself once, from the dictionary of the route's locale", async () => {
    render(await SitemapPage({ params: routeParams("fr") }));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: getTranslation("fr").sitemapPage.title,
      })
    ).toBeInTheDocument();
  });

  // @req REQ-140
  it("declares its canonical in the locale the route was served in", async () => {
    const metadata = await generateMetadata({ params: routeParams("en") });

    expect(metadata.alternates?.canonical).toBe(
      getStaticPageRoute("en", "sitemap")
    );
  });

  // @req REQ-140
  it("hands the shell the route's locale", async () => {
    render(await SitemapPage({ params: routeParams("en") }));

    expect(screen.getByTestId("page-layout")).toHaveAttribute(
      "data-language",
      "en"
    );
  });
});
