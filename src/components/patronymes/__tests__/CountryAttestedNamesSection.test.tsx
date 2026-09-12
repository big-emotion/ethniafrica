import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CountryAttestedNamesSection } from "@/components/patronymes/CountryAttestedNamesSection";
import { getPatronymeRoute } from "@/lib/routing";

const name = (
  id: string,
  nameMain: string,
  nameSystem: "clan_name" | "nisba" = "clan_name"
) => ({ id, nameMain, nameSystem });

const reach = (id: string, nameMain: string, peopleName = "Zénètes") => ({
  ...name(id, nameMain),
  viaPeoples: [{ id: "PPL_ZENATA", nameMain: peopleName }],
});

describe("CountryAttestedNamesSection", () => {
  // @req REQ-154
  it("renames the chapter in both languages without breaking its published anchors or adding a subtitle", () => {
    const { rerender } = render(
      <CountryAttestedNamesSection
        language="fr"
        patronymes={{
          attested: [name("PAT_KEITA", "Keïta")],
          borneByPeoples: [reach("PAT_MAGHRAWA", "Maghrawa")],
        }}
      />
    );

    const frenchChapter = screen.getByRole("region", { name: "Noms du pays" });
    expect(frenchChapter).toHaveAttribute("id", "chapitre-noms-attestes");
    expect(frenchChapter).not.toHaveTextContent("Deux registres distincts");

    rerender(
      <CountryAttestedNamesSection
        language="en"
        patronymes={{
          attested: [name("PAT_KEITA", "Keïta")],
          borneByPeoples: [reach("PAT_MAGHRAWA", "Maghrawa")],
        }}
      />
    );
    expect(
      screen.getByRole("region", { name: "Names of the country" })
    ).toHaveAttribute("id", "chapitre-attested-names");
  });

  // @req REQ-154
  it("indexes and sorts every name A–Z within its provenance register without pagination", () => {
    const attested = [
      name("PAT_ZURI", "Zuri"),
      name("PAT_KEITA", "Keïta"),
      name("PAT_ABA", "Aba"),
      name("PAT_ADE", "Adé"),
    ];
    const many = Array.from({ length: 82 }, (_, index) =>
      name(`PAT_TEST_${index}`, `Kalo ${String(index).padStart(2, "0")}`)
    );
    render(
      <CountryAttestedNamesSection
        language="fr"
        patronymes={{
          attested: [...attested, ...many],
          borneByPeoples: [reach("PAT_MAGHRAWA", "Maghrawa")],
        }}
      />
    );

    const registers = screen.getAllByRole("definition");
    const direct = registers[0];
    const via = registers[1];
    const directIndex = within(direct).getByRole("navigation", {
      name: /index alphabétique/i,
    });
    expect(
      within(directIndex)
        .getAllByRole("link")
        .map((link) => link.textContent)
    ).toEqual(["A", "K", "Z"]);
    expect(
      within(directIndex).getByRole("link", { name: "K" })
    ).toHaveAttribute("href", "#country-name-attested-k");
    expect(
      direct.querySelector("#country-name-attested-k")
    ).toBeInTheDocument();
    expect(
      within(via).getByRole("navigation", { name: /index alphabétique/i })
    ).toBeInTheDocument();
    expect(within(via).getByRole("link", { name: "Maghrawa" })).toHaveAttribute(
      "href",
      getPatronymeRoute("fr", "PAT_MAGHRAWA")
    );
    const directLinks = within(direct)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/"));
    expect(directLinks).toHaveLength(86);
    expect(directLinks.slice(0, 3).map((link) => link.textContent)).toEqual([
      "Aba",
      "Adé",
      "Kalo 00",
    ]);
    expect(
      within(direct).queryByRole("button", { name: /suivant|précédent/i })
    ).not.toBeInTheDocument();
  });

  /**
   * The index used to show only the letters that landed. Three pills told a
   * reader the list was three letters long; they could not tell that from the
   * twenty-three the corpus has nothing under. Showing the whole alphabet
   * turns the silence into something visible — which is the fact the atlas
   * exists to publish — and the absent letters are plainly not links, so
   * nothing invites a reader to press one.
   */
  /**
   * A name whose gloss is folded into the one above it is alone in its row:
   * no sentence around it, so it is a control in a list and owes the full
   * 44px. The e2e tap-target sweep counted 45 such names on the Comoros
   * fiche at 23px tall. happy-dom lays nothing out, so the floor is asserted
   * as the class that sets it, on every row — a row loses its gloss by data,
   * not by design, and the target cannot depend on which one it drew.
   */
  // @req REQ-154
  it("gives every name a 44px hit area, whether or not its gloss is shown", () => {
    render(
      <CountryAttestedNamesSection
        language="fr"
        patronymes={{
          attested: [name("PAT_ALI", "Ali"), name("PAT_AHMED", "Ahmed")],
          borneByPeoples: [],
        }}
      />
    );

    // Both axes: a three-letter name such as « Ali » is 22px wide at body
    // size, so a height floor alone left it a sliver of a target.
    for (const label of ["Ali", "Ahmed"]) {
      expect(screen.getByRole("link", { name: label })).toHaveClass(
        "min-h-11",
        "min-w-11"
      );
    }
  });

  // @req REQ-154
  it("shows the whole alphabet, so a gap reads as a gap and not as the end", () => {
    render(
      <CountryAttestedNamesSection
        language="fr"
        patronymes={{
          attested: [name("PAT_ABA", "Aba"), name("PAT_KEITA", "Keïta")],
          borneByPeoples: [],
        }}
      />
    );

    const index = screen.getAllByRole("navigation", {
      name: /index alphabétique/i,
    })[0];

    expect(index.querySelectorAll("[data-letter]")).toHaveLength(26);
    expect(
      Array.from(index.querySelectorAll('[data-letter="present"]'), (pill) =>
        pill.textContent?.trim()
      )
    ).toEqual(["A", "K"]);
    expect(index.querySelectorAll('[data-letter="absent"]')).toHaveLength(24);
    expect(index.querySelector('[data-letter="absent"]')?.tagName).toBe("SPAN");
  });

  // @req REQ-154
  it("hides only an identical adjacent gloss while preserving a changed system and a different bearer", () => {
    render(
      <CountryAttestedNamesSection
        language="fr"
        patronymes={{
          attested: [
            name("PAT_ABA", "Aba"),
            name("PAT_ADE", "Adé"),
            name("PAT_ANI", "Ani", "nisba"),
            name("PAT_ARO", "Aro"),
          ],
          borneByPeoples: [
            reach("PAT_BA", "Ba", "Zénètes"),
            reach("PAT_BE", "Be", "Zénètes"),
            reach("PAT_BI", "Bi", "Banyarwanda"),
          ],
        }}
      />
    );

    const registers = screen.getAllByRole("definition");
    expect(within(registers[0]).getAllByText("Nom de clan")).toHaveLength(2);
    expect(within(registers[0]).getAllByText("Nisba")).toHaveLength(1);
    expect(within(registers[1]).getAllByText(/Zénètes/)).toHaveLength(1);
    expect(within(registers[1]).getAllByText(/Banyarwanda/)).toHaveLength(1);
  });
});
