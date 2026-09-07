import type { Language } from "@/types/shared";

const en = {
  eyebrow: "Find your way",
  title: "Sitemap",
  introduction:
    "The site's sections and the paths that lead to them. The fiches themselves are not listed here: they are reached through the atlas or through the search. This page follows the order of the atlas — language family, then language, people and country — rather than the order of the menu.",
};

type SitemapPageCopy = typeof en;

const fr: SitemapPageCopy = {
  eyebrow: "Se repérer",
  title: "Plan du site",
  introduction:
    "Les rubriques du site et les chemins qui y mènent. Les fiches elles-mêmes ne sont pas listées ici : on y arrive par l'atlas ou par la recherche. Cette page suit l'ordre de l'atlas — famille linguistique, puis langue, peuple et pays — plutôt que l'ordre du menu.",
};

// @req REQ-145
export const sitemapPageCopy: Record<Language, SitemapPageCopy> = { en, fr };
