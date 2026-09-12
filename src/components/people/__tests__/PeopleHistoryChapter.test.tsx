import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PeopleHistoryChapter } from "../PeopleHistoryChapter";

describe("PeopleHistoryChapter", () => {
  afterEach(cleanup);

  // @req REQ-003
  it("places the declared formation period on a chronological spine without repeating it", () => {
    render(
      <PeopleHistoryChapter
        language="fr"
        origin={{
          ancientOrigins: "Des migrations depuis Notsé.",
          formationPeriod: "Vers le XVIIe siècle",
          migrationRoutes: [],
          historicalSettlementZones: [],
          majorHistoricalEvents: "Un établissement à Keta.",
        }}
        history={{ kingdomsOrChiefdoms: "Une chefferie à Anlo." }}
      />
    );

    const timeline = screen.getByRole("list", { name: /chronologie/i });
    expect(within(timeline).getAllByText("Vers le XVIIe siècle")).toHaveLength(
      1
    );
    expect(within(timeline).getByText(/migrations depuis Notsé/)).toBeVisible();
    expect(within(timeline).getByText(/établissement à Keta/)).toBeVisible();
    expect(within(timeline).getByText(/chefferie à Anlo/)).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Rôle historique" })
    ).toBeVisible();
  });

  // @req REQ-003
  it("keeps undated stations visible without supplying an invented year", () => {
    render(
      <PeopleHistoryChapter
        language="en"
        origin={{
          migrationRoutes: ["Notsé to Keta"],
          historicalSettlementZones: ["Keta"],
        }}
        history={{ diaspora: "Communities beyond the region." }}
      />
    );

    expect(screen.getByText("Notsé to Keta")).toBeVisible();
    expect(screen.getByText("Communities beyond the region.")).toBeVisible();
    expect(screen.queryByText(/\d{3,4}/)).not.toBeInTheDocument();
  });

  // @req REQ-119
  it("shows a provenance gap when both source rubrics are empty", () => {
    render(
      <PeopleHistoryChapter
        language="fr"
        origin={{ migrationRoutes: [], historicalSettlementZones: [] }}
        history={{}}
      />
    );

    expect(screen.getByRole("status")).toBeVisible();
  });
});
