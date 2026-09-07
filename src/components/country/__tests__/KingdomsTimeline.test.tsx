import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { KingdomsTimeline } from "../KingdomsTimeline";
import type { KingdomCard } from "@/lib/countryDataTransformer";

function card(overrides: Partial<KingdomCard> = {}): KingdomCard {
  return {
    name: "Royaume du Buganda",
    period: "XIVe siècle - présent",
    tags: [],
    ...overrides,
  };
}

describe("KingdomsTimeline", () => {
  // @req REQ-115
  it("renders nothing when there is no entity to show", () => {
    const { container } = render(<KingdomsTimeline cards={[]} />);
    expect(container.firstChild).toBeNull();
  });

  /**
   * The rule the machine bounds must never break. `period` carries editorial
   * judgement — an apogee, a slow decline, a century the corpus will not
   * narrow — and the integers beside it are for sorting and checking only. A
   * timeline that printed "1301–1400" would publish a precision no one
   * claimed.
   */
  // @req REQ-148
  it("prints the editorial label, never the bounds behind it", () => {
    render(
      <KingdomsTimeline
        cards={[
          card({
            period: "XIVe siècle - XVIIe siècle (apogée)",
            timeRange: {
              startYear: 1301,
              endYear: 1700,
              precision: "approximate",
              datingNote: "Les bornes encadrent l'apogée et le déclin.",
            },
          }),
        ]}
      />
    );
    expect(
      screen.getByText("XIVe siècle - XVIIe siècle (apogée)")
    ).toBeTruthy();
    expect(screen.queryByText(/1301/)).toBeNull();
    expect(screen.queryByText(/1700/)).toBeNull();
  });

  // @req REQ-115
  it("keeps the period column for an entity the corpus does not date", () => {
    render(<KingdomsTimeline cards={[card({ period: undefined })]} />);
    expect(screen.getByText("—")).toBeTruthy();
  });

  /**
   * Ordering belongs to the transformer, which knows which entries carry
   * bounds; the view renders what it is handed. Asserting it here is what
   * stops a later "helpful" sort being added in two places.
   */
  // @req REQ-148
  it("renders the entities in the order it receives them", () => {
    render(
      <KingdomsTimeline
        cards={[
          card({ name: "Sultanat de Mogadiscio", period: "Xe siècle" }),
          card({ name: "Sultanat d'Ajuran", period: "XIIIe siècle" }),
          card({ name: "Sultanat d'Adal", period: "XVe siècle" }),
        ]}
      />
    );
    const headings = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(headings).toEqual([
      "Sultanat de Mogadiscio",
      "Sultanat d'Ajuran",
      "Sultanat d'Adal",
    ]);
  });

  // @req REQ-115
  it("names the political centres when the fiche states them", () => {
    render(
      <KingdomsTimeline
        cards={[card({ centers: ["Mogadiscio", "Merca", "Barawa"] })]}
      />
    );
    expect(screen.getByText(/Mogadiscio · Merca · Barawa/)).toBeTruthy();
  });
});
