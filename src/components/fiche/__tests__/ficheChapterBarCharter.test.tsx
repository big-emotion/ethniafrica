/**
 * The reading rail's contract (atlas charter §7).
 *
 * A fiche is one long document with no chrome of its own: past the globe, a
 * reader had nothing telling them where in the fiche they had arrived, and no
 * way back to a chapter they had passed. The rail is that missing instrument.
 *
 * Named `…Charter` so `test:charter-contracts` picks it up
 * (scripts/charterContractManifest.ts discovers on the filename).
 *
 * These tests drive the rail the way a reader does — through the rendered
 * document — because the rail's whole premise is that the document is the
 * source of truth about its own chapters. A test that fed it a chapter list
 * would be testing a rail that does not exist.
 */

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FicheChapterBar } from "@/components/fiche/FicheChapterBar";

/**
 * Drives the scrollspy by hand: happy-dom has no layout, so nothing would
 * ever intersect on its own. `enter` is what a real observer reports when a
 * chapter crosses the rail's reading band.
 */
let enter: (ids: string[]) => void;

beforeEach(() => {
  let observed: Element[] = [];
  let report: IntersectionObserverCallback;

  class ObserverStub {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds = [];
    constructor(callback: IntersectionObserverCallback) {
      report = callback;
    }
    observe(element: Element) {
      observed.push(element);
    }
    unobserve() {}
    disconnect() {
      observed = [];
    }
    takeRecords() {
      return [];
    }
  }

  vi.stubGlobal("IntersectionObserver", ObserverStub);

  enter = (ids) => {
    const entries = observed.map((element) => ({
      target: element,
      isIntersecting: ids.includes(element.id),
    })) as unknown as IntersectionObserverEntry[];
    act(() => report(entries, null as unknown as IntersectionObserver));
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function chapter(title: string, id: string) {
  return `<section data-fiche-section="${title}" id="${id}"><h2>${title}</h2></section>`;
}

/** A fiche as FicheSequence renders one: the rail, then the chapters. */
function renderFiche(chapters: string[]) {
  return render(
    <div data-fiche-sequence="">
      <FicheChapterBar />
      <div
        data-testid="parchment"
        dangerouslySetInnerHTML={{ __html: chapters.join("") }}
      />
    </div>
  );
}

const THREE_CHAPTERS = [
  chapter("Le nom porté", "chapitre-le-nom-porte"),
  chapter("Langue", "chapitre-langue"),
  chapter("Sources", "sources"),
];

function openSummary() {
  fireEvent.click(screen.getByTestId("fiche-chapter-bar-toggle"));
}

describe("FicheChapterBar", () => {
  // @req REQ-091
  it("lists every chapter the fiche declares, in reading order", () => {
    renderFiche(THREE_CHAPTERS);
    openSummary();

    const entries = within(
      screen.getByTestId("fiche-chapter-bar-summary")
    ).getAllByRole("link");

    expect(entries.map((entry) => entry.textContent)).toEqual([
      "Le nom porté",
      "Langue",
      "Sources",
    ]);
  });

  // @req REQ-091
  it("links each entry to the anchor its chapter carries", () => {
    renderFiche(THREE_CHAPTERS);
    openSummary();

    expect(
      within(screen.getByTestId("fiche-chapter-bar-summary"))
        .getAllByRole("link")
        .map((entry) => entry.getAttribute("href"))
    ).toEqual(["#chapitre-le-nom-porte", "#chapitre-langue", "#sources"]);
  });

  // @req REQ-091
  it("names the chapter the reader is in, not the one they started at", () => {
    renderFiche(THREE_CHAPTERS);

    enter(["chapitre-langue"]);

    expect(screen.getByTestId("fiche-chapter-bar-current")).toHaveTextContent(
      "Langue"
    );
  });

  // @req REQ-091
  it("counts the reader's position through the fiche", () => {
    renderFiche(THREE_CHAPTERS);

    enter(["chapitre-langue"]);

    expect(screen.getByTestId("fiche-chapter-bar-count")).toHaveTextContent(
      "02 / 03"
    );
  });

  // @req REQ-091
  it("holds the last chapter it saw rather than blanking between two chapters", () => {
    renderFiche(THREE_CHAPTERS);

    enter(["chapitre-langue"]);
    enter([]);

    expect(screen.getByTestId("fiche-chapter-bar-current")).toHaveTextContent(
      "Langue"
    );
  });

  // @req REQ-091
  it("names the topmost chapter when two are on screen at once", () => {
    renderFiche(THREE_CHAPTERS);

    enter(["chapitre-langue", "sources"]);

    expect(screen.getByTestId("fiche-chapter-bar-current")).toHaveTextContent(
      "Langue"
    );
  });

  // @req REQ-091
  it("marks the current entry for a screen reader, and only that one", () => {
    renderFiche(THREE_CHAPTERS);
    enter(["chapitre-langue"]);
    openSummary();

    const current = within(screen.getByTestId("fiche-chapter-bar-summary"))
      .getAllByRole("link")
      .filter((entry) => entry.getAttribute("aria-current") === "true");

    expect(current.map((entry) => entry.textContent)).toEqual(["Langue"]);
  });

  // @req REQ-091
  it("picks up a chapter that only arrives after its fetch answers", async () => {
    const { getByTestId } = renderFiche(THREE_CHAPTERS);

    getByTestId("parchment").insertAdjacentHTML(
      "beforeend",
      chapter("Voix & récits", "chapitre-voix-recits")
    );
    await vi.waitFor(() =>
      expect(screen.getByTestId("fiche-chapter-bar-count")).toHaveTextContent(
        "/ 04"
      )
    );

    openSummary();
    expect(
      within(screen.getByTestId("fiche-chapter-bar-summary")).getByRole(
        "link",
        {
          name: "Voix & récits",
        }
      )
    ).toBeInTheDocument();
  });

  // @req REQ-091
  it("stays out of the way of a fiche with a single chapter", () => {
    renderFiche([chapter("Sources", "sources")]);

    expect(
      screen.queryByTestId("fiche-chapter-bar-toggle")
    ).not.toBeInTheDocument();
  });

  // @req REQ-091
  it("announces the summary it controls, closed until asked", () => {
    renderFiche(THREE_CHAPTERS);

    const toggle = screen.getByTestId("fiche-chapter-bar-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle.getAttribute("aria-controls")).toBe(
      screen.getByTestId("fiche-chapter-bar-summary").id
    );
  });

  // @req REQ-091
  it("closes on Escape and hands focus back to the control that opened it", () => {
    renderFiche(THREE_CHAPTERS);
    openSummary();

    fireEvent.keyDown(document, { key: "Escape" });

    const toggle = screen.getByTestId("fiche-chapter-bar-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(toggle);
  });

  // @req REQ-091
  it("closes once the reader has chosen a chapter", () => {
    renderFiche(THREE_CHAPTERS);
    openSummary();

    fireEvent.click(
      within(screen.getByTestId("fiche-chapter-bar-summary")).getByRole(
        "link",
        {
          name: "Langue",
        }
      )
    );

    expect(screen.getByTestId("fiche-chapter-bar-toggle")).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  // @req REQ-091
  it("puts the reader inside the chapter they chose, not merely beside it", () => {
    renderFiche(THREE_CHAPTERS);
    const target = document.getElementById("chapitre-langue") as HTMLElement;
    target.scrollIntoView = vi.fn();
    openSummary();

    fireEvent.click(
      within(screen.getByTestId("fiche-chapter-bar-summary")).getByRole(
        "link",
        {
          name: "Langue",
        }
      )
    );

    expect(target.scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement).toBe(target);
  });

  // @req REQ-091
  it("reads only its own fiche, never chapters from another document on the page", () => {
    render(
      <>
        <section data-fiche-section="Intrus" id="chapitre-intrus" />
        <div data-fiche-sequence="">
          <FicheChapterBar />
          <div dangerouslySetInnerHTML={{ __html: THREE_CHAPTERS.join("") }} />
        </div>
      </>
    );
    openSummary();

    expect(
      within(screen.getByTestId("fiche-chapter-bar-summary")).queryByRole(
        "link",
        { name: "Intrus" }
      )
    ).not.toBeInTheDocument();
  });

  // @req REQ-091
  it("still lists the chapters where the browser has no scrollspy to offer", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    renderFiche(THREE_CHAPTERS);
    openSummary();

    expect(
      within(screen.getByTestId("fiche-chapter-bar-summary")).getAllByRole(
        "link"
      )
    ).toHaveLength(3);
  });
});
