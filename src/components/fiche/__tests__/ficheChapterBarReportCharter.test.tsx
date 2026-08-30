/**
 * The reading rail's report control (moderation charter §3).
 *
 * The charter's rule is one sentence: "A report control is reachable at every
 * moment of the reading, and it knows what is being read." It was written, and
 * then not built — every report control in the product stayed bolted to a
 * single chapter of the parchment, so a reader who found an error in chapter
 * two had to scroll to chapter seven to say so, and arrived at a dialog naming
 * the wrong section.
 *
 * The charter also rules out the obvious alternative, and these tests hold the
 * line on it: a floating button would be reachable and context-free, which
 * hands the "which part?" question back to the reader — the thing §1 forbids.
 * So the control rides the rail, which already knows the chapter in view.
 *
 * Named `…Charter` so `test:charter-contracts` picks it up
 * (scripts/charterContractManifest.ts discovers on the filename).
 *
 * Its own file rather than a block inside `ficheChapterBarCharter.test.tsx`:
 * mounting the report control pulls in the dialog, the auth client and the
 * consent hook, and that suite's premise is a rail driven through the rendered
 * document with nothing stubbed.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FicheChapterBar } from "@/components/fiche/FicheChapterBar";

vi.mock("@/lib/supabase/auth-client", () => ({
  createBrowserSupabaseClient: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/use-consent", () => ({
  useOptionalConsent: () => null,
}));

/**
 * The real gate fetches a challenge and starts a worker. Neither belongs in a
 * suite about where the control stands and what it aims at.
 */
vi.mock("@/components/flags/ProofOfWorkGate", () => ({
  ProofOfWorkGate: () => null,
}));

/** Drives the scrollspy by hand — happy-dom has no layout to intersect with. */
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

const THREE_CHAPTERS = [
  chapter("Le nom porté", "chapitre-le-nom-porte"),
  chapter("Langue", "chapitre-langue"),
  chapter("Culture et société", "chapitre-culture-et-societe"),
].join("");

/** A fiche as FicheSequence renders one: the rail, then the chapters. */
function renderFiche(entity?: { entityId: string; entityName: string }) {
  return render(
    <div data-fiche-sequence="">
      <FicheChapterBar {...entity} />
      <div dangerouslySetInnerHTML={{ __html: THREE_CHAPTERS }} />
    </div>
  );
}

const SOUTH_AFRICA = { entityId: "ZAF", entityName: "Afrique du Sud" };

/** The control as a reader finds it: a button that says what it does. */
function reportTrigger() {
  return screen.queryByRole("button", { name: "Signaler" });
}

function openReport() {
  fireEvent.click(reportTrigger()!);
}

describe("The reading rail's report control", () => {
  // @req REQ-012
  it("stands in the rail, so it is on screen wherever the reader is", () => {
    renderFiche(SOUTH_AFRICA);

    const rail = screen.getByTestId("fiche-chapter-bar");
    const trigger = reportTrigger();

    // Inside the rail is the whole claim: the rail is what stays with the
    // reader, so a control anywhere else is a control that scrolls away.
    expect(rail).toContainElement(trigger);
  });

  // @req REQ-012
  it("names the gesture rather than leaving the reader an unlabelled glyph", () => {
    renderFiche(SOUTH_AFRICA);

    // The actions charter licenses no glyph but the arrow (§7), and an arrow
    // would be wrong here — this opens a dialog, it does not depart. Querying
    // by the accessible name is the assertion: a control found this way is a
    // control that carries the word.
    expect(reportTrigger()).toBeInTheDocument();
  });

  // @req REQ-012
  it("aims at the chapter the reader is in, not the one the fiche opened on", () => {
    renderFiche(SOUTH_AFRICA);

    enter(["chapitre-langue"]);
    openReport();

    expect(screen.getByRole("dialog")).toHaveTextContent("Langue");
  });

  // @req REQ-012
  it("re-aims as the reader moves down the fiche", () => {
    renderFiche(SOUTH_AFRICA);

    enter(["chapitre-culture-et-societe"]);
    openReport();

    expect(screen.getByRole("dialog")).toHaveTextContent("Culture et société");
  });

  // @req REQ-012
  it("names the fiche as well as the chapter, so the dialog says what is reported", () => {
    renderFiche(SOUTH_AFRICA);

    enter(["chapitre-langue"]);
    openReport();

    // Without the name the dialog identified its subject as "Section de fiche"
    // and nothing else — a reader could not tell which fiche they were on.
    expect(screen.getByRole("dialog")).toHaveTextContent("Afrique du Sud");
  });

  // @req REQ-012
  it("carries no control on a document that has not said what it is about", () => {
    renderFiche();

    // A report needs a subject. A rail mounted without one is still a rail.
    expect(reportTrigger()).not.toBeInTheDocument();
  });
});
