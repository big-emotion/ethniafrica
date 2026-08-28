/**
 * NamesAtlasView — Epic 8 Story 8.10 (ETNI-474).
 *
 * Public "where does my name come from?" front door (FR53, FR55): a
 * mobile-first atlas over `GET /v2/names` letting visitors browse, search
 * and filter every name record, each entry pointing back to its people
 * fiche's `#noms` anchor (one canonical dossier surface, no duplication —
 * see PeopleNamesSection, ETNI-473).
 *
 * The search/filter controls are a client island (submit-button search,
 * not live-on-keystroke) that keeps state in the URL via
 * `history.replaceState` — deliberately not `next/navigation`'s
 * `useRouter`/`useSearchParams`, which require an App Router context that
 * Storybook's `@storybook/react-vite` framework does not provide (see
 * project-context.md's Storybook constraint).
 */

"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { X } from "lucide-react";
import { NameTypeBadge } from "@/components/names/NameTypeBadge";
import { translations } from "@/lib/translations";
import type { NameRecordType } from "@/types/names";

export interface NameAtlasEntry {
  id: string;
  nameText: string;
  nameType: NameRecordType;
  imposedBy: string | null;
  peopleId: string;
  peopleName: string;
}

export interface NamesAtlasViewProps {
  initialNames: NameAtlasEntry[];
  initialTotal: number;
  initialQuery?: string;
  initialNameType?: NameRecordType;
  initialImposedOnly?: boolean;
}

interface RawPeopleSummary {
  id: string;
  nameMain: string;
}

interface RawNameRecord {
  id: string;
  nameText: string;
  nameType: NameRecordType;
  imposedBy: string | null;
  people: RawPeopleSummary | null;
}

interface NamesApiEnvelope {
  data: { names: RawNameRecord[]; total: number };
}

const t = translations.fr.names;

const TYPE_CHIPS: { value: NameRecordType; label: string }[] = [
  { value: "endonym", label: t.filters.endonym },
  { value: "exonym", label: t.filters.exonym },
  { value: "historical_spelling", label: t.filters.historical_spelling },
  { value: "surname", label: t.filters.surname },
];

function toEntries(rows: RawNameRecord[]): NameAtlasEntry[] {
  return rows
    .filter((row) => row.people !== null)
    .map((row) => ({
      id: row.id,
      nameText: row.nameText,
      nameType: row.nameType,
      imposedBy: row.imposedBy,
      peopleId: row.people?.id ?? "",
      peopleName: row.people?.nameMain ?? "",
    }));
}

interface AtlasGroup {
  letter: string;
  entries: NameAtlasEntry[];
}

function groupByLetter(names: NameAtlasEntry[]): AtlasGroup[] {
  const sorted = [...names].sort((a, b) =>
    a.nameText.localeCompare(b.nameText, "fr")
  );
  const groups = new Map<string, NameAtlasEntry[]>();
  for (const entry of sorted) {
    const letter = entry.nameText.charAt(0).toUpperCase();
    const existing = groups.get(letter) ?? [];
    existing.push(entry);
    groups.set(letter, existing);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "fr"))
    .map(([letter, entries]) => ({ letter, entries }));
}

function syncUrl(
  query: string,
  nameType: NameRecordType | "",
  imposedOnly: boolean
) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (nameType) params.set("nameType", nameType);
  if (imposedOnly) params.set("imposedOnly", "true");
  const url = params.toString() ? `/fr/noms?${params}` : "/fr/noms";
  window.history.replaceState(window.history.state, "", url);
}

// @req FR53 @req FR55
// @req REQ-056
export function NamesAtlasView({
  initialNames,
  initialTotal,
  initialQuery = "",
  initialNameType,
  initialImposedOnly = false,
}: NamesAtlasViewProps) {
  const [inputValue, setInputValue] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [nameType, setNameType] = useState<NameRecordType | "">(
    initialNameType ?? ""
  );
  const [imposedOnly, setImposedOnly] = useState(initialImposedOnly);

  const isInitialParams =
    query === initialQuery &&
    nameType === (initialNameType ?? "") &&
    imposedOnly === initialImposedOnly;

  const { data } = useQuery({
    queryKey: ["names-atlas", query, nameType, imposedOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (nameType) params.set("nameType", nameType);
      if (imposedOnly) params.set("imposedOnly", "true");
      params.set("limit", "100");
      const response = await fetch(`/api/v2/names?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load names");
      }
      const envelope: NamesApiEnvelope = await response.json();
      return {
        names: toEntries(envelope.data.names),
        total: envelope.data.total,
      };
    },
    initialData: isInitialParams
      ? { names: initialNames, total: initialTotal }
      : undefined,
    staleTime: isInitialParams ? Infinity : 0,
  });

  const names = data?.names;
  const total = data?.total ?? 0;
  const groups = useMemo(() => groupByLetter(names ?? []), [names]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextQuery = inputValue.trim();
    setQuery(nextQuery);
    syncUrl(nextQuery, nameType, imposedOnly);
  }

  function toggleNameType(value: NameRecordType) {
    const next = nameType === value ? "" : value;
    setNameType(next);
    syncUrl(query, next, imposedOnly);
  }

  function toggleImposedOnly() {
    const next = !imposedOnly;
    setImposedOnly(next);
    syncUrl(query, nameType, next);
  }

  function dismissNameType() {
    setNameType("");
    syncUrl(query, "", imposedOnly);
  }

  function dismissImposedOnly() {
    setImposedOnly(false);
    syncUrl(query, nameType, false);
  }

  const nameTypeLabel = nameType
    ? (TYPE_CHIPS.find((chip) => chip.value === nameType)?.label ?? "")
    : "";

  return (
    <div className="space-y-6 min-[720px]:space-y-8">
      <form
        onSubmit={handleSubmit}
        role="search"
        aria-label={t.searchLabel}
        className="flex flex-col gap-2 min-[720px]:flex-row"
      >
        <input
          id="names-atlas-search"
          type="search"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchLabel}
          className="h-11 flex-1 rounded-md border px-3 text-afh-small"
        />
        <button
          type="submit"
          className="h-11 shrink-0 rounded-md bg-primary px-5 text-afh-small font-semibold text-primary-foreground"
        >
          {t.searchSubmit}
        </button>
      </form>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={t.pageTitle}
      >
        {TYPE_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            aria-pressed={nameType === chip.value}
            onClick={() => toggleNameType(chip.value)}
            className="rounded-full border px-3 py-1 text-afh-small data-[active=true]:font-semibold"
            data-active={nameType === chip.value || undefined}
          >
            {chip.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={imposedOnly}
          onClick={toggleImposedOnly}
          className="rounded-full border px-3 py-1 text-afh-small data-[active=true]:font-semibold"
          data-active={imposedOnly || undefined}
        >
          {t.filters.imposed}
        </button>
      </div>

      {(nameType || imposedOnly) && (
        <div
          className="flex flex-wrap items-center gap-2"
          aria-label={t.activeFiltersLabel}
        >
          {nameType && (
            <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-afh-small">
              {nameTypeLabel}
              <button
                type="button"
                aria-label={`${t.clearFilter} ${nameTypeLabel}`}
                onClick={dismissNameType}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          )}
          {imposedOnly && (
            <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-afh-small">
              {t.filters.imposed}
              <button
                type="button"
                aria-label={`${t.clearFilter} ${t.filters.imposed}`}
                onClick={dismissImposedOnly}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          )}
        </div>
      )}

      <p aria-live="polite" className="text-afh-small text-muted-foreground">
        {`${total} ${total > 1 ? t.resultCountPlural : t.resultCountSingular}`}
      </p>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-md bg-muted px-6 py-10 text-center">
          <p className="max-w-sm text-afh-small">
            {t.emptyState.spellingGuidance}
          </p>
          <div className="space-y-2">
            <p className="text-afh-small font-semibold">
              {t.emptyState.browseByTypeLabel}
            </p>
            <ul className="flex flex-wrap justify-center gap-3 text-afh-small">
              {TYPE_CHIPS.map((chip) => (
                <li key={chip.value}>
                  <Link
                    href={`/fr/noms?nameType=${chip.value}`}
                    className="underline underline-offset-2"
                  >
                    {chip.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/fr/noms?imposedOnly=true"
                  className="underline underline-offset-2"
                >
                  {t.filters.imposed}
                </Link>
              </li>
            </ul>
          </div>
          <Link
            href={`/fr/contribute?q=${encodeURIComponent(query)}`}
            className="text-afh-small underline underline-offset-2"
          >
            {t.emptyState.reportMissing}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 min-[720px]:grid-cols-2 min-[800px]:grid-cols-3">
          {groups.map((group) => (
            <section
              key={group.letter}
              aria-labelledby={`names-atlas-group-${group.letter}`}
            >
              <h2
                id={`names-atlas-group-${group.letter}`}
                className="text-afh-small font-bold"
              >
                {group.letter}
              </h2>
              <ul className="space-y-2">
                {group.entries.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      href={`/fr/peuples/${entry.peopleId}#noms`}
                      className="flex items-center gap-2 text-afh-small hover:underline"
                    >
                      <span>{entry.nameText}</span>
                      <NameTypeBadge
                        nameType={entry.nameType}
                        imposed={!!entry.imposedBy}
                      />
                      <span className="sr-only">— {entry.peopleName}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default NamesAtlasView;
