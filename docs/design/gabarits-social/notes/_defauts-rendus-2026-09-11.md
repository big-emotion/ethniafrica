# Six défauts de rendu, et une perte de fichiers — 11 septembre 2026

Relevés par l'opérateur sur deux cartes ouvertes. Aucun n'était visible dans une
table de chiffres ; tous l'étaient sur une image.

---

## 0. Mercator avait perdu ses quinze rendus

`images/` était vide et `_rendus-remplaces/` contenait la génération d'origine.
Le lot était parti en `_epreuves/` sur la porte 1 : **l'ancienne génération a été
déplacée avant que la nouvelle soit écrite, et l'écriture n'a jamais eu lieu.**

Les quinze images sont restaurées. Les neuf autres decks ont été audités : chacun
a bien une génération complète dans `images/`, et rien ne manque ailleurs.

Deux corrections, et la seconde aurait suffi :

- l'écartement a lieu **après** une écriture réussie, sur les noms relevés avant
  elle ;
- **un lot qui sort en épreuve ne touche pas à son `images/`.**

Une troisième s'est révélée en testant : l'écartement comparait l'**existence** du
fichier, or un re-rendu écrit les mêmes noms, donc le chemin existe toujours — il
pointe sur le fichier neuf. La passe suivante a emporté la génération fraîche et
vidé `images/`. Il compare maintenant les **noms écrits par le rendu**.

`test_rendus_intacts.py` : trois cas, dont « après une passe sur un lot qui échoue
une porte, `images/` contient exactement ce qu'il contenait avant ».

---

## 1. Le pied n'était pas épinglé

`_hauteur_pied` mesurait le crédit à une largeur de 10 000 px, donc sans jamais
l'envelopper, tandis que le pied réel s'enveloppe sur la colonne. Un crédit assez
long pour prendre une deuxième ligne débordait sa réservation d'exactement une
ligne, et le pied passait sous la marge basse.

C'est le défaut §0.2, et il ne se voyait que sur les cartes au crédit long — ce
qui explique qu'une première mesure, faite sur une carte au crédit court, l'ait
donné à zéro.

Le même défaut est revenu une fois pendant la correction, quand j'ai raccourci la
mesure du crédit pour dégager le logo **après** avoir réservé sa hauteur. Une
seule expression produit maintenant la largeur que la réservation et le dessin
utilisent tous les deux.

`test_plan_vs_peint.py` : la distance entre le bas du pied et la marge basse est
nulle, sur les trois dispositions et les trois formats.

---

## 2. Le voile se voyait

Le renforcement posait une bande sur **toute la largeur** à chaque pas de 8 %, si
bien que le sujet recevait le même voile que la marge vide à côté du texte. Sur
Peuples-Peul 05 il en est sorti un halo gris franc : la mesure passait et la
photographie était détruite.

Trois corrections :

- le renforcement est **local à la colonne de texte** — une plaque arrondie par
  bloc court, à la largeur de ce bloc ;
- le plafond passe de 72 % à **30 %**, et le pas de 8 % à 6 % ;
- **un voile qui atteint son plafond sans que la mesure passe sort en épreuve.**
  Un bloc encore court est consigné dans `plan.fautes`, et une faute de
  composition bloque le lot au lieu de le laisser partir.

### Et la vraie cause, sur cette carte

L'image est un **portrait détouré sur blanc pur** — luminance des coins à 255,
moyenne 195. §6 l'envoyait en plein cadre parce qu'elle est bien définie et que
son corps est court. Or plein cadre, un détourage n'a aucune scène à assombrir :
tout voile y devient un aplat gris.

C'est un manque de §6, du même genre que le repli sur résolution et posé à côté de
lui : **une image détourée bascule en cartouche.** Elle y garde son blanc, le
texte va sur l'aplat, et la photographie redevient lisible.

---

## 3. La double licence subsistait

Le correctif du 11 ne couvrait que le cas où le lot hérite de la licence de
l'image. Quand elles diffèrent, on lisait « CC BY-SA 2.0 · CC BY-SA 4.0 » : deux
licences nues côte à côte, qui se lisent comme une erreur.

Ce sont deux obligations distinctes — celle de la photographie et celle de
l'œuvre dérivée — donc chacune dit maintenant ce qu'elle couvre :
**« image CC BY-SA 2.0 · carte CC BY-SA 4.0 »**, et « vidéo » sur un montage. Quand
les deux coïncident, la seconde disparaît.

---

## 4. Le logo n'était pas composé

Le pied s'arrêtait à « ethniafrica.com · @ethniafrica ». Le lockup est maintenant
**un bloc du plan**, donc il passe par le contrôle de débordement comme le reste,
au lieu d'être tamponné par une passe que rien ne mesure.

Il est dessiné par `ethni_brand`, l'implémentation partagée par la carte et
l'image vidéo, puis collé là où le plan l'a placé — `draw_lockup` s'épingle sinon
au coin du cadre avec sa propre marge, et en 9:16 ce coin est dans la zone
d'interface.

**Crédit + logo forment une rangée** : la marque à droite, le crédit à sa gauche,
et la mesure du crédit raccourcie d'autant. Posé une gouttière au-dessus, il
tombait sur la ligne de source.

---

## 5. Le rang était amputé

§8 spécifie `01/05`. Le moteur n'imprimait que le rang. Le total se calcule sur le
nombre de cartes du deck ; il ne se saisit pas. **Un lecteur qui ne sait pas
combien il reste s'arrête plus tôt.**

---

## 6. La dernière carte n'avait pas sa pastille

L'appel à l'action n'était planifié que si une carte déclarait un champ `appel`,
et aucune ne le fait — donc il ne sortait jamais. Il appartient désormais
**systématiquement à la carte de rôle `bascule`**.

Et l'adresse a quitté le corps : dite une fois dans la copie, une fois sur la
pastille, une fois dans le crédit, elle devenait un refrain. Neuf corps la
portaient.

> **Trois de ces neuf ont demandé plus qu'un retrait.** « Cherche le tien sur
> ethniafrica.com. » laisse « Cherche le tien sur » si on n'ôte que l'adresse.
> La phrase d'appel entière est partie, puisque c'est elle que la pastille porte
> désormais. Les trois se lisent complètes sans elle, et les trois sont listées
> ici parce qu'il s'agit de copie approuvée :
>
> | Deck | Ce qui a été retiré |
> | --- | --- |
> | Carrousel-Mercator 5 | « Joue avec la carte sur ethniafrica.com. » |
> | Noms-alliances 6 | « Cherche le tien sur ethniafrica.com. » |
> | Noms-metiers 7 | « Cherche le tien sur ethniafrica.com. » |

---

## 7. Le contrôle demandé

`blocs_non_peints()` compare le plan à l'image finie : pour chaque bloc planifié,
les pixels de sa boîte diffèrent-ils de la même boîte sur le fond sans texte ? Un
bloc planifié et jamais dessiné les laisse identiques.

Il est câblé au rendu : **un bloc planifié et non peint bloque le lot.**

Le rang sans son total, la pastille absente et le logo manquant étaient trois
occurrences d'un même trou — le plan avait raison, la peinture ne suivait pas, et
rien ne regardait les deux. Le contrôle a trouvé le logo dès sa première
exécution.

Il a aussi révélé que le test de chevauchement ne regardait que les blocs
**porteurs de texte**. Le lockup n'en porte pas, ce qui est précisément pourquoi
sa collision avec la ligne de source n'avait aucun test.

---

## 8. Vérification

| Suite | Résultat |
| --- | --- |
| `test_ethni_tokens.py` | 15/15 |
| `test_ethni_compose.py` | 22/22 |
| `test_ethni_cadence.py` | 10/10 |
| `test_ethni_soustitre.py` | 9/9 |
| `test_corpus_compose.py` | 8/8 — 195 plans |
| `test_video_corpus.py` | 5/5 |
| `test_plan_vs_peint.py` | 3/3 |
| `test_rendus_intacts.py` | 3/3 |

Les dix decks sont re-rendus : **180 images**, Mercator en épreuve sur sa licence
de carte 2. Comptages audités deck par deck, rien ne manque.
