import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AtlasCountryPicker } from "@/components/atlas/AtlasCountryPicker";
import type { AtlasTarget } from "@/lib/atlas/targets";

const target = (countryId: string, nameFr: string): AtlasTarget => ({
  countryId,
  nameFr,
  center: { lon: 0, lat: 0 },
  angularSpanDeg: 10,
});

const targets = [
  target("NGA", "Nigeria"),
  target("BEN", "Bénin"),
  target("TGO", "Togo"),
];

function renderPicker(
  props: Partial<Parameters<typeof AtlasCountryPicker>[0]> = {}
) {
  const onChoose = vi.fn();
  render(
    <AtlasCountryPicker
      targets={targets}
      chosenCountryId={null}
      onChoose={onChoose}
      {...props}
    />
  );
  return { onChoose };
}

const openList = () =>
  fireEvent.click(screen.getByRole("button", { name: /Choisir un pays/ }));

describe("AtlasCountryPicker (REQ-117)", () => {
  // A country that has rotated behind the sphere has no marker to click. The
  // picker is what makes it reachable without dragging the globe first.
  // @req REQ-117
  it("lists the countries of presence, not the continent", () => {
    renderPicker();
    openList();

    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.getByRole("option", { name: /Nigeria/ })).toBeInTheDocument();
  });

  // @req REQ-117
  it("carries listbox semantics rather than looking like a list", () => {
    renderPicker();
    const trigger = screen.getByRole("button", { name: /Choisir un pays/ });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  // @req REQ-117
  it("moves through the options with the arrow keys", () => {
    renderPicker();
    openList();

    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveFocus();

    fireEvent.keyDown(options[0], { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]).toHaveFocus();

    fireEvent.keyDown(screen.getAllByRole("option")[1], { key: "ArrowUp" });
    expect(screen.getAllByRole("option")[0]).toHaveFocus();
  });

  // Closing without handing focus back strands a keyboard reader at the top of
  // the document, several tab stops from where they were.
  // @req REQ-117
  it("closes on Escape and returns focus to the trigger", () => {
    renderPicker();
    const trigger = screen.getByRole("button", { name: /Choisir un pays/ });
    fireEvent.click(trigger);

    fireEvent.keyDown(screen.getAllByRole("option")[0], { key: "Escape" });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  // @req REQ-117
  it("reports the chosen country and marks it selected", () => {
    const { onChoose } = renderPicker({ chosenCountryId: "BEN" });
    // The trigger names the chosen country once there is one, so the
    // invitation is no longer what opens the list.
    fireEvent.click(screen.getByRole("button", { name: /Bénin/ }));

    expect(screen.getByRole("option", { name: /Bénin/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("option", { name: /Nigeria/ })).toHaveAttribute(
      "aria-selected",
      "false"
    );

    fireEvent.click(screen.getByRole("option", { name: /Togo/ }));

    expect(onChoose).toHaveBeenCalledWith("TGO");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  // @req REQ-117
  it("names the chosen country on the trigger instead of the invitation", () => {
    renderPicker({ chosenCountryId: "BEN" });

    expect(screen.getByRole("button", { name: /Bénin/ })).toBeInTheDocument();
  });

  // Half the corpus — 394 of 789 fiches — declares exactly one country. A
  // picker with one entry offers a choice that is not one.
  // @req REQ-117
  it("renders nothing for a people confined to a single country", () => {
    const { container } = render(
      <AtlasCountryPicker
        targets={[target("NGA", "Nigeria")]}
        chosenCountryId={null}
        onChoose={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
