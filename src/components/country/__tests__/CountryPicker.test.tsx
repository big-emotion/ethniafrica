import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CountryPicker } from "../CountryPicker";
import { AFRICA_ADMIN0 } from "@/lib/atlas/assets/africaAdmin0";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

/**
 * Two with an outline and one without. The stand-in is a code the admin-0
 * asset does not carry at all: the six African states that used to be missing
 * have since been added to it, so pinning the test to one of them would make
 * it green for the wrong reason the day it gained geometry.
 */
const COUNTRIES = [
  { id: "ZZZ", nameFr: "Comores", flag: "🇰🇲" },
  { id: "KEN", nameFr: "Kenya", flag: "🇰🇪" },
  { id: "NGA", nameFr: "Nigeria", flag: "🇳🇬" },
];

function open(currentCountryId = "NGA") {
  render(
    <CountryPicker countries={COUNTRIES} currentCountryId={currentCountryId} />
  );
  fireEvent.click(screen.getByRole("button", { expanded: false }));
}

describe("CountryPicker", () => {
  // @req REQ-116
  it("announces itself as a listbox trigger", () => {
    render(<CountryPicker countries={COUNTRIES} currentCountryId="NGA" />);

    const trigger = screen.getByRole("button");
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  // @req REQ-116
  it("marks the country whose fiche is open", () => {
    open();

    const current = screen.getByRole("option", { name: /Nigeria/ });
    expect(current).toHaveAttribute("aria-current", "page");
  });

  // @req REQ-116
  it("navigates to the chosen country's fiche, unversioned", () => {
    push.mockClear();
    open();

    fireEvent.click(screen.getByRole("option", { name: /Kenya/ }));

    // The bare slug renders directly; the @latest form would cost a
    // redirect on every choice.
    expect(push).toHaveBeenCalledWith("/fr/pays/KEN");
  });

  // @req REQ-116
  it("stays put when the reader picks the country already open", () => {
    push.mockClear();
    open();

    fireEvent.click(screen.getByRole("option", { name: /Nigeria/ }));

    expect(push).not.toHaveBeenCalled();
  });

  // @req REQ-116
  it("offers the countries that have a fiche but no outline", () => {
    open();

    // The premise of feeding the list from the corpus rather than the
    // geometry: a country with no admin-0 rings must still be reachable.
    expect(AFRICA_ADMIN0.ZZZ).toBeUndefined();
    expect(screen.getByRole("option", { name: /Comores/ })).toBeTruthy();
  });

  // @req REQ-116
  it("closes on Escape", () => {
    open();
    expect(screen.getByRole("listbox")).toBeTruthy();

    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });

    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
