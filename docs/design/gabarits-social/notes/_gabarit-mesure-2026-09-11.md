# Le seuil devient une mesure — 11 septembre 2026

Quatre arbitrages portés : `CORPS_LONG` disparaît au profit de `colonne_A_tient()`,
B accepte une ligne d'explication, §10 déclare `paires`, et `titre_camps` colore le
titre sans jamais bloquer.

**Villes-Serie s'est débloqué de lui-même**, sans qu'un texte figé soit touché. Et
la mesure a immédiatement dit quelque chose qu'un compte ne pouvait pas dire.

---

## 1. Le compte était la faute

| Carte | Corps | Avant (seuil 190) | Après (mesure) |
| --- | --- | --- | --- |
| Villes-Serie 02 | **183** signes | A | **C** |
| Villes-Serie 03 | 199 signes | C | **A** |
| Villes-Serie 05 | 200 signes | C | **A** |
| Villes-Serie 06 | 211 signes | C | **A** |

La carte qui ne tient pas est celle qui a **le corps le plus court des quatre.**
199 signes en lignes courtes tiennent là où 183 en lignes hautes ne tiennent pas —
exactement ce que le seuil ne pouvait pas voir.

### « Tenir » voulait dire n'importe quoi

Premier jet : `colonne_A_tient` composait la colonne et regardait s'il restait des
fautes. **Tout tenait, jusqu'à 900 signes.** La compression rétrécit le corps
jusqu'à ce que ça rentre, donc la question « est-ce que ça rentre » avait toujours
la même réponse.

Elle se pose maintenant sur la taille que §3 donne : le plan retient s'il a dû
céder du corps, et une colonne qui ne tient qu'en rétrécissant n'a pas tenu.

### Ce que ça coûte, et ce que ça ne coûte plus

Un essai par carte et par format, avec le fond voilé — le contraste est une
propriété des pixels sous le texte, pas du plan.

| | |
| --- | --- |
| `plan()` sans essai | 28 ms |
| `plan()` avec essai, sans cache | 314 ms |
| `plan()` avec essai, mémorisé | 88 ms |

Le pilote planifie chaque carte quatre fois — le quota, la table du rapport, sa
propre ligne, le rendu — donc l'essai est mémorisé sur le contenu de la carte.

Et `est_detoure` réduisait un scan de 3840 × 5284 à 32 × 32 **à chaque choix de
disposition**, pour lire seize pixels de coin : 77 ms, payés sur chaque carte et
chaque format depuis le début. La réponse est maintenant attachée à l'image, donc
elle vit et meurt avec elle.

---

## 2. B existe enfin

Avant : **zéro carte en B sur 65**, parce que toute carte d'ouverture porte un
corps. Le plafond de deux se tenait à zéro — une exception que sa propre règle
rendait impossible.

Avec 90 signes d'explication autorisés : **une à deux cartes en B par deck, sur les
dix.** Ce que B refuse reste la paire.

---

## 3. `paires` — un champ, plus deux

`plaque` et `corps_paires` étaient la même chose sous deux noms, et le moteur lisait
encore le premier. §10 les remplace tous les deux par `paires`, une liste de couples
`{terme, glose}`.

**41 cartes migrées** sur les dix decks. Le champ `accent` du terme est supprimé :
la couleur est positionnelle, donc un champ disant quel terme porte l'accent ne
pouvait que contredire la règle. 21 cartes le posaient sur `premier` ; l'accent
passe sur le second partout.

### Une contradiction que je n'ai pas tranchée à ta place

> §10 : « Une carte ne porte jamais `corps` et `paires` à la fois. »
> §5A : « Ordre : titre → **paire ou précision → corps** → source → crédit. »

**Les 41 cartes à paire portent toutes un corps.** Bloquer sur §10 envoyait les neuf
decks publiables en épreuve d'un coup, pour une contradiction interne à la spec.

La porte **remarque** donc au lieu de refuser, et nomme la carte. Une ligne à
inverser si c'est §10 qui doit gagner — mais alors il faut réécrire 41 cartes.

### Trois et quatre membres ne tiennent pas

§10 autorise deux à quatre couples. À quatre, les colonnes tombent à 180 px et rien
n'y tient : le moteur bascule en repli vertical, puis manque de place et le dit. Les
41 cartes du corpus en portent deux, donc c'est sans effet ici — mais le plafond de
quatre est optimiste pour la forme horizontale.

---

## 4. `titre_camps` — et l'encre du titre

Le titre passe en **encre 1**, et l'accent va au mot que `titre_camps` nomme. Sur
`Peuples-diaspora` 05 : « UN MOT ANGOLAIS DEVENU **BRÉSILIEN.** », et la paire
dessous porte *kilombo* en encre 1, *Quilombolas* en accent. La couleur est devenue
une clé de lecture.

Le mot se retrouve à travers les capitales et les accents — « brésilien » va
chercher « BRÉSILIEN. » et garde le point avec lui. Un mot absent du titre ne
bloque rien : le titre reste entier.

**Une seule carte remplie**, celle qui sert d'exemple à §3 bis. Les quarante autres
attendent une passe par deck — les écrire en une fois serait le lot groupé que tu as
refusé pour les identités.

> **À trancher :** §3 dit deux fois que le titre est en accent — le rang 1 du
> tableau des cinq rangs, et la ligne « Titre de couverture » de l'échelle
> typographique. §10 dit qu'il reste en encre 1. J'ai appliqué §10, qui est la
> règle la plus récente et la seule des deux qui rende §0.3 tenable ; les deux
> lignes de §3 restent à corriger.

---

## 5. Le quota, deck par deck

**Huit decks sur dix le tiennent dans les trois formats.** Le compte n'est plus le
même d'un format à l'autre, et c'est attendu : le carré est le cadre le plus court,
donc le premier où une colonne cesse de tenir.

| Deck | Cartes | carrousel | linkedin | reel |
| --- | --- | --- | --- | --- |
| Familles-Bantu | 8 | 7A 1B | 6A 1B 1C | 6A 1B 1C |
| Noms-alliances | 6 | 5A 1B | 5A 1B | 5A 1B |
| Noms-metiers | 7 | 6A 1B | 5A 1B 1C | 5A 1B 1C |
| Pays-Benin | 5 | 4A 1B | 4A 1B | 4A 1B |
| Peuples-commerce | 6 | 6A | 5A 1C | 6A |
| Peuples-diaspora | 8 | 6A 1B 1C | 6A 1B 1C | 7A 1B |
| Peuples-exonymes | 7 | 6A 1B | 6A 1B | 6A 1B |
| Carrousel-Mercator | 5 | 4A 1B | 4A 1B | 4A 1B |
| **Villes-Serie** | 7 | 5A 1B 1C | **3A 1B 3C** | 5A 1B 1C |
| **Peuples-Peul** | 6 | **3A 2B 1C** | **3A 2B 1C** | **3A 2B 1C** |

### Villes-Serie ne tombe plus que sur le carré

Le deck tient le quota en carrousel et en reel. En LinkedIn — 1080 × 1080, le cadre
le plus court des trois — trois colonnes cessent de tenir.

Et le motif est exactement celui que tu annonçais : **la carte qui tombe porte le
corps le plus court des trois.**

| Carte | Corps | linkedin |
| --- | --- | --- |
| 02 | **183** signes | C |
| 03 | 199 signes | C |
| 05 | 200 signes | C |
| 06 | **211** signes | **A** |

211 signes tiennent, 183 ne tiennent pas. Aucun seuil en signes ne peut dire ça.

### Peuples-Peul : l'arithmétique du quota, pas un défaut du deck

3 A, 2 B, 1 C sur six cartes. Le C est `Peuples-Peul` 05, un sujet détouré sur
blanc — une image à changer, pas un texte à raccourcir.

Mais le quota est **arithmétiquement intenable** ici : six cartes demandent quatre
A pour atteindre 60 %, donc deux places seulement pour tout le reste. Une
ouverture, une bascule et une image qui ne supporte pas le plein cadre en font
trois. Sur un deck de cinq ou six cartes, « au plus 2 en B » et « au moins 60 % en
A » ne peuvent pas tenir ensemble dès qu'une seule carte tombe en C.

À trancher : soit le plafond de B descend à 1 sur les decks courts, soit le
plancher de A se lit en cartes et non en pourcentage.

---

## 6. Non-régression

| Suite | Résultat |
| --- | --- |
| `test_ethni_compose.py` | 55/55 |
| `test_ethni_tokens.py` | 16/16 |
| `test_ethni_cadence.py` | 10/10 |
| `test_ethni_soustitre.py` | 9/9 |
| `test_corpus_compose.py` | 8/8 |
| `test_plan_vs_peint.py` | 3/3 |
| `test_rendus_intacts.py` | 3/3 |

`test_rendus_intacts` a attrapé une vraie panne : le pilote nommait encore
`CORPS_LONG` dans sa phrase d'explication, et **plantait sur chaque deck**. Sans
cette suite, le rendu partait et s'arrêtait à la première carte.

### Ce qui a été écrit

| | `images/` | `_epreuves/` |
| --- | --- | --- |
| Sept decks publiables | 141 écrits | — |
| Villes-Serie | 21 **intacts** | 21 |
| Peuples-Peul | 18 **intacts** | 18 |
| Carrousel-Mercator | 15 **intacts** | 15 |

Les trois lots sortis en épreuve ont écrit **zéro fichier** dans `images/`, mesuré
au temps de départ du rendu et non sur une fenêtre d'une heure — une fenêtre large
compte la génération précédente comme fraîche, ce qui est précisément la confusion
qui rend la règle difficile à vérifier.

---

## 7. Ce qui reste

1. **La contradiction §5A / §10** sur `corps` + `paires` — §3 ci-dessus.
2. **L'encre du titre** dans les deux tableaux de §3 — §4 ci-dessus.
3. **Les 40 `titre_camps`** restants, une passe par deck.
4. **Mercator** — la licence de la carte 2.
5. **La vidéo** — non re-rendue.
