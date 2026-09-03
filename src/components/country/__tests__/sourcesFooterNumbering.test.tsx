import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SourcesFooter } from "@/components/country/SourcesFooter";
import type { FicheSourceEntry } from "@/lib/afrik/ficheSourceLabel";

/**
 * The foot of a fiche, once a note callout has something to point at.
 *
 * The same component serves all three fiches, and only the people fiche carries
 * callouts today — so the unnumbered rendering is not a legacy path to tolerate,
 * it is the correct one for country and family, and it has to stay byte-stable
 * while the numbered one is added beside it.
 */

const entry = (
  label: string,
  extra: Partial<FicheSourceEntry> = {}
): FicheSourceEntry => ({
  label,
  url: null,
  standing: "referenced",
  ...extra,
});

describe("SourcesFooter numbering", () => {
  /**
   * Country and family declare sources and cite none of them from the prose.
   * Numbering a bibliography nothing points at would promise a link that does
   * not exist.
   */
  // @req REQ-092
  it("stays an unordered list when no source carries a number", () => {
    const { container } = render(
      <SourcesFooter sources={[entry("Ethnologue"), entry("Glottolog")]} />
    );

    expect(container.querySelector("ul")).not.toBeNull();
    expect(container.querySelector("ol")).toBeNull();
    expect(container.querySelector("[id^='source-']")).toBeNull();
  });

  // @req REQ-092
  it("becomes an ordered list once the sources are numbered", () => {
    const { container } = render(
      <SourcesFooter
        sources={[
          entry("Ethnologue", { number: 1 }),
          entry("Glottolog", { number: 2 }),
        ]}
      />
    );

    expect(container.querySelector("ol")).not.toBeNull();
    expect(container.querySelector("ul")).toBeNull();
  });

  /**
   * The anchor is the whole point: a callout links to `#source-2`, so the entry
   * has to be addressable and the number has to be the one the callout printed.
   */
  // @req REQ-092
  it("gives each numbered source the anchor its callout links to", () => {
    const { container } = render(
      <SourcesFooter
        sources={[
          entry("Ethnologue", { number: 1 }),
          entry("Glottolog", { number: 2 }),
        ]}
      />
    );

    expect(container.querySelector("#source-1")).not.toBeNull();
    expect(container.querySelector("#source-2")).not.toBeNull();
  });

  // @req REQ-092
  it("prints the number the callout printed, not the list's own counter", () => {
    render(
      <SourcesFooter sources={[entry("A cited source", { number: 4 })]} />
    );

    expect(screen.getByText("4.")).toBeInTheDocument();
  });

  /**
   * The doctrine the component was built on: a fiche rests on sources of
   * different strengths, and one verdict over the list makes the strongest and
   * the weakest read alike. Numbering must not quietly collapse that.
   */
  // @req REQ-092
  it("keeps the standing per entry once numbered", () => {
    render(
      <SourcesFooter
        sources={[
          entry("Official one", { number: 1, standing: "official" }),
          entry("Untiered one", { number: 2, standing: "needs_review" }),
        ]}
      />
    );

    expect(screen.getByText("Officielle")).toBeInTheDocument();
    expect(screen.getByText("En attente d'examen")).toBeInTheDocument();
    expect(screen.queryByText("Non vérifiée")).not.toBeInTheDocument();
  });
});
