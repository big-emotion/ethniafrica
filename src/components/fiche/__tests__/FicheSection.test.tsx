/**
 * A chapter has to be addressable before a reading rail can point at it.
 *
 * Until now only `Sources` carried an anchor, because only `Sources` had a
 * deep link pointing at it from elsewhere. Every other chapter was
 * unreachable by URL: a reader could not send anyone the paragraph they were
 * reading, and the rail above the parchment would have had nowhere to scroll.
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FicheSection } from "@/components/fiche/FicheSection";
import { chapterAnchorId } from "@/lib/ficheChapters";

describe("FicheSection", () => {
  // @req REQ-091
  it("anchors a chapter on its own title when the caller names none", () => {
    const { container } = render(
      <FicheSection title="Culture & spiritualité">contenu</FicheSection>
    );

    expect(container.querySelector("section")?.id).toBe(
      chapterAnchorId("Culture & spiritualité")
    );
  });

  // @req REQ-091
  it("leaves an explicit anchor alone, because the app deep-links to it", () => {
    const { container } = render(
      <FicheSection title="Sources" as="footer" id="sources">
        contenu
      </FicheSection>
    );

    expect(container.querySelector("footer")?.id).toBe("sources");
  });

  // @req REQ-091
  it("keeps announcing its title on the attribute the rail reads", () => {
    const { container } = render(
      <FicheSection title="Langue">contenu</FicheSection>
    );

    expect(
      container.querySelector("section")?.getAttribute("data-fiche-section")
    ).toBe("Langue");
  });

  // @req REQ-091
  it("labels the chapter by its own heading, so the anchor lands on a named landmark", () => {
    const { container } = render(
      <FicheSection title="Rôle historique">contenu</FicheSection>
    );

    const section = container.querySelector("section");
    expect(section?.getAttribute("aria-labelledby")).toBe(
      section?.querySelector("h2")?.id
    );
  });
});
