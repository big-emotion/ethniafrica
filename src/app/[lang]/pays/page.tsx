import { permanentRedirect } from "next/navigation";

import { PaysPageContentV2 } from "@/components/pages/PaysPageContentV2";
import { resolveCountryDeepLink } from "@/lib/routing";
import type { Language } from "@/types/shared";

/**
 * `/fr/pays` — the country directory.
 *
 * This file exists to take the route out of the `[section]` catch-all. That
 * fall-through was the whole reason the directory could open a country in a
 * detail pane of its own: a second country surface, with no globe and its
 * dossier folded behind a disclosure, reached from the main navigation while
 * the atlas fiche sat one URL away.
 *
 * A static segment beats a dynamic one, so putting a page here settles it, and
 * it settles it without editing `[section]`, which still serves the peoples and
 * families directories.
 *
 * The redirect below is a net for links already sent — nothing in the app emits
 * the query form any more. It runs on the server, before any render, so it also
 * catches readers arriving from outside and crawlers, which a client-side guard
 * would have served the directory to first.
 */

interface PageParams {
  lang: string;
}

type PageSearchParams = Record<string, string | string[] | undefined>;

// @req REQ-091
export default async function PaysDirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams?: Promise<PageSearchParams>;
}) {
  const { lang } = await params;
  const query = (await searchParams) ?? {};

  const fiche = resolveCountryDeepLink(lang as Language, query);
  if (fiche) {
    permanentRedirect(fiche);
  }

  return <PaysPageContentV2 />;
}
