"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FacebookGlyph,
  InstagramGlyph,
  LinkedinGlyph,
} from "@/components/layout/SocialGlyphs";
import { useConsent } from "@/hooks/use-consent";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";
import { getLocalizedRoute } from "@/lib/routing";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";

interface SiteFooterProps {
  language: Language;
}

/**
 * Written once rather than seven times. The seven copies it replaces were
 * identical, which is exactly why the eighth would not have been.
 */
const FOOTER_LINK_CLASS =
  "underline decoration-border underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Where the project is followed, and where it will be.
 *
 * `href: null` is the honest state for an account that is not open yet: the
 * network is named, its mark is drawn, and nothing pretends to be clickable.
 * Give an entry a URL and it becomes a link — that is the whole edit.
 */
const SOCIAL_NETWORKS: ReadonlyArray<{
  name: string;
  Glyph: (props: { className?: string }) => JSX.Element;
  href: string | null;
}> = [
  { name: "Facebook", Glyph: FacebookGlyph, href: null },
  { name: "LinkedIn", Glyph: LinkedinGlyph, href: null },
  { name: "Instagram", Glyph: InstagramGlyph, href: null },
];

// @req REQ-046
export function SiteFooter({ language }: SiteFooterProps) {
  const { setShowBanner } = useConsent();
  const { footer } = getTranslation(language);
  const { directory } = footer;
  const year = new Date().getFullYear();

  const rubrics = [
    {
      id: "explorer",
      heading: directory.explorerHeading,
      links: [
        {
          label: directory.countries,
          href: getLocalizedRoute(language, "countries"),
        },
        {
          label: directory.peoples,
          href: getLocalizedRoute(language, "peoples"),
        },
        {
          label: directory.families,
          href: getLocalizedRoute(language, "families"),
        },
      ],
    },
    {
      id: "participer",
      heading: directory.participateHeading,
      links: [
        { label: directory.contribute, href: `/${language}/contribute` },
        { label: directory.reportError, href: `/${language}/report-error` },
      ],
    },
  ];

  return (
    <footer
      className="border-t border-afh-border bg-afh-bg-warm text-afh-text-soft"
      data-testid="site-footer"
    >
      <div
        data-testid="footer-content"
        className="afh-shell flex flex-col gap-afh-lg py-afh-xl text-afh-small"
      >
        {/* Étage 1 — the directory. A reader who reached the bottom of a
            fiche was previously offered the mentions légales and nothing
            else; the rubrics the atlas is made of belong here too. */}
        {/* The four blocks are siblings, not a mark plus a bundle of three:
            `justify-between` spreads whatever it is given, so wrapping the
            rubrics dropped the entire gap between the mark and the first
            rubric and left the directory hugging the right edge. Flat, they
            space themselves across the shell. */}
        <div
          data-testid="footer-directory"
          className="flex flex-col items-center gap-afh-xl text-center md:flex-row md:items-start md:justify-between md:gap-afh-lg md:text-left"
        >
          {/* The mark, the name and what the site is — none of them a link:
              the masthead already carries the way home, and a second one at
              the bottom of the page is a destination the reader has to rule
              out rather than use. */}
          <div
            data-testid="footer-brand"
            className="flex flex-col items-center gap-afh-xs md:items-start"
          >
            <Image
              src="/africa.png"
              alt=""
              width={80}
              height={80}
              className="h-20 w-20"
            />
            <span className="font-afh-display text-afh-h1 text-afh-text">
              {PRODUCT_NAME}
            </span>
            {/* The qualifier the masthead sets in the warm gradient, here in
                the mark's full spectrum: the footer is the one place with the
                room to run all five hues at a size that reads. */}
            <span
              data-testid="footer-tagline"
              className="afh-brand-spectrum font-afh-display text-afh-lead font-bold"
            >
              {PRODUCT_TAGLINE}
            </span>
          </div>

          {rubrics.map((rubric) => (
            <nav key={rubric.id} aria-labelledby={`footer-rubric-${rubric.id}`}>
              <p
                id={`footer-rubric-${rubric.id}`}
                className="font-afh-display text-afh-h1 text-afh-text"
              >
                {rubric.heading}
              </p>
              <ul className="mt-afh-sm flex flex-col gap-afh-xs text-afh-lead">
                {rubric.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={FOOTER_LINK_CLASS}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <p className="font-afh-display text-afh-h1 text-afh-text">
              {directory.followHeading}
            </p>
            {/* Each mark keeps a 44px hit area, which insets the glyph by
                  12px inside it. Pulled back by the same 12px so the first
                  glyph sits on the heading's edge rather than a tap target's. */}
            <ul
              data-testid="footer-follow"
              className="mt-afh-sm flex items-center justify-center gap-afh-sm sm:-ml-3 sm:justify-start"
            >
              {SOCIAL_NETWORKS.map(({ name, Glyph, href }) => (
                <li key={name}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={name}
                      className="inline-flex h-11 w-11 items-center justify-center transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Glyph className="h-5 w-5" />
                    </a>
                  ) : (
                    <span
                      role="img"
                      aria-label={`${name} — ${directory.followPending}`}
                      className="inline-flex h-11 w-11 items-center justify-center text-afh-fg-muted"
                    >
                      <Glyph className="h-5 w-5" />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <hr className="border-afh-border" />

        {/* Étage 2, row 1 — everywhere else the footer can take you.
            « À propos » sits outside the legal nav rather than inside it: it
            is editorial, so filing it under "Informations légales" would make
            that landmark's accessible name inaccurate. */}
        <div
          data-testid="footer-links"
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
        >
          <Link href={`/${language}/about`} className={FOOTER_LINK_CLASS}>
            {footer.about}
          </Link>
          <Link href="/docs/api/v2" className={FOOTER_LINK_CLASS}>
            {footer.api}
          </Link>

          <nav aria-label={footer.legalNavigationLabel}>
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <li>
                <Link
                  href={`/${language}/mentions-legales`}
                  className={FOOTER_LINK_CLASS}
                >
                  {footer.legalNotice}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${language}/politique-de-donnees`}
                  className={FOOTER_LINK_CLASS}
                >
                  {footer.dataPolicy}
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setShowBanner(true)}
                  className={FOOTER_LINK_CLASS}
                >
                  {footer.cookieSettings}
                </button>
              </li>
              <li>
                <Link
                  href={`/${language}/accessibilite`}
                  className={FOOTER_LINK_CLASS}
                >
                  {footer.accessibility}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${language}/plan-du-site`}
                  className={FOOTER_LINK_CLASS}
                >
                  {footer.sitemap}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Étage 2, row 2 — who owns this and who built it. The same
            statement said twice, so it reads as one line rather than two. */}
        <div
          data-testid="footer-baseline"
          className="flex flex-wrap items-center justify-center gap-x-afh-base gap-y-afh-xs"
        >
          <p data-testid="footer-ownership">
            © {year} {footer.copyright}
          </p>

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
      </div>
    </footer>
  );
}
