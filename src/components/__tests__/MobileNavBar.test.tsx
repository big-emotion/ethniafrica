import { render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MobileNavBar } from "@/components/MobileNavBar";
import { PRODUCT_NAME } from "@/lib/brand";

let mockPathname = "/fr";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

describe("MobileNavBar — home route header skin", () => {
  // @req [14.5]
  // @req REQ-044
  it("wears the prototype header skin class only on the home route", () => {
    mockPathname = "/fr";
    render(<MobileNavBar language="fr" />);
    expect(screen.getByLabelText("Navigation principale")).toHaveClass(
      "afh-home-nav-skin"
    );
    cleanup();

    mockPathname = "/fr/pays";
    render(<MobileNavBar language="fr" />);
    expect(screen.getByLabelText("Navigation principale")).not.toHaveClass(
      "afh-home-nav-skin"
    );
  });

  // @req [14.5]
  // @req REQ-044
  it("keeps the same nav destinations on the home route (IA unchanged)", () => {
    for (const pathname of ["/fr", "/fr/pays"]) {
      mockPathname = pathname;
      render(<MobileNavBar language="fr" />);
      expect(
        screen.getByRole("button", { name: "Navigation" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Rechercher" })
      ).toBeInTheDocument();
      cleanup();
    }
  });

  // @req [14.5]
  // @req REQ-044
  it("renders the brand wordmark in Fraunces 900 17px on the home route", () => {
    mockPathname = "/fr";
    render(<MobileNavBar language="fr" />);

    const brand = screen.getByText(PRODUCT_NAME);
    expect(brand.getAttribute("style")).toContain(
      "font-family: var(--afh-font-display)"
    );
    expect(brand).toHaveStyle({ fontWeight: "900", fontSize: "17px" });
  });

  // @req REQ-044
  it("treats the logo beside the brand wordmark as decorative", () => {
    mockPathname = "/fr";
    render(<MobileNavBar language="fr" />);

    expect(
      screen.queryByRole("img", { name: PRODUCT_NAME })
    ).not.toBeInTheDocument();
    expect(screen.getByText(PRODUCT_NAME)).toBeInTheDocument();
  });
});
