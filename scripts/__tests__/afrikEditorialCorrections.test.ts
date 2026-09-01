import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

interface EditorialSource {
  title?: string;
}

interface PeopleFiche {
  id: string;
  nameMain: string;
  languageFamilyId: string;
  currentCountries: string[];
  classificationStatus?: string;
  content: {
    appellations: {
      exonyms: string[];
      linguisticFamily?: string;
      whyProblematic?: string;
    };
    origins: {
      unificationsOrDivisions: string;
    };
    languages: {
      isoCodes: string[];
    };
    demography: {
      totalPopulation: number | null;
      referenceYear: number;
      distributionByCountry: Array<{
        country: string;
        population: number | null;
        percentage: number | null;
      }>;
    };
    sources: EditorialSource[];
  };
}

interface CountryPeopleEntry {
  peopleId?: string | null;
  languageFamily?: string | null;
  population?: number | null;
  percentageInCountry?: number | null;
  mainLanguageCode?: string;
}

interface CountryFiche {
  content: {
    majorPeoples: CountryPeopleEntry[];
    demographics: {
      peoples: CountryPeopleEntry[];
    };
    culture?: {
      mainLanguages?: Array<{ name?: string; isoCode?: string }>;
    };
  };
}

function readJson<T>(relativePath: string): T {
  const absolutePath = resolve(root, relativePath);
  expect(existsSync(absolutePath), `${relativePath} must exist`).toBe(true);
  return JSON.parse(readFileSync(absolutePath, "utf8")) as T;
}

describe("AFRIK editorial corrections from community review", () => {
  // @req REQ-023
  it("documents Minyanka as a discoverable people without inventing demographics", () => {
    const minyanka = readJson<PeopleFiche>(
      "dataset/source/afrik/peuples/FLG_NIGERCONGO/PPL_MINYANKA.json"
    );
    const mali = readJson<CountryFiche>("dataset/source/afrik/pays/MLI.json");

    expect(minyanka).toMatchObject({
      id: "PPL_MINYANKA",
      nameMain: "Minyanka",
      languageFamilyId: "FLG_NIGERCONGO",
      currentCountries: expect.arrayContaining(["MLI", "BFA"]),
      content: {
        languages: {
          isoCodes: ["myk"],
        },
        demography: {
          totalPopulation: null,
          referenceYear: 2025,
        },
      },
    });
    expect(minyanka.content.appellations.exonyms).toEqual(
      expect.arrayContaining(["Mianka", "Minianka", "Mamara"])
    );
    expect(minyanka.content.demography.distributionByCountry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          country: "MLI",
          population: null,
          percentage: null,
        }),
      ])
    );
    expect(
      mali.content.majorPeoples.find(
        (people) => people.peopleId === "PPL_MINYANKA"
      )
    ).toMatchObject({ languageFamily: "FLG_NIGERCONGO" });
    expect(
      mali.content.demographics.peoples.find(
        (people) => people.peopleId === "PPL_MINYANKA"
      )
    ).toMatchObject({
      population: null,
      percentageInCountry: null,
    });
    expect(
      mali.content.demographics.peoples.find(
        (people) => people.peopleId === "PPL_MINYANKA"
      )?.mainLanguageCode
    ).toBe("myk");

    const percentageTotal = mali.content.demographics.peoples.reduce(
      (total, people) => total + (people.percentageInCountry ?? 0),
      0
    );
    expect(percentageTotal).toBe(100);
  });

  // @req REQ-023
  it("classifies the Liberian Bassa consistently in the Kru family", () => {
    const bassa = readJson<PeopleFiche>(
      "dataset/source/afrik/peuples/FLG_KROU/PPL_BASSA.json"
    );
    const liberia = readJson<CountryFiche>(
      "dataset/source/afrik/pays/LBR.json"
    );
    const serializedLiberia = JSON.stringify(liberia);

    expect(
      existsSync(
        resolve(root, "dataset/source/afrik/peuples/FLG_MANDE/PPL_BASSA.json")
      )
    ).toBe(false);
    expect(bassa.languageFamilyId).toBe("FLG_KROU");
    expect(bassa.content.appellations.linguisticFamily).toBe("FLG_KROU");
    expect(bassa.content.appellations.whyProblematic).not.toContain(
      "afro-asiatique"
    );
    expect(serializedLiberia).not.toContain("PPL_BASSA_LIBERIA");

    const countryEntries = [
      ...liberia.content.majorPeoples,
      ...liberia.content.demographics.peoples,
    ].filter((people) => people.peopleId === "PPL_BASSA");
    expect(countryEntries).toHaveLength(2);
    expect(
      countryEntries.every((people) => people.languageFamily === "FLG_KROU")
    ).toBe(true);

    const demographicCsv = readFileSync(
      resolve(root, "public/peuple_demographie_globale.csv"),
      "utf8"
    );
    expect(demographicCsv).not.toContain("PPL_BASSA,BASSA,FLG_MANDE");
  });

  // @req REQ-023
  it("uses the documented Bété codes and preserves the Bété-Dida distinction", () => {
    const bete = readJson<PeopleFiche>(
      "dataset/source/afrik/peuples/FLG_KROU/PPL_BETE.json"
    );
    const dida = readJson<PeopleFiche>(
      "dataset/source/afrik/peuples/FLG_KROU/PPL_DIDA.json"
    );
    const coteDIvoire = readJson<CountryFiche>(
      "dataset/source/afrik/pays/CIV.json"
    );
    const serializedBete = JSON.stringify(bete);
    const serializedCountry = JSON.stringify(coteDIvoire);

    expect(bete.content.languages.isoCodes).toEqual(["bev", "bet", "btg"]);
    expect(serializedBete).not.toMatch(/\b(?:byf|beb|btv)\b/);
    expect(serializedCountry).not.toMatch(/\b(?:byf|beb|btv)\b/);
    expect(dida.content.languages.isoCodes).toEqual(["dic", "gud"]);
    expect(dida.classificationStatus).toBe("colonial-legacy");
    expect(bete.content.origins.unificationsOrDivisions).toContain("Dida");
    expect(dida.content.appellations.whyProblematic).toContain("Gagnoa");
    expect(
      bete.content.sources.some((source) => source.title?.includes("Dozon"))
    ).toBe(true);
    expect(
      dida.content.sources.some((source) => source.title?.includes("Dozon"))
    ).toBe(true);

    const beteLanguage = coteDIvoire.content.culture?.mainLanguages?.find(
      (language) => language.name === "Bété"
    );
    expect(beteLanguage?.isoCode).toBe("btg");

    const demographicCsv = readFileSync(
      resolve(root, "public/peuple_demographie_globale.csv"),
      "utf8"
    );
    expect(demographicCsv).not.toContain("PPL_BETE,Bété,FLG_NIGERCONGO");
    expect(demographicCsv).not.toContain("PPL_DIDA,Dida,FLG_NIGERCONGO");
  });
});
