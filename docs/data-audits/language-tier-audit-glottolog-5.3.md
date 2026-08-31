# Language-tier catalog audit against Glottolog 5.3

## Outcome

- Original records audited: 120
- Retained rows: 71
- Removed rows: 49
- Unresolved retained rows: 0

The ticket described 119 original rows. The source actually contained 120 data records: 24 AFRIK family identifiers with five records each. The apparent discrepancy came from the file ending without a trailing newline. This audit accounts for all 120 parsed CSV records in the companion manifest.

Every retained catalog row now has one unique ISO 639-3 code, one unique Glottocode, an existing AFRIK `FLG_*.json` family, and direct Tier-1 metadata for the corresponding Glottolog 5.3 record. Broad or ambiguous labels were removed instead of being forced onto a single lect.

## Tier-1 source

- Title: Glottolog 5.3: Glottolog database 5.3 as CLDF
- Editors: Harald Hammarström, Robert Forkel, Martin Haspelmath, Sebastian Bank
- Publisher and year: Max Planck Institute for Evolutionary Anthropology, 2026
- Release URL: https://zenodo.org/records/18840967
- DOI: 10.5281/zenodo.18840967
- Glottolog download index: https://glottolog.org/meta/downloads
- Access date: 2026-07-29
- Source tier: 1

The version-specific Zenodo CLDF archive was used so the audit can be reproduced against the released 5.3 snapshot rather than a mutable live view. The downloaded archive was held only in a temporary directory and deleted after the row-level decisions were extracted.

## Decision rules

1. A supplied ISO code had to resolve directly in Glottolog 5.3. A code that Glottolog did not attach to one languoid was not silently replaced.
2. A blank ISO code was filled only when the French label and AFRIK family context identified one Glottolog language unambiguously.
3. Duplicate ISO assignments were resolved in favor of the most specific Glottolog-backed AFRIK family.
4. A family mismatch was retained only when the same existing row could move to an exact more-specific AFRIK family. No new language row was invented.
5. A broad name covering multiple languages was removed even when one candidate exposed that name as an alias.
6. French names were preserved. Only three unambiguous mojibake repairs were made: `Hébreu moderne`, `ǂHoan`, and `Nǁng`.

Two existing records changed family without changing their immutable `id_langue`:

- `LANG_NC_5` (Zulu): `FLG_NIGERCONGO` to `FLG_BANTU`.
- `LANG_AUS_5` (Comorien / Shingazidja): `FLG_AUSTRONESIENNE` to `FLG_BANTU`.

## Removed original rows

| Original `id_langue` | Original name           | Original family       | Reason                                                                                                |
| -------------------- | ----------------------- | --------------------- | ----------------------------------------------------------------------------------------------------- |
| LANG_AFRO_1          | Arabe standard moderne  | FLG_AFROASIATIQUE     | Duplicate macro-family assignment; retained as `LANG_SEM_1` under Semitic.                            |
| LANG_AFRO_2          | Amharique               | FLG_AFROASIATIQUE     | Duplicate macro-family assignment; retained as `LANG_SEM_2` under Semitic.                            |
| LANG_AFRO_3          | Somali                  | FLG_AFROASIATIQUE     | Duplicate macro-family assignment; retained as `LANG_COU_1` under Cushitic.                           |
| LANG_AFRO_4          | Hausa                   | FLG_AFROASIATIQUE     | Duplicate macro-family assignment; retained as `LANG_TCH_1` under Chadic.                             |
| LANG_AFRO_5          | Tigrinya                | FLG_AFROASIATIQUE     | Duplicate macro-family assignment; retained as `LANG_SEM_3` under Semitic.                            |
| LANG_TCH_2           | Ngambay                 | FLG_TCHADIQUE         | Glottolog classifies Ngambay as Central Sudanic; the correctly assigned `LANG_SC_2` row was retained. |
| LANG_TCH_4           | Margi                   | FLG_TCHADIQUE         | Broad label matching Marghi Central and Marghi South; no single ISO code is unambiguous.              |
| LANG_TCH_5           | Kotoko                  | FLG_TCHADIQUE         | Broad Chadic grouping rather than one unambiguous language.                                           |
| LANG_COU_2           | Oromo (Afaan Oromo)     | FLG_COUCHITIQUE       | Glottolog does not attach `orm` to one languoid and Oromo matches multiple languages.                 |
| LANG_OMO_1           | Wolaytta                | FLG_OMOTIQUE          | Glottolog classifies it in Ta-Ne-Omotic and no exact existing AFRIK family matches.                   |
| LANG_OMO_2           | Gamo                    | FLG_OMOTIQUE          | Glottolog classifies it in Ta-Ne-Omotic and no exact existing AFRIK family matches.                   |
| LANG_OMO_3           | Bench                   | FLG_OMOTIQUE          | Glottolog treats Bench as a separate top-level family and no exact existing AFRIK family matches.     |
| LANG_OMO_4           | Dizi                    | FLG_OMOTIQUE          | Glottolog treats Dizin as a separate top-level family and no exact existing AFRIK family matches.     |
| LANG_OMO_5           | Kafa                    | FLG_OMOTIQUE          | Glottolog classifies it in Ta-Ne-Omotic and no exact existing AFRIK family matches.                   |
| LANG_NC_1            | Swahili                 | FLG_NIGERCONGO        | Niger-Congo is not a Glottolog family and `swa` is not attached to a Glottolog languoid.              |
| LANG_NC_2            | Yoruba                  | FLG_NIGERCONGO        | Duplicate macro-family assignment; retained as `LANG_BC_1` under Benue-Congo.                         |
| LANG_NC_3            | Igbo                    | FLG_NIGERCONGO        | Duplicate macro-family assignment; retained as `LANG_BC_2` under Benue-Congo.                         |
| LANG_NC_4            | Fula / Fulfulde         | FLG_NIGERCONGO        | Broad label matching multiple lects; no single ISO language is unambiguous.                           |
| LANG_ATL_2           | Fula / Pulaar           | FLG_ATLANTIQUE        | Broad label matching multiple lects; no single ISO language is unambiguous.                           |
| LANG_MAN_5           | Kpelle                  | FLG_MANDE             | `kpe` is not attached to one Glottolog languoid and Kpelle resolves to multiple languages.            |
| LANG_KRO_1           | B√©t√©                  | FLG_KROU              | Bété is a broad label shared by multiple Kru languages.                                               |
| LANG_KRO_2           | W√© (Gu√©r√©)           | FLG_KROU              | Wé / Guéré is a broad label shared by multiple Kru languages.                                         |
| LANG_KRO_3           | Dida                    | FLG_KROU              | Dida is a broad label shared by multiple Kru languages.                                               |
| LANG_KRO_5           | Krahn                   | FLG_KROU              | Krahn is a broad label shared by multiple Kru languages.                                              |
| LANG_BAN_1           | Swahili                 | FLG_BANTU             | `swa` is not attached to a Glottolog languoid; Glottolog records individual Swahili as `swh`.         |
| LANG_NS_1            | Kanuri                  | FLG_NILOSAHARIENNE    | Nilo-Saharan is not a Glottolog family and `kau` is not attached to one languoid.                     |
| LANG_NS_2            | Songhay (Zarma)         | FLG_NILOSAHARIENNE    | Nilo-Saharan is not a Glottolog family and the combined label does not identify one language.         |
| LANG_NS_3            | Dinka                   | FLG_NILOSAHARIENNE    | Duplicate unsupported macro-family assignment; retained as `LANG_NIL_1` under Nilotic.                |
| LANG_NS_4            | Nuer                    | FLG_NILOSAHARIENNE    | Duplicate unsupported macro-family assignment; retained as `LANG_NIL_2` under Nilotic.                |
| LANG_NS_5            | Maasai                  | FLG_NILOSAHARIENNE    | Duplicate unsupported macro-family assignment; retained as `LANG_NIL_3` under Nilotic.                |
| LANG_SC_3            | Sara                    | FLG_SOUDANIQUECENTRAL | Broad label shared by multiple languages.                                                             |
| LANG_SC_4            | Maba                    | FLG_SOUDANIQUECENTRAL | Maba is a separate Glottolog family and no exact existing AFRIK family matches.                       |
| LANG_SAH_1           | Kanuri                  | FLG_SAHARIEN          | `kau` is not attached to one Glottolog languoid and Kanuri resolves to multiple languages.            |
| LANG_KHO_1           | Nama                    | FLG_KHOISAN           | Duplicate non-genealogical Khoisan assignment; retained as `LANG_KHOE_1` under Khoe.                  |
| LANG_KHO_2           | Khoekhoe                | FLG_KHOISAN           | Duplicate non-genealogical Khoisan assignment; Khoekhoe is an alias of retained Nama.                 |
| LANG_KHO_3           | Ju\|'hoan               | FLG_KHOISAN           | Duplicate non-genealogical Khoisan assignment; retained as `LANG_KXA_1` under Kxa.                    |
| LANG_KHO_4           | Taa («ÉX√≥√µ)           | FLG_KHOISAN           | Khoisan is non-genealogical and the label matches East Taa and West !Xoon.                            |
| LANG_KHO_5           | Naro                    | FLG_KHOISAN           | Duplicate non-genealogical Khoisan assignment; retained as `LANG_KHOE_5` under Khoe.                  |
| LANG_KHOE_2          | Khoekhoe                | FLG_KHOE              | Alias of Nama that would duplicate ISO `naq`.                                                         |
| LANG_KXA_2           | !Kung                   | FLG_KXA               | Broad label; the more specific Ekoka !Kung row was retained for `knw`.                                |
| LANG_KXA_4           | !Xun                    | FLG_KXA               | Broad label; the more specific Ekoka !Kung row was retained for `knw`.                                |
| LANG_TUU_1           | Taa («ÉX√≥√µ)           | FLG_TUU               | Label matches East Taa and West !Xoon; no single ISO code is unambiguous.                             |
| LANG_TUU_3           | !X√≥√µ                  | FLG_TUU               | Label matches East Taa and West !Xoon; no single ISO code is unambiguous.                             |
| LANG_TUU_5           | !Kwi                    | FLG_TUU               | Maps to the !Ui family node and has no ISO 639-3 code.                                                |
| LANG_CRE_1           | Krio (Sierra Leone)     | FLG_CREOLE            | Glottolog classifies Krio under Indo-European and no exact existing AFRIK family matches.             |
| LANG_CRE_2           | Nigerian Pidgin English | FLG_CREOLE            | Glottolog classifies Nigerian Pidgin under Indo-European and no exact existing AFRIK family matches.  |
| LANG_CRE_3           | Cr√©ole cap-verdien     | FLG_CREOLE            | Glottolog classifies Kabuverdianu under Indo-European and no exact existing AFRIK family matches.     |
| LANG_CRE_4           | Cr√©ole seychellois     | FLG_CREOLE            | Glottolog classifies Seselwa under Indo-European and no exact existing AFRIK family matches.          |
| LANG_CRE_5           | Cr√©ole mauricien       | FLG_CREOLE            | Glottolog classifies Morisyen under Indo-European and no exact existing AFRIK family matches.         |

## Database impact

The live Supabase `afrik_languages` table contained 0 rows when checked read-only for this ticket. No database deletion or migration was needed or applied. The CSV remains the repository language-tier catalog.

## Audit trail

The companion `language-tier-audit-glottolog-5.3-manifest.csv` preserves the original identifier, name, ISO code, and family for every source record together with its decision, replacement when applicable, and reason. Ambiguous original records are therefore resolved as explicit removals rather than unresolved retained data.
