"use client";

import * as React from "react";

import { FichePanel } from "@/components/fiche/FichePanel";
import { HierarchyTextIndex } from "@/components/system/HierarchyTextIndex";
import { HierarchyTree } from "@/components/system/HierarchyTree";
import type {
  HierarchyChildrenPage,
  HierarchyNode as TreeNode,
} from "@/components/system/HierarchyTree";
import type { HierarchyNode as TextIndexNode } from "@/components/system/hierarchy-types";
import type {
  FichePanelSide,
  FichePanelSize,
  FichePanelSourceLine,
} from "@/types/fiche";
import type { ClassificationStatus } from "@/types/afrik";
import { getPeopleRoute } from "@/lib/routing";

/**
 * Depth bound for the branch slice this panel shows: family root (0) →
 * language branch (1) → person leaf (2). Every person fetched via
 * `toPersonNode` carries an `href`, which makes it a leaf under
 * HierarchyTree's `isBranchNode` — so the tree can never grow past this
 * depth from within the panel, regardless of what the API returns.
 */
const TONGUE_PANEL_MAX_DEPTH = 2;
const BRANCH_PAGE_SIZE = 20;

export interface TonguePanelBranch {
  /** ISO 639-3 code, or the "unlinked" sentinel used by the tree/branch endpoint. */
  id: string;
  name: string;
  peopleCount: number;
}

export interface TonguePanelProps {
  languageFamilyId: string;
  familyName: string;
  branches: TonguePanelBranch[];
  size: FichePanelSize;
  side: FichePanelSide;
  sourceLine: FichePanelSourceLine;
  stepLabel: string;
  heading: string;
  body: string;
  note?: string;
  /** Accessible name for the tree region (FR — caller supplies localized copy). */
  treeLabel: string;
  /** Heading preceding the text-first equivalent. */
  textIndexLabel: string;
}

interface BranchApiResponse {
  data: {
    id: string;
    nameMain: string;
    classificationStatus: ClassificationStatus | null;
  }[];
  meta?: { pagination?: { total?: number } };
}

function toTreeRoot(
  familyId: string,
  familyName: string,
  branches: TonguePanelBranch[]
): TreeNode {
  return {
    id: familyId,
    label: familyName,
    children: branches.map((branch) => ({
      id: branch.id,
      label: branch.name,
      childCount: branch.peopleCount,
    })),
  };
}

function toTextIndexNodes(branches: TonguePanelBranch[]): TextIndexNode[] {
  return branches.map((branch) => ({
    id: branch.id,
    type: "language",
    name: branch.name,
    peopleCount: branch.peopleCount,
  }));
}

// @req REQ-091
export function TonguePanel({
  languageFamilyId,
  familyName,
  branches,
  size,
  side,
  sourceLine,
  stepLabel,
  heading,
  body,
  note,
  treeLabel,
  textIndexLabel,
}: TonguePanelProps) {
  const root = React.useMemo(
    () => toTreeRoot(languageFamilyId, familyName, branches),
    [languageFamilyId, familyName, branches]
  );
  const textIndexNodes = React.useMemo(
    () => toTextIndexNodes(branches),
    [branches]
  );
  const branchDepth = React.useMemo(() => {
    const depths = new Map<string, number>([[languageFamilyId, 0]]);
    branches.forEach((branch) => depths.set(branch.id, 1));
    return depths;
  }, [languageFamilyId, branches]);

  const loadChildren = React.useCallback(
    async (node: TreeNode, offset = 0): Promise<HierarchyChildrenPage> => {
      const depth = branchDepth.get(node.id) ?? TONGUE_PANEL_MAX_DEPTH;
      if (depth >= TONGUE_PANEL_MAX_DEPTH) return { nodes: [] };

      const params = new URLSearchParams({
        language: node.id,
        limit: String(BRANCH_PAGE_SIZE),
        offset: String(offset),
      });
      const response = await fetch(
        `/api/v2/language-families/${languageFamilyId}/tree/branch?${params.toString()}`
      );
      if (!response.ok) throw new Error("Unable to load tongue branch");
      const payload = (await response.json()) as BranchApiResponse;
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
    [languageFamilyId, branchDepth]
  );

  if (branches.length === 0) {
    return <FichePanel size={size} side={side} sourceLine={sourceLine} />;
  }

  const treeHeadingId = `tongue-panel-tree-${languageFamilyId}`;

  return (
    <FichePanel
      size={size}
      side={side}
      sourceLine={sourceLine}
      data={{
        stepLabel,
        heading,
        body,
        note,
        canvas: (
          <div className="flex h-full flex-col gap-afh-md overflow-y-auto p-afh-md">
            <h3 id={treeHeadingId} className="sr-only">
              {treeLabel}
            </h3>
            <HierarchyTree
              root={root}
              loadChildren={loadChildren}
              defaultExpandedIds={[languageFamilyId]}
              labelledById={treeHeadingId}
            />
            <div className="sr-only">
              <h3>{textIndexLabel}</h3>
              <HierarchyTextIndex nodes={textIndexNodes} />
            </div>
          </div>
        ),
      }}
    />
  );
}

export default TonguePanel;
