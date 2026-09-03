import type { DidYouKnowPlate } from "@/lib/home/didYouKnowIllustrations";

export interface AnecdotePlateProps {
  plate: DidYouKnowPlate;
  /**
   * The host surface's own figure class, so the plate takes the same grid slot
   * and the same side-alternation as a photographed card. Without it the home
   * would lay every plate on the left while its photographs alternated.
   */
  className?: string;
}

/**
 * The second register of illustration: a drawn plate, when no photograph is
 * both free to reuse and actually about the anecdote.
 *
 * The bank's first twenty-four anecdotes each found a document — a map that
 * makes the mistake, the object that was traded, the person who did the
 * naming. Forty-three more, drawn from the corpus's people fiches, do not:
 * Wikimedia Commons, the Met, Cleveland and Openverse together answer for
 * some of them and for others hold nothing that is not stock photography of a
 * continent. Filling the gap with a landscape would illustrate nothing, and
 * under a decolonial editorial posture it would illustrate the wrong thing —
 * the brand charter's §9 says as much.
 *
 * So the plate draws the only thing every one of these anecdotes is certainly
 * about: **the two names**. The imposed one above, muted, with who imposed it
 * and when; the people's own below, in the surface's accent, given the larger
 * size. The reader's eye travels from what they were called to what they call
 * themselves, which is the argument of the whole page in one figure.
 *
 * It is drawn rather than photographed on purpose. It is our own work, so no
 * third party's terms travel with it; it weighs a couple of hundred bytes
 * against a hundred and thirty kilobytes; and it cannot be mistaken for a
 * picture *of* the people, which is the failure the charter warns about and
 * which no photograph in this bank is allowed to commit either.
 *
 * The frame keeps the picture's 3/2 ratio so that turning from a photographed
 * card to a drawn one moves nothing on the page.
 */
// @req REQ-113
export function AnecdotePlate({ plate, className }: AnecdotePlateProps) {
  return (
    <figure
      className={className ? `anecdote-plate ${className}` : "anecdote-plate"}
      aria-label={plate.alt}
    >
      <div className="anecdote-plate-frame">
        <p className="anecdote-plate-given">{plate.given}</p>

        {/* An engraved rule rather than a border: it separates the two names
            without ranking them the way a strikethrough would. */}
        <svg
          className="anecdote-plate-rule"
          viewBox="0 0 240 12"
          role="presentation"
          aria-hidden="true"
        >
          <path d="M4 6h96M140 6h96" />
          <path d="M120 1.5 126.5 6 120 10.5 113.5 6Z" />
        </svg>

        <p className="anecdote-plate-own">{plate.own}</p>
        <p className="anecdote-plate-origin">{plate.givenBy}</p>
      </div>

      <figcaption className="anecdote-plate-credit">
        Planche onomastique — EthniAfrica, CC BY-SA 4.0
      </figcaption>

      <style>{`
        .anecdote-plate {
          margin: 0 0 26px;
        }
        .anecdote-plate-frame {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          aspect-ratio: 3 / 2;
          padding: 24px 20px;
          border-radius: var(--afh-radius-lg, 14px);
          border: 1px solid var(--afh-border);
          background: var(--afh-bg-warm);
          text-align: center;
        }
        /* The imposed name is set in the reading face and held back: it is
           the one the anecdote is questioning, not the one it endorses. */
        .anecdote-plate .anecdote-plate-given {
          margin: 0;
          max-width: none;
          text-align: center;
          font-size: var(--afh-text-h2);
          line-height: 1.15;
          color: var(--afh-text-soft);
        }
        .anecdote-plate .anecdote-plate-rule {
          width: min(240px, 70%);
          height: 12px;
          fill: var(--accent-ink, var(--afh-text-soft));
          stroke: var(--accent-ink, var(--afh-text-soft));
          stroke-width: 1;
          opacity: 0.55;
        }
        .anecdote-plate .anecdote-plate-own {
          margin: 0;
          max-width: none;
          text-align: center;
          font-family: var(--afh-font-display, Georgia, serif);
          font-weight: 700;
          font-size: var(--afh-text-hero);
          line-height: 1.05;
          color: var(--accent-ink, var(--afh-fg));
        }
        /* The eyebrow face everywhere else on the site is the mono stack.
           Not here: these lines carry ordinal superscripts — « XIXᵉ » — and
           the mono fallback has no U+1D49, so it substitutes a degree sign
           and the century reads as a temperature. */
        .anecdote-plate .anecdote-plate-origin {
          margin: 2px 0 0;
          max-width: none;
          text-align: center;
          font-family: inherit;
          font-size: var(--afh-text-eyebrow);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--afh-fg-muted);
        }
        .anecdote-plate .anecdote-plate-credit {
          margin: 10px auto 0;
          max-width: 56ch;
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--afh-text-eyebrow);
          color: var(--afh-fg-muted);
        }
      `}</style>
    </figure>
  );
}
