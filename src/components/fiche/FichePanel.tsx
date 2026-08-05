import { cn } from "@/lib/utils";
import {
  CHARTER_FOCUS_RING,
  CHARTER_HOVER_LIFT,
} from "@/components/ui/charter-motion";
import type { FichePanelProps, FichePanelSize } from "@/types/fiche";

// FR100 — canvas heights are uniform per size selector across breakpoints;
// only the column split ratio (5fr/7fr → 1fr/2fr) changes at >=1200px.
const CANVAS_HEIGHT_PX: Record<FichePanelSize, number> = {
  sm: 300,
  md: 400,
  lg: 440,
};

const BODY_WORD_BUDGET = 25;

function applyWordBudget(text: string, limit: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= limit) return text.trim();
  return `${words.slice(0, limit).join(" ")}…`;
}

/**
 * Shared panel contract for entity fiches (peoples, countries, language
 * families) — FR98 (data-gating), FR99 (chapter anatomy + source-line
 * slot), FR100 (canvas geometry), FR101 (H2 heading).
 *
 * Accent and mode are never props: the panel consumes `--accent` /
 * `--accent-tint` and the `--afh-*` semantic tokens purely from the
 * ambient page scope (ETNI-798 §4), so it never carries a color literal.
 * The dormant `--afh-night-*` tokens are intentionally not consumed here
 * (see src/styles/tokens/color.css) — night mode remains a future
 * decision outside this contract.
 */
export function FichePanel({
  data,
  size,
  side,
  sourceLine,
  className,
}: FichePanelProps) {
  if (!data) return null;

  const { stepLabel, heading, body, note, canvas } = data;
  const canvasHeight = CANVAS_HEIGHT_PX[size];
  const canvasFirst = side === "left";

  return (
    <article
      className={cn(
        "grid grid-cols-1 gap-afh-2xl md:grid-cols-[5fr_7fr] min-[1200px]:grid-cols-[1fr_2fr]",
        CHARTER_FOCUS_RING,
        className
      )}
    >
      <div
        data-fiche-panel-canvas
        className={cn(
          "w-full overflow-hidden rounded-afh-lg bg-afh-bg-warm",
          CHARTER_HOVER_LIFT,
          canvasFirst ? "order-1" : "order-2"
        )}
        style={{ height: `${canvasHeight}px` }}
        aria-hidden={canvas ? undefined : true}
      >
        {canvas}
      </div>

      <div
        data-fiche-panel-text
        className={cn(
          "flex flex-col gap-afh-md",
          canvasFirst ? "order-2" : "order-1"
        )}
      >
        <hr
          aria-hidden="true"
          className="h-px w-full border-0 bg-[var(--accent)]"
        />
        <p className="text-afh-caption uppercase tracking-wide text-afh-text-muted">
          {stepLabel}
        </p>
        <h2 className="font-afh-display text-afh-h2 font-black text-afh-text">
          {heading}
        </h2>
        <p className="text-afh-body text-afh-text-soft">
          {applyWordBudget(body, BODY_WORD_BUDGET)}
        </p>
        {note && <p className="text-afh-small text-afh-text-muted">{note}</p>}
        <p className="text-afh-caption text-afh-text-muted">
          {sourceLine.href ? (
            <a
              href={sourceLine.href}
              className="underline decoration-[var(--accent)]"
            >
              {sourceLine.label}
            </a>
          ) : (
            sourceLine.label
          )}
        </p>
      </div>
    </article>
  );
}
