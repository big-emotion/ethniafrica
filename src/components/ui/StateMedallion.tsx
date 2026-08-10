import { DottedContinent } from "@/components/home/DottedContinent";
import { cn } from "@/lib/utils";

interface StateMedallionProps {
  className?: string;
}

// Charter §6 system-state motif: a parchment disc carrying the ochre dotted
// continent. Exactly one instance belongs on any 403/404/error/empty state.
// @req REQ-099
export function StateMedallion({ className }: StateMedallionProps) {
  return (
    <div
      data-testid="state-medallion"
      aria-hidden="true"
      className={cn(
        "relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-afh-border bg-afh-bg-warm",
        className
      )}
    >
      <DottedContinent />
    </div>
  );
}
