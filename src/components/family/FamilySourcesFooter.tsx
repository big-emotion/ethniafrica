import type { FicheSource } from "@/types/afrik";

export interface FamilySourcesFooterProps {
  sources: FicheSource[];
}

// @req REQ-047
export function FamilySourcesFooter({ sources }: FamilySourcesFooterProps) {
  if (sources.length === 0) return null;

  return (
    <footer id="sources" aria-labelledby="family-sources-heading">
      <h2 id="family-sources-heading">Sources et références</h2>
      <ul>
        {sources.map((source) => (
          <li key={`${source.title}-${source.url ?? ""}`}>
            {source.url ? (
              <a href={source.url} rel="noreferrer noopener" target="_blank">
                {source.title}
              </a>
            ) : (
              source.title
            )}
          </li>
        ))}
      </ul>
    </footer>
  );
}
