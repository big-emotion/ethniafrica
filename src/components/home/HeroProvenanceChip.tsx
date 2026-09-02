import Link from "next/link";
import { getModuleHref } from "@/lib/hubs/moduleHref";
import { ACCESS_MODE_LABELS } from "@/lib/hubs/moduleRegistry";
import type { HubModule } from "@/lib/hubs/moduleAvailability";
import type { Language } from "@/types/shared";

export interface HeroProvenanceChipProps {
  language: Language;
  module: HubModule;
}

/**
 * Says where the module currently filling the hero slot lives (REQ-115):
 * an accent pastille naming the axis, then the module's own name. Without
 * it a rotating hero is a band that shows something different every visit
 * and never says where to find it again.
 *
 * It never names a colour. The accent comes from the `.afh-accent-*`
 * wrapper HomeHero puts around the slot, so the same chip reads Explorer
 * ochre, Comprendre teal or Jouer periwinkle without being edited — the
 * scoping doctrine in color.css, where no component learns which accent it
 * was rendered under.
 *
 * A deliberate departure from ConfidenceChip's "no emoji, no icon, no
 * color alarm": that rule guards against colour standing in for a
 * confidence judgement. This pastille makes no claim about the module — it
 * is a scope indicator, the same job the accent already does when it tints
 * a whole axis page.
 *
 * Mobile-first: at 430px the pastille and both labels stay on one line and
 * the module name ellipses, because a chip that wraps pushes the stage
 * down and costs the globe the fold.
 */
// @req REQ-115
export function HeroProvenanceChip({
  language,
  module,
}: HeroProvenanceChipProps) {
  const axisLabel = ACCESS_MODE_LABELS[module.accessMode];
  const href = getModuleHref(module, language);
  const label = `${axisLabel} — ${module.name}`;

  const content = (
    <>
      <span
        aria-hidden="true"
        style={{ backgroundColor: "var(--accent)" }}
        className="h-2 w-2 shrink-0 rounded-full"
      />
      <span
        style={{ color: "var(--accent-ink)" }}
        className="shrink-0 font-medium"
      >
        {axisLabel}
      </span>
      <span
        style={{ color: "var(--afh-text-soft)" }}
        className="min-w-0 truncate"
      >
        {module.name}
      </span>
    </>
  );

  const className =
    "mx-auto inline-flex max-w-full items-center gap-2 px-2 py-[10px] " +
    "font-[family-name:var(--afh-font-mono)] text-[length:var(--home-text-provenance-chip)] tracking-[0.02em] " +
    "no-underline";

  if (!href) {
    return (
      <span className={className} data-testid="hero-provenance">
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={className}
      data-testid="hero-provenance"
    >
      {content}
    </Link>
  );
}
