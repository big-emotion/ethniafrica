import * as React from "react";

import { cn } from "@/lib/utils";
import { CHARTER_FOCUS_RING } from "@/components/ui/charter-motion";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-afh-base border border-afh-border bg-afh-surface px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-afh-text placeholder:text-afh-text-muted disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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
