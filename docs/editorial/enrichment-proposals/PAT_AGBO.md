## Target

`PAT_AGBO` — "Agbo", class: name (patronyme). File: `dataset/source/afrik/patronymes/PAT_AGBO.json`.

## Action

Enrich.

## Findings

1. **The fiche was genuinely thin.** Before this pass it carried a single country attestation
   (Togo, via a FamilySearch genealogical index), one "supposed" people link (Ewe) sourced only
   to the internal candidate queue, empty `origin`, `alliances`, `bearers`, `homonyms`, and a
   declared `casteOrSocialFunction: null`. Eight of eight non-identifier fields had a `gaps[]`
   entry.
2. **Pre-existing register violation in `gaps[].reason`.** Several reasons quoted the literal
   search queries run ("Agbo ewe Togo anthroponymie étymologie", etc.) and one referenced "la
   file de candidats" — internal workshop vocabulary that `docs/editorial/reader-facing-register.md`
   and `checkEditorialRules.ts` (`reader-facing-register`) forbid in a reader-facing field. This
   proposal rewrites every `gaps[].reason` in plain French with no process narration, no
   quoted search strings, and no reference to the queue.
3. **Internal inconsistency, not resolved here.** `transmissionMode: "other"` and
   `designatedSocialUnit: "clan"` are both non-null, yet the corresponding `gaps[]` entries say
   the transmission rule and the social unit could not be determined. No source found in this
   pass justifies changing either declared value, so both are left as they were; a future pass
   should either source them or reconsider whether they should be `null` with a gap, matching the
   pattern used elsewhere in the corpus.
4. **Broader country distribution than the fiche showed.** Forebears' aggregated surname
   incidence table (an unverified-tier aggregator, same evidentiary class as FamilySearch, and
   already used elsewhere in the corpus, e.g. `PAT_ABDALLAH`'s `forebears-abdallah`) shows Agbo
   concentrated in six African countries: Nigeria (143,666 bearers), Benin (13,460), Ghana
   (13,439), Togo (13,230), Ivory Coast (2,360) and Gabon (404) — together accounting for the
   overwhelming majority of all bearers worldwide. This substantially widens the `countries[]`
   and `spellings[].attestations[]` fields, previously limited to Togo alone.
5. **A lexical parallel, explicitly not an ethnic attribution.** The Yoruba word _agbo_ is
   attested (English Wiktionary, consulted directly) as polysemous: "ram", "crowd/herd", a
   pressed herbal remedy, and a type of drum. This is recorded as a `linguisticReconstructions`
   claim, following the same hedging pattern already used on `PAT_ABEBE` and
   `PAT_ABDOULAYE` — a lexical coincidence in a nearby contact-zone language does not establish
   which people the patronym belongs to, nor even that this meaning motivated the name at all.
   Two other candidate readings turned up in search-engine summaries (a Fon gloss "bélier", and
   a user-submitted claim tying the name to Enugu, Nigeria and a title meaning "elder of high
   rank") but the pages carrying them (Geneanet, prenometnom.com) returned HTTP 403/410 on fetch,
   so their exact wording could not be verified — they are not cited, and the second is recorded
   only as an open question in `gaps[]`.
6. **Wikipedia was consulted for orientation only, never cited.** The `en.wikipedia.org/wiki/Agbo`
   disambiguation page surfaces a genuine near-miss to flag: "Agoli-agbo", last king of Dahomey
   (deceased, reigned 1894–1900). His name is a distinct compound spelling, not an identical
   string to "Agbo", so it does not qualify as a `homonyms` entry under the model (which requires
   an identical spelling of separate origin) and is not added. The page's living named
   individuals (footballers, a molecular biologist) are excluded from `bearers` on two independent
   grounds: the model's `bearers` schema only accepts `status: "deceased"`, and none of them has
   publicly self-identified an ethnic origin under this name — rule 10 (DEC-040 / RGPD art. 9)
   forbids inferring one.
7. **`peoples` stays at one "supposed" entry.** Nothing found in this pass confirms or
   contradicts the existing Ewe candidate; the new country spread (Nigeria, Benin, Ghana, Togo,
   Ivory Coast, Gabon) spans many peoples in each country, so it cannot be used to add or remove
   a people-level claim. The gap is reworded but the field itself is unchanged.
8. **`nameSystem: "clan_name"` is kept.** Nothing found contradicts it, and the lexical ambiguity
   above is too weak to justify moving it to `totemic_clan` or any other value.

## Proposed JSON

```json
{
  "_meta": {
    "format": "AFRIK JSON v2",
    "entity": "patronyme",
    "directives": "Fiche recherchée selon le protocole anthroponymique. La distribution est désormais attestée dans six pays d'Afrique de l'Ouest et centrale via un agrégateur généalogique (Forebears) et FamilySearch (Togo). Un parallèle lexical yorouba (« agbo ») est consigné dans linguisticReconstructions sans rattachement ethnique établi. Étymologie propre au patronyme, peuple rattaché, mode de transmission et unité sociale désignée restent incertains."
  },
  "id": "PAT_AGBO",
  "nameMain": "Agbo",
  "nameSystem": "clan_name",
  "spellings": [
    {
      "spelling": "Agbo",
      "attestations": [
        {
          "countryId": "TGO",
          "sourceRefs": ["familysearch-agbo", "forebears-agbo"]
        },
        {
          "countryId": "NGA",
          "sourceRefs": ["forebears-agbo"]
        },
        {
          "countryId": "BEN",
          "sourceRefs": ["forebears-agbo"]
        },
        {
          "countryId": "GHA",
          "sourceRefs": ["forebears-agbo"]
        },
        {
          "countryId": "CIV",
          "sourceRefs": ["forebears-agbo"]
        },
        {
          "countryId": "GAB",
          "sourceRefs": ["forebears-agbo"]
        }
      ]
    }
  ],
  "transmissionMode": "other",
  "designatedSocialUnit": "clan",
  "origin": {
    "oralTraditions": [],
    "writtenChronicles": [],
    "linguisticReconstructions": [
      {
        "claim": "Le mot yorouba « agbo » est polysémique : il désigne un bélier, une foule ou un troupeau, un remède à base de plantes obtenu par pression, et un type de tambour. Cette polysémie lexicale d'un mot voisin n'établit ni laquelle de ces significations aurait motivé l'usage du nom Agbo comme patronyme, ni un rattachement à un peuple déterminé.",
        "claimStatus": "claimed",
        "sourceRefs": ["wiktionary-yo-agbo"]
      }
    ]
  },
  "peoples": [
    {
      "peopleId": "PPL_EWE",
      "status": "supposed",
      "sourceRefs": ["afrik-candidate-queue"]
    }
  ],
  "countries": [
    {
      "countryId": "TGO",
      "status": "attested",
      "sourceRefs": ["familysearch-agbo", "forebears-agbo"]
    },
    {
      "countryId": "NGA",
      "status": "attested",
      "sourceRefs": ["forebears-agbo"]
    },
    {
      "countryId": "BEN",
      "status": "attested",
      "sourceRefs": ["forebears-agbo"]
    },
    {
      "countryId": "GHA",
      "status": "attested",
      "sourceRefs": ["forebears-agbo"]
    },
    {
      "countryId": "CIV",
      "status": "attested",
      "sourceRefs": ["forebears-agbo"]
    },
    {
      "countryId": "GAB",
      "status": "attested",
      "sourceRefs": ["forebears-agbo"]
    }
  ],
  "alliances": [],
  "casteOrSocialFunction": null,
  "bearers": [],
  "homonyms": [],
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
      "sourceKey": "familysearch-agbo",
      "title": "Agbo Name Meaning and Agbo Family History at FamilySearch",
      "url": "https://www.familysearch.org/en/surname?surname=agbo",
      "tier": "unverified",
      "source_kind": "repository",
      "notes": "Page FamilySearch propre à Agbo consultée directement. Elle indexe 15 675 actes sous ce nom et propose le Togo parmi les lieux de recherche, mais ne livre ni sens ni appartenance ewe ; elle est donc utilisée uniquement comme attestation généalogique au niveau « unverified »."
    },
    {
      "sourceKey": "forebears-agbo",
      "title": "Agbo Surname Origin, Meaning & Last Name History",
      "url": "https://forebears.io/surnames/agbo",
      "tier": "unverified",
      "source_kind": "aggregator",
      "notes": "Base agrégée de patronymes consultée directement pour son tableau d'incidence par pays. Elle chiffre une présence du nom au Nigeria, au Bénin, au Ghana, au Togo, en Côte d'Ivoire et au Gabon, mais ne documente ni étymologie ni rattachement ethnique propre au nom ; une soumission d'utilisateur non vérifiée y avance par ailleurs une origine à Enugu (Nigeria) et un sens lié au rang d'ancien, non retenue faute de corroboration."
    },
    {
      "sourceKey": "wiktionary-yo-agbo",
      "title": "agbo — Wiktionary, the free dictionary",
      "url": "https://en.wiktionary.org/wiki/agbo",
      "tier": "unverified",
      "source_kind": "dictionary",
      "notes": "Entrée communautaire consultée directement pour ses quatre sens yorouba homophones du mot « agbo » (bélier ; foule ou troupeau ; remède à base de plantes ; tambour). Aucune entrée éwé ou fon n'y figure ; le rapprochement reste un parallèle lexical, non une attestation patronymique."
    }
  ],
  "gaps": [
    {
      "fieldPath": "origin",
      "reason": "Aucune source ne documente une étymologie propre au patronyme Agbo. Un mot yorouba homophone existe, mais ce simple rapprochement lexical ne permet pas d'établir le sens réellement porté par ce nom de famille ni l'histoire qui lui a donné naissance."
    },
    {
      "fieldPath": "peoples",
      "reason": "Le nom est attesté dans plusieurs pays d'Afrique de l'Ouest et centrale, mais aucune source propre au patronyme ne permet d'établir avec certitude à quel peuple il se rattache ; l'hypothèse d'un rattachement éwé reste non confirmée."
    },
    {
      "fieldPath": "alliances",
      "reason": "Aucune parenté à plaisanterie ni alliance patronymique documentée n'a été trouvée pour ce nom."
    },
    {
      "fieldPath": "casteOrSocialFunction",
      "reason": "Aucune fonction sociale héréditaire ni titre de caste n'a été associé à ce nom dans les sources consultées."
    },
    {
      "fieldPath": "bearers",
      "reason": "Aucun porteur décédé n'a pu être retenu sur la base d'une notice biographique à la fois suffisamment fiable et propre à ce nom."
    },
    {
      "fieldPath": "homonyms",
      "reason": "Aucune graphie strictement identique portée par une entité d'origine distincte n'a été relevée pour ce nom."
    },
    {
      "fieldPath": "transmissionMode",
      "reason": "Les sources attestent l'usage du nom mais ne décrivent pas la règle selon laquelle il se transmet au sein des familles qui le portent."
    },
    {
      "fieldPath": "designatedSocialUnit",
      "reason": "Les sources consultées ne permettent pas de confirmer si ce nom désigne historiquement un lignage, un clan ou une autre unité sociale."
    }
  ]
}
```

## Sources

| Key                     | Title                                                           | Tier         | Why this tier                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `afrik-candidate-queue` | Relevé de couverture anthroponymique EthniAfrica                | `unverified` | Pre-existing, unchanged: internal coverage note, AI-generated, no dedicated external source consulted.                                                                                                                                                                                                                                                                                               |
| `familysearch-agbo`     | Agbo Name Meaning and Agbo Family History at FamilySearch       | `unverified` | Pre-existing, unchanged: a genealogical repository/aggregator, not an official statistics body — indexes records, does not analyse etymology or ethnicity.                                                                                                                                                                                                                                           |
| `forebears-agbo`        | Agbo Surname Origin, Meaning & Last Name History (forebears.io) | `unverified` | New. Aggregator of surname incidence built from public records with no named academic author; same evidentiary class as `familysearch-agbo` and consistent with the tier already given to `forebears-abdallah` elsewhere in the corpus. Used only for country-level distribution counts, which is what it actually measures.                                                                         |
| `wiktionary-yo-agbo`    | agbo — Wiktionary, the free dictionary                          | `unverified` | New. A community-edited wiki dictionary — the same "no accountable single author, tertiary reference" logic that keeps Wikipedia itself out of the `official`/`referenced` tiers applies here. Consulted directly (not via a Wikipedia redirect) for its Yoruba lexical entries only; used solely to record a lexical parallel, explicitly hedged against any ethnic or naming-etymology conclusion. |

Two candidate readings found in search-engine AI summaries — a Fon gloss "bélier" (ram) via
prenometnom.com/Geneanet, and a user-submitted Enugu/Nigeria origin story via forebears.io's
comments — are **not** cited as sources: the two French-language pages returned HTTP 403/410 on
direct fetch, so their exact wording could not be verified, and the Enugu claim is anonymous,
single-user, uncorroborated content on an aggregator site. The Enugu claim is referenced,
un-cited, in `forebears-agbo`'s own `notes` as the reason it was seen and rejected, and is left
otherwise out of the fiche.

## Still missing

- A verifiable etymology for the patronym itself (as opposed to a coincidental homophone in a
  neighbouring language).
- A source establishing which people(s) actually carry Agbo as an ethnic patronym — the Ewe
  candidate remains unconfirmed, and the six-country spread now on record cannot resolve this
  because each of those countries hosts many peoples.
- Any oral tradition, written chronicle, alliance/joking-relationship pairing, hereditary
  caste or social function, deceased notable bearer meeting the sourcing bar, homonym of
  identical spelling, transmission rule, or designated social unit specific to this name.
