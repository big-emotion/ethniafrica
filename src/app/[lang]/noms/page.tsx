import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { NamesAtlasView } from "@/components/names/NamesAtlasView";
import type { NameAtlasEntry } from "@/components/names/NamesAtlasView";
import {
  listNames,
  NamesSchemaUnavailableError,
  type ListNamesResult,
} from "@/api/v2/services/names";
import { nameRecordTypeSchema, type NameRecord } from "@/api/v2/schemas/names";
import { translations } from "@/lib/translations";

const t = translations.fr.names;

// @req FR95
export const metadata: Metadata = {
  title: t.pageTitle,
  description: t.pageSubtitle,
  alternates: {
    canonical: "/fr/noms",
  },
};

interface NomsPageProps {
  searchParams: Promise<{
    q?: string;
    nameType?: string;
    imposedOnly?: string;
  }>;
}

function toAtlasEntries(names: NameRecord[]): NameAtlasEntry[] {
  return names
    .filter((record) => record.people !== null)
    .map((record) => ({
      id: record.id,
      nameText: record.nameText,
      nameType: record.nameType,
      imposedBy: record.imposedBy,
      peopleId: record.people?.id ?? "",
      peopleName: record.people?.nameMain ?? "",
    }));
}

// @req FR53 @req FR55
export default async function NomsPage({ searchParams }: NomsPageProps) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const parsedNameType = nameRecordTypeSchema.safeParse(sp.nameType);
  const nameType = parsedNameType.success ? parsedNameType.data : undefined;
  const imposedOnly = sp.imposedOnly === "true";

  let result: ListNamesResult;
  try {
    result = await listNames({
      q,
      nameType,
      imposedOnly,
      limit: 100,
      offset: 0,
    });
  } catch (error) {
    if (!(error instanceof NamesSchemaUnavailableError)) {
      throw error;
    }
    result = { names: [], total: 0 };
  }

  return (
    <PageLayout language="fr" title={t.pageTitle} subtitle={t.pageSubtitle}>
      <div className="space-y-6 min-[720px]:space-y-8">
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t.pageSubtitle}
        </p>
        <p
          role="note"
          className="max-w-2xl rounded-md border bg-muted/50 px-4 py-3 text-sm"
        >
          {t.genealogyNote}
        </p>
        <NamesAtlasView
          initialNames={toAtlasEntries(result.names)}
          initialTotal={result.total}
          initialQuery={q}
          initialNameType={nameType}
          initialImposedOnly={imposedOnly}
        />
      </div>
    </PageLayout>
  );
}
