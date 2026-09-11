# §9 bis — la vidéo cesse d'être un carrousel qui bouge

Le gabarit vidéo est porté : une seule disposition, quatre emplacements fixes, deux
voiles, et une table d'alpha réindexée sur la luminance du texte. Dix-huit tests le
tiennent, et le gabarit carrousel n'a pas bougé d'une ligne.

---

## 1. La table d'alpha — la correction qui compte

Elle était indexée sur **la taille** du texte. C'est ce qui a produit trois fois le
même défaut : un chiffre doré de 150 px à 2,15:1 là où le même chiffre en encre 1
tenait 5,8:1 **au même alpha**.

La taille n'y est pour rien. Le doré est une couleur de *fill* dans la charte, pas
une couleur de texte sur photographie :

| Encre | Luminance | Seuil | Alpha |
| --- | --- | --- | --- |
| Affichage encre 1 `#f1e7d8` | 0,818 | 3:1 | **0,80** |
| Affichage accent `#e8b96a` | **0,527** | 3:1 | **0,84** |

La table se **lit dans §4**, elle ne se recalcule pas : c'est une mesure, et un
second modèle de la même chose est une seconde chose qui dérive. Ce qui change,
c'est la clé — `alpha_min(encre, seuil)` prend la ligne dont la luminance est la
plus proche.

**Corollaire, et il est appliqué :** sous 0,84 le doré ne survit pas, donc
`encre_affichage()` renvoie l'encre 1. En vidéo le voile plafonne à 0,72 sous le
titre, **donc tout l'affichage est en encre 1, chiffre inclus.** L'accent se
réfugie dans la plaque de narration et sur le lien de clôture, où le fond est
opaque. On n'épaissit pas un voile pour garder un doré : on déplace le doré.

---

## 2. Ce que la vidéo retire

| | Carrousel | Vidéo |
| --- | --- | --- |
| Dispositions | A · B · C | **A seule** |
| Rang `03/08` | chaque carte | **aucun** |
| Nom de série | chaque carte | ouverture et clôture |
| Alignement | gauche ou centré | **ferré à gauche** |
| Crédit | dans la colonne | épinglé à `bottom: 44` |
| Défilement | oui | aucun |

Ni cartouche ni mot plein cadre : une bande d'image avec un aplat dessous fait une
séparation franche qui, en mouvement, se lit comme une coupure de montage.

**Écrit à côté du plan carrousel, pas dedans.** Les dix decks image sont validés ;
une branche qui traverse leur chemin de code est une branche qui peut les déplacer.

---

## 3. Les quatre emplacements, et le contrôle qui les tient

| Emplacement | Ordonnée | Contenu |
| --- | --- | --- |
| Nom de série | `top: 131` | ouverture et clôture |
| Titre | `top: 1050`, h **220**, ancré en bas | titre Anton 76 px |
| Narration | `top: 1300`, h **190** | **réservé même vide** |
| Crédit + filigrane | `bottom: 44` | 17 px, une ou deux lignes, filigrane 0,72 |

Le test : **deux images clés du même plan, l'une avec sous-titre et l'autre sans,
et chaque bloc partagé a la même boîte.** C'est la règle la plus importante du
gabarit — un titre qui descend quand le sous-titre s'efface se lit comme un défaut
de rendu.

### Le dépassement sort par le haut

Le plancher de l'emplacement ne bouge jamais ; ce qu'un bloc trop long fait, c'est
pousser son propre sommet dehors, vers le haut, là où le voile est encore en rampe.
Et il le **consigne** : `p.fautes` porte le dépassement, donc une édition de copie
est attrapée à la mesure et non à l'écran.

> Il a servi tout de suite. §9 bis budgète la clôture à « titre 80 px sur trois
> lignes (259 px) + datation deux lignes (96 px) = 375 px » dans 380 — et mon titre
> sortait à 274 px, soit 384 au total. La faute a nommé les 4 px. L'interligne
> d'affichage était à 1,14 quand l'arithmétique de §9 bis n'est juste qu'à **1,08**,
> qui est aussi le plancher que §3 donne. À 1,08 : 259 et 96, au pixel.

---

## 4. Deux voiles, et le contrôle qui remplace la monotonie

| Voile | Étendue | Alphas |
| --- | --- | --- |
| Plaque | 0 → 340 | 0,95 → 0,93 sur 52 %, puis 0 |
| Voile bas | 840 → 1920 | 0 → 0,72 (1050) → 0,82 (1198) → 0,88 (1450) → 0,93 |

Le profil n'est **pas** monotone, et c'est licite : aucun texte ne vit dans
l'intervalle, où la bande claire est l'image, qui est le sujet. Le contrôle de §11
reste au carrousel ; en vidéo le contrôle est **qu'aucun bloc de texte ne tombe
entre les deux voiles**, et il tourne sur les huit scènes.

Mesuré sur une image clé : plus grand saut dans la plaque **13,6 niveaux**, et
c'est le libellé lui-même. Les transitions sont des dégradés, pas des coupures.

Le plateau de la plaque couvre le libellé à `y = 131` — un test le vérifie, parce
que l'ordre des couches ne règle que la couche : si le plateau s'arrête au-dessus
du libellé, c'est le fond sous lui qui manque de voile, et aucun z-index n'y change
rien.

---

## 5. La clôture, et une lecture que le rendu a corrigée

§9 bis donne quatre éléments dans l'ordre : renversement, datation, vision, lien.
J'ai d'abord lu quatre blocs et posé la vision dans l'emplacement bas.

**Rendu, la plaque de narration se pose dessus.** Sur une clôture la narration
tourne encore, et l'emplacement bas fait 270 px et non 190 précisément **parce
qu'il porte la plaque et la pastille** — ce que §9 bis dit en toutes lettres.

Donc : le renversement et sa datation partagent l'emplacement de titre (375/380,
au budget), la plaque porte la vision parlée, et le lien est la pastille sous elle.
**Jamais un lien seul** : ce qui se tient au-dessus, c'est la voix.

> **Le compte ne vient pas de la spec.** §9 bis écrit « 804 peuples » ; le corpus
> porte **776 fiches peuple**, comptées sur disque. Un chiffre dans une vidéo
> publiée est une affirmation que l'atlas doit tenir, donc c'est le compte mesuré
> qui part. La ligne de §9 bis reste à corriger.

> **La vision n'est pas dans la narration de Libreville.** Elle finit sur « Ceux
> des lieux arrivent bientôt. ». La clôture montre donc le lien sous une légende
> qui n'est pas la vision. C'est un manque du script, pas de la composition.

---

## 6. Non-régression

| Suite | Résultat |
| --- | --- |
| `test_gabarit_video.py` | **18/18** |
| `test_ethni_compose.py` | 56/56 |
| `test_ethni_tokens.py` | 16/16 |
| `test_video_corpus.py` | 6/6 |
| `test_corpus_compose.py` | 9/9 |
| `test_plan_vs_peint.py` | 3/3 |
| `test_ethni_cadence.py` | 10/10 |
| `test_ethni_soustitre.py` | 9/9 |
| `test_rendus_intacts.py` | 3/3 |

Le carrousel est intact : 56/56 et 9/9 sur le corpus, sans une ligne changée dans
son chemin.

---

## 7. Ce qui reste

1. **Les animations.** Le mock ne fixe que les positions. Entrée du titre, entrée
   du sous-titre, transitions entre séquences — §9 et `BRIEF-VIDEO.md` portent la
   cadence. C'est le chantier suivant, et il n'est pas commencé.
2. **Les 104 identités** des quatorze autres decks vidéo : seule Libreville peut
   être rendue.
3. **« 804 peuples »** dans §9 bis, contre 776 mesurés.
4. **La ligne de vision** absente de la narration de Libreville.
5. **`ethni_render.py`** vit encore pour l'ancien gabarit.
