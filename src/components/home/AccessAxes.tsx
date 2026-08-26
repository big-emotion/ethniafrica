"use client";

import Link from "next/link";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { getLocalizedRoute, type PageType } from "@/lib/routing";
import {
  ACCENT_BY_ACCESS_MODE,
  ACCESS_MODES,
  getModulesForAccessMode,
  type AccessMode,
} from "@/lib/hubs/moduleRegistry";
import type { Language } from "@/types/shared";
import type { CorpusCounts } from "@/lib/home/corpusCounts";

/**
 * The three entry points (REQ-113): not a menu to read, three targets to
 * hit. Each carries a live glyph, a figure and one verb — the ten modules
 * live behind the click, on the axis hub the card opens (REQ-114).
 *
 * Every figure counts entries that exist. The card that once promised
 * "3 000 ans" was describing a span the corpus never held (ETNI-1198).
 */
interface AxisDefinition {
  id: AccessMode;
  name: string;
  page: PageType;
  cta: string;
  figure: (counts: CorpusCounts) => string;
}

const plural = (count: number, singular: string, many = `${singular}s`) =>
  `${count} ${count > 1 ? many : singular}`;

const AXES: AxisDefinition[] = [
  {
    id: "explorer",
    name: "Explorer",
    page: "explorerHub",
    cta: "Parcourir",
    figure: (counts) =>
      `${plural(counts.peoples, "peuple")} · ${plural(counts.countries, "pays", "pays")}`,
  },
  {
    id: "comprendre",
    name: "Comprendre",
    page: "comprendreHub",
    cta: "Remonter",
    figure: (counts) => `${plural(counts.migrations, "repère")} · 1 doctrine`,
  },
  {
    id: "jouer",
    name: "Jouer",
    page: "jouerHub",
    cta: "Comparer",
    // Not a count of the corpus but of what the comparison puts in front
    // of the reader — two fiches, side by side.
    figure: () => "2 peuples face à face",
  },
];

/**
 * Each glyph animates the thing its axis actually does, so the motion is a
 * second reading of the label rather than an ornament on it.
 */
function AxisGlyph({
  axis,
  animated,
}: {
  axis: AccessMode;
  animated: boolean;
}) {
  const cls = (name: string) => (animated ? name : undefined);

  if (axis === "explorer") {
    // Peoples scattered across the continent, briefly finding each other.
    const dots: Array<[number, number]> = [
      [14, 18],
      [26, 12],
      [38, 20],
      [20, 30],
      [33, 34],
      [12, 40],
      [40, 41],
    ];
    return (
      <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
        <path
          className={cls("g-thread")}
          d="M14 18 L26 12 L38 20"
          stroke="currentColor"
          strokeWidth="1.2"
          style={animated ? { animationDelay: ".2s" } : undefined}
        />
        <path
          className={cls("g-thread")}
          d="M20 30 L33 34 L40 41"
          stroke="currentColor"
          strokeWidth="1.2"
          style={animated ? { animationDelay: "1.5s" } : undefined}
        />
        {dots.map(([x, y], index) => (
          <circle
            key={`${x}-${y}`}
            className={cls("g-dot")}
            cx={x}
            cy={y}
            r="3"
            fill="currentColor"
            style={
              animated
                ? { animationDelay: `${(index * 0.34).toFixed(2)}s` }
                : undefined
            }
          />
        ))}
      </svg>
    );
  }

  if (axis === "comprendre") {
    // A trajectory writing itself across time.
    return (
      <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
        <path
          d="M8 40 H44"
          stroke="currentColor"
          strokeWidth="1.2"
          opacity=".3"
        />
        <path
          className={cls("g-arc")}
          d="M10 38 Q20 10 30 24 T44 14"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="10" cy="38" r="2.4" fill="currentColor" opacity=".55" />
        <circle cx="44" cy="14" r="2.4" fill="currentColor" opacity=".55" />
      </svg>
    );
  }

  // Two entries brought face to face, and what they share.
  return (
    <svg viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <circle
        className={cls("g-disc")}
        cx="20"
        cy="26"
        r="11"
        stroke="currentColor"
        strokeWidth="2"
        style={{ ["--shift" as string]: "5px" }}
      />
      <circle
        className={cls("g-disc")}
        cx="32"
        cy="26"
        r="11"
        stroke="currentColor"
        strokeWidth="2"
        style={{ ["--shift" as string]: "-5px" }}
      />
    </svg>
  );
}

/**
 * An axis is only as live as the modules behind it. Reading that off the
 * registry rather than a flag here means the day a module stops being
 * `unavailable` the axis starts advertising its action again on its own —
 * there is nothing to remember to undo.
 */
function axisHasLiveModule(mode: AccessMode): boolean {
  return getModulesForAccessMode(mode).some(
    (module) => module.availability !== "unavailable"
  );
}

const PENDING_CTA = "Bientôt";

function pendingFigure(mode: AccessMode): string {
  const count = getModulesForAccessMode(mode).length;
  return `${count} module${count > 1 ? "s" : ""} en préparation`;
}

export interface AccessAxesProps {
  language: Language;
  counts: CorpusCounts;
}

// @req REQ-113
// @req REQ-114
export function AccessAxes({ language, counts }: AccessAxesProps) {
  const reducedMotion = usePrefersReducedMotion();
  const animated = !reducedMotion;

  return (
    <nav
      aria-label="Les trois axes"
      data-testid="access-axes"
      className="access-axes"
    >
      {AXES.map((axis, index) => {
        const available = axisHasLiveModule(axis.id);

        return (
          <Link
            key={axis.id}
            href={getLocalizedRoute(language, axis.page)}
            data-testid={`access-axis-${axis.id}`}
            data-available={available ? "true" : "false"}
            className={cn(
              "access-axis min-h-11",
              ACCENT_BY_ACCESS_MODE[axis.id],
              animated && "access-axis-reveal",
              !available && "access-axis-pending"
            )}
            style={animated ? { animationDelay: `${index * 90}ms` } : undefined}
          >
            <span
              data-testid={`access-axis-glyph-${axis.id}`}
              aria-hidden="true"
              className="access-axis-glyph"
            >
              <AxisGlyph axis={axis.id} animated={animated} />
            </span>
            <h2>{axis.name}</h2>
            <p
              data-testid={`access-axis-figure-${axis.id}`}
              className="access-axis-figure"
            >
              {available ? axis.figure(counts) : pendingFigure(axis.id)}
            </p>
            <span
              data-testid={`access-axis-cta-${axis.id}`}
              className="access-axis-cta"
            >
              {available ? axis.cta : PENDING_CTA}
              <span className="access-axis-arrow" aria-hidden="true">
                →
              </span>
            </span>
          </Link>
        );
      })}

      <style>{`
        .access-axes {
          display: grid;
          grid-template-columns: repeat(${ACCESS_MODES.length}, 1fr);
          gap: 18px;
          max-width: 1140px;
          margin: 0 auto;
        }

        .access-axis {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 14px;
          background: var(--afh-surface);
          border: 1px solid var(--afh-border);
          border-radius: var(--afh-radius-md);
          padding: 24px 22px;
          text-decoration: none;
          color: var(--afh-text);
          position: relative;
          overflow: hidden;
          transition: border-color var(--afh-duration-fast) var(--afh-ease-out),
            transform var(--afh-duration-base) var(--afh-ease-out);
        }

        /* A wash of the axis colour rises from the floor on approach. */
        .access-axis::after {
          content: "";
          position: absolute;
          inset: auto 0 0 0;
          height: 0;
          background: linear-gradient(
            to top,
            color-mix(in srgb, var(--accent) 14%, transparent),
            transparent
          );
          transition: height var(--afh-duration-base) var(--afh-ease-out);
          pointer-events: none;
        }
        .access-axis:hover,
        .access-axis:focus-visible {
          border-color: var(--accent);
          transform: translateY(-3px);
        }
        .access-axis:hover::after,
        .access-axis:focus-visible::after {
          height: 100%;
        }
        .access-axis:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        .access-axis-glyph {
          width: 52px;
          height: 52px;
          flex: none;
          position: relative;
          z-index: 1;
          color: var(--accent);
        }
        .access-axis-glyph svg {
          width: 100%;
          height: 100%;
        }

        .access-axis h2 {
          font-family: var(--afh-font-display);
          font-weight: 900;
          font-size: 26px;
          margin: 0;
          letter-spacing: -0.015em;
          position: relative;
          z-index: 1;
        }

        .access-axis-figure {
          margin: -10px 0 0;
          font-family: var(--afh-font-mono);
          font-size: 12px;
          /* The count is content, not chrome, and it is the smallest type
             on the page. --afh-text-muted clears AA on neither card
             (3.29:1 parchment, 4.21:1 night); the muted *pair* token does,
             on both. */
          color: var(--afh-fg-muted);
          font-variant-numeric: tabular-nums;
          position: relative;
          z-index: 1;
        }

        /* Pending, not disabled: the hub behind it is where the reader
           sees what is coming, so it stays reachable and keyboard-
           operable. Only the promise is dialled back. */
        .access-axis-pending .access-axis-glyph,
        .access-axis-pending .access-axis-cta {
          opacity: 0.62;
        }

        .access-axis-cta {
          margin-top: auto;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 14px;
          font-weight: 700;
          /* Text, so it takes --accent-ink, not the --accent fill: the fill
             measures 3.10-4.39:1 on the card and drops further once the hover
             wash tints the floor behind it. The glyph above keeps --accent —
             it is aria-hidden decoration, not text. */
          color: var(--accent-ink);
          position: relative;
          z-index: 1;
        }
        .access-axis-arrow {
          transition: transform var(--afh-duration-base) var(--afh-ease-out);
        }
        .access-axis:hover .access-axis-arrow {
          transform: translateX(5px);
        }

        /* Glyph motion — each one shows what its axis does. */
        @keyframes g-pulse {
          0%, 100% { opacity: .35; r: 2.6; }
          50% { opacity: 1; r: 3.6; }
        }
        @keyframes g-thread {
          0%, 100% { opacity: 0; }
          45%, 55% { opacity: .85; }
        }
        @keyframes g-draw {
          0% { stroke-dashoffset: 92; }
          55%, 100% { stroke-dashoffset: 0; }
        }
        @keyframes g-approach {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(var(--shift)); }
        }
        @keyframes access-axis-reveal {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: none; }
        }

        .g-dot { animation: g-pulse 2.8s ease-in-out infinite; }
        .g-thread { animation: g-thread 3.6s ease-in-out infinite; }
        .g-arc {
          stroke-dasharray: 92;
          animation: g-draw 3.4s ease-in-out infinite;
        }
        .g-disc { animation: g-approach 3s ease-in-out infinite; }
        .access-axis:hover .g-dot,
        .access-axis:hover .g-thread,
        .access-axis:hover .g-arc,
        .access-axis:hover .g-disc {
          animation-duration: 1.4s;
        }
        .access-axis-reveal {
          animation: access-axis-reveal var(--afh-duration-pageload)
            var(--afh-ease-out) both;
        }

        /* On a phone the stacked card wasted most of its height on air. The
           same three targets become rows: glyph, label, arrow — one thumb's
           reach each, and the whole set visible without scrolling twice. */
        @media (max-width: 860px) {
          .access-axes {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .access-axis {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            grid-template-areas: "glyph name arrow" "glyph figure arrow";
            align-items: center;
            column-gap: 16px;
            row-gap: 2px;
            padding: 16px 18px;
          }
          .access-axis-glyph { grid-area: glyph; width: 42px; height: 42px; }
          .access-axis h2 { grid-area: name; font-size: 21px; }
          .access-axis-figure {
            grid-area: figure;
            margin: 0;
            font-size: 11.5px;
          }
          /* Pending, not disabled: the hub behind it is where the reader
           sees what is coming, so it stays reachable and keyboard-
           operable. Only the promise is dialled back. */
        .access-axis-pending .access-axis-glyph,
        .access-axis-pending .access-axis-cta {
          opacity: 0.62;
        }

        .access-axis-cta { grid-area: arrow; margin: 0; font-size: 0; }
          .access-axis-arrow { font-size: 19px; }
          .access-axis:hover { transform: none; }
        }
      `}</style>
    </nav>
  );
}

export default AccessAxes;
