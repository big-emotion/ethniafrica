import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

const { setThemeMock, useThemeMock } = vi.hoisted(() => ({
  setThemeMock: vi.fn(),
  useThemeMock: vi.fn(),
}));

vi.mock("next-themes", () => ({ useTheme: useThemeMock }));

import { ThemeToggle } from "@/components/layout/ThemeToggle";

describe("ThemeToggle — parchment/night switch (REQ-115)", () => {
  beforeEach(() => {
    setThemeMock.mockReset();
    useThemeMock.mockReturnValue({
      resolvedTheme: "light",
      setTheme: setThemeMock,
    });
  });

  // @req REQ-115
  it("offers night as the action while the reader is on parchment", async () => {
    render(<ThemeToggle />);

    const button = await screen.findByRole("button", { name: /nuit/i });
    await userEvent.click(button);

    expect(setThemeMock).toHaveBeenCalledWith("dark");
  });

  // @req REQ-115
  it("offers parchment as the action while the reader is on night", async () => {
    useThemeMock.mockReturnValue({
      resolvedTheme: "dark",
      setTheme: setThemeMock,
    });

    render(<ThemeToggle />);

    const button = await screen.findByRole("button", { name: /parchemin/i });
    await userEvent.click(button);

    expect(setThemeMock).toHaveBeenCalledWith("light");
  });

  // The resolved theme is only known client-side, so the button reserves
  // its space and stays inert until then rather than rendering a label
  // that would flip on hydration.
  // @req REQ-115
  it("reserves its slot without claiming a theme before hydration", () => {
    useThemeMock.mockReturnValue({
      resolvedTheme: undefined,
      setTheme: setThemeMock,
    });

    render(<ThemeToggle />);

    const placeholder = screen.getByTestId("theme-toggle-placeholder");
    expect(placeholder).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  // next-themes' blocking script has already resolved the theme by the time
  // React hydrates, so reading it on the very first client render would
  // produce a button where the server sent a placeholder — React reported
  // exactly that as a hydration failure on /fr.
  // @req REQ-115
  it("renders the same markup the server sent on its first client render", () => {
    // The server has no reader to read a theme from, so it always emits the
    // placeholder. The client's first render has to match it byte for byte,
    // whatever next-themes already knows.
    useThemeMock.mockReturnValue({
      resolvedTheme: "dark",
      setTheme: setThemeMock,
    });

    const serverMarkup = renderToStaticMarkup(<ThemeToggle />);

    expect(serverMarkup).toContain("theme-toggle-placeholder");
    expect(serverMarkup).not.toContain('theme-toggle"');
  });

  // @req REQ-115
  it("meets the 44px minimum touch target", async () => {
    render(<ThemeToggle />);

    const button = await screen.findByRole("button", { name: /nuit/i });
    expect(button.className).toContain("min-h-11");
    expect(button.className).toContain("min-w-11");
  });
});
