import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { NameNomenclature } from "@/components/names/NameNomenclature";
import {
  getNameTypeCounts,
  listNameForms,
  NamesSchemaUnavailableError,
  type ListNameFormsResult,
} from "@/api/v2/services/names";
import { listNameFormsQuerySchema } from "@/api/v2/schemas/names";
import { getTranslation } from "@/lib/translations";
import { getLocalizedRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

const PER_PAGE = 48;

interface AppellationsPageProps {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{
    q?: string;
    nameType?: string;
    imposedOnly?: string;
    page?: string;
  }>;
}

// @req REQ-054 @req FR95
export async function generateMetadata({
  params,
}: Pick<AppellationsPageProps, "params">): Promise<Metadata> {
  const { lang } = await params;
  const t = getTranslation(lang as Language).names;
  return {
    title: t.pageTitle,
    description: t.pageSubtitle,
    alternates: {
      canonical: getLocalizedRoute(lang as Language, "names"),
    },
  };
}

// @req REQ-054 @req FR53 @req FR55
export default async function AppellationsPage({
  params,
  searchParams,
}: AppellationsPageProps) {
  const { lang } = await params;
  const language = lang as Language;
  const t = getTranslation(language).names;
  const sp = await searchParams;

  // A hand-edited URL is the state of this page, so a bad value degrades to
  // the default rather than throwing: `safeParse` keeps `?nameType=patronyme`
  // — a type the corpus no longer offers — from turning a listing into a 500.
  const parsed = listNameFormsQuerySchema.safeParse({
    q: sp.q,
    nameType: sp.nameType,
    imposedOnly: sp.imposedOnly === "true",
    page: sp.page,
    perPage: PER_PAGE,
  });
  const query = parsed.success
    ? parsed.data
    : { page: 1, perPage: PER_PAGE, imposedOnly: false };

  let result: ListNameFormsResult;
  let typeCounts: Awaited<ReturnType<typeof getNameTypeCounts>>;
  try {
    [result, typeCounts] = await Promise.all([
      listNameForms(query),
      getNameTypeCounts(),
    ]);
  } catch (error) {
    if (!(error instanceof NamesSchemaUnavailableError)) {
      throw error;
    }
    result = { forms: [], total: 0, pageCount: 1 };
    typeCounts = { byType: {}, imposed: 0 };
  }

  return (
    <PageLayout
      language={language}
      title={t.pageTitle}
      subtitle={t.pageSubtitle}
    >
      <div className="space-y-6 min-[720px]:space-y-8">
        {/* Not the deck again: `PageLayout` already prints `pageSubtitle` in
            the head band, and printing it a second time here left the page
            saying the same sentence twice and its reason for existing not at
            all. */}
        <p className="max-w-2xl text-afh-small text-muted-foreground">
          {t.purpose}
        </p>
        <p
          role="note"
          className="max-w-2xl rounded-md border bg-muted/50 px-4 py-3 text-afh-small"
        >
          {t.genealogyNote}
        </p>
        <NameNomenclature
          language={language}
          forms={result.forms}
          total={result.total}
          page={query.page}
          pageCount={result.pageCount}
          perPage={PER_PAGE}
          query={query.q}
          nameType={query.nameType}
          imposedOnly={query.imposedOnly}
          typeCounts={typeCounts.byType}
          imposedCount={typeCounts.imposed}
        />
      </div>
    </PageLayout>
  );
}
