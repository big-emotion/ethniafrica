import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuizSessionWait } from "@/components/quiz/QuizSessionWait";
import { ACCENT_BY_ACCESS_MODE } from "@/lib/hubs/moduleRegistry";

/**
 * The wait of a quiz session, as opposed to the wait of a page.
 *
 * The session is fetched client-side once a track is chosen, so no route
 * boundary covers it and `loaderCoverage.test.ts` — which audits `loading.tsx`
 * files — never saw it. It shipped as a bare `AfricaTraceLoader`: no fact, and
 * no accent scope, which is the same defect `PageLoadingScreen` documents —
 * outside an `.afh-accent-*` wrapper `var(--accent)` resolves to shadcn's bare
 * HSL triplet, `fill` cannot read it, and the continent paints black.
 */
describe("QuizSessionWait", () => {
  // @req REQ-103
  it("announces that the session is what the player is waiting for", () => {
    render(<QuizSessionWait />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Chargement de la session"
    );
  });

  // @req REQ-113
  it("spends the wait on a fact rather than on a bare continent", () => {
    render(<QuizSessionWait />);

    expect(screen.getByText("Saviez-vous que")).toBeInTheDocument();
  });

  // @req REQ-104
  it("inks the continent in the accent of the axis it waits on", () => {
    const { container } = render(<QuizSessionWait />);

    expect(container.querySelector(".afh-dykl")?.parentElement).toHaveClass(
      ACCENT_BY_ACCESS_MODE.jeux
    );
  });

  // @req REQ-104
  it("draws no chrome of its own, since the page shell above it stays mounted", () => {
    render(<QuizSessionWait />);

    expect(screen.queryByRole("banner")).toBeNull();
    expect(screen.queryByRole("contentinfo")).toBeNull();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });
});
