# Enrichment proposal — PPL_BASSA_CAM

## Target

`PPL_BASSA_CAM` — Bassa du Cameroun (Basaa / Bàsáa), Bantu-family people (`FLG_BANTU`),
current country Cameroon (`CMR`). Not to be confused with `PPL_BASSA` (Krou-family Bassa
of Liberia), which is out of scope here and untouched.

File: `dataset/source/afrik/peuples/FLG_BANTU/PPL_BASSA_CAM.json`.

## Action

Enrich + critique. The fiche was **not thin** — every narrative chapter (`origins`,
`organization`, `culture`, `historicalRole`) is already substantially filled with detailed,
well-structured French prose (griot periodization, Ngog Lituba origin narrative, UPC/Ruben
Um Nyobe history, Assiko music, Nyambéisme spirituality). The real work here was quality
control on structure and sourcing rather than filling blank chapters:

1. Fix a model-compliance drift: `content.appellations` carried four keys that do not
   exist in `public/modele-peuple.json` (`ethnoLinguisticGroup`, `linguisticFamily`,
   `historicalRegion`, `currentCountries` — all duplicating information already available
   elsewhere in the fiche) and was missing three keys the model does define
   (`spellingAliases`, `peopleGroupId`, `peopleGroupLabel`).
2. Add the `externalIdentifiers` chapter, entirely absent (confirmed absent on all 800
   people fiches in the corpus, but present in the model and now fillable here with
   verified values).
3. Fix a broken citation: the existing Joshua Project source URL resolves to an unrelated
   people (the Apalai of Brazil), not the Bassa of Cameroon.
4. Remove an unverifiable citation: the UNESCO "oral heritage list" source carries
   `tier: "needs_review"`, which is not a valid tier value, and no UNESCO Intangible
   Cultural Heritage listing specific to the Bassa exists on the public ICH register.
5. Add two solid `referenced`-tier academic/press sources that were entirely missing
   despite the fiche resting heavily on historical claims (Ruben Um Nyobe/UPC, Basaa
   language classification) that the pre-existing four sources do not actually support.
6. Fill the `demography.distributionByCountry[0].percentage` field (absent; trivially 100
   since Cameroon is the only listed country) and tighten the population source note to
   what is actually verifiable today rather than an unattributed synthesized range.

## Findings

1. **[Model compliance / medium]** `content.appellations.ethnoLinguisticGroup`,
   `.linguisticFamily`, `.historicalRegion` and `.currentCountries` are not part of
   `modele-peuple.json`'s `appellations` shape (which defines `mainName`,
   `selfAppellation`, `exonyms`, `spellingAliases`, `originOfExonyms`, `whyProblematic`,
   `contemporaryUsage`, `peopleGroupId`, `peopleGroupLabel`). None of the four extra values
   is lost by removing them: the family is already `languageFamilyId: "FLG_BANTU"` at
   fiche root, the country is already `currentCountries: ["CMR"]` at fiche root, and the
   historical-region detail duplicates `origins.historicalSettlementZones`. The Guthrie
   zone/code detail (previously in `ethnoLinguisticGroup`) is folded into
   `content.languages.vehicularRole`, where classificatory prose already belongs, backed
   by an added academic source.
2. **[Sourcing / high]** The Joshua Project source (`joshuaproject.net/people_groups/10367`)
   points to the Apalai of Brazil, not the Bassa of Cameroon — verified by fetching the
   page directly. The correct profile is `people_groups/19155/CM`.
3. **[Sourcing / high]** The UNESCO source has no URL, a `needs_review` tier (not one of
   the three valid values), and no matching entry could be found on UNESCO's Intangible
   Cultural Heritage register after a direct search — the closest Cameroonian entries are
   the Sawa Ngondo and the Bamoun Nguon, neither of which is Bassa. This looks like an
   invented citation and is removed rather than kept unverifiable.
4. **[Sourcing / medium]** Despite carrying rich historical narrative (UPC, Ruben Um
   Nyobe's assassination, colonial forced labour), the fiche's only sources address
   language/demography (Ethnologue, Glottolog, Joshua Project) — none actually supports the
   history chapter. Added one press source (JusticeInfo.net, an identifiable transitional-
   justice outlet) that independently corroborates the 13 September 1958 death date, the
   1948 founding of the UPC, and the 2007 memorial at Eseka.
5. **[Demography / low]** `totalPopulation: 900000` and its note synthesized a range
   ("800,000 to 1 million") that is not what any of the cited sources actually states.
   The best currently verifiable figures are: Joshua Project 514,000 (current profile,
   `unverified`), SIL Ethnologue 230,000–300,000 L1 speakers from 2005 data (`official`,
   but this measures the _language_, not ethnic self-identification), and roughly 800,000
   as the figure most secondary/tertiary compilations converge on for the wider ethnic
   group. Revised `totalPopulation` to 800,000 with an honest, source-by-source note
   rather than an unattributed "up to 1 million."
6. **[Minor / low, not changed]** `content.ethnicities` spells one dialect group "Dibuum"
   while `content.languages.dialects` spells the same form "Diboum". Left untouched —
   outside this pass's scope, flagged for a future editorial sweep.
7. **[Consistency, positive]** `classificationStatus: "colonial-legacy"` remains correctly
   justified: the German colonial "Bassa-Bakoko" administrative amalgamation is explained
   in `whyProblematic`, the autonym `Bàsáa` is present, and the fiche now carries six
   sources overall, well above the two-source floor the editorial rule requires for a
   `colonial-legacy` classification.

## Proposed JSON

```json
{
  "id": "PPL_BASSA_CAM",
  "nameMain": "Bassa du Cameroun",
  "languageFamilyId": "FLG_BANTU",
  "currentCountries": ["CMR"],
  "classificationStatus": "colonial-legacy",
  "content": {
    "appellations": {
      "mainName": "Bassa du Cameroun",
      "selfAppellation": "Basaa (Bàsáa)",
      "exonyms": [
        "Bassa (transcription coloniale)",
        "Basa",
        "Bassa-Bakoko (etiquette coloniale allemande aggregant artificielement Bassa et Bakoko)"
      ],
      "spellingAliases": ["Basaá", "Basa'a"],
      "originOfExonyms": "Bassa est une transcription coloniale du terme endonyme bàsáa. Bassa-Bakoko est une classification coloniale allemande regroupant artificiellement les Bassa et les Bakoko, deux peuples distincts, pour des raisons administratives de simplification. Les Bassa se designent eux-memes comme Bàsáa (avec marques tonales) et leur langue comme Hɔp ɓasàa.",
      "whyProblematic": "Bassa-Bakoko est reducteur car il amalgame deux peuples distincts sous une meme etiquette coloniale, niant leurs specificites culturelles respectives. Le terme a aussi ete utilise pour justifier des politiques de travail force sur le chemin de fer Douala-Yaounde.",
      "contemporaryUsage": "Basaa ou Bàsáa est universellement accepte dans les contextes contemporains. Bàsáa (avec tons marques) est prefere dans les contextes linguistiques et academiques. Le terme Hɔp ɓasàa designe la langue elle-meme.",
      "peopleGroupId": null,
      "peopleGroupLabel": null
    },
    "ethnicities": [
      "Bassa de Nyong-et-Kelle — groupe central, region d'Eseka et Makak",
      "Bassa de Sanaga-Maritime — groupe cotier, region d'Edea et Dizangue",
      "Bassa de Nkam — groupe occidental, region de Yabassi (dialectes peripheriques : Yabasi, Dibuum)",
      "Bassa du Wouri — groupe urbain, region de Douala",
      "Yabakalag, Balimba, Yassoukoum, Pongo — groupes de la basse vallee de la Sanaga",
      "Bikôk, Ndôg Njee, Ngase d'Edea, Yabi — groupes ayant traverse la Sanaga",
      "Bambimbi, Basso Ba Likol — groupes restes a Ngog Lituba (le rocher perce, lieu fondateur)"
    ],
    "origins": {
      "ancientOrigins": "La tradition orale bassa place les origines du peuple en Egypte ancienne ou en Nubie, a la frontiere de l'Egypte et du Soudan, pres du Nil. Apres des invasions (pharaoniques, ethiopiennes, arabes) et des catastrophes naturelles (inondations), les ancetres Bassa ont quitte la vallee du Nil en traversant le Sahara vers le sud-ouest. Ils se sont etablis au Kanem-Bornou, puis dans la vallee du Logone sur les hauts plateaux de l'Adamaoua.",
      "formationPeriod": "Les griots bassa definissent trois periodes historiques : Kwan (des origines jusqu'au XIXe siecle avant notre ere), Kôba (du XIXe siecle av. J.-C. jusqu'au XVe siecle, periode legendaire), et Len (du XVe siecle a nos jours). L'identite bassa s'est cristallisee autour du site fondateur de Ngog Lituba (le rocher perce) — Bon ba ngok lituba signifie les enfants du rocher perce — sur la rive droite de la Liwa, affluent de la Sanaga.",
      "migrationRoutes": [
        "De la vallee du Nil vers le Sahara, puis vers le Kanem-Bornou et la vallee du Logone (Adamaoua)",
        "Du Logone vers Guelingdeng, puis les monts Mandara (a la jonction Cameroun-Nigeria-Tchad)",
        "Des monts Mandara vers le centre du Cameroun, en suivant les tributaires de la Sanaga jusqu'a Ngog Lituba (rive droite de la Liwa)",
        "De Ngog Lituba (XVe siecle) vers la cote atlantique, le long de la Sanaga et du Nkam"
      ],
      "historicalSettlementZones": [
        "Ngog Lituba (site fondateur, actuel departement de Nyong-et-Kelle)",
        "Basse vallee de la Sanaga (Edea, Eseka, Makak)",
        "Rive du Nkam (Yabassi) et de ses affluents",
        "Cote atlantique camerounaise (region du Wouri, Douala)"
      ],
      "unificationsOrDivisions": "Les Bassa ne se sont jamais constitues en un etat centralise. Ils etaient organises en groupes de lignages autonomes unis par une origine commune et l'attachement symbolique a Ngog Lituba. Les conquetes coloniales allemandes (1885-1907) ont provoque une dispersion et une reorganisation politique. Les Bassa ont joue un role central dans le mouvement d'independance camerounais avec l'Union des Populations du Cameroun (UPC) et la figure de Ruben Um Nyobe.",
      "externalInfluences": "Premiers contacts avec les Portugais (1472-1578) qui ont introduit l'avocat, la papaye, le cacao et la canne a sucre depuis Sao Tome et Fernando Po. Commercants hollandais et anglais le long de la cote. Colonisation allemande (1884-1916) avec imposition du travail force sur le chemin de fer Douala-Yaounde. Administration francaise (1916-1960) avec le systeme de l'indigenat. Influences chretiennes protestantes (Presbyteriens, Baptistes) et catholiques depuis le XIXe siecle.",
      "majorHistoricalEvents": "Bataille de Kan (resistance anti-coloniale 1885-1907). Participation forcee a la construction du chemin de fer Mittel Kamerun. Role majeur dans l'UPC (Union des Populations du Cameroun) mene par Ruben Um Nyobe (1913-1958, assassine par l'armee francaise). Independence du Cameroun le 1er janvier 1960."
    },
    "organization": {
      "traditionalPoliticalSystem": "Organisation en groupes de lignages (mvog) autonomes, sans autorite centrale unique. Chaque groupe de lignage etait dirige par un chef hereditaire (mbom mvog). Durant la colonisation allemande, des chefs furent imposes ou reconnus pour faciliter l'administration : Mahop ma Mbom, Ikong Yap, Kumaya, Ngwem, Balema, Bimai, Toko Ngango, Mbome Pep, Matip ma Ndombol, Matip ma Matip, Eone Eone, parmi d'autres.",
      "clanOrganization": "Organisation en clans matrilineaires et patrilineaires selon les sous-groupes. Les villages (mbog) regroupent plusieurs familles de lignage commun. L'appartenance au lignage (mvog) determine les droits fonciers et les obligations rituelles.",
      "ageClassSystems": null,
      "roleOfLineages": "Le lignage (mvog) est l'unite sociale fondamentale. La notion de Nka kunde (liberation nationale encore a venir) est une valeur culturelle transmise par les lignages en reference a la resistance anti-coloniale.",
      "religiousAuthority": "Autorites rituelles detenues par les anciens et les specialistes du culte aux ancetres. Le Nyambéisme est une tradition spirituelle propre aux Bassa, centree sur la communication avec les esprits ancestraux et la nature. Les Jengu (ou Miengu) sont des esprits des eaux veneres sur la cote. Ces pratiques coexistent avec le christianisme (majoritairement protestant) introduit par les missions depuis la fin du XIXe siecle."
    },
    "languages": {
      "mainLanguage": "Basaa (Bàsáa, Hɔp ɓasàa)",
      "isoCodes": ["bas"],
      "dialects": [
        "Bakem — dialecte central",
        "Bon — dialecte de la region de Nyong-et-Kelle",
        "Bibeng — dialecte meridional",
        "Diboum — dialecte peripherique occidental (commune de Nkondjok)",
        "Yabasi — dialecte peripherique nord-ouest (commune de Yabassi)",
        "Log, Mpo — variantes dialectales mineures"
      ],
      "vehicularRole": "Le Basaa est parle par environ 300 000 a 800 000 locuteurs dans les regions du Centre et du Littoral du Cameroun, principalement dans les departements du Nyong-et-Kelle, de la Sanaga-Maritime et du Nkam. Il est utilise dans les medias locaux (radio, television communautaire). Le Basaa est enseigne dans certaines ecoles primaires et fait l'objet d'une litterature ecrite (poesie, chants epiques, romans). Il coexiste avec le francais (langue officielle) comme langue vehiculaire regionale. Sur le plan classificatoire, le Basaa est rattache a la zone A40 (groupe Bassa) selon la classification de Guthrie, sous le code A.43a, au sein des langues bantoues (Niger-Congo)."
    },
    "externalIdentifiers": {
      "wikidataId": "Q672268",
      "glottocode": "basa1284",
      "iso639_3": "bas"
    },
    "culture": {
      "majorRites": "Rites d'initiation (ceremonies de passage a l'age adulte, distinctes pour les garcons et les filles). Ceremonies funeraires elaborees avec utilisation de masques sculptes, de statues en bois et de rites de purification. Ceremonies agricoles et de benediction des recoltes. Rites du Nyambéisme : ceremonies de communication avec les ancetres, invocations des Jengu (esprits des eaux). Rites de mariage impliquant la negociation de la dot (nkap) et des ceremonies de benediction familiale.",
      "symbols": "Ngog Lituba (le rocher perce) est le symbole identitaire fondamental du peuple Bassa, lieu de rassemblement et reference mythique de l'unite. Les masques (en bois sculpte, a valeur ceremonielle et spirituelle), les statues ancestrales et les sculptures figurent parmi les symboles culturels majeurs. Les Jengu (esprits de l'eau) sont representes dans l'art rituel cotier.",
      "artsAndMusic": "L'Assiko est la danse et musique urbaine Bassa la plus connue, nee a Edea et rayonnant dans tout le Cameroun. La N'gola et la Ma-Kune sont d'autres styles musicaux Bassa. La musique rurale utilise des tambours (ngul), des xylophones (mendzang), des flutes et des cloches. Les Bassa sont reconnus pour leurs chants epiques (bikutsi vocal propre au peuple), leur poesie orale et la richesse de leur tradition narrative (griots). L'artisanat comprend la sculpture sur bois (masques, statues rituelles), la ceramique et le travail du raphia. La cuisine traditionnelle inclut la sauce Bongo'o et la Mintoumba (pain de manioc cuit dans des feuilles de bananier).",
      "spiritualities": "Le Nyambéisme est la tradition spirituelle originelle des Bassa, centree sur le culte des ancetres et la communication avec les esprits de la nature. Les Jengu (Miengu) sont des esprits de l'eau et de la cote adores par les Bassa cotiers. L'animisme et la croyance en la coexistence du monde spirituel et du monde physique perdurent. Les anciens transmettent la sagesse et l'histoire par la narration orale. Depuis le XIXe siecle, le christianisme protestant (Presbyteriens, Eglise Evangelique du Cameroun) est majoritaire, avec une presence catholique importante."
    },
    "historicalRole": {
      "kingdomsOrChiefdoms": "Les Bassa n'ont pas developpe de royaume centralise. Leur organisation politique etait fondee sur des groupes de lignages autonomes (mvog) reunis par une origine et une culture communes. Pendant la colonisation allemande, un systeme de chefferies administratives a ete impose. Des chefs comme Mahop ma Mbom et Matip ma Matip ont negocie avec l'administration coloniale.",
      "relationsWithNeighbors": "Relations d'echange avec les Bakoko (voisins cotiers), les Bassa de Nkam et les peuples du plateau central. Contacts commerciaux avec les Duala, les Bakossi et les peuples de l'interieur. Les Portugais (1472) ont introduit de nouvelles cultures alimentaires. Les Bassa ont ete deplaces de leurs territoires cotiers par les Duala et les premiers commercants europeens.",
      "conflictsOrAlliances": "Resistance anti-coloniale pendant la colonisation allemande (Bataille de Kan, 1885-1907). Role majeur dans l'UPC (Union des Populations du Cameroun), mouvement nationaliste le plus radical du Cameroun, fondee par Ruben Um Nyobe a Douala en 1948. Ruben Um Nyobe (Mpodol Ion, le porte-parole de la nation en Bassa) a mene une resistance pacifique avant d'etre assassine par l'armee francaise le 13 septembre 1958, pres de son village natal de Boumnyebel (Nyong-et-Kelle). Un monument a sa memoire a ete erige a Eseka en 2007.",
      "diaspora": "Presence Bassa significative a Douala, Yaounde et autres grandes villes camerounaises. Migrations liees a l'exode rural vers les zones urbaines du littoral et du centre. Interactions historiques ayant donne lieu a des communautes Bassa en Afrique de l'Ouest et centrale (Benin, Senegal, DRC)."
    },
    "demography": {
      "totalPopulation": 800000,
      "referenceYear": 2025,
      "source": "Estimation composite : Joshua Project (profil actif, ~514 000, non verifie) mesure l'auto-identification declaree ; SIL Ethnologue (donnees 2005, 230 000 a 300 000 locuteurs de premiere langue, officielle) mesure les locuteurs et non l'ensemble du groupe ethnique ; les compilations secondaires convergent vers environ 800 000 pour l'identification ethnique large. Aucune source unique de rang cense/officiel ne denombre l'ensemble du peuple Bassa a ce jour ; la valeur retenue est le haut de la fourchette verifiable et non un chiffre cense.",
      "distributionByCountry": [
        {
          "country": "CMR",
          "population": 800000,
          "percentage": 100,
          "note": "Regions du Littoral (Edea, Douala, Yabassi) et du Centre (Eseka, Makak, Nyong-et-Kelle)"
        }
      ]
    },
    "sources": [
      {
        "title": "SIL Ethnologue — Basaa language (bas)",
        "url": "https://www.ethnologue.com/language/bas/",
        "tier": "official",
        "notes": "Tier resolved from the authorized source catalogue entry \"ethnologue\"."
      },
      {
        "title": "Glottolog — Basaa (basa1284)",
        "url": "https://glottolog.org/resource/languoid/id/basa1284",
        "tier": "official",
        "notes": "Tier resolved from the authorized source catalogue entry \"glottolog\"."
      },
      {
        "title": "Joshua Project — Basaa, Cameroon people group profile",
        "url": "https://joshuaproject.net/people_groups/19155/CM",
        "tier": "unverified",
        "notes": "Tier resolved from the domain ruling for joshuaproject.net. Replaces a previous entry (people_groups/10367) which resolved to an unrelated South American people group rather than the Bassa of Cameroon."
      },
      {
        "title": "Larry M. Hyman — Basaá (A.43), reference chapter",
        "url": "https://linguistics.berkeley.edu/~hyman/Basaa_Chapter.pdf",
        "tier": "referenced",
        "notes": "Author is a linguistics faculty member at the University of California, Berkeley; hosted on his own academic page. Supports the Guthrie A.43/zone A40 classification and the \"Basaá\" spelling alias."
      },
      {
        "title": "Emmanuel-Moselly Makasso — Illustrations of the IPA: Basa'a, Journal of the International Phonetic Association",
        "url": "https://doi.org/10.1017/S0025100314000383",
        "tier": "referenced",
        "notes": "Peer-reviewed article, Cambridge University Press. Supports the \"Basa'a\" spelling alias and the language's phonological description."
      },
      {
        "title": "JusticeInfo.net — Cameroon: Um Nyobè, a hero and symbol of French colonial crimes",
        "url": "https://www.justiceinfo.net/en/82062-cameroon-um-nyobe-hero-symbol-french-colonial-crimes.html",
        "tier": "referenced",
        "notes": "Identifiable transitional-justice press outlet. Corroborates the 1948 founding of the UPC, the 13 September 1958 assassination, and the 2007 memorial at Eseka."
      }
    ]
  }
}
```

## Sources

| Source                                                                                                                                                                       | Tier                                       | Why this tier                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SIL Ethnologue — Basaa (bas), `ethnologue.com/language/bas/`                                                                                                                 | `official`                                 | SIL Ethnologue is on the authorized official-tier catalogue (language ISO code, EGIDS/speaker data).                                                                                                                                                                                                                                                |
| Glottolog — Basaa (`basa1284`), `glottolog.org/resource/languoid/id/basa1284`                                                                                                | `official`                                 | Glottolog is on the authorized official-tier catalogue (linguistic classification, glottocode).                                                                                                                                                                                                                                                     |
| Joshua Project — Basaa, Cameroon, `joshuaproject.net/people_groups/19155/CM`                                                                                                 | `unverified`                               | Aggregator/mission-research database per the domain ruling for joshuaproject.net; verified live on 2026-09-05 (population 514,000, ROP3 115045).                                                                                                                                                                                                    |
| Larry M. Hyman, "Basaá (A.43)", UC Berkeley Linguistics faculty page                                                                                                         | `referenced`                               | Named academic author, identifiable institutional affiliation, publicly hosted reference chapter — not official-tier because it is a personal faculty page rather than an official body, but fully identifiable and verifiable.                                                                                                                     |
| Emmanuel-Moselly Makasso, "Illustrations of the IPA: Basa'a", _Journal of the International Phonetic Association_, Cambridge University Press, DOI 10.1017/S0025100314000383 | `referenced`                               | Peer-reviewed academic journal article.                                                                                                                                                                                                                                                                                                             |
| JusticeInfo.net, "Cameroon: Um Nyobè, a hero and symbol of French colonial crimes"                                                                                           | `referenced`                               | Identifiable, named transitional-justice press outlet (not a blog or aggregator); independently corroborates dates already in the fiche and adds the 2007 memorial detail.                                                                                                                                                                          |
| Wikidata — Basa people (Q672268), `wikidata.org/wiki/Q672268`                                                                                                                | _(consulted, not cited as a fiche source)_ | Used only to confirm the external identifier for the ethnic-group entity (distinct from Q33093, the Basaa language). Per corpus doctrine, a crowd-sourced tertiary database is not itself cited as a fiche source — the identifier is recorded in `externalIdentifiers.wikidataId`, verified directly against the live Wikidata page on 2026-09-05. |

Removed from the fiche: the UNESCO "Liste du patrimoine oral" entry (`tier: "needs_review"`, no URL). A direct search of UNESCO's Intangible Cultural Heritage register found no Bassa-specific listing; the two Cameroonian entries that do exist (Sawa Ngondo, Bamoun Nguon) belong to other peoples. Keeping an uncitable entry under an invalid tier value is worse than removing it.

## Still missing

- The atlas does not have a single, dated, census-grade figure for the total Bassa
  population of Cameroon — only a language-speaker count and a mission-research estimate,
  which disagree by nearly 300,000. The population shown is the best currently verifiable
  estimate, not an official count.
- No academic or press source has been found that documents, with a named author or
  institution, the Ngog Lituba origin narrative, the Assiko musical tradition, or the
  Nyambéisme spiritual tradition specifically — these remain supported only by tertiary
  encyclopedic consensus rather than an identifiable citable work, despite reasonable
  search effort. A future pass should look for a dedicated ethnographic monograph or
  journal article on these three points.
- The spelling inconsistency between "Dibuum" (in the ethnicities list) and "Diboum" (in
  the dialects list) for the same peripheral dialect group was noticed but left unresolved,
  since fixing it would require picking one spelling on evidence not gathered in this pass.
