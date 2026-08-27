import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { GameScopePicker } from "./GameScopePicker";

const choices = {
  countries: [
    { id: "GHA", labelFr: "Ghana" },
    { id: "KEN", labelFr: "Kenya" },
  ],
  families: [{ id: "FLG_NIGER_CONGO", labelFr: "Niger-Congo" }],
};

describe("GameScopePicker", () => {
  // @req REQ-120
  it("submits its two narrowings as query parameters on the game's own path", () => {
    render(
      <GameScopePicker
        choices={choices}
        scope={null}
        action="/fr/jouer/appellations"
      />
    );

    const form = screen.getByTestId("game-scope-picker");
    expect(form).toHaveAttribute("action", "/fr/jouer/appellations");
    expect(form).toHaveAttribute("method", "get");
    expect(screen.getByLabelText("Pays")).toHaveAttribute("name", "pays");
    expect(screen.getByLabelText("Famille linguistique")).toHaveAttribute(
      "name",
      "famille"
    );
  });

  // @req REQ-120
  it("offers a way back out of every narrowing", () => {
    render(
      <GameScopePicker
        choices={choices}
        scope={{ countryId: "GHA" }}
        action="/fr/jouer/appellations"
      />
    );

    // Without an empty option a reader could narrow once and never widen
    // again, since the page rebuilds the session from the URL.
    expect(screen.getByRole("option", { name: "Tous les pays" })).toHaveValue(
      ""
    );
    expect(
      screen.getByRole("option", { name: "Toutes les familles" })
    ).toHaveValue("");
  });

  // @req REQ-120
  it("shows the narrowing already in force as the selected one", () => {
    render(
      <GameScopePicker
        choices={choices}
        scope={{ countryId: "KEN", familyId: "FLG_NIGER_CONGO" }}
        action="/fr/jouer/appellations"
      />
    );

    expect(screen.getByLabelText("Pays")).toHaveValue("KEN");
    expect(screen.getByLabelText("Famille linguistique")).toHaveValue(
      "FLG_NIGER_CONGO"
    );
  });

  // @req REQ-120
  it("names every country and family the corpus offers", () => {
    render(
      <GameScopePicker
        choices={choices}
        scope={null}
        action="/fr/jouer/appellations"
      />
    );

    expect(screen.getByRole("option", { name: "Ghana" })).toHaveValue("GHA");
    expect(screen.getByRole("option", { name: "Kenya" })).toHaveValue("KEN");
    expect(screen.getByRole("option", { name: "Niger-Congo" })).toHaveValue(
      "FLG_NIGER_CONGO"
    );
  });
});
