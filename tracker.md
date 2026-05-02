# EthniAfrica -- Suivi d'enrichissement des fiches peuples

## PHASE 1 TERMINEE

- **Phase 1** (fiches avec N/A) : **334 / 334** (100%)
- **Phase 2** (fiches sommaires sans N/A) : 0 / 593 (0%)
- **Total** : 334 / 927 (36.0%)

## Statistiques Phase 1

- Debut : 25 mars 2026, 17h43 CET
- Fin : 26 mars 2026, 02h20 CET
- Duree : ~8h30
- Nombre de runs : 17 (initial + 16 cron)
- Fiches traitees par run : 20 (4 sous-agents de 5)
- Zero "N/A" restant sur l'ensemble des 334 fiches

## Historique des runs

| Run      | Heure (CET) | Fiches | Cumul | Familles                                      |
| -------- | ----------- | ------ | ----- | --------------------------------------------- |
| Initial  | 25/03 17:43 | 20     | 20    | FLG_BANTU demarre                             |
| Cron #1  | 25/03 18:34 | 20     | 40    | Diverses, ADAMAWA_UBANGI, ATLANTIQUE termines |
| Cron #2  | 25/03 19:38 | 20     | 60    | FLG_BANTU en cours                            |
| Cron #3  | 25/03 20:34 | 20     | 80    | FLG_BANTU 76%                                 |
| Cron #4  | 25/03 21:38 | 20     | 100   | Milestone 100                                 |
| Cron #5  | 25/03 22:34 | 20     | 120   | FLG_BANTU 94%                                 |
| Cron #6  | 25/03 23:35 | 20     | 140   | FLG_BANTU TERMINE                             |
| Cron #7  | 26/03 00:37 | 20     | 160   | FLG_BENOUECONGO TERMINE                       |
| Cron #8  | 26/03 00:55 | 20     | 180   | FLG_COUCHITIQUE 55%                           |
| Cron #9  | 26/03 01:05 | 20     | 200   | FLG_COUCHITIQUE TERMINE                       |
| Cron #10 | 26/03 01:18 | 20     | 220   | CREOLE, GUR, ISOLAT TERMINES                  |
| Cron #11 | 26/03 01:29 | 20     | 240   | KHOE, KROU, KXA TERMINES                      |
| Cron #12 | 26/03 01:40 | 20     | 260   | FLG_MANDE TERMINE                             |
| Cron #13 | 26/03 01:50 | 20     | 280   | FLG_NIGERCONGO en cours                       |
| Cron #14 | 26/03 02:00 | 20     | 300   | Milestone 300                                 |
| Cron #15 | 26/03 02:09 | 20     | 320   | NILOSAHARIENNE en cours                       |
| Cron #16 | 26/03 02:20 | 14     | 334   | PHASE 1 COMPLETE                              |

## Toutes les familles (Phase 1)

| Famille               | Fiches  | Statut  |
| --------------------- | ------- | ------- |
| FLG_BANTU             | 118/118 | TERMINE |
| FLG_NIGERCONGO        | 60/60   | TERMINE |
| FLG_COUCHITIQUE       | 44/44   | TERMINE |
| FLG_BENOUECONGO       | 29/29   | TERMINE |
| FLG_MANDE             | 20/20   | TERMINE |
| FLG_CREOLE            | 9/9     | TERMINE |
| FLG_KROU              | 9/9     | TERMINE |
| FLG_GUR               | 8/8     | TERMINE |
| FLG_NILOSAHARIENNE    | 8/8     | TERMINE |
| FLG_ATLANTIQUE        | 7/7     | TERMINE |
| FLG_NILOTIQUE         | 4/4     | TERMINE |
| FLG_SEMITIQUE         | 4/4     | TERMINE |
| FLG_TCHADIQUE         | 3/3     | TERMINE |
| FLG_ISOLAT            | 2/2     | TERMINE |
| FLG_KHOE              | 2/2     | TERMINE |
| Indo-europeenne       | 2/2     | TERMINE |
| FLG_ADAMAWA_UBANGI    | 1/1     | TERMINE |
| FLG_KXA               | 1/1     | TERMINE |
| FLG_SOUDANIQUECENTRAL | 1/1     | TERMINE |
| FLG_UNKNOWN           | 1/1     | TERMINE |
| Diverses              | 1/1     | TERMINE |

## Doublons identifies

- PPL_NZEMA / PPL_NZIMA (meme peuple Nzema)
- PPL_GOURO / PPL_GURO (meme peuple Kweni/Guro)
- PPL_BANDI / PPL_GBANDI (meme peuple Bandi)
- PPL_LOMA / PPL_TOMA_LOMA (meme peuple Loma/Toma)
- PPL_MANDINKA_MALINKE / PPL_MANDINKA_MANDINGUE (meme peuple Mandinka)
- PPL_GANGUELA / PPL_NGANGUELA (meme ensemble Nganguela)
- PPL_NYANEKA / PPL_NYANEKA_NKHUMBI (sous-ensemble vs ensemble)
- PPL_TUTRUGBU / PPL_NYANGBO (meme peuple)
- PPL_AMERICANO_LIBERIENS / PPL_AMERICO_LIBERIANS (meme peuple)
- PPL_TOKELAU_FAUXEX : erreur, peuple polynesien pas africain

## Notes de classification

- Plusieurs peuples dans FLG_COUCHITIQUE sont linguistiquement omotiques ou nilo-sahariens
- PPL_MAHN (FLG_KROU) est linguistiquement mande
- Fiches documentent la classification linguistique reelle dans le contenu

## Prochaine etape : Phase 2

- 593 fiches sommaires sans "N/A" mais a approfondir
- Objectif : enrichir le contenu pour atteindre le standard PPL_KABYLE (~135 lignes)
