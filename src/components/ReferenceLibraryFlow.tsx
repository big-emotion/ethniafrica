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
  evidence_tier: 1 | 2 | null;
  identifiers: Record<string, string>;
  publisher: string | null;
  url: string | null;
}

interface ReferenceLibraryResponse<T> {
  data: T;
}

export interface ReferenceLibraryFlowProps {
  assertionId?: string;
}

const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  intergovernmental: "Organisation intergouvernementale",
  government: "Institution publique",
  official_statistics: "Statistiques officielles",
  linguistic_reference: "Référence linguistique",
  academic: "Publication académique",
  community: "Organisation communautaire",
  repository: "Dépôt documentaire",
  archive: "Archive",
};

function isSourceKind(value: string): value is SourceKind {
  return value in SOURCE_KIND_LABELS;
}

function isAssetKind(value: string): value is "scan" | "ocr" {
  return value === "scan" || value === "ocr";
}

async function getAccessToken() {
  const { data } = await createBrowserSupabaseClient().auth.getSession();
  const token = data.session?.access_token;

  if (!token) throw new Error("Connectez-vous pour ajouter une référence.");
  return token;
}

async function readResponse<T>(response: Response): Promise<T> {
  const payload: ReferenceLibraryResponse<T> = await response.json();
  if (!response.ok) throw new Error("La demande n’a pas pu être traitée.");
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
}: ReferenceLibraryFlowProps) {
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
      const token = await getAccessToken();
      const response = await fetch(
        `/api/v2/reference-library?q=${encodeURIComponent(submittedSearch)}&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return readResponse<ReferenceSource[]>(response);
    },
    enabled: Boolean(submittedSearch),
  });

  const createReference = useMutation({
    mutationFn: async () => {
      const token = await getAccessToken();
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
          evidence_tier: null,
          identifiers: identifier.trim()
            ? { reference: identifier.trim() }
            : {},
          publisher: publisher.trim() || null,
          url: url.trim() || null,
        }),
      });
      const result = await readResponse<{ source: ReferenceSource }>(response);
      return result.source;
    },
    onSuccess: (source) => {
      setSelectedSource(source);
      setMessage(
        "Référence enregistrée. Vous pouvez ajouter un repère ou un document privé."
      );
    },
    onError: () => setMessage("La référence n’a pas pu être enregistrée."),
  });

  const linkAssertion = useMutation({
    mutationFn: async () => {
      if (!assertionId || !selectedSource) return;
      const token = await getAccessToken();
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
      await readResponse(response);
    },
    onSuccess: () => setMessage("Référence liée à l’assertion."),
    onError: () => setMessage("Le repère n’a pas pu être enregistré."),
  });

  const uploadAsset = useMutation({
    mutationFn: async () => {
      if (!selectedSource || !asset) return;
      const token = await getAccessToken();
      const formData = new FormData();
      formData.set("sourceId", selectedSource.id);
      formData.set("assetKind", assetKind);
      formData.set("file", asset);
      const response = await fetch("/api/v2/reference-library/assets", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      await readResponse(response);
    },
    onSuccess: () => {
      setMessage("Document privé enregistré.");
      setAsset(null);
    },
    onError: () => setMessage("Le document privé n’a pas pu être enregistré."),
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
        <h3 id="reference-library-title" className="text-lg font-semibold">
          Ajouter une référence
        </h3>
        <p className="text-sm text-muted-foreground">
          Recherchez une référence déjà vérifiée ou enregistrez un ouvrage que
          vous consultez hors ligne.
        </p>
      </div>

      <div
        className="flex flex-col gap-2 min-[720px]:flex-row"
        aria-label="Mode de référence"
      >
        <Button
          type="button"
          variant={mode === "search" ? "default" : "outline"}
          onClick={chooseSearch}
        >
          Rechercher dans la bibliothèque
        </Button>
        <Button
          type="button"
          variant={mode === "offline" ? "default" : "outline"}
          onClick={chooseOffline}
        >
          Enregistrer un ouvrage hors ligne
        </Button>
      </div>

      {mode === "search" ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="reference-search">
              Rechercher une référence existante
            </Label>
            <div className="flex flex-col gap-2 min-[720px]:flex-row">
              <Input
                id="reference-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Titre, auteur, éditeur…"
              />
              <Button
                type="button"
                onClick={submitSearch}
                disabled={!searchInput.trim()}
              >
                Rechercher
              </Button>
            </div>
          </div>

          {search.isLoading && (
            <p className="text-sm text-muted-foreground">Recherche en cours…</p>
          )}
          {search.isError && (
            <p className="text-sm text-destructive">
              La recherche n’a pas pu être effectuée.
            </p>
          )}
          {search.data?.map((source) => (
            <Button
              key={source.id}
              type="button"
              variant={selectedSource?.id === source.id ? "default" : "outline"}
              className="h-auto w-full justify-start whitespace-normal px-3 py-3 text-left"
              onClick={() => {
                setSelectedSource(source);
                setMessage("Référence sélectionnée.");
              }}
            >
              <span>
                <span className="block font-medium">{source.title}</span>
                <span className="block text-xs opacity-80">
                  {source.author} · {source.year}
                </span>
              </span>
            </Button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="offline-title">Titre de l’ouvrage</Label>
            <Input
              id="offline-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offline-authors">Auteur(s)</Label>
            <Input
              id="offline-authors"
              value={authors}
              onChange={(event) => setAuthors(event.target.value)}
              placeholder="Séparez plusieurs auteurs par un point-virgule"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offline-year">Année de publication</Label>
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
            <Label htmlFor="offline-kind">Type de source</Label>
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
                {Object.entries(SOURCE_KIND_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="offline-identifier">
              Identifiant bibliographique (ISBN, DOI ou cote)
            </Label>
            <Input
              id="offline-identifier"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Ex. ISBN 978-… ou cote ANC-1912-7"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offline-publisher">
              Éditeur ou institution (optionnel)
            </Label>
            <Input
              id="offline-publisher"
              value={publisher}
              onChange={(event) => setPublisher(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offline-url">URL (optionnelle)</Label>
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
            {createReference.isPending
              ? "Enregistrement…"
              : "Enregistrer la référence"}
          </Button>
        </div>
      )}

      {selectedSource && (
        <div className="space-y-4 border-t pt-4 min-[720px]:space-y-5 min-[720px]:pt-6">
          <p className="text-sm font-medium">
            Référence sélectionnée : {selectedSource.title}
          </p>

          {assertionId && (
            <div className="space-y-2">
              <Label htmlFor="reference-locator">
                Repère précis dans la source (optionnel)
              </Label>
              <Input
                id="reference-locator"
                value={locator}
                onChange={(event) => setLocator(event.target.value)}
                placeholder="Ex. p. 48, § 2 ou 01:32"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => linkAssertion.mutate()}
                disabled={!locator.trim() || linkAssertion.isPending}
              >
                {linkAssertion.isPending
                  ? "Association…"
                  : "Lier à l’assertion"}
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="reference-asset-kind">
                Type de document privé
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
                  <SelectItem value="scan">Scan</SelectItem>
                  <SelectItem value="ocr">Texte OCR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference-asset">
                Ajouter un scan ou un texte OCR
              </Label>
              <Input
                id="reference-asset"
                type="file"
                accept="application/pdf,image/*,text/plain"
                onChange={(event) => setAsset(event.target.files?.[0] ?? null)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Le scan ou le texte OCR reste privé et ne sera pas publié sans
              vérification des droits.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => uploadAsset.mutate()}
              disabled={!asset || uploadAsset.isPending}
            >
              {uploadAsset.isPending ? "Ajout…" : "Ajouter le document privé"}
            </Button>
          </div>
        </div>
      )}

      {message && (
        <p className="text-sm" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
