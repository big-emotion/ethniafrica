import {
  buildProjectionContrast,
  layoutContrastSilhouettes,
  type ProjectionContrast,
} from "@/lib/games/projectionContrast";
import type { HubModule } from "@/lib/hubs/moduleAvailability";

/**
 * Jouer's scene (REQ-114): a thing the reader believes, and the measurement
 * that takes it away.
 *
 * It replaces a face-off that stated a bargain — "vous apportez rien, vous
 * repartez avec un résultat". Two problems, both structural. The bargain
 * advertised the score, which the games charter §7 calls the pretext rather
 * than the product; and it made Jouer the only one of the three axis scenes
 * built out of copy, while Explorer draws the real continent and Comprendre
 * lists real questions bound to real module availability.
 *
 * The axis puts the reader to the test, so the scene does that first: the map
 * they grew up with shows Greenland larger than the DR Congo, and it is
 * smaller. Every figure is measured off the committed admin-0 outlines at
 * render time — nothing here is a number an editor could type, which is the
 * only arrangement where the page cannot outlive its own data.
 */

const percentFormat = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export interface JouerProjectionContrastProps {
  modules: HubModule[];
  /**
   * The measured claim. Defaults to the asset; passed explicitly only to
   * render the no-claim path, which is a real state rather than a test hook
   * — a regenerated asset that stopped reversing the order must produce a
   * scene with no assertion in it at all.
   */
  contrast?: ProjectionContrast | null;
}

// @req REQ-114
export function JouerProjectionContrast({
  modules,
  contrast = buildProjectionContrast(),
}: JouerProjectionContrastProps) {
  const liveCount = modules.filter((module) => module.available).length;
  const silhouettes = contrast ? layoutContrastSilhouettes(contrast) : null;

  return (
    <div data-testid="jouer-projection-contrast" className="jouer-contrast">
      {contrast && silhouettes && (
        <>
          <div className="jouer-contrast-panel">
            <span className="jouer-contrast-role">
              Ce que la carte vous montre
            </span>
            <span className="jouer-contrast-value">
              {contrast.inflated.nameFr}, plus grand
            </span>
            <span className="jouer-contrast-note">
              que {contrast.understated.nameFr}
            </span>
          </div>

          <figure className="jouer-contrast-figure">
            <svg
              viewBox={silhouettes.viewBox}
              role="img"
              aria-label={`Silhouettes de ${contrast.inflated.nameFr} et de ${contrast.understated.nameFr} dessinées à la même échelle : ${contrast.understated.nameFr} couvre la plus grande surface.`}
            >
              <path
                className="jouer-contrast-shape jouer-contrast-shape--inflated"
                d={silhouettes.inflated.pathD}
              />
              <path
                className="jouer-contrast-shape jouer-contrast-shape--understated"
                d={silhouettes.understated.pathD}
              />
            </svg>
            <figcaption className="jouer-contrast-caption">
              {/* A legend rather than labels inside the SVG: text set in
                  viewBox units would scale with the drawing and could not
                  read a type token (afh/no-raw-font-size). */}
              <span className="jouer-contrast-key">
                <span
                  className="jouer-contrast-swatch jouer-contrast-swatch--inflated"
                  aria-hidden="true"
                />
                {silhouettes.inflated.labelFr}
              </span>
              <span className="jouer-contrast-key">
                <span
                  className="jouer-contrast-swatch jouer-contrast-swatch--understated"
                  aria-hidden="true"
                />
                {silhouettes.understated.labelFr}
              </span>
              <span className="jouer-contrast-scale">à la même échelle</span>
            </figcaption>
          </figure>

          <div className="jouer-contrast-panel">
            <span className="jouer-contrast-role">Ce que mesure la sphère</span>
            <span className="jouer-contrast-value">Il est plus petit</span>
            <span className="jouer-contrast-note">
              {/* Narrow no-break space before the sign, as French sets it. */}
              {`de ${percentFormat.format(contrast.trueAdvantagePercent)} %`}
            </span>
          </div>

          <p className="jouer-contrast-lie">
            Mercator le dessine{" "}
            {/* One string, not `{expr} fois`: JSX strips the whitespace
                either side of a newline, so the split form renders
                "11,8fois". */}
            <strong>
              {`${percentFormat.format(contrast.inflated.inflation)} fois`}
            </strong>{" "}
            trop grand.
          </p>
        </>
      )}

      <p data-testid="jouer-contrast-count" className="jouer-contrast-count">
        {/* No "ci-contre": the module list sits above the scene at 430px and
            beside it only from 800px, so a positional word would be wrong on
            a phone. */}
        {liveCount > 0
          ? `${liveCount} façon${liveCount > 1 ? "s" : ""} de le vérifier vous-même.`
          : "Aucune façon de le vérifier pour le moment."}
      </p>

      <style>{`
        /* Mobile first: belief, proof and measurement stack in reading order,
           so the reversal still lands as a reversal at 430px. */
        .jouer-contrast {
          display: grid;
          grid-template-columns: 1fr;
          justify-items: center;
          gap: 14px;
          padding: 24px 18px;
          border: 1px solid var(--accent);
          border-radius: var(--afh-radius-md);
          /* --afh-surface, not --accent-tint: the muted pair token measures
             4.32:1 on the tint, under AA at this size, and axe catches it on
             all four viewports. The axis colour is carried by the border and
             the silhouette instead. */
          background: var(--afh-surface);
          text-align: center;
        }

        .jouer-contrast-panel {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .jouer-contrast-role {
          font-size: var(--afh-text-eyebrow);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          /* Not --afh-text-muted: it fails AA on both themes at this size. */
          color: var(--afh-fg-muted);
        }

        .jouer-contrast-value {
          font-family: var(--afh-font-display);
          font-size: var(--afh-text-h2);
          font-weight: 900;
          color: var(--afh-text);
        }

        .jouer-contrast-note {
          font-size: var(--afh-text-caption);
          color: var(--afh-fg-muted);
        }

        /* The drawing is the argument, so it is bounded in height and never
           allowed to push the sentences off a phone (games-charter §9.1). */
        .jouer-contrast-figure {
          margin: 0;
          width: 100%;
          max-width: 320px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .jouer-contrast-figure svg {
          width: 100%;
          max-height: 132px;
          overflow: visible;
        }

        .jouer-contrast-shape {
          stroke-width: 1.5;
          vector-effect: non-scaling-stroke;
        }
        /* Drawn larger, and drawn as a claim the page is about to withdraw:
           outline only, no fill to give it weight it has not earned. */
        .jouer-contrast-shape--inflated {
          fill: none;
          stroke: var(--afh-fg-muted);
          stroke-dasharray: 3 3;
        }
        .jouer-contrast-shape--understated {
          fill: var(--accent);
          fill-opacity: 0.34;
          stroke: var(--accent);
        }

        .jouer-contrast-caption {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 4px 12px;
        }

        .jouer-contrast-key {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .jouer-contrast-swatch {
          width: 14px;
          height: 10px;
          border-radius: 2px;
        }
        .jouer-contrast-swatch--inflated {
          border: 1px dashed var(--afh-fg-muted);
        }
        .jouer-contrast-swatch--understated {
          border: 1px solid var(--accent);
          background: var(--accent);
          opacity: 0.34;
        }

        .jouer-contrast-scale {
          font-style: italic;
        }

        .jouer-contrast-caption,
        .jouer-contrast-count {
          margin: 0;
          font-size: var(--afh-text-caption);
          color: var(--afh-fg-muted);
        }

        .jouer-contrast-lie {
          margin: 0;
          font-size: var(--afh-text-caption);
          color: var(--afh-text);
        }

        /* From 800px belief and measurement genuinely face each other across
           the proof, which is the point of the reversal. */
        @media (min-width: 800px) {
          .jouer-contrast {
            grid-template-columns: 1fr auto 1fr;
            align-items: center;
            gap: 18px;
            padding: 32px 24px;
          }
          .jouer-contrast-panel:first-of-type { text-align: right; }
          .jouer-contrast-panel:last-of-type { text-align: left; }
          .jouer-contrast-figure { max-width: 260px; }
          .jouer-contrast-lie,
          .jouer-contrast-count { grid-column: 1 / -1; }
        }
      `}</style>
    </div>
  );
}

export default JouerProjectionContrast;
