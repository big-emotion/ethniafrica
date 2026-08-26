import type { FicheSource } from "@/types/afrik";
import { SOURCE_TIER_LABELS_FR, type SourceTier } from "@/types/sources";

/**
 * The display text of a fiche `sources[]` entry.
 *
 * Two shapes are live at once, and will be until the AFRIK loaders re-run: the
 * corpus in `dataset/source/afrik/` now holds structured `{title, url, tier}`
 * entries, while the database still serves the fiche JSON it was loaded from,
 * where `sources` is an array of bare strings. Reading `.title` off a string
 * yields `undefined`, and the leading-dash trim that follows then throws — which
 * is how every country fiche started returning HTTP 500.
 *
 * Returns null for an entry carrying no usable text, so a single malformed
 * source drops out of the list instead of taking the page down with it.
 */
// @req REQ-001
export function ficheSourceLabel(
  source: FicheSource | string | null | undefined
): string | null {
  const text = typeof source === "string" ? source : source?.title;
  if (typeof text !== "string") return null;

  const label = text.replace(/^-\s*/, "").trim();
  return label.length > 0 ? label : null;
}

/**
 * The same entries as a single line, in fiche order, with malformed ones
 * dropped.
 */
// @req REQ-001
export function ficheSourceLine(
  sources?: Array<FicheSource | string> | null
): string {
  if (!sources || sources.length === 0) return "";
  return sources
    .map(ficheSourceLabel)
    .filter((label): label is string => label !== null)
    .join(" · ");
}

/**
 * The tier a fiche source may carry, which is the DB vocabulary plus one.
 *
 * `needs_review` is not a level of authority: it is the absence of a judgement.
 * 605 of the corpus's 4 238 sources are in that state, and folding them into
 * `unverified` would state a verdict nobody reached — the opposite of what the
 * tier policy exists to do. It lives here rather than in types/sources.ts
 * because it never reaches the database, whose CHECK holds exactly three
 * values.
 */
export type FicheSourceTier = SourceTier | "needs_review";

// @req REQ-092
export const FICHE_SOURCE_TIER_LABELS_FR: Record<FicheSourceTier, string> = {
  ...SOURCE_TIER_LABELS_FR,
  needs_review: "En attente d'examen",
};

/**
 * Anything unrecognised reads as awaiting review, never as blank.
 *
 * strictNullChecks is off in this repo, so an uncovered tier resolves to
 * `undefined` and renders as literally nothing — a source with no visible
 * provenance at all, which is the one outcome the policy forbids. Falling back
 * to "awaiting review" claims the least.
 */
// @req REQ-092
export function ficheSourceTierLabel(tier: unknown): string {
  return (
    FICHE_SOURCE_TIER_LABELS_FR[tier as FicheSourceTier] ??
    FICHE_SOURCE_TIER_LABELS_FR.needs_review
  );
}

/** A fiche source with its tier already resolved to the label the page shows. */
export interface LabelledFicheSource {
  title: string;
  url: string | null;
  tier: FicheSourceTier;
  tierLabel: string;
  notes?: string;
}

/**
 * The fiche's sources, each still carrying its own provenance.
 *
 * `ficheSourceLine` joins them into one "·"-separated string, which destroys
 * tier, url and notes before any component can render them — no tier chip was
 * possible on a people fiche for as long as the transformer called it. Both
 * shapes the loaders produce are accepted: structured entries from the corpus
 * in git, and the bare strings the database still serves from the fiche JSON
 * it was loaded from. A bare string carries no tier, so it is exactly the
 * source nobody has judged.
 */
// @req REQ-001
export function ficheSources(
  sources?: Array<FicheSource | string> | null
): LabelledFicheSource[] {
  if (!sources || sources.length === 0) return [];

  return sources.flatMap((source) => {
    const title = ficheSourceLabel(source);
    if (title === null) return [];

    const structured = typeof source === "string" ? null : source;
    const tier: FicheSourceTier =
      structured?.tier && structured.tier in FICHE_SOURCE_TIER_LABELS_FR
        ? (structured.tier as FicheSourceTier)
        : "needs_review";

    return [
      {
        title,
        url: structured?.url ?? null,
        tier,
        tierLabel: ficheSourceTierLabel(tier),
        ...(structured?.notes ? { notes: structured.notes } : {}),
      },
    ];
  });
}
