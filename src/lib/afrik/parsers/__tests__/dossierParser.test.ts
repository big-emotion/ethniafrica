import { describe, expect, it } from "vitest";

import { parseDossierFile } from "../dossierParser";

/**
 * The parser is the only place the contradictoire rule can be made binding.
 *
 * Everything else about a dossier degrades gracefully — a missing figure is a
 * gap, a thin chapter is a short chapter. A chapter that carries one reading
 * does not degrade: it silently becomes the thing the dossier exists to
 * refuse, an official account published with nothing beside it.
 */

function validDossier() {
  return {
    _meta: {
      format: "AFRIK JSON v2",
      entity: "dossier",
      directives:
        "Un dossier confronte une lecture officielle à une contre-lecture.",
      readerFacing: ["gaps[].reason", "sources[].title", "sources[].notes"],
    },
    id: "DOS_PROPORTIONS",
    vertical: "realites",
    slug: "proportions",
    title: "Les vraies proportions",
    question: "De quelle taille est l'Afrique ?",
    standfirst:
      "Une projection dessinée pour la navigation sert de carte scolaire depuis quatre siècles.",
    publishedOn: "2026-09-05",
    thesis: {
      stepLabel: "La thèse",
      heading: "Trois mesures, avant tout le reste",
      figures: [
        {
          figureKey: "surface",
          value: "30,37 M km²",
          claim: "La superficie de l'Afrique.",
          provenance: "Terres émergées, îles comprises.",
          year: 2024,
          sourceRefs: ["un-stats"],
        },
      ],
    },
    chapters: [
      {
        chapterKey: "mercator",
        ordinal: 1,
        title: "Une carte de marin devenue carte d'école",
        question: "Pourquoi Mercator déforme-t-elle ?",
        standfirst: "Elle conserve les angles, et paie ce choix en surfaces.",
        body: [
          {
            text: "Gerardus Mercator publie sa projection en 1569.",
            sourceRefs: ["un-stats"],
          },
        ],
        illustration: {
          src: "/images/dossiers/mercator-1569.jpg",
          alt: "La carte du monde de Mercator, 1569.",
          caption: "Gerardus Mercator, carte du monde, 1569.",
          author: "Gerardus Mercator",
          licence: "Domaine public",
          licenceUrl: null,
          filePage: "https://commons.wikimedia.org/wiki/File:Mercator_1569.png",
          year: "1569",
        },
        readings: [
          {
            stance: "official",
            label: "Ce que conserve la projection",
            body: "Mercator conserve les angles, ce qui permet de tenir un cap.",
            sourceRefs: ["un-stats"],
          },
          {
            stance: "counter",
            label: "Ce que le choix coûte",
            body: "Aux hautes latitudes, les surfaces enflent sans limite.",
            sourceRefs: ["un-stats"],
          },
        ],
        figures: [
          {
            figureKey: "groenland",
            label: "Superficie du Groenland",
            value: "2,17 M km²",
            year: 2024,
            note: null,
            sourceRefs: ["un-stats"],
          },
        ],
      },
    ],
    sources: [
      {
        sourceKey: "un-stats",
        title: "Annuaire statistique des Nations unies",
        url: "https://unstats.un.org/",
        tier: "official",
        source_kind: "intergovernmental",
        publicationYear: 2024,
        notes: "Superficies des terres émergées.",
      },
    ],
    gaps: [],
  };
}

describe("the dossier fiche parser", () => {
  // @req REQ-114
  it("accepts a dossier whose chapter carries both readings", () => {
    const result = parseDossierFile(validDossier());

    expect(result.success).toBe(true);
    expect(result.data?.chapters[0]?.readings).toHaveLength(2);
  });

  // @req REQ-114
  it("rejects a chapter that states only the official reading", () => {
    const fiche = validDossier();
    fiche.chapters[0].readings = fiche.chapters[0].readings.filter(
      (reading) => reading.stance === "official"
    );

    const result = parseDossierFile(fiche);

    expect(result.success).toBe(false);
    expect(result.errors.join(" ")).toContain("counter");
  });

  // @req REQ-114
  it("rejects a chapter that states only the counter-reading", () => {
    const fiche = validDossier();
    fiche.chapters[0].readings = fiche.chapters[0].readings.filter(
      (reading) => reading.stance === "counter"
    );

    const result = parseDossierFile(fiche);

    expect(result.success).toBe(false);
    expect(result.errors.join(" ")).toContain("official");
  });

  // @req REQ-114
  it("rejects a reading that cites nothing", () => {
    const fiche = validDossier();
    fiche.chapters[0].readings[1].sourceRefs = [];

    const result = parseDossierFile(fiche);

    expect(result.success).toBe(false);
  });

  // @req REQ-114
  it("rejects a source reference that no source in the fiche answers to", () => {
    const fiche = validDossier();
    fiche.chapters[0].readings[1].sourceRefs = ["une-source-absente"];

    const result = parseDossierFile(fiche);

    expect(result.success).toBe(false);
    expect(result.errors.join(" ")).toContain("une-source-absente");
  });

  // @req REQ-114
  it("rejects an illustration whose licence requires attribution but names no author", () => {
    const fiche = validDossier();
    fiche.chapters[0].illustration = {
      ...fiche.chapters[0].illustration!,
      licence: "CC BY-SA 4.0",
      licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      author: null,
    };

    const result = parseDossierFile(fiche);

    expect(result.success).toBe(false);
  });

  // @req REQ-114
  it("rejects an attributed licence published without its address", () => {
    const fiche = validDossier();
    fiche.chapters[0].illustration = {
      ...fiche.chapters[0].illustration!,
      licence: "CC BY-SA 4.0",
      licenceUrl: null,
      author: "Patrick Gruban",
    };

    const result = parseDossierFile(fiche);

    expect(result.success).toBe(false);
  });

  // @req REQ-114
  it("rejects a chapter ordinal that does not follow its position", () => {
    const fiche = validDossier();
    fiche.chapters[0].ordinal = 4;

    const result = parseDossierFile(fiche);

    expect(result.success).toBe(false);
  });

  // @req REQ-114
  it("rejects an identifier that is not a dossier identifier", () => {
    const fiche = validDossier();
    fiche.id = "PPL_YORUBA";

    const result = parseDossierFile(fiche);

    expect(result.success).toBe(false);
  });

  // @req REQ-114
  it("reports every violation at once rather than the first", () => {
    const fiche = validDossier();
    fiche.id = "PPL_YORUBA";
    fiche.chapters[0].readings = [];

    const result = parseDossierFile(fiche);

    expect(result.errors.length).toBeGreaterThan(1);
  });
});
