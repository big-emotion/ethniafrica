import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { classifyFieldProvenance } from "@/lib/fieldProvenance";
import { formatNumber } from "@/lib/languageTag";
import type { Language } from "@/types/shared";

/**
 * A counted figure under the name of what it counts.
 *
 * The family record and the country record draw the same card, and for a
 * while they drew it twice: one class set, two React implementations, two
 * pixel literals for one size. Whatever is true of the device is now true of
 * it once. Its dress lives in `fiche-parchment.css` under `.afh-stat-card`.
 *
 * What the card refuses to do is invent. A field the corpus does not fill is
 * marked as missing and shown as whatever stand-in the caller names, never as
 * a zero: zero is a total the atlas can measure, and an absence is a
 * different statement.
 *
 * It also refuses a third line naming where the figure was read from. The
 * family card once carried "Informations générales · total de locuteurs"
 * under a card already headed "Locuteurs" — a field annotation twice
 * translated, first out of the key a developer would grep for, then into
 * French. Neither spelling was ever addressed to a reader.
 *
 * `provenance` is computed, never passed in. A card that stated its empty
 * case as a constant would keep announcing a gap after the corpus filled it,
 * on a project whose whole posture is the transparency of its sources, and no
 * test would catch it.
 */

/** The stand-in for a count nothing fills, when the caller names none. */
export const ABSENT_FIGURE = "—";

interface FicheStatCardProps {
  /** Suffix of the card's test id, and its identity within a row of cards. */
  id: string;
  /** What is being counted, in the reader's words. */
  label: string;
  /** The raw field. A list or a record is counted by its size. */
  value: unknown;
  /** What stands where the figure would be when the corpus fills nothing. */
  emptyValue?: string;
  /**
   * What the count covers, in the surface's own words — including what is
   * absent when it is absent. Supplying it replaces the generic marker.
   */
  scope?: string;
  language: Language;
}

function figureText(value: unknown, language: Language): string {
  if (Array.isArray(value)) return formatNumber(language, value.length);
  if (typeof value === "object" && value !== null) {
    return formatNumber(language, Object.keys(value).length);
  }
  if (typeof value === "number") return formatNumber(language, value);
  return String(value);
}

// @req REQ-151
export function FicheStatCard({
  id,
  label,
  value,
  emptyValue = ABSENT_FIGURE,
  scope,
  language,
}: FicheStatCardProps) {
  const provenance = classifyFieldProvenance(value).state;
  const missing = provenance === "missing";

  return (
    <div
      className="afh-stat-card"
      data-testid={`stat-card-${id}`}
      data-provenance={provenance}
      data-missing={missing || undefined}
    >
      <span className="afh-stat-card-n">
        {missing ? emptyValue : figureText(value, language)}
      </span>
      <span className="afh-stat-card-k">{label}</span>
      {/* A surface that says in its own words what its count covers has
          already said what the marker would say; printing both would state
          one absence twice, in two vocabularies. Where no surface speaks, the
          app's single wording for an absent field does — it lives in
          FieldProvenanceMarker and nowhere else. */}
      {scope ? (
        <span
          className="afh-stat-card-scope"
          data-caveat={missing || undefined}
        >
          {scope}
        </span>
      ) : (
        <FieldProvenanceMarker
          state={provenance}
          language={language}
          className="mt-2"
        />
      )}
    </div>
  );
}
