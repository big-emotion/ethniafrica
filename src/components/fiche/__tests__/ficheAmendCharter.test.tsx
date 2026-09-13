import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { CountryRecordView } from "@/components/country/CountryRecordView";
import { PeopleDetailViewV2 } from "@/components/people/PeopleDetailViewV2";
import { buttonVariants } from "@/components/ui/button";
import { getStaticPageRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

import { countryRecord, peopleRecord } from "./corpusRecords";

const parchmentCss = readFileSync(
  join(process.cwd(), "src/styles/fiche-parchment.css"),
  "utf8"
);

const onward = (
  <section data-fiche-section="Poursuivre" id="chapitre-poursuivre" />
);

const RECORDS: Array<{
  label: string;
  draw: (language: Language) => ReactElement;
}> = [
  {
    label: "people record",
    draw: (language) => (
      <PeopleDetailViewV2
        language={language}
        people={peopleRecord("PPL_OVAMBO")}
        onward={onward}
      />
    ),
  },
  {
    label: "country record",
    draw: (language) => (
      <CountryRecordView
        language={language}
        country={countryRecord("NAM")}
        onward={onward}
      />
    ),
  },
];

/**
 * "Compléter cette page" on both records, as the same component, after the
 * last chapter a reader finishes and before the way onward (operator ruling,
 * 2026-09-12). The people record never carried it: the invitation existed on
 * one record of two.
 *
 * It stays out of the chapter list. It carries no `data-fiche-section`, so
 * the reading rail does not offer an invitation among a record's chapters.
 */
describe("fiche amend charter", () => {
  afterEach(cleanup);

  for (const record of RECORDS) {
    // @req REQ-091
    it(`places one band between Culture et société and Poursuivre on the ${record.label}`, () => {
      const { container } = render(record.draw("fr"));

      const bands = screen.getAllByTestId("fiche-amend-band");
      expect(bands).toHaveLength(1);
      expect(bands[0]).not.toHaveAttribute("data-fiche-section");

      const sequence = Array.from(
        container.querySelectorAll(
          '[data-fiche-section], [data-testid="fiche-amend-band"]'
        ),
        (node) => node.getAttribute("data-fiche-section") ?? "band"
      );
      const band = sequence.indexOf("band");
      expect(sequence.slice(band - 1, band + 2)).toEqual([
        "Culture et société",
        "band",
        "Poursuivre",
      ]);
    });

    // @req REQ-091
    it(`asks for what the page is missing and links to contributing on the ${record.label}`, () => {
      render(record.draw("fr"));
      const band = screen.getByTestId("fiche-amend-band");

      expect(band).toHaveTextContent(
        "Vous connaissez un nom, une date ou une source que cette page n'a pas ? Elle est faite pour être complétée."
      );
      const action = within(band).getByRole("link", {
        name: "Compléter cette page",
      });
      expect(action).toHaveAttribute(
        "href",
        getStaticPageRoute("fr", "contribute")
      );
    });
  }

  // @req REQ-145
  it("words the band in English on an English record", () => {
    render(RECORDS[0].draw("en"));
    const band = screen.getByTestId("fiche-amend-band");

    expect(band).toHaveTextContent(
      "Know a name, a date or a source this page is missing? It is made to be completed."
    );
    expect(
      within(band).getByRole("link", { name: "Complete this page" })
    ).toHaveAttribute("href", getStaticPageRoute("en", "contribute"));
  });

  /**
   * The action is the actions charter's form C primary, drawn by the one
   * primitive that owns it rather than rebuilt in the stylesheet: the band
   * used to hand-roll an outlined control of its own.
   */
  // @req REQ-091
  it("draws its action with the shared accent button and a dashed accent frame", () => {
    render(RECORDS[0].draw("fr"));
    const action = within(screen.getByTestId("fiche-amend-band")).getByRole(
      "link"
    );
    for (const token of buttonVariants({ variant: "accent" }).split(/\s+/)) {
      expect(action.classList).toContain(token);
    }

    const frame = parchmentCss.match(/\n\.afh-amend-band\s*\{([^}]*)\}/)![1];
    expect(frame).toMatch(/border:\s*1\.5px dashed var\(--accent\)/);
    expect(frame).toMatch(/border-radius:\s*var\(--afh-radius-lg\)/);
    expect(parchmentCss).not.toMatch(/\.afh-amend-band-hint/);
  });
});
