# La clôture, et la carte qui la remplaçait

Deux défauts, et c'est le même : quelque chose d'autre occupait la place de la
clôture. Une carte d'outro héritée à la fin du montage, et la légende parlée sur
la plaque de la dernière image. Dans les deux cas le spectateur repartait avec
une adresse au lieu de l'argument.

---

## 1. Ce que la dernière image montrait

| | Rendu du 11 septembre | Mock validé |
| --- | --- | --- |
| Libellé haut | `LE VRAI NOM` — le nom de série | `ETHNIAFRICA · ATLAS DES PEUPLES D'AFRIQUE` |
| Chute du titre | encre 1 | **en accent**, à cheval sur la coupure de ligne |
| Plaque | la légende parlée en cours | **la ligne de vision**, composée |
| Lien | texte en accent, nu | **pastille cerclée** de §8 |
| Après la clôture | 5 s de carte d'outro | rien |

La plaque disait « et une pointe de la côte porte encore ce nom », puis « Ceux
des lieux arrivent bientôt ». C'est la narration qui tourne encore, pas la
doctrine — et c'est précisément ce que la clôture existe pour ne pas dire.

---

## 2. La faute de lecture, et ce qui l'a corrigée

§9 bis écrit que l'emplacement bas de la clôture « fait 270 px pour porter la
plaque **et** la pastille ». J'ai lu quatre éléments comme quatre blocs dans
quatre places, posé la vision seule dans l'emplacement bas, vu la plaque de
légende se poser dessus au rendu — et j'en ai conclu que la vision était parlée.
J'ai donc retiré la vision et laissé le lien seul, ce que §9 bis interdit en
toutes lettres.

**La plaque est la doctrine, pas la voix.** Une clôture ne réserve donc aucune
bande de narration : son emplacement bas s'appelle `bande-cloture`, et
`_peindre_sous_titre` n'y trouve rien à poser.

---

## 3. La chute en accent, et la seule règle que les pixels tranchent

§9 bis met « Elle le traverse » en accent dans le titre. §4 met le plancher du
doré à 0,84 et le voile de clôture plafonne à **0,781** sous le titre : la table
refuserait. §9 bis donne la méthode et elle est explicite — « cet alpha se
vérifie carte par carte, sur les pixels composés, et non par une table ».

| Mesuré sur la clôture de Libreville | |
| --- | --- |
| Alpha du voile à `y = 890` | 0,781 |
| Chute en accent, pixels composés | **9,79:1** |
| Vision sur sa plaque | 15,59:1 |

Le pire cas du corpus n'est pas le pire cas de cette carte. Le test rend la
clôture et mesure la dernière ligne composée, qui est entièrement la chute.

**La chute traverse une coupure de ligne** — « ELLE LE / TRAVERSE. » — donc elle
ne peut pas se retrouver dans une ligne. Ce qui se retrouve, c'est la position :
`accent_depuis` porte l'indice du mot à partir duquel l'accent prend, et la
frontière se déduit de la dernière fin de phrase. Un lot qui écrit son propre
renversement en hérite sans rien déclarer.

---

## 4. La carte d'outro

Elle vivait dans `ethni_render.py` et je l'avais portée dans `ethni_montage.py`
plus tôt dans la session. Retirée des deux, sans remplacement. Ce qui part avec
elle : la règle de recouvrement de 1,68 s, le contrôle d'empreinte de l'actif, la
reprise de la légende sur ses images, et cinq champs de `validation.json` qui ne
mesuraient que le dégagement de ses poignées.

`colour_ground_share` reste : le plafond de 2 % sur les fonds plats est une
doctrine à lui, et l'outro n'en était que le bord de fenêtre. Sans outro, la
fenêtre est le film entier.

L'actif `outro-reseaux-sociaux.mp4` n'est pas supprimé — l'atelier n'a pas de
contrôle de version. Il n'est simplement plus appelé.

---

## 5. Le corollaire structure, signalé et non réécrit

La narration de Libreville se termine sur « Sur EthniAfrica, on documente d'où
viennent les noms. Ceux des lieux arrivent bientôt. » C'est l'adresse, à la voix,
sous une image qui dit la doctrine.

Le montage le **nomme** et rend quand même : `doctrine_en_derniere_phrase()`
compare la dernière phrase parlée aux mots de la carte de clôture — au
renversement que le lot a écrit, pas à une phrase figée — et ajoute une remarque
au verdict. Correctif structure, comme demandé.

### Et une conséquence que le rendu a sortie

Une clôture compose sa vision, donc elle ne réserve **aucune** bande de légende.
Ce qui se dit encore par-dessus est entendu et non lu. Mesuré sur Libreville :

| | |
| --- | --- |
| Clôture | 44,10 s → 55,54 s |
| Phrases parlées qui y tombent | **6** |
| Première | « Sur cet estuaire vivaient les Mpongwé. » |

Six phrases, soit le dernier tiers du script : la narration raconte encore quand
l'image a fini d'argumenter. Un battement sans légende est le gabarit ; un tiers
du texte est un récit qui n'a pas fini. Le montage compte les phrases et le dit,
avec la première nommée. Même racine que l'adresse finale, même correctif —
`structure`, pas moteur.

> Le partage des durées y est pour quelque chose : `durees()` distribue les
> légendes également et **la dernière scène prend le reste**. Sur 19 légendes en
> 8 scènes, la clôture en hérite 5. C'est un choix d'allocateur, pas une règle de
> §9 bis, et il n'a pas été touché ici : le changer déplacerait toutes les scènes
> de tous les montages pour un défaut dont la cause est le script.

---

## 6. Non-régression

| Suite | Résultat |
| --- | --- |
| `test_gabarit_video.py` | **25/25** — 7 assertions nouvelles |
| `test_ethni_compose.py` | 56/56 |
| `test_ethni_tokens.py` | 16/16 |
| `test_video_corpus.py` | 6/6 |
| `test_corpus_compose.py` | 9/9 |
| `test_plan_vs_peint.py` | 3/3 |
| `test_ethni_cadence.py` | 10/10 |
| `test_ethni_soustitre.py` | 9/9 |
| `test_rendus_intacts.py` | 3/3 |

`_decouper_mot` accepte désormais un membre de phrase et non un seul mot —
§9 l'écrivait déjà, et c'est pourquoi « qu'un pays » ne trouvait rien. Le
comportement à un mot est inchangé : un mot est un membre de phrase de longueur
un. Les quinze clôtures du corpus reçoivent leur `pivot`.

---

## 7. Ce qui reste

1. **Les animations** — le chantier suivant, non commencé.
2. **« 804 peuples »** dans §9 bis contre **776** mesurés sur disque. C'est le
   compte mesuré qui part dans la pastille.
3. **La narration de Libreville** se termine sur une adresse **et** déborde de
   six phrases sur la clôture : les deux sont signalées, à reprendre dans
   `structure`.
4. **Le partage des durées** donne à la dernière scène le reste des légendes.
   À revoir si le raccourcissement du script ne suffit pas.
5. **Les 104 identités** des quatorze autres decks vidéo.
