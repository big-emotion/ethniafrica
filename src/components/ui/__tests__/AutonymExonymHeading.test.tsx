/**
 * Tests for AutonymExonymHeading component.
 *
 * Covers autonym lang attribute, exonym rendering, variant class application,
 * alternateNames expand/collapse behaviour, IPA pronunciation, and required-only props.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";

describe("AutonymExonymHeading", () => {
  // 1. Renders autonym with correct lang attribute
  it("renders autonym with correct lang attribute", () => {
    render(<AutonymExonymHeading autonym="Yorùbá" autonymIso639_3="yor" />);
    const autonymEl = screen.getByText("Yorùbá");
    expect(autonymEl).toHaveAttribute("lang", "yor");
  });

  // 2. Renders exonym beside autonym
  it("renders exonym beside autonym", () => {
    render(
      <AutonymExonymHeading
        autonym="Yorùbá"
        autonymIso639_3="yor"
        exonym="Yoruba"
      />
    );
    expect(screen.getByText("Yorùbá")).toBeInTheDocument();
    expect(screen.getByText("Yoruba")).toBeInTheDocument();
  });

  // 3. variant="hero" applies Fraunces font class and weight-900 class
  it('variant="hero" applies Fraunces font class and weight-900 class', () => {
    render(
      <AutonymExonymHeading
        autonym="Yorùbá"
        autonymIso639_3="yor"
        variant="hero"
      />
    );
    const autonymEl = screen.getByText("Yorùbá");
    expect(autonymEl.className).toMatch(/font-afh-display/);
    expect(autonymEl.className).toMatch(/font-black/);
    expect(autonymEl.className).toMatch(/text-afh-hero/);

    // Renders as h1
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
  });

  // 4. variant="inline" applies correct classes
  it('variant="inline" applies correct classes', () => {
    render(
      <AutonymExonymHeading
        autonym="Yorùbá"
        autonymIso639_3="yor"
        exonym="Yoruba"
        variant="inline"
      />
    );
    const autonymEl = screen.getByText("Yorùbá");
    expect(autonymEl.className).toMatch(/font-afh-display/);
    expect(autonymEl.className).toMatch(/font-bold/);
    expect(autonymEl.className).toMatch(/text-afh-h2/);

    const exonymEl = screen.getByText("Yoruba");
    expect(exonymEl.className).toMatch(/font-afh/);
    expect(exonymEl.className).toMatch(/font-medium/);
    expect(exonymEl.className).toMatch(/text-afh-h3/);

    // Renders as h2
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toBeInTheDocument();
  });

  // 5. variant="card" applies correct classes
  it('variant="card" applies correct classes', () => {
    render(
      <AutonymExonymHeading
        autonym="Yorùbá"
        autonymIso639_3="yor"
        exonym="Yoruba"
        variant="card"
      />
    );
    const autonymEl = screen.getByText("Yorùbá");
    expect(autonymEl.className).toMatch(/font-afh-display/);
    expect(autonymEl.className).toMatch(/font-semibold/);
    expect(autonymEl.className).toMatch(/text-afh-h3/);

    const exonymEl = screen.getByText("Yoruba");
    expect(exonymEl.className).toMatch(/font-afh/);
    expect(exonymEl.className).toMatch(/font-medium/);
    expect(exonymEl.className).toMatch(/text-afh-body/);

    // Renders as h3
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toBeInTheDocument();
  });

  // 6. Missing alternateNames renders nothing for that section
  it("renders no alternate names section when alternateNames is omitted", () => {
    const { container } = render(
      <AutonymExonymHeading autonym="Yorùbá" autonymIso639_3="yor" />
    );
    expect(container.querySelector("[data-alternate-names]")).toBeNull();
  });

  // 7. alternateNames with 1 entry: shows it, no "+N autres" button
  it("alternateNames with 1 entry shows it without a toggle button", () => {
    render(
      <AutonymExonymHeading
        autonym="Yorùbá"
        autonymIso639_3="yor"
        alternateNames={["Yoruba"]}
      />
    );
    expect(screen.getByText("Yoruba")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  // 8. alternateNames with 3 entries: shows first, "+2 autres" button; clicking expands
  it("alternateNames with 3 entries shows first name and toggle button that expands rest", async () => {
    const user = userEvent.setup();
    render(
      <AutonymExonymHeading
        autonym="Yorùbá"
        autonymIso639_3="yor"
        alternateNames={["Yoruba", "Yooruba", " Yorùbá-Nago"]}
      />
    );

    // First name always visible
    expect(screen.getByText("Yoruba")).toBeInTheDocument();
    // "+2 autres" button present
    const btn = screen.getByRole("button", { name: "+2 autres" });
    expect(btn).toBeInTheDocument();
    // Hidden names not yet shown
    expect(screen.queryByText("Yooruba")).toBeNull();
    expect(screen.queryByText("Yorùbá-Nago")).toBeNull();

    // Click to expand
    await user.click(btn);
    expect(screen.getByText("Yooruba")).toBeInTheDocument();
    expect(screen.getByText("Yorùbá-Nago")).toBeInTheDocument();
    // Button changes to "Réduire"
    expect(screen.getByRole("button", { name: "Réduire" })).toBeInTheDocument();

    // Click again to collapse
    await user.click(screen.getByRole("button", { name: "Réduire" }));
    expect(screen.queryByText("Yooruba")).toBeNull();
    expect(screen.queryByText("Yorùbá-Nago")).toBeNull();
  });

  // 9. ipa prop: renders IPA with correct aria-label
  it("renders IPA with correct aria-label when ipa is provided", () => {
    render(
      <AutonymExonymHeading
        autonym="Yorùbá"
        autonymIso639_3="yor"
        ipa="jōrùbá"
      />
    );
    const ipaEl = screen.getByText("[jōrùbá]");
    expect(ipaEl).toBeInTheDocument();
    expect(ipaEl).toHaveAttribute(
      "aria-label",
      "Prononciation phonétique : jōrùbá"
    );
  });

  // 10. No ipa: IPA element absent
  it("does not render IPA element when ipa prop is omitted", () => {
    render(<AutonymExonymHeading autonym="Yorùbá" autonymIso639_3="yor" />);
    expect(screen.queryByText(/^\[.*\]$/)).toBeNull();
  });

  // 11. Required props only: component renders correctly
  it("renders correctly with only required props (autonym + autonymIso639_3)", () => {
    const { container } = render(
      <AutonymExonymHeading autonym="Hausa" autonymIso639_3="hau" />
    );
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByText("Hausa")).toBeInTheDocument();
    // Default variant is hero → h1
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});
