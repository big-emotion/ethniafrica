import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccessModeHub } from "@/components/hubs/AccessModeHub";
import { getLocalizedRoute } from "@/lib/routing";
import type { HubModule } from "@/lib/hubs/moduleAvailability";

const peuplesModules: HubModule[] = [
  {
    id: "peuples",
    name: "Peuples",
    accessMode: "peuples",
    page: "peoples",
    availability: "data",
    dataSource: "afrik_peoples",
    available: true,
  },
  {
    id: "noms",
    name: "Noms & appellations",
    accessMode: "peuples",
    page: "names",
    availability: "data",
    dataSource: "name_records",
    available: false,
  },
  {
    id: "comparer",
    name: "Comparer deux peuples",
    accessMode: "peuples",
    page: "compare",
    availability: "unavailable",
    available: false,
  },
];

describe("AccessModeHub — hub component (ETNI-1216, REQ-114/REQ-106)", () => {
  // @req REQ-114
  it("renders the hub title for the access mode", () => {
    render(
      <AccessModeHub language="fr" mode="peuples" modules={peuplesModules} />
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Peuples" })
    ).toBeInTheDocument();
  });

  // @req REQ-114 @req REQ-106
  it("renders a live module as a link to its route", () => {
    render(
      <AccessModeHub language="fr" mode="peuples" modules={peuplesModules} />
    );

    const link = screen.getByTestId("hub-module-link-peuples");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", getLocalizedRoute("fr", "peoples"));
  });

  // @req REQ-114 @req REQ-106
  it("renders an unavailable data module with no anchor element", () => {
    render(
      <AccessModeHub language="fr" mode="peuples" modules={peuplesModules} />
    );

    expect(
      screen.getByTestId("hub-module-unavailable-noms")
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("hub-module-link-noms")
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("hub-module-unavailable-noms").querySelector("a")
    ).toBeNull();
  });

  // @req REQ-114 @req REQ-106
  it("renders a module forced unavailable (comparer) with no anchor element", () => {
    render(
      <AccessModeHub language="fr" mode="peuples" modules={peuplesModules} />
    );

    expect(
      screen.getByTestId("hub-module-unavailable-comparer")
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("hub-module-link-comparer")
    ).not.toBeInTheDocument();
  });

  // @req REQ-106
  it("labels every unavailable module Bientôt", () => {
    render(
      <AccessModeHub language="fr" mode="peuples" modules={peuplesModules} />
    );

    expect(screen.getByTestId("hub-module-unavailable-noms")).toHaveTextContent(
      "Bientôt"
    );
    expect(
      screen.getByTestId("hub-module-unavailable-comparer")
    ).toHaveTextContent("Bientôt");
  });
});
