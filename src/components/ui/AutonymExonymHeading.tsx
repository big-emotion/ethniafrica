"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { bcp47LanguageTag } from "@/lib/languageTag";

export type AutonymExonymHeadingVariant =
  | "hero"
  | "inline"
  | "card"
  | "people-hero"
  | "people-section"
  | "people-naming"
  | "compact";

export interface AutonymExonymHeadingProps {
  /** Self-appellation / autonym. Primary heading text for hero, inline and card variants. */
  autonym?: string | null;
  /** ISO 639-3 code for `autonym`; when set, the autonym element gets a matching `lang` attribute. */
  autonymIso639_3?: string;
  /** Secondary name shown beside the autonym (hero/inline/card) or below it when different (compact). */
  exonym?: string;
  /**
   * What the fiche says the subject *is*, joined to the name by a comma —
   * "Krou, une aire à reconstruire". Distinct from `exonym`, which is another
   * name for the same subject and is joined by a space.
   */
  predicate?: string;
  /** Alternate names, shown with a "+N autres" expand/collapse toggle (hero/inline/card variants). */
  alternateNames?: string[];
  /** IPA pronunciation shown next to the autonym (hero/inline/card variants). */
  ipa?: string;
  /** Primary/reference name for the people-hero and people-section variants. */
  nameMain?: string;
  /** Multiple exonyms rendered as pill chips below `nameMain` (people-hero/people-section variants). */
  exonyms?: string[];
  /** Optional identifier code badge, e.g. FLG_BANTU, PPL_YORUBA, ISO-3166 code (compact variant). */
  code?: string | null;
  className?: string;
  variant?: AutonymExonymHeadingVariant;
}

const headingVariantConfig = {
  hero: {
    tag: "h1" as const,
    autonymClasses: "font-afh-display font-black text-afh-hero",
    exonymClasses: "font-afh font-medium text-afh-h2",
  },
  inline: {
    tag: "h2" as const,
    autonymClasses: "font-afh-display font-bold text-afh-h2",
    exonymClasses: "font-afh font-medium text-afh-h3",
  },
  card: {
    tag: "h3" as const,
    autonymClasses: "font-afh-display font-semibold text-afh-h3",
    exonymClasses: "font-afh font-medium text-afh-body",
  },
};

const peopleVariantConfig = {
  "people-hero": {
    wrapperClasses: "mb-2",
    nameClasses: "leading-none tracking-[-0.02em] text-white",
    nameStyle: {
      fontFamily: "var(--country-font-display)",
      fontSize: "var(--country-text-hero)",
      fontWeight: 900,
    },
    autonymClasses: "text-white/70 text-afh-small mt-1 font-medium",
    exonymClasses:
      "px-[8px] py-[2px] rounded-full text-afh-caption font-medium bg-white/10 border border-white/15 text-white/80",
  },
  "people-section": {
    wrapperClasses: "mb-1",
    nameClasses: "leading-tight tracking-tight",
    nameStyle: { fontFamily: "var(--country-font-display)", fontWeight: 700 },
    autonymClasses:
      "text-[color:var(--country-text-soft)] text-afh-caption mt-0.5",
    exonymClasses:
      "px-[6px] py-[1px] rounded-full text-afh-caption font-medium bg-[color:var(--country-card)] border border-[color:var(--country-border)] text-[color:var(--country-text-soft)]",
  },
};

// @req REQ-115
export function AutonymExonymHeading({
  autonym,
  autonymIso639_3,
  exonym,
  predicate,
  alternateNames,
  ipa,
  nameMain,
  exonyms,
  code,
  className,
  variant = "hero",
}: AutonymExonymHeadingProps) {
  const [expanded, setExpanded] = useState(false);

  // The corpus writes ISO 639-3 and `lang` wants the shortest tag the language
  // has. Emitting `yor` where BCP 47 asks for `yo` reads the autonym in the
  // page's own voice — the one thing this component exists to prevent.
  const autonymLang = bcp47LanguageTag(autonymIso639_3);

  /**
   * The fiche's opening statement: the name borne, and the names imposed, set
   * side by side — autonym on the accent, exonyms on the colonial red.
   *
   * It lives inside this component rather than in the section that uses it
   * because the pairing *is* the doctrine: keep colonial-era names, explain
   * why they are problematic, and never let one reach the page without the
   * autonym beside it. A section assembling that layout from the outside would
   * be free to drift out of it, and afh/no-bare-people-name would have nothing
   * to say — the rule only reaches names passed through here.
   */
  if (variant === "people-naming") {
    const imposedNames = exonyms ?? [];

    return (
      <div className={cn("grid gap-afh-sm md:grid-cols-2", className)}>
        <div
          className="rounded-afh-md border p-afh-sm"
          style={{
            backgroundColor: "var(--accent-tint)",
            borderColor: "var(--accent)",
          }}
        >
          <h3 className="mb-afh-xs text-afh-caption font-bold uppercase tracking-[0.11em]">
            Auto-appellation
          </h3>
          <p
            data-autonym="true"
            lang={autonymLang}
            className="font-afh-display text-afh-h3 font-black leading-tight"
          >
            {autonym ?? nameMain}
          </p>
        </div>

        {/* Four fiches record no exonym at all. An empty red block would read
            as "no colonial name exists for this people" — a claim, where the
            corpus only has an absence. */}
        {imposedNames.length > 0 && (
          <div
            className="rounded-afh-md border p-afh-sm"
            style={{
              backgroundColor: "var(--afh-color-colonial-bg)",
              borderColor: "var(--afh-color-colonial)",
            }}
          >
            <h3
              className="mb-afh-xs text-afh-caption font-bold uppercase tracking-[0.11em]"
              style={{ color: "var(--afh-color-colonial)" }}
            >
              Exonymes
            </h3>
            <ul data-exonyms="true" className="flex flex-col gap-1 pl-4">
              {imposedNames.map((imposed) => (
                <li key={imposed} className="list-disc text-afh-small">
                  {imposed}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (variant === "people-hero" || variant === "people-section") {
    const {
      wrapperClasses,
      nameClasses,
      nameStyle,
      autonymClasses,
      exonymClasses,
    } = peopleVariantConfig[variant];
    const exonymList = exonyms ?? [];

    return (
      <div className={cn(wrapperClasses, className)}>
        <h1 className={nameClasses} style={nameStyle}>
          {nameMain}
        </h1>

        {autonym && (
          <p data-autonym="true" className={autonymClasses}>
            {autonym}
          </p>
        )}

        {exonymList.length > 0 && (
          <div
            data-exonyms="true"
            className="flex flex-wrap gap-[5px] mt-[6px]"
          >
            {exonymList.map((e) => (
              <span key={e} className={exonymClasses}>
                {e}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    const showAutonym = autonym && autonym !== exonym;

    return (
      <div className={cn("space-y-0.5", className)}>
        <div className="flex items-center gap-2 flex-wrap">
          {code && (
            <span className="text-afh-caption font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
              {code}
            </span>
          )}
          <h2 className="font-semibold text-afh-small">{exonym}</h2>
        </div>
        {showAutonym && (
          <p className="text-afh-small text-muted-foreground italic">
            {autonym}
          </p>
        )}
      </div>
    );
  }

  const {
    tag: Heading,
    autonymClasses,
    exonymClasses,
  } = headingVariantConfig[variant];

  const hasAlternateNames =
    Array.isArray(alternateNames) && alternateNames.length > 0;
  const hasExtra = hasAlternateNames && alternateNames!.length > 1;
  const extraCount = hasExtra ? alternateNames!.length - 1 : 0;

  return (
    <div
      className={cn("AutonymExonymHeading", className)}
      data-variant={variant}
    >
      <Heading>
        <span lang={autonymLang} className={autonymClasses}>
          {autonym}
        </span>
        {ipa && (
          <>
            <span aria-hidden="true" className="font-afh text-afh-small ml-1">
              [{ipa}]
            </span>
            <span className="sr-only">
              {`Prononciation phonétique : ${ipa}`}
            </span>
          </>
        )}
        {/* Two names need a space between them. Without it the heading's own
            textContent reads "YorùbáYoruba" — the styling separates them for
            an eye, and for nothing else: a screen reader announces one word,
            and so does every assertion made on text. */}
        {exonym && (
          <>
            {" "}
            <span className={exonymClasses}>{exonym}</span>
          </>
        )}
        {/* A predicate is not a name. "!Kung" and "un peuple sans bord" are a
            subject and what the fiche says about it, so they are joined the
            way the family fiche joins them — by a comma, not by whitespace. */}
        {predicate && <span className={exonymClasses}>, {predicate}</span>}
      </Heading>
      {hasAlternateNames && (
        <div data-alternate-names>
          <span>{alternateNames![0]}</span>
          {hasExtra && (
            <>
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
              >
                {expanded ? "Réduire" : `+${extraCount} autres`}
              </button>
              {expanded &&
                alternateNames!
                  .slice(1)
                  .map((name) => <span key={name}>{name}</span>)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default AutonymExonymHeading;
