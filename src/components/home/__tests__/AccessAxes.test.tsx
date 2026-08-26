import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AccessAxes } from "@/components/home/AccessAxes";
import { getLocalizedRoute } from "@/lib/routing";
import type { HubModuleDefinition } from "@/lib/hubs/moduleRegistry";
import type { CorpusCounts } from "@/lib/home/corpusCounts";

const counts: CorpusCounts = {
  peoples: 803,
  countries: 54,
  families: 24,
  migrations: 6,
};

let reducedMotion = false;
vi.mock("@/hooks/use-prefers-reduced-motion", () => ({
  usePrefersReducedMotion: () => reducedMotion,
}));

// Only the axis→modules filing is stubbed. isModuleEnabled stays the real
// implementation: it is the thing under test, and a stub of it would let the
// card pass whether or not it consults the flag.
let modulesForJouer: HubModuleDefinition[] | null = null;
vi.mock("@/lib/hubs/moduleRegistry", async (importOriginal) => {
  const registry =
    await importOriginal<typeof import("@/lib/hubs/moduleRegistry")>();
  return {
    ...registry,
    getModulesForAccessMode: (mode: string) =>
      mode === "jouer" && modulesForJouer
        ? modulesForJouer
        : registry.getModulesForAccessMode(
            mode as Parameters<typeof registry.getModulesForAccessMode>[0]
          ),
  };
});

afterEach(() => {
  reducedMotion = false;
  modulesForJouer = null;
  cleanup();
});

describe("AccessAxes — the home's three entry points (REQ-113/REQ-114)", () => {
  // @req REQ-113
  it("offers exactly the three intents, named as verbs", () => {
    render(<AccessAxes language="fr" counts={counts} />);

    const axes = screen.getAllByTestId(/^access-axis-\w+$/);
    expect(axes.map((axis) => axis.dataset.testid)).toEqual([
      "access-axis-explorer",
      "access-axis-comprendre",
      "access-axis-jouer",
    ]);
    expect(
      screen.getByRole("heading", { level: 2, name: "Explorer" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Comprendre" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Jouer" })
    ).toBeInTheDocument();
  });

  // The filing criterion behind the three axes, said out loud. It orients
  // the reader; it is not a level in the outline, and the home pins its h3
  // count at zero — so it must render as a paragraph, never a heading.
  // @req REQ-113
  it("states the filing criterion above the cards without adding a heading", () => {
    render(<AccessAxes language="fr" counts={counts} />);

    expect(screen.getByTestId("access-axes-lead")).toHaveTextContent(
      "Avec quoi le lecteur arrive, avec quoi il repart."
    );
    expect(
      screen.queryByRole("heading", { name: /Avec quoi le lecteur/ })
    ).toBeNull();
  });

  // Each card restates the criterion in its own terms: what the reader hands
  // the axis, what the axis hands back.
  // @req REQ-113
  it.each([
    ["explorer", "Il arrive avec un nom. Il repart avec une fiche."],
    [
      "comprendre",
      "Il arrive avec une question. Il repart avec une explication.",
    ],
    ["jouer", "Il arrive sans rien. Il repart avec un résultat."],
  ])("spells out what %s takes in and gives back", (id, stake) => {
    render(<AccessAxes language="fr" counts={counts} />);

    expect(screen.getByTestId(`access-axis-stake-${id}`)).toHaveTextContent(
      stake
    );
  });

  // @req REQ-114
  it("sends each axis to its own hub route", () => {
    render(<AccessAxes language="fr" counts={counts} />);

    expect(screen.getByTestId("access-axis-explorer")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "explorerHub")
    );
    expect(screen.getByTestId("access-axis-comprendre")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "comprendreHub")
    );
    expect(screen.getByTestId("access-axis-jouer")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "jouerHub")
    );
  });

  // Every figure on the home is a count of something a reader could go
  // and verify. "3 000 ans" was not one (ETNI-1198).
  // @req REQ-113
  it("counts real corpus entries rather than announcing an era", () => {
    render(<AccessAxes language="fr" counts={counts} />);

    expect(screen.getByTestId("access-axis-figure-explorer")).toHaveTextContent(
      "803 peuples · 54 pays"
    );
    expect(
      screen.getByTestId("access-axis-figure-comprendre")
    ).toHaveTextContent("6 repères · 1 doctrine");
    expect(screen.queryByText(/3\s?000\s?ans/)).not.toBeInTheDocument();
  });

  // @req REQ-113
  it("tracks the counts it is given rather than hardcoding them", () => {
    render(
      <AccessAxes
        language="fr"
        counts={{ ...counts, peoples: 12, countries: 3, migrations: 1 }}
      />
    );

    expect(screen.getByTestId("access-axis-figure-explorer")).toHaveTextContent(
      "12 peuples · 3 pays"
    );
    expect(
      screen.getByTestId("access-axis-figure-comprendre")
    ).toHaveTextContent("1 repère · 1 doctrine");
  });

  // @req REQ-113
  it("gives each axis one action verb, not a paragraph", () => {
    render(<AccessAxes language="fr" counts={counts} />);

    expect(screen.getByTestId("access-axis-cta-explorer")).toHaveTextContent(
      "Parcourir"
    );
    expect(screen.getByTestId("access-axis-cta-comprendre")).toHaveTextContent(
      "Remonter"
    );
    expect(screen.getByTestId("access-axis-cta-jouer")).toHaveTextContent(
      "Comparer"
    );
  });

  // @req REQ-114
  it("scopes each axis to its own categorical accent", () => {
    render(<AccessAxes language="fr" counts={counts} />);

    expect(screen.getByTestId("access-axis-explorer")).toHaveClass(
      "afh-accent-ocre"
    );
    expect(screen.getByTestId("access-axis-comprendre")).toHaveClass(
      "afh-accent-teal"
    );
    expect(screen.getByTestId("access-axis-jouer")).toHaveClass(
      "afh-accent-perv"
    );
  });

  // The glyph animates what its axis does, so it is a second reading of
  // the label — and decorative, so it stays out of the accessible name.
  // @req REQ-113
  it("carries a decorative animated glyph per axis", () => {
    render(<AccessAxes language="fr" counts={counts} />);

    for (const id of ["explorer", "comprendre", "jouer"]) {
      const glyph = screen.getByTestId(`access-axis-glyph-${id}`);
      expect(glyph.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    }
  });

  // @req REQ-112
  it("drops every animation class under reduced motion", () => {
    reducedMotion = true;
    render(<AccessAxes language="fr" counts={counts} />);

    const axis = screen.getByTestId("access-axis-explorer");
    expect(axis.className).not.toContain("access-axis-reveal");
    expect(
      screen.getByTestId("access-axis-glyph-explorer").innerHTML
    ).not.toContain("g-dot");
  });

  // @req REQ-113
  it("keeps every axis above the 44px touch target", () => {
    render(<AccessAxes language="fr" counts={counts} />);

    for (const id of ["explorer", "comprendre", "jouer"]) {
      expect(screen.getByTestId(`access-axis-${id}`).className).toContain(
        "min-h-11"
      );
    }
  });
});

// A card that promises an action the hub behind it cannot deliver sends the
// reader to a dead end. The axis reads its own state off the registry, so it
// starts and stops promising by itself — nothing here to remember to undo.
describe("AccessAxes — an axis promises only what it can deliver (REQ-114)", () => {
  const counts = { peoples: 890, countries: 54, families: 24, migrations: 6 };

  // `comparer` is a static route that renders whatever the corpus holds, so
  // Jouer has had something real behind it since it was filed there.
  // @req REQ-114
  it("promises the action once one module behind the axis is live", () => {
    render(<AccessAxes language="fr" counts={counts} />);

    expect(screen.getByTestId("access-axis-jouer")).toHaveAttribute(
      "data-available",
      "true"
    );
    expect(screen.getByTestId("access-axis-figure-jouer")).toHaveTextContent(
      "2 peuples face à face"
    );
    expect(screen.getByTestId("access-axis-cta-jouer")).toHaveTextContent(
      "Comparer"
    );
  });

  // The regression that matters: a `flagged` module is not `unavailable`, so
  // an axis that merely counted non-unavailable entries would advertise a hub
  // showing nothing. Strip Jouer down to a flagged-off quiz and an
  // unavailable module and the card has to fall back to pending.
  // @req REQ-106
  it("stays pending when its only remaining module is behind a dark flag", () => {
    const quizFlag = process.env.NEXT_PUBLIC_FEATURE_QUIZ;
    delete process.env.NEXT_PUBLIC_FEATURE_QUIZ;
    modulesForJouer = [
      {
        id: "quiz",
        name: "Le quiz des parcours",
        accessMode: "jouer",
        page: "quiz",
        availability: "flagged",
        featureFlag: "quiz",
      },
      {
        id: "liens",
        name: "Les liens invisibles",
        accessMode: "jouer",
        page: null,
        availability: "unavailable",
      },
    ];

    try {
      render(<AccessAxes language="fr" counts={counts} />);

      const jouer = screen.getByTestId("access-axis-jouer");
      expect(jouer).toHaveAttribute("data-available", "false");
      expect(screen.getByTestId("access-axis-cta-jouer")).toHaveTextContent(
        "Bientôt"
      );
      // Still a link: the hub is where the reader sees what is coming.
      expect(jouer).toHaveAttribute("href", "/fr/jouer");
    } finally {
      if (quizFlag === undefined) {
        delete process.env.NEXT_PUBLIC_FEATURE_QUIZ;
      } else {
        process.env.NEXT_PUBLIC_FEATURE_QUIZ = quizFlag;
      }
    }
  });

  // Explorer and Comprendre both have live modules, so neither may be
  // dressed as pending — the state has to discriminate, not blanket.
  // @req REQ-114
  it("leaves the axes with live modules promising their action", () => {
    render(<AccessAxes language="fr" counts={counts} />);

    expect(screen.getByTestId("access-axis-explorer")).toHaveAttribute(
      "data-available",
      "true"
    );
    expect(screen.getByTestId("access-axis-comprendre")).toHaveAttribute(
      "data-available",
      "true"
    );
    expect(screen.getByTestId("access-axis-cta-explorer")).toHaveTextContent(
      "Parcourir"
    );
  });

  // axe caught this on the live /fr route: dimming the pending axis as a
  // whole took its CTA text under the contrast bar. The pending state is
  // allowed to soften decoration — the glyph is aria-hidden and no
  // contrast rule applies to it — but never text, which has already said
  // "Bientôt" and needs no help being read.
  // @req REQ-114
  it("softens only aria-hidden decoration, never the pending axis text", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/home/AccessAxes.tsx"),
      "utf8"
    );
    const pendingRules = source.match(/\.access-axis-pending[^{]*\{[^}]*\}/g);

    for (const rule of pendingRules ?? []) {
      if (!/opacity/.test(rule)) continue;
      expect(rule).not.toContain(".access-axis-cta");
      expect(rule).not.toContain(".access-axis-figure");
    }
  });
});
