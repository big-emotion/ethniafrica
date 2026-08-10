import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ReadingColumnProps {
  children: ReactNode;
  className?: string;
}

/**
 * Constrains body text to the charter's reading measure (≤ 72ch, charter
 * §4/§7). Callers control alignment/spacing via className; this primitive
 * only owns the width constraint.
 */
// @req REQ-091
export function ReadingColumn({ children, className }: ReadingColumnProps) {
  return <div className={cn("max-w-[72ch]", className)}>{children}</div>;
}
