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
  // The company slug carries a typographic apostrophe (U+2019), kept
  // percent-encoded so the URL survives copy, log and redirect untouched.
  {
    name: "LinkedIn",
    Glyph: LinkedinGlyph,
    href: "https://www.linkedin.com/company/dictionnaire-des-ethnies-d%E2%80%99afrique/",
  },
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
        {
          label: directory.languages,
          href: getLocalizedRoute(language, "languages"),
        },
        {
          label: directory.patronymes,
          href: getLocalizedRoute(language, "patronymes"),
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
    // Doctrine, À propos and Sources describe the project, not the corpus,
    // so the three access modes stopped listing them. A rubric here is where
    // they land: the footer is the one part of the chrome that is allowed to
    // name the site itself rather than a way into it.
    {
      id: "projet",
      heading: directory.projectHeading,
      links: [
        {
          label: directory.doctrine,
          href: getLocalizedRoute(language, "doctrine"),
        },
        {
          label: directory.about,
          href: getLocalizedRoute(language, "about"),
        },
        {
          label: directory.sources,
          href: getLocalizedRoute(language, "sources"),
        },
        // The glossary belongs to the project rather than to an axis: it
        // serves the atlas, the dossiers and the games alike, so filing it
        // under one of them would invent an ancestor the menu never offers.
        {
          label: directory.glossary,
          href: getLocalizedRoute(language, "glossary"),
        },
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
          className="flex flex-col items-center gap-afh-6xl text-center md:flex-row md:items-start md:justify-between md:gap-afh-lg md:text-left"
        >
          {/* The mark, the name and what the site is — none of them a link:
              the masthead already carries the way home, and a second one at
              the bottom of the page is a destination the reader has to rule
              out rather than use. */}
          {/* Mark to the left of the name, qualifier under the name — the
              masthead's own geometry, at twice its size. Stacked vertically
              the three parts read as three things; beside each other they
              read as one mark. It also widens the block by the mark, which is
              what starts the rubrics at a third of the measure rather than a
              quarter. */}
          <div
            data-testid="footer-brand"
            className="flex items-center gap-afh-lg"
          >
            <Image
              src="/africa.png"
              alt=""
              width={80}
              height={80}
              className="h-20 w-20 shrink-0"
            />
            <span className="flex flex-col text-left">
              {/* The masthead lockup, one role up because the mark beside it is
                  80px rather than 44px. Not `h1`: that role belongs to the fiche
                  the reader has just finished, and a wordmark that matches it
                  makes the page look like it has two titles. */}
              <span className="font-afh-display text-afh-h2 text-afh-text">
                {PRODUCT_NAME}
              </span>
              {/* The same qualifier as the masthead, in the same gradient. It
                  ran in a five-hue ramp of its own until the two treatments were
                  seen on one page: one lockup, one colour. */}
              <span
                data-testid="footer-tagline"
                className="afh-brand-tagline font-afh-display text-afh-small font-bold"
              >
                {PRODUCT_TAGLINE}
              </span>
            </span>
          </div>

          {rubrics.map((rubric) => (
            <nav key={rubric.id} aria-labelledby={`footer-rubric-${rubric.id}`}>
              {/* A card title, not a page title (typography-charter §4):
                  display family at body size. At `h1` three navigation labels
                  outweighed the heading of the document they sit under. */}
              <p
                id={`footer-rubric-${rubric.id}`}
                className="font-afh-display text-afh-body font-bold text-afh-text"
              >
                {rubric.heading}
              </p>
              {/* The links take the column's own `small`: a footer link is a
                  control label, and at `lead` it outran its rubric heading.
                  Their spacing is the column's, not the type's: at a 4px gap
                  three underlined labels stacked into one grey block and the
                  rubric read as a paragraph rather than a list. */}
              <ul className="mt-afh-5xl flex flex-col gap-afh-lg">
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
            <p className="font-afh-display text-afh-body font-bold text-afh-text">
              {directory.followHeading}
            </p>
            {/* Each mark keeps a 44px hit area, which insets the glyph by
                  12px inside it. Pulled back by the same 12px so the first
                  glyph sits on the heading's edge rather than a tap target's,
                  and given half the rubrics' top margin for the same reason:
                  the other 12px is already inside the target. */}
            <ul
              data-testid="footer-follow"
              className="mt-afh-lg flex items-center justify-center gap-afh-sm sm:-ml-3 sm:justify-start"
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

        {/* The column's `gap` is the rhythm inside an étage; the rule is what
            separates the two. Left on the gap alone, the directory and the
            legal block read as one queue of eight rows. */}
        <hr
          data-testid="footer-rule"
          className="my-afh-5xl border-afh-border"
        />

        {/* Étage 2, row 1 — everywhere else the footer can take you.
            « À propos » used to open this row. It moved up into the « Le
            projet » rubric with the doctrine, where a reader looking for the
            project finds both at once; kept here as well it was the same
            destination offered twice on one screen. The API link stays: it is
            a developer's entry, on no rubric and in no landmark, and it sits
            outside the legal nav so that landmark's accessible name keeps
            describing what is actually under it. */}
        <div
          data-testid="footer-links"
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
        >
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
