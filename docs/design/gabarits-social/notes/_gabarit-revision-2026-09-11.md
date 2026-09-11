# Révision du gabarit — 11 septembre 2026

`GABARITS-SOCIAL.md` remplacé, huit règles portées dans le moteur, dix decks
re-rendus. Les suites passent, et deux résultats méritent d'être lus avant les
images : **aucune carte du corpus ne relève plus de B**, et **un seul deck sort du
quota**, pour une raison de longueur de texte.

---

## 1. Ce que le moteur faisait, et ne fait plus

Le fichier de spec avait été remplacé ; le moteur, lui, datait d'avant. Les huit
règles sont maintenant dans le code, chacune avec son test.

| § | La règle | Ce qui tenait lieu de règle |
| --- | --- | --- |
| 3 | corps ≥ 1,6 × crédit | corps 30, crédit 31 — l'inverse |
| 3 | aucun filet vertical de pleine hauteur | un filet de 6 px longeait chaque plaque |
| 3 bis | paire horizontale, une glose par terme, `→` obligatoire | deux gloses fondues derrière un middot |
| 4 | voile local à la colonne, recalé sur le premier bloc | un radial plein cadre, centré sur la carte |
| 5A | aucune plaque, aucune boîte sur une image | un aplat arrondi derrière chaque paire |
| 6 | A par défaut, C le repli, B l'exception · seuil 190 | un chiffre suffisait à envoyer en C, seuil 110 |
| 6 | quota de lot 60 / 30 / 2 | rien à l'échelle du lot |
| 7 bis | filigrane 30 px, monochrome, **sous** le crédit | le lockup en couleurs, **à côté** |

### Le parseur de spec lisait la mauvaise table

Première conséquence du remplacement, et elle a rendu le moteur muet d'un coup :
les tables de la spec étaient indexées sur **le titre le plus proche**, quel que
soit son niveau. Le déplacement de l'échelle typographique sous « Cinq rangs » a
suffi pour que `type_role` ne trouve plus rien.

Deux corrections, toutes deux au niveau du parseur plutôt qu'au niveau des appels :
les tables s'indexent sur la **section** (`##`), et l'emphase est retirée des
cellules — le jour où « Corps » et « Crédit » ont été mis en gras pour porter
l'invariant de 1,6, plus aucune taille ne se résolvait.

### L'annexe passe en encre 2

§3 le demande explicitement et §11 le reprend en case à cocher. L'encre 3 plafonne
à 4,94:1 et tombe à 4,2 dès qu'une luminance d'image survit au voile — sous le
seuil, sur le seul bloc que tout l'appareil de portes existe à protéger.

L'opacité de 0,88 s'applique **à la peinture**, pas au plan : le plan continue de
déclarer un jeton de charte, donc la porte « aucune couleur inventée » lit toujours
un jeton et non un mélange qu'elle ne saurait reconnaître.

---

## 2. Le voile de colonne — §4

Un radial plein cadre assombrit le milieu de la carte là où le sujet se trouve.
C'est ce qui produisait le halo gris, et **un voile qu'on voit comme une forme est
un échec même quand la mesure passe.**

La table des deux rampes validées ne se recopie pas : ce sont deux instances d'un
même calcul. Deux points portent toute la règle, et le reste s'en déduit —

- **0,62 à mi-hauteur du premier bloc**,
- **0,86 sous sa base**,
- au moins 400 px entre le premier palier et le plafond, faute de quoi la rampe
  montre une ligne de coupure.

L'intervalle entre ces deux points est l'unité dans laquelle tout le reste se
mesure. C'est ce que les deux rampes de la table ont en commun une fois la hauteur
de leur propre bloc divisée.

Effet mesurable immédiat : deux cartes qui échouaient au contraste passent
maintenant. `Villes-Serie` 2 était à 4,35:1 sur sa ligne de source, `Peuples-Peul`
3 à 4,43:1 — sous le seuil toutes les deux, et sur le bloc d'attribution.

---

## 3. La paire — §3 bis

`plaque` **était** le bloc de paire, sous un autre nom. 41 cartes sur les dix decks
en portent une, dont `Peuples-diaspora` 05, qui est l'exemple même de §3 bis.

Ce qu'elle donnait : deux mots empilés, un aplat arrondi derrière, un filet
vertical à gauche, et les deux gloses fondues sur une ligne derrière un middot.

Ce qu'elle donne : deux colonnes côte à côte, chaque terme au-dessus de sa propre
glose, la flèche en accent dans la gouttière. Le premier terme en encre 1, le
second en accent.

Le repli vertical avec `↓` existe, et une seule chose le déclenche : un terme plus
large que sa colonne. Anton porte les deux flèches comme de vrais glyphes — Nunito
rend un `.notdef` identique pour les deux, ce qui est la raison pour laquelle §3
bis nomme Anton.

### Le champ `accent` de la paire est périmé

La règle est positionnelle : **le premier terme en encre 1, le second en accent.**
Elle ne se négocie pas carte par carte, parce que c'est l'ordre qui doit
correspondre à celui du titre.

Or 21 des 41 cartes portaient `accent: "premier"`. L'accent se déplace donc sur
leur second terme. Le plus souvent c'est un gain — `Villes-Serie` 02 accentue
maintenant « n'ont jamais existé » plutôt que « Monts de Kong » — mais **c'est un
changement visible sur la moitié des cartes à paire.** Si une carte se lit mal
ainsi, ce qui se corrige est l'ordre des deux membres, pas la couleur.

### Ce qui n'est pas fait, et pourquoi

§3 bis demande aussi que **le titre nomme les deux camps dans le même ordre et les
mêmes couleurs que la paire** — « un mot *angolais* devenu *brésilien* », angolais
en encre 1, brésilien en accent.

Le titre reste entièrement en accent. Les deux mots ne sont pas déductibles : le
titre de la carte kilombo ne contient ni « kilombo » ni « Quilombolas », donc aucun
lien lexical ne les désigne. Il faut **un champ de §10 nommant les deux mots**, et
une passe éditoriale sur les 41 cartes. Je n'en ai pas inventé un.

À noter en même temps : un titre entièrement en accent plus un terme de paire en
accent font deux éléments en accent, ce que §0.3 n'autorise pas. La correction du
titre réglerait les deux.

---

## 4. Deux défauts sur la même couture

Une paire est **une** unité de flux bâtie sur cinq cellules. Deux endroits
comptaient les cellules au lieu de l'unité, et aucun test ne les voyait.

### Le vide au-dessus du crédit

La première passe est sortie avec **300 px de vide entre la colonne et le crédit**,
sur toute carte portant une paire : la hauteur de colonne comptait une paire
entière de trop, plus une gouttière par cellule. Layout A tasse depuis le pied,
donc la colonne démarrait d'autant trop haut.

Rien dans le plan ne se contredisait — la mesure et le placement étaient deux
expressions d'une même chose, et elles avaient dérivé. Elles n'en font plus
qu'une, `_flux`.

### La glose qui remonte dans son terme

La compression rétrécit chaque bloc jusqu'à ce que la colonne tienne. Les cellules
d'une paire portent des décalages calculés sur **les hauteurs qu'elles avaient en
entrant** : les rétrécir sans reposer les rangs fait remonter la glose dans son
propre terme.

Le chemin n'est pas théorique — il se déclenche sur **24 des 195 plans du corpus**.
Les rangs se retrouvent maintenant par recouvrement plutôt que par un y égal, la
flèche étant centrée sur la hauteur des termes sans partager leur y, et chaque
cellule garde sa place en fraction de la hauteur de son rang : c'est ce qui survit
à un rétrécissement, pas un décalage absolu.

Deux tests les tiennent : l'écart entre le bas de la colonne et le haut du crédit,
et la position de chaque glose sous son terme sur une carte assez chargée pour
déclencher la compression.

---

## 5. Le quota, deck par deck

Neuf decks sur dix le tiennent. Le compte est le même dans les trois formats.

| Deck | Cartes | A | B | C | Quota |
| --- | --- | --- | --- | --- | --- |
| Familles-Bantu | 8 | 8 | 0 | 0 | tenu |
| Noms-alliances | 6 | 6 | 0 | 0 | tenu |
| Noms-metiers | 7 | 7 | 0 | 0 | tenu |
| Pays-Benin | 5 | 5 | 0 | 0 | tenu |
| Peuples-commerce | 6 | 6 | 0 | 0 | tenu |
| Carrousel-Mercator | 5 | 5 | 0 | 0 | tenu |
| Peuples-diaspora | 8 | 7 | 0 | 1 | tenu |
| Peuples-exonymes | 7 | 6 | 0 | 1 | tenu |
| Peuples-Peul | 6 | 5 | 0 | 1 | tenu |
| **Villes-Serie** | 7 | 4 | 0 | 3 | **hors quota** |

### Villes-Serie : de la longueur de texte, pas des images

Le motif est net, et il ne laisse aucune ambiguïté sur où le traiter.

| Carte | Image | Corps | Pourquoi C |
| --- | --- | --- | --- |
| 03 | 3840 × 5284 | 199 signes | corps au-delà de 190 |
| 05 | 2448 × 4352 | 200 signes | corps au-delà de 190 |
| 06 | 3840 × 2880 | 211 signes | corps au-delà de 190 |

**Aucune image du deck n'est en cause** : toutes tiennent le plein cadre
largement. Trois corps dépassent le seuil de 9, 10 et 21 signes. C'est un travail
de `structure`, et les textes de cartes validés étant figés, je n'y ai pas touché.

Le deck sort donc en épreuve, et ses 21 rendus précédents restent intacts dans
`images/`.

### Personne ne relève plus de B

**Zéro carte en B sur les 65 du corpus.** Chaque carte d'ouverture et de bascule
porte un corps, et §6 réserve désormais B au mot qui porte seul. Les vingt cartes
concernées passent en A.

Le plafond de deux est donc tenu partout, mais il est tenu à zéro. Si B doit
exister sur ces decks, c'est une décision éditoriale : une ouverture en B est une
ouverture dont le corps a été retiré, pas une ouverture rendue autrement.

---

## 6. Ce qui a été écrit

| | `images/` | `_epreuves/` |
| --- | --- | --- |
| Huit decks publiables | 159 réécrits | — |
| Villes-Serie | 21 **intacts** | 21 |
| Carrousel-Mercator | 15 **intacts** | 15 |

Les 36 rendus intacts sont exactement ceux des deux decks sortis en épreuve. La
règle tient : **un lot qui sort en épreuve ne touche pas à son `images/`.**

Mercator reste bloqué sur la porte 1 — la licence de sa carte 2 n'est toujours pas
nommée — et reste en 🟡.

---

## 7. Non-régression

| Suite | Résultat |
| --- | --- |
| `test_ethni_compose.py` | 51/51 |
| `test_ethni_tokens.py` | 16/16 |
| `test_ethni_cadence.py` | 10/10 |
| `test_ethni_soustitre.py` | 9/9 |
| `test_corpus_compose.py` | 8/8 |
| `test_plan_vs_peint.py` | 3/3 |
| `test_rendus_intacts.py` | 3/3 |

Dix-sept tests nouveaux, un par règle et un par défaut trouvé. Celui du voile
mesure le **fond voilé** et non la carte finie : une ligne qui traverse le titre
échantillonne ses glyphes, qui sont clairs par construction et ne disent rien du
voile.

---

## 8. Ce qui reste

1. **Le titre à deux couleurs** — §3 bis, ci-dessus. Un champ de §10 et une passe
   éditoriale sur 41 cartes.
2. **§10 ne déclare pas le champ de la paire.** §3 bis décrit le bloc, §6 teste
   `carte.paires`, et le schéma n'en dit rien — le moteur lit `plaque`, comme
   l'ancien gabarit. 41 cartes en portent une. Le nom est à trancher, et je ne
   l'ai pas fait à ta place : renommer un champ touche les dix `cards.json`.
3. **Villes-Serie** — trois corps à raccourcir dans `structure`, ou le deck reste
   en épreuve.
4. **Mercator** — la licence de la carte 2.
5. **La vidéo** — non re-rendue. Les dix decks image passent d'abord.
6. **Les 104 identités** des quatorze decks vidéo, une image à la fois.
