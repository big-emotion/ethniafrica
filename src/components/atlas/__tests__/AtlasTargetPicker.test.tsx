import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AtlasTargetPicker } from "@/components/atlas/AtlasTargetPicker";
import type { AtlasTarget } from "@/lib/atlas/targets";

const targets: AtlasTarget[] = [
  {
    countryId: "NGA",
    nameFr: "Nigeria",
    center: { lon: 8, lat: 9 },
    angularSpanDeg: 10,
  },
  {
    countryId: "BEN",
    nameFr: "Bénin",
    center: { lon: 2, lat: 9 },
    angularSpanDeg: 4,
  },
  {
    countryId: "TGO",
    nameFr: "Togo",
    center: { lon: 1, lat: 8 },
    angularSpanDeg: 3,
  },
];

const subtitles = { NGA: "29 peuples", BEN: "6 peuples", TGO: "1 peuple" };

function renderPicker(
  props: Partial<React.ComponentProps<typeof AtlasTargetPicker>> = {}
) {
  const onChoose = vi.fn();
  render(
    <AtlasTargetPicker
      targets={targets}
      subtitleByCountry={subtitles}
      chosenCountryId={null}
      onChoose={onChoose}
      {...props}
    />
  );
  return { onChoose };
}

const trigger = () =>
  screen.getByRole("button", { name: /pays de l'empreinte/i });

describe("AtlasTargetPicker", () => {
  // A family has an empreinte and a people has an aire de présence. The
  // globe's "Toute l'aire" button already says so; a picker still offering
  // "un pays de l'empreinte" underneath would contradict it on the same map.
  // @req REQ-117
  it("names the area the fiche's own way", () => {
    renderPicker({ areaNoun: "présence" });

    expect(
      screen.getByRole("button", { name: "Choisir un pays de présence" })
    ).toHaveTextContent("Choisir un pays de présence");
    expect(
      screen.queryByRole("button", { name: /empreinte/i })
    ).not.toBeInTheDocument();
  });

  // @req REQ-117
  it("starts closed, and says so", () => {
    renderPicker();

    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  // @req REQ-117
  it("offers one option per country, named in French with its member count", () => {
    renderPicker();
    fireEvent.click(trigger());

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent("Nigeria");
    expect(options[0]).toHaveTextContent("29 peuples");
  });

  // @req REQ-117
  it("agrees the count with the noun it counts", () => {
    // "1 peuples" would be the kind of detail that makes a page read as
    // machine output.
    renderPicker();
    fireEvent.click(trigger());

    expect(screen.getByRole("option", { name: /Togo/ })).toHaveTextContent(
      "1 peuple"
    );
    expect(screen.getByRole("option", { name: /Togo/ })).not.toHaveTextContent(
      "1 peuples"
    );
  });

  // @req REQ-117
  it("keeps the order it is given, which is the footprint's density order", () => {
    renderPicker();
    fireEvent.click(trigger());

    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      expect.stringContaining("Nigeria"),
      expect.stringContaining("Bénin"),
      expect.stringContaining("Togo"),
    ]);
  });

  // @req REQ-117
  it("moves focus into the list when it opens, so the keyboard goes where the eye does", () => {
    renderPicker();
    fireEvent.click(trigger());

    expect(screen.getAllByRole("option")[0]).toHaveFocus();
  });

  // @req REQ-117
  it("marks only the chosen country as selected", () => {
    renderPicker({ chosenCountryId: "BEN" });
    fireEvent.click(trigger());

    expect(screen.getByRole("option", { name: /Bénin/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("option", { name: /Nigeria/ })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  // @req REQ-117
  it("names the chosen country on the trigger once one is chosen", () => {
    renderPicker({ chosenCountryId: "BEN" });
    expect(trigger()).toHaveTextContent("Bénin");
  });

  // @req REQ-117
  it("reports the choice and closes", () => {
    const { onChoose } = renderPicker();
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("option", { name: /Bénin/ }));

    expect(onChoose).toHaveBeenCalledWith("BEN");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  // @req REQ-117
  it("closes on Escape and hands focus back to the trigger", () => {
    // Without the focus handback, dismissing the list drops a keyboard reader
    // at the top of the document with no way back to where they were.
    renderPicker();
    fireEvent.click(trigger());
    fireEvent.keyDown(screen.getAllByRole("option")[0], { key: "Escape" });

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  // @req REQ-117
  it("walks the list with the arrow keys and wraps at both ends", () => {
    renderPicker();
    fireEvent.click(trigger());
    const options = () => screen.getAllByRole("option");

    fireEvent.keyDown(options()[0], { key: "ArrowDown" });
    expect(options()[1]).toHaveFocus();

    fireEvent.keyDown(options()[1], { key: "ArrowUp" });
    expect(options()[0]).toHaveFocus();

    // Wrapping backwards from the first option is what makes the last one
    // reachable without walking the whole list.
    fireEvent.keyDown(options()[0], { key: "ArrowUp" });
    expect(options()[2]).toHaveFocus();
  });

  // @req REQ-117
  it("renders no marker of its own — seventeen pastilles would overlap into noise", () => {
    // The reason this component exists: the family footprint reaches
    // seventeen countries, several of them small and adjacent.
    renderPicker();
    expect(
      document.querySelector("[data-atlas-target]")
    ).not.toBeInTheDocument();
  });
});
