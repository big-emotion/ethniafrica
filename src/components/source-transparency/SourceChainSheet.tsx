"use client";

import * as React from "react";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { FlagTarget } from "@/components/flags/FlagTarget";
import { cn } from "@/lib/utils";
import {
  SOURCE_TIERS,
  SOURCE_TIER_LABELS_FR,
  toSourceTier,
  type SourceTier,
} from "@/types/sources";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export type Source = {
  id: string;
  title: string;
  author?: string;
  year?: number;
  page?: string;
  url?: string;
  tier: SourceTier;
  /** ISO date string YYYY-MM-DD when the nightly health-check flagged the link. */
  brokenAt?: string | null;
  /** Formatted citation string, used as the FlagTarget snapshotQuote (AC6). */
  citation?: string;
};

export type Assertion = {
  statement: string;
  position?: string;
  confidenceScore: number;
  sourceCount: number;
  lastHumanAuditAt: string | null;
  /** Stable assertion id. Required to enable the FlagTarget wiring below. */
  id?: string;
  /** JSON path to the flagged field, e.g. "demographics.population". */
  fieldPath?: string;
};

export type Revision = {
  url: string;
  label?: string;
};

export type PositionGroup = {
  position: string;
  sources: Source[];
};

export type SourceChainSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assertion: Assertion;
  /** Flat source list when the assertion has a single position. Grouped by tier in UI. */
  sources: Source[];
  /** Multi-perspective grouping per FR24. When provided, takes precedence over `sources`. */
  positions?: PositionGroup[];
  openFlagCount?: number;
  revisionUrl?: string;
  /** Anchor id for the source chip (e.g. "chip-paragraph-3"). */
  anchorId: string;
  /**
   * Cloudflare Turnstile public site key, threaded down from a Server
   * Component. Required together with `assertion.id` to enable the live
   * FlagTarget wiring — otherwise the disabled placeholder is kept.
   */
};

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const TIER_LABELS = SOURCE_TIER_LABELS_FR;

/** Most authoritative first — the reading order of the tier groups. */
const TIER_ORDER = SOURCE_TIERS;

const CITE_DELAY_MS = 4000;

/**
 * Tracks anchors that have already been auto-opened by URL-hash on first mount,
 * so that mounting multiple `SourceChainSheet` instances on the same fiche
 * doesn't open every one of them when the user follows a shareable link.
 */
const openedAnchors = new Set<string>();

/* -------------------------------------------------------------------------- */
/*  Hooks                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Decides the responsive variant for the sheet:
 *   - "bottom"           — viewport < 1024 px
 *   - "right-narrow"     — 1024–1199 px (or tablet 720+) → 420 px wide
 *   - "right-wide"       — ≥ 1200 px → 480 px wide
 *
 * Note: the AC says 720–1199 → right 420 and < 1024 → bottom. These overlap at
 * 720–1023. The bottom-sheet rule wins because it is the stronger UX
 * constraint (small height + swipe-down). Right-side variants only kick in
 * from 1024 px upwards.
 */
function useSheetVariant(): "bottom" | "right-narrow" | "right-wide" {
  const [variant, setVariant] = React.useState<
    "bottom" | "right-narrow" | "right-wide"
  >("bottom");

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const wide = window.matchMedia("(min-width: 1200px)");
    const desktop = window.matchMedia("(min-width: 1024px)");

    const compute = () => {
      if (wide.matches) setVariant("right-wide");
      else if (desktop.matches) setVariant("right-narrow");
      else setVariant("bottom");
    };

    compute();
    wide.addEventListener?.("change", compute);
    desktop.addEventListener?.("change", compute);
    return () => {
      wide.removeEventListener?.("change", compute);
      desktop.removeEventListener?.("change", compute);
    };
  }, []);

  return variant;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return reduced;
}

/**
 * Syncs the sheet open state with the URL hash so the anchor (#chip-...)
 * survives page refreshes and is shareable.
 */
function useUrlAnchorSync(
  open: boolean,
  anchorId: string,
  onOpenChange: (open: boolean) => void
) {
  // Read the initial hash and open the sheet if it matches.
  // Guard with a module-level registry so only the first mount per anchorId
  // triggers the auto-open — multiple sheets with the same anchor must not
  // all open at once.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const currentHash = window.location.hash.replace(/^#/, "");
    if (currentHash === anchorId && !open && !openedAnchors.has(anchorId)) {
      openedAnchors.add(anchorId);
      onOpenChange(true);
    }
    // Intentionally run only once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write the hash when the sheet opens / closes.
  // Per-anchor guard: only rewrite the URL when the current hash is empty or
  // already matches this instance's anchor. Without this guard, mounting
  // multiple sheets on one fiche would strip an unrelated hash on every
  // open/close cycle.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const { pathname, search, hash } = window.location;
    if (open) {
      if (hash === `#${anchorId}` || hash === "") {
        const target = `${pathname}${search}#${anchorId}`;
        try {
          window.history.replaceState(null, "", target);
        } catch {
          /* no-op in tests */
        }
      }
    } else if (hash === `#${anchorId}`) {
      const target = `${pathname}${search}`;
      try {
        window.history.replaceState(null, "", target);
      } catch {
        /* no-op in tests */
      }
    }
  }, [open, anchorId]);
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function groupByTier(sources: Source[]): Record<SourceTier, Source[]> {
  const out: Record<SourceTier, Source[]> = {
    official: [],
    referenced: [],
    unverified: [],
  };
  for (const s of sources) {
    // Legacy rows can still carry an unrecognised tier; they read as unverified
    // rather than crashing the sheet on an undefined bucket.
    out[toSourceTier(s.tier)].push(s);
  }
  return out;
}

/**
 * Returns the URL only if it parses to an `http:` or `https:` scheme.
 * Defends against `javascript:` or `data:` schemes coming from contributor
 * sources. Returns `null` otherwise (including for malformed URLs).
 */
// @req REQ-008
export function safeUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

const FR_DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
});

/**
 * Formats an ISO date (YYYY-MM-DD) as a long French date. Uses a TZ-stable
 * parser to avoid off-by-one errors on date-only inputs. Returns the raw
 * input on parse failure.
 */
// @req REQ-008
export function formatBrokenDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, yearStr, monthStr, dayStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return iso;
  return FR_DATE_FORMATTER.format(date);
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function SourceItem({ source }: { source: Source }) {
  const isBroken = Boolean(source.brokenAt);
  const sanitizedUrl = safeUrl(source.url);
  const renderAsLink = !isBroken && sanitizedUrl !== null;

  return (
    <li
      data-testid={`source-item-${source.id}`}
      className="space-y-1 rounded-md border border-[var(--afh-border,var(--country-border,#e5e7eb))] bg-[var(--afh-surface,var(--country-surface,#fff))] p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-afh-small font-medium text-[var(--afh-fg,var(--country-fg,#111827))]">
          {source.title}
        </p>
        <span
          data-testid={`source-tier-${source.id}`}
          className="shrink-0 rounded-full bg-[var(--afh-muted,var(--country-muted,#f3f4f6))] px-2 py-0.5 text-afh-caption font-medium text-[var(--afh-fg-muted,var(--country-fg-muted,#6b7280))]"
        >
          {TIER_LABELS[source.tier]}
        </span>
      </div>
      <p className="text-afh-caption text-[var(--afh-fg-muted,var(--country-fg-muted,#6b7280))]">
        {[source.author, source.year, source.page].filter(Boolean).join(" · ")}
      </p>
      {source.url ? (
        renderAsLink ? (
          <a
            data-testid={`source-url-${source.id}`}
            href={sanitizedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block break-all text-afh-caption underline underline-offset-2 text-[var(--afh-accent,var(--country-accent,#1d4ed8))]"
          >
            {source.url}
          </a>
        ) : (
          <span
            data-testid={`source-url-${source.id}`}
            aria-disabled="true"
            className={cn(
              "inline-block break-all text-afh-caption underline underline-offset-2 text-[var(--afh-fg-muted,var(--country-fg-muted,#9ca3af))]",
              isBroken && "line-through"
            )}
          >
            {source.url}
          </span>
        )
      ) : null}
      {isBroken && source.brokenAt ? (
        <span
          data-testid={`source-broken-badge-${source.id}`}
          className="inline-flex items-center rounded-full bg-[var(--afh-warn-bg,#fef3c7)] px-2 py-0.5 text-afh-caption font-medium text-[var(--afh-warn-fg,#92400e)]"
        >
          lien non résolu — signalé le {formatBrokenDate(source.brokenAt)}
        </span>
      ) : null}
      <div data-testid={`source-flag-target-${source.id}`} className="pt-1">
        <FlagTarget
          target={{
            type: "source",
            id: source.id,
            snapshotQuote: source.citation,
          }}
          triggerLabel="Signaler cette source"
          className="w-auto text-afh-caption"
        />
      </div>
    </li>
  );
}

function TierGroup({ tier, sources }: { tier: SourceTier; sources: Source[] }) {
  if (sources.length === 0) return null;
  return (
    <div data-testid={`tier-group-${tier}`} className="space-y-2">
      <h4 className="text-afh-eyebrow font-semibold uppercase tracking-wide text-[var(--afh-fg-muted,var(--country-fg-muted,#6b7280))]">
        {TIER_LABELS[tier]}
      </h4>
      <ul className="space-y-2">
        {sources.map((s) => (
          <SourceItem key={s.id} source={s} />
        ))}
      </ul>
    </div>
  );
}

function SourceList({ sources }: { sources: Source[] }) {
  const grouped = groupByTier(sources);
  return (
    <div className="space-y-4">
      {TIER_ORDER.map((tier) => (
        <TierGroup key={tier} tier={tier} sources={grouped[tier]} />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

const SourceChainSheet: React.FC<SourceChainSheetProps> = ({
  open,
  onOpenChange,
  assertion,
  sources,
  positions,
  openFlagCount = 0,
  revisionUrl,
  anchorId,
}) => {
  const variant = useSheetVariant();
  const reducedMotion = usePrefersReducedMotion();
  useUrlAnchorSync(open, anchorId, onOpenChange);

  // "Cite this assertion" appears after a 4 s dwell.
  const [showCite, setShowCite] = React.useState(false);
  React.useEffect(() => {
    if (!open) {
      setShowCite(false);
      return;
    }
    const t = setTimeout(() => setShowCite(true), CITE_DELAY_MS);
    return () => clearTimeout(t);
  }, [open]);

  const statementId = `${anchorId}-statement`;

  const side: "bottom" | "right" = variant === "bottom" ? "bottom" : "right";

  const widthClass =
    variant === "right-wide"
      ? "sm:max-w-[480px] w-[480px]"
      : variant === "right-narrow"
        ? "sm:max-w-[420px] w-[420px]"
        : "w-full max-h-[85vh] overflow-y-auto";

  const motionStyle: React.CSSProperties = reducedMotion
    ? { animationDuration: "0.01ms" }
    : {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn("flex flex-col gap-4", widthClass)}
        style={motionStyle}
        aria-labelledby={statementId}
        aria-modal="true"
        data-reduced-motion={reducedMotion ? "true" : "false"}
        data-variant={variant}
      >
        {/* Visually hidden title/description for radix a11y */}
        <SheetTitle className="sr-only">Chaîne des sources</SheetTitle>
        <SheetDescription className="sr-only">
          Détails de l&apos;assertion, niveau de confiance et sources
          vérifiables.
        </SheetDescription>

        {/* 1. Assertion */}
        <section
          data-testid="section-assertion"
          className="border-l-4 border-[var(--afh-accent,var(--country-accent,#1d4ed8))] pl-3"
        >
          <h3
            id={statementId}
            className="font-serif text-afh-small italic text-[var(--afh-fg,var(--country-fg,#111827))]"
          >
            « {assertion.statement} »
          </h3>
          {assertion.position ? (
            <p className="mt-1 text-afh-caption text-[var(--afh-fg-muted,var(--country-fg-muted,#6b7280))]">
              Position : {assertion.position}
            </p>
          ) : null}
        </section>

        {/* 2. Confidence */}
        <section
          data-testid="section-confidence"
          className="rounded-md bg-[var(--afh-muted,var(--country-muted,#f9fafb))] p-3"
        >
          <div className="flex items-baseline justify-between">
            <span className="text-afh-eyebrow font-semibold uppercase tracking-wide text-[var(--afh-fg-muted,var(--country-fg-muted,#6b7280))]">
              Niveau de confiance
            </span>
            <span className="text-afh-h3 font-semibold text-[var(--afh-fg,var(--country-fg,#111827))]">
              {Math.round(assertion.confidenceScore * 100)}%
            </span>
          </div>
          <p className="mt-1 text-afh-caption text-[var(--afh-fg-muted,var(--country-fg-muted,#6b7280))]">
            Calculé à partir de {assertion.sourceCount} source
            {assertion.sourceCount > 1 ? "s" : ""}
            {assertion.lastHumanAuditAt
              ? ` · dernier audit humain le ${assertion.lastHumanAuditAt}`
              : " · jamais audité par un humain"}
            .
          </p>
        </section>

        {/* 3. Flags banner (conditional) */}
        {openFlagCount > 0 ? (
          <section
            data-testid="section-flags"
            role="status"
            className="rounded-md border border-[var(--afh-warn-fg,#92400e)]/30 bg-[var(--afh-warn-bg,#fef3c7)] p-3 text-afh-small text-[var(--afh-warn-fg,#92400e)]"
          >
            {openFlagCount} signalement{openFlagCount > 1 ? "s" : ""} ouvert
            {openFlagCount > 1 ? "s" : ""} sur cette assertion.
          </section>
        ) : null}

        {/* 4. Sources */}
        <section data-testid="section-sources" className="space-y-4">
          <h3 className="text-afh-small font-semibold text-[var(--afh-fg,var(--country-fg,#111827))]">
            Sources
          </h3>
          {positions && positions.length > 0 ? (
            <div className="space-y-4">
              {positions.map((pg, idx) => (
                <div
                  key={`${pg.position}-${idx}`}
                  data-testid={`position-group-${idx}`}
                  className="space-y-2 rounded-md border border-dashed border-[var(--afh-border,var(--country-border,#e5e7eb))] p-3"
                >
                  <p className="text-afh-caption font-semibold text-[var(--afh-accent,var(--country-accent,#1d4ed8))]">
                    {pg.position}
                  </p>
                  <SourceList sources={pg.sources} />
                </div>
              ))}
            </div>
          ) : (
            <SourceList sources={sources} />
          )}
        </section>

        {/* 5. Revision link (conditional) */}
        {revisionUrl && safeUrl(revisionUrl) ? (
          <section data-testid="section-revision">
            <a
              href={safeUrl(revisionUrl) as string}
              target="_blank"
              rel="noopener noreferrer"
              className="text-afh-caption underline underline-offset-2 text-[var(--afh-accent,var(--country-accent,#1d4ed8))]"
            >
              Voir l&apos;historique des révisions
            </a>
          </section>
        ) : null}

        {/* 6. FlagTarget */}
        <section data-testid="section-flag-target" className="pt-2">
          {/* The `assertion.id` guard stays: with no assertion there is no
              target to report. Only the Turnstile half of the condition goes. */}
          {assertion.id ? (
            <FlagTarget
              target={{
                type: "assertion",
                id: assertion.id,
                fieldPath: assertion.fieldPath,
                snapshotQuote: assertion.statement,
              }}
              triggerLabel="Signaler un problème"
            />
          ) : null}
        </section>

        {/* 7. Cite affordance (appears after 4 s dwell) */}
        <section data-testid="section-cite" className="pt-1">
          <button
            type="button"
            aria-hidden={!showCite}
            tabIndex={showCite ? 0 : -1}
            className={cn(
              "text-afh-caption underline underline-offset-2 transition-opacity",
              reducedMotion ? "duration-[1ms]" : "duration-300",
              showCite ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            Citer cette assertion
          </button>
        </section>
      </SheetContent>
    </Sheet>
  );
};

SourceChainSheet.displayName = "SourceChainSheet";

export default SourceChainSheet;
