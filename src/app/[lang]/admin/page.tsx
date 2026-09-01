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
export const metadata: Metadata = {
  title: "Signalements",
  robots: { index: false, follow: false },
};

// Reports are mutable and the queue must never be served stale to the person
// deciding on them.
// @req REQ-042
export const dynamic = "force-dynamic";

const PAGE_SIZES = [25, 50, 100] as const;

const STATUS_OPTIONS = [
  { value: "open", label: "Ouvert" },
  { value: "under_review", label: "En cours d'examen" },
  { value: "accepted", label: "Accepté" },
  { value: "rejected", label: "Rejeté" },
  { value: "duplicate", label: "Doublon" },
  { value: "withdrawn", label: "Retiré" },
] as const;

const KIND_OPTIONS = [
  { value: "inaccurate", label: "Inexactitude" },
  { value: "missing-source", label: "Source manquante" },
  { value: "broken-url", label: "Lien cassé" },
  { value: "offensive", label: "Contenu offensant" },
  { value: "correction-proposal", label: "Proposition de correction" },
  { value: "other", label: "Autre" },
] as const;

const ENTITY_OPTIONS = [
  { value: "people", label: "Peuple" },
  { value: "country", label: "Pays" },
  { value: "language_family", label: "Famille linguistique" },
  { value: "fiche_section", label: "Section de fiche" },
  { value: "assertion", label: "Assertion" },
  { value: "source", label: "Source" },
] as const;

const SORT_OPTIONS = [{ value: "oldest", label: "Plus anciens d'abord" }];

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
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await getModeratorSession();

  const params = await searchParams;
  const status = pick<FlagStatus>(one(params, "statut"), STATUS_OPTIONS);
  const kind = pick<FlagKind>(one(params, "type"), KIND_OPTIONS);
  const entityType = pick(one(params, "entite"), ENTITY_OPTIONS);
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
    return suffix ? `/fr/admin?${suffix}` : "/fr/admin";
  }

  return (
    <PageLayout language="fr" title="Signalements">
      <div className="mx-auto w-full max-w-4xl space-y-afh-xl">
        <p className="max-w-3xl text-afh-small text-afh-text-soft">
          Statuer sur un signalement ne modifie pas la fiche&nbsp;: la décision
          dit ce que l&apos;atlas pense de la remarque, la correction du corpus
          est un acte éditorial distinct. Une décision qui clôt un signalement
          demande une note&nbsp;: elle est publiée avec lui.
        </p>

        <FacetFilterBar
          action="/fr/admin"
          primaryField={{
            name: "statut",
            label: "Statut",
            anyLabel: "Tous les statuts",
            options: STATUS_OPTIONS,
            value: status ?? null,
          }}
          advancedFields={[
            {
              name: "type",
              label: "Type de signalement",
              anyLabel: "Tous les types",
              options: KIND_OPTIONS,
              value: kind ?? null,
            },
            {
              name: "entite",
              label: "Élément signalé",
              anyLabel: "Tous les éléments",
              options: ENTITY_OPTIONS,
              value: entityType ?? null,
            },
            {
              name: "tri",
              label: "Ordre",
              anyLabel: "Plus récents d'abord",
              options: SORT_OPTIONS,
              value: sort === "oldest" ? "oldest" : null,
            },
          ]}
          preservedParams={{
            taille: pageSize === PAGE_SIZES[0] ? null : String(pageSize),
          }}
        />

        {total === 0 ? (
          <p className="text-afh-small text-afh-text-soft">
            Aucun signalement ne correspond à cette sélection.
          </p>
        ) : (
          <>
            <FacetPagination
              position="top"
              page={page}
              pageCount={pageCount}
              total={total}
              pageSize={pageSize}
              pageSizes={PAGE_SIZES}
              buildHref={buildHref}
              unitLabel="signalements"
            />

            <ModerationQueue reports={items} />

            <FacetPagination
              position="bottom"
              page={page}
              pageCount={pageCount}
              total={total}
              pageSize={pageSize}
              pageSizes={PAGE_SIZES}
              buildHref={buildHref}
              unitLabel="signalements"
            />
          </>
        )}
      </div>
    </PageLayout>
  );
}
