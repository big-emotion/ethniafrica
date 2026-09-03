import type { DidYouKnowMotif as DidYouKnowMotifName } from "@/lib/home/didYouKnowMotifs";

interface DidYouKnowMotifProps {
  motif: DidYouKnowMotifName;
}

interface PatternProps {
  id: string;
}

function KoraPattern({ id }: PatternProps) {
  return (
    <pattern
      id={id}
      width="280"
      height="280"
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(-9)"
      data-cultural-symbol="mande-kora"
    >
      {/* Mandinka kora: long neck, twin hand posts and calabash resonator. */}
      <g
        className="home-dyk-motif-mark"
        transform="translate(24 18) scale(.72)"
      >
        <path d="M42 96V8M34 96V36M50 96V36" />
        <path d="M42 28 25 70M42 28l17 42M42 42 29 72M42 42l13 30" />
        <path d="M22 70c-8 4-13 13-13 23 0 18 14 31 33 31s33-13 33-31c0-10-5-19-13-23Z" />
        <path d="M25 70c4 8 4 41 0 48M59 70c-4 8-4 41 0 48M36 78h12v34H36z" />
      </g>
      <g
        className="home-dyk-motif-mark"
        transform="translate(162 145) scale(.92) rotate(7 42 66)"
      >
        <path d="M42 96V8M34 96V36M50 96V36" />
        <path d="M42 28 25 70M42 28l17 42M42 42 29 72M42 42l13 30" />
        <path d="M22 70c-8 4-13 13-13 23 0 18 14 31 33 31s33-13 33-31c0-10-5-19-13-23Z" />
        <path d="M25 70c4 8 4 41 0 48M59 70c-4 8-4 41 0 48M36 78h12v34H36z" />
      </g>
      <g
        className="home-dyk-motif-mark"
        transform="translate(190 -34) scale(.46) rotate(12 42 66)"
      >
        <path d="M42 96V8M34 96V36M50 96V36" />
        <path d="M42 28 25 70M42 28l17 42M42 42 29 72M42 42l13 30" />
        <path d="M22 70c-8 4-13 13-13 23 0 18 14 31 33 31s33-13 33-31c0-10-5-19-13-23Z" />
        <path d="M25 70c4 8 4 41 0 48M59 70c-4 8-4 41 0 48M36 78h12v34H36z" />
      </g>
    </pattern>
  );
}

function FibulaPattern({ id }: PatternProps) {
  return (
    <pattern
      id={id}
      width="280"
      height="280"
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(-9)"
      data-cultural-symbol="amazigh-fibula"
    >
      {/* Atlas silver fibula: ring, triangular plate and cloak pin. */}
      <g
        className="home-dyk-motif-mark"
        transform="translate(26 27) scale(.82)"
      >
        <circle cx="42" cy="24" r="13" />
        <circle cx="42" cy="24" r="5" />
        <path d="m42 38-27 52h54Z" />
        <path d="m42 49-13 31h26ZM31 66h22M42 38v52" />
        <path d="M42 90v31M36 116l6 9 6-9" />
      </g>
      <g
        className="home-dyk-motif-mark"
        transform="translate(164 144) scale(.98) rotate(7 42 67)"
      >
        <circle cx="42" cy="24" r="13" />
        <circle cx="42" cy="24" r="5" />
        <path d="m42 38-27 52h54Z" />
        <path d="m42 49-13 31h26ZM31 66h22M42 38v52" />
        <path d="M42 90v31M36 116l6 9 6-9" />
      </g>
      <g
        className="home-dyk-motif-mark"
        transform="translate(190 -38) scale(.5) rotate(12 42 67)"
      >
        <circle cx="42" cy="24" r="13" />
        <circle cx="42" cy="24" r="5" />
        <path d="m42 38-27 52h54Z" />
        <path d="m42 49-13 31h26ZM31 66h22M42 38v52" />
        <path d="M42 90v31M36 116l6 9 6-9" />
      </g>
    </pattern>
  );
}

function MukudjPattern({ id }: PatternProps) {
  return (
    <pattern
      id={id}
      width="280"
      height="280"
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(-9)"
      data-cultural-symbol="punu-mukudj"
    >
      {/* Punu mukudj: high coiffure, oval face and narrow curved eyes. */}
      <g
        className="home-dyk-motif-mark"
        transform="translate(28 24) scale(.78)"
      >
        <path d="M21 48c1-21 8-35 21-42 13 7 20 21 21 42" />
        <path d="M27 37c3-13 8-22 15-28 7 6 12 15 15 28M42 9v27" />
        <path d="M15 56c0-15 12-24 27-24s27 9 27 24v18c0 27-12 47-27 47S15 101 15 74Z" />
        <path d="M23 62c5-5 11-5 16 0-5 2-11 2-16 0ZM45 62c5-5 11-5 16 0-5 2-11 2-16 0Z" />
        <path d="M42 66v22l-6 5h12M31 104c7 4 15 4 22 0" />
        <path d="m42 42-5 6 5 6 5-6Z" />
      </g>
      <g
        className="home-dyk-motif-mark"
        transform="translate(166 142) scale(.92) rotate(7 42 64)"
      >
        <path d="M21 48c1-21 8-35 21-42 13 7 20 21 21 42" />
        <path d="M27 37c3-13 8-22 15-28 7 6 12 15 15 28M42 9v27" />
        <path d="M15 56c0-15 12-24 27-24s27 9 27 24v18c0 27-12 47-27 47S15 101 15 74Z" />
        <path d="M23 62c5-5 11-5 16 0-5 2-11 2-16 0ZM45 62c5-5 11-5 16 0-5 2-11 2-16 0Z" />
        <path d="M42 66v22l-6 5h12M31 104c7 4 15 4 22 0" />
        <path d="m42 42-5 6 5 6 5-6Z" />
      </g>
      <g
        className="home-dyk-motif-mark"
        transform="translate(194 -42) scale(.46) rotate(12 42 64)"
      >
        <path d="M21 48c1-21 8-35 21-42 13 7 20 21 21 42" />
        <path d="M27 37c3-13 8-22 15-28 7 6 12 15 15 28M42 9v27" />
        <path d="M15 56c0-15 12-24 27-24s27 9 27 24v18c0 27-12 47-27 47S15 101 15 74Z" />
        <path d="M23 62c5-5 11-5 16 0-5 2-11 2-16 0ZM45 62c5-5 11-5 16 0-5 2-11 2-16 0Z" />
        <path d="M42 66v22l-6 5h12M31 104c7 4 15 4 22 0" />
        <path d="m42 42-5 6 5 6 5-6Z" />
      </g>
    </pattern>
  );
}

/** A culturally specific but non-semantic background for the anecdote band. */
// @req REQ-115
export function DidYouKnowMotif({ motif }: DidYouKnowMotifProps) {
  const patternId = `home-dyk-motif-${motif}`;

  return (
    <div className="home-dyk-motif" data-motif={motif} aria-hidden="true">
      <svg focusable="false">
        <defs>
          {motif === "mande-kora" ? <KoraPattern id={patternId} /> : null}
          {motif === "amazigh-fibula" ? <FibulaPattern id={patternId} /> : null}
          {motif === "punu-mukudj" ? <MukudjPattern id={patternId} /> : null}
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}
