"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBrowserSupabaseClient } from "@/lib/supabase/auth-client";
import { contributeCopy } from "@/lib/i18n/copy/contribute";
import type { Language } from "@/types/shared";
import type { SourceTier } from "@/types/sources";

type SourceKind =
  | "intergovernmental"
  | "government"
  | "official_statistics"
  | "linguistic_reference"
  | "academic"
  | "community"
  | "repository"
  | "archive";

interface ReferenceSource {
  id: string;
  source_key: string;
  title: string;
  author: string;
  year: number;
  source_kind: SourceKind;
  tier: SourceTier;
  identifiers: Record<string, string>;
  publisher: string | null;
  url: string | null;
}

interface ReferenceLibraryResponse<T> {
  data: T;
}

export interface ReferenceLibraryFlowProps {
  assertionId?: string;
  language?: Language;
}

const SOURCE_KINDS: readonly SourceKind[] = [
  "intergovernmental",
  "government",
  "official_statistics",
  "linguistic_reference",
  "academic",
  "community",
  "repository",
  "archive",
];

function isSourceKind(value: string): value is SourceKind {
  return SOURCE_KINDS.includes(value as SourceKind);
}

function isAssetKind(value: string): value is "scan" | "ocr" {
  return value === "scan" || value === "ocr";
}

async function getAccessToken(authRequiredMessage: string) {
  const { data } = await createBrowserSupabaseClient().auth.getSession();
  const token = data.session?.access_token;

  if (!token) throw new Error(authRequiredMessage);
  return token;
}

async function readResponse<T>(
  response: Response,
  requestErrorMessage: string
): Promise<T> {
  const payload: ReferenceLibraryResponse<T> = await response.json();
  if (!response.ok) throw new Error(requestErrorMessage);
  return payload.data;
}

function sourceKeyFrom(title: string, year: string) {
  const normalized = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);

  return `${normalized || "ouvrage"}-${year}`;
}

// @req REQ-093
export function ReferenceLibraryFlow({
  assertionId,
  language = "fr",
}: ReferenceLibraryFlowProps) {
  const copy = contributeCopy[language].reference;
  const [mode, setMode] = useState<"search" | "offline">("search");
  const [searchInput, setSearchInput] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selectedSource, setSelectedSource] = useState<ReferenceSource | null>(
    null
  );
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [year, setYear] = useState("");
  const [sourceKind, setSourceKind] = useState<SourceKind>("academic");
  const [identifier, setIdentifier] = useState("");
  const [publisher, setPublisher] = useState("");
  const [url, setUrl] = useState("");
  const [locator, setLocator] = useState("");
  const [assetKind, setAssetKind] = useState<"scan" | "ocr">("scan");
  const [asset, setAsset] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  const search = useQuery({
    queryKey: ["reference-library", submittedSearch],
    queryFn: async () => {
      const token = await getAccessToken(copy.authRequired);
      const response = await fetch(
        `/api/v2/reference-library?q=${encodeURIComponent(submittedSearch)}&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return readResponse<ReferenceSource[]>(response, copy.requestError);
    },
    enabled: Boolean(submittedSearch),
  });

  const createReference = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken(copy.authRequired);
      const response = await fetch("/api/v2/reference-library", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_key: sourceKeyFrom(title, year),
          title,
          authors: authors
            .split(";")
            .map((author) => author.trim())
            .filter(Boolean),
          publication_year: Number(year),
          source_kind: sourceKind,
          // A newly filed reference is unverified until a curator tiers it.
          tier: "unverified",
          identifiers: identifier.trim()
            ? { reference: identifier.trim() }
            : {},
          publisher: publisher.trim() || null,
          url: url.trim() || null,
        }),
      });
      const result = await readResponse<{ source: ReferenceSource }>(
        response,
        copy.requestError
      );
      return result.source;
    },
    onSuccess: (source) => {
      setSelectedSource(source);
      setMessage(copy.saved);
    },
    onError: () => setMessage(copy.saveError),
  });

  const linkAssertion = useMutation({
    mutationFn: async () => {
      if (!assertionId || !selectedSource) return;
      const token = await getAccessToken(copy.authRequired);
      const response = await fetch("/api/v2/reference-library/assertions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assertion_id: assertionId,
          source_id: selectedSource.id,
          locator_type: "page",
          locator_value: locator.trim(),
        }),
      });
      await readResponse(response, copy.requestError);
    },
    onSuccess: () => setMessage(copy.linked),
    onError: () => setMessage(copy.linkError),
  });

  const uploadAsset = useMutation({
    mutationFn: async () => {
      if (!selectedSource || !asset) return;
      const token = await getAccessToken(copy.authRequired);
      const formData = new FormData();
      formData.set("sourceId", selectedSource.id);
      formData.set("assetKind", assetKind);
      formData.set("file", asset);
      const response = await fetch("/api/v2/reference-library/assets", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      await readResponse(response, copy.requestError);
    },
    onSuccess: () => {
      setMessage(copy.uploaded);
      setAsset(null);
    },
    onError: () => setMessage(copy.uploadError),
  });

  function chooseSearch() {
    setMode("search");
    setMessage("");
  }

  function chooseOffline() {
    setMode("offline");
    setMessage("");
  }

  function submitSearch() {
    const nextSearch = searchInput.trim();
    if (!nextSearch) return;
    setMessage("");
    setSubmittedSearch(nextSearch);
  }

  return (
    <section
      data-reference-library-flow
      className="space-y-4 rounded-lg border p-4 min-[720px]:space-y-6 min-[720px]:p-6 min-[800px]:p-8"
      aria-labelledby="reference-library-title"
    >
      <div className="space-y-1">
        <h3 id="reference-library-title" className="text-afh-h3 font-semibold">
          {copy.title}
        </h3>
        <p className="text-afh-small text-muted-foreground">
          {copy.introduction}
        </p>
      </div>

      <div
        className="flex flex-col gap-2 min-[720px]:flex-row"
        aria-label={copy.modeLabel}
      >
        <Button
          type="button"
          variant={mode === "search" ? "default" : "outline"}
          onClick={chooseSearch}
        >
          {copy.searchMode}
        </Button>
        <Button
          type="button"
          variant={mode === "offline" ? "default" : "outline"}
          onClick={chooseOffline}
        >
          {copy.offlineMode}
        </Button>
      </div>

      {mode === "search" ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="reference-search">{copy.searchLabel}</Label>
            <div className="flex flex-col gap-2 min-[720px]:flex-row">
              <Input
                id="reference-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={copy.searchPlaceholder}
              />
              <Button
                type="button"
                onClick={submitSearch}
                disabled={!searchInput.trim()}
              >
                {copy.search}
              </Button>
            </div>
          </div>

          {search.isLoading && (
            <p className="text-afh-small text-muted-foreground">
              {copy.searching}
            </p>
          )}
          {search.isError && (
            <p className="text-afh-small text-destructive">
              {copy.searchError}
            </p>
          )}
          {search.data?.map((source) => (
            <Button
              key={source.id}
              type="button"
              variant={selectedSource?.id === source.id ? "default" : "outline"}
              className="h-auto w-full justify-start whitespace-normal px-3 py-3 text-center md:text-left"
              onClick={() => {
                setSelectedSource(source);
                setMessage(copy.selected);
              }}
            >
              <span>
                <span className="block font-medium">{source.title}</span>
                <span className="block text-afh-caption opacity-80">
                  {source.author} · {source.year}
                </span>
              </span>
            </Button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="offline-title">{copy.offlineTitle}</Label>
            <Input
              id="offline-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offline-authors">{copy.authors}</Label>
            <Input
              id="offline-authors"
              value={authors}
              onChange={(event) => setAuthors(event.target.value)}
              placeholder={copy.authorsPlaceholder}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offline-year">{copy.year}</Label>
            <Input
              id="offline-year"
              type="number"
              min="1000"
              max="9999"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offline-kind">{copy.sourceKind}</Label>
            <Select
              value={sourceKind}
              onValueChange={(value) => {
                if (isSourceKind(value)) setSourceKind(value);
              }}
            >
              <SelectTrigger id="offline-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(copy.sourceKinds).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="offline-identifier">{copy.identifier}</Label>
            <Input
              id="offline-identifier"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={copy.identifierPlaceholder}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offline-publisher">{copy.publisher}</Label>
            <Input
              id="offline-publisher"
              value={publisher}
              onChange={(event) => setPublisher(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offline-url">{copy.url}</Label>
            <Input
              id="offline-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://…"
            />
          </div>
          <Button
            type="button"
            onClick={() => createReference.mutate()}
            disabled={
              !title.trim() ||
              !authors.trim() ||
              !year ||
              createReference.isPending
            }
          >
            {createReference.isPending ? copy.saving : copy.save}
          </Button>
        </div>
      )}

      {selectedSource && (
        <div className="space-y-4 border-t pt-4 min-[720px]:space-y-5 min-[720px]:pt-6">
          <p className="text-afh-small font-medium">
            {copy.selectedPrefix} {selectedSource.title}
          </p>

          {assertionId && (
            <div className="space-y-2">
              <Label htmlFor="reference-locator">{copy.locator}</Label>
              <Input
                id="reference-locator"
                value={locator}
                onChange={(event) => setLocator(event.target.value)}
                placeholder={copy.locatorPlaceholder}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => linkAssertion.mutate()}
                disabled={!locator.trim() || linkAssertion.isPending}
              >
                {linkAssertion.isPending ? copy.linking : copy.link}
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="reference-asset-kind">
                {copy.privateDocumentType}
              </Label>
              <Select
                value={assetKind}
                onValueChange={(value) => {
                  if (isAssetKind(value)) setAssetKind(value);
                }}
              >
                <SelectTrigger id="reference-asset-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scan">{copy.scan}</SelectItem>
                  <SelectItem value="ocr">{copy.ocr}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference-asset">{copy.addDocument}</Label>
              <Input
                id="reference-asset"
                type="file"
                accept="application/pdf,image/*,text/plain"
                onChange={(event) => setAsset(event.target.files?.[0] ?? null)}
              />
            </div>
            <p className="text-afh-small text-muted-foreground">
              {copy.privateHelp}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => uploadAsset.mutate()}
              disabled={!asset || uploadAsset.isPending}
            >
              {uploadAsset.isPending ? copy.uploading : copy.upload}
            </Button>
          </div>
        </div>
      )}

      {message && (
        <p className="text-afh-small" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
