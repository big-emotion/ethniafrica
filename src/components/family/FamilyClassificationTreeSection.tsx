import type { ReactNode } from "react";

export interface FamilyClassificationTreeSectionProps {
  children?: ReactNode;
}

// @req REQ-047
export function FamilyClassificationTreeSection({
  children,
}: FamilyClassificationTreeSectionProps) {
  if (!children) return null;

  return (
    <section aria-labelledby="family-classification-tree-heading">
      <h2 id="family-classification-tree-heading">Classification</h2>
      {children}
    </section>
  );
}
