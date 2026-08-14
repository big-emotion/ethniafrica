import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MigrationsAtlasView } from "../MigrationsAtlasView";

// @req FR81
describe("MigrationsAtlasView", () => {
  // @req REQ-101 FR81
  it("renders the static Carte placeholder text (map lands in Story 12.9)", () => {
    render(<MigrationsAtlasView />);
    expect(
      screen.getByText(
        "La carte interactive des migrations arrive avec la Story 12.9."
      )
    ).toBeInTheDocument();
  });
});
