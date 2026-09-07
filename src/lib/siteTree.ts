import { getLocalizedNommerChapters } from "@/lib/dossiers/nommer/localizeChapter";
import { getDossiers, getPublishedThemes } from "@/lib/dossiers/catalog";
import { isModulePublished } from "@/lib/hubs/moduleOffer";
import { getDossierThemeHref } from "@/lib/dossiers/themes";
import { GAME_DEFINITIONS } from "@/lib/games/gameRegistry";
import { GAME_DEFINITIONS_EN } from "@/lib/games/gameRegistry.en";
import { siteTreeCopy } from "@/lib/i18n/copy/siteTree";
import {
  getLocalizedRoute,
  getNommerChapterRoute,
  getStaticPageRoute,
  type NommerChapterKey,
} from "@/lib/routing";
import type { Language } from "@/types/shared";

/**
 * The rubrics of the site, written out rather than derived.
 *
 * One tree, read by both `src/app/sitemap.ts` and `/fr/plan-du-site`. Two
 * hand-kept lists would have drifted the week after they shipped, and a plan
 * that disagrees with the sitemap is worse than no plan at all.
 *
 * It is written by hand on purpose. A tree derived from `src/app/**` would
 * enumerate route files — including the ones that must never be crawled — and
 * would say nothing about what a rubric is *for*. The 890 fiches are not here
 * either: the reader wants the ways in, and the sitemap carries the fiches.
 *
 * The order follows the AFRIK hierarchy — linguistic family → language →
 * people → country — not the order of the menu. The menu answers "what do I
 * want to do"; a site plan answers "how is this corpus put together".
 */

export interface SiteTreeLink {
  href: string;
  label: string;
  /** Why this entry exists, in the reader's terms. One line. */
  note?: string;
}

export interface SiteTreeSection {
  id: string;
  title: string;
  blurb: string;
  links: SiteTreeLink[];
}

/**
 * Routes that exist and are deliberately absent from both the plan and the
 * sitemap. Kept as a named list so the omission reads as a decision rather
 * than an oversight.
 *
 *   · `admin/**`, `compte/**` — behind authentication.
 *   · `quiz/score`, `report-error` — the far end of a flow, meaningless when
 *     entered cold from a search result.
 *   · `comparer/[entityType]/[...ids]` — combinatorial. The `/comparer`
 *     entry point is listed; the pairs it can build are not.
 *
 * `confidentialite` and `politique-confidentialite` were here too — two
 * hand-written pages restating `politique-de-donnees`, left unlisted while the
 * legal call to retire them was pending. That call was made: they are deleted,
 * the consent banner names the canonical page, and one privacy policy is now
 * the only one a reader can reach.
 */
// @req REQ-110
export const UNLISTED_ROUTES = [
  "admin",
  "compte",
  "quiz/score",
  "report-error",
  "comparer/[entityType]/[...ids]",
] as const;

// @req REQ-110
export function getSiteTree(language: Language): SiteTreeSection[] {
  const route = (page: Parameters<typeof getLocalizedRoute>[1]) =>
    getLocalizedRoute(language, page);
  const nommerChapterRoute = (chapter: NommerChapterKey) =>
    getNommerChapterRoute(language, chapter);
  const copy = siteTreeCopy[language];
  const nommerChapters = getLocalizedNommerChapters(language);

  return [
    /**
     * The three access modes were listed here as destinations of their own.
     * They are not pages: ETNI-1555 deleted the axis landing pages, because
     * the reader picks a module and never stops on an intermediate level.
     * What is left is the accueil, where the three axes deploy their modules
     * in place — and the three rubrics below, which are those axes.
     */
    {
      id: "accueil",
      title: copy.home.title,
      blurb: copy.home.blurb,
      links: [
        {
          href: `/${language}`,
          label: copy.home.label,
          note: copy.home.note,
        },
      ],
    },
    {
      id: "corpus",
      title: copy.corpus.title,
      blurb: copy.corpus.blurb,
      links: [
        {
          href: route("families"),
          label: copy.corpus.families[0],
          note: copy.corpus.families[1],
        },
        {
          href: route("languages"),
          label: copy.corpus.languages[0],
          note: copy.corpus.languages[1],
        },
        {
          href: route("peoples"),
          label: copy.corpus.peoples[0],
          note: copy.corpus.peoples[1],
        },
        {
          href: route("countries"),
          label: copy.corpus.countries[0],
          note: copy.corpus.countries[1],
        },
        {
          href: route("patronymes"),
          label: copy.corpus.names[0],
          note: copy.corpus.names[1],
        },
        {
          href: route("search"),
          label: copy.corpus.search[0],
          note: copy.corpus.search[1],
        },
        {
          href: route("compare"),
          label: copy.corpus.compare[0],
          note: copy.corpus.compare[1],
        },
      ],
    },
    {
      id: "dossiers",
      title: copy.dossiers.title,
      blurb: copy.dossiers.blurb,
      links: [
        {
          href: route("dossiersHub"),
          label: copy.dossiers.all,
        },
        ...getPublishedThemes(undefined, language).map((theme) => ({
          href: getDossierThemeHref(theme.id, language),
          label: theme.label,
        })),
        // The pillar and its five chapters, listed only while published.
        //
        // Chapters are listed at all against this file's own rule that the map
        // offers doorways rather than every page: a chapter is a whole
        // reading, not one of 890 fiches, and `getSiteTreePaths` is the sole
        // feed of the sitemap, so omitting them would publish an editorial
        // page no crawler is told about. The freeze inverts that reasoning
        // exactly — listing a withdrawn chapter tells the crawler about a page
        // that answers 404.
        ...(isModulePublished("nommer")
          ? [
              {
                href: route("nommer"),
                label: copy.dossiers.nommerTitle,
                note: copy.dossiers.nommerNote,
              },
              ...nommerChapters.map((chapter) => ({
                href: nommerChapterRoute(chapter.key),
                label: `${chapter.ordinal} · ${chapter.title}`,
              })),
            ]
          : []),
        ...getDossiers({ language })
          .filter((dossier) => dossier.id !== "nommer")
          .map((dossier) => ({
            href: dossier.href,
            label: dossier.title,
            note: dossier.summary,
          })),
        // The anecdotes, read off the catalog like the dossiers above rather
        // than written out. Neither the plan nor the sitemap listed them
        // before the freeze — an omission that only became visible once they
        // were the sole published reading on the axis.
        ...getDossiers({ format: "anecdote", language }).map((dossier) => ({
          href: dossier.href,
          label: dossier.title,
          note: dossier.summary,
        })),
        {
          href: route("names"),
          label: copy.dossiers.names[0],
          note: copy.dossiers.names[1],
        },
        ...(isModulePublished("frise")
          ? [
              {
                href: route("migrations"),
                label: copy.dossiers.migrations[0],
                note: copy.dossiers.migrations[1],
              },
            ]
          : []),
        ...(isModulePublished("regards-colonisation")
          ? [
              {
                href: route("colonization"),
                label: copy.dossiers.colonization,
              },
            ]
          : []),
        {
          href: route("doctrine"),
          label: copy.dossiers.doctrine[0],
          note: copy.dossiers.doctrine[1],
        },
      ],
    },
    {
      id: "jeux",
      title: copy.play.title,
      blurb: copy.play.blurb,
      links: [
        {
          href: route("quiz"),
          // Read off the registry rather than transcribed: the line below
          // already derives the games from theirs, and a hand-copied name is
          // one the registry can rename out from under.
          label: copy.play.quiz,
        },
        ...GAME_DEFINITIONS.map((game) => ({
          href: `${route("jeuxHub")}/${game.slug}`,
          label:
            language === "en"
              ? GAME_DEFINITIONS_EN[game.id].nameEn
              : game.nameFr,
          note:
            language === "en"
              ? GAME_DEFINITIONS_EN[game.id].promptEn
              : game.promptFr,
        })),
      ],
    },
    {
      id: "participer",
      title: copy.contribute.title,
      blurb: copy.contribute.blurb,
      links: [
        {
          href: getStaticPageRoute(language, "contribute"),
          label: copy.contribute.contribution[0],
          note: copy.contribute.contribution[1],
        },
        {
          href: getStaticPageRoute(language, "reports"),
          label: copy.contribute.reports[0],
          note: copy.contribute.reports[1],
        },
      ],
    },
    {
      id: "le-site",
      title: copy.site.title,
      blurb: copy.site.blurb,
      links: [
        { href: `/${language}/about`, label: copy.site.about },
        {
          href: route("glossary"),
          label: copy.site.glossary[0],
          note: copy.site.glossary[1],
        },
        {
          href: route("sources"),
          label: copy.site.sources[0],
          note: copy.site.sources[1],
        },
        {
          href: "/docs/api/v2",
          label: copy.site.api[0],
          note: copy.site.api[1],
        },
        {
          href: getStaticPageRoute(language, "contact"),
          label: copy.site.contact[0],
          note: copy.site.contact[1],
        },
        {
          href: getStaticPageRoute(language, "accessibility"),
          label: copy.site.accessibility,
        },
        {
          href: getStaticPageRoute(language, "legalNotice"),
          label: copy.site.legal,
        },
        {
          href: getStaticPageRoute(language, "dataPolicy"),
          label: copy.site.data,
        },
        {
          href: getStaticPageRoute(language, "sitemap"),
          label: copy.site.sitemap,
        },
      ],
    },
  ];
}

/**
 * Every in-site path the tree names, deduplicated.
 *
 * `/docs/api/v2` is filtered out: it is served outside the `[lang]` tree by
 * the OpenAPI viewer, and the sitemap addresses reading routes.
 */
// @req REQ-110
export function getSiteTreePaths(language: Language): string[] {
  const paths = getSiteTree(language)
    .flatMap((section) => section.links.map((link) => link.href))
    .filter((href) => href.startsWith(`/${language}`));
  return [...new Set(paths)];
}
