import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { getPatronymeById } from "@/api/v2/services/patronymes";

interface LayoutParams {
  lang: string;
  slug: string;
}

/**
 * Resolves the slug ahead of the sibling `loading.tsx`'s Suspense boundary
 * (REQ-052): a layout wraps that boundary rather than sitting inside it, so a
 * missing patronyme 404s on the initial response instead of streaming a
 * shell first and turning the miss into a soft 404.
 */
// @req REQ-052
export default async function AppellationSlugLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<LayoutParams>;
}) {
  const { slug } = await params;
  const patronyme = await getPatronymeById(decodeURIComponent(slug));
  if (!patronyme) {
    notFound();
  }

  return children;
}
