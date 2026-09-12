import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FicheNamesChapter } from "@/components/fiche/FicheNamesChapter";
import { getPatronymeRoute } from "@/lib/routing";
import { getTranslation } from "@/lib/translations";

import { namesForPeople } from "./corpusRecords";

const clan = (id: string, nameMain: string) => ({
  id,
  nameMain,
  nameSystem: "clan_name" as const,
});

const reach = (id: string, nameMain: string, peopleName: string) => ({
  ...clan(id, nameMain),
  viaPeoples: [{ id: "PPL_SAMPLE", nameMain: peopleName }],
});

/**
 * One names chapter for both records. People names are filed by naming
 * system; a country keeps its two registers apart — what a source attests
 * here, and what its peoples carry without an attestation here — because
 * summing them would publish the second as the first.
 */
describe("fiche names charter", () => {
  afterEach(cleanup);

  // @req REQ-133
  it("titles a people's names for what they are and keeps the published anchor", () => {
    const names = namesForPeople("PPL_OVAMBO");
    render(<FicheNamesChapter scope="people" names={names} language="fr" />);

    const chapter = screen.getByRole("region", {
      name: "Noms de personnes rattachés à ce peuple",
    });
    expect(chapter).toHaveAttribute("id", "chapitre-noms-portes");
    expect(
      within(chapter).getByRole("heading", { level: 3, name: "Nom de clan" })
    ).toBeVisible();
    expect(chapter).toHaveTextContent("8 noms");
    expect(within(chapter).queryByRole("navigation")).toBeNull();

    const links = within(chapter).getAllByRole("link");
    expect(links).toHaveLength(8);
    const amadhila = names.find((name) => name.nameMain === "Amadhila")!;
    expect(links[0]).toHaveTextContent("Amadhila");
    expect(links[0]).toHaveAttribute(
      "href",
      getPatronymeRoute("fr", amadhila.id)
    );
  });

  // @req REQ-133
  it("switches to the patronymic title when every name is one", () => {
    render(
      <FicheNamesChapter
        scope="people"
        names={namesForPeople("PPL_HAUSA")}
        language="fr"
      />
    );
    expect(
      screen.getByRole("region", { name: "Patronymes rattachés à ce peuple" })
    ).toHaveAttribute("id", "chapitre-noms-portes");
  });

  // @req REQ-133
  it("indexes a group past the threshold across the whole alphabet", () => {
    const many = Array.from({ length: 25 }, (_, index) =>
      clan(`PAT_T${index}`, `${"ABK"[index % 3]}ame ${index}`)
    );
    render(<FicheNamesChapter scope="people" names={many} language="fr" />);

    const index = screen.getByRole("navigation", {
      name: /index alphabétique/i,
    });
    expect(index.querySelectorAll("[data-letter]")).toHaveLength(26);
    const letter = within(index).getByRole("link", { name: "K" });
    expect(document.querySelector(letter.getAttribute("href")!)).not.toBeNull();
  });

  // @req REQ-119 REQ-133
  it("distinguishes a failed read from a documented empty list", () => {
    const copy = getTranslation("fr").patronymes.onFiche;
    const { rerender } = render(
      <FicheNamesChapter scope="people" names={null} language="fr" />
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      copy.peopleUnavailable
    );

    rerender(<FicheNamesChapter scope="people" names={[]} language="fr" />);
    expect(screen.getByRole("status")).toHaveTextContent(copy.peopleEmpty);
  });

  // @req REQ-133 REQ-154
  it("keeps the country's two registers apart and says whose names the second are", () => {
    render(
      <FicheNamesChapter
        scope="country"
        patronymes={{
          attested: [clan("PAT_KEITA", "Keïta")],
          borneByPeoples: [reach("PAT_MAGHRAWA", "Maghrawa", "Zénètes")],
        }}
        language="fr"
      />
    );

    const chapter = screen.getByRole("region", {
      name: "Noms de personnes rattachés à ce pays",
    });
    expect(chapter).toHaveAttribute("id", "chapitre-noms-attestes");

    const attested = chapter.querySelector<HTMLElement>(
      '[data-names-register="attested"]'
    )!;
    const carried = chapter.querySelector<HTMLElement>(
      '[data-names-register="reach"]'
    )!;
    expect(attested).toHaveTextContent("Attestés dans le pays");
    expect(within(attested).getByRole("link", { name: "Keïta" })).toBeVisible();
    expect(attested).not.toHaveTextContent("Maghrawa");

    const summary = carried.querySelector("details > summary");
    expect(summary).toHaveTextContent(
      "Portés par les peuples du pays, sans attestation ici"
    );
    expect(summary).toHaveTextContent("Zénètes");
    expect(
      within(carried).getByRole("link", { name: "Maghrawa" })
    ).toHaveAttribute("href", getPatronymeRoute("fr", "PAT_MAGHRAWA"));
  });

  // @req REQ-154
  it("renames the country chapter in English without moving its anchor", () => {
    render(
      <FicheNamesChapter
        scope="country"
        patronymes={{
          attested: [clan("PAT_KEITA", "Keïta")],
          borneByPeoples: [],
        }}
        language="en"
      />
    );
    expect(
      screen.getByRole("region", {
        name: "Personal names linked to this country",
      })
    ).toHaveAttribute("id", "chapitre-attested-names");
    expect(document.querySelector('[data-names-register="reach"]')).toBeNull();
  });

  // @req REQ-119 REQ-133
  it("states the gap when neither register reaches a name, and a failed read apart", () => {
    const copy = getTranslation("fr").patronymes.onFiche;
    const { rerender } = render(
      <FicheNamesChapter
        scope="country"
        patronymes={{ attested: [], borneByPeoples: [] }}
        language="fr"
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent(copy.countryEmpty);

    rerender(
      <FicheNamesChapter scope="country" patronymes={null} language="fr" />
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      copy.countryUnavailable
    );
  });

  // @req REQ-133
  it("lists the naming systems a register holds", () => {
    render(
      <FicheNamesChapter
        scope="country"
        patronymes={{
          attested: [
            clan("PAT_KEITA", "Keïta"),
            { id: "PAT_ANI", nameMain: "Ani", nameSystem: "nisba" as const },
          ],
          borneByPeoples: [],
        }}
        language="fr"
      />
    );
    const systems = document.querySelector(
      '[data-names-register="attested"] [data-names-systems]'
    );
    expect(systems).toHaveTextContent("Nom de clan");
    expect(systems).toHaveTextContent("Nisba");
  });
});
