# Un seul voile, et dix ouvertures — 11 septembre 2026

§4 remplace trois couches par une, ancrée sur la colonne et non sur une ordonnée.
§7 ter donne aux dix séries une ouverture propre et une clôture commune. Et le
contrôle de profil de luminance est écrit : c'est lui qui aurait attrapé les trois
défauts de voile de la session.

---

## 1. Le voile — trois couches devenues une

Ce qui se composait avant sur une carte plein cadre : un dégradé vertical sur toute
la carte, un voile de lisibilité calé sur le premier bloc, une plaque de bandeau en
haut, puis des aplats locaux ajoutés sous chaque bloc trop clair.

**Quatre choses qui se croisent, et deux qui s'annulent.** La plaque de bandeau
descendait à 0 pendant que le voile de colonne montait depuis 0 : entre les deux,
l'image reparaissait en pleine lumière sur toute la largeur.

Ce qui se compose maintenant :

| Bloc | Position | Alphas |
| --- | --- | --- |
| `voile-rampe` | juste au-dessus de la colonne, 300 px | 0 → 0,92 |
| `voile-colonne` | la boîte de la colonne, jusqu'au bas de la carte | 0,92 → 0,95 |

La rampe finit à 0,92 là où l'aplat commence à 0,92. **L'alpha monte et ne redescend
jamais.**

### Plus une seule cote écrite à la main

Les deux blocs se placent depuis la colonne posée : l'aplat commence au premier bloc,
la rampe finit là où l'aplat commence. Quand la colonne grandit, les deux suivent.

C'est la correction de fond. Les deux versions précédentes décrivaient **en
ordonnées** ce qui doit se décrire **en relations** — d'abord la mi-hauteur du
premier bloc, puis un sommet de colonne additionné à la main, que l'ajout d'une
rangée a invalidé le jour même.

### Ce qui a disparu avec

- **`_renforcer_voile`** — il posait des aplats arrondis sous tout bloc en dessous
  du seuil. C'est à la fois la boîte que §5A interdit et exactement ce qui casse un
  profil monotone.
- **Le dégradé vertical plein cadre** et **le voile de lisibilité calibré**.
- **La plaque de bandeau sur les cartes plein cadre** — le bandeau descend dans la
  colonne, donc il n'a plus besoin de sa propre couche.

Une carte **en bande** garde sa plaque : son texte est sur un aplat, il n'y a pas de
second voile avec lequel entrer en collision. Sa plaque tient son 0,92 **jusqu'au bas
de la rangée d'en-tête** et ne descend qu'ensuite — le palier se lit sur la rangée,
il ne s'écrit pas en fraction. Sans ça le bandeau tombait à 0,42 sur une gravure
pâle, soit 2,78:1 là où la table des alphas demande 0,92.

---

## 2. Le test qui aurait tout vu

Le profil de luminance de ligne, mesuré **sur un aplat gris** : ce qui varie le long
du profil vient du voile et de rien d'autre. La variation propre d'une photographie
masquerait exactement le défaut cherché.

L'assertion : la luminance ne remonte jamais de plus de **25 niveaux**.

Sur le défaut mesuré — 0,95 en haut, 0,00 à y = 400, 0,78 à y = 700 — la luminance
montait à 225 puis retombait à 46. Une excursion de 200 niveaux. Le test l'aurait
refusée au premier rendu, et les deux calibrations fausses avec.

Il tourne à deux endroits : sur la carte d'essai dans `test_ethni_compose`, et sur
**chaque carte du corpus qui sort en plein cadre** dans `test_corpus_compose`.

---

## 3. Le bandeau descend dans la colonne

Première rangée, `space-between` : le pilier à gauche en encre 1, le rang à droite en
accent. Une seule ligne, interlettre 0,16em, et le libellé rétrécit avant de passer
à la ligne.

Conséquence mesurable : la colonne est plus haute d'une rangée, donc une carte à
chiffre qui tenait tout juste ne tient plus — le chiffre de 216 px se comprimait à
191. `colonne_A_tient` le dit, et la carte part en cartouche pour la raison que §6
donne.

---

## 4. Dix ouvertures, une clôture

**L'ouverture est la vignette.** Dix séries qui ouvrent sur la même phrase donnent
dix fois la même vignette dans le fil.

| Deck | Registre | Titre |
| --- | --- | --- |
| Villes-Serie | le nom imposé | Ces villes ont porté le nom de leurs **conquérants**. |
| Noms-alliances | ce qui n'a jamais cessé | Ils ont le droit de se moquer. Pas celui de se **fâcher**. |
| Peuples-diaspora | renversement d'agent | On ne les a pas nommés. Ils se sont **nommés**. |
| Pays-Benin | le nom imposé | Le royaume du Bénin n'a jamais été au **Bénin**. |
| Noms-metiers | ce qui n'a jamais cessé | Avant d'être un nom de famille, c'était un **métier**. |
| Carrousel-Mercator | durée et échelle | L'Afrique fait trente millions de km². Ta carte ne le **montre** pas. |
| Peuples-commerce | le nom imposé | On les a nommés d'après ce qu'ils **vendaient**. |
| Peuples-exonymes | le nom imposé | Personne ne s'est jamais appelé **Hottentot**. |
| Familles-Bantu | durée et échelle | L'étiquette a cent soixante-quatre ans. Les noms en ont **mille**. |
| Peuples-Peul | le nom imposé | Aucun de ces quatre noms n'est le **leur**. |

Un seul mot en accent, le dernier. Chaque affirmation est une que le deck porte déjà
sur une carte sourcée — Mercator garde son 30,38 millions de km² et ne se voit pas
attribuer un chiffre que ses cartes ne citent pas.

La ligne de vision, **mot pour mot sur les dix** :

> L'atlas nomme les peuples un par un, sources à l'appui, pour qu'on puisse nommer un
> peuple aussi facilement qu'un pays.

Les ouvertures perdent leur précision, leur punchline, leur source et leur « Fais
défiler » collé en fin de corps. Quatre blocs, pas cinq.

### L'indication de défilement devient du mobilier

Elle n'existait nulle part dans le moteur : elle vivait comme une phrase à la fin du
corps. C'est la même faute que l'adresse collée au corps, corrigée pour la pastille
il y a deux passes. §8 lui donne son libellé, son corps et ses trois chevrons à
opacité croissante — le dégradé donne le sens sans animation, donc il survit à
l'export image.

### La clôture, et ce que je n'ai pas fait

Titre et vision constants sur les dix, le renversement en une phrase avec son dernier
mot en accent, la seconde moitié au corps.

> **L'image de clôture n'est pas devenue constante.** §7 ter la déclare constante,
> mais aucun actif de clôture de marque n'existe dans l'atelier : les dix decks ont
> chacun leur image de clôture, avec son crédit et sa licence. Les rabattre sur une
> seule réécrirait neuf crédits et changerait neuf licences de sortie. À désigner.

> **« Ce peuple n'a pas été divisé » sur dix decks.** Trois n'ont pas un peuple pour
> sujet : Villes-Serie parle de villes, Carrousel-Mercator d'une projection,
> Pays-Benin du nom d'un pays. La clôture y sonne faux. C'est le prix d'une signature
> constante, et il se paie ou se nuance — à trancher.

---

## 5. Un défaut que la réécriture a révélé

**`coupe` porte les mots, pas seulement les retours.** Le moteur dessine les lignes
de `coupe` *à la place* du titre.

Trois des dix ouvertures ont donc rendu leur **ancien** titre après réécriture, en
silence, avec le nouveau corps en dessous. Sans le rendu regardé, les trois seraient
parties comme ça.

C'est une porte bloquante maintenant : une `coupe` qui n'épelle pas les mêmes mots
que son titre refuse le lot et dit les deux versions.

---

## 6. Le quota, deck par deck

**Les dix decks tiennent, dans les trois formats.** Aucun n'était tenu par les dix
au début de la passe : le bandeau descendu dans la colonne l'avait allongée d'une
rangée, et cinq decks étaient tombés hors quota.

| Deck | Cartes | carrousel | linkedin | reel |
| --- | --- | --- | --- | --- |
| Villes-Serie | 7 | 6A 1C | 6A 1C | 6A 1C |
| Noms-alliances | 6 | 6A | 6A | 6A |
| Peuples-diaspora | 8 | 8A | 8A | 8A |
| Pays-Benin | 5 | 5A | 5A | 5A |
| Noms-metiers | 7 | 7A | 7A | 7A |
| Carrousel-Mercator | 5 | 5A | 5A | 5A |
| Peuples-commerce | 6 | 6A | 6A | 6A |
| Peuples-exonymes | 7 | 7A | 7A | 7A |
| Familles-Bantu | 8 | 8A | 8A | 8A |
| Peuples-Peul | 6 | 5A 1C | 5A 1C | 5A 1C |

### Le titre d'une carte plein cadre n'était pas à la bonne taille

§5A dit « titre Anton 96–118 » — la ligne **Titre de série**. Le moteur prenait la
ligne **Titre de couverture**, 120–126, qui est celle d'une carte en bande.

Tant que les titres d'ouverture étaient des mots — « Bantou », « Peul » — l'écart
ne se voyait pas. §7 ter en fait des phrases entières, et l'ouverture de
Familles-Bantu est alors sortie sur cinq lignes et 610 px, la colonne ne tenant
qu'en cédant du corps. À la taille que §5A donne, elle tient.

**Cinq decks sont revenus dans le quota par cette seule correction**, sans qu'un
texte bouge.

### Il n'y a plus une seule carte en B

Et c'est §7 ter qui le veut : l'ouverture est en **disposition A**, et son corps est
la ligne de vision — 118 signes, au-delà des 90 que B autorise. La clôture porte le
renversement plus la vision, plus long encore.

Le plafond de deux reste un plafond. Mais B n'a plus de carte dont c'est le rôle :
si la disposition doit vivre, c'est une place qu'il faut lui trouver dans §7 ter.

---

## 7. Non-régression

| Suite | Résultat |
| --- | --- |
| `test_ethni_compose.py` | 56/56 |
| `test_ethni_tokens.py` | 16/16 |
| `test_ethni_cadence.py` | 10/10 |
| `test_ethni_soustitre.py` | 9/9 |
| `test_corpus_compose.py` | 9/9 |
| `test_plan_vs_peint.py` | 3/3 |
| `test_rendus_intacts.py` | 3/3 |

### Trois autres défauts sortis pendant la passe

- **La plaque de bandeau s'éteignait avant le bandeau.** Le dégradé plein cadre
  disparu, elle ramenait le bandeau à 0,42 sur une gravure pâle, soit 2,78:1 là où
  la table des alphas de §4 demande 0,92. Son palier se lit maintenant **sur la
  rangée d'en-tête** — encore une cote remplacée par une relation.
- **La source était en encre 3**, où §3 met le rang 5 en encre 2 : 4,39:1 pour un
  seuil de 4,5. C'est le plafond que §3 documente, sur l'autre moitié de l'annexe.
- **Huit champs `depot` portaient une licence rendue**, « … · Commons ·  · carte CC
  BY-SA 4.0 » : une ligne de crédit recapturée dans les données par une passe
  antérieure. Elle imprimait la licence deux fois et laissait un double middot dans
  l'attribution. Réparée — rien n'est perdu, la licence s'imprime sur sa propre
  ligne.

---

## 8. Ce qui a été écrit

| | `images/` | `_epreuves/` |
| --- | --- | --- |
| Neuf decks publiables | 180 écrits | — |
| Carrousel-Mercator | 15 **intacts** | 15 |

Mercator reste seul en épreuve, sur la porte 1 : la licence de sa carte 2 n'est
toujours pas nommée. Son `images/` n'a pas été touché.

Les épreuves périmées des quatre decks qui passent maintenant ont été **écartées, pas
supprimées** : une épreuve refusée à côté d'un `images/` publiable est
indiscernable de lui dans un sélecteur de fichiers, ce que les deux dossiers
existent précisément pour éviter.

---

## 9. Ce qui reste

1. **L'image de clôture constante** — §4 ci-dessus. Un actif à désigner.
2. **« Ce peuple » sur trois decks qui ne parlent pas d'un peuple.**
3. **Les 40 `titre_camps`** des cartes de série, une passe par deck.
4. **Mercator** — la licence de la carte 2.
5. **La vidéo** — non re-rendue.
