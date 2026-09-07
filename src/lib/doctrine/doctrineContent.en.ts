import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";
import type { ClassificationStatus } from "@/types/afrik";

/**
 * The editorial doctrine in English (REQ-145) — two French sources, one
 * sidecar.
 *
 * The four classification definitions live in code, in
 * `src/components/pages/DoctrinePageContent.tsx`, keyed by the status the
 * badge links to. The four doctrine pages under /doctrine/[slug] live in the
 * `editorial_doctrine` table, seeded by migration 018, keyed by slug; their
 * English rows are authored here so the translation is reviewable in a diff,
 * and the wiring PR decides whether it is served from this module or planted
 * as a translation row. The labels and tooltips of the four statuses are
 * already bilingual in `CLASSIFICATION_LABELS` and are not repeated.
 *
 * Endonym and exonym keep their English forms, and « auto-appellation » is
 * the autonym — the glossary's own entries. The institutions the sensitive
 * topics row cites are invariants (REQ-143).
 *
 * Agent-authored under DEC-048, hence `machine` on every record.
 */
type Machine = Extract<TranslationKind, "machine">;

export interface ClassificationDefinitionEn {
  description: string;
  provenance: Machine;
}

// @req REQ-145
export const CLASSIFICATION_DEFINITIONS_EN: Record<
  ClassificationStatus,
  ClassificationDefinitionEn
> = {
  consensual: {
    description:
      "A classification is said to be consensual when it commands broad agreement in the contemporary scholarly literature (historical linguistics, anthropology, archaeology). Primary and secondary sources converge, and the academic debate over the affiliation is closed or marginal.",
    provenance: "machine",
  },
  contested: {
    description:
      "A classification is contested when it is the subject of active debate among researchers: a disputed internal sub-classification, blurred boundaries with a neighbouring family, documented competing hypotheses. We keep the current classification while flagging the controversy.",
    provenance: "machine",
  },
  "colonial-legacy": {
    description:
      "A colonial-legacy classification is a category produced (or fixed) during the colonial period, generally by administrators, missionaries or linguists in the service of the administration. We keep these categories to respect historical traceability, but we explain why they are problematic and give precedence to autonyms.",
    provenance: "machine",
  },
  reconstructive: {
    description:
      "A reconstructive classification is a categorisation established from fragmentary sources (oral traditions, archaeology, genetics, glottochronology). It remains provisional, subject to revision as new data emerge, and is explicitly presented as a reconstruction.",
    provenance: "machine",
  },
};

/** The /doctrine page's own heading and standfirst, beside the definitions. */
// @req REQ-145
export const DOCTRINE_PAGE_EN = {
  heading: "Editorial doctrine",
  intro:
    "This page defines the epistemic status assigned to each classification of a people and of a language family. The badge shown on the fiches links to the corresponding definition below.",
  provenance: "machine" as Machine,
};

export interface DoctrineEntryEn {
  title: string;
  mdxSource: string;
  provenance: Machine;
}

// @req REQ-145
export const DOCTRINE_ENTRIES_EN: Record<string, DoctrineEntryEn> = {
  "endonymes-vs-exonymes": {
    title: "Endonyms vs exonyms",
    mdxSource: `# Endonyms vs exonyms

An **endonym** (or autonym) is the name a people, a language or a place
gives itself in its own language.

An **exonym** is a name given from outside — often by another people, a
colonial administration or a European cartographer.

## Our policy

- We systematically give precedence to **endonyms** wherever they are attested.
- The current exonym (French or English) is kept as a subtitle to make
  searching easier, but is never presented as the main name.
- Where an exonym carries a colonial charge (see *Colonial legacy*), we
  explain it explicitly.
`,
    provenance: "machine",
  },
  "classifications-contestees": {
    title: "Contested classifications",
    mdxSource: `# Contested classifications

A classification is **contested** when it is the subject of active debate
among researchers: a disputed internal sub-classification, blurred boundaries
with a neighbouring family, documented competing hypotheses.

## How we treat contested classifications

- We keep the classification **current** in the majority of the scholarly
  literature.
- We **flag** the controversy with a dedicated badge on the fiche.
- We document the competing hypotheses with their primary sources.
- No position is imposed on the reader: we set out the state of the debate.
`,
    provenance: "machine",
  },
  "heritage-colonial": {
    title: "Colonial legacy",
    mdxSource: `# Colonial legacy

Many of the ethnic, linguistic or geographical categories in use today were
**produced or fixed during the colonial period**, by administrators,
missionaries or linguists working for the colonial administration.

## Our policy

- We **keep** these categories to respect historical traceability and to
  make cross-referencing with existing sources easier.
- We systematically **explain** why they are problematic.
- Alongside them we present the **autonyms** (endonyms) wherever they are
  attested.
- We do not rewrite history: we shed light on it.
`,
    provenance: "machine",
  },
  "topics-sensibles": {
    title: "Sensitive topics",
    mdxSource: `# Sensitive topics

Some topics — slavery, genocides, contemporary ethnic conflicts, ritual
practices, disputed borders — call for **particular editorial vigilance**.

## Our approach

- **Sourced facts only**: no statement without a primary source or a
  reference secondary source (UN, UNFPA, IWGIA, UNESCO, peer-reviewed
  academic work).
- **Plurality of viewpoints** where the sources diverge.
- **No moral judgement** carried by the fiche: we describe, we neither
  condemn nor celebrate.
- **An explicit warning** where the content may be distressing (violence,
  sensitive imagery).
`,
    provenance: "machine",
  },
};
