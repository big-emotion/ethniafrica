import { describe, expect, it, vi } from "vitest";

import {
  countryAssertionTargets,
  type CountryFiche,
} from "../countryProvenanceLoader";

vi.mock("@/lib/api/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

/**
 * Real corpus text. The Comoros etymology is the worked example the country
 * leak rule was designed against: it names the country twice in its first
 * sentence, the way most country fiches do, so the rule has to cut rather than
 * take or drop the whole rubric.
 */
function comoros(overrides: Partial<CountryFiche> = {}): CountryFiche {
  return {
    id: "COM",
    nameFr: "Comores",
    nameOfficial: "Union des Comores",
    etymology:
      "Le nom « Comores » vient de l'arabe « Juzur al-Qamar », signifiant « îles de la lune ». " +
      "Les navigateurs qui accostaient l'archipel au IXe siècle voyaient dans ses sommets la forme de croissants.",
    nameOriginActor:
      "Le nom fut donné par des marchands venus de la péninsule arabique et de Perse, qui fréquentaient l'archipel dès le IXe siècle.",
    content: {
      kingdoms: [
        { name: "Sultanats des Comores" },
        { name: "Royaume de Ndzuwani" },
      ],
      sources: [
        {
          title: "UNESCO — Comores",
          url: "https://unesco.org",
          tier: "official",
        },
      ],
    },
    ...overrides,
  };
}

describe("countryAssertionTargets", () => {
  /**
   * FR66 refuses a question whose field path has no assertion behind it, and
   * `assertions` held no `entity_type = 'country'` row at all. Every country
   * template rejected all 54 of its candidates on `no_assertion` until these
   * were written — the templates were never the blocker.
   */
  // @req REQ-121
  it("asserts a country rubric at the path its template reads", () => {
    const paths = countryAssertionTargets(comoros()).map((t) => t.fieldPath);

    expect(paths).toContain("etymology");
    expect(paths).toContain("nameOriginActor");
    expect(paths).toContain("content.kingdoms");
  });

  /**
   * A country names itself in its own etymology far more often than a people
   * does in its rites, so this drops more than its people counterpart — which
   * is the rule working, not failing.
   */
  // @req REQ-121
  it("asserts only the sentences that do not name the country", () => {
    const target = countryAssertionTargets(comoros()).find(
      (t) => t.fieldPath === "etymology"
    );

    expect(target?.statement).not.toContain("Comores");
    expect(target?.statement).toContain("navigateurs qui accostaient");
  });

  // @req REQ-121
  it("makes no claim for a rubric the fiche leaves empty", () => {
    const paths = countryAssertionTargets(
      comoros({ nameOriginActor: null })
    ).map((t) => t.fieldPath);

    expect(paths).not.toContain("nameOriginActor");
  });

  /**
   * T16 answers with a kingdom's name rather than with the country, so its
   * claim is that name — the one country target whose statement is an atom.
   */
  // @req REQ-121
  it("asserts the first named kingdom, not the whole section", () => {
    const target = countryAssertionTargets(comoros()).find(
      (t) => t.fieldPath === "content.kingdoms"
    );

    expect(target?.statement).toBe("Sultanats des Comores");
  });

  // @req REQ-121
  it("makes no kingdom claim when the section names none", () => {
    const paths = countryAssertionTargets(
      comoros({ content: { kingdoms: [{}], sources: [] } })
    ).map((t) => t.fieldPath);

    expect(paths).not.toContain("content.kingdoms");
  });

  /**
   * The official name counts as a name of the country. Without it a fiche
   * quoting « l'Union des Comores » in its own etymology would hand the answer
   * over while passing the leak rule.
   */
  // @req REQ-121
  it("treats the official name as a name of the country too", () => {
    const target = countryAssertionTargets(
      comoros({
        etymology:
          "L'Union des Comores tire son nom d'une racine arabe ancienne, transmise par les marchands de l'océan Indien.",
      })
    ).find((t) => t.fieldPath === "etymology");

    expect(target).toBeUndefined();
  });
});
