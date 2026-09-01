import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorState } from "@/components/ui/ErrorState";
import type { DidYouKnowFact } from "@/lib/home/didYouKnowFacts";

const ANECDOTE: DidYouKnowFact = {
  id: "cameroun",
  headline: "Le Cameroun porte le nom d'un crustacé.",
  body: [
    "En 1472, un navigateur portugais baptise l'estuaire du Wouri Rio dos Camarões, la rivière des crevettes.",
  ],
  entities: [],
  tier: "official",
  sources: [
    {
      title: "Official history of Cameroon",
      url: "https://example.org/cameroon",
      tier: "official",
    },
  ],
};

describe("ErrorState", () => {
  it("renders calm French heading without exclamation", () => {
    render(<ErrorState errorRef="ERR123" onRetry={() => {}} />);
    const heading = screen.getByRole("heading");
    expect(heading.textContent).toContain("Une erreur est survenue");
    expect(heading.textContent).not.toContain("!");
  });

  it("renders a retry button labelled Réessayer", () => {
    render(<ErrorState errorRef="ERR123" onRetry={() => {}} />);
    expect(screen.getByRole("button", { name: /réessayer/i })).toBeTruthy();
  });

  it("calls onRetry when retry button is clicked", () => {
    const onRetry = vi.fn();
    render(<ErrorState errorRef="ERR456" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: /réessayer/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders the error reference string", () => {
    render(<ErrorState errorRef="REF-789" onRetry={() => {}} />);
    expect(screen.getByText(/REF-789/)).toBeTruthy();
  });

  it("renders a copy-reference button", () => {
    render(<ErrorState errorRef="REF-789" onRetry={() => {}} />);
    expect(screen.getByRole("button", { name: /copier/i })).toBeTruthy();
  });

  // @req REQ-099
  it("stacks the reference controls until the tablet breakpoint", () => {
    render(<ErrorState errorRef="REF-789" onRetry={() => {}} />);

    const controls = screen.getByTestId("error-reference-actions");
    expect(controls.className).toContain("flex-col");
    expect(controls.className).toContain("md:flex-row");
  });

  // @req REQ-099
  it("presents the selected anecdote as a distinct editorial aside", () => {
    render(
      <ErrorState errorRef="REF-789" onRetry={() => {}} anecdote={ANECDOTE} />
    );

    const aside = screen.getByTestId("error-anecdote");
    expect(aside.tagName).toBe("ASIDE");
    expect(aside.textContent).toContain("Le saviez-vous");
    expect(aside.textContent).toContain(ANECDOTE.headline);
    expect(aside.textContent).toContain(ANECDOTE.body[0]);
  });

  it("renders no emoji or exclamation in default copy", () => {
    const { container } = render(
      <ErrorState errorRef="REF-000" onRetry={() => {}} />
    );
    expect(container.textContent).not.toContain("!");
    expect(container.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});
