import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ATTRIBUTION_STRING } from "@/lib/brand";
import * as consentModule from "@/hooks/use-consent";
import { getStaticPageRoute } from "@/lib/routing";
import { getTranslation } from "@/lib/translations";

vi.mock("@/hooks/use-consent", () => ({
  useConsent: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    className,
  }: {
    alt: string;
    src: string;
    width: number;
    height: number;
    className?: string;
  }) => <span role="img" aria-label={alt} className={className} />,
}));

describe("SiteFooter", () => {
  const setShowBanner = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(consentModule.useConsent).mockReturnValue({
      consentState: {
        hasConsented: true,
        preferences: {
          essential: true,
          analytics: false,
          functional: false,
        },
        consentDate: "2026-07-25T00:00:00.000Z",
      },
      acceptAll: vi.fn(),
      rejectAll: vi.fn(),
      updatePreferences: vi.fn(),
      showBanner: false,
      setShowBanner,
    });
  });

  // @req REQ-088
  it("presents BIG EMOTION as the linked creative partner", () => {
    render(<SiteFooter language="fr" />);

    const partnerLink = screen.getByRole("link", {
      name: "Fait avec émotion pour l'Afrique BIG EMOTION",
    });
    const partnerLogo = screen.getByRole("img", { name: "BIG EMOTION" });

    expect(partnerLink).toHaveAttribute("href", "https://big-emotion.com/");
    expect(partnerLink).toHaveAttribute("target", "_blank");
    expect(partnerLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText(ATTRIBUTION_STRING)).toBeInTheDocument();
    expect(partnerLogo).toHaveClass("w-16");
    expect(partnerLogo).not.toHaveClass("opacity-80");
  });

  // @req REQ-047
  // @req [16.3]
  it("uses the parchment footer surface without a separate brand panel", () => {
    render(<SiteFooter language="fr" />);

    const footer = screen.getByTestId("site-footer");
    const content = screen.getByTestId("footer-content");

    expect(footer).toHaveClass("bg-afh-bg-warm", "text-afh-text-soft");
    expect(footer).not.toHaveClass("bg-card", "bg-afh-earth");
    // The content is three declared rows on the shared shell box, not the
    // wrapping flex row it used to be — at which width the copyright landed
    // between two links was a property of the window.
    expect(content).toHaveClass("afh-shell", "flex-col");
    expect(footer.innerHTML).not.toContain("64_100%_57%");
  });

  // @req REQ-088
  // @req [16.3]
  it("reads the attribution string from brand.ts, never a hardcoded literal", () => {
    render(<SiteFooter language="fr" />);

    expect(screen.getByText(ATTRIBUTION_STRING)).toBeInTheDocument();
    expect(
      screen.queryByText("Conçu avec émotion pour l’Afrique.")
    ).not.toBeInTheDocument();
  });

  // @req REQ-088
  it("links every required legal destination", () => {
    render(<SiteFooter language="fr" />);

    expect(
      screen.getByRole("link", { name: "Mentions légales" })
    ).toHaveAttribute("href", "/fr/mentions-legales");
    expect(
      screen.getByRole("link", { name: "Politique de données" })
    ).toHaveAttribute("href", "/fr/politique-de-donnees");
    expect(screen.getByRole("link", { name: "Accessibilité" })).toHaveAttribute(
      "href",
      "/fr/accessibilite"
    );
  });

  // The legal row composed `/${language}/mentions-legales`, which under `/en`
  // is a French slug the middleware has to redirect: one hop on every legal
  // click from an English page.
  // @req REQ-141
  it("composes the legal destinations in the English vocabulary under /en", () => {
    const { footer } = getTranslation("en");
    render(<SiteFooter language="en" />);

    expect(
      screen.getByRole("link", { name: footer.legalNotice })
    ).toHaveAttribute("href", getStaticPageRoute("en", "legalNotice"));
    expect(
      screen.getByRole("link", { name: footer.dataPolicy })
    ).toHaveAttribute("href", getStaticPageRoute("en", "dataPolicy"));
    expect(
      screen.getByRole("link", { name: footer.accessibility })
    ).toHaveAttribute("href", getStaticPageRoute("en", "accessibility"));
    expect(screen.getByRole("link", { name: footer.sitemap })).toHaveAttribute(
      "href",
      getStaticPageRoute("en", "sitemap")
    );
    expect(
      screen.getByRole("link", { name: footer.directory.contribute })
    ).toHaveAttribute("href", getStaticPageRoute("en", "contribute"));
  });

  // Once, and from the « Le projet » rubric — not once there and once again
  // in the row below it.
  // @req REQ-088
  it("offers À propos exactly once, as a footer destination", () => {
    render(<SiteFooter language="fr" />);

    expect(screen.getAllByRole("link", { name: "À propos" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "À propos" })).toHaveAttribute(
      "href",
      "/fr/about"
    );
  });

  // « À propos » is editorial, not legal — keeping it out of the legal landmark
  // is what lets that landmark's name stay accurate.
  // @req REQ-088
  it("keeps À propos outside the legal navigation landmark", () => {
    render(<SiteFooter language="fr" />);

    const legalNavigation = screen.getByRole("navigation", {
      name: "Informations légales",
    });

    expect(
      within(legalNavigation).queryByRole("link", { name: "À propos" })
    ).not.toBeInTheDocument();
  });

  // @req REQ-046
  it("reopens cookie preferences from the footer", () => {
    render(<SiteFooter language="fr" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Gestion des cookies" })
    );

    expect(setShowBanner).toHaveBeenCalledWith(true);
  });

  // The line names the corpus licence rather than reserving rights: the API
  // meta and every citation this site emits declare CC BY-SA 4.0, so the old
  // "tous droits réservés" contradicted the citation block above it. Brand
  // charter §2.
  // @req REQ-087
  it("states the corpus licence in the copyright line, without a data-source claim", () => {
    render(<SiteFooter language="fr" />);

    expect(
      screen.getByText(
        `© ${new Date().getFullYear()} EthniAfrica — corpus sous licence CC BY-SA 4.0.`
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/Data sources/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Official demographic estimates/i)
    ).not.toBeInTheDocument();
  });
});
