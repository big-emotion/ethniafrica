interface AutonymExonymHeadingProps {
  /** The name a people uses for itself — rendered as the primary name. */
  endonym: string;
  /** The reference/outsider name — rendered as the secondary name. */
  exonym: string;
  /** ISO 639-3 code for the endonym's language, when known. */
  lang?: string;
}

/**
 * Renders an endonym/exonym pair with endonym primacy (UX-DR49 rule 1): the
 * endonym leads with at least the visual weight of the exonym, and carries a
 * `lang` attribute so assistive tech pronounces it correctly.
 */
export function AutonymExonymHeading({
  endonym,
  exonym,
  lang,
}: AutonymExonymHeadingProps) {
  return (
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
}
