import Link from "next/link";

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
export function AutonymExonymHeading({
  endonym,
  exonym,
  lang,
  href,
}: AutonymExonymHeadingProps) {
  const names = (
    <>
      <span
        lang={lang}
        className="text-[14px] md:text-[15px] xl:text-[16px] font-bold leading-snug"
        style={{ fontFamily: "var(--country-font-body)" }}
      >
        {endonym}
      </span>
      <span
        className="text-[11px] xl:text-[12px]"
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
