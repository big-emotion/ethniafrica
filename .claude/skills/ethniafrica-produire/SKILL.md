---
name: ethniafrica-produire
description: Rendre les carrousels et les reels EthniAfrica depuis un cards.json et un SOURCES.md validés, conformément à GABARITS-SOCIAL.md — dispositions A/B/C, résolution ≤ ×2, zone d'interface 9:16, licence de sortie calculée. Dernière étape de la chaîne idee → structure → produire ; rien ne vient après, la publication est un acte humain. Utiliser pour « rends », « génère les images », « fais la vidéo », « sors le carrousel », ou /ethniafrica-produire. Rend toujours, en épreuve si les portes ne passent pas.
---

# produire — rendre carrousels et reels

Dernière étape de la chaîne. **Rien ne vient après.** La publication est un acte
humain : l'opérateur poste, puis renseigne la date et les réseaux dans la section
Diffusion du `post.md`, ce qui fait passer le sujet en ✅. Tu ne publies pas, tu
ne programmes pas, tu ne proposes pas de le faire.

Si `cards.json` ou `SOURCES.md` manquent, dis-le et propose `structure`. Ne saute
pas l'étape.

## Tu rends toujours

Une épreuve se regarde, même imparfaite : c'est en la voyant qu'on décide. Ce qui
est verrouillé, ce n'est pas le rendu, c'est le passage en 🟢.

**Ne demande jamais l'autorisation de rendre.** Rends, dis dans quel dossier, et
dis pourquoi.

## Les deux sorties

| Sortie            | Dossier             | Condition                 | État atteint          |
| ----------------- | ------------------- | ------------------------- | --------------------- |
| **Épreuve**       | `_epreuves/`        | toujours                  | 🟡 En traitement      |
| **Bon à publier** | `images/`, `video/` | les quatre portes passées | 🟢 Validé, en attente |

### Les quatre portes

1. Toute licence d'image est nommée, et la licence de sortie est calculée.
2. Chaque crédit nomme le document réellement affiché sur la carte.
3. Aucun champ imprimé ne contient de note interne (« à nommer », « à
   confirmer », « à compléter »).
4. Aucune image n'est agrandie au-delà de ×2, ou un repli de disposition l'a
   évité.

Une épreuve porte un **bandeau diagonal « ÉPREUVE — NE PAS PUBLIER »** et un
encart listant les portes non franchies, en clair, avec ce qu'il faut pour les
franchir. Elle ne va jamais dans `images/`, et son nom de fichier porte le
suffixe `-epreuve`.

## Ce que tu appliques

Tout vient de `docs/design/gabarits-social/GABARITS-SOCIAL.md` :

- **§6, la règle de choix de disposition.** `auto` mesure et choisit. Le repli sur
  résolution est la règle la plus importante du lot : une image de 900 px en
  plein cadre 1080 × 1920 est agrandie ×3,6, le document devient une texture et
  l'argument de la carte disparaît avec lui.
- **La résolution se lit sur le fichier décodé**, jamais sur son nom.
- **La zone d'interface 9:16** : rien de lisible sous y = 1620.
- **§7, la licence de sortie** : la plus virale du lot, calculée et non recopiée.
- **§11, la liste de contrôle**, avant chaque rendu.

Le contraste se **mesure sur les pixels réels sous le voile**, pas s'estime. Le
halo de texte aide la perception et ne compte pas dans le calcul.

## Où sont les valeurs

Nulle part dans ta tête, et nulle part dans les scripts :

- couleurs et familles → `docs/design/gabarits-social/tokens/*.css`, lues par
  `ethni_tokens.py`
- tailles, marges, formats, voiles → `GABARITS-SOCIAL.md`

**N'invente jamais une valeur de couleur, une taille ou une licence.** Si une
valeur manque, dis laquelle et arrête-toi sur ce point : c'est une décision
d'opérateur, pas un trou à combler. Le défaut que ce dispositif corrige est
précisément une valeur inventée — un doré de logo employé comme couleur de texte,
illisible sur les fonds clairs.

## Où ça s'écrit

`<Sujet>` est un nom nu, et il se résout sous `ETHNIAFRICA_SOCIAL_OUTPUT` — la
bibliothèque de production, hors dépôt. **Si la variable n'est pas posée, le
rendu part dans `output/social/` du dépôt**, qui est ignoré par git et disparaît
avec la copie de travail. C'est un dépannage, pas une destination : dis-le à
l'opérateur plutôt que de livrer un lot qui sera perdu.

Le moteur refuse toute autre écriture sous un dépôt git. Ce n'est pas une
précaution théorique : 1,2 Go de masters ont fini une fois dans un `output/`
ignoré par git, sauvegardé par rien.

## Les commandes

```
# Le schéma d'abord, si le deck vient de l'ancien gabarit :
node social/tools/migrate-cards/migrate-cards.mjs <Sujet> --essai
node social/tools/migrate-cards/migrate-cards.mjs <Sujet>

cd social/harness
./venv/bin/python ethni_carrousel2.py <Sujet>   # le carrousel, les trois formats
./venv/bin/python test_ethni_tokens.py          # la porte anti-littéral
./venv/bin/python test_ethni_compose.py         # le contrat de composition
./venv/bin/python test_corpus_compose.py        # les mêmes règles sur tout le corpus
./venv/bin/python test_gabarit_video.py         # le contrat de §9 bis
```

**`ethni_carrousel2.py` refuse d'écrire dans un `images/` qui porte déjà des
rendus** et bascule le lot en épreuve. Deux jeux de rendus côte à côte sont
indiscernables dans un sélecteur de fichiers. `--remplacer` lève le refus.

**La vidéo se rend par `ethni_montage.py`**, pas par `ethni_render.py` :

```
node social/tools/migrate-scenes/migrate-scenes.mjs <Sujet>
cd social/harness
./venv/bin/python ethni_montage.py <Sujet>              # le montage
./venv/bin/python ethni_montage.py <Sujet> --controle   # mouvement réduit
```

**La passe audio d'abord, et elle doit rendre la main.**

```
./venv/bin/python ethni_audio.py <Sujet>     # pauses, légendes, repères de scène
./venv/bin/python ethni_montage.py <Sujet>   # seulement après
```

Tout ce qui suit est calé sur `work/aligned-words.json`. Lancé pendant que la
passe écrit, le montage lit l'alignement de la version précédente et rend des
durées de scène d'une version avec les légendes d'une autre — mesuré une fois :
19 s de carte de clôture sur 8,6 s de voix, sans que rien ne se plaigne. **Le
montage refuse désormais de partir** si les lettres de l'alignement ne
reconstituent pas le script, et il nomme le signe où ça diverge. Ce refus est
bloquant, pas une remarque : un alignement périmé ne dégrade pas le montage, il
l'invente.

Les deux variantes d'un même sujet se ressemblent trop pour qu'on les distingue à
l'œil dans `work/` : seul le dernier bloc change, donc les débuts de scène sont
presque identiques et c'est la **fin** de la narration qui diffère.

**Une scène est un paragraphe de narration, et sa durée est mesurée.**
`ethni_audio.py` écrit `work/scene-starts.json`, un point par bloc séparé d'une
ligne vide ; `ethni_montage.py` le lit. Il ne répartit plus les légendes à parts
égales — sur Libreville ce partage affichait la carte de clôture à 44,10 s quand
sa première phrase se dit à 50,88 s. Si le nombre de paragraphes ne correspond
pas au deck, le montage le **dit** et retombe sur l'ancien calcul, plutôt que de
décaler toutes les scènes en silence. Relance la passe audio après toute édition
du deck ou du script.

Le contrôle en mouvement réduit est la version dont on juge une composition.

### La fin d'un montage

**La voix finit où l'image finit.** Le dernier paragraphe de narration dit le
renversement puis la sortie — jamais une adresse seule. Le montage le contrôle
contre les mots de la carte de clôture elle-même et le remarque sans bloquer.

**La clôture parlée est courte.** Le renversement, puis la sortie, et rien
d'autre : « Une frontière ne contient pas un peuple. Elle le traverse. Retrouvez
l'histoire du nom des peuples sur EthniAfrica. Et bientôt, celle des lieux. » La
datation et la ligne de vision sont **écrites sur la carte**, mot pour mot — les
redire à la voix met vingt secondes de doctrine sur une seule image. Mesuré :
58 mots dictés donnent 21,4 s de carte fixe, 23 mots en donnent 7.

**La carte de fin entre sur la phrase de sortie**, jamais avant, et joue une fois
avant de tenir sa dernière image. Le montage l'annonce dans son journal avec la
phrase sur laquelle elle entre : lis cette ligne, c'est elle qui dit si le repère
est juste.

### La voix

La paire voix/réglages d'un sujet est dans son `SOURCES.md` et **se copie, ne
s'invente pas**. Deux choses s'apprennent à la prise :

- **Un bloc court isolé se lit environ 40 % plus lentement qu'un long bloc
  continu.** Même voix, mêmes réglages : le corps de Libreville sort à 3,96 mots
  par seconde et une clôture de 23 mots à 2,25. Une clôture regénérée seule
  demande donc `speech_rate` autour de **35** pour rejoindre le rythme du corps.
- **`tempo` dans `production.json` étire la prise** : plus il est bas, plus le
  film est lent _et_ plus la voix souffre. **0,85 est le plancher** — en dessous,
  un humain doit écouter avant publication. Libreville était à 0,79 et y est
  remontée.

**Refaire une prise ne se fait que sur le bloc qui change.** Le crochet est
`work/tts-corrected.wav`, que la passe audio préfère à `tts-original.wav` : on y
raccorde le corps approuvé, coupé au milieu du silence qui précède le bloc refait,
et la nouvelle queue. Le texte et la voix changent **ensemble**, sinon les
légendes se calent sur des mots que la voix ne dit pas.

La transcription est mise en cache dans `work/raw-whisper.json` et **porte
l'empreinte de la prise** qu'elle décrit. Sans clé, elle a déjà rendu les mots de
l'ancienne prise à la nouvelle.

**Un montage rendu par `ethni_montage.py` est conforme à §9 bis**, et se
présente comme tel. `ethni_render.py` survit pour les montages de l'ancien
gabarit, passe par `ethni_compose_v1.py` et lit `scenes.json`, un schéma distinct
de §10 — une vidéo qu'il produit n'est **pas** conforme, et ne se présente pas
comme telle. Ne le lance pas pour un deck migré.

Ce qui reste au gabarit vidéo : **les animations**. Le mock ne fixe que les
positions, et la cadence n'a aucun entrant, donc le montage et son contrôle
sortent identiques. C'est cohérent et ce n'est pas un défaut à signaler comme
tel. Détail : `docs/design/gabarits-social/notes/_gabarit-video-2026-09-11.md` et
`docs/design/gabarits-social/notes/_video-fin-2026-09-11.md`.

**Les sous-titres se coupent sur le souffle, jamais tous les N mots.**
`ethni_soustitre.segmenter()` travaille sur le texte de narration **avant**
l'alignement ; l'aligneur n'est interrogé que sur le _quand_. Couper les mots
alignés produit « Congo portaient le ».

**La porte 2 bloque sur l'absence de contrôle, pas sur le vocabulaire.** Elle
refuse une carte sans `image.identite`, et une carte dont personne n'a consigné
`image.verifie_le`. Elle **remarque** sans bloquer quand le crédit et l'identité
ne partagent aucun mot — un crédit est une légende, une identité une description,
et ils divergent légitimement. Ne présente pas une remarque comme un refus.

**`image.identite` s'écrit en regardant l'image**, jamais depuis le crédit.
Dérivée du crédit, elle ferait comparer une chaîne à sa propre copie et la porte
passerait partout, y compris sur la carte dont l'image a changé.

**`--remplacer` remplace vraiment** : les rendus précédents partent dans
`_rendus-remplaces/`. Sans lui, un `images/` déjà peuplé bascule le lot en
épreuve.

## Pour finir

Recalcule l'état : `node social/tools/etat-pipeline/build-etat.mjs`.

Puis dis, en une ligne : ce qui a été rendu, dans quel dossier, et l'état atteint.
Si le sujet est en 🟢, rappelle qu'il ne manque que l'acte de publier — et que
c'est l'opérateur qui le fait.
