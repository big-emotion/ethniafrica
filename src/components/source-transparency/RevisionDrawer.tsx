"use client";

import * as React from "react";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useRouteLanguage } from "@/hooks/use-language";
import { formatDate } from "@/lib/languageTag";
import { cn } from "@/lib/utils";
import type { Language } from "@/types/shared";
import { sourceTransparencyCopy } from "@/lib/i18n/copy/sourceTransparency";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export type RevisionItem = {
  version: number;
  published_at: string | null;
  moderator_pseudonym: string | null;
  reason: string | null;
  pinned_url: string;
};

export type RevisionDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peopleId: string;
  language?: Language;
};

type DrawerState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | {
      phase: "success";
      revisions: RevisionItem[];
      nextCursor: number | null;
      loadingMore: boolean;
    };

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const REASON_TRUNCATE_LEN = 80;
const PAGE_SIZE = 20;

/* -------------------------------------------------------------------------- */
/*  Hooks                                                                      */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatPublicationDate(language: Language, iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return formatDate(language, d);
  } catch {
    return iso;
  }
}

async function fetchRevisionPage(
  peopleId: string,
  limit: number,
  cursor?: number
): Promise<{ revisions: RevisionItem[]; nextCursor: number | null }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor != null) params.set("cursor", String(cursor));
  const res = await fetch(`/api/v2/peoples/${peopleId}/revisions?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return {
    revisions: (json.data ?? []) as RevisionItem[],
    nextCursor: json.meta?.pagination?.next_cursor ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function RevisionRow({
  item,
  language,
}: {
  item: RevisionItem;
  language: Language;
}) {
  const copy = sourceTransparencyCopy[language].revisionHistory;
  const [expanded, setExpanded] = React.useState(false);
  const needsTrunc = Boolean(
    item.reason && item.reason.length > REASON_TRUNCATE_LEN
  );
  const displayReason =
    needsTrunc && !expanded
      ? item.reason!.slice(0, REASON_TRUNCATE_LEN) + "…"
      : item.reason;

  return (
    <li
      data-testid={`revision-row-${item.version}`}
      className="rounded-md border border-[var(--afh-border,#e5e7eb)] bg-[var(--afh-surface,#fff)] p-3 space-y-1"
    >
      <a
        href={item.pinned_url}
        className="flex flex-wrap items-center gap-2 text-afh-small font-medium text-[var(--afh-accent,#1d4ed8)] underline underline-offset-2 hover:no-underline"
      >
        <span className="font-semibold">v{item.version}</span>
        <time
          dateTime={item.published_at ?? undefined}
          className="text-[var(--afh-fg-muted,#6b7280)] font-normal"
        >
          {formatPublicationDate(language, item.published_at)}
        </time>
        {item.moderator_pseudonym && (
          <span className="text-[var(--afh-fg-muted,#6b7280)] font-normal">
            {item.moderator_pseudonym}
          </span>
        )}
      </a>
      {item.reason && (
        <p className="text-afh-caption text-[var(--afh-fg,#111827)]">
          {displayReason}
          {needsTrunc && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-[var(--afh-accent,#1d4ed8)] underline underline-offset-1"
              >
                {expanded ? copy.showLess : copy.showMore}
              </button>
            </>
          )}
        </p>
      )}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

const RevisionDrawer: React.FC<RevisionDrawerProps> = ({
  open,
  onOpenChange,
  peopleId,
  language: requestedLanguage,
}) => {
  const routeLanguage = useRouteLanguage();
  const language = requestedLanguage ?? routeLanguage;
  const copy = sourceTransparencyCopy[language].revisionHistory;
  const variant = useSheetVariant();
  const reducedMotion = usePrefersReducedMotion();

  const [state, setState] = React.useState<DrawerState>({ phase: "idle" });
  const fetchRef = React.useRef(0);

  const load = React.useCallback(
    async (cursor?: number) => {
      const id = ++fetchRef.current;
      if (cursor == null) {
        setState({ phase: "loading" });
      } else {
        setState((prev) =>
          prev.phase === "success"
            ? { ...prev, loadingMore: true }
            : { phase: "loading" }
        );
      }
      try {
        const { revisions, nextCursor } = await fetchRevisionPage(
          peopleId,
          PAGE_SIZE,
          cursor
        );
        if (id !== fetchRef.current) return;
        setState((prev) => ({
          phase: "success",
          revisions:
            cursor != null && prev.phase === "success"
              ? [...prev.revisions, ...revisions]
              : revisions,
          nextCursor,
          loadingMore: false,
        }));
      } catch {
        if (id !== fetchRef.current) return;
        setState({ phase: "error", message: copy.loadError });
      }
    },
    [copy.loadError, peopleId]
  );

  React.useEffect(() => {
    if (!open) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, peopleId]);

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
        aria-modal="true"
        data-reduced-motion={reducedMotion ? "true" : "false"}
        data-variant={variant}
      >
        <SheetTitle>{copy.title}</SheetTitle>
        <SheetDescription className="sr-only">
          {copy.description}
        </SheetDescription>

        {state.phase === "loading" && (
          <div
            data-testid="revision-loading"
            className="py-8 text-center text-afh-small text-[var(--afh-fg-muted,#6b7280)]"
            aria-live="polite"
          >
            {copy.loading}
          </div>
        )}

        {state.phase === "error" && (
          <div
            className="space-y-3 rounded-md border border-[var(--afh-warn-fg,#92400e)]/30 bg-[var(--afh-warn-bg,#fef3c7)] p-4 text-afh-small text-[var(--afh-warn-fg,#92400e)]"
            role="alert"
          >
            <p>{copy.loadError}</p>
            <button
              type="button"
              onClick={() => load()}
              className="rounded bg-[var(--afh-warn-fg,#92400e)] px-3 py-1 text-afh-caption font-medium text-white"
            >
              {copy.retry}
            </button>
          </div>
        )}

        {state.phase === "success" && state.revisions.length === 0 && (
          <p
            data-testid="revision-empty"
            className="py-8 text-center text-afh-small text-[var(--afh-fg-muted,#6b7280)]"
          >
            {copy.empty}
          </p>
        )}

        {state.phase === "success" && state.revisions.length > 0 && (
          <section className="space-y-3 overflow-y-auto flex-1">
            <ul className="space-y-2">
              {state.revisions.map((rev) => (
                <RevisionRow key={rev.version} item={rev} language={language} />
              ))}
            </ul>

            {state.nextCursor != null && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  disabled={state.loadingMore}
                  onClick={() => {
                    if (state.phase === "success" && state.nextCursor != null) {
                      load(state.nextCursor);
                    }
                  }}
                  className={cn(
                    "rounded-md border border-[var(--afh-border,#e5e7eb)] px-4 py-2 text-afh-small",
                    state.loadingMore && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {state.loadingMore ? copy.loading : copy.loadMore}
                </button>
              </div>
            )}
          </section>
        )}
      </SheetContent>
    </Sheet>
  );
};

RevisionDrawer.displayName = "RevisionDrawer";

export default RevisionDrawer;
