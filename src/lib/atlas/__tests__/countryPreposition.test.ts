import { describe, expect, it } from "vitest";

import { getAdmin0Name } from "@/lib/atlas/overlays";

import { inCountry, locativePreposition } from "../countryPreposition";

const fr = (countryId: string) =>
  inCountry(countryId, getAdmin0Name(countryId, "fr")!, "fr");
const en = (countryId: string) =>
  inCountry(countryId, getAdmin0Name(countryId, "en")!, "en");

describe("inCountry — French (REQ-117)", () => {
  // @req REQ-117
  it("takes « en » before a vowel whatever the gender", () => {
    expect(fr("ETH")).toBe("en Éthiopie");
    expect(fr("AGO")).toBe("en Angola");
  });

  // @req REQ-117
  it("takes « en » before a feminine name the vowel rule cannot reach", () => {
    expect(fr("CIV")).toBe("en Côte d'Ivoire");
    expect(fr("COD")).toBe("en République démocratique du Congo");
  });

  // @req REQ-117
  it("takes « au » by default, « aux » for a plural and « à » for an article-less name", () => {
    expect(fr("TGO")).toBe("au Togo");
    expect(fr("COM")).toBe("aux Comores");
    expect(fr("MDG")).toBe("à Madagascar");
  });

  // @req REQ-117
  it("is the locale the module defaults to, so the existing caller reads unchanged", () => {
    expect(inCountry("TGO", "Togo")).toBe("au Togo");
    expect(locativePreposition("TGO", "Togo")).toBe("au");
  });
});

describe("inCountry — English (REQ-143 class 4)", () => {
  // @req REQ-143
  it("takes a bare « in » for almost every country", () => {
    expect(en("ETH")).toBe("in Ethiopia");
    expect(en("CIV")).toBe("in Ivory Coast");
    expect(en("MDG")).toBe("in Madagascar");
    expect(en("ESH")).toBe("in Western Sahara");
  });

  // @req REQ-143
  it("takes « in the » for the names English gives a definite article", () => {
    expect(en("GMB")).toBe("in the Gambia");
    expect(en("COM")).toBe("in the Comoros");
    expect(en("SYC")).toBe("in the Seychelles");
    expect(en("COD")).toBe("in the Democratic Republic of the Congo");
    expect(en("COG")).toBe("in the Republic of the Congo");
    expect(en("CAF")).toBe("in the Central African Republic");
    expect(en("TZA")).toBe("in the United Republic of Tanzania");
  });

  // @req REQ-143
  it("is keyed by ISO code, so the asset's wording cannot move a country between sets", () => {
    expect(locativePreposition("GMB", "Gambia", "en")).toBe("in the");
    expect(locativePreposition("GMB", "The Gambia", "en")).toBe("in the");
    expect(locativePreposition("SEN", "Senegal", "en")).toBe("in");
  });
});
