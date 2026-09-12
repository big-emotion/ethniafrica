import type { LanguageReference } from "@/types/afrik";
import type { ProvenanceState } from "@/lib/fieldProvenance";

export interface CountryLanguagesFact {
  value: LanguageReference[];
  provenance: ProvenanceState;
  /** Resident people IDs supporting the derived list. */
  from?: string[];
}
