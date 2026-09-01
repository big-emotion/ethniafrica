import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PatronymeBearersSection } from "@/components/patronymes/PatronymeBearersSection";
import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";

const base: PublicPatronyme = {
  id: "PAT_KEITA",
  nameMain: "Keïta",
  nameSystem: "clan_name",
  casteOrSocialFunction: null,
  content: {},
  associatedPeoples: [],
  associatedCountries: [],
  bearers: [],
};

describe("PatronymeBearersSection (AC3, DEC-040, REQ-133)", () => {
  // @req REQ-133
  it("lists a bearer by id, fullName and roleCategory only", () => {
    render(
      <PatronymeBearersSection
        patronyme={{
          ...base,
          bearers: [
            {
              id: "PER_1",
              fullName: "Modibo Keïta",
              roleCategory: "chef d'État",
            },
          ],
        }}
      />
    );

    expect(screen.getByText("Modibo Keïta")).toBeInTheDocument();
    expect(screen.getByText("chef d'État")).toBeInTheDocument();
  });

  // @req REQ-133
  it("always states the DEC-040 editorial policy alongside the list", () => {
    render(
      <PatronymeBearersSection
        patronyme={{
          ...base,
          bearers: [
            {
              id: "PER_1",
              fullName: "Modibo Keïta",
              roleCategory: "chef d'État",
            },
          ],
        }}
      />
    );

    expect(
      screen.getByText(/ne permet de déduire l'origine ethnique/)
    ).toBeInTheDocument();
  });

  // @req REQ-133
  it("states explicitly when no bearer is documented (atlas charter §4)", () => {
    render(<PatronymeBearersSection patronyme={base} />);

    expect(
      screen.getByText("Aucun porteur ou porteuse n'est encore documenté.")
    ).toBeInTheDocument();
  });

  // @req REQ-133
  it("falls back to a stated label when roleCategory is empty", () => {
    render(
      <PatronymeBearersSection
        patronyme={{
          ...base,
          bearers: [
            { id: "PER_1", fullName: "Modibo Keïta", roleCategory: "" },
          ],
        }}
      />
    );

    expect(screen.getByText("Rôle non renseigné")).toBeInTheDocument();
  });
});
