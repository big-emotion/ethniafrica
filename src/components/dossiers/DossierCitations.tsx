import type { DossierSource } from "@/lib/afrik/parsers/dossierTypes";

// @req REQ-114
export function DossierCitations({
  refs,
  sources,
  prefix,
}: {
  refs: string[];
  sources: DossierSource[];
  prefix: string;
}) {
  return (
    <span className="afh-dossier-citations">
      {refs.map((key) => {
        const index = sources.findIndex((source) => source.sourceKey === key);
        if (index < 0) return null;
        return (
          <a
            key={key}
            href={`#${prefix}-source-${key}`}
            data-dossier-citation
            aria-label={`Source ${index + 1}: ${sources[index].title}`}
          >
            [{index + 1}]
          </a>
        );
      })}
    </span>
  );
}
