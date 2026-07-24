/**
 * Tests for the unified AutonymExonymHeading component (ETNI-383).
 *
 * Consolidates the three previously-duplicated test suites:
 * - ui/AutonymExonymHeading.tsx (hero/inline/card: lang attribute, ipa,
 *   alternateNames expand/collapse)
 * - ui/autonym-exonym-heading.tsx (compact: exonym/autonym/code badge)
 * - people/AutonymExonymHeading.tsx (people-hero/people-section: nameMain,
 *   autonym paragraph, exonym pills)
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";

describe("AutonymExonymHeading — hero/inline/card variants", () => {
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

  // 9. ipa prop: visual span is aria-hidden; sr-only span carries aria-label with no inner text
  it("renders IPA with aria-hidden visual text and sr-only phonetic label when ipa is provided", () => {
    const { container } = render(
      <AutonymExonymHeading
        autonym="Yorùbá"
        autonymIso639_3="yor"
        ipa="jōrùbá"
      />
    );

    // Visual bracket text is present but hidden from AT
    const visualIpa = screen.getByText("[jōrùbá]");
    expect(visualIpa).toBeInTheDocument();
    expect(visualIpa).toHaveAttribute("aria-hidden", "true");

    // Screen-reader-only span has the descriptive aria-label only — no inner text
    // to prevent double-announcement on older AT (NVDA+Firefox) per ARIA 1.2 §6.3
    const srSpan = container.querySelector(
      "span.sr-only[aria-label='Prononciation phonétique : jōrùbá']"
    );
    expect(srSpan).not.toBeNull();
    expect(srSpan).toHaveAttribute(
      "aria-label",
      "Prononciation phonétique : jōrùbá"
    );
    expect(srSpan?.textContent).toBe("");
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

describe("AutonymExonymHeading — compact variant (exonym/autonym/code)", () => {
  it("renders the exonym (main name)", () => {
    render(<AutonymExonymHeading variant="compact" exonym="Bantou" />);
    expect(screen.getByText("Bantou")).toBeInTheDocument();
  });

  it("renders the code when provided", () => {
    render(
      <AutonymExonymHeading
        variant="compact"
        exonym="Bantou"
        code="FLG_BANTU"
      />
    );
    expect(screen.getByText("FLG_BANTU")).toBeInTheDocument();
  });

  it("does not render a code element when code is not provided", () => {
    render(<AutonymExonymHeading variant="compact" exonym="Bantou" />);
    expect(screen.queryByText(/FLG_/)).not.toBeInTheDocument();
  });

  it("renders the autonym when provided and different from exonym", () => {
    render(
      <AutonymExonymHeading variant="compact" exonym="Zulu" autonym="amaZulu" />
    );
    expect(screen.getByText("amaZulu")).toBeInTheDocument();
  });

  it("does not render a second name when autonym equals exonym", () => {
    render(
      <AutonymExonymHeading variant="compact" exonym="Zulu" autonym="Zulu" />
    );
    // only one element with text "Zulu" — the h3
    const all = screen.getAllByText("Zulu");
    expect(all).toHaveLength(1);
  });

  it("does not render autonym when it is null", () => {
    render(
      <AutonymExonymHeading variant="compact" exonym="Bantou" autonym={null} />
    );
    // Only the exonym heading should be present
    expect(screen.getByText("Bantou")).toBeInTheDocument();
    const italics = document.querySelectorAll("p.italic");
    expect(italics).toHaveLength(0);
  });

  it("renders exonym as the accessible heading text", () => {
    render(<AutonymExonymHeading variant="compact" exonym="Yoruba" />);
    expect(screen.getByRole("heading", { name: "Yoruba" })).toBeInTheDocument();
  });
});

describe("AutonymExonymHeading — people-hero/people-section variants", () => {
  it("renders nameMain", () => {
    render(
      <AutonymExonymHeading
        variant="people-hero"
        nameMain="Yoruba"
        exonyms={[]}
      />
    );
    expect(screen.getByText("Yoruba")).toBeTruthy();
  });

  it("renders autonym when provided", () => {
    render(
      <AutonymExonymHeading
        variant="people-hero"
        nameMain="Yoruba"
        autonym="Ọmọ Oòduà"
        exonyms={[]}
      />
    );
    expect(screen.getByText("Ọmọ Oòduà")).toBeTruthy();
  });

  it("does not render autonym section when absent", () => {
    const { container } = render(
      <AutonymExonymHeading
        variant="people-hero"
        nameMain="Yoruba"
        exonyms={[]}
      />
    );
    expect(container.querySelector("[data-autonym]")).toBeNull();
  });

  it("renders exonyms as individual pills", () => {
    render(
      <AutonymExonymHeading
        variant="people-hero"
        nameMain="Yoruba"
        exonyms={["Yariba", "Ioruba"]}
      />
    );
    expect(screen.getByText("Yariba")).toBeTruthy();
    expect(screen.getByText("Ioruba")).toBeTruthy();
  });

  it("renders nothing for exonyms when list is empty", () => {
    const { container } = render(
      <AutonymExonymHeading
        variant="people-section"
        nameMain="Yoruba"
        exonyms={[]}
      />
    );
    expect(container.querySelector("[data-exonyms]")).toBeNull();
  });
});
