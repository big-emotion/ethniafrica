import { describe, it, expect, afterEach } from "vitest";
import {
  render,
  screen,
  within,
  waitFor,
  cleanup,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FragmentationView } from "../FragmentationView";
import type { PeopleFragmentation } from "@/api/v2/schemas/peopleFragmentation";

const twoCountryFragmentation: PeopleFragmentation = {
  peopleId: "PPL_EWE",
  autonym: "Eʋeawo",
  exonym: "Ewe",
  countryCount: 2,
  countries: [
    {
      iso3: "GHA",
      nameFr: "Ghana",
      populationShare: 0.55,
      assertionId: "assertion-gha",
    },
    {
      iso3: "TGO",
      nameFr: "Togo",
      populationShare: 0.45,
      assertionId: null,
    },
  ],
  borderPairs: [
    {
      a: "GHA",
      b: "TGO",
      colonialOrigin: { layerId: "layer-1", sourceIds: ["src-1"] },
    },
  ],
};

const noColonialOriginFragmentation: PeopleFragmentation = {
  ...twoCountryFragmentation,
  borderPairs: [{ a: "GHA", b: "TGO" }],
};

const singleCountryFragmentation: PeopleFragmentation = {
  peopleId: "PPL_SOLO",
  autonym: "Solo",
  exonym: "Solo",
  countryCount: 1,
  countries: [
    {
      iso3: "GHA",
      nameFr: "Ghana",
      populationShare: 1,
      assertionId: null,
    },
  ],
  borderPairs: [],
};

describe("FragmentationView", () => {
  afterEach(() => {
    cleanup();
    // SourceChainSheet syncs its open state to the URL hash; reset it so a
    // hash left over by one test's click doesn't auto-reopen a sheet with a
    // matching anchorId in a later test that reuses the same fixture ids.
    window.history.replaceState(null, "", window.location.pathname);
  });

  describe("variant=fiche-section, >= 2 countries", () => {
    // @req REQ-091
    it("renders a semantic table with a caption and scoped column headers", () => {
      render(
        <FragmentationView
          fragmentation={twoCountryFragmentation}
          variant="fiche-section"
        />
      );

      const table = screen.getByRole("table");
      expect(table).toBeTruthy();

      const caption = table.querySelector("caption");
      expect(caption).toBeTruthy();

      const headers = within(table).getAllByRole("columnheader");
      expect(headers.length).toBeGreaterThan(0);
      headers.forEach((header) => {
        expect(header.getAttribute("scope")).toBe("col");
      });
    });

    // @req REQ-091
    it("renders one row per country with its population share", () => {
      render(
        <FragmentationView
          fragmentation={twoCountryFragmentation}
          variant="fiche-section"
        />
      );

      const table = screen.getByRole("table");
      const rows = within(table).getAllByRole("row");
      // header row + one row per country
      expect(rows.length).toBe(1 + twoCountryFragmentation.countries.length);

      expect(screen.getByText("Ghana")).toBeTruthy();
      expect(screen.getByText("Togo")).toBeTruthy();
      expect(screen.getByText(/55\s*%/)).toBeTruthy();
      expect(screen.getByText(/45\s*%/)).toBeTruthy();
    });

    // @req REQ-091
    it("ends each row with a ConfidenceChip that opens a SourceChainSheet on activation", async () => {
      const user = userEvent.setup();
      render(
        <FragmentationView
          fragmentation={twoCountryFragmentation}
          variant="fiche-section"
        />
      );

      const table = screen.getByRole("table");
      const rows = within(table).getAllByRole("row");
      const ghanaRow = rows[1];

      // Data is null at this layer (no confidence fields in the fragmentation
      // API response yet), so ConfidenceChip renders its "voir les sources"
      // fallback affordance — still the same component, still opens the sheet.
      const trigger = within(ghanaRow).getByText("voir les sources");
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText("Chaîne des sources")).toBeTruthy();
      });
    });

    // @req REQ-091
    it("renders the heading via AutonymExonymHeading, endonym first", () => {
      render(
        <FragmentationView
          fragmentation={twoCountryFragmentation}
          variant="fiche-section"
        />
      );

      const heading = screen.getByRole("heading");
      expect(heading.textContent).toContain("Eʋeawo");
      // Endonym-first: autonym text must appear before exonym text.
      const autonymIndex = heading.textContent!.indexOf("Eʋeawo");
      const exonymIndex = heading.textContent!.indexOf("Ewe");
      expect(autonymIndex).toBeGreaterThanOrEqual(0);
      expect(autonymIndex).toBeLessThan(exonymIndex);

      // Rendered through the shared AutonymExonymHeading component.
      expect(
        document.querySelector(".AutonymExonymHeading")
      ).toBeInTheDocument();
    });
  });

  describe("colonial border annotation", () => {
    // @req REQ-091
    it("shows the colonial marker + explicit text label when colonialOrigin is documented", () => {
      render(
        <FragmentationView
          fragmentation={twoCountryFragmentation}
          variant="fiche-section"
        />
      );

      expect(
        screen.getByText(/frontière issue du partage colonial/i)
      ).toBeTruthy();
    });

    // @req REQ-091
    it("renders nothing for border pairs without a documented colonialOrigin", () => {
      render(
        <FragmentationView
          fragmentation={noColonialOriginFragmentation}
          variant="fiche-section"
        />
      );

      expect(
        screen.queryByText(/frontière issue du partage colonial/i)
      ).toBeNull();
    });
  });

  describe("single-country people", () => {
    // @req REQ-091
    it("renders nothing (no empty-state) when countryCount is 1", () => {
      const { container } = render(
        <FragmentationView
          fragmentation={singleCountryFragmentation}
          variant="fiche-section"
        />
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("variant=module-index", () => {
    // @req REQ-091
    it("renders a compact summary without throwing for a multi-country people", () => {
      render(
        <FragmentationView
          fragmentation={twoCountryFragmentation}
          variant="module-index"
        />
      );

      expect(screen.getByText(/2/)).toBeTruthy();
    });

    // @req REQ-091
    it("renders nothing for a single-country people", () => {
      const { container } = render(
        <FragmentationView
          fragmentation={singleCountryFragmentation}
          variant="module-index"
        />
      );

      expect(container).toBeEmptyDOMElement();
    });
  });
});
