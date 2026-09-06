# Congo dossier publication notes

## Scope

Four introductory dossiers, each with two chapters, reuse the established reader and the eight-theme catalog. Existing Réalités dossiers retain their source records and routes. Quantitative thesis figures and paired readings are now optional; the API, parser and model agree on this. Comparative passages that are present still require both sourced perspectives.

Country associations use exact formation names already present in COD, AGO, COG and ZMB records. People associations name PPL_KONGO, PPL_LUBA and PPL_LUNDA explicitly. These are discovery contexts, not territorial reconstructions. The resources dossier is additionally linked from COD culture. Mongo, Mangbetu and Zande remain unlinked until their dossiers are researched.

## Evidence and images

Each dossier declares its bibliography, source tier and access notes. UNESCO's heritage entry is classified as official/intergovernmental; identifiable museum research and specialist scholarship as referenced/academic. Origin traditions, approximate dates and editorial limits are stated in the narrative. Source links beside claims resolve to the dossier's own bibliography.

Illustrations were obtained from the Metropolitan Museum's public collection API after checking the public-domain flag. They were visually inspected; the Chokwe figure's description was corrected to standing. Image credits, licence links and original collection links are in the records and [CREDITS.md](../../public/images/dossiers/CREDITS.md). Objects are displayed in full without cropping.

## Translation

The [classification table](congo-dossier-translation-classification.md) was produced before translation. Identifiers, source titles, names, URLs, dates and licences come from the French source. Date values classified as review-required are omitted from the overlay and remain unchanged in the source; no class-3 translation is published.

The four overlays contain translated prose only and declare machine provenance. Every translated leaf has a hash; the source hash is SHA-256 of the JSON representation returned by the strict dossier parser. The reader refuses stale, incomplete or rule-breaking overlays and explicitly labels a French fallback. English translations of the three pre-existing Réalités records remain deferred because this lot preserves their editorial content; when bilingual publication is enabled, their English routes state that they display the French original.

## Integration

This branch builds on PR #892. Both branches also incorporate recette PR #893: French-only remains the default publication mode; the new translations do not enable English site-wide. Merge the architecture first, then this follow-up. Migration 083 extends the existing internal vertical enum for the loader and public API; it does not add navigation categories. It must run before loading the new records into Supabase. Public dossier pages read the source corpus in git and work independently of that database load. No database migration or deployment was performed from this task.

## Validation

Tests were written before the parser relaxation, corpus publication, translations, reader changes and API alignment. Browser journeys checked 320, 390, 430, 768, 1199, 1200 and 1440 px, both locales, citations, existing dossiers, country timeline links and Kongo people links. The expanded desktop menu and directory both retain two theme rows; smaller layouts use a selector. Screenshots were inspected. The overall editorial gate reports no errors and two existing missing-autonym warnings outside this lot.
