"use client";

import type { ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FacebookGlyph,
  InstagramGlyph,
  LinkedinGlyph,
  TiktokGlyph,
  YoutubeGlyph,
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
// Every footer link is a row in a nav list, never a word inside a sentence, so
// none of them takes WCAG 2.5.8's inline exception: at 22px they missed even
// its 24px AA minimum, well under the 44px this project's own UX spec asks of a
// control. `inline-flex` + `min-h-11` gives the row the target without
// touching the type, which stays at the column's `small`.
// `min-w-11` as well as `min-h-11`: a short label — « API », « Noms » — drew a
// 26px-wide target however tall the row was, and the floor is a square.
const FOOTER_LINK_CLASS =
  "inline-flex min-h-11 min-w-11 items-center justify-center underline decoration-border underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Where the project is followed, and where it will be.
 *
 * `href: null` is the honest state for an account that is not open yet: the
 * network is named, its mark is drawn, and nothing pretends to be clickable.
 * Give an entry a URL and it becomes a link — that is the whole edit.
 */
const SOCIAL_NETWORKS: ReadonlyArray<{
  name: string;
  Glyph: (props: { className?: string }) => ReactElement;
  href: string | null;
}> = [
  {
    name: "Facebook",
    Glyph: FacebookGlyph,
    href: "https://www.facebook.com/profile.php?id=61593966096643",
  },
  // The company slug carries a typographic apostrophe (U+2019), kept
  // percent-encoded so the URL survives copy, log and redirect untouched.
  {
    name: "LinkedIn",
    Glyph: LinkedinGlyph,
    href: "https://www.linkedin.com/company/dictionnaire-des-ethnies-d%E2%80%99afrique/",
  },
  {
    name: "Instagram",
    Glyph: InstagramGlyph,
    href: "https://www.instagram.com/ethniafrica/",
  },
  {
    name: "TikTok",
    Glyph: TiktokGlyph,
    href: "https://www.tiktok.com/@ethniafrica",
  },
  {
    name: "YouTube",
    Glyph: YoutubeGlyph,
    href: "https://www.youtube.com/channel/UCcJiwOQJ7-ajWnYFTDTOt0A",
  },
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
    // À propos and Sources describe the project, not the corpus, so the
    // three access modes stopped listing them. A rubric here is where they
    // land: the footer is the one part of the chrome that is allowed to name
    // the site itself rather than a way into it. Doctrine used to be a
    // fourth entry here, but that duplicated the link now carried inline on
    // the À propos page itself — one rubric away rather than one column away.
    {
      id: "projet",
      heading: directory.projectHeading,
      links: [
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
        // Contact sits under the project rather than under Participer: the
        // two rubrics beside it are ways of correcting the corpus, and this
        // one is a way of reaching whoever publishes it.
        { label: directory.contact, href: `/${language}/contact` },
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
          // `md:flex-wrap`, because the row is entered on a media query and
          // sized in rem: at 200% text zoom an 800px viewport still matches
          // `md`, so the columns lined up in a row that no longer fitted and
          // ran 253px past the edge of the document. Wrapping lets the last
          // column drop instead — the same reflow WCAG 1.4.10 asks for, and
          // the only one available to a row whose content cannot shrink.
          className="flex flex-col items-center gap-afh-6xl text-center md:flex-row md:flex-wrap md:items-start md:justify-between md:gap-afh-lg md:text-left"
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

          {/* `text-center` here rather than inheriting the column's own
              alignment: every other rubric in this row runs left-aligned from
              `md:text-left` up, but a heading left-aligned over icons
              centred under it is two alignments in one block (brand charter
              §8.1). Centring the heading with the marks keeps it one. */}
          <div className="text-center">
            <p className="font-afh-display text-afh-body font-bold text-afh-text">
              {directory.followHeading}
            </p>
            {/* Capped at three marks' width — 3 × 44px hit areas plus the two
                  gaps between them — so a fourth and fifth mark wrap onto a
                  second row instead of stretching the line. `flex-wrap` then
                  justifies each row on its own axis, so both the row of three
                  and the row of two centre independently under the heading. */}
            {/* Wraps for the same reason it did before: at 200% text zoom
                  each 44px target measures 88px, and an uncapped row would
                  still overrun the viewport. WCAG 1.4.10 forbids the
                  horizontal scroll that would follow, and
                  `migrations-atlas-zoom.spec.ts` measures it. */}
            <ul
              data-testid="footer-follow"
              className="mx-auto mt-afh-lg flex max-w-[144px] flex-wrap items-center justify-center gap-afh-sm"
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
              className="inline-flex min-h-11 items-center gap-2 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
