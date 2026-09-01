import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorPage from "@/app/[lang]/error";
import { pickDidYouKnowFact } from "@/lib/home/didYouKnowFacts";

describe("ErrorPage ([lang]/error)", () => {
  const mockError = new Error("test error") as Error & { digest?: string };
  mockError.digest = "abc123";

  it("renders calm French heading Une erreur est survenue", () => {
    render(<ErrorPage error={mockError} reset={() => {}} />);
    const heading = screen.getByRole("heading");
    expect(heading.textContent).toContain("Une erreur est survenue");
    expect(heading.textContent).not.toContain("!");
  });

  it("renders a Réessayer retry button", () => {
    render(<ErrorPage error={mockError} reset={() => {}} />);
    expect(screen.getByRole("button", { name: /réessayer/i })).toBeTruthy();
  });

  it("calls reset when retry button is clicked", () => {
    const reset = vi.fn();
    render(<ErrorPage error={mockError} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: /réessayer/i }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("renders an error reference element", () => {
    render(<ErrorPage error={mockError} reset={() => {}} />);
    expect(screen.getByRole("button", { name: /copier/i })).toBeTruthy();
  });

  // @req REQ-099
  it("draws one anecdote for each display and keeps it stable", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const expected = pickDidYouKnowFact(() => 0);
    const { rerender } = render(
      <ErrorPage error={mockError} reset={() => {}} />
    );

    expect(expected).not.toBeNull();
    expect(screen.getByTestId("error-anecdote").textContent).toContain(
      expected?.headline
    );

    random.mockReturnValue(0.99);
    rerender(<ErrorPage error={mockError} reset={() => {}} />);

    expect(screen.getByTestId("error-anecdote").textContent).toContain(
      expected?.headline
    );
    expect(random).toHaveBeenCalledOnce();
    random.mockRestore();
  });

  it("renders no exclamation marks in default copy", () => {
    const { container } = render(
      <ErrorPage error={mockError} reset={() => {}} />
    );
    expect(container.textContent).not.toContain("!");
  });
});
