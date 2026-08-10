import { cn } from "@/lib/utils";

interface ChapterHeadingProps {
  /** Small uppercase label above the rule, e.g. "01 · Origines". */
  stepLabel: string;
  heading: string;
  /** H3 is the long-form exception reserved for these editorial/legal
   *  templates (charter §4) — every other family stays at H2. */
  level?: 2 | 3;
  id?: string;
  className?: string;
}

/**
 * Chapter anatomy primitive (charter §4/§7): top rule + accent step label +
 * Fraunces heading. Mirrors FichePanel's FR99 pattern (src/components/fiche/
 * FichePanel.tsx) so editorial/legal pages read as the same family as fiches.
 */
// @req REQ-091
export function ChapterHeading({
  stepLabel,
  heading,
  level = 2,
  id,
  className,
}: ChapterHeadingProps) {
  const Heading = level === 3 ? "h3" : "h2";
  const headingSizeClass = level === 3 ? "text-afh-h3" : "text-afh-h2";

  return (
    <div className={cn("flex flex-col gap-afh-sm", className)}>
      <hr
        aria-hidden="true"
        className="h-px w-full border-0 bg-[var(--accent)]"
      />
      <p className="text-afh-caption uppercase tracking-wide text-afh-text-soft">
        {stepLabel}
      </p>
      <Heading
        id={id}
        className={cn(
          "font-afh-display font-black text-afh-text",
          headingSizeClass
        )}
      >
        {heading}
      </Heading>
    </div>
  );
}
