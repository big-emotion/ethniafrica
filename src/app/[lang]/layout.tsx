import { notFound } from "next/navigation";
import type { Language } from "@/types/shared";

// Mirrors the middleware's own CANONICAL_LOCALE. The type keeps the two in
// step: widening `Language` beyond "fr" stops compiling here first.
const CANONICAL_LOCALE: Language = "fr";

/**
 * `[lang]` is a dynamic segment with nothing below it that constrains what it
 * accepts, so Next matches it against any first path segment: `/quiz` resolved
 * to `lang = "quiz"` and served the home page with a 200 instead of a 404.
 *
 * The middleware's locale canonicalization does not cover this — it only sees
 * two-letter segments, and redirects those to `/fr`. Anything longer reached
 * the page untouched, and reached it outside `/fr/*`, which also costs the
 * relaxed style CSP the fiche components need: the home rendered unstyled.
 *
 * Guarding here rather than in each page covers the whole subtree, including
 * the `[section]/[item]` routes whose rendering is client-side and never
 * inspects the segment.
 */
// @req REQ-052
export default async function LangLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: React.ReactNode;
}) {
  const { lang } = await params;
  if (lang !== CANONICAL_LOCALE) {
    notFound();
  }
  return children;
}
