"use client";

import * as React from "react";

import { ClassificationBadge } from "@/components/ui/classification-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ClassificationStatus } from "@/types/afrik";

export interface HierarchyNode {
  id: string;
  label: string;
  labelLang?: string;
  badge?: ClassificationStatus | null;
  href?: string;
  childCount?: number;
  children?: HierarchyNode[];
}

export interface HierarchyChildrenPage {
  nodes: HierarchyNode[];
  total?: number;
}

export interface HierarchyTreeProps {
  root: HierarchyNode;
  loadChildren?: (
    node: HierarchyNode,
    offset?: number
  ) => Promise<HierarchyNode[] | HierarchyChildrenPage>;
  defaultExpandedIds?: string[];
  onExpandedChange?: (ids: string[]) => void;
  labelledById: string;
}

interface FlatNode {
  node: HierarchyNode;
  level: number;
  setSize: number;
  posInSet: number;
  parentId: string | null;
}

function isBranchNode(node: HierarchyNode): boolean {
  return !node.href;
}

function resolveChildren(
  node: HierarchyNode,
  loaded: Map<string, HierarchyNode[]>
): HierarchyNode[] | undefined {
  return loaded.has(node.id) ? loaded.get(node.id) : node.children;
}

function isExpandable(
  node: HierarchyNode,
  loaded: Map<string, HierarchyNode[]>,
  hasLoader: boolean
): boolean {
  if (!isBranchNode(node)) return false;
  const children = resolveChildren(node, loaded);
  if (children) return children.length > 0;
  return hasLoader;
}

function flattenVisible(
  root: HierarchyNode,
  expanded: Set<string>,
  loaded: Map<string, HierarchyNode[]>
): FlatNode[] {
  const result: FlatNode[] = [];

  function walk(
    node: HierarchyNode,
    level: number,
    setSize: number,
    posInSet: number,
    parentId: string | null
  ) {
    result.push({ node, level, setSize, posInSet, parentId });
    if (isBranchNode(node) && expanded.has(node.id)) {
      const children = resolveChildren(node, loaded) ?? [];
      children.forEach((child, index) =>
        walk(child, level + 1, children.length, index + 1, node.id)
      );
    }
  }

  walk(root, 1, 1, 1, null);
  return result;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return reduced;
}

// @req REQ-044
export function HierarchyTree({
  root,
  loadChildren,
  defaultExpandedIds,
  onExpandedChange,
  labelledById,
}: HierarchyTreeProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
    () => new Set(defaultExpandedIds ?? [])
  );
  const [loadedChildren, setLoadedChildren] = React.useState<
    Map<string, HierarchyNode[]>
  >(() => new Map());
  const [childTotals, setChildTotals] = React.useState<Map<string, number>>(
    () => new Map()
  );
  const [loadingIds, setLoadingIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [errorIds, setErrorIds] = React.useState<Set<string>>(() => new Set());
  const [liveMessage, setLiveMessage] = React.useState("");
  const [activeId, setActiveId] = React.useState(root.id);
  const nodeRefs = React.useRef<Map<string, HTMLElement>>(new Map());

  const hasLoader = typeof loadChildren === "function";

  const visibleNodes = React.useMemo(
    () => flattenVisible(root, expandedIds, loadedChildren),
    [root, expandedIds, loadedChildren]
  );

  React.useEffect(() => {
    if (!hasLoader) return;
    visibleNodes.forEach(({ node }) => {
      if (!expandedIds.has(node.id)) return;
      if (resolveChildren(node, loadedChildren) !== undefined) return;
      if (loadingIds.has(node.id) || errorIds.has(node.id)) return;
      void loadChildrenFor(node);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    visibleNodes,
    expandedIds,
    loadedChildren,
    loadingIds,
    errorIds,
    hasLoader,
  ]);

  function updateExpanded(next: Set<string>) {
    setExpandedIds(next);
    onExpandedChange?.(Array.from(next));
  }

  function focusNode(id: string) {
    setActiveId(id);
    nodeRefs.current.get(id)?.focus();
  }

  async function loadChildrenFor(node: HierarchyNode, offset = 0) {
    if (!loadChildren) return;
    setLoadingIds((prev) => new Set(prev).add(node.id));
    setErrorIds((prev) => {
      const next = new Set(prev);
      next.delete(node.id);
      return next;
    });
    try {
      const result =
        offset === 0
          ? await loadChildren(node)
          : await loadChildren(node, offset);
      const page = Array.isArray(result) ? { nodes: result } : result;
      setLoadedChildren((prev) => {
        const next = new Map(prev);
        const existing = offset === 0 ? [] : (prev.get(node.id) ?? []);
        next.set(node.id, [...existing, ...page.nodes]);
        return next;
      });
      if (typeof page.total === "number") {
        setChildTotals((prev) => new Map(prev).set(node.id, page.total));
      }
      setLiveMessage(`branche chargée — ${page.nodes.length} peuples`);
    } catch {
      setErrorIds((prev) => new Set(prev).add(node.id));
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(node.id);
        return next;
      });
    }
  }

  function expandNode(node: HierarchyNode) {
    const next = new Set(expandedIds);
    next.add(node.id);
    updateExpanded(next);
  }

  function collapseNode(node: HierarchyNode) {
    const next = new Set(expandedIds);
    next.delete(node.id);
    updateExpanded(next);
  }

  function toggleNode(node: HierarchyNode) {
    if (expandedIds.has(node.id)) {
      collapseNode(node);
    } else {
      expandNode(node);
    }
  }

  function activateNode(node: HierarchyNode, element: HTMLElement) {
    if (isBranchNode(node)) {
      toggleNode(node);
      return;
    }
    if (element instanceof HTMLAnchorElement) {
      element.click();
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.getAttribute("role") !== "treeitem") return;

    const currentIndex = visibleNodes.findIndex(
      (entry) => entry.node.id === activeId
    );
    if (currentIndex === -1) return;
    const current = visibleNodes[currentIndex];

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        const next = visibleNodes[currentIndex + 1];
        if (next) focusNode(next.node.id);
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        const prev = visibleNodes[currentIndex - 1];
        if (prev) focusNode(prev.node.id);
        break;
      }
      case "ArrowRight": {
        event.preventDefault();
        if (!isBranchNode(current.node)) break;
        const expandable = isExpandable(
          current.node,
          loadedChildren,
          hasLoader
        );
        if (!expandable) break;
        if (!expandedIds.has(current.node.id)) {
          expandNode(current.node);
        } else {
          const next = visibleNodes[currentIndex + 1];
          if (next && next.parentId === current.node.id) {
            focusNode(next.node.id);
          }
        }
        break;
      }
      case "ArrowLeft": {
        event.preventDefault();
        if (isBranchNode(current.node) && expandedIds.has(current.node.id)) {
          collapseNode(current.node);
        } else if (current.parentId) {
          focusNode(current.parentId);
        }
        break;
      }
      case "Home": {
        event.preventDefault();
        const first = visibleNodes[0];
        if (first) focusNode(first.node.id);
        break;
      }
      case "End": {
        event.preventDefault();
        const last = visibleNodes[visibleNodes.length - 1];
        if (last) focusNode(last.node.id);
        break;
      }
      case "Enter":
      case " ": {
        event.preventDefault();
        activateNode(current.node, target);
        break;
      }
      default:
        break;
    }
  }

  function renderNode(entry: FlatNode): React.ReactNode {
    const { node, level } = entry;
    const isBranch = isBranchNode(node);
    const expandable = isExpandable(node, loadedChildren, hasLoader);
    const expanded = expandedIds.has(node.id);
    const loading = loadingIds.has(node.id);
    const errored = errorIds.has(node.id);
    const children = resolveChildren(node, loadedChildren);
    const remaining = Math.max(
      0,
      (childTotals.get(node.id) ?? 0) - (children?.length ?? 0)
    );
    const isActive = activeId === node.id;

    const commonProps = {
      ref: (element: HTMLElement | null) => {
        if (element) nodeRefs.current.set(node.id, element);
        else nodeRefs.current.delete(node.id);
      },
      role: "treeitem",
      "aria-level": level,
      "aria-setsize": entry.setSize,
      "aria-posinset": entry.posInSet,
      "aria-expanded": expandable ? expanded : undefined,
      "aria-busy": loading ? true : undefined,
      tabIndex: isActive ? 0 : -1,
      onFocus: () => setActiveId(node.id),
      onClick: (event: React.MouseEvent) => {
        setActiveId(node.id);
        if (isBranch) {
          event.preventDefault();
          toggleNode(node);
        }
      },
      className: cn(
        "flex min-h-[var(--afh-tree-node-min-h)] items-center gap-2 rounded-afh-sm px-2 py-1 font-afh text-afh-small text-afh-text no-underline",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-afh-gold focus-visible:ring-offset-2",
        "hover:bg-afh-bg-warm"
      ),
      style: {
        paddingInlineStart: `calc(var(--afh-tree-indent) * ${level - 1})`,
      },
    } as const;

    const labelContent = (
      <>
        <span lang={node.labelLang} className="truncate">
          {node.label}
        </span>
        {typeof node.childCount === "number" ? (
          <span className="text-afh-caption text-afh-text-soft">
            ({node.childCount})
          </span>
        ) : null}
        {node.badge ? <ClassificationBadge status={node.badge} /> : null}
      </>
    );

    const item = node.href ? (
      <a {...commonProps} href={node.href}>
        {labelContent}
      </a>
    ) : (
      <div {...commonProps}>{labelContent}</div>
    );

    return (
      <div role="none" key={node.id}>
        {item}
        {isBranch && expandable && expanded ? (
          <div
            role="group"
            data-testid={`hierarchy-tree-group-${node.id}`}
            data-motion={reducedMotion ? "instant" : "fade"}
            style={{
              minHeight: loading ? "var(--afh-tree-node-min-h)" : undefined,
              transition: reducedMotion
                ? "none"
                : "opacity var(--afh-duration-base, 200ms) var(--afh-ease-in-out, ease-in-out)",
              opacity: 1,
            }}
          >
            {loading ? (
              <Skeleton className="min-h-[var(--afh-tree-node-min-h)] w-full" />
            ) : errored ? (
              <div className="flex items-center gap-2 py-1 text-afh-small text-afh-text-soft">
                <span>Le chargement de cette branche a échoué.</span>
                <button
                  type="button"
                  onClick={() => void loadChildrenFor(node)}
                  className="font-semibold text-afh-terracotta underline underline-offset-2"
                >
                  réessayer
                </button>
              </div>
            ) : (
              <>
                {(children ?? []).map((child, index) =>
                  renderNode({
                    node: child,
                    level: level + 1,
                    setSize: (children ?? []).length,
                    posInSet: index + 1,
                    parentId: node.id,
                  })
                )}
                {remaining > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      void loadChildrenFor(node, children?.length ?? 0)
                    }
                    className="font-semibold text-afh-terracotta underline underline-offset-2"
                  >
                    charger la suite ({remaining} restants)
                  </button>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div role="tree" aria-labelledby={labelledById} onKeyDown={handleKeyDown}>
      {renderNode({
        node: root,
        level: 1,
        setSize: 1,
        posInSet: 1,
        parentId: null,
      })}
      <p role="status" aria-live="polite" className="sr-only">
        {liveMessage}
      </p>
    </div>
  );
}

export default HierarchyTree;
