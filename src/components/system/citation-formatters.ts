import { formatDate } from "@/lib/languageTag";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";

export interface CitationFormatterInput {
  /** The locale the citation is read in: it sets the access date's form. */
  language: Language;
  title: string;
  productName: string;
  url: string;
  accessedAt: Date;
}

const LICENSE = "CC-BY-SA 4.0.";

// UTC so the access date a reader copies does not depend on where they sit.
const ACCESS_DATE: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
};

const bibTeXCharacters: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "{": "\\{",
  "}": "\\}",
  "#": "\\#",
  $: "\\$",
  "%": "\\%",
  "&": "\\&",
  _: "\\_",
  "^": "\\textasciicircum{}",
  "~": "\\textasciitilde{}",
};

function formatAccessDate(language: Language, date: Date): string {
  return formatDate(language, date, ACCESS_DATE);
}

function formatAccessDateIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function escapeBibTeX(value: string): string {
  return Array.from(
    value,
    (character) => bibTeXCharacters[character] ?? character
  ).join("");
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_[\]{}<>#+.!|()-])/g, "\\$1");
}

// @req REQ-021
export function createPrintableUrl(url: string): string {
  const isAbsoluteUrl = /^[a-z][a-z\d+.-]*:/i.test(url);
  const printableUrl = new URL(url, "https://citation.invalid");
  printableUrl.searchParams.set("print", "1");

  return isAbsoluteUrl
    ? printableUrl.toString()
    : `${printableUrl.pathname}${printableUrl.search}${printableUrl.hash}`;
}

// @req REQ-021
export function formatPlainTextCitation(input: CitationFormatterInput): string {
  const accessDate = formatAccessDate(input.language, input.accessedAt);
  const accessed = getTranslation(input.language).system.citation.accessed;

  return `${input.title}. ${input.productName}. ${input.url}. ${accessed} ${accessDate}. ${LICENSE}`;
}

// @req REQ-021
export function formatBibTeXCitation(input: CitationFormatterInput): string {
  const title = escapeBibTeX(input.title);
  const productName = escapeBibTeX(input.productName);
  const url = escapeBibTeX(input.url);
  const accessDate = formatAccessDate(input.language, input.accessedAt);
  const accessed = getTranslation(input.language).system.citation.accessed;
  const accessDateIso = formatAccessDateIso(input.accessedAt);
  const citationKey =
    `${input.productName}-${input.accessedAt.getUTCFullYear()}`
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

  return `@misc{${citationKey},
  title = {${title}},
  publisher = {${productName}},
  url = {${url}},
  urldate = {${accessDateIso}},
  note = {${accessed} ${accessDate}. ${LICENSE}}
}`;
}

// @req REQ-021
export function formatMarkdownCitation(input: CitationFormatterInput): string {
  const title = escapeMarkdown(input.title);
  const productName = escapeMarkdown(input.productName);
  const accessDate = formatAccessDate(input.language, input.accessedAt);
  const accessed = getTranslation(input.language).system.citation.accessed;

  return `[${title}](<${input.url}>). ${productName}. ${accessed} ${accessDate}. ${LICENSE}`;
}
