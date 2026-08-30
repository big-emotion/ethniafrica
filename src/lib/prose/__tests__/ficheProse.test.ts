import { describe, expect, it } from "vitest";

import {
  lintFicheProse,
  parseFicheProse,
  plainTextOf,
} from "@/lib/prose/ficheProse";

/**
 * Fixtures taken verbatim from the corpus, because the two rules that were
 * hardest to get right are both corpus regressions rather than design choices:
 * a dash inside a heading, and a dash between two clauses.
 */
const KONGO_INCISE =
  "Le cosmogramme kongo (dikenga) - un cercle avec une croix - est le symbole spirituel central.";
const AUSTRONESIENNE_HEADING =
  "## Théorie 1 - Route directe depuis Bornéo (Dahl, Adelaar)";
const DINKA_SERIALISED =
  '{"initiationRites": {"maleInitiation": "L\'initiation masculine (gar) est le rite de passage le plus important."}}';

function textOf(
  blocks: ReturnType<typeof parseFicheProse>["blocks"]
): string[] {
  return blocks.map((block) =>
    block.kind === "list"
      ? block.items.map((item) => item.map((i) => i.value).join("")).join(" | ")
      : block.inline.map((i) => i.value).join("")
  );
}

describe("parseFicheProse — the transparency contract", () => {
  // @req REQ-122
  it("renders an unmarked field as a single paragraph holding a single text run", () => {
    const raw = "Le baabi était le centre des rituels politico-religieux.";
    const { blocks, defect } = parseFicheProse(raw);

    expect(defect).toBeNull();
    expect(blocks).toEqual([
      { kind: "paragraph", inline: [{ kind: "text", value: raw }] },
    ]);
  });

  // @req REQ-122
  it("keeps a mid-sentence dash as text so an incise never becomes a list", () => {
    const { blocks } = parseFicheProse(KONGO_INCISE);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("paragraph");
    expect(textOf(blocks)[0]).toBe(KONGO_INCISE);
  });

  // @req REQ-122
  it("treats an empty or blank field as nothing to render, not as a defect", () => {
    expect(parseFicheProse("")).toEqual({ blocks: [], defect: null });
    expect(parseFicheProse("   ")).toEqual({ blocks: [], defect: null });
  });
});

describe("parseFicheProse — block grammar", () => {
  // @req REQ-122
  it("opens a heading on `## ` and closes it on the next line", () => {
    const { blocks } = parseFicheProse("## Tonalité\nDeux tons distincts.");

    expect(blocks.map((b) => b.kind)).toEqual(["heading", "paragraph"]);
    expect(textOf(blocks)).toEqual(["Tonalité", "Deux tons distincts."]);
  });

  // @req REQ-122
  it("keeps a dash inside a heading, because 34 corpus headings carry one", () => {
    const { blocks } = parseFicheProse(`${AUSTRONESIENNE_HEADING}\nMigration.`);

    expect(blocks[0].kind).toBe("heading");
    expect(textOf(blocks)[0]).toBe(
      "Théorie 1 - Route directe depuis Bornéo (Dahl, Adelaar)"
    );
  });

  // @req REQ-122
  it("rejects every heading depth but two, so no fourth type role is needed", () => {
    for (const marker of ["#", "###", "####"]) {
      const { blocks } = parseFicheProse(`${marker} Titre`);
      expect(blocks[0].kind).toBe("paragraph");
      expect(textOf(blocks)[0]).toBe(`${marker} Titre`);
    }
  });

  // @req REQ-122
  it("requires a space after the two hashes", () => {
    const { blocks } = parseFicheProse("##Titre");

    expect(blocks[0].kind).toBe("paragraph");
    expect(textOf(blocks)[0]).toBe("##Titre");
  });

  // @req REQ-122
  it("gathers consecutive dash lines into one list", () => {
    const { blocks } = parseFicheProse("- Haut\n- Bas\nEt la suite.");

    expect(blocks.map((b) => b.kind)).toEqual(["list", "paragraph"]);
    expect(textOf(blocks)).toEqual(["Haut | Bas", "Et la suite."]);
  });

  // @req REQ-122
  it("keeps two lists apart when a paragraph separates them", () => {
    const { blocks } = parseFicheProse("- a\nTexte.\n- b");

    expect(blocks.map((b) => b.kind)).toEqual(["list", "paragraph", "list"]);
  });

  // @req REQ-122
  it("ignores blank lines, since the newline is the separator", () => {
    const { blocks } = parseFicheProse("Un.\n\n\nDeux.");

    expect(textOf(blocks)).toEqual(["Un.", "Deux."]);
  });
});

describe("parseFicheProse — inline grammar", () => {
  // @req REQ-122
  it("reads bold and italic runs", () => {
    const { blocks } = parseFicheProse("Les **Khoe-Kwadi** parlent *ǃXóõ*.");

    expect(blocks[0].kind).toBe("paragraph");
    expect(blocks[0].kind === "paragraph" && blocks[0].inline).toEqual([
      { kind: "text", value: "Les " },
      { kind: "strong", value: "Khoe-Kwadi" },
      { kind: "text", value: " parlent " },
      { kind: "em", value: "ǃXóõ" },
      { kind: "text", value: "." },
    ]);
  });

  // @req REQ-122
  it("reads several bold runs in one line without swallowing the text between", () => {
    const { blocks } = parseFicheProse("**Khoe-Kwadi**, **Kx'a** et **Tuu**.");

    const inline = blocks[0].kind === "paragraph" ? blocks[0].inline : [];
    expect(
      inline.filter((i) => i.kind === "strong").map((i) => i.value)
    ).toEqual(["Khoe-Kwadi", "Kx'a", "Tuu"]);
  });
});

describe("parseFicheProse — degraded input is said, never mimed", () => {
  // @req REQ-122
  it("refuses to render serialised JSON as if it were prose", () => {
    const { blocks, defect } = parseFicheProse(DINKA_SERIALISED);

    expect(defect).toBe("serialised-json");
    expect(blocks).toEqual([]);
  });

  // @req REQ-122
  it("still renders the paragraph when an emphasis marker is unpaired", () => {
    const { blocks, defect } = parseFicheProse("Un **gras qui ne ferme pas.");

    expect(defect).toBe("unbalanced-emphasis");
    expect(textOf(blocks)[0]).toBe("Un **gras qui ne ferme pas.");
  });

  /**
   * `*-ntu` is the reconstructed Proto-Bantu root, `*-tambiko` a bound form.
   * The corpus carries six of them across four fiches, and an atlas of
   * languages cannot call that notation a defect.
   */
  // @req REQ-122
  it("does not mistake a reconstructed form for an unclosed marker", () => {
    const raw =
      "Cérémonies appelées *-tambiko, du proto-bantou *-ntu, attesté en *hai.";

    expect(parseFicheProse(raw).defect).toBeNull();
    expect(lintFicheProse(raw)).toEqual([]);
    expect(textOf(parseFicheProse(raw).blocks)[0]).toBe(raw);
  });

  // @req REQ-122
  it("still reports a trailing marker, which is a title that lost its opening", () => {
    // PPL_KABYLE sources[1].title, verbatim — the author's name went missing.
    const raw = "Études de syntaxe et de diachronie*. Paris : Peeters, 1995";

    expect(parseFicheProse(raw).defect).toBe("unbalanced-emphasis");
  });

  // @req REQ-122
  it("keeps a paired italic run clear of the reconstructed-form exemption", () => {
    expect(
      parseFicheProse("Les Taa parlent *ǃXóõ* au Botswana.").defect
    ).toBeNull();
  });

  // @req REQ-122
  it("demotes a heading that has nothing under it", () => {
    const { blocks, defect } = parseFicheProse("Corps.\n## Zones de contact");

    expect(defect).toBe("orphan-heading");
    expect(blocks.map((b) => b.kind)).toEqual(["paragraph", "paragraph"]);
  });

  // @req REQ-122
  it("drops a heading marker that carries no title", () => {
    const { blocks, defect } = parseFicheProse("## \nCorps.");

    expect(defect).toBe("orphan-heading");
    expect(textOf(blocks)).toEqual(["Corps."]);
  });

  // @req REQ-122
  it("renders an out-of-grammar construct literally rather than scolding the reader", () => {
    const raw = "Voir [la source](https://example.org) et 1. le tableau |a|b|.";
    const { blocks, defect } = parseFicheProse(raw);

    expect(defect).toBeNull();
    expect(textOf(blocks)[0]).toBe(raw);
  });
});

describe("plainTextOf — the quiz boundary", () => {
  // @req REQ-122
  it("strips the markers and keeps the prose", () => {
    expect(plainTextOf("Les **Khoe** parlent *ǃXóõ*.")).toBe(
      "Les Khoe parlent ǃXóõ."
    );
  });

  // @req REQ-122
  it("drops headings and list items, which are furniture rather than claims", () => {
    expect(plainTextOf("## Tonalité\nDeux tons.\n- Haut\n- Bas")).toBe(
      "Deux tons."
    );
  });

  // @req REQ-122
  it("yields nothing for serialised JSON, so no assertion is written from it", () => {
    expect(plainTextOf(DINKA_SERIALISED)).toBe("");
  });

  // @req REQ-122
  it("joins several paragraphs with a single space", () => {
    expect(plainTextOf("Un.\nDeux.")).toBe("Un. Deux.");
  });
});

describe("lintFicheProse — the CI gate reads every defect, not the first", () => {
  // @req REQ-122
  it("reports the out-of-grammar constructs the renderer passes through", () => {
    expect(lintFicheProse("Voir [la source](https://example.org).")).toContain(
      "unsupported-construct"
    );
    expect(lintFicheProse("1. Premier point")).toContain(
      "unsupported-construct"
    );
    expect(lintFicheProse("### Titre")).toContain("unsupported-construct");
  });

  // @req REQ-122
  it("reports several defects at once", () => {
    const defects = lintFicheProse("### Titre\nUn **gras non fermé.");

    expect(defects).toContain("unsupported-construct");
    expect(defects).toContain("unbalanced-emphasis");
  });

  // @req REQ-122
  it("stays silent on clean prose", () => {
    expect(lintFicheProse("## Titre\nUn paragraphe **net**.")).toEqual([]);
    expect(lintFicheProse(KONGO_INCISE)).toEqual([]);
  });
});
