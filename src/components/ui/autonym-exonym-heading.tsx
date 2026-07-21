import * as React from "react";
import { cn } from "@/lib/utils";

interface AutonymExonymHeadingProps {
  /** Exonym: the name given by outsiders / the standard reference name. */
  exonym: string;
  /** Autonym/endonym: the self-appellation used by the people themselves. */
  autonym?: string | null;
  /** Optional identifier code (e.g. FLG_BANTU, PPL_YORUBA, ISO-3166 code). */
  code?: string | null;
  className?: string;
}

/**
 * Displays an autonym/endonym + exonym pair as a heading block.
 * The exonym is the primary heading; the autonym is shown in italics below it
 * when it differs from the exonym.
 */
export function AutonymExonymHeading({
  exonym,
  autonym,
  code,
  className,
}: AutonymExonymHeadingProps) {
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
