import type { Metadata } from "next";

import { listPatronymes } from "@/api/v2/services/patronymes";
import { PageLayout } from "@/components/layout/PageLayout";
import { PatronymeIndexList } from "@/components/patronymes/PatronymeIndexList";
import { getLocalizedRoute } from "@/lib/routing";
import { translations } from "@/lib/translations";

const t = translations.fr.patronymes.index;

const PER_PAGE = 48;

// @req REQ-139
export const metadata: Metadata = {
  title: t.pageTitle,
  description: t.pageSubtitle,
  alternates: {
    canonical: getLocalizedRoute("fr", "patronymes"),
  },
};

interface NomsPageProps {
  searchParams: Promise<{ page?: string }>;
}

function parsePage(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

// @req REQ-139 @req REQ-133
export default async function NomsIndexPage({ searchParams }: NomsPageProps) {
  const sp = await searchParams;
  const page = parsePage(sp.page);

  let patronymes: Awaited<ReturnType<typeof listPatronymes>>["data"] = [];
  let total = 0;
  let unavailable = false;
  try {
    const result = await listPatronymes({ page, perPage: PER_PAGE });
    patronymes = result.data;
    total = result.total;
  } catch {
    // Thirty patronymes are always published, so a read failure is never an
    // empty corpus — say so explicitly rather than render "0 résultats".
    unavailable = true;
  }

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <PageLayout language="fr" title={t.pageTitle} subtitle={t.pageSubtitle}>
      <div className="space-y-6 min-[720px]:space-y-8">
        {unavailable ? (
          <p
            role="alert"
            className="max-w-2xl rounded-md border bg-muted/50 px-4 py-3 text-afh-small"
          >
            {t.unavailable}
          </p>
        ) : (
          <PatronymeIndexList
            patronymes={patronymes}
            total={total}
            page={page}
            pageCount={pageCount}
          />
        )}
      </div>
    </PageLayout>
  );
}
