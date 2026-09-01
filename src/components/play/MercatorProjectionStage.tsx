"use client";

import { useId, useMemo, useState } from "react";

import {
  EQUAL_AREA_BLEND,
  MERCATOR_BLEND,
  MORPH_VIEWBOX,
  areaInflationAt,
  ringToPath,
  tissotIndicatrices,
  worldLandmassRings,
} from "@/lib/atlas/projectionMorph";
import { getAfricaAdmin0Rings } from "@/lib/atlas/overlays";

/**
 * The projection the game is named after, made draggable (REQ-120).
 *
 * `/fr/jeux/mercator` promised this in a comment and mounted the home's
 * globe instead — the page argued about a projection while showing none of
 * it. What was missing is here: the flat map, the slider that undoes the
 * distortion, and Tissot's indicatrices holding the same real area
 * throughout.
 *
 * It stands **above** the rounds and never beside a live one. A manipulable
 * map next to « lequel est le plus grand ? » would let the reader answer by
 * eye, which is the shape-guessing the games charter retired as a category
 * (§1). The stage is the page's argument; the rounds are the questions it
 * earns.
 *
 * The slider starts on Mercator on purpose. That is the map the reader
 * arrived holding, so the gesture available to them is to take it apart —
 * not to be shown the truth and asked to imagine the lie.
 */

const REFERENCE_LATITUDE = 60;

const inflationFormat = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// @req REQ-120
export function MercatorProjectionStage() {
  const [blend, setBlend] = useState(MERCATOR_BLEND);
  const sliderId = useId();

  const world = useMemo(() => worldLandmassRings(), []);
  const africa = useMemo(() => getAfricaAdmin0Rings(), []);
  const indicatrices = useMemo(() => tissotIndicatrices(), []);

  const inflation = areaInflationAt(REFERENCE_LATITUDE, blend);
  const isTrueSize = blend <= EQUAL_AREA_BLEND;

  return (
    <section className="mercator-stage" aria-labelledby={`${sliderId}-title`}>
      <h2 id={`${sliderId}-title`} className="mercator-stage-title">
        La carte, et ce qu&apos;elle vous cache
      </h2>

      <svg
        className="mercator-stage-map"
        viewBox={MORPH_VIEWBOX}
        role="img"
        aria-label={
          isTrueSize
            ? "Planisphère à surfaces vraies : les cercles témoins couvrent tous la même surface sur le globe et en occupent autant à l'écran."
            : `Planisphère de Mercator : les cercles témoins couvrent tous la même surface sur le globe, mais celui de 60 degrés de latitude est dessiné ${inflationFormat.format(inflation)} fois plus grand que celui de l'équateur.`
        }
      >
        {world.map((ring, index) => (
          <path
            key={`world-${index}`}
            className="mercator-stage-land"
            d={ringToPath(ring, blend)}
          />
        ))}
        {africa.map((ring, index) => (
          <path
            key={`africa-${index}`}
            className="mercator-stage-land mercator-stage-land--africa"
            d={ringToPath(ring, blend)}
          />
        ))}
        {indicatrices.map((circle, index) => (
          <path
            key={`tissot-${index}`}
            className="mercator-stage-tissot"
            d={ringToPath(circle.ring, blend)}
          />
        ))}
      </svg>

      <div className="mercator-stage-controls">
        <label className="mercator-stage-label" htmlFor={sliderId}>
          Projection
        </label>
        <div className="mercator-stage-track">
          <span aria-hidden="true">Surfaces vraies</span>
          <input
            id={sliderId}
            className="mercator-stage-slider"
            type="range"
            min={EQUAL_AREA_BLEND}
            max={MERCATOR_BLEND}
            step={0.02}
            value={blend}
            onChange={(event) => setBlend(Number(event.target.value))}
          />
          <span aria-hidden="true">Mercator</span>
        </div>
      </div>

      <p className="mercator-stage-readout" aria-live="polite">
        {/* Not "dessiné de la même taille": an equal-area projection keeps
            area and gives up shape, so the circles arrive as ellipses. Saying
            "same size" would invite the reader to see a contradiction in what
            is actually the second half of the lesson. */}
        {isTrueSize
          ? "Tous occupent la même surface à l'écran. Leur forme change, pas leur surface."
          : `À 60° de latitude, une surface est dessinée ${inflationFormat.format(inflation)} fois trop grande.`}
      </p>

      <p className="mercator-stage-note">
        Les vingt-cinq cercles couvrent tous exactement la même surface sur le
        globe. Toute différence que vous voyez entre eux a été ajoutée par la
        projection.
      </p>

      <style>{`
        /* Mobile first: the map is bounded in height so the slider and its
           readout are never what gets pushed off a 430px screen. */
        .mercator-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 20px 16px 24px;
          margin-bottom: 28px;
          border-bottom: 1px solid var(--afh-border);
        }

        .mercator-stage-title {
          margin: 0;
          font-family: var(--afh-font-display);
          font-size: var(--afh-text-h3);
          color: var(--afh-text);
          text-align: center;
        }

        .mercator-stage-map {
          width: 100%;
          max-width: 560px;
          max-height: 46vh;
          overflow: visible;
        }

        .mercator-stage-land {
          fill: var(--afh-fg-muted);
          fill-opacity: 0.28;
          stroke: none;
        }
        .mercator-stage-land--africa {
          fill: var(--accent);
          fill-opacity: 0.55;
        }

        /* The indicatrices sit on top of the land: they are the measurement,
           not decoration on it. */
        .mercator-stage-tissot {
          fill: var(--accent);
          fill-opacity: 0.18;
          stroke: var(--accent);
          stroke-width: 1;
          vector-effect: non-scaling-stroke;
        }

        .mercator-stage-controls {
          width: 100%;
          max-width: 560px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .mercator-stage-label {
          font-size: var(--afh-text-eyebrow);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--afh-fg-muted);
        }

        .mercator-stage-track {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: var(--afh-text-caption);
          color: var(--afh-fg-muted);
        }

        .mercator-stage-slider {
          flex: 1;
          /* WCAG 2.5.8: the thumb has to stay a 44px target on a phone. */
          min-height: 44px;
          accent-color: var(--accent);
        }

        .mercator-stage-readout {
          margin: 0;
          font-family: var(--afh-font-display);
          font-size: var(--afh-text-h3);
          font-weight: 700;
          color: var(--afh-text);
          text-align: center;
        }

        .mercator-stage-note {
          margin: 0;
          max-width: 46ch;
          font-size: var(--afh-text-caption);
          color: var(--afh-fg-muted);
          text-align: center;
        }
      `}</style>
    </section>
  );
}

export default MercatorProjectionStage;
