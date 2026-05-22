import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AutonymExonymHeading } from "../autonym-exonym-heading";

describe("AutonymExonymHeading", () => {
  it("renders the exonym (main name)", () => {
    render(<AutonymExonymHeading exonym="Bantou" />);
    expect(screen.getByText("Bantou")).toBeInTheDocument();
  });

  it("renders the code when provided", () => {
    render(<AutonymExonymHeading exonym="Bantou" code="FLG_BANTU" />);
    expect(screen.getByText("FLG_BANTU")).toBeInTheDocument();
  });

  it("does not render a code element when code is not provided", () => {
    render(<AutonymExonymHeading exonym="Bantou" />);
    expect(screen.queryByText(/FLG_/)).not.toBeInTheDocument();
  });

  it("renders the autonym when provided and different from exonym", () => {
    render(<AutonymExonymHeading exonym="Zulu" autonym="amaZulu" />);
    expect(screen.getByText("amaZulu")).toBeInTheDocument();
  });

  it("does not render a second name when autonym equals exonym", () => {
    render(<AutonymExonymHeading exonym="Zulu" autonym="Zulu" />);
    // only one element with text "Zulu" — the h3
    const all = screen.getAllByText("Zulu");
    expect(all).toHaveLength(1);
  });

  it("does not render autonym when it is null", () => {
    render(<AutonymExonymHeading exonym="Bantou" autonym={null} />);
    // Only the exonym heading should be present
    expect(screen.getByText("Bantou")).toBeInTheDocument();
    const italics = document.querySelectorAll("p.italic");
    expect(italics).toHaveLength(0);
  });

  it("renders exonym as the accessible heading text", () => {
    render(<AutonymExonymHeading exonym="Yoruba" />);
    expect(screen.getByRole("heading", { name: "Yoruba" })).toBeInTheDocument();
  });
});
