import type { ReactNode } from "react";

export interface FicheSectionProps {
  title: string;
  /**
   * Where the section's claim comes from, in the reader's own terms.
   *
   * Optional because not every section rests on one nameable field. When it
   * does, saying so is what lets a reader check the claim — the charter's
   * "declared, derived, or missing" rule applied to a whole chapter.
   */
  note?: string;
  children: ReactNode;
  as?: "section" | "footer";
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
  return (
    <Tag
      className="afh-parchment-section"
      data-fiche-section={title}
      data-testid={testId}
      id={id}
    >
      <h2>{title}</h2>
      {note ? <p className="afh-parchment-note">{note}</p> : null}
      {children}
    </Tag>
  );
}

export default FicheSection;
