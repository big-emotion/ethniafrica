import { ClassificationBadge } from "@/components/ui/classification-badge";
import type { HierarchyNode } from "@/components/system/hierarchy-types";
import { FALLBACK_LOCALE } from "@/lib/locale";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";

export interface HierarchyTextIndexProps {
  language?: Language;
  nodes: HierarchyNode[];
}

function peopleCountLabel(count: number, language: Language): string {
  const copy = getTranslation(language).system;
  return count === 1 ? copy.peopleOne : `${count} ${copy.peopleMany}`;
}

function HierarchyNodeItem({
  node,
  language,
}: {
  node: HierarchyNode;
  language: Language;
}) {
  const copy = getTranslation(language).system;
  if (node.type === "unlinked-group") {
    // The group is worth stating on its count alone: the family fiche knows
    // how many peoples reference no language long before it has fetched which
    // ones, and hiding it until then loses them on a view switch.
    if (!node.children?.length && node.peopleCount === 0) return null;
    return (
      <li>
        <span>
          {copy.unlinkedPeople} ({node.peopleCount})
        </span>
        {node.children?.length ? (
          <ol>
            {node.children.map((child) => (
              <HierarchyNodeItem
                key={child.id}
                node={child}
                language={language}
              />
            ))}
          </ol>
        ) : null}
      </li>
    );
  }

  return (
    <li>
      {/* A branch rebuilt from ISO codes has no fiche to point at, and an
          underlined anchor with nowhere to go reads as a broken link. */}
      {node.href ? (
        <a href={node.href}>{node.name}</a>
      ) : (
        <span>{node.name}</span>
      )}
      {node.endonym ? (
        <>
          {" "}
          (<span lang={node.endonym.lang}>{node.endonym.label}</span>)
        </>
      ) : null}
      {" — "}
      <span className="afh-text-index-count">
        {peopleCountLabel(node.peopleCount, language)}
      </span>
      <ClassificationBadge status={node.classificationStatus} />
      {node.children?.length ? (
        <ol>
          {node.children.map((child) => (
            <HierarchyNodeItem
              key={child.id}
              node={child}
              language={language}
            />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

// @req REQ-047
export function HierarchyTextIndex({
  language = FALLBACK_LOCALE,
  nodes,
}: HierarchyTextIndexProps) {
  const copy = getTranslation(language).system;
  return (
    <ol aria-label={copy.classification} className="afh-text-index">
      {nodes.map((node) => (
        <HierarchyNodeItem key={node.id} node={node} language={language} />
      ))}
    </ol>
  );
}
