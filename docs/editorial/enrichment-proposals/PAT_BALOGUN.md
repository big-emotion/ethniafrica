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
4. **The hereditary question is genuinely contested, not just unresolved.** Two
   specific, on-topic descriptions of the title's succession directly contradict each
   other: at Ibadan, the Balogun line of the Olubadan chieftaincy is explicitly
   non-hereditary — succession runs on seniority and merit, "the Ibadan chieftaincy
   system does not pass titles from father to son" (verified by direct fetch). In the
   Ijebu area (Itele specifically), a Refworld country-of-origin research response states
   the opposite: "the title of balogun is hereditary and permanent... it is usually the
   first son of the balogun who succeeds his father." Both are on-topic, both are
   specific, and they disagree. Rather than force one value into `transmissionMode` /
   `designatedSocialUnit` (which the current fiche already declines to do, using `other` +
   a gap), this proposal keeps that discipline and folds the new, sharper evidence into the
   gap reasons instead of picking a side.
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
  "transmissionMode": "other",
  "designatedSocialUnit": "other",
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
    "value": "Titre de chef de guerre (« général », proche de « père/chef dans la guerre ») conféré au sein des cours royales yoruba, avec rang de ministre de la guerre siégeant au conseil du souverain. Sa nature héréditaire diffère selon les royaumes documentés : à Ibadan, la charge s'acquiert par un système de mérite et d'ancienneté au sein d'une lignée de titres militaires, sans transmission automatique de père en fils ; dans la région d'Ijebu (dont Itele), des sources décrivent au contraire une charge héréditaire et permanente, revenant le plus souvent au fils aîné du titulaire précédent. Les deux logiques sont attestées séparément et n'ont pas été réconciliées par les recherches menées ici.",
    "sourceRefs": [
      "yorubanames-balogun",
      "falola-oguntomisin-1984",
      "taiwo-olatunde-2016",
      "olubadan-ibadan-succession",
      "refworld-balogun-itele"
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
    },
    {
      "fieldPath": "transmissionMode",
      "reason": "Le titre est décrit tantôt comme acquis au mérite, sans transmission automatique d'un titulaire à ses descendants, tantôt comme une charge héréditaire revenant le plus souvent au fils aîné, selon la région étudiée. Ces deux descriptions n'ont pas pu être conciliées, et aucune ne permet à elle seule d'établir un mode de transmission unique."
    },
    {
      "fieldPath": "designatedSocialUnit",
      "reason": "Selon les sources consultées, le titre correspond tantôt à une charge occupée par un individu au sein d'une hiérarchie de cour, tantôt à une position qui reste dans une même famille sur plusieurs générations. Cette différence n'a pas pu être tranchée par les recherches menées."
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
- `olubadan-ibadan-succession` — **unverified** (community): fetched directly, describes
  Ibadan's Balogun chieftaincy line as non-hereditary and seniority-based.
- `refworld-balogun-itele` — **referenced** (government research response): a Refworld
  (UNHCR) country-of-origin information document on the Balogun title in the Ijebu area,
  describing it as hereditary, first-son succession. Directly contradicts the Ibadan
  description above — both are kept, deliberately, rather than silently choosing one.
- `naturenex-balogun-market` — **unverified** (blog): sole basis for the new homonym
  entry (Balogun Market, Lagos).

## Still missing

- `transmissionMode` and `designatedSocialUnit` remain `other` on purpose: the evidence is
  genuinely split between two Yoruba polities (Ibadan: non-hereditary/merit; Ijebu/Itele:
  hereditary/first-son), and forcing either value into a single field would misrepresent
  one polity's practice as the whole title's rule. A polity-by-polity extension of the
  model (or a `claimStatus`-bearing structure for these two fields, which the strict model
  does not currently provide) would be the honest way to resolve this, not a single
  enum pick.
- `taiwo-olatunde-2016`'s actual argument is still unread — only its bibliographic
  identity was confirmed. If reachable through a library or institutional accesss, it is
  the single most promising item to chase next: a dedicated academic study of the Balogun
  institution specifically in Ijebuland.
- `bearers[]` stays empty under the absolute privacy rule: several public figures carry
  the name, but none was found publicly self-identifying as Yoruba in their own words.
- The `refworld-balogun-itele` citation could not be fetched directly (403); its date and
  exact text rest on the indexed summary only, not a direct read of the full document —
  worth re-attempting with an authenticated or cached path.
