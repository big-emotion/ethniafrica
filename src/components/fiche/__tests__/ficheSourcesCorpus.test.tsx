import { cleanup, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FicheSources } from "@/components/fiche/FicheSources";
import {
  PIPELINE_NOTE_PATTERNS,
  readerFacingNote,
  type FicheSourceEntry,
} from "@/lib/afrik/ficheSourceLabel";
import { transformCountryData } from "@/lib/countryDataTransformer";
import { transformPeopleData } from "@/lib/peopleDataTransformer";

import { allCountryRecords, allPeopleRecords } from "./corpusRecords";

interface Sweep {
  printed: number;
  withheld: number;
  leaks: string[];
  missing: string[];
}

/**
 * Renders every record's sources and holds the notes it prints to two rules:
 * no clause in the pipeline's register reaches the reader, and every note
 * that is not bookkeeping still does. Counted, so a sweep that printed
 * nothing, or withheld nothing, cannot pass by being empty.
 */
function sweep(
  records: Array<{ id: string; sources: FicheSourceEntry[] }>
): Sweep {
  const result: Sweep = { printed: 0, withheld: 0, leaks: [], missing: [] };

  for (const record of records) {
    const { container } = render(
      <FicheSources sources={record.sources} language="fr" />
    );
    const printed = Array.from(
      container.querySelectorAll("[data-source-note]"),
      (node) => node.textContent ?? ""
    );
    cleanup();

    const expected = record.sources
      .map((source) => readerFacingNote(source.notes))
      .filter((note): note is string => Boolean(note));

    result.printed += printed.length;
    result.withheld +=
      record.sources.filter((source) => source.notes?.trim()).length -
      expected.length;

    for (const note of printed) {
      const clauses = note.split(/\s*;\s*/);
      if (
        clauses.some((clause) =>
          PIPELINE_NOTE_PATTERNS.some((p) => p.test(clause))
        )
      ) {
        result.leaks.push(`${record.id}: ${note.slice(0, 80)}`);
      }
    }
    if (printed.join("\n") !== expected.join("\n")) {
      result.missing.push(record.id);
    }
  }

  return result;
}

describe("fiche sources across the corpus", () => {
  // @req REQ-092
  it("prints no pipeline note on any country record, and every other note", () => {
    const result = sweep(
      allCountryRecords().map((country) => ({
        id: country.id,
        sources: transformCountryData(country).sources,
      }))
    );

    expect(result.leaks).toEqual([]);
    expect(result.missing).toEqual([]);
    expect(result.withheld).toBeGreaterThan(0);
  }, 120_000);

  // @req REQ-092
  it("prints no pipeline note on any people record, and every other note", () => {
    const result = sweep(
      allPeopleRecords().map((people) => ({
        id: people.id,
        sources: transformPeopleData(people).sources,
      }))
    );

    expect(result.leaks).toEqual([]);
    expect(result.missing).toEqual([]);
    expect(result.withheld).toBeGreaterThan(0);
    expect(result.printed).toBeGreaterThan(0);
  }, 300_000);
});
