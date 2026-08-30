import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FamilyFicheTitle } from "@/components/family/FamilyFicheTitle";
import type { LanguageFamily } from "@/types/afrik";
import { getLocalizedRoute } from "@/lib/routing";

/**
 * ETNI-1359. 19 of the 24 family fiches carry a `whyProblematic` paragraph
 * explaining that their name was imposed — Bantou is the worked case, coined
 * by Bleek and turned into an apartheid legal category — while the head that
 * names the family said nothing machine-readable about it.
 */
const family: LanguageFamily = {
  id: "FLG_BANTU",
  nameFr: "Bantou",
  nameEn: "Bantu",
  content: {
    decolonialHeader: {
      selfAppellation: "Bantu",
      contemporaryUsage: "Désignation strictement linguistique.",
    },
  },
};

describe("FamilyFicheTitle (REQ-091)", () => {
  // @req REQ-091
  it("opens on the eyebrow, the name and its predicate", () => {
    render(<FamilyFicheTitle family={family} />);

    expect(screen.getByText("Famille linguistique")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Bantou/ })).toHaveTextContent(
      "une aire à reconstruire"
    );
  });

  // @req REQ-091
  it("states a contested classification beside the name", () => {
    const { container } = render(
      <FamilyFicheTitle
        family={{ ...family, classificationStatus: "contested" }}
      />
    );

    expect(
      container.querySelector('[data-classification-status="contested"]')
    ).toBeInTheDocument();
  });

  // @req REQ-091
  it("links a colonial-legacy classification to the doctrine", () => {
    render(
      <FamilyFicheTitle
        family={{ ...family, classificationStatus: "colonial-legacy" }}
      />
    );

    // The anchor is what carries the meaning, not the path: the doctrine page
    // has since moved under `comprendre/`, so the route is asked for rather
    // than spelled out.
    expect(
      screen.getByRole("link", { name: /héritage colonial/i })
    ).toHaveAttribute(
      "href",
      `${getLocalizedRoute("fr", "doctrine")}#colonial-legacy`
    );
  });

  // The five families that argue nothing, and any family reviewed as
  // consensual, show no badge and nothing standing in for one — the head keeps
  // the three elements it had.
  for (const status of [null, "consensual"] as const) {
    // @req REQ-091
    it(`shows no badge and no placeholder when the status is ${status ?? "null"}`, () => {
      const { container } = render(
        <FamilyFicheTitle
          family={{ ...family, classificationStatus: status }}
        />
      );

      expect(
        container.querySelector("[data-classification-status]")
      ).toBeNull();
      expect(container.querySelector("header")!.children).toHaveLength(3);
    });
  }
});
