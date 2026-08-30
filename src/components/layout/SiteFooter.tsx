"use client";

import Image from "next/image";
import Link from "next/link";
import { useConsent } from "@/hooks/use-consent";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";

interface SiteFooterProps {
  language: Language;
}

// @req REQ-046
export function SiteFooter({ language }: SiteFooterProps) {
  const { setShowBanner } = useConsent();
  const { footer } = getTranslation(language);
  const year = new Date().getFullYear();

  return (
    <footer
      className="border-t border-afh-border bg-afh-bg-warm text-afh-text-soft"
      data-testid="site-footer"
    >
      <div
        data-testid="footer-content"
        className="afh-shell flex flex-col gap-4 py-8 text-afh-small"
      >
        {/* Row 1 — everywhere the footer can take you.
            « À propos » sits outside the legal nav rather than inside it: it
            is editorial, so filing it under "Informations légales" would make
            that landmark's accessible name inaccurate. */}
        <div
          data-testid="footer-links"
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
        >
          <Link
            href={`/${language}/about`}
            className="underline decoration-border underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {footer.about}
          </Link>
          <Link
            href="/docs/api/v2"
            className="underline decoration-border underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {footer.api}
          </Link>

          <nav aria-label={footer.legalNavigationLabel}>
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <li>
                <Link
                  href={`/${language}/mentions-legales`}
                  className="underline decoration-border underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {footer.legalNotice}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${language}/politique-de-donnees`}
                  className="underline decoration-border underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {footer.dataPolicy}
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setShowBanner(true)}
                  className="underline decoration-border underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {footer.cookieSettings}
                </button>
              </li>
              <li>
                <Link
                  href={`/${language}/accessibilite`}
                  className="underline decoration-border underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {footer.accessibility}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${language}/plan-du-site`}
                  className="underline decoration-border underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {footer.sitemap}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Row 2 — who owns this. The one line in the footer that is not a
            destination, which is exactly why it stopped sharing a row with
            five things that are. */}
        <p data-testid="footer-ownership">
          © {year} {footer.copyright}
        </p>

        {/* Row 3 — who built it. */}
        <div data-testid="footer-credit">
          <a
            href="https://big-emotion.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>{footer.attribution}</span>
            <Image
              src="/brand/big-emotion.svg"
              alt={footer.partnerLogoAlt}
              width={159}
              height={81}
              className="h-auto w-16"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
