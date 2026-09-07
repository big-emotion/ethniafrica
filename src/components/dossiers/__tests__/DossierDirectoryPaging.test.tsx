import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DossierDirectory } from "@/components/dossiers/DossierDirectory";
import { getLocalizedRoute } from "@/lib/routing";
import { HUB_PAGE_SIZE } from "@/lib/dossiers/paging";
import type { DossierIndexEntry } from "@/lib/dossiers/menu";

// Composed, never written out — see routeLiteralCharter.
const HUB = getLocalizedRoute("fr", "dossiersHub");

vi.mock("next/navigation", () => ({
  usePathname: () => HUB,
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(cleanup);

/**
 * A corpus of the size the axis is heading for.
 *
 * The real one holds seven readings and every one of them is withdrawn, so the
 * hub renders its frozen notice and nothing else — which means the behaviour
 * this suite is about could not be observed on it at all. Building the corpus
 * is what makes the index testable before the editorial wave that needs it.
 */
const corpusOf = (count: number): DossierIndexEntry[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `DOS_TEST_${index}`,
    href: `${HUB}/test-${index}`,
    title: `Dossier ${index}`,
    summary: `Ce que dit le dossier ${index}.`,
    rubric: "territoires" as const,
    offered: true,
    publishedOn: "2026-01-01",
  }));

describe("the dossiers hub as an index (REQ-108)", () => {
  // @req REQ-108
  it("shows one page of readings, not the whole corpus", () => {
    render(<DossierDirectory language="fr" corpus={corpusOf(120)} />);

    // Scoped to the list: the anecdotes aside beside it carries an h2 of its
    // own, and it is not one of the readings being paged through.
    const list = screen.getByRole("region", { name: "Dossiers à lire" });

    expect(within(list).getAllByRole("heading", { level: 2 })).toHaveLength(
      HUB_PAGE_SIZE
    );
    expect(screen.getByRole("status")).toHaveTextContent("120 dossiers à lire");
  });

  // The count states the extent of the selection, and the pager states where
  // in it the reader is. A hub that showed twelve of a hundred and twenty
  // without saying so would read as a corpus of twelve.
  // @req REQ-108
  it("says how far into the list the reader is", () => {
    render(<DossierDirectory language="fr" corpus={corpusOf(120)} />);

    expect(screen.getByText("Page 1 sur 10")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
    expect(screen.getByText("Page 2 sur 10")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dossier 12" })).toBeVisible();
  });

  // Both ends stay in place rather than disappearing: a control that vanishes
  // moves the one beside it under the reader's cursor.
  // @req REQ-108
  it("disables the step it cannot take instead of removing it", () => {
    render(<DossierDirectory language="fr" corpus={corpusOf(120)} />);

    expect(screen.getByRole("button", { name: "Précédent" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Suivant" })).toBeEnabled();
  });

  // A search that left the reader on page four of its own results would show
  // an empty list and no reason for it.
  // @req REQ-108
  it("returns to the first page when the search changes", () => {
    render(<DossierDirectory language="fr" corpus={corpusOf(120)} />);
    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
    expect(screen.getByText("Page 2 sur 10")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Dossier 1" },
    });

    expect(screen.getByText(/^Page 1 sur/)).toBeInTheDocument();
  });

  // A corpus short enough to read at once gets no pager: a control offering
  // one page is a control that cannot be used.
  // @req REQ-108
  it("shows no pager when the whole list fits on one page", () => {
    render(<DossierDirectory language="fr" corpus={corpusOf(3)} />);

    expect(screen.queryByRole("button", { name: "Suivant" })).toBeNull();
  });

  // A withdrawn reading is not listed at all here — the hub is the index of
  // what can be read, and the menu is where a reading in preparation is
  // announced.
  // @req REQ-114
  it("lists no dossier the corpus has not published", () => {
    const withdrawn = corpusOf(20).map((entry) => ({
      ...entry,
      offered: false,
    }));
    render(<DossierDirectory language="fr" corpus={withdrawn} />);

    expect(screen.queryByRole("heading", { name: "Dossier 0" })).toBeNull();
  });
});
