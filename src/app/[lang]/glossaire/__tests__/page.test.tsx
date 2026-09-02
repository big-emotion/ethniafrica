import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GLOSSARY_ENTRIES } from "@/lib/glossaire/entries";
import { getLocalizedRoute, getNommerChapterRoute } from "@/lib/routing";

import GlossairePage from "../page";

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

describe("the glossary page", () => {
  // The contract that rules out a filter and a disclosure: a chapter links
  // `#terme-endonyme`, so every definition has to be in the DOM and visible
  // whatever the reader has clicked. A collapsed or filtered entry would land
  // them on a heading, or on nothing.
  // @req REQ-144
  it("renders every term, its definition and its anchor at once", () => {
    const { container } = render(<GlossairePage />);

    for (const entry of GLOSSARY_ENTRIES) {
      const article = container.querySelector(`#terme-${entry.id}`);
      expect(article, entry.id).not.toBeNull();
      expect(article).toHaveTextContent(entry.fr);
      expect(article).toHaveTextContent(entry.definition.slice(0, 40));
    }
  });

  // @req REQ-144
  it("shows an example from the corpus, or says why there is none", () => {
    const { container } = render(<GlossairePage />);

    for (const entry of GLOSSARY_ENTRIES) {
      const article = container.querySelector(`#terme-${entry.id}`);
      const expected =
        entry.corpusPresence === "instantiated"
          ? entry.corpusExample
          : entry.absenceReason;

      expect(article, entry.id).toHaveTextContent(expected.slice(0, 40));
    }
  });

  // Each entry leads back into the dossier. Without it a glossary is an
  // annexe nobody returns from.
  // @req REQ-144
  it("sends a term back to the chapter that puts it to work", () => {
    const { container } = render(<GlossairePage />);
    const entry = GLOSSARY_ENTRIES.find((candidate) => candidate.chapterRef);

    const link = container
      .querySelector(`#terme-${entry.id}`)
      ?.querySelector("a");

    expect(link).toHaveAttribute(
      "href",
      getNommerChapterRoute("fr", entry.chapterRef)
    );
  });

  // The first draft announced "Trente termes" over thirty-one entries. A count
  // written in prose beside the list it describes is a count that goes wrong
  // the next time the list changes, and on this page the copy has to hold.
  // @req REQ-144
  it("announces the number of terms it actually renders", () => {
    const { container } = render(<GlossairePage />);
    const rendered = container.querySelectorAll('[id^="terme-"]').length;

    expect(rendered).toBe(GLOSSARY_ENTRIES.length);
    expect(
      screen.getByText(new RegExp(`${rendered} termes`))
    ).toBeInTheDocument();
  });

  // @req REQ-144
  it("offers the three families as anchors, not as controls", () => {
    render(<GlossairePage />);
    const rail = screen.getByRole("navigation", {
      name: "Les trois familles",
    });

    expect(rail.querySelectorAll("button")).toHaveLength(0);
    expect(rail.querySelectorAll("a")).toHaveLength(3);
  });

  // @req REQ-144
  it("scopes the page to one accent and lives at the root, on no axis", () => {
    const { container } = render(<GlossairePage />);

    expect(container.querySelectorAll("[class*='afh-accent-']")).toHaveLength(
      1
    );
    expect(getLocalizedRoute("fr", "glossary")).toBe("/fr/glossaire");
  });
});
