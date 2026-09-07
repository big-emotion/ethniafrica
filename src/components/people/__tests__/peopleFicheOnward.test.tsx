import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FicheOnward } from "@/components/fiche/FicheOnward";
import { PeopleDetailViewV2 } from "@/components/people/PeopleDetailViewV2";
import { getAdmin0Name } from "@/lib/atlas/overlays";
import {
  peopleOnwardGroups,
  type PeopleOnwardInput,
} from "@/lib/fiche/onwardGroups";
import { buildOnwardLinks } from "@/lib/fiche/onwardLinks";
import { ficheCopy } from "@/lib/i18n/copy/fiche";
import { peopleCopy } from "@/lib/i18n/copy/people";
import { getCountryRoute, getFamilyRoute, getPeopleRoute } from "@/lib/routing";
import type { PeopleDetail } from "@/types/afrik-frontend";

/**
 * The way out of a **people** fiche, asserted on the assembled fiche.
 *
 * The pieces each have their own suite — `onwardLinks.test.ts` for the
 * breadth-first walk, `onwardGroups.test.ts` for what a people declares,
 * `FicheOnward.test.tsx` for the block in isolation, `ficheOnwardRoutes.test.ts`
 * for the five routes mounting it. None of them renders a people fiche, so none
 * of them would notice the block being dropped from `PeopleDetailViewV2`'s slot
 * or hoisted above the reading. That is the regression this file holds.
 *
 * It runs the real chain — `peopleOnwardGroups` → `buildOnwardLinks` →
 * `FicheOnward` → the fiche — from a corpus-shaped record, exactly as
 * `src/app/[lang]/atlas/peuples/[slug]/page.tsx` composes it. Nothing between
 * those layers is stubbed; the route's own `await`s are what the fixture
 * stands in for.
 */

// The culture chapter carries a report control that reads a consent state its
// provider owns. The fiche has no opinion on consent, so the provider is
// stubbed rather than mounted — the same stub PeopleDetailViewV2.test.tsx uses.
vi.mock("@/hooks/use-consent", () => ({
  useOptionalConsent: () => null,
  useConsent: () => ({
    consentState: {
      hasConsented: true,
      preferences: { essential: true, analytics: false, functional: true },
      consentDate: null,
    },
    acceptAll: vi.fn(),
    rejectAll: vi.fn(),
    updatePreferences: vi.fn(),
    showBanner: false,
    setShowBanner: vi.fn(),
  }),
}));

const ewe: PeopleDetail = {
  id: "PPL_EWE",
  nameMain: "Ewe",
  languageFamilyId: "FLG_NIGERO_CONGOLAIS",
  languageFamilyName: "Nigéro-congolais",
  currentCountries: ["GHA", "TGO"],
  appellations: { mainName: "Ewe", selfAppellation: "Eʋeawo" },
  languages: { mainLanguage: "Ewe", isoCodes: ["ewe"], dialects: ["Anlo"] },
  origins: { ancientOrigins: "Migrations depuis Notsé." },
  demography: {
    totalPopulation: 7000000,
    referenceYear: 2025,
    distributionByCountry: [
      { country: "GHA", population: 4000000 },
      { country: "TGO", population: 3000000 },
    ],
  },
  sources: [{ title: "SIL Ethnologue 2025", url: null, tier: "official" }],
};

/** What the corpus relates this people to — the criterion's three kinds. */
const related: PeopleOnwardInput = {
  family: { id: "FLG_NIGERO_CONGOLAIS", name: "Nigéro-congolais" },
  languages: [],
  countryCodes: ewe.currentCountries,
  sameFamilyPeoples: [{ id: "PPL_FON", nameMain: "Fon" }],
  borneNames: [],
  language: "fr",
};

const unrelated: PeopleOnwardInput = {
  family: null,
  languages: [],
  countryCodes: [],
  sameFamilyPeoples: [],
  borneNames: [],
  language: "fr",
};

function renderFiche(relations: PeopleOnwardInput) {
  return render(
    <PeopleDetailViewV2
      language="fr"
      people={ewe}
      onward={
        <FicheOnward
          from="people"
          language="fr"
          links={buildOnwardLinks(peopleOnwardGroups(relations), "fr", {
            kind: "people",
            id: ewe.id,
          })}
        />
      }
    />
  );
}

/** The fiche's chapters, in the order the reader meets them. */
function chapterTitles(container: HTMLElement): (string | null)[] {
  return [...container.querySelectorAll("[data-fiche-section]")].map((node) =>
    node.getAttribute("data-fiche-section")
  );
}

describe("the people fiche's way out", () => {
  afterEach(cleanup);

  // @req REQ-150
  it("leads to a country of presence, to the linguistic family and to a related people", () => {
    const ghana = getAdmin0Name("GHA", "fr");
    // The block drops a code the atlas cannot name, so a broken lookup would
    // otherwise leave this test asserting the absence of a row it caused.
    expect(ghana).toBeTruthy();
    expect(ghana).not.toBe("GHA");

    renderFiche(related);
    const block = screen.getByTestId("fiche-onward");

    expect(
      within(block).getByRole("link", { name: /Nigéro-congolais/ })
    ).toHaveAttribute("href", getFamilyRoute("fr", "FLG_NIGERO_CONGOLAIS"));
    expect(
      within(block).getByRole("link", { name: new RegExp(ghana as string) })
    ).toHaveAttribute("href", getCountryRoute("fr", "GHA"));
    expect(within(block).getByRole("link", { name: /Fon/ })).toHaveAttribute(
      "href",
      getPeopleRoute("fr", "PPL_FON")
    );
  });

  /**
   * The acceptance criterion is about *where*, not *whether*: a reader who has
   * read the fiche to its end must meet the way out there. Two independent
   * presence assertions would pass with the block sitting under the hero.
   *
   * The order asserted is the shipped one, and the bibliography is on the far
   * side of it deliberately — `PeopleDetailViewV2` records why: almost nobody
   * scrolls past a source list to find out what to read next.
   */
  // @req REQ-150
  it("closes the reading, after every content chapter and before the bibliography", () => {
    const { container } = renderFiche(related);
    const chapters = chapterTitles(container);

    expect(chapters.length).toBeGreaterThan(3);
    expect(chapters.at(-2)).toBe(ficheCopy.fr.onward.title);
    expect(chapters.at(-1)).toBe(peopleCopy.fr.sections.sources);
  });

  /**
   * The other half of "before the site footer": the shell renders
   * `<main>{children}</main>` and only then `SiteFooter`, so the block is above
   * that footer exactly as long as it is inside the fiche document. This turns
   * red if the bibliography stops being the document's last element — the one
   * way something could come to stand between the way out and the site footer.
   */
  // @req REQ-150
  it("is the last thing the reader meets inside the document but the sources", () => {
    const { container } = renderFiche(related);
    const parchment = container.firstElementChild;

    expect(parchment?.contains(screen.getByTestId("fiche-onward"))).toBe(true);
    expect(
      parchment?.lastElementChild?.getAttribute("data-fiche-section")
    ).toBe(peopleCopy.fr.sections.sources);
  });

  // @req REQ-150
  it("gives a people the corpus relates to nothing no chapter at all", () => {
    const { container } = renderFiche(unrelated);
    const chapters = chapterTitles(container);

    expect(screen.queryByTestId("fiche-onward")).toBeNull();
    expect(chapters).not.toContain(ficheCopy.fr.onward.title);
    // The fiche still ends on its bibliography, so the absence costs the
    // reader a chapter and not the document's closing.
    expect(chapters.at(-1)).toBe(peopleCopy.fr.sections.sources);
  });
});
