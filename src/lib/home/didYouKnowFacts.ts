/**
 * The "Saviez-vous" bank.
 *
 * Every fact here is onomastic: it is about a *name* — who gave it, when,
 * and what it was hiding. That is the constraint that keeps the band from
 * drifting into trivia. A fact that could be printed on a placemat does not
 * belong; a fact that changes how a reader hears a word they already knew
 * does.
 *
 * Each fact carries the entities it concerns, so the band is an exit into
 * the atlas rather than a cul-de-sac. Ids are corpus ids, checked against
 * the fiches — a chip pointing at a people the corpus does not hold is a
 * 404 the reader finds before we do.
 *
 * The band draws one fact per request (REQ-115's reasoning applies: the
 * draw runs server-side, so it never re-runs during hydration and cannot
 * desynchronise the client tree). With a bank this small, a curious reader
 * exhausts it in one sitting — growing it is the band's real maintenance
 * cost, not its integration.
 */

export type DidYouKnowEntityKind = "people" | "country" | "family";

export interface DidYouKnowEntity {
  kind: DidYouKnowEntityKind;
  id: string;
  label: string;
}

/** Mirrors the fiche source tiers: official | referenced | unverified. */
export type DidYouKnowTier = "official" | "referenced" | "unverified";

/**
 * Where a fact comes from, in the shape the fiches already use.
 *
 * The bank asserted a tier without ever naming a source. On a band showing
 * one fact per visit that was survivable; on a page that lists the whole
 * bank and invites a reader to cite it, printing « Source référencée » over
 * nothing is claiming an authority we cannot produce — the exact thing the
 * tier policy exists to prevent.
 */
export interface DidYouKnowSource {
  title: string;
  url: string;
  tier: DidYouKnowTier;
  /** What the citation actually supports, or what it deliberately leaves open. */
  notes?: string;
}

export interface DidYouKnowFact {
  id: string;
  /** The claim, stated as a sentence the reader can carry away. */
  headline: string;
  /** Two paragraphs at most — the band is read standing up. */
  body: string[];
  entities: DidYouKnowEntity[];
  tier: DidYouKnowTier;
  /**
   * Optional only because six facts predate the field. Every fact added
   * from now on carries its provenance; `sourcedFactsCiteTheirClaim` in the
   * bank's tests holds that line.
   */
  sources?: DidYouKnowSource[];
}

// @req REQ-113
export const DID_YOU_KNOW_FACTS: DidYouKnowFact[] = [
  {
    id: "monrovia",
    headline: "La capitale du Liberia porte le nom d'un président américain.",
    body: [
      "Monrovia vient de James Monroe, cinquième président des États-Unis. C'est l'une des deux seules capitales au monde à porter le nom d'un président américain — l'autre est Washington.",
      "Le comptoir fondé en 1822 s'appelait Christopolis. Il fut rebaptisé en l'honneur de Monroe, dont le soutien avait permis à l'American Colonization Society d'acquérir le territoire où s'installèrent des Afro-Américains affranchis.",
    ],
    entities: [
      { kind: "country", id: "LBR", label: "Liberia" },
      {
        kind: "people",
        id: "PPL_AMERICANO_LIBERIENS",
        label: "Américano-Libériens",
      },
    ],
    tier: "referenced",
  },
  {
    id: "bantou",
    headline:
      "« Bantou » n'est pas un peuple : c'est une catégorie forgée par un philologue en 1862.",
    body: [
      "Wilhelm Bleek construit le terme dans A Comparative Grammar of South African Languages, à partir d'une racine commune à des centaines de langues : ba-, le préfixe de pluriel humain, et -ntu, la personne. Ba-ntu : « les gens ».",
      "Ce que Bleek nomme est une parenté entre langues, pas une identité. L'anthropologie coloniale, puis l'apartheid avec le Bantu Education Act de 1953, en ont fait une catégorie de « races » et de « cultures » bantoues — un usage que sa classification ne portait pas.",
    ],
    entities: [
      { kind: "family", id: "FLG_BANTU", label: "Langues bantoues" },
      { kind: "people", id: "PPL_ZULU", label: "Zoulou" },
      { kind: "people", id: "PPL_XHOSA", label: "Xhosa" },
      { kind: "country", id: "ZAF", label: "Afrique du Sud" },
    ],
    tier: "referenced",
  },
  {
    id: "cote-ivoire",
    headline:
      "La Côte d'Ivoire porte le nom de la marchandise qu'on y chargeait.",
    body: [
      "Les navigateurs portugais désignaient ce littoral par sa marchandise : Costa do Marfim, la côte de l'ivoire. À l'est, vers Assinie, on parlait déjà de la Côte de l'Or — l'actuel Ghana.",
      "En 1839, l'officier français Bouët-Willaumez francise l'appellation et la fixe officiellement. Il n'invente pas le nom : il institutionnalise un terme employé depuis des siècles dans les langues européennes. Ces noms de côtes découpaient un commerce, pas les peuples qui y vivaient.",
    ],
    entities: [
      { kind: "country", id: "CIV", label: "Côte d'Ivoire" },
      { kind: "country", id: "GHA", label: "Ghana" },
    ],
    tier: "referenced",
  },
  {
    id: "amazigh",
    headline:
      "« Berbère » vient du grec barbaros : celui dont on ne comprend pas la langue.",
    body: [
      "Passé au latin barbarus, le terme sert aux Romains à désigner les populations non latines d'Afrique du Nord ; les auteurs arabes médiévaux le reprennent, l'administration coloniale française en fait une catégorie. Une partie de la communauté le reçoit aujourd'hui comme péjoratif, par association avec « barbare ».",
      "Le nom que ces peuples se donnent est Amazigh — Imazighen au pluriel — et il signifie « homme libre ». Kabyles, Chaouis, Rifains, Chleuhs, Mozabites et Touaregs sont tous Imazighen : des branches d'un même arbre, chacune avec sa région et son histoire.",
    ],
    entities: [
      { kind: "people", id: "PPL_AMAZIGH_MACRO", label: "Amazigh" },
      { kind: "country", id: "MAR", label: "Maroc" },
      { kind: "country", id: "DZA", label: "Algérie" },
    ],
    tier: "referenced",
  },
  {
    id: "lingala",
    headline: "Le nom du lingala a été inventé par des missionnaires belges.",
    body: [
      "La langue, elle, ne l'a pas été : sa base est le bobangi, grande langue commerciale du fleuve Congo, parlée par les peuples riverains bien avant l'arrivée des Européens.",
      "Au XIXe siècle, l'administration coloniale regroupe plusieurs populations du fleuve sous une même étiquette, « Bangala » — un nom que ces peuples n'employaient pas. Elle simplifie leur langue, en fixe l'orthographe, et baptise cette version standardisée lingala. Le lingala moderne garde environ 60 à 70 % de la structure bobangi.",
    ],
    entities: [
      { kind: "country", id: "COD", label: "RDC" },
      { kind: "people", id: "PPL_NGALA", label: "Ngala (Bangala)" },
    ],
    tier: "referenced",
  },
  {
    id: "personne-relationnelle",
    // Trimmed to the items that can be checked word by word. « amăghar » was
    // listed as the amazigh word for "person" — it names an elder or a chief —
    // and one of the proverbs could not be traced to any attested form. The
    // unverified tier labels a claim's authority; it does not license a
    // mistranslation.
    headline:
      "Dans plusieurs langues africaines, une même formule définit la personne par les autres.",
    body: [
      "Muntu chez les Kongo et les Luba, umuntu en zoulou, motho en tswana, mɔgɔ en bambara, onipa en akan, qof en somali : le mot « personne » se répond d'une langue à l'autre, et se retrouve pris dans la même construction.",
      "« Umuntu ngumuntu ngabantu » en zoulou — une personne est une personne par les autres ; « Onipa nyɛ onipa nkoara » en akan ; « Qof waa qof dad awgiis » en somali. Ces formules définissent la personne par ses relations plutôt que par elle-même.",
    ],
    entities: [
      { kind: "family", id: "FLG_BANTU", label: "Langues bantoues" },
      { kind: "people", id: "PPL_AKAN", label: "Akan" },
      { kind: "people", id: "PPL_SOMALI", label: "Somali" },
    ],
    tier: "unverified",
  },
  {
    id: "afrique",
    headline:
      "Le nom du continent vient d'un peuple qui tenait dans une province.",
    body: [
      "Les Romains appellent Afri les habitants de la région de Carthage — on rapproche le nom des Ifren et du berbère ifri, « grotte ». Africa désigne d'abord leur seule province : la Tunisie actuelle et l'est de l'Algérie, pas davantage.",
      "Les Arabes en font Ifrīqiya, sur le même périmètre. Ce n'est qu'au Moyen Âge que le mot glisse sur toutes les terres au sud de la Méditerranée. Un peuple d'une province a fini par nommer trente millions de kilomètres carrés et cinquante-quatre États — dont aucun ne s'était nommé ainsi.",
    ],
    entities: [
      { kind: "country", id: "TUN", label: "Tunisie" },
      { kind: "country", id: "DZA", label: "Algérie" },
      { kind: "family", id: "FLG_BERBERE", label: "Langues berbères" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "Jeune Afrique — Quelle est l'origine du mot « Afrique » ?",
        url: "https://www.jeuneafrique.com/115118/archives-thematique/quelle-est-l-origine-du-mot-afrique/",
        tier: "referenced",
        notes:
          "Plusieurs étymologies coexistent (Ifren, ifri « grotte », punique faraqa). La fiche retient l'extension du périmètre, qui n'est pas contestée, pas l'étymon.",
      },
    ],
  },
  {
    id: "burkina-faso",
    headline: "Le nom du Burkina Faso est écrit dans trois langues à la fois.",
    body: [
      "Burkina vient du mooré et signifie « intègre » ; faso vient du dioula, où fa est le père et so la maison — la patrie. Le gentilé, burkinabè, prend le suffixe -ɓe du peul, celui qu'on retrouve dans Fulɓe. Trois langues du pays dans deux mots et un adjectif.",
      "Thomas Sankara le proclame le 4 août 1984, en remplacement de Haute-Volta — un nom de fleuve, donné par l'administration coloniale, qui ne disait rien des soixante et quelques peuples qu'il recouvrait. Le nouveau nom n'en choisit aucun : il les fait parler ensemble.",
    ],
    entities: [
      { kind: "country", id: "BFA", label: "Burkina Faso" },
      { kind: "people", id: "PPL_MOSSI", label: "Mossi" },
      { kind: "people", id: "PPL_FULANI", label: "Fulɓe (Peul)" },
    ],
    tier: "referenced",
    sources: [
      {
        title:
          "Jeune Afrique — Le 4 août 1984, Thomas Sankara rebaptisait la Haute-Volta en Burkina Faso",
        url: "https://www.jeuneafrique.com/48652/politique/le-4-ao-t-1984-thomas-sankara-rebaptisait-la-haute-volta-en-burkina-faso/",
        tier: "referenced",
      },
    ],
  },
  {
    id: "cameroun",
    headline: "Le Cameroun porte le nom d'un crustacé.",
    body: [
      "En 1472, le navigateur portugais Fernão do Pó remonte l'estuaire du Wouri et le baptise Rio dos Camarões — la rivière des crevettes, d'après ce qu'il y voit grouiller.",
      "Le nom du fleuve passe ensuite au territoire, et change de bouche à chaque administration : Camarões en portugais, Kamerun sous les Allemands, Cameroon en anglais, Cameroun en français. Quatre orthographes pour une observation de pêche.",
    ],
    entities: [
      { kind: "country", id: "CMR", label: "Cameroun" },
      { kind: "people", id: "PPL_DUALA", label: "Duala" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "Ministère des Relations extérieures du Cameroun — Histoire",
        url: "https://www.diplocam.cm/histoire/",
        tier: "official",
      },
    ],
  },
  {
    id: "benin-dahomey",
    headline:
      "Le Bénin a pris un nom qui n'appartenait à aucun de ses peuples.",
    body: [
      "Jusqu'en 1975 le pays s'appelait Dahomey, du nom du royaume fon d'Abomey — un nom légitime, mais celui d'un seul groupe parmi la cinquantaine que compte le pays. Le gouvernement de Mathieu Kérékou le remplace par Bénin, d'après la baie sur laquelle le pays s'ouvre, précisément parce que ce nom-là n'était à personne.",
      "Le calcul a son ironie : la baie du Bénin tient elle-même son nom du royaume du Bénin, qui se trouve au Nigeria et dont l'actuel Bénin n'a jamais fait partie. Le pays a échangé le nom d'un de ses royaumes contre celui du royaume d'un voisin.",
    ],
    entities: [
      { kind: "country", id: "BEN", label: "Bénin" },
      { kind: "country", id: "NGA", label: "Nigeria" },
      { kind: "people", id: "PPL_FON", label: "Fon" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "Why was Dahomey renamed Benin in 1975? — Visit Abomey",
        url: "https://visitabomey.com/en/pillars/why-dahomey-renamed-benin",
        tier: "referenced",
      },
    ],
  },
  {
    id: "nigeria-flora-shaw",
    headline: "Le Nigeria a été nommé dans une tribune de presse.",
    body: [
      "Le 8 janvier 1897, Flora Shaw publie dans le Times une chronique où elle propose d'appeler Nigeria les territoires administrés par la Royal Niger Company — l'appellation en vigueur, « Royal Niger Company Territories », étant impraticable. Elle est alors rédactrice coloniale du journal, et la journaliste la mieux payée de son temps.",
      "Elle épouse en 1902 Frederick Lugard, qui devient gouverneur général et reprend le nom en 1914 en fusionnant les protectorats du Nord et du Sud. Le pays le plus peuplé d'Afrique porte donc un nom de commodité, trouvé par une chroniqueuse pour éviter une périphrase.",
    ],
    entities: [{ kind: "country", id: "NGA", label: "Nigeria" }],
    tier: "referenced",
    sources: [
      {
        title:
          "Dubawa — How true is the claim that Flora Shaw coined the name Nigeria?",
        url: "https://dubawa.org/nigeria60-how-true-is-claim-that-flora-shaw-british-journalist-coined-the-name-nigeria/",
        tier: "referenced",
        notes:
          "Vérification de presse citant l'article du Times du 8 janvier 1897 ; l'adoption officielle par Lugard date de 1914.",
      },
    ],
  },
  {
    id: "zimbabwe-grand-zimbabwe",
    headline:
      "Le Zimbabwe porte le nom d'un monument qu'une loi interdisait d'attribuer aux Africains.",
    body: [
      "Dzimba dza mabwe : « maisons de pierre », en shona. Le site du Grand Zimbabwe gênait : en 1902, Cecil Rhodes finance une fouille avec pour consigne explicite d'établir une origine non africaine, et l'on invoque tour à tour les Phéniciens et la reine de Saba.",
      "En 1970, le gouvernement rhodésien interdit à toute publication officielle d'affirmer que le site est une création africaine. L'archéologue Peter Garlake, qui le soutenait, est emprisonné puis expulsé. En 1980, le pays indépendant se donne le nom des ruines — la réponse la plus courte possible à soixante-dix ans de démenti.",
    ],
    entities: [
      { kind: "country", id: "ZWE", label: "Zimbabwe" },
      { kind: "people", id: "PPL_SHONA", label: "Shona" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "The British Academy — Reclaiming Great Zimbabwe's past",
        url: "https://www.thebritishacademy.ac.uk/blog/reclaiming-great-zimbabwes-past-to-learn-lessons-for-the-future/",
        tier: "referenced",
      },
      {
        title: "Scientific American — Great Zimbabwe",
        url: "https://www.scientificamerican.com/article/great-zimbabwe-2005-01/",
        tier: "referenced",
        notes:
          "Documente la commande de fouille de 1902 et la censure rhodésienne de 1970.",
      },
    ],
  },
  {
    id: "prefixes-bantous",
    headline:
      "Lesotho et Botswana ne sont pas des noms : ce sont des conjugaisons.",
    body: [
      "Mosotho, une personne ; Basotho, le peuple ; Sesotho, la langue ; Lesotho, le pays. La racine ne bouge pas, seul le préfixe change — et il porte tout. Motswana, Batswana, Setswana, Botswana suivent exactement la même grammaire.",
      "Ces préfixes de classe sont le trait le plus caractéristique des langues bantoues. Deux États en ont fait leur nom officiel : lus correctement, ils annoncent qu'ils sont le pays d'un peuple, et donnent au passage de quoi nommer ce peuple et sa langue sans se tromper.",
    ],
    entities: [
      { kind: "country", id: "LSO", label: "Lesotho" },
      { kind: "country", id: "BWA", label: "Botswana" },
      { kind: "people", id: "PPL_SOTHO", label: "Sotho" },
      { kind: "people", id: "PPL_TSWANA", label: "Tswana" },
    ],
    tier: "official",
    sources: [
      {
        title: "SIL Ethnologue — Sesotho (sot)",
        url: "https://www.ethnologue.com/language/sot/",
        tier: "official",
      },
      {
        title: "SIL Ethnologue — Setswana (tsn)",
        url: "https://www.ethnologue.com/language/tsn/",
        tier: "official",
      },
    ],
  },
  {
    id: "peul-dix-noms",
    headline: "Le même peuple change de nom à chaque frontière qu'il traverse.",
    body: [
      "Ils se nomment Fulɓe au pluriel, Pullo au singulier. Le français dit Peul, emprunté au wolof ; l'anglais dit Fulani, emprunté au haoussa ; on lit aussi Fula, et Fellata au Tchad et au Soudan. Leur langue s'appelle pulaar à l'ouest et fulfulde à l'est.",
      "Aucun de ces noms n'est faux, et un seul est le leur. La dispersion du vocabulaire suit celle du peuple : présents du Sénégal au Soudan, les Fulɓe ont été nommés par chacun de leurs voisins, puis par chaque administration coloniale qui les a rencontrés, dans la langue qu'elle avait sous la main.",
    ],
    entities: [
      { kind: "people", id: "PPL_FULANI", label: "Fulɓe (Peul)" },
      { kind: "country", id: "SEN", label: "Sénégal" },
      { kind: "country", id: "MLI", label: "Mali" },
      { kind: "country", id: "NER", label: "Niger" },
    ],
    tier: "official",
    sources: [
      {
        title: "SIL Ethnologue — Pulaar (fuc)",
        url: "https://www.ethnologue.com/language/fuc/",
        tier: "official",
      },
    ],
  },
  {
    id: "khoikhoi-hottentot",
    headline: "« Hottentot » serait une moquerie de la sonorité d'une langue.",
    body: [
      "L'hypothèse la plus répandue veut que les colons néerlandais du Cap, arrivés dans les années 1650, aient forgé le mot en imitant les clics de la langue khoekhoe — quelque chose comme « bègue ». Elle n'est pas établie : aucune attestation antérieure ne vient l'appuyer, et une autre piste le fait venir d'une formule répétée dans un chant nama.",
      "Ce que l'on sait avec certitude, c'est ce que le mot est devenu : une insulte, tenue aujourd'hui pour profondément offensante en Afrique du Sud. L'autonyme, lui, ne varie pas — Khoekhoen, « les hommes des hommes ».",
    ],
    entities: [
      { kind: "people", id: "PPL_KHOIKHOI", label: "Khoikhoi" },
      { kind: "country", id: "ZAF", label: "Afrique du Sud" },
      { kind: "country", id: "NAM", label: "Namibie" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "Dictionary of South African English — Hottentot",
        url: "https://dsae.co.za/entry/hottentot/e03109",
        tier: "referenced",
        notes:
          "Le dictionnaire donne l'hypothèse des clics comme la plus répandue tout en notant l'absence d'attestation antérieure.",
      },
    ],
  },
  {
    id: "pygmee-homere",
    headline:
      "« Pygmée » est une unité de mesure grecque posée sur des peuples qui n'ont pas de nom commun.",
    body: [
      "Pygmē désigne en grec la coudée — du coude à l'articulation des doigts, environ trente-cinq centimètres. Homère et Hérodote en tirent les Pygmaioi, peuple minuscule et légendaire, occupé dans l'Iliade à faire la guerre aux grues. Le mot n'a désigné personne de réel avant que l'Europe ne le pose sur l'Afrique centrale.",
      "Baka, Bagyeli, Aka, Twa, Mbuti n'ont ni langue commune, ni territoire commun, ni identité commune, et aucun ne se nomme ainsi : chacun a son propre nom. Il n'existe d'ailleurs aucun terme de remplacement qui les couvre tous — le meilleur indice que le groupe qu'il prétend nommer n'existe pas.",
    ],
    entities: [
      {
        kind: "people",
        id: "PPL_PYGMEES_AUTOCHTONES",
        label: "Peuples autochtones des forêts d'Afrique centrale",
      },
      { kind: "people", id: "PPL_TWA", label: "Twa" },
      { kind: "country", id: "CMR", label: "Cameroun" },
      { kind: "country", id: "COD", label: "RDC" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "Online Etymology Dictionary — pygmy",
        url: "https://www.etymonline.com/word/pygmy",
        tier: "referenced",
        notes:
          "Établit pygmē « coudée » et l'usage homérique ; l'absence de terme collectif de remplacement est documentée par les organisations de défense des peuples concernés.",
      },
    ],
  },
  {
    id: "lac-lac",
    headline: "Plusieurs cartes d'Afrique disent deux fois la même chose.",
    body: [
      "Nyasa veut dire « lac » en yao et en chichewa : le lac Nyasa est le lac Lac, et le Nyassaland était le pays du Lac. Tsade veut dire « lac » en kanouri : le lac Tchad est le lac Lac, et le pays en porte aujourd'hui le nom. Ṣaḥrāʾ veut dire « désert » en arabe : le Sahara est le désert du Désert.",
      "Le mécanisme est toujours le même. Le voyageur demande le nom d'un lieu, on lui répond ce que c'est, il note la réponse comme un nom propre. Ces toponymes tautologiques marquent l'endroit exact où la conversation a échoué.",
    ],
    entities: [
      { kind: "country", id: "MWI", label: "Malawi" },
      { kind: "country", id: "TCD", label: "Tchad" },
      { kind: "people", id: "PPL_YAO", label: "Yao" },
      { kind: "people", id: "PPL_KANURI", label: "Kanuri" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "WorldAtlas — What is a tautological place name?",
        url: "https://www.worldatlas.com/articles/what-is-a-tautological-place.html",
        tier: "referenced",
      },
    ],
  },
  {
    id: "tombouctou",
    headline: "Personne ne sait ce que veut dire Tombouctou.",
    body: [
      "Quatre étymologies au moins se disputent la ville. La plus racontée en fait Tin Buktu, « le lieu de Bouctou », une vieille femme touarègue à qui les nomades confiaient leurs biens près d'un puits. L'historien malien Sékéné Cissoko y lit plutôt tin, le lieu, et bouctou, une petite dune.",
      "L'explorateur Heinrich Barth, lui, écartait le puits et proposait le songhaï tùmbutu, un creux dans le sable — la ville étant bâtie dans une cuvette. Aucune ne l'emporte. Le nom le plus mythique d'Afrique est celui dont on est le moins sûr.",
    ],
    entities: [
      { kind: "country", id: "MLI", label: "Mali" },
      { kind: "people", id: "PPL_TUAREG", label: "Touareg" },
      { kind: "people", id: "PPL_SONGHAI", label: "Songhaï" },
    ],
    tier: "unverified",
    sources: [
      {
        title: "World History Encyclopedia — Timbuktu",
        url: "https://www.worldhistory.org/Timbuktu/",
        tier: "referenced",
        notes:
          "Le fait publié est le désaccord lui-même. Les étymologies concurrentes relèvent de la tradition orale et d'hypothèses d'auteurs : aucune n'est attestée, d'où le tier « non vérifiée » de la fiche.",
      },
    ],
  },
  {
    id: "fleuve-niger",
    headline: "Le fleuve Niger ne doit rien au latin niger.",
    body: [
      "Le nom vient très probablement du touareg egerew n-igerewen, « le fleuve des fleuves », employé sur le cours moyen autour de Tombouctou et raccourci par les intermédiaires du commerce transsaharien. La ressemblance avec le latin niger, « noir », a fait le reste : elle a fixé l'orthographe et suggéré un sens qui n'y était pas.",
      "Les peuples riverains disaient tous à peu près la même chose dans leur langue : Joliba en mandingue, Isa Ber en songhaï, Orimili en igbo — « grand fleuve » —, Kwara en haoussa, Oya en yoruba. Deux États portent aujourd'hui le nom que l'Europe a mal entendu.",
    ],
    entities: [
      { kind: "country", id: "NER", label: "Niger" },
      { kind: "country", id: "NGA", label: "Nigeria" },
      { kind: "country", id: "MLI", label: "Mali" },
      { kind: "people", id: "PPL_SONGHAI", label: "Songhaï" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "Online Etymology Dictionary — Niger",
        url: "https://www.etymonline.com/word/Niger",
        tier: "referenced",
        notes:
          "Donne l'altération du touareg egerew n-igerewen sous l'influence du latin niger comme hypothèse la plus probable, non comme certitude.",
      },
    ],
  },
  {
    id: "ethiopie",
    headline: "L'Éthiopie a deux noms venus du dehors, et un seul du dedans.",
    body: [
      "Aithiopía est grec et signifie « visage brûlé ». Abyssinie vient de l'arabe habasha, qui désignait les populations de la corne. Deux exonymes, posés par deux voisins, pour un pays qui n'a jamais cessé de se nommer lui-même.",
      "L'autonyme est ʾĪtyōṗṗyā, attesté dans les textes guèzes et repris comme nom officiel de l'État. Abyssinie, lui, est sorti de l'usage : le pays a laissé tomber l'un des deux noms qu'on lui avait donnés et gardé celui qu'il pouvait revendiquer.",
    ],
    entities: [
      { kind: "country", id: "ETH", label: "Éthiopie" },
      { kind: "people", id: "PPL_AMHARA", label: "Amhara" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Ethiopia",
        url: "https://www.ethnologue.com/country/ET/",
        tier: "official",
      },
    ],
  },
  {
    id: "guinee",
    headline:
      "Quatre pays portent le nom de Guinée, et personne ne sait ce qu'il veut dire.",
    body: [
      "Une piste le fait venir du berbère aginaw, « homme noir » — d'où akal n-iguinawen, « le pays des hommes noirs » — ; le mot apparaît sur les cartes européennes à partir du XIVe siècle. Une autre, avancée par le géographe Léon l'Africain en 1526, y voit une déformation de Djenné, la grande cité marchande du Niger.",
      "Aucune n'est établie. Le nom n'en a pas moins servi à découper la côte, puis à baptiser la Guinée, la Guinée-Bissau et la Guinée équatoriale — et, à l'autre bout du monde, la Nouvelle-Guinée, nommée ainsi par un navigateur qui trouvait à ses habitants un air de ressemblance.",
    ],
    entities: [
      { kind: "country", id: "GIN", label: "Guinée" },
      { kind: "country", id: "GNB", label: "Guinée-Bissau" },
      { kind: "country", id: "GNQ", label: "Guinée équatoriale" },
    ],
    tier: "unverified",
    sources: [
      {
        title: "WorldAtlas — Why are so many countries called Guinea?",
        url: "https://www.worldatlas.com/geography/why-are-so-many-countries-called-guinea-56865.html",
        tier: "unverified",
        notes:
          "Les deux étymologies concurrentes (aginaw berbère, Djenné) sont des conjectures d'auteurs ; aucune n'est démontrée.",
      },
    ],
  },
  {
    id: "tanzanie",
    headline: "La Tanzanie est un mot-valise de moins d'un an.",
    body: [
      "Le Tanganyika devient indépendant en 1961, Zanzibar en 1963. Les deux fusionnent en avril 1964, et l'État né de l'union cherche un nom : ce sera Tanzanie, des trois premières lettres de l'un et des trois premières de l'autre.",
      "C'est l'un des rares noms d'État africain qui ne vient ni d'un peuple, ni d'un fleuve, ni d'un explorateur. Il est le procès-verbal d'une addition politique, et il le dit ouvertement.",
    ],
    entities: [
      { kind: "country", id: "TZA", label: "Tanzanie" },
      { kind: "people", id: "PPL_SWAHILI", label: "Swahili" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "SIL Ethnologue — Tanzania",
        url: "https://www.ethnologue.com/country/TZ/",
        tier: "official",
      },
    ],
  },
  {
    id: "mozambique",
    headline:
      "Le Mozambique porte le nom d'un homme, pris pour celui d'un lieu.",
    body: [
      "Mussa Bin Bique était un cheikh et marchand établi sur l'île qui commande la côte. Quand l'expédition de Vasco de Gama y aborde en 1498, les Portugais entendent son nom, le prennent pour celui de l'endroit, et écrivent Moçambique.",
      "L'île devient la capitale coloniale au XVIe siècle, puis le nom déborde sur tout l'arrière-pays. Un pays de plus de trente millions d'habitants s'appelle donc d'après un négociant du XVe siècle, par l'effet d'un malentendu jamais corrigé.",
    ],
    entities: [
      { kind: "country", id: "MOZ", label: "Mozambique" },
      { kind: "people", id: "PPL_MAKUA", label: "Makua" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "UNESCO — Island of Mozambique",
        url: "https://whc.unesco.org/en/list/599/",
        tier: "official",
        notes:
          "Atteste le rôle de l'île comme comptoir puis capitale coloniale ; l'attribution du nom au cheikh Mussa Bin Bique est la lecture courante des chroniques portugaises.",
      },
    ],
  },
  {
    id: "sierra-leone",
    headline:
      "On ne s'accorde ni sur qui a nommé la Sierra Leone, ni sur pourquoi.",
    body: [
      "Le récit courant attribue Serra Lyoa, « montagnes du Lion », au Portugais Pedro de Sintra vers 1462. L'historien sierra-léonais C. Magbaily Fyle le conteste : le nom est attesté avant cette date, et l'attribution serait une erreur de lecture recopiée d'un historien à l'autre.",
      "La raison du nom se dédouble aussi : pour les uns le relief de la côte évoquait des dents de lion, pour les autres c'est l'orage qui rugissait au-dessus des collines. Les marins anglais en font Sierra Leoa au XVIe siècle, puis Sierra Leone ; les Britanniques l'officialisent en 1787.",
    ],
    entities: [
      { kind: "country", id: "SLE", label: "Sierra Leone" },
      { kind: "people", id: "PPL_TEMNE", label: "Temne" },
      { kind: "people", id: "PPL_MENDE", label: "Mende" },
    ],
    tier: "referenced",
    sources: [
      {
        title: "Mission permanente de la Sierra Leone — Country history",
        url: "https://missionsierraleone.ch/411-412-country-history-of-sierra-leone",
        tier: "official",
      },
      {
        title: "Sierra Leone: Why the Name? — African Heritage",
        url: "https://afrolegends.com/2012/11/14/sierra-leone-why-the-name/",
        tier: "unverified",
        notes:
          "Rapporte la contestation de C. Magbaily Fyle sur l'attribution à Pedro de Sintra.",
      },
    ],
  },
];

/**
 * Draw one fact for this request.
 *
 * `random` is injected the way `pickHeroModule` injects it, so the visual
 * snapshot and the tests stay deterministic without the band losing its
 * variation in production.
 */
// @req REQ-113
export function pickDidYouKnowFact(
  random: () => number = Math.random,
  facts: DidYouKnowFact[] = DID_YOU_KNOW_FACTS
): DidYouKnowFact | null {
  if (facts.length === 0) return null;
  const index = Math.min(facts.length - 1, Math.floor(random() * facts.length));
  return facts[index];
}

/**
 * How many anecdotes a page of the feed holds.
 *
 * Each one is a headline, two paragraphs, its chips and its sources — a
 * screenful on mobile. Eight is about as far as a reader scrolls before the
 * page stops being a list and becomes a wall.
 */
// @req REQ-113
export const ANECDOTES_PER_PAGE = 8;

export interface DidYouKnowPage {
  facts: DidYouKnowFact[];
  /** Clamped into range, so it is always a page that exists. */
  pageNumber: number;
  pageCount: number;
}

/**
 * One page of the feed, in the bank's authored order.
 *
 * Deliberately not rotated the way the home's deck is. The band varies its
 * first card because a returning reader meets it unasked; this page is asked
 * for, is linked to, and is meant to be cited — an order that changed per
 * request would move a fact between pages under a reader who is scrolling,
 * and hand two people different content behind the same URL.
 *
 * A page number out of range is clamped rather than refused: `?page=0` and
 * `?page=99` are the shapes a hand-typed URL and a stale link take, and a
 * 404 there tells the reader the anecdotes are gone when they are not.
 */
// @req REQ-113
export function paginateDidYouKnowFacts(
  requestedPage: number,
  facts: DidYouKnowFact[] = DID_YOU_KNOW_FACTS,
  perPage: number = ANECDOTES_PER_PAGE
): DidYouKnowPage {
  const pageCount = Math.max(1, Math.ceil(facts.length / perPage));
  const safePage = Number.isFinite(requestedPage)
    ? Math.min(pageCount, Math.max(1, Math.trunc(requestedPage)))
    : 1;
  const start = (safePage - 1) * perPage;

  return {
    facts: facts.slice(start, start + perPage),
    pageNumber: safePage,
    pageCount,
  };
}

/**
 * The bank, rotated so a freshly drawn fact leads the deck.
 *
 * The band used to render one fact and drop the other five, which made the
 * per-request draw the only variation a returning reader could get. A deck
 * hands over the whole bank instead — and would then open every visit on the
 * same card. Rotating rather than shuffling keeps both properties: the first
 * card still changes from visit to visit, and the bank keeps an authored
 * order rather than a new random one on every request.
 */
// @req REQ-113
export function orderDidYouKnowDeck(
  random: () => number = Math.random,
  facts: DidYouKnowFact[] = DID_YOU_KNOW_FACTS
): DidYouKnowFact[] {
  if (facts.length === 0) return [];
  const start = Math.min(facts.length - 1, Math.floor(random() * facts.length));
  return [...facts.slice(start), ...facts.slice(0, start)];
}

/**
 * The draw the loading interstitial uses, which differs from the band's in one
 * respect: it knows what it showed last time.
 *
 * The band is seen once per visit to the home, so a uniform draw is fine there.
 * The loader is seen on every navigation, and a uniform draw over a bank this
 * small hands the reader the same fact twice in a row often enough to read as
 * broken — one navigation in six, and the reader concludes the loader is a
 * fixed image rather than a rotation. Excluding the previous fact costs one
 * parameter and removes the only failure a reader can actually notice.
 *
 * A single-fact bank repeats regardless: at that point showing it again beats
 * showing an empty wait.
 */
// @req REQ-104
export function pickNextDidYouKnowFact(
  previousId: string | null,
  random: () => number = Math.random,
  facts: DidYouKnowFact[] = DID_YOU_KNOW_FACTS
): DidYouKnowFact | null {
  const eligible = facts.filter((entry) => entry.id !== previousId);
  return pickDidYouKnowFact(random, eligible.length > 0 ? eligible : facts);
}
