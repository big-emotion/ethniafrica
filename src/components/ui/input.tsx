import * as React from "react";

import { cn } from "@/lib/utils";
import { CHARTER_FOCUS_RING } from "@/components/ui/charter-motion";

/**
 * The field used to read `text-base md:text-sm` — 16 px on mobile purely so
 * iOS Safari would not zoom the page on focus, then back down to 14 px. The
 * scale's `small` role is 16 px at every width, so the responsive pair is
 * gone: one token now carries both the iOS behaviour and the desktop size.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-afh-base border border-afh-border bg-afh-surface px-3 py-2 text-afh-small file:border-0 file:bg-transparent file:text-afh-small file:font-medium file:text-afh-text placeholder:text-afh-text-muted disabled:cursor-not-allowed disabled:opacity-50",
          CHARTER_FOCUS_RING,
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
