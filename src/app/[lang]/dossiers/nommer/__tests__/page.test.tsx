import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NOMMER_CHAPTERS } from "@/lib/dossiers/nommer/chapters";
import { getNommerChapterRoute } from "@/lib/routing";

import NommerPage from "../page";

const FR = Promise.resolve({ lang: "fr" });

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    title,
    subtitle,
  }: {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}));

describe("the Nommer pillar page", () => {
  // @req REQ-113
  it("asks its question once, as the page's only h1", async () => {
    render(await NommerPage({ params: FR }));
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Qui a donné ce nom ?");
  });

  // The grid is the navigation, so every chapter has to be reachable from it
  // — a chapter declared in the array and missing from the pillar would be a
  // page nothing links to.
  // @req REQ-113
  it("links every chapter, at the route the slug map composes", async () => {
    render(await NommerPage({ params: FR }));

    for (const chapter of NOMMER_CHAPTERS) {
      const link = screen.getByRole("link", { name: chapter.title });
      expect(link).toHaveAttribute(
        "href",
        getNommerChapterRoute("fr", chapter.key)
      );
    }
  });

  // Three levels, and the third is the measure. Asserted through the rendered
  // tile rather than the constant, because the point is that a reader sees it.
  // @req REQ-113
  it("prints each chapter's ordinal and measure on its tile", async () => {
    render(await NommerPage({ params: FR }));

    for (const chapter of NOMMER_CHAPTERS) {
      const tile = screen.getByTestId(`nommer-chapter-${chapter.key}`);
      expect(tile).toHaveTextContent(chapter.ordinal);
      expect(tile).toHaveTextContent(chapter.measure.value);
      expect(within(tile).getByText(chapter.question)).toBeInTheDocument();
    }
  });

  // The three numbers that replace a percentage: the gap is published beside
  // the finding, which is the whole reason the band exists.
  // @req REQ-113
  it("states the undeclared fiches beside the contested ones", async () => {
    render(await NommerPage({ params: FR }));

    expect(screen.getByText(/445 sur 775/)).toBeInTheDocument();
    expect(
      screen.getByText(/311 fiches ne déclarent rien/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/311 fiches de peuple sur 775 ne déclarent aucun statut/)
    ).toBeInTheDocument();
  });

  // @req REQ-113
  it("scopes the page to the Dossiers accent exactly once", async () => {
    const { container } = render(await NommerPage({ params: FR }));
    expect(container.querySelectorAll("[class*='afh-accent-']")).toHaveLength(
      1
    );
    expect(container.querySelector(".afh-accent-teal")).not.toBeNull();
  });
});
