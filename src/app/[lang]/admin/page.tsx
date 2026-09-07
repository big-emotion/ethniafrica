import type { Metadata } from "next";

import { ModerationQueue } from "@/components/admin/ModerationQueue";
import { PageLayout } from "@/components/layout/PageLayout";
import { FacetFilterBar } from "@/components/hubs/facets/FacetFilterBar";
import { FacetPagination } from "@/components/hubs/facets/FacetPagination";
import {
  listFlagsForModeration,
  type FlagKind,
  type FlagStatus,
} from "@/api/v2/services/flags";
import { getModeratorSession } from "@/lib/supabase/moderator";
import { adminCopy } from "@/lib/i18n/copy/admin";
import { getStaticPageRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

/**
 * The moderator's queue.
 *
 * It serves every status, not the two it used to: a moderator who had just
 * accepted a report could not then find it, and nothing on screen said the
 * other three states existed. Filters, sort and paging follow the grammar the
 * reader already knows from the country, people and family hubs — the same two
 * primitives, so the two surfaces cannot drift apart.
 *
 * What it deliberately does **not** do is edit the corpus. Deciding on a report
 * says what the atlas thinks of a claim; changing the claim is an editorial act
 * with its own provenance, and it does not happen here. `accepted` means "the
 * atlas agrees", never "the atlas has fixed it" (moderation charter §7), which
 * is why the note that closes a report is mandatory and published.
 *
 * The session check is redundant with the middleware and kept anyway: a
 * middleware matcher is a configuration line, and an authorization that lives
 * only in configuration is one edit away from being gone.
 */

// @req REQ-042
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: adminCopy[lang as Language].queue.metadataTitle,
    robots: { index: false, follow: false },
  };
}

// Reports are mutable and the queue must never be served stale to the person
// deciding on them.
// @req REQ-042
export const dynamic = "force-dynamic";

const PAGE_SIZES = [25, 50, 100] as const;

type SearchParams = Record<string, string | string[] | undefined>;

function one(params: SearchParams, key: string): string | null {
  const value = params[key];
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || null;
}

function pick<T extends string>(
  raw: string | null,
  allowed: readonly { value: string }[]
): T | undefined {
  return allowed.some((option) => option.value === raw)
    ? (raw as T)
    : undefined;
}

// @req REQ-042
export default async function ModerationQueuePage({
  params: routeParams,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await getModeratorSession();

  const { lang } = await routeParams;
  const language = lang as Language;
  const copy = adminCopy[language].queue;
  const statusOptions = [
    { value: "open", label: copy.status.open },
    { value: "under_review", label: copy.status.underReview },
    { value: "accepted", label: copy.status.accepted },
    { value: "rejected", label: copy.status.rejected },
    { value: "duplicate", label: copy.status.duplicate },
    { value: "withdrawn", label: copy.status.withdrawn },
  ];
  const kindOptions = [
    { value: "inaccurate", label: copy.kind.inaccurate },
    { value: "missing-source", label: copy.kind.missingSource },
    { value: "broken-url", label: copy.kind.brokenUrl },
    { value: "offensive", label: copy.kind.offensive },
    { value: "correction-proposal", label: copy.kind.correctionProposal },
    { value: "other", label: copy.kind.other },
    { value: "contribution", label: copy.kind.contribution },
  ];
  const entityOptions = [
    { value: "people", label: copy.entity.people },
    { value: "country", label: copy.entity.country },
    { value: "language_family", label: copy.entity.languageFamily },
    { value: "fiche_section", label: copy.entity.ficheSection },
    { value: "assertion", label: copy.entity.assertion },
    { value: "source", label: copy.entity.source },
  ];
  const sortOptions = [{ value: "oldest", label: copy.oldestFirst }];
  const queueRoute = getStaticPageRoute(language, "admin");
  const params = await searchParams;
  const status = pick<FlagStatus>(one(params, "statut"), statusOptions);
  const kind = pick<FlagKind>(one(params, "type"), kindOptions);
  const entityType = pick(one(params, "entite"), entityOptions);
  const sort = one(params, "tri") === "oldest" ? "oldest" : "recent";

  const requestedSize = Number(one(params, "taille"));
  const pageSize = PAGE_SIZES.includes(
    requestedSize as (typeof PAGE_SIZES)[number]
  )
    ? requestedSize
    : PAGE_SIZES[0];
  const page = Math.max(1, Number(one(params, "page")) || 1);

  const { items, total } = await listFlagsForModeration({
    ...(status ? { statuses: [status] } : {}),
    ...(kind ? { kind } : {}),
    ...(entityType ? { entityType } : {}),
    sort,
    page,
    pageSize,
  });

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  function buildHref(nextPage: number, nextSize: number): string {
    const query = new URLSearchParams();
    if (status) query.set("statut", status);
    if (kind) query.set("type", kind);
    if (entityType) query.set("entite", entityType);
    if (sort === "oldest") query.set("tri", "oldest");
    if (nextSize !== PAGE_SIZES[0]) query.set("taille", String(nextSize));
    if (nextPage > 1) query.set("page", String(nextPage));
    const suffix = query.toString();
    return suffix ? `${queueRoute}?${suffix}` : queueRoute;
  }

  return (
    <PageLayout language={language} title={copy.title}>
      <div className="mx-auto w-full max-w-4xl space-y-afh-xl">
        <p className="max-w-3xl text-afh-small text-afh-text-soft">
          {copy.guidance}
        </p>

        <FacetFilterBar
          action={queueRoute}
          primaryField={{
            name: "statut",
            label: copy.statusFilter,
            anyLabel: copy.allStatuses,
            options: statusOptions,
            value: status ?? null,
          }}
          advancedFields={[
            {
              name: "type",
              label: copy.kindFilter,
              anyLabel: copy.allKinds,
              options: kindOptions,
              value: kind ?? null,
            },
            {
              name: "entite",
              label: copy.entityFilter,
              anyLabel: copy.allEntities,
              options: entityOptions,
              value: entityType ?? null,
            },
            {
              name: "tri",
              label: copy.orderFilter,
              anyLabel: copy.newestFirst,
              options: sortOptions,
              value: sort === "oldest" ? "oldest" : null,
            },
          ]}
          preservedParams={{
            taille: pageSize === PAGE_SIZES[0] ? null : String(pageSize),
          }}
        />

        {total === 0 ? (
          <p className="text-afh-small text-afh-text-soft">{copy.empty}</p>
        ) : (
          <>
            <FacetPagination
              language={language}
              position="top"
              page={page}
              pageCount={pageCount}
              total={total}
              pageSize={pageSize}
              pageSizes={PAGE_SIZES}
              buildHref={buildHref}
              unitLabel={copy.unit}
            />

            <ModerationQueue language={language} reports={items} />

            <FacetPagination
              language={language}
              position="bottom"
              page={page}
              pageCount={pageCount}
              total={total}
              pageSize={pageSize}
              pageSizes={PAGE_SIZES}
              buildHref={buildHref}
              unitLabel={copy.unit}
            />
          </>
        )}
      </div>
    </PageLayout>
  );
}
