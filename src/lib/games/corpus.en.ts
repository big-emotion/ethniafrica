import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";
import type { RelationType } from "@/types/relations";

/**
 * English labels for the stored relation types — the sidecar of
 * `RELATION_TYPE_LABEL_FR` in `corpus.ts` (REQ-145). Agent-authored under
 * DEC-048, hence `machine`.
 */
export interface RelationTypeLabelEn {
  labelEn: string;
  provenance: Extract<TranslationKind, "machine">;
}

// @req REQ-145
export const RELATION_TYPE_LABEL_EN: Record<RelationType, RelationTypeLabelEn> =
  {
    migratory: { labelEn: "migratory", provenance: "machine" },
    commercial: { labelEn: "commercial", provenance: "machine" },
    religious: { labelEn: "religious", provenance: "machine" },
  };
