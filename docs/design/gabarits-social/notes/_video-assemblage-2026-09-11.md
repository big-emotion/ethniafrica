# Assemblage vidéo — 11 septembre 2026

Lève le point (b) du brief vidéo. `ethni_render.py` rendait l'ancien gabarit, et
quatre chantiers finis attendaient derrière cette porte.

**Une vidéo complète sort du nouveau moteur** : 8 scènes, 55,5 s, 1 080 × 1 920,
25 im/s, H.264 et AAC. Durées lues sur l'alignement, sous-titres coupés sur le
souffle, cadence d'entrée, plaque, pastille, logo, crédit permanent.

| | |
| --- | --- |
| Montage | `Projects/Libreville/video/libreville.mp4` |
| Contrôle, mouvement réduit | `Projects/Libreville/video/libreville-controle.mp4` |

---

## 1. Le schéma des scènes

`tools/migrate-scenes/migrate-scenes.mjs`, idempotent, sur le modèle de
`migrate-cards`. Il écrit `cartes.json` **à côté** de `scenes.json` plutôt qu'à sa
place : l'ancien fichier pilote encore `ethni_render.py`, et une migration qui
supprime son entrée n'a pas de retour.

**112 scènes sur 116 converties**, quinze decks.

### Ce que la première passe a refusé à tort

Un premier jet n'en convertissait que 34 et envoyait 78 scènes en `_a-trier/` pour
« aucun texte : ni ouverture, ni carte ».

C'était faux. Une scène qui ne porte que la ligne de série est **une photographie
qui porte la narration parlée** — la scène vidéo la plus courante qui soit. La
refuser aurait expédié les deux tiers du corpus au rebut et fait passer la
migration pour impossible. Elle se convertit en carte aux champs de texte vides ;
§6 la met en plein cadre, ce qu'elle était déjà.

### Les quatre refusées, et pourquoi

Toutes pour la même raison, et elle est honnête : **le corps est une liste de
lignes parallèles.**

| Deck | Scène | Le corps |
| --- | --- | --- |
| Lesotho-Botswana | 3 | « Mosotho · une personne », « Basotho · le peuple », … |
| Lesotho-Botswana | 4 | « Motswana · une personne », … |
| Sanankuya | 5 | « Traoré et Diarra », « Sangaré et Sidibé », … |
| Villes-Congo | 5 | « Léopoldville devient Kinshasa », … |

§10 n'avait pas de champ pour ça, et `coupe` force les retours d'un **titre**, pas
d'un corps.

> **Tranché le 11 septembre : un champ, `corps_paires`.** Deux des quatre scènes
> se convertissent désormais ; les deux autres ne sont pas des couples. Voir §7 bis.

### Un défaut de l'outil, trouvé en l'utilisant

L'essai à blanc annonçait un nombre de refus **sans leur motif** : les motifs
n'étaient collectés que sur le chemin d'écriture, donc `--essai` taisait la seule
chose qu'un essai existe pour montrer.

---

## 2. La durée vient de l'alignement

`ethni_montage.py` lit `work/aligned-words.json`, segmente la narration, et fait
durer chaque scène **le temps de ce qu'elle porte** : du début de son premier
sous-titre à la fin du dernier.

| Scène | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Durée | 6,6 | 8,0 | 4,8 | 5,8 | 7,7 | 6,8 | 4,4 | 11,4 |

Une scène qui ne reçoit aucun sous-titre prend la moyenne du deck, pas une
constante : sur un deck de phrases longues, trois secondes fixes se liraient comme
un bégaiement.

Aucun réglage nulle part. Un nombre saisi dans une config dérive de
l'enregistrement à la première phrase relue.

---

## 3. La première image — §7.a appliqué

Le premier bloc de contenu rejoint le bandeau, le rang, le crédit et le logo parmi
les permanents. **La cadence commence au deuxième.**

C'est écrit dans `GABARITS-SOCIAL.md` §9 avec son raisonnement, pour que ça ne se
rouvre pas : l'image 1 est la vignette, elle décide si quelqu'un regarde, et elle
circule dans le fil bien plus longtemps qu'elle ne dure à la lecture.

La comparaison à t = 0,2 s le montre : le montage animé n'a que « LIBREVILLE ·
Gabon », le contrôle a tout.

---

## 4. Le pivot reste éditorial — §7.d

`pivot` est obligatoire au schéma et **le moteur ne le déduit jamais**. Aucune
règle ne dit quel mot d'une phrase porte son basculement ; c'est le mot que la
scène retourne, et il se choisit dans `structure`. `null` est une réponse valide
et veut dire « aucun accent sur cette scène », pas « à décider plus tard ».

---

## 5. L'assemblage

Images clés rendues une par image à 25 im/s, puis ffmpeg depuis la séquence
numérotée, avec la narration. 1 390 images clés pour 55,5 s.

`--controle` rend la variante en mouvement réduit : mêmes durées, tous les blocs
présents dès la première image. C'est la version dont on juge une composition,
une image fixe se lisant mieux qu'un mouvement.

---

## 6. Deux défauts trouvés en regardant le montage

### Le sous-titre sortait du cadre

« de cinquante-deux personnes qu'on venait de libérer. » fait 51 signes — et
environ 1 100 px en Nunito 800 à 46 px, contre une bande de 898. La légende
débordait des deux côtés, et le compte de caractères disait qu'elle tenait.

**Un plafond en caractères n'est pas un plafond en pixels.** `envelopper` prend
maintenant la fonction qui dessinera réellement le texte, et le peintre lui passe
sa propre police.

Et quand deux lignes ne suffisent toujours pas, **c'est la graisse qui cède, pas
la copie** : la narration est approuvée et ne se raccourcit pas pour tenir dans un
cadre. Le sous-titre rétrécit jusqu'à un plancher de 30 px, sous lequel il n'est
plus lisible à bout de bras — et là il est signalé plutôt que dessiné petit, parce
que la vraie réponse est une phrase plus courte, qui est un choix éditorial.

### La porte 2 bloquait tout le deck

Les scènes migrées portent `identite: ""`. Les huit identités de Libreville ont
été écrites depuis sa planche contact, comme pour les decks carrousel, et signées.
**Les quatorze autres decks vidéo attendent les leurs** — 104 scènes.

---

## 7. Non-régression

| Suite | Résultat |
| --- | --- |
| `test_ethni_tokens.py` | 15/15 |
| `test_ethni_compose.py` | 30/30 |
| `test_ethni_cadence.py` | 10/10 |
| `test_ethni_soustitre.py` | 9/9 |
| `test_corpus_compose.py` | 8/8 |
| `test_video_corpus.py` | 6/6 |
| `test_plan_vs_peint.py` | 3/3 |
| `test_rendus_intacts.py` | 3/3 |

**Les 195 plans du carrousel sortent identiques**, et aucun ne porte de cadence
hors vidéo. Rien n'a été re-rendu : les douze montages en brouillon attendent, les
treize publiés ne le seront pas.

---

## 7 bis. `corps_paires` — les quatre scènes à liste

Tranché : **un champ, pas un réglage.** `corps_paires` porte une liste de couples
`[terme, glose]`, rendue en deux colonnes alignées — le terme en accent, la glose
en encre secondaire, une paire par ligne.

Le parallèle vertical **est** le contenu : c'est l'alignement qui fait voir que
*Mosotho* et *Basotho* sont le même mot à deux nombres. Et ce n'est pas un cas
limite — l'autonyme contre l'exonyme est le sujet de l'atlas, donc le motif
reviendra sur des dizaines de sujets.

`coupe` n'a pas bougé : c'est un réglage typographique sur un titre, et une
structure ne se déclare pas par un retour à la ligne.

**Deux à quatre paires.** Au-delà, la scène se coupe en deux : une cinquième ligne
transforme une démonstration en tableau, et un tableau ne se lit pas à la vitesse
du pouce. Deux portes le tiennent — le compte, et l'exclusion mutuelle entre
`corps` et `corps_paires`.

Les cellules sont des blocs du plan, une par terme et une par glose, donc elles
passent par les contrôles de débordement et de chevauchement sans qu'aucune
vérification particulière ait eu à être écrite. Sept tests couvrent l'axe partagé,
l'ordre des lignes, l'accent, le cadre, et ce qui suit la table.

### Ce que la re-migration donne

| Deck | Scène | Résultat |
| --- | --- | --- |
| Lesotho-Botswana | 3, 4 | **converties** — 8 scènes sur 8 |
| Sanankuya | 5 | refusée : « Traoré et Diarra » n'est pas un couple |
| Villes-Congo | 5 | refusée : « Léopoldville devient Kinshasa » n'est pas un couple |

Les deux refus restants sont éditoriaux et le message le dit : ce sont des listes
d'énoncés, pas des couples terme · glose. À écrire en deux parties, ou à sortir de
`corps_paires`.

Une scène dont la table est le seul contenu est valide : « Mosotho · une
personne » et ses trois sœurs n'ont pas besoin d'un titre au-dessus, l'alignement
porte le propos.

---

## 8. Ce qui reste

1. **Les 104 identités des quatorze autres decks vidéo.** Sans elles la porte 2
   bloque, et c'est elle qui garde le lien entre un crédit et son image.
2. **Les quatre scènes à liste** — §1. Généraliser `coupe` au corps, ou réécrire.
3. **`ethni_render.py` n'est pas supprimé.** `ethni_montage.py` le remplace pour
   le nouveau gabarit, mais l'ancien pilote encore les montages existants et
   `ethni_compose_v1.py` vit pour lui seul. À retirer quand les quatorze decks
   seront passés.
4. **L'habillage de fin.** `ethni_render.py` concatène l'outro approuvé après le
   montage ; `ethni_montage.py` ne le fait pas encore.
