import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cleanup, render, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FicheChronologyChapter } from "@/components/fiche/FicheChronologyChapter";
import type { ParagraphNoteData } from "@/components/people/peopleFicheNotes";
import { countryChronology, peopleChronology } from "@/lib/fiche/chronology";
import {
  transformPeopleHistory,
  transformPeopleOrigins,
} from "@/lib/peopleDataTransformer";

import { countryRecord, peopleRecord } from "./corpusRecords";

const stylesheet = readFileSync(
  join(process.cwd(), "src/styles/fiche-parchment.css"),
  "utf8"
);

function renderNamibia() {
  const chronology = countryChronology(countryRecord("NAM"), "fr");
  return render(
    <FicheChronologyChapter
      language="fr"
      stations={chronology.stations}
      etymology={chronology.etymology}
      etymologyAnchorId="chapitre-le-nom-et-son-histoire"
    />
  );
}

/**
 * The shared history timeline, as the reader meets it on both records
 * (operator ruling, 2026-09-12): one vertical line, a dot and a rule per
 * station inked by its regime, and in each station the period, then the
 * title, then the preview.
 */
describe("fiche chronology charter", () => {
  afterEach(cleanup);

  // @req REQ-148
  it("draws one list whose stations carry their regime, in order", () => {
    const { container } = renderNamibia();
    const lists = container.querySelectorAll("ol.afh-chronology");
    expect(lists).toHaveLength(1);
    expect(
      Array.from(lists[0].children, (item) => item.getAttribute("data-regime"))
    ).toEqual(["polity", "polity", "colonial", "colonial", "modern"]);
  });

  // @req REQ-148
  it("sets the period above the title and prints it once per station", () => {
    const { container } = renderNamibia();
    for (const station of container.querySelectorAll(
      "ol.afh-chronology > li"
    )) {
      const period = station.querySelector("[data-station-period]");
      const title = station.querySelector(".afh-tile-label");
      expect(period).not.toBeNull();
      expect(
        period!.compareDocumentPosition(title!) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      const periodText = period!.textContent!;
      expect(station.textContent!.split(periodText)).toHaveLength(2);
    }
  });

  // @req REQ-154
  it("names the territory at each station and opens on the etymology", () => {
    const { container } = renderNamibia();
    const etymology = container.querySelector(
      "#chapitre-le-nom-et-son-histoire"
    );
    expect(etymology).toHaveTextContent("D'où vient le nom");
    const list = container.querySelector("ol.afh-chronology")!;
    expect(
      etymology!.compareDocumentPosition(list) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      within(list as HTMLElement).getByText("Deutsch-Südwestafrika")
    ).toBeVisible();
  });

  // @req REQ-148
  it("keys the three regimes in a legend, only for those present", () => {
    const { container } = renderNamibia();
    const legend = container.querySelector("[data-chronology-legend]");
    expect(legend).toHaveTextContent("Précolonial");
    expect(legend).toHaveTextContent("Colonial");
    expect(legend).toHaveTextContent("Contemporain");

    cleanup();
    const onlyDiaspora = render(
      <FicheChronologyChapter
        language="fr"
        stations={peopleChronology(
          { migrationRoutes: [], historicalSettlementZones: [] },
          { diaspora: "Communautés au Brésil." },
          "fr"
        )}
      />
    );
    const single = onlyDiaspora.container.querySelector(
      "[data-chronology-legend]"
    );
    expect(single).toHaveTextContent("Contemporain");
    expect(single).not.toHaveTextContent("Précolonial");
  });

  /**
   * A sourced passage keeps its citation. The preview is plain text — a
   * paragraph cannot sit in a summary — so the opened station restates the
   * passage in full with its note call, and the preview steps aside.
   */
  // @req REQ-155
  it("keeps a passage's note call and hides the preview it restates", () => {
    const people = peopleRecord("PPL_OVAMBO");
    const note: ParagraphNoteData = {
      noteNumber: 3,
      anchorId: "note-origines",
      fieldLabel: "Origines anciennes",
      assertionId: "assertion-1",
      assertionStatement: "Expansion bantoue.",
      contested: false,
      sources: [],
      numberBySourceId: {},
    };
    const { container } = render(
      <FicheChronologyChapter
        language="fr"
        stations={peopleChronology(
          transformPeopleOrigins(people.origins),
          transformPeopleHistory(people.historicalRole),
          "fr"
        )}
        notes={{ ancientOrigins: note }}
      />
    );
    const first = container.querySelector("ol.afh-chronology > li")!;
    expect(first.querySelector('[data-note-number="3"]')).not.toBeNull();
    expect(first.querySelector("details")).toHaveAttribute(
      "data-body-restates-preview",
      "true"
    );
    expect(stylesheet).toMatch(
      /\.afh-tile\[open\]\[data-body-restates-preview="true"\]\s+\.afh-tile-preview\s*\{[^}]*display:\s*none/
    );
  });

  // @req REQ-148
  it("inks each regime from its token, never a literal", () => {
    expect(stylesheet).toMatch(
      /\.afh-chronology\s*>\s*\[data-regime="polity"\]\s*\{[^}]*--afh-regime-ink:\s*var\(--afh-gold\)/
    );
    expect(stylesheet).toMatch(
      /\.afh-chronology\s*>\s*\[data-regime="colonial"\]\s*\{[^}]*--afh-regime-ink:\s*var\(--afh-colonial-ink\)/
    );
    expect(stylesheet).toMatch(
      /\.afh-chronology\s*>\s*\[data-regime="modern"\]\s*\{[^}]*--afh-regime-ink:\s*var\(--afh-conf-high\)/
    );
  });
});
