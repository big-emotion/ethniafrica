import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SectionHeading } from "@/components/home/SectionHeading";

const STYLESHEET = readFileSync(
  join(process.cwd(), "src/styles/section-heading.css"),
  "utf8"
);

/**
 * The home carried two spellings of the same heading unit (SynthesisRail,
 * DidYouKnow) and three sections with no heading at all. Three more
 * hand-set copies would have made five spellings of one idea, so the unit
 * is a component: every section on the page states its name the same way,
 * or the divergence is a diff rather than a thing a reader notices.
 */
describe("SectionHeading — the one heading unit every home section uses", () => {
  // @req REQ-113
  it("names the section in an h2, one level under the page's h1", () => {
    render(
      <SectionHeading eyebrow="Le jeu du mois" title="Un jeu, mis en avant." />
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Un jeu, mis en avant." })
    ).toBeInTheDocument();
  });

  // The eyebrow files the section; it is not a rung of the outline. Marked
  // up as a heading it would push every item under it to h4 and read to a
  // screen reader as two titles for one section.
  // @req REQ-113
  it("renders the eyebrow as text, never as a second heading", () => {
    render(
      <SectionHeading eyebrow="Le jeu du mois" title="Un jeu, mis en avant." />
    );

    expect(screen.getByText("Le jeu du mois")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Le jeu du mois" })
    ).toBeNull();
  });

  // @req REQ-113
  it("omits the eyebrow entirely when a section files itself by its title alone", () => {
    const { container } = render(<SectionHeading title="Un titre seul." />);

    expect(container.querySelector(".afh-section-heading-eyebrow")).toBeNull();
  });

  // The mirror of the case above: a section whose items are its own subjects
  // takes no group title. Forcing one on the anecdote band produced a
  // sentence about two facts drawn at random, true of neither.
  // @req REQ-113
  it("omits the title when the section's items carry the headings", () => {
    render(<SectionHeading centred eyebrow="Saviez-vous que" />);

    expect(screen.getByText("Saviez-vous que")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  // The whole point of the unit: a section title cannot be mistaken for
  // body copy. Fraunces against Nunito Sans is the difference, and it has
  // to be asserted on the token, not on a computed style happy-dom does
  // not resolve.
  // @req REQ-113
  it("sets the title in the display family, never the body family", () => {
    expect(STYLESHEET).toMatch(
      /\.afh-section-heading-title\s*{[^}]*font-family:\s*var\(--afh-font-display\)/
    );
    expect(STYLESHEET).not.toMatch(
      /\.afh-section-heading-title\s*{[^}]*var\(--afh-font-body\)/
    );
  });

  // A section title outranks the item titles beneath it. The three purpose
  // slices and the three axis cards both sit at --afh-text-h2, so the
  // section above them takes the step over that — otherwise the group
  // heading reads as one more sibling.
  // @req REQ-113
  it("sizes the title one step above the items it heads", () => {
    expect(STYLESHEET).toMatch(
      /\.afh-section-heading-title\s*{[^}]*font-size:\s*var\(--afh-text-h1\)/
    );
  });

  // An eyebrow is a role, not a size (type.css): the size token alone
  // yields a caption. The dress tokens are what make it read as filing.
  // @req REQ-113
  it("dresses the eyebrow with the role's own tokens, not just its size", () => {
    const rule = STYLESHEET.match(
      /\.afh-section-heading-eyebrow\s*{[^}]*}/
    )?.[0];

    expect(rule).toMatch(/font-size:\s*var\(--afh-text-eyebrow\)/);
    expect(rule).toMatch(/text-transform:\s*var\(--afh-eyebrow-transform\)/);
    expect(rule).toMatch(/letter-spacing:\s*var\(--afh-eyebrow-tracking\)/);
    expect(rule).toMatch(/font-family:\s*var\(--afh-font-mono\)/);
  });

  // No literal colour, per the token doctrine: the eyebrow takes whichever
  // accent its section was rendered under, the way HeroProvenanceChip does.
  // @req REQ-113
  it("takes its accent from the section around it rather than naming a colour", () => {
    const rule = STYLESHEET.match(
      /\.afh-section-heading-eyebrow\s*{[^}]*}/
    )?.[0];

    expect(rule).toMatch(/color:\s*var\(--accent-ink\)/);
    expect(rule).not.toMatch(/#[0-9a-f]{3,8}/i);
  });

  // Brand charter §8.5 leaves the anecdote band with an eyebrow and no title,
  // so the kicker is the only heading text the band has. Dressed at the 12 px
  // it wears above a title, it sat two and a half times smaller than the body
  // copy it governed and read as a stray caption between two articles — the
  // reader never registered the two facts as one section.
  // @req REQ-113
  it("marks a unit that files a section with no title", () => {
    const { container } = render(<SectionHeading eyebrow="Saviez-vous que" />);

    expect(
      container.querySelector(".afh-section-heading.is-untitled")
    ).not.toBeNull();
  });

  // @req REQ-113
  it("leaves a unit that has a title to carry the section unmarked", () => {
    const { container } = render(
      <SectionHeading eyebrow="Le jeu du mois" title="Un jeu, mis en avant." />
    );

    expect(container.querySelector(".is-untitled")).toBeNull();
  });

  // @req REQ-113
  it("raises the lone eyebrow to the small role so it carries the section", () => {
    const rule = STYLESHEET.match(
      /\.afh-section-heading\.is-untitled\s+\.afh-section-heading-eyebrow\s*{[^}]*}/
    )?.[0];

    expect(rule).toMatch(/font-size:\s*var\(--afh-text-small\)/);
  });

  // The guard on the rule above. §8.5 forbids the eyebrow inheriting the
  // title's rank, and typography-charter §3 calls a kicker painted at a
  // heading role a lie rather than a divergence — a later "make it bigger"
  // must not walk this token up the scale until the band grows a title it
  // is not allowed to have.
  // @req REQ-113
  it("never paints the lone eyebrow at a heading role", () => {
    const rule = STYLESHEET.match(
      /\.afh-section-heading\.is-untitled\s+\.afh-section-heading-eyebrow\s*{[^}]*}/
    )?.[0];

    expect(rule).not.toMatch(/--afh-text-(hero|h1|h2|h3|lead)/);
  });

  // The size moves; the dress does not. Overriding the size in a second rule
  // is only safe while the base rule still supplies uppercase, weight and
  // tracking — take those away and the caller has written a caption.
  // @req REQ-113
  it("keeps the lone eyebrow in the eyebrow dress it overrides the size of", () => {
    const rule = STYLESHEET.match(
      /\.afh-section-heading\.is-untitled\s+\.afh-section-heading-eyebrow\s*{[^}]*}/
    )?.[0];

    expect(rule).not.toMatch(/text-transform|letter-spacing|font-family/);
  });
});
