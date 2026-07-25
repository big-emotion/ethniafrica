import {
  createPrintableUrl,
  formatBibTeXCitation,
  formatMarkdownCitation,
  formatPlainTextCitation,
  type CitationFormatterInput,
} from "@/components/system/citation-formatters";
import { describe, expect, it } from "vitest";

const citation: CitationFormatterInput = {
  title: "Yorùbá (Èdè Yorùbá / Yoruba)",
  productName: "EthniAfrica",
  url: "https://ethniafrica.example/fr/peuples/yoruba?source=fiche#origines",
  accessedAt: new Date("2026-07-14T12:00:00.000Z"),
};

describe("citation formatters", () => {
  // @req REQ-021
  it("formats the exact plain-text citation contract", () => {
    expect(formatPlainTextCitation(citation)).toBe(
      "Yorùbá (Èdè Yorùbá / Yoruba). EthniAfrica. https://ethniafrica.example/fr/peuples/yoruba?source=fiche#origines. Consulté le 14 juillet 2026. CC-BY-SA 4.0."
    );
  });

  // @req REQ-021
  it("adds or replaces print=1 while preserving other query parameters and the hash", () => {
    expect(
      createPrintableUrl(
        "https://ethniafrica.example/fr/pays/senegal?print=0&source=map#population"
      )
    ).toBe(
      "https://ethniafrica.example/fr/pays/senegal?print=1&source=map#population"
    );

    expect(
      createPrintableUrl(
        "https://ethniafrica.example/fr/familles-linguistiques/atlantique#langues"
      )
    ).toBe(
      "https://ethniafrica.example/fr/familles-linguistiques/atlantique?print=1#langues"
    );

    expect(createPrintableUrl("/fr/peuples/seereer@v34")).toBe(
      "/fr/peuples/seereer@v34?print=1"
    );
  });

  // @req REQ-021
  it("preserves the license and escapes human text in BibTeX", () => {
    const bibtex = formatBibTeXCitation({
      ...citation,
      title: "N'Ko & Mandé {occidental}",
      productName: "EthniAfrica #1",
    });

    expect(bibtex).toContain("CC-BY-SA 4.0.");
    expect(bibtex).toContain("N'Ko \\& Mandé \\{occidental\\}");
    expect(bibtex).toContain("EthniAfrica \\#1");
    expect(bibtex).toContain(
      "https://ethniafrica.example/fr/peuples/yoruba?source=fiche\\#origines"
    );
  });

  // @req REQ-021
  it("preserves the license and escapes Markdown link text", () => {
    const markdown = formatMarkdownCitation({
      ...citation,
      title: "Yorùbá [archive] *vivante*",
      productName: "EthniAfrica",
    });

    expect(markdown).toBe(
      "[Yorùbá \\[archive\\] \\*vivante\\*](<https://ethniafrica.example/fr/peuples/yoruba?source=fiche#origines>). EthniAfrica. Consulté le 14 juillet 2026. CC-BY-SA 4.0."
    );
  });
});
