# Moteur de composition A/B/C — 10 septembre 2026

Lève le point (a) de `_reset-2026-09-10.md` : `produire` rendait l'ancien gabarit.

Les six écarts structurels sont résorbés. Les dix decks du corpus se rendent aux
trois formats sous `GABARITS-SOCIAL.md`, et neuf franchissent les quatre portes.

---

## 1. Ce qui est implémenté

| Module | Rôle |
| --- | --- |
| `tools/migrate-cards/migrate-cards.mjs` | convertit un `cards.json` vers §10, idempotent |
| `tools/migrate-cards/image-size.mjs` | lit les dimensions réelles dans l'en-tête du fichier |
| `Harness/ethni_compose.py` | le moteur : `plan()`, `composer()`, `portes()`, `rendre()` |
| `Harness/ethni_carrousel2.py` | rend un deck aux trois formats et écrit le rapport |
| `Harness/ethni_compose_v1.py` | l'ancien compositeur, conservé pour la vidéo |

### Les six écarts

| | Avant | Maintenant |
| --- | --- | --- |
| Rôles | `couverture` · `entree` · `cloture` | `ouverture` · `serie` · `bascule` |
| Composition | une par rôle | trois dispositions, §6 choisit |
| Schéma | `campaign`, `cards[]`, `rank`, `asset` | §10, 65 cartes converties |
| LinkedIn | 1200 × 1200 | **1080 × 1080** |
| Corps | TikTok Sans Bold | **Nunito Sans**, lu du jeton |
| Repli sur résolution | absent | §6, mesuré sur le fichier décodé |

### `plan()` et `composer()`, séparés

`plan()` rend la géométrie sans rien dessiner. Tout ce qui mérite une assertion —
rien ne déborde, aucun bloc n'en chevauche un autre, le pied dégage la ligne
d'interface — est une propriété du plan, et un test qui lit le plan échoue avec un
nom de bloc plutôt qu'avec une différence de pixels.

### Ce que le moteur ne décide pas

Il **applique** `choisir()`. Une carte qui nomme sa disposition l'obtient, même
contre la règle, et l'écart est consigné dans `plan.ecart_regle` puis imprimé dans
le rapport de rendu. Un moteur qui passe outre l'auteur est un moteur contre lequel
l'auteur travaille.

### Le rapport de rendu

Un `RENDU.md` par lot : disposition retenue par carte **et pourquoi**, facteur
d'agrandissement de chaque image, portes franchies ou non, licence de sortie
calculée. Le « pourquoi » permet de contester une disposition sans lire le code.

---

## 2. Ce que la vérification a trouvé

Cinq défauts, dont trois n'étaient visibles que sur une épreuve regardée.

### a. Le chiffre perdu à la migration — corrigé

Dans l'ancien schéma, `chiffre` portait **le nombre lui-même** (`"30,38"`,
`"× 10,5"`, `"164"`, `"1 groupe"`) et `legende` la ligne au-dessous. Lu comme un
booléen, il devenait `true` et le nombre disparaissait.

Quatre cartes ont perdu leur figure. Le défaut n'a été vu que parce qu'une épreuve
affichait « MILLIONS DE KILOMÈTRES CARRÉS » avec rien devant. Les quatre sont
restaurées depuis la sauvegarde, et `test_corpus_compose.py` épingle le cas.

### b. Le titre de couverture pris pour la question — corrigé

Une chaîne de `??` choisissait `question` avant `nom` sur les couvertures, mettant
l'accroche là où les noms devaient être. Le mapping est maintenant écrit **par cas**
plutôt que chaîné.

### c. Le radial de lisibilité manquant — corrigé

§4 prévoit trois couches ; la deuxième, le radial plein cadre, n'était pas
dessinée. En disposition A, sur un document pâle, le titre mesurait **2,44:1**. Le
test de contraste l'a trouvé avant qu'une carte ne sorte.

### d. Le contraste mesuré sur ses propres glyphes — corrigé

La mesure lisait la carte finie, donc les traits du titre comptaient dans leur
propre fond : un grand Anton remplit la plus grande partie de sa boîte et la mesure
dérivait vers 1:1. §11 dit « sous le voile » : `fond_compose()` rend tout sauf le
texte, et c'est ce fond qui est mesuré.

### e. La colonne de B empilée par le haut — corrigé

§5B demande une colonne **centrée entre la bande et le pied**. Empilée par le haut,
elle laissait exactement le trou que §0.2 nomme comme le défaut le plus visible du
gabarit précédent.

---

## 3. Le contraste, mesuré

Sur les **dix documents les plus clairs du corpus**, de 227 à 168 sur 255 — pas les
plus flatteurs. Trois dispositions × trois formats × chaque bloc de texte.

Seuils : 4,5:1, et 3:1 pour les tailles d'affichage. Le halo ne compte pas.

**Tous passent.** §4 dit que c'est le voile qui doit atteindre le seuil, donc le
moteur **renforce le voile sous la colonne jusqu'à ce que la mesure le confirme**,
par pas de 8 %, plafonné à 72 %. Au-delà la photographie disparaît, et une carte
dont on ne peut plus lire le document n'est pas une carte réparée : un bloc encore
court au plafond reste court et le rapport le nomme. Aucun ne l'est aujourd'hui.

---

## 4. Les quatre portes

Un verdict, en langue d'opérateur. Une porte qui dit quoi faire est une porte que
quelqu'un peut lever.

| Porte | Mécanisme |
| --- | --- |
| 1 · licences nommées, licence de sortie calculée | `licence_sortie()` — la plus virale du lot |
| 2 · le crédit nomme le document affiché | compare l'identité créditée à l'asset composé |
| 3 · aucune note interne imprimée | `note_interne()` sur les cinq champs publiés |
| 4 · aucune image agrandie au-delà de ×2 | §6, ou un repli l'a évité |

**La porte 2 s'abstient plutôt que de supposer.** Elle ne compare que si le champ
`image.identite` décrit l'asset. Sans lui, elle ne passe pas la carte : elle ne se
prononce pas, et le rapport le dit. C'est le défaut qui survit le plus facilement à
une relecture humaine — le crédit est juste, l'image a changé — et une porte qui
prétend l'avoir vérifié sans le pouvoir est pire que pas de porte.

> **Dépassé le 11 septembre.** Les 65 identités sont écrites et la porte 2 est
> vivante — mais pas sous cette forme : la comparaison lexicale refusait vingt
> cartes correctes sur soixante-cinq. Voir § 7.3.

---

## 5. Résultat sur le corpus

Dix decks, 65 cartes, 195 plans calculés.

| Deck | Verdict | Portes non franchies |
| --- | --- | --- |
| Carrousel-Mercator | **épreuve** | licence de la carte 2 non nommée |
| Familles-Bantu | bon à publier | — |
| Noms-alliances | bon à publier | — |
| Noms-metiers | bon à publier | — |
| Pays-Benin | bon à publier | — |
| Peuples-commerce | bon à publier | — |
| Peuples-diaspora | bon à publier | — |
| Peuples-exonymes | bon à publier | — |
| Peuples-Peul | bon à publier | — |
| Villes-Serie | bon à publier | — |

Le moteur a retrouvé le blocage Mercator **seul**, sans qu'on le lui dise, et l'a
formulé comme une action : « ouvre la page du dépôt, lis la mention, et reporte-la,
ou change d'image ».

Aucune faute de composition : aucun texte ne déborde, ne chevauche, ni ne descend
sous la ligne d'interface en 9:16, sur les 195 plans.

### Rien n'avait été re-rendu au 10 septembre

Conformément à la décision (b) d'alors. La passe de vérification avait écrit 189
fichiers dans les `images/` des dix sujets ; ils ont été **retirés un dossier à la
fois** et déposés dans `_verification-moteur-2026-09-10/`, avec les 41 épreuves.

> **Dépassé le 11 septembre.** Le moteur validé, l'opérateur a demandé le rendu :
> 180 images au nouveau gabarit, neuf sujets en 🟢. Voir § 7.5.

Pour que cela ne se reproduise pas, le moteur **refuse d'écrire dans un `images/`
qui porte déjà des rendus** et bascule le lot en épreuve, sauf `--remplacer`. Deux
jeux de rendus côte à côte sont indiscernables dans un sélecteur de fichiers.

---

## 6. Cartes sorties en `_a-trier/`

**Aucune.** Les 65 cartes se convertissent. Deux relectures sont demandées :

**Trois retours à la ligne posés à la main.** Ils étaient alors recalculés par le
moteur sur la mesure de §3 ; depuis le 11 septembre le champ `coupe` les conserve,
parce que dans les trois cas la coupe porte du sens. Voir § 7.4.

| Deck | Titre |
| --- | --- |
| Noms-metiers | Kouyaté, Camara, / Diabaté |
| Peuples-commerce | Dioula, Teke / Manianga / Kavango |
| Peuples-exonymes | Hottentot, Habé, / Kirdi, Pahouin |

**L'heuristique du chiffre** ne marque plus rien à tort. Un premier jet acceptait
toute année nue et classait « Depuis 2010, ils écrivent leur nom eux-mêmes » comme
carte à chiffre. Elle exige maintenant un nombre en tête ou lié à une unité.

---

## 7. Suite du 11 septembre — les cinq arbitrages appliqués

> La spécification a été mise à jour par l'opérateur le 10 au soir. Les écarts
> résiduels de la version précédente de ce rapport sont traités ici ; ce qui reste
> ouvert est en §9.

### 1 · §5C tranché : une seule proportion, 49 % partout

La contradiction n'était pas entre la prose et les nombres — **42/49 était faux
aussi**. Une bande en pixels fixes donnerait 42 % en 4:5 et 29 % en 9:16 : la même
carte ne se reconnaîtrait plus d'un format à l'autre, ce qui annule la raison
d'être d'un système unique. B tient 37 % pour le même motif.

La bande de C tient **49 % dans les trois formats**, et descend à **30 % quand la
bande de sous-titre est active en 9:16** — le texte prime sur l'image. Trois tests
le tiennent, dont un qui vérifie qu'**aucune bande n'est une hauteur en pixels**.

### 2 · `image.identite` : les 65 lignes sont écrites

Une phrase par image, **écrite en regardant l'image** sur une planche-contact par
deck, jamais dérivée du crédit. Dériver aurait rendu la porte 2 tautologique :
elle aurait comparé une chaîne à sa propre copie et serait passée partout, y
compris sur la carte dont le crédit est juste et l'image a changé.

Le champ est **obligatoire au schéma** ; `structure` le produit pour tout nouveau
sujet.

### 3 · La porte 2 a dû être reconçue

Première version : comparer les mots du crédit et de l'identité. **Elle a refusé
20 cartes sur 65, et avait tort sur les vingt.** Un crédit est une légende — nom
propre, lieu, date — et une identité est une description visuelle. « Garifuna
Settlement Day » et « une procession de rue en tenues jaunes » sont le même
document et ne partagent aucun mot. Une porte qui se trompe vingt fois sur
soixante-cinq est une porte qu'on débranche.

Elle se dédouble donc :

- **elle bloque** sur une carte où personne n'a consigné avoir comparé le crédit à
  l'image — un fait qu'un programme peut établir, et c'est ce que « se vérifie,
  elle ne se suppose pas » demande réellement : non qu'une machine comprenne la
  photographie, mais qu'une personne ait regardé et laissé une trace
  (`image.verifie_le`) ;
- **elle remarque**, sans bloquer, quand les deux descriptions ne partagent aucun
  vocabulaire. C'est là qu'un asset échangé se verrait, et ça coûte un second
  regard plutôt qu'un refus. 18 remarques sur les dix decks.

Ce que la porte ne peut pas faire est écrit dans son code : elle n'attrape pas un
échange entre deux documents décrits avec les mêmes mots.

### 4 · Le champ `coupe`

Ajouté au schéma, `null` sur 62 cartes. Les trois énumérations gardent la coupe
posée à la main — « Kouyaté, Camara, / Diabaté » — parce qu'elle porte du sens :
elle empêche les groupes de se mélanger. Le moteur l'honore sans la croire : une
ligne plus large que la colonne est réduite, sinon elle sortirait du cadre en
silence.

### 5 · Les neuf decks sont rendus et passés en 🟢

Dans l'ordre prescrit : §5C, puis les identités, puis le rendu avec
`--remplacer`. **180 images** au nouveau gabarit. Mercator reste en 🟡 : la
licence de sa carte 2 n'est toujours pas nommée, et le moteur le redit seul.

| | Avant | Après |
| --- | --- | --- |
| 🟢 Validé, en attente | 0 | **9** |
| 🟡 En traitement | 29 | 29 |
| ⚪️ Brouillon | 23 | 14 |
| ✅ Publié | 8 | 8 |

### Deux défauts trouvés en regardant les rendus

**`--remplacer` ne remplaçait pas.** Il levait le garde-fou et écrivait à côté :
chaque dossier s'est retrouvé avec deux générations de rendus, exactement le
danger que le garde-fou existe pour empêcher. Les anciens sont maintenant
déplacés dans `_rendus-remplaces/` — déplacés, pas supprimés, l'atelier n'ayant
pas de contrôle de version.

**La licence s'imprimait deux fois.** « CC BY-SA 4.0 · CC BY-SA 4.0 » quand le lot
hérite de la licence de l'image. Dédupliqué.

---

## 7. Écarts résiduels avec la spécification

### a. La porte 2 n'a rien à comparer

`image.identite` n'existe sur aucune carte. Il faut une phrase par image décrivant
ce qu'elle montre — c'est un travail éditorial de 65 lignes, pas une inférence. Sans
lui, la porte la plus utile du lot est inerte.

### b. §5C se contredit sur la bande

La spec donne 42 % en 4:5 et 49 % en reel, **et** écrit « l'image ne bouge pas, seul
l'aplat grandit ». Les deux ne peuvent pas être vrais : 42 % de 1350 font 567 px,
49 % de 1920 en font 941. Les nombres sont normatifs, donc ce sont eux qui sont
implémentés, et la prose est traitée comme la raison d'être de C. **À trancher :**
soit la bande de C devient une hauteur en pixels fixe, soit la phrase est réécrite.

### c. La vidéo rend encore l'ancien gabarit

`ethni_render.py` passe par `ethni_compose_v1.py`. §9 (sous-titres) et le
séquencement vidéo ne sont pas portés. Le moteur porte déjà la bande de sous-titre
dans son plan et le pied la respecte, mais rien ne la remplit. **C'est le prochain
chantier**, et il est plus gros que celui-ci.

### d. La plaque de narration n'est pas composée

§5A décrit une plaque à filet gauche pour le texte de narration. La migration
conserve le champ `plaque` des 41 cartes qui en portent une, mais le moteur ne la
dessine pas encore : elle appartient à la même passe que la vidéo.

### e. Le repère de défilement et l'appel à l'action

§8 décrit « Fais défiler » avec ses trois chevrons sur la couverture, et la
pastille cerclée sur la dernière carte. Ni l'un ni l'autre n'est dessiné.

### f. Le thème parchemin n'est pas éprouvé

Le moteur le résout — jetons, encres, alphas divisés par 1,4 — mais les dix decks
sont tous en `fond: "nuit"`. Aucune carte parchemin n'a été rendue ni mesurée.

---

## 8. Ce qui reste à décider

1. **Écrire les 65 `image.identite`**, sans quoi la porte 2 ne garde rien.
2. **Trancher §5C** : bande en pixels fixes, ou prose réécrite.
3. **Les trois retours à la ligne** de la section 6 : accepter la coupe du moteur,
   ou réécrire les titres.
4. **Re-rendre les lots** : neuf decks franchissent les quatre portes et
   passeraient en 🟢. Ils attendent ton accord, et
   `_verification-moteur-2026-09-10/` montre à quoi ils ressemblent.
5. **Le chantier vidéo** : §9, la plaque, et le portage de `ethni_render.py`.

---

## 9. Vérification

| Suite | Résultat |
| --- | --- |
| `test_ethni_tokens.py` | 15/15 |
| `test_ethni_compose.py` | 18/18 |
| `test_corpus_compose.py` | 8/8 sur 195 plans réels |
| `tools/migrate-cards` (`node --test`) | 3/3 |
| `tools/etat-pipeline` (`node --test`) | 9/9 |

L'état du pipeline est inchangé : 🟢 0 · 🟡 29 · ⚪️ 23 · ✅ 8.
