import { Suspense } from "react";
import { permanentRedirect } from "next/navigation";

import { FamillesPageContent } from "@/components/pages/FamillesPageContent";
import { LoadingState } from "@/components/ui/LoadingState";
import { resolveFamilyDeepLink } from "@/lib/routing";
import type { Language } from "@/types/shared";

/**
 * The families directory.
 *
 * Countries and peoples were each given a page of their own when their
 * directory was taken out of the `[lang]/[section]` catch-all; families were
 * left on it, and so the route existed only for as long as that fall-through
 * did. Deleting `[section]` here would have taken the families directory with
 * it — silently, since no test asked for the route and the redirect table
 * would have gone on pointing at it.
 *
 * The deep-link redirect runs on the server, before any render, so a
 * bookmarked `?family=<id>` reaches the fiche without the directory painting
 * first. `FamillesPageContent` keeps its own client-side copy for a query that
 * appears after hydration; both go through the shared resolver, which is where
 * the encoding that stops `?family=//host` becoming an open redirect lives.
 */

interface PageParams {
  lang: string;
}

type PageSearchParams = Record<string, string | string[] | undefined>;

// @req REQ-091
export default async function FamillesDirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams?: Promise<PageSearchParams>;
}) {
  const { lang } = await params;
  const query = (await searchParams) ?? {};

  const fiche = resolveFamilyDeepLink(lang as Language, query);
  if (fiche) {
    permanentRedirect(fiche);
  }

  // FamillesPageContent reads `useSearchParams`, which Next requires a
  // Suspense boundary above.
  return (
    <Suspense fallback={<LoadingState />}>
      <FamillesPageContent />
    </Suspense>
  );
}
