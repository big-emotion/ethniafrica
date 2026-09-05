import Image from "next/image";

import { DossierReadings } from "@/components/dossiers/DossierReadings";
import type {
  DossierChapter,
  DossierIllustration,
} from "@/lib/afrik/parsers/dossierTypes";

/**
 * One chapter: a document, an argument, and the two readings of it.
 *
 * The alternation is index-driven and CSS-only, the way PurposeBlocks does it
 * on the home and the About page — the class is set here, the reordering
 * happens at 720 px in dossier.css. Below that width the figure always leads,
 * so a phone reader meets the document before the argument about it.
 */

/**
 * Brand charter §9: a licence is published, not named.
 *
 * Naming "CC BY-SA 4.0" satisfies nothing — §4(a) of that licence asks for the
 * licence's URI or a copy of it, and a notice a reader cannot reach is not a
 * notice. The parser refuses an attributed licence with no author or no
 * address, so by the time a chapter renders, both are present or the licence
 * required neither.
 */
function IllustrationCredit({
  illustration,
}: {
  illustration: DossierIllustration;
}) {
  return (
    <figcaption>
      {illustration.caption}
      {illustration.author ? ` — ${illustration.author}` : ""}
      {". "}
      {illustration.licenceUrl ? (
        <a
          href={illustration.licenceUrl}
          rel="license noreferrer"
          target="_blank"
        >
          {illustration.licence}
        </a>
      ) : (
        illustration.licence
      )}
      {illustration.filePage ? (
        <>
          {" · "}
          <a href={illustration.filePage} rel="noreferrer" target="_blank">
            Fichier d’origine
          </a>
        </>
      ) : null}
    </figcaption>
  );
}

export interface DossierChapterBlockProps {
  chapter: DossierChapter;
  index: number;
}

// @req REQ-114
export function DossierChapterBlock({
  chapter,
  index,
}: DossierChapterBlockProps) {
  const reversed = index % 2 === 1;

  return (
    <article
      className={`afh-dossier-chapter ${reversed ? "is-reversed" : ""}`}
      data-testid={`dossier-chapter-${chapter.chapterKey}`}
      id={chapter.chapterKey}
    >
      <div className="afh-dossier-chapter-head">
        {chapter.illustration ? (
          <figure className="afh-dossier-fig">
            <Image
              alt={chapter.illustration.alt}
              height={600}
              sizes="(min-width: 720px) 46vw, 92vw"
              src={chapter.illustration.src}
              width={900}
            />
            <IllustrationCredit illustration={chapter.illustration} />
          </figure>
        ) : null}

        <div className="afh-dossier-chapter-body">
          <p className="afh-dossier-chapter-kicker">
            <span aria-hidden="true" className="afh-dossier-chapter-dot" />
            {`Chapitre ${String(chapter.ordinal).padStart(2, "0")}`}
          </p>
          <h2>{chapter.title}</h2>
          <p className="afh-dossier-standfirst">{chapter.standfirst}</p>
        </div>
      </div>

      <div className="afh-dossier-prose">
        {chapter.body.map((block, blockIndex) => (
          <p key={blockIndex}>{block.text}</p>
        ))}
      </div>

      {chapter.figures.length > 0 ? (
        <ul className="afh-dossier-figures">
          {chapter.figures.map((figure) => (
            <li className="afh-dossier-figure" key={figure.figureKey}>
              <span className="afh-dossier-figure-value">{figure.value}</span>
              <span className="afh-dossier-figure-label">{figure.label}</span>
              {/* The year is never optional. A share of world production with
                  no reference year is a number a reader cannot check, and this
                  surface's entire argument is that they can. */}
              <span className="afh-dossier-figure-note">
                {figure.note
                  ? `${figure.note} · ${figure.year}`
                  : `${figure.year}`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <DossierReadings
        chapterKey={chapter.chapterKey}
        readings={chapter.readings}
      />
    </article>
  );
}
