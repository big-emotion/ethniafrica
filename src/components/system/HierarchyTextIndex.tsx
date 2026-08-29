import { ClassificationBadge } from "@/components/ui/classification-badge";
import type { HierarchyNode } from "@/components/system/hierarchy-types";

export interface HierarchyTextIndexProps {
  nodes: HierarchyNode[];
}

function peopleCountLabel(count: number): string {
  return count === 1 ? "1 peuple" : `${count} peuples`;
}

function HierarchyNodeItem({ node }: { node: HierarchyNode }) {
  if (node.type === "unlinked-group") {
    // The group is worth stating on its count alone: the family fiche knows
    // how many peoples reference no language long before it has fetched which
    // ones, and hiding it until then loses them on a view switch.
    if (!node.children?.length && node.peopleCount === 0) return null;
    return (
      <li>
        <span>peuples sans langue référencée ({node.peopleCount})</span>
        {node.children?.length ? (
          <ol>
            {node.children.map((child) => (
              <HierarchyNodeItem key={child.id} node={child} />
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
        {peopleCountLabel(node.peopleCount)}
      </span>
      <ClassificationBadge status={node.classificationStatus} />
      {node.children?.length ? (
        <ol>
          {node.children.map((child) => (
            <HierarchyNodeItem key={child.id} node={child} />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

// @req REQ-047
export function HierarchyTextIndex({ nodes }: HierarchyTextIndexProps) {
  return (
    <ol aria-label="Classification" className="afh-text-index">
      {nodes.map((node) => (
        <HierarchyNodeItem key={node.id} node={node} />
      ))}
    </ol>
  );
}

export default HierarchyTextIndex;
