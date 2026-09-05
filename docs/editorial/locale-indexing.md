# Locale indexing

Every public page resolves under both locales (REQ-140). Resolving is not the
same as being ready for a search index, and this document records the rule
that separates the two (REQ-141).

## The parity rule

A page is **at parity** in a locale when its chrome _and_ its content read in
that locale. An English address that serves French prose under an English
header is a page a crawler should read and a page it should not offer as the
English answer.

A page not at parity in the locale it was served in:

- declares `noindex, follow` — the reader still gets the page, the links still
  carry their signal, only the index waits;
- is left out of that locale's half of `sitemap.xml`;
- is dropped from the other locale's hreflang cluster, because a search
  engine discards a cluster that points at a page it may not index, and the
  French page would otherwise lose its alternates for the English page's
  fault.

Two kinds of page, two ways of measuring parity:

| Page kind                                                | At parity when                                                                                                                               | Read from                                                   |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| A rubric (home, a facet, a dossier, a legal page…)       | Its key is in `SURFACES_AT_PARITY`                                                                                                           | `src/lib/seo/localeIndexing.ts`                             |
| A fiche (people, country, family, language, name, links) | A translation record exists for the entity in that locale — any provenance, since machine translation is publishable once labelled (DEC-048) | `ficheHasTranslation` in `src/lib/seo/translationParity.ts` |

The French corpus locale is always at parity: it is the locale the content is
written in.

## How `SURFACES_AT_PARITY` is lifted

The list is measured, never aspirational, the way `SOFT_CHECK_NAMES` is in
`validateAfrikData.ts`: one visible constant in a source file, with the reason
each entry is there. A dictionary existing for a page is not parity while the
page's body is French prose.

A surface enters the list in the same commit as the translation wave that
makes it true — the wave adds the English copy, adds the key, and the charter
contract (`src/app/[lang]/__tests__/localeAlternatesCharter.test.ts`) then
holds the page to a two-locale cluster with `x-default`. The sitemap follows
the same constant, so the English rubric appears there in the same commit.

Measured on 2026-09-05 against the bilingual foundation, one surface qualifies:
the ethnonym index (`names`), whose copy is `translations.names` and whose rows
are the names peoples are called by. Everything else — the home hero, the
facets' ledes and filters, the search results, the doctrine, the dossiers, the
legal pages, the reports, the quiz tracks — still carries French prose under
`/en`. Consequence worth stating plainly: until the home is translated, `/en`
(the default locale's front door) declares `noindex`, and `/fr` is the home a
search engine is invited to.

For fiches there is nothing to lift by hand: the seam in `translationParity.ts`
answers `fr` only until ETNI-1826 lands the translation records, and that PR
replaces its body with the read. Every `/en` fiche is `noindex` and absent from
the English sitemap until then, which is the correct state, not a defect.

## The `x-default` choice

`x-default` is **the English URL**, as REQ-141 is catalogued: English is the
default locale (DEC-046), so a reader whose language matches neither cluster
member lands where an unprefixed request lands.

It is declared only when the English page is indexed. While a surface is
French-only, the cluster carries the French address alone and no `x-default`
— pointing it at a `noindex` page would poison the cluster, and pointing it at
the French page would contradict the requirement. The day the surface reaches
parity, `x-default` appears with the English entry, from the same constant.

## Where it is enforced

- `src/lib/seo/localeAlternates.ts` — the cluster, the canonical, the Open
  Graph locale, composed once per page through `surfaceHead` / `localeHead`.
- `src/lib/seo/ficheCanonical.ts` — the same for the six fiche kinds.
- `src/app/[lang]/__tests__/localeAlternatesCharter.test.ts` — every
  `page.tsx` under `[lang]`, both locales, held to the rule above; a page the
  contract does not know fails it.
- `src/app/sitemap.ts`, `src/app/robots.ts`,
  `src/app/api/internal/revalidate/route.ts` — both locales, through the same
  constants.
- `e2e/cross-cutting/locale-alternates.spec.ts` — the served `<head>` and
  `<html lang>`, local only.
