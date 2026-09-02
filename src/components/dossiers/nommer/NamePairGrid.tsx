import type { NamePair } from "@/lib/dossiers/nommer/types";

interface NamePairGridProps {
  pairs: NamePair[];
}

/**
 * Autonym above exonym, with the vector between them.
 *
 * The autonym leads and the exonym glosses it — brand charter §3, and the
 * reason the atlas is readable as a decolonial surface at all. Reversing the
 * order here would undo on one page what every fiche does on every other.
 *
 * `pejorative` is a separate flag from `imposedBy` on purpose. The corpus
 * records exonyms that no source calls hostile — `noms/PPL_HERERO.json` takes
 * care to write that the violence that people suffered "porte sur d'autres
 * registres que la dénomination" — and a grid that dressed every exonym in the
 * same red would lose the right to be believed about the ones that are.
 *
 * The imposed marker is the one place in this dossier where a colour other
 * than the page accent appears. It is a sign, not a rotation of the palette:
 * atlas charter §2 reserves terre for exactly this.
 */
// @req REQ-113
export const NamePairGrid = ({ pairs }: NamePairGridProps) => (
  <ul className="grid list-none grid-cols-1 gap-afh-lg p-0 sm:grid-cols-2">
    {pairs.map((pair) => (
      <li
        key={`${pair.endonym}-${pair.exonym}`}
        className="flex flex-col gap-afh-xs text-left"
      >
        <p className="font-afh-display text-afh-body font-semibold text-afh-text">
          {pair.endonym}
          {pair.endonymGloss ? (
            <span className="font-normal text-afh-text-soft">
              {" "}
              — {pair.endonymGloss}
            </span>
          ) : null}
        </p>
        <p className="text-afh-caption uppercase tracking-wide text-afh-text-soft">
          {pair.imposedBy}
        </p>
        <p
          className={
            pair.pejorative
              ? "text-afh-body italic text-[color:var(--afh-cat-terre-ink)]"
              : "text-afh-body italic text-afh-text-soft"
          }
        >
          {pair.exonym}
          {pair.pejorative ? (
            <span className="not-italic"> · exonyme dépréciatif attesté</span>
          ) : null}
        </p>
      </li>
    ))}
  </ul>
);
