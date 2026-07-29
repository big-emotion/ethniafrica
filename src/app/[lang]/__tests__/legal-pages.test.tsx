import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AccessibilityPage from "@/app/[lang]/accessibilite/page";
import LegalNoticePage from "@/app/[lang]/mentions-legales/page";
import DataPolicyPage from "@/app/[lang]/politique-de-donnees/page";

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("footer destination pages", () => {
  // @req REQ-088
  it("identifies BIG EMOTION as EthniAfrica's publisher", () => {
    render(<LegalNoticePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Mentions légales" })
    ).toBeInTheDocument();
    expect(screen.getByText(/BIG EMOTION, SASU/i)).toBeInTheDocument();
    expect(screen.getByText(/Vercel Inc\./i)).toBeInTheDocument();
    expect(screen.getAllByText(/hello@big-emotion\.com/i)).not.toHaveLength(0);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Conception et réalisation",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /La conception et la réalisation du site ont été confiées à l’agence BIG EMOTION\./i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Site web : big-emotion\.com\./i)
    ).toBeInTheDocument();
  });

  // @req REQ-088
  it("describes EthniAfrica's actual data-processing categories", () => {
    render(<DataPolicyPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Politique de données" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Supabase/i)).toBeInTheDocument();
    expect(screen.getByText(/Plausible Analytics/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Sentry/i)).not.toHaveLength(0);
  });

  // @req REQ-090
  it("states accessibility status without claiming an unaudited score", () => {
    render(<AccessibilityPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Accessibilité" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/n’a pas encore fait l’objet d’un audit/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/contact@ethniafrica\.com/i)).toBeInTheDocument();
  });
});
