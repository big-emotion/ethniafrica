import Link from "next/link";

import { bcp47LanguageTag } from "@/lib/languageTag";

interface AutonymExonymHeadingProps {
  /** The name a people uses for itself — rendered as the primary name. */
  endonym: string;
  /** The reference/outsider name — rendered as the secondary name. */
  exonym: string;
  /** ISO 639-3 code for the endonym's language, when known. */
  lang?: string;
  /** Destination of the people fiche; omit for rows that have no fiche to open. */
  href?: string;
}

/**
 * Renders an endonym/exonym pair with endonym primacy (UX-DR49 rule 1): the
 * endonym leads with at least the visual weight of the exonym, and carries a
 * `lang` attribute so assistive tech pronounces it correctly.
 *
 * When `href` is set the whole pair becomes the link target rather than the
 * exonym alone, so navigating to the fiche does not reintroduce the primacy
 * inversion this component exists to fix.
 */
// @req REQ-115
export function AutonymExonymHeading({
  endonym,
  exonym,
  lang,
  href,
}: AutonymExonymHeadingProps) {
  // Normalised here rather than at each call site: the corpus hands over
  // ISO 639-3 and `lang` wants the shortest tag BCP 47 allows, so a caller
  // that forgot would emit a tag assistive tech cannot resolve.
  const endonymLang = bcp47LanguageTag(lang);

  const names = (
    <>
      <span
        lang={endonymLang}
        className="text-afh-small font-bold leading-snug"
        style={{ fontFamily: "var(--country-font-body)" }}
      >
        {endonym}
      </span>
      <span
        className="text-afh-caption"
        style={{ color: "var(--country-text-soft)" }}
      >
        {exonym}
      </span>
    </>
  );

  if (!href) return names;

  return (
    <Link
      href={href}
      className="inline-flex items-baseline gap-[6px] flex-wrap hover:underline"
    >
      {names}
    </Link>
  );
}
