import { cn } from "@/lib/utils";

export interface SectionHeadingProps {
  /**
   * What kind of section this is — « Le jeu du mois », « Saviez-vous que ».
   * Optional: a section whose title already files it takes none rather
   * than a filler line.
   */
  eyebrow?: string;
  title: string;
  centred?: boolean;
  /** Put on the <h2>, so a test can assert the level it actually renders. */
  testId?: string;
  className?: string;
}

/**
 * The heading unit every section of the home uses (REQ-113).
 *
 * The page used to carry two hand-set spellings of this — SynthesisRail and
 * DidYouKnow each declared their own eyebrow and h2 rules — and three
 * sections with no heading at all: the module slot, the name-origin slices
 * and the three axes. A reader landing mid-scroll met an image, a card or a
 * globe with nothing above it saying what they were looking at.
 *
 * The eyebrow is a paragraph, never a heading. Marked up as one it would
 * push every item in the section to h4 and announce two titles for one
 * section to a screen reader.
 *
 * The dress lives in src/styles/section-heading.css rather than in a
 * <style> block here: this component renders five times on the home, and
 * five identical copies of the same rules is exactly the duplication the
 * unit exists to remove.
 */
// @req REQ-113
export function SectionHeading({
  eyebrow,
  title,
  centred = false,
  testId,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn("afh-section-heading", centred && "is-centred", className)}
    >
      {eyebrow ? (
        <p className="afh-section-heading-eyebrow">{eyebrow}</p>
      ) : null}
      <h2 className="afh-section-heading-title" data-testid={testId}>
        {title}
      </h2>
    </div>
  );
}
