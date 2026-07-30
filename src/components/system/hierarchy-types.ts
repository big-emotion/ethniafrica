import type { ClassificationStatus } from "@/types/afrik";

/**
 * Shared node shape for the classification hierarchy (family → language →
 * people), consumed by both the interactive tree (7.9) and the zero-JS
 * HierarchyTextIndex (7.8) so the two surfaces never fork the type.
 *
 * Supersedes the narrower `HierarchyNode` previously declared in
 * `src/types/afrik-frontend.ts` (unused outside that file) — that file now
 * re-exports this one.
 */
export type HierarchyNodeType = "language" | "people" | "unlinked-group";

export interface HierarchyEndonym {
  /** Endonym/autonym as written in the source language. */
  label: string;
  /** BCP-47 language tag for the `lang` attribute, e.g. "sw", "ln". */
  lang: string;
}

export interface HierarchyNode {
  id: string;
  type: HierarchyNodeType;
  name: string;
  endonym?: HierarchyEndonym;
  /** Number of peoples accounted for by this node (1 for a people leaf). */
  peopleCount: number;
  /** Deep-link target. Omitted on the unlinked-group node, which is a label, not a link. */
  href?: string;
  classificationStatus?: ClassificationStatus | null;
  children?: HierarchyNode[];
}
