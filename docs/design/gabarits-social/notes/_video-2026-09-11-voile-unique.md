# La vidéo sur le voile unique — 11 septembre 2026

Les dix decks image validés, la vidéo repasse par le moteur. Deux régressions que
mes propres changements avaient posées sont sorties avant le rendu, et une seule
vidéo pouvait être rendue.

---

## 1. Deux régressions, trouvées avant le rendu

### La paire n'entrait plus avec la cadence

`ORDRE_LECTURE` nommait le bloc de paire **`plaque`**, le nom du champ avant que
§10 ne le renomme. Après le renommage, plus aucune paire ne correspondait : le bloc
entier était **permanent dès l'image 1**, en silence.

Ce n'est pas un détail de rendu. §9 range la paire dans l'ordre de lecture parce
qu'elle explique ce que le titre vient de poser ; permanente, elle arrive avant ce
qu'elle explique. La correspondance se fait maintenant sur le préfixe des cellules,
qui est ce que la paire porte réellement.

### Les decks vidéo étaient restés à l'ancien schéma

J'avais migré `cards.json` la passe précédente, et pas `cartes.json`. Le moteur ne
lit plus ni `corps_paires` ni `plaque` : **deux scènes de Lesotho-Botswana auraient
rendu leur tableau vide**, sans rien dire.

**22 paires converties sur 114 scènes**, quinze decks. Une carte vidéo et une carte
image ont maintenant la même forme.

### Et une constante qui mentait

`PERMANENTS` nommait encore `bandeau` et `rang`, qui n'existent plus depuis que §5A
les fait descendre dans la colonne. Elle n'est lue par personne — ce qui est
précisément ce qui lui permettait de mentir sans conséquence jusqu'au jour où
quelqu'un s'y fierait.

---

## 2. Ce qui a été rendu, et ce qui ne pouvait pas l'être

**Une seule vidéo était rendable : Libreville.** C'est le seul deck dont les huit
identités d'image sont écrites. Les quatorze autres sont à **0 identité sur 104**,
et la porte 2 les refuse — le blocage connu, pas un effet de cette passe.

| | Montage | Contrôle |
| --- | --- | --- |
| Fichier | `video/libreville.mp4` | `video/libreville-controle.mp4` |
| Durée | 55,60 s | 55,60 s |
| Format | 1080 × 1920, 25 im/s, H.264 + AAC | identique |

8 scènes, **1 390 images clés**, durées lues sur `aligned-words.json` — de 4,4 à
11,4 s. Aucun réglage : un nombre saisi dans une config dérive de l'enregistrement
à la première phrase relue.

La cadence se vérifie en comparant les deux à t = 0,2 s : l'animé porte le bandeau,
le rang, le titre, la précision, le crédit et le sous-titre ; **la punchline et le
corps ne sont pas encore là.** Le contrôle les a tous. §7.a tient — le premier bloc
de contenu est permanent, parce que l'image 1 est la vignette.

---

## 3. Ce que le nouveau gabarit change à l'écran

Les scènes plein cadre portent **un seul voile**, monotone : le bandeau et le rang
sont descendus dans la colonne et n'ont plus de plaque à eux. Mesuré sur la couture
d'une carte en bande — là où l'image rencontre l'aplat — **9,6 niveaux d'écart**,
bien sous le seuil de 25.

La cadence tient : sur la scène 1, le titre est permanent (§7.a — l'image 1 est la
vignette), la punchline arrive à 2,48 s, le corps à 4,96 s.

**La plaque de sous-titre ne se voit pas**, et c'est mesuré plutôt que jugé à l'œil :
15–25 niveaux dans la plaque contre 17–22 autour. Ce que j'avais pris pour une boîte
visible en vignette est le texte lui-même.

---

## 4. L'habillage de fin n'est toujours pas là

`ethni_montage.py` ne concatène pas l'outro approuvé, et **je ne l'ai pas ajouté
dans cette passe.**

Ce n'est pas une concaténation. `ethni_render.py` le fait *chevaucher* le montage,
et démarre assez tard pour que ses poignées n'apparaissent qu'après la dernière
légende : `outro_start + 1,68 ≥ fin de la dernière légende + 0,30` de pont. Il
vérifie aussi l'empreinte du fichier, parce que deux fichiers se sont appelés
`outro.mp4` et que chaque projet copiait le mauvais par défaut.

Une version simplifiée poserait les poignées sur une légende. La règle est mesurée,
elle se porte telle quelle ou pas du tout.

---

## 5. Ce qui reste

1. **L'habillage de fin** — §4 ci-dessus.
2. **Les 104 identités** des quatorze autres decks vidéo, une image à la fois.
3. **`ethni_render.py` et `ethni_compose_v1.py`** vivent encore pour l'ancien
   gabarit. À retirer quand les quatorze decks seront passés.
4. **Deux scènes** — Sanankuya 5 et Villes-Congo 5 — restent des listes d'énoncés
   et non des couples terme · glose.
