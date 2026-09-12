import { FicheTile } from "@/components/fiche/FicheTile";
import { SourceVerifyBadge } from "@/components/ui/source-verify-badge";
import {
  readerFacingNote,
  type FicheSourceEntry,
} from "@/lib/afrik/ficheSourceLabel";
import { sourceStandingLabel } from "@/lib/glossaire/vocabularies";
import { countryCopy } from "@/lib/i18n/copy/country";
import { ficheCopy } from "@/lib/i18n/copy/fiche";
import { FALLBACK_LOCALE } from "@/lib/locale";
import type { Language } from "@/types/shared";

interface FicheSourcesProps {
  sources: FicheSourceEntry[];
  /** Story 0.20 (FR31): show a "source à vérifier" badge when truthy. */
  hasSourceFlag?: boolean;
  language?: Language;
}

type Standing = FicheSourceEntry["standing"];

const TIERS: readonly Standing[] = ["official", "referenced", "unverified"];

/** How many titles the folded list shows before it counts the rest. */
const PREVIEW_TITLES = 3;

function share(count: number, total: number): string {
  return `${Math.round((count / total) * 1000) / 10}%`;
}

/**
 * The bibliography every record ends on: a census of the sources by
 * standing, then the list itself folded into a tile.
 *
 * A source's standing is shown per entry, never as one verdict over the
 * list: a record rests on sources of different strengths, and joining them
 * into a single line was what made the strongest and the weakest read alike.
 * The census does not undo that — it counts each standing separately, so the
 * shape of the whole is visible without reading every entry.
 */
// @req REQ-092
export function FicheSources({
  sources,
  hasSourceFlag,
  language = FALLBACK_LOCALE,
}: FicheSourcesProps) {
  if (!sources || sources.length === 0) return null;

  /**
   * Numbered only when a note callout has something to point at. Country and
   * family declare sources and cite none of them from their prose, so their
   * bibliography stays an unordered list — numbering one that nothing links to
   * would promise an anchor that does not exist.
   */
  const numbered = sources.some((source) => Boolean(source.number));
  const ListTag = numbered ? "ol" : "ul";

  // Insertion order, so the strongest standing the page actually rests on
  // leads. Anything outside the three tiers counts as awaiting review, the
  // same reading `sourceStandingLabel` gives it.
  const byStanding = new Map<Standing, number>();
  for (const source of sources) {
    const standing = TIERS.includes(source.standing)
      ? source.standing
      : "needs_review";
    byStanding.set(standing, (byStanding.get(standing) ?? 0) + 1);
  }
  const tally = countryCopy[language].sourcesTally;
  const census = [
    tally.total(sources.length),
    ...Array.from(byStanding, ([standing, count]) =>
      tally.standing(sourceStandingLabel(standing, language), count)
    ),
  ].join(" · ");

  const unlisted = sources.length - PREVIEW_TITLES;
  const preview = [
    ...sources.slice(0, PREVIEW_TITLES).map((source) => source.label),
    `+${unlisted}`,
  ].join(" · ");

  const list = (
    <ListTag className="afh-fiche-source-list">
      {sources.map((source, index) => {
        const note = readerFacingNote(source.notes);
        return (
          <li
            key={source.sourceId ?? `${source.label}-${index}`}
            id={source.number ? `source-${source.number}` : undefined}
            className="flex items-baseline gap-2 flex-wrap"
          >
            {/* The number a note callout printed, not the list's own
                counter: a callout says [4] and must land on the entry that
                says 4. */}
            {source.number && (
              <span className="shrink-0 tabular-nums text-afh-eyebrow">
                {source.number}.
              </span>
            )}
            <span
              data-source-standing={source.standing}
              className="afh-fiche-source-standing"
            >
              {sourceStandingLabel(source.standing, language)}
            </span>
            {source.url ? (
              <a
                href={source.url}
                rel="noreferrer noopener"
                target="_blank"
                // A citation is a row in the source list, not a word inside
                // a sentence, so it owes the 44px target rather than the
                // height of the line it happens to occupy.
                className="inline-flex min-h-11 items-center underline underline-offset-2"
              >
                {source.label}
              </a>
            ) : (
              <span>{source.label}</span>
            )}
            {/* Why the source carries the standing shown beside it, less
                whatever the pipeline wrote there about itself. */}
            {note && (
              <span data-source-note="" className="afh-fiche-source-note">
                {note}
              </span>
            )}
          </li>
        );
      })}
    </ListTag>
  );

  return (
    <div className="afh-fiche-sources">
      {hasSourceFlag && (
        <p className="m-0">
          <SourceVerifyBadge language={language} />
        </p>
      )}
      <div className="afh-census" role="img" aria-label={census}>
        {Array.from(byStanding, ([standing, count]) => (
          <span
            key={standing}
            data-census-standing={standing}
            style={{ width: share(count, sources.length) }}
          />
        ))}
      </div>
      <p data-testid="sources-tally" className="afh-census-legend">
        {census}
      </p>
      {unlisted > 0 ? (
        <FicheTile
          title={ficheCopy[language].sourcesList}
          closedFact={preview}
          language={language}
        >
          {list}
        </FicheTile>
      ) : (
        list
      )}
    </div>
  );
}
