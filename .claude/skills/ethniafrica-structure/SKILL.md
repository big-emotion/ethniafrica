---
name: ethniafrica-structure
description: Écrire le contenu d'une publication EthniAfrica à partir d'un rapport de sujet — cards.json au schéma de GABARITS-SOCIAL.md §10, script de narration, titre, descriptions par réseau, SOURCES.md avec licences vérifiées image par image, et liens UTM. Deuxième étape de la chaîne idee → structure → produire. Utiliser pour « écris les cartes », « rédige », « écris la narration », « prépare les sources », ou /ethniafrica-structure. Ne rend aucune image et ne choisit aucune disposition.
---

# structure — écrire le contenu

Deuxième étape. `idee` vient avant, `produire` vient après.

Si aucun rapport de sujet n'existe dans `$ETHNIAFRICA_SOCIAL_OUTPUT/_idees/`, dis-le et
propose de lancer `idee`. Ne saute pas l'étape.

## Entrée

Le rapport de sujet écrit par `idee`.

## Sorties

Dans `$ETHNIAFRICA_SOCIAL_OUTPUT/{Sujet}/` :

| Fichier            | Ce qu'il porte                                                                |
| ------------------ | ----------------------------------------------------------------------------- |
| `cards.json`       | le schéma de `docs/design/gabarits-social/GABARITS-SOCIAL.md` §10, sans écart |
| `narration.fr.txt` | le script, si le sujet vise un reel                                           |
| `SOURCES.md`       | une entrée par image : auteur, dépôt, URL, licence lue                        |
| `post.md`          | titre, descriptions par réseau, liens UTM, en-tête d'état                     |

## La règle qui prime

**Chaque affirmation porte son ancrage. Une licence non lue bloque la carte.**

« Non lue » veut dire : tu n'as pas ouvert la page du dépôt et vu la mention de
licence de tes propres yeux. Une licence supposée d'après le nom du fichier, la
réputation du dépôt ou une autre carte de la même série n'est pas une licence
lue. Dans le doute, la carte ne sort pas — elle change d'image.

`SOURCES.md` porte, pour chaque image, l'URL exacte où la licence a été lue.

## Le schéma, sans écart

`cards.json` suit §10 : `campagne`, `pilier`, `accent`, `fond`, `licence_sortie`,
puis `cartes[]` avec `rang`, `role`, `titre`, `chiffre`, `precision`,
`punchline`, `corps`, `source`, `coupe`,
`image{fichier,w,h,cadrage,identite,verifie_le,credit,depot,licence}` et
`disposition`.

- `disposition` reste `auto` sauf raison écrite. §6 choisit mieux qu'une
  intuition, parce qu'il mesure la résolution.
- `image.w` et `image.h` sont les **pixels réels du fichier décodé**, jamais une
  estimation ni une lecture du nom. C'est sur eux que repose le repli de §6.
- **`image.identite` est obligatoire.** Une phrase décrivant ce que l'image
  montre, écrite **en la regardant**, sans nommer son auteur ni sa licence. C'est
  ce que la porte 2 oppose au crédit ; recopiée du crédit, elle ne garde rien.
  Pose `image.verifie_le` à la date du jour une fois les deux relus côte à côte.
- **`paires` porte une liste de couples** — `[{"terme": "Mosotho", "glose": "une
personne"}, {"terme": "Basotho", "glose": "le peuple"}, …]`. Le parallèle
  vertical **est** le contenu : c'est lui qui fait voir que Mosotho et Basotho
  sont le même mot à deux nombres. **Deux à quatre paires**, au-delà la scène se
  coupe en deux. N'emploie pas `coupe` pour ça : une structure ne se déclare pas
  par un retour à la ligne.

  **Le champ s'appelle `paires`, et une carte porte `corps` et `paires`
  ensemble** — c'est la forme normale : la paire montre l'équivalence, le corps
  dit d'où elle vient. Un `corps_paires` qui _remplace_ le corps était la
  contrainte de la vidéo, où le tableau prend toute la place ; en image fixe il y
  a la place. Écrit sous l'ancien nom, le bloc de paires **disparaît de la carte
  sans un mot** : le moteur ne trouve pas le champ et rien ne se plaint.

  Un terme ne porte **pas** de champ `accent` : la couleur est positionnelle,
  premier terme en encre 1, second en accent.

- **`pivot` est obligatoire sur toute scène vidéo.** C'est le mot que la scène
  retourne, celui qui passe en accent dans la plaque de sous-titre — **un seul**.
  Le moteur ne le déduit jamais : aucune règle ne dit quel mot d'une phrase
  porte son basculement. `null` est une réponse valide et veut dire « aucun
  accent sur cette scène », pas « à décider plus tard ».
- `coupe` reste `null`. Ne force les retours à la ligne d'un titre que là où la
  coupe **porte du sens** — une énumération dont les groupes ne doivent pas se
  mélanger. Une coupe posée pour l'esthétique se périme au premier changement de
  format.
- `licence_sortie` n'est pas recopiée d'une carte : c'est la licence la plus
  contraignante du lot, et `produire` la recalcule. Écris ce que tu crois, elle
  sera vérifiée.

## La clôture, et la fin parlée

La carte de clôture est **constante d'une série à l'autre** (§7 ter) : même
titre, même datation, même ligne de vision, seul le lien change. Elle porte
`titre`, `corps` (la datation), `source` (la vision), `appel` (le lien) et
`pivot` — le membre de phrase que la plaque de vision passe en accent.

> `titre` Une frontière ne contient pas un peuple. Elle le traverse.
> `corps` Tracées à la conférence de Berlin, en 1884. Les noms sont mille ans plus vieux.
> `source` Nommer un peuple aussi facilement qu'un pays.
> `pivot` qu'un pays
> `appel` 776 peuples · ethniafrica.com

Le compte de `appel` se **mesure sur le corpus**, il ne se recopie pas d'une
vidéo précédente ni de §9 bis, qui écrit encore 804.

**Le dernier paragraphe de `narration.fr.txt` dit la doctrine, pas une adresse**,
et il est court : le renversement, puis la sortie. Rien d'autre.

> Une frontière ne contient pas un peuple. Elle le traverse.
> Retrouvez l'histoire du nom des peuples sur EthniAfrica. Et bientôt, celle des lieux.

La datation et la vision sont **écrites sur la carte**, mot pour mot : les dire
aussi à la voix publie la même phrase trois fois et immobilise l'image le temps
de le faire. Mesuré : quatre temps parlés tiennent la carte 21,4 s, deux temps la
tiennent 7,2 s. Le montage contrôle ce paragraphe contre les mots de la carte et
le remarque quand il dérive.

**Un paragraphe de narration est une scène.** Le nombre de blocs séparés d'une
ligne vide doit égaler le nombre de cartes, sinon le montage ne peut pas caler
les scènes et le dit.

## Le registre

- Les trois champs publiés verbatim au lecteur ne portent **aucune mention
  interne** : ni « à nommer », ni « à confirmer », ni « à compléter ». Ce sont
  des messages à l'opérateur, et ils bloquent la publication au lieu de
  s'imprimer.
- Le crédit nomme **le document réellement affiché sur la carte**, pas la série
  dont il provient ni la campagne qui l'héberge.

Trois guides restent dans la bibliothèque de production, avec les sujets qu'ils
servent. Ils portent de la doctrine éditoriale datée, pas du code :

- Registre de langue : `plain-language-doctrine-2026-09-09.md`.
- Descriptions par réseau : `description-template-2026-09-09.md`.
- Sourcing et personnes reconnaissables : `sourcing-et-licences-2026-09-07.md`.

## Ce que tu ne fais pas

Rendre les images. Choisir les dispositions. Ouvrir `ethni_carousel.py` ou
`ethni_render.py`. Décider une couleur, une taille ou une marge — elles sont dans
`docs/design/gabarits-social/GABARITS-SOCIAL.md` et dans `docs/design/gabarits-social/tokens/`, et nulle part
ailleurs.

## Pour finir

Passe le sujet en **🟡 En traitement** dans l'en-tête de son `post.md`, recalcule
l'état (`node social/tools/etat-pipeline/build-etat.mjs`), et dis en une ligne
que l'étape suivante est `produire`. Ne la lance pas de toi-même.
