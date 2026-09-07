import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  classifyKingdomEntry,
  parseKingdomPeriod,
} from "../parseKingdomPeriod";

const PAYS_DIR = path.join(process.cwd(), "dataset", "source", "afrik", "pays");

function corpusPeriodLabels(): string[] {
  const labels: string[] = [];
  for (const file of readdirSync(PAYS_DIR).filter((f) => f.endsWith(".json"))) {
    const fiche = JSON.parse(
      readFileSync(path.join(PAYS_DIR, file), "utf8")
    ) as { content?: { kingdoms?: { period?: string }[] } };
    for (const kingdom of fiche.content?.kingdoms ?? []) {
      if (typeof kingdom.period === "string") labels.push(kingdom.period);
    }
  }
  return labels;
}

describe("parseKingdomPeriod", () => {
  // @req REQ-148
  it("reads a plain year range", () => {
    expect(parseKingdomPeriod("1884 - 1960")).toEqual({
      startYear: 1884,
      endYear: 1960,
      precision: "year",
    });
  });

  // @req REQ-148
  it("reads a year range written without spaces", () => {
    expect(parseKingdomPeriod("1830-1962")).toEqual({
      startYear: 1830,
      endYear: 1962,
      precision: "year",
    });
  });

  // @req REQ-148
  it("reads an era marker on each side", () => {
    expect(parseKingdomPeriod("146 av. J.-C. - 439 apr. J.-C.")).toEqual({
      startYear: -146,
      endYear: 439,
      precision: "year",
    });
  });

  /**
   * "202-148 av. J.-C." marks the era once, at the end, and means both bounds
   * are BC. Reading the unmarked left bound as AD would place the start of
   * Massinissa's kingdom in the third century of our era.
   */
  // @req REQ-148
  it("applies a trailing BC marker to both bounds", () => {
    expect(parseKingdomPeriod("202-148 av. J.-C.")).toEqual({
      startYear: -202,
      endYear: -148,
      precision: "year",
    });
  });

  // @req REQ-148
  it("reads a four-digit BC range", () => {
    expect(parseKingdomPeriod("2686-2181 av. J.-C.")).toEqual({
      startYear: -2686,
      endYear: -2181,
      precision: "year",
    });
  });

  // @req REQ-148
  it("reads a century range as the interval it encloses", () => {
    expect(parseKingdomPeriod("XIVe - XIXe siècles")).toEqual({
      startYear: 1301,
      endYear: 1900,
      precision: "century",
    });
  });

  // @req REQ-148
  it("reads a BC century range", () => {
    expect(
      parseKingdomPeriod("IIIe siècle av. J.-C. - Ier siècle apr. J.-C.")
    ).toEqual({ startYear: -300, endYear: 100, precision: "century" });
  });

  // @req REQ-148
  it("reads a lone century as a full interval", () => {
    expect(parseKingdomPeriod("XVIIIe siècle")).toEqual({
      startYear: 1701,
      endYear: 1800,
      precision: "century",
    });
  });

  // @req REQ-148
  it("keeps century precision when one bound is an exact year", () => {
    expect(parseKingdomPeriod("XVIIe siècle - 1894")).toEqual({
      startYear: 1601,
      endYear: 1894,
      precision: "century",
    });
  });

  /**
   * A living polity gets `ongoing`, never `endYear: currentYear` — that would
   * be a fact that silently changes every first of January.
   */
  // @req REQ-148
  it("marks a still-standing entity as ongoing without an end year", () => {
    expect(parseKingdomPeriod("1960 - présent")).toEqual({
      startYear: 1960,
      ongoing: true,
      precision: "year",
    });
  });

  // @req REQ-148
  it("marks a century-founded entity that still stands as ongoing", () => {
    expect(parseKingdomPeriod("XVe siècle - présent")).toEqual({
      startYear: 1401,
      ongoing: true,
      precision: "century",
    });
  });

  // @req REQ-148
  it("takes the envelope of a discontinuous range and says so", () => {
    const parsed = parseKingdomPeriod("1919-1932, 1947-1960");
    expect(parsed?.startYear).toBe(1919);
    expect(parsed?.endYear).toBe(1960);
    expect(parsed?.precision).toBe("approximate");
    expect(parsed?.datingNote).toBeTruthy();
  });

  // @req REQ-148
  it("resolves a hesitating end year to the later one and says so", () => {
    const parsed = parseKingdomPeriod("1916 - 1960/1961");
    expect(parsed?.startYear).toBe(1916);
    expect(parsed?.endYear).toBe(1961);
    expect(parsed?.precision).toBe("approximate");
    expect(parsed?.datingNote).toBeTruthy();
  });

  // @req REQ-148
  it("keeps an editorial nuance as an approximate range with a note", () => {
    const parsed = parseKingdomPeriod(
      "XIVe siècle - XVIIe siècle (apogée), déclin progressif jusqu'au XIXe siècle"
    );
    expect(parsed?.precision).toBe("approximate");
    expect(parsed?.datingNote).toBeTruthy();
  });

  /**
   * The half-date rule. "Précolonial - XIXe siècle" carries a real end and no
   * start; writing only the end would satisfy a symmetry check without saying
   * anything true about when the polity began.
   */
  // @req REQ-148
  it("refuses to date a range whose start is only a vague era", () => {
    expect(parseKingdomPeriod("Précolonial - XIXe siècle")).toBeNull();
    expect(parseKingdomPeriod("Moyen Âge - XIXe siècle")).toBeNull();
    expect(parseKingdomPeriod("Premier millénaire - XIXe siècle")).toBeNull();
    expect(parseKingdomPeriod("Antiquité - VIIe siècle")).toBeNull();
  });

  // @req REQ-148
  it("refuses a bound-less era on both sides", () => {
    expect(parseKingdomPeriod("Précolonial - présent")).toBeNull();
    expect(parseKingdomPeriod("Préhistorique - présent")).toBeNull();
    expect(parseKingdomPeriod("Antiquité")).toBeNull();
    expect(parseKingdomPeriod("Précolonial")).toBeNull();
    expect(parseKingdomPeriod("Précoloniale - coloniale")).toBeNull();
    expect(parseKingdomPeriod("Depuis plusieurs siècles")).toBeNull();
  });

  // @req REQ-148
  it("refuses a terminus ante quem, which gives an end and no start", () => {
    expect(parseKingdomPeriod("Avant 1598")).toBeNull();
    expect(parseKingdomPeriod("Avant 1470")).toBeNull();
  });

  // @req REQ-148
  it("never returns a range whose start is after its end", () => {
    for (const label of corpusPeriodLabels()) {
      const parsed = parseKingdomPeriod(label);
      if (!parsed || parsed.endYear === undefined) continue;
      expect(
        parsed.startYear,
        `${label} produced ${parsed.startYear}..${parsed.endYear}`
      ).toBeLessThanOrEqual(parsed.endYear);
    }
  });

  /**
   * The corpus is the specification. This asserts the count the backfill will
   * report, so a parser change that quietly stops reading a whole family of
   * labels shows up as a number rather than as silence.
   */
  // @req REQ-148
  it("derives bounds for the datable share of the real corpus", () => {
    const labels = corpusPeriodLabels();
    const parsed = labels.filter((l) => parseKingdomPeriod(l) !== null);
    expect(labels).toHaveLength(281);
    expect(parsed.length).toBeGreaterThanOrEqual(180);
  });
});

describe("classifyKingdomEntry", () => {
  /**
   * The regex this replaces tested for "colonie" alone, so twenty-five
   * colonial entries reached the reader inside a section titled "Royaumes".
   */
  // @req REQ-148
  it("recognises a colonial administration that never says colonie", () => {
    expect(classifyKingdomEntry("Somaliland britannique")).toBe("colonial");
    expect(classifyKingdomEntry("Somalie italienne")).toBe("colonial");
    expect(classifyKingdomEntry("Soudan français")).toBe("colonial");
    expect(classifyKingdomEntry("Condominium anglo-égyptien")).toBe("colonial");
    expect(classifyKingdomEntry("Rhodésie du Nord")).toBe("colonial");
    expect(classifyKingdomEntry("Protectorat britannique de l'Ouganda")).toBe(
      "colonial"
    );
    expect(classifyKingdomEntry("Congo belge")).toBe("colonial");
  });

  // @req REQ-148
  it("still recognises the entries the old filter caught", () => {
    expect(classifyKingdomEntry("Colonie de Côte d'Ivoire")).toBe("colonial");
    expect(classifyKingdomEntry("Colonie française du Niger")).toBe("colonial");
  });

  // @req REQ-148
  it("recognises a colony named in the coloniser's own spelling", () => {
    expect(classifyKingdomEntry("Colónia de Angola")).toBe("colonial");
  });

  /**
   * Three colonial administrations in the corpus carry no marker at all —
   * "Ruanda-Urundi" and "Tanganyika" are proper names. No pattern can reach
   * them, which is the point of storing the type rather than deriving it: an
   * editor writes what the machine cannot infer.
   */
  // @req REQ-148
  it("cannot infer a mandate that is named only by its territory", () => {
    expect(classifyKingdomEntry("Ruanda-Urundi")).toBe("polity");
    expect(classifyKingdomEntry("Tanganyika")).toBe("polity");
  });

  // @req REQ-148
  it("recognises a modern sovereign state", () => {
    expect(classifyKingdomEntry("République du Congo")).toBe("modern");
    expect(classifyKingdomEntry("République fédérale du Nigeria")).toBe(
      "modern"
    );
    expect(classifyKingdomEntry("Union sud-africaine")).toBe("modern");
  });

  // @req REQ-148
  it("treats an African polity as a polity", () => {
    expect(classifyKingdomEntry("Royaume du Buganda")).toBe("polity");
    expect(classifyKingdomEntry("Sultanat d'Ajuran")).toBe("polity");
    expect(classifyKingdomEntry("Empire du Mali")).toBe("polity");
    expect(classifyKingdomEntry("Chefferies Bamiléké")).toBe("polity");
    expect(classifyKingdomEntry("Confédérations touarègues")).toBe("polity");
  });

  /**
   * "Royaume du Bénin" is a Nigerian polity and "Royaume de Nikki" a Beninese
   * one; neither is a modern state, though both start with a word the modern
   * rule must not claim.
   */
  // @req REQ-148
  it("does not mistake a kingdom for a modern state", () => {
    expect(classifyKingdomEntry("Royaume du Bénin")).toBe("polity");
    expect(classifyKingdomEntry("Royaume de Nikki")).toBe("polity");
  });
});
