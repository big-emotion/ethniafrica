import type { ReactNode } from "react";
import { PageLayout } from "@/components/layout/PageLayout";

// The global shell owns the site navigation and footer. The inner portal
// surface keeps Swagger isolated on the parchment background.
// @req REQ-099
export default function ApiDocsLayout({ children }: { children: ReactNode }) {
  return (
    <PageLayout language="fr">
      <div data-testid="docs-api-shell" className="bg-afh-bg text-afh-text">
        {children}
      </div>
    </PageLayout>
  );
}
