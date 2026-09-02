import { SourceCitation } from "@/components/sources/SourceCitation";
import type { PatronymeSource } from "@/lib/patronymes/content";

/**
 * The patronyme fiche's citation, now a caller of the shared one.
 *
 * It keeps its own name and its own `@req` because the fiche's sections read
 * a `<source>` out of the opaque `content` bag and this is where that shape
 * is adapted — `tier` there, `standing` in the shared component, one policy
 * either way.
 */
// @req REQ-133
export function PatronymeSourceCitation({
  source,
}: {
  source: PatronymeSource;
}) {
  return (
    <SourceCitation
      source={{
        title: source.title,
        url: source.url ?? null,
        standing: source.tier,
      }}
    />
  );
}
