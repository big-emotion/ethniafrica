"use client";

import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronDown, RotateCcw } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { loadPublicFlagsPage } from "@/app/[lang]/signalements/actions";
import { FlagPublicStatus } from "@/components/flags/FlagPublicStatus";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type PublicFlagFilters,
  type PublicFlagKind,
  type PublicFlagListItem,
  type PublicFlagsPage,
  type PublicFlagStatus,
  type PublicFlagTargetType,
} from "@/lib/supabase/queries/flags/publicFlagsPageQuery";
import { getTranslation } from "@/lib/translations";

interface PublicFlagsQueueProps {
  initialPage: PublicFlagsPage;
  initialFilters?: PublicFlagFilters;
}

interface FilterOption<T extends string> {
  value: T;
  label: string;
}

const copy = getTranslation("fr").publicFlags;

const STATUS_OPTIONS: FilterOption<PublicFlagStatus>[] = [
  { value: "open", label: copy.statuses.open },
  { value: "under_review", label: copy.statuses.under_review },
  { value: "accepted", label: copy.statuses.accepted },
  { value: "rejected", label: copy.statuses.rejected },
  { value: "withdrawn", label: copy.statuses.withdrawn },
  { value: "duplicate", label: copy.statuses.duplicate },
];

const KIND_OPTIONS: FilterOption<PublicFlagKind>[] = [
  { value: "inaccurate", label: copy.kinds.inaccurate },
  { value: "missing-source", label: copy.kinds["missing-source"] },
  { value: "broken-url", label: copy.kinds["broken-url"] },
  { value: "offensive", label: copy.kinds.offensive },
  {
    value: "correction-proposal",
    label: copy.kinds["correction-proposal"],
  },
  { value: "other", label: copy.kinds.other },
];

const TARGET_OPTIONS: FilterOption<PublicFlagTargetType>[] = [
  { value: "assertion", label: copy.targets.assertion },
  { value: "source", label: copy.targets.source },
  { value: "fiche_section", label: copy.targets.fiche_section },
  { value: "classification", label: copy.targets.classification },
  { value: "general", label: copy.targets.general },
];

const KIND_LABELS = Object.fromEntries(
  KIND_OPTIONS.map(({ value, label }) => [value, label])
) as Record<PublicFlagKind, string>;

const TARGET_LABELS = Object.fromEntries(
  TARGET_OPTIONS.map(({ value, label }) => [value, label])
) as Record<PublicFlagTargetType, string>;

const STATUS_VALUES = new Set(STATUS_OPTIONS.map(({ value }) => value));
const KIND_VALUES = new Set(KIND_OPTIONS.map(({ value }) => value));
const TARGET_VALUES = new Set(TARGET_OPTIONS.map(({ value }) => value));

function isPublicFlagStatus(value: string): value is PublicFlagStatus {
  return STATUS_VALUES.has(value as PublicFlagStatus);
}

function isPublicFlagKind(value: string): value is PublicFlagKind {
  return KIND_VALUES.has(value as PublicFlagKind);
}

function isPublicFlagTargetType(value: string): value is PublicFlagTargetType {
  return TARGET_VALUES.has(value as PublicFlagTargetType);
}

function parseFilters(searchParams: URLSearchParams): PublicFlagFilters {
  return normalizeFilters({
    statuses: searchParams.getAll("status").filter(isPublicFlagStatus),
    kinds: searchParams.getAll("kind").filter(isPublicFlagKind),
    targetTypes: searchParams.getAll("target").filter(isPublicFlagTargetType),
  });
}

function normalizeValues<T extends string>(values: T[] | undefined): T[] {
  return [...new Set(values ?? [])].sort();
}

function normalizeFilters(filters: PublicFlagFilters): PublicFlagFilters {
  return {
    statuses: normalizeValues(filters.statuses),
    kinds: normalizeValues(filters.kinds),
    targetTypes: normalizeValues(filters.targetTypes),
  };
}

function getFilterKey(filters: PublicFlagFilters): string {
  return JSON.stringify([
    filters.statuses ?? [],
    filters.kinds ?? [],
    filters.targetTypes ?? [],
  ]);
}

function truncateReason(reason: string): string {
  const codePoints = Array.from(reason);
  return codePoints.length <= 120
    ? reason
    : `${codePoints.slice(0, 119).join("")}…`;
}

function getContributorName(contributorName: string): string {
  if (!contributorName.trim()) {
    return copy.anonymous;
  }

  return contributorName;
}

function getTargetName(item: PublicFlagListItem): string {
  return item.target.label;
}

const ENTITY_LABELS: Record<string, string> = {
  people: copy.entities.people,
  country: copy.entities.country,
  language: copy.entities.language,
  language_family: copy.entities.language_family,
  source: copy.entities.source,
  fiche_section: copy.entities.fiche_section,
  classification: copy.entities.classification,
};

function getEntityLabel(item: PublicFlagListItem): string {
  return (
    (item.target.entityType && ENTITY_LABELS[item.target.entityType]) ??
    TARGET_LABELS[item.target.type]
  );
}

function FilterMenu<T extends string>({
  label,
  options,
  selected,
  onCheckedChange,
}: {
  label: string;
  options: FilterOption<T>[];
  selected: T[];
  onCheckedChange: (value: T, checked: boolean) => void;
}) {
  const selectionLabel =
    selected.length === 0 ? label : `${label} · ${selected.length}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full justify-between border-afh-border bg-afh-surface px-4 font-afh text-afh-text hover:bg-afh-bg motion-reduce:transition-none"
          aria-label={selectionLabel}
        >
          <span>{selectionLabel}</span>
          <ChevronDown className="h-4 w-4 text-afh-earth" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 border-afh-border bg-afh-surface"
      >
        <DropdownMenuLabel className="font-afh-display text-afh-text">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-afh-border" />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            onCheckedChange={(checked) =>
              onCheckedChange(option.value, checked === true)
            }
            onSelect={(event) => event.preventDefault()}
            className="min-h-11 font-afh text-afh-text focus:bg-afh-bg-warm"
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PublicFlagRow({ item }: { item: PublicFlagListItem }) {
  const targetName = getTargetName(item);
  const reason = item.reasonText?.trim();

  return (
    <article className="group border-b border-afh-border bg-afh-surface first:border-t">
      <Link
        href={`/fr/signalements/${item.publicSlug}`}
        className="block min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-afh-earth md:grid md:grid-cols-[minmax(0,1fr)_13rem] xl:grid-cols-[minmax(0,1fr)_15rem] motion-reduce:transition-none"
      >
        <div className="flex min-w-0 items-start gap-3 px-4 py-5 md:px-6 md:py-6 xl:px-8">
          <span
            className="mt-1 h-8 w-1 shrink-0 rounded-full bg-afh-terracotta"
            aria-hidden="true"
          />
          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              <p className="font-afh text-afh-caption font-bold uppercase tracking-[0.14em] text-afh-earth">
                <span>{TARGET_LABELS[item.target.type]}</span>
                <span aria-hidden="true"> · </span>
                <span>{getEntityLabel(item)}</span>
              </p>
              <h2 className="break-words font-afh-display text-afh-h3 font-bold leading-tight text-afh-text group-hover:text-afh-terracotta">
                {targetName}
              </h2>
              {/* The row once printed `entityId` and `fieldPath` under the
                  title — PPL_BETI, then identity.history. Both are already
                  said above in words, by the type and entity labels and by
                  the target's own name, so the two mono lines added nothing
                  a reader could use and put the schema on a public page. */}
            </div>

            {reason && (
              <p
                className="max-w-3xl font-afh text-afh-small leading-relaxed text-afh-text-soft"
                data-testid="flag-reason"
              >
                {truncateReason(reason)}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-afh text-afh-caption text-afh-text-soft">
              <span className="font-semibold text-afh-text">
                {KIND_LABELS[item.kind]}
              </span>
              <span aria-hidden="true">·</span>
              <span>{getContributorName(item.contributorName)}</span>
              <span aria-hidden="true">·</span>
              <time
                dateTime={item.createdAt}
                suppressHydrationWarning
                title={new Intl.DateTimeFormat("fr-FR", {
                  dateStyle: "long",
                  timeStyle: "short",
                }).format(new Date(item.createdAt))}
              >
                {formatDistanceToNowStrict(new Date(item.createdAt), {
                  addSuffix: true,
                  locale: fr,
                })}
              </time>
            </div>
          </div>
        </div>

        <div className="flex items-center border-t border-afh-border bg-afh-bg px-4 py-3 md:border-l md:border-t-0 md:px-5">
          <FlagPublicStatus status={item.status} />
        </div>
      </Link>
    </article>
  );
}

// @req REQ-014
export function PublicFlagsQueue({
  initialPage,
  initialFilters = {},
}: PublicFlagsQueueProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const latestSearchParamsRef = useRef(new URLSearchParams());
  const [filters, setFilters] = useState<PublicFlagFilters>(() =>
    normalizeFilters(initialFilters)
  );
  const filterKey = getFilterKey(filters);
  const initialFilterKey = getFilterKey(normalizeFilters(initialFilters));

  useEffect(() => {
    function syncFiltersFromLocation() {
      const params = new URLSearchParams(window.location.search);
      latestSearchParamsRef.current = params;
      setFilters(parseFilters(params));
    }

    syncFiltersFromLocation();
    window.addEventListener("popstate", syncFiltersFromLocation);
    return () =>
      window.removeEventListener("popstate", syncFiltersFromLocation);
  }, []);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    isPending,
  } = useInfiniteQuery({
    queryKey: ["public-flags", filterKey],
    queryFn: ({ pageParam }) =>
      loadPublicFlagsPage({
        ...filters,
        cursor: pageParam ?? undefined,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialData:
      filterKey === initialFilterKey
        ? { pages: [initialPage], pageParams: [null] }
        : undefined,
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: "240px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  function replaceSearchParams(params: URLSearchParams) {
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function updateFilter(
    key: "status" | "kind" | "target",
    value: string,
    checked: boolean
  ) {
    const params = new URLSearchParams(latestSearchParamsRef.current);
    const values = new Set(
      params.getAll(key).filter((current) => current !== value)
    );
    if (checked) values.add(value);

    params.delete(key);
    [...values].sort().forEach((current) => params.append(key, current));
    latestSearchParamsRef.current = params;
    setFilters(parseFilters(params));
    replaceSearchParams(params);
  }

  function resetFilters() {
    const params = new URLSearchParams(latestSearchParamsRef.current);
    params.delete("status");
    params.delete("kind");
    params.delete("target");
    latestSearchParamsRef.current = params;
    setFilters(parseFilters(params));
    replaceSearchParams(params);
  }

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section aria-label={copy.queueLabel} className="space-y-5">
      <div className="border-y border-afh-border bg-afh-bg-warm px-4 py-4 md:px-6 xl:px-8">
        <div className="grid gap-3 md:grid-cols-3">
          <FilterMenu
            label={copy.filters.statuses}
            options={STATUS_OPTIONS}
            selected={filters.statuses ?? []}
            onCheckedChange={(value, checked) =>
              updateFilter("status", value, checked)
            }
          />
          <FilterMenu
            label={copy.filters.kinds}
            options={KIND_OPTIONS}
            selected={filters.kinds ?? []}
            onCheckedChange={(value, checked) =>
              updateFilter("kind", value, checked)
            }
          />
          <FilterMenu
            label={copy.filters.targets}
            options={TARGET_OPTIONS}
            selected={filters.targetTypes ?? []}
            onCheckedChange={(value, checked) =>
              updateFilter("target", value, checked)
            }
          />
        </div>
      </div>

      {isPending ? (
        <p
          role="status"
          className="px-4 py-10 text-center font-afh text-afh-small text-afh-text-soft md:px-6"
        >
          {copy.loading}
        </p>
      ) : error && items.length === 0 ? (
        <p
          role="alert"
          className="px-4 py-10 text-center font-afh text-afh-small text-afh-text-soft md:px-6"
        >
          {copy.loadError}
        </p>
      ) : items.length > 0 ? (
        <div aria-live="polite">
          {items.map((item) => (
            <PublicFlagRow key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="mx-4 flex min-h-56 flex-col items-center justify-center gap-5 border-y border-afh-border bg-afh-bg-warm px-6 py-10 text-center md:mx-6 xl:mx-8">
          <p className="max-w-md font-afh-display text-afh-h3 font-semibold text-afh-text">
            {copy.empty}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={resetFilters}
            className="min-h-11 border-afh-earth bg-afh-surface text-afh-earth hover:bg-afh-bg motion-reduce:transition-none"
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            {copy.reset}
          </Button>
        </div>
      )}

      <div ref={sentinelRef} aria-hidden="true" className="h-px" />

      {hasNextPage && (
        <div className="flex justify-center px-4 pb-4">
          <Button
            type="button"
            variant="outline"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
            className="min-h-11 border-afh-earth bg-afh-surface text-afh-earth hover:bg-afh-bg motion-reduce:transition-none"
          >
            {isFetchingNextPage
              ? copy.loadingMore
              : isFetchNextPageError
                ? copy.retry
                : copy.loadMore}
          </Button>
        </div>
      )}
    </section>
  );
}
