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
        className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:px-6 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-6 md:gap-y-3 xl:flex-row xl:flex-nowrap xl:px-8"
      >
        {/* « À propos » sits by the copyright rather than in the legal nav:
            it is editorial, so filing it under "Informations légales" would
            make that landmark's accessible name inaccurate. */}
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm">
          <p>
            © {year} {footer.copyright}
          </p>
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
        </div>

        <nav
          aria-label={footer.legalNavigationLabel}
          className="order-3 w-full xl:order-none xl:w-auto"
        >
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm xl:flex-nowrap">
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

        <a
          href="https://big-emotion.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-2 text-xs transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
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
    </footer>
  );
}
