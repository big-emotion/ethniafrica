import { permanentRedirect } from "next/navigation";

import { PeuplesPageContent } from "@/components/pages/PeuplesPageContent";
import { resolvePeopleDeepLink } from "@/lib/routing";
import type { Language } from "@/types/shared";

/**
 * `/fr/peuples` — the peoples directory.
 *
 * This file exists to take the route out of the `[section]` catch-all. That
 * fall-through was the whole reason the directory could open a people in a
 * pane of its own: the fiche on the left, the list on the right, no globe,
 * reached from the main navigation while the atlas fiche sat one URL away.
 * Two people surfaces, and the one the navigation led to was the one the
 * fiche work had replaced.
 *
 * A static segment beats a dynamic one, so putting a page here settles it,
 * and it settles it without editing `[section]`, which still serves the
 * families directory.
 *
 * The redirect below is a net for links already sent — nothing in the app
 * emits the query form any more. It runs on the server, before any render, so
 * it also catches readers arriving from outside and crawlers, which a
 * client-side guard would have served the directory to first.
 */

interface PageParams {
  lang: string;
}

type PageSearchParams = Record<string, string | string[] | undefined>;

// @req REQ-097
export default async function PeuplesDirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams?: Promise<PageSearchParams>;
}) {
  const { lang } = await params;
  const query = (await searchParams) ?? {};

  const fiche = resolvePeopleDeepLink(lang as Language, query);
  if (fiche) {
    permanentRedirect(fiche);
  }

  return <PeuplesPageContent />;
}
