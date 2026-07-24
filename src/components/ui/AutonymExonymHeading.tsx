"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type AutonymExonymHeadingVariant =
  | "hero"
  | "inline"
  | "card"
  | "people-hero"
  | "people-section"
  | "compact";

export interface AutonymExonymHeadingProps {
  /** Self-appellation / autonym. Primary heading text for hero, inline and card variants. */
  autonym?: string | null;
  /** ISO 639-3 code for `autonym`; when set, the autonym element gets a matching `lang` attribute. */
  autonymIso639_3?: string;
  /** Secondary name shown beside the autonym (hero/inline/card) or below it when different (compact). */
  exonym?: string;
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
    autonymClasses: "text-white/70 text-[14px] md:text-[15px] mt-1 font-medium",
    exonymClasses:
      "px-[8px] py-[2px] rounded-full text-[11px] font-medium bg-white/10 border border-white/15 text-white/80",
  },
  "people-section": {
    wrapperClasses: "mb-1",
    nameClasses: "leading-tight tracking-tight",
    nameStyle: { fontFamily: "var(--country-font-display)", fontWeight: 700 },
    autonymClasses: "text-[color:var(--country-text-soft)] text-[13px] mt-0.5",
    exonymClasses:
      "px-[6px] py-[1px] rounded-full text-[10px] font-medium bg-[color:var(--country-card)] border border-[color:var(--country-border)] text-[color:var(--country-text-soft)]",
  },
};

export function AutonymExonymHeading({
  autonym,
  autonymIso639_3,
  exonym,
  alternateNames,
  ipa,
  nameMain,
  exonyms,
  code,
  className,
  variant = "hero",
}: AutonymExonymHeadingProps) {
  const [expanded, setExpanded] = useState(false);

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
            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
              {code}
            </span>
          )}
          <h3 className="font-semibold text-base">{exonym}</h3>
        </div>
        {showAutonym && (
          <p className="text-sm text-muted-foreground italic">{autonym}</p>
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
        <span lang={autonymIso639_3} className={autonymClasses}>
          {autonym}
        </span>
        {ipa && (
          <>
            <span aria-hidden="true" className="font-afh text-afh-small ml-1">
              [{ipa}]
            </span>
            <span
              className="sr-only"
              aria-label={`Prononciation phonétique : ${ipa}`}
            />
          </>
        )}
        {exonym && <span className={exonymClasses}>{exonym}</span>}
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
