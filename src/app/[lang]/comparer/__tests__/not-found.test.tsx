import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import ComparerNotFound from "@/app/[lang]/comparer/not-found";

vi.mock("next/navigation", () => ({
  useParams: () => ({ lang: "fr" }),
}));

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

describe("NotFound ([lang]/comparer/not-found)", () => {
  // @req REQ-099
  it("renders a calm heading", () => {
    render(<ComparerNotFound />);
    expect(screen.getByRole("heading")).toBeTruthy();
  });

  // @req REQ-099
  it("explains the comparer URL pattern", () => {
    const { container } = render(<ComparerNotFound />);
    expect(container.textContent).toMatch(
      /comparer\/\{type\}\/\{id1\}\/\{id2\}/
    );
  });

  // @req REQ-099
  it("links back to the /fr/comparer picker", () => {
    render(<ComparerNotFound />);
    const links = screen.getAllByRole("link");
    expect(links.some((l) => l.getAttribute("href") === "/fr/comparer")).toBe(
      true
    );
  });

  // @req REQ-099
  it("renders no emoji in the page", () => {
    const { container } = render(<ComparerNotFound />);
    expect(container.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  // @req REQ-099
  it("renders no Oops text anywhere", () => {
    const { container } = render(<ComparerNotFound />);
    expect(container.textContent).not.toMatch(/[Oo]ops/);
  });
});
