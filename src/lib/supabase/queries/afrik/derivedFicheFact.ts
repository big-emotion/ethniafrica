import type { ProvenanceState } from "@/lib/fieldProvenance";

/** A fact keeps its source classification attached through every layer. */
// @req REQ-119
export type ProvenancedValue<T> = {
  value: T | null;
  provenance: ProvenanceState;
  /** Corpus record IDs or field paths used to derive the value. */
  from?: string[];
};
