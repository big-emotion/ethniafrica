"use client";

import { Copy, Printer } from "lucide-react";
import * as React from "react";

import {
  createPrintableUrl,
  formatBibTeXCitation,
  formatMarkdownCitation,
  formatPlainTextCitation,
  type CitationFormatterInput,
} from "@/components/system/citation-formatters";
import { PRODUCT_NAME } from "@/lib/brand";
import { getTranslation } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Language } from "@/types/shared";

export type CitationFormat = "text" | "bibtex" | "markdown";
export type CitationVariant = "live" | "pinned";

export interface CitationPinnedVersion {
  version: number | string;
  url: string;
}

export interface CitationBlockProps {
  language: Language;
  title: string;
  liveUrl: string;
  pinned?: CitationPinnedVersion;
  productName?: string;
  accessedAt?: Date;
  defaultFormat?: CitationFormat;
  defaultVariant?: CitationVariant;
}

function formatCitation(
  format: CitationFormat,
  input: CitationFormatterInput
): string {
  if (format === "bibtex") return formatBibTeXCitation(input);
  if (format === "markdown") return formatMarkdownCitation(input);
  return formatPlainTextCitation(input);
}

function isCitationFormat(value: string): value is CitationFormat {
  return value === "text" || value === "bibtex" || value === "markdown";
}

function isCitationVariant(value: string): value is CitationVariant {
  return value === "live" || value === "pinned";
}

// @req REQ-021
export function CitationBlock({
  language,
  title,
  liveUrl,
  pinned,
  productName = PRODUCT_NAME,
  accessedAt,
  defaultFormat = "text",
  defaultVariant = "live",
}: CitationBlockProps) {
  const copy = getTranslation(language).system.citation;
  const formatLabels: Record<CitationFormat, string> = {
    text: copy.textFormat,
    bibtex: "BibTeX",
    markdown: "Markdown",
  };
  const previewRef = React.useRef<HTMLTextAreaElement>(null);
  const announcementTimerRef = React.useRef<number | null>(null);
  const titleId = React.useId();
  const [initialAccessedAt] = React.useState(() => accessedAt ?? new Date());
  const [format, setFormat] = React.useState<CitationFormat>(defaultFormat);
  const [selectedVariant, setSelectedVariant] = React.useState<CitationVariant>(
    defaultVariant === "pinned" && pinned ? "pinned" : "live"
  );
  const [announcement, setAnnouncement] = React.useState("");

  const activeVariant =
    selectedVariant === "pinned" && pinned ? "pinned" : "live";
  const activeUrl = activeVariant === "pinned" && pinned ? pinned.url : liveUrl;
  const citation = formatCitation(format, {
    language,
    title,
    productName,
    url: activeUrl,
    accessedAt: accessedAt ?? initialAccessedAt,
  });

  React.useEffect(
    () => () => {
      if (announcementTimerRef.current !== null) {
        window.clearTimeout(announcementTimerRef.current);
      }
    },
    []
  );

  function announceCopySuccess() {
    setAnnouncement(copy.copied);
    if (announcementTimerRef.current !== null) {
      window.clearTimeout(announcementTimerRef.current);
    }
    announcementTimerRef.current = window.setTimeout(() => {
      setAnnouncement("");
    }, 2000);
  }

  function selectPreviewForManualCopy() {
    const preview = previewRef.current;
    preview?.focus();
    preview?.select();
    setAnnouncement(copy.manualCopy);
  }

  async function copyCitation() {
    try {
      if (!navigator.clipboard?.writeText) {
        selectPreviewForManualCopy();
        return;
      }
      await navigator.clipboard.writeText(citation);
      announceCopySuccess();
    } catch {
      selectPreviewForManualCopy();
    }
  }

  return (
    <section
      data-citation-block
      data-testid="citation-block"
      data-variant={activeVariant}
      aria-labelledby={titleId}
      className="relative overflow-hidden rounded-afh-xl border border-afh-border bg-afh-surface font-afh text-afh-text shadow-afh-2"
    >
      <div className="h-1 bg-afh-terracotta" aria-hidden="true" />

      <div className="space-y-afh-4xl p-afh-3xl md:p-afh-5xl">
        <header className="border-b border-afh-border pb-afh-2xl">
          <p className="text-afh-eyebrow font-bold uppercase tracking-wider text-afh-terracotta">
            {copy.eyebrow}
          </p>
          <h2
            id={titleId}
            className="mt-afh-xs font-afh-display text-afh-h2 font-semibold leading-snug text-afh-text"
          >
            {copy.title}
          </h2>
          <p className="mt-afh-md text-afh-small leading-relaxed text-afh-text-soft">
            {copy.description}
          </p>
        </header>

        <Tabs
          value={activeVariant}
          onValueChange={(value) => {
            if (isCitationVariant(value)) setSelectedVariant(value);
          }}
        >
          <TabsList
            aria-label={copy.versionLabel}
            className="h-auto w-full justify-start gap-afh-xs rounded-afh-md border border-afh-border bg-afh-bg-warm p-afh-xs"
          >
            <TabsTrigger
              value="live"
              className="min-h-10 flex-1 rounded-afh-sm px-afh-lg text-afh-small text-afh-text-soft data-[state=active]:bg-afh-surface data-[state=active]:text-afh-text data-[state=active]:shadow-afh-1"
            >
              {copy.liveVersion}
            </TabsTrigger>
            {pinned ? (
              <TabsTrigger
                value="pinned"
                className="min-h-10 flex-1 rounded-afh-sm px-afh-lg text-afh-small text-afh-text-soft data-[state=active]:bg-afh-surface data-[state=active]:text-afh-text data-[state=active]:shadow-afh-1"
              >
                {copy.pinnedVersion} @v{pinned.version}
              </TabsTrigger>
            ) : null}
          </TabsList>
          <TabsContent value="live" className="sr-only">
            {copy.liveDescription}
          </TabsContent>
          {pinned ? (
            <TabsContent value="pinned" className="sr-only">
              {copy.pinnedDescription} @v{pinned.version}.
            </TabsContent>
          ) : null}
        </Tabs>

        <div className="space-y-afh-md">
          <label
            htmlFor={`${titleId}-format`}
            className="block text-afh-caption font-bold text-afh-text-soft"
          >
            {copy.format}
          </label>
          <Select
            value={format}
            onValueChange={(value) => {
              if (isCitationFormat(value)) setFormat(value);
            }}
          >
            <SelectTrigger
              id={`${titleId}-format`}
              aria-label={copy.format}
              className="border-afh-border bg-afh-surface font-afh text-afh-small text-afh-text focus:ring-afh-terracotta"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-afh-border bg-afh-surface font-afh text-afh-text">
              {Object.entries(formatLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative">
          <textarea
            ref={previewRef}
            aria-label={copy.preview}
            readOnly
            spellCheck={false}
            value={citation}
            className="min-h-36 w-full resize-y rounded-afh-md border border-afh-border bg-afh-bg px-afh-2xl py-afh-xl font-mono text-afh-small leading-relaxed text-afh-text outline-none focus-visible:ring-2 focus-visible:ring-afh-terracotta focus-visible:ring-offset-2"
          />
          <span className="pointer-events-none absolute bottom-afh-base right-afh-base text-afh-eyebrow font-bold uppercase tracking-wider text-afh-text-soft">
            {formatLabels[format]}
          </span>
        </div>

        <div className="flex flex-col gap-afh-md md:flex-row md:items-center">
          <Button
            type="button"
            onClick={copyCitation}
            // The colour stays — it is the citation apparatus's own — but the
            // radius override goes: a control takes the control radius
            // wherever it stands, including inside the source layer.
            className="w-full bg-afh-earth font-afh text-afh-small text-afh-surface hover:bg-afh-terracotta md:w-auto"
          >
            <Copy aria-hidden="true" />
            {copy.copy}
          </Button>
          <Button
            asChild
            variant="link"
            className="h-auto w-full justify-start px-0 font-afh text-afh-small text-afh-terracotta md:w-auto md:px-afh-md"
          >
            <a
              href={createPrintableUrl(activeUrl)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Printer aria-hidden="true" />
              {copy.printable}
            </a>
          </Button>
          <p
            role="status"
            aria-live="polite"
            className="min-h-5 text-afh-caption font-semibold text-afh-earth md:ml-auto"
          >
            {announcement}
          </p>
        </div>

        <footer className="flex items-center gap-afh-md border-t border-afh-border pt-afh-xl text-afh-caption text-afh-text-soft">
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-afh-gold"
            aria-hidden="true"
          />
          <span>
            {copy.sharingLicence}&nbsp;:{" "}
            <strong className="font-bold text-afh-text">CC-BY-SA 4.0</strong>
          </span>
        </footer>
      </div>
    </section>
  );
}
