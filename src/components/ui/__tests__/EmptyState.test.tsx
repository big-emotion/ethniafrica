import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/ui/EmptyState";

// Mock next/link
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("EmptyState", () => {
  it("renders default message without exclamation marks", () => {
    const { container } = render(<EmptyState message="Aucun résultat" />);
    expect(container.textContent).not.toContain("!");
    expect(container.textContent).not.toMatch(/[Oo]ops/);
  });

  it("renders no emoji characters", () => {
    const { container } = render(<EmptyState message="Aucun résultat" />);
    // Emoji unicode range check (basic multilingual plane)
    expect(container.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  it("applies afh-bg-warm and afh-text-soft token classes", () => {
    const { container } = render(<EmptyState message="Rien" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("bg-afh-bg-warm");
    expect(el.className).toContain("text-afh-text-soft");
  });

  it("renders search-context variant with FLG browse link", () => {
    render(<EmptyState message="Aucun résultat" variant="search" lang="fr" />);
    const link = screen.getByRole("link");
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toContain("familles");
  });

  it("renders children slot when provided", () => {
    render(
      <EmptyState message="Rien">
        <button>Action</button>
      </EmptyState>
    );
    expect(screen.getByRole("button", { name: "Action" })).toBeTruthy();
  });
});
