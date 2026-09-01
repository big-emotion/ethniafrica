import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DidYouKnow } from "@/components/home/DidYouKnow";
import type { DidYouKnowFact } from "@/lib/home/didYouKnowFacts";

/**
 * The « Saviez-vous que » band, held to the composition decisions it was
 * rebuilt around rather than to a screenshot.
 *
 * Four of the five are one-line CSS decisions that no rendering test in
 * happy-dom can see: happy-dom applies no stylesheet, so a title that
 * silently drops a rung, a provenance line that grows back into a second
 * eyebrow, or prose that re-centres itself at desktop width would all leave
 * every other suite green. They are read out of the component's own <style>
 * block, which is where the band keeps its dress.
 */

const FACT: DidYouKnowFact = {
  id: "berbere",
  headline:
    "« Berbère » vient du grec barbaros : celui dont on ne comprend pas la langue.",
  body: [
    "Passé au latin barbarus, le terme sert aux Romains à désigner les populations non latines d'Afrique du Nord.",
    "Le nom que ces peuples se donnent est Amazigh — Imazighen au pluriel — et il signifie « homme libre ».",
  ],
  entities: [
    { kind: "people", id: "PPL_AMAZIGH", label: "Amazigh" },
    { kind: "country", id: "MAR", label: "Maroc" },
  ],
  tier: "referenced",
  sources: [
    {
      title: "SIL Ethnologue — Amazigh",
      url: "https://www.ethnologue.com/",
      tier: "official",
    },
  ],
};

const SOURCE = readFileSync(
  resolve(process.cwd(), "src/components/home/DidYouKnow.tsx"),
  "utf8"
);

/** The declarations of one rule in the component's own <style> block. */
function ruleBody(selector: string): string {
  const match = SOURCE.match(
    new RegExp(
      `${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`
    )
  );
  if (!match) throw new Error(`Missing rule ${selector}`);
  return match[1];
}

/** Everything the component declares from a breakpoint upward. */
function fromBreakpoint(minWidth: number): string {
  const opened = SOURCE.indexOf(`@media (min-width: ${minWidth}px)`);
  if (opened === -1) throw new Error(`No @media (min-width: ${minWidth}px)`);
  const next = SOURCE.indexOf("@media", opened + 1);
  return SOURCE.slice(opened, next === -1 ? SOURCE.length : next);
}

describe("DidYouKnow — the band's composition (REQ-113)", () => {
  // @req REQ-113
  it("names and links the official source supporting the home fact", () => {
    render(<DidYouKnow language="fr" facts={[FACT]} />);

    expect(
      screen.getByRole("link", { name: "SIL Ethnologue — Amazigh" })
    ).toHaveAttribute("href", "https://www.ethnologue.com/");
  });

  // The band's only bookmarkable exit was a bare underline among five other
  // pieces of small type. The arrow is what separates a link that goes
  // somewhere from a label; it is decoration for a screen reader, which
  // already hears "lien".
  // @req REQ-113
  it("marks the exit with an arrow the accessible name does not repeat", () => {
    render(<DidYouKnow language="fr" facts={[FACT]} />);

    const exit = screen.getByRole("link", { name: "Lire d'autres anecdotes" });

    expect(exit.textContent).toContain("→");
  });

  // The motif is mood, not content: a reader who cannot see it has lost
  // nothing, and one who hears the page read aloud must not be given a field
  // of question marks to sit through.
  // @req REQ-113
  it("lays the background motif outside the accessible tree", () => {
    const { container } = render(<DidYouKnow language="fr" facts={[FACT]} />);

    const motif = container.querySelector(".home-dyk-motif");

    expect(motif).not.toBeNull();
    expect(motif).toHaveAttribute("aria-hidden", "true");
    expect(motif?.closest("article")).toBeNull();
  });

  // Mono, uppercase and tracked, the provenance line was dressed exactly like
  // the eyebrow at the top of the band — two eyebrows for one section, and the
  // louder of the two on the least important line. It stays readable content
  // (Source Tier policy) but returns to the register of a footnote.
  // @req REQ-113
  it("dresses the provenance as a footnote, not as a second eyebrow", () => {
    const tier = ruleBody(".home-dyk-tier");

    expect(tier).not.toMatch(/text-transform:\s*uppercase/);
    expect(tier).not.toMatch(/font-mono/);
  });

  // The band held the only override of the section-heading scale on the home.
  // Dropping it puts the fact back on the rung every other section title takes,
  // which is the point of having a shared unit at all.
  // @req REQ-113
  it("gives the fact the shared heading unit's own rung", () => {
    expect(SOURCE).not.toMatch(
      /\.afh-section-heading-title\s*\{[^}]*font-size/
    );
  });

  // Six centred lines is a poster, not a paragraph. Below the tablet floor the
  // measure is short enough that centring composes (src/styles/mobile-text.css);
  // above it the prose takes the left edge and the band stops being one
  // undifferentiated cone of text.
  // @req REQ-113
  it("releases the prose from the centre once the measure earns it", () => {
    const tablet = fromBreakpoint(768);

    expect(tablet).toMatch(/\.home-dyk-prose\s*\{[^}]*text-align:\s*left/);
  });
});
