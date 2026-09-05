import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PatronymeFicheView } from "@/components/patronymes/PatronymeFicheView";
import type { PublicPatronyme } from "@/api/v2/schemas/patronymes";

/**
 * The name fiche wears the parchment's own vocabulary, or it wears nothing.
 *
 * `fiche-parchment.css` styles a chapter's `h2` and its direct `p` children by
 * tag, and nothing else: there is no `.afh-parchment-section h3`, no `… ul`,
 * no `… li`. Everything below that level carries its own class or falls
 * through to Tailwind Preflight, which resets a heading to `font-size:
 * inherit` and a list to `list-style: none`. Six of this fiche's seven
 * sections did exactly that, so a sub-heading rendered at body size and a list
 * of linked peoples rendered as an unmarked stack of lines — indistinguishable
 * from a run of paragraphs, which is what a reader reported seeing.
 *
 * Two classes were worse than bare: `afh-source-citation` and
 * `afh-source-tier-label` were written, read by nobody, and defined in no
 * stylesheet. They looked like styling in the source and were inert on the
 * page, which is the hardest version of this defect to see. The last case here
 * closes that door for every `afh-` class the fiche renders, not just those
 * two.
 */

/** A dossier with every chapter filled, so each list branch actually renders. */
const filled: PublicPatronyme = {
  alliances: [
    {
      targetId: "PAT_COULIBALY",
      targetNameMain: "Coulibaly",
      allianceType: "sanankuya",
    },
  ],
  id: "PAT_KEITA",
  nameMain: "Keïta",
  nameSystem: "clan_name",
  casteOrSocialFunction: "Horon (noble)",
  associatedPeoples: [
    { id: "PPL_MALINKE", nameMain: "Malinké", slug: "PPL_MALINKE" },
    { id: "PPL_BAMANA", nameMain: "Bamana", slug: "PPL_BAMANA" },
  ],
  associatedCountries: [
    { id: "MLI", nameFr: "Mali" },
    { id: "GIN", nameFr: "Guinée" },
  ],
  bearers: [
    {
      id: "PER_SOUNDIATA",
      fullName: "Soundiata Keïta",
      roleCategory: "Souverain précolonial",
    },
  ],
  content: {
    nameMain: "Keïta",
    nameSystem: "clan_name",
    spellings: [
      {
        spelling: "Keïta",
        attestations: [{ countryId: "MLI", sourceRefs: ["src-mande"] }],
      },
    ],
    transmissionMode: "patrilineal",
    designatedSocialUnit: "clan",
    origin: {
      oralTraditions: [
        {
          claim: "Le jamu remonte à la lignée de Soundiata.",
          claimStatus: "attested",
          griot: "Djeli Mamadou Kouyaté",
        },
      ],
      writtenChronicles: [
        { claim: "Cité dans le Tarikh es-Sudan.", claimStatus: "attested" },
      ],
      linguisticReconstructions: [],
    },
    alliances: [
      { targetPatronymeId: "PAT_COULIBALY", allianceType: "sanankuya" },
    ],
    casteOrSocialFunction: "Horon (noble)",
    bearers: [],
    homonyms: [
      {
        label: "Keita",
        entityType: "toponyme",
        distinction: "Aucun lien démontré avec le jamu.",
      },
    ],
    sources: [
      {
        sourceKey: "src-mande",
        title: "Tarikh es-Sudan",
        url: "https://example.org/tarikh",
        tier: "referenced",
        source_kind: "book",
        notes: "Chronique du XVIIe siècle.",
      },
    ],
    gaps: [],
  },
};

/** The same dossier with nothing documented and no editor's wording either. */
const bare: PublicPatronyme = {
  ...filled,
  alliances: [],
  casteOrSocialFunction: null,
  associatedPeoples: [],
  associatedCountries: [],
  bearers: [],
  content: {
    ...filled.content,
    spellings: [],
    origin: {
      oralTraditions: [],
      writtenChronicles: [],
      linguisticReconstructions: [],
    },
    alliances: [],
    homonyms: [],
    sources: [],
    gaps: [],
  },
};

/** Every `afh-` class any stylesheet under src/styles defines. */
function declaredAfhClasses(): Set<string> {
  const root = join(__dirname, "..", "..", "..", "styles");
  const declared = new Set<string>();

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".css")) {
        for (const match of readFileSync(full, "utf8").matchAll(
          /\.(afh-[a-z0-9-]+)/g
        )) {
          declared.add(match[1]);
        }
      }
    }
  };

  walk(root);
  return declared;
}

describe("name fiche surface — the parchment's own vocabulary", () => {
  // @req REQ-133
  it("gives every sub-heading the one prose heading level there is", () => {
    const { container } = render(<PatronymeFicheView patronyme={filled} />);

    const undressed = Array.from(container.querySelectorAll("h3")).filter(
      (heading) => !heading.classList.contains("afh-prose-heading")
    );

    expect(undressed).toEqual([]);
  });

  // @req REQ-133
  it("dresses every list the reader reads", () => {
    const { container } = render(<PatronymeFicheView patronyme={filled} />);

    const undressed = Array.from(container.querySelectorAll("ul")).filter(
      (list) =>
        !list.classList.contains("afh-prose-list") &&
        !list.classList.contains("afh-sources")
    );

    expect(undressed).toEqual([]);
  });

  /**
   * The citation itself is `SourceCitation`, shared with the bibliography and
   * the dossier — this fiche's own component now adapts the corpus's source
   * shape onto it and nothing more. What stays this surface's contract is that
   * the sources are laid out as the atlas's rows, and that the standing is
   * rendered from the source's own record.
   */
  // @req REQ-133
  it("cites its sources through the atlas-wide row, standing included", () => {
    const { container } = render(<PatronymeFicheView patronyme={filled} />);

    const rows = container.querySelectorAll(".afh-sources .afh-source-row");

    expect(rows).toHaveLength(1);
    expect(
      rows[0]
        .querySelector(".afh-source-citation")
        ?.getAttribute("data-source-tier")
    ).toBe("referenced");
    expect(rows[0].querySelector(".afh-source-tier-label")).not.toBeNull();
  });

  // @req REQ-133
  it("renders no class no stylesheet defines", () => {
    const { container } = render(<PatronymeFicheView patronyme={filled} />);
    const declared = declaredAfhClasses();

    const inert = new Set<string>();
    for (const element of container.querySelectorAll("[class]")) {
      for (const token of element.classList) {
        if (token.startsWith("afh-") && !declared.has(token)) inert.add(token);
      }
    }

    expect([...inert]).toEqual([]);
  });
});

describe("name fiche surface — a source row fits the parchment", () => {
  // Measured at 430px on the built page, not reasoned about: PAT_KEITA cites
  // « Corpus AFRIK — dataset/source/afrik/peuples/FLG_MANDE… », a title with no
  // space in it. A flex item does not shrink below its content, so the row —
  // and with it the title, its notes and the card's right edge — left the
  // screen. The e2e suite would be the natural home for this, but its CI job
  // has never run for want of secrets, so the declaration is asserted where a
  // gate actually executes.
  // @req REQ-133
  it("lets the citation shrink and break inside the row", () => {
    const css = readFileSync(
      join(__dirname, "..", "..", "..", "styles", "fiche-parchment.css"),
      "utf8"
    );
    const rule = css
      .slice(css.indexOf(".afh-source-row > :not(.afh-chip)"))
      .slice(0, 120);

    expect(rule).toContain("min-width: 0");
    expect(rule).toContain("overflow-wrap: anywhere");
  });

  // Brand charter §8.1 — one alignment per block. The site centres text under
  // 768px from the body down, which left the tier chip on the row's left edge
  // and the citation centred beside it.
  // @req REQ-133
  it("keeps one alignment across the chip and its citation", () => {
    const css = readFileSync(
      join(__dirname, "..", "..", "..", "styles", "fiche-parchment.css"),
      "utf8"
    );
    const rule = css.slice(
      css.indexOf(".afh-source-row {"),
      css.indexOf(".afh-source-row >")
    );

    expect(rule).toContain("text-align: start");
  });
});

describe("name fiche surface — a silence is marked, never left blank", () => {
  // @req REQ-119
  it("marks the peoples and countries a dossier does not document", () => {
    const { container } = render(<PatronymeFicheView patronyme={bare} />);
    const section = container.querySelector(
      '[data-fiche-section="Peuples et pays concernés"]'
    );

    expect(section?.querySelector('[role="status"]')).not.toBeNull();
  });

  // @req REQ-119
  it("marks the bearers a dossier does not document", () => {
    const { container } = render(<PatronymeFicheView patronyme={bare} />);
    const section = container.querySelector(
      '[data-fiche-section="Porteurs et porteuses"]'
    );

    expect(section?.querySelector('[role="status"]')).not.toBeNull();
  });
});
