import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ACCENT_CLASS_BY_ENTITY, FicheSequence } from "../FicheSequence";
import { FICHE_RECORD_ANCHOR } from "@/lib/ficheChapters";
import type { FicheEntityType } from "@/types/fiche";

const RECORD = <p>Dossier AFRIK complet</p>;

const ENTITY_TYPES: readonly FicheEntityType[] = [
  "people",
  "country",
  "language-family",
];

function sectionIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("section[id]")).map(
    (section) => section.id
  );
}

describe("FicheSequence — accent scope", () => {
  // @req REQ-091
  it.each([
    ["people", "afh-accent-ocre"],
    ["country", "afh-accent-teal"],
    ["language-family", "afh-accent-perv"],
  ] as const)(
    "scopes the %s fiche to its own accent class",
    (entityType, expectedClass) => {
      const { container } = render(
        <FicheSequence entityType={entityType} record={RECORD} />
      );

      expect(ACCENT_CLASS_BY_ENTITY[entityType]).toBe(expectedClass);
      expect(
        (container.firstElementChild as HTMLElement).classList.contains(
          expectedClass
        )
      ).toBe(true);
    }
  );

  // @req REQ-091
  it("never scopes a fiche to terre, the reserved colonial-marker accent", () => {
    expect(Object.values(ACCENT_CLASS_BY_ENTITY)).not.toContain(
      "afh-accent-terre"
    );
  });

  // The charter's other half of this rule — that --accent resolves through the
  // categorical tokens and never through a hex — is asserted on the
  // stylesheets in charterTokens.test.ts. This is the component-side half: the
  // element carrying the scope must not paint around it.
  // @req REQ-091
  it("paints through the accent tokens, never a colour literal", () => {
    const { container } = render(
      <FicheSequence
        entityType="country"
        record={RECORD}
        title={<h1>Nigéria</h1>}
      />
    );

    const html = container.innerHTML;
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(html).not.toMatch(/rgba?\(|hsl\(/);
  });

  // @req REQ-091
  it("uses accent classes that the token stylesheet actually defines", () => {
    const colorCss = readFileSync(
      join(process.cwd(), "src/styles/tokens/color.css"),
      "utf8"
    );

    for (const accentClass of Object.values(ACCENT_CLASS_BY_ENTITY)) {
      const rule = colorCss.match(
        new RegExp(`\\.${accentClass}\\s*\\{([\\s\\S]*?)\\}`)
      )?.[1];
      expect(rule, `${accentClass} is not defined in color.css`).toBeDefined();
      expect(rule).toMatch(/--accent:\s*var\(--afh-cat-[\w-]+\);/);
      expect(rule).toMatch(/--accent-tint:\s*var\(--afh-cat-[\w-]+-tint\);/);
    }
  });
});

describe("FicheSequence — one globe, one parchment", () => {
  // The engine this shell grew out of composed a chapter sequence around the
  // dossier. Every entity's inventory is the dossier alone now, so the shell
  // emits exactly one section — and a second one appearing here means a
  // chapter has come back beside a parchment that already says what it says.
  // @req REQ-091
  it.each(ENTITY_TYPES)(
    "emits the dossier and nothing else for %s",
    (entityType) => {
      const { container } = render(
        <FicheSequence entityType={entityType} record={RECORD} />
      );

      expect(sectionIds(container)).toEqual([FICHE_RECORD_ANCHOR]);
      expect(screen.getAllByText("Dossier AFRIK complet")).toHaveLength(1);
    }
  );

  // The dossier is what the reader came for. A chevron over it is what made
  // these fiches look nothing like their mockup: a globe, then a closed gate.
  // @req REQ-091
  it("opens the dossier unfolded, with no reading gate", () => {
    const { container } = render(
      <FicheSequence entityType="people" record={RECORD} />
    );

    expect(container.querySelectorAll("details")).toHaveLength(0);
    expect(
      screen.queryByText("Lire le dossier complet")
    ).not.toBeInTheDocument();
  });

  // @req REQ-091
  it("keeps the record anchor the globe's facts panel links to", () => {
    const { container } = render(
      <FicheSequence entityType="people" record={RECORD} />
    );

    const record = container.querySelector(`#${FICHE_RECORD_ANCHOR}`);
    expect(record).not.toBeNull();
    expect(record!.textContent).toContain("Dossier AFRIK complet");
  });

  // @req REQ-091
  it("renders no section at all for a fiche with no dossier", () => {
    const { container } = render(
      <FicheSequence entityType="country" record={null} />
    );

    expect(sectionIds(container)).toEqual([]);
  });
});

describe("FicheSequence — measures and order", () => {
  // A parchment carries its own reading measure and the globe runs edge to
  // edge; a column around either would apply a second, wider measure on top.
  // @req REQ-091
  it("leaves the globe and the dossier out of any measured column", () => {
    const { container } = render(
      <FicheSequence
        entityType="country"
        record={RECORD}
        globe={<div data-testid="globe-stage" />}
      />
    );

    const root = container.firstElementChild;
    const globe = screen.getByTestId("globe-stage");
    const record = container.querySelector(`#${FICHE_RECORD_ANCHOR}`);

    expect(globe.parentElement).toBe(root);
    expect(record?.parentElement).toBe(root);
  });

  // The head is the one thing that *is* measured: it stands in a band four
  // columns wide, not in the parchment's own measure.
  // @req REQ-091
  it("measures the title band, and only the title band", () => {
    const { container } = render(
      <FicheSequence
        entityType="people"
        record={RECORD}
        title={<h1>Yoruba</h1>}
        globe={<div data-testid="globe-stage" />}
      />
    );

    const measured = container.querySelectorAll(".max-w-4xl");
    expect(measured).toHaveLength(1);
    expect(measured[0].querySelector("h1")?.textContent).toBe("Yoruba");
  });

  // The head used to sit inside the parchment, below a band some 520px tall,
  // so a reader arriving on a fiche saw a globe and no indication of which
  // fiche they were on. Order is the fix, and this is what holds it.
  // @req REQ-091
  it("opens on the head, then the globe, and closes on the dossier", () => {
    const { container } = render(
      <FicheSequence
        entityType="people"
        record={RECORD}
        title={<h1>Yoruba</h1>}
        globe={<div data-testid="globe-stage" />}
      />
    );

    const children = Array.from(container.firstElementChild!.children);
    const titleBand = container.querySelector("[data-fiche-title-band]");

    expect(children.indexOf(titleBand as Element)).toBe(0);
    expect(children.indexOf(screen.getByTestId("globe-stage"))).toBe(1);
    expect(children.indexOf(container.querySelector("section")!)).toBe(
      children.length - 1
    );
  });
});
