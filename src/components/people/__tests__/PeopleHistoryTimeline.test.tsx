import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PeopleHistoryTimeline } from "../PeopleHistoryTimeline";

describe("PeopleHistoryTimeline", () => {
  afterEach(cleanup);

  // @req REQ-155
  it("returns nothing when the fiche declares no history topic", () => {
    const { container } = render(<PeopleHistoryTimeline data={{}} />);
    expect(container.firstChild).toBeNull();
  });

  // @req REQ-155
  it("renders one undated station per declared topic, each under its own name", () => {
    render(
      <PeopleHistoryTimeline
        language="en"
        data={{
          kingdomsOrChiefdoms: "The Anlo chiefdom.",
          conflictsOrAlliances: "Civil wars in the 19th century.",
        }}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Kingdoms and chiefdoms" })
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Conflicts and alliances" })
    ).toBeVisible();
    expect(screen.getByText("The Anlo chiefdom.")).toBeVisible();
    expect(screen.getByText("Civil wars in the 19th century.")).toBeVisible();
    // content.history carries no date field: every station reads undated.
    expect(screen.getAllByText("Undated")).toHaveLength(2);
  });

  // @req REQ-155
  it("omits a topic the fiche leaves empty", () => {
    render(
      <PeopleHistoryTimeline
        language="en"
        data={{ diaspora: "Communities abroad." }}
      />
    );

    expect(screen.getByText("Communities abroad.")).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Kingdoms and chiefdoms" })
    ).not.toBeInTheDocument();
  });
});
