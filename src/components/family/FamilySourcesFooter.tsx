export interface FamilySourcesFooterProps {
  sources: string[];
}

// @req REQ-047
export function FamilySourcesFooter({ sources }: FamilySourcesFooterProps) {
  if (sources.length === 0) return null;

  return (
    <footer id="sources" aria-labelledby="family-sources-heading">
      <h2 id="family-sources-heading">Sources et références</h2>
      <ul>
        {sources.map((source) => (
          <li key={source}>{source}</li>
        ))}
      </ul>
    </footer>
  );
}
