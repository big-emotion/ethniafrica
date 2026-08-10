import type { ReactNode } from "react";

// Developer portal shell (charter §6): parchment chrome only — the Swagger
// UI rendered by children is never restyled from here.
// @req REQ-099
export default function ApiDocsLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="docs-api-shell"
      className="min-h-screen bg-afh-bg text-afh-text"
    >
      {children}
    </div>
  );
}
