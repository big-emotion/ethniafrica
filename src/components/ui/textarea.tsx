import * as React from "react";

import { cn } from "@/lib/utils";
import { CHARTER_FOCUS_RING } from "@/components/ui/charter-motion";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-afh-lg border border-afh-border bg-afh-surface px-3 py-2 text-afh-small placeholder:text-afh-text-muted disabled:cursor-not-allowed disabled:opacity-50",
        CHARTER_FOCUS_RING,
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
