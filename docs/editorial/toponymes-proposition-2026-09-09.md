# Ouvrir un sixième type d'entité : les lieux

**Statut : proposition. Rien n'est implémenté, rien n'est écrit dans `dataset/`.**
Document exploratoire du 2026-09-09, à lire avant toute décision.

> Note de langue. Les documents de `docs/editorial/` sont en anglais par
> convention du dépôt. Celui-ci est en français à la demande explicite du
> commanditaire. S'il est adopté, la doctrine qui en sortira devra être
> reversée en anglais dans le fichier de doctrine correspondant.

---

## 1. Ce que j'ai mesuré avant de proposer quoi que ce soit

Trois constats, tous vérifiés sur le corpus de cette branche.

**Le corpus nomme déjà des centaines de lieux, en chaînes libres non
reliables.** Les fiches pays contiennent 418 entrées `politicalCenters`,
soit 359 chaînes distinctes. Ce sont des toponymes écrits à la main, sans
identifiant, sans étymologie, sans lien. Le champ est aussi pollué : on y
trouve `etc.)`, `Aucun`, `capitale coloniale)`, `Chefferies traditionnelles`
(dix fois), `Groupes nomades et semi-nomades`. Autrement dit, l'atlas a déjà
un besoin de type « lieu », qu'il satisfait aujourd'hui par du texte libre
dégradé.

**Le chiffre de 219 occurrences pour Brazzaville est à corriger.** Mesure
sur `dataset/` :

| Mesure                                             | Valeur |
| -------------------------------------------------- | ------ |
| Occurrences de la chaîne « Brazzaville »           | 185    |
| dont « Congo-Brazzaville » (le pays, pas la ville) | 126    |
| Occurrences désignant la ville                     | 59     |
| Fichiers concernés                                 | 41     |

Libreville (23 occurrences) et Bingerville (12) sont confirmés. La thèse tient
entièrement — ces lieux n'apparaissent jamais comme sujet — mais elle tient sur
59, pas sur 219, et il vaut mieux le savoir avant de l'écrire quelque part.

**Le corpus porte déjà une erreur que ce type d'entité corrigerait.**
`PPL_TEKE.json` affirme : « Brazzaville fut fondée en mai 1884 sur le
territoire téké ». Le poste de Mfoa est fondé le **3 octobre 1880** ; il est
**baptisé Brazzaville en 1884**. La fiche confond l'acte de fondation et
l'acte de dénomination, et ajoute un mois que je n'ai trouvé dans aucune
source. C'est exactement la confusion qu'une chronologie de noms datée rend
impossible : deux événements, deux dates, deux lignes.

---

## 2. Question 1 — Le périmètre

### 2.1 Les critères que j'écarte, et pourquoi

**L'importance** (population, statut de capitale, notoriété). Écarté pour deux
raisons. D'abord il est sans limite : le continent compte des milliers de
villes et aucun seuil n'est défendable. Ensuite et surtout, il reconduit la
hiérarchie qu'on prétend défaire — les lieux « importants » d'une carte
africaine sont largement ceux que l'administration coloniale a faits
importants, en y installant un port, une gare ou un gouverneur.

**Le fait d'avoir été renommé.** Trop étroit, et faux stratégiquement. Il
exclut les cas les plus éloquents, ceux qui ont **gardé** le nom colonial, et
il transforme la rubrique en tableau de chasse : une liste de victoires
décoloniales, où le silence de Brazzaville devient invisible parce qu'il n'a
pas produit d'événement.

**Le fait que le nom soit contesté.** Vague et non mesurable. Contesté par qui,
à partir de combien de voix ? Un critère qu'on ne peut pas appliquer deux fois
de la même manière n'est pas un critère.

### 2.2 Le critère que je propose

> **Un lieu entre dans l'atlas quand son nom porte la trace attestée d'un acte
> de dénomination — imposition, substitution, restitution, ou refus documenté
> de restitution — et que cet acte peut être daté et sourcé.**

Ce n'est ni un critère géographique ni un critère démographique. C'est un
critère documentaire, comme le reste de l'atlas : ce qui admet une fiche, c'est
l'existence d'une source, pas la taille de l'objet.

Quatre conséquences, toutes voulues.

1. **Les villes renommées entrent** — l'acte de restitution est daté et
   souvent instrumenté.
2. **Les villes qui ont gardé leur nom entrent aussi**, à condition que le
   refus soit documenté. Victoria Falls qualifie : le débat de renommage est
   public et une enquête de 2023 mesure 83,6 % d'opposition des habitants. Un
   non-acte mesuré est un acte.
3. **Un lieu sans acte de dénomination documenté n'entre pas**, quelle que
   soit sa taille. Le motif inscrit est « non documenté », jamais « pas assez
   important ». C'est la posture AFRIK habituelle, appliquée à un nouvel objet.
4. **Les actes de dénomination précoloniaux qualifient au même titre.** C'est
   le point le moins évident et le plus important : si seuls les lieux touchés
   par l'Europe peuvent entrer, la rubrique reste organisée par l'Europe. Un
   lieu nommé par un fondateur dans une tradition orale datable entre par la
   même porte.

### 2.3 Quels objets

| Classe                                                  | Décision    | Raison                                                                                                            |
| ------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| Établissements humains (villes, ports, postes)          | **Admis**   | Le registre de dénomination le plus dense et le mieux daté                                                        |
| Hydrographie et relief (fleuves, lacs, chutes, massifs) | **Admis**   | C'est là que l'écart exonyme/autonyme est le plus brutal : Victoria Falls contre Mosi-oa-Tunya                    |
| Régions et provinces                                    | **Différé** | Administratif, instable, et recoupe les types pays et peuple. À rouvrir quand les deux premières classes tiennent |
| Pays                                                    | **Exclu**   | Type existant                                                                                                     |
| Rues, quartiers, monuments                              | **Exclu**   | Volume non borné. Ils vivent dans la prose de la fiche du lieu                                                    |

### 2.4 Où passe la frontière avec le type pays

Elle est mécanique, donc non négociable au cas par cas :

> **Une entité qui porte un code ISO 3166-1 alpha-3 est un `pays`. Jamais un
> `lieu`.**

Deux corollaires. Un ancien territoire dont le successeur est un État — la
Haute-Volta, la Rhodésie du Sud — reste dans `pays.content.historicalNames`,
il ne devient pas une fiche lieu. Une entité coloniale supranationale —
l'Afrique-Équatoriale française — ne devient pas non plus une fiche lieu :
elle relève du type `frontiere-coloniale`, qui existe déjà.

Sur le volume des rues, un chiffre pour fixer l'ordre de grandeur : la Côte
d'Ivoire a lancé en 2021 un programme de renommage des voies, panneaux posés
depuis mars 2025, quinze autres villes à suivre jusqu'en 2030, 17 millions de
dollars de budget partiellement Banque mondiale. Un atlas qui admettrait les
rues devrait absorber ce flux. Il ne le peut pas.

---

## 3. Question 2 — La fiche

### 3.1 Le principe

La fiche pays est le parent le plus proche : elle porte déjà `etymology`,
`nameOriginActor`, et `historicalNames.formerNames` sous forme de liste datée
(« Haute-Volta (1919-1960) »). Le type lieu n'invente donc pas un genre
nouveau, il projette un patron existant à une autre échelle, et lui ajoute les
trois choses qu'aucun autre type ne porte : une chronologie de noms datée,
l'acte administratif, et le nom d'avant.

Nom du type : `lieu`, préfixe d'identifiant `LIE_`, modèle
`public/modele-lieu.json`. Je retiens `lieu` plutôt que `toponyme` parce que
l'objet documenté est le lieu et que le nom en est le sujet éditorial — la même
relation que pour un peuple, dont la fiche s'ouvre sur ses appellations sans
pour autant s'appeler « ethnonyme ». Le précédent inverse existe (les fiches
patronyme documentent des noms), il est signalé ici pour que l'arbitrage soit
conscient.

### 3.2 Forme proposée

```jsonc
{
  "id": "LIE_BRAZZAVILLE",
  "nameMain": "Brazzaville",
  "placeType": "settlement | watercourse | waterbody | landform",
  "countries": ["COG"], // 1..n — les chutes sont à cheval
  "coordinates": { "lat": 0, "lon": 0, "precision": "city | approximate" },
  "classificationStatus": "consensual | contested | colonial-legacy | reconstructive",
  "summary": "…",

  "content": {
    "appellations": {
      // Les six clés ci-dessous sont EXACTEMENT celles de la fiche peuple.
      "mainName": "…",
      "selfAppellation": "…", // comment les habitants nomment le lieu
      "exonyms": [],
      "spellingAliases": [],
      "originOfExonyms": null,
      "whyProblematic": null,
      "contemporaryUsage": null,

      // Ce que le type lieu ajoute :
      "priorName": null,
      "priorNameStatus": "attested | reconstructed | undocumented | none-established",
      "priorNameLanguage": null, // ISO 639-3
      "priorNameMeaning": null,
      "priorNameNote": null, // prose lecteur quand status ≠ attested
    },

    "nameChronology": [
      {
        "name": "Mfoa",
        "nameType": "endogenous | colonial | restored | commemorative | descriptive",
        "fromYear": null,
        "toYear": 1884,
        "ongoing": false,
        "precision": "year | century | approximate",
        "datingNote": null,
        "language": "tek",
        "meaning": null,
        "namingActor": "…", // prose, comme nameOriginActor
        "namingAct": {
          "instrument": "ordonnance | décret | loi | arrêté | délibération | traité | usage",
          "reference": null, // numéro / intitulé de l'acte
          "date": null,
          "authority": null,
        },
        "note": null,
      },
    ],

    "priorSettlement": {
      // l'établissement d'avant, ≠ le nom d'avant
      "description": null,
      "peoples": [],
      "attestation": "attested | reconstructed | undocumented | none-established",
    },

    "endogenousReading": null, // obligatoire — voir §6
    "exogenousReading": null,

    "relatedPeoples": [{ "peopleId": "PPL_TEKE", "role": "prior-occupant" }],
    "relatedLanguages": ["tek"],

    "gaps": [{ "field": "…", "reason": "…" }],
    "externalIdentifiers": { "wikidataId": null, "geonamesId": null },
    "sources": [{ "title": "…", "url": null, "tier": "…", "notes": "…" }],
  },
}
```

### 3.3 Les cinq décisions à défendre

**Le bloc `appellations` recopie la fiche peuple à l'identique.** Pas
« s'en inspire » : les six mêmes clés. Le lecteur a appris à lire ce bloc sur
776 fiches, la règle de l'autonyme y est déjà tenue par un composant et une
règle ESLint dédiée. Réutiliser la forme, c'est hériter du comportement de
surface sans le réécrire. C'est le choix KISS.

**`priorName` existe en tant que champ nommé, alors qu'il figure aussi dans la
chronologie.** La redondance est assumée. La chronologie répond à « quels noms,
dans quel ordre » ; `priorName` répond à « quel était le nom d'avant », qui est
la question que le lecteur pose et que l'atelier doit pouvoir compter. Enfoui
dans un tableau, « combien de fiches établissent le nom d'avant » devient une
requête sur un tableau dont la notion de première entrée n'est pas définie. Un
champ nommé est mesurable ; une porte peut s'y accrocher.

**`priorNameStatus` a quatre valeurs, et l'absence en est une.** C'est la
décision centrale du document.

| Valeur             | Ce qu'elle affirme                             |
| ------------------ | ---------------------------------------------- |
| `attested`         | Une source nomme le lieu d'avant               |
| `reconstructed`    | Le nom est inféré, et l'inférence est exposée  |
| `undocumented`     | La recherche a été faite, elle n'a rien trouvé |
| `none-established` | Il n'y avait pas d'établissement antérieur     |

La distinction entre les deux dernières valeurs est la raison d'être du champ.
« Nous n'avons rien trouvé » et « il n'y avait rien » sont des affirmations
opposées, et l'archive coloniale pousse en permanence à glisser de la première
vers la seconde — c'est le mouvement même de la _terra nullius_. Deux valeurs
d'énumération distinctes rendent ce glissement impossible à commettre en
silence. `none-established` doit exiger deux sources, au même titre qu'un
`classificationStatus` contesté.

**`namingAct.instrument` accepte `usage`.** Beaucoup de noms se sont fixés sans
aucun acte. Pouvoir l'écrire évite deux échecs : inventer un décret qui
n'existe pas, ou laisser un vide qui se lit comme une recherche non faite.

**Un nouveau champ lecteur, donc une porte à étendre.** `priorNameNote` est
publié verbatim, comme `gaps[].reason`, `sources[].title` et `sources[].notes`.
Il tombe donc sous la règle du registre lecteur, et
`INTERNAL_REGISTER_PATTERNS` devra le couvrir. Si on l'oublie, le vocabulaire
d'atelier fuit vers le lecteur — c'est déjà arrivé sur 774 fiches noms. C'est
une conséquence concrète à inscrire au chantier, pas une remarque.

---

## 4. Question 3 — Le corpus de départ

### 4.1 Combien, et selon quelle règle

Trois contraintes gouvernent le dimensionnement. Aucune fiche ne doit être
orpheline : chacune se relie à une fiche existante. La série doit contenir son
propre contre-exemple, sinon la rubrique se lit comme un palmarès. Et elle doit
être finissable, car établir un nom d'avant est lent.

D'où la règle proposée :

> **La rubrique publie quand chacun de ses quatre groupes porte au moins trois
> fiches — soit douze au minimum. La cible de première série est 24.**

Trois et non deux, parce que deux exemples sont deux exemples et que trois
commencent à faire motif. Vingt-quatre parce que six fiches par groupe rendent
chaque groupe lisible seul, que cela couvre une quinzaine de pays, et que cela
reste sous 1,5 % du corpus — visible sans écraser.

### 4.2 La première série

**Groupe 1 — Une campagne, pas six exemples : l'authenticité congolaise**

Kinshasa, Kisangani, Lubumbashi, Mbandaka, Kalemie, Bukavu.

Six fiches sur un seul pays, assumé, parce qu'il s'agit d'un seul acte
politique et qu'une fiche isolée ne le montrerait pas. Le renommage commence le
1er juin 1966 pour les trois premières et se poursuit sur les années 1960 et 1970. Onze villes en _-ville_ sont concernées — Léopoldville, Stanleyville,
Élisabethville, Albertville, Coquilhatville, Banningville, Thysville,
Baudouinville, Costermansville, Jadotville, Ponthierville — mais le compte
total des renommages est d'au moins quinze : s'y ajoutent Paulis (Isiro),
Port-Francqui (Ilebo), Luluabourg (Kananga) et Bakwanga (Mbuji-Mayi). Le chiffre
de onze est le compte des noms en _-ville_, pas celui des débaptêmes.

**Groupe 2 — Le geste est continental et il continue**

Harare (Salisbury, 18 avril 1982, d'après le chef shona Neharawa) ·
Maputo (Lourenço Marques, 3 février 1976) ·
N'Djamena (Fort-Lamy, 6 avril 1973, décision du président Tombalbaye) ·
Banjul (Bathurst, 24 avril 1973) ·
Makhanda (Grahamstown, 2018) ·
Gqeberha (Port Elizabeth, 2021).

Les deux dernières sont là pour une raison précise : elles ont moins de dix ans.
Une rubrique composée uniquement de 1966-1982 se lirait comme de l'histoire
close.

**Groupe 3 — Celles qui ont gardé le nom**

Brazzaville · Bingerville · Port Harcourt · Livingstone · Mosi-oa-Tunya /
Victoria Falls · Pretoria / Tshwane.

C'est le groupe qui empêche la rubrique d'être un tableau de chasse. Port
Harcourt porte depuis 1912 le nom de Lewis Vernon Harcourt, secrétaire d'État
aux colonies, sur un territoire dont le nom ikwerre est Rebisi. Victoria Falls
porte un refus mesuré. Pretoria/Tshwane porte un double nom non résolu, ce qui
est un troisième état, ni conservation ni restitution.

**Groupe 4 — Les noms qui ne viennent d'aucun colon**

Libreville · Freetown · quatre à établir.

C'est la catégorie que les quatre pistes du brief ne nomment pas tout à fait, et
c'est celle qui montre que l'atlas ne se contente pas de réagir. Elle réunit
deux cas distincts : les noms européens non éponymes, nés d'un geste
d'affranchissement (Libreville, Freetown), et les noms que les Européens ont
transcrits d'un mot local plutôt qu'imposés.

Candidats pour les quatre places restantes : Dakar, Bamako, Nairobi, Kampala.
**Je n'ai pas vérifié leurs étymologies dans cette session** et je ne les
présente donc pas comme acquises — voir §7.

### 4.3 Ce que la première série coûte et rapporte

Vingt-quatre fiches, une quinzaine de pays, quatre groupes dont chacun contredit
utilement les autres. La RDC pèse 6 sur 24, ce qui est beaucoup pour un atlas
continental ; je le maintiens parce que c'est le prix pour montrer une campagne
comme une campagne. Si cette part gêne, la variable d'ajustement est le groupe 1
ramené à trois, pas la suppression du groupe 3.

---

## 5. Question 4 — Le rattachement

Les fiches existantes se relient par identifiant typé, et les liens qui portent
un rôle le déclarent : une migration relie des peuples avec un `role`
(`origin`, etc.), une relation relie deux peuples avec une `direction`. Le
minimum utile pour un lieu suit la même logique.

**Trois liens, pas plus.**

1. **`countries: [ISO3]`, obligatoire, 1 à n.** C'est par là que le lieu
   apparaît quelque part. La cardinalité multiple n'est pas théorique :
   Mosi-oa-Tunya est à cheval sur le Zimbabwe et la Zambie.

2. **`relatedPeoples: [{ peopleId, role }]`** avec une énumération de rôles
   courte : `prior-occupant`, `namesake`, `current`. Le rôle est ce qui rend le
   lien honnête. Relier Téké à Brazzaville sans rôle ne dit pas s'ils étaient là
   avant ou s'ils y sont maintenant — et cette différence est tout le sujet.

3. **`priorNameLanguage` en ISO 639-3.** C'est le lien vers le type langue, et
   c'est celui que le brief demande. Il a une valeur propre : la langue d'où
   vient le nom d'avant est souvent la seule trace restante de la présence d'un
   peuple sur un site qu'il n'occupe plus.

**Ce que je n'ajoute pas au lancement.** Les liens lieu ↔ lieu (amont/aval,
inclusion) : réels mais non bornés, à rouvrir plus tard. Le lien lieu ↔
migration : la migration porte déjà une géométrie, le doublon serait
immédiat. Le lien lieu ↔ famille linguistique : dérivable de la langue, et
l'atlas s'est déjà fait prendre à stocker du dérivé.

**Le chemin de reprise des `politicalCenters`.** Les 359 chaînes distinctes des
fiches pays sont la cible naturelle. La reprise doit être opportuniste, jamais
massive : on relie une chaîne quand la fiche lieu correspondante existe, on
laisse les autres en texte. **Il ne faut surtout pas générer 359 fiches depuis
ces chaînes** — une part inconnue d'entre elles ne désigne aucun lieu
(`Chefferies traditionnelles`, `Groupes nomades et semi-nomades`, `Aucun`,
`etc.)`).

---

## 6. La règle des deux lectures, et comment la rendre opposable

Le brief pose la règle : ne jamais présenter la lecture exogène seule quand une
lecture endogène existe. Le problème pratique est que la lecture exogène est
toujours prête la première — les archives coloniales sont numérisées,
indexées, gratuites, et elles répondent en une requête. La lecture endogène
demande un livre commandé, une thèse consultée sur place, un entretien.

Si la fiche peut être publiée dès que la moitié exogène est faite, le type
produira systématiquement des demi-fiches. La règle a donc besoin d'un
mécanisme, pas d'une intention. Je propose celui-ci, calqué sur la logique de
`priorNameStatus` :

> **Une fiche lieu dont l'acte de dénomination est colonial ne peut pas publier
> avec `endogenousReading` vide. Elle publie soit avec la lecture endogène,
> soit avec l'énoncé de ce qui a été cherché et non trouvé.**

C'est la même doctrine que le nom d'avant : le silence est publié, la
paresse ne l'est pas. Et c'est vérifiable par une porte, contrairement à
« chercher les deux familles de sources ».

Sur le niveau de source, rien à inventer : la politique existante suffit. Une
tradition orale ou un travail d'universitaire local se cite à son propre niveau,
`referenced` ou `unverified` selon le cas, et s'affiche. Le niveau étiquette, il
ne trie pas.

### Ce que la recherche endogène a donné sur les trois cas du brief

**Brazzaville.** Le site est un ensemble de villages téké désignés
collectivement Nkuna, dont les principaux sont Mfoa (ou Mfa) et Mpila. Le
traité d'amitié entre le Makoko Iloo Ier, roi téké de Mbé de 1874 à 1892, et
Savorgnan de Brazza est signé à Nkuna le 10 septembre 1880. Le poste de Mfoa est
fondé le 3 octobre 1880 et tenu jusqu'en mai 1882 par une escouade commandée par
le sergent sénégalais Malamine Camara. Le nom Brazzaville est donné en 1884.
La source endogène de référence existe et je l'ai identifiée : Abraham Constant
Ndinga-Mbo, historien congolais, _Onomastique et histoire au Congo-Brazzaville_,
L'Harmattan, ISBN 978-2-7475-4866-3 — un ouvrage consacré aux noms des quartiers,
marchés, cimetières, rues et places de la ville. **Je ne l'ai pas lu**, il n'est
pas accessible en ligne. C'est la première acquisition à faire si ce type est
ouvert.

**Libreville.** Le fait est confirmé : en 1846 la marine française capture au
large de Loango le navire négrier brésilien _L'Elizia_ ; 52 personnes libérées
sont installées sur le site en 1849 ; le nom est donné par Édouard
Bouët-Willaumez, sur le modèle explicite de Freetown. En 1849 les affranchis
élisent leurs responsables, et un ancien captif nommé Mountier est élu maire.
Sur le nom d'avant, voir §7 : c'est là que se situe la difficulté la plus
intéressante du dossier.

**Bingerville.** Le site est un village de pêcheurs ébrié. Il devient capitale
de la colonie en 1900, sous le nom d'Adjamé-Santey, et prend alors le nom de
Bingerville en hommage à Louis-Gustave Binger, premier gouverneur. Il cesse
d'être capitale en 1934 au profit d'Abidjan, après Grand-Bassam qui l'avait été
de 1893 à 1900. Sur Binger : né à Strasbourg en 1856, mort en 1936, il part de
Bamako en février 1887, atteint Kong le 20 février 1888 et la côte en mars 1889,
et établit au passage que les monts de Kong portés par toutes les cartes
européennes n'existent pas. **Il est promu capitaine en 1888**, pendant
l'expédition : son propre récit paraît sous la signature « par le capitaine
Binger » (_Du Niger au golfe de Guinée par le pays de Kong et le Mossi,
1887-1889_, numérisé sur Gallica — source primaire, exploitable). Il est
gouverneur de la Côte d'Ivoire de 1893 à 1898 et n'a jamais habité la ville qui
porte son nom.

---

## 7. Ce que je n'ai pas pu établir

Conformément à la règle du brief, ces pistes sont écrites plutôt que citées
comme si elles avaient été lues.

**Le nom d'avant de Libreville n'est pas résolu, et le piège est instructif.**
Les sources donnent « Okolo » comme nom du site. Mais elles le donnent aussi
comme le nom du **poste français** établi vers 1843 sur des terres cédées par un
souverain mpongwe, poste qui reçoit ensuite le nom de Fort d'Aumale vers 1844.
Si Okolo est le nom du poste, alors le nom mpongwe du lieu reste inconnu, et
`priorNameStatus` vaudrait `undocumented`, pas `attested`. Écrire « Okolo »
dans le champ nom d'avant sans trancher reviendrait à publier une dénomination
française comme si elle était endogène — précisément l'erreur que le type est
censé rendre impossible. **Cette question doit être tranchée avant la fiche.**

**L'identité du souverain mpongwe est portée par trois graphies** — « Louis
Ré-Dowé », « roi Louis / Anguilé Dowe » du clan Agekaza-Quaben — sans que
j'aie pu établir s'il s'agit d'une seule personne. Les autres chefs signataires
du traité général du 1er avril 1844 au poste d'Okolo incluent le roi Denis
(Antchouwé Kowe Rapontchombo) des Asiga et le roi Glass (R'Ogouarowe) des
Agekaza-Glass.

**Le nom d'avant de Bingerville a deux candidats concurrents.** « Adjamé-Santey »,
le nom porté en 1900 au moment où la ville devient capitale, et « Alobè », donné
comme le nom du village de pêcheurs ébrié, d'après une rivière vénérée par les
ancêtres. Les deux viennent de sources faibles et peuvent désigner deux moments
plutôt que deux versions. Non résolu.

**La notice des Archives nationales d'outre-mer sur Bingerville n'a pas pu être
lue** : la récupération a échoué sur une erreur de protocole TLS. C'est
pourtant la source officielle attendue pour les dates de capitale et les actes
de dénomination. À consulter à la main.

**Les références des actes congolais manquent.** J'ai les années — 1er juin 1966
pour Kinshasa, Lubumbashi et Kisangani, années 1960-1970 pour le reste — mais
aucun numéro d'ordonnance. Le champ `namingAct.reference` resterait vide sur les
six fiches du groupe 1, ce qui est acceptable mais devrait être une cible de
recherche explicite.

**Ndinga-Mbo et Metegue N'nah sont identifiés, non lus.** _Onomastique et
histoire au Congo-Brazzaville_ et _Histoire du Gabon. Des origines à l'aube du
XXIe siècle_ (L'Harmattan, 2006, ISBN 978-2-296-01175-5) sont les deux sources
endogènes centrales des deux premiers dossiers. Aucun des deux n'est
consultable en ligne.

**Les étymologies de Dakar, Bamako, Nairobi et Kampala n'ont pas été
recherchées.** Elles sont proposées comme candidates au groupe 4 sur
présomption, et doivent être établies avant d'être inscrites.

**L'enquête de 2023 sur Victoria Falls (83,6 % d'opposition) provient d'une
reprise secondaire.** L'enquête primaire n'a pas été localisée. Le chiffre ne
doit pas être publié en l'état.

**Une référence savante repérée et non lue** : _When places change their names
and when they do not. Selected aspects of colonial and postcolonial toponymy in
former French and Spanish colonies in West Africa_ (International Journal of the
Sociology of Language, 2016) — le titre porte exactement la question du groupe 3,
et devrait cadrer la doctrine avant qu'on l'écrive.

---

## 8. Les risques que je vois

**Le périmètre est le seul rempart, et il doit être une porte, pas une
intention.** Les lieux sont en nombre illimité. Si le critère d'admission n'est
pas vérifié mécaniquement, la rubrique dérivera vers un annuaire.

**Le nom d'avant sera vide la plupart du temps au départ.** Ce n'est acceptable
que si la surface affiche `undocumented` comme un énoncé et non comme un blanc.
Si le rendu masque les champs vides, le sens du type disparaît. C'est une
contrainte de conception d'écran, pas seulement de données.

**Le type peut se mettre à concurrencer les fiches pays** sur l'histoire
coloniale. La règle ISO 3166 tranche l'appartenance, mais pas le doublon de
prose. À surveiller à la relecture des premières fiches.

**Trois nouveaux gabarits, pas un.** Ouvrir ce type implique le modèle strict,
l'extension du registre lecteur, et une entrée dans le validateur AFRIK. Le
compte de modèles cité dans `CLAUDE.md` passerait de 17 à 18, et un test tient
ce compte face au répertoire.

---

## 9. Ce que je recommande de décider

1. **Le critère d'admission** de §2.2 — documentaire, pas démographique — et la
   frontière ISO 3166 avec le type pays.
2. **`priorNameStatus` à quatre valeurs**, avec `undocumented` et
   `none-established` distinctes. C'est la décision qui porte tout le reste.
3. **La règle de publication** de §6 : pas de fiche à dénomination coloniale
   sans lecture endogène ou sans énoncé de la recherche infructueuse.
4. **Le dimensionnement** : trois fiches minimum par groupe, douze pour publier,
   vingt-quatre en cible.
5. **Trancher Okolo** avant d'écrire la fiche Libreville, et acquérir Ndinga-Mbo
   avant d'écrire la fiche Brazzaville.

---

## Sources consultées

Lecture exogène — archives, explorateurs, administration :

- [Louis-Gustave Binger, _Du Niger au golfe de Guinée par le pays de Kong et le Mossi, 1887-1889_, vol. 1, Gallica/BnF](https://gallica.bnf.fr/ark:/12148/bpt6k85212c.image)
- [Notice géographique Bingerville, Archives nationales d'outre-mer](https://anom.archivesnationales.culture.gouv.fr/geo.php?lieu=Bingerville+%28C%C3%B4te+d%27Ivoire%29) — non lue, échec TLS
- [Fédération des Sociétés d'Histoire et d'Archéologie d'Alsace, notice Binger](https://www.alsace-histoire.org/netdba/binger-louis-gustave/)
- [Encyclopédie Universalis, Brazzaville](https://www.universalis.fr/encyclopedie/brazzaville/) · [Libreville](https://www.universalis.fr/encyclopedie/libreville/) · [Kisangani](https://www.universalis.fr/encyclopedie/kisangani/)
- [Larousse, Louis Gustave Binger](https://www.larousse.fr/encyclopedie/personnage/Louis_Gustave_Binger/108899)
- [Washington Post, « Zimbabwean Capital Regains Its Original African Name », 19 avril 1982](https://www.washingtonpost.com/archive/national/1982/04/19/zimbabwean-capital-regains-its-original-african-name/c5241cd0-2b69-40ce-81b2-96967db66550/)
- [South African History Online, renommage de la capitale du Zimbabwe](https://sahistory.org.za/dated-event/capital-city-zimbabwe-renamed)

Lecture endogène — historiens des pays concernés, traditions locales,
sources communautaires :

- Abraham Constant Ndinga-Mbo, _Onomastique et histoire au Congo-Brazzaville_, L'Harmattan — [notice éditeur](https://www.editions-harmattan.fr/catalogue/livre/introduction-a-lhistoire-des-migrations-au-congo-brazzaville/53022) — **identifié, non lu**
- Nicolas Metegue N'nah, _Histoire du Gabon. Des origines à l'aube du XXIe siècle_, L'Harmattan, 2006 — [notice éditeur](https://www.editions-harmattan.fr/catalogue/livre/histoire-du-gabon-1/52785) — **identifié, non lu**
- [Société des historiens du Congo-Brazzaville, histoire contemporaine](http://historiensducongo.unblog.fr/histoire-contemporaine/)
- [Heshima Magazine (RDC), « Les Humbu : peuple autochtone de Kinshasa »](https://heshimardc.net/v1/2022/02/08/les-humbu-peuple-autochtone-de-kinshasa/)
- [La Cruche (RDC), « La signification de Kisangani et de ses six communes »](https://lacruche.net/la-signification-de-kisangani-et-de-ses-six-communes/)
- [Gabonreview, « City tour de Libreville : à la découverte de la Libreville originelle »](https://www.gabonreview.com/city-tour-de-libreville-a-la-decouverte-la-libreville-originelle/)
- [Baab.ci, « De Bassam à Bingerville : histoire des capitales ivoiriennes »](https://baab.ci/de-bassam-a-bingerville-histoire-des-capitales-ivoiriennes-partie-1/)
- [Rezo-Ivoire, notice Bingerville](https://rezoivoire.net/ivoire/villes-villages/390/bingerville.html)
- [African Heritage, « Why the name: Brazzaville? »](https://afrolegends.com/2014/06/10/why-the-name-brazzaville/) · [« Why the Name: N'Djamena? »](https://afrolegends.com/2015/05/18/why-the-name-ndjamena/) · [« Why the Name: Banjul? »](https://afrolegends.com/2021/05/12/why-the-name-banjul/)
- [PAMUSOROI! (Zimbabwe), « From Neharawa to Harare »](https://pamusoroi.com/history/today-in-history/from-fort-salisbury-to-harare-ca-1982)

Toponymie critique et cadrage doctrinal :

- [_When places change their names and when they do not_, International Journal of the Sociology of Language, 2016](https://www.degruyterbrill.com/document/doi/10.1515/ijsl-2016-0004/html) — **repéré, non lu**
- [_Decolonizing place-names: strategic imperative for preserving indigenous cartography in post-colonial Africa_, African Journal of History and Culture](https://academicjournals.org/journal/AJHC/article-full-text/58F548754869)
- [_Toponymic renaming as a reflection of social cohesion and social justice in the City of Tshwane_, South African Geographical Journal, 2024](https://www.tandfonline.com/doi/full/10.1080/03736245.2024.2418603)
- [« The politics of renaming colonial streets in Francistown, Botswana », _Historia_](https://www.scielo.org.za/scielo.php?script=sci_arttext&pid=S0018-229X2014000200016)
- [Malay Mail, renommage des rues en Côte d'Ivoire, 1er mai 2025](https://www.malaymail.com/news/life/2025/05/01/less-french-more-african-ivory-coast-modernises-street-names-to-reflect-cultural-identity/175222)

Wikipédia n'est pas citée comme source. Les pages consultées
(_List of renamed places in the Democratic Republic of the Congo_, _Libreville_,
_Timeline of Libreville_, _Louis-Gustave Binger_, _N'Djamena_, _Banjul_,
_Iloo I_, _Port Harcourt_) ont servi à localiser les sources ci-dessus et
devront, si ce type est ouvert, être remplacées fiche par fiche par les sources
primaires qu'elles désignent.
