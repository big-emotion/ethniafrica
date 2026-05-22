import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorState } from "@/components/ui/ErrorState";

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

  it("renders no emoji or exclamation in default copy", () => {
    const { container } = render(
      <ErrorState errorRef="REF-000" onRetry={() => {}} />
    );
    expect(container.textContent).not.toContain("!");
    expect(container.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});
