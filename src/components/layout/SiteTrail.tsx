"use client";

import { usePathname } from "next/navigation";

import { AfrikBreadcrumbs } from "@/components/layout/AfrikBreadcrumbs";
import { deriveTrail } from "@/lib/navigation/deriveTrail";

export interface SiteTrailProps {
  /**
   * How to name the identifier in the path, when it holds one — a fiche, a
   * game, a report. `deriveTrail` has no corpus and will print no segment it
   * cannot name, so without this a fiche's trail stops at its hub.
   */
  entityLabel?: string;
}

/**
 * The trail, mounted once for the whole site.
 *
 * It reads the address rather than taking a path as a prop, which is what
 * lets a single mount in `PageLayout` serve every route: the shell does not
 * know, and should not have to know, which page is below it.
 *
 * Four fiche components each mounted their own trail, and the routes that
 * happened to use none — the three hubs, the three facet directories, every
 * game, the whole legal and account subtree — simply had no way back. Placing
 * it in the shell inverts that default: a page has a trail unless it escapes
 * the shell entirely, and `siteTrailCoverage.test.ts` is what notices when
 * one does.
 */
// @req REQ-115
export function SiteTrail({ entityLabel }: SiteTrailProps) {
  const pathname = usePathname();

  return <AfrikBreadcrumbs items={deriveTrail(pathname ?? "", entityLabel)} />;
}

export default SiteTrail;
