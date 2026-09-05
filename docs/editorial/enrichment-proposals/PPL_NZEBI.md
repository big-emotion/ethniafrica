## Target

`PPL_NZEBI` — Nzebi (Ndzébi / Bandjabi / Nzabi), people class, linguistic family `FLG_NIGERCONGO` (Bantu, Guthrie zone B, B52), current countries Gabon (GAB) and Republic of the Congo (COG).

## Action

Enrich (targeted). This fiche was flagged from site analytics as the lowest-engagement people fiche (very fast exit / near-zero scroll depth) and treated as a candidate for being genuinely thin. It is not: verified against the source JSON and against external research, the fiche is one of the more developed entries in the corpus. This pass therefore does not rewrite the fiche — it verifies existing claims against independent sources, resolves one source whose tier was pending review, adds a metadata block the strict model defines but the fiche never filled in, and appends a small number of citation-backed clauses to existing prose fields. No existing value is removed or contradicted.

## Findings

1. **The analytics signal does not indicate thin content — severity: informational, not a defect.** The fiche already carries: an autonym plus nine exonyms with prose on their colonial origin, their problem, and their contemporary use; nine named ethnicities/clans; a full five-field `origins` chapter; a five-field `organization` chapter describing an oratory-based, non-centralized political system; a `languages` chapter naming five dialects; a four-field `culture` chapter; a four-field `historicalRole` chapter; and a `demography` chapter whose two country splits (198,000 GAB + 29,500 COG) sum exactly to the stated total of 227,500. Six sources were already cited, each with a tier. A 4-second, near-zero-scroll session is far more consistent with a bounce (mis-click, closed tab, crawler) than with a reader who found nothing to read. Recommendation: do not use this page's analytics as a signal for content triage without corroborating it against the fiche itself, as done here.
2. **Genuine, narrow gap: `content.externalIdentifiers` was never filled in — severity: minor.** The model defines this block (`wikidataId`, `glottocode`, `iso639_3`), and `languages.isoCodes` already states `"nzb"`, but no cross-reference to Wikidata or Glottolog existed. Resolved this pass: Wikidata carries an unambiguous ethnic-group item for this people (`Q2882351`, labelled "Nzabi", instance-of "ethnic group", associated countries Gabon and Republic of the Congo — an exact match to `currentCountries`), and Glottolog's `njeb1242` entry confirms both the glottocode and the ISO 639-3 code `nzb` already on the fiche.
3. **One source was tiered `needs_review` for lack of a URL — now resolved, severity: minor.** The existing entry for a Musée du quai Branly – Jacques Chirac Nzebi mask carried no URL and no adjudicated tier. This pass located the museum's own announcement of the object (its Friends' association site, 3 July 2018): a bicolour blue-and-white Nzebi mask acquired in 2018 through a gala-dinner fundraiser, shown the previous year in the exhibition "Les forêts natales — Arts de l'Afrique équatoriale atlantique." Tiered `referenced`, following the corpus precedent already set for museum sources (the Metropolitan Museum of Art is tiered `referenced` on `PPL_FANG`, not `official` — a museum is not on the doctrine's `official` list of demographic/linguistic authorities).
4. **New academic sources corroborate, and lightly refine, three existing narrative claims — severity: informational.** Three peer-reviewed or university-vetted works on the Nzebi turned up that the fiche did not yet cite: a 2005 Paris 1 doctoral thesis (Nestor Ide Righou, advised by the Africanist historian Claude-Hélène Perrot), a 2019 monograph by the anthropologist Georges Dupré (a specialist on Central African lineage societies), and a 1979 peer-reviewed article by Gérard Collomb in the Journal des africanistes on the "seven sons of Nzèbi" origin myth already summarised in the fiche's `ancientOrigins` field. Righou's thesis gives a more precise settlement chronology (arrival in southern Gabon around the mid-18th century, first near Moanda, reaching the Mont Makengi area around 1885, and the colonial administration's 1915 creation of a "district des Bandjabis" as a response to local resistance) than the fiche's current "17th-18th century" range — this is added as a refinement, not a replacement, since the two are compatible. Dupré's monograph title itself ("Koto, l'égalité nécessaire" — "Koto, the necessary equality") independently corroborates the fiche's existing claim of a fundamentally egalitarian, non-centralized clan society.
5. **The demography chapter's population figures could not be corrected or replaced, and that is stated rather than papered over.** The CIA World Factbook (official tier) does cover Gabon's ethnic composition, but it reports a composite "Nzabi-Duma" category (11.2% of Gabon's population, 2021 estimate) that fuses the Nzebi with the related Duma people rather than isolating Nzebi alone — and it does not break out Nzebi (or a Nzebi-adjacent category) at all for the Republic of the Congo. A French-language secondary compilation derives a Nzebi-only figure (264,420 in Gabon) by applying the composite percentage to Gabon's total population, but that computation conflates two distinct peoples and is not adopted here. The existing population figures (drawn from PeopleGroups.org, Omniglot and 101lasttribes.com, all `unverified` tier) are left unchanged; the CIA figure is added only as an official-tier order-of-magnitude corroboration, with an explicit note on why it cannot replace the existing count.
6. **No model-compliance defect specific to this fiche.** The fiche's `appellations` block carries four keys (`linguisticFamily`, `ethnoLinguisticGroup`, `historicalRegion`, `currentCountries`) that are not in `public/modele-peuple.json`. This is not a defect unique to `PPL_NZEBI`: the same four keys appear on 765 of the corpus's 800 people fiches, meaning the checked-in model template has not kept pace with actual corpus convention. Removing them here would make this one fiche inconsistent with the rest of the corpus, so they are kept as-is; this finding is corpus-wide and belongs in a separate pass, not in this single-fiche enrichment.

## Proposed JSON

Full fiche, strict model, no key renamed or dropped, no immutable ID touched. Changes from the current file: (a) a new `content.externalIdentifiers` block inserted after `languages` and before `culture` (`historicalAffiliation` stays omitted — Nzebi has a defensible linguistic affiliation to `FLG_NIGERCONGO`, so the model directs omitting that section entirely); (b) one sentence appended to each of `origins.formationPeriod`, `origins.majorHistoricalEvents`, `organization.traditionalPoliticalSystem`, `culture.symbols` and `demography.source`, each carrying its own new citation; (c) the Musée du quai Branly source entry updated in place (title, url, tier, notes) rather than duplicated; (d) five new entries appended to `content.sources`.

```json
{
  "id": "PPL_NZEBI",
  "nameMain": "Nzebi",
  "languageFamilyId": "FLG_NIGERCONGO",
  "currentCountries": ["GAB", "COG"],
  "classificationStatus": "colonial-legacy",
  "content": {
    "appellations": {
      "mainName": "Nzebi",
      "selfAppellation": "Nzebi / Ndzébi",
      "exonyms": [
        "Bandjabi",
        "Bandzabi",
        "Banjabi",
        "Banzabi",
        "Ndjabi",
        "Ndzabi",
        "Njabi",
        "Njawi",
        "Nzabi"
      ],
      "originOfExonyms": "Le terme Bandjabi (ou Bandzabi) est le nom le plus courant donne par les administrateurs coloniaux francais et les peuples voisins. Il derive du prefixe bantou Ba- (pluriel de personnes) suivi du radical nzabi/njabi. Les variantes orthographiques nombreuses refletent les difficultes de transcription du nom par differents observateurs europeens.",
      "whyProblematic": "La multiplicite des graphies (Nzebi, Ndzébi, Njabi, Bandjabi...) engendre des confusions dans la litterature coloniale et ethnographique. Le groupe est parfois confondu avec les Tsaangi, population voisine avec laquelle les Nzebi ont fusionne au fil du temps, creant une identite composite.",
      "contemporaryUsage": "Le terme Nzebi (ou Ndzébi) est celui privilegié dans les publications academiques et par les communautes elles-memes au Gabon et en Republique du Congo. Bandjabi reste courant dans l'usage populaire gabonais.",
      "linguisticFamily": "FLG_NIGERCONGO",
      "ethnoLinguisticGroup": "Bantou (Zone B), sous-groupe B52",
      "historicalRegion": "Province de la Ngounié et province de l'Ogooué-Lolo (Gabon meridional) ; region du Niari (Republique du Congo sud-ouest)",
      "currentCountries": ["GAB", "COG"]
    },
    "ethnicities": [
      "Nzebi proprement dits (Nzebi Nzebi), descendants du heros fondateur Nzebi, peuples de la foret",
      "Tsaangi (Nzebi Tsaangi), descendants du heros Mbéli, anciens producteurs de fer vivant en savane, fusionnes avec les Nzebi",
      "Clan Maghamba — premier clan fonde par les sept patriarches, lie au peuple pygmee Makhamba",
      "Clan Mouanda — clan fondateur, reseau commercial etendu",
      "Clan Bassanga — clan fondateur, traditions guerrieres",
      "Clan Mitshimba — clan fondateur",
      "Clan Cheyi — clan fondateur",
      "Clan Baghuli (Barouli) — clan fondateur",
      "Clan Mboundou — septieme clan fondateur"
    ],
    "origins": {
      "ancientOrigins": "Selon la tradition orale, les Nzebi sont originaires du village de Koto, situe dans la province de la Ngounié au Gabon. Leur ancetre eponyme Nzebi aurait donne naissance aux sept patriarches fondateurs des sept clans principaux. La tradition distingue deux grandes lignes : les Nzebi proprement dits (foret, heros Nzebi) et les Tsaangi (savane, heros Mbéli), qui ont fusionne en un seul groupe au cours d'une migration a une date indeterminee.",
      "formationPeriod": "La consolidation du groupe Nzebi, incluant la fusion avec les Tsaangi, remonte probablement aux 17e-18e siecles. Les Nzebi etaient deja bien etablis dans le Gabon meridional lorsque les premiers explorateurs europeens penetrerent dans la region au 19e siecle. Ils furent decrits a cette epoque comme d'excellents commerçants a longue distance. Selon la these de Nestor Ide Righou (2005, Universite Paris 1), l'installation dans le Gabon actuel se situerait plutot vers le milieu du XVIIIe siecle, avec une premiere implantation pres de Moanda avant une dispersion vers le massif du Chaillu ; le groupe atteint la region du mont Makengi vers 1885.",
      "migrationRoutes": [
        "Migration depuis le village de Koto (Ngounié) vers les forets du Gabon meridional",
        "Expansion vers l'Ogooué-Lolo (est du Gabon)",
        "Passage de certains groupes vers le Niari (sud-ouest du Congo-Brazzaville)"
      ],
      "historicalSettlementZones": [
        "Province de la Ngounié, Gabon (zone principale)",
        "Province de l'Ogooué-Lolo, Gabon",
        "Region du Niari, sud-ouest du Congo-Brazzaville",
        "Migrations urbaines vers Libreville, Port-Gentil et Brazzaville"
      ],
      "unificationsOrDivisions": "Fusion historique des Nzebi et Tsaangi en un groupe identitaire commun, malgre la preservation de deux recits d'origine distincts. Les douze clans actuels (sept issus de Nzebi, cinq issus de Mbéli) coexistent sans hierarchie territoriale fixe, leurs membres etant disperses sur l'ensemble du territoire. L'arrivee de l'economie monetaire coloniale a fragilise l'ordre clanique traditionnel en modifiant les circulations de richesses.",
      "externalInfluences": "Commerce avec les comptoirs europeens le long de l'Ogooué (19e siecle). Les Nzebi furent d'importants producteurs de caoutchouc naturel avant la colonisation francaise. La metalurgie du fer (Tsaangi) disparut apres l'intervention francaise vers 1920. Evangelisation par la Christian and Missionary Alliance a partir des annees 1930. Modernisation administrative, educative et economique sous la colonisation francaise et apres l'independance (1960).",
      "majorHistoricalEvents": "Les Nzebi furent decrits par les explorateurs et missionnaires du 19e siecle comme un peuple industrieux et prospere participant activement au commerce a longue distance (caoutchouc, ivoire, arachides). La colonisation francaise a mis fin a la metallurgie traditionnelle des Tsaangi vers 1920. L'interdiction de la pratique de la circoncision-initiation au village (transferee en dispensaires dans les annees 1950) a entraine la disparition partielle de la transmission des savoirs claniques. Le Gabon independant (1960) a integre les Nzebi dans un Etat-nation sans modifier profondement leurs structures villageoises. L'administration coloniale francaise cree en 1915 le district des Bandjabis, une mesure que l'historien Nestor Ide Righou interprete comme une reponse a la resistance des populations locales a la soumission coloniale."
    },
    "organization": {
      "traditionalPoliticalSystem": "Societe fondamentalement egalitaire sans chefferie centralisee. L'organisation sociale repose sur les clans non territorialises et la solidarite villageoise. Les decisions sont prises collectivement lors de joutes oratoires (mikundukhu, mbomo) presidees par les muyambili (maitres de la parole). Les litiges sont resolus par la parole des muyambili selon des procedures codifiees. Cette organisation, fondee sur une egalite de statut entre clans plutot que sur l'absence de toute autorite, a fait l'objet d'une etude monographique de reference par l'anthropologue Georges Dupre (2019).",
      "clanOrganization": "Douze clans patrilineaires non territorialises, disperses sur l'ensemble du territoire Nzebi. Sept clans sont issus du fondateur Nzebi, cinq du fondateur Mbéli (Tsaangi). L'appartenance clanique determine les droits matrimoniaux, les alliances et les obligations de solidarite. Chaque mariage est conclut par le versement d'une dot (mbwakha) qui lie les clans entre eux.",
      "ageClassSystems": null,
      "roleOfLineages": "Le muyambili (celui qui parle) est l'acteur essentiel detenteur de la memoire clanique. Distingue des l'enfance pour son attitude reservee, il reçoit une education approfondie de son oncle maternel ou d'un ancetre clanique, memorisant l'histoire, les devises et les formules de chaque clan. Son savoir sert lors des joutes oratoires (mikundukhu pour renouer les alliances, mbomo pour les conflits graves de divorce ou de meurtre).",
      "religiousAuthority": "Autorite traditionnelle des guerisseurs et des detenteurs de savoirs rituels. Religion traditionnelle Mbuti (animisme) pratiquee dans les villages. L'Eglise chretienne (Christian and Missionary Alliance) est presente dans presque chaque village depuis les annees 1930. Syncrétisme entre croyances traditionnelles et christianisme."
    },
    "languages": {
      "mainLanguage": "Nzebi (Yinjebi / Inzabi)",
      "isoCodes": ["nzb"],
      "dialects": [
        "Bandjabi — dialecte principal, Ngounié",
        "Adouma (Douma) — dialecte de l'Ogooué-Lolo",
        "Awandji (Wandji) — dialecte du Gabon meridional",
        "Batsiagui — variante dialectale",
        "Sihou (Bassissihou) — variante dialectale"
      ],
      "vehicularRole": "Le nzebi est parle par environ 140 000 personnes principalement dans le sud du Gabon et le sud-ouest du Congo. C'est une langue locale sans role vehiculaire etendu. Le francais est la langue officielle du Gabon et de la Republique du Congo, utilise dans l'administration, l'education et le commerce. Les Nzebi ont un taux d'alphabetisation en francais relativement eleve."
    },
    "externalIdentifiers": {
      "wikidataId": "Q2882351",
      "glottocode": "njeb1242",
      "iso639_3": "nzb"
    },
    "culture": {
      "majorRites": "Rites de circoncision-initiation masculine (anciennement pratiques au village avec transmission des savoirs claniques par les muyambili ; depuis les annees 1950, pratique medicalisee en dispensaires, entrainant la disparition de la transmission initiatique). Ceremonies matrimoniales incluant echanges de dots (mbwakha) entre clans, acte fondateur des alliances inter-claniques. Ceremonies funebres avec partage collectif des denrees. Joutes oratoires ritualisees (mikundukhu et mbomo) pour le reglement des conflits et le renouvellement des alliances.",
      "symbols": "Masque a face humaine (conserve au Musee du Quai Branly, Paris) aux couleurs bipartites — partie gauche bleue et partie droite blanche — symbolisant probablement la dualite Nzebi/Tsaangi ou les mondes des vivants et des morts. Bois padauk (Pterocarpus soyauxii) utilise pour la peinture corporelle rituelle. Instruments en fer forgé (Tsaangi) symboles de prestige. Un masque nzebi bicolore (bleu et blanc), datable de la fin du XIXe ou du debut du XXe siecle, a rejoint les collections du Musee du quai Branly - Jacques Chirac en 2018, don de la Societe des Amis du musee finance lors d'un diner de gala ; il avait ete presente en 2017 dans l'exposition Les forets natales, arts de l'Afrique equatoriale atlantique.",
      "artsAndMusic": "Artisanat varie : vannerie, poterie (ceramique cuite sur feu ouvert), tissage sur metier vertical a une rangee de lisses (emprunte aux Teke), mobilier en bois (instruments de cuisine, peignes, tabourets). Metallurgie du fer chez les Tsaangi (minerai fondu dans des fours enterres, arrete vers 1920). Musique de chasse collective (organisation complexe de roles differencies). Litterature orale riche : proverbes, formules et recits historiques memorises par les muyambili. Cuisine aux nombreux legumes accompagnant viandes et poissons.",
      "spiritualities": "Religion traditionnelle Mbuti (animisme), centree sur les forces invisibles du monde naturel et la mediation des ancetres. Veneration des ancetres comme gardiens de la memoire et de l'ordre social. Croyance en des puissances spirituelles liees aux forets et aux eaux. Pratiques de divination et recours a des plantes medicinales. Syncrétisme prononce entre Mbuti et christianisme dans les villages contemporains. Majorite des Nzebi chretiens (congregations evangeliques et catholiques)."
    },
    "historicalRole": {
      "kingdomsOrChiefdoms": "Pas de royaumes centralises : societe egalitaire organisee en villages autonomes lies par des reseaux claniques. Les Tsaangi etaient connus avant la colonisation comme producteurs de fer (villages de Ngongo et Makengi), contribuant a l'économie regionale. L'absence d'une chefferie centralisee reflete le principe fondateur de l'egalite clanique Nzebi.",
      "relationsWithNeighbors": "Relations d'interdependance et d'echange commercial avec les peuples voisins : Teke (emprunt du metier a tisser), Bapunu, Fang et Kota dans le nord du Gabon. Les Bongo (Babongo-Pygmees) du clan Makhamba sont dans une relation de dependance traditionnelle vis-a-vis du clan Maghamba des Nzebi. Echanges commerciaux intensifs au 19e siecle le long de l'Ogooué.",
      "conflictsOrAlliances": "Les Nzebi furent d'importants acteurs du commerce pre-colonial regroupant caoutchouc, huile de palme, peche et chasse. La colonisation francaise a perturbe l'ordre social en introduisant l'economie monetaire et en interdisant la metallurgie traditionnelle. Resistance passive a l'administration coloniale. Integration progressive dans l'Etat gabonais post-independance.",
      "diaspora": "Diaspora Nzebi dans les centres urbains du Gabon, notamment Libreville (capitale) et Port-Gentil. Presences a Brazzaville (Congo). Migrations economiques vers la France et d'autres pays europeens depuis l'independance."
    },
    "demography": {
      "totalPopulation": 227500,
      "referenceYear": 2025,
      "source": "PeopleGroups.org (2024) : 198 000 au Gabon, 29 500 en Republique du Congo. Omniglot : ~140 000 locuteurs actifs. 101lasttribes.com : total global 227 500 en 2 pays. Le CIA World Factbook regroupe les Nzebi dans une categorie composite Nzabi-Duma, estimee a 11,2% de la population du Gabon (est. 2021) ; ce chiffre officiel confirme l'ordre de grandeur mais n'isole pas les Nzebi des Duma, contrairement aux estimations specifiques citees ci-dessus.",
      "distributionByCountry": [
        {
          "country": "GAB",
          "population": 198000,
          "note": "Provinces de la Ngounié et de l'Ogooué-Lolo ; diaspora a Libreville et Port-Gentil"
        },
        {
          "country": "COG",
          "population": 29500,
          "note": "Region du Niari, sud-ouest de la Republique du Congo"
        }
      ]
    },
    "sources": [
      {
        "title": "101 Last Tribes — Nzebi people",
        "url": "https://www.101lasttribes.com/tribes/nzebi.html",
        "tier": "unverified",
        "notes": "Tier resolved from the domain ruling for 101lasttribes.com."
      },
      {
        "title": "Qiraat Africa — The Nzebi people (2025)",
        "url": "https://qiraatafrican.com/en/15644/the-nzebi-people/",
        "tier": "unverified",
        "notes": "Tier resolved from the domain ruling for qiraatafrican.com."
      },
      {
        "title": "Omniglot — Njebi language and alphabet",
        "url": "https://www.omniglot.com/writing/njebi.htm",
        "tier": "unverified",
        "notes": "Tier resolved from the domain ruling for omniglot.com."
      },
      {
        "title": "PeopleGroups.org — Nzebi of Gabon",
        "url": "https://peoplegroups.org/people_groups/pg013010/",
        "tier": "unverified",
        "notes": "Tier resolved from the domain ruling for peoplegroups.org."
      },
      {
        "title": "SIL Ethnologue — Nzebi language, code nzb",
        "url": "https://www.ethnologue.com/language/nzb/",
        "tier": "official",
        "notes": "Tier resolved from the authorized source catalogue entry \"ethnologue\"."
      },
      {
        "title": "Les Amis du musée du quai Branly – Jacques Chirac — \"Un rare masque nzebi offert au musée grâce au dîner de gala des Amis\" (3 juillet 2018)",
        "url": "https://www.amisquaibranly.fr/un-rare-masque-nzebi-offert-au-musee-grace-au-diner-de-gala-des-amis/",
        "tier": "referenced",
        "notes": "Resolved from the prior needs_review standing (no URL) once the museum's own announcement was located. Tiered referenced, following the corpus precedent for museum sources (the Metropolitan Museum of Art is tiered referenced on PPL_FANG, not official)."
      },
      {
        "title": "Georges Dupré — Koto, l'égalité nécessaire : savoir et pouvoir dans une société clanique : les Nzèbi du Congo et du Gabon (L'Harmattan, 2019)",
        "url": "https://searchworks.stanford.edu/view/13386359",
        "tier": "referenced",
        "notes": "Tier resolved from the domain ruling for searchworks.stanford.edu (library catalogue record for an identifiable, verifiable academic monograph by a specialist of Central African lineage societies)."
      },
      {
        "title": "Nestor Ide Righou — Les Nzèbi du Gabon, des origines à 1915 : essai d'étude historique (doctoral thesis, Université Paris 1, 2005, dir. Claude-Hélène Perrot)",
        "url": "https://theses.fr/2005PA010542",
        "tier": "referenced",
        "notes": "Catalogued on the French national theses portal; tiered referenced as an identifiable, verifiable academic work, consistent with the searchworks.stanford.edu precedent for a library/thesis catalogue record."
      },
      {
        "title": "Gérard Collomb — \"Les sept fils de Nzèbi. Un mythe cosmogonique des Banzèbi du Gabon\", Journal des africanistes, vol. 49, fasc. 2 (1979), p. 89-134",
        "url": "https://www.persee.fr/doc/jafr_0399-0346_1979_num_49_2_1985",
        "tier": "referenced",
        "notes": "Peer-reviewed article in a scholarly journal, hosted on the Persée academic portal."
      },
      {
        "title": "Glottolog 5.x — Njebi [njeb1242]",
        "url": "https://glottolog.org/resource/languoid/id/njeb1242",
        "tier": "official",
        "notes": "Tier resolved from the domain ruling for glottolog.org. Confirms glottocode njeb1242 and ISO 639-3 nzb, consistent with the fiche's existing languages.isoCodes."
      },
      {
        "title": "CIA World Factbook — Gabon, People and Society (ethnic groups)",
        "url": "https://www.cia.gov/the-world-factbook/countries/gabon/",
        "tier": "official",
        "notes": "Tier resolved from the domain ruling for cia.gov. Reports a composite \"Nzabi-Duma\" category at 11.2% of Gabon's population (2021 est.); cited only for order-of-magnitude corroboration, since it does not isolate Nzebi from the related Duma people."
      },
      {
        "title": "Wikidata — Nzabi (Q2882351)",
        "url": "https://www.wikidata.org/wiki/Q2882351",
        "tier": "unverified",
        "notes": "Tier resolved from the domain ruling for wikidata.org (openly edited tertiary reference). Cited only to document the externalIdentifiers.wikidataId cross-reference — confirmed instance-of \"ethnic group\" with associated countries Gabon and Republic of the Congo — not as evidence for any narrative claim."
      }
    ]
  }
}
```

## Sources

- **Glottolog — Njebi [njeb1242]** (official; domain ruling `glottolog.org`) — glottocode and ISO 639-3 confirmation. https://glottolog.org/resource/languoid/id/njeb1242
- **CIA World Factbook — Gabon** (official; domain ruling `cia.gov`) — composite ethnic-category corroboration only. https://www.cia.gov/the-world-factbook/countries/gabon/
- **Wikidata — Nzabi (Q2882351)** (unverified; domain ruling `wikidata.org`) — external identifier cross-reference only, not a narrative source. https://www.wikidata.org/wiki/Q2882351
- **Les Amis du musée du quai Branly – Jacques Chirac**, "Un rare masque nzebi offert au musée..." (3 July 2018) (referenced — museum-association announcement, precedent: Metropolitan Museum of Art on `PPL_FANG`). https://www.amisquaibranly.fr/un-rare-masque-nzebi-offert-au-musee-grace-au-diner-de-gala-des-amis/
- **Georges Dupré**, _Koto, l'égalité nécessaire : savoir et pouvoir dans une société clanique : les Nzèbi du Congo et du Gabon_ (L'Harmattan, Paris, 2019), catalogued at https://searchworks.stanford.edu/view/13386359 (referenced — identifiable academic monograph)
- **Nestor Ide Righou**, _Les Nzèbi du Gabon, des origines à 1915 : essai d'étude historique_ (doctoral thesis, Université Paris 1, 2005, dir. Claude-Hélène Perrot), https://theses.fr/2005PA010542 (referenced — catalogued doctoral thesis)
- **Gérard Collomb**, "Les sept fils de Nzèbi. Un mythe cosmogonique des Banzèbi du Gabon", _Journal des africanistes_, vol. 49, fasc. 2 (1979), p. 89-134, https://www.persee.fr/doc/jafr_0399-0346_1979_num_49_2_1985 (referenced — peer-reviewed journal article)
- The six sources already on the fiche before this pass (101 Last Tribes, Qiraat Africa, Omniglot, PeopleGroups.org, SIL Ethnologue, and the previously-`needs_review` Musée du quai Branly entry, now resolved to `referenced` above) were checked against the claims they support and found consistent; none was disputed or re-tiered downward.
- A French-language secondary compilation (checked but not cited as a source) derives a Nzebi-only population figure of 264,420 for Gabon by applying the CIA's composite "Nzabi-Duma" percentage to Gabon's total population — this conflates two distinct peoples and was deliberately not adopted.

## Still missing

- No official, standalone census figure exists that counts the Nzebi separately from the closely related Duma people; every available source either aggregates the two (as the CIA does for Gabon) or relies on a private compilation of unclear methodology (as the current population figures do). A reader-facing note on this limitation would be a fair addition, but is left for an editor to phrase rather than invented here.
- The five clan names attributed to the second founding line (beyond the seven already named in the fiche) are named in at least one secondary compilation, but this pass could not confirm them against the primary academic sources found (Dupré's book and Collomb's article were not accessible in full text through this research). They are not added to avoid an unsourced claim.
- No source found in this pass specifically ties the well-documented forced-labour campaign for the Congo–Océan railway (1921-1934) to the Nzebi in particular, as opposed to the wider populations of French Equatorial Africa; this fiche does not currently mention that episode, and it is left out rather than asserted on general regional history alone.
- The Musée du quai Branly mask's own inventory or accession number was not located; the citation rests on the Friends' association's public announcement rather than the museum's internal collection record.
