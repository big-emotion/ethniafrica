import AboutPageShell from "@/components/pages/AboutPageShell";
import SourcesPageContent from "@/components/pages/SourcesPageContent";

/**
 * `AboutPageShell` is reused as-is: despite its name it does nothing
 * About-specific — client-only language sync outside the route, wrapped in
 * `PageLayout` — which is exactly what this static bibliography needs too.
 */
// @req REQ-091
export default function SourcesPage() {
  return (
    <AboutPageShell>
      <SourcesPageContent />
    </AboutPageShell>
  );
}
