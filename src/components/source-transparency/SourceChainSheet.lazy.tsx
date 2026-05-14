"use client";

import * as React from "react";

import type { SourceChainSheetProps } from "./SourceChainSheet";

const LazyInner = React.lazy(() => import("./SourceChainSheet"));

/**
 * Lazy-loaded wrapper. Consumers should use this from fiche pages to keep the
 * sheet bundle out of the initial chunk.
 */
export const LazySourceChainSheet: React.FC<SourceChainSheetProps> = (
  props
) => {
  if (!props.open) return null;
  return (
    <React.Suspense fallback={null}>
      <LazyInner {...props} />
    </React.Suspense>
  );
};

export default LazySourceChainSheet;
