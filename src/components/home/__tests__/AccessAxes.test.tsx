import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AccessAxes, type AccessAxesProps } from "@/components/home/AccessAxes";
import { getLocalizedRoute } from "@/lib/routing";
import {
  ACCESS_MODE_LABELS,
  ACCESS_MODES,
  getModulesForAccessMode,
  type AccessMode,
  type HubModuleDefinition,
} from "@/lib/hubs/moduleRegistry";
import type { HubModule } from "@/lib/hubs/moduleAvailability";
import type { CorpusCounts } from "@/lib/home/corpusCounts";

const counts: CorpusCounts = {
  peoples: 803,
  languages: 748,
  countries: 54,
  families: 24,
  nameForms: 3134,
  migrations: 6,
};

/**
 * What getHubModules hands the page for one axis: dark-flagged modules
 * dropped, the rest carrying their resolved `available`. `isModuleEnabled`
 * is the real implementation here — it is the lock the card's promise
 * ultimately rests on — and a data module counts as live, which is the
 * state the corpus is actually in.
 */
const resolveModules = (mode: AccessMode): HubModule[] =>
  getModulesForAccessMode(mode).map((definition) => ({
    ...definition,
    available: true,
  }));

const modulesByAxis = Object.fromEntries(
  ACCESS_MODES.map((mode) => [mode, resolveModules(mode)])
) as Record<AccessMode, HubModule[]>;

const renderAxes = (props: Partial<AccessAxesProps> = {}) =>
  render(
    <AccessAxes
      language="fr"
      counts={counts}
      modulesByAxis={modulesByAxis}
      {...props}
    />
  );

let reducedMotion = false;
vi.mock("@/hooks/use-prefers-reduced-motion", () => ({
  usePrefersReducedMotion: () => reducedMotion,
}));

afterEach(() => {
  reducedMotion = false;
  cleanup();
});

describe("AccessAxes — the home's three entry points (REQ-113/REQ-114)", () => {
  // @req REQ-113
  it("offers exactly the three intents, named as verbs", () => {
    renderAxes();

    const axes = screen.getAllByTestId(/^access-axis-\w+$/);
    expect(axes.map((axis) => axis.dataset.testid)).toEqual([
      "access-axis-atlas",
      "access-axis-dossiers",
      "access-axis-jeux",
    ]);
    // h3: the cards are items of the section its own heading opens, not
    // siblings of it.
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: ACCESS_MODE_LABELS.atlas,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: ACCESS_MODE_LABELS.dossiers,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: ACCESS_MODE_LABELS.jeux,
      })
    ).toBeInTheDocument();
  });

  // The section used to open on a paragraph naming the rule by which
  // modules are filed behind the three axes — a statement about the
  // shelving, not about the choice being asked of the reader. It is a
  // heading now, and the section is a rung of the outline like the four
  // others on the page.
  // @req REQ-113
  it("opens the section on a heading that orients rather than files", () => {
    renderAxes();

    const heading = screen.getByTestId("home-axes-heading");
    expect(heading.tagName).toBe("H2");
    expect(heading).toHaveTextContent(
      "Trois chemins, selon ce que vous cherchez."
    );
    expect(screen.queryByTestId("access-axes-lead")).toBeNull();
    expect(screen.queryByText(/Avec quoi le lecteur/)).toBeNull();
  });

  // One line per card, and it has to be about the destination. The formula
  // it replaced described the reader's trajectory, which told someone who
  // did not already know the three axes apart nothing about where the click
  // would land.
  // @req REQ-113
  it.each([
    ["atlas", /peuples, pays, langues et familles/i],
    ["dossiers", /d'où viennent les noms/i],
    ["jeux", /jeux et des quiz tirés des fiches/i],
  ])("says what %s holds, not what the reader does", (id, contents) => {
    renderAxes();

    const stake = screen.getByTestId(`access-axis-stake-${id}`);
    expect(stake).toHaveTextContent(contents);
    expect(stake.textContent).not.toMatch(/il arrive|il repart/i);
  });

  /**
   * The fallback href is the no-JS and crawler path, and it used to be the
   * axis landing page. ETNI-1555 deleted those three pages, so the card now
   * falls back to the first module the axis actually offers — a real
   * destination inside the axis rather than a 308 into a 404.
   */
  // @req REQ-114
  it("falls back to the axis's first live module on every axis", () => {
    renderAxes();

    for (const mode of ACCESS_MODES) {
      const first = modulesByAxis[mode][0];
      const href = first.gameSlug
        ? `${getLocalizedRoute("fr", "jeuxHub")}/${first.gameSlug}`
        : getLocalizedRoute("fr", first.page);

      expect(screen.getByTestId(`access-axis-${mode}`), mode).toHaveAttribute(
        "href",
        href
      );
    }
  });

  /**
   * The three axis landing pages are gone. A card that still pointed at one
   * would send a crawler — and a reader without JavaScript — to a 404.
   */
  // @req REQ-114
  it("points no axis card at a retired axis landing page", () => {
    renderAxes();

    for (const mode of ACCESS_MODES) {
      expect(
        screen.getByTestId(`access-axis-${mode}`).getAttribute("href"),
        mode
      ).not.toBe(getLocalizedRoute("fr", `${mode}Hub`));
    }
  });

  // Every figure on the home is a count of something a reader could go
  // and verify. "3 000 ans" was not one (ETNI-1198).
  // @req REQ-113
  it("counts real corpus entries rather than announcing an era", () => {
    renderAxes();

    expect(screen.getByTestId("access-axis-figure-atlas")).toHaveTextContent(
      "803 peuples · 54 pays"
    );
    expect(screen.getByTestId("access-axis-figure-dossiers")).toHaveTextContent(
      "6 repères · 1 doctrine"
    );
    expect(screen.queryByText(/3\s?000\s?ans/)).not.toBeInTheDocument();
  });

  // @req REQ-113
  it("tracks the counts it is given rather than hardcoding them", () => {
    renderAxes({
      counts: { ...counts, peoples: 12, countries: 3, migrations: 1 },
    });

    expect(screen.getByTestId("access-axis-figure-atlas")).toHaveTextContent(
      "12 peuples · 3 pays"
    );
    expect(screen.getByTestId("access-axis-figure-dossiers")).toHaveTextContent(
      "1 repère · 1 doctrine"
    );
  });

  // @req REQ-113
  it("gives each axis one action verb, not a paragraph", () => {
    renderAxes();

    expect(screen.getByTestId("access-axis-cta-atlas")).toHaveTextContent(
      "Parcourir"
    );
    expect(screen.getByTestId("access-axis-cta-dossiers")).toHaveTextContent(
      "Remonter"
    );
    expect(screen.getByTestId("access-axis-cta-jeux")).toHaveTextContent(
      "Se tester"
    );
  });

  // @req REQ-114
  it("scopes each axis to its own categorical accent", () => {
    renderAxes();

    expect(screen.getByTestId("access-axis-atlas")).toHaveClass(
      "afh-accent-ocre"
    );
    expect(screen.getByTestId("access-axis-dossiers")).toHaveClass(
      "afh-accent-teal"
    );
    expect(screen.getByTestId("access-axis-jeux")).toHaveClass(
      "afh-accent-perv"
    );
  });

  // The glyph animates what its axis does, so it is a second reading of
  // the label — and decorative, so it stays out of the accessible name.
  // @req REQ-113
  it("carries a decorative animated glyph per axis", () => {
    renderAxes();

    for (const id of ["atlas", "dossiers", "jeux"]) {
      const glyph = screen.getByTestId(`access-axis-glyph-${id}`);
      expect(glyph.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    }
  });

  // @req REQ-112
  it("drops every animation class under reduced motion", () => {
    reducedMotion = true;
    renderAxes();

    const axis = screen.getByTestId("access-axis-atlas");
    expect(axis.className).not.toContain("access-axis-reveal");
    expect(
      screen.getByTestId("access-axis-glyph-atlas").innerHTML
    ).not.toContain("g-dot");
  });

  // @req REQ-113
  it("keeps every axis above the 44px touch target", () => {
    renderAxes();

    for (const id of ["atlas", "dossiers", "jeux"]) {
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
  const counts = {
    peoples: 890,
    languages: 748,
    countries: 54,
    families: 24,
    nameForms: 3134,
    migrations: 6,
  };

  // Jouer has had something real behind it since REQ-120 turned its two
  // `unavailable` placeholders into live games.
  // @req REQ-114 @req REQ-120
  it("promises the action once one module behind the axis is live", () => {
    renderAxes({ counts });

    expect(screen.getByTestId("access-axis-jeux")).toHaveAttribute(
      "data-available",
      "true"
    );
    expect(screen.getByTestId("access-axis-figure-jeux")).not.toHaveTextContent(
      "en préparation"
    );
  });

  // The axis used to promise « 2 peuples face à face », a sentence written
  // when Jouer held one comparison module. Counting the entries the hub
  // itself lists is what stops it going stale a second time — and it is the
  // same list, so the card and the hub behind it cannot disagree.
  // @req REQ-120
  it("counts the games it offers rather than describing one of them", () => {
    renderAxes({ counts });

    const figure = screen.getByTestId("access-axis-figure-jeux");
    expect(figure).toHaveTextContent(`${modulesByAxis.jeux.length} jeux`);
    expect(figure).not.toHaveTextContent("2 peuples face à face");
  });

  // The regression that matters: a `flagged` module is not `unavailable`, so
  // an axis that merely counted non-unavailable entries would advertise
  // modules it is about to deploy as "Bientôt" rows or not at all. The lock
  // itself now lives one layer down — getHubModules drops a dark-flagged
  // module and resolves `available` through isModuleEnabled, and has its own
  // tests — so what is asserted here is the card's own rule: it promises an
  // action only if something in the list it received is live. The flag is
  // driven for real, through the same predicate the server applies.
  // @req REQ-106
  it("stays pending when nothing in the list it received is live", () => {
    const quizFlag = process.env.NEXT_PUBLIC_FEATURE_QUIZ;
    delete process.env.NEXT_PUBLIC_FEATURE_QUIZ;

    const darkJouer: HubModuleDefinition[] = [
      {
        id: "quiz",
        name: "Le quiz des parcours",
        accessMode: "jeux",
        page: "quiz",
        availability: "data",
      },
      {
        id: "liens",
        name: "Les liens invisibles",
        accessMode: "jeux",
        page: null,
        availability: "data",
      },
    ];

    try {
      renderAxes({
        counts,
        modulesByAxis: {
          ...modulesByAxis,
          jeux: darkJouer.map((definition) => ({
            ...definition,
            available: false,
          })),
        },
      });

      const jouer = screen.getByTestId("access-axis-jeux");
      expect(jouer).toHaveAttribute("data-available", "false");
      expect(screen.getByTestId("access-axis-cta-jeux")).toHaveTextContent(
        "Bientôt"
      );
      // An axis offering nothing has nowhere to send a reader without
      // JavaScript, so the card drops the anchor and stays what it has
      // always behaved as: the button that deploys the modules.
      expect(jouer).not.toHaveAttribute("href");
      expect(jouer.tagName).toBe("BUTTON");
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
    renderAxes({ counts });

    expect(screen.getByTestId("access-axis-atlas")).toHaveAttribute(
      "data-available",
      "true"
    );
    expect(screen.getByTestId("access-axis-dossiers")).toHaveAttribute(
      "data-available",
      "true"
    );
    expect(screen.getByTestId("access-axis-cta-atlas")).toHaveTextContent(
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

  /**
   * Below 860px the card becomes a row, and the CTA used to be zeroed out
   * there — the reader was handed a bare arrow and no promise, on the one
   * element of the card whose entire job is to say what the click does.
   *
   * The actions charter (§2) forbids it: an action link never drops its
   * label to save room. happy-dom applies no media query, so the rule is
   * read from the source the same way the pending-contrast test above
   * reads its own.
   */
  // @req REQ-114
  it("keeps the verb legible where the card becomes a row", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/home/AccessAxes.tsx"),
      "utf8"
    );
    const ctaRules = source.match(/\.access-axis-cta[^{]*\{[^}]*\}/g) ?? [];

    expect(ctaRules.length).toBeGreaterThan(0);
    for (const rule of ctaRules) {
      expect(rule).not.toMatch(/font-size:\s*0/);
    }
  });
});

// Clicking an entry point used to cost a page load to reach a list of the
// same modules. It now opens that list on the home itself, and the reader's
// next click lands on the module rather than on the axis slug.
describe("AccessAxes — an axis opens on the home rather than loading its hub (REQ-114)", () => {
  // @req REQ-114
  it("swallows the navigation and deploys the axis in place", () => {
    renderAxes();
    const explorer = screen.getByTestId("access-axis-atlas");
    expect(explorer).toHaveAttribute("aria-expanded", "false");

    // fireEvent reports false when a handler called preventDefault.
    const proceeded = fireEvent.click(explorer);

    expect(proceeded).toBe(false);
    expect(screen.getByTestId("axis-panel-atlas")).toBeInTheDocument();
    expect(explorer).toHaveAttribute("aria-expanded", "true");
    expect(explorer).toHaveAttribute("aria-controls", "axis-panel-atlas");
  });

  // @req REQ-114
  it("tells the route interstitial its destination opens here", () => {
    // The overlay reads clicks off the document and cannot tell a card that
    // cancels its own navigation from Next's Link, which also cancels the
    // native one. Without the marker it covered the home for fifteen seconds
    // while the panel deployed behind it.
    renderAxes();

    for (const axis of ACCESS_MODES) {
      expect(screen.getByTestId(`access-axis-${axis}`)).toHaveAttribute(
        "data-opens-in-place",
        "true"
      );
    }
  });

  // @req REQ-114
  it("deploys the modules of the axis that was opened, and no others", async () => {
    renderAxes();

    await userEvent.click(screen.getByTestId("access-axis-dossiers"));

    expect(screen.getByTestId("axis-module-anecdotes")).toBeInTheDocument();
    expect(screen.getByTestId("axis-module-frise")).toBeInTheDocument();
    expect(screen.queryByTestId("axis-module-peuples")).not.toBeInTheDocument();
  });

  // A facet of the Explorer hub is a destination on the scene like any
  // other, and the click that opened the axis is the last one spent on the
  // axis slug.
  // @req REQ-114
  it("sends a facet click to that facet of the hub, never to the axis slug", async () => {
    renderAxes();

    await userEvent.click(screen.getByTestId("access-axis-atlas"));

    expect(screen.getByTestId("axis-module-link-peuples")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "peoples")
    );
  });

  // @req REQ-114
  it("keeps a single axis open, switching rather than stacking", async () => {
    renderAxes();

    await userEvent.click(screen.getByTestId("access-axis-atlas"));
    await userEvent.click(screen.getByTestId("access-axis-jeux"));

    expect(screen.queryByTestId("axis-panel-atlas")).not.toBeInTheDocument();
    expect(screen.getByTestId("axis-panel-jeux")).toBeInTheDocument();
  });

  // @req REQ-114
  it("marks which axis is open on the group itself", async () => {
    renderAxes();
    expect(screen.getByTestId("access-axes")).toHaveAttribute(
      "data-open",
      "none"
    );

    await userEvent.click(screen.getByTestId("access-axis-atlas"));

    expect(screen.getByTestId("access-axes")).toHaveAttribute(
      "data-open",
      "atlas"
    );
  });

  // The verb promised what the click would do. Once the click has landed
  // and the modules are on screen, it has nothing left to promise.
  // @req REQ-114
  it("drops the action verb from the card it has opened", async () => {
    renderAxes();

    await userEvent.click(screen.getByTestId("access-axis-atlas"));

    expect(
      screen.queryByTestId("access-axis-cta-atlas")
    ).not.toBeInTheDocument();
  });

  // Escape is the way out of anything that opened over what you were
  // reading, and the focus has to come back where it was taken from.
  // @req REQ-114
  it("closes on Escape and hands focus back to the card that opened it", async () => {
    renderAxes();
    const explorer = screen.getByTestId("access-axis-atlas");

    await userEvent.click(explorer);
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByTestId("axis-panel-atlas")).not.toBeInTheDocument();
    expect(explorer).toHaveFocus();
  });

  // @req REQ-114
  it("closes when the opened card is clicked a second time", async () => {
    renderAxes();
    const explorer = screen.getByTestId("access-axis-atlas");

    await userEvent.click(explorer);
    await userEvent.click(explorer);

    expect(screen.queryByTestId("axis-panel-atlas")).not.toBeInTheDocument();
    expect(explorer).toHaveAttribute("aria-expanded", "false");
  });

  // A pending axis is still worth opening: that is where the reader sees
  // what is coming, which is what the hub used to be for.
  //
  // The pending module is declared here rather than borrowed from the
  // registry. This test used to point at `liens`, which only read as
  // pending because the panel resolved hrefs from `page` alone and every
  // game carries `page: null` — it was asserting the bug.
  // @req REQ-106
  it("opens an axis onto the modules that really are still to come", async () => {
    renderAxes({
      modulesByAxis: {
        ...modulesByAxis,
        jeux: [
          {
            id: "annonce",
            name: "Un module annoncé avant sa route",
            accessMode: "jeux",
            page: null,
            availability: "data",
            available: false,
          },
        ],
      },
    });

    await userEvent.click(screen.getByTestId("access-axis-jeux"));

    expect(
      screen.getByTestId("axis-module-unavailable-annonce")
    ).toHaveTextContent("Bientôt");
  });
});

describe("AccessAxes — Escape on the one level Jouer now has (REQ-120)", () => {
  /**
   * Jouer used to carry a shelf level, and Escape gave it back before it gave
   * back the panel. The second cut (charter §1) left two modules on two
   * shelves of one, and a shelf holding one module is promoted in place of
   * the shelf — so there is no level to step back to any more, and Jouer
   * closes on the first press like every other axis.
   *
   * The two-level behaviour itself is not gone, only unreachable from this
   * registry; AxisModulePanel's own suite still holds it against a multi-
   * module shelf, so a rebuilt game restores it without new code.
   */
  // @req REQ-120
  it("offers no shelf to step back to, and closes on the first press", async () => {
    renderAxes();
    const jouer = screen.getByTestId("access-axis-jeux");

    await userEvent.click(jouer);
    expect(screen.getByTestId("axis-module-link-mercator")).toBeInTheDocument();
    expect(
      screen.queryByTestId("axis-shelf-open-jeux-pays")
    ).not.toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByTestId("axis-panel-jeux")).not.toBeInTheDocument();
    expect(jouer).toHaveFocus();
  });

  // Explorer carries no shelf, so nothing changed for it: one Escape.
  // @req REQ-120
  it("still closes an unfiled axis on the first press", async () => {
    renderAxes();

    await userEvent.click(screen.getByTestId("access-axis-atlas"));
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByTestId("axis-panel-atlas")).not.toBeInTheDocument();
  });
});
