import type { MetadataRoute } from "next";

import { CANONICAL_DOMAIN } from "@/lib/brand";

/**
 * `robots.txt`, generated rather than static.
 *
 * It replaces `public/robots.txt`, which carried no `Sitemap:` line at all.
 * Adding one there would have meant hard-coding the production host in a file
 * with no way to read `CANONICAL_DOMAIN` — the first thing to go stale on a
 * domain change, and silently, since nothing fetches it in CI.
 *
 * The disallow list mirrors `UNLISTED_ROUTES` in `src/lib/siteTree.ts` for the
 * paths that must not be crawled at all. It is not derived from it: the two
 * lists answer different questions — one is "what does a reader need to see",
 * the other "what must a crawler never index" — and collapsing them would put
 * `/fr/quiz/score` behind a crawl ban it does not need.
 */

// @req REQ-110
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Authenticated surfaces only. Two orphan privacy pages used to be
        // listed beside them; they were deleted rather than hidden, which is
        // the stronger guarantee — a crawler can ignore a disallow line, it
        // cannot index a route that is gone.
        disallow: ["/fr/admin/"],
      },
    ],
    sitemap: `https://${CANONICAL_DOMAIN}/sitemap.xml`,
    host: `https://${CANONICAL_DOMAIN}`,
  };
}
