"use client";

import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { HierarchyTextIndex } from "@/components/system/HierarchyTextIndex";
import type { HierarchyNode as TextIndexNode } from "@/components/system/hierarchy-types";
import type {
  HierarchyChildrenPage,
  HierarchyNode as TreeNode,
} from "@/components/system/HierarchyTree";
import type { FamilyBranchProvenance } from "@/api/v2/services/languageFamilyTreeService";
import type { ClassificationStatus } from "@/types/afrik";
import { getPeopleRoute } from "@/lib/routing";

export interface FamilyClassificationTreeSectionProps {
  familyId: string;
  tree: {
    family: {
      id: string;
      nameFr: string;
      classificationStatus?: ClassificationStatus | null;
    };
    branches: { iso639_3: string; name: string; peopleCount: number }[];
    /** Whether `branches` came from the language corpus or were rebuilt from the people fiches. */
    branchProvenance?: FamilyBranchProvenance;
    /** Branch names the fiche states itself; nothing ties a people to one, so they stay out of the tree. */
    declaredBranches?: string[];
    unlinkedPeopleCount: number;
  };
}

const PROVENANCE_NOTE: Record<FamilyBranchProvenance, string> = {
  "language-corpus": "Branches déclarées par le corpus des langues.",
  "people-fiches":
    "Branches reconstituées d'après les fiches peuple : le corpus des langues ne les renseigne pas.",
};

interface BranchResponse {
  data: {
    id: string;
    nameMain: string;
    classificationStatus: ClassificationStatus | null;
  }[];
  meta?: { pagination?: { total?: number } };
}

const PAGE_SIZE = 20;
const VIEW_CHANGE_EVENT = "family-classification-view-change";

function subscribeToViewChange(onStoreChange: () => void) {
  window.addEventListener(VIEW_CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(VIEW_CHANGE_EVENT, onStoreChange);
}

function getStoredView(): "tree" | "list" {
  return window.sessionStorage.getItem("family-classification-view") === "list"
    ? "list"
    : "tree";
}

function getServerView(): "tree" {
  return "tree";
}

function subscribeToHydration() {
  return () => {};
}

function getClientHydrationState() {
  return true;
}

function getServerHydrationState() {
  return false;
}

const HierarchyTree = dynamic(
  () =>
    import("@/components/system/HierarchyTree").then(
      (module) => module.HierarchyTree
    ),
  { ssr: true }
);

function toTreeRoot(
  tree: FamilyClassificationTreeSectionProps["tree"]
): TreeNode {
  const branches: TreeNode[] = tree.branches.map((branch) => ({
    id: branch.iso639_3,
    label: branch.name,
    childCount: branch.peopleCount,
  }));

  if (tree.unlinkedPeopleCount > 0) {
    // The count belongs to `childCount`, which every node renders; spelling it
    // into the label too printed it twice on the one node that had it.
    branches.push({
      id: "unlinked",
      label: "peuples sans langue référencée",
      childCount: tree.unlinkedPeopleCount,
    });
  }

  return { id: tree.family.id, label: tree.family.nameFr, children: branches };
}

function toTextIndexNodes(
  tree: FamilyClassificationTreeSectionProps["tree"]
): TextIndexNode[] {
  const nodes: TextIndexNode[] = tree.branches.map((branch) => ({
    id: branch.iso639_3,
    type: "language",
    name: branch.name,
    peopleCount: branch.peopleCount,
  }));

  if (tree.unlinkedPeopleCount > 0) {
    nodes.push({
      id: "unlinked",
      type: "unlinked-group",
      name: "peuples sans langue référencée",
      peopleCount: tree.unlinkedPeopleCount,
    });
  }

  return nodes;
}

// @req REQ-047
export function FamilyClassificationTreeSection({
  familyId,
  tree,
}: FamilyClassificationTreeSectionProps) {
  const queryClient = useQueryClient();
  const sectionRef = useRef<HTMLElement>(null);
  const view = useSyncExternalStore(
    subscribeToViewChange,
    getStoredView,
    getServerView
  );
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationState,
    getServerHydrationState
  );
  const root = useMemo(() => toTreeRoot(tree), [tree]);
  const textIndexNodes = useMemo(() => toTextIndexNodes(tree), [tree]);
  const requestedBranch =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("branche");

  useEffect(() => {
    if (requestedBranch) sectionRef.current?.scrollIntoView({ block: "start" });
  }, [requestedBranch]);

  async function loadChildren(
    node: TreeNode,
    offset = 0
  ): Promise<HierarchyChildrenPage> {
    const selector =
      node.id === "unlinked" ? "group=unlinked" : `language=${node.id}`;
    return queryClient.fetchQuery({
      queryKey: ["family-tree-branch", familyId, node.id, offset],
      queryFn: async () => {
        const response = await fetch(
          `/api/v2/language-families/${familyId}/tree/branch?${selector}&limit=${PAGE_SIZE}&offset=${offset}`
        );
        if (!response.ok) throw new Error("Unable to load family tree branch");
        const payload = (await response.json()) as BranchResponse;
        return {
          nodes: payload.data.map((person) => ({
            id: person.id,
            label: person.nameMain,
            badge: person.classificationStatus,
            href: getPeopleRoute("fr", person.id),
          })),
          total: payload.meta?.pagination?.total,
        };
      },
    });
  }

  function changeView(nextView: "tree" | "list") {
    window.sessionStorage.setItem("family-classification-view", nextView);
    window.dispatchEvent(new Event(VIEW_CHANGE_EVENT));
    window.requestAnimationFrame(() => {
      document.getElementById(`family-classification-${nextView}`)?.focus();
    });
  }

  function handleExpandedChange(ids: string[]) {
    const branch = ids.find((id) => id !== tree.family.id);
    const url = new URL(window.location.href);
    if (branch) url.searchParams.set("branche", branch);
    else url.searchParams.delete("branche");
    window.history.replaceState(window.history.state, "", url);
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="family-classification-tree-heading"
    >
      <h2 id="family-classification-tree-heading">Classification</h2>
      <div className="afh-classification-toolbar">
        <div className="afh-view-switch" role="group" aria-label="Affichage">
          <button
            type="button"
            aria-pressed={view === "tree"}
            onClick={() => changeView("tree")}
          >
            Arbre
          </button>
          <button
            type="button"
            aria-pressed={view === "list"}
            onClick={() => changeView("list")}
          >
            Liste
          </button>
        </div>
        <p className="afh-classification-provenance">
          {PROVENANCE_NOTE[tree.branchProvenance ?? "people-fiches"]}
        </p>
      </div>
      {tree.declaredBranches?.length ? (
        <ul
          className="afh-declared-branches"
          aria-label="Branches nommées par la fiche"
        >
          {tree.declaredBranches.map((branch) => (
            <li key={branch}>{branch}</li>
          ))}
        </ul>
      ) : null}
      <div
        id="family-classification-list"
        tabIndex={-1}
        hidden={hydrated && view !== "list"}
      >
        <HierarchyTextIndex nodes={textIndexNodes} />
      </div>
      <div
        id="family-classification-tree"
        tabIndex={-1}
        hidden={hydrated && view !== "tree"}
      >
        <HierarchyTree
          root={root}
          loadChildren={loadChildren}
          defaultExpandedIds={[
            tree.family.id,
            ...(requestedBranch ? [requestedBranch] : []),
          ]}
          onExpandedChange={handleExpandedChange}
          labelledById="family-classification-tree-heading"
        />
      </div>
    </section>
  );
}
