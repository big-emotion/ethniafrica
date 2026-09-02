import { GAME_DEFINITIONS } from "@/lib/games/gameRegistry";
import { ACCESS_MODE_LABELS } from "@/lib/hubs/moduleRegistry";
import { getLocalizedRoute } from "@/lib/routing";
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
      title: "L'accueil",
      blurb:
        "L'atlas s'ouvre par l'intention, pas par le sommaire : chercher, comprendre ou jouer déplie ses modules sur l'accueil même, et le clic suivant est le module.",
      links: [
        {
          href: `/${language}`,
          label: "Accueil",
          note: "Le globe et les trois axes.",
        },
      ],
    },
    {
      id: "corpus",
      title: "Le corpus, dans l'ordre AFRIK",
      blurb:
        "Famille linguistique → langue → peuple → pays. C'est la hiérarchie du corpus lui-même, et chaque fiche se lit depuis celle du dessus.",
      links: [
        {
          href: route("families"),
          label: "Familles linguistiques",
          note: "Le premier niveau : 24 familles, chacune avec ses langues.",
        },
        {
          href: route("languages"),
          label: "Langues",
          note: "748 langues, chacune rattachée à sa famille linguistique.",
        },
        {
          href: route("peoples"),
          label: "Peuples",
          note: "789 fiches, rattachées à leur famille et à leurs pays.",
        },
        {
          href: route("countries"),
          label: "Pays",
          note: "54 fiches, chacune listant les peuples qui l'habitent.",
        },
        {
          href: route("patronymes"),
          label: "Nom",
          note: "30 systèmes de nommage des personnes, distincts des appellations d'un peuple.",
        },
        {
          href: route("search"),
          label: "Recherche libre",
          note: "Quand on sait ce qu'on cherche et pas où le trouver.",
        },
        {
          href: route("compare"),
          label: "Comparer",
          note: "Mettre deux entités du même type côte à côte.",
        },
      ],
    },
    {
      id: "dossiers",
      title: ACCESS_MODE_LABELS.dossiers,
      blurb:
        "D'où vient ce nom, d'où vient ce peuple, et qui l'affirme. Les trois questions dans cet ordre.",
      links: [
        {
          href: route("names"),
          label: "Appellations",
          note: "Autonymes, exonymes, et ce que l'écart raconte.",
        },
        {
          href: route("migrations"),
          label: "Premiers repères de migrations",
          note: "Six événements sourcés, pas une frise de trois millénaires.",
        },
        {
          href: route("colonization"),
          label: "Regards : colonisation et résistances",
        },
        {
          href: route("doctrine"),
          label: "La doctrine éditoriale",
          note: "Comment une source est pesée et une fiche publiée.",
        },
      ],
    },
    {
      id: "jeux",
      title: ACCESS_MODE_LABELS.jeux,
      blurb:
        "Chaque partie est tirée du corpus : gagner suppose d'avoir lu quelque chose, jamais d'avoir deviné.",
      links: [
        {
          href: route("quiz"),
          label: "Le quiz des parcours",
        },
        ...GAME_DEFINITIONS.map((game) => ({
          href: `${route("jeuxHub")}/${game.slug}`,
          label: game.nameFr,
          note: game.promptFr,
        })),
      ],
    },
    {
      id: "participer",
      title: "Participer",
      blurb:
        "Le corpus est ouvert et incomplet, et il le dit. Les deux portes par lesquelles on le corrige.",
      links: [
        {
          href: `/${language}/contribute`,
          label: "Contribuer",
          note: "Proposer une fiche, une source, une correction.",
        },
        {
          href: `/${language}/signalements`,
          label: "Signalements",
          note: "Les erreurs signalées et leur traitement, en public.",
        },
      ],
    },
    {
      id: "le-site",
      title: "Le site",
      blurb: "Qui publie, sous quelles règles, et comment lire les données.",
      links: [
        { href: `/${language}/about`, label: "À propos" },
        {
          href: route("sources"),
          label: "Sources",
          note: "La bibliographie qui documente le corpus.",
        },
        {
          href: "/docs/api/v2",
          label: "API publique v2",
          note: "Le corpus en JSON, sous licence ouverte.",
        },
        { href: `/${language}/accessibilite`, label: "Accessibilité" },
        { href: `/${language}/mentions-legales`, label: "Mentions légales" },
        {
          href: `/${language}/politique-de-donnees`,
          label: "Politique de données",
        },
        { href: `/${language}/plan-du-site`, label: "Plan du site" },
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
