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
const ABSENT_FIGURE = "—";

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
  /**
   * How much of the card's row this figure is owed. A record that leads with
   * one figure marks it `lead` and files the others as `tile`; a surface
   * where all the figures weigh the same passes neither.
   */
  emphasis?: "lead" | "tile";
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
  emphasis,
  language,
}: FicheStatCardProps) {
  const provenance = classifyFieldProvenance(value).state;
  const missing = provenance === "missing";

  return (
    /* A label and its value ride in a definition list because that is what
       they are, and because below the tablet floor `mobile-text.css` centres
       everything the atlas renders except `p`, `blockquote`, `dt` and `dd`.
       Carried in spans, a figure and its name drifted to the middle of their
       own card. The fix belongs in the markup: a stylesheet re-declaring
       `text-align` on this surface is refused by `mobileTextCentring`, and
       the sweep exists because one band exempting itself is how the home
       stopped agreeing with the rest of the site.

       The name is written first and painted second. A reader hears "peuples,
       three" rather than "three, peuples", while the eye still meets the
       figure first — `.afh-stat-card-n` is pulled above its `dt` in CSS. */
    <dl
      className="afh-stat-card"
      data-testid={`stat-card-${id}`}
      data-provenance={provenance}
      data-emphasis={emphasis}
      data-missing={missing || undefined}
    >
      <dt className="afh-stat-card-k">{label}</dt>
      <dd className="afh-stat-card-n">
        {missing ? emptyValue : figureText(value, language)}
      </dd>
      {/* A surface that says in its own words what its count covers has
          already said what the marker would say; printing both would state
          one absence twice, in two vocabularies. Where no surface speaks, the
          app's single wording for an absent field does — it lives in
          FieldProvenanceMarker and nowhere else. */}
      {scope ? (
        <dd className="afh-stat-card-scope" data-caveat={missing || undefined}>
          {scope}
        </dd>
      ) : (
        <dd className="afh-stat-card-mark">
          <FieldProvenanceMarker state={provenance} language={language} />
        </dd>
      )}
    </dl>
  );
}
