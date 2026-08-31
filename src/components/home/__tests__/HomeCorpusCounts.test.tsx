import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeCorpusCounts } from "@/components/home/HomeCorpusCounts";

describe("HomeCorpusCounts — the corpus in three honest figures (ETNI-1511)", () => {
  // @req REQ-113
  it("renders the three totals supplied by the server", () => {
    render(
      <HomeCorpusCounts
        counts={{ peoples: 4213, countries: 91, families: 37, migrations: 5 }}
      />
    );

    expect(screen.getByTestId("home-count-peoples")).toHaveTextContent(
      /4\s?213/
    );
    expect(screen.getByTestId("home-count-peoples")).toHaveTextContent(
      "Peuples"
    );
    expect(screen.getByTestId("home-count-countries")).toHaveTextContent("91");
    expect(screen.getByTestId("home-count-countries")).toHaveTextContent(
      "Pays"
    );
    expect(screen.getByTestId("home-count-families")).toHaveTextContent("37");
    expect(screen.getByTestId("home-count-families")).toHaveTextContent(
      "Familles linguistiques"
    );
  });

  // A database failure is not an empty corpus. Printing zero would turn an
  // operational failure into a false claim on the site's most visible page.
  // @req REQ-113
  it("states that totals are unavailable instead of replacing them with zero", () => {
    render(<HomeCorpusCounts counts={null} />);

    expect(screen.getAllByText("Indisponible")).toHaveLength(3);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    for (const item of screen.getAllByTestId(/^home-count-/)) {
      expect(item).toHaveAttribute("data-state", "unavailable");
    }
  });
});
