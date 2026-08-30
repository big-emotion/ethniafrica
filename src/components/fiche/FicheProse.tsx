import type { ReactNode } from "react";

import {
  parseFicheProse,
  type ProseBlock,
  type ProseInline,
} from "@/lib/prose/ficheProse";

/**
 * The reader for the corpus's prose grammar, shared by the three fiches.
 *
 * It lives in `fiche/` rather than under one entity because the people, the
 * family and the country all write in the same grammar, and it is deliberately
 * a server component: a family fiche should not ship JavaScript to display a
 * paragraph. `ProseWithChip` is a client component and imports it anyway, which
 * is legal — the module simply joins the client bundle at that one seam.
 *
 * There is no `dangerouslySetInnerHTML` here and there must never be one.
 * Rendering the corpus as markup would turn a fiche into an injection vector.
 */

/** What a defect says to a reader who has no way to know it is a defect. */
const DEFECT_NOTICE =
  "Ce champ n'est pas lisible : la fiche l'a enregistré sous une forme que l'affichage ne sait pas rendre.";

function renderInline(inline: ProseInline[]): ReactNode[] {
  return inline.map((run, index) => {
    const key = `${run.kind}-${index}`;
    if (run.kind === "strong") return <strong key={key}>{run.value}</strong>;
    if (run.kind === "em") return <em key={key}>{run.value}</em>;
    return <span key={key}>{run.value}</span>;
  });
}

/**
 * A block with no markup collapses to its bare string rather than to a span, so
 * the common case renders one paragraph holding one text node. Every existing
 * assertion that matches a field by its exact text depends on that.
 */
function renderChildren(inline: ProseInline[]): ReactNode {
  if (inline.length === 1 && inline[0].kind === "text") return inline[0].value;
  return renderInline(inline);
}

export interface FicheProseProps {
  text: string;
  /** Carried by every paragraph and list item, so a surface keeps its dress. */
  paragraphClassName?: string;
  /** Placed at the end of the last paragraph — the field's confidence chip. */
  trailing?: ReactNode;
}

// @req REQ-122
export function FicheProse({
  text,
  paragraphClassName,
  trailing,
}: FicheProseProps) {
  const { blocks, defect } = parseFicheProse(text);

  if (defect === "serialised-json") {
    return (
      <p className="afh-prose-defect" data-prose-defect="serialised-json">
        {DEFECT_NOTICE}
      </p>
    );
  }
  if (blocks.length === 0) return null;

  const lastParagraph = blocks.reduce(
    (found, block, index) => (block.kind === "paragraph" ? index : found),
    -1
  );

  return (
    <>
      {blocks.map((block: ProseBlock, index) => {
        const key = `${block.kind}-${index}`;

        if (block.kind === "heading") {
          return (
            <h3 key={key} className="afh-prose-heading">
              {renderChildren(block.inline)}
            </h3>
          );
        }

        if (block.kind === "list") {
          return (
            <ul key={key} className="afh-prose-list">
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`} className={paragraphClassName}>
                  {renderChildren(item)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={key} className={paragraphClassName}>
            {renderChildren(block.inline)}
            {trailing && index === lastParagraph ? <> {trailing}</> : null}
          </p>
        );
      })}
      {/* A field whose last block is a list would otherwise leave the chip
          hanging under a bullet, reading as one more item. */}
      {trailing && lastParagraph === -1 ? (
        <p className={paragraphClassName}>{trailing}</p>
      ) : null}
    </>
  );
}

export interface FicheField {
  label: string;
  /** Prose in the corpus grammar. */
  prose?: string | null;
  /** Already-built content — tags, routes, links — for a field that is not prose. */
  node?: ReactNode;
  trailing?: ReactNode;
  /** BCP-47 tag for a value in a language other than the page's. */
  lang?: string;
}

export interface FicheFieldListProps {
  fields: readonly FicheField[];
  className?: string;
  /** Carried by the paragraphs inside each definition. */
  paragraphClassName?: string;
}

/**
 * A chapter's labelled fields, as terms and definitions.
 *
 * The label used to be a `<p><strong>Typologie :</strong> …</p>`, which cost
 * twice. A screen reader read the label and its value as one sentence; and
 * three visual levels — chapter, field, sub-heading — had to share the single
 * heading level the type charter leaves under an `h2`. A `<dt>` sits outside
 * the document outline, so the plan stays `h2 → h3` and the corpus keeps the
 * one heading level there is.
 */
// @req REQ-122
export function FicheFieldList({
  fields,
  className,
  paragraphClassName,
}: FicheFieldListProps) {
  const filled = fields.filter(
    (field) => (field.prose && field.prose.trim() !== "") || field.node
  );
  if (filled.length === 0) return null;

  return (
    <dl
      className={
        className ? `afh-prose-fields ${className}` : "afh-prose-fields"
      }
    >
      {filled.map((field) => (
        <div key={field.label}>
          <dt className="afh-prose-term">{field.label}</dt>
          <dd className="afh-prose-def" lang={field.lang}>
            {field.node ?? (
              <FicheProse
                text={field.prose as string}
                paragraphClassName={paragraphClassName}
                trailing={field.trailing}
              />
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
