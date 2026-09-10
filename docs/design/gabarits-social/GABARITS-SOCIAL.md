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

| Rôle | Police | Corps | Interligne | Graisse | Casse | Couleur |
| --- | --- | --- | --- | --- | --- | --- |
| Bandeau (pilier) | Nunito | 25 | — | 700 | maj., interlettre .20em | encre 1 |
| Rang « 01/05 » | Nunito | 22 | — | 700 | interlettre .14em | accent |
| Chiffre / mot d'accent | Anton | 216 | 0,84 | — | — | accent |
| Titre de couverture | Anton | 120–126 | 0,96 | — | maj. | accent |
| Précision (sous le chiffre) | Nunito | 36 | 1,32 | 600 | — | encre 1 |
| Punchline | Anton | 60–64 | 1,06 | — | maj. | encre 1 |
| Corps | Nunito | 30 | 1,55 | 400 | — | encre 2 |
| Source | Nunito | 20 | — | 700 | maj., interlettre .09em | encre 3 |
| Crédit | Nunito | 19 | 1,55 | 400 | — | encre 3 |
| Sous-titre narration | Nunito | 44–46 | 1,30 | 800 | — | encre 1 |

**Mesures maximales** (rag maîtrisé) : précision 800 px · punchline 880 px ·
corps 740 px · crédit 820 px.

**Filet séparateur** entre le bloc chiffre et la punchline : 76 × 3 px, accent,
opacité 0,55, marge verticale 48.

---

## 4. Voiles (scrims)

Trois couches, dans cet ordre, au-dessus de l'image :

1. **Voile de bandeau, ancré sur la carte** — obligatoire, indépendant de la bande d'image.
   `top:0`, hauteur 250 px en 4:5 / 320 px en 9:16,
   `linear-gradient(180deg, rgba(18,14,10,.80) 0%, rgba(18,14,10,.58) 40%, rgba(18,14,10,.18) 78%, transparent 100%)`
2. **Radial de lisibilité** (plein cadre seulement)
   `radial-gradient(120% 62% at 50% 44%, rgba(18,14,10,.86) 0%, rgba(18,14,10,.62) 46%, rgba(18,14,10,.18) 100%)`
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
  Ordre : titre Anton 112–118 → précision 38–40 → plaque de narration → crédit + logo.
- Plaque de narration : fond `rgba(18,14,10,.80)`, rayon 16, filet gauche 6 px accent,
  padding 26/32, corps 44–46 / 800.
- **Le crédit est dans la même colonne flex** que la plaque, gouttière 20 —
  jamais deux ancrages absolus indépendants (ils se télescopent).

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
  Aucun texte dessus hormis le bandeau. Quand la bande de sous-titre est active en
  9:16, elle descend à **30 %** — le texte prime sur l'image, jamais l'inverse.
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
CORPS_LONG   = 110   # signes
SUR_ECH_MAX  = 2.0   # facteur d'agrandissement maximal en plein cadre

def choisir(carte, image):
    sur_ech = max(1080 / image.w, hauteur_cadre / image.h)

    if carte.role in ("ouverture", "bascule"):
        return "B"
    if carte.chiffre:
        return "C"
    if len(carte.corps) > CORPS_LONG:
        return "C"

    # carte de série → A, sauf si l'image ne supporte pas le plein cadre
    if sur_ech > SUR_ECH_MAX:
        return "C"        # repli : la bande respecte la résolution native
    return "A"
```

**Le repli sur résolution est la règle la plus importante du lot.** Une image de
900 px de large en plein cadre 1080 × 1920 est agrandie ×3,6 : le document devient
une texture, et l'argument de la carte disparaît avec lui. Vérifier
`naturalWidth/naturalHeight`, jamais le nom de fichier.

Hauteurs de bande à viser pour rester sous ×1,3 :
`hauteur_bande ≈ image.h × 1.2` — soit ≈ 660 px pour un asset de 550 px de haut.

---

## 7. Crédits et licences

Bloc de trois lignes, corps 19, encre 3, centré (dispositions centrées) ou aligné à
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

`coupe` force les retours à la ligne d'un titre. `null` laisse le moteur couper sur la
mesure. Ne l'employer que là où la coupe **porte du sens** — une énumération dont les
groupes ne doivent pas se mélanger. Une coupe posée pour l'esthétique se périme au
premier changement de format.

---

## 11. Liste de contrôle avant rendu

- [ ] Une seule police d'affichage sur la carte.
- [ ] Un seul élément en accent.
- [ ] Le contenu occupe le cadre ; le pied est épinglé.
- [ ] Aucune image agrandie plus de ×2 ; sinon repli sur C.
- [ ] Contraste ≥ 4,5:1 mesuré **sur les pixels réels** sous le voile, pas estimé.
- [ ] En 9:16, rien de lisible sous y = 1620.
- [ ] La licence de sortie est celle du lot, calculée et non recopiée.
- [ ] Aucune note interne visible sur l'image.
- [ ] Le crédit nomme le document réellement affiché.
