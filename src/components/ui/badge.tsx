import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import {
  CHARTER_FOCUS_RING,
  CHARTER_HOVER_LIFT,
} from "@/components/ui/charter-motion";

const badgeVariants = cva(
  cn(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
    CHARTER_FOCUS_RING,
    CHARTER_HOVER_LIFT
  ),
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-afh-terracotta text-white hover:brightness-95",
        secondary:
          "border-transparent bg-afh-bg-warm text-afh-text hover:brightness-95",
        destructive:
          "border-transparent bg-afh-classification-disputed text-white hover:brightness-95",
        outline: "border-afh-border text-afh-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
