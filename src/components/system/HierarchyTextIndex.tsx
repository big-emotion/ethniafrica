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
    if (!node.children?.length) return null;
    return (
      <li>
        <span>peuples sans langue référencée ({node.peopleCount})</span>
        <ol>
          {node.children.map((child) => (
            <HierarchyNodeItem key={child.id} node={child} />
          ))}
        </ol>
      </li>
    );
  }

  return (
    <li>
      <a href={node.href}>{node.name}</a>
      {node.endonym ? (
        <>
          {" "}
          (<span lang={node.endonym.lang}>{node.endonym.label}</span>)
        </>
      ) : null}
      {" — "}
      <span>{peopleCountLabel(node.peopleCount)}</span>
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
    <ol aria-label="Classification">
      {nodes.map((node) => (
        <HierarchyNodeItem key={node.id} node={node} />
      ))}
    </ol>
  );
}

export default HierarchyTextIndex;
