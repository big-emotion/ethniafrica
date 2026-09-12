# Ce qu'une session neuve trouvera, et ce qui l'attend

Relevé du 11 septembre au soir, avant de reprendre les autres sujets. Il répond à
une seule question : **peut-on repartir sans redonner d'instructions ?** Oui pour
les règles, non pour les données — et le détail est ici plutôt que dans une
conversation.

---

## 1. Les règles sont écrites, et où

| Ce qui a été tranché aujourd'hui | Où ça vit |
| --- | --- |
| Le gabarit vidéo entier — quatre emplacements, deux voiles, table d'alpha sur la luminance | `GABARITS-SOCIAL.md` §9 bis |
| La clôture : plaque de vision, pastille, ligne de marque, chute en accent | §9 bis + §4 |
| La carte de fin suit la clôture et entre sur la phrase de sortie | §9 bis |
| La fin parlée tient en deux temps | §9 bis |
| Une scène est un paragraphe mesuré | §9 bis + skill `produire` |
| `pivot` déclaré | §10 |
| Écrire les cartes et la narration, clôture constante comprise | skill `structure` |
| Rendre : ordre des passes, garde d'alignement, tempo, débit de prise | skill `produire` |
| La paire voix/réglages d'un sujet | son `SOURCES.md` |

**Trois contradictions ont été corrigées dans les skills ce soir**, et elles
auraient chacune coûté une session :

1. `structure` faisait écrire **`corps_paires`** en liste de listes. Le moteur lit
   `paires`, en `{terme, glose}`, et il coexiste avec le corps. Écrit sous
   l'ancien nom, le bloc de paires **disparaissait de la carte sans un mot**.
2. `produire` listait encore l'ancien moteur comme « la vidéo » et interdisait de
   présenter une vidéo du jour comme conforme au gabarit. Les deux étaient faux.
3. `pivot` n'était déclaré nulle part dans §10, alors que le moteur le lit et que
   `structure` l'exige.

Un balayage complet a suivi — tous les champs de carte lus par le moteur contre
tous ceux que les trois documents font écrire. Plus aucun orphelin.

---

## 2. Ce qui attend, sujet par sujet

**Une seule vidéo est rendue : Libreville.** Les quatorze autres demandent du
travail de données, pas de moteur.

### Porte 2 — 107 refus sur quatorze decks

Surtout `image.identite` absente : la phrase qui décrit ce que l'image montre,
écrite **en la regardant**. C'est `structure` qui l'écrit, deck par deck.

> La porte mourait sur `Lesotho-Botswana`, dont la carte 1 porte un `titre` qui
> est une **liste** — `["Lesotho", "Botswana"]`, reste d'un schéma retiré. Elle le
> **refuse** maintenant en nommant la carte et le champ : une porte qui meurt sur
> une donnée malformée est pire qu'une porte qui refuse, parce qu'un opérateur
> voit une trace de pile et ne sait pas quoi corriger.

### La fin parlée — quatorze scripts sur quinze finissent sur une adresse

Seule Libreville dit la doctrine. Chacun des autres demande deux gestes :
réécrire le dernier paragraphe de `narration.fr.txt`, puis **refaire la prise de
ce seul bloc** à `speech_rate: 35` et la raccorder sur `tts-corrected.wav`.

### Deux decks n'ont pas le compte

`Sanankuya` et `Villes-Congo` ont un nombre de paragraphes de narration différent
du nombre de cartes. Les scènes ne peuvent pas se caler dessus : le montage le
**dit** et retombe sur l'ancien calcul, il ne se tait pas.

---

## 3. Ce qui reste au gabarit lui-même

1. **Les animations.** Le mock ne fixe que les positions, et la cadence n'a aucun
   entrant — le montage et son contrôle sortent donc identiques. C'est cohérent,
   ce n'est pas un défaut.
2. **Une carte de fin en thème de nuit**, sans le slogan. L'actif approuvé est sur
   fond parchemin ; c'est accepté parce qu'il signe après la doctrine, et consigné
   comme réserve dans §9 bis.
3. **« 804 peuples »** dans §9 bis contre **776** comptés sur disque. C'est le
   compte mesuré qui part dans la pastille.

---

## 4. Non-régression

Neuf suites, 135 assertions, toutes vertes. Les quatre corrections de moteur du
jour sont tenues par des tests :

| | |
| --- | --- |
| Le cache de transcription porte l'empreinte de sa prise | passe audio |
| `_mots` et `_mots_pleins` séparés | la porte de `coupe` redevient sensible à l'ordre |
| Le montage refuse un alignement qui ne décrit pas le script | bloquant |
| La porte nomme un champ malformé | 107 refus, aucune trace de pile |
