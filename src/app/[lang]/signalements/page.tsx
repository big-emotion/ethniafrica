import type { Metadata } from "next";
import { unstable_cache } from "next/cache";

import { PublicFlagsQueue } from "@/components/flags/PublicFlagsQueue";
import { PageLayout } from "@/components/layout/PageLayout";
import { getPublicFlagsPage } from "@/lib/supabase/queries/flags/getPublicFlagsPage";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";

interface PageProps {
  params: Promise<{ lang: string }>;
}

// @req REQ-014
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const copy = getTranslation(lang as Language).publicFlags;
  return {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
  };
}

const getInitialPublicFlagsPage = unstable_cache(
  () => getPublicFlagsPage({ pageSize: 50 }),
  ["public-flags-index"],
  { revalidate: 60 }
);

// @req REQ-014
export default async function SignalementsPage({ params }: PageProps) {
  const { lang } = await params;
  const language = lang as Language;
  const copy = getTranslation(language).publicFlags;
  const initialPage = await getInitialPublicFlagsPage();

  return (
    <PageLayout language={language} title={copy.title}>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <p className="max-w-3xl font-afh text-afh-small leading-relaxed text-afh-text-soft">
          {copy.introduction}
        </p>
        <PublicFlagsQueue initialPage={initialPage} initialFilters={{}} />
      </div>
    </PageLayout>
  );
}
