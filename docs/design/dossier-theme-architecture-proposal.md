# Dossier themes and navigation — architecture proposal

Date: 2026-09-06
Status: Approved by the user on 2026-09-06; initial navigation and linking implementation added locally.

## Purpose and scope

Let a public atlas fiche link to an independently authored dossier. The same dossier can serve several countries, peoples, linguistic families, languages, appellations, and personal names. Its historical scope must not be constrained by current national borders.

Keep navigation compact as the number of dossiers grows. Group dossiers by a bounded set of themes derived from the existing fiche sections and their content. Distinguish a theme, an individual dossier, a chapter, and a reading format.

This review covers local source data and rendering code. Local file counts do not establish production publication or database coverage. Historical statements in the source data were examined as candidate subject matter, not independently verified. Examples below are editorial candidates, not publication-ready historical claims.

## Navigation, starting with mobile

Preserve the three existing top-level destinations: atlas, dossiers, and games. Individual dossiers do not become global menu entries.

| Viewport                                         | Proposed navigation behavior                                                                                                                                                                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile, 320–430 px and other widths below 768 px | Keep the compact header and menu. On the dossier index, provide a search control on one row and a theme selector on a second row. Opening the selector reveals the theme list in a scrollable panel. Dossier results remain in the page. |
| Tablet, 768–1199 px                              | Retain compact selection controls rather than wrapping eight themes into three or four rows. Show dossier results in a layout appropriate to the available width.                                                                        |
| Desktop, at least 1200 px                        | The dossier menu can expose eight short theme entries in four columns and two rows. The dossier index can use the same arrangement. Its title can link to all dossiers without adding a ninth theme.                                     |

The two-row limit applies to the persistent navigation controls and the desktop theme grid. An expanded mobile selection list must be allowed to scroll vertically. Eight readable theme choices cannot be guaranteed to fit visibly into two rows at 320 px. Do not enforce the limit by reducing text size, truncating labels, or hiding overflow. At zoomed or enlarged text sizes, fall back to the selector when necessary.

Distinguish two rows from two hierarchy levels. A desktop reader can choose a theme and then a dossier. A reader following a fiche link opens the dossier directly, bypassing the index. A dossier's chapters belong to its local contents, not another global navigation level.

The current header uses a 760 px breakpoint and an auto-fill grid with 205 px minimum columns. That does not guarantee a two-row limit. A later implementation would align behavior with the user's 768 px and 1200 px reference breakpoints.

## Evidence from the existing corpus

The local inventory contains 54 country JSON files, 800 people JSON files, 24 linguistic-family JSON files, and 24 language JSON files. The appellation directory has 11 JSON dossiers, with additional appellation information carried by people fiches. The personal-name directory contains 793 records with a `nameSystem` field, plus three supporting JSON files. These counts include source material whose editorial readiness varies.

| Fiche or source                       | Existing sections and fields relevant to dossiers                                                                                                                                                                                                                                                   | Candidate subject families                                                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Country                               | Name etymology and naming actor; historical names; kingdoms and political formations; major historical events; languages; attested personal names; cultural traditions, religions, lifestyles, social organization, regional relations                                                              | Naming, powers, colonization and resistance, migrations, spiritualities, arts, livelihoods, kinship, cross-border exchanges |
| People                                | Appellations; origins and formation; migrations and settlement; unifications/divisions; political and clan organization; age classes; lineage roles; religious authority; languages; rites, symbols, arts/music, spiritualities; kingdoms/chiefdoms; conflicts/alliances; diaspora; oral narratives | All eight proposed themes, including political organization without centralized kingship                                    |
| Linguistic family                     | Origin and critique of classification terms; branches; geographic distribution; typology, phonology, contact and innovations; origins, diffusion, historical breaks and contact zones                                                                                                               | Language classification and change, naming, circulation and contact; political history only when explicitly documented      |
| Language                              | Identifiers and alternate names; family; speakers; dialects; vehicular role; vitality                                                                                                                                                                                                               | Language use, transmission, multilingualism, contact, naming, revitalization                                                |
| Appellation                           | Autonyms/endonyms/exonyms; meaning; naming actor and context; historical spelling; imposition period; contemporary usage                                                                                                                                                                            | Names, imposed designations, identity, political power, language history                                                    |
| Personal name, internally `patronyme` | Naming system; spellings; transmission; designated social unit; oral, written and linguistic origin accounts; associated peoples/countries; alliances; social functions; homonyms; bearers; occasional totemic prohibitions                                                                         | Naming practices, clans and lineages, kinship, alliances, social institutions, spiritual associations                       |
| Linked relations and migrations       | Twelve relation files with type, direction, period and sources; six migration-event files with dates, narrative and debate                                                                                                                                                                          | Contact, mobility, alliances, conflict, diasporas, historical uncertainty                                                   |

The atlas's families are linguistic families. They must remain distinct from household, clan, lineage, or personal ancestry. A common language classification does not establish a shared political institution or spiritual practice.

Some source fields mix several kinds of subject in prose. In particular, country `socialOrganization` combines powers and kinship; people `religiousAuthority` crosses politics and spirituality. A field name alone is insufficient to classify every dossier mentioned in its value.

## Eight proposed themes

The table uses English working titles for this document. Proposed French menu labels are supplied in the accompanying discussion. Short labels can be expanded into explanatory page titles.

| Theme                      | Existing content that motivates it                                                                                        | Candidate dossiers and questions                                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Powers and territories     | Country kingdoms and historical events; people political systems, kingdoms/chiefdoms, conflicts; colonial fragmentation   | Kingdom of Kongo; Luba and Lunda political formations; Mongo political organization; kingdoms and chiefdoms; councils and decentralized authority; borders; conquest, colonization, resistance, independence |
| Migrations and diasporas   | People origins, settlement, divisions, diaspora; family diffusion/contact; migration events                               | Bantu dispersals; settlement routes; forced displacement; diaspora formation; movements across the Indian Ocean; migration narratives and competing accounts                                                 |
| Spiritualities and beliefs | Religions; spiritualities; ritual authority; rites; symbols; totemic prohibitions                                         | Vodun; Mami Wata; a documented divinity or spirit; ancestor relations; initiation; divination; religious encounters and transformations                                                                      |
| Kinship and societies      | Clan organization; lineage roles; age classes; social units; naming transmission; alliances and social functions          | Matrilineal and patrilineal transmission; specific clan or lineage institutions; age systems; marriage alliances; joking relationships; collective social institutions                                       |
| Languages and transmission | Family branches and characteristics; language dialects, vehicular role and vitality; people languages and oral narratives | Language families and their classification; tonal systems; multilingualism; language contact; writing systems; oral transmission; revitalization                                                             |
| Names and identities       | Etymology; historical names; appellations; naming actors; name systems; spelling histories                                | Who gave this name?; naming a person, people, country, language, or object; endonyms/exonyms; name changes; names imposed by administrations; clan names and patronymics                                     |
| Arts and knowledge         | Cultural traditions; arts/music; symbols; rites; existing object-naming chapter                                           | Textiles; hairstyles; masks; musical instruments; architecture; craft techniques; food practices; knowledge passed through making and performance                                                            |
| Economies and exchanges    | Country lifestyles and regional relations; people contacts and collective institutions; trade-related migration events    | Farming and pastoralism; fishing; markets and trade routes; currencies; commercial networks; livelihoods and environmental knowledge; economic dimensions of slavery and colonial extraction                 |

Keep these as a proposed bounded vocabulary, not eight empty launch destinations. Theme pages become useful as publishable content becomes available. The design can accommodate all eight while the launch exposes only populated themes. This would require an explicit update to existing module-listing behavior, which currently also represents draft modules.

Do not add “History” or “Relations” as catch-all themes. All themes have histories. Classify relations by their subject: marriage alliances under kinship, political treaties under powers, trade networks under economies, and language contact under languages.

## Classification rules

1. Give each dossier one primary theme based on its central reader question. This establishes its default location and breadcrumb.
2. Allow additional themes where the dossier substantially addresses them. These are alternate discovery paths to one dossier, not copies of its text.
3. Keep countries, peoples, languages, names and periods as linked context or filters. They do not multiply global theme entries.
4. Distinguish an instance from a comparison. A dossier on Kongo is an instance; a dossier comparing forms of kingship is a different editorial subject under the same theme.
5. A dossier can have chapters and links to other dossiers. Do not turn every chapter or mention into a new public dossier automatically.
6. Keep changes in time, uncertainty and divergent accounts inside every relevant dossier. A spirituality is not fixed, a people is not identical to a kingdom, and a historical territory is not identical to a modern country.

Examples of boundaries:

- A dossier explaining matrilineal inheritance primarily concerns kinship; one explaining the succession of a particular sovereign primarily concerns powers.
- A dossier on the meaning and adoption of a clan name primarily concerns names; one on the clan's institutions primarily concerns kinship.
- A dossier on a ritual mask's fabrication primarily concerns arts and knowledge; one on its ritual role primarily concerns spiritualities.
- A dossier on the name of a divinity can remain in names; a dossier developing its associated beliefs belongs primarily to spiritualities.

## Existing dossiers and anecdotes

The registry currently declares four dossier entries:

| Current entry                             | Declared readiness | Proposed treatment                                                                                                                                                                                                             |
| ----------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Who gave this name?                       | Ready              | Keep as a substantial dossier in Names and identities. Preserve its five chapters about naming a people, country, person, language and thing.                                                                                  |
| Anecdotes                                 | Ready              | Keep its existing reading route and shared links. Current facts are specifically about names, so classify current content in Names and identities. Treat anecdote as a short reading format that can later serve other themes. |
| First migration landmarks                 | Draft              | Place in Migrations and diasporas; retain the qualification of its limited coverage. Reclassification does not change editorial readiness.                                                                                     |
| Perspectives: colonization and resistance | Draft              | Primary theme Powers and territories; additional themes according to the content actually developed. Retain its current editorial status.                                                                                      |

Keep an “Anecdotes” discovery link on the dossier landing page, alongside editorial selections, rather than using one of the eight theme slots. Individual anecdotes can link to a longer dossier when one exists; a long dossier is not required for each short fact. The current anecdote bank only types country, people and family links, so broader entity linking is future work, not an existing capability.

The existing object-naming chapter already mentions textiles and Mami Wata. This supports multiple theme discovery, but does not mean those examples already constitute complete standalone dossiers about textile traditions or spirituality.

## Fiche links and the minimum architectural model

For each published dossier, maintain a stable identifier/address, title, summary, publication state, primary theme, additional themes, sources, and relevant historical scope. Keep the address independent of its primary theme so reclassification does not break links. Preserve existing addresses or redirect them deliberately if migration is later necessary.

A fiche-to-dossier association should identify the fiche type and identifier, its section or entry, the dossier identifier, and the contextual reason for the link. Date or qualify the association when that is necessary to explain it. Modern geographic overlap is a different relation from historical political membership.

For example, the country fiche's Kongo entry would retain a short contextual account and link directly to a shared Kongo dossier. Other relevant fiches could link to the same dossier using their own contextual summaries. The dossier can list its related fiches without inventing one canonical parent country.

The current kingdom timeline renders names as plain headings. A subsequent implementation needs explicit resolved dossier associations; guessing a slug from every kingdom name would create broken or ambiguous links. “Mongo chiefdoms,” for example, should not automatically be represented as one historical sovereign entity merely because the existing summary uses one line.

Use the existing content infrastructure initially. A theme registry and explicit associations do not require a new graph database or a wholesale CMS migration. Shared historical entities can later be modeled separately if map geometry, structured succession, or chronology needs justify that complexity.

## Verification criteria for a later implementation

Use test-first phases and keep each phase small:

1. Classification and linking: first specify tests for one dossier reached from multiple fiche types, one canonical address across multiple themes, and exclusion of unpublished dossier links; then add the small registry and association model.
2. Navigation: first specify mobile/tablet selector and desktop two-row acceptance checks; then implement the responsive theme navigation. Include 320, 375, 430, 768, 1199 and 1200 px, keyboard navigation, text enlargement, and long labels.
3. Existing content migration: first specify preservation of current dossier/chapter addresses and anecdote deep links; then assign current content to themes while preserving readiness and sources.

The initial implementation defines all eight themes, classifies the four existing
modules without changing their readiness, restores the dossier index and adds
published theme routes. Search filters published long-form dossiers; anecdotes
remain a separate reading entry. The naming dossier supplies the first shared
fiche links in country, people, linguistic-family, language and personal-name
sections. Historical kingdom dossiers remain editorial work to author and
publish; no links to unwritten dossiers are inferred.

Browser verification covers 320, 375, 430, 768, 1199, 1200 and 1440 px, mobile
menu navigation, canonical dossier links, existing chapter/anecdote routes and
an unknown theme's 404 response. The responsive grid currently lists the three
populated themes; the other five are defined without empty public destinations.

## Validation result

- Initial validation before integration: Vitest passed 7,345 tests, with 21 skipped. Final integration validation is recorded in the PR.
- Playwright: ten passing journeys covering 320–1440 px, mobile navigation,
  search, English locale preservation, canonical links, a named anecdote deep link and unknown-theme 404.
- TypeScript, ESLint error checks, requirement annotations and formatting pass.
- Axe found no violations in the main content and header at 430 and 1440 px.
- The unused-code gate passes in the isolated PR worktree. The earlier shared-workspace attempt exhausted Node's default 4 GB heap.

## Source references

- `src/lib/hubs/moduleRegistry.ts`: current atlas and dossier destinations, readiness and game-only groups.
- `src/lib/hubs/moduleGroups.ts`: existing shelf mechanism, currently used for games.
- `src/components/layout/SiteHeader.tsx`: header, responsive breakpoint and menu grid.
- `src/components/country/CountryParchment.tsx`, `CountryRecordView.tsx`, `KingdomsTimeline.tsx`: country reading sections and kingdom entries.
- `src/components/people/PeopleDetailViewV2.tsx`: people sections and existing contextual surfaces.
- `src/components/family/FamilyParchment.tsx`, `FamilyHistorySection.tsx`, `FamilyLinguisticTraits.tsx`: family sections.
- `src/components/language/LanguageDetailViewV2.tsx`: language sections.
- `src/components/names/PeopleNamesSection.tsx`: appellation content and spelling history.
- `src/components/patronymes/PatronymeFicheView.tsx`: personal-name sections.
- `src/lib/home/didYouKnowFacts.ts`, `src/app/[lang]/dossiers/anecdotes/page.tsx`: current anecdote scope and reading route.
- `src/lib/dossiers/nommer/chapters/index.ts`, `chapters/laChose.ts`: current naming dossier and examples spanning future themes.
- `dataset/source/afrik/{pays,peuples,famille_linguistique,langues,noms,patronymes,relations,migrations}`: local section and value inventory.

## Open terminology

The user's mention of “bandes” is awaiting clarification. No independent atlas entity with that label was found in the inspected type/loader paths. Existing visual bands are presentation surfaces; if this means social bands or another intended entity, map its content to the same theme model after clarification.

## Integration with the latest recette branch

The integration branch added bilingual routes and three published Réalités dossiers while this change was being prepared. The navigation preserves the reader's English or French locale, including theme pages, fiche links and breadcrumbs. The new dossiers are classified under Power and territories (proportions), Kinship and societies with Migrations and diasporas (populations), and Economies and exchange (resources). Seven themes now have published long-form content; Spiritualities and beliefs remains hidden until a dossier is ready. This supersedes the initial three-populated-theme inventory above.
