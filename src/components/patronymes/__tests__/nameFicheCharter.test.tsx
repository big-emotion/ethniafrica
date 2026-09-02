import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PatronymeFicheView } from "@/components/patronymes/PatronymeFicheView";
import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";
import { modelChapterKeys } from "@/lib/fieldProvenance";

/**
 * The net the name fiche never had (atlas charter §4).
 *
 * Its absence is what let the front end drift onto a vocabulary the corpus
 * never wrote — `attestedForms` for `spellings`, a phantom `filiationClaims`,
 * an `origin.originType` that does not exist — while three chapters of the
 * model had no section at all and `sources`, filled on 30 dossiers out of 30,
 * reached no screen.
 */

/** PAT_CAMARA as the corpus actually holds it: filled, empty, and explained. */
const camara: PublicPatronyme = {
  id: "PAT_CAMARA",
  nameMain: "Camara",
  nameSystem: "clan_name",
  casteOrSocialFunction: null,
  associatedPeoples: [],
  associatedCountries: [],
  bearers: [],
  content: {
    nameMain: "Camara",
    nameSystem: "clan_name",
    spellings: [
      {
        spelling: "Camara",
        attestations: [
          { countryId: "LBR", sourceRefs: ["corpus-ppl-vai-organisation"] },
          { countryId: "SLE", sourceRefs: ["corpus-ppl-vai-organisation"] },
        ],
      },
    ],
    designatedSocialUnit: "clan",
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [],
    },
    alliances: [],
    casteOrSocialFunction: null,
    bearers: [],
    homonyms: [],
    sources: [
      {
        sourceKey: "corpus-ppl-vai-organisation",
        title: "Fiche PPL_VAI — organisation sociale",
        url: null,
        tier: "referenced",
        source_kind: "corpus",
        notes: "Passage clanique de la fiche peuple.",
      },
    ],
    gaps: [
      {
        fieldPath: "transmissionMode",
        reason: "Le passage ne précise pas le mode de transmission du nom.",
      },
      {
        fieldPath: "origin",
        reason:
          "Le passage ne documente aucune origine orale, écrite ou linguistique du nom.",
      },
      {
        fieldPath: "alliances",
        reason:
          "Aucune alliance entre patronymes n'est documentée dans le passage.",
      },
      {
        fieldPath: "casteOrSocialFunction",
        reason:
          "Aucune fonction sociale propre à ce nom n'est établie au niveau du claim.",
      },
      {
        fieldPath: "bearers",
        reason:
          "Aucun porteur décédé vérifiable n'est documenté dans le passage.",
      },
      {
        fieldPath: "homonyms",
        reason: "Aucun homonyme distinct n'est documenté dans le passage.",
      },
    ],
  },
};

const CHAPTER_TITLES = [
  "Le nom",
  "Origine",
  "Peuples et pays concernés",
  "Alliances",
  "Homonymes",
  "Porteurs et porteuses",
  "Sources",
];

describe("name fiche charter — the chapter list is the model's", () => {
  // @req REQ-133
  it("keeps every chapter, including the four that had no section at all", () => {
    render(<PatronymeFicheView patronyme={camara} />);

    for (const title of CHAPTER_TITLES) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
  });

  // @req REQ-133
  it("names each added chapter as a field of the strict model", () => {
    const declared = modelChapterKeys("name");

    for (const key of ["alliances", "homonyms", "sources", "bearers"]) {
      expect(declared).toContain(key);
    }
  });

  // @req REQ-133
  it("publishes the sources anchor every citation chip points at", () => {
    const { container } = render(<PatronymeFicheView patronyme={camara} />);

    // Dead on every name fiche until now: the view had no Sources section.
    expect(container.querySelector("#sources")).not.toBeNull();
    expect(
      screen.getByText("Fiche PPL_VAI — organisation sociale")
    ).toBeInTheDocument();
  });
});

describe("name fiche charter — the corpus explains its own silences", () => {
  // @req REQ-133
  it("prints the editor's wording rather than the generic badge", () => {
    render(<PatronymeFicheView patronyme={camara} />);

    for (const reason of [
      "Le passage ne précise pas le mode de transmission du nom.",
      "Le passage ne documente aucune origine orale, écrite ou linguistique du nom.",
      "Aucune alliance entre patronymes n'est documentée dans le passage.",
      "Aucun homonyme distinct n'est documenté dans le passage.",
    ]) {
      expect(screen.getByText(reason)).toBeInTheDocument();
    }
  });

  // @req REQ-133
  it("renders the spellings, the richest field the name corpus has", () => {
    render(<PatronymeFicheView patronyme={camara} />);

    // Present on 30 dossiers out of 30, rendered on none: the view read
    // `attestedForms`, a key no model and no dossier has ever carried.
    expect(screen.getByText("Camara")).toBeInTheDocument();
    expect(screen.getByText(/attestée en\s+LBR, SLE/)).toBeInTheDocument();
  });

  // @req REQ-133
  it("falls back to the generic badge only where no reason was written", () => {
    render(
      <PatronymeFicheView
        patronyme={{ ...camara, content: { ...camara.content, gaps: [] } }}
      />
    );

    expect(screen.getAllByText("Donnée manquante").length).toBeGreaterThan(0);
  });
});
