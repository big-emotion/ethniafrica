## Target

`dataset/source/afrik/peuples/FLG_KROU/PPL_BASSA.json` — the Bassa people of Liberia
(secondarily Côte d'Ivoire and Sierra Leone), Kru language family. `currentCountries`
confirms this is the Krou-family fiche, not the Bantu Basaa of Cameroon
(`PPL_BASSA_CAM`, family `FLG_BANTU`), the Bassa-Nge/Bassa of Nigeria
(`PPL_BASSA_NIGERIA`, family `FLG_BENOUECONGO`) or the Bassari
(`PPL_BASSARI`, family `FLG_NIGERCONGO`). Only `PPL_BASSA.json` was read or touched;
the other three were located with `find` to confirm they are separate files and were
never opened.

## Action

This is a **proposal only** — `PPL_BASSA.json` was not edited and nothing was
committed. The finding going in was that this fiche is not actually "thin" in the
sense of empty prose: `appellations`, `ethnicities`, `origins`, `organization`,
`languages`, `culture` and `historicalRole` are all already substantially written.
What is genuinely missing or weak is structural and source-hygiene work:

1. `content.externalIdentifiers` is entirely absent — the model
   (`public/modele-peuple.json`, cross-checked against the authoritative
   `PeopleContent`/`AppellationsSection` TypeScript shape in `src/types/afrik.ts`)
   declares this section and it was never populated.
2. `content.demography.distributionByCountry[]` entries are missing the `percentage`
   field the `CountryDistribution` type declares.
3. Two `sources[]` entries carry `"tier": "needs_review"`, which is not one of the
   three canonical tiers (`official | referenced | unverified`) — the corpus's own
   type comment (`FicheSource` in `src/types/afrik.ts`) describes `needs_review` as
   exactly the tail this kind of pass is supposed to close out.
4. Two prose claims already in the fiche — the Vah/Ehni Ka Se Fa script's history,
   and the "Adbassa Empire" Nile-valley oral-tradition origin story — carry **no
   citation at all** in the existing `sources[]`, despite being specific, checkable
   claims.
5. The `languages.dialects` list names two sociological clusters (coastal/forest)
   that are not attested dialect names in any linguistic source found; a real,
   sourced dialect inventory exists (SIL Ethnologue via the Bassa language article).

Nothing in `organization`, `culture`, `historicalRole` or the exonym/appellation
prose was rewritten — those claims cannot be re-verified from scratch within this
pass without risking silently overwriting editorially-reviewed prose with paraphrase.
One factual concern in that prose is flagged under "Still missing" instead of
silently "corrected."

## Findings

**Distinguishing this Bassa from the Cameroonian Bassa/Basaa.** Confirmed at the
outset and again via Wikidata: the Liberia/Sierra Leone Bassa people have their own
Wikidata item, **Q810462** ("ethnic group in Liberia and Sierra Leone"), distinct from
the Bassa **language** item Q34949 and from the Cameroonian Bassa people. The fiche's
existing `whyProblematic` text already surfaces this distinction correctly.

**Population — three disagreeing figures, none of them cleanly verifiable.**

- SIL Ethnologue (18th ed., 2015, based on **2006** data), reached via the English
  Wikipedia "Bassa language" article's infobox because `ethnologue.com` returns
  HTTP 403 to automated fetches: 783,000–865,000 speakers in Liberia, 2,000–14,000
  in Côte d'Ivoire, 7,300–11,000 in Sierra Leone. This is the only figure with a
  clear edition/year attribution I could directly verify.
- Liberia's 2022 Population and Housing Census: national total population
  **5,248,621** (census night 10–11 Nov 2022) is solidly confirmed via the UN
  Liberia press release. A specific "Bassa = 13.6% of Liberia" figure circulates
  widely (would imply ≈714,000), but every trace of it I found resolves back to
  either an old CIA World Factbook 2008 estimate (13.4%, via indexmundi) or to
  **Grokipedia**, an AI-generated tertiary encyclopedia — not to the primary LISGIS
  report table itself. Attempts to fetch the LISGIS PDF directly failed
  (`ECONNRESET`). I did not use this figure as the proposed total for that reason;
  it is flagged under "Still missing" instead.
- Wikipedia's "Bassa people (Liberia)" article cites a CIA-Factbook-derived figure
  of ~900,000–1,141,500 (18% of Liberia). The CIA World Factbook itself has been
  discontinued (confirmed by fetching cia.gov directly, which now only shows a
  sunset notice), so this figure cannot be re-verified at its source either.

Given this, the proposal below anchors `totalPopulation` on the Ethnologue figures
(the only one with a checkable citation), while documenting the census-based
alternative for a human editor to resolve.

**Vah script.** The existing `languages.vehicularRole` text about the Bassa Vah
(Ehni Ka Se Fa) alphabet turns out to be accurate and checks out against real
literature — it was just uncited. Confirmed via the Unicode Technical Committee's
own final encoding proposal (Everson & Riley 2010) and via the bibliography of the
English Wikipedia "Bassa Vah alphabet" article: revived from a nearly extinct
script rediscovered among Bassa descendants in Brazil and the West Indies, revived
in Liberia by Thomas Flo Lewis, a promotional association founded in 1959, later
classified as a "failed script," and standardized in Unicode 7.0 (June 2014) at
U+16AD0–U+16AFF as 23 consonants, 7 vowels and 5 tone diacritics. "Ehni Ka Se Fa" is
confirmed as a real name for the script, derived from the names of its first four
consonant letters (a Bassa equivalent of "ABC").

**Nile-valley / "Adbassa Empire" origin narrative.** This is not an invented claim —
it is a genuinely documented, circulating oral tradition, found independently on
several Liberian/diaspora blogs (e.g. "The Egyptian Origins of the Bassa of
Liberia"). It should carry a citation reflecting that status (oral tradition, tier
`unverified`) rather than none at all. Interestingly, the same blog frames this
Kemetic-origin narrative as shared across several distinct "Bassa"-named peoples
across the continent (Cameroon, Nigeria, Senegal, DRC…) — worth noting precisely
because the corpus deliberately treats these as separate fiches; the shared name
is not evidence of a shared origin, and the proposal does not merge or imply that.

**Real dialect inventory.** Ethnologue (via the same Wikipedia infobox) documents a
15–18-dialect continuum in four geographic clusters — Western (Mambahn, Gibi),
Central (Kokoyah, Mehnwein, Hwengbarkon, Kor, Gbor, Neekreen, Gbehzohn, Gba Sor),
Rivercess (Nibuehnxwiniin), and Eastern (Kplor, Dorbor, Gbii, Doru, Beleto). This is
a real, sourceable improvement over the fiche's current two generic entries
("Bassa côtier" / "Bassa forestier"), which read more like the coastal/forest
_ethnicities_ split already recorded elsewhere in the fiche than like attested
dialect names.

**Source-tier resolution.**

- West Africa Democracy Radio (`wadr.org`) is a named, editorially staffed West
  African regional public radio outlet — a byline press article, which the corpus's
  own tier table places at `referenced` ("published, identifiable, verifiable...
  press"), not `needs_review`.
- The vague, URL-less "Liberia Census 2022" entry is replaced with the actual
  LISGIS report (found, though its content could not be fetched) plus the UN
  Liberia press release that independently confirms the national total —
  `official` tier for both, government/UN statistical bodies.

**An open concern I did not silently fix.** `content.organization.traditionalPoliticalSystem`
names a "Port Society" alongside Sande/Bondo as a parallel governance institution.
Every broader source on Liberian secret societies I could reach describes the
men's counterpart as the **Poro** society, not "Port Society" — this reads like it
could be a transcription slip. I could not reach a source specific enough to the
Bassa (rather than Liberian secret societies in general) to confirm the correction
with a citable source in the time available (Sage Reference and Minority Rights
Group, both already cited by the fiche, are paywalled/blocked to automated fetch),
so it is left as-is in the proposal and flagged below rather than "corrected" on
inference alone.

## Proposed JSON

```json
{
  "id": "PPL_BASSA",
  "nameMain": "Bassa",
  "languageFamilyId": "FLG_KROU",
  "currentCountries": ["LBR", "CIV", "SLE"],
  "classificationStatus": "consensual",
  "content": {
    "appellations": {
      "mainName": "Bassa",
      "selfAppellation": "Bassa",
      "exonyms": ["Bassa", "Gboboh", "Adbassa", "Bambog-Mbog"],
      "originOfExonyms": "Le nom Bassa derive selon la tradition orale de Bassa Sooh Nyombe signifiant les gens du Pere Pierre. Les premiers commercants europeens n'ayant pu prononcer la phrase complete, la forme abregee Bassa s'est imposee dans la litterature occidentale. Les variantes Gboboh et Adbassa sont des designations internes.",
      "whyProblematic": "Le terme Bassa est parfois confondu avec le peuple Bassa du Cameroun, dont la langue appartient au groupe bantou de la famille Niger-Congo. Il s'agit d'une entité distincte des Bassa du Liberia, dont la langue bassa (bsq) appartient à la famille krou.",
      "contemporaryUsage": "Le terme Bassa est universellement utilise au Liberia pour designer ce peuple. Ils se designent eux-memes comme Bassa et parlent le bassa (bsq). Ils constituent le deuxieme groupe ethnique du Liberia.",
      "linguisticFamily": "FLG_KROU",
      "ethnoLinguisticGroup": "Kru (Niger-Congo), confederation des peuples kru du Liberia et de la Cote d'Ivoire",
      "historicalRegion": "Cote liberienne centrale (Grand Bassa, Rivercess, Margibi, Montserrado)",
      "currentCountries": ["LBR", "CIV", "SLE"]
    },
    "ethnicities": [
      "Bassa forestiers de l'interieur (Forest Bassa) : maintien des pratiques traditionnelles et rituelles",
      "Bassa cotiers (Coastal Bassa) : influence du christianisme et de l'economie de traite depuis le XVe siecle",
      "Glebo : sous-groupe interne de l'arriere-pays",
      "Clans patrilineaires varies selon les comtes de Grand Bassa, Rivercess et Margibi"
    ],
    "origins": {
      "ancientOrigins": "La tradition orale et les evidences linguistiques suggerent une origine dans la vallee du Nil (Egypte ou Nubie ancienne), designee sous le nom d'Empire Adbassa dans les recits oraux. Les proto-Bassa auraient commence leur migration vers l'ouest vers le VIe siecle av. J.-C.",
      "formationPeriod": "Migration progressive a travers le Sahara, le Kanem-Bornou et la vallee du Logone. Intermingling avec des populations bantoues et niger-congo le long des routes. Etablissement sur la cote liberienne entre le XVe et le XVIe siecle. Premier contact avec les explorateurs portugais en 1472.",
      "migrationRoutes": [
        "Vallee du Nil vers l'ouest a travers la region sahelo-soudanaise",
        "Kanem-Bornou et vallee du Logone",
        "Progression vers le sud-ouest jusqu'a la foret tropicale liberienne",
        "Installation definitive sur la cote atlantique (XVe-XVIe s.)"
      ],
      "historicalSettlementZones": [
        "Grand Bassa County (foyer historique central)",
        "Rivercess County (arriere-pays forestier)",
        "Margibi County",
        "Montserrado County (dont Monrovia, capitale)"
      ],
      "unificationsOrDivisions": "Organisation en clans lineaires independants, chaque village etant gouverne par un chef hereditaire. Pas d'etat centralise. Resistance aux empiètements des colons americoliberiens a partir de 1822.",
      "externalInfluences": "Contact avec les Portugais (1472) : introduction du manioc et de la canne a sucre. Arrivee des esclaves affranchis americains (1822) et fondation de Liberia : conflits et integration progressive. Influence des Kpelle et Dei : adoption des societes d'initiation Gree-Gree Bush (ecoles de brousse). Influence des Mende : adoption de la societe feminine Sande (Bondo). Christianisme (XIXe-XXe s.) : premiere Bible traduite en bassa en 1922. Revitalisation de l'ecriture indigene Vah (Ehni Ka Se Fa) au debut du XXe siecle.",
      "majorHistoricalEvents": "1472 : premier contact avec les Portugais. 1822 : arrivee des premiers colons americoliberiens en terre bassa. 1847 : fondation du Liberia comme premiere republique africaine, dominant les Bassa comme citoyens de second rang. 1890s : redecouverte de l'ecriture Vah parmi les descendants bassa de la diaspora au Bresil et aux Antilles. 1922 : premiere traduction de la Bible en bassa. Guerres civiles liberians (1989-2003) : impact severe sur les communautes bassa de Monrovia et Grand Bassa."
    },
    "organization": {
      "traditionalPoliticalSystem": "Organisation en villages semi-autonomes sous l'autorite de chefs hereditaires (chiefs). Chaque village constitue une unite politique de base avec son propre chef. La confederation de villages est rare et circonstancielle. Les societes secretes (Port Society pour les hommes, Sande/Bondo pour les femmes) assurent une fonction de gouvernance parallele, de socialisation et de resolution des conflits.",
      "clanOrganization": "Societe patrilineaire organisee en clans lineaires independants. L'appartenance clanique determine l'identite, les droits fonciers et les alliances matrimoniales. Les noms sont attribues selon la lignee, les totems et les circonstances de naissance. Les femmes dominent les marches locaux et jouent un role economique central.",
      "ageClassSystems": "Systeme des ecoles de brousse Gree-Gree (adopte des voisins Dei et Kpelle) : seclusion initiatique des jeunes garcons dans la foret, enseignement des valeurs morales, techniques de chasse, et scarification comme marque de passage a l'age adulte. Les filles passent par la societe Sande (Bondo) pour une initiation equivalente.",
      "roleOfLineages": "Les lignages patrilineaires determinant les alliances, les droits d'acces aux terres agricoles et aux zones de peche, et les obligations ceremoniales. Les ancetres sont invoques lors des ceremonies funebres pour assurer leur bienveillance. Les finials en laiton (batons ancestraux) representent l'ancetre mythique Sma Vlen.",
      "religiousAuthority": "Autorite traditionnelle detenue par les officiants des societes Sande (sowei : officiant portant le masque-casque) et Port Society. Pratique du Gri-Gri (amulettes protectrices). Depuis le XIXe siecle, coexistence du christianisme (majoritaire aujourd'hui) avec les croyances traditionnelles."
    },
    "languages": {
      "mainLanguage": "Bassa (bsq)",
      "isoCodes": ["bsq"],
      "dialects": [
        "Bassa occidental : Mambahn, Gibi",
        "Bassa central : Kokoyah, Mehnwein, Hwengbarkon, Kor, Gbor, Neekreen, Gbehzohn, Gba Sor",
        "Bassa de Rivercess : Nibuehnxwiniin",
        "Bassa oriental : Kplor, Dorbor, Gbii, Doru, Beleto"
      ],
      "vehicularRole": "Le bassa est la langue premiere d'environ 800 000 a 900 000 personnes au Liberia selon SIL Ethnologue (18e edition, 2015, sur la base de donnees de 2006), ou il est la langue majoritaire de Monrovia. L'anglais liberien est la langue officielle et d'enseignement. Le bassa possede un systeme d'ecriture propre revitalise, le Vah (Ehni Ka Se Fa), reactualise au debut du XXe siecle par Thomas Flo Lewis, bien que peu utilise aujourd'hui."
    },
    "externalIdentifiers": {
      "wikidataId": "Q810462",
      "glottocode": "nucl1418",
      "iso639_3": "bsq"
    },
    "culture": {
      "majorRites": "Ecoles de brousse Gree-Gree (initiation masculine) : seclusion en foret, enseignement des valeurs guerrieres et communautaires, scarification, musique rituelle. Societe feminine Sande (Bondo) : initiation feminine, port du masque-casque sowei representant l'esprit ancestral feminin des eaux, enseignement des savoirs feminins. Ceremonies funeraires : dances masquees et inhumation en terres ancestrales, invocation des ancetres via les finials en laiton. Mariage par dot (bride-wealth) : echanges de tissu, outils et biens entre familles. Ceremonies saisonnieres agricoles : ceremonies de semailles et de recolte, sacrifices.",
      "symbols": "Masques Bassa en bois sculpte : faces angulaires specifiques, distingues des peuples voisins. Hiérarchie des masques selon leur fonction : masques terrifiants (esprits de la foret sombre), masques-portraits (beaute et ancestralite), masques sowei de la Sande (beaute feminine idealisee). Finials en laiton (hauts du baton de l'ancetre Sma Vlen). Masques miniatures en laiton Ma go (petites tetes) produits pour les voisins Dan. Scarification comme marque d'identite et de passage initiatique.",
      "artsAndMusic": "Sculpture sur bois : masques aux visages angulaires, tresses sculptees, bonnets tresses. Fonderie a la cire perdue : masques miniatures en laiton (ma go) et finials de batons rituels. Ecriture Vah (Ehni Ka Se Fa) : systeme d'ecriture indigene a base de signes, revitalise au XXe siecle, unique en Afrique de l'Ouest pour sa perennite. Musique rituelle : percussions, chants lors des ceremonies Sande et des veillees funeraires. Artisanat : tissage du country cloth (tissu indigo traditionnel), poterie.",
      "spiritualities": "Religion traditionnelle a base morale et ethique, venerant les ancetres et les esprits surnaturels. Concept d'un Etre Supreme bienveillant et vengeur, premier ancetre puissant, fusionne avec la conception chretienne de Dieu depuis la colonisation. Les masques Sande representent l'esprit ancestral feminin primordial residant dans les eaux. Divination et pratiques de guerison via les societes secretes. Christianity majoritaire aujourd'hui (diverses denominations protestantes et catholiques), avec retention d'elements de la religion traditionnelle."
    },
    "historicalRole": {
      "kingdomsOrChiefdoms": "Pas d'organisation etatique centralisee. Confederation de villages semi-autonomes sous chefs hereditaires. Resistance aux empiètements des colons americoliberiens (1822-1847) et integration progressive dans l'Etat liberian sous statut inferieur.",
      "relationsWithNeighbors": "Relations etroites avec les Kpelle (adoption des ecoles Gree-Gree), les Dei (initiation), les Mende (Sande/Bondo). Echanges artisanaux avec les Dan : production de masques miniatures en laiton (ma go) pour les Dan apres l'interdiction de la bijouterie en laiton (1938). Tension historique avec les colons americoliberiens (Americo-Liberians) qui dominaient politiquement et economiquement les populations autochtones.",
      "conflictsOrAlliances": "Resistance aux empiètements des colons americoliberiens aux XIXe-XXe siecles. Implication dans les guerres civiles liberians (1989-2003) : les zones bassa de Monrovia et Grand Bassa furent particulierement touchees. Les Bassa furent victimes de violences de la part de diverses factions armees.",
      "diaspora": "Presence de descendants bassa parmi les descendants africains au Bresil et aux Antilles (trace de la redecouverte de l'ecriture Vah dans les annees 1890). Communautes bassa dans les grandes villes du Liberia (Monrovia notamment). Refugies en Sierra Leone et en Cote d'Ivoire lors des guerres civiles."
    },
    "demography": {
      "totalPopulation": 841000,
      "referenceYear": 2006,
      "source": "SIL Ethnologue, Bassa (bsq), 18e edition (2015), fourchettes de locuteurs datees de 2006 : Liberia 783 000 a 865 000, Cote d'Ivoire 2 000 a 14 000, Sierra Leone 7 300 a 11 000 (milieux de fourchette retenus ici). Le total national de la population liberienne (5 248 621 habitants) est confirme par le recensement general de la population et de l'habitat du Liberia de 2022 (LISGIS / ONU Liberia) ; la part specifique des Bassa dans ce recensement, citee par endroits a environ 13,6 %, n'a pas pu etre verifiee dans le rapport primaire durant cette recherche.",
      "distributionByCountry": [
        {
          "country": "LBR",
          "population": 824000,
          "percentage": 98.0,
          "note": "Grand Bassa, Rivercess, Margibi, Montserrado (Monrovia) ; milieu de la fourchette SIL Ethnologue 783 000-865 000 (donnees 2006)"
        },
        {
          "country": "CIV",
          "population": 8000,
          "percentage": 0.95,
          "note": "Communautes de l'ouest de la Cote d'Ivoire ; milieu de la fourchette SIL Ethnologue 2 000-14 000 (donnees 2006)"
        },
        {
          "country": "SLE",
          "population": 9000,
          "percentage": 1.05,
          "note": "Freetown et zones frontalieres ; milieu de la fourchette SIL Ethnologue 7 300-11 000 (donnees 2006)"
        }
      ]
    },
    "sources": [
      {
        "title": "Glottolog 5.3 — Bassa (bsq)",
        "url": "https://glottolog.org/resource/languoid/id/nucl1418",
        "tier": "official",
        "notes": "Tier resolved from the authorized source catalogue entry for Glottolog; supports the Kru classification."
      },
      {
        "title": "SIL Ethnologue — Bassa (bsq)",
        "url": "https://www.ethnologue.com/language/bsq/",
        "tier": "official",
        "notes": "Tier resolved from the authorized source catalogue entry \"ethnologue\". ethnologue.com returns HTTP 403 to automated fetches, so the 18th-edition (2015) speaker figures and dialect-cluster names used in this proposal (demography, languages.dialects) were read from its data as relayed in the infobox of the English Wikipedia article \"Bassa language\", crossed on 2026-09-05."
      },
      {
        "title": "West Africa Democracy Radio — The Bassa Tribe of Liberia (2023)",
        "url": "https://wadr.org/the-bassa-tribe-of-liberia/",
        "tier": "referenced",
        "notes": "Resolved from \"needs_review\": WADR is a named, editorially staffed West African regional public radio outlet; a byline article on its own site is press coverage, which the corpus's tier table places at referenced."
      },
      {
        "title": "Minority Rights Group — Liberia",
        "url": "https://minorityrights.org/country/liberia/",
        "tier": "referenced",
        "notes": "Tier resolved from the domain ruling for minorityrights.org."
      },
      {
        "title": "Sage Reference — Encyclopedia of African Religion, Bassa",
        "url": "https://sk.sagepub.com/ency/edvol/africanreligion/chpt/bassa",
        "tier": "referenced",
        "notes": "Tier resolved from the domain ruling for sk.sagepub.com."
      },
      {
        "title": "Liberia Institute of Statistics and Geo-Information Services (LISGIS) — 2022 Population and Housing Census, Final Results Report",
        "url": "https://www.lisgis.gov.lr/document/LiberiaCensus2022Report.pdf",
        "tier": "official",
        "notes": "Resolved from the URL-less \"needs_review\" entry: national statistics office, official tier. The document itself could not be fetched (connection reset) during this research pass, so only the national total population is used here (corroborated independently below); its ethnic-group breakdown table was not verified."
      },
      {
        "title": "UN Liberia — Liberia announces provisional results of its 5th National Population and Housing Census (2022)",
        "url": "https://liberia.un.org/en/220493-liberia-announces-provisional-results-its-5th-national-population-and-housing-census",
        "tier": "official",
        "notes": "UN country office press release; independently corroborates LISGIS's national total of 5,248,621 (census night 10-11 November 2022) cited in the demography source note."
      },
      {
        "title": "StudyGuides.com — Bassa (People)",
        "url": "https://studyguides.com/study-methods/study-guide/cmfwvocp53ouk016qheb0w9jc",
        "tier": "unverified",
        "notes": "Tier resolved from the domain ruling for studyguides.com."
      },
      {
        "title": "Everson, Michael & Riley, Charles (2010) — Final proposal for encoding the Bassa Vah script in the SMP of the UCS",
        "url": "https://escholarship.org/uc/item/9kf9x726",
        "tier": "referenced",
        "notes": "Unicode Technical Committee encoding proposal, published via UC eScholarship. Newly added to source the Vah/Ehni Ka Se Fa script history already in languages.vehicularRole (revival by Thomas Flo Lewis, 1959 promotional association, standardized in Unicode 7.0/2014 at U+16AD0-U+16AFF, 23 consonants/7 vowels/5 tone diacritics), which previously carried no citation at all. Found via the bibliography of the English Wikipedia article \"Bassa Vah alphabet\", crossed on 2026-09-05."
      },
      {
        "title": "Coulmas, Florian, ed. (1999) — \"Bassa alphabet\", in The Blackwell Encyclopedia of Writing Systems",
        "url": null,
        "tier": "referenced",
        "notes": "Offline book chapter (Wiley/Blackwell); identified via the bibliography of the English Wikipedia article \"Bassa Vah alphabet\", crossed on 2026-09-05, as a second academic source for the Vah script history. Content not independently re-verified."
      },
      {
        "title": "Unseth, Peter (2011) — \"Invention of Scripts in West Africa for Ethnic Revitalization\", in Handbook of Language and Ethnic Identity, Oxford University Press",
        "url": null,
        "tier": "referenced",
        "notes": "Offline book chapter; identified via the bibliography of the English Wikipedia article \"Bassa Vah alphabet\", crossed on 2026-09-05, supporting the script's framing as an ethnic-revitalization project. Content not independently re-verified."
      },
      {
        "title": "\"The Egyptian Origins of the Bassa of Liberia\", Everything Liberia blog (2013)",
        "url": "https://othnieldf.wordpress.com/2013/09/18/the-egyptian-origins-of-the-bassa-of-liberia/",
        "tier": "unverified",
        "notes": "Blog reproducing oral tradition; newly added to source origins.ancientOrigins's Nile-valley/\"Adbassa Empire\" narrative, which previously carried no citation. Cited to establish that the narrative is a genuinely documented oral tradition (consistent with the fiche's own \"la tradition orale... suggere\" framing), not to assert its historicity."
      }
    ]
  }
}
```

## Sources

| Source                                                                                                                            | Tier                                                                                  | Used for                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Glottolog 5.3 — Bassa (bsq)                                                                                                       | official                                                                              | Kru classification (pre-existing, unchanged)                                           |
| SIL Ethnologue — Bassa (bsq), 18th ed. 2015 (2006 data), read via English Wikipedia "Bassa language" infobox (crossed 2026-09-05) | official                                                                              | `demography` totals and per-country figures; `languages.dialects` cluster list         |
| West Africa Democracy Radio — The Bassa Tribe of Liberia (2023)                                                                   | referenced (resolved from needs_review)                                               | pre-existing ethnographic content                                                      |
| Minority Rights Group — Liberia                                                                                                   | referenced                                                                            | pre-existing (unchanged)                                                               |
| Sage Reference — Encyclopedia of African Religion, Bassa                                                                          | referenced                                                                            | pre-existing (unchanged)                                                               |
| LISGIS — 2022 Population and Housing Census, Final Results Report                                                                 | official (resolved from needs_review)                                                 | Liberia's national total population (5,248,621)                                        |
| UN Liberia press release, 2022 census                                                                                             | official                                                                              | corroborates LISGIS total                                                              |
| StudyGuides.com — Bassa (People)                                                                                                  | unverified                                                                            | pre-existing (unchanged)                                                               |
| Everson & Riley (2010), Unicode Bassa Vah proposal, UC eScholarship                                                               | referenced                                                                            | sources the pre-existing, previously uncited Vah script history                        |
| Coulmas, ed. (1999), Blackwell Encyclopedia of Writing Systems, "Bassa alphabet"                                                  | referenced                                                                            | same                                                                                   |
| Unseth (2011), Handbook of Language and Ethnic Identity (OUP)                                                                     | referenced                                                                            | same                                                                                   |
| "The Egyptian Origins of the Bassa of Liberia" blog (2013)                                                                        | unverified                                                                            | sources the pre-existing, previously uncited "Adbassa Empire" oral-tradition narrative |
| Wikidata Q810462 ("Bassa people", ethnic group, Liberia/Sierra Leone)                                                             | — (registry identifier, not a prose claim; verified but not cited as a `FicheSource`) | `externalIdentifiers.wikidataId`                                                       |

Consulted but not cited in the proposal (found, but content could not be verified in
the time available): James Stuart Olson (1996), _The Peoples of Africa: An
Ethnohistorical Dictionary_, Greenwood, pp. 78–79 — identified via the English
Wikipedia "Bassa people (Liberia)" bibliography as a plausible academic reference
for the migration/origin narrative, but its actual text was not accessible during
this research pass, so it was not used to source any specific claim.

## Still missing

The atlas does not have a firm, independently verified current population figure
for the Bassa people of Liberia. Several figures circulate — around 714,000
according to a widely repeated but unconfirmed reading of the 2022 national
census, around 800,000 to 900,000 according to language-speaker estimates, and
over a million according to an older, since-discontinued estimate — and they do
not agree closely enough to settle on one without seeing the original census
tables. This proposal uses the middle, most precisely dated estimate, but a human
reviewer with access to the full 2022 census report should confirm or replace it.

The Liberian census's own breakdown of population by ethnic group could not be
retrieved directly during this research pass, so the exact recent share the Bassa
represent nationally remains unconfirmed here.

One detail already in the fiche could not be checked with confidence: whether the
men's initiation institution named alongside the Sande/Bondo women's society is
correctly named, or whether it should read as the widely attested regional "Poro"
society instead. This needs a source specific to Bassa institutions (rather than
Liberian secret societies in general) to resolve either way.

Finally, a specific academic source for the Bassa migration and settlement
timeline — Olson's 1996 ethnohistorical dictionary entry — was located but its
content could not be read during this pass; a future session with access to the
book (or a library database) could either confirm the fiche's existing migration
narrative against it or reveal that the two disagree.
