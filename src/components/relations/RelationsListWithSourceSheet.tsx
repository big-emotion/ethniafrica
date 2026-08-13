"use client";

import { useState } from "react";

import { RelationsList, type RelationsListProps } from "./RelationsList";
import SourceChainSheet from "@/components/source-transparency/SourceChainSheet";
import type { RelationListItem } from "@/lib/relationsDataTransformer";

export interface RelationsListWithSourceSheetProps {
  items: RelationListItem[];
  initialActiveTypes?: RelationsListProps["initialActiveTypes"];
  className?: string;
}

/**
 * Client boundary pairing `RelationsList` (SSR-rendered by the caller) with
 * the `SourceChainSheet` its `ConfidenceChip`s open (UX-DR48) — the sheet
 * owns no data source of its own beyond what `RelationListItem` already
 * carries, so per-relation `sources` stay empty rather than invented
 * (FragmentationView precedent, "never invent data").
 */
// @req REQ-097
export function RelationsListWithSourceSheet({
  items,
  initialActiveTypes,
  className,
}: RelationsListWithSourceSheetProps) {
  const [openRelationId, setOpenRelationId] = useState<string | null>(null);
  const activeItem = items.find((item) => item.id === openRelationId) ?? null;

  return (
    <>
      <RelationsList
        items={items}
        onOpenRelation={setOpenRelationId}
        initialActiveTypes={initialActiveTypes}
        className={className}
      />
      {activeItem && (
        <SourceChainSheet
          open={openRelationId !== null}
          onOpenChange={(open) => {
            if (!open) setOpenRelationId(null);
          }}
          assertion={{
            statement:
              activeItem.description ??
              `Lien avec ${activeItem.neighbor.nameMain}`,
            confidenceScore: activeItem.confidence?.score ?? 0,
            sourceCount: activeItem.confidence?.sourceCount ?? 0,
            lastHumanAuditAt: null,
          }}
          sources={[]}
          anchorId={`relation-${activeItem.id}`}
        />
      )}
    </>
  );
}

export default RelationsListWithSourceSheet;
