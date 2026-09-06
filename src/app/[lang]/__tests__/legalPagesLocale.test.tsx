import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AccessibilityPage, {
  generateMetadata as generateAccessibilityMetadata,
} from "../accessibilite/page";
import LegalNoticePage, {
  generateMetadata as generateLegalNoticeMetadata,
} from "../mentions-legales/page";
import DataPolicyPage, {
  generateMetadata as generateDataPolicyMetadata,
} from "../politique-de-donnees/page";

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));

const params = (lang: string) => Promise.resolve({ lang });

describe("the legal pages by route locale", () => {
  // The English legal bank includes its own machine-translation and
  // French-prevails notice. Serving the French document here would hide both.
  // @req REQ-141
  // @req REQ-145
  it.each([
    ["Legal notice", LegalNoticePage, generateLegalNoticeMetadata],
    ["Data policy", DataPolicyPage, generateDataPolicyMetadata],
    ["Accessibility", AccessibilityPage, generateAccessibilityMetadata],
  ] as const)(
    "serves the English %s document and metadata",
    async (title, Page, metadataFor) => {
      render(await Page({ params: params("en") }));

      expect(
        screen.getByRole("heading", { level: 1, name: title })
      ).toBeInTheDocument();
      expect(screen.getByText("Translation notice")).toBeInTheDocument();
      expect((await metadataFor({ params: params("en") })).title).toBe(title);
    }
  );

  // @req REQ-088
  it("preserves the authored French legal notice on /fr", async () => {
    render(await LegalNoticePage({ params: params("fr") }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Mentions légales" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Translation notice")).not.toBeInTheDocument();
  });
});
