import type { ReactNode } from "react";

import { chapterAnchorId } from "@/lib/ficheChapters";

/**
 * The one wording for the tier scale, shared by the three fiches so they
 * cannot drift into three vocabularies for one policy. It replaces
 * "Rubrique « sources » de la fiche · politique de paliers", whose first half
 * named the section of the fiche model the sources were read from — an
 * annotation for whoever builds the fiche, under a heading that already reads
 * "Sources". The second half named a policy without saying what it was.
 *
 * It does not spell the three labels out. Each source row already carries its
 * own, and a note repeating them would make "Officielle" ambiguous on the page
 * — the badge and the sentence about badges would answer the same query.
 *
 * @req REQ-119
 */
export const SOURCE_TIER_NOTE =
  "Chaque source porte son palier — l'autorité qu'on peut lui accorder.";

export interface FicheSectionProps {
  title: string;
  /**
   * What the chapter's content rests on, when that is something the title
   * does not already say: a reference year, a derivation, the tier scale.
   *
   * Not a place to name the section of the fiche model the values were read
   * from. That names the machinery, and every chapter carried one — the
   * reader who opened "Royaumes et formations politiques" learnt only that it
   * came from the "royaumes" rubric.
   */
  note?: string;
  children: ReactNode;
  as?: "section" | "footer";
  /**
   * The chapter's anchor. Defaults to one derived from the title.
   *
   * Pass one only where the app already publishes a different anchor for the
   * chapter — `#sources` is the case: citation chips across the app link to
   * it, and deriving a new anchor here would leave every one of them
   * pointing at nothing.
   */
  id?: string;
  testId?: string;
}

/**
 * One chapter of a fiche, on the parchment.
 *
 * The country and family fiches each carried a byte-identical copy of this;
 * the people fiche carried a third shape — boxed cards with an icon tile —
 * which is the "dashboard of unrelated widgets" the parchment stylesheet was
 * written to replace. One component now, so a chapter reads the same whatever
 * entity it belongs to.
 *
 * `data-fiche-section` carries the title because the parity contract reads a
 * fiche's chapter order off it (peopleFicheCharter.test.tsx).
 */
// @req REQ-091
export function FicheSection({
  title,
  note,
  children,
  as: Tag = "section",
  id,
  testId,
}: FicheSectionProps) {
  const anchor = id ?? chapterAnchorId(title);
  const headingId = `${anchor}-titre`;

  return (
    <Tag
      className="afh-parchment-section"
      data-fiche-section={title}
      data-testid={testId}
      id={anchor}
      aria-labelledby={headingId}
    >
      <h2 id={headingId}>{title}</h2>
      {note ? <p className="afh-parchment-note">{note}</p> : null}
      {children}
    </Tag>
  );
}
