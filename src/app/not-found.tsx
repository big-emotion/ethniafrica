/**
 * The root 404 boundary. It reuses the localized page rather than keeping a
 * second design of its own: `notFound()` raised in `[lang]/layout.tsx` — the
 * guard that rejects a first segment which is not the canonical locale —
 * cannot be caught by `[lang]/not-found.tsx`, since that page renders inside
 * the layout that raised it. Everything the guard rejects arrives here, so
 * this boundary is now a reader-facing page, not a framework fallback.
 *
 * The localized page reads `lang` from the route params and falls back to
 * "fr" when there is none, which is exactly the case here.
 */
// @req REQ-099
export { default } from "@/app/[lang]/not-found";
