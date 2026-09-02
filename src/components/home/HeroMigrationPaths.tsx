"use client";

import * as React from "react";

import { AfricaBasemap } from "@/components/system/AfricaBasemap";
import { MigrationPathLayer } from "@/components/migrations/MigrationPathLayer";
import type { MigrationPath } from "@/api/v2/services/migrations";

export interface HeroMigrationPathsProps {
  paths: MigrationPath[];
}

/**
 * The Comprendre axis in the hero (REQ-115): the sourced migration events
 * drawn where they happened, on the same basemap and through the same
 * layer `/fr/migrations` uses. The layer takes only id, name, geometry and
 * time range, so the band costs one query and never touches the
 * narrative/sources/confidence fan-out that makes the full page heavy.
 *
 * The year sweeps across the corpus's own span rather than sitting still.
 * A static frame would show every path at once, which is the one thing a
 * migration is not: the module's claim is that these are movements with
 * dates, and a band that draws them all simultaneously contradicts the
 * fiche it is advertising. Under prefers-reduced-motion the sweep stops at
 * the end of the span, where every event has already happened — the same
 * complete picture, arrived at without motion.
 *
 * Selection is inert here. The band is an invitation to the module, not a
 * second place to read it, and the provenance chip above already carries
 * the click.
 */
// @req REQ-115
export function HeroMigrationPaths({ paths }: HeroMigrationPathsProps) {
  const span = React.useMemo(() => {
    const starts = paths.map((path) => path.timeRange.startYear);
    const ends = paths.map((path) => path.timeRange.endYear);
    return { min: Math.min(...starts), max: Math.max(...ends) };
  }, [paths]);

  const [year, setYear] = React.useState(span.max);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const SWEEP_MS = 14000;
    const STEP_MS = 120;
    let elapsed = 0;

    const tick = window.setInterval(() => {
      elapsed = (elapsed + STEP_MS) % SWEEP_MS;
      const progress = elapsed / SWEEP_MS;
      setYear(Math.round(span.min + (span.max - span.min) * progress));
    }, STEP_MS);

    return () => window.clearInterval(tick);
  }, [span.min, span.max]);

  return (
    <div className="hero-migration-paths">
      <div className="relative mx-auto w-full max-w-[420px]">
        <AfricaBasemap />
        <MigrationPathLayer events={paths} year={year} />
      </div>
      <p className="hero-migration-readout" aria-live="off">
        {paths.length} repères sourcés · {formatYear(span.min)} →{" "}
        {formatYear(span.max)}
      </p>
      <style>{`
        .hero-migration-paths {
          box-sizing: border-box;
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
          min-height: 460px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 10px;
          padding: 0 16px;
        }
        .hero-migration-readout {
          margin: 0;
          text-align: center;
          font-family: var(--afh-font-mono);
          font-size: var(--home-text-paths-readout);
          font-variant-numeric: tabular-nums;
          color: var(--accent-ink);
        }
        @media (min-width: 720px) {
          .hero-migration-paths { min-height: 540px; }
        }
        @media (min-width: 1200px) {
          .hero-migration-paths { flex: 1 1 auto; min-height: 0; }
        }
      `}</style>
    </div>
  );
}

/** Negative years are BCE in this corpus, and read as such. */
function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : `${year}`;
}
