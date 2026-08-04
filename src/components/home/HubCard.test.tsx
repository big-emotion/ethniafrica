import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HubCard } from "./HubCard";
import type { AccessModeHub } from "@/lib/accessModeHubs";

const explorerHub: AccessModeHub = {
  id: "explorer",
  title: "Explorer",
  description:
    "Parcourez les familles linguistiques, les peuples et les pays d'Afrique.",
  isVisible: true,
  surfaces: [
    { page: "countries", label: "Pays", href: "/fr/pays" },
    { page: "peoples", label: "Peuples", href: "/fr/peuples" },
  ],
};

describe("HubCard", () => {
  // @req REQ-091
  it("renders the hub title and description", () => {
    render(<HubCard hub={explorerHub} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Explorer" })
    ).toBeInTheDocument();
    expect(screen.getByText(explorerHub.description)).toBeInTheDocument();
  });

  // @req REQ-091
  it("renders each surface as an accessible, keyboard-focusable link", () => {
    render(<HubCard hub={explorerHub} />);

    const paysLink = screen.getByRole("link", { name: "Pays" });
    expect(paysLink).toHaveAttribute("href", "/fr/pays");

    const peuplesLink = screen.getByRole("link", { name: "Peuples" });
    expect(peuplesLink).toHaveAttribute("href", "/fr/peuples");
  });

  // @req REQ-091
  it("derives its surface styling from the prototype tokens", () => {
    const { container } = render(<HubCard hub={explorerHub} />);
    const card = container.firstElementChild as HTMLElement;

    expect(card.style.backgroundColor).toBe("var(--afh-night-surface-2)");
    expect(card.style.borderColor).toBe("var(--afh-night-line)");
    expect(card.className).toContain("rounded-[14px]");
  });
});
