"use client";

import { useState } from "react";

export interface AutonymExonymHeadingProps {
  autonym: string;
  autonymIso639_3: string;
  exonym?: string;
  alternateNames?: string[];
  ipa?: string;
  variant?: "hero" | "inline" | "card";
}

const variantConfig = {
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

export function AutonymExonymHeading({
  autonym,
  autonymIso639_3,
  exonym,
  alternateNames,
  ipa,
  variant = "hero",
}: AutonymExonymHeadingProps) {
  const [expanded, setExpanded] = useState(false);

  const {
    tag: Heading,
    autonymClasses,
    exonymClasses,
  } = variantConfig[variant];

  const hasAlternateNames =
    Array.isArray(alternateNames) && alternateNames.length > 0;
  const hasExtra = hasAlternateNames && alternateNames!.length > 1;
  const extraCount = hasExtra ? alternateNames!.length - 1 : 0;

  return (
    <div className="AutonymExonymHeading" data-variant={variant}>
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
            >
              {ipa}
            </span>
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
