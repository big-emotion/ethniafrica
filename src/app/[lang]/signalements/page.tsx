import type { Metadata } from "next";
import { unstable_cache } from "next/cache";

import { PublicFlagsQueue } from "@/components/flags/PublicFlagsQueue";
import { PageLayout } from "@/components/layout/PageLayout";
import { getPublicFlagsPage } from "@/lib/supabase/queries/flags/getPublicFlagsPage";
import { getTranslation } from "@/lib/translations";

const copy = getTranslation("fr").publicFlags;

// @req REQ-014
export const metadata: Metadata = {
  title: copy.metadataTitle,
  description: copy.metadataDescription,
};

const getInitialPublicFlagsPage = unstable_cache(
  () => getPublicFlagsPage({ pageSize: 50 }),
  ["public-flags-index"],
  { revalidate: 60 }
);

// @req REQ-014
export default async function SignalementsPage() {
  const initialPage = await getInitialPublicFlagsPage();

  return (
    <PageLayout language="fr" title={copy.title}>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <p className="max-w-3xl font-afh text-afh-small leading-relaxed text-afh-text-soft">
          {copy.introduction}
        </p>
        <PublicFlagsQueue initialPage={initialPage} initialFilters={{}} />
      </div>
    </PageLayout>
  );
}
