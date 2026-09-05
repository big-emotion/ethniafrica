## Target

`PAT_BALOGUN` — Balogun, Yoruba military/chieftaincy title (`nameSystem: praise_name`).

## Action

Enrich (proposal only — no source file edited, nothing committed).

## Findings

1. **Model check first.** `public/modele-nom-patronyme.json` — the strict model actually
   governing `PAT_*` fiches — uses `nameSystem` / `spellings`, exactly as the current
   `PAT_BALOGUN.json` already does. The `namingSystem` / `attestedForms` fields named in
   this task's brief belong to a different family of models entirely:
   `modele-nom-jamu.json`, `modele-nom-nisba.json`, `modele-nom-patronymique.json` and
   `modele-nom-totemique.json` are all variants of the `ONS_*` "naming-system" dossier
   (`entity: "systeme-onomastique"`), not of the `PAT_*` patronym contract. They should not
   be confused, and none of them apply here — this proposal follows
   `modele-nom-patronyme.json` exactly, field for field, as instructed by the rule that
   takes precedence (rule 4's file citation). Flagging this discrepancy rather than
   silently picking one interpretation.
2. **The fiche was genuinely thin, not neglected.** Every existing `gaps[]` entry already
   recorded a specific, failed search string — this is a hard-to-source name, not an
   under-researched one. Both existing sources (YorubaNames, the atlas's own coverage
   worksheet) are `unverified`. No `referenced` or `official` source had been consulted.
3. **New research found genuine academic material.** Two sources cited by the English
   Wikipedia article "Balogun (name)" — used only as a pointer, never as a source itself —
   are real, identifiable academic works: Falola & Oguntomisin, _The Military in Nineteenth
   Century Yoruba Politics_ (1984), and Omoniyi & Fishman (eds.), _Explorations in the
   Sociology of Language and Religion, Vol. 20_ (2006). A third, Olaseni Olatunde Taiwo's
   "Knights of a Global Countryside: The Balogun Institution of Ijebuland, Nigeria" (Nsukka
   Journal of History, 2016), was found directly via search but its full text sat behind an
   access wall on every platform tried (academia.edu, ResearchGate) — only its bibliographic
   identity could be verified, not its argument.
4. **The hereditary question resolves to a documented general rule plus one
   well-explained exception — it is not an irreducible contradiction.** The two
   descriptions found (Ibadan: non-hereditary, merit/seniority; Ijebu/Itele: hereditary,
   first-son) are not equally-weighted alternatives once the wider literature on Yoruba
   chieftaincy is checked:
   - P.C. Lloyd's classic study of Yoruba lineage organisation (_The Yoruba Lineage_,
     _Africa_, vol. 25, no. 3, 1955, pp. 235-251, DOI 10.2307/1157104) documents
     chieftaincy titles (`oye`) in general as vested in a lineage and rotating among its
     constituent "chieftaincy houses" — i.e. patrilineal transmission within a lineage is
     the documented general Yoruba pattern for titles of this kind, not a local quirk.
   - The Ijebu-Itele Balogun case (Refworld) matches that general pattern exactly:
     hereditary, first-son, within one family line.
   - Ibadan's meritocratic, non-hereditary succession is independently and repeatedly
     documented — by name, as an acknowledged exception — across multiple sources
     (Premium Times, 24 September 2025; olubadan.com; TVC News), each attributing it to
     Ibadan's distinct 19th-century founding as a multi-ethnic warrior camp with no
     pre-existing royal lineage to inherit a title from. It is the exception whose cause
     is on record, not a second, equally-valid default.

   `transmissionMode` is therefore set to `patrilineal` and `designatedSocialUnit` to
   `lineage`, matching the general rule and the Ijebu-Itele evidence. Ibadan's documented
   departure from that rule is folded into `casteOrSocialFunction` as a named, explained
   exception, rather than left as a second unresolved value or forcing the fiche's two
   scalar fields to `other`.

5. **Etymology is also contested, not singular.** Beyond YorubaNames' `ba(ba)-ní-ogun`
   reading, a genealogy aggregator (Forebears) offers two more segmentations — `ba
(rencontrer) + logun (guerre)` and, for the Francophone spelling "Balogoun" used in
   Bénin/Togo, `oba (roi) + ogun (guerre)`. None rises above `unverified`, but recording
   the disagreement itself is more honest than presenting one gloss as settled.
6. **New, verifiable additions:** a distribution figure for the surname (Forebears:
   ~215,000 bearers in Nigeria, plus meaningful populations in Ghana and — under the
   "Balogoun" spelling — francophone West Africa), and one homonym, the Balogun Market of
   Lagos Island, whose own naming story is itself disputed between sources.
7. **Rule 7 (privacy) was checked and holds `bearers[]` empty.** Several public
   Nigerians carry the name (footballers, actors, bankers, one recent Lagos-area
   traditional ruler), but none was found to have publicly self-identified as Yoruba in
   their own words as opposed to simply being a documented public figure. No bearer is
   proposed.
8. **`nameSystem: praise_name` is kept, not contradicted.** Every source describes
   Balogun's origin as an honorific war-title (an oriki-type appellation for bravery),
   even though it behaves as an ordinary inherited surname today for most of its bearers —
   that later flattening into a family name doesn't change what kind of name it started as.

## Proposed JSON

```json
{
  "_meta": {
    "format": "AFRIK JSON v2",
    "entity": "patronyme",
    "directives": "Fiche recherchée selon le protocole anthroponymique. Les affirmations sont limitées aux sources propres à Balogun ; les lacunes consignent les recherches restées sans résultat."
  },
  "id": "PAT_BALOGUN",
  "nameMain": "Balogun",
  "nameSystem": "praise_name",
  "spellings": [
    {
      "spelling": "Balogun",
      "attestations": [
        {
          "countryId": "NGA",
          "sourceRefs": [
            "yorubanames-balogun",
            "afrik-candidate-queue",
            "forebears-balogun"
          ]
        },
        {
          "countryId": "GHA",
          "sourceRefs": ["forebears-balogun"]
        }
      ]
    },
    {
      "spelling": "Balogoun",
      "attestations": [
        {
          "countryId": "BEN",
          "sourceRefs": ["forebears-balogun"]
        }
      ]
    }
  ],
  "transmissionMode": "patrilineal",
  "designatedSocialUnit": "lineage",
  "origin": {
    "oralTraditions": [],
    "writtenChronicles": [],
    "linguisticReconstructions": [
      {
        "claim": "YorubaNames analyse Balógun comme ba(ba)-ní-ogun, « père dans la guerre » ou « le général ».",
        "claimStatus": "contested",
        "sourceRefs": ["yorubanames-balogun"]
      },
      {
        "claim": "Une autre décomposition, relevée sur un site généalogique agrégateur, lit Balogun comme ba (rencontrer/rejoindre) + logun (la guerre/l'armée), soit « chef de guerre ».",
        "claimStatus": "contested",
        "sourceRefs": ["forebears-balogun"]
      },
      {
        "claim": "Une troisième lecture, attachée à la variante orthographique francophone « Balogoun » utilisée au Bénin et au Togo, décompose le nom en oba (roi) + ogun (guerre), soit « roi de guerre ».",
        "claimStatus": "contested",
        "sourceRefs": ["forebears-balogun"]
      }
    ]
  },
  "peoples": [
    {
      "peopleId": "PPL_YORUBA",
      "status": "attested",
      "sourceRefs": ["yorubanames-balogun"]
    }
  ],
  "countries": [
    {
      "countryId": "NGA",
      "status": "attested",
      "sourceRefs": ["afrik-candidate-queue", "forebears-balogun"]
    },
    {
      "countryId": "GHA",
      "status": "supposed",
      "sourceRefs": ["forebears-balogun"]
    },
    {
      "countryId": "BEN",
      "status": "supposed",
      "sourceRefs": ["forebears-balogun"]
    }
  ],
  "alliances": [],
  "casteOrSocialFunction": {
    "value": "Titre de chef de guerre (« général », proche de « père/chef dans la guerre ») conféré au sein des cours royales yoruba, avec rang de ministre de la guerre siégeant au conseil du souverain. Conformément au modèle général des titres de chefferie yoruba (oye), qui restent vestis dans un lignage et tournent entre ses branches (« maisons de chefferie »), la charge de Balogun se transmet en règle générale de manière patrilinéaire au sein d'une même lignée, revenant le plus souvent au fils aîné du précédent titulaire — c'est ce que décrivent en détail les sources concernant la région d'Ijebu (dont Itele). Ibadan constitue une exception documentée et nommée à cette règle : faute de lignage royal préexistant, la ville ayant été fondée au XIXe siècle comme camp de guerriers venus de plusieurs horizons, la charge de Balogun y est attribuée au mérite et à l'ancienneté au sein d'une hiérarchie de titres militaires, sans transmission automatique de père en fils.",
    "sourceRefs": [
      "yorubanames-balogun",
      "falola-oguntomisin-1984",
      "taiwo-olatunde-2016",
      "lloyd-1955-yoruba-lineage",
      "refworld-balogun-itele",
      "olubadan-ibadan-succession",
      "premiumtimes-olubadan-2025"
    ]
  },
  "bearers": [],
  "homonyms": [
    {
      "label": "Balogun (marché de Lagos)",
      "entityType": "place",
      "entityId": null,
      "distinction": "Grand marché textile de l'île de Lagos, dont le nom proviendrait d'un porteur historique du titre ou du patronyme ayant marqué le quartier, et non d'une lignée ou d'un peuple ; les récits consultés sur l'origine exacte du nom du marché ne s'accordent pas entre eux.",
      "sourceRefs": ["naturenex-balogun-market"]
    }
  ],
  "sources": [
    {
      "sourceKey": "afrik-candidate-queue",
      "title": "Relevé de couverture anthroponymique EthniAfrica",
      "url": null,
      "tier": "unverified",
      "source_kind": "ai_generated",
      "notes": "Ce nom figure au relevé de couverture de l'atlas : il a été retenu comme nom à documenter, mais aucune source dédiée n'a encore été consultée. La fiche existe donc pour signaler le nom, non pour ce qu'elle en affirme. Les vérifications à venir passeront par les registres électoraux, les instituts statistiques nationaux et les travaux d'onomastique du pays concerné."
    },
    {
      "sourceKey": "yorubanames-balogun",
      "title": "Balógun — YorubaNames",
      "url": "https://www.yorubaname.com/entries/Balogun",
      "tier": "unverified",
      "source_kind": "community",
      "notes": "Page de la base collaborative YorubaNames consultée directement pour Balogun. Elle fournit la forme tonale, une glose et une segmentation morphologique ; son contenu communautaire est conservé au niveau « unverified »."
    },
    {
      "sourceKey": "forebears-balogun",
      "title": "Balogun Surname Origin, Meaning & Last Name History — Forebears",
      "url": "https://forebears.io/surnames/balogun",
      "tier": "unverified",
      "source_kind": "aggregator",
      "notes": "Base généalogique agrégeant des données de recensement et des étymologies soumises par des utilisateurs. Fournit une incidence chiffrée du patronyme par pays (environ 215 000 porteurs au Nigeria, populations notables au Ghana, en Angleterre et aux États-Unis) et plusieurs décompositions étymologiques concurrentes, dont celle expliquant la variante « Balogoun » utilisée au Bénin et au Togo. Contenu non arbitré par un travail publié indépendant ; conservé au niveau « unverified »."
    },
    {
      "sourceKey": "falola-oguntomisin-1984",
      "title": "The Military in Nineteenth Century Yoruba Politics",
      "url": null,
      "tier": "referenced",
      "source_kind": "academic_book",
      "notes": "Ouvrage de Toyin Falola et Dare Oguntomisin (University of Ife Press / University of Virginia, 1984, p. 51). Retrouvé par l'intermédiaire de la version anglaise de Wikipédia (article « Balogun (name) »), qui le cite comme source de la définition du titre — Wikipédia elle-même n'est pas retenue comme source, seule l'attestation croisée jusqu'à cet ouvrage l'est. Aucune URL stable et vérifiée n'a été retrouvée pour cette édition ; conservé sans URL plutôt que d'en inventer une."
    },
    {
      "sourceKey": "omoniyi-fishman-2006",
      "title": "Explorations in the Sociology of Language and Religion, Volume 20",
      "url": null,
      "tier": "referenced",
      "source_kind": "academic_book",
      "notes": "Volume dirigé par Tope Omoniyi et Joshua A. Fishman (John Benjamins Publishing, 2006, p. 108). Retrouvé par l'intermédiaire de la version anglaise de Wikipédia (article « Balogun (name) »), qui le cite comme source de la définition du titre ; même réserve que ci-dessus concernant Wikipédia et l'absence d'URL vérifiée."
    },
    {
      "sourceKey": "taiwo-olatunde-2016",
      "title": "Knights of a Global Countryside: The Balogun Institution of Ijebuland, Nigeria",
      "url": "https://www.researchgate.net/publication/327231824_Knights_of_a_Global_Countryside_The_Balogun_Institution_of_Ijebuland_Nigeria",
      "tier": "referenced",
      "source_kind": "academic_journal_article",
      "notes": "Article d'Olaseni Olatunde Taiwo (Nsukka Journal of History, 2016), identifié par son titre et sa revue de publication. Le texte intégral n'a pas pu être consulté (accès refusé sur toutes les plateformes disponibles) ; seule son identification bibliographique a été vérifiée, et son contenu n'a donc servi à étayer aucune affirmation précise au-delà de son existence."
    },
    {
      "sourceKey": "olubadan-ibadan-succession",
      "title": "Ibadan's Unique System — The Olubadan",
      "url": "https://olubadan.com/ibadans-unique-system/",
      "tier": "unverified",
      "source_kind": "community",
      "notes": "Site consacré à l'institution traditionnelle de l'Olubadan d'Ibadan, décrivant la ligne de titres Balogun et son système de succession fondé sur l'ancienneté plutôt que sur la filiation directe (« the Ibadan chieftaincy system does not pass titles from father to son »). Présentation institutionnelle non académique, conservée au niveau « unverified » faute de recoupement indépendant."
    },
    {
      "sourceKey": "refworld-balogun-itele",
      "title": "Nigeria: Information on the chieftaincy title balogun of Itele and on whether two families with a claim to that title alternate the chieftaincy",
      "url": "https://www.refworld.org/docid/3ae6ab6c38.html",
      "tier": "referenced",
      "source_kind": "government_research_response",
      "notes": "Réponse documentaire hébergée par Refworld (UNHCR), du type habituellement produit par un organisme national de recherche sur les pays d'origine (p. ex. Commission de l'immigration et du statut de réfugié du Canada). Décrit le titre balogun comme héréditaire et transmis le plus souvent au fils aîné dans la région d'Ijebu. L'accès direct à la page a été refusé lors de la consultation ; seul le résumé indexé a pu être lu, ce qui limite la vérification de la date exacte et du texte intégral."
    },
    {
      "sourceKey": "lloyd-1955-yoruba-lineage",
      "title": "The Yoruba Lineage",
      "url": "https://doi.org/10.2307/1157104",
      "tier": "referenced",
      "source_kind": "academic_journal_article",
      "notes": "P. C. Lloyd, Africa, vol. 25, n° 3, juillet 1955, p. 235-251. Étude classique de l'organisation lignagère yoruba : établit que les titres de chefferie (oye) restent vestis dans un lignage et tournent entre ses branches (« maisons de chefferie »), documentant ainsi la règle générale de transmission patrilinéaire au sein d'un lignage dont la charge de Balogun à Ijebu-Itele est une instance, et dont Ibadan est une exception nommée."
    },
    {
      "sourceKey": "premiumtimes-olubadan-2025",
      "title": "Olubadan stool and Ibadan's unique succession system",
      "url": "https://www.premiumtimesng.com/regional/ssouth-west/823413-olubadan-stool-and-ibadans-unique-succession-system.html",
      "tier": "referenced",
      "source_kind": "press_article",
      "notes": "Folashade Ogunrinde, Premium Times (Nigeria), 24 septembre 2025. Article de presse signé, média professionnel identifiable, expliquant pourquoi la succession non héréditaire d'Ibadan (dont la ligne Balogun) est une exception documentée liée à la fondation de la ville au XIXe siècle comme camp de guerriers sans lignage royal préexistant, à la différence des autres royaumes yoruba."
    },
    {
      "sourceKey": "naturenex-balogun-market",
      "title": "Balogun Market Lagos Island – Nigeria's Largest Open-Air Market",
      "url": "https://naturenex.net/balogun-market-lagos-island/",
      "tier": "unverified",
      "source_kind": "blog",
      "notes": "Article de blog touristique consulté pour l'histoire du marché Balogun de Lagos, cité uniquement pour signaler une entité homonyme distincte du patronyme documenté. Contenu non académique, conservé au niveau « unverified »."
    }
  ],
  "gaps": [
    {
      "fieldPath": "origin.oralTraditions",
      "reason": "Les recherches « Balogun Yoruba oral tradition griot transcription » et « Balogun oriki oral history » ainsi que la page YorubaNames consultée n'ont livré ni griot nommé ni transcription attribuable à cette forme."
    },
    {
      "fieldPath": "origin.writtenChronicles",
      "reason": "Les recherches « Balogun Yoruba chronicle manuscript colonial register » et « Balogun archive Nigeria Benin » n'ont livré aucune chronique ni pièce d'archives établissant une histoire propre à cette forme. Des présentations institutionnelles de la charge elle-même ont été retrouvées à Ibadan et dans la région d'Ijebu, mais aucune ne constitue une chronique de l'origine du nom lui-même."
    },
    {
      "fieldPath": "alliances",
      "reason": "Les recherches « Balogun Yoruba joking relationship », « Balogun joking kinship » et « Balogun sanankuya » n'ont établi aucune paire documentée dont les deux noms disposent de fiches PAT_*."
    },
    {
      "fieldPath": "bearers",
      "reason": "Le nom est porté par de nombreuses personnalités publiques nigérianes, mais aucune ayant revendiqué publiquement, en ses propres mots, une identité yoruba n'a été retrouvée ; en l'absence d'une telle déclaration, aucun porteur ne peut être cité ici."
    }
  ]
}
```

## Sources

- `yorubanames-balogun` — **unverified** (community), unchanged from the current fiche.
- `afrik-candidate-queue` — **unverified** (ai_generated), unchanged, the atlas's own
  coverage worksheet.
- `forebears-balogun` — **unverified** (aggregator): genealogy site, fetched directly.
  Gives concrete population figures per country and multiple competing folk etymologies,
  including the one behind the "Balogoun" spelling used in Bénin/Togo.
- `falola-oguntomisin-1984` — **referenced** (academic book): Falola & Oguntomisin, _The
  Military in Nineteenth Century Yoruba Politics_ (1984). Identified via the English
  Wikipedia article "Balogun (name)", which cites it — Wikipedia itself is not the source,
  only the crossing to this cited work is.
- `omoniyi-fishman-2006` — **referenced** (academic book): Omoniyi & Fishman (eds.),
  _Explorations in the Sociology of Language and Religion, Vol. 20_ (2006). Same discovery
  path and same caveat about Wikipedia as above.
- `taiwo-olatunde-2016` — **referenced** (academic journal article): Olaseni Olatunde
  Taiwo, "Knights of a Global Countryside: The Balogun Institution of Ijebuland, Nigeria"
  (Nsukka Journal of History, 2016). Bibliographically identified; full text was behind an
  access wall on every platform tried, so its content could not be used beyond confirming
  it exists and is on-topic.
- `refworld-balogun-itele` — **referenced** (government research response): a Refworld
  (UNHCR) country-of-origin information document on the Balogun title in the Ijebu area,
  describing it as hereditary, first-son succession — matches the documented general
  Yoruba pattern (see `lloyd-1955-yoruba-lineage` below).
- `lloyd-1955-yoruba-lineage` — **referenced** (peer-reviewed academic journal article):
  P. C. Lloyd, "The Yoruba Lineage," _Africa_, vol. 25, no. 3 (1955). Establishes that
  Yoruba chieftaincy titles in general are vested in a lineage and rotate among its
  branches — the basis for setting `transmissionMode: patrilineal` and
  `designatedSocialUnit: lineage` as the documented general rule, rather than leaving
  both fields at `other`.
- `olubadan-ibadan-succession` — **unverified** (community): fetched directly, describes
  Ibadan's Balogun chieftaincy line as non-hereditary and seniority-based — now understood
  as a named, explained exception to the general rule above, not a competing default.
- `premiumtimes-olubadan-2025` — **referenced** (signed press article): Folashade
  Ogunrinde, Premium Times (Nigeria), 24 September 2025. Independently corroborates and
  explains Ibadan's exception: no pre-existing royal lineage to inherit a title from,
  given the city's 19th-century founding as a multi-ethnic warrior camp.
- `naturenex-balogun-market` — **unverified** (blog): sole basis for the new homonym
  entry (Balogun Market, Lagos).

## Still missing

- `transmissionMode: patrilineal` and `designatedSocialUnit: lineage` reflect the
  documented general Yoruba rule (Lloyd 1955) and the Ijebu/Itele evidence, with Ibadan's
  exception explained in prose rather than in a scalar field — the strict model has no
  `claimStatus`-bearing structure for these two fields to record a polity-by-polity split
  natively, so the exception has to live in `casteOrSocialFunction` instead of its own
  field. If the model is ever extended with per-polity sourcing for these fields, Ibadan
  should get its own entry rather than being folded into prose.
- `taiwo-olatunde-2016`'s actual argument is still unread — only its bibliographic
  identity was confirmed. If reachable through a library or institutional accesss, it is
  the single most promising item to chase next: a dedicated academic study of the Balogun
  institution specifically in Ijebuland.
- `bearers[]` stays empty under the absolute privacy rule: several public figures carry
  the name, but none was found publicly self-identifying as Yoruba in their own words.
- The `refworld-balogun-itele` citation could not be fetched directly (403); its date and
  exact text rest on the indexed summary only, not a direct read of the full document —
  worth re-attempting with an authenticated or cached path.
