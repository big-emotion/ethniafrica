<!-- Copie générée depuis l'atelier — ne pas éditer ici.
     La source fait foi ; toute correction se fait dans l'atelier, puis se
     resynchronise. Une copie éditée des deux côtés est une copie qui diverge. -->
# Gabarits sociaux EthniAfrica — spécification de reproduction

Version 1 · 2026-09-10
Cible : `ethni_carousel.py` (images) et `ethni_render.py` (vidéo).
Ce document suffit à reproduire les gabarits au pixel près sans lire le HTML.

---

## 0. Principes non négociables

1. **Une seule police d'affichage.** Anton, pour le titre *et* pour la punchline. Deux
   condensées sur une même carte est le défaut le plus visible du gabarit précédent.
2. **Le texte occupe le cadre.** Colonne de contenu centrée optiquement, pied épinglé
   en bas. Jamais de bloc flottant dans le tiers haut suivi d'un trou.
3. **Un mot d'accent par carte**, jamais deux.
4. **Le doré de texte n'est pas le doré du logo.** `#f2ba36` est une couleur de marque ;
   le texte d'affichage prend `--afh-night-ocre-soft` `#e8b96a`.
5. **Le crédit et la licence sont dans le cadre visible**, jamais sous l'interface
   de la plateforme.
6. **Aucune image agrandie plus de ×2.** Au-delà, on change de gabarit (§7).

---

## 1. Formats

| Sortie | Dimensions | k (facteur d'échelle) | Marge basse |
| --- | --- | --- | --- |
| Carrousel Instagram / Facebook | 1080 × 1350 | 1,00 | 84 px |
| LinkedIn | 1080 × 1080 | 0,86 | 72 px |
| Reel / Story / Shorts | 1080 × 1920 | 1,08 | **391 px** (91 + 300) |

Marges latérales et haute : `84 × k`. En 9:16 la marge haute reçoit +40 px.

**Zone d'interface 9:16 :** les 300 px du bas et les 180 px de droite sont recouverts
par l'interface TikTok / Reels. Rien de lisible ne descend sous **y = 1620**.

---

## 2. Couleurs — jetons de la charte, jamais de littéral

### Thème nuit (défaut)

| Rôle | Jeton | Valeur |
| --- | --- | --- |
| Fond | `--afh-night-ground` | `#120e0a` |
| Encre principale | `--afh-night-ink` | `#f1e7d8` |
| Encre secondaire (corps) | `--afh-night-ink-2` | `#c9b99f` |
| Encre tertiaire (crédits) | `--afh-night-ink-3` | `#8f7f66` |
| Accent ocre | `--afh-night-ocre-soft` | `#e8b96a` |
| Accent teal | `--afh-cat-teal` | `#33a390` |
| Accent terre | `--afh-cat-terre-ink-night` | `#cd725e` |
| Accent pervenche | `--afh-cat-perv` | `#7a8ce8` |

### Thème parchemin

| Rôle | Jeton | Valeur |
| --- | --- | --- |
| Fond | `--afh-color-bg` | `#fbf7f2` |
| Encre principale | `--afh-color-text` | `#2c2018` |
| Encres 2 et 3 | `--afh-color-text-soft` | `#746557` |
| Accents | `--afh-cat-*-ink` | ocre `#835514` · teal `#226d60` · terre `#974331` · perv `#535f9e` |

> `--afh-color-text-muted` `#9b8b7d` échoue AA en corps 19 px. Ne jamais l'utiliser
> pour un crédit.

**Mapping accent ↔ pilier :** L'atlas → ocre · Les dossiers → teal · Jouer → pervenche.
Une carte a un seul accent.

---

## 3. Typographie

Anton (affichage, social uniquement) et Nunito Sans (tout le reste).
Toutes les valeurs sont en pixels à k = 1 ; multiplier par k.

### Cinq rangs, et l'ordre ne se négocie pas

Une carte porte deux choses que le lecteur doit emporter, et trois qui ne servent qu'à
les créditer. Le rang décide de la taille, du contraste et de la place ; il ne se
déduit pas de la longueur du texte.

| Rang | Ce qui y vit | Taille | Encre |
| --- | --- | --- | --- |
| **1 · le message** | titre, chiffre, mot d'accent | 96–216 | accent |
| **2 · la preuve** | la paire de noms, la précision | 34–56 | encre 1 |
| **3 · l'explication** | le corps | 32 | encre 2 |
| **4 · le repère** | pilier, rang, appel à l'action | 22–27 | encre 1 / accent |
| **5 · l'annexe** | source, crédit, licence | 18–20 | **encre 2**, opacité .88 |

**Invariant :** le corps est au moins **1,6 fois** le crédit. Une explication plus
petite que sa mention légale inverse la hiérarchie — le lecteur lit d'abord ce qui
compte le moins. C'est un test, pas une intention.

**Le rang 5 est une annexe, pas un pied de page décoratif.** Il doit être lisible pour
qui le cherche et discret pour qui ne le cherche pas — mais **sa discrétion vient de sa
taille et de sa place, jamais d'un contraste raté.**

> **Plafond mesuré : `--afh-night-ink-3` #8f7f66 plafonne à 4,94:1 sur le fond de nuit
> #120e0a, à alpha 1,0.** C'est l'asymptote : aucun renforcement de voile ne peut
> l'amener au-dessus. Dès qu'une luminance d'image survit au voile, la ligne
> d'attribution tombe à 4,2–4,3:1 — sous le seuil, sur le seul bloc que tout
> l'appareil de portes existe pour protéger. L'annexe prend donc **l'encre 2**
> `#c9b99f` (10:1 sur le fond), à opacité 0,88–0,92 et à 18–20 px. Même famille de
> faute que `--afh-color-text-muted` en §2, sur le thème de nuit au lieu du parchemin.
> L'encre 3 reste pour ce qui n'est pas du texte : filets, filigrane, séparateurs.

| Rôle | Police | Corps | Interligne | Graisse | Casse | Couleur |
| --- | --- | --- | --- | --- | --- | --- |
| Bandeau (pilier) | Nunito | 25 | — | 700 | maj., interlettre .20em | encre 1 |
| Rang « 01/05 » | Nunito | 22 | — | 700 | interlettre .14em | accent |
| Chiffre / mot d'accent | Anton | 216 | 0,84 | — | — | accent |
| Titre de couverture | Anton | 120–126 | 0,96 | — | maj. | accent |
| Titre de série | Anton | 96–118 | 0,98 | — | maj. | accent |
| Paire — terme | Anton | 56 | 1,0 | — | — | encre 1 / accent |
| Paire — glose | Nunito | 28 | 1,35 | 400 | — | encre 2 |
| Précision (sous le chiffre) | Nunito | 36 | 1,32 | 600 | — | encre 1 |
| Punchline | Anton | 60–64 | 1,06 | — | maj. | encre 1 |
| **Corps** | Nunito | **32** | 1,55 | 400 | — | encre 2 |
| Source | Nunito | 20 | — | 700 | maj., interlettre .09em | encre 2, op. .92 |
| **Crédit** | Nunito | **18** | 1,5 | 400 | — | encre 2, op. .88 |
| Sous-titre narration | Nunito | 44–46 | 1,30 | 800 | — | encre 1 |

**Mesures maximales** (rag maîtrisé) : précision 800 px · punchline 880 px ·
corps 740 px · crédit 760 px.

**Filet séparateur** entre le bloc chiffre et la punchline : 76 × 3 px, accent,
opacité 0,55, marge verticale 48. **Il est horizontal et autonome** — jamais un filet
vertical qui longe une colonne : un filet de pleine hauteur touche le titre dès que la
colonne grandit, et il ne dit rien que la gouttière ne dise déjà.

**Interligne des titres d'affichage : 1,08 minimum.** À 0,96–0,98 les accents d'une
ligne touchent les jambages de la précédente — « Brésilien » sur « angolais ». Anton
n'a aucune réserve verticale ; c'est l'interligne qui la fournit.

**Halo sur tout texte d'affichage posé sur une image :**
`text-shadow: 0 2px 20px rgba(18,14,10,.85), 0 0 6px rgba(18,14,10,.6)`. Il ne compte
pas dans la mesure de contraste — c'est le voile qui doit atteindre le seuil — mais il
sauve le détail d'un glyphe qui tombe sur une zone claire du document.

---

## 3 bis. Le bloc de paire

Deux noms pour une même chose — l'autonyme et l'exonyme, le mot d'origine et le mot
repris — sont **le sujet de l'atlas**. Le bloc doit faire voir l'équivalence, pas
empiler deux mots.

**Une seule forme : l'horizontale.**

**Horizontale** — deux colonnes côte à côte, **chaque terme au-dessus de
sa propre glose**, la flèche `→` en accent dans la gouttière :

```
kilombo              →     Quilombolas
un campement de            au Brésil
guerre, en Angola
```

L'équivalence se lit d'un coup : deux objets de même nature, posés au même niveau.
Mesure de chaque colonne : 330 px. Dans une disposition centrée, le couple entier est
centré et chaque colonne reste alignée à gauche — c'est l'alignement interne qui fait
lire la paire, pas le centrage.

**L'horizontale coûte 170 px, la verticale 279.** Sur un aplat où rien ne peut se
comprimer, ces 109 px sont la différence entre un crédit visible et un crédit hors du
cadre. C'est la raison principale pour laquelle l'horizontale est la forme unique.

**Verticale centrée** — repli, et repli seulement, quand un terme ne tient pas dans sa
colonne. Terme et glose empilés et centrés, la flèche `↓` entre les deux groupes :

```
        kilombo
  un campement de guerre,
        en Angola
           ↓
      Quilombolas
       au Brésil
```

**La glose est centrée sous son terme, jamais étalée sur toute la largeur.** Une glose
qui occupe la mesure complète pendant que son terme fait trois centimètres donne à
l'annexe le poids du sujet.

**Dans les deux formes :**

- **La flèche est obligatoire**, en accent, Anton 50–56 — `→` à l'horizontale, `↓` à
  la verticale. Elle dit la dérivation : ce mot est devenu cet autre. Sans elle, deux
  mots posés ne sont que deux mots posés.
- **Le premier terme porte l'encre 1, le second l'accent.** Et le titre nomme les deux
  camps dans le même ordre — « un mot **angolais** devenu **brésilien** », angolais en
  encre 1, brésilien en accent. La couleur devient une clé de lecture au lieu d'une
  décoration.
- **Chaque glose appartient à son terme.** Jamais deux gloses fondues sur une ligne
  séparées d'un middot : « un campement de guerre, en Angola · au Brésil » demande au
  lecteur de redistribuer lui-même ce que la grille peut montrer.
- Deux à quatre rangs. Au-delà, la carte se coupe en deux.

---

## 4. Voiles (scrims)

Trois couches, dans cet ordre, au-dessus de l'image :

1. **Voile de bandeau, ancré sur la carte** — obligatoire, indépendant de la bande d'image.
   `top:0`, hauteur 268 px en 4:5 / 340 px en 9:16,
   `linear-gradient(180deg, rgba(18,14,10,.92) 0%, rgba(18,14,10,.78) 38%, rgba(18,14,10,.34) 74%, transparent 100%)`.
   Le bandeau **et le rang** sont du texte de corps : 4,5:1, mesuré aux deux extrémités
   du cadre. Une rampe plus douce tombe à 3,05:1 sur le rang, à droite, sur un fond pâle.
2. **Voile local de colonne** (plein cadre seulement) — un dégradé **calé sur le
   premier bloc de la colonne**, pas sur le bas de la carte et pas centré sur elle.
   Sa rampe est décrite en fractions de sa propre hauteur, et **elle atteint 0,62 à
   mi-hauteur du premier bloc** (le chiffre, ou la première ligne du titre) et 0,86
   sous sa base :

   ```
   bottom: 0; height: 58%   /* bloc court : chiffre + 3 lignes */
   linear-gradient(180deg, transparent 0%, rgba(18,14,10,.08) 26%,
     rgba(18,14,10,.30) 36%, rgba(18,14,10,.62) 44%, rgba(18,14,10,.86) 56%,
     rgba(18,14,10,.92) 74%, rgba(18,14,10,.95) 100%)
   ```

   Bloc plus haut (titre sur deux lignes + paire) : `height: 72%`, mêmes alphas aux
   fractions 18 / 26 / 33 / 44 / 70 / 100 %. **La rampe se recale sur la hauteur du
   bloc, elle ne se recopie pas d'une carte à l'autre.**

   **Deux pièges mesurés.** Un voile dont l'extrémité sombre est épinglée au bas du
   cadre met toute sa force là où ne vit que le crédit et laisse le titre dans la
   partie transparente — 1,56:1 sur un parchemin pâle. Et une rampe trop courte
   produit une ligne de coupure visible : il faut au moins 400 px entre le premier
   palier et le plafond. Un radial centré sur la carte produit en plus un halo gris
   autour du sujet. **Un voile qu'on voit comme une forme est un échec**, même si le
   contraste est atteint.

   **Les deux rampes validées** — à recaler sur la hauteur réelle du bloc, jamais à
   recopier telles quelles :

   | Premier bloc | 4:5 | 9:16 | Fractions |
   | --- | --- | --- | --- |
   | chiffre + 3 lignes | `height:58%` | `height:81%` | 26 / 36 / 44 / 56 / 74 / 100 % |
   | titre 2 lignes + paire | `height:72%` | `height:75%` | 18 / 26 / 33 / 44 / 70 / 100 % |

   Alphas, dans l'ordre des fractions : .08 · .30 · .62 · .86 · .92 · .95.

3. **Dégradé vertical**
   `linear-gradient(180deg, .90 0%, .30 10%, .06 22%, .10 40%, .82 62%, .96 78%, #120e0a 100%)`

Thème parchemin : mêmes formes, base `251,247,242`, alphas divisés par ~1,4
(radial .64 / .42 / .10 ; vertical .58 / .04 / .74 / .90). Au-delà, la photographie disparaît.

**Piège à éviter :** un voile posé `inset:0` *dans une bande d'image* calcule ses arrêts
en pourcentage de la bande, pas de la carte. Le bandeau tombe alors dans une zone déjà
dégradée. C'est pourquoi le voile de bandeau est une couche séparée.

**Halo de texte** sur le bandeau et le rang :
`text-shadow: 0 2px 16px rgba(18,14,10,.95), 0 0 5px rgba(18,14,10,.85)`
(inversé en clair sur parchemin). Le halo aide la perception mais **ne compte pas**
dans le calcul de contraste : c'est le voile qui doit atteindre 4,5:1.

---

## 5. Les trois dispositions

### A — Tiers bas ancré
*Carte de série. Image pleine, texte groupé en bas à gauche.*

- Image plein cadre, `object-fit: cover`.
- Bandeau centré, `top = 84k` (4:5) / `130` (9:16).
- Bloc bas : `left/right = 96`, `bottom = 84` (4:5) / `330` (9:16),
  colonne alignée à gauche, gouttière 30–34.
  Ordre : titre Anton 96–118 → paire ou précision → corps → source → crédit + filigrane.
- **Aucune plaque, aucune boîte.** Le texte se pose sur l'image, tenu par le voile
  local de §4 et rien d'autre. Un aplat arrondi sur une photographie déjà voilée
  assombrit deux fois et se lit comme une fenêtre collée sur l'image : la charte dit
  que les apartés sont des filets, pas des boîtes. Si le texte n'est pas lisible sans
  plaque, c'est le voile qui est mal réglé — ou l'image qui ne convient pas.
- **Le crédit est dans la même colonne flex** que le corps, gouttière 20 —
  jamais deux ancrages absolus indépendants (ils se télescopent).
- **A est la disposition par défaut**, et celle qui doit dominer une série : c'est la
  seule où l'image occupe tout le cadre. Un carrousel où l'image est réduite à une
  bande carte après carte n'est plus un carrousel d'images.

### B — Mot plein cadre
*Ouverture et bascule. Le mot frappe, la ligne explique.*

- Bande d'image en haut, **37 % de la hauteur** (502 px en 4:5, 714 px en 9:16),
  dégradé propre vers le fond dans son dernier tiers.
- Colonne centrée entre la bande et le pied : mot Anton 170–186 (`text-shadow:
  0 6px 40px rgba(18,14,10,.85)`) → précision 34–38 maj. interlettre .06em encre 2 →
  filet → corps 40–44 / 800.
- Crédit + logo épinglés en bas.

### C — Cartouche
*Chiffre, ou corps de plus de 110 signes. L'image ne porte aucun texte.*

- Bande d'image en haut : **49 % de la hauteur de la carte**, dans les deux formats.
  Aucun texte dessus hormis le bandeau. Elle descend à **42 %** quand la carte porte
  un bloc de paire, et à **30 %** quand la bande de sous-titre est active en 9:16 :
  **le texte prime sur l'image, jamais l'inverse.**

> **La bande est la seule variable d'ajustement de C.** Dans un aplat, aucun enfant ne
> peut se comprimer : tout est `flex: 0 1 auto` avec `min-height: auto`, et l'espaceur
> `flex:1` est déjà à zéro dès que le contenu remplit. Un bloc sur-souscrit ne se
> serre pas, il déborde — et ce qui tombe du cadre est le bloc de crédit, qui est en
> dernier. La hauteur de bande se calcule donc **sur la hauteur du contenu**, pas sur
> une proportion choisie à l'avance.
>
> **Test manquant le plus coûteux :** vérifier que le contenu tient entre le bas de la
> bande et le pied épinglé, pour chaque disposition × format × forme de paire. Une
> assertion sur le pied ne suffit pas : le bloc peut être correctement épinglé à 1266
> tandis que ses enfants débordent à 1436 sans que rien ne le signale.
- Aplat de fond en dessous, texte dedans : titre Anton 110–124 → précision 34–38 →
  filet supérieur 2 px `rgba(232,185,106,.35)` → corps 42–46 / 800.
- Crédit + logo épinglés en bas.
- **C absorbe la différence de hauteur entre 4:5 et 9:16** : la bande garde sa
  proportion, et tout le surplus de hauteur va à l'aplat, qui n'a aucune contrainte
  de composition. Le cadrage de l'image est identique dans les deux formats — c'est
  la carte qui s'allonge, pas la photographie qui se recompose. C'est la disposition
  la plus stable entre formats.

> **Une bande se mesure en pourcentage de la carte, jamais en pixels fixes.** Une
> hauteur fixe donnerait 42 % en 4:5 et 29 % en 9:16 : la même carte ne se
> reconnaîtrait pas d'un format à l'autre, ce qui annule la raison d'être d'un
> système unique. B tient 37 % pour le même motif.

---

## 6. Règle de choix automatique

```python
SUR_ECH_MAX = 2.0   # agrandissement maximal en plein cadre
CORPS_COURT = 90    # signes — au-delà, le mot ne porte plus seul

def choisir(carte, image):
    sur_ech = max(1080 / image.w, hauteur_cadre / image.h)

    # B : le mot porte, une ligne l'explique. Pas de paire.
    if carte.role in ("ouverture", "bascule") \
       and not carte.paires \
       and len(carte.corps or "") <= CORPS_COURT:
        return "B"

    # C : repli. L'image ne supporte pas le plein cadre,
    #     ou la colonne composée ne tient pas au-dessus du crédit.
    if sur_ech > SUR_ECH_MAX:
        return "C"
    if not colonne_A_tient(carte, image):
        return "C"

    return "A"
```

**`colonne_A_tient()` mesure, elle ne compte pas.** Elle compose la colonne A —
titre, paire, corps, source, crédit, filigrane — avec la police qui va la dessiner, et
vérifie que le tout tient entre le voile et la marge basse **et** que chaque bloc garde
son seuil de contraste. Un compte de signes est une approximation de cette mesure, et
une mauvaise : 199 signes en deux lignes courtes tiennent là où 185 signes en quatre
lignes ne tiennent pas. Même famille de faute que le plafond de sous-titre compté en
caractères au lieu d'être mesuré en pixels.


**A est le défaut, C est le repli, B est l'exception.** Un chiffre ne justifie pas C à
lui seul : un chiffre se pose très bien sur une image, et c'est même là qu'il frappe le
plus.

**B accepte une ligne d'explication, jusqu'à 90 signes.** Sans ce seuil, B n'existe
pas : toute carte d'ouverture porte un corps, donc aucune ne remplit jamais la
condition, et le plafond de deux se tient à zéro — une exception que la règle a rendue
impossible. Ce que B refuse, c'est la paire : un mot plein cadre et un tableau de deux
termes se disputent le même centre.

### Quota de disposition, à l'échelle du lot

**Un carrousel est un carrousel d'images.** La règle ci-dessus se choisit carte par
carte, mais elle se vérifie sur le lot :

| | Part des cartes |
| --- | --- |
| **A — tiers bas ancré** | **au moins 60 %**, et la majorité dans tous les cas |
| C — cartouche | au plus 30 % |
| B — mot plein cadre | au plus 2 cartes, et seulement en ouverture ou bascule |

Un lot hors quota **sort en épreuve** avec le motif, et le rapport de rendu nomme les
cartes tombées en C et pourquoi. Ce n'est jamais une faute de composition : c'est le
signe que les images du lot sont trop petites pour du plein cadre, ou que les textes
sont trop longs. Les deux se corrigent dans `structure`, pas dans le moteur.

**Le repli sur résolution est la règle la plus importante du lot.** Une image de
900 px de large en plein cadre 1080 × 1920 est agrandie ×3,6 : le document devient une
texture, et l'argument de la carte disparaît avec lui. Vérifier `naturalWidth` /
`naturalHeight` sur le fichier, jamais une dimension déclarée dans le JSON.

**Corollaire pour `structure` :** une carte destinée à A demande une image d'au moins
**2160 × 2700** (4:5) ou **2160 × 3840** (9:16). En deçà, la carte tombera en cartouche
quoi qu'en dise le `cards.json` — et le quota se dégradera à l'échelle du lot. Le choix
d'image est donc éditorial avant d'être technique.

## 7. Crédits et licences

Bloc de trois lignes, corps 18, encre 3, centré (dispositions centrées) ou aligné à
gauche (A) :

```
{description de l'œuvre} · {auteur} · {année}
{dépôt} · {licence de l'image} · {licence du carrousel ou de la vidéo}
ethniafrica.com · @ethniafrica
```

- La licence de sortie est la **licence virale la plus contraignante du lot**.
  Un lot mêlant domaine public et CC BY-SA 2.0 se diffuse en CC BY-SA 2.0 ;
  un lot mêlant 3.0 et 4.0 se diffuse en 4.0.
- **Aucune note interne sur l'image finie.** « licence à nommer », « série à confirmer »,
  « crédit à compléter » sont des messages à l'opérateur : ils bloquent la publication,
  ils ne s'impriment pas. Si la licence n'est pas connue, la carte ne sort pas.
- En 9:16 le bloc est au-dessus de y = 1620, sinon l'obligation d'attribution
  est masquée par l'interface.

---

## 7 bis. Le filigrane

**C'est un filigrane, pas une signature.** Il sert à reconnaître la marque quand la
carte circule hors contexte, et à rien d'autre. Il n'a aucun rôle de composition.

| | |
| --- | --- |
| Hauteur | **30 px** à k = 1 (la moitié de l'ancienne) |
| Couleur | **monochrome**, encre 3 — jamais le lockup en couleurs |
| Opacité | 0,55 |
| Place | **sous** le bloc de crédit, **toujours centré sur la largeur du bloc**, gouttière 16 |

**Il n'est jamais à côté du crédit.** Un lockup posé en regard force le crédit à se
serrer sur la moitié gauche du cadre, et la marque — rang 5 — se retrouve au rang 1
par la seule taille. Sous le crédit, le bloc d'annexe retrouve toute la largeur, se
recentre, et le filigrane ferme la carte au lieu de la disputer.

Le lockup en couleurs de marque est réservé à la bannière de chaîne et aux outros
vidéo, là où la marque **est** le sujet.

---

## 8. Repères d'interface

- **Indication de défilement**, couverture de carrousel uniquement : libellé
  « Fais défiler » (26 / 800 / maj. / interlettre .12em, accent) suivi de trois
  chevrons `›` Anton 40 px, opacités 0,35 / 0,65 / 1. Le dégradé donne le sens
  sans animation, donc il survit à l'export image.
- **Appel à l'action**, dernière carte uniquement : pastille cerclée, bordure 2 px
  accent, rayon 999, padding 20/38, texte 27 / 800 / maj.
- Les deux repères sont volontairement distincts : l'un dit *continue*, l'autre *sors*.
- **Rang** `01/05` en haut à droite, accent.

---

## 9. Sous-titres vidéo

- Deux lignes maximum, **coupées sur les groupes de souffle**, jamais tous les N mots.
  « Onze villes du Congo / portaient le nom d'un Belge » — pas « Congo portaient le ».
- Nunito Sans 800, corps 44–46, encre 1, **sur plaque opaque** —
  pas de contour noir sur une police d'affichage.
- Bande réservée entre la colonne de contenu et le pied. Le pied remonte d'autant.
- Le mot pivot de la phrase peut passer en accent dans la plaque : un seul par carte.

---

## 10. Schéma `cards.json` attendu

```json
{
  "campagne": "mercator-taille",
  "pilier": "La carte cachée",
  "accent": "ocre",
  "fond": "nuit",
  "licence_sortie": "CC BY-SA 2.0",
  "cartes": [
    {
      "rang": 1,
      "role": "ouverture",
      "titre": "L'Afrique n'a pas sa vraie taille",
      "chiffre": false,
      "precision": "sur la carte de ta salle de classe",
      "punchline": "Trois chiffres, et une carte qui te trompe sans mentir",
      "corps": "",
      "source": "",
      "image": {
        "fichier": "01-couverture-carte-murale-bacon-recadree.jpg",
        "w": 3200, "h": 4000,
        "cadrage": "50% 40%",
        "identite": "une carte murale du monde en projection de Mercator, édition scolaire britannique",
        "credit": "G. W. Bacon, Londres, v. 1906",
        "depot": "Bibliothèque nationale du pays de Galles",
        "licence": "domaine public"
      },
      "paires": null,
      "titre_camps": null,
      "coupe": null,
      "disposition": "auto"
    }
  ]
}
```

`disposition` accepte `auto`, `A`, `B`, `C`. `auto` applique §6.

`image.identite` **décrit ce que l'image montre**, en une phrase, sans nommer son
auteur ni sa licence. C'est ce que la porte 2 compare au crédit : sans lui, la porte
la plus utile du lot s'abstient. Champ obligatoire pour tout nouveau sujet.

`paires` porte le bloc de §3 bis : une liste de couples `{terme, glose}`, deux à quatre.
`null` quand la carte n'en a pas. **Le champ `accent` d'un terme n'existe pas** : la
couleur est positionnelle — premier terme en encre 1, second en accent. Une carte ne
porte jamais `corps` et `paires` à la fois.

`titre_camps` nomme les deux camps du titre pour les colorer comme la paire —
`{"un": "angolais", "deux": "brésilien"}`. Les mots ne se déduisent pas du titre : ils
sont écrits dans `structure`. **Champ facultatif, jamais bloquant** : sans lui le titre
reste en encre 1, ce qui est correct, seulement moins parlant. Il se remplit deck par
deck au moment de rendre, comme `image.identite`.

`coupe` force les retours à la ligne d'un titre. `null` laisse le moteur couper sur la
mesure. Ne l'employer que là où la coupe **porte du sens** — une énumération dont les
groupes ne doivent pas se mélanger. Une coupe posée pour l'esthétique se périme au
premier changement de format.

---

## 11. Liste de contrôle avant rendu

- [ ] Une seule police d'affichage sur la carte.
- [ ] Un seul élément en accent.
- [ ] **Le corps est au moins 1,6 fois le crédit.**
- [ ] **Le filigrane est monochrome, à 30 px, sous le crédit — pas à côté.**
- [ ] **Aucune plaque ni boîte sur une image** : le voile tient le texte, ou l'image
      ne convient pas.
- [ ] **Aucun voile visible comme une forme** — halo, disque, tache.
- [ ] **Le voile atteint 0,62 à mi-hauteur du premier bloc**, pas au bas du cadre,
      et sa rampe s'étale sur au moins 400 px.
- [ ] **Aucun filet vertical de pleine hauteur** le long d'une colonne.
- [ ] **Une paire porte son `→` et une glose par terme.**
- [ ] **Au moins 60 % des cartes du lot en A**, au plus 30 % en C, au plus 2 en B.
- [ ] **Le choix de A repose sur une colonne mesurée**, pas sur un compte de signes.
- [ ] **Le contenu tient entre le bas de la bande et le pied** — mesuré sur les
      enfants, pas sur le bloc (§5C).
- [ ] Le contenu occupe le cadre ; le pied est épinglé.
- [ ] Aucune image agrandie plus de ×2 ; sinon repli sur C.
- [ ] Contraste ≥ 4,5:1 mesuré **sur les pixels réels** sous le voile, pas estimé —
      **y compris sur la ligne de crédit**, qui est celle qui passe le moins.
- [ ] **L'annexe est en encre 2, pas en encre 3** (plafond 4,94:1, voir §3).
- [ ] En 9:16, rien de lisible sous y = 1620.
- [ ] La licence de sortie est celle du lot, calculée et non recopiée.
- [ ] Aucune note interne visible sur l'image.
- [ ] Le crédit nomme le document réellement affiché.
