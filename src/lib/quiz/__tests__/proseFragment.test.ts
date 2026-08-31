import { describe, expect, it } from "vitest";

import {
  namedExonym,
  selectVerbatimFragment,
  subjectNameTokens,
} from "@/lib/quiz/proseFragment";

/**
 * Real corpus text, not invented prose. The Venda rites field is the worked
 * example the inversion templates were designed against: its first sentence
 * names the subject and its second does not, so one field yields one usable
 * fragment and the rule has to cut between them rather than take or drop the
 * whole field.
 */
const VENDA_NAMING = {
  subjectName: { autonym: "VhaVenda", exonym: "Venda" },
  selfAppellation:
    "VhaVenda (pl.), MuVenda (sg.) ; egalement Vhangona (nom des clans originels)",
  exonyms: [
    "Venda (terme europeen standardise)",
    "Bawenda (forme bantou ancienne)",
  ],
};

const VENDA_RITES =
  "Domba (danse du python) : ceremonie d'initiation des jeunes femmes au lac Fundudzi, consideree comme la danse la plus sacree du Venda. " +
  "Les futures mariees dansent en file indienne en imitant les mouvements du python, symbolisant la fertilite et le passage a l'age adulte.";

describe("subjectNameTokens", () => {
  // @req REQ-121
  it("keeps the capitalised words of every name the fiche gives its subject", () => {
    expect([...subjectNameTokens(VENDA_NAMING)].sort()).toEqual([
      "bawenda",
      "muvenda",
      "venda",
      "vhangona",
      "vhavenda",
    ]);
  });

  /**
   * An exonym entry is rarely a bare name — the corpus glosses it in French
   * inside the same string. Taking every word would make « pour », « terme »
   * and « egalement » forbidden tokens and reject almost every sentence in the
   * corpus. Capitalisation is the discriminator because a people's name is a
   * proper noun and its gloss is not.
   */
  // @req REQ-121
  it("drops the French gloss a name is wrapped in", () => {
    const tokens = subjectNameTokens(VENDA_NAMING);
    expect(tokens.has("terme")).toBe(false);
    expect(tokens.has("egalement")).toBe(false);
    expect(tokens.has("ancienne")).toBe(false);
    expect(tokens.has("clans")).toBe(false);
  });

  // @req REQ-121
  it("ignores words too short to identify anyone", () => {
    const tokens = subjectNameTokens({
      subjectName: { autonym: "Ewe" },
      selfAppellation: "Ewe",
      exonyms: [],
    });
    expect(tokens.size).toBe(0);
  });
});

describe("selectVerbatimFragment", () => {
  // @req REQ-121
  it("keeps the sentence that does not name its subject and drops the one that does", () => {
    const fragment = selectVerbatimFragment(
      VENDA_RITES,
      subjectNameTokens(VENDA_NAMING)
    );

    expect(fragment).toBe(
      "Les futures mariees dansent en file indienne en imitant les mouvements du python, symbolisant la fertilite et le passage a l'age adulte."
    );
  });

  /**
   * Verbatim is the whole point: the reveal shows corpus text and the charter
   * forbids paraphrase. Redacting the name out of a sentence would be a
   * paraphrase, so a sentence that names the subject is dropped, never edited.
   */
  // @req REQ-121
  it("returns null rather than redact, when every sentence names the subject", () => {
    expect(
      selectVerbatimFragment(
        "Les VhaVenda venerent le lac Fundudzi depuis des siecles et lui vouent un culte.",
        subjectNameTokens(VENDA_NAMING)
      )
    ).toBeNull();
  });

  // @req REQ-121
  it("reads a list field as well as a prose field", () => {
    const fragment = selectVerbatimFragment(
      [
        "Migration bantoue vers les hauts plateaux du sud de la Tanzanie actuelle",
        "Installation durable sur les rives du lac Nyasa et dans le district de Ludewa",
      ],
      new Set<string>()
    );

    expect(fragment).toContain("Migration bantoue vers les hauts plateaux");
    expect(fragment).toContain("Installation durable sur les rives");
  });

  // @req REQ-121
  it("has nothing to say about an empty field", () => {
    expect(selectVerbatimFragment(null, new Set())).toBeNull();
    expect(selectVerbatimFragment("   ", new Set())).toBeNull();
    expect(selectVerbatimFragment([], new Set())).toBeNull();
  });

  /**
   * Charter §9.1: stimulus, stem and four options share one 430px viewport.
   * The cap is what makes that fit, so it is asserted rather than trusted.
   */
  // @req REQ-121
  it("stops before the fragment can push the options off a phone screen", () => {
    const long = `${"Une phrase de corpus assez longue pour compter dans le budget de caracteres du stimulus. ".repeat(
      12
    )}`;

    const fragment = selectVerbatimFragment(long, new Set());

    expect(fragment).not.toBeNull();
    expect((fragment as string).length).toBeLessThanOrEqual(400);
  });

  // @req REQ-121
  it("skips a sentence too short to be a stimulus on its own", () => {
    expect(selectVerbatimFragment("Peuple d'eleveurs.", new Set())).toBeNull();
  });
});

describe("namedExonym", () => {
  // @req REQ-121
  it("finds which of the fiche's own exonyms the corpus calls problematic", () => {
    expect(
      namedExonym(
        "Le terme Shangaan est souvent utilise de facon abusive pour l'ensemble des Tsonga, ce qui est historiquement inexact.",
        ["Shangaan", "Thonga", "Gwamba", "Machangane"]
      )
    ).toBe("Shangaan");
  });

  /**
   * 167 fiches name several of their exonyms in the same paragraph. A round
   * with two right answers is worse than no round, so the ambiguity is refused
   * rather than resolved by picking the first.
   */
  // @req REQ-121
  it("refuses to choose when the corpus names more than one", () => {
    expect(
      namedExonym("Ni Thonga ni Shangaan ne conviennent a l'ensemble.", [
        "Shangaan",
        "Thonga",
        "Gwamba",
      ])
    ).toBeNull();
  });

  // @req REQ-121
  it("returns null when the text names none of them", () => {
    expect(
      namedExonym(
        "Ce nom preterait a confusion avec un peuple d'Afrique de l'Ouest.",
        ["Shangaan", "Thonga"]
      )
    ).toBeNull();
  });

  // @req REQ-121
  it("matches an exonym through its French gloss and its accents", () => {
    expect(
      namedExonym(
        "L'appellation « Pahouins » est une étiquette coloniale appliquée aux Fang.",
        ["Pahouins (ancienne étiquette coloniale)", "Beti"]
      )
    ).toBe("Pahouins (ancienne étiquette coloniale)");
  });
});
