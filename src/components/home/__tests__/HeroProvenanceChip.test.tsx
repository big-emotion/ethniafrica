import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroProvenanceChip } from "@/components/home/HeroProvenanceChip";
import type { HubModule } from "@/lib/hubs/moduleAvailability";
import { getLocalizedRoute } from "@/lib/routing";
import { ACCESS_MODE_LABELS } from "@/lib/hubs/moduleRegistry";

const hubModule = (overrides: Partial<HubModule> = {}): HubModule => ({
  id: "mercator",
  name: "La taille qu'on vous a cachée",
  accessMode: "jouer",
  page: null,
  gameSlug: "mercator",
  availability: "data",
  available: true,
  heroable: "globe",
  ...overrides,
});

describe("HeroProvenanceChip", () => {
  // @req REQ-115
  it("names the axis the module belongs to, and the module", () => {
    render(<HeroProvenanceChip language="fr" module={hubModule()} />);

    expect(screen.getByText(ACCESS_MODE_LABELS.jouer)).toBeTruthy();
    expect(screen.getByText("La taille qu'on vous a cachée")).toBeTruthy();
  });

  // @req REQ-115
  it("takes the axis label from the canonical access-mode map", () => {
    render(
      <HeroProvenanceChip
        language="fr"
        module={hubModule({ accessMode: "comprendre", id: "frise" })}
      />
    );

    expect(screen.getByText(ACCESS_MODE_LABELS.comprendre)).toBeTruthy();
  });

  // @req REQ-115
  it("sends the reader to the module's own route", () => {
    render(<HeroProvenanceChip language="fr" module={hubModule()} />);

    expect(screen.getByRole("link").getAttribute("href")).toBe(
      `${getLocalizedRoute("fr", "jouerHub")}/mercator`
    );
  });

  // @req REQ-115
  it("reads as one sentence to a screen reader", () => {
    render(<HeroProvenanceChip language="fr" module={hubModule()} />);

    expect(screen.getByRole("link").getAttribute("aria-label")).toBe(
      `${ACCESS_MODE_LABELS.jouer} — La taille qu'on vous a cachée`
    );
  });

  // @req REQ-115
  it("stays a label when the module has no route to offer", () => {
    render(
      <HeroProvenanceChip
        language="fr"
        module={hubModule({ gameSlug: undefined, page: null })}
      />
    );

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("La taille qu'on vous a cachée")).toBeTruthy();
  });

  // The wrapper decides the accent; the chip must never name a colour, or
  // it stops being reusable under another axis. colorTokens.test.ts polices
  // the stylesheet, this polices the inline styles.
  // @req REQ-115
  it("takes every colour from a token, never a literal", () => {
    const { container } = render(
      <HeroProvenanceChip language="fr" module={hubModule()} />
    );

    const styled = container.querySelectorAll<HTMLElement>("[style]");
    expect(styled.length).toBeGreaterThan(0);
    styled.forEach((element) => {
      expect(element.getAttribute("style")).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(element.getAttribute("style")).not.toMatch(/rgba?\(/i);
    });
  });
});
