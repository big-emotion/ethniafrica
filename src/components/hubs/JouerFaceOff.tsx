import type { HubModule } from "@/lib/hubs/moduleAvailability";

/**
 * Jouer's scene (REQ-114). The axis card on the home page already carries
 * this idiom in miniature — two discs approaching each other — and the
 * scene plays it at page scale: two panels facing across a seam.
 *
 * It states the bargain the axis makes rather than repeating the module
 * list beside it: the reader brings nothing, and the machine hands back a
 * result. That bargain is the only thing distinguishing Jouer from the two
 * axes that ask the reader to arrive with something.
 */
export interface JouerFaceOffProps {
  modules: HubModule[];
}

// @req REQ-114
export function JouerFaceOff({ modules }: JouerFaceOffProps) {
  const liveCount = modules.filter((module) => module.available).length;

  return (
    <div data-testid="jouer-face-off" className="jouer-faceoff">
      <div className="jouer-faceoff-panel">
        <span className="jouer-faceoff-role">Vous apportez</span>
        <span className="jouer-faceoff-value">rien</span>
      </div>

      <span className="jouer-faceoff-seam" aria-hidden="true">
        <svg viewBox="0 0 52 52" fill="none">
          <circle
            cx="20"
            cy="26"
            r="11"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx="32"
            cy="26"
            r="11"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </span>

      <div className="jouer-faceoff-panel">
        <span className="jouer-faceoff-role">Vous repartez avec</span>
        <span className="jouer-faceoff-value">un résultat</span>
      </div>

      <p data-testid="jouer-face-off-count" className="jouer-faceoff-count">
        {/* No "ci-contre": the list sits above the scene at 430px and
            beside it only from 800px, so a positional word would be wrong
            on a phone. */}
        {liveCount > 0
          ? `${liveCount} façon${liveCount > 1 ? "s" : ""} de jouer pour l'instant.`
          : "Aucune façon de jouer pour le moment."}
      </p>

      <style>{`
        /* Mobile first: the two panels stack and the seam sits between
           them, so the face-off still reads as a face-off at 430px. */
        .jouer-faceoff {
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
             the seam instead. */
          background: var(--afh-surface);
          text-align: center;
        }

        .jouer-faceoff-panel {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .jouer-faceoff-role {
          font-size: var(--afh-text-eyebrow);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          /* Not --afh-text-muted: it fails AA on both themes at this size. */
          color: var(--afh-fg-muted);
        }

        .jouer-faceoff-value {
          font-family: var(--afh-font-display);
          font-size: var(--afh-text-h2);
          font-weight: 900;
          color: var(--afh-text);
        }

        .jouer-faceoff-seam {
          width: 52px;
          height: 52px;
          color: var(--accent);
        }
        .jouer-faceoff-seam svg { width: 100%; height: 100%; }

        .jouer-faceoff-count {
          margin: 0;
          font-size: var(--afh-text-caption);
          color: var(--afh-fg-muted);
        }

        /* From 800px the two panels genuinely face each other across the
           seam, which is the point of the idiom. */
        @media (min-width: 800px) {
          .jouer-faceoff {
            grid-template-columns: 1fr auto 1fr;
            align-items: center;
            gap: 18px;
            padding: 32px 24px;
          }
          .jouer-faceoff-panel:first-of-type { text-align: right; }
          .jouer-faceoff-panel:last-of-type { text-align: left; }
          .jouer-faceoff-count { grid-column: 1 / -1; }
        }
      `}</style>
    </div>
  );
}

export default JouerFaceOff;
