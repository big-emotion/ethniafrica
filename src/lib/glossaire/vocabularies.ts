/**
 * The controlled vocabularies, labelled once, keyed by locale.
 *
 * Every closed set the atlas shows a reader — the source tiers, the four
 * classification statuses, the relation and name types, the patronyme
 * sub-vocabularies, the colonial event types, the three access modes — used
 * to be labelled wherever it was first rendered: inside a badge component,
 * inside the French UI dictionary, once even twice with two spellings. The
 * bilingual glossary (REQ-144) needs one place to read them from, so this
 * file is that place and `terms.ts` assembles the glossary from it.
 *
 * Only controlled-value labels live here, never sentences. UI copy stays in
 * `translations.ts`, which points at these records rather than restating
 * them.
 *
 * No React, no lucide, no Next: `scripts/ci/checkGlossary.ts` imports this
 * file under plain `tsx`.
 */

import type { ColonialEventType } from "@/lib/afrik/migrationEventTypes";
import type {
  PatronymeDossier,
  PatronymeNameSystem,
  PatronymeNisbaDossier,
  PatronymeOriginClaim,
} from "@/lib/afrik/parsers/patronymeTypes";
import { ACCESS_MODE_LABELS, type AccessMode } from "@/lib/hubs/moduleRegistry";
import type { RelationBadgeType } from "@/lib/relationsDataTransformer";
import type { ClassificationStatus } from "@/types/afrik";
import type { NameRecordType } from "@/types/names";
import type { SourceTier } from "@/types/sources";

/**
 * The two locales the glossary is written in.
 *
 * Declared here rather than read from `Language` in `src/types/shared.ts`
 * because that union still says `"fr"` on this branch: a `Record<Language,…>`
 * with an `en` key would not compile. The bilingual foundation widens
 * `Language` to `"en" | "fr"`; when it lands, this becomes
 * `export type GlossaryLocale = Language` and nothing else changes.
 */
export type GlossaryLocale = "en" | "fr";

type Labels<Key extends string> = Record<GlossaryLocale, Record<Key, string>>;

// ───── Source standing ────────────────────────────────────────────────────

// @req REQ-092
export const SOURCE_TIER_LABELS: Labels<SourceTier> = {
  fr: {
    official: "Officielle",
    referenced: "Référencée",
    unverified: "Non vérifiée",
  },
  en: {
    official: "Official",
    referenced: "Referenced",
    unverified: "Unverified",
  },
};

/**
 * `needs_review` is not a tier and must not be shown as one. Folding it
 * onto "Non vérifiée" — which is what an unlabelled fallback does — states
 * a judgement nobody has made: the doctrine is that every source carries a
 * label, not that every source has been ruled on. It gets its own wording
 * for that reason, and the UI keeps it visually distinct from the three.
 */
// @req REQ-092
export const SOURCE_PENDING_REVIEW_LABEL: Record<GlossaryLocale, string> = {
  fr: "En attente d'examen",
  en: "Awaiting review",
};

/**
 * The label for anything a fiche's `sources[]` can carry, tier or not.
 *
 * No default locale: every call site names its own, so the sweep that wires
 * the reader's locale through can find each literal `"fr"` it has to replace.
 */
// @req REQ-092
export function sourceStandingLabel(
  standing: SourceTier | "needs_review",
  locale: GlossaryLocale
): string {
  // Anything the vocabulary does not recognise reads as awaiting review, not
  // as blank. strictNullChecks is off in this repo, so an uncovered value
  // resolves to `undefined` and renders as literally nothing — a source with
  // no visible provenance at all, the one outcome the tier policy forbids.
  // Falling back here claims the least rather than the most.
  return (
    SOURCE_TIER_LABELS[locale][standing] ?? SOURCE_PENDING_REVIEW_LABEL[locale]
  );
}

// ───── Classification status ──────────────────────────────────────────────

export interface ClassificationLabel {
  label: string;
  tooltip: string;
}

/**
 * The French tooltip is also what the corpus loader writes into
 * `assertions.statement` (scripts/lib/classificationAssertion.ts), so the
 * `fr` side is a database value as much as a UI one and does not change
 * lightly.
 */
// @req REQ-023
export const CLASSIFICATION_LABELS: Record<
  GlossaryLocale,
  Record<ClassificationStatus, ClassificationLabel>
> = {
  fr: {
    consensual: {
      label: "Consensuel",
      tooltip:
        "Classification largement consensuelle dans la littérature scientifique.",
    },
    contested: {
      label: "Contesté",
      tooltip: "Classification faisant l'objet de débats académiques.",
    },
    "colonial-legacy": {
      label: "Héritage colonial",
      tooltip:
        "Catégorie héritée de la période coloniale, conservée et expliquée selon notre cadre éditorial.",
    },
    reconstructive: {
      label: "Reconstructif",
      tooltip: "Classification reconstruite à partir de sources fragmentaires.",
    },
  },
  en: {
    consensual: {
      label: "Consensual",
      tooltip: "Classification widely agreed upon in the scholarly literature.",
    },
    contested: {
      label: "Contested",
      tooltip: "Classification under academic debate.",
    },
    "colonial-legacy": {
      label: "Colonial legacy",
      tooltip:
        "Category inherited from the colonial period, kept and explained under our editorial framework.",
    },
    reconstructive: {
      label: "Reconstructive",
      tooltip: "Classification rebuilt from fragmentary sources.",
    },
  },
};

// ───── Relation types ─────────────────────────────────────────────────────

// @req REQ-097
export const RELATION_TYPE_LABELS: Labels<RelationBadgeType> = {
  fr: {
    linguistic: "Linguistique",
    migratory: "Migratoire",
    commercial: "Commerciale",
    religious: "Religieuse",
  },
  en: {
    linguistic: "Linguistic",
    migratory: "Migratory",
    commercial: "Commercial",
    religious: "Religious",
  },
};

// ───── Name-record types ──────────────────────────────────────────────────

/**
 * `imposed` is not a fifth `NameRecordType`: it is a flag on an exonym. It is
 * labelled beside the four because the badge renders it in their place, and
 * the filter chip used to carry its own plural copy of the same word.
 */
// @req REQ-056
export const NAME_TYPE_LABELS: Labels<NameRecordType | "imposed"> = {
  fr: {
    endonym: "endonyme",
    exonym: "exonyme",
    historical_spelling: "graphie historique",
    surname: "patronyme",
    imposed: "nom imposé",
  },
  en: {
    endonym: "endonym",
    exonym: "exonym",
    historical_spelling: "historical spelling",
    surname: "family name",
    imposed: "imposed name",
  },
};

// ───── Patronyme sub-vocabularies ─────────────────────────────────────────

type PatronymeTransmissionMode = PatronymeDossier["transmissionMode"];
type PatronymeDesignatedSocialUnit = PatronymeDossier["designatedSocialUnit"];
type PatronymeNisbaSubtype = NonNullable<
  PatronymeNisbaDossier["nisbaSubtype"]
>["value"];
type PatronymeOriginClaimStatus = PatronymeOriginClaim["claimStatus"];

export interface PatronymeVocabulary {
  nameSystem: Record<PatronymeNameSystem, string>;
  transmissionMode: Record<PatronymeTransmissionMode, string>;
  designatedSocialUnit: Record<PatronymeDesignatedSocialUnit, string>;
  nisbaSubtype: Record<PatronymeNisbaSubtype, string>;
  originClaimStatus: Record<PatronymeOriginClaimStatus, string>;
}

/**
 * The public word for the patronyme is « nom » (DEC-038); "patronyme" only
 * survives below where it names one of the five naming systems, which is
 * onomastic vocabulary rather than a label for the axis.
 */
// @req REQ-133
export const PATRONYME_VOCABULARY: Record<GlossaryLocale, PatronymeVocabulary> =
  {
    fr: {
      nameSystem: {
        clan_name: "Nom de clan",
        non_hereditary_patronymic: "Patronyme non héréditaire",
        nisba: "Nisba",
        praise_name: "Nom d'éloge (jamu)",
        totemic_clan: "Clan totémique",
      },
      transmissionMode: {
        patrilineal: "Patrilinéaire",
        matrilineal: "Matrilinéaire",
        bilateral: "Bilatérale",
        elective: "Élective",
        non_hereditary: "Non héréditaire",
        other: "Autre",
      },
      designatedSocialUnit: {
        individual: "Individu",
        lineage: "Lignage",
        clan: "Clan",
        caste: "Caste",
        age_set: "Classe d'âge",
        settlement: "Établissement",
        other: "Autre",
      },
      nisbaSubtype: {
        geographic: "Géographique",
        tribal: "Tribale",
        occupational: "Occupationnelle",
        other: "Autre",
      },
      originClaimStatus: {
        claimed: "Revendiquée",
        contested: "Contestée",
        established: "Établie",
      },
    },
    en: {
      nameSystem: {
        clan_name: "Clan name",
        non_hereditary_patronymic: "Non-hereditary patronymic",
        nisba: "Nisba",
        praise_name: "Praise name (jamu)",
        totemic_clan: "Totemic clan",
      },
      transmissionMode: {
        patrilineal: "Patrilineal",
        matrilineal: "Matrilineal",
        bilateral: "Bilateral",
        elective: "Elective",
        non_hereditary: "Non-hereditary",
        other: "Other",
      },
      designatedSocialUnit: {
        individual: "Individual",
        lineage: "Lineage",
        clan: "Clan",
        caste: "Caste",
        age_set: "Age set",
        settlement: "Settlement",
        other: "Other",
      },
      nisbaSubtype: {
        geographic: "Geographic",
        tribal: "Tribal",
        occupational: "Occupational",
        other: "Other",
      },
      originClaimStatus: {
        claimed: "Claimed",
        contested: "Contested",
        established: "Established",
      },
    },
  };

// ───── Colonial event types ───────────────────────────────────────────────

// Lowercase in both locales: the timeline prints them mid-sentence
// (« événement fragmentation »), never as a heading.
// @req REQ-080
export const COLONIAL_EVENT_TYPE_LABELS: Labels<ColonialEventType> = {
  fr: {
    fragmentation: "fragmentation",
    displacement: "déplacement forcé",
    imposed_name: "nom imposé",
    resistance: "résistance",
  },
  en: {
    fragmentation: "fragmentation",
    displacement: "forced displacement",
    imposed_name: "imposed name",
    resistance: "resistance",
  },
};

// ───── Access modes ───────────────────────────────────────────────────────

/**
 * `ACCESS_MODE_LABELS` keeps its home and its exact shape — ninety-nine
 * references and an exact-shape test hang off it — so the French side is
 * read from `moduleRegistry` rather than restated, and only the English
 * sibling is new. Navigation copy rather than a domain term; it sits in the
 * glossary so that the axis is named one way across the whole English site.
 */
// @req REQ-114
export const ACCESS_MODE_LABELS_BY_LOCALE: Labels<AccessMode> = {
  fr: ACCESS_MODE_LABELS,
  en: {
    atlas: "The atlas",
    dossiers: "The dossiers",
    jeux: "Play",
  },
};
