import { ficheSourceLabel } from "@/lib/afrik/ficheSourceLabel";
import type { FicheSource } from "@/types/afrik";

export interface FamilySourcesFooterProps {
  sources: FicheSource[];
}

// @req REQ-047
export function FamilySourcesFooter({ sources }: FamilySourcesFooterProps) {
  // The database still serves fiches whose sources are bare strings; reading
  // `.title` off one renders an empty <li>. Resolve the label first and drop
  // anything that has none, so the list shows what it actually holds.
  const entries = sources
    .map((source) => ({ source, label: ficheSourceLabel(source) }))
    .filter((entry) => entry.label !== null);

  if (entries.length === 0) return null;

  return (
    <footer id="sources" aria-labelledby="family-sources-heading">
      <h2 id="family-sources-heading">Sources et références</h2>
      <ul>
        {entries.map(({ source, label }) => {
          const href = typeof source === "string" ? null : source.url;
          return (
            <li key={`${label}-${href ?? ""}`}>
              {href ? (
                <a href={href} rel="noreferrer noopener" target="_blank">
                  {label}
                </a>
              ) : (
                label
              )}
            </li>
          );
        })}
      </ul>
    </footer>
  );
}
