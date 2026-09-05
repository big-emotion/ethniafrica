## Target

`PAT_ADEBAYO` — Adebayo (nom yoruba), classe `patronyme`.

## Action

enrich

## Findings

1. **Modèle applicable — écart avec l'instruction reçue (sévérité: bloquante, corrigée).**
   L'instruction de départ affirmait que `public/modele-nom-patronyme.json` utilise les
   clés `namingSystem`/`attestedForms`. Vérification faite sur le dépôt : c'est faux. Ce
   fichier (entité `patronyme`, id `PAT_XXXXX`) utilise bien `nameSystem`/`spellings`,
   exactement comme la fiche `PAT_ADEBAYO.json` actuelle. Les clés `namingSystem`/
   `attestedForms` appartiennent à une famille de fichiers différente et non mentionnée
   dans l'instruction : `modele-nom-jamu.json`, `modele-nom-nisba.json`,
   `modele-nom-patronymique.json`, `modele-nom-totemique.json` — entité
   `systeme-onomastique`, id `ONS_XXXXX`, un objet distinct des fiches `PAT_*`. La
   proposition ci-dessous respecte donc le modèle réellement présent dans le dépôt
   (`nameSystem`/`spellings`), pas la description reçue.

2. **La fiche est réellement mince, mais pas non travaillée.** Sur les 12 champs
   factuels du modèle, 6 sont déjà vides et couverts par un `gaps[]` explicite
   (`origin.oralTraditions`, `origin.writtenChronicles`, `alliances`,
   `casteOrSocialFunction`, `bearers`, `homonyms`). L'étymologie, le peuple et le pays
   d'attestation sont déjà sourcés à deux reprises. Une recherche complémentaire n'a
   trouvé aucun élément permettant de combler ces six lacunes — elles sont confirmées,
   pas nouvellement découvertes.

3. **Nuance de classification trouvée (nouveau).** Fakuade, Friday-Otun & Adeosun (2020,
   _Sociolinguistic Studies_) distinguent, dans la typologie des noms yoruba, les
   **orúkọ àmútọ̀runwá** (noms « apportés du ciel », donnés selon les circonstances de
   la naissance) des **oríkì** proprement dits (noms de louange célébrant lignée ou
   qualités). Adébáyọ̀ — un nom donné pour marquer la joie entourant une naissance — relève
   du premier type plutôt que du second au sens strict. Le modèle de fiche ne propose
   toutefois pas de valeur `nameSystem` pour les noms de circonstance ; `praise_name`
   reste la valeur la plus proche parmi celles autorisées (`clan_name |
non_hereditary_patronymic | nisba | praise_name | totemic_clan`). Je propose de
   **garder `praise_name`** (conforme à la consigne : ne changer le sous-type que si la
   recherche le contredit — ici elle l'affine, elle ne l'invalide pas) et d'ajouter cette
   nuance comme une reconstruction linguistique supplémentaire, sourcée séparément.

4. **Répartition géographique non extensible en l'état.** Le peuple yoruba est
   significativement présent au-delà du Nigeria (communautés au Bénin, notamment autour
   de Porto-Novo, et au Togo). Mais aucune source trouvée n'atteste spécifiquement le
   prénom Adebayo — par opposition à la présence générale du peuple yoruba — dans ces
   pays. Ajouter le Bénin ou le Togo à `countries[]` sur la seule base de la démographie
   générale du peuple yoruba serait une invention non couverte par une source propre au
   nom ; je ne le propose donc pas, et j'ajoute un `gaps[]` dédié.

5. **Registre orienté lecteur — six entrées `gaps[]` à reformuler (sévérité: modérée).**
   Les six entrées existantes citent les requêtes de recherche utilisées (par exemple
   « Les recherches « Adebayo Yoruba oral tradition griot transcription » ... n'ont livré
   ») : cela explique la méthode de travail plutôt que ce que l'atlas ignore, ce que la
   doctrine du registre orienté lecteur proscrit (dire ce qui manque, jamais pourquoi
   l'atelier ne l'a pas encore trouvé). Je propose une reformulation de chacune,
   conservant exactement le même champ documenté (`fieldPath`) et le même constat de
   fond, sans décrire la méthode de recherche.

6. **Porteur notable — vérification faite, rien à ajouter.** Recherche ciblée d'une
   auto-identification yoruba publique et citable, dans les mots mêmes de la personne
   (règle de confidentialité absolue). Aucune citation de ce type trouvée, y compris pour
   des personnalités décédées portant ce prénom (seul statut autorisé par le modèle pour
   `bearers[]`). Le champ reste vide.

## Proposed JSON

```json
{
  "_meta": {
    "format": "AFRIK JSON v2",
    "entity": "patronyme",
    "directives": "Fiche recherchée selon le protocole anthroponymique. Les affirmations sont limitées aux sources propres à Adebayo ; les lacunes consignent les recherches restées sans résultat."
  },
  "id": "PAT_ADEBAYO",
  "nameMain": "Adebayo",
  "nameSystem": "praise_name",
  "spellings": [
    {
      "spelling": "Adebayo",
      "attestations": [
        {
          "countryId": "NGA",
          "sourceRefs": [
            "yorubanames-adebayo",
            "merryfield-1989-yoruba",
            "afrik-candidate-queue"
          ]
        }
      ]
    },
    {
      "spelling": "Adébayo",
      "attestations": [
        {
          "countryId": "NGA",
          "sourceRefs": ["yorubanames-adebayo", "afrik-candidate-queue"]
        }
      ]
    }
  ],
  "transmissionMode": "non_hereditary",
  "designatedSocialUnit": "individual",
  "origin": {
    "oralTraditions": [],
    "writtenChronicles": [],
    "linguisticReconstructions": [
      {
        "claim": "YorubaNames analyse Adébáyọ̀ comme adé-bá-ayọ̀ (« la royauté rencontre la joie ») ou a-dé-bá-ayọ̀ (« nous sommes arrivés dans la joie »). Une source pédagogique universitaire l'atteste séparément comme nom choisi pour un garçon né pendant une période de joie familiale.",
        "claimStatus": "established",
        "sourceRefs": ["yorubanames-adebayo", "merryfield-1989-yoruba"]
      },
      {
        "claim": "Dans la typologie de l'onomastique yoruba, un nom comme Adébáyọ̀ — donné pour marquer la joie entourant une naissance — relève des orúkọ àmútọ̀runwá (noms dits « apportés du ciel », attribués selon les circonstances de la naissance), une catégorie que les chercheurs distinguent des oríkì proprement dits, qui sont des noms de louange célébrant une lignée ou des qualités. Cette classification précise le sens du prénom sans contredire son interprétation comme « la royauté rencontre la joie ».",
        "claimStatus": "claimed",
        "sourceRefs": ["fakuade-2020-yoruba-naming"]
      }
    ]
  },
  "peoples": [
    {
      "peopleId": "PPL_YORUBA",
      "status": "attested",
      "sourceRefs": ["yorubanames-adebayo", "merryfield-1989-yoruba"]
    }
  ],
  "countries": [
    {
      "countryId": "NGA",
      "status": "attested",
      "sourceRefs": ["merryfield-1989-yoruba"]
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
      "sourceKey": "yorubanames-adebayo",
      "title": "Adébáyọ̀ — YorubaNames",
      "url": "https://www.yorubaname.com/entries/adebayo?lang=en",
      "tier": "unverified",
      "source_kind": "community",
      "notes": "Page de la base collaborative YorubaNames consultée directement pour Adebayo. Elle fournit la forme tonale, une glose et une segmentation morphologique ; son contenu communautaire est conservé au niveau « unverified »."
    },
    {
      "sourceKey": "merryfield-1989-yoruba",
      "title": "Lessons from Africa: A Supplement to Middle School Courses in World Cultures, Global Studies, and World Geography",
      "url": "https://files.eric.ed.gov/fulltext/ED304395.pdf",
      "tier": "referenced",
      "source_kind": "academic",
      "notes": "Merry M. Merryfield (dir.), ERIC Clearinghouse et Social Studies Development Center, Indiana University, 1989, leçon 5, pp. 45-48 du document. Le PDF intégral a été consulté ; la liste des noms et significations est attribuée à E. B. Ogundimu."
    },
    {
      "sourceKey": "fakuade-2020-yoruba-naming",
      "title": "Yoruba personal naming system: Traditions, patterns and practices",
      "url": "https://doi.org/10.1558/sols.37825",
      "tier": "referenced",
      "source_kind": "academic",
      "notes": "Article de Gbenga Fakuade, Joseph Friday-Otun et Hezekiah Adeosun paru dans la revue Sociolinguistic Studies (vol. 13, n° 2-4, 2020). Le résumé et des extraits indexés ont été consultés le 5 septembre 2026 ; le texte intégral n'était pas librement accessible. Cette étude distingue, dans la nomenclature des noms yoruba, les orúkọ àmútọ̀runwá (donnés selon les circonstances de la naissance) des oríkì, noms de louange proprement dits."
    }
  ],
  "gaps": [
    {
      "fieldPath": "origin.oralTraditions",
      "reason": "Aucune tradition orale ni parole de griot n'a pu être rattachée nommément à ce prénom."
    },
    {
      "fieldPath": "origin.writtenChronicles",
      "reason": "Aucune chronique manuscrite ni pièce d'archives propre à ce prénom n'a été retrouvée."
    },
    {
      "fieldPath": "alliances",
      "reason": "Aucun lien de parenté à plaisanterie avec un autre nom n'a pu être établi pour ce prénom."
    },
    {
      "fieldPath": "casteOrSocialFunction",
      "reason": "Ce prénom n'est associé à aucune fonction sociale ou caste héréditaire dans les sources disponibles."
    },
    {
      "fieldPath": "bearers",
      "reason": "Aucune personnalité décédée portant ce prénom n'a pu être associée à une source suffisamment fiable et indépendante de Wikipédia."
    },
    {
      "fieldPath": "homonyms",
      "reason": "Aucune graphie identique d'origine distincte n'a été relevée pour ce prénom."
    },
    {
      "fieldPath": "countries",
      "reason": "La présence de ce prénom en dehors du Nigeria — notamment au sein des communautés yoruba du Bénin ou du Togo — n'a pas pu être confirmée par une source propre à ce prénom."
    }
  ]
}
```

## Sources

- **yorubanames-adebayo** — _Adébáyọ̀ — YorubaNames_, base collaborative, consultée le
  2026-09-05. Tier `unverified` : ressource communautaire, sans comité éditorial.
  https://www.yorubaname.com/entries/adebayo?lang=en
- **merryfield-1989-yoruba** — Merry M. Merryfield (dir.), _Lessons from Africa: A
  Supplement to Middle School Courses in World Cultures, Global Studies, and World
  Geography_, ERIC Clearinghouse / Social Studies Development Center, Indiana
  University, 1989. Tier `referenced` : ouvrage pédagogique universitaire identifiable
  et vérifiable, attribuant la liste de noms à E. B. Ogundimu. https://files.eric.ed.gov/fulltext/ED304395.pdf
- **fakuade-2020-yoruba-naming** _(nouveau)_ — Gbenga Fakuade, Joseph Friday-Otun,
  Hezekiah Adeosun, « Yoruba personal naming system: Traditions, patterns and
  practices », _Sociolinguistic Studies_, vol. 13, n° 2-4, 2020. Tier `referenced` :
  article de revue à comité de lecture. Consulté le 2026-09-05 via le résumé et des
  extraits indexés (texte intégral non librement accessible ; PDF miroir consulté à
  https://www.almendron.com/tribuna/wp-content/uploads/2021/08/37825-120274-1-pb.pdf,
  DOI canonique https://doi.org/10.1558/sols.37825). Utilisé uniquement pour la
  distinction générale entre orúkọ àmútọ̀runwá et oríkì dans la typologie yoruba, pas
  pour une mention nommée d'Adebayo (l'article n'a pas pu être vérifié comme citant ce
  prénom spécifiquement).
- **afrik-candidate-queue** — inchangée, conservée telle quelle (tier `unverified`,
  `source_kind: ai_generated`).

Recherches faites sans résultat exploitable (non retenues comme sources) :

- Wikipédia (« Adebayo », « Ade (given name) », etc.) : jamais utilisée comme source
  elle-même, conformément à la doctrine ; aucune source primaire nommant Adebayo
  spécifiquement n'a été retrouvée en la traversant.
- wisdomlib.org, dl.iir.edu.ua : agrégateurs / sites de contenu non identifiables
  éditorialement — écartés plutôt que cités à un tier `unverified` par prudence, faute
  d'un auteur ou d'une ligne éditoriale vérifiable.
- Recherche démographique Yoruba (Bénin ~1,6 M, Togo ~285 000-342 000, diaspora
  États-Unis/Ghana/Côte d'Ivoire/Canada/Australie) : confirme la présence du peuple
  yoruba hors du Nigeria, mais aucune de ces sources n'atteste le prénom Adebayo
  lui-même dans ces pays — non intégrée à la fiche pour cette raison (voir Finding 4).
- Recherche d'un porteur notable auto-identifié yoruba dans ses propres mots (règle de
  confidentialité absolue) : aucune citation qualifiante trouvée, y compris pour des
  personnalités décédées.

## Still missing

- **Traditions orales, chroniques écrites, alliances à plaisanterie, fonction
  sociale/caste, porteur notable, homonymes** : lacunes confirmées après recherche
  complémentaire, formulation reader-facing révisée dans `gaps[]` (voir Finding 5).
- **Attestation du prénom au Bénin et au Togo** : la présence du peuple yoruba y est
  bien documentée, mais aucune source ne mentionne spécifiquement ce prénom dans ces
  pays — nouveau `gaps[]` ajouté plutôt qu'une extension non sourcée de `countries[]`.
- **Le texte intégral de Fakuade et al. (2020)** n'a pas pu être consulté en entier
  (blocage d'accès sur ResearchGate et sur la page de la revue) ; seuls le résumé et des
  extraits indexés ont pu être vérifiés. La citation reste donc limitée à la
  distinction générale orúkọ àmútọ̀runwá / oríkì, sans confirmation que l'article
  nomme Adebayo lui-même.
- **Un deuxième porteur/usage attesté par un registre officiel** (état civil, institut
  statistique) resterait la meilleure amélioration possible du tier de sourcing actuel,
  aujourd'hui limité à `unverified` et `referenced` — aucune source `official` n'a été
  trouvée pour ce prénom précis.
