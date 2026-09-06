import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DossierPage } from "../DossierPage";
import { getDossierBySlug } from "@/lib/dossiers/corpus";
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));
describe("shared narrative reader", () => {
  // @req REQ-114
  it("omits empty quantitative and comparison sections", () => {
    const dossier = structuredClone(getDossierBySlug("royaume-kongo")!);
    dossier.thesis.figures = [];
    dossier.chapters.forEach((chapter) => {
      chapter.readings = [];
      chapter.illustration = null;
    });
    const { container } = render(
      <DossierPage dossier={dossier} language="fr" />
    );
    expect(container.querySelector(".afh-dossier-thesis")).toBeNull();
    expect(container.querySelector(".afh-dossier-readings")).toBeNull();
    expect(screen.getByText(dossier.chapters[0].title)).toBeVisible();
  });
  // @req REQ-140 @req REQ-114
  it("links citations to declared sources and localises the reader labels", () => {
    const { container } = render(
      <DossierPage
        dossier={getDossierBySlug("royaume-kongo", "en")!}
        language="en"
        translationState="machine"
      />
    );
    expect(screen.getByText("Machine translation from French")).toBeVisible();
    expect(screen.getByText("Chapter 01")).toBeVisible();
    const citations = container.querySelectorAll("a[data-dossier-citation]");
    expect(citations.length).toBeGreaterThan(5);
    citations.forEach((link) =>
      expect(container.querySelector(link.getAttribute("href")!)).not.toBeNull()
    );
  });
});
