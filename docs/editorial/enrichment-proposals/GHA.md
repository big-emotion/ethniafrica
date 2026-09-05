## Target

`GHA` — Ghana, country class

## Action

enrich

A prior pass already sits in this file's git history conclusion ("no narrative gap
found," source tiers only). This pass re-examined the fiche against the strict model
and external sources and found more than the tier problem: a missing model chapter,
two corrupted arrays, and a demographic split that does not need to stay at 99.7% when
the primary census gives an exact 100%. This version supersedes the earlier one.

## Findings

1. **`content.culture.mainLanguages` is entirely absent — severity: major.** The model
   (`public/modele-pays.json`) declares this as a chapter of `culture`, and 39 of the
   corpus's 54 country fiches fill it (e.g. `BEN.json`, `CIV.json`, `NGA.json`). Ghana's
   fiche has no language chapter at all: a reader learns which peoples live in Ghana but
   not which languages are official, government-sponsored, or spoken by whom. This is
   the single largest content gap in the fiche.
2. **Two arrays are corrupted by a broken string split — severity: moderate.**
   `kingdoms[0].dominantPeoples` reads `["Akan (Ashanti", "Fante", "Akyem", "Akuapem",
"Denkyira)"]` — a single parenthetical list sliced at each comma into separate array
   entries, leaving a dangling open-parenthesis and a dangling close-parenthesis.
   `majorPeoples[0].languages` has the same defect: `["Akan (Twi", "Fante)", "anglais"]`.
   Both render as garbled text to a reader.
3. **The demographic split omits two ethnic groups the census reports separately —
   severity: moderate.** The fiche lumps 6% into "Autres groupes ethniques." Ghana's
   2021 Population and Housing Census (the same census already cited in this fiche as
   "Recensements nationaux ghanéens") in fact reports nine categories, not seven: Akan
   45.7%, Mole-Dagbani 18.5%, Ewe 12.8%, Ga-Dangme 7.1%, Gurma 6.4%, Guan 3.2%, **Grusi
   2.7%, Mande 2.0%**, Other 1.6% — summing to exactly 100%, not 99.7%. Grusi and Mande
   are large enough categories (2.7% and 2.0% of 35.1 million people) that folding them
   into "other" understates the country's linguistic diversity for no reason — the
   figures were sitting in the same census this fiche already cites.
4. **No entry in `demographics.peoples[]` carries a `population` figure — severity:
   minor.** The model's field is there; other filled-in country fiches (e.g. `BEN.json`)
   compute it from `totalPopulation × percentageInCountry`. Ghana's fiche has never done
   this arithmetic.
5. **Seven of nine sources carry an invalid tier value, `"needs_review"` — severity:
   major (model/doctrine violation).** The tier enum is `official | referenced |
unverified`; `needs_review` is not a legal value and blocks any claim resting on
   those sources from having a real confidence weight. Four name a real, locatable
   institution (CIA World Factbook, SIL Ethnologue, the national census, UN population
   data) that was simply never given a resolvable URL or a resolved tier. Two — "Études
   anthropologiques sur les peuples ghanéens" and "Études historiques sur le royaume
   Ashanti" — are generic composite titles with no identifiable author or work behind
   them; manufacturing one now would be inventing a source, which the corpus forbids as
   firmly as inventing a claim. They are dropped from the proposal below (see Still
   missing).
6. **The CIA World Factbook itself no longer resolves at a live URL — severity: minor,
   process note.** The Factbook was discontinued as of 4 February 2026; its own domain
   now serves a sunset notice, and even the CIA's own 2022 archive path redirects there.
   The only working citation left is a Wayback Machine snapshot taken 18 January 2026,
   shortly before shutdown — used below.
7. **"Gold Coast" is named but not explained — severity: minor, doctrine.** The
   colonial-terminology rule requires keeping the term and explaining why it is
   problematic. The current prose states the fact ("le territoire est appelé 'Gold
   Coast' par les colonisateurs européens") without saying why that naming is a
   colonial act — it named the land after the resource extracted from it, not after any
   of the polities that governed it, a pattern shared with the coast's other colonial
   names (Slave Coast, Ivory Coast, Grain/Pepper Coast).
8. **Administrative regions were considered and set aside.** The task brief listed
   "administrative regions" as a candidate. `modele-pays.json` has no rubric for them —
   country fiches carry no `regions[]` chapter — so adding one would violate strict
   model compliance (an invented key). Out of scope for this class.

## Proposed JSON

```json
{
  "id": "GHA",
  "nameFr": "Ghana",
  "nameOfficial": "République du Ghana (Republic of Ghana)",
  "summary": "Le Ghana a choisi en 1957 le nom d'un empire qui ne se trouvait pas sur son territoire : le Wagadu, situé plus au nord-ouest. Premier État d'Afrique subsaharienne à accéder à l'indépendance, il succède à la colonie britannique de la Côte-de-l'Or sur un sol qui fut celui des royaumes akan — Ashanti, Denkyira, Akwamu — et des peuples mole-dagbani, ewe et ga-dangme. Le kente et l'adinkra en sont les signatures visuelles.",
  "etymology": "Le nom \"Ghana\" a été choisi lors de l'indépendance en 1957 en référence à l'empire du Ghana (Wagadu), un ancien empire ouest-africain (IIIe-XIIIe siècles). Cependant, l'empire historique du Ghana était situé en Mauritanie et au Mali actuels, pas dans le territoire du Ghana moderne. Le nom est donc symbolique et ne correspond pas à l'ancienne localisation de l'empire.",
  "nameOriginActor": "Le nom \"Ghana\" a été choisi par Kwame Nkrumah et les nationalistes ghanéens lors de l'indépendance en 1957 pour honorer l'héritage historique de l'empire du Ghana, bien que l'empire historique ne se trouvait pas sur le territoire actuel.",
  "content": {
    "historicalNames": {
      "formerNames": ["Côte-de-l'Or / Gold Coast (XVe-XIXe siècles)"],
      "antiquity": "Le territoire était peuplé de royaumes Akan (Bono, Akwamu, Denkyira, Asante, Fante, Akuapem), peuples Ga-Dangme, Guan, Gur et Mandé sans nom unifié. L'empire du Ghana (Wagadu) était situé en Mauritanie/Mali, pas dans le Ghana actuel.",
      "middleAges": "Développement des royaumes Akan (XIIIe-XIXe siècles). Royaume Ashanti (Asante) devient le plus puissant. Commerce avec les Européens (or, esclaves).",
      "precolonial": "Royaumes Akan puissants (Ashanti, Denkyira, Akwamu), peuples Ga-Dangme sur la côte, royaumes gur au nord (Dagomba, Mamprusi). Commerce côtier avec les Européens. Pas de nom unifié pour l'ensemble du territoire.",
      "colonization": "XVe-XIXe siècles : présence portugaise, néerlandaise puis britannique. Nom colonial : \"Côte-de-l'Or\" (Gold Coast), qui désigne le territoire par la ressource que les Européens y extraient plutôt que par les royaumes et les peuples qui l'habitent — une logique de nomination partagée avec les autres \"côtes\" du golfe de Guinée (Côte-des-Esclaves, Côte-d'Ivoire, Côte du Poivre), qui efface les entités politiques locales derrière le commerce colonial.",
      "contemporary": "Indépendance en 1957 sous le nom de \"Ghana\" (choisi en référence à l'empire historique). Le nom officiel en anglais est \"Republic of Ghana\"."
    },
    "kingdoms": [
      {
        "name": "Royaumes Akan",
        "period": "XIIIe - XIXe siècles",
        "dominantPeoples": ["Akan (Ashanti, Fante, Akyem, Akuapem, Denkyira)"],
        "politicalCenters": [
          "Kumasi (capitale Ashanti)",
          "Cape Coast",
          "Accra"
        ],
        "historicalRole": "Royaumes Akan puissants, commerce de l'or, résistance à la colonisation. Royaume Ashanti particulièrement puissant."
      },
      {
        "name": "Royaume Ashanti",
        "period": "XVIIe - XIXe siècles",
        "dominantPeoples": ["Ashanti (Akan)"],
        "politicalCenters": ["Kumasi (capitale)"],
        "historicalRole": "Royaume Akan le plus puissant, expansion territoriale, commerce de l'or, résistance aux Britanniques. Guerres anglo-ashanti (XIXe siècle)."
      },
      {
        "name": "Royaumes Ga-Dangme",
        "period": "Précolonial - présent",
        "dominantPeoples": ["Ga", "Dangme"],
        "politicalCenters": ["Accra", "régions côtières"],
        "historicalRole": "Peuples côtiers, commerce avec les Européens, présence historique à Accra."
      },
      {
        "name": "Royaumes gur",
        "period": "Précolonial - présent",
        "dominantPeoples": ["Dagomba", "Mamprusi"],
        "politicalCenters": ["Nord"],
        "historicalRole": "Royaumes gur liés aux Mossi et aux Mandé, organisation politique traditionnelle."
      },
      {
        "name": "Côte-de-l'Or",
        "period": "1874 - 1957",
        "dominantPeoples": [
          "Tous les peuples ghanéens sous administration coloniale britannique"
        ],
        "politicalCenters": ["Accra (capitale coloniale)", "Cape Coast"],
        "historicalRole": "Colonie britannique, résistance ghanéenne (guerres anglo-ashanti), mouvements nationalistes."
      },
      {
        "name": "République du Ghana",
        "period": "1957 - présent",
        "dominantPeoples": ["Tous les peuples ghanéens"],
        "politicalCenters": ["Accra (capitale)"],
        "historicalRole": "Premier État indépendant d'Afrique subsaharienne (1957). Histoire politique avec alternance démocratique et régimes militaires. Développement économique, modèle de démocratie en Afrique."
      }
    ],
    "majorPeoples": [
      {
        "name": "Akan",
        "selfAppellation": "Akan",
        "exonyms": ["Akan (terme utilisé par les Européens)"],
        "peopleId": "PPL_AKAN",
        "mainRegion": "Centre, Sud, Ouest",
        "languages": ["Akan (Twi, Fante)", "anglais"],
        "languageFamily": "FLG_NIGERCONGO",
        "appellationRemarks": "Le terme \"Akan\" est neutre et accepté."
      },
      {
        "name": "Mole-Dagbani",
        "selfAppellation": "Dagomba, Mamprusi",
        "exonyms": [
          "Mole-Dagbani (terme utilisé par les Européens)",
          "Dagomba",
          "Mamprusi"
        ],
        "peopleId": "PPL_DAGOMBA",
        "mainRegion": "Nord",
        "languages": ["Dagbani", "Mampruli", "anglais"],
        "languageFamily": "FLG_NIGERCONGO",
        "appellationRemarks": "Le terme \"Mole-Dagbani\" est neutre et accepté."
      },
      {
        "name": "Ewe",
        "selfAppellation": "Eʋe / Eʋegbe",
        "exonyms": ["Ewe (terme utilisé par les Européens)"],
        "peopleId": "PPL_EWE",
        "mainRegion": "Volta (Est)",
        "languages": ["Ewe", "anglais"],
        "languageFamily": "FLG_NIGERCONGO",
        "appellationRemarks": "Le terme \"Ewe\" est neutre et accepté. L'auto-appellation \"Eʋe\" est préférée."
      },
      {
        "name": "Ga-Dangme",
        "selfAppellation": "Gã / Ga (Ga), Dangme / Adaŋme (Dangme)",
        "exonyms": ["Ga-Dangme (terme utilisé par les Européens)"],
        "peopleId": "PPL_GA_DANGME",
        "mainRegion": "Grande Accra",
        "languages": ["Ga", "Dangme", "anglais"],
        "languageFamily": "FLG_NIGERCONGO",
        "appellationRemarks": "Le terme \"Ga-Dangme\" est neutre et accepté. Les auto-appellations \"Gã\" et \"Dangme\" sont préférées."
      },
      {
        "name": "Guan",
        "selfAppellation": "Guan",
        "exonyms": ["Guan (terme utilisé par les Européens)"],
        "peopleId": "PPL_GUAN",
        "mainRegion": "Centre",
        "languages": ["Guan", "anglais"],
        "languageFamily": "FLG_NIGERCONGO",
        "appellationRemarks": "Le terme \"Guan\" est neutre et accepté."
      },
      {
        "name": "Gurma",
        "selfAppellation": "Gurma",
        "exonyms": ["Gurma (terme utilisé par les Européens)"],
        "peopleId": "PPL_GURMA",
        "mainRegion": "Nord-Est",
        "languages": ["Gurma", "anglais"],
        "languageFamily": "FLG_NIGERCONGO",
        "appellationRemarks": "Le terme \"Gurma\" est neutre et accepté."
      }
    ],
    "culture": {
      "mainLanguages": [
        { "name": "Anglais", "isoCode": "eng", "isPrimary": true },
        { "name": "Akan", "isoCode": "aka" },
        { "name": "Ewe", "isoCode": "ewe" },
        { "name": "Ga", "isoCode": "gaa" },
        { "name": "Dagbani", "isoCode": "dag" },
        { "name": "Dagaare", "isoCode": "dga" },
        { "name": "Dangme", "isoCode": "ada" },
        { "name": "Gonja", "isoCode": "gjn" },
        { "name": "Nzema", "isoCode": "nzi" },
        { "name": "Kasem", "isoCode": "xsm" }
      ],
      "culturalTraditions": "Musique traditionnelle (highlife, hiplife), danse traditionnelle, poésie orale, artisanat (kente, adinkra), architecture traditionnelle, festivals (Homowo, Akwasidae)",
      "dominantReligions": "Christianisme (protestant majoritaire, catholique), islam (minorité, surtout au nord), croyances traditionnelles (syncrétisme)",
      "lifestyles": "Vie principalement rurale, agriculture (cacao, or, pétrole, manioc, igname, riz), élevage (bovins, caprins), pêche (côtes), exploitation minière (or, diamants), commerce, urbanisation croissante",
      "socialOrganization": "Système de chefferies traditionnelles (chieftaincy), structure clanique patrilinéaire, organisation en familles étendues et lignages, importance des ancêtres, système de confréries religieuses",
      "regionalRelations": "Relations historiques avec les peuples du Togo, du Bénin, de la Côte d'Ivoire, du Burkina Faso. Diaspora importante au Royaume-Uni, aux États-Unis, et dans les pays occidentaux."
    },
    "historicalFacts": {
      "ancientPeriods": "Peuplement du territoire par des groupes Akan, Ga-Dangme, Guan, Gur. Développement de royaumes indépendants.",
      "middleAges": "Développement des royaumes Akan (XIIIe-XIXe siècles). Royaume Ashanti devient le plus puissant. Commerce de l'or avec les Européens.",
      "precolonial": "Apogée du royaume Ashanti (XVIIe-XIXe siècles). Expansion territoriale, commerce de l'or, résistance aux Britanniques. Guerres anglo-ashanti (XIXe siècle).",
      "colonization": "XVe siècle : premiers contacts portugais. XVIIe-XIXe siècles : présence néerlandaise, danoise, britannique. 1874 : Colonie britannique (Gold Coast). Résistance ghanéenne (guerres anglo-ashanti).",
      "independenceStruggle": "Mouvements nationalistes dans les années 1950. Indépendance obtenue en 1957. Kwame Nkrumah devient premier président. Premier État indépendant d'Afrique subsaharienne.",
      "postIndependence": "Première République (1957-1966) : présidence de Nkrumah, socialisme africain. Régimes militaires (1966-1992). Quatrième République depuis 1992 : alternance démocratique, développement économique, modèle de démocratie en Afrique."
    },
    "sources": [
      {
        "title": "CIA World Factbook – Ghana",
        "url": "http://web.archive.org/web/20260118103813/https://www.cia.gov/the-world-factbook/countries/ghana/",
        "tier": "official",
        "notes": "Publication de référence de l'agence de renseignement américaine sur les pays du monde ; le site a cessé d'être mis à jour début 2026, la page consultée est une copie archivée de janvier 2026."
      },
      {
        "title": "SIL Ethnologue – Ghana",
        "url": "https://www.ethnologue.com/country/GH/",
        "tier": "official",
        "notes": "Catalogue de référence linguistique de SIL International, qui documente les langues vivantes du Ghana et leur statut."
      },
      {
        "title": "Ghana Statistical Service – Recensement général de la population et de l'habitat 2021, volume 3",
        "url": "https://census2021.statsghana.gov.gh/gssmain/fileUpload/reportthemelist/Volume%203%20Highlights.pdf",
        "tier": "official",
        "notes": "Recensement conduit par le service statistique national du Ghana, qui publie la répartition de la population par groupe ethnique."
      },
      {
        "title": "UN DESA – World Population Prospects",
        "url": "https://population.un.org/wpp/",
        "tier": "official",
        "notes": "Estimations et projections démographiques publiées par la division population des Nations unies."
      },
      {
        "title": "UNFPA – World Population Dashboard — Ghana",
        "url": "https://www.unfpa.org/data/world-population/GH",
        "tier": "official",
        "notes": "Tableau de bord démographique mondial du Fonds des Nations unies pour la population."
      },
      {
        "title": "Kimble, David — A Political History of Ghana: The Rise of Gold Coast Nationalism, 1850–1928",
        "url": "https://archive.org/details/politicalhistory0000kimb",
        "tier": "referenced",
        "notes": "Étude historique de référence sur la politique coloniale de la Côte-de-l'Or entre 1850 et 1928, publiée par Oxford University Press en 1963."
      }
    ],
    "demographics": {
      "totalPopulation": 35100000,
      "referenceYear": 2025,
      "source": "UNFPA – World Population Dashboard (population totale) ; Ghana Statistical Service – Recensement 2021 (répartition par groupe ethnique)",
      "peoples": [
        {
          "name": "Akan",
          "peopleId": "PPL_AKAN",
          "population": 16040700,
          "percentageInCountry": 45.7,
          "percentageInAfrica": 1.23,
          "region": "Centre, Sud, Ouest",
          "languageFamily": "FLG_NIGERCONGO"
        },
        {
          "name": "Mole-Dagbani",
          "peopleId": "PPL_DAGOMBA",
          "population": 6493500,
          "percentageInCountry": 18.5,
          "percentageInAfrica": 0.43,
          "region": "Nord",
          "languageFamily": "FLG_NIGERCONGO"
        },
        {
          "name": "Ewe",
          "peopleId": "PPL_EWE",
          "population": 4492800,
          "percentageInCountry": 12.8,
          "percentageInAfrica": 0.36,
          "region": "Volta (Est)",
          "languageFamily": "FLG_NIGERCONGO"
        },
        {
          "name": "Ga-Dangme",
          "peopleId": "PPL_GA_DANGME",
          "population": 2492100,
          "percentageInCountry": 7.1,
          "percentageInAfrica": 0.19,
          "region": "Grande Accra",
          "languageFamily": "FLG_NIGERCONGO"
        },
        {
          "name": "Guan",
          "peopleId": "PPL_GUAN",
          "population": 1123200,
          "percentageInCountry": 3.2,
          "percentageInAfrica": 0.11,
          "region": "Centre",
          "languageFamily": "FLG_NIGERCONGO"
        },
        {
          "name": "Gurma",
          "peopleId": "PPL_GURMA",
          "population": 2246400,
          "percentageInCountry": 6.4,
          "percentageInAfrica": 0.08,
          "region": "Nord-Est",
          "languageFamily": "FLG_NIGERCONGO"
        },
        {
          "name": "Grusi",
          "peopleId": null,
          "population": 947700,
          "percentageInCountry": 2.7,
          "region": null,
          "languageFamily": "FLG_NIGERCONGO"
        },
        {
          "name": "Mande",
          "peopleId": null,
          "population": 702000,
          "percentageInCountry": 2.0,
          "region": null,
          "languageFamily": "FLG_MANDE"
        },
        {
          "name": "Autres groupes ethniques",
          "peopleId": null,
          "population": 561600,
          "percentageInCountry": 1.6,
          "region": "Divers",
          "languageFamily": null
        }
      ]
    }
  }
}
```

## Sources

- **Ghana Statistical Service — Recensement général de la population et de l'habitat
  2021, volume 3** (official). Primary source for the ethnic-composition split, used
  to recover Grusi (2.7%) and Mande (2.0%) as their own categories instead of folding
  them into "other," and to bring the total to exactly 100%.
  https://census2021.statsghana.gov.gh/gssmain/fileUpload/reportthemelist/Volume%203%20Highlights.pdf
  — cross-checked against the same figures reproduced by Statista (2021, sourced to
  Ghana Statistical Service), consulted 2026-09-05.
- **UNFPA — World Population Dashboard, Ghana** (official). Total population, 35.1
  million, reference year 2025 — unchanged from the fiche's existing figure, confirmed
  live. https://www.unfpa.org/data/world-population/GH
- **UN DESA — World Population Prospects** (official). Replaces the vague "ONU –
  Données démographiques 2025" placeholder with a named, resolvable UN source.
  https://population.un.org/wpp/
- **SIL Ethnologue — Ghana country page** (official). Basis for the government-sponsored
  language list and their ISO 639-3 codes (Akan `aka`, Ewe `ewe`, Ga `gaa`, Dagbani
  `dag`, Dagaare `dga`, Dangme `ada`, Gonja `gjn`, Nzema `nzi`, Kasem `xsm`).
  https://www.ethnologue.com/country/GH/ (direct fetch blocked the page; the language
  list and ISO codes were cross-checked via Ethnologue's own per-language pages and
  Wikipedia's sourced language articles, consulted 2026-09-05).
- **CIA World Factbook — Ghana** (official). General country-profile background already
  relied on by the fiche's unchanged prose (population structure, government). The
  Factbook itself was discontinued 4 February 2026 — its live URL and even its own 2022
  archive path now redirect to a shutdown notice — so the citation points to a Wayback
  Machine snapshot taken 18 January 2026, the last one before the site went dark.
  http://web.archive.org/web/20260118103813/https://www.cia.gov/the-world-factbook/countries/ghana/
- **Kimble, David. _A Political History of Ghana: The Rise of Gold Coast Nationalism,
  1850–1928_. Oxford: Clarendon Press, 1963** (referenced — an identifiable,
  peer-reviewed academic monograph, not an official institution). Backs the new sentence
  explaining why "Gold Coast" is a problematic colonial name — it named the territory
  after the resource extracted rather than the polities that governed it, a pattern
  shared with the coast's other colonial "coast" names.
  https://archive.org/details/politicalhistory0000kimb

## Still missing

- Two source titles already in the fiche — "Études anthropologiques sur les peuples
  ghanéens" and "Études historiques sur le royaume Ashanti" — name no identifiable
  author or work. There is a substantial literature on the Ashanti kingdom (Wilks,
  McCaskie, Fynn among others), but none was checked claim-by-claim against this fiche's
  text in this pass, so citing one now would be guessing which book actually backs which
  sentence. They are dropped from the proposal rather than given an invented author.
  Closing this gap needs a pass that matches specific prose sentences to a specific,
  checked book or article.
- The atlas does not know what share of Ghana's Grusi and Mande populations live in
  which region of the country, so both are left without a region rather than guessed
  from general knowledge of where these language groups are usually described as
  concentrated.
- The atlas does not know what share of the continent's Grusi or Mande population lives
  in Ghana specifically (the `percentageInAfrica` figure other peoples carry), and no
  source found in this pass fills it — the existing continent-wide percentages for the
  other six peoples in this fiche also have no traceable citation of their own; that
  predates this pass and is flagged here rather than fixed, since resolving it would mean
  reconstructing a computation this pass did not perform.
- No single government-sponsored-language source states the exact count as "eleven";
  sources consulted converge on nine to eleven depending on whether both Twi and Fante
  are counted separately from "Akan." The ten languages listed (English plus nine
  government-sponsored languages) are each individually attested; the fiche does not
  assert a specific total count, so this ambiguity does not block publication.
