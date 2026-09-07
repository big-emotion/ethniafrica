import type { JsonLdNode } from "@/lib/seo/ficheJsonLd";

export interface FicheJsonLdProps {
  /** Built by `ficheJsonLdFor`, or null when the corpus could not answer. */
  graph: JsonLdNode[] | null;
}

/**
 * The fiche's structured data.
 *
 * Deliberately synchronous, and given its graph rather than fetching one. An
 * awaited component here would make every tree containing it async, and the
 * route and shell suites render those trees synchronously — an async child
 * resolves the whole render to an empty `<div />`, which is how this arrived
 * as thirty-three red tests across five files rather than as one. The routes
 * are async already; they await `ficheJsonLdFor` and hand the result down.
 */
// @req REQ-091
export function FicheJsonLd({ graph }: FicheJsonLdProps) {
  if (!graph || graph.length === 0) return null;

  return (
    <script
      type="application/ld+json"
      // Built from corpus fields, never from a request: the only injection
      // surface would be the corpus itself, which the editorial gates govern.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": graph,
        }),
      }}
    />
  );
}
