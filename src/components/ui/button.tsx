import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import {
  CHARTER_FOCUS_RING,
  CHARTER_HOVER_LIFT,
} from "@/components/ui/charter-motion";

const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-afh-base text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    CHARTER_FOCUS_RING,
    CHARTER_HOVER_LIFT
  ),
  {
    variants: {
      variant: {
        default: "bg-afh-terracotta text-white hover:brightness-95",
        destructive:
          "bg-afh-classification-disputed text-white hover:brightness-95",
        outline:
          "border border-afh-border bg-afh-surface hover:bg-afh-bg-warm hover:text-afh-text",
        secondary: "bg-afh-bg-warm text-afh-text hover:brightness-95",
        ghost: "hover:bg-afh-bg-warm hover:text-afh-text",
        link: "text-afh-terracotta underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-afh-base px-3",
        lg: "h-11 rounded-afh-base px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
