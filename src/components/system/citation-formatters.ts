export interface CitationFormatterInput {
  title: string;
  productName: string;
  url: string;
  accessedAt: Date;
}

const LICENSE = "CC-BY-SA 4.0.";

const frenchDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

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

function formatAccessDate(date: Date): string {
  return frenchDateFormatter.format(date);
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
  const accessDate = formatAccessDate(input.accessedAt);

  return `${input.title}. ${input.productName}. ${input.url}. Consulté le ${accessDate}. ${LICENSE}`;
}

// @req REQ-021
export function formatBibTeXCitation(input: CitationFormatterInput): string {
  const title = escapeBibTeX(input.title);
  const productName = escapeBibTeX(input.productName);
  const url = escapeBibTeX(input.url);
  const accessDate = formatAccessDate(input.accessedAt);
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
  note = {Consulté le ${accessDate}. ${LICENSE}}
}`;
}

// @req REQ-021
export function formatMarkdownCitation(input: CitationFormatterInput): string {
  const title = escapeMarkdown(input.title);
  const productName = escapeMarkdown(input.productName);
  const accessDate = formatAccessDate(input.accessedAt);

  return `[${title}](<${input.url}>). ${productName}. Consulté le ${accessDate}. ${LICENSE}`;
}
